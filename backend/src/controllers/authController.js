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
const { sendEmailVerification } = require('../services/emailService');
const mfa = require('./mfaController');

/** How long a self-serve trial runs for. */
const TRIAL_DAYS = 14;

/** How long an email-verification link stays valid. Longer than a password reset:
 *  the risk is lower, and people verify an address when they get round to it. */
const VERIFY_TTL_MS = 48 * 60 * 60 * 1000;

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

  /**
   * Email verification (#52).
   *
   * With no mail provider there is no way to verify an address, so treating it as
   * verified is the only non-broken option -- the alternative is an account nobody
   * can ever finish creating. `env.emailVerificationEnforced` follows exactly the
   * same rule, so the two can never disagree about whether verification means
   * anything in this deployment.
   */
  let verification = { delivered: false, skipped: true, verifyUrl: undefined };
  if (env.emailVerificationEnforced) {
    verification = await issueEmailVerification(user);
  } else {
    user.emailVerifiedAt = new Date();
    await user.save();
  }

  logAudit({ req: auditContext(req, user), action: 'user.terms_accepted', entity: 'user', entityId: user._id, meta: { termsVersion: CURRENT_TERMS_VERSION } });
  // The signup event, without which "signups per day" can only be reconstructed
  // from `createdAt` — which works until an organisation is deleted.
  recordEvent({ orgId: organisation._id, userId: user._id, type: EVENT.signup, meta: { stateCode } });

  res.status(201).json({
    ...authPayload(user, organisation),
    emailVerificationRequired: env.emailVerificationEnforced,
    emailVerificationSent: verification.delivered,
    verifyUrl: verification.skipped && !env.isProduction ? verification.verifyUrl : undefined
  });
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

  // The password was right. Clear the failure counters now, before the second
  // factor: a correct password should not leave an account one attempt from a
  // lockout because the user then fumbled a six-digit code.
  user.failedLoginAttempts = 0;
  user.lockedUntil = undefined;
  user.lastFailedLoginAt = undefined;

  /**
   * Second factor (#7).
   *
   * Deliberately a separate round trip rather than an optional `code` field on this
   * request. No session token is issued at all until the factor is presented, so
   * there is no window in which a token exists for a half-authenticated user and no
   * route that has to remember to check a "needs MFA" flag -- which is where this
   * kind of gate usually leaks.
   *
   * `sessionVersion` is deliberately *not* bumped here: doing so would sign the
   * user out of their other devices the moment they typed a password, even if they
   * then abandoned the sign-in or failed the code.
   */
  if (mfa.mfaRequiredFor(user)) {
    await user.save();
    logAudit({ req: auditContext(req, user), action: 'auth.mfa_challenged', entity: 'user', entityId: user._id });
    return res.json({
      mfaRequired: true,
      mfaToken: mfa.issueChallengeToken(user),
      expiresInSeconds: mfa.MFA_CHALLENGE_TTL_SECONDS,
      message: 'Enter the six-digit code from your authenticator app.'
    });
  }

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
  const result = await sendPasswordResetEmail({ to: user.email, name: user.name, resetUrl, orgId: user.orgId });

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

/**
 * Completes a sign-in that was challenged for a second factor.
 *
 * Failures count towards the same lockout a wrong password does. Without that the
 * challenge step is an unlimited oracle for guessing six digits, and a million
 * possibilities is nothing at unlimited rate -- especially here, where the attacker
 * has already established the password.
 */
