const { Item } = require('../models/Item');
const { asyncHandler } = require('../utils/asyncHandler');
const { httpError } = require('../utils/httpError');
const { tenantFilter } = require('../middleware/tenantMiddleware');
const { buildItemTemplateBuffer, parseItemWorkbook } = require('../services/itemImportService');
const { logAudit } = require('../services/auditService');
const { pickFields } = require('../utils/pickFields');
const { assertValidMaster } = require('../services/masterService');
const { paginate, escapeRegex, parseSort } = require('../utils/pagination');

// `orgId` is never accepted from the body — it comes from the token, so an
// update can't relocate the record into another tenant.
const ITEM_FIELDS = [
  'itemCode', 'name', 'description', 'type', 'hsn', 'category', 'unit',
  'gstRate', 'cessRate', 'sellingPrice', 'mrp', 'purchasePrice', 'taxInclusive',
  'stockQty', 'reorderLevel', 'barcode', 'status'
];

const ITEM_SORTS = ['name', 'itemCode', 'sellingPrice', 'stockQty', 'createdAt'];

const listItems = asyncHandler(async (req, res) => {
  const filter = tenantFilter(req);
  if (req.query.status) filter.status = req.query.status;
  if (req.query.type) filter.type = req.query.type;
  if (req.query.category) filter.category = req.query.category;
  if (req.query.q) {
    // The item picker searches here rather than downloading the whole catalogue
    // and filtering in the browser, which is what it had to do before.
    const term = escapeRegex(String(req.query.q).trim());
    if (term) {
      filter.$or = [
        { name: { $regex: term, $options: 'i' } },
        { itemCode: { $regex: term, $options: 'i' } },
        { hsn: { $regex: term, $options: 'i' } },
        { barcode: { $regex: term, $options: 'i' } }
      ];
    }
  }
  const page = await paginate(Item, filter, req.query, query =>
    query.sort(parseSort(req.query, ITEM_SORTS, { name: 1 })));
  res.json(page);
});

/**
 * Checks the GST rate and unit against the super admin's configured masters.
 * Those lists were previously decorative — the model carried its own hardcoded
 * enum and the unit was a free string.
 */
async function assertMasters(body) {
  await assertValidMaster('gstRate', body.gstRate, 'GST rate');
  await assertValidMaster('unit', body.unit, 'Unit');
}

const createItem = asyncHandler(async (req, res) => {
  const fields = pickFields(req.body, ITEM_FIELDS);
  await assertMasters(fields);
  const item = await Item.create({ ...fields, orgId: req.orgId });
  logAudit({ req, action: 'item.created', entity: 'item', entityId: item._id, meta: { name: item.name } });
  res.status(201).json(item);
});

const updateItem = asyncHandler(async (req, res) => {
  const fields = pickFields(req.body, ITEM_FIELDS);
  await assertMasters(fields);
  const item = await Item.findOneAndUpdate(
    { _id: req.params.id, ...tenantFilter(req) },
    fields,
    { new: true, runValidators: true }
  );
  if (!item) throw httpError(404, 'Item not found');
  logAudit({ req, action: 'item.updated', entity: 'item', entityId: item._id, meta: { name: item.name } });
  res.json(item);
});

const deleteItem = asyncHandler(async (req, res) => {
  const item = await Item.findOneAndDelete({ _id: req.params.id, ...tenantFilter(req) });
  if (!item) throw httpError(404, 'Item not found');
  logAudit({ req, action: 'item.deleted', entity: 'item', entityId: item._id, meta: { name: item.name } });
  res.status(204).end();
});

const downloadItemTemplate = asyncHandler(async (req, res) => {
  const buffer = await buildItemTemplateBuffer();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="klogubizz-items-template.xlsx"');
  res.send(buffer);
});

const bulkUploadItems = asyncHandler(async (req, res) => {
  if (!req.file) throw httpError(400, 'Please choose an Excel file to upload.');

  const existingCodeDocs = await Item.find({ ...tenantFilter(req), itemCode: { $nin: [null, ''] } }, 'itemCode').lean();
  const existingCodes = new Set(existingCodeDocs.map(d => d.itemCode.toUpperCase()));

  const { totalRows, valid, failed } = await parseItemWorkbook(req.file.buffer, { existingCodes });

  const docs = valid.map(v => ({ ...v.doc, orgId: req.orgId }));
  const failedResults = [...failed];
  let created = 0;

  if (docs.length) {
    try {
      const inserted = await Item.insertMany(docs, { ordered: false });
      created = inserted.length;
    } catch (err) {
      const writeErrors = err.writeErrors || [];
      const failedIndexes = new Set(writeErrors.map(e => e.index));
      created = docs.length - failedIndexes.size;
      writeErrors.forEach(writeError => {
        const source = valid[writeError.index];
        failedResults.push({
          row: source.row,
          itemCode: source.doc.itemCode,
          name: source.doc.name,
          errors: [writeError.errmsg || writeError.err?.errmsg || 'Could not save this item.']
        });
      });
      if (!writeErrors.length) throw err;
    }
  }

  failedResults.sort((a, b) => a.row - b.row);
  logAudit({ req, action: 'item.bulk_import', entity: 'item', meta: { totalRows, created, failed: failedResults.length } });
  res.json({ totalRows, created, failed: failedResults });
});

module.exports = { listItems, createItem, updateItem, deleteItem, downloadItemTemplate, bulkUploadItems };
