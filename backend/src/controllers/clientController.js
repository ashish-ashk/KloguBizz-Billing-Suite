const { Client } = require('../models/Client');
const { Invoice } = require('../models/Invoice');
const { asyncHandler } = require('../utils/asyncHandler');
const { httpError } = require('../utils/httpError');
const { tenantFilter } = require('../middleware/tenantMiddleware');
const { logAudit } = require('../services/auditService');
const { pickFields } = require('../utils/pickFields');

// `orgId` is never taken from the body — it comes from the authenticated
// token. Accepting it would let an update move the record into another
// tenant even though the *filter* is correctly org-scoped.
const CLIENT_FIELDS = ['companyName', 'email', 'phone', 'gstin', 'address', 'state', 'stateCode', 'status'];

const listClients = asyncHandler(async (req, res) => {
  const clients = await Client.find(tenantFilter(req)).sort({ companyName: 1 });
  res.json(clients);
});

const createClient = asyncHandler(async (req, res) => {
  const client = await Client.create({ ...pickFields(req.body, CLIENT_FIELDS), orgId: req.orgId });
  logAudit({ req, action: 'client.created', entity: 'client', entityId: client._id, meta: { companyName: client.companyName } });
  res.status(201).json(client);
});

const updateClient = asyncHandler(async (req, res) => {
  const client = await Client.findOneAndUpdate(
    { _id: req.params.id, ...tenantFilter(req) },
    pickFields(req.body, CLIENT_FIELDS),
    { new: true, runValidators: true }
  );
  if (!client) throw httpError(404, 'Client not found');
  logAudit({ req, action: 'client.updated', entity: 'client', entityId: client._id, meta: { companyName: client.companyName } });
  res.json(client);
});

// A client referenced by invoices cannot be deleted: `Invoice.clientId` is a
// plain ObjectId ref, so removing the client leaves populate() returning null
// and the invoice list / CSV / PDF rendering a blank buyer. Deactivate
// instead — status:'inactive' hides them from pickers without breaking
// documents already issued in their name.
const deleteClient = asyncHandler(async (req, res) => {
  const invoiceCount = await Invoice.countDocuments({ ...tenantFilter(req), clientId: req.params.id });
  if (invoiceCount > 0) {
    throw httpError(
      409,
      `This client has ${invoiceCount} invoice${invoiceCount === 1 ? '' : 's'} and cannot be deleted. Set them to inactive instead to keep those invoices intact.`,
      'CLIENT_IN_USE'
    );
  }
  const client = await Client.findOneAndDelete({ _id: req.params.id, ...tenantFilter(req) });
  if (!client) throw httpError(404, 'Client not found');
  logAudit({ req, action: 'client.deleted', entity: 'client', entityId: client._id, meta: { companyName: client.companyName } });
  res.status(204).end();
});

module.exports = { listClients, createClient, updateClient, deleteClient };
