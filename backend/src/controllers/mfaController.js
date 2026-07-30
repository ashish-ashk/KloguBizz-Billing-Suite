const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const { User } = require('../models/User');
const { asyncHandler } = require('../utils/asyncHandler');
const { httpError } = require('../utils/httpError');
const { logAudit } = require('../services/auditService');
const totp = require('../utils/totp');

/**
 * Two-factor authentication (#7).
 *
 * Deferred from Phases 1–4 with the note "needs a TOTP dependency", which turned out
 * not to be true — see utils/totp.js.
 *
 * The enrolment flow is three steps rather than one on purpose. A secret handed out
 * and immediately marked "enabled" locks out every user whose authenticator was
 * misconfigured, whose clock was wrong, or who closed the tab — so the secret is
 * *staged* until a code proves the app can actually produce one, and only then does
 * MFA start being required at login.
 */

/**
 * The short-lived token issued between password and code.
 *
 * A separate secret-scoped claim rather than a normal session token: if this were a
 * real token with a "needs MFA" flag, every route would have to remember to check the
 * flag, and the one that forgot would be a complete bypass of the second factor.
 * This token authenticates *nothing* — `protect` rejects it, because `mfaPending`
 * tokens carry no `sv` claim matching the user and are only ever verified here.
 */
const MFA_CHALLENGE_TTL_SECONDS = 5 * 60;

function issueChallengeToken(user) {
  return jwt.sign(
    { sub: String(user._id), mfa: 'pending' },
    `${env.JWT_SECRET}:mfa-challenge`,
    { expiresIn: MFA_CHALLENGE_TTL_SECONDS }
  );
}

function verifyChallengeToken(token) {
  try {
    const payload = jwt.verify(String(token || ''), `${env.JWT_SECRET}:mfa-challenge`);
    if (payload.mfa !== 'pending') throw new Error('wrong token type');
    return payload;
  } catch {
    throw httpError(401, 'This sign-in attempt has expired. Please enter your password again.', 'MFA_CHALLENGE_EXPIRED');
  }
}

/** Whether a user must present a second factor. */
function mfaRequiredFor(user) {
  if (user.mfa?.enabled) return true;
  // A platform account with MFA switched on at the deployment level is required to
  // *enrol*, which is handled by the guard in authMiddleware — not here, because
  // there is no second factor to ask for yet.
  return false;
}

/**
 * Starts enrolment: stages a secret and returns what an authenticator app needs.
 *
 * Returns the `otpauth://` URI and the base32 secret rather than a QR image. Drawing
 * a QR would mean either a dependency or ~200 lines of matrix encoding, and every
 * authenticator app accepts manual entry of exactly these two things — so the
 * frontend renders the QR from the URI, where a canvas already exists.
 */
const setupMfa = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (user.mfa?.enabled) {
    throw httpError(409, 'Two-factor authentication is already enabled. Disable it first to re-enrol.', 'MFA_ALREADY_ENABLED');
  }

  const secret = totp.generateSecret();
  // Staged, not enabled. Nothing about sign-in changes until `enableMfa` proves the
  // authenticator works.
  user.mfa = {
    ...(user.mfa?.toObject ? user.mfa.toObject() : user.mfa),
    enabled: false,
    secret: totp.encryptSecret(secret),
    lastUsedCounter: undefined
  };
  await user.save();

  logAudit({ req, action: 'user.mfa_setup_started', entity: 'user', entityId: user._id });
  res.json({
    secret,
    uri: totp.otpauthUri({ secret, account: user.email }),
    digits: totp.DIGITS,
    period: totp.STEP_SECONDS,
    message: 'Scan the QR code or enter the key manually, then confirm with the six-digit code your app shows.'
  });
});

/** Confirms enrolment with a live code, and hands back the recovery codes once. */
const enableMfa = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user.mfa?.secret) throw httpError(400, 'Start the setup first.', 'MFA_NOT_STAGED');
  if (user.mfa.enabled) throw httpError(409, 'Two-factor authentication is already enabled.', 'MFA_ALREADY_ENABLED');

  const result = totp.verifyCode(totp.decryptSecret(user.mfa.secret), req.body?.code);
  if (!result.valid) throw httpError(400, result.reason, 'MFA_CODE_INVALID');

  const backupCodes = totp.generateBackupCodes();
  user.mfa.enabled = true;
  user.mfa.enrolledAt = new Date();
  user.mfa.lastUsedCounter = result.counter;
  user.mfa.backupCodes = backupCodes.map(totp.hashBackupCode);
  user.mfa.backupCodesGeneratedAt = new Date();
  await user.save();

  logAudit({ req, action: 'user.mfa_enabled', entity: 'user', entityId: user._id });
  res.json({
    ok: true,
    // Shown once and never retrievable — they are stored hashed. Saying so is part of
    // the response because a user who does not write them down has silently lost
    // their recovery path.
    backupCodes,
    message: 'Two-factor authentication is on. Save these recovery codes somewhere safe — they are shown only once.'
  });
});

