const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },
  itemCode: { type: String, trim: true, uppercase: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  type: { type: String, enum: ['goods', 'service'], default: 'goods' },
  hsn: { type: String, trim: true },
  category: { type: String, trim: true },
  unit: { type: String, trim: true, default: 'Nos' },
  // No hardcoded enum here on purpose. It used to be `enum: [0,5,12,18,28]`,
  // which meant the super admin could add a slab in Masters (3% applies to gold
  // and jewellery) and the API would then reject the very rate they had just
  // configured. The valid set now comes from the Master collection, checked in
  // services/masterService.js.
  gstRate: { type: Number, default: 18, min: 0, max: 100 },
  cessRate: { type: Number, default: 0 },
  sellingPrice: { type: Number, required: true },
  mrp: Number,
  purchasePrice: Number,
  taxInclusive: { type: Boolean, default: false },
  stockQty: { type: Number, default: 0 },

  /**
   * What the stock on hand cost, cached from the open cost layers (2.5 #41).
   *
   * Cached for the same reason `stockQty` is: the authoritative answer is a sum
   * over `StockLayer`, and running that for every row of the catalogue list, on
   * every page load, to show one column is not a trade anyone would make. Like
   * `stockQty` it is always rebuildable — `stockValuationService.recomputeItem`
   * restores it from the layers, so a lost update is repairable rather than
   * permanent.
   *
   * Deliberately **not** derived from `sellingPrice` or `purchasePrice`. Those
   * are catalogue fields a person types; this is what the goods actually cost,
   * which is the only figure a gross-profit number can be built on.
   */
  stockValue: { type: Number, default: 0 },

  reorderLevel: Number,

  /**
   * Whether receipts of this item must carry a batch number and expiry date
   * (2.5 #42).
   *
   * Off by default and per-item rather than per-tenant: a pharmacy tracks
   * batches on medicines and not on carry bags, and a tenant forced to answer
   * "which batch?" for a carry bag will start typing anything to get past the
   * field, which is worse than not asking.
   */
  trackBatches: { type: Boolean, default: false },

  /**
   * Scanned or typed. Unique per tenant where present (see the partial index
   * below) — a barcode that resolves to two items is worse than none, because
   * the scan silently picks one.
   */
  barcode: { type: String, trim: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  // Soft delete (#37) — an item named on a historic invoice should stay
  // resolvable, and a mis-click on a catalogue of hundreds should be undoable.
  deletedAt: { type: Date, default: null },
  deletedBy: String
}, { timestamps: true });

itemSchema.index({ orgId: 1, name: 1 });
itemSchema.index({ orgId: 1, itemCode: 1 });
itemSchema.index({ orgId: 1, deletedAt: 1 });

/**
 * One barcode, one item — enforced by the database rather than by a check in the
 * controller, because the check loses the race between two people saving at once
 * and the whole value of a barcode is that scanning it is unambiguous.
 *
 * **Partial**, on three conditions that each matter:
 *   - `barcode` present and non-empty. Most items have none, and a plain unique
 *     index would let exactly one of them exist — every subsequent item without
 *     a barcode would collide on `null`.
 *   - `deletedAt: null`. A deleted item must not reserve its barcode forever;
 *     re-adding a discontinued product is normal.
 */
itemSchema.index(
  { orgId: 1, barcode: 1 },
  {
    unique: true,
    partialFilterExpression: {
      barcode: { $type: 'string', $gt: '' },
      deletedAt: null
    }
  }
);

module.exports = { Item: mongoose.model('Item', itemSchema) };
