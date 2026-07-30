const bcrypt = require('bcryptjs');
const { Organisation } = require('../models/Organisation');
const { User } = require('../models/User');
const { Client } = require('../models/Client');
const { Item } = require('../models/Item');
const { Invoice } = require('../models/Invoice');
const { Payment } = require('../models/Payment');
const { CreditNote } = require('../models/CreditNote');
const { Vendor } = require('../models/Vendor');
const { Purchase } = require('../models/Purchase');
const { Subscription } = require('../models/Subscription');
const { asyncHandler } = require('../utils/asyncHandler');
const { httpError } = require('../utils/httpError');
const { logAudit } = require('../services/auditService');
const { serialiseOrganisation } = require('../services/brandingAssetService');
const { GRACE_DAYS } = require('../utils/softDelete');
const { recordEvent, EVENT } = require('../services/usageEventService');

/**
 * Data portability and erasure (#62).
 *
 * Under India's DPDP Act — and every comparable regime — a customer is entitled to
 * take their data with them and to have it deleted. Neither was possible: the only
 * export was a per-list CSV, and the only deletion was a superadmin cascade the tenant
 * had to ask for and could not verify.
 *
 * Both operations are deliberately shaped around the same principle: **the tenant does
 * not have to trust us to do it.** The export is complete and machine-readable rather
 * than a summary, and the erasure is confirmed, reasoned and logged, with the log
 * surviving the deletion so there is a record that it happened.
 */

/** Every tenant-scoped collection, with the field it is scoped by. */
const EXPORT_COLLECTIONS = [
  ['clients', Client, 'orgId'],
  ['items', Item, 'orgId'],
  ['vendors', Vendor, 'orgId'],
  ['invoices', Invoice, 'orgId'],
  ['creditNotes', CreditNote, 'orgId'],
  ['payments', Payment, 'orgId'],
  ['purchases', Purchase, 'orgId'],
  ['subscriptions', Subscription, 'orgId']
];

/**
 * Streams the whole tenant as one JSON document.
 *
 * Written directly to the response with a cursor per collection rather than assembled
 * in memory. A complete export is by definition the largest response the API ever
 * produces — for a busy tenant it is every invoice with every line item — and the
 * version that builds a string first is the version that works in testing and
 * times out for the customer who most needs it.
 *
 * Hand-written JSON framing (`"invoices": [` … `]`) is the price of streaming: there is
 * no way to `JSON.stringify` incrementally. Each *document* is still stringified whole,
 * so nothing is escaped by hand.
 */
