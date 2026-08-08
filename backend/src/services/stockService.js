const mongoose = require('mongoose');
const { Item } = require('../models/Item');
const { StockMovement } = require('../models/StockMovement');
const valuation = require('./stockValuationService');
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
    // The line itself is carried, not just the quantity. It is where the cost
    // lives — `rate`, `discountPercent`, `taxInclusive` — and dropping it here
    // was why stock could be counted but never valued (2.5 #41).
    matched.push({ item, quantity, line });
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
async function postMovement({
  orgId, item, quantity, reason, documentType, documentId, documentNumber, note, actorName,
  unitCost = null, value = null, consumed, layerId = null, valuationMethod = null,
  batchNumber, expiryDate
}) {
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
    actorName,
    unitCost,
    value,
    consumed: consumed?.length ? consumed : undefined,
    layerId,
    valuationMethod,
    batchNumber,
    expiryDate
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
  req, orgId, lines, direction, reason, documentType, documentId, documentNumber,
  /** Where the goods came from, for valuation: `'purchase'` creates cost layers
   *  from the line rates, `'restore'` puts back what a prior outbound movement
   *  took, and an outbound movement consumes. */
  costing = 'none',
  /** The document whose consumption a restore should unwind — the invoice, for
   *  both a cancellation and a credit note against it. */
  restoreFromDocumentId = null,
  receivedAt = null
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

    const policy = await valuation.getPolicy(orgId);
    // Loaded once per document rather than per line: a five-line invoice against
    // three tracked items would otherwise re-read the same movements three times.
    const priorConsumption = costing === 'restore' && restoreFromDocumentId
      ? await loadConsumption(orgId, restoreFromDocumentId)
      : new Map();

    const lowStock = [];
    const shortfalls = [];
    let totalValue = 0;

    for (const { item, quantity, line } of matched) {
      const costed = await costMovement({
        orgId, item, quantity, line, costing, policy,
        documentId, documentNumber, receivedAt, priorConsumption
      });
      if (costed.shortfall) shortfalls.push({ itemId: item._id, name: item.name, quantity: costed.shortfall });

      const updated = await postMovement({
        orgId,
        item,
        quantity: direction * quantity,
        reason,
        documentType,
        documentId,
        documentNumber,
        actorName: req?.user?.name,
        unitCost: costed.unitCost,
        value: costed.value === null ? null : direction * costed.value,
        consumed: costed.consumed,
        layerId: costed.layerId,
        valuationMethod: costing === 'none' ? null : policy.valuationMethod,
        batchNumber: costed.batchNumber,
        expiryDate: costed.expiryDate
      });

      if (costed.value !== null) {
        // The cached value moves with the goods. Rebuildable by
        // `valuation.recomputeItem`, exactly like `stockQty`.
        await valuation.bumpItemValue(orgId, item._id, direction * costed.value);
        totalValue = valuation.round(totalValue + costed.value);
      }

      // Reported rather than merely stored: a reorder level nobody is told about is the
      // same dead field this service was written to fix.
      const level = updated?.reorderLevel;
      if (typeof level === 'number' && level > 0 && (updated.stockQty ?? 0) <= level) {
        lowStock.push({ itemId: item._id, name: updated.name, stockQty: updated.stockQty, reorderLevel: level });
      }
    }
    return { moved: matched.length, unmatched, lowStock, value: totalValue, shortfalls };
  } catch (error) {
    (req?.log || logger).error('stock movement failed', { err: error, documentType, documentNumber });
    return { moved: 0, unmatched: 0, lowStock: [], failed: true };
  }
}

/**
 * Works out what one line's movement costs, and moves the cost layers to match.
 *
 * Split out of `applyDocument` because the four cases genuinely differ and
 * inlining them turned the loop into a thicket of conditionals. Each returns the
 * same shape so the caller does not care which ran.
 */
