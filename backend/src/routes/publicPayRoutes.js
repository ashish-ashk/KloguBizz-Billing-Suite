const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const {
  publicPaymentLink,
  startPublicPayment,
  confirmPublicPayment
} = require('../controllers/paymentLinkController');
const { skipRateLimitInTests } = require('../middleware/rateLimitOptions');

/**
 * The hosted pay page (2.3 #21, #23) — **unauthenticated by design**.
 *
 * The customer paying an invoice has no account here and never will; requiring
 * one would defeat the entire feature. The token in the URL is the credential,
 * and it is a bearer credential for exactly one invoice: see
 * `paymentLinkService.publicView` for the allowlist of what these routes may
 * return, and `resolveByToken` for why every failure returns the same shape.
 *
 * `protect` is deliberately absent. Everything that compensates for that lives in
 * the service: 32 bytes of CSPRNG hashed at rest, an expiry, a uniform "invalid"
 * response so tokens cannot be enumerated, an amount read from the invoice rather
 * than the request, and a mandatory signature check before anything is recorded.
 */

/**
 * Throttled per IP, and more tightly than an authenticated route.
 *
 * A token is infeasible to guess, but there is no reason to allow unlimited
 * attempts — and this endpoint is the one place in the product an anonymous
 * caller can reach tenant data at all.
 */
const payLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipRateLimitInTests,
  message: { message: 'Too many attempts. Please wait a few minutes and try again.', code: 'RATE_LIMITED' }
});

router.get('/:token', payLimiter, publicPaymentLink);
router.post('/:token/order', payLimiter, startPublicPayment);
router.post('/:token/confirm', payLimiter, confirmPublicPayment);

module.exports = router;
