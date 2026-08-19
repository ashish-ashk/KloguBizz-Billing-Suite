const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const { Organisation } = require('../models/Organisation');
const stockLocations = require('../services/stockLocationService');
const { User } = require('../models/User');
const { Membership } = require('../models/Membership');
const { Subscription } = require('../models/Subscription');
const { resolveDefaultMembership, getActiveMembership, listMemberships } = require('../services/membershipService');
const { asyncHandler } = require('../utils/asyncHandler');
const { httpError } = require('../utils/httpError');
const { logAudit } = require('../services/auditService');
const { CURRENT_TERMS_VERSION } = require('../config/legal');
const { createToken, hashToken, expiryFromNow, RESET_TTL_MS } = require('../services/tokenService');
const sessionService = require('../services/sessionService');
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
function auditContext(req, user, orgId) {
  return {
    id: req?.id,
    ip: req?.ip,
    headers: req?.headers,
    log: req?.log,
    user,
    // `user.orgId` is a legacy fallback (see models/User.js) — call sites that
    // have already resolved a real membership pass its orgId explicitly so
    // the entry is filed against the organisation actually being signed into,
    // not wherever the identity happened to be created.
    orgId: orgId !== undefined ? orgId : user?.orgId
  };
}

/**
 * `orgId`/`role` are passed explicitly rather than read off `user` — since
 * memberships (#53, #54) an identity's org and role are properties of one
 * particular membership, not of the identity, and a user can have more than
 * one. A platform account (`role: 'superadmin'`) has no membership at all and
 * passes its own `role`/`orgId: null` straight through.
 */
function signToken(user, orgId, role) {
  return jwt.sign(
    { sub: user._id, role, orgId, sv: user.sessionVersion || 0 },
    env.JWT_SECRET,
    { expiresIn: sessionService.ACCESS_TOKEN_TTL }
  );
}

/**
 * What a client is told about a user's second factor.
 *
 * Three facts, deliberately, and never the secret or the recovery-code hashes.
 *
 * `enabled` because the security page reads it to decide whether to offer
 * "Set up" or "Turn off" — it was absent from this payload entirely, so an
 * enrolled account was shown "Off" and a Set up button, with no way to turn it
 * off or reissue recovery codes. One shared component, so both the tenant page
 * and the platform console were wrong the same way.
 *
 * `backupCodesRemaining` because zero left plus a lost phone is a locked account,
 * and a count nobody is shown is a warning nobody gets.
 *
 * **What it deliberately omits is the point.** `/auth/me` returned `req.user`
 * whole — the Mongoose document with only `passwordHash` deselected — so the
 * encrypted TOTP secret and the hashed recovery codes went to the browser on
 * every page load. The hashes are the serious half: forty bits of entropy under
 * a single unsalted SHA-256, which is minutes of offline brute force. Anything
 * that can read one response walks straight past the second factor.
 */
function mfaSummary(user) {
  return {
    enabled: Boolean(user?.mfa?.enabled),
    enrolledAt: user?.mfa?.enrolledAt || null,
    backupCodesRemaining: (user?.mfa?.backupCodes || []).length
  };
}

/** The user fields a client may see. An allowlist, so a field added to the model
 *  is never exposed by default — which is how the MFA secret got out. */
function publicUser(user, role) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    // The role for *this* organisation/session, not necessarily user.role
    // (which is meaningless once a membership exists — see models/User.js).
    role: role ?? user.role,
    status: user.status,
    mfa: mfaSummary(user)
  };
}

function authPayload(user, organisation, orgId, role) {
  return {
    token: signToken(user, orgId, role),
    // Seconds, not the JWT's raw `exp`, so the client doesn't need to decode
    // the token just to know when to refresh.
    expiresIn: sessionService.ACCESS_TOKEN_TTL_SECONDS,
    user: publicUser(user, role),
    // The organisation's logo and letterhead are replaced with cacheable asset
    // URLs. They are base64 data URIs of up to 500KB and 700KB, and this payload
    // is returned by login, register, accept-invite *and* /auth/me — which the
    // app calls on every load and every route change. See
    // services/brandingAssetService.js.
    organisation: serialiseOrganisation(organisation)
  };
}

