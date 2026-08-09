const mongoose = require('mongoose');
const { Invoice } = require('../models/Invoice');
const { Client } = require('../models/Client');
const { Organisation } = require('../models/Organisation');
const { asyncHandler } = require('../utils/asyncHandler');
const { notDeleted } = require('../utils/softDelete');
const { resolveReturnPeriod } = require('../services/gstReturnService');
const { httpError } = require('../utils/httpError');
const { tenantFilter } = require('../middleware/tenantMiddleware');
const { toCsv } = require('../services/csvService');
const { buildGstr1, toGstnJson, buildGstr3b } = require('../services/gstReturnService');
const eInvoice = require('../services/eInvoiceService');
const ewb = require('../services/ewayBillService');
const gstr2b = require('../services/gstr2bService');
const { logAudit } = require('../services/auditService');
const { recordEvent, EVENT } = require('../services/usageEventService');

/**
 * GST returns and e-invoicing.
 *
 * The reporting the product was named for and did not have: the existing GST report is
 * a month × rate summary, which is useful for a glance and cannot be filed. These
 * endpoints produce the actual section-wise return, and the e-invoice endpoints produce
 * (and validate) the payload the IRP consumes.
 */

const gstr1 = asyncHandler(async (req, res) => {
  const orgId = new mongoose.Types.ObjectId(String(req.orgId));
  const report = await buildGstr1(orgId, req.query);
  recordEvent({ req, type: EVENT.gstReturnViewed, meta: { return: 'GSTR-1', period: report.period.fp } });
  res.json(report);
});

/**
 * The GSTN offline-utility JSON.
 *
 * Downloaded rather than returned inline, and with the return period in the filename,
 * because the utility takes one file per period and a browser tab full of JSON is not
 * a deliverable.
 */
