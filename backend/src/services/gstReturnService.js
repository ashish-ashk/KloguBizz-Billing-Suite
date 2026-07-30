const { Invoice } = require('../models/Invoice');
const { CreditNote } = require('../models/CreditNote');
const { Purchase } = require('../models/Purchase');
const { Client } = require('../models/Client');
const { Organisation } = require('../models/Organisation');
const { roundMoney, calculateLine } = require('../services/gstService');

/**
 * GSTR-1 and GSTR-3B.
 *
 * What existed before was a month × rate summary that did not group by HSN and had
 * no notion of the *sections* a return is made of. That distinction is the whole
 * difficulty: filing is not "here is my total tax", it is placing every document in
 * exactly one table according to who the buyer was, where the supply happened, how
 * large it was, and how it was taxed. Two invoices with identical totals belong in
 * different tables if one buyer is registered and the other is not.
 *
 * The tables built here, and the rule that decides each:
 *
 *   B2B     buyer has a GSTIN (including SEZ and deemed exports, flagged via `inv_typ`)
 *   B2CL    no GSTIN, inter-state, invoice value above the B2CL threshold
 *   B2CS    no GSTIN, everything else — aggregated by place of supply and rate,
 *           because the return does not want the individual documents
 *   CDNR    credit notes issued to a registered person
 *   CDNUR   credit notes issued to an unregistered person (B2CL/export cases)
 *   EXP     exports, split by with/without payment of IGST
 *   NIL     nil-rated, exempt and non-GST supplies
 *   HSN     the HSN/SAC summary, a required table
 *   DOC     the document series issued, with cancelled numbers accounted for
 *
 * Amounts are taken from the stored totals wherever possible — those are the numbers
 * printed on the customer's copy, and a return that disagrees with the customer's
 * copy is the discrepancy an audit exists to find. Per-line figures come from
 * `calculateLine`, the same function that priced the invoice.
 *
 * The JSON shape follows the GSTN offline utility's field names (`ctin`, `inum`,
 * `idt`, `val`, `pos`, `rt`, `txval`, `iamt`, `camt`, `samt`, `csamt`) so the file
 * can be uploaded rather than retyped. It is not a claim of certification: the
 * schema evolves, and the CSV/JSON here is a preparation aid whose figures a CA
 * should reconcile before filing.
 */

/**
 * The B2CL threshold: an inter-state supply to an unregistered person above this
 * value is reported invoice-by-invoice rather than in aggregate.
 *
 * ₹2,50,000 at the time of writing. Kept as a named constant because it has moved
 * before and will move again, and a magic number buried in a comparison is how a
 * return silently starts misclassifying every large B2C sale.
 */
const B2CL_THRESHOLD = Number(process.env.GST_B2CL_THRESHOLD ?? 250000);

/** GSTR-1 uses '96' as the place-of-supply code for a supply outside India. */
const OTHER_COUNTRY_POS = '96';

function normaliseStateCode(value) {
  if (value === undefined || value === null || value === '') return '';
  return String(value).trim().padStart(2, '0');
}

/** `MMYYYY`, the return period format the GSTN uses. */
function returnPeriod(date) {
  const d = new Date(date);
  return `${String(d.getMonth() + 1).padStart(2, '0')}${d.getFullYear()}`;
}

function isoDay(date) {
  return new Date(date).toISOString().slice(0, 10);
}

/** `DD-MM-YYYY`, the date format inside the GSTN JSON. */
function gstnDate(date) {
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
}

/**
 * Resolves a reporting period.
 *
 * GSTR-1 is filed monthly (or quarterly under QRMP), so unlike the FY-scoped
 * summary report this defaults to the **last complete month** — the one a person
 * sitting down to file is actually filing.
 */
