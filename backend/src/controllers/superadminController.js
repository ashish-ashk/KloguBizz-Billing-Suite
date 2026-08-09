const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { Organisation } = require('../models/Organisation');
const { Plan } = require('../models/Plan');
const { Reminder, AuditLog, Master, GlobalSetting } = require('../models/Settings');
const { User } = require('../models/User');
const { Membership } = require('../models/Membership');
const { Client } = require('../models/Client');
const { Item } = require('../models/Item');
const { Invoice } = require('../models/Invoice');
const { Payment } = require('../models/Payment');
const { CreditNote } = require('../models/CreditNote');
const { SalesDocument } = require('../models/SalesDocument');
const { RecurringInvoice, RecurringInvoiceRun } = require('../models/RecurringInvoice');
const { PaymentLink } = require('../models/PaymentLink');
const { ReminderLog } = require('../models/ReminderLog');
const { Subscription } = require('../models/Subscription');
const { asyncHandler } = require('../utils/asyncHandler');
const { httpError } = require('../utils/httpError');
const { logAudit } = require('../services/auditService');
const { pickFields } = require('../utils/pickFields');
const planVersions = require('../services/planVersionService');
const { paginate, parsePageParams, buildEnvelope, escapeRegex, parseSort } = require('../utils/pagination');
const { streamCsv } = require('../services/csvService');
const { invalidateMasterCache } = require('../services/masterService');
const { invalidatePlatformDefaults } = require('../services/platformSettingsService');
const { invalidateFeatureFlagCache } = require('../services/featureFlagService');
const { invalidatePlatformNotice } = require('../services/noticeService');
const { computeRecurringRevenue } = require('../services/metricsService');
const { assertValidSetting } = require('../validators/settings');
const { serialiseOrganisation, storeImage, platformAssetUrl } = require('../services/brandingAssetService');
const { startSessionIfSupported, withTransaction } = require('../utils/transaction');
const { logger } = require('../utils/logger');

// The super admin may change a tenant's plan and status (that's the point of
// the panel), but not `invoiceSequence`/`invoiceSequenceFY` — those belong to
// the atomic invoice counter and rewriting them hands out duplicate invoice
// numbers, which cannot be undone once the documents are issued.
const SUPERADMIN_ORG_FIELDS = [
  'name', 'adminEmail', 'gstin', 'pan', 'phone', 'address', 'state', 'stateCode',
  'plan', 'status', 'brandingConfig', 'themeConfig'
];

