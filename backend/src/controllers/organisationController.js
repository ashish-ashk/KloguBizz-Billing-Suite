const bcrypt = require('bcryptjs');
const { Organisation } = require('../models/Organisation');
const { User } = require('../models/User');
const { asyncHandler } = require('../utils/asyncHandler');
const { httpError } = require('../utils/httpError');
const { logAudit } = require('../services/auditService');
const { pickFields } = require('../utils/pickFields');

// What a tenant admin may change about their own organisation: business
// profile, branding and theming. Everything else is platform-controlled and
// must not be reachable from here —
//   plan/status            → billing outcome, set only by the subscription
//                            flow or the super admin (otherwise a tenant
//                            simply PUTs itself onto the enterprise plan)
//   ownerId                → guarded by the password-confirmed
//                            transferOwnership flow below
//   invoiceSequence(FY)    → the atomic invoice counter; rewriting it causes
//                            duplicate invoice numbers
//   adminEmail             → identity, changed via the user record
const TENANT_EDITABLE_FIELDS = [
  'name', 'gstin', 'pan', 'phone', 'address', 'state', 'stateCode',
  'brandingConfig', 'themeConfig'
];

const getOrganisation = asyncHandler(async (req, res) => {
  const org = await Organisation.findById(req.orgId);
  if (!org) throw httpError(404, 'Organisation not found');
  res.json(org);
});

const updateOrganisation = asyncHandler(async (req, res) => {
  const update = pickFields(req.body, TENANT_EDITABLE_FIELDS);
  const org = await Organisation.findByIdAndUpdate(req.orgId, update, { new: true, runValidators: true });
  if (!org) throw httpError(404, 'Organisation not found');
  logAudit({ req, action: 'org.updated', entity: 'organisation', entityId: org._id, meta: { fields: Object.keys(update) } });
  res.json(org);
});

// Tenant owner hands the "owner" designation to another active teammate.
// Ownership is distinct from role: the outgoing owner keeps role 'admin'.
const transferOwnership = asyncHandler(async (req, res) => {
  const { newOwnerId, password } = req.body;
  if (!newOwnerId || !password) throw httpError(400, 'newOwnerId and password are required');

  const org = await Organisation.findById(req.orgId);
  if (!org) throw httpError(404, 'Organisation not found');

  // Pre-existing organisations may not have an ownerId yet (created before
  // this field existed) — treat the requesting admin as the implicit owner
  // rather than locking everyone out until a manual backfill runs.
  const currentOwnerId = org.ownerId ? String(org.ownerId) : String(req.user._id);
  if (currentOwnerId !== String(req.user._id)) {
    throw httpError(403, 'Only the current organisation owner can transfer ownership');
  }

  const actor = await User.findById(req.user._id);
  const validPassword = await bcrypt.compare(password, actor.passwordHash);
  if (!validPassword) throw httpError(401, 'Incorrect password');

  if (String(newOwnerId) === String(req.user._id)) {
    throw httpError(400, 'Choose a different teammate to transfer ownership to');
  }
  const target = await User.findOne({ _id: newOwnerId, orgId: req.orgId, status: 'active' });
  if (!target) throw httpError(404, 'That teammate was not found in your organisation');

  if (target.role !== 'admin') {
    target.role = 'admin';
    await target.save();
  }
  org.ownerId = target._id;
  await org.save();

  logAudit({
    req,
    action: 'org.ownership_transferred',
    entity: 'organisation',
    entityId: req.orgId,
    meta: { fromUserId: req.user._id, fromEmail: req.user.email, toUserId: target._id, toEmail: target.email }
  });

  res.json(org);
});

module.exports = { getOrganisation, updateOrganisation, transferOwnership };
