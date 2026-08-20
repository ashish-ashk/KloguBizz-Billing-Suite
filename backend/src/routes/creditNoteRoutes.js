const router = require('express').Router();
const {
  listCreditNotes,
  getCreditNote,
  createCreditNote,
  creditSummary,
  exportCreditNotesCsv
} = require('../controllers/creditNoteController');
const { protect } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { requireTenant } = require('../middleware/tenantMiddleware');
const { validate } = require('../middleware/validate');
const { creditNoteCreateSchema } = require('../validators/schemas');
const { requireFlag } = require('../services/featureFlagService');
const { requireCapabilityForWrites } = require('../services/entitlementService');

router.use(protect, requireTenant);
router.get('/', listCreditNotes);
router.get('/export.csv', exportCreditNotesCsv);
// Declared before '/:id' so 'for-invoice' can't be read as an id.
router.get('/for-invoice/:invoiceId', creditSummary);
// Reversing a charge is an admin decision — an accountant records payments,
// but writing off revenue is not theirs to do.
router.post('/', requireRole('admin'), requireFlag('creditNotes'), requireCapabilityForWrites('creditNotes'), validate(creditNoteCreateSchema), createCreditNote);
router.get('/:id', getCreditNote);

module.exports = router;
