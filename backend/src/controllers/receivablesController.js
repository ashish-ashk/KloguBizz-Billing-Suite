const mongoose = require('mongoose');
const { asyncHandler } = require('../utils/asyncHandler');
const { httpError } = require('../utils/httpError');
const { tenantFilter } = require('../middleware/tenantMiddleware');
const { Invoice } = require('../models/Invoice');
const { AuditLog } = require('../models/Settings');
const { StockMovement } = require('../models/StockMovement');
const { Item } = require('../models/Item');
const { StockLayer } = require('../models/StockLayer');
const receivables = require('../services/receivablesService');
const stock = require('../services/stockService');
const stockLocations = require('../services/stockLocationService');
const valuation = require('../services/stockValuationService');
const { streamWorkbook } = require('../services/excelService');
const { paginate, escapeRegex } = require('../utils/pagination');
const { notDeleted } = require('../utils/softDelete');
const { logAudit } = require('../services/auditService');
const { recordEvent, EVENT } = require('../services/usageEventService');

/**
 * Receivables, stock and the tenant-facing audit trail.
 *
 * Three things that were computable — or already recorded — and simply never exposed.
 */

function parseRange(query) {
  const from = query.from ? new Date(query.from) : null;
  const to = query.to ? new Date(query.to) : new Date();
  if (from && Number.isNaN(from.getTime())) throw httpError(400, 'from must be a valid date (YYYY-MM-DD)');
  if (Number.isNaN(to.getTime())) throw httpError(400, 'to must be a valid date (YYYY-MM-DD)');
  to.setHours(23, 59, 59, 999);
  if (from && from > to) throw httpError(400, '`from` cannot be after `to`');
  return { from, to };
}

// ── AR ageing (2.4 #28) ──────────────────────────

const ageingReport = asyncHandler(async (req, res) => {
  recordEvent({ req, type: EVENT.reportViewed, meta: { report: 'ar-ageing' } });
  res.json(await receivables.ageing(req.orgId));
});

const ageingExcel = asyncHandler(async (req, res) => {
  const report = await receivables.ageing(req.orgId);
  recordEvent({ req, type: EVENT.exportCsv, meta: { of: 'ar-ageing-xlsx' } });

  await streamWorkbook(res, {
    filename: `ar-ageing-${report.asOf}.xlsx`,
    sheets: [
      {
        // The summary and the detail in one file, which is the reason this is a workbook
        // rather than two CSVs whose relationship is lost on download.
        name: 'Summary',
        columns: [
          { label: 'Bucket', key: 'label', value: row => row.label, width: 18 },
          { label: 'Amount', key: 'amount', value: row => row.amount, money: true }
        ],
        rows: report.buckets,
        totals: { label: 'Total', amount: report.total }
      },
      {
        name: 'By customer',
        columns: [
          { label: 'Customer', key: 'name', value: row => row.name, width: 32 },
          { label: 'Email', key: 'email', value: row => row.email, width: 26 },
          { label: 'Not yet due', key: 'current', value: row => row.buckets.current, money: true },
          { label: '1-30 days', key: 'd1_30', value: row => row.buckets.d1_30, money: true },
          { label: '31-60 days', key: 'd31_60', value: row => row.buckets.d31_60, money: true },
          { label: '61-90 days', key: 'd61_90', value: row => row.buckets.d61_90, money: true },
          { label: '90+ days', key: 'd90_plus', value: row => row.buckets.d90_plus, money: true },
          { label: 'Total', key: 'total', value: row => row.total, money: true },
          { label: 'Open invoices', key: 'invoices', value: row => row.invoices },
          { label: 'Oldest due', key: 'oldestDue', value: row => row.oldestDue, date: true },
          { label: 'Worst days overdue', key: 'maxDaysPastDue', value: row => row.maxDaysPastDue }
        ],
        rows: report.clients
      }
    ]
  });
});

// ── Customer statement (2.4 #29) ─────────────────

const customerStatement = asyncHandler(async (req, res) => {
  const { from, to } = parseRange(req.query);
  const report = await receivables.statement(req.orgId, req.params.clientId, { from, to });
  recordEvent({ req, type: EVENT.reportViewed, meta: { report: 'statement' } });
  res.json(report);
});

