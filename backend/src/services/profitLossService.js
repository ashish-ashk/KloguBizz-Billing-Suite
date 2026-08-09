const mongoose = require('mongoose');
const { Invoice } = require('../models/Invoice');
const { CreditNote } = require('../models/CreditNote');
const { Purchase } = require('../models/Purchase');
const { Expense } = require('../models/Expense');
const { StockLayer } = require('../models/StockLayer');
const { StockMovement } = require('../models/StockMovement');
const { labelsByValue } = require('./masterService');

/**
 * Profit and loss (2.4 #32).
 *
 * ── The mistake this is built to avoid ────────────────────────────────
 *
 * The obvious implementation is "revenue from invoices, minus costs from
 * purchases". It is wrong, and wrong in a way that looks entirely reasonable
 * until someone acts on it.
 *
 * Buying stock is not an expense. It converts one asset (cash) into another
 * (goods on a shelf); nothing has been consumed and no profit has been affected.
 * The cost becomes an expense at the moment the goods are *sold*, matched
 * against the revenue they earned. Count the purchase as an expense and you get
 * two errors that partly hide each other: a month where the business stocked up
 * shows a loss it did not make, and the month it sells that stock shows a profit
 * far larger than it earned. Count *both* the purchase and the cost of goods
 * sold and every inventory item is charged twice.
 *
 * So this report has two distinct cost sources and nothing appears in both:
 *
 *   **Cost of goods sold** comes from the stock ledger — what actually left the
 *   shelf, at what the layers say it cost. That number did not exist until cost
 *   layers shipped (2.5 #41), which is the real reason this report could not be
 *   written before, rather than "purchases exist now" as the plan assumed.
 *
 *   **Operating expenses** are costs that never became stock: the portion of a
 *   purchase whose lines matched no stock-tracked item (services, freight,
 *   consumables), plus standalone `Expense` records for everything with no
 *   vendor bill at all.
 *
 * The split between those two is not a judgement call the user has to make. A
 * purchase line either created a cost layer or it did not, and the layers record
 * which purchase they came from — so the inventory portion of every bill is a
 * fact already on file.
 *
 * ── What is deliberately excluded, and why ────────────────────────────
 *
 * **Tax is not revenue and not a cost.** GST charged to a customer is collected
 * on the government's behalf and owed to it; GST paid to a supplier is
 * recoverable. Both sides use `totals.subtotal`, the taxable value. The
 * exception is input tax that *cannot* be claimed — section 17(5) blocked items
 * and anything marked ineligible — where the tax genuinely is money gone, so it
 * appears as its own expense line rather than being quietly dropped.
 *
 * **Capital goods are not an expense.** A machine bought this year is an asset
 * used for years; charging its whole cost to one period would wreck the figure.
 * The correct treatment is depreciation, which needs an asset register this
 * product does not have — so capital purchases are excluded and *reported* as
 * excluded, rather than silently included or silently dropped.
 *
 * **This is accrual, not cash.** Revenue is recognised when invoiced and costs
 * when incurred, regardless of what has been paid. That is what Indian
 * businesses file on and what makes a period comparable to the one before it.
 */