function resolveReturnPeriod(query = {}) {
  if (query.from || query.to) {
    const from = query.from ? new Date(query.from) : new Date(0);
    const to = query.to ? new Date(query.to) : new Date();
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      const error = new Error('from and to must be valid dates (YYYY-MM-DD)');
      error.statusCode = 400;
      throw error;
    }
    to.setHours(23, 59, 59, 999);
    return { from, to, label: `${isoDay(from)} to ${isoDay(to)}`, fp: returnPeriod(from), granularity: 'custom' };
  }

  if (query.month) {
    const match = /^(\d{4})-(\d{2})$/.exec(String(query.month));
    if (!match) {
      const error = new Error('month must be YYYY-MM');
      error.statusCode = 400;
      throw error;
    }
    const year = Number(match[1]);
    const monthIndex = Number(match[2]) - 1;
    if (monthIndex < 0 || monthIndex > 11) {
      const error = new Error('month must be YYYY-MM with a month between 01 and 12');
      error.statusCode = 400;
      throw error;
    }
    const from = new Date(year, monthIndex, 1, 0, 0, 0, 0);
    const to = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
    return {
      from,
      to,
      label: from.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
      fp: returnPeriod(from),
      granularity: 'month'
    };
  }

  // Default: the previous calendar month, which is the one being filed.
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
  const to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  return {
    from,
    to,
    label: from.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
    fp: returnPeriod(from),
    granularity: 'month'
  };
}

/** The buyer's GSTIN and place of supply, from whichever of the two buyer shapes is set. */
function buyerOf(document, clientMap) {
  const client = document.clientId ? clientMap.get(String(document.clientId)) : null;
  const gstin = (client?.gstin || document.billTo?.gstin || '').trim().toUpperCase();
  const name = client?.companyName || document.billTo?.name || 'Unregistered buyer';
  const buyerState = normaliseStateCode(client?.stateCode || document.billTo?.stateCode);
  // Place of supply wins when it was set explicitly — that is the whole reason the
  // field exists (#29). The buyer's registered state is the fallback.
  const pos = normaliseStateCode(document.placeOfSupply) || buyerState;
  return { gstin, name, registered: Boolean(gstin), buyerState, pos };
}

/** Rate-wise breakdown of one document, for the `itms` array of a B2B/B2CL row. */
function rateWiseItems(document) {
  const buckets = new Map();
  for (const item of document.items || []) {
    const line = calculateLine(item, document.discountPercent);
    // The rate that appears in the return is the *combined* GST rate on the line;
    // whether it lands in IGST or in CGST+SGST is a separate question, answered by
    // the stored totals.
    const key = line.gstRate;
    const bucket = buckets.get(key) || { rt: key, txval: 0, iamt: 0, camt: 0, samt: 0, csamt: 0 };
    bucket.txval = roundMoney(bucket.txval + line.taxable);
    if (document.totals?.taxCharged === false) {
      // Exempt, nil-rated, LUT export or reverse charge: value reported, no tax.
    } else if (document.totals?.isIGST) {
      bucket.iamt = roundMoney(bucket.iamt + line.tax);
    } else {
      const half = roundMoney(line.tax / 2);
      bucket.camt = roundMoney(bucket.camt + half);
      bucket.samt = roundMoney(bucket.samt + roundMoney(line.tax - half));
    }
    bucket.csamt = roundMoney(bucket.csamt + (document.totals?.taxCharged === false ? 0 : line.cess));
    buckets.set(key, bucket);
  }
  return [...buckets.values()].sort((a, b) => a.rt - b.rt);
}

/** The GSTN `inv_typ` code for a B2B row. */
function invoiceTypeCode(supplyType) {
  if (supplyType === 'sez-with-payment') return 'SEWP';
  if (supplyType === 'sez-without-payment') return 'SEWOP';
  if (supplyType === 'deemed-export') return 'DE';
  return 'R';
}

function isExport(supplyType) {
  return supplyType === 'export-with-payment' || supplyType === 'export-without-payment';
}

/**
 * Builds GSTR-1 for a period.
 *
 * Cursor-streamed. A monthly return for a busy tenant is thousands of invoices with
 * their line items, and materialising them to build an in-memory object would
 * reintroduce exactly the problem Phase 3 removed from the report.
 */