const exportTenantData = asyncHandler(async (req, res) => {
  const org = await Organisation.findById(req.orgId).select('-support').lean();
  if (!org) throw httpError(404, 'Organisation not found');

  const users = await User.find({ orgId: req.orgId })
    // Never exported: a password hash is a credential, and an export lands in a
    // download folder. The MFA secret is the same argument twice over.
    .select('-passwordHash -mfa -inviteTokenHash -resetTokenHash -emailVerifyTokenHash')
    .lean();

  logAudit({ req, action: 'org.data_exported', entity: 'organisation', entityId: req.orgId });
  recordEvent({ req, type: EVENT.exportCsv, meta: { of: 'full-tenant-export' } });

  res.setHeader('Content-Type', 'application/json');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="klogubizz-export-${String(org.name || 'organisation').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json"`
  );

  res.write('{\n');
  res.write(`  "exportedAt": ${JSON.stringify(new Date().toISOString())},\n`);
  res.write('  "format": "klogubizz-tenant-export/1",\n');
  res.write(`  "organisation": ${JSON.stringify(serialiseOrganisation(org))},\n`);
  res.write(`  "users": ${JSON.stringify(users)},\n`);

  for (let index = 0; index < EXPORT_COLLECTIONS.length; index += 1) {
    const [name, Model, field] = EXPORT_COLLECTIONS[index];
    res.write(`  ${JSON.stringify(name)}: [`);
    const cursor = Model.find({ [field]: req.orgId }).lean().cursor();
    let first = true;
    for await (const doc of cursor) {
      // Back-pressure matters here: without awaiting the drain, a fast cursor on a slow
      // connection buffers the entire export in the socket's write queue, which is the
      // memory problem this was written to avoid.
      const chunk = `${first ? '' : ','}\n    ${JSON.stringify(doc)}`;
      first = false;
      if (!res.write(chunk)) {
        await new Promise(resolve => { res.once('drain', resolve); });
      }
    }
    res.write(first ? ']' : '\n  ]');
    res.write(index === EXPORT_COLLECTIONS.length - 1 ? '\n' : ',\n');
  }
  res.write('}\n');
  res.end();
});

/**
 * Requests deletion of the organisation and everything in it.
 *
 * Three guards, each for a different mistake:
 *
 *  - **Owner only.** An admin is not the account holder, and an accountant with an
 *    admin role should not be able to end the business's account.
 *  - **Password.** The single most consequential action in the product, and a stolen
 *    session should not be enough to perform it.
 *  - **Type the name.** Distinguishes intent from a mis-click, the same guard the
 *    superadmin cascade uses.
 *
 * And a grace period rather than an immediate wipe: a deletion made in anger, or by
 * someone who did not realise their invoices were the only copy, is otherwise
 * unrecoverable — and in India a business is required to retain tax records for years,
 * so "delete everything now" is frequently the wrong thing to grant literally.
 */
const requestDeletion = asyncHandler(async (req, res) => {
  const org = await Organisation.findById(req.orgId);
  if (!org) throw httpError(404, 'Organisation not found');
  if (org.deletedAt) {
    throw httpError(409, 'This account is already scheduled for deletion.', 'ALREADY_SCHEDULED');
  }

  const ownerId = org.ownerId ? String(org.ownerId) : null;
  if (ownerId && ownerId !== String(req.user._id)) {
    throw httpError(403, 'Only the account owner can delete the organisation.', 'OWNER_ONLY');
  }

  const confirmation = String(req.body?.confirmName || '').trim();
  if (confirmation !== org.name) {
    throw httpError(400, `Type the organisation's name exactly ("${org.name}") to confirm.`, 'CONFIRMATION_MISMATCH');
  }

  const actor = await User.findById(req.user._id);
  const passwordOk = await bcrypt.compare(String(req.body?.password || ''), actor.passwordHash);
  if (!passwordOk) throw httpError(401, 'Your password is incorrect.');

  const purgeAt = new Date(Date.now() + GRACE_DAYS * 86400000);
  org.deletedAt = new Date();
  org.deletionRequestedBy = req.user.email;
  org.deletionReason = String(req.body?.reason || '').slice(0, 500);
  // Cancelled, not suspended: the tenant chose this, and the read-only-with-exports
  // behaviour of a cancelled account is exactly right for the grace window — they can
  // still take their data out.
  org.status = 'cancelled';
  org.statusReason = 'Account deletion requested by the owner.';
  org.statusChangedAt = new Date();
  org.statusChangedBy = req.user.email;
  await org.save();

  logAudit({
    req,
    action: 'org.deletion_requested',
    entity: 'organisation',
    entityId: org._id,
    orgId: org._id,
    // This entry outlives the organisation: AuditLog is excluded from the cascade, so
    // it is the surviving record that the deletion was asked for and by whom.
    meta: { requestedBy: req.user.email, reason: org.deletionReason, purgeAt, graceDays: GRACE_DAYS }
  });

  res.json({
    ok: true,
    scheduledFor: purgeAt,
    graceDays: GRACE_DAYS,
    message: `Your account is scheduled for permanent deletion on ${purgeAt.toDateString()}. `
      + 'Until then you can still sign in, export your records, and cancel the request.'
  });
});

/** Cancels a pending deletion inside the grace window. */
const cancelDeletion = asyncHandler(async (req, res) => {
  const org = await Organisation.findById(req.orgId);
  if (!org?.deletedAt) throw httpError(409, 'No deletion is scheduled for this account.', 'NOT_SCHEDULED');

  const ownerId = org.ownerId ? String(org.ownerId) : null;
  if (ownerId && ownerId !== String(req.user._id)) {
    throw httpError(403, 'Only the account owner can cancel the deletion.', 'OWNER_ONLY');
  }

  org.deletedAt = null;
  org.deletionRequestedBy = '';
  org.deletionReason = '';
  org.status = 'active';
  org.statusReason = '';
  org.statusChangedAt = new Date();
  org.statusChangedBy = req.user.email;
  await org.save();

  logAudit({ req, action: 'org.deletion_cancelled', entity: 'organisation', entityId: org._id, orgId: org._id });
  res.json({ ok: true, message: 'The deletion request has been cancelled and your account is active again.' });
});

/** What the tenant needs to see on their privacy page. */
const dataRightsStatus = asyncHandler(async (req, res) => {
  const org = await Organisation.findById(req.orgId).select('name deletedAt deletionRequestedBy ownerId status').lean();
  if (!org) throw httpError(404, 'Organisation not found');

  const counts = await Promise.all(EXPORT_COLLECTIONS.map(([name, Model, field]) =>
    Model.countDocuments({ [field]: req.orgId }).then(count => [name, count])));

  res.json({
    organisation: org.name,
    isOwner: !org.ownerId || String(org.ownerId) === String(req.user._id),
    records: Object.fromEntries(counts),
    deletion: org.deletedAt
      ? {
        requested: true,
        requestedAt: org.deletedAt,
        requestedBy: org.deletionRequestedBy,
        scheduledFor: new Date(new Date(org.deletedAt).getTime() + GRACE_DAYS * 86400000)
      }
      : { requested: false, graceDays: GRACE_DAYS }
  });
});

module.exports = {
  EXPORT_COLLECTIONS,
  exportTenantData,
  requestDeletion,
  cancelDeletion,
  dataRightsStatus
};
