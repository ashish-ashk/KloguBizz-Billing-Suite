const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { User } = require('../models/User');
const { Membership } = require('../models/Membership');
const { Organisation } = require('../models/Organisation');
const { asyncHandler } = require('../utils/asyncHandler');
const { httpError } = require('../utils/httpError');
const { tenantFilter } = require('../middleware/tenantMiddleware');
const { sendInviteEmail, sendCredentialsEmail, sendAddedToOrgEmail } = require('../services/emailService');
const { assertUserQuota } = require('../services/planService');
const { logAudit } = require('../services/auditService');
const { pickFields } = require('../utils/pickFields');
const { createToken, expiryFromNow, INVITE_TTL_MS } = require('../services/tokenService');
const { revokeAllForUser } = require('../services/sessionService');
const { env } = require('../config/env');
const { CURRENT_TERMS_VERSION } = require('../config/legal');

// Roles a tenant admin is allowed to hand out. Deliberately excludes
// 'superadmin': that role is in the User enum because the platform owner
// account uses it, and requireRole() only reads req.user.role — so letting an
// org admin assign it through this route would hand out full platform control.
const ASSIGNABLE_ROLES = ['admin', 'accountant', 'viewer'];
// 'invited' is set by the invite flow itself, never by an edit.
const ASSIGNABLE_STATUSES = ['active', 'disabled'];

// An admin may not change the role/status of, or remove, the user who
// currently holds Organisation.ownerId — ownership must be transferred
// (see organisationController.transferOwnership) before that user's
// account can be touched. If the org has no ownerId yet (legacy/pre-
// migration), org?.ownerId is falsy and this is a no-op.
async function assertNotProtectedOwner(req, targetUserId) {
  const org = await Organisation.findById(req.orgId).select('ownerId').lean();
  if (org?.ownerId && String(org.ownerId) === String(targetUserId)) {
    throw httpError(
      403,
      'This user is the organisation owner and cannot be edited or removed. Transfer ownership to another teammate first.',
      'OWNER_PROTECTED'
    );
  }
}

/** Shapes a (User, Membership) pair into the wire `OrgUser` shape — role and
 *  status now live on the membership, not the user (#53, #54), but nothing
 *  downstream needs to know memberships exist underneath the team list. */
function shapeOrgUser(user, membership) {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: membership.role,
    status: membership.status,
    lastLoginAt: user.lastLoginAt,
    createdAt: membership.createdAt || user.createdAt
  };
}

const listUsers = asyncHandler(async (req, res) => {
  const memberships = await Membership.find(tenantFilter(req)).sort({ createdAt: -1 }).lean();
  const users = await User.find({ _id: { $in: memberships.map(m => m.userId) } }).select('-passwordHash').lean();
  const byId = new Map(users.map(u => [String(u._id), u]));
  res.json(memberships.map(m => byId.has(String(m.userId)) ? shapeOrgUser(byId.get(String(m.userId)), m) : null).filter(Boolean));
});

/**
 * Issues a fresh invite token for a brand-new identity and emails the link.
 *
 * Shared by invite and resend so the two can't drift. Only the hash is stored
 * (see services/tokenService.js) and any previous token for this user is
 * replaced, which is what makes resending implicitly revoke the old link.
 *
 * Only ever used for a `User` created solely by this invite — an already-active
 * identity added to a further organisation has nothing to accept, see
 * inviteUser below.
 */
async function issueInvite(user, membership, req, orgName) {
  const { token, hash } = createToken();
  user.inviteTokenHash = hash;
  user.inviteTokenExpires = expiryFromNow(INVITE_TTL_MS);
  user.invitedAt = new Date();
  await user.save();

  const inviteUrl = `${env.FRONTEND_URL}/accept-invite?token=${encodeURIComponent(token)}`;
  const result = await sendInviteEmail({
    orgId: membership.orgId,
    to: user.email,
    name: user.name,
    inviteUrl,
    orgName,
    inviterName: req.user?.name,
    expiresAt: user.inviteTokenExpires
  });

  // In local mode there's no email, so the link is returned for hand-off. Never
  // in production, where an admin could otherwise harvest a working credential
  // for an address they don't control.
  return { inviteUrl: result.skipped && !env.isProduction ? inviteUrl : undefined, delivered: !!result.sent };
}

