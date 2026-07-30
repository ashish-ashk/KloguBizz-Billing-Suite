const { Client } = require('../models/Client');
const { Invoice } = require('../models/Invoice');
const { asyncHandler } = require('../utils/asyncHandler');
const { httpError } = require('../utils/httpError');
const { tenantFilter } = require('../middleware/tenantMiddleware');
const { logAudit } = require('../services/auditService');
const { recordEvent, EVENT } = require('../services/usageEventService');
const { pickFields } = require('../utils/pickFields');
const { paginate, escapeRegex, parseSort } = require('../utils/pagination');

// `orgId` is never taken from the body — it comes from the authenticated
// token. Accepting it would let an update move the record into another
// tenant even though the *filter* is correctly org-scoped.
const CLIENT_FIELDS = ['companyName', 'email', 'phone', 'gstin', 'address', 'state', 'stateCode', 'status'];

const CLIENT_SORTS = ['companyName', 'createdAt'];

const listClients = asyncHandler(async (req, res) => {
  const filter = tenantFilter(req);
  if (req.query.status) filter.status = req.query.status;
  if (req.query.q) {
    // Server-side search, so a tenant with a long customer list is not obliged
    // to download all of it just so the browser can filter it.
    const term = escapeRegex(String(req.query.q).trim());
    if (term) {
      filter.$or = [
        { companyName: { $regex: term, $options: 'i' } },
        { gstin: { $regex: term, $options: 'i' } },
        { email: { $regex: term, $options: 'i' } },
        { phone: { $regex: term, $options: 'i' } }
      ];
    }
  }
  const page = await paginate(Client, filter, req.query, query =>
    query.sort(parseSort(req.query, CLIENT_SORTS, { companyName: 1 })));
  res.json(page);
});

const createClient = asyncHandler(async (req, res) => {
  const client = await Client.create({ ...pickFields(req.body, CLIENT_FIELDS), orgId: req.orgId });
  logAudit({ req, action: 'client.created', entity: 'client', entityId: client._id, meta: { companyName: client.companyName } });
  recordEvent({ req, type: EVENT.clientCreated });
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
