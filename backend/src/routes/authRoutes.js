const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const {
  register, login, me, verifyMfa,
  inviteDetails, acceptInvite,
  forgotPassword, resetPassword,
  verifyEmail, resendVerification,
  refresh, logout, listSessions, revokeSession,
  switchOrg
} = require('../controllers/authController');
const { setupMfa, enableMfa, disableMfa, regenerateBackupCodes } = require('../controllers/mfaController');
const { changePassword } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');
const {
  registerSchema, loginSchema, changePasswordSchema,
  acceptInviteSchema, forgotPasswordSchema, resetPasswordSchema,
  mfaEnableSchema, mfaVerifySchema, mfaDisableSchema, verifyEmailSchema,
  refreshTokenSchema, logoutSchema, switchOrgSchema
} = require('../validators/schemas');
const { skipRateLimitInTests } = require('../middleware/rateLimitOptions');

// The global limiter (300 requests / 15 min) is far too generous for
// credential endpoints — it permits hundreds of password guesses per window.
// These are per-IP; authController additionally locks the individual account
// after repeated failures, which is what stops a distributed attempt.
const credentialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  // Successful sign-ins don't count, so a shared office IP doesn't lock out
  // colleagues who are all logging in legitimately.
  skipSuccessfulRequests: true,
  skip: skipRateLimitInTests,
  message: { message: 'Too many attempts from this network. Please wait a few minutes and try again.', code: 'RATE_LIMITED' }
});

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipRateLimitInTests,
  message: { message: 'Too many accounts created from this network. Please try again later.', code: 'RATE_LIMITED' }
});

// Reset requests send mail to an address the caller names, so an unthrottled
// endpoint is both an enumeration probe and a way to use us to spam someone.
// Successful requests are counted here (unlike sign-in) precisely because the
// success case is the one that sends the email.
const resetRequestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 6,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipRateLimitInTests,
  message: { message: 'Too many password reset requests. Please try again later.', code: 'RATE_LIMITED' }
});

// Token redemption is throttled so a token can't be brute-forced, even though
// 32 bytes of CSPRNG output makes that infeasible anyway.
const tokenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipRateLimitInTests,
  message: { message: 'Too many attempts. Please wait a few minutes and try again.', code: 'RATE_LIMITED' }
});

router.post('/register', signupLimiter, validate(registerSchema), register);
router.post('/login', credentialLimiter, validate(loginSchema), login);
router.get('/me', protect, me);
router.post('/change-password', protect, credentialLimiter, validate(changePasswordSchema), changePassword);

/**
 * Refresh tokens & device sessions (#50, #51).
 *
 * `/refresh` and `/logout` are deliberately unauthenticated by `protect` — the
 * whole point of a refresh token is to work after the 15-minute access token
 * has already expired, and a logout that only works while still signed in
 * isn't one. Rate limiting still applies: failures count (a stolen or guessed
 * refresh token is only 32 random bytes, but there's no reason to allow
 * unlimited attempts), successes don't (a device silently refreshing every
 * ~14 minutes for hours is normal use, not an attack).
 */
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skip: skipRateLimitInTests,
  message: { message: 'Too many attempts. Please wait a few minutes and try again.', code: 'RATE_LIMITED' }
});
router.post('/refresh', refreshLimiter, validate(refreshTokenSchema), refresh);
router.post('/logout', validate(logoutSchema), logout);
router.get('/sessions', protect, listSessions);
router.delete('/sessions/:id', protect, revokeSession);

// Org switching (#53, #54) — requires an existing session (any organisation),
// re-issued for a different one the identity also belongs to.
router.post('/switch-org', protect, credentialLimiter, validate(switchOrgSchema), switchOrg);

// Invitations — unauthenticated by design: the whole point is that the invitee
// has no account to sign in with yet.
router.get('/invite/:token', tokenLimiter, inviteDetails);
router.post('/accept-invite', tokenLimiter, validate(acceptInviteSchema), acceptInvite);

// Password reset — also unauthenticated, for the same reason.
router.post('/forgot-password', resetRequestLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', tokenLimiter, validate(resetPasswordSchema), resetPassword);

// Email verification (#52) — the confirm link is unauthenticated because it is
// frequently opened on a different device from the one that registered.
router.post('/verify-email', tokenLimiter, validate(verifyEmailSchema), verifyEmail);
router.post('/resend-verification', protect, resetRequestLimiter, resendVerification);

/**
 * Two-factor authentication (#7).
 *
 * `/mfa/verify` is unauthenticated in the ordinary sense — there is no session yet,
 * that is the point — but it is not unauthenticated in effect: it requires the
 * short-lived challenge token that `/login` issues only after a correct password.
 * It carries the credential limiter because it is a guessable six digits.
 */
router.post('/mfa/verify', credentialLimiter, validate(mfaVerifySchema), verifyMfa);
router.post('/mfa/setup', protect, credentialLimiter, setupMfa);
router.post('/mfa/enable', protect, credentialLimiter, validate(mfaEnableSchema), enableMfa);
router.post('/mfa/disable', protect, credentialLimiter, validate(mfaDisableSchema), disableMfa);
router.post('/mfa/backup-codes', protect, credentialLimiter, validate(mfaEnableSchema), regenerateBackupCodes);

module.exports = router;