/**
 * A temporary password for a brand-new invitee (#65).
 *
 * Excludes visually ambiguous characters (0/O, 1/l/I) since a person may need to
 * type this by hand from the email rather than paste it. 14 characters from this
 * 60-character set is well over 80 bits of entropy — comfortably more than the
 * account needs for the short window before `mustChangePassword` forces it to be
 * replaced with one the person chose themselves.
 */
const TEMP_PASSWORD_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
function generateTempPassword(length = 14) {
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i += 1) out += TEMP_PASSWORD_CHARSET[bytes[i] % TEMP_PASSWORD_CHARSET.length];
  return out;
}

/**
 * Adds someone to the team.
 *
 * Three cases, because `User.email` is a single global identity but a person
 * can now belong to more than one organisation (#53, #54):
 *
 *  1. Genuinely new email — create the identity and its first membership
 *     together, both active immediately with a system-generated temporary
 *     password (#65) rather than a pending invite to accept.
 *  2. An existing, already-active identity with no membership here yet — link
 *     immediately. There is nothing to accept: the person can already sign
 *     in, and the new organisation is simply there next time (or right away,
 *     via the org-switcher). This is the fix for #53 — inviting an
 *     accountant who already has their own KloguBizz account into a second
 *     business used to be flatly refused as "already registered". Since #65,
 *     this is also where a brand-new invitee's *second* invite lands — their
 *     first invite already made them case 2's "existing, already-active"
 *     identity, so there is no more in-between state to block on.
 *  3. An existing identity invited elsewhere and never activated — refused:
 *     there is no working password yet for that identity to sign in with, so
 *     it cannot be an instant add. Only reachable for a row that predates
 *     #65 — a fresh invite is case 1 above and is never left in this state.
 */
const inviteUser = asyncHandler(async (req, res) => {
  const { name, email, role = 'viewer' } = req.body;
  if (!name || !email) throw httpError(400, 'name and email are required');
  await assertUserQuota(req.orgId);

  const normalisedEmail = String(email).toLowerCase();
  const org = await Organisation.findById(req.orgId).select('name').lean();
  const existing = await User.findOne({ email: normalisedEmail });

  if (existing) {
    const membership = await Membership.findOne({ userId: existing._id, orgId: req.orgId });
    if (membership) {
      if (membership.status !== 'disabled') {
        throw httpError(409, `${email} is already on your team.`, 'EMAIL_IN_USE');
      }
      // Was removed before — re-add rather than error. The identity and its
      // history (audit entries, invoices they issued) are still valid.
      membership.role = role;
      membership.status = 'active';
      await membership.save();
      logAudit({ req, action: 'user.invited', entity: 'user', entityId: existing._id, meta: { email, role, reactivated: true } });
      const result = await sendAddedToOrgEmail({ to: existing.email, name: existing.name, orgName: org?.name, inviterName: req.user?.name, orgId: req.orgId });
      return res.status(201).json({ user: shapeOrgUser(existing, membership), delivered: !!result.sent });
    }

    if (existing.status !== 'active') {
      throw httpError(
        409,
        'That email address has a pending invitation elsewhere that hasn’t been accepted yet.',
        'EMAIL_IN_USE'
      );
    }

    const newMembership = await Membership.create({ userId: existing._id, orgId: req.orgId, role, status: 'active' });
    logAudit({ req, action: 'user.invited', entity: 'user', entityId: existing._id, meta: { email, role, linkedExisting: true } });
    const result = await sendAddedToOrgEmail({ to: existing.email, name: existing.name, orgName: org?.name, inviterName: req.user?.name, orgId: req.orgId });
    return res.status(201).json({ user: shapeOrgUser(existing, newMembership), delivered: !!result.sent });
  }

  /**
   * The account is created active, with a real (system-generated) password, and
   * usable the instant this responds — not a token-link the invitee has to
   * complete first (#65). `mustChangePassword` is what keeps that safe: every
   * route except the ones needed to change it refuses until they have, via
   * `middleware/accountGuards.js#requirePasswordChange` — the same shape already
   * used to make superadmin MFA enrolment mandatory without being a lockout.
   */
  const tempPassword = generateTempPassword();
  const user = await User.create({
    orgId: req.orgId, // legacy "home org" only — see models/User.js
    name,
    email,
    role,
    status: 'active',
    mustChangePassword: true,
    passwordHash: await bcrypt.hash(tempPassword, 12)
  });
  const membership = await Membership.create({ userId: user._id, orgId: req.orgId, role, status: 'active' });

  const result = await sendCredentialsEmail({
    orgId: req.orgId,
    to: user.email,
    name: user.name,
    tempPassword,
    loginUrl: `${env.FRONTEND_URL}/login`,
    orgName: org?.name,
    inviterName: req.user?.name
  });
  const delivered = !!result.sent;
  logAudit({ req, action: 'user.invited', entity: 'user', entityId: user._id, meta: { email, role, delivered } });
  // In local mode there's no email, so the temp password is returned for hand-off.
  // Never in production, where an admin could otherwise harvest a working
  // credential for an address they don't control.
  res.status(201).json({
    user: shapeOrgUser(user, membership),
    delivered,
    tempPassword: result.skipped && !env.isProduction ? tempPassword : undefined
  });
});

