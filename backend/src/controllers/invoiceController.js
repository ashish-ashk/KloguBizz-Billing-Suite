const mongoose = require('mongoose');
const { Organisation } = require('../models/Organisation');
const { Client } = require('../models/Client');
const { Invoice } = require('../models/Invoice');
const { Payment } = require('../models/Payment');
const { asyncHandler } = require('../utils/asyncHandler');
const { httpError } = require('../utils/httpError');
const { tenantFilter } = require('../middleware/tenantMiddleware');
const { calculateInvoiceTotals, roundMoney } = require('../services/gstService');
const { nextInvoiceNumber } = require('../services/invoiceNumberService');
const { renderInvoicePdf } = require('../services/pdfService');
const { sendReminderEmail } = require('../services/emailService');
const { assertInvoiceQuota } = require('../services/planService');
const { logAudit } = require('../services/auditService');
const { toCsv } = require('../services/csvService');

async function totalsFor(req, body) {
  const org = await Organisation.findById(req.orgId);
  let toStateCode;
  if (body.clientId) {
    const client = await Client.findOne({ _id: body.clientId, ...tenantFilter(req) });
    if (!client) throw httpError(400, 'Valid clientId is required');
    toStateCode = client.stateCode;
  } else if (body.billTo?.name) {
    toStateCode = body.billTo.stateCode || org.stateCode;
  } else {
    throw httpError(400, 'Provide a registered client or buyer details');
  }
  return calculateInvoiceTotals(body.items || [], org.stateCode, toStateCode, {
    discountPercent: body.discountPercent,
    // Whole-rupee rounding is the Indian billing convention, but a tenant that
    // bills in exact paise can turn it off.
    roundOff: org.brandingConfig?.roundOffTotal !== false
  });
}

/**
 * Recomputes an invoice's settlement state from its successful payments and
 * persists it.
 *
 * Single source of truth for `amountPaid`, `balanceDue`, `status` and
 * `paidDate`. Both markPaid and payment recording route through here, which is
 * what stops the two from disagreeing — markPaid used to force status:'paid'
 * and write a Payment for the *full* invoice total even when part-payments
 * already existed, so recorded collections ended up exceeding the invoice.
 *
 * Status is only ever moved between the settlement states; a draft stays a
 * draft until it is issued.
 */
async function recalculateSettlement(invoice) {
  const [agg] = await Payment.aggregate([
    { $match: { invoiceId: invoice._id, orgId: invoice.orgId, status: 'success' } },
    { $group: { _id: '$invoiceId', amount: { $sum: '$amount' } } }
  ]);
  const total = roundMoney(invoice.totals?.total || 0);
  const amountPaid = roundMoney(agg?.amount || 0);
  const balanceDue = roundMoney(Math.max(0, total - amountPaid));

  invoice.amountPaid = amountPaid;
  invoice.balanceDue = balanceDue;

  if (invoice.status !== 'draft') {
    const pastDue = invoice.dueDate && invoice.dueDate < new Date();
    if (amountPaid >= total && total > 0) {
      invoice.status = 'paid';
      invoice.paidDate = invoice.paidDate || new Date();
    } else {
      // 'overdue' outranks 'partial': a part-paid invoice that is also late
      // needs chasing, and `amountPaid`/`balanceDue` still record how much
      // came in. Previously a partial invoice could never become overdue at
      // all, so late part-payers dropped off the collections list entirely.
      invoice.status = pastDue ? 'overdue' : (amountPaid > 0 ? 'partial' : 'pending');
      invoice.paidDate = undefined;
    }
  }

  await invoice.save();
  return invoice;
}

// clientId/billTo are mutually exclusive (a registered-client invoice vs a
// walk-in quick bill) — clearing the other whenever one is set lets a bill
// be "converted" to a client invoice (or vice versa) just by switching which
// one the request populates, without stale data lingering on the document.
function normalizeBuyer(body) {
  if (body.clientId === undefined && body.billTo === undefined) return body;
  const out = { ...body };
  if (out.clientId) out.billTo = null;
  else if (out.billTo?.name) out.clientId = null;
  return out;
}

