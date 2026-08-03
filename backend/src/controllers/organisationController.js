const bcrypt = require('bcryptjs');
const { Organisation } = require('../models/Organisation');
const { User } = require('../models/User');
const { Membership } = require('../models/Membership');
const { asyncHandler } = require('../utils/asyncHandler');
const { httpError } = require('../utils/httpError');
const { logAudit } = require('../services/auditService');
const { pickFields } = require('../utils/pickFields');
const { serialiseOrganisation, storeImage } = require('../services/brandingAssetService');
const { resolveFlags } = require('../services/featureFlagService');
const { noticesFor } = require('../services/noticeService');

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

/**
 * `support` is internal. It holds the account manager, risk level and whatever an
 * operator wrote in the notes field, none of which the customer should read — and
 * an "internal note" that ships to the subject of the note is not an internal note.
 * Selected out here rather than deleted afterwards, so a future field added to that
 * sub-document is excluded by default rather than leaked by omission.
 */
const TENANT_HIDDEN_FIELDS = '-support';

const getOrganisation = asyncHandler(async (req, res) => {
  const org = await Organisation.findById(req.orgId).select(TENANT_HIDDEN_FIELDS);
  if (!org) throw httpError(404, 'Organisation not found');
  const [flags, notices] = await Promise.all([resolveFlags(org), noticesFor(org)]);
  res.json({ ...serialiseOrganisation(org), flags, notices });
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

/**
 * Sub-objects that must *also* be merged field by field rather than written
 * whole.
 *
 * `invoiceDefaults` is here for exactly the reason `brandingConfig` is: it now
 * contains an image (`signatureUrl`) that is no longer sent to the client — it
 * comes back as an asset URL. A client that echoes `invoiceDefaults` back on an
 * unrelated save (changing the bank name, say) would write the whole
 * sub-document with an empty `signatureUrl` and silently erase the signature.
 * There is a test for precisely that.
 *
 * Everything else nested stays written-whole, which is correct: a
 * `customInvoiceTemplate` or a role's theme is chosen as a unit, not per field.
 */
const MERGEABLE_SUBOBJECTS = new Set(['brandingConfig.invoiceDefaults']);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function flattenForMerge(update) {
  const flat = {};
  for (const [key, value] of Object.entries(update)) {
    if (!MERGEABLE_OBJECTS.includes(key) || !isPlainObject(value)) {
      flat[key] = value;
      continue;
    }
    for (const [nestedKey, nestedValue] of Object.entries(value)) {
      const path = `${key}.${nestedKey}`;
      if (MERGEABLE_SUBOBJECTS.has(path) && isPlainObject(nestedValue)) {
        for (const [leafKey, leafValue] of Object.entries(nestedValue)) {
          flat[`${path}.${leafKey}`] = leafValue;
        }
        continue;
      }
      flat[path] = nestedValue;
    }
  }
  return flat;
}

/**
 * Uploaded images, and where each one is stored (#45).
 *
 * `field` is the dot path the client sends the data URI on; `key` is the dot
 * path the resulting storage key is written to. Both are written on every
 * upload — one with a value and one cleared — so the pair can never disagree
 * about which holds the current image.
 */
const IMAGE_FIELDS = [
  { kind: 'logo', field: 'brandingConfig.logoUrl', key: 'brandingConfig.logoKey' },
  { kind: 'header', field: 'brandingConfig.headerImageUrl', key: 'brandingConfig.headerImageKey' },
  {
    kind: 'signature',
    field: 'brandingConfig.invoiceDefaults.signatureUrl',
    key: 'brandingConfig.invoiceDefaults.signatureKey'
  }
];

/**
 * Routes any uploaded image through resize-and-store before the write.
 *
 * Mutates the already-flattened `$set` object in place: the client sends a data
 * URI on `brandingConfig.logoUrl`, and what actually gets written is either the
 * resized data URI (no external store) or a storage key with the inline field
 * cleared. Fields the request did not mention are left completely alone, which
 * is what makes this safe alongside the dot-path merge — an unrelated save must
 * not touch an image it never sent.
 */
async function placeUploadedImages(flat, orgId) {
  const outcomes = [];
  for (const { kind, field, key } of IMAGE_FIELDS) {
    if (!(field in flat)) continue;
    const placed = await storeImage({ scope: `org/${orgId}`, kind, dataUri: flat[field] });
    if (!placed) {
      // Present but not a usable image. Dropped rather than stored, so a
      // malformed upload cannot blank an existing logo by half-succeeding.
      delete flat[field];
      continue;
    }
    flat[field] = placed.dataUri;
    flat[key] = placed.key;
    outcomes.push({ kind, bytesIn: placed.bytesIn, bytesOut: placed.bytesOut, stored: placed.key ? 'object-storage' : 'inline' });
  }
  return outcomes;
}

const updateOrganisation = asyncHandler(async (req, res) => {
  const update = pickFields(req.body, TENANT_EDITABLE_FIELDS);
  const flat = flattenForMerge(update);
  const images = await placeUploadedImages(flat, req.orgId);

  const org = await Organisation.findByIdAndUpdate(
    req.orgId,
    { $set: flat },
    { new: true, runValidators: true }
  ).select(TENANT_HIDDEN_FIELDS);
  if (!org) throw httpError(404, 'Organisation not found');
  logAudit({
    req,
    action: 'org.updated',
    entity: 'organisation',
    entityId: org._id,
    // The image outcomes are recorded because "why is my logo blurry" and "did
    // that 4MB upload actually get resized" are otherwise unanswerable.
    meta: { fields: Object.keys(update), ...(images.length ? { images } : {}) }
  });
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
  // Resolved via Membership rather than User.orgId — a teammate can belong to
  // more than one organisation now (#53, #54), so "in my organisation" is a
  // membership fact.
  const target = await User.findOne({ _id: newOwnerId, status: 'active' });
  const membership = target && await Membership.findOne({ userId: target._id, orgId: req.orgId, status: 'active' });
  if (!target || !membership) throw httpError(404, 'That teammate was not found in your organisation');

  if (membership.role !== 'admin') {
    membership.role = 'admin';
    await membership.save();
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
