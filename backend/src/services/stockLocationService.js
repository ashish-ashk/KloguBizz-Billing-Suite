const mongoose = require('mongoose');
const { StockLocation } = require('../models/StockLocation');
const { StockLayer } = require('../models/StockLayer');
const { StockMovement } = require('../models/StockMovement');
const { Organisation } = require('../models/Organisation');
const { Item } = require('../models/Item');
const valuation = require('./stockValuationService');
const { httpError } = require('../utils/httpError');

/**
 * Warehouses and stock transfers (2.5 #42).
 *
 * See `models/StockLocation.js` for why a location is not a branch. This file is
 * resolution (what "no location given" means), the per-location balances, and
 * the transfer — which is the only genuinely difficult part.
 */

/**
 * The location a document acts on.
 *
 * Every existing invoice, purchase and adjustment predates locations, and every
 * future one that does not name a warehouse still has to mean something.
 * "The default" is the only answer that leaves historical behaviour untouched,
 * and it is created for every tenant by migration 011 — so this returns null
 * only for a tenant whose migration has not run, in which case the callers fall
 * back to the un-scoped behaviour they had before.
 *
 * An explicitly named location that does not exist is an error rather than a
 * silent fallback: a caller who says "Delhi" and gets Mumbai's stock consumed
 * has been given the wrong answer confidently.
 */
async function resolveLocation(orgId, locationId) {
  if (locationId) {
    const named = await StockLocation.findOne({ _id: locationId, orgId }).lean();
    if (!named) throw httpError(400, 'That stock location does not exist.', 'LOCATION_NOT_FOUND');
    if (named.status !== 'active') {
      throw httpError(400, `${named.name} has been archived, so stock cannot move through it.`, 'LOCATION_ARCHIVED');
    }
    return named;
  }
  return StockLocation.findOne({ orgId, isDefault: true, status: 'active' }).lean();
}

/**
 * Refuses a location outside the organisation's own state.
 *
 * Not a nicety. Under GST, storing goods in another state requires a separate
 * registration there, and moving stock to it is a **supply between distinct
 * persons** — a tax invoice, an entry in GSTR-1, and IGST. Accepting it here and
 * treating the move as an internal transfer would understate output tax, which
 * surfaces as a demand years later rather than as an error today.
 *
 * That is the multi-GSTIN work deferred in 2.1 #9. Refusing with an explanation
 * is the honest version of not having built it.
 */
async function assertSameState(orgId, stateCode) {
  if (!stateCode) return;
  const org = await Organisation.findById(orgId).select('stateCode').lean();
  if (!org?.stateCode) return;
  if (String(stateCode) === String(org.stateCode)) return;
  throw httpError(
    400,
    'A stock location in another state needs its own GST registration, and moving stock to it is a taxable supply rather than an internal transfer. Multiple registrations are not supported yet, so this location cannot be created.',
    'LOCATION_OTHER_STATE'
  );
}

/**
 * The same resolution, for callers that must not be able to fail.
 *
 * `resolveLocation` throws on a named location that does not exist or has been
 * archived, which is right **before** a document is created — the caller asked
 * for something specific and got it wrong, and refusing is better than quietly
 * using somewhere else.
 *
 * It is wrong **after**. Issuing an invoice, cancelling one, converting a
 * challan and crediting a sale all move stock as a consequence of a tax document
 * that already exists, and every one of those paths is deliberately built so a
 * ledger problem cannot invalidate the document. Throwing there would return a
 * 500 for an invoice that had already been created and numbered — the exact
 * failure those `.catch()` blocks exist to prevent, reintroduced one line above
 * them.
 *
 * So this falls back to the default and, failing that, to null, which the
 * valuation layer already treats as "wherever".
 */
async function resolveLocationSafely(orgId, locationId) {
  try {
    return await resolveLocation(orgId, locationId);
  } catch {
    return StockLocation.findOne({ orgId, isDefault: true, status: 'active' }).lean().catch(() => null);
  }
}

/**
 * Gives a brand-new tenant its default warehouse.
 *
 * Migration 011 covers every organisation that existed when locations shipped,
 * and this covers every one created afterwards. Without it a new tenant would
 * have no location at all, so their purchases would create layers stamped with
 * `null` — invisible to per-location balances and impossible to transfer, and
 * they would only find out after building up stock they then could not move.
 *
 * Never throws. An organisation without a warehouse row still works exactly as
 * the product did before locations existed, and failing a registration over
 * bookkeeping would be the wrong trade by a wide margin.
 */
async function ensureDefault(orgId, stateCode) {
  try {
    const existing = await StockLocation.findOne({ orgId, isDefault: true }).lean();
    if (existing) return existing;
    return (await StockLocation.create({
      orgId,
      name: 'Main Warehouse',
      code: 'MAIN',
      stateCode: stateCode || '',
      isDefault: true,
      status: 'active'
    })).toObject();
  } catch {
    return null;
  }
}

