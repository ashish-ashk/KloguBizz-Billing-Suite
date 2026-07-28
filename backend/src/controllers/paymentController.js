const { Invoice } = require('../models/Invoice');
const { Payment } = require('../models/Payment');
const { asyncHandler } = require('../utils/asyncHandler');
const { httpError } = require('../utils/httpError');
const { tenantFilter } = require('../middleware/tenantMiddleware');
const { streamCsv } = require('../services/csvService');
const { paginate, parseSort } = require('../utils/pagination');
const { logAudit } = require('../services/auditService');
const { recalculateSettlement } = require('./invoiceController');
const { roundMoney } = require('../services/gstService');
const { assertValidMaster } = require('../services/masterService');

const PAYMENT_SORTS = ['date', 'amount', 'createdAt'];

function buildPaymentFilter(req) {
  const filter = tenantFilter(req);
  // Voided payments are kept for the audit trail but excluded by default —
  // they are reversals, not collections, and including them in the tracker
  // would double-count.
  if (req.query.includeVoid !== 'true') filter.status = { $ne: 'void' };
  if (req.query.invoiceId) filter.invoiceId = req.query.invoiceId;
  if (req.query.clientId) filter.clientId = req.query.clientId;
  if (req.query.method) filter.method = req.query.method;
  return filter;
}

const listPayments = asyncHandler(async (req, res) => {
  const page = await paginate(Payment, buildPaymentFilter(req), req.query, query => query
    // Narrowed from a bare `populate('invoiceId clientId')`, which pulled two
    // entire documents — including every line item on the invoice — into each
    // row of the payments table.
    .populate('invoiceId', 'invoiceNumber date totals.total status')
    .populate('clientId', 'companyName gstin')
    .sort(parseSort(req.query, PAYMENT_SORTS, { date: -1 })));
  res.json(page);
});

const createPayment = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOne({ _id: req.body.invoiceId, ...tenantFilter(req) });
  if (!invoice) throw httpError(404, 'Invoice not found');

  // Bring the invoice's settlement up to date before deciding what is owed —
  // `balanceDue` may be stale on documents created before it was persisted.
  await recalculateSettlement(invoice);

  const amount = roundMoney(req.body.amount);
  if (amount <= 0) throw httpError(400, 'Payment amount must be greater than zero');
  // Previously any amount was accepted, so ₹10,00,000 could be recorded
  // against a ₹1,000 invoice — and then flowed into collection stats and the
  // payments export as real money.
  if (amount > invoice.balanceDue) {
    if (invoice.balanceDue <= 0) {
      throw httpError(409, `Invoice ${invoice.invoiceNumber} is already fully paid.`, 'ALREADY_PAID');
    }
    throw httpError(
      400,
      `Payment of ${amount.toFixed(2)} exceeds the ${invoice.balanceDue.toFixed(2)} still due on invoice ${invoice.invoiceNumber}.`,
      'OVERPAYMENT'
    );
  }

  // The payment method has to be one the super admin configured — it was
  // previously a free string, so the Masters list was only ever a suggestion.
  await assertValidMaster('paymentMethod', req.body.method, 'Payment method');

  // A draft receiving money is implicitly issued, so recalculateSettlement is
  // free to move its status.
  if (invoice.status === 'draft') invoice.status = 'pending';

  const payment = await Payment.create({
    orgId: req.orgId,
    invoiceId: invoice._id,
    // Always taken from the invoice, never the request, so a payment can never
    // be attributed to a different client than the invoice it settles.
    clientId: invoice.clientId || undefined,
    amount,
    method: req.body.method || 'Bank Transfer',
    reference: req.body.reference,
    note: req.body.note,
    date: req.body.date || new Date(),
    // Derived, not accepted from the caller: a client-supplied 'failed' status
    // produced a record that showed in the list and the CSV while contributing
    // nothing to the balance.
    status: 'success'
  });

  await recalculateSettlement(invoice);
  logAudit({ req, action: 'payment.recorded', entity: 'payment', entityId: payment._id, meta: { invoiceNumber: invoice.invoiceNumber, amount: payment.amount } });
  res.status(201).json(payment);
});

/**
 * Reverses a payment.
 *
 * Voids rather than deletes: a mistyped amount has to be correctable, but the
 * original record is evidence and money movement should never silently vanish
 * from the history. The invoice's settlement is recomputed, so voiding
 * correctly reopens it as pending, partial or overdue.
 */
const voidPayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findOne({ _id: req.params.id, ...tenantFilter(req) });
  if (!payment) throw httpError(404, 'Payment not found');
  if (payment.status === 'void') throw httpError(409, 'This payment has already been voided.', 'ALREADY_VOID');

  payment.status = 'void';
  payment.voidedAt = new Date();
  payment.voidReason = req.body?.reason;
  await payment.save();

  const invoice = await Invoice.findOne({ _id: payment.invoiceId, ...tenantFilter(req) });
  if (invoice) await recalculateSettlement(invoice);

  logAudit({ req, action: 'payment.voided', entity: 'payment', entityId: payment._id, meta: { amount: payment.amount, reason: payment.voidReason } });
  res.json({ payment, invoice });
});

const PAYMENT_CSV_COLUMNS = [
  { label: 'Date', value: p => p.date?.toISOString().slice(0, 10) },
  { label: 'Invoice Number', value: p => p.invoiceId?.invoiceNumber || '' },
  { label: 'Client', value: p => p.clientId?.companyName || '' },
  { label: 'Amount', value: p => Number(p.amount || 0).toFixed(2) },
  { label: 'Method', value: p => p.method },
  { label: 'Reference', value: p => p.reference || '' },
  { label: 'Status', value: p => p.status },
  { label: 'Note', value: p => p.note || '' }
];

const exportPaymentsCsv = asyncHandler(async (req, res) => {
  const cursor = Payment.find(buildPaymentFilter(req))
    .populate('invoiceId', 'invoiceNumber')
    .populate('clientId', 'companyName')
    .sort({ date: -1 })
    .cursor();
  await streamCsv(res, { filename: 'payments.csv', columns: PAYMENT_CSV_COLUMNS, cursor });
});

module.exports = { listPayments, createPayment, voidPayment, exportPaymentsCsv };
