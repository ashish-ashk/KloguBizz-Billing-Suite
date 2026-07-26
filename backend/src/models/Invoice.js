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
  isUT: { type: Boolean, default: false }
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
  status: { type: String, enum: ['draft', 'pending', 'partial', 'paid', 'overdue'], default: 'draft' },
  paidDate: Date,
  items: { type: [lineItemSchema], default: [] },
  // Invoice-level discount, on top of any per-line discounts.
  discountPercent: { type: Number, default: 0, min: 0, max: 100 },
  totals: { type: totalsSchema, default: () => ({}) },
  // Settlement state, persisted rather than recomputed ad hoc. Previously the
  // paid amount was aggregated from Payment inside createPayment and then
  // thrown away, so the dashboard had to infer revenue from `status` alone —
  // which reported ₹0 for a ₹1L invoice with ₹90k received, and counted the
  // full total as pending. Kept in sync by
  // invoiceController.recalculateSettlement.
  amountPaid: { type: Number, default: 0, min: 0 },
  balanceDue: { type: Number, default: 0 },
  notes: String,
  paymentTerms: { type: String, default: 'Net 15' },
  bankDetails: {
    bank: String,
    account: String,
    ifsc: String
  }
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

module.exports = { Invoice: mongoose.model('Invoice', invoiceSchema) };
