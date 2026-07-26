const router = require('express').Router();
const { listPayments, createPayment, voidPayment, exportPaymentsCsv } = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { requireTenant } = require('../middleware/tenantMiddleware');
const { validate } = require('../middleware/validate');
const { paymentCreateSchema } = require('../validators/schemas');

router.use(protect, requireTenant);
router.get('/', listPayments);
router.get('/export.csv', exportPaymentsCsv);
router.post('/', requireRole('admin', 'accountant'), validate(paymentCreateSchema), createPayment);
// Reversing a recorded collection is an admin decision, not a bookkeeping one.
router.post('/:id/void', requireRole('admin'), voidPayment);

module.exports = router;
