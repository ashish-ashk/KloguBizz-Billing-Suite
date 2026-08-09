const { Expense } = require('../models/Expense');
const { asyncHandler } = require('../utils/asyncHandler');
const { httpError } = require('../utils/httpError');
const { tenantFilter } = require('../middleware/tenantMiddleware');
const { assertValidMaster, listMasterOptions } = require('../services/masterService');
const { logAudit } = require('../services/auditService');
const { pickFields } = require('../utils/pickFields');
const { paginate, escapeRegex, parseSort } = require('../utils/pagination');
const { notDeleted, scopeFilter, deletionPatch, RESTORE_PATCH } = require('../utils/softDelete');
const { streamCsv } = require('../services/csvService');
const { recordEvent, EVENT } = require('../services/usageEventService');
const { profitAndLoss } = require('../services/profitLossService');
const { streamWorkbook } = require('../services/excelService');

/**
 * Expenses, and the profit & loss report they feed (2.4 #32).
 *
 * See `models/Expense.js` for why this is a second cost document alongside
 * `Purchase`, and `services/profitLossService.js` for why buying stock is not an
 * expense.
 */

// `orgId` never comes from the body — it comes from the token, so an update
// cannot relocate the record into another tenant.
const EXPENSE_FIELDS = ['date', 'category', 'description', 'amount', 'paymentMethod', 'reference', 'paidTo', 'notes'];
const EXPENSE_SORTS = ['date', 'amount', 'category', 'createdAt'];

/**
 * Both lists are checked against the superadmin's masters, the same way an
 * item's GST rate and unit are. Without it, a tenant's own P&L quietly grows
 * "Freight", "freight " and "Frieght" as three separate lines.
 */
async function assertMasters(body) {
  await assertValidMaster('expenseCategory', body.category, 'Expense category');
  await assertValidMaster('paymentMethod', body.paymentMethod, 'Payment method');
}

/**
 * The chart of accounts, for a dropdown.
 *
 * The master admin endpoints are superadmin-only and should stay that way — but
 * a tenant cannot file an expense against a list it is not allowed to read, and
 * a free-text box is exactly what this feature exists to replace. So the *values*
 * are readable by any signed-in user while managing them stays platform-side.
 */
const listExpenseCategories = asyncHandler(async (req, res) => {
  // `{ value, label }`, so the dropdown shows a name and submits the code that
  // validation actually checks against.
  res.json({ categories: await listMasterOptions('expenseCategory') });
});

const listExpenses = asyncHandler(async (req, res) => {
  const filter = scopeFilter(req);
  if (req.query.category) filter.category = String(req.query.category);
  if (req.query.from || req.query.to) {
    filter.date = {};
    if (req.query.from) filter.date.$gte = new Date(req.query.from);
    if (req.query.to) {
      const to = new Date(req.query.to);
      to.setHours(23, 59, 59, 999);
      filter.date.$lte = to;
    }
  }
  if (req.query.q) {
    const term = escapeRegex(String(req.query.q).trim());
    if (term) {
      filter.$or = [
        { description: { $regex: term, $options: 'i' } },
        { paidTo: { $regex: term, $options: 'i' } },
        { reference: { $regex: term, $options: 'i' } }
      ];
    }
  }
  const sort = parseSort(req.query.sort, EXPENSE_SORTS, { date: -1 });
  res.json(await paginate(Expense, filter, req.query, query => query.sort(sort).lean()));
});

const createExpense = asyncHandler(async (req, res) => {
  const fields = pickFields(req.body, EXPENSE_FIELDS);
  await assertMasters(fields);
  const expense = await Expense.create({ ...fields, orgId: req.orgId });
  logAudit({
    req,
    action: 'expense.created',
    entity: 'expense',
    entityId: expense._id,
    meta: { category: expense.category, amount: expense.amount }
  });
  recordEvent({ req, type: EVENT.expenseRecorded });
  res.status(201).json(expense);
});

const updateExpense = asyncHandler(async (req, res) => {
  const fields = pickFields(req.body, EXPENSE_FIELDS);
  await assertMasters(fields);
  const expense = await Expense.findOneAndUpdate(
    { _id: req.params.id, ...notDeleted(req) },
    fields,
    { new: true, runValidators: true }
  );
  if (!expense) throw httpError(404, 'Expense not found');
  logAudit({ req, action: 'expense.updated', entity: 'expense', entityId: expense._id, meta: { amount: expense.amount } });
  res.json(expense);
});

const deleteExpense = asyncHandler(async (req, res) => {
  // Soft, because a period's profit may already have been reported on it — an
  // expense that vanishes silently changes a number somebody has already used.
  const expense = await Expense.findOneAndUpdate(
    { _id: req.params.id, ...notDeleted(req) },
    { $set: deletionPatch(req) },
    { new: true }
  );
  if (!expense) throw httpError(404, 'Expense not found');
  logAudit({ req, action: 'expense.deleted', entity: 'expense', entityId: expense._id });
  res.json({ ok: true, recoverable: true, message: 'Expense moved to the recycle bin.' });
});

const restoreExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findOneAndUpdate(
    { _id: req.params.id, ...tenantFilter(req), deletedAt: { $ne: null } },
    { $set: RESTORE_PATCH },
    { new: true }
  );
  if (!expense) throw httpError(404, 'Expense not found in the recycle bin');
  logAudit({ req, action: 'expense.restored', entity: 'expense', entityId: expense._id });
  res.json(expense);
});