// How long a sweep's result is considered fresh. The sweep is a write, and it
// used to run on *every* list, stats and export call — a full write scan per
// page view. Overdue is a once-a-day transition, so throttling to once a
// minute per org is indistinguishable to the user and removes the write from
// the hot path. (A scheduled job is the proper home for this; this keeps the
// cost bounded until there is one.)
const SWEEP_INTERVAL_MS = 60 * 1000;
const lastSweepByOrg = new Map();

// Unpaid and part-paid invoices past their due date become overdue.
async function sweepOverdue(orgFilter) {
  const key = String(orgFilter.orgId);
  const now = Date.now();
  if (now - (lastSweepByOrg.get(key) || 0) < SWEEP_INTERVAL_MS) return;
  lastSweepByOrg.set(key, now);
  await Invoice.updateMany(
    // 'partial' is included because a part-paid invoice that is also late is
    // still money owed — it used to be skipped, so it never appeared in the
    // overdue filter or the collections list.
    { ...orgFilter, status: { $in: ['pending', 'partial'] }, dueDate: { $lt: new Date() } },
    { status: 'overdue' }
  );
}

const listInvoices = asyncHandler(async (req, res) => {
  const filter = tenantFilter(req);
  await sweepOverdue(filter);
  if (req.query.status) filter.status = req.query.status;
  if (req.query.clientId) filter.clientId = req.query.clientId;
  if (req.query.q) filter.invoiceNumber = { $regex: req.query.q.trim(), $options: 'i' };
  const invoices = await Invoice.find(filter).populate('clientId').sort({ date: -1, createdAt: -1 });
  res.json(invoices);
});

/**
 * Aggregated numbers for the dashboard.
 *
 * Revenue is measured from money actually received (successful Payment
 * records), not from invoice status. The previous version summed the totals of
 * invoices whose status happened to be 'paid', which meant a ₹1,00,000 invoice
 * with ₹90,000 received counted as ₹0 revenue *and* ₹1,00,000 pending — both
 * wrong, and wrong in opposite directions.
 *
 * Outstanding figures come from the persisted `balanceDue`, so a part-paid
 * invoice contributes only what is still owed.
 *
 * Runs as aggregation pipelines rather than loading every invoice in the org
 * into memory and reducing in JavaScript.
 */
