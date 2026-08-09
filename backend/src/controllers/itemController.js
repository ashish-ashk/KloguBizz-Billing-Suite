const { Item } = require('../models/Item');
const { asyncHandler } = require('../utils/asyncHandler');
const { httpError } = require('../utils/httpError');
const { tenantFilter } = require('../middleware/tenantMiddleware');
const { buildItemTemplateBuffer, parseItemWorkbook } = require('../services/itemImportService');
const { logAudit } = require('../services/auditService');
const { recordEvent, EVENT } = require('../services/usageEventService');
const { pickFields } = require('../utils/pickFields');
const { assertValidMaster } = require('../services/masterService');
const { paginate, escapeRegex, parseSort } = require('../utils/pagination');
const { notDeleted, scopeFilter, deletionPatch, RESTORE_PATCH } = require('../utils/softDelete');
const stock = require('../services/stockService');

// `orgId` is never accepted from the body — it comes from the token, so an
// update can't relocate the record into another tenant.
const ITEM_FIELDS = [
  'itemCode', 'name', 'description', 'type', 'hsn', 'category', 'unit',
  'gstRate', 'cessRate', 'sellingPrice', 'mrp', 'purchasePrice', 'taxInclusive',
  'stockQty', 'reorderLevel', 'barcode', 'status', 'trackBatches'
];

/**
 * `stockQty` is accepted when *creating* an item and refused when updating it.
 *
 * Creating is the one moment a balance legitimately arrives from outside the
 * ledger — it is the opening stock, and asking someone to add an item and then
 * separately post an opening movement for it is a worse product. So the figure
 * is taken and immediately turned into a proper `opening` movement with a cost
 * behind it (see `createItem`), which keeps quantity and value in step from the
 * very first row.
 *
 * Editing it is different: there is no honest movement to post, because nobody
 * knows what changed or why. The old behaviour — a plain hand-edit — is exactly
 * what made the number untraceable and is why the ledger was built. It now
 * returns a 400 pointing at the adjustment endpoint, which requires a note.
 */
const UPDATE_FORBIDDEN_FIELDS = ['stockQty'];

const ITEM_SORTS = ['name', 'itemCode', 'sellingPrice', 'stockQty', 'createdAt'];

