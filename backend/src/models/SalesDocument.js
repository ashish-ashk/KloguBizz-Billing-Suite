const mongoose = require('mongoose');

/**
 * The three pre-invoice sales documents (2.2 #11, #12, #13): a **quotation**, a
 * **proforma invoice** and a **delivery challan**.
 *
 * What they have in common is the reason they live in one collection rather than
 * three: structurally they are identical — a buyer, priced line items, GST
 * totals, and a lifecycle that ends in an invoice. What differs is their *legal
 * meaning* and a little metadata (a quotation expires; a challan carries
 * transport details), not their shape. Three near-identical models would mean
 * three controllers, three sets of GST plumbing and three places to forget to
 * update when the tax engine changes. `Invoice` and `CreditNote` already
 * duplicate the line-item and totals schemas deliberately; a third, fourth and
 * fifth copy is where that stops being reasonable.
 *
 * **None of these is a tax invoice, and that is the property everything else
 * follows from:**
 *
 *  - **They never appear in a GST return.** `gstReturnService` reads `Invoice`
 *    and `CreditNote` only. A quotation in GSTR-1 would declare turnover that
 *    was never supplied; a proforma there would double-count the eventual
 *    invoice. There is a test asserting they stay out.
 *  - **They never move money.** No `amountPaid`, no `balanceDue`, no
 *    `Payment` may reference them, and they are absent from revenue,
 *    receivables and ageing. A quotation is an offer, not a debt.
 *  - **They never move stock.** Including the delivery challan, which is the
 *    one that arguably could: goods physically leave under a challan for job
 *    work or approval, but ownership does not transfer, and a return of unsold
 *    approval goods would then need a compensating movement nobody records.
 *    Stock moves when the *invoice* is raised, which is the point ownership
 *    actually changes — one rule, one place.
 *  - **Each has its own consecutive number series.** Required by GST for
 *    invoices and credit notes; applied here too because a shared counter would
 *    put gaps in the invoice series. See invoiceNumberService's SERIES.
 *
 * The renderer is reused as-is: `pdfService` is already document-agnostic (the
 * `invoiceTitleLabel` override proved that), so a proforma prints with
 * "Proforma Invoice" as its title. That matters legally — printing "Tax
 * Invoice" on a proforma is a misdeclaration.
 */

// Mirrors Invoice's, so the same GST engine prices all of them.
const lineItemSchema = new mongoose.Schema({
  desc: { type: String, required: true },
  hsn: String,
  qty: { type: Number, required: true, min: 0 },
  rate: { type: Number, required: true, min: 0 },
  gstRate: { type: Number, required: true, default: 18 },
  cessRate: { type: Number, default: 0, min: 0 },
  discountPercent: { type: Number, default: 0, min: 0, max: 100 },
  taxInclusive: { type: Boolean, default: false }
}, { _id: false });

const totalsSchema = new mongoose.Schema({
  grossSubtotal: { type: Number, default: 0 },
  discountTotal: { type: Number, default: 0 },
  subtotal: { type: Number, default: 0 },
  cgst: { type: Number, default: 0 },
  sgst: { type: Number, default: 0 },
  igst: { type: Number, default: 0 },
  cess: { type: Number, default: 0 },
  roundOff: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  isIGST: { type: Boolean, default: false },
  isUT: { type: Boolean, default: false },
  taxTreatment: { type: String, default: 'taxable' },
  supplyType: { type: String, default: 'regular' },
  reverseCharge: { type: Boolean, default: false },
  zeroRated: { type: Boolean, default: false },
  taxCharged: { type: Boolean, default: true },
  taxNote: { type: String, default: '' }
}, { _id: false });

const billToSchema = new mongoose.Schema({
  type: { type: String, enum: ['b2b-unreg', 'b2c'] },
  name: String,
  phone: String,
  email: String,
  address: String,
  stateCode: String,
  gstin: String
}, { _id: false });

/**
 * Delivery-challan particulars (GST rule 55).
 *
 * A challan states *why* goods are moving without a tax invoice, and the reason
 * is a classification rather than free text because it determines whether an
 * invoice must eventually follow: `job-work` goods come back, `approval` goods
 * may come back, but `supply-on-approval` that the customer keeps must be
 * invoiced. Recording it as a dropdown is what makes the "challans still
 * awaiting an invoice" list meaningful.
 */
const CHALLAN_PURPOSES = [
  'job-work',
  'approval',
  'supply-on-approval',
  'liquid-gas',
  'semi-knocked-down',
  'exhibition',
  'other'
];

