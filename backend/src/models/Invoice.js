const mongoose = require('mongoose');

const lineItemSchema = new mongoose.Schema({
  desc: { type: String, required: true },
  hsn: String,
  qty: { type: Number, required: true, min: 0 },
  rate: { type: Number, required: true, min: 0 },
  gstRate: { type: Number, required: true, default: 18 },
  // GST compensation cess (tobacco, automobiles, aerated drinks...). Was only
  // present on the Item master and ignored at invoicing time, so cess-bearing
  // goods were under-taxed.
  cessRate: { type: Number, default: 0, min: 0 },
  // Per-line trade discount. Before this existed, the Bill Generator folded
  // its discount into `rate` because there was nowhere to put it — which lost
  // the gross value and hid the discount from the customer's copy.
  discountPercent: { type: Number, default: 0, min: 0, max: 100 },
  // When true, `rate` already includes GST and cess and the taxable value is
  // back-calculated from it (see gstService).
  taxInclusive: { type: Boolean, default: false }
}, { _id: false });

// Produced entirely by gstService.calculateInvoiceTotals — never assembled by
// hand, so the document, the PDF and the reports always agree.
const totalsSchema = new mongoose.Schema({
  // Value before any discount, so the discount stays auditable.
  grossSubtotal: { type: Number, default: 0 },
  discountTotal: { type: Number, default: 0 },
  // Taxable value: gross less discounts. This is the figure GST is charged on
  // and the one that goes into GSTR-1.
  subtotal: { type: Number, default: 0 },
  cgst: { type: Number, default: 0 },
  sgst: { type: Number, default: 0 },
  igst: { type: Number, default: 0 },
  cess: { type: Number, default: 0 },
  // Adjustment that brings the payable total to a whole rupee.
  roundOff: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  isIGST: { type: Boolean, default: false },
  // Intra-territory supply to a UT that levies UTGST rather than SGST — the
  // amount sits in `sgst`, this only changes the label.
  isUT: { type: Boolean, default: false },
  // Classification, resolved by gstService.resolveTaxContext and stored so the
  // document, the PDF and both returns never re-derive it differently.
  taxTreatment: { type: String, default: 'taxable' },
  supplyType: { type: String, default: 'regular' },
  reverseCharge: { type: Boolean, default: false },
  zeroRated: { type: Boolean, default: false },
  // False for an exempt, nil-rated, non-GST, LUT-export or reverse-charge supply.
  taxCharged: { type: Boolean, default: true },
  // Why no tax was charged, in words, so a zero-tax invoice explains itself
  // instead of looking like a bug.
  taxNote: { type: String, default: '' }
}, { _id: false });

/**
 * Export / SEZ particulars.
 *
 * Required on the shipping-bill side of GSTR-1's EXP table, and there was nowhere
 * to record any of it: an export invoice was indistinguishable from a domestic one
 * except by the buyer's address.
 */
const exportDetailsSchema = new mongoose.Schema({
  // ISO 3166-1 alpha-2. Kept separate from `stateCode`, which is meaningless for
  // an overseas buyer (GSTR-1 uses '96' for "other country").
  countryCode: String,
  portCode: String,
  shippingBillNumber: String,
  shippingBillDate: Date,
  // The invoice is still raised and reported in INR; these record the original.
  currency: { type: String, default: 'INR' },
  conversionRate: { type: Number, default: 1, min: 0 },
  // LUT/bond reference for a without-payment export.
  lutNumber: String
}, { _id: false });

/**
 * E-invoicing state (IRN + signed QR).
 *
 * Mandatory above a turnover threshold, and the product had no field for any of
 * it — the `gst-einvoice-qr` template draws a *decorative, non-scannable* QR
 * motif, which is worse than nothing if anyone mistook it for the real thing.
 *
 * `status` distinguishes the four situations that matter and which were previously
 * indistinguishable: not applicable to this document, applicable but not yet
 * reported, reported successfully, and reported then cancelled. `failed` keeps the
 * IRP's own rejection message, because "it didn't work" is not actionable and the
 * IRP's error codes are specific.
 */
const eInvoiceSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['not-required', 'pending', 'generated', 'cancelled', 'failed'],
    default: 'not-required'
  },
  irn: String,
  ackNo: String,
  ackDate: Date,
  // The base64 signed QR the IRP returns. This is the one that is actually
  // scannable, unlike the template's decorative motif.
  signedQrCode: String,
  signedInvoice: String,
  generatedAt: Date,
  cancelledAt: Date,
  cancelReason: String,
  // The IRP's own error code and message from the last failed attempt.
  errorCode: String,
  error: String,
  attempts: { type: Number, default: 0 }
}, { _id: false });

const billToSchema = new mongoose.Schema({
  // Walk-in / not-yet-registered buyer details, used instead of `clientId`
  // for Bill Generator's B2B-Unregistered and B2C modes. `type` records which
  // buyer mode produced this so the UI can restore the right form on edit.
  type: { type: String, enum: ['b2b-unreg', 'b2c'] },
  name: String,
  phone: String,
  email: String,
  address: String,
  stateCode: String,
  gstin: String
}, { _id: false });

const invoiceSchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },
  // Exactly one of clientId/billTo is set: a registered client reference for
  // formal invoices, or embedded walk-in buyer details for quick bills — see
  // invoiceController.js's totalsFor/createInvoice/updateInvoice for the
  // validation that enforces this and lets a bill later be "converted" to a
  // client invoice (or vice versa) by switching which one is populated.
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
  billTo: billToSchema,
  invoiceNumber: { type: String, required: true },
  date: { type: Date, required: true },
  dueDate: { type: Date, required: true },
  // 'cancelled' means the charge has been fully reversed by credit note(s), or
  // the invoice was voided before anything was collected. The document itself
  // is retained either way — under GST an issued invoice is never deleted.
  status: { type: String, enum: ['draft', 'pending', 'partial', 'paid', 'overdue', 'cancelled'], default: 'draft' },
  cancelledAt: Date,
  cancelReason: String,
  paidDate: Date,
  items: { type: [lineItemSchema], default: [] },
  // Invoice-level discount, on top of any per-line discounts.
  discountPercent: { type: Number, default: 0, min: 0, max: 100 },

  /**
   * Place of supply — the state whose tax applies.
   *
   * Distinct from the buyer's registered state, which is what the tax head used to
   * be decided from. They differ whenever bill-to and ship-to differ (goods
   * delivered to a branch in another state) and for most services, and getting it
   * wrong charges the wrong tax head on a document that is a legal declaration.
   * Falls back to the buyer's state when not set, so existing invoices are
   * unaffected.
   */
  placeOfSupply: String,
  /** taxable | exempt | nil-rated | non-gst | zero-rated — see gstService. */
  taxTreatment: { type: String, default: 'taxable' },
  /** regular | export-with/without-payment | sez-with/without-payment | deemed-export. */
  supplyType: { type: String, default: 'regular' },
  /** Tax payable by the recipient; the supplier reports the value but collects no tax. */
  reverseCharge: { type: Boolean, default: false },
  exportDetails: { type: exportDetailsSchema, default: null },
  eInvoice: { type: eInvoiceSchema, default: () => ({}) },

  totals: { type: totalsSchema, default: () => ({}) },
  // Settlement state, persisted rather than recomputed ad hoc. Previously the
  // paid amount was aggregated from Payment inside createPayment and then
  // thrown away, so the dashboard had to infer revenue from `status` alone —
  // which reported ₹0 for a ₹1L invoice with ₹90k received, and counted the
  // full total as pending. Kept in sync by
  // invoiceController.recalculateSettlement.
  amountPaid: { type: Number, default: 0, min: 0 },
  // Total of issued credit notes against this invoice. Reduces what the
  // customer owes just as a payment does — a fully credited invoice is settled
  // without any money having changed hands.
  amountCredited: { type: Number, default: 0, min: 0 },
  balanceDue: { type: Number, default: 0 },
  notes: String,
  paymentTerms: { type: String, default: 'Net 15' },
  bankDetails: {
    bank: String,
    account: String,
    ifsc: String
  },
  /**
   * The quotation, proforma or delivery challan this invoice was raised from
   * (2.2 #11–#13), when it was raised by conversion rather than from scratch.
   *
   * Stored on the invoice as well as on the source document because both
   * directions get asked: the quotation list wants "what did this become", and a
   * customer querying a price wants "what was this agreed against" — which is
   * asked *from the invoice*, and searching every quotation for a back-reference
   * to answer it would be absurd.
   */
  sourceDocument: {
    kind: { type: String, enum: ['quotation', 'proforma', 'delivery-challan'] },
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'SalesDocument' },
    documentNumber: String
  },
  /**
   * Soft delete (#37).
   *
   * Only ever set on a **draft**: an issued invoice is not deletable at all, soft or
   * otherwise, because under GST it must be reversed by a credit note rather than
   * removed. Purged after the grace window by maintenanceService.
   */
  deletedAt: { type: Date, default: null },
  deletedBy: String
}, { timestamps: true });

invoiceSchema.index({ orgId: 1, invoiceNumber: 1 }, { unique: true });
invoiceSchema.index({ orgId: 1, status: 1, date: -1 });
invoiceSchema.index({ orgId: 1, clientId: 1 });
// Drives the overdue sweep, which matches on status + dueDate.
invoiceSchema.index({ orgId: 1, status: 1, dueDate: 1 });
// Drives the plan's monthly invoice-quota count.
invoiceSchema.index({ orgId: 1, createdAt: -1 });
// Drives the GST report's period filter.
invoiceSchema.index({ orgId: 1, date: -1 });
// Recycle bin listing, and the scheduled purge of expired soft deletes.
invoiceSchema.index({ orgId: 1, deletedAt: 1 });
// GSTR-1 sections by place of supply, and the e-invoice worklist.
invoiceSchema.index({ orgId: 1, placeOfSupply: 1, date: -1 });
invoiceSchema.index({ orgId: 1, 'eInvoice.status': 1 }, { sparse: true });

module.exports = { Invoice: mongoose.model('Invoice', invoiceSchema) };
