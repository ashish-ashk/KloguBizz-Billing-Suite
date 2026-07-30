const mongoose = require('mongoose');

/**
 * A credit note against an issued invoice.
 *
 * Under GST an issued tax invoice cannot be deleted or silently rewritten — it
 * has been given to the customer and reported in a return. A reduction (goods
 * returned, a post-supply discount, an overcharge, a cancelled order) is made
 * by issuing a credit note that references the original invoice, and both
 * documents appear in GSTR-1 (the credit note under CDNR).
 *
 * The product previously had none of this: `deleteInvoice` hard-deleted issued
 * invoices, which destroyed the audit trail and punched a permanent gap in the
 * invoice number series. Phase 1 blocked that delete; this is the sanctioned way
 * to reverse a charge.
 *
 * Line items and totals mirror Invoice deliberately, so the same GST engine
 * prices both and the same renderer can draw both.
 */

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
  // Mirrors Invoice's totals: the classification travels with the document so the
  // CDNR/CDNUR tables can be built without re-deriving it.
  taxTreatment: { type: String, default: 'taxable' },
  supplyType: { type: String, default: 'regular' },
  reverseCharge: { type: Boolean, default: false },
  zeroRated: { type: Boolean, default: false },
  taxCharged: { type: Boolean, default: true },
  taxNote: { type: String, default: '' }
}, { _id: false });

// Reasons recognised by GSTR-1's CDNR table. Kept as an enum because the return
// requires a classification, not free text.
const CREDIT_NOTE_REASONS = [
  'sales-return',
  'post-sale-discount',
  'correction',
  'deficiency-in-service',
  'order-cancelled',
  'other'
];

const creditNoteSchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },
  creditNoteNumber: { type: String, required: true },
  // Always against a specific invoice — a credit note with no original is not a
  // credit note, and GSTR-1's CDNR table requires the original document's
  // number and date.
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true, index: true },
  // Copied at issue time so the credit note stays complete and readable even if
  // the invoice is later amended.
  invoiceNumber: { type: String, required: true },
  invoiceDate: Date,
  // Buyer, mirroring Invoice's two shapes: a registered client reference, or
  // embedded walk-in details.
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
  billTo: {
    type: { type: String, enum: ['b2b-unreg', 'b2c'] },
    name: String,
    phone: String,
    email: String,
    address: String,
    stateCode: String,
    gstin: String
  },
  date: { type: Date, required: true, default: Date.now },
  /**
   * Copied from the invoice being credited.
   *
   * A credit note must be taxed on the same footing as the supply it reverses — an
   * IGST invoice credited as CGST+SGST would move tax between two governments — so
   * these are snapshotted from the original rather than recomputed from the
   * buyer's current address, which may have changed since.
   */
  placeOfSupply: String,
  taxTreatment: { type: String, default: 'taxable' },
  supplyType: { type: String, default: 'regular' },
  reverseCharge: { type: Boolean, default: false },
  reason: { type: String, enum: CREDIT_NOTE_REASONS, default: 'sales-return' },
  reasonNote: String,
  items: { type: [lineItemSchema], default: [] },
  discountPercent: { type: Number, default: 0, min: 0, max: 100 },
  totals: { type: totalsSchema, default: () => ({}) },
  // Drafts can still be edited or deleted. Once issued the document is final —
  // that is the entire point of it existing.
  status: { type: String, enum: ['draft', 'issued'], default: 'issued' },
  notes: String
}, { timestamps: true });

creditNoteSchema.index({ orgId: 1, creditNoteNumber: 1 }, { unique: true });
creditNoteSchema.index({ orgId: 1, date: -1 });
// Drives the "how much of this invoice has already been credited?" check.
creditNoteSchema.index({ invoiceId: 1, status: 1 });

module.exports = { CreditNote: mongoose.model('CreditNote', creditNoteSchema), CREDIT_NOTE_REASONS };