const customerStatementExcel = asyncHandler(async (req, res) => {
  const { from, to } = parseRange(req.query);
  const report = await receivables.statement(req.orgId, req.params.clientId, { from, to });
  recordEvent({ req, type: EVENT.exportCsv, meta: { of: 'statement-xlsx' } });

  await streamWorkbook(res, {
    filename: `statement-${String(report.client.name).replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${report.period.to}.xlsx`,
    sheets: [{
      name: 'Statement',
      columns: [
        { label: 'Date', key: 'date', value: row => row.date, date: true },
        { label: 'Type', key: 'type', value: row => row.type, width: 14 },
        { label: 'Reference', key: 'reference', value: row => row.reference, width: 20 },
        { label: 'Description', key: 'description', value: row => row.description, width: 40 },
        { label: 'Debit', key: 'debit', value: row => row.debit || null, money: true },
        { label: 'Credit', key: 'credit', value: row => row.credit || null, money: true },
        { label: 'Balance', key: 'balance', value: row => row.balance, money: true }
      ],
      rows: [
        // The opening balance is a row, not a footnote: a statement whose first line is
        // an invoice implies nothing was owed before, which is only true for a new
        // customer.
        {
          date: from || null,
          type: 'opening',
          reference: '',
          description: 'Opening balance',
          debit: 0,
          credit: 0,
          balance: report.openingBalance
        },
        ...report.lines
      ],
      totals: { description: 'Closing balance', balance: report.closingBalance }
    }]
  });
});

// ── Collection metrics (2.4 #33) ─────────────────

const collectionMetrics = asyncHandler(async (req, res) => {
  const days = Math.min(Math.max(Number(req.query.days) || 90, 7), 730);
  res.json(await receivables.collectionMetrics(req.orgId, { days }));
});

// ── Sales breakdown (2.4 #31) ────────────────────

const salesBreakdown = asyncHandler(async (req, res) => {
  const { from, to } = parseRange(req.query);
  recordEvent({ req, type: EVENT.reportViewed, meta: { report: 'sales-breakdown' } });
  res.json(await receivables.salesBreakdown(req.orgId, { from, to }));
});

// ── Invoices as Excel (2.4 #34) ──────────────────

/**
 * The invoice register as a workbook.
 *
 * Cursor-streamed straight into the sheet, so this is bounded by the batch size rather
 * than by how much the tenant has invoiced — the same reasoning as the CSV export, which
 * this sits alongside rather than replacing.
 */
const invoicesExcel = asyncHandler(async (req, res) => {
  const { from, to } = parseRange(req.query);
  const filter = { ...notDeleted(req), status: { $nin: ['draft'] } };
  if (from) filter.date = { $gte: from, $lte: to };

  const cursor = Invoice.find(filter)
    .populate('clientId', 'companyName gstin')
    .sort({ date: -1 })
    .lean()
    .cursor();

  recordEvent({ req, type: EVENT.exportCsv, meta: { of: 'invoices-xlsx' } });
  await streamWorkbook(res, {
    filename: `invoices-${new Date().toISOString().slice(0, 10)}.xlsx`,
    sheets: [{
      name: 'Invoices',
      columns: [
        { label: 'Invoice', key: 'invoiceNumber', value: i => i.invoiceNumber, width: 18 },
        { label: 'Date', key: 'date', value: i => i.date, date: true },
        { label: 'Due', key: 'dueDate', value: i => i.dueDate, date: true },
        { label: 'Customer', key: 'client', value: i => i.clientId?.companyName || i.billTo?.name || '', width: 30 },
        { label: 'GSTIN', key: 'gstin', value: i => i.clientId?.gstin || i.billTo?.gstin || '', width: 20 },
        { label: 'Place of supply', key: 'pos', value: i => i.placeOfSupply || '' },
        { label: 'Treatment', key: 'treatment', value: i => i.taxTreatment || 'taxable' },
        { label: 'Supply type', key: 'supplyType', value: i => i.supplyType || 'regular', width: 22 },
        { label: 'Reverse charge', key: 'rcm', value: i => (i.reverseCharge ? 'Yes' : 'No') },
        { label: 'Taxable', key: 'subtotal', value: i => i.totals?.subtotal, money: true },
        { label: 'CGST', key: 'cgst', value: i => i.totals?.cgst, money: true },
        { label: 'SGST/UTGST', key: 'sgst', value: i => i.totals?.sgst, money: true },
        { label: 'IGST', key: 'igst', value: i => i.totals?.igst, money: true },
        { label: 'Cess', key: 'cess', value: i => i.totals?.cess, money: true },
        { label: 'Total', key: 'total', value: i => i.totals?.total, money: true },
        { label: 'Received', key: 'amountPaid', value: i => i.amountPaid, money: true },
        { label: 'Credited', key: 'amountCredited', value: i => i.amountCredited, money: true },
        { label: 'Balance', key: 'balanceDue', value: i => i.balanceDue, money: true },
        { label: 'Status', key: 'status', value: i => i.status },
        { label: 'IRN', key: 'irn', value: i => i.eInvoice?.irn || '', width: 30 }
      ],
      rows: cursor
    }]
  });
});

