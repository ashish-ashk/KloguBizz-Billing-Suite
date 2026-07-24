const { Invoice } = require('../models/Invoice');
const { Payment } = require('../models/Payment');
const { asyncHandler } = require('../utils/asyncHandler');
const { httpError } = require('../utils/httpError');
const { tenantFilter } = require('../middleware/tenantMiddleware');
const { toCsv } = require('../services/csvService');
const { logAudit } = require('../services/auditService');

const listPayments = asyncHandler(async (req, res) => {
  const payments = await Payment.find(tenantFilter(req)).populate('invoiceId clientId').sort({ date: -1 });
  res.json(payments);
});

const createPayment = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOne({ _id: req.body.invoiceId, ...tenantFilter(req) });
  if (!invoice) throw httpError(404, 'Invoice not found');
  const payment = await Payment.create({
    ...req.body,
    orgId: req.orgId,
    clientId: invoice.clientId || undefined
  });
  const paid = await Payment.aggregate([
    { $match: { invoiceId: invoice._id, orgId: invoice.orgId, status: 'success' } },
    { $group: { _id: '$invoiceId', amount: { $sum: '$amount' } } }
  ]);
  const paidAmount = paid[0]?.amount || 0;
  invoice.status = paidAmount >= invoice.totals.total ? 'paid' : paidAmount > 0 ? 'partial' : invoice.status;
  if (invoice.status === 'paid') invoice.paidDate = new Date();
  await invoice.save();
  logAudit({ req, action: 'payment.recorded', entity: 'payment', entityId: payment._id, meta: { invoiceNumber: invoice.invoiceNumber, amount: payment.amount } });
  res.status(201).json(payment);
});

const exportPaymentsCsv = asyncHandler(async (req, res) => {
  const payments = await Payment.find(tenantFilter(req)).populate('invoiceId', 'invoiceNumber').populate('clientId', 'companyName').sort({ date: -1 });
  const csv = toCsv(payments, [
    { label: 'Date', value: p => p.date?.toISOString().slice(0, 10) },
    { label: 'Invoice Number', value: p => p.invoiceId?.invoiceNumber || '' },
    { label: 'Client', value: p => p.clientId?.companyName || '' },
    { label: 'Amount', value: p => p.amount.toFixed(2) },
    { label: 'Method', value: p => p.method },
    { label: 'Reference', value: p => p.reference || '' },
    { label: 'Status', value: p => p.status },
    { label: 'Note', value: p => p.note || '' }
  ]);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="payments.csv"');
  res.send(csv);
});

module.exports = { listPayments, createPayment, exportPaymentsCsv };