const gstr1Json = asyncHandler(async (req, res) => {
  const orgId = new mongoose.Types.ObjectId(String(req.orgId));
  const report = await buildGstr1(orgId, req.query);
  if (!report.supplier.gstin) {
    // The file is keyed by the filer's GSTIN. Producing one without it would create a
    // download that fails validation at upload time for a reason the user cannot see.
    throw httpError(
      400,
      'Your GSTIN is not set, and a GSTR-1 file is filed against it. Add it under your organisation profile first.',
      'GSTIN_REQUIRED'
    );
  }
  logAudit({ req, action: 'gst.gstr1_exported', entity: 'return', entityId: report.period.fp, meta: { invoices: report.summary.invoiceCount } });
  recordEvent({ req, type: EVENT.exportCsv, meta: { of: 'gstr1-json' } });
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="GSTR1-${report.supplier.gstin}-${report.period.fp}.json"`);
  res.send(JSON.stringify(toGstnJson(report), null, 2));
});

/**
 * The same return as CSV, section by section in one file.
 *
 * Not a substitute for the JSON — it cannot be uploaded — but it is what gets emailed
 * to an accountant, and every section in one file keeps the connection between them
 * that separate downloads lose.
 */
const gstr1Csv = asyncHandler(async (req, res) => {
  const orgId = new mongoose.Types.ObjectId(String(req.orgId));
  const report = await buildGstr1(orgId, req.query);
  const { sections } = report;

  const rateColumns = [
    { label: 'Rate %', value: r => r.rt },
    { label: 'Taxable Value', value: r => Number(r.txval).toFixed(2) },
    { label: 'IGST', value: r => Number(r.iamt).toFixed(2) },
    { label: 'CGST', value: r => Number(r.camt).toFixed(2) },
    { label: 'SGST/UTGST', value: r => Number(r.samt).toFixed(2) },
    { label: 'Cess', value: r => Number(r.csamt).toFixed(2) }
  ];

  // Flattened: each section's rows are one line per rate within one document, which is
  // how the return itself is structured.
  const flatten = (rows, extra) => rows.flatMap(row => (row.itms || []).map(item => ({ ...extra(row), ...item })));

  const b2bRows = sections.b2b.flatMap(party =>
    flatten(party.inv, inv => ({
      gstin: party.ctin, name: party.cfs, number: inv.inum, date: inv.idt,
      value: inv.val, pos: inv.pos, reverseCharge: inv.rchrg, type: inv.inv_typ, irn: inv.irn || ''
    })));

  const b2clRows = sections.b2cl.flatMap(group =>
    flatten(group.inv, inv => ({ pos: group.pos, number: inv.inum, date: inv.idt, value: inv.val })));

  const cdnrRows = sections.cdnr.flatMap(party =>
    flatten(party.nt, note => ({
      gstin: party.ctin, name: party.cfs, creditNote: note.nt_num, creditNoteDate: note.nt_dt,
      againstInvoice: note.inum, invoiceDate: note.idt, value: note.val, pos: note.pos
    })));

  const expRows = sections.exp.flatMap(group =>
    flatten(group.inv, inv => ({
      exportType: group.exp_typ, number: inv.inum, date: inv.idt, value: inv.val,
      shippingBill: inv.sbnum, shippingBillDate: inv.sbdt, port: inv.sbpcode
    })));

  const csv = [
    `GSTR-1,${report.supplier.gstin},${report.period.label},period ${report.period.fp}`,
    '',
    'B2B — registered buyers',
    toCsv(b2bRows, [
      { label: 'Buyer GSTIN', value: r => r.gstin },
      { label: 'Buyer', value: r => r.name },
      { label: 'Invoice', value: r => r.number },
      { label: 'Date', value: r => r.date },
      { label: 'Invoice Value', value: r => Number(r.value).toFixed(2) },
      { label: 'Place of Supply', value: r => r.pos },
      { label: 'Reverse Charge', value: r => r.reverseCharge },
      { label: 'Invoice Type', value: r => r.type },
      { label: 'IRN', value: r => r.irn },
      ...rateColumns
    ]),
    '',
    `B2CL — unregistered, inter-state, above ₹${report.summary.b2clThreshold.toLocaleString('en-IN')}`,
    toCsv(b2clRows, [
      { label: 'Place of Supply', value: r => r.pos },
      { label: 'Invoice', value: r => r.number },
      { label: 'Date', value: r => r.date },
      { label: 'Invoice Value', value: r => Number(r.value).toFixed(2) },
      ...rateColumns
    ]),
    '',
    'B2CS — unregistered, aggregated',
    toCsv(sections.b2cs, [
      { label: 'Supply Type', value: r => r.sply_ty },
      { label: 'Place of Supply', value: r => r.pos },
      ...rateColumns
    ]),
    '',
    'CDNR — credit notes to registered buyers',
    toCsv(cdnrRows, [
      { label: 'Buyer GSTIN', value: r => r.gstin },
      { label: 'Buyer', value: r => r.name },
      { label: 'Credit Note', value: r => r.creditNote },
      { label: 'Credit Note Date', value: r => r.creditNoteDate },
      { label: 'Against Invoice', value: r => r.againstInvoice },
      { label: 'Invoice Date', value: r => r.invoiceDate },
      { label: 'Value', value: r => Number(r.value).toFixed(2) },
      { label: 'Place of Supply', value: r => r.pos },
      ...rateColumns
    ]),
    '',
    'CDNUR — credit notes to unregistered buyers',
    toCsv(sections.cdnur, [
      { label: 'Type', value: r => r.typ },
      { label: 'Credit Note', value: r => r.nt_num },
      { label: 'Date', value: r => r.nt_dt },
      { label: 'Against Invoice', value: r => r.inum },
      { label: 'Value', value: r => Number(r.val).toFixed(2) },
      { label: 'Place of Supply', value: r => r.pos }
    ]),
    '',
    'EXP — exports',
    toCsv(expRows, [
      { label: 'Export Type', value: r => r.exportType },
      { label: 'Invoice', value: r => r.number },
      { label: 'Date', value: r => r.date },
      { label: 'Value', value: r => Number(r.value).toFixed(2) },
      { label: 'Shipping Bill', value: r => r.shippingBill },
      { label: 'Shipping Bill Date', value: r => r.shippingBillDate },
      { label: 'Port', value: r => r.port },
      ...rateColumns
    ]),
    '',
    'HSN SUMMARY',
    toCsv(sections.hsn, [
      { label: 'HSN/SAC', value: r => r.hsn_sc },
      { label: 'Description', value: r => r.desc || '' },
      { label: 'UQC', value: r => r.uqc },
      { label: 'Quantity', value: r => r.qty },
      { label: 'Taxable Value', value: r => Number(r.txval).toFixed(2) },
      { label: 'IGST', value: r => Number(r.iamt).toFixed(2) },
      { label: 'CGST', value: r => Number(r.camt).toFixed(2) },
      { label: 'SGST/UTGST', value: r => Number(r.samt).toFixed(2) },
      { label: 'Cess', value: r => Number(r.csamt).toFixed(2) }
    ]),
    '',
    'NIL-RATED / EXEMPT / NON-GST',
    toCsv([sections.nil], [
      { label: 'Exempt', value: r => Number(r.exempt).toFixed(2) },
      { label: 'Nil-rated', value: r => Number(r.nilRated).toFixed(2) },
      { label: 'Non-GST', value: r => Number(r.nonGst).toFixed(2) }
    ]),
    '',
    'DOCUMENTS ISSUED',
    toCsv(sections.docIssued, [
      { label: 'Series', value: r => r.prefix },
      { label: 'From', value: r => r.from },
      { label: 'To', value: r => r.to },
      { label: 'Total', value: r => r.totnum },
      { label: 'Cancelled', value: r => r.cancel },
      { label: 'Net Issued', value: r => r.net_issue }
    ])
  ].join('\r\n');

  recordEvent({ req, type: EVENT.exportCsv, meta: { of: 'gstr1-csv' } });
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="GSTR1-${report.period.fp}.csv"`);
  res.send(csv);
});