/**
 * Wraps `authPayload` with a refresh token (#50, #51).
 *
 * Only called where the frontend actually persists the session — login,
 * invite acceptance, MFA verification, switching organisations. `register`
 * deliberately does not call this: it never auto-authenticates, so a refresh
 * token here would be an orphaned row nothing ever presents.
 */
async function authPayloadWithSession(user, organisation, orgId, role, req) {
  const { refreshToken } = await sessionService.createSession({ user, req, orgId });
  return { ...authPayload(user, organisation, orgId, role), refreshToken };
}

/**
 * Resolves which organisation and role a plain sign-in (login/MFA) should
 * land in, now that a user can hold more than one active membership (#53,
 * #54). A platform account has no membership at all.
 *
 * Throws rather than returning an empty session when a non-platform identity
 * has no active membership anywhere — a genuinely rare state (every
 * membership since disabled or removed) that a half-formed session would only
 * make more confusing to recover from.
 */
async function resolveSession(user) {
  if (user.role === 'superadmin') return { orgId: null, role: 'superadmin', organisation: null };
  const membership = await resolveDefaultMembership(user);
  if (!membership) {
    throw httpError(403, 'Your account has no active organisation to sign in to. Contact whoever manages your team.', 'NO_ACTIVE_MEMBERSHIP');
  }
  const organisation = await Organisation.findById(membership.orgId).select('-support');
  return { orgId: String(membership.orgId), role: membership.role, organisation };
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
  // The default warehouse every stock movement falls back to (2.5 #42).
  await stockLocations.ensureDefault(organisation._id, stateCode);

  const user = await User.create({
    orgId: organisation._id, // legacy "home org" only — see models/User.js
    lastActiveOrgId: organisation._id,
    name,
    email,
    passwordHash: await bcrypt.hash(password, 12),
    role: 'admin',
    status: 'active',
    termsAcceptedAt: new Date(),
    termsVersion: CURRENT_TERMS_VERSION
  });
  // The membership is what actually grants access (#53, #54) — `user.role`
  // above is legacy fallback only.
  await Membership.create({ userId: user._id, orgId: organisation._id, role: 'admin', status: 'active' });

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
    ...authPayload(user, organisation, organisation._id, 'admin'),
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

  // Resolved before anything is persisted: a non-platform identity with no
  // active membership anywhere throws here (see resolveSession), and a login
  // that fails should leave no trace of having half-succeeded.
  const { orgId, role, organisation } = await resolveSession(user);

  user.lastLoginAt = new Date();
  if (orgId) user.lastActiveOrgId = orgId;
  await user.save();
  // `req` is passed so the audit entry carries the IP and user agent — the two
  // fields the security console's login history and brute-force detection are
  // built on, and which the trail did not record before Phase 4.
  logAudit({ req: auditContext(req, user, orgId), action: 'auth.login', entity: 'user', entityId: user._id });
  recordEvent({ req, orgId, userId: user._id, type: EVENT.login });
  // A device/session registry (#50, #51) replaces the old "signing in anywhere
  // logs out every other device" behaviour — each login now starts its own
  // refresh-token chain rather than evicting the rest.
  res.json(await authPayloadWithSession(user, organisation, orgId, role, req));
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
  // `req.orgId` — resolved by `protect` from the *active membership*, not
  // `req.user.orgId`, which is a legacy field that stops being accurate the
  // moment an identity holds more than one membership (#53, #54).
  // `-support` excludes the internal account-management fields an operator writes
  // about this tenant (account manager, risk level, notes). They belong to the
  // console, not to the customer they describe.
  const organisation = req.orgId
    ? await Organisation.findById(req.orgId).select('-support')
    : null;
  const [flags, notices, memberships] = await Promise.all([
    resolveFlags(organisation),
    noticesFor(organisation),
    // The org-switcher's data. A platform account has no memberships — it
    // isn't a tenant identity — and impersonation shows the tenant's own
    // memberships, not the operator's, which would be actively misleading
    // inside a "view as" session.
    (req.user.role === 'superadmin' || req.impersonation) ? [] : listMemberships(req.user._id)
  ]);
  res.json({
    /**
     * Filtered, not the raw document.
     *
     * This returned `req.user` whole, which `protect` loads with only
     * `passwordHash` deselected — so the encrypted TOTP secret and the
     * recovery-code hashes were sent to the browser on every page load. An
     * allowlist means a field added to the model is never exposed by accident.
     */
    user: { ...publicUser(req.user, req.user.role), platformRole: req.user.platformRole },
    organisation: serialiseOrganisation(organisation),
    flags,
    notices,
    memberships,
    impersonation: req.impersonation || null
  });
});

