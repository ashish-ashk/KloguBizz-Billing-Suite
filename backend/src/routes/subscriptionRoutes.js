const router = require('express').Router();
const {
  listPlans, currentSubscription, startSubscription, cancelSubscription, myPlatformInvoices,
  checkCoupon, previewPlanChange, cancelPendingChange
} = require('../controllers/subscriptionController');
const { protect } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { requireTenant } = require('../middleware/tenantMiddleware');
const { validate } = require('../middleware/validate');
const { subscriptionStartSchema, couponCheckSchema } = require('../validators/schemas');

router.use(protect, requireTenant);
router.get('/plans', listPlans);
router.get('/invoices', myPlatformInvoices);
router.get('/current', currentSubscription);
router.get('/preview-change', previewPlanChange);
/** Checking a code is a read, but the code goes in a body rather than a query
 *  string so it stays out of access logs and browser history. */
router.post('/coupon/check', validate(couponCheckSchema), checkCoupon);
router.post('/start', requireRole('admin'), validate(subscriptionStartSchema), startSubscription);
router.post('/cancel', requireRole('admin'), cancelSubscription);
router.post('/cancel-scheduled-change', requireRole('admin'), cancelPendingChange);

module.exports = router;