const transportSchema = new mongoose.Schema({
  vehicleNumber: String,
  transporterName: String,
  transporterGstin: String,
  lrNumber: String,
  dispatchedFrom: String,
  shipTo: String,
  /** Distance in km — the figure an e-way bill needs, recorded here so the
   *  e-way-bill work (2.1 #6) has it rather than asking again. */
  distanceKm: { type: Number, min: 0 }
}, { _id: false });

const DOCUMENT_KINDS = ['quotation', 'proforma', 'delivery-challan'];

/**
 * The lifecycle, shared by all three.
 *
 *  - `draft` — being written, freely editable and deletable.
 *  - `sent` — given to the customer. Still editable (a revised quotation is
 *    normal commercial practice, unlike a revised tax invoice).
 *  - `accepted` / `rejected` — the customer's answer. Recorded because "which
 *    quotations did we win" is the only question this document type is
 *    ultimately for.
 *  - `expired` — past `validUntil`. Set by the hourly maintenance sweep *and*
 *    derived at read time, for the same reason overdue invoices are (see
 *    maintenanceService): the figure must be right the instant it lapses, not
 *    whenever a job next runs.
 *  - `converted` — an invoice has been raised from it. Terminal and locked:
 *    it produced a tax document, so editing it afterwards would leave the two
 *    disagreeing about what was agreed.
 */
const DOCUMENT_STATUSES = ['draft', 'sent', 'accepted', 'rejected', 'expired', 'converted'];

const salesDocumentSchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },
  kind: { type: String, enum: DOCUMENT_KINDS, required: true },
  /** Number from this kind's own series, e.g. `QT-2026-001`. */
  documentNumber: { type: String, required: true },

  // Buyer — the same two shapes Invoice supports: a registered client, or
  // embedded details for someone not on file yet.
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
  billTo: billToSchema,

  date: { type: Date, required: true, default: Date.now },
  /**
   * When a quotation stops being an offer.
   *
   * Only meaningful for a quotation, and left null for the other two: a
   * proforma does not expire (it is a request for payment) and neither does a
   * challan (the goods have already moved). Storing it as null rather than
   * inventing a date keeps "has no expiry" distinct from "expires today".
   */
  validUntil: Date,

  status: { type: String, enum: DOCUMENT_STATUSES, default: 'draft' },

  items: { type: [lineItemSchema], default: [] },
  discountPercent: { type: Number, default: 0, min: 0, max: 100 },

  // Classification, resolved by the same gstService.resolveTaxContext the
  // invoice uses — so a quotation for an export quotes the same zero-rated
  // figure the eventual invoice will charge, rather than surprising the
  // customer with tax that appears later.
  placeOfSupply: String,
  taxTreatment: { type: String, default: 'taxable' },
  supplyType: { type: String, default: 'regular' },
  reverseCharge: { type: Boolean, default: false },
  totals: { type: totalsSchema, default: () => ({}) },

  // Challan-only.
  challanPurpose: { type: String, enum: CHALLAN_PURPOSES },
  transport: { type: transportSchema, default: null },

  /**
   * The invoice this document became, and the link back the other way.
   *
   * Both directions are stored because both questions get asked: "what did this
   * quotation turn into" (from the quotation list) and "what was this invoice
   * agreed against" (from the invoice, for a customer query about pricing).
   */
  // `default: null` rather than left absent, matching `deletedAt`: the
  // "awaiting an invoice" filter is `{ convertedToInvoiceId: null }`, which in
  // query language matches both a stored null and a missing field — but an
  // explicit null means the field exists on every row, so an aggregation
  // (`$eq: [..., null]`) and a query agree about it too.
  convertedToInvoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', default: null },
  convertedToInvoiceNumber: String,
  convertedAt: Date,

  notes: String,
  terms: String,
  paymentTerms: { type: String, default: 'Net 15' },

  /** Soft delete (#37), matching the shared convention in utils/softDelete.js. */
  deletedAt: { type: Date, default: null },
  deletedBy: String
}, { timestamps: true });

salesDocumentSchema.index({ orgId: 1, documentNumber: 1 }, { unique: true });
salesDocumentSchema.index({ orgId: 1, kind: 1, status: 1, date: -1 });
salesDocumentSchema.index({ orgId: 1, clientId: 1 });
// Drives the expiry sweep and the "expiring soon" list.
salesDocumentSchema.index({ orgId: 1, kind: 1, validUntil: 1 });
// Recycle-bin listing and the scheduled purge.
salesDocumentSchema.index({ orgId: 1, deletedAt: 1 });
// "Which challans are still awaiting an invoice."
salesDocumentSchema.index({ orgId: 1, kind: 1, convertedToInvoiceId: 1 });

module.exports = {
  SalesDocument: mongoose.model('SalesDocument', salesDocumentSchema),
  DOCUMENT_KINDS,
  DOCUMENT_STATUSES,
  CHALLAN_PURPOSES
};