// ── Stock ledger (2.5 #38–#39) ───────────────────

const stockLedger = asyncHandler(async (req, res) => {
  const filter = tenantFilter(req);
  if (req.query.itemId && /^[0-9a-fA-F]{24}$/.test(req.query.itemId)) filter.itemId = req.query.itemId;
  if (req.query.reason) filter.reason = String(req.query.reason);
  if (req.query.q) {
    const term = escapeRegex(String(req.query.q).trim());
    if (term) filter.itemName = { $regex: term, $options: 'i' };
  }
  res.json(await paginate(StockMovement, filter, req.query, query => query.sort({ createdAt: -1 }).lean()));
});

/**
 * Items at or below their reorder level.
 *
 * `reorderLevel` has existed as long as `stockQty` and was just as dead. Only items that
 * actually have a level set are considered — a missing level means "not tracked", not
 * "zero", and treating it as zero would put every service and every untracked product in
 * the alert list permanently.
 */
const lowStock = asyncHandler(async (req, res) => {
  const items = await Item.find({
    ...notDeleted(req),
    type: { $ne: 'service' },
    reorderLevel: { $gt: 0 },
    $expr: { $lte: [{ $ifNull: ['$stockQty', 0] }, '$reorderLevel'] }
  })
    .select('name itemCode unit stockQty reorderLevel sellingPrice category')
    .sort({ stockQty: 1 })
    .limit(200)
    .lean();

  res.json({
    count: items.length,
    items: items.map(item => ({
      ...item,
      shortfall: Math.max(0, (item.reorderLevel || 0) - (item.stockQty || 0))
    }))
  });
});

/** A manual stock correction, posted as a movement rather than an edit. */
const adjustStock = asyncHandler(async (req, res) => {
  const quantity = Number(req.body?.quantity);
  if (!Number.isFinite(quantity) || quantity === 0) {
    throw httpError(400, 'quantity must be a non-zero number (negative to reduce stock)');
  }
  const note = String(req.body?.note || '').trim();
  if (!note) {
    // Mandatory: an unexplained adjustment is exactly what made the old hand-edited
    // `stockQty` untraceable.
    throw httpError(400, 'A note is required — an unexplained stock adjustment cannot be reconciled later.', 'NOTE_REQUIRED');
  }
  const reason = ['adjustment', 'damage', 'opening'].includes(req.body?.reason) ? req.body.reason : 'adjustment';

  const result = await stock.adjust({
    req,
    orgId: req.orgId,
    itemId: req.params.id,
    quantity,
    reason,
    note,
    // Optional. When adding stock and no cost is given, the service falls back
    // to the last cost paid — units with no cost behind them would sell as pure
    // profit and drift the item's value away from its quantity for good.
    unitCost: req.body?.unitCost,
    batchNumber: req.body?.batchNumber ? String(req.body.batchNumber).trim() : undefined,
    expiryDate: req.body?.expiryDate ? new Date(req.body.expiryDate) : undefined,
    // A recount is a fact about one shelf; applying it to the tenant-wide pool
    // would move stock nobody counted (2.5 #42).
    location: await stockLocations.resolveLocation(req.orgId, req.body?.locationId)
  });
  logAudit({
    req,
    action: 'stock.adjusted',
    entity: 'item',
    entityId: req.params.id,
    meta: { quantity, reason, note, balance: result.stockQty, unitCost: result.unitCost, value: result.value }
  });
  res.json(result);
});

