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
const { validate } = require('../middleware/validate');
const { paymentLinkCreateSchema, gatewaySettingsSchema } = require('../validators/schemas');
const { skipRateLimitInTests } = require('../middleware/rateLimitOptions');

router.use(protect, requireTenant);

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
