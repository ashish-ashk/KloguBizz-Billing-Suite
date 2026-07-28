const { Organisation } = require('../models/Organisation');
const { Client } = require('../models/Client');
const { Invoice } = require('../models/Invoice');
const { CreditNote } = require('../models/CreditNote');
const { asyncHandler } = require('../utils/asyncHandler');
const { httpError } = require('../utils/httpError');
const { tenantFilter } = require('../middleware/tenantMiddleware');
const { calculateInvoiceTotals, roundMoney } = require('../services/gstService');
const { nextCreditNoteNumber } = require('../services/invoiceNumberService');
const { logAudit } = require('../services/auditService');
const { streamCsv } = require('../services/csvService');
const { paginate, escapeRegex, parseSort } = require('../utils/pagination');
const { recalculateSettlement } = require('./invoiceController');

/**
 * Total already credited against an invoice.
 *
 * Only issued credit notes count — a draft has not been given to the customer
 * and reduces nothing.
 */
async function creditedAmount(invoiceId) {
  const [agg] = await CreditNote.aggregate([
    { $match: { invoiceId, status: 'issued' } },
    { $group: { _id: '$invoiceId', total: { $sum: '$totals.total' } } }
  ]);
  return roundMoney(agg?.total || 0);
}

const CREDIT_NOTE_SORTS = ['date', 'createdAt', 'creditNoteNumber'];

function buildCreditNoteFilter(req) {
  const filter = tenantFilter(req);
  if (req.query.invoiceId) filter.invoiceId = req.query.invoiceId;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.reason) filter.reason = req.query.reason;
  if (req.query.q) {
    const term = escapeRegex(String(req.query.q).trim());
    if (term) {
      filter.$or = [
        { creditNoteNumber: { $regex: term, $options: 'i' } },
        { invoiceNumber: { $regex: term, $options: 'i' } }
      ];
    }
  }
  return filter;
}

const listCreditNotes = asyncHandler(async (req, res) => {
  const page = await paginate(CreditNote, buildCreditNoteFilter(req), req.query, query => query
    .populate('clientId', 'companyName gstin')
    .sort(parseSort(req.query, CREDIT_NOTE_SORTS, { date: -1, createdAt: -1 })));
  res.json(page);
});

const getCreditNote = asyncHandler(async (req, res) => {
  const note = await CreditNote.findOne({ _id: req.params.id, ...tenantFilter(req) }).populate('clientId');
  if (!note) throw httpError(404, 'Credit note not found');
  res.json(note);
});

/**
 * Issues a credit note against an invoice.
 *
 * Rules that matter:
 *  - The invoice must exist and be issued. Crediting a draft makes no sense —
 *    a draft can simply be edited or deleted.
 *  - The credited total, plus anything already credited, cannot exceed the
 *    invoice. Otherwise a tenant could refund more than they charged, and the
 *    GST return would claim back tax that was never paid.
 *  - Tax is computed by the same engine as the invoice, from the same place of
 *    supply, so the credit reverses the exact tax heads that were charged (an
 *    IGST invoice must be credited in IGST, not CGST+SGST).
 *  - Line items default to the invoice's own, which is the common case (a full
 *    reversal) and keeps HSN codes and rates consistent for the return.
 */
