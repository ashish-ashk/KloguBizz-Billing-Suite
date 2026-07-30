const mongoose = require('mongoose');
const { Item } = require('../models/Item');
const { StockMovement } = require('../models/StockMovement');
const { logger } = require('../utils/logger');

/**
 * Stock movement (2.5 #37–#40).
 *
 * The design decision that matters here is **how a line item is matched to a catalogue
 * item**, because an invoice line does not reference one. `Invoice.items` is a snapshot
 * (`desc`, `hsn`, `qty`, `rate`) with no `itemId`, deliberately — an invoice must keep
 * reading correctly after the catalogue changes underneath it.
 *
 * So matching is best-effort and *conservative*: an unmatched line moves no stock at
 * all rather than guessing. Silently decrementing the wrong item would be far worse
 * than not tracking a line, because the resulting balance is wrong in a way nobody can
 * trace — which is the exact failure the ledger exists to prevent. Matched lines are
 * reported back to the caller so the count can be surfaced instead of assumed.
 *
 * Services are skipped: a service has no stock, and decrementing one produces a
 * meaningless negative balance on every consulting invoice.
 */

/** Only these move stock. A service or a zero-quantity line does not. */
function isStockTracked(item) {
  return item && item.type !== 'service';
}

/**
 * Resolves invoice/purchase lines to catalogue items.
 *
 * Matched on `itemCode` first (explicit and unique per tenant), then on an exact,
 * case-insensitive name. Nothing fuzzier: a near-match on a product name is how the
 * wrong item's balance gets moved.
 */
