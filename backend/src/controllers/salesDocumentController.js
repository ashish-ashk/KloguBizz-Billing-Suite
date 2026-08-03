const mongoose = require('mongoose');
const { Organisation } = require('../models/Organisation');
const { Invoice } = require('../models/Invoice');
const { SalesDocument, DOCUMENT_KINDS } = require('../models/SalesDocument');
const { asyncHandler } = require('../utils/asyncHandler');
const { httpError } = require('../utils/httpError');
const { tenantFilter } = require('../middleware/tenantMiddleware');
const { notDeleted, scopeFilter, deletionPatch, RESTORE_PATCH } = require('../utils/softDelete');
const { nextSalesDocumentNumber, nextInvoiceNumber } = require('../services/invoiceNumberService');
const { assertInvoiceQuota } = require('../services/planService');
const { logAudit } = require('../services/auditService');
const { recordEvent, EVENT } = require('../services/usageEventService');
const { streamCsv } = require('../services/csvService');
const { paginate, escapeRegex, parseSort } = require('../utils/pagination');
const { renderInvoicePdf } = require('../services/pdfService');
const { getPlatformDefaults } = require('../services/platformSettingsService');
const { totalsFor, normalizeBuyer } = require('./invoiceController');
const stock = require('../services/stockService');
const { logger } = require('../utils/logger');

/**
 * Quotations, proforma invoices and delivery challans (2.2 #11, #12, #13).
 *
 * One controller for all three, because the lifecycle is the same and the only
 * thing that differs is which fields are meaningful — see models/SalesDocument.js
 * for why they share a collection.
 *
 * The invariant this file exists to protect: **none of these is a tax invoice.**
 * They carry no settlement state, they never reach a GST return, and they move
 * no stock. The single point where they turn into something that does all three
 * is `convertToInvoice`, and everything about that function is written to make
 * it happen exactly once.
 */

/** The human label for each kind, used in messages and on the PDF. */
const KIND_LABELS = {
  quotation: 'Quotation',
  proforma: 'Proforma Invoice',
  'delivery-challan': 'Delivery Challan'
};

/** Statuses from which a document may still be edited. A converted document is
 *  locked because it produced a tax invoice, and the two disagreeing about what
 *  was agreed is the failure this prevents. */
const EDITABLE_STATUSES = ['draft', 'sent', 'accepted', 'rejected', 'expired'];

const SORTS = ['date', 'createdAt', 'documentNumber', 'validUntil'];

function assertKind(kind) {
  if (!DOCUMENT_KINDS.includes(kind)) {
    throw httpError(400, `kind must be one of: ${DOCUMENT_KINDS.join(', ')}`);
  }
  return kind;
}

/**
 * Whether a quotation has lapsed, computed from `validUntil` rather than read
 * from `status`.
 *
 * Same reasoning as overdue invoices (#43): the stored status only catches up
 * when the hourly sweep next runs, so a quotation that expired at midnight
 * would still read as live all morning. Deriving it means the answer is right
 * immediately, and the sweep exists only so the *stored* value eventually
 * agrees for anyone querying the database directly.
 */
function isExpired(doc) {
  if (doc.kind !== 'quotation') return false;
  if (!doc.validUntil) return false;
  if (['converted', 'accepted', 'rejected'].includes(doc.status)) return false;
  return new Date(doc.validUntil).getTime() < Date.now();
}

/** Adds the derived fields the client needs but the document does not store. */
function shape(doc) {
  const plain = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  const expired = isExpired(plain);
  return {
    ...plain,
    kindLabel: KIND_LABELS[plain.kind] || plain.kind,
    // The status a human should see. Stored status stays as-is so the sweep has
    // something to reconcile, and so "why does this say sent" has an answer.
    effectiveStatus: expired ? 'expired' : plain.status,
    isExpired: expired,
    isConverted: Boolean(plain.convertedToInvoiceId),
    isEditable: EDITABLE_STATUSES.includes(plain.status)
  };
}