// ── Invitations ──────────────────────────────────
//
// The invite flow was previously a dead end: inviteUser emailed a link to
// /accept-invite?token=… but no endpoint existed to redeem it and no such
// frontend route existed either, so every invited teammate was permanently
// locked out (their status stays 'invited', which protect() rejects).

/**
 * Looks up a pending invite by token, or throws a uniform error.
 *
 * Also resolves the membership the invite created (#53, #54) — a brand-new
 * identity created solely by an invite has exactly one membership, the
 * pending one, since an already-active identity added to a further org is
 * linked immediately with nothing to accept (see userController.inviteUser).
 */
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
  const membership = await Membership.findOne({ userId: user._id, status: 'invited' });
  if (!membership) throw invalid();
  return { user, membership };
}

/**
 * Unauthenticated peek at an invitation, so the accept screen can greet the
 * person by name and show which organisation they're joining rather than
 * presenting a bare password box.
 */
const inviteDetails = asyncHandler(async (req, res) => {
  const { user, membership } = await findInvitee(req.params.token);
  const organisation = await Organisation.findById(membership.orgId).select('name').lean();
  res.json({
    name: user.name,
    email: user.email,
    role: membership.role,
    orgName: organisation?.name || null,
    expiresAt: user.inviteTokenExpires
  });
});

/**
 * Redeems an invitation: sets the password, activates the account and its
 * membership, and signs the user straight in so they land in the app rather
 * than back at a login form.
 */