const exportExpensesCsv = asyncHandler(async (req, res) => {
  const cursor = Expense.find(notDeleted(req)).sort({ date: -1 }).lean().cursor();
  recordEvent({ req, type: EVENT.exportCsv, meta: { of: 'expenses' } });
  await streamCsv(res, {
    filename: `expenses-${new Date().toISOString().slice(0, 10)}.csv`,
    columns: [
      { label: 'Date', value: row => (row.date ? new Date(row.date).toISOString().slice(0, 10) : '') },
      { label: 'Category', value: row => row.category },
      { label: 'Description', value: row => row.description },
      { label: 'Paid to', value: row => row.paidTo || '' },
      { label: 'Amount', value: row => row.amount },
      { label: 'Method', value: row => row.paymentMethod || '' },
      { label: 'Reference', value: row => row.reference || '' }
    ],
    rows: cursor
  });
});

// ── Profit & loss ────────────────────────────────

/**
 * Resolves the reporting period.
 *
 * Identical semantics to `reportController.resolvePeriod` — a financial year by
 * default, an explicit range if given — because a P&L and a GST summary that
 * disagreed about what "FY2026-27" means would be worse than either being wrong
 * on its own.
 */
function resolvePeriod(query) {
  if (query.from || query.to) {
    const from = query.from ? new Date(query.from) : new Date(0);
    const to = query.to ? new Date(query.to) : new Date();
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw httpError(400, 'from and to must be valid dates (YYYY-MM-DD)');
    }
    if (from > to) throw httpError(400, '`from` cannot be after `to`');
    to.setHours(23, 59, 59, 999);
    return { from, to, label: 'custom' };
  }
  const now = new Date();
  const currentFyStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const requestedFy = query.fy ? Number(query.fy) : currentFyStart;
  if (!Number.isInteger(requestedFy) || requestedFy < 2000 || requestedFy > 2100) {
    throw httpError(400, 'fy must be a financial-year start year, e.g. 2026 for FY2026-27');
  }
  return {
    from: new Date(requestedFy, 3, 1, 0, 0, 0, 0),
    to: new Date(requestedFy + 1, 2, 31, 23, 59, 59, 999),
    label: `FY${requestedFy}-${String(requestedFy + 1).slice(-2)}`
  };
}

const profitLoss = asyncHandler(async (req, res) => {
  const period = resolvePeriod(req.query);
  const report = await profitAndLoss(req.orgId, period);
  recordEvent({ req, type: EVENT.reportViewed, meta: { report: 'profit-loss' } });
  res.json({ ...report, period: { ...report.period, label: period.label } });
});

const profitLossExcel = asyncHandler(async (req, res) => {
  const period = resolvePeriod(req.query);
  const report = await profitAndLoss(req.orgId, period);
  recordEvent({ req, type: EVENT.exportCsv, meta: { of: 'profit-loss-xlsx' } });

  /**
   * The statement itself is one sheet of label/amount rows rather than a table
   * of records, because that is the shape a P&L is read in and the shape an
   * accountant expects to receive. The expense detail follows on its own sheet,
   * so the relationship between the two is not lost the way it would be across
   * two separate downloads.
   */
  const statement = [
    { label: 'Revenue (taxable value of invoices)', amount: report.revenue.gross },
    { label: 'Less: credit notes', amount: -report.revenue.creditNotes },
    { label: 'Net revenue', amount: report.revenue.net },
    { label: 'Less: cost of goods sold', amount: -report.costOfGoodsSold.total },
    { label: 'Gross profit', amount: report.grossProfit },
    ...report.expenses.map(line => ({ label: `Less: ${line.category}`, amount: -line.amount })),
    { label: 'Total expenses', amount: -report.totalExpenses },
    { label: 'Net profit', amount: report.netProfit }
  ];

  await streamWorkbook(res, {
    filename: `profit-loss-${report.period.from}-to-${report.period.to}.xlsx`,
    sheets: [
      {
        name: 'Profit and loss',
        columns: [
          { label: 'Line', key: 'label', value: row => row.label, width: 42 },
          { label: 'Amount', key: 'amount', value: row => row.amount, money: true }
        ],
        rows: statement
      },
      {
        name: 'Expense detail',
        columns: [
          { label: 'Category', key: 'category', value: row => row.category, width: 32 },
          { label: 'Amount', key: 'amount', value: row => row.amount, money: true },
          { label: 'From', key: 'source', value: row => row.source, width: 14 },
          { label: 'Documents', key: 'count', value: row => row.count }
        ],
        rows: report.expenses,
        totals: { category: 'Total', amount: report.totalExpenses }
      },
      {
        // On the same file as the numbers, because a reader who cannot reconcile
        // this to their own purchase register will assume the report is broken.
        name: 'What is excluded',
        columns: [
          { label: 'Excluded', key: 'label', value: row => row.label, width: 40 },
          { label: 'Amount', key: 'amount', value: row => row.amount, money: true },
          { label: 'Why', key: 'why', value: row => row.why, width: 78 }
        ],
        rows: [
          {
            label: 'Purchases that became stock',
            amount: report.excluded.inventoryPurchases,
            why: 'Buying stock converts cash into goods; it becomes an expense when the goods sell, as cost of goods sold above.'
          },
          {
            label: 'Capital goods',
            amount: report.excluded.capitalGoods,
            why: 'An asset used over several years. The expense is depreciation, which needs an asset register this report does not have.'
          },
          {
            label: 'GST charged to customers',
            amount: report.revenue.taxCollected,
            why: 'Collected on the government\'s behalf and owed to it. Never revenue.'
          }
        ]
      }
    ]
  });
});

module.exports = {
  listExpenseCategories, listExpenses, createExpense, updateExpense, deleteExpense, restoreExpense, exportExpensesCsv,
  profitLoss, profitLossExcel
};