const gstr3b = asyncHandler(async (req, res) => {
  const orgId = new mongoose.Types.ObjectId(String(req.orgId));
  const report = await buildGstr3b(orgId, req.query);
  recordEvent({ req, type: EVENT.gstReturnViewed, meta: { return: 'GSTR-3B', period: report.period.fp } });
  res.json(report);
});

// ── E-invoicing ──────────────────────────────────

async function loadInvoiceContext(req) {
  const invoice = await Invoice.findOne({ _id: req.params.id, ...tenantFilter(req) });
  if (!invoice) throw httpError(404, 'Invoice not found');
  const org = await Organisation.findById(req.orgId).lean();
  const client = invoice.clientId ? await Client.findById(invoice.clientId).lean() : null;
  return { invoice, org, client };
}

/**
 * Pre-flight check.
 *
 * Separate from generation on purpose: the useful thing this can do without an IRP
 * connection is tell a tenant, up front, which of their invoices *would* be rejected
 * and why. Missing HSN codes and an invalid buyer GSTIN are the overwhelming majority
 * of real failures, and both are visible from here.
 */
const checkEInvoice = asyncHandler(async (req, res) => {
  const { invoice, org, client } = await loadInvoiceContext(req);
  const eligibility = eInvoice.assessEligibility({
    invoice,
    buyerGstin: client?.gstin || invoice.billTo?.gstin,
    org
  });
  const validation = eligibility.required
    ? eInvoice.validateForIrp({ invoice, org, client })
    : { valid: false, problems: [] };

  res.json({
    invoiceNumber: invoice.invoiceNumber,
    eligibility,
    valid: validation.valid,
    problems: validation.problems,
    providerConfigured: eInvoice.isIrpConfigured(),
    current: invoice.eInvoice || null,
    // The built payload is returned when everything checks out, so a tenant with no
    // IRP integration can still upload it to the government portal by hand rather than
    // retyping the invoice into a web form.
    payload: validation.valid ? eInvoice.buildIrpPayload({ invoice, org, client }) : null
  });
});

/**
 * Reports an invoice to the IRP.
 *
 * Fails closed and loudly when no provider is configured — with the validated payload
 * attached, because "ready to file, nowhere to file it" is a genuinely different
 * situation from "not ready", and only one of them is the tenant's problem to fix.
 */
