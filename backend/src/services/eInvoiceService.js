const crypto = require('crypto');
const { env } = require('../config/env');
const { calculateLine, roundMoney } = require('./gstService');
const { isValidGstin } = require('../validators/common');

/**
 * E-invoicing (IRN + signed QR).
 *
 * Mandatory in India above a turnover threshold, and the product had nothing:
 * no IRN field, no validation, and a `gst-einvoice-qr` template drawing a
 * **decorative, non-scannable** QR motif — which is worse than an absent feature,
 * because it looks like the real thing on a document that is a legal declaration.
 *
 * What is real here and what is not, stated plainly because the difference matters:
 *
 *  - **Real:** the payload builder (`buildIrpPayload`), which produces the NIC
 *    schema the IRP actually consumes, and the validator (`validateForIrp`), which
 *    applies the rules the IRP would reject on. Both are fully testable and are the
 *    bulk of the work — most failed IRN attempts are rejected on data, not transport.
 *  - **Not real:** the network call. Reporting an invoice requires credentials from
 *    an IRP or GSP that this deployment does not have, so `generateIrn` refuses with
 *    `IRP_NOT_CONFIGURED` rather than pretending. That refusal is the honest state,
 *    and it is a *seam*: a provider adapter drops into `callIrp` without any caller
 *    changing.
 *
 * The alternative — a mocked "success" that stamps a made-up IRN on an invoice —
 * would be indistinguishable from compliance until an audit, which is precisely the
 * failure mode the decorative QR already had.
 */

/**
 * The aggregate-turnover threshold above which e-invoicing applies, in rupees.
 *
 * ₹5 crore at the time of writing, and it has been lowered four times. Turnover is
 * not something this product knows — it is the previous year's, across all of a
 * business's GSTINs — so eligibility is a tenant-level setting rather than something
 * inferred from invoices raised here, which would be wrong for anyone who
 * onboarded mid-year.
 */
const DEFAULT_TURNOVER_THRESHOLD = 50000000;

/** Documents an IRP will not accept, whatever else is right about them. */
const REPORTABLE_STATUSES = ['pending', 'partial', 'paid', 'overdue'];

/**
 * Whether this document needs an IRN at all.
 *
 * B2C supplies are outside e-invoicing: only B2B, SEZ, exports and deemed exports
 * are reported. Returning a reason rather than a bare boolean because "why is there
 * no IRN on this invoice" is a question a tenant will ask, and "not applicable" and
 * "not yet generated" are different answers.
 */
function assessEligibility({ invoice, buyerGstin, org }) {
  const enabled = org?.eInvoicing?.enabled === true;
  if (!enabled) {
    return { required: false, reason: 'E-invoicing is not enabled for this organisation.' };
  }
  if (invoice.status === 'draft') {
    return { required: false, reason: 'A draft has not been issued, so there is nothing to report.' };
  }
  if (invoice.status === 'cancelled') {
    return { required: false, reason: 'This invoice has been cancelled.' };
  }
  const supplyType = invoice.supplyType || 'regular';
  const isExportOrSez = supplyType !== 'regular';
  if (!buyerGstin && !isExportOrSez) {
    // The single most common reason a document is out of scope.
    return { required: false, reason: 'B2C supplies are outside e-invoicing — the buyer has no GSTIN.' };
  }
  return { required: true, reason: '' };
}

/**
 * The checks the IRP itself applies.
 *
 * Run before any network call, because a rejection there costs a round trip and
 * arrives as an opaque error code. Every message names the field and says what to do,
 * since the person reading it is a business owner rather than an integrator.
 */
