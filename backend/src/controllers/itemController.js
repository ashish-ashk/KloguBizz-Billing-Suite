const { Item } = require('../models/Item');
const { asyncHandler } = require('../utils/asyncHandler');
const { httpError } = require('../utils/httpError');
const { tenantFilter } = require('../middleware/tenantMiddleware');
const { buildItemTemplateBuffer, parseItemWorkbook } = require('../services/itemImportService');
const { logAudit } = require('../services/auditService');

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
