const mongoose = require('mongoose');
const { Item } = require('../models/Item');
const { StockLayer } = require('../models/StockLayer');
const { Organisation } = require('../models/Organisation');
const gst = require('./gstService');

/**
 * Stock valuation — what the goods cost, not just how many there are (2.5 #41).
 *
 * The ledger already answers "how many and why". This answers "how much", which
 * is the half that gross profit, the balance sheet and the whole of the P&L
 * report depend on. Without it, revenue is known and cost of goods sold is not,
 * so margin cannot be computed at all — only guessed from the catalogue's
 * `purchasePrice`, a field somebody typed once and nobody maintains.
 *
 * ── The three operations ──────────────────────────────────────────────
 *
 * **Receive.** A purchase (or an opening balance, or a positive adjustment)
 * creates a cost layer. Under weighted average it instead *merges* into the
 * item's single open layer at the blended cost, which is what makes one
 * mechanism serve both methods.
 *
 * **Consume.** A sale draws down open layers in order and returns the weighted
 * cost of what it took — the cost of goods sold for that line. Which layers, and
 * how much of each, is recorded on the movement.
 *
 * **Restore.** A cancelled invoice or a credit note puts goods back into the
 * exact layers they came out of, at the cost they left at. This is the operation
 * that justifies recording consumption in the first place; see `restore` below.
 *
 * ── What this does not do ─────────────────────────────────────────────
 *
 * It does not fail a document. Stock and its valuation are bookkeeping *about* a
 * transaction, not part of it: an invoice that was legitimately issued must not
 * be rejected because a cost layer could not be written. Errors propagate to
 * `stockService.applyDocument`, which logs and swallows them, and every number
 * here is rebuildable from the layers by `recomputeItem`.
 */

/** Rounded to paise. Costs are money and accumulate over thousands of
 *  movements; carrying full float error into a balance-sheet figure is how a
 *  valuation ends up ₹0.03 off with no explanation. */