function validateForIrp({ invoice, org, client }) {
  const problems = [];
  const buyerGstin = (client?.gstin || invoice.billTo?.gstin || '').trim().toUpperCase();
  const supplyType = invoice.supplyType || 'regular';
  const isExportOrSez = supplyType !== 'regular';

  if (!org?.gstin) {
    problems.push({ field: 'organisation.gstin', message: 'Your own GSTIN is not set. Add it under Settings before reporting invoices.' });
  } else if (!isValidGstin(org.gstin)) {
    problems.push({ field: 'organisation.gstin', message: 'Your GSTIN fails its checksum — correct it under Settings.' });
  }
  if (!org?.address || !org?.stateCode) {
    problems.push({ field: 'organisation.address', message: 'Your registered address and state are required on an e-invoice.' });
  }

  if (buyerGstin && !isValidGstin(buyerGstin)) {
    problems.push({ field: 'buyer.gstin', message: `The buyer's GSTIN (${buyerGstin}) fails its checksum. The IRP will reject it.` });
  }
  if (!buyerGstin && !isExportOrSez) {
    problems.push({ field: 'buyer.gstin', message: 'A B2B e-invoice needs the buyer’s GSTIN.' });
  }

  const pos = invoice.placeOfSupply || client?.stateCode || invoice.billTo?.stateCode;
  if (!pos) {
    problems.push({ field: 'placeOfSupply', message: 'Place of supply is required. Set it on the invoice.' });
  }

  if (!REPORTABLE_STATUSES.includes(invoice.status)) {
    problems.push({ field: 'status', message: `An invoice with status "${invoice.status}" cannot be reported.` });
  }

  const items = invoice.items || [];
  if (!items.length) {
    problems.push({ field: 'items', message: 'An e-invoice needs at least one line item.' });
  }
  items.forEach((item, index) => {
    // HSN is mandatory on every line of an e-invoice. It is optional elsewhere in
    // this product, which is exactly why it has to be checked here rather than
    // assumed.
    if (!String(item.hsn || '').trim()) {
      problems.push({ field: `items[${index}].hsn`, message: `Line ${index + 1} ("${item.desc}") has no HSN/SAC code. Every line of an e-invoice needs one.` });
    }
    if (!(Number(item.qty) > 0)) {
      problems.push({ field: `items[${index}].qty`, message: `Line ${index + 1} has no quantity.` });
    }
  });

  if (isExportOrSez && supplyType.startsWith('export')) {
    if (!invoice.exportDetails?.countryCode) {
      problems.push({ field: 'exportDetails.countryCode', message: 'An export e-invoice needs the destination country code.' });
    }
  }

  return { valid: problems.length === 0, problems, buyerGstin };
}

/**
 * Builds the NIC e-invoice payload (schema 1.1).
 *
 * Field names are the IRP's, not ours, which is why they are terse and inconsistent
 * — `SlNo`, `IsServc`, `AssAmt`. Renaming them for readability would mean a
 * translation layer between here and the wire, and a translation layer is where a
 * field silently goes missing.
 *
 * Amounts come from `calculateLine`, the same function that priced the invoice, so
 * what is reported to the government is arithmetically identical to what the
 * customer was given.
 */