async function buildGstr1(orgId, query = {}) {
  const period = resolveReturnPeriod(query);
  const org = await Organisation.findById(orgId).select('gstin name stateCode').lean();

  const dateRange = { $gte: period.from, $lte: period.to };
  const invoiceFilter = {
    orgId,
    // A draft was never issued and a soft-deleted draft certainly was not. Cancelled
    // invoices are excluded from the outward tables: their charge has been reversed,
    // and the reversing credit note is reported in CDNR instead. They still appear in
    // the document-series table, which is where cancellations belong.
    status: { $nin: ['draft', 'cancelled'] },
    deletedAt: null,
    date: dateRange
  };

  // Buyer GSTINs come from the client collection; loaded once for the period rather
  // than populated per invoice.
  const clientIds = await Invoice.distinct('clientId', invoiceFilter);
  const creditClientIds = await CreditNote.distinct('clientId', { orgId, date: dateRange, status: 'issued' });
  const clients = await Client.find({
    orgId,
    _id: { $in: [...clientIds, ...creditClientIds].filter(Boolean) }
  }).select('companyName gstin stateCode').lean();
  const clientMap = new Map(clients.map(c => [String(c._id), c]));

  const b2b = new Map();      // by buyer GSTIN
  const b2cl = new Map();     // by place of supply
  const b2cs = new Map();     // by pos + rate + supply type (aggregated)
  const exp = new Map();      // by with/without payment
  const nil = { inter_reg: 0, intr_reg: 0, inter_unreg: 0, intr_unreg: 0, exempt: 0, nilRated: 0, nonGst: 0 };
  const hsn = new Map();
  const docSeries = new Map();

  let invoiceCount = 0;
  const totals = { taxable: 0, igst: 0, cgst: 0, sgst: 0, cess: 0, invoiceValue: 0 };

  const cursor = Invoice.find(
    invoiceFilter,
    'invoiceNumber date items totals discountPercent clientId billTo placeOfSupply taxTreatment supplyType reverseCharge exportDetails eInvoice'
  ).lean().cursor();

  for await (const inv of cursor) {
    invoiceCount += 1;
    const buyer = buyerOf(inv, clientMap);
    const items = rateWiseItems(inv);
    const value = roundMoney(inv.totals?.total || 0);
    const supplyType = inv.supplyType || inv.totals?.supplyType || 'regular';
    const treatment = inv.taxTreatment || inv.totals?.taxTreatment || 'taxable';

    totals.taxable = roundMoney(totals.taxable + (inv.totals?.subtotal || 0));
    totals.igst = roundMoney(totals.igst + (inv.totals?.igst || 0));
    totals.cgst = roundMoney(totals.cgst + (inv.totals?.cgst || 0));
    totals.sgst = roundMoney(totals.sgst + (inv.totals?.sgst || 0));
    totals.cess = roundMoney(totals.cess + (inv.totals?.cess || 0));
    totals.invoiceValue = roundMoney(totals.invoiceValue + value);

    // ── HSN summary (required table) ──
    for (const item of inv.items || []) {
      const line = calculateLine(item, inv.discountPercent);
      const code = String(item.hsn || '').trim() || 'UNCLASSIFIED';
      const row = hsn.get(code) || {
        hsn_sc: code, desc: item.desc, uqc: 'OTH', qty: 0,
        txval: 0, iamt: 0, camt: 0, samt: 0, csamt: 0, rt: line.gstRate
      };
      row.qty = roundMoney(row.qty + line.qty);
      row.txval = roundMoney(row.txval + line.taxable);
      if (inv.totals?.taxCharged !== false) {
        if (inv.totals?.isIGST) row.iamt = roundMoney(row.iamt + line.tax);
        else {
          const half = roundMoney(line.tax / 2);
          row.camt = roundMoney(row.camt + half);
          row.samt = roundMoney(row.samt + roundMoney(line.tax - half));
        }
        row.csamt = roundMoney(row.csamt + line.cess);
      }
      hsn.set(code, row);
    }

    // ── Document series ──
    const seriesKey = inv.invoiceNumber.replace(/\d+$/, '') || inv.invoiceNumber;
    const series = docSeries.get(seriesKey) || { from: inv.invoiceNumber, to: inv.invoiceNumber, totnum: 0, cancel: 0 };
    series.totnum += 1;
    if (inv.invoiceNumber < series.from) series.from = inv.invoiceNumber;
    if (inv.invoiceNumber > series.to) series.to = inv.invoiceNumber;
    docSeries.set(seriesKey, series);

    // ── Nil-rated / exempt / non-GST ──
    if (treatment === 'exempt' || treatment === 'nil-rated' || treatment === 'non-gst') {
      const bucket = treatment === 'exempt' ? 'exempt' : (treatment === 'nil-rated' ? 'nilRated' : 'nonGst');
      nil[bucket] = roundMoney(nil[bucket] + (inv.totals?.subtotal || 0));
      const interState = Boolean(inv.totals?.isIGST);
      const key = `${interState ? 'inter' : 'intr'}_${buyer.registered ? 'reg' : 'unreg'}`;
      nil[key] = roundMoney(nil[key] + (inv.totals?.subtotal || 0));
      // A nil/exempt supply is *only* reported here — putting it in B2B or B2CS as
      // well would double-count the turnover.
      continue;
    }

    // ── EXP: exports ──
    if (isExport(supplyType)) {
      const key = supplyType === 'export-with-payment' ? 'WPAY' : 'WOPAY';
      const bucket = exp.get(key) || { exp_typ: key, inv: [] };
      bucket.inv.push({
        inum: inv.invoiceNumber,
        idt: gstnDate(inv.date),
        val: value,
        sbpcode: inv.exportDetails?.portCode || '',
        sbnum: inv.exportDetails?.shippingBillNumber || '',
        sbdt: inv.exportDetails?.shippingBillDate ? gstnDate(inv.exportDetails.shippingBillDate) : '',
        itms: items
      });
      exp.set(key, bucket);
      continue;
    }

    // ── B2B: any buyer with a GSTIN, including SEZ and deemed exports ──
    if (buyer.registered) {
      const bucket = b2b.get(buyer.gstin) || { ctin: buyer.gstin, cfs: buyer.name, inv: [] };
      bucket.inv.push({
        inum: inv.invoiceNumber,
        idt: gstnDate(inv.date),
        val: value,
        pos: buyer.pos,
        // 'Y' means the recipient pays the tax. It is a field of the return, not an
        // internal flag, and it is why reverse-charge invoices must not simply be
        // reported as ordinary B2B sales.
        rchrg: inv.reverseCharge ? 'Y' : 'N',
        inv_typ: invoiceTypeCode(supplyType),
        irn: inv.eInvoice?.irn || undefined,
        itms: items
      });
      b2b.set(buyer.gstin, bucket);
      continue;
    }

    // ── B2CL: unregistered, inter-state, above the threshold ──
    if (inv.totals?.isIGST && value > B2CL_THRESHOLD) {
      const bucket = b2cl.get(buyer.pos) || { pos: buyer.pos, inv: [] };
      bucket.inv.push({ inum: inv.invoiceNumber, idt: gstnDate(inv.date), val: value, itms: items });
      b2cl.set(buyer.pos, bucket);
      continue;
    }

    // ── B2CS: everything else, aggregated ──
    for (const item of items) {
      const type = inv.totals?.isIGST ? 'INTER' : 'INTRA';
      const key = `${type}|${buyer.pos}|${item.rt}`;
      const row = b2cs.get(key) || {
        sply_ty: type, pos: buyer.pos, typ: 'OE', rt: item.rt,
        txval: 0, iamt: 0, camt: 0, samt: 0, csamt: 0
      };
      row.txval = roundMoney(row.txval + item.txval);
      row.iamt = roundMoney(row.iamt + item.iamt);
      row.camt = roundMoney(row.camt + item.camt);
      row.samt = roundMoney(row.samt + item.samt);
      row.csamt = roundMoney(row.csamt + item.csamt);
      b2cs.set(key, row);
    }
  }

  // Cancelled documents count towards the series' cancelled tally rather than the
  // outward tables. A series with a gap and no cancellation recorded is a red flag
  // in a return, so this is not cosmetic.
  const cancelledCursor = Invoice.find(
    { orgId, status: 'cancelled', deletedAt: null, date: dateRange },
    'invoiceNumber'
  ).lean().cursor();
  for await (const inv of cancelledCursor) {
    const seriesKey = inv.invoiceNumber.replace(/\d+$/, '') || inv.invoiceNumber;
    const series = docSeries.get(seriesKey) || { from: inv.invoiceNumber, to: inv.invoiceNumber, totnum: 0, cancel: 0 };
    series.totnum += 1;
    series.cancel += 1;
    if (inv.invoiceNumber < series.from) series.from = inv.invoiceNumber;
    if (inv.invoiceNumber > series.to) series.to = inv.invoiceNumber;
    docSeries.set(seriesKey, series);
  }

  // ── CDNR / CDNUR: credit notes ──
  const cdnr = new Map();
  const cdnur = [];
  let creditNoteCount = 0;
  const creditTotals = { taxable: 0, igst: 0, cgst: 0, sgst: 0, cess: 0, value: 0 };

  const creditCursor = CreditNote.find(
    { orgId, status: 'issued', date: dateRange },
    'creditNoteNumber date invoiceNumber invoiceDate items totals discountPercent clientId billTo placeOfSupply supplyType reason'
  ).lean().cursor();

  for await (const note of creditCursor) {
    creditNoteCount += 1;
    const buyer = buyerOf(note, clientMap);
    const items = rateWiseItems(note);
    const value = roundMoney(note.totals?.total || 0);

    creditTotals.taxable = roundMoney(creditTotals.taxable + (note.totals?.subtotal || 0));
    creditTotals.igst = roundMoney(creditTotals.igst + (note.totals?.igst || 0));
    creditTotals.cgst = roundMoney(creditTotals.cgst + (note.totals?.cgst || 0));
    creditTotals.sgst = roundMoney(creditTotals.sgst + (note.totals?.sgst || 0));
    creditTotals.cess = roundMoney(creditTotals.cess + (note.totals?.cess || 0));
    creditTotals.value = roundMoney(creditTotals.value + value);

    const row = {
      ntty: 'C',
      nt_num: note.creditNoteNumber,
      nt_dt: gstnDate(note.date),
      // The original document, which is what makes a credit note a credit note.
      inum: note.invoiceNumber,
      idt: note.invoiceDate ? gstnDate(note.invoiceDate) : '',
      val: value,
      pos: buyer.pos,
      itms: items
    };

    if (buyer.registered) {
      const bucket = cdnr.get(buyer.gstin) || { ctin: buyer.gstin, cfs: buyer.name, nt: [] };
      bucket.nt.push(row);
      cdnr.set(buyer.gstin, bucket);
    } else {
      // Unregistered: the type says which unregistered table the *original* fell in,
      // because a credit note follows its invoice.
      cdnur.push({
        ...row,
        typ: isExport(note.supplyType) ? 'EXPWP' : (note.totals?.isIGST && value > B2CL_THRESHOLD ? 'B2CL' : 'B2CS')
      });
    }
  }

  return {
    period: {
      from: isoDay(period.from),
      to: isoDay(period.to),
      label: period.label,
      fp: period.fp,
      granularity: period.granularity
    },
    supplier: { gstin: org?.gstin || '', name: org?.name || '', stateCode: org?.stateCode || '' },
    /** Everything above the tables, so the console can show a reconciliation. */
    summary: {
      invoiceCount,
      creditNoteCount,
      ...totals,
      creditNotes: creditTotals,
      // Net of credit notes — the figure that should tie to the books.
      netTaxable: roundMoney(totals.taxable - creditTotals.taxable),
      netIgst: roundMoney(totals.igst - creditTotals.igst),
      netCgst: roundMoney(totals.cgst - creditTotals.cgst),
      netSgst: roundMoney(totals.sgst - creditTotals.sgst),
      netCess: roundMoney(totals.cess - creditTotals.cess),
      b2clThreshold: B2CL_THRESHOLD
    },
    sections: {
      b2b: [...b2b.values()],
      b2cl: [...b2cl.values()],
      b2cs: [...b2cs.values()].sort((a, b) => a.pos.localeCompare(b.pos) || a.rt - b.rt),
      cdnr: [...cdnr.values()],
      cdnur,
      exp: [...exp.values()],
      nil,
      hsn: [...hsn.values()].sort((a, b) => b.txval - a.txval),
      docIssued: [...docSeries.entries()].map(([prefix, series]) => ({
        prefix,
        from: series.from,
        to: series.to,
        totnum: series.totnum,
        cancel: series.cancel,
        net_issue: series.totnum - series.cancel
      }))
    }
  };
}