const generateEInvoice = asyncHandler(async (req, res) => {
  const { invoice, org, client } = await loadInvoiceContext(req);

  try {
    const result = await eInvoice.generateIrn({ invoice, org, client });
    invoice.eInvoice = {
      status: 'generated',
      irn: result.Irn,
      ackNo: result.AckNo,
      ackDate: result.AckDt ? new Date(result.AckDt) : new Date(),
      signedQrCode: result.SignedQRCode,
      signedInvoice: result.SignedInvoice,
      generatedAt: new Date(),
      attempts: (invoice.eInvoice?.attempts || 0) + 1
    };
    await invoice.save();
    logAudit({ req, action: 'einvoice.generated', entity: 'invoice', entityId: invoice._id, meta: { irn: result.Irn } });
    recordEvent({ req, type: EVENT.eInvoiceGenerated, meta: { invoiceNumber: invoice.invoiceNumber } });
    return res.json({ ok: true, eInvoice: invoice.eInvoice });
  } catch (error) {
    // A failed attempt is recorded on the document, so the worklist can show what
    // needs fixing instead of the tenant rediscovering it invoice by invoice.
    invoice.eInvoice = {
      ...(invoice.eInvoice?.toObject ? invoice.eInvoice.toObject() : invoice.eInvoice),
      status: error.code === 'IRP_NOT_CONFIGURED' ? 'pending' : 'failed',
      errorCode: error.code,
      error: error.message,
      attempts: (invoice.eInvoice?.attempts || 0) + 1
    };
    await invoice.save();
    logAudit({ req, action: 'einvoice.failed', entity: 'invoice', entityId: invoice._id, meta: { code: error.code } });

    if (error.code === 'IRP_NOT_CONFIGURED') {
      return res.status(501).json({
        ok: false,
        code: error.code,
        message: error.message,
        // Validated and ready — the only missing piece is the connection.
        payload: error.payload || null
      });
    }
    throw error;
  }
});

/** Cancels an IRN inside the 24-hour window, or explains why it cannot be. */
const cancelEInvoice = asyncHandler(async (req, _res) => {
  const { invoice } = await loadInvoiceContext(req);
  const check = eInvoice.canCancelIrn(invoice.eInvoice);
  if (!check.allowed) throw httpError(409, check.reason, 'IRN_NOT_CANCELLABLE');
  if (!eInvoice.isIrpConfigured()) {
    throw httpError(501, 'No e-invoice provider is configured, so the IRN cannot be cancelled here.', 'IRP_NOT_CONFIGURED');
  }
  // The provider call itself is the same documented seam as generation.
  throw httpError(501, 'IRN cancellation requires the provider adapter — see services/eInvoiceService.js.', 'IRP_NOT_CONFIGURED');
});

/**
 * The e-invoicing worklist: everything that should have an IRN and does not.
 *
 * The screen that makes the feature usable. Without it, compliance means opening
 * invoices one at a time to find out which are outstanding.
 */
const eInvoiceWorklist = asyncHandler(async (req, res) => {
  const org = await Organisation.findById(req.orgId).select('eInvoicing gstin').lean();
  const filter = {
    ...tenantFilter(req),
    deletedAt: null,
    status: { $nin: ['draft', 'cancelled'] },
    $or: [
      { 'eInvoice.status': { $in: ['pending', 'failed'] } },
      { 'eInvoice.status': { $exists: false } },
      { 'eInvoice.status': 'not-required' }
    ]
  };
  if (req.query.from) filter.date = { $gte: new Date(req.query.from) };

  const invoices = await Invoice.find(filter)
    .select('invoiceNumber date status totals.total clientId billTo supplyType eInvoice placeOfSupply')
    .populate('clientId', 'companyName gstin')
    .sort({ date: -1 })
    .limit(100)
    .lean();

  // Only documents that actually need one are listed: a B2C sale with no IRN is not an
  // outstanding task, and listing it would make the worklist permanently non-empty.
  const rows = invoices.filter(invoice => {
    const buyerGstin = invoice.clientId?.gstin || invoice.billTo?.gstin;
    return eInvoice.assessEligibility({ invoice, buyerGstin, org }).required;
  });

  res.json({
    enabled: org?.eInvoicing?.enabled === true,
    providerConfigured: eInvoice.isIrpConfigured(),
    outstanding: rows.length,
    invoices: rows
  });
});