function round(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

/**
 * The period match used on the revenue side, kept identical to the one every
 * other report uses so two reports over the same dates cannot disagree about
 * which invoices exist.
 */
function invoiceMatch(orgId, from, to) {
  return {
    orgId,
    deletedAt: null,
    // A draft was never issued and a cancelled invoice's charge has been
    // reversed; counting either would invent revenue.
    status: { $nin: ['draft', 'cancelled'] },
    date: { $gte: from, $lte: to }
  };
}

/**
 * Builds the report.
 *
 * Every figure is traceable to documents the user can open, which is the point:
 * a profit number nobody can reconcile to their own invoices is not trusted, and
 * should not be.
 */
async function profitAndLoss(orgIdRaw, { from, to }) {
  const orgId = new mongoose.Types.ObjectId(String(orgIdRaw));

  const [revenue, credits, cogsRows, purchaseRows, inventoryByPurchase, expenseRows] = await Promise.all([
    // ── Revenue ──
    Invoice.aggregate([
      { $match: invoiceMatch(orgId, from, to) },
      { $group: { _id: null, taxable: { $sum: '$totals.subtotal' }, tax: { $sum: { $add: ['$totals.cgst', '$totals.sgst', '$totals.igst', '$totals.cess'] } }, count: { $sum: 1 } } }
    ]),

    /**
     * Credit notes reduce revenue, and no other report on the invoice side does
     * this.
     *
     * `buildSummary` deliberately does not net them — a GST return reports them
     * in their own table — but a P&L that ignores them overstates revenue by
     * every return and post-sale discount the business gave. Netted in the
     * period the note was *issued*, not the period of the invoice it credits,
     * which matches how the liability is actually reduced.
     */
    CreditNote.aggregate([
      { $match: { orgId, status: 'issued', date: { $gte: from, $lte: to } } },
      { $group: { _id: '$reason', taxable: { $sum: '$totals.subtotal' }, count: { $sum: 1 } } }
    ]),

    /**
     * ── Cost of goods sold, from the stock ledger ──
     *
     * `value` is signed like `quantity`: negative when goods leave. Grouping by
     * reason keeps three genuinely different things apart — goods sold, goods
     * destroyed, and goods that a recount says were never there. Lumping them
     * into one "cost of sales" figure would hide shrinkage, which is exactly the
     * number a business most wants to see separately.
     */
    StockMovement.aggregate([
      {
        $match: {
          orgId,
          createdAt: { $gte: from, $lte: to },
          value: { $ne: null },
          reason: { $in: ['sale', 'sale-reversed', 'return', 'damage', 'adjustment'] }
        }
      },
      { $group: { _id: '$reason', value: { $sum: '$value' }, quantity: { $sum: '$quantity' } } }
    ]),

    // ── Purchases in the period, split by what they were for ──
    Purchase.aggregate([
      {
        $match: {
          orgId,
          deletedAt: null,
          status: { $ne: 'draft' },
          billDate: { $gte: from, $lte: to }
        }
      },
      {
        $group: {
          _id: {
            // A blank category is its own bucket rather than being dropped —
            // "Uncategorised" is a prompt to go and label it, an omission is not.
            category: { $ifNull: ['$category', ''] },
            itcCategory: { $ifNull: ['$itc.category', 'inputs'] }
          },
          purchaseIds: { $push: '$_id' },
          taxable: { $sum: '$totals.subtotal' },
          // Tax that cannot be claimed is money gone, so it is carried through
          // to become its own expense line rather than disappearing.
          blockedTax: {
            $sum: {
              $cond: [
                { $eq: [{ $ifNull: ['$itc.eligible', true] }, false] },
                { $add: ['$totals.cgst', '$totals.sgst', '$totals.igst', '$totals.cess'] },
                0
              ]
            }
          },
          count: { $sum: 1 }
        }
      }
    ]),

    /**
     * How much of each purchase became stock.
     *
     * The whole double-count guard rests on this. A layer records the purchase
     * that created it, so the inventory portion of a bill is a fact on file
     * rather than an assumption — and whatever is left over is what was
     * genuinely consumed in the period.
     *
     * Matched on the layer's *source*, not on its date: a bill dated in this
     * period built stock in this period, whenever the layer happens to have been
     * written.
     */
    StockLayer.aggregate([
      { $match: { orgId, sourceType: 'purchase' } },
      { $group: { _id: '$sourceId', value: { $sum: { $multiply: ['$quantity', '$unitCost'] } } } }
    ]),

    // ── Standalone expenses ──
    Expense.aggregate([
      { $match: { orgId, deletedAt: null, date: { $gte: from, $lte: to } } },
      { $group: { _id: '$category', amount: { $sum: '$amount' }, count: { $sum: 1 } } }
    ])
  ]);

  // ── Revenue ──────────────────────────────────
  const grossRevenue = round(revenue[0]?.taxable || 0);
  const creditTotal = round(credits.reduce((sum, row) => sum + row.taxable, 0));
  const netRevenue = round(grossRevenue - creditTotal);

  // ── Cost of goods sold ───────────────────────
  const byReason = new Map(cogsRows.map(row => [row._id, row]));
  const valueOf = reason => round(-(byReason.get(reason)?.value || 0));
  // Sales take cost out (negative value) so this comes back positive; returns
  // and cancellations put it back, reducing the cost of what was actually sold.
  const cogs = round(valueOf('sale') - valueOf('sale-reversed') - valueOf('return'));
  const writtenOff = valueOf('damage');
  const shrinkage = valueOf('adjustment');

  const grossProfit = round(netRevenue - cogs);

  // ── Operating expenses ───────────────────────
  const inventoryValue = new Map(inventoryByPurchase.map(row => [String(row._id), row.value]));
  const expenseLines = new Map();
  let capitalExcluded = 0;
  let inventoryExcluded = 0;
  let blockedTax = 0;

  const addLine = (label, amount, count, source) => {
    /**
     * A line worth nothing is not a line.
     *
     * Without this, every bill that became stock in full contributes an
     * "Uncategorised — 0" row: the document exists, so the count is non-zero,
     * but none of its value was consumed. A statement padded with zero rows
     * invites the reader to wonder what is missing from them.
     */
    if (amount <= 0) return;
    const key = `${source}:${label}`;
    const existing = expenseLines.get(key) || { category: label, amount: 0, count: 0, source };
    existing.amount = round(existing.amount + amount);
    existing.count += count;
    expenseLines.set(key, existing);
  };

  for (const row of purchaseRows) {
    blockedTax = round(blockedTax + row.blockedTax);

    if (row._id.itcCategory === 'capital-goods') {
      // An asset, not a period cost. Reported so the omission is visible.
      capitalExcluded = round(capitalExcluded + row.taxable);
      continue;
    }

    // Whatever of these bills turned into stock is already accounted for by
    // COGS above, and must not be charged again here.
    const stocked = round(row.purchaseIds.reduce((sum, id) => sum + (inventoryValue.get(String(id)) || 0), 0));
    inventoryExcluded = round(inventoryExcluded + stocked);

    const consumed = round(row.taxable - stocked);
    // Clamped at zero: a bill can be valued slightly *above* its layers when a
    // line was discounted after the fact, and a negative expense line reads as
    // income, which it is not.
    addLine(row._id.category || 'Uncategorised', Math.max(0, consumed), row.count, 'purchases');
  }

  for (const row of expenseRows) {
    addLine(row._id || 'Uncategorised', round(row.amount), row.count, 'expenses');
  }

  if (blockedTax > 0) {
    // Real money, paid and unrecoverable. Named explicitly so it is understood
    // as a consequence of what was bought rather than an accounting artefact.
    addLine('Input tax not claimable', blockedTax, 0, 'tax');
  }
  if (writtenOff > 0) addLine('Stock damaged or written off', writtenOff, 0, 'stock');
  if (shrinkage > 0) addLine('Stock lost on recount', shrinkage, 0, 'stock');

  /**
   * Codes become names.
   *
   * The category stored on a document is the master's `code` — short, stable and
   * unambiguous, which is right for storage and unreadable on a statement. A
   * line reading "bank-charges" is not a line an accountant will accept.
   * Anything with no matching master (a value typed before the list was
   * configured) keeps whatever it was, so nothing disappears.
   */
  const categoryLabels = await labelsByValue('expenseCategory');
  const expenses = [...expenseLines.values()]
    .map(line => ({ ...line, category: categoryLabels.get(line.category) || line.category }))
    .sort((a, b) => b.amount - a.amount);
  const totalExpenses = round(expenses.reduce((sum, line) => sum + line.amount, 0));
  const netProfit = round(grossProfit - totalExpenses);

  return {
    period: {
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10)
    },
    basis: 'accrual',
    revenue: {
      gross: grossRevenue,
      creditNotes: creditTotal,
      net: netRevenue,
      invoices: revenue[0]?.count || 0,
      // Shown so nobody mistakes the revenue line for the money that came in.
      taxCollected: round(revenue[0]?.tax || 0),
      creditsByReason: credits
        .map(row => ({ reason: row._id || 'other', amount: round(row.taxable), count: row.count }))
        .sort((a, b) => b.amount - a.amount)
    },
    costOfGoodsSold: {
      total: cogs,
      sold: valueOf('sale'),
      returned: round(valueOf('sale-reversed') + valueOf('return'))
    },
    grossProfit,
    grossMargin: netRevenue > 0 ? round((grossProfit / netRevenue) * 100) : null,
    expenses,
    totalExpenses,
    netProfit,
    netMargin: netRevenue > 0 ? round((netProfit / netRevenue) * 100) : null,
    /**
     * What was left out and why, on the report rather than in documentation.
     *
     * A number the reader cannot reconcile to their own records is a number they
     * will not trust. These are the two large, legitimate reasons this report's
     * expenses will not equal the sum of their purchases.
     */
    excluded: {
      inventoryPurchases: inventoryExcluded,
      capitalGoods: capitalExcluded
    }
  };
}

module.exports = { profitAndLoss, round };