async function costMovement({
  orgId, item, quantity, line, costing, policy, documentId, documentNumber, receivedAt, priorConsumption
}) {
  const empty = { unitCost: null, value: null, consumed: undefined, layerId: null, shortfall: 0 };

  if (costing === 'purchase') {
    const unitCost = valuation.unitCostFromLine(line);
    const layer = await valuation.receive({
      orgId,
      itemId: item._id,
      quantity,
      unitCost,
      sourceType: 'purchase',
      sourceId: documentId,
      sourceNumber: documentNumber,
      receivedAt: receivedAt || new Date(),
      batchNumber: line?.batchNumber,
      expiryDate: line?.expiryDate || null,
      valuationMethod: policy.valuationMethod
    });
    return {
      unitCost,
      value: valuation.round(quantity * unitCost),
      consumed: undefined,
      layerId: layer?._id || null,
      shortfall: 0,
      batchNumber: line?.batchNumber,
      expiryDate: line?.expiryDate || null
    };
  }

  if (costing === 'consume') {
    const drawn = await valuation.consume({
      orgId, itemId: item._id, quantity, consumeByExpiry: policy.consumeByExpiry
    });
    return {
      unitCost: drawn.unitCost,
      value: drawn.value,
      consumed: drawn.consumed,
      layerId: null,
      shortfall: drawn.shortfall
    };
  }

  if (costing === 'restore') {
    /**
     * Goods coming back go to the layers they left from.
     *
     * A credit note can be partial, so only that share of the original
     * consumption is restored — proportionally across the layers the sale drew
     * on, which is the only allocation that keeps the remaining stock's value
     * consistent with what is still out with the customer.
     */
    const prior = priorConsumption.get(String(item._id));
    if (prior?.consumed?.length && prior.quantity > 0) {
      const share = Math.min(1, quantity / prior.quantity);
      const slice = prior.consumed
        .map(entry => ({ ...entry, quantity: valuation.round(entry.quantity * share) }))
        .filter(entry => entry.quantity > 0);
      const restored = await valuation.restore({
        orgId, itemId: item._id, consumed: slice, sourceType: 'return', sourceId: documentId, sourceNumber: documentNumber
      });
      return { ...empty, unitCost: restored.unitCost, value: restored.value, consumed: undefined };
    }

    // No recorded consumption to unwind — a return against a sale made before
    // valuation existed, or against a line that never matched. Value it at what
    // the item last cost rather than at nothing, and let it become a real layer
    // so it can be sold again.
    const unitCost = await valuation.lastKnownCost(orgId, item._id);
    const layer = await valuation.receive({
      orgId,
      itemId: item._id,
      quantity,
      unitCost,
      sourceType: 'return',
      sourceId: documentId,
      sourceNumber: documentNumber,
      receivedAt: new Date(),
      valuationMethod: policy.valuationMethod
    });
    return { ...empty, unitCost, value: valuation.round(quantity * unitCost), layerId: layer?._id || null };
  }

  return empty;
}

/**
 * What a document's outbound movements consumed, per item.
 *
 * Read back off the ledger rather than recomputed, because the ledger is where
 * the answer was written down at the time — recomputing it today would use
 * today's layers and today's costs, which is precisely the mistake this is here
 * to avoid.
 */
async function loadConsumption(orgId, documentId) {
  const rows = await StockMovement.find({
    orgId, documentId, quantity: { $lt: 0 }
  }).select('itemId quantity consumed').lean();

  const byItem = new Map();
  for (const row of rows) {
    const key = String(row.itemId);
    const existing = byItem.get(key) || { quantity: 0, consumed: [] };
    existing.quantity += Math.abs(row.quantity);
    if (row.consumed?.length) existing.consumed.push(...row.consumed);
    byItem.set(key, existing);
  }
  return byItem;
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
    documentNumber: invoice.invoiceNumber,
    // Draws down cost layers, so the movement carries the cost of goods sold —
    // the figure gross profit is computed from.
    costing: 'consume'
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
    documentNumber: invoice.invoiceNumber,
    // Back to the layers this invoice drew from, at the cost it drew at — see
    // costMovement's 'restore' branch for why today's cost would be wrong.
    costing: 'restore',
    restoreFromDocumentId: invoice._id
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
    documentNumber: note.creditNoteNumber,
    costing: 'restore',
    // The *invoice's* consumption, not the note's — the note is what comes back,
    // the invoice is where it went out from.
    restoreFromDocumentId: note.invoiceId
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
    documentNumber: purchase.billNumber,
    // The only place a true acquisition cost exists, so this is where cost
    // layers are born.
    costing: 'purchase',
    // The bill's own date, not today's: a bill entered late must take its place
    // in the FIFO queue by when the goods arrived.
    receivedAt: purchase.billDate || null
  });
}

/**
 * A manual correction.
 *
 * Posted as a movement like everything else, with a mandatory note, rather than by
 * editing `stockQty` directly — which is what the Inventory page used to do and is why
 * the number could never be explained.
 */