function buildFilter(req) {
  const filter = scopeFilter(req);
  if (req.query.kind) filter.kind = assertKind(req.query.kind);
  if (req.query.status) filter.status = req.query.status;
  if (req.query.clientId) filter.clientId = req.query.clientId;
  // "Which challans still need invoicing", "which quotations never converted".
  if (req.query.converted === 'false') filter.convertedToInvoiceId = null;
  if (req.query.converted === 'true') filter.convertedToInvoiceId = { $ne: null };
  if (req.query.from || req.query.to) {
    filter.date = {};
    if (req.query.from) filter.date.$gte = new Date(req.query.from);
    if (req.query.to) filter.date.$lte = new Date(req.query.to);
  }
  if (req.query.q) {
    const term = escapeRegex(String(req.query.q).trim());
    if (term) {
      filter.$or = [
        { documentNumber: { $regex: term, $options: 'i' } },
        { 'billTo.name': { $regex: term, $options: 'i' } },
        { convertedToInvoiceNumber: { $regex: term, $options: 'i' } }
      ];
    }
  }
  return filter;
}

const listSalesDocuments = asyncHandler(async (req, res) => {
  const page = await paginate(SalesDocument, buildFilter(req), req.query, query => query
    .populate('clientId', 'companyName gstin stateCode')
    .sort(parseSort(req.query, SORTS, { date: -1, createdAt: -1 })));
  res.json({ ...page, data: page.data.map(shape) });
});

const getSalesDocument = asyncHandler(async (req, res) => {
  const doc = await SalesDocument.findOne({ _id: req.params.id, ...notDeleted(req) }).populate('clientId');
  if (!doc) throw httpError(404, 'Document not found');
  res.json(shape(doc));
});

/**
 * Creates a quotation, proforma or challan.
 *
 * Deliberately does **not** consume the invoice quota. A quotation is an offer
 * that may never become a sale, and charging a tenant's monthly invoice
 * allowance for one would make the feature something to avoid using. The quota
 * is consumed at conversion, which is where an invoice actually appears.
 */
const createSalesDocument = asyncHandler(async (req, res) => {
  const kind = assertKind(req.body.kind);
  const body = normalizeBuyer(req.body);
  // Server-generated from the org's atomic counter, exactly like an invoice
  // number — a client-supplied value would desync the counter.
  delete body.documentNumber;

  if (!Array.isArray(body.items) || !body.items.length) {
    throw httpError(400, 'At least one line item is required');
  }

  // Priced by the same engine as an invoice, through the same helper. A
  // quotation that quotes CGST+SGST for a supply the invoice will charge IGST
  // on is worse than not quoting tax at all.
  const totals = await totalsFor(req, body);

  const doc = await SalesDocument.create({
    ...body,
    kind,
    orgId: req.orgId,
    documentNumber: await nextSalesDocumentNumber(req.orgId, kind),
    totals,
    // Only a quotation expires; see the model.
    validUntil: kind === 'quotation' ? body.validUntil || null : null,
    challanPurpose: kind === 'delivery-challan' ? body.challanPurpose : undefined,
    transport: kind === 'delivery-challan' ? body.transport || null : null,
    status: body.status === 'sent' ? 'sent' : 'draft'
  });

  logAudit({
    req,
    action: `${kind}.created`,
    entity: 'salesDocument',
    entityId: doc._id,
    meta: { documentNumber: doc.documentNumber, kind, total: doc.totals?.total }
  });
  recordEvent({ req, type: EVENT.salesDocumentCreated, meta: { kind } });
  res.status(201).json(shape(doc));
});

