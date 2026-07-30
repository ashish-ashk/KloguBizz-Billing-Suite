const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { User } = require('../models/User');
const { Organisation } = require('../models/Organisation');
const { asyncHandler } = require('../utils/asyncHandler');
const { httpError } = require('../utils/httpError');
const { tenantFilter } = require('../middleware/tenantMiddleware');
const { sendInviteEmail } = require('../services/emailService');
const { assertUserQuota } = require('../services/planService');
const { logAudit } = require('../services/auditService');
const { pickFields } = require('../utils/pickFields');
const { createToken, expiryFromNow, INVITE_TTL_MS } = require('../services/tokenService');
const { env } = require('../config/env');

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

const listUsers = asyncHandler(async (req, res) => {
  const users = await User.find(tenantFilter(req)).select('-passwordHash').sort({ createdAt: -1 });
  res.json(users);
});

/**
 * Issues a fresh invite token and emails the link.
 *
 * Shared by invite and resend so the two can't drift. Only the hash is stored
 * (see services/tokenService.js) and any previous token for this user is
 * replaced, which is what makes resending implicitly revoke the old link.
 */
async function issueInvite(user, req) {
  const { token, hash } = createToken();
  user.inviteTokenHash = hash;
  user.inviteTokenExpires = expiryFromNow(INVITE_TTL_MS);
  user.invitedAt = new Date();
  await user.save();

  const org = await Organisation.findById(user.orgId).select('name').lean();
  const inviteUrl = `${env.FRONTEND_URL}/accept-invite?token=${encodeURIComponent(token)}`;
  const result = await sendInviteEmail({
    orgId: user.orgId,
    to: user.email,
    name: user.name,
    inviteUrl,
    orgName: org?.name,
    inviterName: req.user?.name,
    expiresAt: user.inviteTokenExpires
  });

  // In local mode there's no email, so the link is returned for hand-off. Never
  // in production, where an admin could otherwise harvest a working credential
  // for an address they don't control.
  return { inviteUrl: result.skipped && !env.isProduction ? inviteUrl : undefined, delivered: !!result.sent };
}

const inviteUser = asyncHandler(async (req, res) => {
  const { name, email, role = 'viewer' } = req.body;
  if (!name || !email) throw httpError(400, 'name and email are required');
  await assertUserQuota(req.orgId);

  const existing = await User.findOne({ email: String(email).toLowerCase() });
  if (existing) {
    // Emails are globally unique, so say something useful rather than letting
    // the raw duplicate-key error surface.
    const sameOrg = String(existing.orgId) === String(req.orgId);
    throw httpError(
      409,
      sameOrg
        ? `${email} is already on your team.`
        : 'That email address is already registered on KloguBizz.',
      'EMAIL_IN_USE'
    );
  }

  const user = await User.create({
    orgId: req.orgId,
    name,
    email,
    role,
    status: 'invited',
    // A random unusable password: the account has no password until the invite
    // is redeemed, and this keeps the required field satisfied without leaving
    // a guessable value behind.
    passwordHash: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12)
  });

  const { inviteUrl, delivered } = await issueInvite(user, req);
  logAudit({ req, action: 'user.invited', entity: 'user', entityId: user._id, meta: { email, role, delivered } });
  res.status(201).json({ user: { ...user.toObject(), passwordHash: undefined }, inviteUrl, delivered });
});

/**
 * Sends a new invitation link, replacing any outstanding one.
 *
 * Needed because invites expire, and because the original link may never have
 * arrived — without this an admin's only recourse was to delete the user and
 * start again.
 */
const resendInvite = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, ...tenantFilter(req) });
  if (!user) throw httpError(404, 'User not found');
  if (user.status !== 'invited') {
    throw httpError(409, `${user.name} has already activated their account.`, 'ALREADY_ACTIVE');
  }
  const { inviteUrl, delivered } = await issueInvite(user, req);
  logAudit({ req, action: 'user.invite_resent', entity: 'user', entityId: user._id, meta: { email: user.email, delivered } });
  res.json({ user: { ...user.toObject(), passwordHash: undefined }, inviteUrl, delivered });
});

/**
 * Withdraws a pending invitation.
 *
 * A hard delete rather than the soft-disable used for real users: nobody has
 * ever signed in to this record, it owns no data, and removing it frees both
 * the plan seat and the globally-unique email address for re-inviting.
 */
const revokeInvite = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, ...tenantFilter(req) });
  if (!user) throw httpError(404, 'User not found');
  if (user.status !== 'invited') {
    throw httpError(409, 'That user has already activated their account — disable them instead.', 'ALREADY_ACTIVE');
  }
  await user.deleteOne();
  logAudit({ req, action: 'user.invite_revoked', entity: 'user', entityId: user._id, meta: { email: user.email } });
  res.status(204).end();
});

// Authenticated user changes their own password.
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) throw httpError(400, 'currentPassword and newPassword are required');
  if (newPassword.length < 8) throw httpError(400, 'New password must be at least 8 characters');
  const user = await User.findById(req.user._id);
  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw httpError(401, 'Current password is incorrect');
  user.passwordHash = await bcrypt.hash(newPassword, 12);
  // Invalidate other active sessions in case the password was compromised.
  user.sessionVersion = (user.sessionVersion || 0) + 1;
  await user.save();
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
  const user = await User.findOneAndUpdate(
    { _id: req.params.id, ...tenantFilter(req) },
    update,
    { new: true, runValidators: true }
  ).select('-passwordHash');
  if (!user) throw httpError(404, 'User not found');
  // Disabling an account has to also cut its live sessions — the JWT stays
  // valid for up to 12h otherwise, and protect() would keep honouring it
  // until the next login bumped sessionVersion.
  if (update.status === 'disabled' || update.role !== undefined) {
    await User.updateOne({ _id: user._id }, { $inc: { sessionVersion: 1 } });
  }
  logAudit({ req, action: 'user.updated', entity: 'user', entityId: user._id, meta: { fields: Object.keys(update), role: update.role, status: update.status } });
  res.json(user);
});

const removeUser = asyncHandler(async (req, res) => {
  await assertNotProtectedOwner(req, req.params.id);
  const user = await User.findOneAndUpdate(
    { _id: req.params.id, ...tenantFilter(req) },
    { status: 'disabled' },
    { new: true }
  ).select('-passwordHash');
  if (!user) throw httpError(404, 'User not found');
  // Same reasoning as updateUser: revoke the removed user's live sessions.
  await User.updateOne({ _id: user._id }, { $inc: { sessionVersion: 1 } });
  logAudit({ req, action: 'user.removed', entity: 'user', entityId: user._id, meta: { email: user.email } });
  res.json(user);
});

module.exports = {
  listUsers, inviteUser, resendInvite, revokeInvite,
  updateUser, removeUser, changePassword
};