const invoiceStats = asyncHandler(async (req, res) => {
  const filter = tenantFilter(req);
  await sweepOverdue(filter);
  const orgId = new mongoose.Types.ObjectId(String(req.orgId));

  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
  twelveMonthsAgo.setDate(1);
  twelveMonthsAgo.setHours(0, 0, 0, 0);

  const [statusAgg, receivedAgg, monthlyAgg, topClientsAgg] = await Promise.all([
    // Counts and outstanding balances per status, in one pass.
    Invoice.aggregate([
      { $match: { orgId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          balance: { $sum: { $ifNull: ['$balanceDue', 0] } },
          invoiced: { $sum: { $ifNull: ['$totals.total', 0] } }
        }
      }
    ]),
    // Total collected, ever.
    Payment.aggregate([
      { $match: { orgId, status: 'success' } },
      { $group: { _id: null, amount: { $sum: '$amount' } } }
    ]),
    // Collections per month for the trailing 12 months, by payment date —
    // which is when the money arrived, rather than when the invoice was
    // stamped paid.
    Payment.aggregate([
      { $match: { orgId, status: 'success', date: { $gte: twelveMonthsAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$date' } }, revenue: { $sum: '$amount' } } },
      { $sort: { _id: 1 } }
    ]),
    // Top clients by money received. Walk-in bills have no clientId and are
    // grouped out, same as before.
    Payment.aggregate([
      { $match: { orgId, status: 'success', clientId: { $ne: null } } },
      { $group: { _id: '$clientId', revenue: { $sum: '$amount' } } },
      { $sort: { revenue: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'clients', localField: '_id', foreignField: '_id', as: 'client' } },
      { $project: { revenue: 1, name: { $ifNull: [{ $first: '$client.companyName' }, 'Unknown'] } } }
    ])
  ]);

  const byStatus = Object.fromEntries(statusAgg.map(row => [row._id, row]));
  const count = status => byStatus[status]?.count || 0;
  const balance = statuses => roundMoney(statuses.reduce((sum, s) => sum + (byStatus[s]?.balance || 0), 0));

  res.json({
    totalRevenue: roundMoney(receivedAgg[0]?.amount || 0),
    // What is still owed, not the face value of unpaid invoices.
    pendingAmount: balance(['pending', 'partial']),
    overdueAmount: balance(['overdue']),
    // Everything issued and not yet collected, however it is aged.
    outstandingAmount: balance(['pending', 'partial', 'overdue']),
    counts: {
      total: statusAgg.reduce((sum, row) => sum + row.count, 0),
      paid: count('paid'),
      pending: count('pending') + count('partial'),
      overdue: count('overdue'),
      draft: count('draft')
    },
    monthlyRevenue: monthlyAgg.map(row => ({ month: row._id, revenue: roundMoney(row.revenue) })),
    topClients: topClientsAgg.map(row => ({ name: row.name, revenue: roundMoney(row.revenue) }))
  });
});

const getInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOne({ _id: req.params.id, ...tenantFilter(req) }).populate('clientId');
  if (!invoice) throw httpError(404, 'Invoice not found');
  res.json(invoice);
});

const createInvoice = asyncHandler(async (req, res) => {
  await assertInvoiceQuota(req.orgId);
  const body = normalizeBuyer(req.body);
  // The number is always server-generated from the org's atomic counter,
  // never taken from the request — a client-supplied value would bypass
  // that counter (leaving it out of sync) and risks colliding with a
  // number the counter has already handed out.
  delete body.invoiceNumber;
  const totals = await totalsFor(req, body);
  const invoice = await Invoice.create({
    ...body,
    orgId: req.orgId,
    invoiceNumber: await nextInvoiceNumber(req.orgId),
    totals,
    // Nothing collected yet, so the whole total is outstanding. Keeping these
    // in step with `totals` from the moment of creation means the dashboard
    // never has to guess.
    amountPaid: 0,
    balanceDue: totals.total
  });
  logAudit({ req, action: 'invoice.created', entity: 'invoice', entityId: invoice._id, meta: { invoiceNumber: invoice.invoiceNumber, total: totals.total } });
  res.status(201).json(invoice);
});

const updateInvoice = asyncHandler(async (req, res) => {
  const update = normalizeBuyer(req.body);
  // Immutable once issued — same reasoning as createInvoice above, and it
  // also stops an edit from accidentally reassigning an already-used number.
  delete update.invoiceNumber;
  const pricingChanged = req.body.items
    || req.body.discountPercent !== undefined
    || req.body.clientId !== undefined
    || req.body.billTo !== undefined;
  if (pricingChanged) {
    const existing = await Invoice.findOne({ _id: req.params.id, ...tenantFilter(req) });
    if (!existing) throw httpError(404, 'Invoice not found');
    update.totals = await totalsFor(req, normalizeBuyer({ ...existing.toObject(), ...req.body }));
  }
  const invoice = await Invoice.findOneAndUpdate(
    { _id: req.params.id, ...tenantFilter(req) },
    update,
    { new: true, runValidators: true }
  );
  if (!invoice) throw httpError(404, 'Invoice not found');
  // Repricing moves the total, so the outstanding balance and the settlement
  // status have to be recomputed against whatever has already been received —
  // otherwise editing a part-paid invoice leaves balanceDue pointing at the
  // old figure.
  if (pricingChanged) await recalculateSettlement(invoice);
  logAudit({ req, action: 'invoice.updated', entity: 'invoice', entityId: invoice._id, meta: { invoiceNumber: invoice.invoiceNumber, total: invoice.totals?.total } });
  res.json(invoice);
});

const duplicateInvoice = asyncHandler(async (req, res) => {
  // Duplicating creates a real invoice and consumes a number from the org's
  // counter, so it has to respect the plan's monthly quota — otherwise Duplicate
  // is simply a way around the limit that createInvoice enforces.
  await assertInvoiceQuota(req.orgId);
  const source = await Invoice.findOne({ _id: req.params.id, ...tenantFilter(req) });
  if (!source) throw httpError(404, 'Invoice not found');
  const copy = source.toObject();
  delete copy._id;
  delete copy.createdAt;
  delete copy.updatedAt;
  const invoice = await Invoice.create({
    ...copy,
    invoiceNumber: await nextInvoiceNumber(req.orgId),
    date: new Date(),
    dueDate: new Date(Date.now() + 15 * 86400000),
    status: 'draft',
    paidDate: null,
    // The copy is a fresh unpaid document — carrying over the source's
    // settlement would show it as already collected.
    amountPaid: 0,
    balanceDue: source.totals?.total || 0
  });
  logAudit({ req, action: 'invoice.duplicated', entity: 'invoice', entityId: invoice._id, meta: { from: source.invoiceNumber, to: invoice.invoiceNumber } });
  res.status(201).json(invoice);
});

/**
 * Settles an invoice in full by recording a payment for whatever is still
 * outstanding.
 *
 * It used to write a payment for the *entire* invoice total and force
 * status:'paid' regardless of what had already been received — so marking a
 * part-paid invoice as paid recorded more money than the invoice was worth,
 * inflating collection stats and the payments export. Now it settles only the
 * balance, and refuses when there is nothing left to settle.
 */
const markPaid = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOne({ _id: req.params.id, ...tenantFilter(req) });
  if (!invoice) throw httpError(404, 'Invoice not found');

  // Recompute first: `balanceDue` may be stale on documents created before it
  // was persisted, and this is a money decision.
  await recalculateSettlement(invoice);

  if (invoice.balanceDue <= 0) {
    throw httpError(409, 'This invoice is already fully paid.', 'ALREADY_PAID');
  }

  // Issuing happens implicitly: a draft being marked paid becomes a real
  // invoice, so recalculateSettlement is allowed to move its status.
  if (invoice.status === 'draft') invoice.status = 'pending';

  const payment = await Payment.create({
    orgId: req.orgId,
    invoiceId: invoice._id,
    clientId: invoice.clientId || undefined,
    amount: invoice.balanceDue,
    method: req.body.method || 'Manual',
    reference: req.body.reference || 'marked-paid',
    date: req.body.date || new Date(),
    status: 'success'
  });

  await recalculateSettlement(invoice);
  logAudit({ req, action: 'invoice.paid', entity: 'invoice', entityId: invoice._id, meta: { invoiceNumber: invoice.invoiceNumber, amount: payment.amount } });
  res.json(invoice);
});

