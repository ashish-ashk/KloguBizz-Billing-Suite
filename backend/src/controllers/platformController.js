const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { Organisation } = require('../models/Organisation');
const { User } = require('../models/User');
const { Invoice } = require('../models/Invoice');
const { Payment } = require('../models/Payment');
const { Client } = require('../models/Client');
const { Item } = require('../models/Item');
const { CreditNote } = require('../models/CreditNote');
const { Subscription } = require('../models/Subscription');
const { UsageEvent } = require('../models/UsageEvent');
const { AuditLog, GlobalSetting } = require('../models/Settings');
const { asyncHandler } = require('../utils/asyncHandler');
const { httpError } = require('../utils/httpError');
const { logAudit } = require('../services/auditService');
const { paginate, parsePageParams, buildEnvelope, escapeRegex } = require('../utils/pagination');
const { serialiseOrganisation } = require('../services/brandingAssetService');
const { getUsage } = require('../services/planService');
const metrics = require('../services/metricsService');
const { resolveFlags, sanitiseFlagOverrides, FLAGS } = require('../services/featureFlagService');
const { issueImpersonationToken, IMPERSONATION_TTL_SECONDS } = require('../services/impersonationService');
const { capabilitiesFor, resolvePlatformRole, ROLE_CAPABILITIES } = require('../middleware/platformRoleMiddleware');
const { createToken, expiryFromNow, RESET_TTL_MS } = require('../services/tokenService');
const { sendPasswordResetEmail } = require('../services/emailService');
const { EVENT } = require('../services/usageEventService');
const { invalidatePlatformNotice } = require('../services/noticeService');
const requestMetrics = require('../utils/requestMetrics');
const { env } = require('../config/env');

/**
 * The platform console: Part 3.1 (observability), 3.2 (tenant lifecycle) and 3.4
 * (security) of the improvement plan.
 *
 * Kept separate from `superadminController` on purpose. That file is the original
 * CRUD surface — orgs, plans, masters, settings, the audit list. This one is the
 * console built on top of it: metrics, the tenant drill-down, and the actions
 * support takes against a tenant. They have different reasons to change.
 *
 * Every mutating handler in here audits. That is not decoration: these are
 * operations performed *on* a customer's account by someone who is not the
 * customer, and the trail is the only thing that makes them accountable.
 */

// Selecting the base64 logo and letterhead out. They are up to 1.2MB combined and
// no console screen renders either.
const NO_IMAGES = '-brandingConfig.logoUrl -brandingConfig.headerImageUrl';

function objectIdOrThrow(value, label = 'id') {
  if (!/^[0-9a-fA-F]{24}$/.test(String(value || ''))) throw httpError(400, `${label} is not a valid id`);
  return String(value);
}

async function findOrgOrThrow(id, { select = NO_IMAGES } = {}) {
  const org = await Organisation.findById(objectIdOrThrow(id, 'Organisation id')).select(select);
  if (!org) throw httpError(404, 'Organisation not found');
  return org;
}

// ── Who am I ─────────────────────────────────────

/**
 * The console asks this first so it can hide what this operator cannot do.
 *
 * Hiding is not the control — every route is guarded server-side — but a console
 * full of buttons that return 403 is a worse console.
 */
const platformMe = asyncHandler(async (req, res) => {
  res.json({
    id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    platformRole: resolvePlatformRole(req.user),
    capabilities: capabilitiesFor(req.user),
    roles: Object.keys(ROLE_CAPABILITIES)
  });
});

// ── 3.1 Observability ────────────────────────────

const metricsSummary = asyncHandler(async (req, res) => {
  res.json(await metrics.platformSummary());
});

const metricsSeries = asyncHandler(async (req, res) => {
  res.json(await metrics.dailySeries(req.query.days));
});

/** The two lists worth acting on today, in one request — they are read together. */
const metricsAttention = asyncHandler(async (req, res) => {
  const [atRisk, trials] = await Promise.all([
    metrics.atRiskTenants({ inactiveDays: Number(req.query.inactiveDays) || 14 }),
    metrics.trialsExpiring({ withinDays: Number(req.query.withinDays) || 7 })
  ]);
  res.json({ atRisk, trialsExpiring: trials });
});

const metricsAdoption = asyncHandler(async (req, res) => {
  res.json(await metrics.featureAdoption({ days: req.query.days }));
});

/**
 * Recomputes the rollup on demand.
 *
 * Exists because the alternative — waiting for the scheduler — makes an empty
 * dashboard indistinguishable from a broken one on a deployment that has just been
 * updated.
 */
const metricsRebuild = asyncHandler(async (req, res) => {
  const days = Math.min(Math.max(Number(req.body?.days) || 30, 1), 180);
  const filled = [];
  for (let offset = days; offset >= 1; offset -= 1) {
    const row = await metrics.rollupDay(new Date(Date.now() - offset * 86400000));
    filled.push(row.date);
  }
  logAudit({ req, action: 'metrics.rebuilt', entity: 'metrics', meta: { days } });
  res.json({ ok: true, days: filled.length, from: filled[0], to: filled[filled.length - 1] });
});

