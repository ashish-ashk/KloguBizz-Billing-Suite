const router = require('express').Router();
const {
  listInvoices,
  invoiceStats,
  getInvoice,
  createInvoice,
  updateInvoice,
  duplicateInvoice,
  markPaid,
  sendReminder,
  remindAll,
  deleteInvoice,
  invoicePdf,
  exportInvoicesCsv
} = require('../controllers/invoiceController');
const { protect } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { requireTenant } = require('../middleware/tenantMiddleware');
const { validate } = require('../middleware/validate');
const { invoiceCreateSchema, invoiceUpdateSchema, markPaidSchema } = require('../validators/schemas');

router.use(protect, requireTenant);
router.get('/', listInvoices);
router.get('/stats', invoiceStats);
router.get('/export.csv', exportInvoicesCsv);
router.post('/', requireRole('admin', 'accountant'), validate(invoiceCreateSchema), createInvoice);
router.post('/remind-all', requireRole('admin', 'accountant'), remindAll);
router.get('/:id', getInvoice);
router.put('/:id', requireRole('admin', 'accountant'), validate(invoiceUpdateSchema), updateInvoice);
router.post('/:id/duplicate', requireRole('admin', 'accountant'), duplicateInvoice);
router.post('/:id/mark-paid', requireRole('admin', 'accountant'), validate(markPaidSchema), markPaid);
router.post('/:id/remind', requireRole('admin', 'accountant'), sendReminder);
router.get('/:id/pdf', invoicePdf);
router.delete('/:id', requireRole('admin'), deleteInvoice);

module.exports = router;