/**
 * The GSTN offline-utility JSON.
 *
 * A separate shape from the API response above on purpose: the response is for a
 * screen and carries a summary the utility would reject, while this is the file that
 * gets uploaded. Empty sections are omitted rather than sent as `[]`, which the
 * utility treats as "I am filing a nil return for this table" — not the same claim
 * as staying silent.
 */
function toGstnJson(report) {
  const { sections, supplier, period } = report;
  const payload = { gstin: supplier.gstin, fp: period.fp, version: 'GST3.0.4', hash: 'hash' };

  if (sections.b2b.length) payload.b2b = sections.b2b;
  if (sections.b2cl.length) payload.b2cl = sections.b2cl;
  if (sections.b2cs.length) payload.b2cs = sections.b2cs;
  if (sections.cdnr.length) payload.cdnr = sections.cdnr;
  if (sections.cdnur.length) payload.cdnur = sections.cdnur;
  if (sections.exp.length) payload.exp = sections.exp;
  if (sections.hsn.length) payload.hsn = { data: sections.hsn.map((row, index) => ({ num: index + 1, ...row })) };
  if (sections.docIssued.length) {
    payload.doc_issue = {
      doc_det: [{
        doc_num: 1,
        docs: sections.docIssued.map((series, index) => ({
          num: index + 1,
          from: series.from,
          to: series.to,
          totnum: series.totnum,
          cancel: series.cancel,
          net_issue: series.net_issue
        }))
      }]
    };
  }
  const nil = sections.nil;
  if (nil.exempt || nil.nilRated || nil.nonGst) {
    payload.nil = {
      inv: [
        { sply_ty: 'INTRB2B', expt_amt: nil.exempt, nil_amt: nil.nilRated, ngsup_amt: nil.nonGst }
      ]
    };
  }
  return payload;
}

