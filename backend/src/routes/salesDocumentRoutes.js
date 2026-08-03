const router = require('express').Router();
const {
  listSalesDocuments,
  getSalesDocument,
  createSalesDocument,
  updateSalesDocument,
  setSalesDocumentStatus,
  convertToInvoice,
  deleteSalesDocument,
  restoreSalesDocument,
  salesDocumentPdf,
  salesDocumentSummary,
  exportSalesDocumentsCsv
} = require('../controllers/salesDocumentController');
const { protect } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { requireTenant } = require('../middleware/tenantMiddleware');
const { validate } = require('../middleware/validate');
const {
  salesDocumentCreateSchema,
  salesDocumentUpdateSchema,
  salesDocumentStatusSchema,
  salesDocumentConvertSchema
} = require('../validators/schemas');

router.use(protect, requireTenant);

// Literal segments before '/:id', so 'export.csv' and 'summary' can't be read
// as document ids — the mistake that makes a route silently return 404s.
router.get('/', listSalesDocuments);
router.get('/export.csv', exportSalesDocumentsCsv);
router.get('/summary', salesDocumentSummary);

router.post('/', validate(salesDocumentCreateSchema), createSalesDocument);
router.get('/:id', getSalesDocument);
router.get('/:id/pdf', salesDocumentPdf);
router.put('/:id', validate(salesDocumentUpdateSchema), updateSalesDocument);
router.put('/:id/status', validate(salesDocumentStatusSchema), setSalesDocumentStatus);

/**
 * Conversion raises a real tax invoice, so it is an admin action — the same
 * boundary `creditNoteController` draws. An accountant records what happened;
 * deciding to bill a customer is not theirs to do.
 */
router.post('/:id/convert', requireRole('admin'), validate(salesDocumentConvertSchema), convertToInvoice);

router.delete('/:id', requireRole('admin'), deleteSalesDocument);
router.post('/:id/restore', requireRole('admin'), restoreSalesDocument);

module.exports = router;
