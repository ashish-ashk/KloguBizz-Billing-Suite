const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const { Organisation } = require('../models/Organisation');
const { User } = require('../models/User');
const { Subscription } = require('../models/Subscription');
const { asyncHandler } = require('../utils/asyncHandler');
const { httpError } = require('../utils/httpError');
const { logAudit } = require('../services/auditService');
const { CURRENT_TERMS_VERSION } = require('../config/legal');
const { createToken, hashToken, expiryFromNow, RESET_TTL_MS } = require('../services/tokenService');
const { sendPasswordResetEmail } = require('../services/emailService');
const { serialiseOrganisation } = require('../services/brandingAssetService');
const { recordEvent, EVENT } = require('../services/usageEventService');
const { resolveFlags } = require('../services/featureFlagService');
const { noticesFor } = require('../services/noticeService');

/** How long a self-serve trial runs for. */
const TRIAL_DAYS = 14;

/**
 * An audit context for an action taken by a user who is not `req.user`.
 *
 * Every route in this file is unauthenticated, so `protect` never ran and
 * `req.user` is empty — yet the entry has to name the account it concerns. These
 * call sites used to pass a bare `{ user }` object, which worked for the actor but
 * silently dropped the request id, the IP and the user agent. That is precisely
 * the metadata the security console's login history and brute-force detection
 * read, so a failed login was recorded with no indication of where it came from.
 */
function auditContext(req, user) {
  return {
    id: req?.id,
    ip: req?.ip,
    headers: req?.headers,
    log: req?.log,
    user,
    orgId: user?.orgId
  };
}

function signToken(user) {
  return jwt.sign(
    { sub: user._id, role: user.role, orgId: user.orgId, sv: user.sessionVersion || 0 },
    env.JWT_SECRET,
    { expiresIn: '12h' }
  );
}

function authPayload(user, organisation) {
  return {
    token: signToken(user),
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status
    },
    // The organisation's logo and letterhead are replaced with cacheable asset
    // URLs. They are base64 data URIs of up to 500KB and 700KB, and this payload
    // is returned by login, register, accept-invite *and* /auth/me — which the
    // app calls on every load and every route change. See
    // services/brandingAssetService.js.
    organisation: serialiseOrganisation(organisation)
  };
}

const register = asyncHandler(async (req, res) => {
  const { name, email, password, orgName, stateCode = '27', acceptTerms } = req.body;
  if (!name || !email || !password || !orgName) {
    throw httpError(400, 'name, email, password, and orgName are required');
  }
  if (acceptTerms !== true) {
    throw httpError(400, 'You must accept the Terms & Conditions and SLA to create an account');
  }
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) throw httpError(409, 'Email already registered');

  const organisation = await Organisation.create({
    name: orgName,
    adminEmail: email,
    stateCode,
    status: 'trial',
    // An explicit end date, so the console's "trials expiring this week" list is a
    // fact rather than an inference from `createdAt` plus a hardcoded assumption.
    // Nothing auto-suspends on it — see models/Organisation.js.
    trialEndsAt: new Date(Date.now() + TRIAL_DAYS * 86400000)
  });
  const user = await User.create({
    orgId: organisation._id,
    name,
    email,
    passwordHash: await bcrypt.hash(password, 12),
    role: 'admin',
    status: 'active',
    termsAcceptedAt: new Date(),
    termsVersion: CURRENT_TERMS_VERSION
  });

  // The registering user is the org's canonical owner from day one.
  organisation.ownerId = user._id;
  await organisation.save();
  await Subscription.create({ orgId: organisation._id, planCode: 'starter', status: 'trial' });

  logAudit({ req: auditContext(req, user), action: 'user.terms_accepted', entity: 'user', entityId: user._id, meta: { termsVersion: CURRENT_TERMS_VERSION } });
  // The signup event, without which "signups per day" can only be reconstructed
  // from `createdAt` — which works until an organisation is deleted.
  recordEvent({ orgId: organisation._id, userId: user._id, type: EVENT.signup, meta: { stateCode } });

  res.status(201).json(authPayload(user, organisation));
});