/**
 * Sends a new invitation link, replacing any outstanding one.
 *
 * Needed because invites expire, and because the original link may never have
 * arrived — without this an admin's only recourse was to delete the user and
 * start again.
 */
const resendInvite = asyncHandler(async (req, res) => {
  const membership = await Membership.findOne({ userId: req.params.id, ...tenantFilter(req) });
  if (!membership) throw httpError(404, 'User not found');
  if (membership.status !== 'invited') {
    throw httpError(409, 'That user has already activated their account.', 'ALREADY_ACTIVE');
  }
  const user = await User.findById(membership.userId);
  if (!user) throw httpError(404, 'User not found');
  const org = await Organisation.findById(req.orgId).select('name').lean();
  const { inviteUrl, delivered } = await issueInvite(user, membership, req, org?.name);
  logAudit({ req, action: 'user.invite_resent', entity: 'user', entityId: user._id, meta: { email: user.email, delivered } });
  res.json({ user: shapeOrgUser(user, membership), inviteUrl, delivered });
});

/**
 * Withdraws a pending invitation.
 *
 * A hard delete rather than the soft-disable used for real users: nobody has
 * ever signed in to this record, it owns no data, and removing it frees both
 * the plan seat and the globally-unique email address for re-inviting. An
 * 'invited' membership only ever exists for a brand-new identity created
 * solely by that invite (see inviteUser above), so it is always safe to
 * remove the identity along with it.
 */
const revokeInvite = asyncHandler(async (req, res) => {
  const membership = await Membership.findOne({ userId: req.params.id, ...tenantFilter(req) });
  if (!membership) throw httpError(404, 'User not found');
  if (membership.status !== 'invited') {
    throw httpError(409, 'That user has already activated their account — disable them instead.', 'ALREADY_ACTIVE');
  }
  const user = await User.findById(membership.userId);
  await membership.deleteOne();
  if (user) await user.deleteOne();
  logAudit({ req, action: 'user.invite_revoked', entity: 'user', entityId: membership.userId, meta: { email: user?.email } });
  res.status(204).end();
});