/**
 * Turns MFA off.
 *
 * Requires the password **and** a current code. Requiring only the password would
 * mean a stolen password is enough to remove the control that exists precisely
 * because passwords get stolen.
 */
const disableMfa = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user.mfa?.enabled) throw httpError(400, 'Two-factor authentication is not enabled.', 'MFA_NOT_ENABLED');

  if (env.requireSuperadminMfa && user.role === 'superadmin') {
    throw httpError(
      403,
      'This deployment requires two-factor authentication on platform accounts. It cannot be switched off.',
      'MFA_MANDATORY'
    );
  }

  const passwordOk = await bcrypt.compare(String(req.body?.password || ''), user.passwordHash);
  if (!passwordOk) throw httpError(401, 'Your password is incorrect.');

  const result = verifySecondFactor(user, req.body?.code);
  if (!result.valid) throw httpError(400, result.reason, 'MFA_CODE_INVALID');

  user.mfa = { enabled: false, secret: undefined, lastUsedCounter: undefined, backupCodes: [] };
  await user.save();
  logAudit({ req, action: 'user.mfa_disabled', entity: 'user', entityId: user._id });
  res.json({ ok: true, message: 'Two-factor authentication has been turned off.' });
});

/** Issues a fresh set of recovery codes, invalidating the old ones. */
const regenerateBackupCodes = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user.mfa?.enabled) throw httpError(400, 'Two-factor authentication is not enabled.', 'MFA_NOT_ENABLED');

  const result = verifySecondFactor(user, req.body?.code, { allowBackupCode: false });
  if (!result.valid) throw httpError(400, result.reason, 'MFA_CODE_INVALID');

  const backupCodes = totp.generateBackupCodes();
  user.mfa.backupCodes = backupCodes.map(totp.hashBackupCode);
  user.mfa.backupCodesGeneratedAt = new Date();
  if (result.counter !== undefined) user.mfa.lastUsedCounter = result.counter;
  await user.save();
  logAudit({ req, action: 'user.mfa_backup_codes_regenerated', entity: 'user', entityId: user._id });
  res.json({ ok: true, backupCodes, message: 'Your previous recovery codes no longer work.' });
});

/**
 * Verifies a second factor: a TOTP code, or one of the recovery codes.
 *
 * A recovery code is consumed on use — that is what "single use" means, and a
 * recovery code that keeps working is just a weaker password. Returns a result object
 * rather than throwing so the caller decides the status code and whether to record a
 * failure.
 */
function verifySecondFactor(user, code, { allowBackupCode = true } = {}) {
  const supplied = String(code || '').trim();
  if (!supplied) return { valid: false, reason: 'A verification code is required.' };

  if (user.mfa?.secret) {
    const result = totp.verifyCode(totp.decryptSecret(user.mfa.secret), supplied, {
      lastUsedCounter: user.mfa.lastUsedCounter ?? null
    });
    if (result.valid) return { valid: true, counter: result.counter, method: 'totp' };
    // A replayed code is reported as such rather than as "wrong": the user typed
    // something correct, and telling them to wait for the next code is actionable
    // where "incorrect" would send them looking for a different problem.
    if (result.replay) return { valid: false, reason: result.reason };
  }

  if (allowBackupCode && user.mfa?.backupCodes?.length) {
    const hash = totp.hashBackupCode(supplied);
    const index = user.mfa.backupCodes.indexOf(hash);
    if (index !== -1) {
      user.mfa.backupCodes.splice(index, 1);
      return { valid: true, method: 'backup-code', remainingBackupCodes: user.mfa.backupCodes.length };
    }
  }

  return { valid: false, reason: 'That code is not correct or has expired.' };
}

module.exports = {
  MFA_CHALLENGE_TTL_SECONDS,
  issueChallengeToken,
  verifyChallengeToken,
  mfaRequiredFor,
  verifySecondFactor,
  setupMfa,
  enableMfa,
  disableMfa,
  regenerateBackupCodes
};
