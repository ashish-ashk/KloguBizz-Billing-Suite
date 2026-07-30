const router = require('express').Router();
const {
  listInvoices,
  invoiceStats,
  getInvoice,
  createInvoice,
  updateInvoice,
  duplicateInvoice,
  markPaid,
  cancelInvoice,
  sendReminder,
  remindAll,
  deleteInvoice,
  restoreInvoice,
  sendInvoiceToCustomer,
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
// Voiding an issued document is an admin decision, not a bookkeeping one.
router.post('/:id/cancel', requireRole('admin'), cancelInvoice);
router.post('/:id/remind', requireRole('admin', 'accountant'), sendReminder);
router.get('/:id/pdf', invoicePdf);
// Sending the invoice to the customer (2.3 #19) — the loop the product exists for,
// which previously ended at a download.
router.post('/:id/send', requireRole('admin', 'accountant'), sendInvoiceToCustomer);
router.delete('/:id', requireRole('admin'), deleteInvoice);
// Recycle bin (#37): a deleted draft keeps its invoice number, so restoring it
// cannot collide with anything the counter has since handed out.
router.post('/:id/restore', requireRole('admin'), restoreInvoice);

module.exports = router;