function buildIrpPayload({ invoice, org, client }) {
  const buyerGstin = (client?.gstin || invoice.billTo?.gstin || '').trim().toUpperCase();
  const supplyType = invoice.supplyType || 'regular';
  const pos = String(invoice.placeOfSupply || client?.stateCode || invoice.billTo?.stateCode || '').padStart(2, '0');
  const isIGST = Boolean(invoice.totals?.isIGST);
  const taxCharged = invoice.totals?.taxCharged !== false;

  const supplyTypeCode = (() => {
    if (supplyType === 'export-with-payment' || supplyType === 'export-without-payment') return 'EXPWP';
    if (supplyType === 'sez-with-payment') return 'SEZWP';
    if (supplyType === 'sez-without-payment') return 'SEZWOP';
    if (supplyType === 'deemed-export') return 'DEXP';
    return 'B2B';
  })();

  const itemList = (invoice.items || []).map((item, index) => {
    const line = calculateLine(item, invoice.discountPercent);
    const halfTax = taxCharged && !isIGST ? roundMoney(line.tax / 2) : 0;
    return {
      SlNo: String(index + 1),
      PrdDesc: String(item.desc || '').slice(0, 300),
      // 'Y' for a service, 'N' for goods. Derived from the HSN: SAC codes for
      // services begin at 99.
      IsServc: String(item.hsn || '').startsWith('99') ? 'Y' : 'N',
      HsnCd: String(item.hsn || '').trim(),
      Qty: line.qty,
      Unit: 'OTH',
      UnitPrice: line.rate,
      TotAmt: line.gross,
      Discount: line.discount,
      AssAmt: line.taxable,
      GstRt: line.gstRate,
      IgstAmt: taxCharged && isIGST ? line.tax : 0,
      CgstAmt: halfTax,
      SgstAmt: halfTax ? roundMoney(line.tax - halfTax) : 0,
      CesRt: line.cessRate,
      CesAmt: taxCharged ? line.cess : 0,
      TotItemVal: line.total
    };
  });

  return {
    Version: '1.1',
    TranDtls: {
      TaxSch: 'GST',
      SupTyp: supplyTypeCode,
      // 'Y' means the recipient pays the tax.
      RegRev: invoice.reverseCharge ? 'Y' : 'N',
      IgstOnIntra: 'N'
    },
    DocDtls: {
      // 'INV' tax invoice, 'CRN' credit note, 'DBN' debit note.
      Typ: 'INV',
      No: invoice.invoiceNumber,
      Dt: new Date(invoice.date).toLocaleDateString('en-GB').replace(/\//g, '/')
    },
    SellerDtls: {
      Gstin: org.gstin,
      LglNm: org.name,
      Addr1: String(org.address || '').slice(0, 100) || 'NA',
      Loc: org.state || 'NA',
      Pin: 999999,
      Stcd: String(org.stateCode || '').padStart(2, '0')
    },
    BuyerDtls: {
      // 'URP' — unregistered person — is the IRP's own sentinel for an export buyer
      // with no Indian GSTIN. An empty string is rejected.
      Gstin: buyerGstin || 'URP',
      LglNm: client?.companyName || invoice.billTo?.name || 'NA',
      Pos: pos,
      Addr1: String(client?.address || invoice.billTo?.address || '').slice(0, 100) || 'NA',
      Loc: client?.state || 'NA',
      Pin: 999999,
      Stcd: String(client?.stateCode || invoice.billTo?.stateCode || pos).padStart(2, '0')
    },
    ValDtls: {
      AssVal: roundMoney(invoice.totals?.subtotal || 0),
      CgstVal: roundMoney(invoice.totals?.cgst || 0),
      SgstVal: roundMoney(invoice.totals?.sgst || 0),
      IgstVal: roundMoney(invoice.totals?.igst || 0),
      CesVal: roundMoney(invoice.totals?.cess || 0),
      RndOffAmt: roundMoney(invoice.totals?.roundOff || 0),
      TotInvVal: roundMoney(invoice.totals?.total || 0)
    },
    ...(supplyType.startsWith('export') || supplyType.startsWith('sez')
      ? {
        ExpDtls: {
          ShipBNo: invoice.exportDetails?.shippingBillNumber || '',
          ShipBDt: invoice.exportDetails?.shippingBillDate
            ? new Date(invoice.exportDetails.shippingBillDate).toLocaleDateString('en-GB')
            : '',
          Port: invoice.exportDetails?.portCode || '',
          // 'Y' when IGST was paid on the export and will be refunded.
          RefClm: supplyType.endsWith('with-payment') ? 'Y' : 'N',
          ForCur: invoice.exportDetails?.currency || 'INR',
          CntCode: invoice.exportDetails?.countryCode || ''
        }
      }
      : {}),
    ItemList: itemList
  };
}

/** Whether an IRP/GSP adapter is configured at all. */
function isIrpConfigured() {
  return Boolean(env.IRP_BASE_URL && env.IRP_USERNAME && env.IRP_PASSWORD && env.IRP_CLIENT_ID);
}

/**
 * The provider boundary.
 *
 * Deliberately the only function in this file that would need to change to go live,
 * and deliberately not faked. Every IRP and GSP has its own auth dance (an encrypted
 * session key, a rotating token) and its own error envelope, so this stays a stub
 * with a precise contract rather than a guess at one vendor's API.
 */
async function callIrp() {
  const error = new Error(
    'No e-invoice provider is configured. Set IRP_BASE_URL, IRP_USERNAME, IRP_PASSWORD and IRP_CLIENT_ID, '
    + 'and implement the provider adapter in services/eInvoiceService.js#callIrp.'
  );
  error.statusCode = 501;
  error.code = 'IRP_NOT_CONFIGURED';
  throw error;
}

/**
 * Validates, builds and reports an invoice.
 *
 * Fails on validation *before* touching the provider, so the common case — a missing
 * HSN code, an invalid buyer GSTIN — produces an actionable message instead of an
 * IRP error code.
 */
async function generateIrn({ invoice, org, client }) {
  const eligibility = assessEligibility({ invoice, buyerGstin: client?.gstin || invoice.billTo?.gstin, org });
  if (!eligibility.required) {
    const error = new Error(eligibility.reason);
    error.statusCode = 400;
    error.code = 'EINVOICE_NOT_REQUIRED';
    throw error;
  }

  const validation = validateForIrp({ invoice, org, client });
  if (!validation.valid) {
    const error = new Error(`This invoice cannot be reported yet — ${validation.problems.length} problem(s) to fix.`);
    error.statusCode = 400;
    error.code = 'EINVOICE_INVALID';
    error.details = validation.problems;
    throw error;
  }

  const payload = buildIrpPayload({ invoice, org, client });
  if (!isIrpConfigured()) {
    const error = new Error(
      'This invoice is ready to report, but no e-invoice provider is configured. '
      + 'Its payload has been validated and can be downloaded for manual upload to the IRP.'
    );
    error.statusCode = 501;
    error.code = 'IRP_NOT_CONFIGURED';
    // The validated payload rides along, so "not configured" is still useful: it can
    // be uploaded to the government portal by hand.
    error.payload = payload;
    throw error;
  }
  return callIrp(payload);
}

/**
 * The 24-hour cancellation window.
 *
 * An IRN can only be cancelled within 24 hours of generation, and after that the
 * only route is a credit note. Checked locally because the IRP's refusal is an opaque
 * code, and because the correct advice ("issue a credit note instead") is something
 * this product can give and the IRP cannot.
 */
function canCancelIrn(eInvoice) {
  if (!eInvoice?.irn || eInvoice.status !== 'generated') {
    return { allowed: false, reason: 'This invoice has no active IRN.' };
  }
  const generatedAt = eInvoice.generatedAt ? new Date(eInvoice.generatedAt).getTime() : 0;
  const hours = (Date.now() - generatedAt) / 3600000;
  if (hours > 24) {
    return {
      allowed: false,
      reason: 'An IRN can only be cancelled within 24 hours. Issue a credit note to reverse this invoice instead.'
    };
  }
  return { allowed: true, hoursRemaining: Math.max(0, Math.round((24 - hours) * 10) / 10) };
}

/**
 * A stable hash of the payload.
 *
 * Used to tell whether an invoice has been edited since it was reported — an IRN
 * covers the document as it was at that moment, and an amended invoice with a stale
 * IRN is a mismatch the portal will eventually surface.
 */
function payloadFingerprint(payload) {
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0, 32);
}

module.exports = {
  DEFAULT_TURNOVER_THRESHOLD,
  assessEligibility,
  validateForIrp,
  buildIrpPayload,
  isIrpConfigured,
  generateIrn,
  canCancelIrn,
  payloadFingerprint
};
