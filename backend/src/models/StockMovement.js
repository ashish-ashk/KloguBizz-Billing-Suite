const mongoose = require('mongoose');

/**
 * The stock ledger (2.5 #37–#40).
 *
 * `Item.stockQty` and `Item.reorderLevel` have existed since the first version and
 * **nothing has ever written to them**. The Inventory page shows a stock column that
 * only ever changes when somebody edits it by hand, which is worse than having no
 * stock feature: a number that looks maintained and is not gets trusted.
 *
 * Why a ledger and not just a counter. A single `stockQty` can tell you what the
 * balance is; it cannot tell you *why*, and "why" is the only question anyone asks
 * when the number is wrong. Every change is therefore an immutable row here, and
 * `Item.stockQty` becomes a cached balance the ledger can always rebuild — which also
 * means a concurrent sale cannot lose an adjustment, because each writes its own row
 * and the item's counter is moved with an atomic `$inc` rather than a read-then-write.
 *
 * Movements are signed: a sale is negative, a purchase or a return is positive. One
 * sign convention across the whole ledger means the balance is a `$sum` and never a
 * conditional.
 */

const MOVEMENT_REASONS = [
  'sale',            // an invoice was issued
  'sale-reversed',   // that invoice was cancelled, or credited
  'purchase',        // a purchase invoice was recorded
  'purchase-reversed',
  'opening',         // opening balance when stock tracking starts
  'adjustment',      // a manual correction, with a note
  'damage',
  'return'           // goods came back from a customer
];

const stockMovementSchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true, index: true },
  /** Snapshotted, so the ledger reads on its own after an item is renamed. */
  itemName: String,
  reason: { type: String, enum: MOVEMENT_REASONS, required: true },
  /** Signed: negative reduces stock. */
  quantity: { type: Number, required: true },
  /** The balance *after* this movement, so a ledger row is readable without
   *  re-summing everything above it. */
  balanceAfter: { type: Number, default: null },
  /** What caused it — an invoice, a credit note, a purchase, or nobody. */
  documentType: { type: String, enum: ['invoice', 'credit-note', 'purchase', 'manual'], default: 'manual' },
  documentId: { type: mongoose.Schema.Types.ObjectId },
  documentNumber: String,
  note: String,
  actorName: String
}, { timestamps: true });

stockMovementSchema.index({ orgId: 1, itemId: 1, createdAt: -1 });
stockMovementSchema.index({ orgId: 1, createdAt: -1 });
// A cancelled invoice must not be reversed twice; the reversal looks for an existing
// row with the same document and reason before writing one.
stockMovementSchema.index({ orgId: 1, documentId: 1, reason: 1 });

/**
 * Append-only, for the same reason the audit log is: a ledger that can be edited is
 * not a ledger, it is a second opinion. A wrong movement is corrected by posting an
 * adjustment, which is also how a real stock book works.
 */
function refuseMutation(next) {
  next(new Error('Stock movements are append-only. Post an adjustment to correct one.'));
}
stockMovementSchema.pre('findOneAndUpdate', refuseMutation);
stockMovementSchema.pre('updateOne', refuseMutation);
stockMovementSchema.pre('updateMany', refuseMutation);
stockMovementSchema.pre('save', function guardResave(next) {
  if (!this.isNew) return next(new Error('Stock movements are append-only.'));
  return next();
});

module.exports = { StockMovement: mongoose.model('StockMovement', stockMovementSchema), MOVEMENT_REASONS };
