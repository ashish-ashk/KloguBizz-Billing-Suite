const mongoose = require('mongoose');

/**
 * Cost layers — what the stock on hand actually cost (2.5 #41).
 *
 * The ledger (`StockMovement`) answers *how many*. It cannot answer *how much
 * it is worth*, and that is the question the balance sheet, the P&L and every
 * "what is my inventory worth" report need. A quantity with no cost attached
 * means gross profit cannot be computed at all: revenue is known, cost of goods
 * sold is not.
 *
 * **Why layers rather than a single average on the item.** A weighted average
 * can be kept in two numbers and needs no second collection — but it cannot
 * express FIFO, it cannot be audited ("which receipt did this cost come
 * from?"), and it cannot carry a batch number or an expiry date, which are the
 * next two things this has to support. A layer is one receipt of goods at one
 * cost, and everything else is expressible on top of it:
 *
 *   - **FIFO** consumes the oldest open layer first.
 *   - **Weighted average** merges every receipt into a single open layer at the
 *     blended cost, so consumption trivially takes from that one.
 *
 * One mechanism, one consumption path, and the method is a property of the
 * *receipt* rather than a fork in the code that has to be kept consistent.
 *
 * **Why not `StockMovement` rows as layers.** That collection is deliberately
 * append-only (a ledger that can be edited is a second opinion), and depleting a
 * layer is an update by definition. Keeping them separate lets the ledger stay
 * immutable while layers stay mutable, which is what each of them is for.
 */
const stockLayerSchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true, index: true },

  /**
   * Cost per unit, exclusive of recoverable tax.
   *
   * GST on a purchase is an input tax credit, not a cost — capitalising it would
   * overstate inventory by the tax rate and understate the credit. The net figure
   * comes from `gstService.calculateLine`, the same engine the purchase totals use,
   * so an inclusive-rate or discounted line is netted down exactly once and the
   * same way in both places.
   */
  unitCost: { type: Number, required: true, min: 0 },

  /** How many units this receipt brought in. Never changes. */
  quantity: { type: Number, required: true, min: 0 },

  /**
   * How many are left. Decremented as stock goes out, restored when an outbound
   * movement is reversed. A layer at zero stays for the audit trail rather than
   * being deleted — "where did this cost come from" must remain answerable after
   * the goods are gone.
   */
  remaining: { type: Number, required: true, min: 0 },

  sourceType: { type: String, enum: ['purchase', 'opening', 'adjustment', 'return'], required: true },
  sourceId: { type: mongoose.Schema.Types.ObjectId },
  sourceNumber: String,

  /**
   * When the goods were received, which is what FIFO orders by — deliberately
   * not `createdAt`. A purchase bill entered late must take its place in the
   * queue by its bill date, not by when somebody got round to typing it in.
   */
  receivedAt: { type: Date, required: true },

  /** Batch and expiry (2.5 #42). Optional: most items have neither, and
   *  requiring them would make the common case worse to serve the rare one. */
  batchNumber: { type: String, trim: true },
  expiryDate: { type: Date, default: null },

  closedAt: { type: Date, default: null }
}, { timestamps: true });

/**
 * The consumption query: open layers for one item, oldest first.
 *
 * `remaining` is in the key rather than filtered after, because the overwhelming
 * majority of layers in a mature tenant are closed and scanning them on every
 * sale is the difference between this being free and this being the slowest part
 * of issuing an invoice.
 */
stockLayerSchema.index({ orgId: 1, itemId: 1, remaining: 1, receivedAt: 1 });
/** Expiry reporting, and first-expiry-first-out consumption. */
stockLayerSchema.index({ orgId: 1, expiryDate: 1, remaining: 1 });
/** Reversal: find the layers a given document created. */
stockLayerSchema.index({ orgId: 1, sourceId: 1 });

module.exports = { StockLayer: mongoose.model('StockLayer', stockLayerSchema) };