/** Every location, with what it currently holds. */
async function listWithBalances(orgId) {
  const locations = await StockLocation.find({ orgId }).sort({ isDefault: -1, name: 1 }).lean();

  const rows = await StockLayer.aggregate([
    { $match: { orgId: toId(orgId), remaining: { $gt: 0 } } },
    {
      $group: {
        _id: '$locationId',
        quantity: { $sum: '$remaining' },
        value: { $sum: { $multiply: ['$remaining', '$unitCost'] } },
        items: { $addToSet: '$itemId' }
      }
    }
  ]);
  const byLocation = new Map(rows.map(r => [String(r._id), r]));

  return locations.map(location => {
    const held = byLocation.get(String(location._id));
    return {
      ...location,
      quantity: valuation.round(held?.quantity || 0),
      value: valuation.round(held?.value || 0),
      itemCount: held?.items?.length || 0
    };
  });
}

/**
 * What one item holds, per location.
 *
 * Read from the layers rather than from a per-location counter, because there is
 * no such counter and adding one would be a second number to keep in step with
 * the first. `Item.stockQty` stays the tenant-wide total, which is what every
 * existing screen already means by it.
 */
async function itemBalances(orgId, itemId) {
  const rows = await StockLayer.aggregate([
    { $match: { orgId: toId(orgId), itemId: toId(itemId), remaining: { $gt: 0 } } },
    {
      $group: {
        _id: '$locationId',
        quantity: { $sum: '$remaining' },
        value: { $sum: { $multiply: ['$remaining', '$unitCost'] } }
      }
    }
  ]);
  const locations = await StockLocation.find({ orgId }).select('name code isDefault').lean();
  const byId = new Map(locations.map(l => [String(l._id), l]));

  return rows
    .map(row => ({
      locationId: row._id,
      locationName: byId.get(String(row._id))?.name || 'Unassigned',
      quantity: valuation.round(row.quantity),
      value: valuation.round(row.value)
    }))
    .sort((a, b) => b.quantity - a.quantity);
}

/** Mongoose casts strings for `find` but not inside an aggregation `$match`. */
function toId(value) {
  return typeof value === 'string' ? new mongoose.Types.ObjectId(value) : value;
}

/**
 * Moves stock from one location to another.
 *
 * ── The rule this is built around ─────────────────────────────────────
 *
 * **A transfer must not change what the inventory is worth.** Nothing was bought,
 * nothing was sold, and no profit has moved — the goods are simply somewhere
 * else. The naive implementation, "take stock out here and receive it there at
 * today's cost", quietly breaks that: the goods leave at their layer cost and
 * arrive at whatever the last purchase price happened to be, so a business could
 * change its reported profit by driving a van between its own godowns.
 *
 * So the cost travels with the goods. The outbound half consumes real layers and
 * reports exactly what it drew; the inbound half recreates those layers at
 * exactly those costs.
 *
 * ── And why `receivedAt` is preserved ─────────────────────────────────
 *
 * Stamping the arriving layers with today's date would put them at the back of
 * the destination's FIFO queue. That sounds harmless and is not: transfer stock
 * out and back, and the oldest goods in the business have become the newest, so
 * the next sale reports the wrong cost of goods sold and the expiry-first
 * ordering silently reverses. Carrying the original date forward keeps FIFO
 * meaning what it says — oldest goods first — regardless of how much they have
 * been moved around.
 *
 * A transfer is refused rather than short-drawn, unlike a sale. Selling stock you
 * have not booked in yet is a real thing that happens in a shop; moving goods you
 * do not have is not a thing that happens at all, and allowing it would create
 * value out of nothing at the destination.
 */