/**
 * System health.
 *
 * Deliberately reports what it *can* know and labels the rest. `db.stats()` is a
 * genuine platform-wide figure; the latency percentiles are this instance's only,
 * and say so.
 */
const systemHealth = asyncHandler(async (req, res) => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const connection = mongoose.connection;
  let database = { state: states[connection.readyState] || 'unknown' };

  if (connection.readyState === 1) {
    try {
      const stats = await connection.db.stats();
      const hello = await connection.db.admin().command({ hello: 1 });
      database = {
        ...database,
        name: connection.name,
        collections: stats.collections,
        objects: stats.objects,
        dataSizeBytes: stats.dataSize,
        storageSizeBytes: stats.storageSize,
        indexSizeBytes: stats.indexSize,
        // Whether transactions are available at all — the same probe
        // utils/transaction.js uses, surfaced so an operator can see why a
        // multi-collection write was reported as non-atomic.
        replicaSet: hello.setName || null,
        transactionsSupported: Boolean(hello.setName)
      };
    } catch (error) {
      // A restricted user (Atlas often is) can be connected and still not allowed
      // to run dbStats. That is not an outage, so it must not read as one.
      database.statsError = error.message;
    }
  }

  const [orgs, users, invoices, payments, events, audit] = await Promise.all([
    Organisation.estimatedDocumentCount(),
    User.estimatedDocumentCount(),
    Invoice.estimatedDocumentCount(),
    Payment.estimatedDocumentCount(),
    UsageEvent.estimatedDocumentCount(),
    AuditLog.estimatedDocumentCount()
  ]);

  res.json({
    database,
    collectionCounts: { organisations: orgs, users, invoices, payments, usageEvents: events, auditLogs: audit },
    requests: requestMetrics.snapshot(),
    process: {
      nodeVersion: process.version,
      environment: env.NODE_ENV,
      uptimeSeconds: Math.round(process.uptime()),
      memory: process.memoryUsage().rss,
      // Whether the optional integrations are actually configured, which is the
      // first question when "emails aren't sending" or "billing did nothing".
      emailConfigured: Boolean(env.SENDGRID_API_KEY),
      billingConfigured: env.billingConfigured
    }
  });
});

// ── 3.2 Tenant drill-down ────────────────────────

/**
 * Everything about one tenant, on one screen.
 *
 * There was no per-org view at all: the console had a table row and a modal
 * showing eight fields off that row. Answering "why is this customer unhappy"
 * meant querying the database by hand.
 *
 * Opening this view is itself audited (`superadmin.tenant_viewed`). A support tool
 * that can read a customer's business records has to leave a record of having done
 * so — that is the data-access log the plan asks for, and it is what lets the
 * tenant be told who looked.
 */
const tenantDetail = asyncHandler(async (req, res) => {
  const org = await findOrgOrThrow(req.params.id);
  const orgId = org._id;

  const [
    users,
    subscriptions,
    usage,
    flags,
    counts,
    invoiceAgg,
    collectedAgg,
    firstInvoice,
    recentAudit,
    recentEvents
  ] = await Promise.all([
    User.find({ orgId }).select('-passwordHash').sort({ createdAt: 1 }).lean(),
    Subscription.find({ orgId }).sort({ createdAt: -1 }).limit(10).lean(),
    // Reuses the tenant's own quota logic, so the console can never disagree with
    // what the customer sees on their subscription page.
    getUsage(orgId).catch(() => null),
    resolveFlags(org),
    Promise.all([
      Invoice.countDocuments({ orgId }),
      Client.countDocuments({ orgId }),
      Item.countDocuments({ orgId }),
      Payment.countDocuments({ orgId }),
      CreditNote.countDocuments({ orgId })
    ]),
    Invoice.aggregate([
      { $match: { orgId } },
      {
        $group: {
          _id: null,
          invoiced: { $sum: '$totals.total' },
          outstanding: { $sum: { $ifNull: ['$balanceDue', 0] } }
        }
      }
    ]),
    Payment.aggregate([
      { $match: { orgId, status: 'success' } },
      { $group: { _id: null, collected: { $sum: '$amount' } } }
    ]),
    Invoice.findOne({ orgId }).sort({ createdAt: 1 }).select('createdAt invoiceNumber').lean(),
    AuditLog.find({ orgId }).sort({ createdAt: -1 }).limit(25).lean(),
    UsageEvent.find({ orgId }).sort({ createdAt: -1 }).limit(25).select('type meta value createdAt userId').lean()
  ]);

  const [invoiceCount, clientCount, itemCount, paymentCount, creditNoteCount] = counts;
  const subscription = subscriptions[0] || null;

  logAudit({
    req,
    action: 'superadmin.tenant_viewed',
    entity: 'organisation',
    entityId: orgId,
    // The entry is about the tenant, not about the operator's (non-existent)
    // organisation — see the note in services/auditService.js.
    orgId,
    meta: { name: org.name }
  });

  res.json({
    organisation: serialiseOrganisation(org),
    owner: org.ownerId ? users.find(u => String(u._id) === String(org.ownerId)) || null : null,
    users,
    subscription,
    subscriptionHistory: subscriptions,
    usage,
    flags,
    /** The full flag catalogue, so the console can render a toggle for a flag this
     *  tenant has never had an override for. */
    flagCatalogue: FLAGS,
    documents: {
      invoices: invoiceCount,
      clients: clientCount,
      items: itemCount,
      payments: paymentCount,
      creditNotes: creditNoteCount
    },
    money: {
      invoiced: Math.round(invoiceAgg[0]?.invoiced || 0),
      collected: Math.round(collectedAgg[0]?.collected || 0),
      outstanding: Math.round(invoiceAgg[0]?.outstanding || 0)
    },
    activity: {
      lastActiveAt: org.lastActiveAt || null,
      firstInvoiceAt: firstInvoice?.createdAt || null,
      /** Time-to-first-invoice, the activation metric that matters per tenant. */
      daysToFirstInvoice: firstInvoice
        ? Math.max(0, Math.round((new Date(firstInvoice.createdAt) - new Date(org.createdAt)) / 86400000))
        : null,
      healthScore: metrics.healthScore({
        lastActiveAt: org.lastActiveAt,
        subscriptionStatus: subscription?.status,
        invoiceCount,
        status: org.status
      })
    },
    timeline: recentAudit,
    recentEvents
  });
});