const sendReminder = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOne({ _id: req.params.id, ...tenantFilter(req) }).populate('clientId');
  if (!invoice) throw httpError(404, 'Invoice not found');
  const email = invoice.clientId?.email || invoice.billTo?.email;
  const name = invoice.clientId?.companyName || invoice.billTo?.name;
  if (!email) throw httpError(400, 'This buyer has no email address on file');
  const org = await Organisation.findById(req.orgId);
  const overdueDays = Math.max(0, Math.floor((Date.now() - invoice.dueDate.getTime()) / 86400000));
  const result = await sendReminderEmail({
    to: email,
    clientName: name,
    invoiceNumber: invoice.invoiceNumber,
    amount: `INR ${invoice.totals.total.toLocaleString('en-IN')}`,
    dueDate: invoice.dueDate,
    orgName: org?.name || 'KloguBizz',
    overdueDays
  });
  logAudit({ req, action: 'invoice.reminder_sent', entity: 'invoice', entityId: invoice._id, meta: { to: email } });
  res.json({ ok: true, ...result });
});

/**
 * Deletes a draft.
 *
 * Only drafts. Once an invoice is issued it has been given to a customer and
 * counted in a GST return, and under GST it must be reversed with a credit
 * note rather than erased — deleting it also punches a permanent hole in the
 * invoice number series, which is itself a compliance problem. Credit notes are
 * the follow-up to this change; until they exist, an issued invoice can still
 * be corrected by editing it.
 */
const deleteInvoice = asyncHandler(async (req, res) => {
  const existing = await Invoice.findOne({ _id: req.params.id, ...tenantFilter(req) });
  if (!existing) throw httpError(404, 'Invoice not found');

  if (existing.status !== 'draft') {
    throw httpError(
      409,
      `Invoice ${existing.invoiceNumber} has been issued and cannot be deleted — deleting it would leave a gap in your invoice number series and in your GST records. Only drafts can be deleted.`,
      'INVOICE_ISSUED'
    );
  }
  const paymentCount = await Payment.countDocuments({ ...tenantFilter(req), invoiceId: existing._id });
  if (paymentCount > 0) {
    throw httpError(409, 'This invoice has payments recorded against it and cannot be deleted.', 'INVOICE_HAS_PAYMENTS');
  }

  await existing.deleteOne();
  logAudit({ req, action: 'invoice.deleted', entity: 'invoice', entityId: existing._id, meta: { invoiceNumber: existing.invoiceNumber } });
  res.status(204).end();
});

