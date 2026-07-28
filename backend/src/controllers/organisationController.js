const bcrypt = require('bcryptjs');
const { Organisation } = require('../models/Organisation');
const { User } = require('../models/User');
const { asyncHandler } = require('../utils/asyncHandler');
const { httpError } = require('../utils/httpError');
const { logAudit } = require('../services/auditService');
const { pickFields } = require('../utils/pickFields');
const { serialiseOrganisation } = require('../services/brandingAssetService');

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
  res.json(serialiseOrganisation(org));
});

/**
 * Nested config objects are applied as a merge, not a replacement.
 *
 * `findByIdAndUpdate(id, { brandingConfig: {...} })` replaces the entire
 * sub-document, so any key the client left out is wiped. That was survivable
 * only because the frontend always sent every branding field back — including
 * re-uploading the full base64 logo on a change of accent colour.
 *
 * Now that the logo is *not* sent to the client (it comes back as an asset URL),
 * a whole-object write would blank it on the next unrelated save. Flattening to
 * dot paths makes a partial update mean what it says: send the two fields you
 * changed, leave the rest alone. Removing an image is still possible — it is an
 * explicit `logoUrl: ''`, which is present and therefore applied.
 */
const MERGEABLE_OBJECTS = ['brandingConfig', 'themeConfig'];

function flattenForMerge(update) {
  const flat = {};
  for (const [key, value] of Object.entries(update)) {
    const isMergeable = MERGEABLE_OBJECTS.includes(key)
      && value !== null
      && typeof value === 'object'
      && !Array.isArray(value);
    if (!isMergeable) {
      flat[key] = value;
      continue;
    }
    for (const [nestedKey, nestedValue] of Object.entries(value)) {
      // One level deep is enough for every config this schema has, and it keeps
      // the paths readable. A nested object (customInvoiceTemplate, a role's
      // theme) is still written whole, which is correct — those are chosen as a
      // unit, not field by field.
      flat[`${key}.${nestedKey}`] = nestedValue;
    }
  }
  return flat;
}

const updateOrganisation = asyncHandler(async (req, res) => {
  const update = pickFields(req.body, TENANT_EDITABLE_FIELDS);
  const org = await Organisation.findByIdAndUpdate(
    req.orgId,
    { $set: flattenForMerge(update) },
    { new: true, runValidators: true }
  );
  if (!org) throw httpError(404, 'Organisation not found');
  logAudit({ req, action: 'org.updated', entity: 'organisation', entityId: org._id, meta: { fields: Object.keys(update) } });
  res.json(serialiseOrganisation(org));
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

  res.json(serialiseOrganisation(org));
});

module.exports = { getOrganisation, updateOrganisation, transferOwnership };