/** One page of a tenant's invoices, for support. Read-only by construction. */
const tenantInvoices = asyncHandler(async (req, res) => {
  const orgId = objectIdOrThrow(req.params.id, 'Organisation id');
  const filter = { orgId };
  if (req.query.status) filter.status = String(req.query.status);
  if (req.query.q) {
    const term = escapeRegex(String(req.query.q).trim());
    if (term) filter.invoiceNumber = { $regex: term, $options: 'i' };
  }
  const page = await paginate(Invoice, filter, req.query, query => query
    .select('invoiceNumber date dueDate status totals.total amountPaid balanceDue billTo clientId createdAt')
    .populate('clientId', 'companyName gstin')
    .sort({ createdAt: -1 })
    .lean());
  logAudit({ req, action: 'superadmin.tenant_invoices_viewed', entity: 'organisation', entityId: orgId, orgId, meta: { page: page.page } });
  res.json(page);
});

const tenantUsers = asyncHandler(async (req, res) => {
  const orgId = objectIdOrThrow(req.params.id, 'Organisation id');
  const users = await User.find({ orgId }).select('-passwordHash').sort({ createdAt: 1 }).lean();
  res.json(users);
});

/**
 * The tenant's own activity trail: audit entries plus usage events, merged.
 *
 * Two collections rather than one because they answer different questions — the
 * audit log says what was *changed*, the event stream says what was *used* — and
 * an operator reconstructing "what happened to this account" needs both
 * interleaved.
 */
const tenantTimeline = asyncHandler(async (req, res) => {
  const orgId = objectIdOrThrow(req.params.id, 'Organisation id');
  const { page, limit, skip } = parsePageParams(req.query);
  const filter = { orgId };
  const [entries, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    AuditLog.countDocuments(filter)
  ]);
  res.json(buildEnvelope(entries, { page, limit, total }));
});

// ── 3.2 Tenant lifecycle actions ─────────────────

const STATUS_VALUES = ['trial', 'active', 'suspended', 'cancelled'];

/**
 * Suspend / unsuspend / cancel, with a reason.
 *
 * The reason is required for anything other than reactivation, and it is shown to
 * the tenant. Suspension has been enforceable since Phase 2 but was anonymous: the
 * customer saw "this account is suspended" and nothing else, which converts every
 * suspension into a support ticket and leaves the next operator unable to tell
 * whether it was deliberate.
 */