async function transfer({ req, orgId, fromLocationId, toLocationId, lines = [], note, date }) {
  if (String(fromLocationId) === String(toLocationId)) {
    throw httpError(400, 'Choose two different locations.', 'TRANSFER_SAME_LOCATION');
  }

  const from = await resolveLocation(orgId, fromLocationId);
  const to = await resolveLocation(orgId, toLocationId);
  if (!from || !to) throw httpError(400, 'Both a source and a destination location are required.', 'LOCATION_REQUIRED');

  const itemIds = lines.map(line => line.itemId);
  const items = await Item.find({ _id: { $in: itemIds }, orgId, deletedAt: null }).select('name stockQty').lean();
  const byId = new Map(items.map(item => [String(item._id), item]));

  /**
   * Everything is checked before anything moves.
   *
   * A five-line transfer that moves three lines and then discovers the fourth is
   * short leaves the warehouse in a state nobody asked for, and the operator with
   * a partial transfer to reason about. Checking first makes the whole thing
   * either happen or not.
   */
  const planned = [];
  for (const line of lines) {
    const item = byId.get(String(line.itemId));
    if (!item) throw httpError(400, 'One of the items on this transfer no longer exists.', 'ITEM_NOT_FOUND');

    const quantity = valuation.round(line.quantity);
    if (!(quantity > 0)) throw httpError(400, `Enter a quantity for ${item.name}.`, 'TRANSFER_QUANTITY');

    const available = await availableAt(orgId, item._id, from._id);
    if (quantity > available) {
      throw httpError(
        400,
        `${from.name} holds ${available} of ${item.name}, so ${quantity} cannot be moved out of it.`,
        'TRANSFER_INSUFFICIENT'
      );
    }
    planned.push({ item, quantity });
  }

  const movedAt = date ? new Date(date) : new Date();
  const results = [];

  for (const { item, quantity } of planned) {
    const drawn = await valuation.consume({
      orgId, itemId: item._id, locationId: from._id, quantity, consumeByExpiry: false
    });

    /**
     * One arriving layer per departing layer, at its cost and its date.
     *
     * Not one blended layer: two consignments bought at different prices stay two
     * consignments, because that is what they physically are and because merging
     * them would lose the batch and expiry facts attached to each.
     */
    const layerIds = [];
    for (const entry of drawn.consumed) {
      const original = await StockLayer.findById(entry.layerId).lean();
      const created = await valuation.receive({
        orgId,
        itemId: item._id,
        locationId: to._id,
        quantity: entry.quantity,
        unitCost: entry.unitCost,
        sourceType: 'adjustment',
        sourceNumber: `Transfer from ${from.name}`,
        // The original receipt date, not today — see the note above.
        receivedAt: original?.receivedAt || movedAt,
        batchNumber: original?.batchNumber,
        expiryDate: original?.expiryDate || null,
        // Never blended into the destination's average: this is the same goods at
        // the same cost, and folding it into an average would move a figure that
        // has no transaction behind it.
        valuationMethod: 'fifo'
      });
      if (created?._id) layerIds.push(created._id);
    }

    /**
     * Two ledger rows, and `Item.stockQty` deliberately untouched.
     *
     * The tenant-wide total genuinely has not changed, so the two rows are
     * written with the balance the item already had. Posting -10 then +10 through
     * the ordinary path would work out to the same number, but it would leave the
     * item's cached quantity briefly wrong and, if the second write failed, wrong
     * permanently.
     */
    /**
     * Both ids minted up front so each row can point at the other on creation.
     *
     * The ledger is append-only and refuses updates — deliberately, because a
     * ledger that can be edited is a second opinion — so writing one row and
     * then patching in the back-link is not available, and trying it fails the
     * whole transfer. Generating the ids first is the way to have a mutual
     * reference without ever mutating a posted row.
     */
    const outId = new mongoose.Types.ObjectId();
    const inId = new mongoose.Types.ObjectId();

    await StockMovement.create({
      _id: outId,
      orgId,
      itemId: item._id,
      itemName: item.name,
      reason: 'transfer-out',
      quantity: -quantity,
      balanceAfter: item.stockQty ?? null,
      documentType: 'manual',
      documentNumber: null,
      note,
      actorName: req?.user?.name,
      unitCost: drawn.unitCost,
      value: -drawn.value,
      consumed: drawn.consumed?.length ? drawn.consumed : undefined,
      locationId: from._id,
      locationName: from.name,
      transferLocationId: to._id,
      transferLocationName: to.name,
      transferPairId: inId,
      createdAt: movedAt
    });

    await StockMovement.create({
      _id: inId,
      orgId,
      itemId: item._id,
      itemName: item.name,
      reason: 'transfer-in',
      quantity,
      balanceAfter: item.stockQty ?? null,
      documentType: 'manual',
      note,
      actorName: req?.user?.name,
      unitCost: drawn.unitCost,
      value: drawn.value,
      layerId: layerIds[0] || null,
      locationId: to._id,
      locationName: to.name,
      transferLocationId: from._id,
      transferLocationName: from.name,
      transferPairId: outId,
      createdAt: movedAt
    });

    results.push({
      itemId: item._id,
      name: item.name,
      quantity,
      value: drawn.value,
      /**
       * Reported, and expected to be zero.
       *
       * The pre-flight check above should make a shortfall impossible; if one
       * appears anyway it means stock moved between the check and the draw, and
       * the caller needs to know rather than be told the transfer was clean.
       */
      shortfall: drawn.shortfall
    });
  }

  return { from, to, movedAt, lines: results };
}

/** What one location actually holds of one item, from the layers. */
async function availableAt(orgId, itemId, locationId) {
  const [row] = await StockLayer.aggregate([
    { $match: { orgId: toId(orgId), itemId: toId(itemId), locationId: toId(locationId), remaining: { $gt: 0 } } },
    { $group: { _id: null, quantity: { $sum: '$remaining' } } }
  ]);
  return valuation.round(row?.quantity || 0);
}

module.exports = {
  resolveLocation,
  resolveLocationSafely,
  ensureDefault,
  assertSameState,
  listWithBalances,
  itemBalances,
  availableAt,
  transfer
};