// Account lockout thresholds. The global per-IP rate limiter still allows
// hundreds of attempts per window and does nothing against a distributed
// attempt, so the account itself has to keep score.
const MAX_FAILED_ATTEMPTS = 8;
const LOCKOUT_MINUTES = 15;
// Failures older than this stop counting, so an honest user who mistyped their
// password last week doesn't start today one attempt from a lockout.
const ATTEMPT_WINDOW_MINUTES = 60;

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: String(email || '').toLowerCase() });
  // Deliberately the same message and code path for an unknown address as for
  // a wrong password, so this endpoint can't be used to enumerate accounts.
  if (!user) throw httpError(401, 'Invalid email or password');

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const minutes = Math.max(1, Math.ceil((user.lockedUntil - Date.now()) / 60000));
    throw httpError(
      429,
      `Too many failed sign-in attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
      'ACCOUNT_LOCKED'
    );
  }

  const ok = await bcrypt.compare(password || '', user.passwordHash);
  if (!ok) {
    // Stale failures are discarded rather than accumulated forever.
    const windowStart = Date.now() - ATTEMPT_WINDOW_MINUTES * 60000;
    const recent = user.lastFailedLoginAt && user.lastFailedLoginAt.getTime() > windowStart;
    user.failedLoginAttempts = (recent ? user.failedLoginAttempts || 0 : 0) + 1;
    user.lastFailedLoginAt = new Date();
    if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
      user.lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60000);
      user.failedLoginAttempts = 0;
    }
    await user.save();
    logAudit({ req: auditContext(req, user), action: 'auth.login_failed', entity: 'user', entityId: user._id, meta: { email: user.email, locked: Boolean(user.lockedUntil && user.lockedUntil > new Date()) } });
    throw httpError(401, 'Invalid email or password');
  }

  user.failedLoginAttempts = 0;
  user.lockedUntil = undefined;
  user.lastFailedLoginAt = undefined;
  user.lastLoginAt = new Date();
  // Invalidate any tokens issued to this user before now — one active
  // session per user; signing in elsewhere logs out other devices.
  user.sessionVersion = (user.sessionVersion || 0) + 1;
  await user.save();
  const organisation = user.orgId ? await Organisation.findById(user.orgId).select('-support') : null;
  // `req` is passed so the audit entry carries the IP and user agent — the two
  // fields the security console's login history and brute-force detection are
  // built on, and which the trail did not record before Phase 4.
  logAudit({ req: auditContext(req, user), action: 'auth.login', entity: 'user', entityId: user._id });
  recordEvent({ req, orgId: user.orgId, userId: user._id, type: EVENT.login });
  res.json(authPayload(user, organisation));
});

/**
 * The session's full context, refreshed on every page load and route change.
 *
 * Beyond the user and organisation this now carries three things the client cannot
 * work out for itself: the resolved feature flags, any banner an operator has
 * addressed to this tenant, and — if this is a support session — the fact that it
 * is one. The impersonation block in particular has to come from the server: the
 * whole point is that the token looks like an ordinary tenant token, so a client
 * inspecting its own JWT is not a trustworthy source for "am I being impersonated".
 */
const me = asyncHandler(async (req, res) => {
  // `-support` excludes the internal account-management fields an operator writes
  // about this tenant (account manager, risk level, notes). They belong to the
  // console, not to the customer they describe.
  const organisation = req.user.orgId
    ? await Organisation.findById(req.user.orgId).select('-support')
    : null;
  const [flags, notices] = await Promise.all([
    resolveFlags(organisation),
    noticesFor(organisation)
  ]);
  res.json({
    user: req.user,
    organisation: serialiseOrganisation(organisation),
    flags,
    notices,
    impersonation: req.impersonation || null
  });
});

// ── Invitations ──────────────────────────────────
//
// The invite flow was previously a dead end: inviteUser emailed a link to
// /accept-invite?token=… but no endpoint existed to redeem it and no such
// frontend route existed either, so every invited teammate was permanently
// locked out (their status stays 'invited', which protect() rejects).

/** Looks up a pending invite by token, or throws a uniform error. */
async function findInvitee(token) {
  if (!token) throw httpError(400, 'This invitation link is missing its token.', 'INVALID_INVITE');
  const user = await User.findOne({ inviteTokenHash: hashToken(token) });
  // One message for every failure mode, so the endpoint can't be used to probe
  // which tokens exist.
  const invalid = () => httpError(400, 'This invitation link is invalid or has already been used.', 'INVALID_INVITE');
  if (!user) throw invalid();
  if (user.status !== 'invited') throw invalid();
  if (!user.inviteTokenExpires || user.inviteTokenExpires < new Date()) {
    throw httpError(410, 'This invitation has expired. Ask your administrator to send a new one.', 'INVITE_EXPIRED');
  }
  return user;
}

/**
 * Unauthenticated peek at an invitation, so the accept screen can greet the
 * person by name and show which organisation they're joining rather than
 * presenting a bare password box.
 */
const inviteDetails = asyncHandler(async (req, res) => {
  const user = await findInvitee(req.params.token);
  const organisation = user.orgId ? await Organisation.findById(user.orgId).select('name').lean() : null;
  res.json({
    name: user.name,
    email: user.email,
    role: user.role,
    orgName: organisation?.name || null,
    expiresAt: user.inviteTokenExpires
  });
});

/**
 * Redeems an invitation: sets the password, activates the account, and signs
 * the user straight in so they land in the app rather than back at a login form.
 */
const acceptInvite = asyncHandler(async (req, res) => {
  const { token, password, acceptTerms } = req.body;
  if (acceptTerms !== true) {
    throw httpError(400, 'You must accept the Terms & Conditions and SLA to activate your account');
  }
  const user = await findInvitee(token);

  user.passwordHash = await bcrypt.hash(password, 12);
  user.status = 'active';
  user.inviteTokenHash = undefined;
  user.inviteTokenExpires = undefined;
  user.termsAcceptedAt = new Date();
  user.termsVersion = CURRENT_TERMS_VERSION;
  user.lastLoginAt = new Date();
  // Same reasoning as login: issue this session a version so any token minted
  // before now is dead.
  user.sessionVersion = (user.sessionVersion || 0) + 1;
  await user.save();

  const organisation = user.orgId ? await Organisation.findById(user.orgId).select('-support') : null;
  logAudit({ req: auditContext(req, user), action: 'user.invite_accepted', entity: 'user', entityId: user._id, meta: { email: user.email, role: user.role } });
  res.json(authPayload(user, organisation));
});

// ── Password reset ───────────────────────────────
//
// Previously absent entirely: a user who forgot their password had no recovery
// path at all, and support had no way to help because the super admin couldn't
// reset one either.

/**
 * Starts a reset.
 *
 * Always responds 200 with the same message whether or not the address exists —
 * otherwise this endpoint becomes an account-enumeration oracle. The work is
 * only done when there is a matching active user.
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const generic = { ok: true, message: 'If that email address has an account, a reset link is on its way.' };

  const user = await User.findOne({ email: String(email || '').toLowerCase() });
  // Invited-but-not-activated users are excluded: their route in is the invite
  // link, and letting a reset activate the account would bypass terms
  // acceptance. Disabled accounts are excluded outright.
  if (!user || user.status !== 'active') return res.json(generic);

  const { token, hash } = createToken();
  user.resetTokenHash = hash;
  user.resetTokenExpires = expiryFromNow(RESET_TTL_MS);
  await user.save();

  const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${encodeURIComponent(token)}`;
  const result = await sendPasswordResetEmail({ to: user.email, name: user.name, resetUrl });

  logAudit({ req: auditContext(req, user), action: 'user.password_reset_requested', entity: 'user', entityId: user._id, meta: { delivered: !!result.sent } });
  // In local mode there is no email, so hand the link back to make the flow
  // testable. Never in production, where that would leak a live credential to
  // anyone who can guess an address.
  res.json(result.skipped && !env.isProduction ? { ...generic, resetUrl, localMode: true } : generic);
});

