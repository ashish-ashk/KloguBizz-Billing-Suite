const router = require('express').Router();
const { listPayments, createPayment, exportPaymentsCsv } = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { requireTenant } = require('../middleware/tenantMiddleware');

router.use(protect, requireTenant);
router.get('/', listPayments);
router.get('/export.csv', exportPaymentsCsv);
router.post('/', requireRole('admin', 'accountant'), createPayment);

module.exports = router;