const overview = asyncHandler(async (req, res) => {
  const [organisations, users, invoices, payments, orgsByStatus, gmvAgg, recurring] = await Promise.all([
    Organisation.countDocuments(),
    User.countDocuments(),
    Invoice.countDocuments(),
    Payment.countDocuments(),
    Organisation.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Payment.aggregate([{ $match: { status: 'success' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    computeRecurringRevenue()
  ]);
  const statusCounts = Object.fromEntries(orgsByStatus.map(s => [s._id, s.count]));
  const gmv = Math.round(gmvAgg[0]?.total || 0);
  res.json({
    organisations,
    users,
    invoices,
    payments,
    active: statusCounts.active || 0,
    trial: statusCounts.trial || 0,
    suspended: statusCounts.suspended || 0,
    cancelled: statusCounts.cancelled || 0,
    /**
     * The sum of every successful tenant payment — money our customers collected
     * from *their* customers. This field was called `totalRevenue` and rendered as
     * "Platform Revenue", which it never was: it is GMV, and on a healthy platform
     * it is two or three orders of magnitude larger than what we earn. Kept under
     * the old name too so an older client still renders, but named correctly here
     * and superseded by `mrr`/`arr` below.
     */
    gmv,
    totalRevenue: gmv,
    mrr: recurring.mrr,
    arr: recurring.arr,
    payingOrgs: recurring.payingOrgs
  });
});

const ORG_SORTS = ['createdAt', 'name', 'plan', 'status'];

// Org list decorated with per-org user/invoice counts and admin user, the
// way the control panel table wants it.
//
// Paginated, and — importantly — the decoration queries are scoped to *this
// page's* org ids. Previously every organisation on the platform was fetched
// and then five more collection-wide aggregates were run against all of them on
// every page view of the console.
const listOrganisations = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.plan) filter.plan = req.query.plan;
  if (req.query.q) {
    const term = escapeRegex(String(req.query.q).trim());
    if (term) {
      filter.$or = [
        { name: { $regex: term, $options: 'i' } },
        { adminEmail: { $regex: term, $options: 'i' } },
        { gstin: { $regex: term, $options: 'i' } }
      ];
    }
  }

  const { page, limit, skip } = parsePageParams(req.query);
  const [orgs, total] = await Promise.all([
    Organisation.find(filter)
      // The base64 logo and letterhead live in brandingConfig and are hundreds
      // of kilobytes each; the console's table renders none of it.
      .select('-brandingConfig.logoUrl -brandingConfig.headerImageUrl')
      .sort(parseSort(req.query, ORG_SORTS, { createdAt: -1 }))
      .skip(skip)
      .limit(limit)
      .lean(),
    Organisation.countDocuments(filter)
  ]);

  const orgIds = orgs.map(o => o._id);
  const ownerIds = orgs.map(o => o.ownerId).filter(Boolean);
  // Seats and the admin contact are resolved via Membership, not `User.orgId`
  // (#53, #54) — an identity's "home" org and its memberships can differ.
  const [userCounts, invoiceCounts, adminMemberships, owners, subs] = await Promise.all([
    Membership.aggregate([{ $match: { orgId: { $in: orgIds }, status: { $ne: 'disabled' } } }, { $group: { _id: '$orgId', count: { $sum: 1 } } }]),
    Invoice.aggregate([{ $match: { orgId: { $in: orgIds } } }, { $group: { _id: '$orgId', count: { $sum: 1 } } }]),
    Membership.find({ orgId: { $in: orgIds }, role: 'admin', status: 'active' }).select('orgId userId').lean(),
    User.find({ _id: { $in: ownerIds } }).select('name email').lean(),
    Subscription.find({ orgId: { $in: orgIds } }).sort({ createdAt: -1 }).lean()
  ]);
  const countMap = list => Object.fromEntries(list.map(e => [String(e._id), e.count]));
  const userMap = countMap(userCounts);
  const invoiceMap = countMap(invoiceCounts);
  const adminUsers = await User.find({ _id: { $in: adminMemberships.map(m => m.userId) } }).select('name email').lean();
  const adminUserMap = Object.fromEntries(adminUsers.map(u => [String(u._id), u]));
  const adminMap = {};
  adminMemberships.forEach(m => {
    const key = String(m.orgId);
    if (!adminMap[key] && adminUserMap[String(m.userId)]) adminMap[key] = adminUserMap[String(m.userId)];
  });
  // Owner is resolved live from Organisation.ownerId (the source of truth used
  // by transferOwnership) rather than an arbitrary role:'admin' user, so this
  // can never drift after an ownership transfer.
  const ownerMap = Object.fromEntries(owners.map(u => [String(u._id), { name: u.name, email: u.email }]));
  const subMap = {};
  subs.forEach(s => { if (!subMap[String(s.orgId)]) subMap[String(s.orgId)] = s; });

  res.json(buildEnvelope(
    orgs.map(o => ({
      ...o,
      userCount: userMap[String(o._id)] || 0,
      invoiceCount: invoiceMap[String(o._id)] || 0,
      admin: adminMap[String(o._id)] || null,
      owner: o.ownerId ? (ownerMap[String(o.ownerId)] || null) : null,
      subscription: subMap[String(o._id)] || null
    })),
    { page, limit, total }
  ));
});

// Creates the tenant plus its admin user in one step and returns a one-time
// temporary password for hand-off.
const createOrganisation = asyncHandler(async (req, res) => {
  const { name, adminName, adminEmail, gstin, phone, address, state, stateCode = '27', plan = 'starter' } = req.body;
  if (!name || !adminEmail) throw httpError(400, 'name and adminEmail are required');
  const existing = await User.findOne({ email: adminEmail.toLowerCase() });
  if (existing) throw httpError(409, 'A user with this email already exists');

  const org = await Organisation.create({ name, adminEmail, gstin, phone, address, state, stateCode, plan, status: 'active' });
  const tempPassword = crypto.randomBytes(6).toString('base64url');
  const admin = await User.create({
    orgId: org._id,
    name: adminName || name,
    email: adminEmail,
    passwordHash: await bcrypt.hash(tempPassword, 12),
    role: 'admin',
    status: 'active'
  });
  // Without this the admin just created has no active membership anywhere
  // and `protect` refuses every request with MEMBERSHIP_REVOKED the moment
  // they try to sign in — a org created here would be otherwise unusable.
  await Membership.create({ userId: admin._id, orgId: org._id, role: 'admin', status: 'active' });
  // The org has no owner concept until this point — the admin created here
  // becomes the canonical owner, mirroring the self-serve registration flow.
  org.ownerId = admin._id;
  await org.save();
  await Subscription.create({ orgId: org._id, planCode: plan, status: 'active', billingCycle: 'monthly' });
  // `orgId` names the tenant this concerns. A superadmin has no organisation of
  // their own, so without it these entries were filed against nothing and the audit
  // console's per-org filter could never find them.
  logAudit({ req, action: 'org.created', entity: 'organisation', entityId: org._id, orgId: org._id, meta: { name, plan } });
  res.status(201).json({
    organisation: serialiseOrganisation(org),
    admin: { ...admin.toObject(), passwordHash: undefined },
    tempPassword
  });
});

const updateOrganisation = asyncHandler(async (req, res) => {
  const update = pickFields(req.body, SUPERADMIN_ORG_FIELDS);
  // A status change through the generic editor still records who and when, so the
  // provenance the tenant detail page shows is never blank just because the change
  // came from the profile form rather than the Suspend action. The *reason* is only
  // required by that action (platformController.setTenantStatus), which is what the
  // console uses for suspend and cancel.
  if (update.status !== undefined) {
    update.statusChangedAt = new Date();
    update.statusChangedBy = req.user?.name || req.user?.email || '';
    if (update.status === 'active' || update.status === 'trial') update.statusReason = '';
  }
  const org = await Organisation.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
  if (!org) throw httpError(404, 'Organisation not found');
  logAudit({ req, action: 'org.updated', entity: 'organisation', entityId: org._id, orgId: org._id, meta: { fields: Object.keys(update) } });
  res.json(serialiseOrganisation(org));
});

/**
 * Every collection that carries an `orgId`.
 *
 * The cascade previously covered five of them and missed `Item`, `CreditNote`
 * and `ReminderLog` — so deleting a tenant left their entire item catalogue and
 * every credit note they had ever issued behind, pointing at an organisation
 * that no longer existed, forever. Keeping the list in one place is the point:
 * a new tenant-scoped collection has exactly one obvious spot to be registered.
 *
 * `AuditLog` is deliberately **not** in this list. It is the record of what was
 * done, including this deletion, and erasing it along with its subject is the
 * one thing an audit trail must never do. Its retention is handled separately
 * (see the TTL on the model).
 */
// `User` is deliberately not in this list (#53, #54): a user can belong to
// more than one organisation, so a plain `deleteMany({orgId})` on it would
// delete an identity that still has an active membership somewhere else —
// deleting Org A would break someone's access to Org B. See the explicit,
// two-step handling in deleteOrganisation below instead.
const TENANT_COLLECTIONS = [
  ['memberships', Membership],
  ['clients', Client],
  ['items', Item],
  ['invoices', Invoice],
  ['payments', Payment],
  ['creditNotes', CreditNote],
  ['salesDocuments', SalesDocument],
  ['recurringInvoices', RecurringInvoice],
  ['recurringInvoiceRuns', RecurringInvoiceRun],
  ['paymentLinks', PaymentLink],
  ['reminderLogs', ReminderLog],
  ['subscriptions', Subscription]
];

// Permanently removes a tenant and all of its data.
const deleteOrganisation = asyncHandler(async (req, res) => {
  const org = await Organisation.findById(req.params.id);
  if (!org) throw httpError(404, 'Organisation not found');

  // Guard against a fat-fingered request wiping the wrong tenant: the caller has
  // to name the organisation they mean. Irreversible and platform-wide, so the
  // confirmation is worth the friction.
  const confirmation = String(req.body?.confirmName ?? '').trim();
  if (confirmation && confirmation !== org.name) {
    throw httpError(400, `The name you typed does not match "${org.name}".`, 'CONFIRMATION_MISMATCH');
  }

  const deleted = {};
  const { atomic } = await withTransaction(async session => {
    const options = session ? { session } : {};
    // Captured before the membership rows themselves are deleted below, so
    // it's known afterward whose *only* tie to the platform this org was.
    const memberUserIds = await Membership.find({ orgId: org._id }, null, options).distinct('userId');

    // Sequential, not Promise.all: inside a transaction the operations share one
    // session, and concurrent use of a single session is not supported.
    for (const [name, Model] of TENANT_COLLECTIONS) {
      const result = await Model.deleteMany({ orgId: org._id }, options);
      deleted[name] = result.deletedCount ?? 0;
    }

    // A user is only removed if this org's membership (just deleted above) was
    // their last one anywhere — otherwise deleting Org A would delete an
    // identity that still needs to sign in to Org B (#53, #54).
    const stillLinkedIds = await Membership.find({ userId: { $in: memberUserIds } }, null, options).distinct('userId');
    const stillLinked = new Set(stillLinkedIds.map(String));
    const orphanedUserIds = memberUserIds.filter(id => !stillLinked.has(String(id)));
    const usersResult = await User.deleteMany({ _id: { $in: orphanedUserIds } }, options);
    deleted.users = usersResult.deletedCount ?? 0;

    await Organisation.deleteOne({ _id: org._id }, options);
  });

  logAudit({
    req,
    action: 'org.deleted',
    entity: 'organisation',
    entityId: req.params.id,
    // Retained deliberately: AuditLog is excluded from the delete cascade, so this
    // entry outlives its subject and is the record that the tenant existed.
    orgId: org._id,
    // What was actually removed, so the audit entry is evidence rather than a
    // note that something happened.
    meta: { name: org.name, plan: org.plan, deleted, atomic }
  });
  if (!atomic) {
    logger.warn('tenant deleted without a transaction', { orgId: String(org._id), deleted });
  }
  res.status(204).end();
});

const listPlansAdmin = asyncHandler(async (req, res) => {
  res.json(await Plan.find().sort({ sortOrder: 1 }));
});

/**
 * Publishes a plan change (3.3 #9).
 *
 * This used to be a bare `findOneAndUpdate` on the single row for the code. The
 * old values were not retained anywhere — the audit entry logged only the name,
 * so even the previous price was unrecoverable — and because every price and
 * limit in the system resolves by joining to that row at read time, an edit
 * reached backwards: past receipts, historical MRR and every existing
 * subscriber's quota all moved with it.
 *
 * **Existing subscribers are grandfathered by default.** `applyToExisting` is
 * the deliberate opt-out, and the response reports how many people each choice
 * affected so the operator learns what they just did rather than inferring it.
 */
const upsertPlan = asyncHandler(async (req, res) => {
  const code = req.params.code || req.body.code;
  if (!code) throw httpError(400, 'A plan code is required');

  // Allowlisted, because the whole body used to be written straight through and
  // these routes carry no validator — an unfiltered upsert would let a caller
  // set `currentVersion` and desynchronise the plan from its own history.
  const changes = pickFields(req.body, [
    'name', 'monthlyPrice', 'yearlyPrice', 'userLimit', 'invoiceLimit', 'features', 'active', 'sortOrder'
  ]);

  const result = await planVersions.publish({
    code,
    changes,
    changedBy: req.user?.name || req.user?.email,
    changeNote: req.body?.changeNote,
    applyToExisting: req.body?.applyToExisting === true
  });

  logAudit({
    req,
    action: 'plan.updated',
    entity: 'plan',
    entityId: code,
    meta: {
      name: result.plan.name,
      version: result.version.version,
      monthlyPrice: result.plan.monthlyPrice,
      yearlyPrice: result.plan.yearlyPrice,
      // Recorded, so "when did this go up and who did it" is answerable from the
      // trail alone rather than only from the version rows.
      applyToExisting: req.body?.applyToExisting === true,
      repriced: result.repriced,
      grandfathered: result.grandfathered
    }
  });

  res.json({
    ...result.plan,
    version: result.version.version,
    repriced: result.repriced,
    grandfathered: result.grandfathered
  });
});

/** What a plan has cost over time, newest first. */
const planHistory = asyncHandler(async (req, res) => {
  res.json({ versions: await planVersions.history(req.params.code) });
});

// ---- Masters: GST rates, HSN codes, payment methods, units ----

const listMasters = asyncHandler(async (req, res) => {
  const [reminders, masters] = await Promise.all([
    Reminder.find().sort({ daysOffset: 1 }),
    Master.find().sort({ sortOrder: 1, createdAt: 1 })
  ]);
  const grouped = { gstRate: [], hsn: [], paymentMethod: [], unit: [] };
  masters.forEach(m => { (grouped[m.type] || (grouped[m.type] = [])).push(m); });
  // `templates` is deliberately gone. It returned rows from a separate
  // InvoiceTemplate collection that nothing ever rendered — the real templates
  // live in services/invoiceTemplates.js, and the platform-wide default is the
  // `defaultInvoiceTemplate` global setting.
  res.json({ reminders, masters: grouped });
});

const MASTER_TYPES = ['gstRate', 'hsn', 'paymentMethod', 'unit', 'expenseCategory'];

/**
 * Saves the full list of masters for one type.
 *
 * This was a `deleteMany({type})` immediately followed by an `insertMany` — two
 * separate, unordered operations with no transaction between them. A crash, a
 * failed validation, or a dropped connection in that window left the collection
 * **empty**: every GST rate and HSN code, platform-wide, gone, with no way back
 * short of a database restore. It also rotated every `_id` on every save, so
 * nothing could ever hold a stable reference to a master row.
 *
 * Now it is a diff: rows are matched by their natural key (`type` + `code`),
 * existing rows are updated in place and keep their `_id`, new rows are inserted,
 * and only rows the admin actually removed are deleted. Nothing is destroyed
 * before the replacement is known to be valid, so the catastrophic window is
 * gone whether or not a transaction is available.
 */
const saveMasters = asyncHandler(async (req, res) => {
  const { type } = req.params;
  if (!MASTER_TYPES.includes(type)) throw httpError(400, 'Unknown master type');
  const items = Array.isArray(req.body) ? req.body : [];

  // `code` is the natural key. A row without one can't be matched across saves,
  // so it is refused rather than silently duplicated on every save.
  const normalised = items.map((item, index) => {
    const code = String(item.code ?? '').trim();
    if (!code) throw httpError(400, `Row ${index + 1} has no code — every master row needs one.`);
    return {
      type,
      code,
      label: item.label,
      description: item.description,
      rate: item.rate,
      active: item.active !== false,
      sortOrder: index
    };
  });

  const duplicate = normalised.find((row, index) =>
    normalised.findIndex(other => other.code.toLowerCase() === row.code.toLowerCase()) !== index);
  if (duplicate) throw httpError(409, `The code "${duplicate.code}" appears more than once.`);

  const keep = new Set(normalised.map(row => row.code));

  // One round trip, applied atomically per document by the server. Ordered so a
  // failure stops rather than half-applying in an arbitrary order.
  const operations = normalised.map(row => ({
    updateOne: {
      filter: { type, code: row.code },
      update: { $set: row },
      upsert: true
    }
  }));
  // Deletions go last: the new state is written first, so an interruption
  // leaves stale rows rather than no rows.
  operations.push({ deleteMany: { filter: { type, code: { $nin: [...keep] } } } });

  const session = await startSessionIfSupported();
  try {
    if (session) {
      await session.withTransaction(() => Master.bulkWrite(operations, { ordered: true, session }));
    } else {
      await Master.bulkWrite(operations, { ordered: true });
    }
  } finally {
    if (session) await session.endSession();
  }

  // Masters are cached for a minute on the read path; drop the entry so the
  // very next item/payment write validates against what was just saved.
  invalidateMasterCache(type);
  const docs = await Master.find({ type }).sort({ sortOrder: 1, createdAt: 1 });
  logAudit({ req, action: 'masters.saved', entity: 'master', entityId: type, meta: { count: docs.length } });
  res.json(docs);
});

const updateReminder = asyncHandler(async (req, res) => {
  const reminder = await Reminder.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!reminder) throw httpError(404, 'Reminder not found');
  logAudit({ req, action: 'reminder.updated', entity: 'reminder', entityId: reminder._id, meta: { name: reminder.name } });
  res.json(reminder);
});