const acceptInvite = asyncHandler(async (req, res) => {
  const { token, password, acceptTerms } = req.body;
  if (acceptTerms !== true) {
    throw httpError(400, 'You must accept the Terms & Conditions and SLA to activate your account');
  }
  const { user, membership } = await findInvitee(token);

  user.passwordHash = await bcrypt.hash(password, 12);
  user.status = 'active';
  user.inviteTokenHash = undefined;
  user.inviteTokenExpires = undefined;
  user.termsAcceptedAt = new Date();
  user.termsVersion = CURRENT_TERMS_VERSION;
  user.lastLoginAt = new Date();
  user.lastActiveOrgId = membership.orgId;
  await user.save();
  membership.status = 'active';
  await membership.save();

  const organisation = await Organisation.findById(membership.orgId).select('-support');
  logAudit({ req: auditContext(req, user, membership.orgId), action: 'user.invite_accepted', entity: 'user', entityId: user._id, meta: { email: user.email, role: membership.role } });
  res.json(await authPayloadWithSession(user, organisation, String(membership.orgId), membership.role, req));
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
  // Kills every refresh-token chain too — bumping sessionVersion alone only
  // stops existing access tokens; without this a device that still holds a
  // refresh token could call /auth/refresh and mint a new one right past it.
  await sessionService.revokeAllForUser(user._id, 'password_changed');

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

  /**
   * An unreadable secret is the server's fault, not the user's (see
   * `verifySecondFactor`). Counting it toward the lockout would take away the
   * recovery-code route as well — locking somebody out of the only door still
   * open to them, over a configuration change they did not make.
   */
  if (!result.valid && result.notCountedAsFailure) {
    logAudit({ req: auditContext(req, user), action: 'auth.mfa_unreadable', entity: 'user', entityId: user._id });
    throw httpError(409, result.reason, result.code);
  }

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

  const { orgId, role, organisation } = await resolveSession(user);
  user.lastLoginAt = new Date();
  if (orgId) user.lastActiveOrgId = orgId;
  await user.save();

  logAudit({
    req: auditContext(req, user, orgId),
    action: 'auth.login',
    entity: 'user',
    entityId: user._id,
    meta: { mfaMethod: result.method }
  });
  recordEvent({ req, orgId, userId: user._id, type: EVENT.login });
  res.json({
    ...(await authPayloadWithSession(user, organisation, orgId, role, req)),
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

// ── Refresh tokens & device sessions (#50, #51) ──

/**
 * Exchanges a refresh token for a new 15-minute access token, rotating the
 * refresh token itself in the process. The frontend calls this shortly before
 * the access token expires so a signed-in tab never has to bounce to /login on
 * its own — see auth.service.ts's `scheduleExpiry`.
 */
const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) throw httpError(400, 'refreshToken is required');
  const { user, session, refreshToken: nextRefreshToken } = await sessionService.rotateSession({ refreshToken, req });

  // The role for this session's pinned org is re-resolved fresh on every
  // refresh, not carried over from the old access token — a role change or a
  // removed membership then takes effect within 15 minutes (the next time
  // this device refreshes) rather than only once the 30-day refresh token
  // itself expires (#53, #54).
  let role;
  if (user.role === 'superadmin') {
    role = 'superadmin';
  } else {
    const membership = await getActiveMembership(user._id, session.orgId);
    if (!membership) throw httpError(401, 'You no longer have access to this organisation.', 'MEMBERSHIP_REVOKED');
    role = membership.role;
  }

  res.json({
    token: signToken(user, session.orgId, role),
    expiresIn: sessionService.ACCESS_TOKEN_TTL_SECONDS,
    refreshToken: nextRefreshToken
  });
});

/**
 * Ends one device's session. Deliberately does not require `protect`: the
 * access token may already have expired by the time the tab is closed, and a
 * logout that only works while still signed in is not useful. Idempotent —
 * an unknown or already-revoked token is a no-op 200, not an error.
 */
const logout = asyncHandler(async (req, res) => {
  await sessionService.revokeByToken(req.body?.refreshToken, 'logout');
  res.json({ ok: true });
});

/** Lists the signed-in user's active devices/sessions. */
const listSessions = asyncHandler(async (req, res) => {
  const sessions = await sessionService.listActiveSessions(req.user._id);
  res.json(sessions.map(s => ({
    id: s._id,
    userAgent: s.userAgent || null,
    ip: s.ip || null,
    createdAt: s.createdAt,
    lastSeenAt: s.lastSeenAt,
    expiresAt: s.expiresAt
  })));
});

/** Signs out one of the user's own other devices, e.g. "I lost my phone". */
const revokeSession = asyncHandler(async (req, res) => {
  await sessionService.revokeOwnSession(req.user._id, req.params.id, 'user_revoked');
  logAudit({ req, action: 'user.session_revoked', entity: 'user', entityId: req.user._id });
  res.json({ ok: true });
});

// ── Org switching (#53, #54) ─────────────────────

/**
 * Re-issues a session for a different organisation the signed-in identity
 * also belongs to.
 *
 * Treated as a fresh mini-login rather than mutating the current token: a
 * device's session is conceptually "signed in as org X", and switching starts
 * a new refresh-token family pinned to the new org rather than repurposing
 * the old one — the same reasoning `rotateSession` already applies to a plain
 * refresh, just for a deliberate org change instead of a time-based one.
 */
const switchOrg = asyncHandler(async (req, res) => {
  const { targetOrgId: orgId } = req.body || {};
  if (!orgId) throw httpError(400, 'targetOrgId is required');

  const membership = await getActiveMembership(req.user._id, orgId);
  if (!membership) throw httpError(403, 'You do not have access to that organisation.', 'MEMBERSHIP_REVOKED');

  const user = await User.findById(req.user._id);
  user.lastActiveOrgId = orgId;
  await user.save();
  const organisation = await Organisation.findById(orgId).select('-support');

  logAudit({ req: auditContext(req, user, orgId), action: 'auth.org_switched', entity: 'user', entityId: user._id, meta: { orgId } });
  res.json(await authPayloadWithSession(user, organisation, String(orgId), membership.role, req));
});

module.exports = {
  register, login, me, signToken, verifyMfa,
  inviteDetails, acceptInvite,
  forgotPassword, resetPassword,
  verifyEmail, resendVerification, issueEmailVerification,
  refresh, logout, listSessions, revokeSession,
  switchOrg
};
