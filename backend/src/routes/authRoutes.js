const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { register, login, me } = require('../controllers/authController');
const { changePassword } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');
const { registerSchema, loginSchema, changePasswordSchema } = require('../validators/schemas');
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

router.post('/register', signupLimiter, validate(registerSchema), register);
router.post('/login', credentialLimiter, validate(loginSchema), login);
router.get('/me', protect, me);
router.post('/change-password', protect, credentialLimiter, validate(changePasswordSchema), changePassword);

module.exports = router;