function round(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

/**
 * The tenant's valuation policy.
 *
 * Read per document rather than cached: it changes rarely, but a stale read
 * would silently value one invoice by a method the tenant has stopped using, and
 * a single indexed lookup against an already-hot document is not the bottleneck
 * in issuing an invoice.
 */
async function getPolicy(orgId) {
  const org = await Organisation.findById(orgId).select('inventory').lean();
  return {
    valuationMethod: org?.inventory?.valuationMethod || 'fifo',
    consumeByExpiry: org?.inventory?.consumeByExpiry === true,
    expiryWarningDays: Number.isFinite(org?.inventory?.expiryWarningDays) ? org.inventory.expiryWarningDays : 30
  };
}

/**
 * The net acquisition cost of one unit on a purchase line.
 *
 * Delegated to `gstService.calculateLine` — the same function that computes the
 * purchase's own totals — rather than re-derived here. A second implementation
 * of "strip the inclusive tax, then apply the discount" would drift from the
 * first, and the symptom would be an inventory value that disagrees with the
 * bill it came from by a few percent, which is close enough to look right.
 *
 * **Tax is excluded on purpose.** GST paid on a purchase is an input tax credit,
 * recoverable against output tax; it is not part of what the goods cost.
 * Capitalising it would overstate inventory by the tax rate and overstate cost of
 * goods sold by the same amount when they sell.
 */
function unitCostFromLine(line) {
  const qty = Number(line?.qty) || 0;
  if (qty <= 0) return 0;
  try {
    const computed = gst.calculateLine(line, 0, 'purchase.item');
    // `taxable` is after both the inclusive-tax strip and the line discount.
    return round(computed.taxable / qty);
  } catch {
    // A line the tax engine refuses is still a line that moved stock; valuing it
    // at zero would silently understate inventory, so fall back to the raw rate.
    return round(Number(line?.rate) || 0);
  }
}

/**
 * Records a receipt of goods and returns the layer it produced.
 *
 * Under **weighted average** the receipt is folded into the item's single open
 * layer: quantity and value are added, and the unit cost becomes the blend. The
 * layer keeps its original `receivedAt` so it stays first in the consumption
 * order — under this method there is only ever one open layer anyway, and the
 * ordering is what keeps the two code paths identical downstream.
 */
async function receive({
  orgId, itemId, quantity, unitCost, sourceType, sourceId, sourceNumber,
  receivedAt, batchNumber, expiryDate, valuationMethod
}) {
  const qty = round(quantity);
  if (qty <= 0) return null;
  const cost = Math.max(0, round(unitCost));

  if (valuationMethod === 'weighted-average') {
    /**
     * A batch or an expiry date forces its own layer even under weighted
     * average: those are physical facts about a specific consignment, and
     * blending two batches into one row destroys the ability to say which stock
     * expires when. The cost blending that the method is *for* still happens
     * across the batchless remainder.
     */
    if (!batchNumber && !expiryDate) {
      const open = await StockLayer.findOne({
        orgId, itemId, remaining: { $gt: 0 }, batchNumber: { $in: [null, ''] }, expiryDate: null
      }).sort({ receivedAt: 1 });

      if (open) {
        const blendedQty = round(open.remaining + qty);
        const blendedValue = round(open.remaining * open.unitCost + qty * cost);
        open.quantity = round(open.quantity + qty);
        open.remaining = blendedQty;
        open.unitCost = blendedQty > 0 ? round(blendedValue / blendedQty) : cost;
        await open.save();
        return open;
      }
    }
  }

  return StockLayer.create({
    orgId,
    itemId,
    unitCost: cost,
    quantity: qty,
    remaining: qty,
    sourceType,
    sourceId,
    sourceNumber,
    receivedAt: receivedAt || new Date(),
    batchNumber: batchNumber || undefined,
    expiryDate: expiryDate || null
  });
}

/**
 * Draws `quantity` out of the open layers and reports what it cost.
 *
 * Each layer is claimed with a conditional `$inc` rather than a read-then-write:
 * two sales of the last unit would otherwise both read `remaining: 1`, both
 * decide they can take it, and one would drive the layer negative. The guard
 * `remaining: { $gte: take }` makes the loser's update match nothing, and it
 * simply moves on to the next layer.
 *
 * **Short draws are allowed, not refused.** Stock can legitimately go negative —
 * goods sold before the purchase bill was entered is the single most common
 * thing that happens in a real shop — and refusing to issue the invoice over it
 * would be the software telling the business it is wrong about its own trade.
 * The uncovered quantity is valued at the item's last known cost and reported as
 * `shortfall` so it can be surfaced rather than hidden.
 */
async function consume({ orgId, itemId, quantity, consumeByExpiry }) {
  const wanted = round(quantity);
  if (wanted <= 0) return { consumed: [], quantity: 0, value: 0, unitCost: 0, shortfall: 0 };

  /**
   * First-expiry-first-out, when the tenant has asked for it.
   *
   * Layers with no expiry sort last under Mongo's ordering of `null`, which is
   * the behaviour wanted: dated stock goes before undated stock, and undated
   * stock still goes in receipt order behind it.
   */
  const sort = consumeByExpiry ? { expiryDate: 1, receivedAt: 1 } : { receivedAt: 1, _id: 1 };
  const layers = await StockLayer.find({ orgId, itemId, remaining: { $gt: 0 } }).sort(sort).lean();

  const consumed = [];
  let remainingWanted = wanted;
  let value = 0;

  for (const layer of layers) {
    if (remainingWanted <= 0) break;
    const take = round(Math.min(layer.remaining, remainingWanted));
    if (take <= 0) continue;

    const claimed = await StockLayer.findOneAndUpdate(
      { _id: layer._id, orgId, remaining: { $gte: take } },
      {
        $inc: { remaining: -take },
        // Closing is recorded, not inferred, so "when did this consignment run
        // out" is answerable without replaying the ledger.
        ...(round(layer.remaining - take) <= 0 ? { $set: { closedAt: new Date() } } : {})
      },
      { new: true }
    ).lean();
    if (!claimed) continue;

    consumed.push({ layerId: layer._id, quantity: take, unitCost: layer.unitCost });
    value = round(value + take * layer.unitCost);
    remainingWanted = round(remainingWanted - take);
  }

  let shortfall = 0;
  if (remainingWanted > 0) {
    shortfall = remainingWanted;
    // Nothing on hand to draw from. The last cost paid is the most defensible
    // available estimate, and it is flagged rather than quietly folded in.
    const fallback = await lastKnownCost(orgId, itemId);
    value = round(value + remainingWanted * fallback);
  }

  const takenQty = round(wanted);
  return {
    consumed,
    quantity: takenQty,
    value,
    unitCost: takenQty > 0 ? round(value / takenQty) : 0,
    shortfall
  };
}

/**
 * The most recent cost this item was received at.
 *
 * Used only when a sale outruns the stock on hand. Falls back to the catalogue's
 * `purchasePrice` — a typed field, which is why it is the last resort rather
 * than the first — and to zero, which at least does not invent profit.
 */
async function lastKnownCost(orgId, itemId) {
  const recent = await StockLayer.findOne({ orgId, itemId }).sort({ receivedAt: -1, _id: -1 }).select('unitCost').lean();
  if (recent?.unitCost) return recent.unitCost;
  const item = await Item.findOne({ _id: itemId, orgId }).select('purchasePrice').lean();
  return round(item?.purchasePrice || 0);
}

/**
 * Puts consumed stock back where it came from.
 *
 * This is the operation that makes recording `consumed` on the outbound movement
 * worth the bytes. A cancelled invoice has to return the goods to the layers
 * they left, at the cost they left at — otherwise the alternatives are to create
 * a fresh layer at today's cost, which rewrites the profit of a period that may
 * already be closed and reported, or to guess. Both produce a valuation that
 * looks perfectly reasonable and is wrong.
 *
 * A layer that has since been deleted (it cannot be, today, but the code should
 * not assume that forever) falls through to a replacement layer at the recorded
 * cost, so the value returns even if its original home did not survive.
 */
async function restore({ orgId, itemId, consumed = [], sourceType, sourceId, sourceNumber }) {
  let value = 0;
  let quantity = 0;
  const orphans = [];

  for (const entry of consumed) {
    const qty = round(entry.quantity);
    if (qty <= 0) continue;
    const reopened = await StockLayer.findOneAndUpdate(
      { _id: entry.layerId, orgId },
      { $inc: { remaining: qty }, $set: { closedAt: null } },
      { new: true }
    ).lean();
    if (!reopened) { orphans.push(entry); continue; }
    quantity = round(quantity + qty);
    value = round(value + qty * entry.unitCost);
  }

  for (const entry of orphans) {
    await receive({
      orgId,
      itemId,
      quantity: entry.quantity,
      unitCost: entry.unitCost,
      sourceType: sourceType || 'return',
      sourceId,
      sourceNumber,
      receivedAt: new Date(),
      // Deliberately not merged into a weighted-average layer: this is a
      // reconstruction at a historical cost, and blending it would move the
      // average by an amount that has no transaction behind it.
      valuationMethod: 'fifo'
    });
    quantity = round(quantity + entry.quantity);
    value = round(value + entry.quantity * entry.unitCost);
  }

  return { quantity, value, unitCost: quantity > 0 ? round(value / quantity) : 0 };
}

/**
 * Unwinds the layers a document created — a purchase deleted or cancelled.
 *
 * Only the *unconsumed* remainder can be taken back. If some of it has already
 * been sold, removing it would drive the layer negative and misstate cost of
 * goods sold on an invoice that has already gone to a customer. The consumed
 * portion is reported so the caller can say so rather than silently under-reverse.
 */
async function unwindSource({ orgId, sourceId, itemId }) {
  // Scoped to one item when asked, so a multi-line purchase's reversal can
  // attribute each item's value change to that item rather than lumping the
  // whole bill onto whichever line happened to be first.
  const layers = await StockLayer.find({ orgId, sourceId, ...(itemId ? { itemId } : {}) }).lean();
  let reversedQty = 0;
  let reversedValue = 0;
  let alreadyConsumed = 0;

  for (const layer of layers) {
    const take = round(layer.remaining);
    alreadyConsumed = round(alreadyConsumed + (layer.quantity - layer.remaining));
    if (take <= 0) continue;
    const claimed = await StockLayer.findOneAndUpdate(
      { _id: layer._id, orgId, remaining: { $gte: take } },
      { $inc: { remaining: -take }, $set: { closedAt: new Date() } },
      { new: true }
    ).lean();
    if (!claimed) continue;
    reversedQty = round(reversedQty + take);
    reversedValue = round(reversedValue + take * layer.unitCost);
  }
  return { quantity: reversedQty, value: reversedValue, alreadyConsumed };
}

/**
 * Rebuilds an item's cached `stockValue` from its open layers.
 *
 * The counterpart to `stockService.recomputeBalance`, and the reason caching the
 * value is safe at all: the layers are the truth, so a lost update is repairable
 * rather than permanent.
 */
async function recomputeItem(orgId, itemId) {
  const [row] = await StockLayer.aggregate([
    {
      // Both ids cast explicitly. Mongoose casts strings for `find` but **not**
      // inside an aggregation `$match`, so a string id silently matches nothing —
      // which here would zero the value of an item it was asked to repair.
      $match: {
        orgId: new mongoose.Types.ObjectId(String(orgId)),
        itemId: new mongoose.Types.ObjectId(String(itemId)),
        remaining: { $gt: 0 }
      }
    },
    {
      $group: {
        _id: null,
        value: { $sum: { $multiply: ['$remaining', '$unitCost'] } },
        quantity: { $sum: '$remaining' }
      }
    }
  ]);
  const value = round(row?.value || 0);
  await Item.updateOne({ _id: itemId, orgId }, { $set: { stockValue: value } });
  return { stockValue: value, layeredQty: round(row?.quantity || 0) };
}

/** Applies a value delta to the cached figure without re-summing every layer. */
async function bumpItemValue(orgId, itemId, delta) {
  const change = round(delta);
  if (!change) return;
  await Item.updateOne({ _id: itemId, orgId }, { $inc: { stockValue: change } });
}

module.exports = {
  getPolicy,
  unitCostFromLine,
  receive,
  consume,
  restore,
  unwindSource,
  recomputeItem,
  bumpItemValue,
  lastKnownCost,
  round
};
