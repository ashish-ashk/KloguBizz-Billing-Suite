/**
 * Gives existing stock a cost, so valuation starts from a defensible number
 * rather than from zero (2.5 #41).
 *
 * Every item with stock on hand today has a quantity and no cost behind it —
 * cost layers did not exist when those movements were posted. Left alone, the
 * first sale of that stock would report a cost of goods sold of **zero**, i.e.
 * pure profit, and the item's quantity and value would disagree from the moment
 * valuation went live. That is a worse starting state than having no valuation
 * at all, because the numbers look complete.
 *
 * ── What this can and cannot recover ──────────────────────────────────
 *
 * The honest position: **the true historical cost is not recoverable**, and this
 * does not pretend otherwise. Existing `StockMovement` rows carry no cost and no
 * reference back to the purchase line that created them; the link from a
 * purchase line to a catalogue item is reconstructed at runtime by matching the
 * line's description to the item's name, so anything renamed since is already
 * lost. Re-deriving per-layer costs from purchase history would produce a number
 * that is precise, auditable-looking, and wrong for an unknowable subset of
 * items.
 *
 * So each item gets **one opening layer** for its current balance, valued at the
 * best figure available, in this order:
 *
 *   1. The net unit cost of that item's **most recent purchase line** — real,
 *      derived from an actual bill, and correct for anything bought recently at
 *      a stable price.
 *   2. The catalogue's `purchasePrice` — a figure somebody typed, which is
 *      exactly why it ranks below a real bill.
 *   3. Zero, with the item counted in the report so it can be seen and fixed.
 *
 * The layer is dated to the item's creation rather than to now, so it sits at
 * the back of the FIFO queue where opening stock belongs and does not jump ahead
 * of purchases entered afterwards.
 *
 * Idempotent: an item that already has a layer is skipped, so a re-run after a
 * partial failure resumes rather than double-counting.
 */

const gst = require('../services/gstService');

function round(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

/**
 * The net acquisition cost on a purchase line, tax excluded.
 *
 * Uses the same tax engine the purchase totals use, so an inclusive-rate or
 * discounted line is netted down identically here and at runtime.
 */
function unitCostFromLine(line) {
  const qty = Number(line?.qty) || 0;
  if (qty <= 0) return 0;
  try {
    return round(gst.calculateLine(line, 0, 'purchase.item').taxable / qty);
  } catch {
    return round(Number(line?.rate) || 0);
  }
}

module.exports = {
  description: 'Seed opening cost layers for stock already on hand',

  async up(db) {
    const items = db.collection('items');
    const layers = db.collection('stocklayers');
    const purchases = db.collection('purchases');

    const report = { examined: 0, seeded: 0, skipped: 0, fromPurchase: 0, fromCatalogue: 0, uncosted: [] };

    const cursor = items.find({
      type: { $ne: 'service' },
      stockQty: { $gt: 0 }
    });

    for await (const item of cursor) {
      report.examined += 1;

      const already = await layers.findOne({ orgId: item.orgId, itemId: item._id });
      if (already) { report.skipped += 1; continue; }

      /**
       * The most recent bill that mentions this item by name.
       *
       * Matched the same conservative way the runtime matcher does — exact,
       * case-insensitive, on the line description — so this migration cannot
       * attribute a cost the running system would not have attributed. An
       * unescaped name would either throw or match far more than intended, hence
       * the anchor and the escape.
       */
      const escaped = String(item.name || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const recent = escaped
        ? await purchases.find({
          orgId: item.orgId,
          status: { $ne: 'draft' },
          deletedAt: null,
          'items.desc': new RegExp(`^${escaped}$`, 'i')
        }).sort({ billDate: -1 }).limit(1).next()
        : null;

      let unitCost = 0;
      let source = 'none';

      const line = recent?.items?.find(l => String(l?.desc || '').trim().toLowerCase() === String(item.name).trim().toLowerCase());
      if (line) {
        unitCost = unitCostFromLine(line);
        if (unitCost > 0) source = 'purchase';
      }
      if (source === 'none' && Number(item.purchasePrice) > 0) {
        unitCost = round(item.purchasePrice);
        source = 'catalogue';
      }

      const quantity = round(item.stockQty);
      const value = round(quantity * unitCost);

      await layers.insertOne({
        orgId: item.orgId,
        itemId: item._id,
        unitCost,
        quantity,
        remaining: quantity,
        sourceType: 'opening',
        sourceNumber: `opening:${source}`,
        // Behind everything bought since, which is where opening stock belongs.
        receivedAt: item.createdAt || new Date(0),
        expiryDate: null,
        closedAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await items.updateOne({ _id: item._id }, { $set: { stockValue: value } });

      report.seeded += 1;
      if (source === 'purchase') report.fromPurchase += 1;
      else if (source === 'catalogue') report.fromCatalogue += 1;
      else report.uncosted.push({ itemId: String(item._id), name: item.name, quantity });
    }

    // Items with stock but no cost anywhere are the ones a human has to look at.
    // Capped so a tenant with a thousand of them does not produce an unreadable
    // migration log; the count is what matters, the sample is a starting point.
    if (report.uncosted.length > 20) {
      report.uncostedTotal = report.uncosted.length;
      report.uncosted = report.uncosted.slice(0, 20);
    }

    // Items with no stock still need the field, or the valuation report has to
    // treat "absent" and "zero" as the same thing at every read site.
    await items.updateMany({ stockValue: { $exists: false } }, { $set: { stockValue: 0 } });

    return report;
  }
};
