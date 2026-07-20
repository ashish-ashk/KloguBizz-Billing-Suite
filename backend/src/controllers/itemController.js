const { Item } = require('../models/Item');
const { asyncHandler } = require('../utils/asyncHandler');
const { httpError } = require('../utils/httpError');
const { tenantFilter } = require('../middleware/tenantMiddleware');

const listItems = asyncHandler(async (req, res) => {
  const items = await Item.find(tenantFilter(req)).sort({ name: 1 });
  res.json(items);
});

const createItem = asyncHandler(async (req, res) => {
  const item = await Item.create({ ...req.body, orgId: req.orgId });
  res.status(201).json(item);
});

const updateItem = asyncHandler(async (req, res) => {
  const item = await Item.findOneAndUpdate(
    { _id: req.params.id, ...tenantFilter(req) },
    req.body,
    { new: true, runValidators: true }
  );
  if (!item) throw httpError(404, 'Item not found');
  res.json(item);
});

const deleteItem = asyncHandler(async (req, res) => {
  const item = await Item.findOneAndDelete({ _id: req.params.id, ...tenantFilter(req) });
  if (!item) throw httpError(404, 'Item not found');
  res.status(204).end();
});

module.exports = { listItems, createItem, updateItem, deleteItem };