// ---- Global key/value settings (branding, email, template default...) ----

/**
 * The console gets asset URLs for the platform images, never their bytes (#45) —
 * the same treatment `serialiseOrganisation` gives a tenant's.
 *
 * Without this the branding page would receive a `logoKey` it cannot render and
 * an empty `logoUrl`, then send that empty string back on the next save and
 * erase the logo. `hasLogo`/`hasFavicon` let it show "uploaded" without the
 * image having to travel.
 */
function serialisePlatformBranding(value) {
  const branding = { ...(value || {}) };
  const logo = { key: branding.logoKey || '', dataUri: branding.logoUrl || '' };
  const favicon = { key: branding.faviconKey || '', dataUri: branding.faviconUrl || '' };
  branding.logoAssetUrl = platformAssetUrl('logo', logo);
  branding.faviconAssetUrl = platformAssetUrl('favicon', favicon);
  branding.hasLogo = Boolean(logo.key || logo.dataUri);
  branding.hasFavicon = Boolean(favicon.key || favicon.dataUri);
  branding.logoUrl = '';
  branding.faviconUrl = '';
  delete branding.logoKey;
  delete branding.faviconKey;
  return branding;
}

const getSettings = asyncHandler(async (req, res) => {
  const settings = await GlobalSetting.find();
  res.json(Object.fromEntries(settings.map(s => [
    s.key,
    s.key === 'branding' ? serialisePlatformBranding(s.value) : s.value
  ])));
});

