const { Client } = require('../models/Client');
const { Invoice } = require('../models/Invoice');
const { asyncHandler } = require('../utils/asyncHandler');
const { httpError } = require('../utils/httpError');
const { tenantFilter } = require('../middleware/tenantMiddleware');
const { logAudit } = require('../services/auditService');
const { notDeleted, scopeFilter, deletionPatch, RESTORE_PATCH } = require('../utils/softDelete');
const { recordEvent, EVENT } = require('../services/usageEventService');
const { pickFields } = require('../utils/pickFields');
const { paginate, escapeRegex, parseSort } = require('../utils/pagination');
const { buildClientTemplateCsv, parseClientFile, MAX_ROWS } = require('../services/clientImportService');

// `orgId` is never taken from the body — it comes from the authenticated
// token. Accepting it would let an update move the record into another
// tenant even though the *filter* is correctly org-scoped.
const CLIENT_FIELDS = ['companyName', 'email', 'phone', 'gstin', 'address', 'state', 'stateCode', 'status'];

const CLIENT_SORTS = ['companyName', 'createdAt'];

const listClients = asyncHandler(async (req, res) => {
  const filter = scopeFilter(req);
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
    { _id: req.params.id, ...notDeleted(req) },
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
  /**
   * Soft (#37).
   *
   * A client with invoices is refused outright above, so this only ever removes an
   * unreferenced record — but 'unreferenced' is not the same as 'worthless': it is a
   * contact with an address and a GSTIN somebody typed in, and getting it back should
   * not require retyping it.
   */
  const client = await Client.findOneAndUpdate(
    { _id: req.params.id, ...notDeleted(req) },
    { $set: deletionPatch(req) },
    { new: true }
  );
  if (!client) throw httpError(404, 'Client not found');
  logAudit({ req, action: 'client.deleted', entity: 'client', entityId: client._id, meta: { companyName: client.companyName, recoverable: true } });
  res.status(204).end();
});

const restoreClient = asyncHandler(async (req, res) => {
  const client = await Client.findOneAndUpdate(
    { _id: req.params.id, ...tenantFilter(req), deletedAt: { $ne: null } },
    { $set: RESTORE_PATCH },
    { new: true }
  );
  if (!client) throw httpError(404, 'No deleted client with that id');
  logAudit({ req, action: 'client.restored', entity: 'client', entityId: client._id, meta: { companyName: client.companyName } });
  res.json(client);
});

// ── Bulk import ──────────────────────────────────────────────────────────

const downloadClientTemplate = asyncHandler(async (req, res) => {
  const csv = buildClientTemplateCsv();
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="klogubizz-customers-template.csv"');
  res.send(csv);
});

/**
 * Imports a customer list.
 *
 * Row by row, not all-or-nothing: a file of five hundred customers with four bad
 * rows imports four hundred and ninety-six and hands the four back with their row
 * numbers and reasons. Refusing the whole file over one malformed phone number is
 * how an import feature ends up never used — the tenant goes back to typing them
 * in by hand, which is what this was for.
 *
 * There is no per-plan ceiling on customers, so nothing here is a way around a
 * quota; `MAX_ROWS` is an operational cap on one request, and the message says so.
 */
const bulkUploadClients = asyncHandler(async (req, res) => {
  if (!req.file) throw httpError(400, 'Please choose a CSV file to upload.', 'NO_FILE');

  /**
   * Existing customers are read once, and *including* the soft-deleted ones.
   *
   * A deleted customer still holds its GSTIN: importing a second record for the
   * same registration would give the tenant two customers with one GSTIN, where
   * restoring the first then makes their invoice history ambiguous. So the
   * collision is reported, and the fix — restore them — is named in the message.
   */
  const existing = await Client.find(tenantFilter(req), 'companyName gstin deletedAt').lean();
  const existingGstins = new Map();
  const existingNames = new Map();
  for (const client of existing) {
    if (client.gstin) existingGstins.set(String(client.gstin).toUpperCase(), client.companyName);
    if (client.companyName) existingNames.set(client.companyName.trim().toLowerCase(), client._id);
  }

  const { totalRows, valid, failed } = await parseClientFile(req.file.buffer, {
    filename: req.file.originalname || '',
    existingGstins,
    existingNames
  });

  const docs = valid.map(v => ({ ...v.doc, orgId: req.orgId }));
  const failedResults = [...failed];
  let created = 0;

  if (docs.length) {
    try {
      // `ordered: false` so one rejected document does not abandon every row after it.
      const inserted = await Client.insertMany(docs, { ordered: false });
      created = inserted.length;
    } catch (err) {
      const writeErrors = err.writeErrors || [];
      if (!writeErrors.length) throw err;
      created = docs.length - writeErrors.length;
      writeErrors.forEach(writeError => {
        const source = valid[writeError.index];
        failedResults.push({
          row: source?.row,
          companyName: source?.doc.companyName,
          gstin: source?.doc.gstin,
          errors: [writeError.errmsg || writeError.err?.errmsg || 'Could not save this customer.']
        });
      });
    }
  }

  failedResults.sort((a, b) => (a.row || 0) - (b.row || 0));
  logAudit({
    req,
    action: 'client.bulk_import',
    entity: 'client',
    meta: { totalRows, created, failed: failedResults.length }
  });
  recordEvent({ req, type: EVENT.clientBulkUpload, meta: { totalRows, created } });

  res.json({ totalRows, created, failed: failedResults, maxRows: MAX_ROWS });
});

module.exports = {
  listClients, createClient, updateClient, deleteClient, restoreClient,
  downloadClientTemplate, bulkUploadClients
};