/** Rebuilds a cached balance from the ledger — the repair path for a lost increment. */
const recomputeStock = asyncHandler(async (req, res) => {
  const balance = await stock.recomputeBalance(req.orgId, req.params.id);
  // The value is cached for the same reason the quantity is, and can be lost the
  // same way, so the repair path fixes both or it fixes nothing useful.
  const { stockValue } = await valuation.recomputeItem(req.orgId, req.params.id);
  logAudit({ req, action: 'stock.recomputed', entity: 'item', entityId: req.params.id, meta: { balance, stockValue } });
  res.json({ ok: true, stockQty: balance, stockValue });
});

/**
 * What the stock on hand is worth (2.5 #41).
 *
 * The figure the balance sheet needs and the product could not produce: a
 * quantity with no cost is not a valuation, and `sellingPrice × quantity` — the
 * tempting shortcut — is not one either. It values unsold goods at a profit that
 * has not been earned, which overstates assets and is not permitted under AS-2
 * (inventory is carried at the *lower* of cost and net realisable value).
 *
 * Both figures are returned so the difference is visible: `value` at cost, and
 * `retailValue` at selling price, whose gap is the unrealised margin sitting on
 * the shelf.
 */
const stockValuation = asyncHandler(async (req, res) => {
  const orgId = new mongoose.Types.ObjectId(String(req.orgId));

  // Layers are the truth; `Item.stockValue` is a cache. A report a tenant may
  // hand to an accountant reads the truth.
  const rows = await StockLayer.aggregate([
    { $match: { orgId, remaining: { $gt: 0 } } },
    {
      $group: {
        _id: '$itemId',
        quantity: { $sum: '$remaining' },
        value: { $sum: { $multiply: ['$remaining', '$unitCost'] } },
        layers: { $sum: 1 },
        oldestReceipt: { $min: '$receivedAt' }
      }
    },
    { $sort: { value: -1 } },
    { $limit: 500 },
    {
      $lookup: {
        from: 'items', localField: '_id', foreignField: '_id', as: 'item',
        pipeline: [{ $project: { name: 1, itemCode: 1, unit: 1, category: 1, sellingPrice: 1, stockQty: 1 } }]
      }
    },
    { $unwind: { path: '$item', preserveNullAndEmptyArrays: true } }
  ]);

  const items = rows.map(row => {
    const value = round2(row.value);
    const quantity = round2(row.quantity);
    return {
      itemId: row._id,
      name: row.item?.name || '(deleted item)',
      itemCode: row.item?.itemCode || '',
      unit: row.item?.unit || '',
      category: row.item?.category || '',
      quantity,
      layers: row.layers,
      oldestReceipt: row.oldestReceipt,
      value,
      averageCost: quantity > 0 ? round2(value / quantity) : 0,
      retailValue: round2(quantity * (row.item?.sellingPrice || 0)),
      /**
       * The ledger balance beside the layered quantity.
       *
       * They should be equal. When they are not, something moved stock without
       * moving its cost — the single most useful thing this report can surface,
       * because it is invisible in every other view and `recompute` fixes it.
       */
      ledgerQuantity: round2(row.item?.stockQty ?? 0),
      reconciled: round2(row.item?.stockQty ?? 0) === quantity
    };
  });

  const totals = items.reduce((acc, item) => ({
    value: round2(acc.value + item.value),
    retailValue: round2(acc.retailValue + item.retailValue),
    quantity: round2(acc.quantity + item.quantity)
  }), { value: 0, retailValue: 0, quantity: 0 });

  const policy = await valuation.getPolicy(req.orgId);
  res.json({
    method: policy.valuationMethod,
    totals: { ...totals, unrealisedMargin: round2(totals.retailValue - totals.value) },
    unreconciled: items.filter(i => !i.reconciled).length,
    items
  });
});

/**
 * Batches expiring soon, or already expired (2.5 #42).
 *
 * Only layers with stock left: an expired batch that has already been sold or
 * written off is history, and listing it forever would bury the ones that still
 * need a decision.
 */
