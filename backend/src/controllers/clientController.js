const { Client } = require('../models/Client');
const { asyncHandler } = require('../utils/asyncHandler');
const { httpError } = require('../utils/httpError');
const { tenantFilter } = require('../middleware/tenantMiddleware');

const listClients = asyncHandler(async (req, res) => {
  const clients = await Client.find(tenantFilter(req)).sort({ companyName: 1 });
  res.json(clients);
});

const createClient = asyncHandler(async (req, res) => {
  const client = await Client.create({ ...req.body, orgId: req.orgId });
  res.status(201).json(client);
});

const updateClient = asyncHandler(async (req, res) => {
  const client = await Client.findOneAndUpdate(
    { _id: req.params.id, ...tenantFilter(req) },
    req.body,
    { new: true, runValidators: true }
  );
  if (!client) throw httpError(404, 'Client not found');
  res.json(client);
});

const deleteClient = asyncHandler(async (req, res) => {
  const client = await Client.findOneAndDelete({ _id: req.params.id, ...tenantFilter(req) });
  if (!client) throw httpError(404, 'Client not found');
  res.status(204).end();
});

module.exports = { listClients, createClient, updateClient, deleteClient };