/**
 * Platform branding images, routed through resize-and-store like a tenant's
 * (#45).
 *
 * The platform logo and favicon are read on the **unauthenticated** login page
 * by `publicController`, so an unresized upload here is paid for by every
 * visitor who has never signed in — the worst place in the product to carry a
 * multi-megabyte base64 string.
 */
const PLATFORM_IMAGE_FIELDS = [
  { kind: 'logo', field: 'logoUrl', key: 'logoKey' },
  { kind: 'favicon', field: 'faviconUrl', key: 'faviconKey' }
];

async function placePlatformImages(value) {
  for (const { kind, field, key } of PLATFORM_IMAGE_FIELDS) {
    if (!(field in value)) continue;
    const placed = await storeImage({ scope: 'platform', kind, dataUri: value[field] });
    if (!placed) { delete value[field]; continue; }
    value[field] = placed.dataUri;
    value[key] = placed.key;
  }
  return value;
}

const saveSetting = asyncHandler(async (req, res) => {
  // Validated and sanitised before it is stored. `branding` in particular is
  // served to every unauthenticated visitor by publicController, so one bad
  // payload used to break the login page platform-wide with nothing rejected.
  const value = assertValidSetting(req.params.key, req.body);
  if (req.params.key === 'branding') await placePlatformImages(value);
  const setting = await GlobalSetting.findOneAndUpdate(
    { key: req.params.key },
    { value },
    { new: true, upsert: true }
  );
  // Three of these keys are cached on hot read paths. Dropping the matching entry
  // is what makes a console change take effect on the next request rather than up
  // to a minute later — long enough for an operator to conclude the save failed
  // and do it again.
  if (req.params.key === 'defaultInvoiceTemplate') invalidatePlatformDefaults();
  if (req.params.key === 'featureFlags') invalidateFeatureFlagCache();
  if (req.params.key === 'platformNotice') invalidatePlatformNotice();
  logAudit({ req, action: 'settings.saved', entity: 'setting', entityId: req.params.key });
  // Serialised on the way out too, so a save and a load hand the console the
  // same shape — otherwise the page would hold base64 after a save and asset
  // URLs after a reload, and only one of those round-trips safely.
  res.json({
    key: setting.key,
    value: setting.key === 'branding' ? serialisePlatformBranding(setting.value) : setting.value
  });
});