const expiringStock = asyncHandler(async (req, res) => {
  const orgId = new mongoose.Types.ObjectId(String(req.orgId));
  const policy = await valuation.getPolicy(req.orgId);
  const days = Number.isFinite(Number(req.query.days))
    ? Math.max(0, Math.min(365, Number(req.query.days)))
    : policy.expiryWarningDays;
  const cutoff = new Date(Date.now() + days * 86400000);

  const layers = await StockLayer.find({
    orgId,
    remaining: { $gt: 0 },
    expiryDate: { $ne: null, $lte: cutoff }
  })
    .sort({ expiryDate: 1 })
    .limit(300)
    .lean();

  const items = await Item.find({ _id: { $in: layers.map(l => l.itemId) }, orgId })
    .select('name itemCode unit').lean();
  const byId = new Map(items.map(i => [String(i._id), i]));

  const now = Date.now();
  res.json({
    days,
    count: layers.length,
    batches: layers.map(layer => {
      const daysLeft = Math.floor((new Date(layer.expiryDate).getTime() - now) / 86400000);
      const item = byId.get(String(layer.itemId));
      return {
        layerId: layer._id,
        itemId: layer.itemId,
        name: item?.name || '(deleted item)',
        itemCode: item?.itemCode || '',
        unit: item?.unit || '',
        batchNumber: layer.batchNumber || '',
        expiryDate: layer.expiryDate,
        daysLeft,
        expired: daysLeft < 0,
        quantity: round2(layer.remaining),
        value: round2(layer.remaining * layer.unitCost),
        sourceNumber: layer.sourceNumber || ''
      };
    })
  });
});

/** The open cost layers behind one item — the audit trail for its valuation. */
const itemStockLayers = asyncHandler(async (req, res) => {
  if (!/^[0-9a-fA-F]{24}$/.test(String(req.params.id || ''))) throw httpError(400, 'Invalid item id');
  const layers = await StockLayer.find({ ...tenantFilter(req), itemId: req.params.id })
    .sort({ receivedAt: 1, _id: 1 })
    .limit(500)
    .lean();
  res.json({
    count: layers.length,
    layers: layers.map(layer => ({
      ...layer,
      value: round2(layer.remaining * layer.unitCost)
    }))
  });
});

function round2(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

// ── Tenant-facing audit log (2.6 #50) ────────────

/**
 * The tenant's own audit trail.
 *
 * `AuditLog` has recorded `orgId` from the start and was only ever exposed on the
 * *superadmin* route — so a tenant admin could not see who in their own organisation
 * changed what, which is the question an owner asks after a mistake.
 *
 * Scoped by `tenantFilter`, so this cannot read another tenant's trail, and deliberately
 * strips the platform-side fields: `impersonatorId` and `actorId` of a superadmin are
 * about *us*, and the entries that concern support access are surfaced separately with
 * plain wording rather than an internal id.
 */
const tenantAuditLog = asyncHandler(async (req, res) => {
  const filter = tenantFilter(req);
  if (req.query.action) {
    const term = escapeRegex(String(req.query.action).trim());
    if (term) filter.action = { $regex: `^${term}`, $options: 'i' };
  }
  if (req.query.entity) filter.entity = String(req.query.entity);
  if (req.query.from || req.query.to) {
    const { from, to } = parseRange(req.query);
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = from;
    if (to) filter.createdAt.$lte = to;
  }

  const page = await paginate(AuditLog, filter, req.query, query => query
    .select('action entity entityId actorName meta createdAt impersonatorName')
    .sort({ createdAt: -1 })
    .lean());

  res.json({
    ...page,
    data: page.data.map(entry => ({
      _id: entry._id,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      actorName: entry.actorName,
      meta: entry.meta,
      createdAt: entry.createdAt,
      /**
       * Support access is shown to the tenant in plain words rather than hidden.
       *
       * This is the visible half of Part 3.4's data-access log: if somebody at KloguBizz
       * acted inside a customer's account, the customer can see that it happened.
       */
      bySupport: entry.impersonatorName ? `KloguBizz support (${entry.impersonatorName})` : null
    }))
  });
});

module.exports = {
  ageingReport, ageingExcel,
  customerStatement, customerStatementExcel,
  collectionMetrics, salesBreakdown, invoicesExcel,
  stockLedger, lowStock, adjustStock, recomputeStock,
  stockValuation, expiringStock, itemStockLayers,
  tenantAuditLog
};
