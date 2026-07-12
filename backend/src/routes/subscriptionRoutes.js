const router = require('express').Router();
const { listPlans, currentSubscription, startSubscription, cancelSubscription } = require('../controllers/subscriptionController');
const { protect } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { requireTenant } = require('../middleware/tenantMiddleware');

router.use(protect, requireTenant);
router.get('/plans', listPlans);
router.get('/current', currentSubscription);
router.post('/start', requireRole('admin'), startSubscription);
router.post('/cancel', requireRole('admin'), cancelSubscription);

module.exports = router;