// Missing/undefined figures export as 0.00 rather than blowing up on
// `.toFixed` — documents created before a totals field existed have no value
// for it.
function money(value) {
  return Number(value || 0).toFixed(2);
}

const exportInvoicesCsv = asyncHandler(async (req, res) => {
  const filter = tenantFilter(req);
  await sweepOverdue(filter);
  if (req.query.status) filter.status = req.query.status;
  const invoices = await Invoice.find(filter).populate('clientId', 'companyName gstin').sort({ date: -1 });
  const csv = toCsv(invoices, [
    { label: 'Invoice Number', value: i => i.invoiceNumber },
    { label: 'Client', value: i => i.clientId?.companyName || i.billTo?.name || '' },
    { label: 'GSTIN', value: i => i.clientId?.gstin || i.billTo?.gstin || '' },
    { label: 'Date', value: i => i.date?.toISOString().slice(0, 10) },
    { label: 'Due Date', value: i => i.dueDate?.toISOString().slice(0, 10) },
    { label: 'Status', value: i => i.status },
    { label: 'Gross Value', value: i => money(i.totals?.grossSubtotal ?? i.totals?.subtotal) },
    { label: 'Discount', value: i => money(i.totals?.discountTotal) },
    { label: 'Taxable Value', value: i => money(i.totals?.subtotal) },
    { label: 'CGST', value: i => money(i.totals?.cgst) },
    { label: 'SGST/UTGST', value: i => money(i.totals?.sgst) },
    { label: 'IGST', value: i => money(i.totals?.igst) },
    { label: 'Cess', value: i => money(i.totals?.cess) },
    { label: 'Round Off', value: i => money(i.totals?.roundOff) },
    { label: 'Total', value: i => money(i.totals?.total) },
    { label: 'Amount Paid', value: i => money(i.amountPaid) },
    { label: 'Balance Due', value: i => money(i.balanceDue) }
  ]);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="invoices.csv"');
  res.send(csv);
});

// Sends reminder emails for every pending/partial/overdue invoice with a
// client email on file. Used by the "Remind all" action on the Payments page.
const remindAll = asyncHandler(async (req, res) => {
  const filter = tenantFilter(req);
  await sweepOverdue(filter);
  filter.status = { $in: ['pending', 'partial', 'overdue'] };
  const invoices = await Invoice.find(filter).populate('clientId');
  const org = await Organisation.findById(req.orgId);
  let sent = 0;
  let skipped = 0;
  for (const invoice of invoices) {
    const email = invoice.clientId?.email || invoice.billTo?.email;
    if (!email) { skipped += 1; continue; }
    const overdueDays = Math.max(0, Math.floor((Date.now() - invoice.dueDate.getTime()) / 86400000));
    await sendReminderEmail({
      to: email,
      clientName: invoice.clientId?.companyName || invoice.billTo?.name,
      invoiceNumber: invoice.invoiceNumber,
      amount: `INR ${invoice.totals.total.toLocaleString('en-IN')}`,
      dueDate: invoice.dueDate,
      orgName: org?.name || 'KloguBizz',
      overdueDays
    });
    sent += 1;
  }
  logAudit({ req, action: 'invoice.remind_all', entity: 'invoice', meta: { sent, skipped } });
  res.json({ sent, skipped, total: invoices.length });
});

const invoicePdf = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOne({ _id: req.params.id, ...tenantFilter(req) }).populate('clientId');
  if (!invoice) throw httpError(404, 'Invoice not found');
  const org = await Organisation.findById(req.orgId);
  const client = invoice.clientId || (invoice.billTo?.name ? {
    companyName: invoice.billTo.name,
    address: invoice.billTo.address,
    gstin: invoice.billTo.gstin,
    stateCode: invoice.billTo.stateCode
  } : null);
  const buffer = await renderInvoicePdf({ invoice, client, org });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoiceNumber}.pdf"`);
  res.send(buffer);
});

module.exports = {
  recalculateSettlement,
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
};