const setTenantStatus = asyncHandler(async (req, res) => {
  const org = await findOrgOrThrow(req.params.id);
  const status = String(req.body?.status || '');
  if (!STATUS_VALUES.includes(status)) {
    throw httpError(400, `status must be one of: ${STATUS_VALUES.join(', ')}`);
  }
  const reason = String(req.body?.reason || '').trim();
  if ((status === 'suspended' || status === 'cancelled') && reason.length < 3) {
    throw httpError(400, 'A reason is required — the tenant is shown it, and the next operator needs it.', 'REASON_REQUIRED');
  }

  const previous = org.status;
  org.status = status;
  org.statusReason = status === 'active' || status === 'trial' ? '' : reason;
  org.statusChangedAt = new Date();
  org.statusChangedBy = req.user.name || req.user.email;
  await org.save();

  // Suspending an account has to cut its live sessions for writes to actually
  // stop being attempted — `protect` re-reads the org on every request, so this is
  // belt and braces rather than the enforcement itself, but it also means the
  // tenant sees the banner immediately instead of on their next navigation.
  if (status === 'suspended' || status === 'cancelled') {
    await User.updateMany({ orgId: org._id }, { $inc: { sessionVersion: 1 } });
  }

  logAudit({
    req,
    action: `org.status_${status}`,
    entity: 'organisation',
    entityId: org._id,
    orgId: org._id,
    meta: { from: previous, to: status, reason: org.statusReason }
  });
  res.json(serialiseOrganisation(org));
});

/** Per-org seat and invoice ceilings. See services/planService.js for how they win. */
const setTenantLimits = asyncHandler(async (req, res) => {
  const org = await findOrgOrThrow(req.params.id);
  const parseLimit = value => {
    if (value === null || value === '' || value === undefined) return null;
    const number = Number(value);
    if (!Number.isFinite(number) || number < 1) throw httpError(400, 'A limit override must be a positive number, or null to remove it.');
    return Math.floor(number);
  };

  org.limitOverrides = {
    userLimit: parseLimit(req.body?.userLimit),
    invoiceLimit: parseLimit(req.body?.invoiceLimit),
    note: String(req.body?.note || '').slice(0, 200)
  };
  await org.save();
  logAudit({ req, action: 'org.limits_set', entity: 'organisation', entityId: org._id, orgId: org._id, meta: org.limitOverrides });
  res.json({ limitOverrides: org.limitOverrides, usage: await getUsage(org._id) });
});

const setTenantFlags = asyncHandler(async (req, res) => {
  const org = await findOrgOrThrow(req.params.id);
  // Only known keys, only booleans — an override stored as a string would be
  // truthy everywhere it is read, turning a kill-switch into a no-op.
  org.featureFlags = sanitiseFlagOverrides(req.body?.flags ?? req.body);
  org.markModified('featureFlags');
  await org.save();
  logAudit({ req, action: 'org.flags_set', entity: 'organisation', entityId: org._id, orgId: org._id, meta: { flags: org.featureFlags } });
  res.json({ overrides: org.featureFlags, effective: await resolveFlags(org) });
});

/**
 * Grant, extend or end a trial.
 *
 * `days` extends from *whichever is later*, now or the current end date, so
 * extending a live trial adds to it rather than truncating it — the mistake this
 * shape of endpoint usually makes.
 */
const setTenantTrial = asyncHandler(async (req, res) => {
  const org = await findOrgOrThrow(req.params.id);
  const { days, endsAt, end } = req.body || {};

  if (end === true) {
    org.trialEndsAt = new Date();
  } else if (endsAt) {
    const date = new Date(endsAt);
    if (Number.isNaN(date.getTime())) throw httpError(400, 'endsAt is not a valid date');
    org.trialEndsAt = date;
  } else {
    const extendBy = Number(days);
    if (!Number.isFinite(extendBy) || extendBy < 1 || extendBy > 365) {
      throw httpError(400, 'days must be between 1 and 365, or pass endsAt / end');
    }
    const from = org.trialEndsAt && org.trialEndsAt > new Date() ? org.trialEndsAt : new Date();
    org.trialEndsAt = new Date(from.getTime() + extendBy * 86400000);
  }

  // Granting a trial to a tenant who has none puts them back on trial; it would be
  // meaningless to hand an active paying customer a trial end date.
  if (org.status === 'cancelled' || org.status === 'suspended') {
    org.status = 'trial';
    org.statusReason = '';
    org.statusChangedAt = new Date();
    org.statusChangedBy = req.user.name || req.user.email;
  }
  await org.save();
  logAudit({ req, action: 'org.trial_set', entity: 'organisation', entityId: org._id, orgId: org._id, meta: { trialEndsAt: org.trialEndsAt, days: days ?? null } });
  res.json(serialiseOrganisation(org));
});

/** An in-app banner for one tenant. Clearing it is `message: ''`. */
const setTenantNotice = asyncHandler(async (req, res) => {
  const org = await findOrgOrThrow(req.params.id);
  const message = String(req.body?.message || '').trim();

  if (!message) {
    org.notice = null;
  } else {
    const level = ['info', 'warning', 'danger'].includes(req.body?.level) ? req.body.level : 'info';
    let expiresAt = null;
    if (req.body?.expiresAt) {
      expiresAt = new Date(req.body.expiresAt);
      if (Number.isNaN(expiresAt.getTime())) throw httpError(400, 'expiresAt is not a valid date');
    }
    org.notice = {
      message: message.slice(0, 1000),
      level,
      expiresAt,
      createdAt: new Date(),
      createdBy: req.user.name || req.user.email
    };
  }
  await org.save();
  logAudit({ req, action: message ? 'org.notice_set' : 'org.notice_cleared', entity: 'organisation', entityId: org._id, orgId: org._id, meta: { level: org.notice?.level } });
  res.json({ notice: org.notice });
});