const verifyMfa = asyncHandler(async (req, res) => {
  const payload = mfa.verifyChallengeToken(req.body?.mfaToken);
  const user = await User.findById(payload.sub);
  if (!user || user.status !== 'active') throw httpError(401, 'Invalid or inactive user');

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const minutes = Math.max(1, Math.ceil((user.lockedUntil - Date.now()) / 60000));
    throw httpError(429, `Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`, 'ACCOUNT_LOCKED');
  }

  const result = mfa.verifySecondFactor(user, req.body?.code);
  if (!result.valid) {
    const windowStart = Date.now() - ATTEMPT_WINDOW_MINUTES * 60000;
    const recent = user.lastFailedLoginAt && user.lastFailedLoginAt.getTime() > windowStart;
    user.failedLoginAttempts = (recent ? user.failedLoginAttempts || 0 : 0) + 1;
    user.lastFailedLoginAt = new Date();
    if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
      user.lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60000);
      user.failedLoginAttempts = 0;
    }
    await user.save();
    logAudit({ req: auditContext(req, user), action: 'auth.mfa_failed', entity: 'user', entityId: user._id });
    throw httpError(401, result.reason, 'MFA_CODE_INVALID');
  }

  if (result.counter !== undefined) user.mfa.lastUsedCounter = result.counter;
  user.failedLoginAttempts = 0;
  user.lockedUntil = undefined;
  user.lastFailedLoginAt = undefined;
  user.lastLoginAt = new Date();
  user.sessionVersion = (user.sessionVersion || 0) + 1;
  await user.save();

  const organisation = user.orgId ? await Organisation.findById(user.orgId).select('-support') : null;
  logAudit({
    req: auditContext(req, user),
    action: 'auth.login',
    entity: 'user',
    entityId: user._id,
    meta: { mfaMethod: result.method }
  });
  recordEvent({ req, orgId: user.orgId, userId: user._id, type: EVENT.login });
  res.json({
    ...authPayload(user, organisation),
    // A recovery code was just consumed. The user needs to know how many are left
    // before the last one goes and the account is locked for real.
    ...(result.method === 'backup-code'
      ? { usedBackupCode: true, remainingBackupCodes: result.remainingBackupCodes }
      : {})
  });
});

// ── Email verification (#52) ─────────────────────

/** Issues a verification token and emails the link. Shared by register and resend. */
async function issueEmailVerification(user) {
  const { token, hash } = createToken();
  user.emailVerifyTokenHash = hash;
  user.emailVerifyTokenExpires = expiryFromNow(VERIFY_TTL_MS);
  await user.save();
  const verifyUrl = `${env.FRONTEND_URL}/verify-email?token=${encodeURIComponent(token)}`;
  const result = await sendEmailVerification({ to: user.email, name: user.name, verifyUrl, orgId: user.orgId });
  return { verifyUrl, delivered: !!result.sent, skipped: !!result.skipped };
}

/**
 * Confirms an address.
 *
 * Unauthenticated on purpose: the link arrives by email and is frequently opened on
 * a different device from the one that registered, so requiring a session would
 * defeat it.
 */
const verifyEmail = asyncHandler(async (req, res) => {
  const token = req.body?.token || req.query?.token;
  const user = await User.findOne({ emailVerifyTokenHash: hashToken(String(token || '')) });
  const invalid = () => httpError(400, 'This verification link is invalid or has already been used.', 'INVALID_VERIFICATION');
  if (!user) throw invalid();
  if (!user.emailVerifyTokenExpires || user.emailVerifyTokenExpires < new Date()) {
    throw httpError(410, 'This verification link has expired. Request a new one from your account.', 'VERIFICATION_EXPIRED');
  }

  user.emailVerifiedAt = new Date();
  user.emailVerifyTokenHash = undefined;
  user.emailVerifyTokenExpires = undefined;
  await user.save();
  logAudit({ req: auditContext(req, user), action: 'user.email_verified', entity: 'user', entityId: user._id });
  res.json({ ok: true, message: 'Your email address has been verified.' });
});

/** Sends a fresh link to the signed-in user's own address. */
const resendVerification = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (user.emailVerifiedAt) {
    return res.json({ ok: true, alreadyVerified: true, message: 'Your email address is already verified.' });
  }
  const { verifyUrl, delivered, skipped } = await issueEmailVerification(user);
  logAudit({ req, action: 'user.email_verification_resent', entity: 'user', entityId: user._id, meta: { delivered } });
  res.json({
    ok: true,
    delivered,
    // Same rule as the invite and reset flows: the link is only handed back when
    // there is no provider and this is not production.
    verifyUrl: skipped && !env.isProduction ? verifyUrl : undefined,
    message: delivered ? 'A new verification link is on its way.' : 'No email provider is configured.'
  });
});

module.exports = {
  register, login, me, signToken, verifyMfa,
  inviteDetails, acceptInvite,
  forgotPassword, resetPassword,
  verifyEmail, resendVerification, issueEmailVerification
};