/**
 * The audit console.
 *
 * Was an unfiltered, unpaginated `find()` capped at 200 rows — which meant that
 * past 200 events the trail was, in practice, unreadable: no way to ask "what
 * did this org do", "who deleted that", or "what happened on the 14th". An audit
 * log you cannot query is not an audit log.
 */
const listAuditLogs = asyncHandler(async (req, res) => {
  const filter = buildAuditFilter(req.query);
  const page = await paginate(AuditLog, filter, req.query, query => query
    .sort({ createdAt: -1 })
    .lean());
  res.json(page);
});

function buildAuditFilter(query) {
  const filter = {};
  if (query.orgId && /^[0-9a-fA-F]{24}$/.test(query.orgId)) filter.orgId = query.orgId;
  if (query.actorId && /^[0-9a-fA-F]{24}$/.test(query.actorId)) filter.actorId = query.actorId;
  if (query.entity) filter.entity = String(query.entity);
  if (query.action) {
    // A prefix match, so `?action=invoice.` returns every invoice event rather
    // than requiring the exact action name.
    const term = escapeRegex(String(query.action).trim());
    if (term) filter.action = { $regex: `^${term}`, $options: 'i' };
  }
  if (query.from || query.to) {
    const range = {};
    if (query.from) {
      const from = new Date(query.from);
      if (Number.isNaN(from.getTime())) throw httpError(400, '`from` must be a valid date (YYYY-MM-DD)');
      range.$gte = from;
    }
    if (query.to) {
      const to = new Date(query.to);
      if (Number.isNaN(to.getTime())) throw httpError(400, '`to` must be a valid date (YYYY-MM-DD)');
      // Inclusive of the whole day the caller named, which is what a date
      // filter means to anyone using it.
      to.setHours(23, 59, 59, 999);
      range.$lte = to;
    }
    filter.createdAt = range;
  }
  return filter;
}

const exportAuditLogsCsv = asyncHandler(async (req, res) => {
  const cursor = AuditLog.find(buildAuditFilter(req.query)).sort({ createdAt: -1 }).lean().cursor();
  await streamCsv(res, {
    filename: 'audit-log.csv',
    cursor,
    columns: [
      { label: 'Timestamp', value: r => r.createdAt?.toISOString() },
      { label: 'Organisation', value: r => (r.orgId ? String(r.orgId) : '') },
      { label: 'Actor', value: r => r.actorName || '' },
      { label: 'Actor Id', value: r => (r.actorId ? String(r.actorId) : '') },
      { label: 'Action', value: r => r.action },
      { label: 'Entity', value: r => r.entity || '' },
      { label: 'Entity Id', value: r => r.entityId || '' },
      { label: 'Details', value: r => (r.meta ? JSON.stringify(r.meta) : '') }
    ]
  });
});

module.exports = {
  overview,
  listOrganisations,
  createOrganisation,
  updateOrganisation,
  deleteOrganisation,
  listPlansAdmin,
  upsertPlan,
  planHistory,
  planHistory,
  listMasters,
  saveMasters,
  updateReminder,
  getSettings,
  saveSetting,
  listAuditLogs,
  exportAuditLogsCsv
};