async function matchLinesToItems(orgId, lines = []) {
  const codes = [];
  const names = [];
  for (const line of lines) {
    if (line?.itemCode) codes.push(String(line.itemCode).trim().toUpperCase());
    if (line?.desc) names.push(String(line.desc).trim());
  }
  if (!codes.length && !names.length) return { matched: [], unmatched: lines.length };

  const candidates = await Item.find({
    orgId,
    deletedAt: null,
    $or: [
      ...(codes.length ? [{ itemCode: { $in: codes } }] : []),
      // Anchored and escaped: an unescaped product name containing regex characters
      // would either throw or match far more than intended.
      ...(names.length ? [{ name: { $in: names.map(name => new RegExp(`^${escapeRegex(name)}$`, 'i')) } }] : [])
    ]
  }).select('_id name itemCode type stockQty reorderLevel').lean();

  const byCode = new Map(candidates.filter(c => c.itemCode).map(c => [c.itemCode.toUpperCase(), c]));
  const byName = new Map(candidates.map(c => [c.name.trim().toLowerCase(), c]));

  const matched = [];
  let unmatched = 0;
  for (const line of lines) {
    const quantity = Number(line?.qty) || 0;
    if (quantity <= 0) continue;
    const item = (line.itemCode && byCode.get(String(line.itemCode).trim().toUpperCase()))
      || byName.get(String(line.desc || '').trim().toLowerCase());
    if (!item || !isStockTracked(item)) {
      unmatched += 1;
      continue;
    }
    matched.push({ item, quantity });
  }
  return { matched, unmatched };
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Posts one movement and moves the cached balance.
 *
 * `$inc` rather than a computed write: two concurrent sales of the same item would
 * otherwise read the same balance and one would overwrite the other's decrement. The
 * returned document gives the post-movement balance, which is what goes on the ledger
 * row — so the row is accurate even under concurrency.
 */
async function postMovement({ orgId, item, quantity, reason, documentType, documentId, documentNumber, note, actorName }) {
  const updated = await Item.findOneAndUpdate(
    { _id: item._id, orgId },
    { $inc: { stockQty: quantity } },
    { new: true }
  ).select('stockQty reorderLevel name').lean();

  await StockMovement.create({
    orgId,
    itemId: item._id,
    itemName: item.name,
    reason,
    quantity,
    balanceAfter: updated?.stockQty ?? null,
    documentType,
    documentId,
    documentNumber,
    note,
    actorName
  });

  return updated;
}

/**
 * Records the stock effect of a document.
 *
 * Fire-and-forget from the caller's perspective — it is awaited so the response can
 * report how many lines moved, but a failure is logged and swallowed rather than
 * failing the invoice. An invoice that was legitimately issued must not be rejected
 * because the stock ledger had a bad minute; the ledger can be corrected, an unissued
 * invoice cannot be un-refused.
 */
async function applyDocument({
  req, orgId, lines, direction, reason, documentType, documentId, documentNumber
}) {
  try {
    const { matched, unmatched } = await matchLinesToItems(orgId, lines);
    if (!matched.length) return { moved: 0, unmatched, lowStock: [] };

    // Idempotence: a cancel followed by another cancel, or a retried request, must not
    // post the reversal twice.
    if (documentId) {
      const existing = await StockMovement.findOne({ orgId, documentId, reason }).select('_id').lean();
      if (existing) return { moved: 0, unmatched, lowStock: [], alreadyApplied: true };
    }

    const lowStock = [];
    for (const { item, quantity } of matched) {
      const updated = await postMovement({
        orgId,
        item,
        quantity: direction * quantity,
        reason,
        documentType,
        documentId,
        documentNumber,
        actorName: req?.user?.name
      });
      // Reported rather than merely stored: a reorder level nobody is told about is the
      // same dead field this service was written to fix.
      const level = updated?.reorderLevel;
      if (typeof level === 'number' && level > 0 && (updated.stockQty ?? 0) <= level) {
        lowStock.push({ itemId: item._id, name: updated.name, stockQty: updated.stockQty, reorderLevel: level });
      }
    }
    return { moved: matched.length, unmatched, lowStock };
  } catch (error) {
    (req?.log || logger).error('stock movement failed', { err: error, documentType, documentNumber });
    return { moved: 0, unmatched: 0, lowStock: [], failed: true };
  }
}

/** An issued invoice takes stock out. */
function applyInvoice(req, invoice) {
  return applyDocument({
    req,
    orgId: invoice.orgId,
    lines: invoice.items,
    direction: -1,
    reason: 'sale',
    documentType: 'invoice',
    documentId: invoice._id,
    documentNumber: invoice.invoiceNumber
  });
}

/** Cancelling it puts the stock back. */
function reverseInvoice(req, invoice) {
  return applyDocument({
    req,
    orgId: invoice.orgId,
    lines: invoice.items,
    direction: 1,
    reason: 'sale-reversed',
    documentType: 'invoice',
    documentId: invoice._id,
    documentNumber: invoice.invoiceNumber
  });
}

/**
 * A credit note returns goods.
 *
 * Only the quantities on the note, not the whole invoice — a partial credit returns
 * part of the goods, and treating it as a full reversal would inflate stock by the
 * difference.
 */
function applyCreditNote(req, note) {
  return applyDocument({
    req,
    orgId: note.orgId,
    lines: note.items,
    direction: 1,
    reason: 'return',
    documentType: 'credit-note',
    documentId: note._id,
    documentNumber: note.creditNoteNumber
  });
}

/** A purchase brings stock in. */
function applyPurchase(req, purchase) {
  return applyDocument({
    req,
    orgId: purchase.orgId,
    lines: purchase.items,
    direction: 1,
    reason: 'purchase',
    documentType: 'purchase',
    documentId: purchase._id,
    documentNumber: purchase.billNumber
  });
}

/**
 * A manual correction.
 *
 * Posted as a movement like everything else, with a mandatory note, rather than by
 * editing `stockQty` directly — which is what the Inventory page used to do and is why
 * the number could never be explained.
 */
async function adjust({ req, orgId, itemId, quantity, reason = 'adjustment', note }) {
  const item = await Item.findOne({ _id: itemId, orgId, deletedAt: null }).select('_id name type').lean();
  if (!item) {
    const error = new Error('Item not found');
    error.statusCode = 404;
    throw error;
  }
  if (!isStockTracked(item)) {
    const error = new Error('A service has no stock to adjust.');
    error.statusCode = 400;
    error.code = 'NOT_STOCKED';
    throw error;
  }
  const updated = await postMovement({
    orgId,
    item,
    quantity: Number(quantity),
    reason,
    documentType: 'manual',
    note,
    actorName: req?.user?.name
  });
  return { item: updated, stockQty: updated?.stockQty ?? 0 };
}

/**
 * Rebuilds an item's balance from the ledger.
 *
 * The reason a cached counter is safe: it can always be recomputed from the immutable
 * rows, so a lost `$inc` (a crash between the two writes) is repairable rather than
 * permanent.
 */
async function recomputeBalance(orgId, itemId) {
  /**
   * Both ids are cast explicitly.
   *
   * Mongoose casts a string id for `find`, but **not** inside an aggregation `$match` —
   * the pipeline goes to the server as written, so a string never matches an ObjectId and
   * the sum comes back empty. That reads as "this item has no movements", which would
   * make the repair path silently *zero* a balance it was asked to rebuild: strictly worse
   * than not offering the repair at all.
   */
  const [row] = await StockMovement.aggregate([
    {
      $match: {
        orgId: new mongoose.Types.ObjectId(String(orgId)),
        itemId: new mongoose.Types.ObjectId(String(itemId))
      }
    },
    { $group: { _id: null, balance: { $sum: '$quantity' } } }
  ]);
  const balance = row?.balance ?? 0;
  await Item.updateOne({ _id: itemId, orgId }, { $set: { stockQty: balance } });
  return balance;
}

module.exports = {
  isStockTracked,
  matchLinesToItems,
  applyInvoice,
  reverseInvoice,
  applyCreditNote,
  applyPurchase,
  adjust,
  recomputeBalance
};