const updateSalesDocument = asyncHandler(async (req, res) => {
  const doc = await SalesDocument.findOne({ _id: req.params.id, ...notDeleted(req) });
  if (!doc) throw httpError(404, 'Document not found');

  if (!EDITABLE_STATUSES.includes(doc.status)) {
    throw httpError(
      409,
      `${KIND_LABELS[doc.kind]} ${doc.documentNumber} has been converted to invoice ${doc.convertedToInvoiceNumber} and can no longer be edited.`,
      'DOCUMENT_CONVERTED'
    );
  }

  const body = normalizeBuyer(req.body);
  // Neither the number nor the kind is mutable: the number came from a
  // per-kind counter, so changing the kind would leave a `QT-` number on a
  // challan and a gap in the quotation series.
  delete body.documentNumber;
  delete body.kind;
  delete body.convertedToInvoiceId;
  delete body.convertedToInvoiceNumber;
  delete body.convertedAt;

  Object.assign(doc, body);
  if (doc.kind !== 'quotation') doc.validUntil = null;
  // Re-priced on every edit rather than trusting a client-sent total, the same
  // rule the invoice editor follows.
  doc.totals = await totalsFor(req, doc.toObject());
  await doc.save();

  logAudit({
    req,
    action: `${doc.kind}.updated`,
    entity: 'salesDocument',
    entityId: doc._id,
    meta: { documentNumber: doc.documentNumber, fields: Object.keys(body) }
  });
  res.json(shape(doc));
});

/**
 * Moves a document through its lifecycle.
 *
 * `converted` is not settable here — it is the outcome of `convertToInvoice`
 * and nothing else, or the link between the two documents could be faked.
 */
const SETTABLE_STATUSES = ['draft', 'sent', 'accepted', 'rejected', 'expired'];

const setSalesDocumentStatus = asyncHandler(async (req, res) => {
  const status = String(req.body?.status || '');
  if (!SETTABLE_STATUSES.includes(status)) {
    throw httpError(400, `status must be one of: ${SETTABLE_STATUSES.join(', ')}`);
  }

  const doc = await SalesDocument.findOne({ _id: req.params.id, ...notDeleted(req) });
  if (!doc) throw httpError(404, 'Document not found');
  if (doc.status === 'converted') {
    throw httpError(409, 'This document has already been converted to an invoice.', 'DOCUMENT_CONVERTED');
  }

  const previous = doc.status;
  doc.status = status;
  await doc.save();
  logAudit({
    req,
    action: `${doc.kind}.status_changed`,
    entity: 'salesDocument',
    entityId: doc._id,
    meta: { documentNumber: doc.documentNumber, from: previous, to: status }
  });
  res.json(shape(doc));
});

/**
 * Turns a quotation, proforma or challan into a real tax invoice.
 *
 * This is the only function here that creates something with legal and
 * financial consequence, so it is written around three failure modes:
 *
 *  1. **Converting twice.** Two clicks, or two operators, would otherwise
 *     produce two invoices for one order — and both would be real tax documents
 *     that cannot simply be deleted. The document is *claimed* with a
 *     conditional update (`status: { $ne: 'converted' }`) before any invoice is
 *     created, so the second caller loses the race and gets a 409 rather than a
 *     duplicate.
 *  2. **Bypassing the invoice quota.** `createInvoice` calls
 *     `assertInvoiceQuota`; a conversion path that did not would be a way to
 *     issue unlimited invoices on a capped plan. This is exactly the hole
 *     Duplicate had (#17).
 *  3. **A crash between claiming and creating.** The claim is reverted if
 *     invoice creation fails, so the document does not end up marked converted
 *     with no invoice to point at. A transaction would be cleaner, but this
 *     deployment cannot rely on one (see utils/transaction.js) and the
 *     compensating update is both testable and idempotent.
 *
 * Totals are **recomputed** rather than copied. The document may be weeks old:
 * the buyer's state, the org's own state, or the round-off preference may have
 * changed, and the invoice has to be correct as a tax document today rather
 * than a faithful copy of an old quote. The agreed *prices* are preserved
 * exactly — it is only the tax derivation that is re-run.
 */