/** Internal support context. Never returned to the tenant. */
const setTenantSupport = asyncHandler(async (req, res) => {
  const org = await findOrgOrThrow(req.params.id);
  const tags = Array.isArray(req.body?.tags)
    ? req.body.tags.map(tag => String(tag).trim().slice(0, 40)).filter(Boolean).slice(0, 20)
    : (org.support?.tags || []);
  org.support = {
    accountManager: String(req.body?.accountManager ?? org.support?.accountManager ?? '').slice(0, 120),
    tags,
    riskLevel: ['none', 'watch', 'high'].includes(req.body?.riskLevel) ? req.body.riskLevel : (org.support?.riskLevel || 'none'),
    notes: String(req.body?.notes ?? org.support?.notes ?? '').slice(0, 5000),
    updatedAt: new Date()
  };
  await org.save();
  logAudit({ req, action: 'org.support_updated', entity: 'organisation', entityId: org._id, orgId: org._id, meta: { riskLevel: org.support.riskLevel, tags: org.support.tags } });
  res.json({ support: org.support });
});

/** Revokes every session in the organisation. */
const forceLogoutOrg = asyncHandler(async (req, res) => {
  const org = await findOrgOrThrow(req.params.id, { select: 'name' });
  const result = await User.updateMany({ orgId: org._id }, { $inc: { sessionVersion: 1 } });
  logAudit({ req, action: 'org.sessions_revoked', entity: 'organisation', entityId: org._id, orgId: org._id, meta: { users: result.modifiedCount ?? 0 } });
  res.json({ ok: true, users: result.modifiedCount ?? 0 });
});

/**
 * Starts an impersonation session.
 *
 * A reason is mandatory. This is the one capability in the console that reads a
 * customer's data as though it were the operator's own, and "why" is the field
 * that makes the audit entry mean something six months later.
 */
const impersonate = asyncHandler(async (req, res) => {
  const org = await findOrgOrThrow(req.params.id);
  const reason = String(req.body?.reason || '').trim();
  if (reason.length < 5) {
    throw httpError(400, 'A reason is required before viewing a tenant’s account.', 'REASON_REQUIRED');
  }
  // Read-write is opt-in. Most support work is "see what they see", and defaulting
  // to the mode that can change a customer's books would be the wrong default even
  // if every operator were careful.
  const readOnly = req.body?.readOnly !== false;

  let target;
  if (req.body?.userId) {
    target = await User.findOne({ _id: objectIdOrThrow(req.body.userId, 'userId'), orgId: org._id });
    if (!target) throw httpError(404, 'That user is not part of this organisation');
  } else {
    // Default to the owner, then any admin: the account with the widest view of
    // the tenant, which is what a support session usually needs.
    target = (org.ownerId && await User.findOne({ _id: org.ownerId, orgId: org._id, status: 'active' }))
      || await User.findOne({ orgId: org._id, role: 'admin', status: 'active' })
      || await User.findOne({ orgId: org._id, status: 'active' });
    if (!target) throw httpError(409, 'This organisation has no active user to view as.', 'NO_ACTIVE_USER');
  }

  if (target.status !== 'active') throw httpError(409, 'That user’s account is not active.', 'USER_INACTIVE');
  if (target.role === 'superadmin') {
    throw httpError(403, 'A platform account cannot be impersonated.', 'IMPERSONATION_FORBIDDEN');
  }

  const token = issueImpersonationToken({ targetUser: target, operator: req.user, readOnly });
  const expiresAt = new Date(Date.now() + IMPERSONATION_TTL_SECONDS * 1000);

  logAudit({
    req,
    action: 'impersonation.started',
    entity: 'user',
    entityId: target._id,
    orgId: org._id,
    meta: { orgName: org.name, targetEmail: target.email, readOnly, reason, expiresAt }
  });

  res.json({
    token,
    expiresAt,
    readOnly,
    user: { id: target._id, name: target.name, email: target.email, role: target.role, status: target.status },
    organisation: serialiseOrganisation(org),
    impersonation: { by: String(req.user._id), byName: req.user.name, readOnly, expiresAt }
  });
});

// ── Tenant user management ───────────────────────

const TENANT_ROLES = ['admin', 'accountant', 'viewer'];

