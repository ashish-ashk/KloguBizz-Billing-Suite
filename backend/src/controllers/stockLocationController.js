const { StockLocation } = require('../models/StockLocation');
const { StockLayer } = require('../models/StockLayer');
const { asyncHandler } = require('../utils/asyncHandler');
const { httpError } = require('../utils/httpError');
const locations = require('../services/stockLocationService');
const { logAudit } = require('../services/auditService');

/**
 * Warehouses and transfers (2.5 #42).
 *
 * Reading is open to every role, like the rest of inventory — knowing where the
 * stock is is what everyone in the business is here to do. Creating a location
 * and moving stock between them are admin actions, because both move balances
 * with no customer document behind them.
 */

const listLocations = asyncHandler(async (req, res) => {
  res.json({ locations: await locations.listWithBalances(req.orgId) });
});

const createLocation = asyncHandler(async (req, res) => {
  await locations.assertSameState(req.orgId, req.body.stateCode);

  const existing = await StockLocation.findOne({ orgId: req.orgId, name: req.body.name.trim() }).lean();
  if (existing) {
    throw httpError(409, `You already have a location called ${existing.name}.`, 'LOCATION_EXISTS');
  }

  /**
   * The first location a tenant creates becomes the default.
   *
   * Only relevant for a tenant whose migration created none — a database
   * restored from before locations, say. Without it they would have locations
   * and no default, so every unlabelled movement would fall back to the
   * un-scoped behaviour forever and nothing would ever say why.
   */
  const hasDefault = await StockLocation.exists({ orgId: req.orgId, isDefault: true });

  const location = await StockLocation.create({
    ...req.body,
    orgId: req.orgId,
    isDefault: !hasDefault
  });

  logAudit({
    req, action: 'stock.location_created', entity: 'stock-location', entityId: location._id,
    meta: { name: location.name }
  });
  res.status(201).json(location);
});

const updateLocation = asyncHandler(async (req, res) => {
  if (req.body.stateCode) await locations.assertSameState(req.orgId, req.body.stateCode);

  const location = await StockLocation.findOne({ _id: req.params.id, orgId: req.orgId });
  if (!location) throw httpError(404, 'Location not found');

  /**
   * Archiving is refused while the location still holds stock.
   *
   * Otherwise the goods become unreachable: nothing can be sold or transferred
   * out of an archived location, so the quantity stays on the books, keeps
   * counting towards the item's total and towards the valuation, and cannot be
   * touched. Empty it with a transfer first, which also leaves a record of where
   * it went.
   */
  if (req.body.status === 'archived' && location.status !== 'archived') {
    const [held] = await StockLayer.aggregate([
      { $match: { orgId: location.orgId, locationId: location._id, remaining: { $gt: 0 } } },
      { $group: { _id: null, quantity: { $sum: '$remaining' } } }
    ]);
    if (held?.quantity > 0) {
      throw httpError(
        409,
        `${location.name} still holds ${held.quantity} units. Transfer them somewhere else before archiving it, so the stock does not become unreachable.`,
        'LOCATION_NOT_EMPTY'
      );
    }
    if (location.isDefault) {
      throw httpError(409, 'This is the default location, so it cannot be archived.', 'LOCATION_IS_DEFAULT');
    }
  }

  Object.assign(location, req.body);
  await location.save();

  logAudit({
    req, action: 'stock.location_updated', entity: 'stock-location', entityId: location._id,
    meta: { name: location.name, status: location.status }
  });
  res.json(location);
});

/** Which location holds how much of one item. */
const itemLocations = asyncHandler(async (req, res) => {
  res.json({ balances: await locations.itemBalances(req.orgId, req.params.id) });
});

const transferStock = asyncHandler(async (req, res) => {
  const result = await locations.transfer({
    req,
    orgId: req.orgId,
    fromLocationId: req.body.fromLocationId,
    toLocationId: req.body.toLocationId,
    lines: req.body.lines,
    note: req.body.note,
    date: req.body.date
  });

  logAudit({
    req, action: 'stock.transferred', entity: 'stock-location', entityId: result.from._id,
    meta: {
      from: result.from.name, to: result.to.name,
      lines: result.lines.length,
      value: result.lines.reduce((sum, line) => sum + (line.value || 0), 0)
    }
  });

  res.status(201).json({
    ...result,
    message: `Moved ${result.lines.length} item${result.lines.length === 1 ? '' : 's'} from ${result.from.name} to ${result.to.name}.`
  });
});

module.exports = { listLocations, createLocation, updateLocation, itemLocations, transferStock };
