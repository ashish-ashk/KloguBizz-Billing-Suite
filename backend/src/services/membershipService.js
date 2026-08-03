const { Membership } = require('../models/Membership');

/**
 * Picks which organisation a login (or a refreshed token) should be *for*,
 * now that a user can have more than one active membership (#53, #54).
 *
 * `user.lastActiveOrgId` wins if it still resolves to an active membership —
 * a login should land where the person was last working, not an arbitrary
 * one. Otherwise the earliest-joined active membership, so the choice is at
 * least deterministic rather than whatever order Mongo happens to return.
 *
 * Returns `null` when the user has no active membership at all (a disabled
 * or fully-removed tenant identity) — `authPayload` renders that as
 * `organisation: null`, the same shape a platform account already gets.
 */
async function resolveDefaultMembership(user) {
  if (user.lastActiveOrgId) {
    const preferred = await Membership.findOne({ userId: user._id, orgId: user.lastActiveOrgId, status: 'active' }).lean();
    if (preferred) return preferred;
  }
  return Membership.findOne({ userId: user._id, status: 'active' }).sort({ createdAt: 1 }).lean();
}

/** The membership `protect` trusts for a given token's `orgId` claim. */
async function getActiveMembership(userId, orgId) {
  if (!orgId) return null;
  return Membership.findOne({ userId, orgId, status: 'active' }).lean();
}

/** The org-switcher list on `/auth/me`: every org this identity can act in. */
async function listMemberships(userId) {
  const memberships = await Membership.find({ userId, status: 'active' })
    .populate('orgId', 'name')
    .sort({ createdAt: 1 })
    .lean();
  return memberships
    .filter(m => m.orgId) // an org mid-delete-cascade shouldn't crash this list
    .map(m => ({ orgId: String(m.orgId._id), orgName: m.orgId.name, role: m.role }));
}

module.exports = { resolveDefaultMembership, getActiveMembership, listMemberships };