async function adjust({
  req, orgId, itemId, quantity, reason = 'adjustment', note,
  /** What the added goods cost. Only meaningful when adding. */
  unitCost, batchNumber, expiryDate
}) {
  const item = await Item.findOne({ _id: itemId, orgId, deletedAt: null })
    .select('_id name type purchasePrice trackBatches').lean();
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

  const delta = Number(quantity);
  const policy = await valuation.getPolicy(orgId);
  let costed = { unitCost: null, value: null, consumed: undefined, layerId: null };

  if (delta > 0) {
    /**
     * Stock added by hand still has to cost something.
     *
     * Without this, a positive adjustment creates units with no layer behind
     * them — they would sell at a cost of zero and report as pure profit, and
     * the item's quantity and its value would drift apart permanently. The
     * caller may state the cost; otherwise the last cost paid is the most
     * defensible figure available.
     */
    const cost = Number.isFinite(Number(unitCost)) && Number(unitCost) >= 0
      ? valuation.round(unitCost)
      : await valuation.lastKnownCost(orgId, item._id);
    const layer = await valuation.receive({
      orgId,
      itemId: item._id,
      quantity: delta,
      unitCost: cost,
      sourceType: reason === 'opening' ? 'opening' : 'adjustment',
      sourceNumber: reason,
      receivedAt: new Date(),
      batchNumber,
      expiryDate,
      valuationMethod: policy.valuationMethod
    });
    costed = { unitCost: cost, value: valuation.round(delta * cost), consumed: undefined, layerId: layer?._id || null };
  } else if (delta < 0) {
    // Goods written off — damage, shrinkage, a recount. They leave at what they
    // cost, so the loss lands in the right place rather than as an unexplained
    // quantity change.
    const drawn = await valuation.consume({
      orgId, itemId: item._id, quantity: Math.abs(delta), consumeByExpiry: policy.consumeByExpiry
    });
    costed = { unitCost: drawn.unitCost, value: drawn.value, consumed: drawn.consumed, layerId: null };
  }

  const updated = await postMovement({
    orgId,
    item,
    quantity: delta,
    reason,
    documentType: 'manual',
    note,
    actorName: req?.user?.name,
    unitCost: costed.unitCost,
    value: costed.value === null ? null : (delta > 0 ? costed.value : -costed.value),
    consumed: costed.consumed,
    layerId: costed.layerId,
    valuationMethod: policy.valuationMethod,
    batchNumber,
    expiryDate
  });

  if (costed.value !== null) {
    await valuation.bumpItemValue(orgId, item._id, delta > 0 ? costed.value : -costed.value);
  }

  return { item: updated, stockQty: updated?.stockQty ?? 0, unitCost: costed.unitCost, value: costed.value };
}

/**
 * Takes back the stock a purchase brought in.
 *
 * This closed a real gap: deleting a purchase soft-deleted the bill and left its
 * goods on the shelf forever. `purchase-reversed` has been in the reason enum
 * since the ledger was written and was never once emitted, which is its own kind
 * of tell — the case was thought about and then not finished.
 *
 * Only the **unsold remainder** comes back out. If some of those goods have
 * already been invoiced, removing them would drive the layer negative and change
 * the cost of goods sold on an invoice that has already reached a customer. The
 * consumed portion is reported instead, so the caller can say what could not be
 * undone rather than quietly under-reversing.
 */
async function reversePurchase(req, purchase) {
  try {
    const orgId = purchase.orgId;
    const existing = await StockMovement.findOne({ orgId, documentId: purchase._id, reason: 'purchase-reversed' })
      .select('_id').lean();
    if (existing) return { moved: 0, alreadyApplied: true };

    const { matched } = await matchLinesToItems(orgId, purchase.items);
    if (!matched.length) return { moved: 0 };

    let moved = 0;
    let reversedValue = 0;
    const stranded = [];

    for (const { item } of matched) {
      // Per item, so each item's value change lands on that item. The quantity
      // taken back is whatever the layers actually gave up — **not** the line
      // quantity — because anything already sold cannot be un-received.
      const unwound = await valuation.unwindSource({ orgId, sourceId: purchase._id, itemId: item._id });
      if (unwound.alreadyConsumed > 0) {
        stranded.push({ itemId: item._id, name: item.name, quantity: unwound.alreadyConsumed });
      }
      if (unwound.quantity <= 0) continue;

      await postMovement({
        orgId,
        item,
        quantity: -unwound.quantity,
        reason: 'purchase-reversed',
        documentType: 'purchase',
        documentId: purchase._id,
        documentNumber: purchase.billNumber,
        actorName: req?.user?.name,
        unitCost: unwound.quantity > 0 ? valuation.round(unwound.value / unwound.quantity) : null,
        value: -unwound.value,
        note: unwound.alreadyConsumed > 0
          ? `${unwound.alreadyConsumed} already sold and could not be reversed`
          : undefined
      });
      await valuation.bumpItemValue(orgId, item._id, -unwound.value);
      moved += 1;
      reversedValue = valuation.round(reversedValue + unwound.value);
    }

    return { moved, reversedValue, stranded };
  } catch (error) {
    (req?.log || logger).error('purchase stock reversal failed', { err: error, billNumber: purchase?.billNumber });
    return { moved: 0, failed: true };
  }
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
  recomputeBalance,
  reversePurchase
};