const convertToInvoice = asyncHandler(async (req, res) => {
  const existing = await SalesDocument.findOne({ _id: req.params.id, ...notDeleted(req) });
  if (!existing) throw httpError(404, 'Document not found');
  if (existing.status === 'converted') {
    throw httpError(
      409,
      `${KIND_LABELS[existing.kind]} ${existing.documentNumber} has already been converted to invoice ${existing.convertedToInvoiceNumber}.`,
      'ALREADY_CONVERTED'
    );
  }
  if (existing.kind === 'quotation' && existing.status === 'rejected') {
    throw httpError(
      409,
      `${existing.documentNumber} was rejected by the customer. Reopen it before invoicing.`,
      'DOCUMENT_REJECTED'
    );
  }

  // Checked before the claim, so a tenant at their limit does not have a
  // document left in a claimed state by a request that was always going to fail.
  await assertInvoiceQuota(req.orgId);

  // Atomically claim. Whoever wins this update owns the conversion.
  const claimed = await SalesDocument.findOneAndUpdate(
    { _id: existing._id, ...tenantFilter(req), status: { $ne: 'converted' }, deletedAt: null },
    { $set: { status: 'converted', convertedAt: new Date() } },
    { new: true }
  );
  if (!claimed) {
    throw httpError(409, 'This document was converted by another request just now.', 'ALREADY_CONVERTED');
  }

  try {
    const body = {
      clientId: claimed.clientId || undefined,
      billTo: claimed.clientId ? undefined : claimed.billTo,
      // The agreed lines, carried over verbatim.
      items: claimed.items.map(item => ({
        desc: item.desc, hsn: item.hsn, qty: item.qty, rate: item.rate,
        gstRate: item.gstRate, cessRate: item.cessRate,
        discountPercent: item.discountPercent, taxInclusive: item.taxInclusive
      })),
      discountPercent: claimed.discountPercent,
      placeOfSupply: claimed.placeOfSupply,
      taxTreatment: claimed.taxTreatment,
      supplyType: claimed.supplyType,
      reverseCharge: claimed.reverseCharge
    };

    const totals = await totalsFor(req, body);
    const date = req.body?.date ? new Date(req.body.date) : new Date();
    const dueDate = req.body?.dueDate
      ? new Date(req.body.dueDate)
      : new Date(date.getTime() + 15 * 86400000);

    const invoice = await Invoice.create({
      ...body,
      orgId: req.orgId,
      invoiceNumber: await nextInvoiceNumber(req.orgId),
      date,
      dueDate,
      // Issued, not draft: a conversion is a deliberate act of raising the
      // invoice, and leaving it as a draft would mean the quotation reads as
      // converted while nothing has actually been billed.
      status: 'pending',
      totals,
      amountPaid: 0,
      amountCredited: 0,
      balanceDue: totals.total,
      notes: claimed.notes,
      paymentTerms: claimed.paymentTerms,
      // The link back, so "what was this priced against" is answerable from the
      // invoice without searching.
      sourceDocument: {
        kind: claimed.kind,
        documentId: claimed._id,
        documentNumber: claimed.documentNumber
      }
    });

    claimed.convertedToInvoiceId = invoice._id;
    claimed.convertedToInvoiceNumber = invoice.invoiceNumber;
    await claimed.save();

    // Stock moves now, at the point ownership changes — not when the challan
    // was raised. See the model's note on why the challan deliberately moves
    // nothing itself.
    await stock.applyInvoice(req, invoice).catch(error => {
      // Consistent with the invoice path: a stock-ledger problem must not
      // invalidate a tax document that has already been issued.
      logger.error('stock movement failed after conversion', { invoiceId: String(invoice._id), err: error });
    });

    logAudit({
      req,
      action: `${claimed.kind}.converted`,
      entity: 'salesDocument',
      entityId: claimed._id,
      meta: {
        documentNumber: claimed.documentNumber,
        invoiceId: String(invoice._id),
        invoiceNumber: invoice.invoiceNumber,
        total: totals.total
      }
    });
    // Both events: the invoice genuinely was created (so invoice counts and the
    // adoption matrix stay right), and the conversion is its own signal.
    recordEvent({ req, type: EVENT.invoiceCreated, meta: { convertedFrom: claimed.kind } });
    recordEvent({ req, type: EVENT.salesDocumentConverted, meta: { kind: claimed.kind } });

    res.status(201).json({ document: shape(claimed), invoice });
  } catch (error) {
    // Release the claim so the conversion can be retried. Without this a failed
    // attempt would leave the document permanently locked as 'converted' with
    // nothing to show for it.
    await SalesDocument.updateOne(
      { _id: claimed._id, convertedToInvoiceId: null },
      { $set: { status: existing.status, convertedAt: null } }
    ).catch(() => {});
    throw error;
  }
});