// ── E-way bills (2.1 #6) ─────────────────────────

/**
 * Whether this invoice needs an e-way bill, and what is missing if it does.
 *
 * A check rather than a generate, because the whole value here is *before* the
 * lorry leaves: a missing HSN or a mistyped vehicle number found at a checkpoint
 * is a detained vehicle, and found on this screen is thirty seconds.
 */
const checkEwayBill = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOne({ _id: req.params.id, ...notDeleted(req) }).lean();
  if (!invoice) throw httpError(404, 'Invoice not found');
  const org = await Organisation.findById(req.orgId).lean();
  const client = invoice.clientId ? await Client.findById(invoice.clientId).lean() : null;

  const requirement = ewb.assessRequirement({ invoice, org });
  const validation = requirement.required
    ? ewb.validateForEwb({ invoice, org, client, transport: req.query })
    : { ok: true, errors: [] };

  res.json({
    ...requirement,
    ready: validation.ok,
    blockers: validation.errors,
    configured: ewb.isEwbConfigured(),
    // Shown even before a distance is entered, so the user can see how the
    // validity window will be worked out rather than discovering it after.
    validityRule: 'One day per 200 km (one per 20 km for over-dimensional cargo), minimum one day.'
  });
});

const generateEwayBill = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOne({ _id: req.params.id, ...notDeleted(req) }).lean();
  if (!invoice) throw httpError(404, 'Invoice not found');
  const org = await Organisation.findById(req.orgId).lean();
  const client = invoice.clientId ? await Client.findById(invoice.clientId).lean() : null;

  const result = await ewb.generateEwayBill({ invoice, org, client, transport: req.body });
  logAudit({ req, action: 'ewaybill.generated', entity: 'invoice', entityId: invoice._id });
  res.json(result);
});

/** The payload, without submitting it — for checking a mapping against the portal. */
const previewEwayBill = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOne({ _id: req.params.id, ...notDeleted(req) }).lean();
  if (!invoice) throw httpError(404, 'Invoice not found');
  const org = await Organisation.findById(req.orgId).lean();
  const client = invoice.clientId ? await Client.findById(invoice.clientId).lean() : null;

  const transport = req.body || {};
  res.json({
    payload: ewb.buildEwbPayload({ invoice, org, client, transport }),
    validityDays: ewb.validityDays(transport.distanceKm, { overDimensional: transport.overDimensional })
  });
});

// ── GSTR-2B reconciliation (2.1 #7) ──────────────

/**
 * Reconciles recorded purchases against a GSTR-2B download.
 *
 * Takes the portal's own JSON in the request body. No GSP connection is needed
 * or wanted: 2B is downloadable by anyone with the GST login, which every
 * registered business has.
 */
const reconcileGstr2b = asyncHandler(async (req, res) => {
  const period = resolveReturnPeriod(req.query);
  const document = req.body?.gstr2b || req.body;

  const rows = gstr2b.parseGstr2b(document);
  if (!rows.length) {
    throw httpError(
      400,
      'No supplier invoices were found in that file. Upload the GSTR-2B JSON downloaded from the GST portal.',
      'GSTR2B_EMPTY'
    );
  }

  const report = await gstr2b.reconcile(req.orgId, rows, { from: period.from, to: period.to });
  recordEvent({ req, type: EVENT.reportViewed, meta: { report: 'gstr2b-reconciliation' } });
  res.json({ ...report, period: { ...report.period, label: period.label } });
});

module.exports = {
  checkEwayBill, generateEwayBill, previewEwayBill, reconcileGstr2b,
  gstr1, gstr1Json, gstr1Csv, gstr3b,
  checkEInvoice, generateEInvoice, cancelEInvoice, eInvoiceWorklist
};
