const mongoose = require('mongoose');

/**
 * A supplier.
 *
 * There was no supplier model and no purchase document anywhere in the product,
 * which is why there was **no input tax credit** and therefore no net GST
 * liability: a GST product without ITC can only ever report what a business
 * collected, never what it actually owes. GSTR-3B is not computable without this.
 *
 * Deliberately close to `Client` in shape — same fields, same validation, same
 * state-code semantics — because a supplier and a customer are the same kind of
 * counterparty seen from opposite ends, and two divergent models would mean two
 * places to fix every GSTIN bug.
 */
const vendorSchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, lowercase: true, trim: true },
  phone: String,
  /**
   * Absent for an unregistered supplier — which is not an edge case: a purchase
   * from an unregistered person can attract **reverse charge**, where the buyer
   * pays the tax. That is precisely why this is optional rather than required.
   */
  gstin: String,
  pan: String,
  address: String,
  state: String,
  stateCode: { type: String, required: true },
  /** Composition dealers charge no GST, so nothing they invoice is claimable. */
  registrationType: {
    type: String,
    enum: ['regular', 'composition', 'unregistered', 'overseas', 'sez'],
    default: 'regular'
  },
  notes: String,
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  // Soft delete (#37) — a vendor referenced by purchases must not vanish.
  deletedAt: { type: Date, default: null },
  deletedBy: String
}, { timestamps: true });

vendorSchema.index({ orgId: 1, name: 1 });
vendorSchema.index({ orgId: 1, gstin: 1 });
vendorSchema.index({ orgId: 1, deletedAt: 1 });

module.exports = { Vendor: mongoose.model('Vendor', vendorSchema) };