/** Soft delete. A converted document is not deletable — it is the record of
 *  what a real invoice was agreed against. */
const deleteSalesDocument = asyncHandler(async (req, res) => {
  const doc = await SalesDocument.findOne({ _id: req.params.id, ...notDeleted(req) });
  if (!doc) throw httpError(404, 'Document not found');
  if (doc.status === 'converted') {
    throw httpError(
      409,
      `${KIND_LABELS[doc.kind]} ${doc.documentNumber} became invoice ${doc.convertedToInvoiceNumber} and cannot be deleted.`,
      'DOCUMENT_CONVERTED'
    );
  }
  Object.assign(doc, deletionPatch(req));
  await doc.save();
  logAudit({ req, action: `${doc.kind}.deleted`, entity: 'salesDocument', entityId: doc._id, meta: { documentNumber: doc.documentNumber } });
  res.json(shape(doc));
});

const restoreSalesDocument = asyncHandler(async (req, res) => {
  const doc = await SalesDocument.findOneAndUpdate(
    { _id: req.params.id, ...tenantFilter(req), deletedAt: { $ne: null } },
    { $set: RESTORE_PATCH },
    { new: true }
  );
  if (!doc) throw httpError(404, 'Document not found in the recycle bin');
  logAudit({ req, action: `${doc.kind}.restored`, entity: 'salesDocument', entityId: doc._id, meta: { documentNumber: doc.documentNumber } });
  res.json(shape(doc));
});

/**
 * The PDF, rendered by the same engine as an invoice.
 *
 * `invoiceTitleLabel` is overridden per kind, which is not cosmetic: printing
 * "Tax Invoice" on a proforma or a challan would be a misdeclaration, and it is
 * the one thing about these documents that must never be got wrong.
 */
const salesDocumentPdf = asyncHandler(async (req, res) => {
  const doc = await SalesDocument.findOne({ _id: req.params.id, ...notDeleted(req) }).populate('clientId');
  if (!doc) throw httpError(404, 'Document not found');

  const org = await Organisation.findById(req.orgId).lean();
  const platformDefaults = await getPlatformDefaults();

  const buffer = await renderInvoicePdf({
    // Shaped to look like an invoice to the renderer, which is document-agnostic.
    invoice: {
      ...doc.toObject(),
      invoiceNumber: doc.documentNumber,
      dueDate: doc.validUntil || doc.date
    },
    client: doc.clientId || null,
    org: {
      ...org,
      brandingConfig: {
        ...(org.brandingConfig || {}),
        invoiceTitleLabel: KIND_LABELS[doc.kind]
      }
    },
    platformDefaults
  });

  recordEvent({ req, type: EVENT.pdfDownloaded, meta: { kind: doc.kind } });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${doc.documentNumber}.pdf"`);
  res.send(buffer);
});

/**
 * Pipeline figures per kind.
 *
 * The question a quotation list exists to answer is "how much is in play and
 * how much do we win", which no other screen can answer. Every figure is `null`
 * rather than `0` when there is nothing to divide by — a 0% win rate reads as
 * "we lose everything" rather than "we have not quoted yet", the same rule the
 * receivables metrics follow.
 */