// ── GSTR-3B ──────────────────────────────────────

/**
 * GSTR-3B: the net liability.
 *
 * Impossible before purchases existed — it is outward tax *minus* input credit, and
 * without the second term the only honest answer was to not produce the report at
 * all rather than present half of it as a liability.
 *
 * Reverse charge appears on both sides deliberately and is the part most often got
 * wrong: an inward supply under reverse charge creates a liability (table 3.1(d))
 * *and*, separately, a credit (table 4(A)(3)). Netting them to zero would be right
 * on the total and wrong on both lines, and the return is filed line by line.
 */
async function buildGstr3b(orgId, query = {}) {
  const period = resolveReturnPeriod(query);
  const dateRange = { $gte: period.from, $lte: period.to };
  const org = await Organisation.findById(orgId).select('gstin name stateCode').lean();

  const [outward, creditNotes, purchases] = await Promise.all([
    Invoice.aggregate([
      {
        $match: {
          orgId,
          status: { $nin: ['draft', 'cancelled'] },
          deletedAt: null,
          date: dateRange
        }
      },
      {
        $group: {
          _id: {
            treatment: { $ifNull: ['$taxTreatment', 'taxable'] },
            supply: { $ifNull: ['$supplyType', 'regular'] },
            reverseCharge: { $ifNull: ['$reverseCharge', false] },
            interState: '$totals.isIGST'
          },
          taxable: { $sum: '$totals.subtotal' },
          igst: { $sum: '$totals.igst' },
          cgst: { $sum: '$totals.cgst' },
          sgst: { $sum: '$totals.sgst' },
          cess: { $sum: '$totals.cess' },
          count: { $sum: 1 }
        }
      }
    ]),
    CreditNote.aggregate([
      { $match: { orgId, status: 'issued', date: dateRange } },
      {
        $group: {
          _id: null,
          taxable: { $sum: '$totals.subtotal' },
          igst: { $sum: '$totals.igst' },
          cgst: { $sum: '$totals.cgst' },
          sgst: { $sum: '$totals.sgst' },
          cess: { $sum: '$totals.cess' }
        }
      }
    ]),
    Purchase.aggregate([
      { $match: { orgId, deletedAt: null, status: { $ne: 'draft' }, billDate: dateRange } },
      {
        $group: {
          _id: {
            supply: '$supplyType',
            reverseCharge: '$reverseCharge',
            category: '$itc.category',
            eligible: '$itc.eligible',
            treatment: { $ifNull: ['$taxTreatment', 'taxable'] }
          },
          taxable: { $sum: '$totals.subtotal' },
          igst: { $sum: '$itc.igst' },
          cgst: { $sum: '$itc.cgst' },
          sgst: { $sum: '$itc.sgst' },
          cess: { $sum: '$itc.cess' },
          invoiceIgst: { $sum: '$totals.igst' },
          invoiceCgst: { $sum: '$totals.cgst' },
          invoiceSgst: { $sum: '$totals.sgst' },
          invoiceCess: { $sum: '$totals.cess' },
          count: { $sum: 1 }
        }
      }
    ])
  ]);

  const zero = () => ({ taxable: 0, igst: 0, cgst: 0, sgst: 0, cess: 0 });
  const add = (target, row, prefix = '') => {
    target.taxable = roundMoney(target.taxable + (row.taxable || 0));
    target.igst = roundMoney(target.igst + (row[`${prefix}igst`] ?? row.igst ?? 0));
    target.cgst = roundMoney(target.cgst + (row[`${prefix}cgst`] ?? row.cgst ?? 0));
    target.sgst = roundMoney(target.sgst + (row[`${prefix}sgst`] ?? row.sgst ?? 0));
    target.cess = roundMoney(target.cess + (row[`${prefix}cess`] ?? row.cess ?? 0));
    return target;
  };

  // Table 3.1
  const outwardTaxable = zero();      // (a) other than zero-rated, nil, exempt
  const outwardZeroRated = zero();    // (b)
  const outwardNilExempt = zero();    // (c)
  const inwardReverseCharge = zero(); // (d) — from purchases, below
  const outwardReverseCharge = zero(); // supplies on which the recipient pays

  for (const row of outward) {
    const { treatment, supply, reverseCharge } = row._id;
    if (treatment === 'exempt' || treatment === 'nil-rated' || treatment === 'non-gst') {
      add(outwardNilExempt, row);
    } else if (supply !== 'regular' && supply !== 'deemed-export') {
      add(outwardZeroRated, row);
    } else if (reverseCharge) {
      add(outwardReverseCharge, row);
    } else {
      add(outwardTaxable, row);
    }
  }

  // Table 4: ITC
  const itcImportGoods = zero();
  const itcImportServices = zero();
  const itcReverseCharge = zero();
  const itcOther = zero();
  const itcIneligible = zero();
  const inwardExemptNil = zero();

  for (const row of purchases) {
    const { supply, reverseCharge, eligible, treatment } = row._id;

    if (treatment === 'exempt' || treatment === 'nil-rated' || treatment === 'non-gst') {
      add(inwardExemptNil, row, 'invoice');
      continue;
    }
    if (reverseCharge) {
      // The liability side: tax the buyer owes directly. Taken from the *invoice*
      // amounts, not the ITC amounts — the liability does not depend on whether the
      // credit turned out to be claimable.
      add(inwardReverseCharge, row, 'invoice');
    }
    if (!eligible) {
      add(itcIneligible, row, 'invoice');
      continue;
    }
    if (supply === 'import-goods') add(itcImportGoods, row);
    else if (supply === 'import-services') add(itcImportServices, row);
    else if (reverseCharge) add(itcReverseCharge, row);
    else add(itcOther, row);
  }

  const credit = creditNotes[0] || { taxable: 0, igst: 0, cgst: 0, sgst: 0, cess: 0 };

  const sumHeads = (...blocks) => blocks.reduce((total, block) => ({
    igst: roundMoney(total.igst + block.igst),
    cgst: roundMoney(total.cgst + block.cgst),
    sgst: roundMoney(total.sgst + block.sgst),
    cess: roundMoney(total.cess + block.cess)
  }), { igst: 0, cgst: 0, sgst: 0, cess: 0 });

  const outwardLiability = sumHeads(outwardTaxable, outwardZeroRated, inwardReverseCharge);
  // Credit notes reduce the output liability for the period they are issued in.
  const netLiability = {
    igst: roundMoney(outwardLiability.igst - credit.igst),
    cgst: roundMoney(outwardLiability.cgst - credit.cgst),
    sgst: roundMoney(outwardLiability.sgst - credit.sgst),
    cess: roundMoney(outwardLiability.cess - credit.cess)
  };
  const itcAvailable = sumHeads(itcImportGoods, itcImportServices, itcReverseCharge, itcOther);

  /**
   * Cash payable per head, floored at zero.
   *
   * Credit under one head cannot be set off against another arbitrarily — the
   * utilisation rules are ordered and IGST credit must be exhausted first — so this
   * is deliberately a **per-head** subtraction rather than a single net figure, and
   * a surplus is reported as carry-forward rather than being quietly used to reduce
   * another head's cash.
   */
  const payHead = head => ({
    liability: netLiability[head],
    itc: itcAvailable[head],
    payable: roundMoney(Math.max(0, netLiability[head] - itcAvailable[head])),
    carryForward: roundMoney(Math.max(0, itcAvailable[head] - netLiability[head]))
  });

  return {
    period: { from: isoDay(period.from), to: isoDay(period.to), label: period.label, fp: period.fp },
    supplier: { gstin: org?.gstin || '', name: org?.name || '', stateCode: org?.stateCode || '' },
    outward: {
      taxable: outwardTaxable,
      zeroRated: outwardZeroRated,
      nilExempt: outwardNilExempt,
      reverseChargeSupplies: outwardReverseCharge,
      inwardReverseCharge,
      creditNotes: {
        taxable: roundMoney(credit.taxable || 0),
        igst: roundMoney(credit.igst || 0),
        cgst: roundMoney(credit.cgst || 0),
        sgst: roundMoney(credit.sgst || 0),
        cess: roundMoney(credit.cess || 0)
      }
    },
    itc: {
      importGoods: itcImportGoods,
      importServices: itcImportServices,
      inwardReverseCharge: itcReverseCharge,
      other: itcOther,
      available: itcAvailable,
      ineligible: itcIneligible
    },
    inwardExemptNil,
    netPayable: {
      igst: payHead('igst'),
      cgst: payHead('cgst'),
      sgst: payHead('sgst'),
      cess: payHead('cess'),
      totalCash: roundMoney(
        payHead('igst').payable + payHead('cgst').payable + payHead('sgst').payable + payHead('cess').payable
      )
    },
    /**
     * Said plainly in the payload, not just in the UI: this is a preparation aid.
     * The figures come from what was recorded here, which is not the same thing as
     * what the GSTN portal holds, and a filing decision needs the two reconciled.
     */
    disclaimer: 'Computed from records in KloguBizz. Reconcile against GSTR-2B and your books before filing.'
  };
}

module.exports = {
  B2CL_THRESHOLD,
  OTHER_COUNTRY_POS,
  resolveReturnPeriod,
  returnPeriod,
  buildGstr1,
  toGstnJson,
  buildGstr3b
};