const listItems = asyncHandler(async (req, res) => {
  const filter = scopeFilter(req);
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

/**
 * Refuses a barcode already in use, explicitly as well as by the unique index.
 *
 * Relying on the index alone looked sufficient and is not — the same lesson the
 * purchase duplicate-bill guard learned. Mongoose builds indexes in the
 * background, so on a fresh database the constraint does not exist for the first
 * moments of a process's life, and with `autoIndex` disabled (the usual
 * production setting) it does not exist at all until someone builds it by hand.
 * A barcode that resolves to two items is worse than no barcode, because the
 * scan silently picks one; that cannot be conditional on index state.
 *
 * The index stays as the backstop for the genuinely concurrent case, which no
 * read-then-write can close.
 */
async function assertBarcodeFree(req, barcode, excludeId) {
  const code = String(barcode || '').trim();
  if (!code) return;
  const clash = await Item.findOne({
    ...notDeleted(req),
    barcode: code,
    ...(excludeId ? { _id: { $ne: excludeId } } : {})
  }).select('_id name').lean();
  if (clash) {
    throw httpError(
      409,
      `${clash.name} already uses the barcode ${code}. A barcode that matches two items is worse `
      + 'than none — a scan would silently pick one of them.',
      'BARCODE_IN_USE'
    );
  }
}

const createItem = asyncHandler(async (req, res) => {
  const fields = pickFields(req.body, ITEM_FIELDS);
  await assertMasters(fields);
  await assertBarcodeFree(req, fields.barcode);

  // Held back and posted as a movement below, so the opening balance has a
  // ledger row and a cost rather than appearing from nowhere.
  const openingQty = Number(fields.stockQty) || 0;
  const opening = openingQty > 0 && fields.type !== 'service' ? openingQty : 0;
  fields.stockQty = 0;

  const item = await Item.create({ ...fields, orgId: req.orgId, stockQty: 0, stockValue: 0 });

  if (opening) {
    await stock.adjust({
      req,
      orgId: req.orgId,
      itemId: item._id,
      quantity: opening,
      reason: 'opening',
      note: 'Opening stock recorded when the item was created',
      // The catalogue's purchase price is the only cost known at this point, and
      // it is what the person entering the item just typed. Zero would make the
      // first sale look like pure profit.
      unitCost: Number(fields.purchasePrice) > 0 ? Number(fields.purchasePrice) : 0
    }).catch(error => {
      // The item exists and is usable; the opening balance is bookkeeping about
      // it. Failing the create here would leave a caller who cannot tell whether
      // to retry.
      (req.log || console).error?.('opening stock failed', { err: error, itemId: String(item._id) });
    });
  }

  const saved = opening ? await Item.findById(item._id) : item;
  logAudit({ req, action: 'item.created', entity: 'item', entityId: item._id, meta: { name: item.name, openingStock: opening } });
  recordEvent({ req, type: EVENT.itemCreated });
  res.status(201).json(saved);
});

const updateItem = asyncHandler(async (req, res) => {
  for (const field of UPDATE_FORBIDDEN_FIELDS) {
    if (req.body?.[field] !== undefined) {
      throw httpError(
        400,
        'Stock cannot be edited directly — post an adjustment instead, so the change has a reason attached to it.',
        'STOCK_NOT_EDITABLE'
      );
    }
  }
  const fields = pickFields(req.body, ITEM_FIELDS);
  await assertMasters(fields);
  await assertBarcodeFree(req, fields.barcode, req.params.id);
  const item = await Item.findOneAndUpdate(
    { _id: req.params.id, ...notDeleted(req) },
    fields,
    { new: true, runValidators: true }
  );
  if (!item) throw httpError(404, 'Item not found');
  logAudit({ req, action: 'item.updated', entity: 'item', entityId: item._id, meta: { name: item.name } });
  res.json(item);
});

/**
 * One item, by its barcode (2.5 #44).
 *
 * A dedicated endpoint rather than the existing `?q=` search, because a scanner
 * needs a different answer to a person. `?q=` is a fuzzy `$or` across four
 * fields that returns a *page* of candidates ranked by nothing in particular —
 * fine for someone reading a list, useless for a till, where the only acceptable
 * outcomes are "this exact item" or "no match". A scan that silently picks the
 * first of several near-matches rings up the wrong product.
 *
 * The barcode is unique per tenant at the database level (see `Item`), so
 * exactly-one is guaranteed rather than hoped for.
 */
const itemByBarcode = asyncHandler(async (req, res) => {
  const barcode = String(req.params.barcode || '').trim();
  if (!barcode) throw httpError(400, 'A barcode is required');
  const item = await Item.findOne({ ...notDeleted(req), barcode, status: 'active' }).lean();
  if (!item) {
    // 404 with a code, so the till can offer "add this as a new item" instead of
    // showing an error the cashier cannot act on.
    throw httpError(404, 'No active item has that barcode.', 'BARCODE_NOT_FOUND');
  }
  res.json(item);
});

const deleteItem = asyncHandler(async (req, res) => {
  // Soft (#37). An item's name and HSN appear on every historic invoice that used it,
  // and a catalogue of hundreds is exactly where a mis-click happens.
  const item = await Item.findOneAndUpdate(
    { _id: req.params.id, ...notDeleted(req) },
    { $set: deletionPatch(req) },
    { new: true }
  );
  if (!item) throw httpError(404, 'Item not found');
  logAudit({ req, action: 'item.deleted', entity: 'item', entityId: item._id, meta: { name: item.name, recoverable: true } });
  res.status(204).end();
});

const restoreItem = asyncHandler(async (req, res) => {
  const item = await Item.findOneAndUpdate(
    { _id: req.params.id, ...tenantFilter(req), deletedAt: { $ne: null } },
    { $set: RESTORE_PATCH },
    { new: true }
  );
  if (!item) throw httpError(404, 'No deleted item with that id');
  logAudit({ req, action: 'item.restored', entity: 'item', entityId: item._id, meta: { name: item.name } });
  res.json(item);
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
  recordEvent({ req, type: EVENT.itemBulkUpload, meta: { totalRows, created } });
  res.json({ totalRows, created, failed: failedResults });
});

module.exports = {
  listItems, itemByBarcode, createItem, updateItem, deleteItem, restoreItem,
  downloadItemTemplate, bulkUploadItems
};