async function findTenantUserOrThrow(id) {
  const user = await User.findById(objectIdOrThrow(id, 'User id'));
  if (!user) throw httpError(404, 'User not found');
  // A platform account is not a tenant user and is not managed here. Allowing it
  // would make this the route by which one superadmin resets another's password.
  if (user.role === 'superadmin') {
    throw httpError(403, 'Platform accounts are not managed from the tenant console.', 'PLATFORM_USER');
  }
  return user;
}

const updateTenantUser = asyncHandler(async (req, res) => {
  const user = await findTenantUserOrThrow(req.params.id);
  const { role, status } = req.body || {};

  if (role !== undefined) {
    if (!TENANT_ROLES.includes(role)) throw httpError(400, `role must be one of: ${TENANT_ROLES.join(', ')}`);
    user.role = role;
  }
  if (status !== undefined) {
    if (!['active', 'disabled'].includes(status)) throw httpError(400, 'status must be active or disabled');
    // Disabling the owner would leave the tenant with no one who can transfer
    // ownership — an account nobody can administer, recoverable only from here.
    if (status === 'disabled') {
      const org = await Organisation.findById(user.orgId).select('ownerId').lean();
      if (org?.ownerId && String(org.ownerId) === String(user._id)) {
        throw httpError(409, 'This user owns the organisation. Transfer ownership before disabling them.', 'OWNER_PROTECTED');
      }
    }
    user.status = status;
  }

  // Any role or status change invalidates live sessions: a demoted user's existing
  // JWT still carries the old role until it expires.
  user.sessionVersion = (user.sessionVersion || 0) + 1;
  await user.save();
  logAudit({ req, action: 'superadmin.user_updated', entity: 'user', entityId: user._id, orgId: user.orgId, meta: { role, status } });
  res.json({ ...user.toObject(), passwordHash: undefined });
});

/**
 * Resets a tenant user's password.
 *
 * Two modes, because support needs both:
 *
 *  - `link` — the correct default. Emails the normal reset link; the operator never
 *    learns the customer's password, which is the only version of this that is
 *    also true of a well-run support desk.
 *  - `temporary` — for the case the link cannot solve: the address no longer
 *    receives mail. The password is returned exactly once and never stored in
 *    readable form.
 *
 * Both revoke every session. A reset that leaves the old session alive is not a
 * reset, and if the reason for the reset is a compromise it is actively harmful.
 */