// Authenticated user changes their own password.
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword, acceptTerms } = req.body;
  if (!currentPassword || !newPassword) throw httpError(400, 'currentPassword and newPassword are required');
  if (newPassword.length < 8) throw httpError(400, 'New password must be at least 8 characters');
  const user = await User.findById(req.user._id);
  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw httpError(401, 'Current password is incorrect');

  /**
   * The tenant-invite flow (#65) creates the account active immediately with a
   * system-generated password, and never asked the invitee to accept the Terms &
   * Conditions/SLA the way `register` and the legacy accept-invite flow both do —
   * a real gap, not a shortcut. This mandatory first password change is the one
   * guaranteed moment the invitee interacts with their own account, so it doubles
   * as that acceptance. `termsAcceptedAt` already unset is what scopes this to
   * only that first change — a routine later password change doesn't re-ask.
   */
  if (user.mustChangePassword && !user.termsAcceptedAt) {
    if (acceptTerms !== true) {
      throw httpError(400, 'You must accept the Terms & Conditions and SLA to continue');
    }
    user.termsAcceptedAt = new Date();
    user.termsVersion = CURRENT_TERMS_VERSION;
  }

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  // Clears the tenant-invite gate (#65) — a no-op for anyone who didn't have it set.
  user.mustChangePassword = false;
  // Invalidate other active sessions in case the password was compromised.
  user.sessionVersion = (user.sessionVersion || 0) + 1;
  await user.save();
  await revokeAllForUser(user._id, 'password_changed');
  logAudit({ req, action: 'user.password_changed', entity: 'user', entityId: user._id });
  res.json({ ok: true });
});

const updateUser = asyncHandler(async (req, res) => {
  await assertNotProtectedOwner(req, req.params.id);
  // Only these three fields — see ASSIGNABLE_ROLES above for why role in
  // particular has to be checked rather than left to the schema enum.
  const update = pickFields(req.body, ['name', 'role', 'status']);
  if (update.role !== undefined && !ASSIGNABLE_ROLES.includes(update.role)) {
    throw httpError(400, `Role must be one of: ${ASSIGNABLE_ROLES.join(', ')}`);
  }
  if (update.status !== undefined && !ASSIGNABLE_STATUSES.includes(update.status)) {
    throw httpError(400, `Status must be one of: ${ASSIGNABLE_STATUSES.join(', ')}`);
  }

  // Role and status live on the membership now, not the user (#53, #54) — the
  // same identity might hold a different role in another organisation.
  const membership = await Membership.findOne({ userId: req.params.id, ...tenantFilter(req) });
  if (!membership) throw httpError(404, 'User not found');
  if (update.role !== undefined) membership.role = update.role;
  if (update.status !== undefined) membership.status = update.status;
  await membership.save();

  const updateFields = {};
  if (update.name !== undefined) updateFields.name = update.name; // identity-level, shared across every membership
  const user = await User.findOneAndUpdate({ _id: req.params.id }, updateFields, { new: true, runValidators: true }).select('-passwordHash');
  if (!user) throw httpError(404, 'User not found');

  // Disabling an account has to also cut its live sessions — the access token
  // stays valid otherwise until it expires, and a refresh token would keep
  // minting fresh ones right past the change.
  if (update.status === 'disabled' || update.role !== undefined) {
    await User.updateOne({ _id: user._id }, { $inc: { sessionVersion: 1 } });
    await revokeAllForUser(user._id, 'admin_revoked');
  }
  logAudit({ req, action: 'user.updated', entity: 'user', entityId: user._id, meta: { fields: Object.keys(update), role: update.role, status: update.status } });
  res.json(shapeOrgUser(user, membership));
});

const removeUser = asyncHandler(async (req, res) => {
  await assertNotProtectedOwner(req, req.params.id);
  const membership = await Membership.findOneAndUpdate(
    { userId: req.params.id, ...tenantFilter(req) },
    { status: 'disabled' },
    { new: true }
  );
  if (!membership) throw httpError(404, 'User not found');
  const user = await User.findById(req.params.id).select('-passwordHash');
  if (!user) throw httpError(404, 'User not found');
  // Same reasoning as updateUser: revoke the removed user's live sessions.
  await User.updateOne({ _id: user._id }, { $inc: { sessionVersion: 1 } });
  await revokeAllForUser(user._id, 'admin_revoked');
  logAudit({ req, action: 'user.removed', entity: 'user', entityId: user._id, meta: { email: user.email } });
  res.json(shapeOrgUser(user, membership));
});

module.exports = {
  listUsers, inviteUser, resendInvite, revokeInvite,
  updateUser, removeUser, changePassword
};
