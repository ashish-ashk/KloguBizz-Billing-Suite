const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const {
  listPaymentLinks,
  createPaymentLink,
  sendPaymentLink,
  cancelPaymentLink,
  getGatewaySettings,
  saveGatewaySettings
} = require('../controllers/paymentLinkController');
const { protect } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { requireTenant } = require('../middleware/tenantMiddleware');
const { requireCapabilityForWrites } = require('../services/entitlementService');
const { validate } = require('../middleware/validate');
const { paymentLinkCreateSchema, gatewaySettingsSchema } = require('../validators/schemas');
const { skipRateLimitInTests } = require('../middleware/rateLimitOptions');

router.use(protect, requireTenant, requireCapabilityForWrites('paymentLinks'));
/**
 * Gated at the mount point, and **writes only**.
 *
 * At the mount point because a per-route list is one somebody adds to and
 * forgets, and the forgotten route is a live endpoint behind a hidden button — a
 * plan limit anyone can skip with `curl`.
 *
 * Writes only because a tenant who downgrades still owns the records they
 * created. A purchase register is an input-tax-credit record they may be required
 * to produce; hiding it behind a pricing tier would be taking away their data
 * rather than a feature.
 */

router.get('/', listPaymentLinks);

/**
 * Gateway credentials are the tenant's ability to take money, so reading or
 * changing them is admin-only — an accountant records payments, but connecting a
 * merchant account is not theirs to do.
 */
router.get('/gateway', requireRole('admin'), getGatewaySettings);
router.put('/gateway', requireRole('admin'), validate(gatewaySettingsSchema), saveGatewaySettings);

/**
 * Creating a link is throttled per tenant.
 *
 * Each one is a bearer credential for an invoice, and an unbounded loop producing
 * thousands of live links — whether from a scripting mistake or a compromised
 * session — is a much larger exposure than the same loop producing invoices.
 */
const linkLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 200,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipRateLimitInTests,
  message: { message: 'Too many payment links created. Please wait a few minutes.', code: 'RATE_LIMITED' }
});

router.post('/', linkLimiter, validate(paymentLinkCreateSchema), createPaymentLink);
router.post('/send/:invoiceId', linkLimiter, sendPaymentLink);
router.post('/:id/cancel', requireRole('admin'), cancelPaymentLink);

module.exports = router;