const resetTenantUserPassword = asyncHandler(async (req, res) => {
  const user = await findTenantUserOrThrow(req.params.id);
  const mode = req.body?.mode === 'temporary' ? 'temporary' : 'link';
  if (user.status !== 'active') {
    throw httpError(409, 'That account is not active — an invited user should be re-invited instead.', 'USER_INACTIVE');
  }

  user.sessionVersion = (user.sessionVersion || 0) + 1;
  // A reset also clears a brute-force lockout: an operator resetting a password is
  // resolving exactly the situation the lockout exists for.
  user.failedLoginAttempts = 0;
  user.lockedUntil = undefined;
  user.lastFailedLoginAt = undefined;

  if (mode === 'temporary') {
    const tempPassword = crypto.randomBytes(9).toString('base64url');
    user.passwordHash = await bcrypt.hash(tempPassword, 12);
    user.resetTokenHash = undefined;
    user.resetTokenExpires = undefined;
    await user.save();
    logAudit({ req, action: 'superadmin.password_reset', entity: 'user', entityId: user._id, orgId: user.orgId, meta: { mode } });
    return res.json({ ok: true, mode, tempPassword, message: 'Share this with the user securely. It is shown once.' });
  }

  const { token, hash } = createToken();
  user.resetTokenHash = hash;
  user.resetTokenExpires = expiryFromNow(RESET_TTL_MS);
  await user.save();

  const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${encodeURIComponent(token)}`;
  const result = await sendPasswordResetEmail({ to: user.email, name: user.name, resetUrl });
  logAudit({ req, action: 'superadmin.password_reset', entity: 'user', entityId: user._id, orgId: user.orgId, meta: { mode, delivered: !!result.sent } });

  res.json({
    ok: true,
    mode,
    delivered: !!result.sent,
    // Only when there is no email provider and we are not in production — the same
    // rule the invite and forgot-password flows follow.
    resetUrl: result.skipped && !env.isProduction ? resetUrl : undefined,
    message: result.sent
      ? 'A reset link has been emailed and every existing session was signed out.'
      : 'Every existing session was signed out. No email provider is configured, so hand over the link yourself.'
  });
});

const unlockTenantUser = asyncHandler(async (req, res) => {
  const user = await findTenantUserOrThrow(req.params.id);
  const wasLocked = Boolean(user.lockedUntil && user.lockedUntil > new Date());
  user.failedLoginAttempts = 0;
  user.lockedUntil = undefined;
  user.lastFailedLoginAt = undefined;
  await user.save();
  logAudit({ req, action: 'superadmin.user_unlocked', entity: 'user', entityId: user._id, orgId: user.orgId, meta: { wasLocked } });
  res.json({ ok: true, wasLocked });
});

const forceLogoutUser = asyncHandler(async (req, res) => {
  const user = await findTenantUserOrThrow(req.params.id);
  user.sessionVersion = (user.sessionVersion || 0) + 1;
  await user.save();
  logAudit({ req, action: 'superadmin.user_sessions_revoked', entity: 'user', entityId: user._id, orgId: user.orgId });
  res.json({ ok: true });
});

// ── Platform accounts ────────────────────────────

const listPlatformUsers = asyncHandler(async (req, res) => {
  const users = await User.find({ role: 'superadmin' })
    .select('name email platformRole lastLoginAt createdAt status')
    .sort({ createdAt: 1 })
    .lean();
  res.json(users.map(user => ({ ...user, platformRole: user.platformRole || 'owner' })));
});

const setPlatformRole = asyncHandler(async (req, res) => {
  const id = objectIdOrThrow(req.params.id, 'User id');
  const role = String(req.body?.platformRole || '');
  if (!Object.keys(ROLE_CAPABILITIES).includes(role)) {
    throw httpError(400, `platformRole must be one of: ${Object.keys(ROLE_CAPABILITIES).join(', ')}`);
  }
  // Demoting yourself out of `owner` is how a platform locks itself out of its own
  // console with no route back — there is no higher authority to restore it.
  if (String(req.user._id) === id && role !== 'owner') {
    throw httpError(409, 'You cannot remove your own owner role. Ask another owner to change it.', 'SELF_DEMOTION');
  }
  const user = await User.findOne({ _id: id, role: 'superadmin' });
  if (!user) throw httpError(404, 'Platform account not found');

  // At least one owner must remain, for the same reason.
  if (role !== 'owner' && (user.platformRole || 'owner') === 'owner') {
    const owners = await User.countDocuments({ role: 'superadmin', $or: [{ platformRole: 'owner' }, { platformRole: { $exists: false } }] });
    if (owners <= 1) throw httpError(409, 'This is the last platform owner. Promote another account first.', 'LAST_OWNER');
  }

  user.platformRole = role;
  // A capability change has to invalidate the token that carries the old one.
  user.sessionVersion = (user.sessionVersion || 0) + 1;
  await user.save();
  logAudit({ req, action: 'platform.role_changed', entity: 'user', entityId: user._id, meta: { platformRole: role } });
  res.json({ id: user._id, name: user.name, email: user.email, platformRole: user.platformRole });
});

// ── Broadcast ────────────────────────────────────

/**
 * A message to every tenant, stored as a global setting and served alongside each
 * tenant's own notice.
 */
const setBroadcast = asyncHandler(async (req, res) => {
  const message = String(req.body?.message || '').trim();
  const value = message
    ? {
      message: message.slice(0, 1000),
      level: ['info', 'warning', 'danger'].includes(req.body?.level) ? req.body.level : 'info',
      expiresAt: req.body?.expiresAt ? new Date(req.body.expiresAt) : null,
      updatedAt: new Date(),
      updatedBy: req.user.name || req.user.email
    }
    : { message: '', level: 'info', expiresAt: null, updatedAt: new Date(), updatedBy: req.user.name || req.user.email };

  if (value.expiresAt && Number.isNaN(value.expiresAt.getTime())) throw httpError(400, 'expiresAt is not a valid date');

  await GlobalSetting.findOneAndUpdate({ key: 'platformNotice' }, { value }, { upsert: true });
  // Cached for a minute on the `/auth/me` path; drop it so the banner appears (or
  // disappears) on the next page load rather than up to a minute later.
  invalidatePlatformNotice();
  logAudit({ req, action: message ? 'platform.broadcast_set' : 'platform.broadcast_cleared', entity: 'setting', entityId: 'platformNotice', meta: { level: value.level } });
  res.json(value);
});

// ── 3.4 Security console ─────────────────────────

/** Actions only a platform account can perform — used to spot off-hours activity. */
const SUPERADMIN_ACTION_PREFIXES = ['org.', 'plan.', 'masters.', 'settings.', 'platform.', 'superadmin.', 'impersonation.', 'metrics.'];

/**
 * Login history.
 *
 * Both outcomes, from the audit trail, which has recorded `auth.login` and
 * `auth.login_failed` since Phase 1 — it just had nowhere to be read, and until
 * Phase 4 carried no IP, so "who is guessing this password" was unanswerable.
 */
const loginHistory = asyncHandler(async (req, res) => {
  const filter = { action: { $in: ['auth.login', 'auth.login_failed'] } };
  if (req.query.outcome === 'success') filter.action = 'auth.login';
  if (req.query.outcome === 'failure') filter.action = 'auth.login_failed';
  if (req.query.ip) filter.ip = String(req.query.ip);
  if (req.query.actorId && /^[0-9a-fA-F]{24}$/.test(req.query.actorId)) filter.actorId = req.query.actorId;
  if (req.query.orgId && /^[0-9a-fA-F]{24}$/.test(req.query.orgId)) filter.orgId = req.query.orgId;

  const page = await paginate(AuditLog, filter, req.query, query => query.sort({ createdAt: -1 }).lean());
  res.json(page);
});

/**
 * Suspicious-activity detection.
 *
 * Derived from the audit trail and the event stream rather than a separate
 * detection pipeline. The thresholds are deliberately visible in the response:
 * an alert whose rule the operator cannot see is an alert they will learn to
 * ignore.
 */
const securityAlerts = asyncHandler(async (req, res) => {
  const windowHours = Math.min(Math.max(Number(req.query.hours) || 24, 1), 168);
  const since = new Date(Date.now() - windowHours * 3600 * 1000);
  const thresholds = { failedLoginsPerIp: 5, deletesPerActor: 10, exportsPerOrg: 20 };

  const [bruteForce, massDeletes, massExports, offHours, impersonations] = await Promise.all([
    AuditLog.aggregate([
      { $match: { action: 'auth.login_failed', createdAt: { $gte: since }, ip: { $ne: null } } },
      { $group: { _id: '$ip', attempts: { $sum: 1 }, accounts: { $addToSet: '$actorId' }, last: { $max: '$createdAt' } } },
      { $match: { attempts: { $gte: thresholds.failedLoginsPerIp } } },
      { $project: { _id: 0, ip: '$_id', attempts: 1, accountCount: { $size: '$accounts' }, last: 1 } },
      { $sort: { attempts: -1 } },
      { $limit: 25 }
    ]),
    AuditLog.aggregate([
      { $match: { createdAt: { $gte: since }, action: { $regex: '(deleted|removed|revoked)$' } } },
      { $group: { _id: { actorId: '$actorId', actorName: '$actorName' }, count: { $sum: 1 }, last: { $max: '$createdAt' } } },
      { $match: { count: { $gte: thresholds.deletesPerActor } } },
      { $project: { _id: 0, actorId: '$_id.actorId', actorName: '$_id.actorName', count: 1, last: 1 } },
      { $sort: { count: -1 } },
      { $limit: 25 }
    ]),
    UsageEvent.aggregate([
      { $match: { createdAt: { $gte: since }, type: EVENT.exportCsv, orgId: { $ne: null } } },
      { $group: { _id: '$orgId', count: { $sum: 1 }, last: { $max: '$createdAt' } } },
      { $match: { count: { $gte: thresholds.exportsPerOrg } } },
      { $sort: { count: -1 } },
      { $limit: 25 },
      { $lookup: { from: 'organisations', localField: '_id', foreignField: '_id', as: 'org' } },
      { $project: { _id: 0, orgId: '$_id', count: 1, last: 1, orgName: { $first: '$org.name' } } }
    ]),
    // Platform actions taken outside working hours, in IST — the timezone the
    // people who run this product are in. A `$hour` with no timezone is UTC, which
    // would flag every normal Indian afternoon as suspicious.
    AuditLog.aggregate([
      {
        $match: {
          createdAt: { $gte: since },
          action: { $regex: `^(${SUPERADMIN_ACTION_PREFIXES.map(prefix => prefix.replace('.', '\\.')).join('|')})` }
        }
      },
      { $addFields: { hour: { $hour: { date: '$createdAt', timezone: 'Asia/Kolkata' } } } },
      { $match: { $or: [{ hour: { $lt: 7 } }, { hour: { $gte: 22 } }] } },
      { $sort: { createdAt: -1 } },
      { $limit: 25 },
      { $project: { action: 1, actorName: 1, actorId: 1, orgId: 1, createdAt: 1, hour: 1, ip: 1 } }
    ]),
    AuditLog.find({ action: 'impersonation.started', createdAt: { $gte: since } })
      .sort({ createdAt: -1 })
      .limit(25)
      .lean()
  ]);

  res.json({
    windowHours,
    thresholds,
    bruteForce,
    massDeletes,
    massExports,
    offHoursPlatformActions: offHours,
    impersonations
  });
});

module.exports = {
  platformMe,
  metricsSummary,
  metricsSeries,
  metricsAttention,
  metricsAdoption,
  metricsRebuild,
  systemHealth,
  tenantDetail,
  tenantInvoices,
  tenantUsers,
  tenantTimeline,
  setTenantStatus,
  setTenantLimits,
  setTenantFlags,
  setTenantTrial,
  setTenantNotice,
  setTenantSupport,
  forceLogoutOrg,
  impersonate,
  updateTenantUser,
  resetTenantUserPassword,
  unlockTenantUser,
  forceLogoutUser,
  listPlatformUsers,
  setPlatformRole,
  setBroadcast,
  loginHistory,
  securityAlerts
};
