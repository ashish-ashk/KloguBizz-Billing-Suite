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

router.use(protect, requireTenant);
router.get('/', listInvoices);
router.get('/stats', invoiceStats);
router.get('/export.csv', exportInvoicesCsv);
router.post('/', requireRole('admin', 'accountant'), createInvoice);
router.post('/remind-all', requireRole('admin', 'accountant'), remindAll);
router.get('/:id', getInvoice);
router.put('/:id', requireRole('admin', 'accountant'), updateInvoice);
router.post('/:id/duplicate', requireRole('admin', 'accountant'), duplicateInvoice);
router.post('/:id/mark-paid', requireRole('admin', 'accountant'), markPaid);
router.post('/:id/remind', requireRole('admin', 'accountant'), sendReminder);
router.get('/:id/pdf', invoicePdf);
router.delete('/:id', requireRole('admin'), deleteInvoice);

module.exports = router;