const salesDocumentSummary = asyncHandler(async (req, res) => {
  const kind = req.query.kind ? assertKind(req.query.kind) : 'quotation';
  const match = notDeleted(req, { kind });

  /**
   * **`tenantFilter` returns `orgId` as a string, and an aggregation `$match`
   * does not cast it.**
   *
   * Mongoose casts a string id for `find`/`countDocuments`, so the same filter
   * object works there — but inside a pipeline it is compared raw against an
   * ObjectId and matches nothing, silently. The failure mode is the dangerous
   * kind: an empty pipeline result reads as "this tenant has no quotations",
   * which is a wrong answer that looks like a correct one.
   *
   * This is the **third** time this trap has appeared here (the ITC register in
   * Phase 5, `stockService.recomputeBalance` in Phase 6a). Cast explicitly for
   * every pipeline.
   */
  const aggregateMatch = { ...match, orgId: new mongoose.Types.ObjectId(String(req.orgId)) };

  const rows = await SalesDocument.aggregate([
    { $match: aggregateMatch },
    { $group: { _id: '$status', count: { $sum: 1 }, value: { $sum: '$totals.total' } } }
  ]);

  const byStatus = {};
  let total = 0;
  let totalValue = 0;
  for (const row of rows) {
    byStatus[row._id] = { count: row.count, value: Math.round(row.value || 0) };
    total += row.count;
    totalValue += row.value || 0;
  }

  const converted = byStatus.converted?.count || 0;
  const rejected = byStatus.rejected?.count || 0;
  // Only decided documents count towards a win rate — a quotation still sitting
  // with the customer is not a loss yet, and counting it as one makes the figure
  // drop every time you quote.
  const decided = converted + rejected;

  // Open value is what is genuinely still in play: not decided, not lapsed.
  const openRows = await SalesDocument.aggregate([
    {
      $match: {
        ...aggregateMatch,
        status: { $in: ['draft', 'sent'] },
        $or: [{ validUntil: null }, { validUntil: { $gte: new Date() } }]
      }
    },
    { $group: { _id: null, count: { $sum: 1 }, value: { $sum: '$totals.total' } } }
  ]);

  res.json({
    kind,
    total,
    totalValue: Math.round(totalValue),
    byStatus,
    openCount: openRows[0]?.count || 0,
    openValue: Math.round(openRows[0]?.value || 0),
    conversionRate: decided ? Math.round((converted / decided) * 100) : null,
    // Challans that never became an invoice — goods that left and were never
    // billed, which is the whole reason to track challans at all.
    awaitingInvoice: kind === 'delivery-challan'
      ? await SalesDocument.countDocuments({ ...match, convertedToInvoiceId: null })
      : undefined
  });
});

const exportSalesDocumentsCsv = asyncHandler(async (req, res) => {
  const filter = buildFilter(req);
  const cursor = SalesDocument.find(filter)
    .populate('clientId', 'companyName')
    .sort({ date: -1 })
    .cursor();

  recordEvent({ req, type: EVENT.exportCsv, meta: { of: 'sales-documents' } });
  const money = value => Number(value || 0).toFixed(2);
  await streamCsv(res, {
    filename: `sales-documents-${new Date().toISOString().slice(0, 10)}.csv`,
    cursor,
    columns: [
      { label: 'Number', value: d => d.documentNumber },
      { label: 'Type', value: d => KIND_LABELS[d.kind] || d.kind },
      { label: 'Date', value: d => d.date?.toISOString().slice(0, 10) || '' },
      { label: 'Valid Until', value: d => d.validUntil?.toISOString().slice(0, 10) || '' },
      { label: 'Buyer', value: d => d.clientId?.companyName || d.billTo?.name || '' },
      // The derived status, not the stored one — otherwise a lapsed quotation
      // exports as 'sent' and the spreadsheet disagrees with the screen.
      { label: 'Status', value: d => (isExpired(d) ? 'expired' : d.status) },
      { label: 'Taxable Value', value: d => money(d.totals?.subtotal) },
      { label: 'CGST', value: d => money(d.totals?.cgst) },
      { label: 'SGST/UTGST', value: d => money(d.totals?.sgst) },
      { label: 'IGST', value: d => money(d.totals?.igst) },
      { label: 'Cess', value: d => money(d.totals?.cess) },
      { label: 'Total', value: d => money(d.totals?.total) },
      { label: 'Converted To Invoice', value: d => d.convertedToInvoiceNumber || '' }
    ]
  });
});

module.exports = {
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
  exportSalesDocumentsCsv,
  KIND_LABELS,
  isExpired
};
