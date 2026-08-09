const mongoose = require('mongoose');

/**
 * A place stock physically sits (2.5 #42).
 *
 * Deliberately the last inventory feature built, and the reason is worth
 * recording: locations turn every balance question from "per item" into "per
 * item per location", and give every cost layer and every ledger row another
 * dimension. Building them before valuation would have meant designing the layer
 * model twice.
 *
 * ── The boundary this model does not cross ────────────────────────────
 *
 * **A location is a place within one GST registration, not a branch.** Under
 * Indian GST a business storing goods in another state needs a separate
 * registration there, and moving stock to it is a *supply* between distinct
 * persons — it needs a tax invoice, it appears in GSTR-1, and it attracts IGST.
 * That is the multi-GSTIN work deliberately deferred in 2.1 #9, and it is a
 * different feature that happens to look like this one.
 *
 * So a location must sit in the organisation's own state, and creating one
 * elsewhere is refused with an explanation rather than accepted and mis-taxed. A
 * silent inter-state "transfer" would understate output tax, which is the
 * direction that produces a demand notice years later.
 */
const stockLocationSchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },

  name: { type: String, required: true, trim: true },
  /** Short label for tables and transfer notes, e.g. `MUM-1`. */
  code: { type: String, trim: true, uppercase: true },
  address: { type: String, trim: true },

  /**
   * Kept even though it must equal the organisation's.
   *
   * Storing it makes the constraint checkable rather than assumed, and it is the
   * field that becomes meaningful on the day branches ship — at which point a
   * location belongs to a branch and this is inherited from the branch's GSTIN
   * instead of the organisation's.
   */
  stateCode: { type: String, trim: true },

  /**
   * The one used when nothing says otherwise.
   *
   * Every existing document predates locations, and every future one that does
   * not name a location has to mean *something*. "The default" is the only
   * answer that leaves historical data untouched — the same reasoning that made
   * a missing `planVersion` mean "the live plan" (3.3 #9).
   */
  isDefault: { type: Boolean, default: false },

  status: { type: String, enum: ['active', 'archived'], default: 'active' },
  note: { type: String, trim: true }
}, { timestamps: true });

/** Names are unique per tenant, so two godowns cannot both be called "Main" and
 *  make a transfer form ambiguous. */
stockLocationSchema.index({ orgId: 1, name: 1 }, { unique: true });
stockLocationSchema.index({ orgId: 1, status: 1 });

module.exports = { StockLocation: mongoose.model('StockLocation', stockLocationSchema) };
