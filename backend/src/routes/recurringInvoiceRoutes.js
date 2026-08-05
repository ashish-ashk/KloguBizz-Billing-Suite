const router = require('express').Router();
const {
  listRecurring,
  getRecurring,
  recurringRuns,
  createRecurring,
  updateRecurring,
  setRecurringStatus,
  runRecurringNow,
  previewRecurring,
  deleteRecurring,
  restoreRecurring
} = require('../controllers/recurringInvoiceController');
const { protect } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { requireTenant } = require('../middleware/tenantMiddleware');
const { validate } = require('../middleware/validate');
const {
  recurringInvoiceCreateSchema,
  recurringInvoiceUpdateSchema,
  recurringInvoiceStatusSchema
} = require('../validators/schemas');

router.use(protect, requireTenant);

// Literal segments first, so 'preview' is not read as an id.
router.get('/', listRecurring);
router.get('/preview', previewRecurring);

/**
 * Creating or changing a schedule is an admin action.
 *
 * A standing instruction that raises tax invoices every month without anyone
 * looking is a larger commitment than one invoice, and the same boundary credit
 * notes and conversions draw applies: an accountant records what happened,
 * deciding to bill on a repeating basis is not theirs to set up.
 */
router.post('/', requireRole('admin'), validate(recurringInvoiceCreateSchema), createRecurring);
router.get('/:id', getRecurring);
router.get('/:id/runs', recurringRuns);
router.put('/:id', requireRole('admin'), validate(recurringInvoiceUpdateSchema), updateRecurring);
router.put('/:id/status', requireRole('admin'), validate(recurringInvoiceStatusSchema), setRecurringStatus);
router.post('/:id/run-now', requireRole('admin'), runRecurringNow);
router.delete('/:id', requireRole('admin'), deleteRecurring);
router.post('/:id/restore', requireRole('admin'), restoreRecurring);

module.exports = router;