/**
 * Completes a reset: sets the new password and invalidates every existing
 * session, on the assumption that a reset may follow a compromise. Also clears
 * any brute-force lockout, so a locked-out owner can recover.
 */
const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  const user = await User.findOne({ resetTokenHash: hashToken(String(token || '')) });

  const invalid = () => httpError(400, 'This reset link is invalid or has already been used.', 'INVALID_RESET');
  if (!user || user.status !== 'active') throw invalid();
  if (!user.resetTokenExpires || user.resetTokenExpires < new Date()) {
    throw httpError(410, 'This reset link has expired. Please request a new one.', 'RESET_EXPIRED');
  }

  user.passwordHash = await bcrypt.hash(password, 12);
  user.resetTokenHash = undefined;
  user.resetTokenExpires = undefined;
  user.failedLoginAttempts = 0;
  user.lockedUntil = undefined;
  user.lastFailedLoginAt = undefined;
  user.sessionVersion = (user.sessionVersion || 0) + 1;
  await user.save();

  logAudit({ req: auditContext(req, user), action: 'user.password_reset', entity: 'user', entityId: user._id });
  res.json({ ok: true, message: 'Your password has been reset. Please sign in with your new password.' });
});

module.exports = {
  register, login, me, signToken,
  inviteDetails, acceptInvite,
  forgotPassword, resetPassword
};