const createCreditNote = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOne({ _id: req.body.invoiceId, ...tenantFilter(req) });
  if (!invoice) throw httpError(404, 'Invoice not found');

  if (invoice.status === 'draft') {
    throw httpError(
      409,
      `Invoice ${invoice.invoiceNumber} is still a draft — edit or delete it instead of issuing a credit note.`,
      'INVOICE_IS_DRAFT'
    );
  }

  const org = await Organisation.findById(req.orgId);

  // Place of supply comes from the original invoice's buyer, so the credit
  // reverses the same tax heads that were charged.
  let toStateCode;
  if (invoice.clientId) {
    const client = await Client.findOne({ _id: invoice.clientId, ...tenantFilter(req) });
    toStateCode = client?.stateCode || org.stateCode;
  } else {
    toStateCode = invoice.billTo?.stateCode || org.stateCode;
  }

  // Default to reversing the whole invoice; a partial credit supplies its own
  // lines (e.g. two of five units returned).
  const items = Array.isArray(req.body.items) && req.body.items.length
    ? req.body.items
    : invoice.items.map(item => ({
      desc: item.desc, hsn: item.hsn, qty: item.qty, rate: item.rate,
      gstRate: item.gstRate, cessRate: item.cessRate,
      discountPercent: item.discountPercent, taxInclusive: item.taxInclusive
    }));

  const discountPercent = req.body.discountPercent !== undefined
    ? req.body.discountPercent
    : invoice.discountPercent;

  const totals = calculateInvoiceTotals(items, org.stateCode, toStateCode, {
    discountPercent,
    roundOff: org.brandingConfig?.roundOffTotal !== false
  });

  const alreadyCredited = await creditedAmount(invoice._id);
  const invoiceTotal = roundMoney(invoice.totals?.total || 0);
  const creditable = roundMoney(invoiceTotal - alreadyCredited);

  if (creditable <= 0) {
    throw httpError(
      409,
      `Invoice ${invoice.invoiceNumber} has already been fully credited.`,
      'ALREADY_CREDITED'
    );
  }
  if (totals.total > creditable) {
    throw httpError(
      400,
      `This credit note is for ${totals.total.toFixed(2)}, which exceeds the ${creditable.toFixed(2)} still creditable on invoice ${invoice.invoiceNumber}` +
        (alreadyCredited > 0 ? ` (${alreadyCredited.toFixed(2)} already credited).` : '.'),
      'CREDIT_EXCEEDS_INVOICE'
    );
  }

  const note = await CreditNote.create({
    orgId: req.orgId,
    creditNoteNumber: await nextCreditNoteNumber(req.orgId),
    invoiceId: invoice._id,
    // Snapshotted so the credit note reads completely on its own.
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: invoice.date,
    clientId: invoice.clientId || undefined,
    billTo: invoice.clientId ? undefined : invoice.billTo,
    date: req.body.date || new Date(),
    reason: req.body.reason || 'sales-return',
    reasonNote: req.body.reasonNote,
    items,
    discountPercent,
    totals,
    status: 'issued',
    notes: req.body.notes
  });

  // The invoice now owes less, so its balance and status have to be recomputed.
  await recalculateSettlement(invoice);

  logAudit({
    req,
    action: 'creditNote.created',
    entity: 'creditNote',
    entityId: note._id,
    meta: { creditNoteNumber: note.creditNoteNumber, invoiceNumber: invoice.invoiceNumber, total: totals.total, reason: note.reason }
  });

  res.status(201).json({ creditNote: note, invoice });
});

/**
 * How much of an invoice can still be credited, and what has been so far.
 * Powers the create form, so the user sees the ceiling before they submit.
 */
const creditSummary = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOne({ _id: req.params.invoiceId, ...tenantFilter(req) });
  if (!invoice) throw httpError(404, 'Invoice not found');
  const credited = await creditedAmount(invoice._id);
  const invoiceTotal = roundMoney(invoice.totals?.total || 0);
  const notes = await CreditNote.find({ invoiceId: invoice._id, ...tenantFilter(req) }).sort({ date: -1 }).lean();
  res.json({
    invoiceNumber: invoice.invoiceNumber,
    invoiceTotal,
    credited,
    creditable: roundMoney(Math.max(0, invoiceTotal - credited)),
    creditNotes: notes
  });
});

const exportCreditNotesCsv = asyncHandler(async (req, res) => {
  const cursor = CreditNote.find(buildCreditNoteFilter(req))
    .populate('clientId', 'companyName gstin')
    .sort({ date: -1 })
    .cursor();
  const money = value => Number(value || 0).toFixed(2);
  await streamCsv(res, {
    filename: 'credit-notes.csv',
    cursor,
    columns: [
      { label: 'Credit Note Number', value: n => n.creditNoteNumber },
      { label: 'Date', value: n => n.date?.toISOString().slice(0, 10) },
      { label: 'Original Invoice', value: n => n.invoiceNumber },
      { label: 'Original Invoice Date', value: n => n.invoiceDate?.toISOString().slice(0, 10) || '' },
      { label: 'Client', value: n => n.clientId?.companyName || n.billTo?.name || '' },
      { label: 'GSTIN', value: n => n.clientId?.gstin || n.billTo?.gstin || '' },
      { label: 'Reason', value: n => n.reason },
      { label: 'Taxable Value', value: n => money(n.totals?.subtotal) },
      { label: 'CGST', value: n => money(n.totals?.cgst) },
      { label: 'SGST/UTGST', value: n => money(n.totals?.sgst) },
      { label: 'IGST', value: n => money(n.totals?.igst) },
      { label: 'Cess', value: n => money(n.totals?.cess) },
      { label: 'Total Credited', value: n => money(n.totals?.total) }
    ]
  });
});

module.exports = {
  listCreditNotes,
  getCreditNote,
  createCreditNote,
  creditSummary,
  exportCreditNotesCsv,
  creditedAmount
};
