const mongoose = require('mongoose');
const { Invoice } = require('../models/Invoice');
const { Payment } = require('../models/Payment');
const { Client } = require('../models/Client');
const { roundMoney } = require('./gstService');

/**
 * Accounts receivable: ageing, statements and collection metrics (2.4 #28, #29, #33).
 *
 * The product could tell a tenant *how much* was outstanding and nothing else — not
 * how old it was, not who owed it, not how long it typically takes to arrive. Those
 * are the three questions a business actually asks about its receivables, and a single
 * "pending amount" figure answers none of them.
 *
 * Everything here is an aggregation over data that already existed. That is the point:
 * the information was always there, it was simply never asked for.
 */

/** The conventional Indian ageing buckets. Named so the boundaries are auditable. */
const AGEING_BUCKETS = [
  { key: 'current', label: 'Not yet due', from: -Infinity, to: 0 },
  { key: 'd1_30', label: '1–30 days', from: 1, to: 30 },
  { key: 'd31_60', label: '31–60 days', from: 31, to: 60 },
  { key: 'd61_90', label: '61–90 days', from: 61, to: 90 },
  { key: 'd90_plus', label: '90+ days', from: 91, to: Infinity }
];

/**
 * Statuses that represent money still owed.
 *
 * `overdue` is included but not relied on: the stored status is a denormalisation the
 * hourly sweep maintains, so ageing is computed from `dueDate` directly. An invoice
 * that fell due an hour ago is 0 days overdue and belongs in the first bucket whether
 * or not the sweep has relabelled it yet.
 */
const OPEN_STATUSES = ['pending', 'partial', 'overdue'];

/**
 * AR ageing, customer by customer.
 *
 * One pipeline rather than a query per client: a tenant with a thousand customers would
 * otherwise be a thousand round trips, and the whole reason this report exists is to be
 * looked at often.
 */
async function ageing(orgId, { asOf = new Date() } = {}) {
  const orgObjectId = new mongoose.Types.ObjectId(String(orgId));

  const rows = await Invoice.aggregate([
    {
      $match: {
        orgId: orgObjectId,
        deletedAt: null,
        status: { $in: OPEN_STATUSES },
        // A zero balance is settled whatever the status says. `$exists: false` covers
        // invoices raised before the field was persisted (migration 002 backfilled
        // them, but a fresh deployment of an old database might not have run it yet).
        $or: [{ balanceDue: { $gt: 0 } }, { balanceDue: { $exists: false } }]
      }
    },
    {
      $addFields: {
        outstanding: { $ifNull: ['$balanceDue', '$totals.total'] },
        /**
         * Days past due.
         *
         * `$dateDiff` on a *missing* `dueDate` yields null, and null compares as less
         * than every number in `$switch` — which would silently file every invoice with
         * no due date into the "not yet due" bucket. The `$type` guard is the same trap
         * Phase 3 hit with the overdue derivation, in its aggregation form.
         */
        daysPastDue: {
          $cond: [
            { $eq: [{ $type: '$dueDate' }, 'date'] },
            { $dateDiff: { startDate: '$dueDate', endDate: asOf, unit: 'day' } },
            0
          ]
        }
      }
    },
    {
      $addFields: {
        bucket: {
          $switch: {
            branches: [
              { case: { $lte: ['$daysPastDue', 0] }, then: 'current' },
              { case: { $lte: ['$daysPastDue', 30] }, then: 'd1_30' },
              { case: { $lte: ['$daysPastDue', 60] }, then: 'd31_60' },
              { case: { $lte: ['$daysPastDue', 90] }, then: 'd61_90' }
            ],
            default: 'd90_plus'
          }
        }
      }
    },
    {
      $group: {
        _id: { clientId: '$clientId', bucket: '$bucket' },
        amount: { $sum: '$outstanding' },
        invoices: { $sum: 1 },
        oldestDue: { $min: '$dueDate' },
        maxDaysPastDue: { $max: '$daysPastDue' },
        // Kept so a clientless quick bill can still be named in the report rather than
        // aggregated into an anonymous blank row.
        billToName: { $first: '$billTo.name' }
      }
    }
  ]);

  // Client names are resolved in one query for the ids that actually appear, rather
  // than with a `$lookup` per row.
  const clientIds = [...new Set(rows.map(row => row._id.clientId).filter(Boolean).map(String))];
  const clients = await Client.find({ _id: { $in: clientIds } }).select('companyName email phone').lean();
  const clientMap = new Map(clients.map(client => [String(client._id), client]));

  const byClient = new Map();
  const totals = Object.fromEntries(AGEING_BUCKETS.map(bucket => [bucket.key, 0]));
  let grandTotal = 0;

  for (const row of rows) {
    const key = row._id.clientId ? String(row._id.clientId) : `walkin:${row.billToName || 'Unnamed'}`;
    const client = row._id.clientId ? clientMap.get(String(row._id.clientId)) : null;
    const entry = byClient.get(key) || {
      clientId: row._id.clientId || null,
      name: client?.companyName || row.billToName || 'Walk-in buyer',
      email: client?.email || '',
      phone: client?.phone || '',
      buckets: Object.fromEntries(AGEING_BUCKETS.map(bucket => [bucket.key, 0])),
      invoices: 0,
      total: 0,
      oldestDue: null,
      maxDaysPastDue: 0
    };

    const amount = roundMoney(row.amount);
    entry.buckets[row._id.bucket] = roundMoney(entry.buckets[row._id.bucket] + amount);
    entry.invoices += row.invoices;
    entry.total = roundMoney(entry.total + amount);
    if (row.oldestDue && (!entry.oldestDue || row.oldestDue < entry.oldestDue)) entry.oldestDue = row.oldestDue;
    entry.maxDaysPastDue = Math.max(entry.maxDaysPastDue, row.maxDaysPastDue || 0);
    byClient.set(key, entry);

    totals[row._id.bucket] = roundMoney(totals[row._id.bucket] + amount);
    grandTotal = roundMoney(grandTotal + amount);
  }

  return {
    asOf: asOf.toISOString().slice(0, 10),
    buckets: AGEING_BUCKETS.map(({ key, label }) => ({ key, label, amount: totals[key] })),
    total: grandTotal,
    // Worst first: the report is read to decide who to chase.
    clients: [...byClient.values()].sort((a, b) => b.maxDaysPastDue - a.maxDaysPastDue || b.total - a.total)
  };
}

/**
 * A statement of account for one customer.
 *
 * Invoices and payments interleaved with a running balance, which is what a customer
 * asks for when they dispute what they owe. Ordered by date and then by type, so a
 * payment recorded on the same day as an invoice appears after it — a running balance
 * that dips negative because the payment sorted first reads as an error.
 */
async function statement(orgId, clientId, { from, to = new Date() } = {}) {
  const client = await Client.findOne({ _id: clientId, orgId }).lean();
  if (!client) {
    const error = new Error('Client not found');
    error.statusCode = 404;
    throw error;
  }

  const dateFilter = {};
  if (from) dateFilter.$gte = from;
  if (to) dateFilter.$lte = to;

  const [invoices, payments] = await Promise.all([
    Invoice.find({
      orgId,
      clientId,
      deletedAt: null,
      // A draft was never given to the customer, so it is not part of their statement.
      status: { $nin: ['draft'] },
      ...(Object.keys(dateFilter).length ? { date: dateFilter } : {})
    }).select('invoiceNumber date dueDate status totals.total amountPaid amountCredited balanceDue').sort({ date: 1 }).lean(),
    Payment.find({
      orgId,
      clientId,
      status: 'success',
      ...(Object.keys(dateFilter).length ? { date: dateFilter } : {})
    }).select('date amount method reference invoiceId').sort({ date: 1 }).lean()
  ]);

  /**
   * The opening balance.
   *
   * Everything owed before the window, so a statement for a period still reconciles.
   * Omitting it is the classic statement bug: the closing balance is right only if the
   * period happens to start at the beginning of the relationship.
   */
  let opening = 0;
  if (from) {
    const [priorInvoices, priorPayments] = await Promise.all([
      Invoice.aggregate([
        {
          $match: {
            orgId: new mongoose.Types.ObjectId(String(orgId)),
            clientId: new mongoose.Types.ObjectId(String(clientId)),
            deletedAt: null,
            status: { $nin: ['draft'] },
            date: { $lt: from }
          }
        },
        { $group: { _id: null, invoiced: { $sum: '$totals.total' }, credited: { $sum: { $ifNull: ['$amountCredited', 0] } } } }
      ]),
      Payment.aggregate([
        {
          $match: {
            orgId: new mongoose.Types.ObjectId(String(orgId)),
            clientId: new mongoose.Types.ObjectId(String(clientId)),
            status: 'success',
            date: { $lt: from }
          }
        },
        { $group: { _id: null, paid: { $sum: '$amount' } } }
      ])
    ]);
    opening = roundMoney(
      (priorInvoices[0]?.invoiced || 0) - (priorInvoices[0]?.credited || 0) - (priorPayments[0]?.paid || 0)
    );
  }

  const entries = [
    ...invoices.map(invoice => ({
      date: invoice.date,
      type: 'invoice',
      reference: invoice.invoiceNumber,
      description: `Invoice ${invoice.invoiceNumber}`,
      debit: roundMoney(invoice.totals?.total || 0),
      credit: 0,
      status: invoice.status,
      dueDate: invoice.dueDate
    })),
    ...invoices
      .filter(invoice => (invoice.amountCredited || 0) > 0)
      .map(invoice => ({
        date: invoice.date,
        type: 'credit-note',
        reference: invoice.invoiceNumber,
        description: `Credit note(s) against ${invoice.invoiceNumber}`,
        debit: 0,
        credit: roundMoney(invoice.amountCredited)
      })),
    ...payments.map(payment => ({
      date: payment.date,
      type: 'payment',
      reference: payment.reference || '',
      description: `Payment received${payment.method ? ` (${payment.method})` : ''}`,
      debit: 0,
      credit: roundMoney(payment.amount)
    }))
  ].sort((a, b) => {
    const byDate = new Date(a.date) - new Date(b.date);
    if (byDate !== 0) return byDate;
    // An invoice before the payment that settles it, on the same day.
    const order = { invoice: 0, 'credit-note': 1, payment: 2 };
    return order[a.type] - order[b.type];
  });

  let running = opening;
  const lines = entries.map(entry => {
    running = roundMoney(running + entry.debit - entry.credit);
    return { ...entry, balance: running };
  });

  return {
    client: { _id: client._id, name: client.companyName, email: client.email, phone: client.phone, gstin: client.gstin, address: client.address },
    period: {
      from: from ? from.toISOString().slice(0, 10) : null,
      to: to.toISOString().slice(0, 10)
    },
    openingBalance: opening,
    closingBalance: running,
    totals: {
      invoiced: roundMoney(lines.filter(l => l.type === 'invoice').reduce((sum, l) => sum + l.debit, 0)),
      credited: roundMoney(lines.filter(l => l.type === 'credit-note').reduce((sum, l) => sum + l.credit, 0)),
      received: roundMoney(lines.filter(l => l.type === 'payment').reduce((sum, l) => sum + l.credit, 0))
    },
    lines
  };
}

/**
 * Collection metrics (2.4 #33): DSO, collection efficiency, and the payment-method mix.
 *
 * DSO is computed the standard way — receivables ÷ credit sales × days — rather than by
 * averaging invoice-to-payment gaps, because the average ignores the invoices that have
 * not been paid *at all*, which is precisely where a collections problem hides.
 */
async function collectionMetrics(orgId, { days = 90 } = {}) {
  const orgObjectId = new mongoose.Types.ObjectId(String(orgId));
  const since = new Date(Date.now() - days * 86400000);

  const [salesAgg, outstandingAgg, receivedAgg, methodMix, settledAgg] = await Promise.all([
    Invoice.aggregate([
      { $match: { orgId: orgObjectId, deletedAt: null, status: { $nin: ['draft', 'cancelled'] }, date: { $gte: since } } },
      { $group: { _id: null, invoiced: { $sum: '$totals.total' }, count: { $sum: 1 } } }
    ]),
    Invoice.aggregate([
      {
        $match: {
          orgId: orgObjectId,
          deletedAt: null,
          status: { $in: OPEN_STATUSES },
          $or: [{ balanceDue: { $gt: 0 } }, { balanceDue: { $exists: false } }]
        }
      },
      { $group: { _id: null, outstanding: { $sum: { $ifNull: ['$balanceDue', '$totals.total'] } } } }
    ]),
    Payment.aggregate([
      { $match: { orgId: orgObjectId, status: 'success', date: { $gte: since } } },
      { $group: { _id: null, received: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]),
    Payment.aggregate([
      { $match: { orgId: orgObjectId, status: 'success', date: { $gte: since } } },
      { $group: { _id: '$method', amount: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { amount: -1 } }
    ]),
    // Average days to settle, over invoices that actually got paid — reported
    // alongside DSO rather than instead of it, because the two say different things.
    Invoice.aggregate([
      {
        $match: {
          orgId: orgObjectId,
          deletedAt: null,
          status: 'paid',
          paidDate: { $type: 'date' },
          date: { $gte: since }
        }
      },
      { $project: { days: { $dateDiff: { startDate: '$date', endDate: '$paidDate', unit: 'day' } } } },
      { $group: { _id: null, avgDays: { $avg: '$days' }, count: { $sum: 1 } } }
    ])
  ]);

  const invoiced = roundMoney(salesAgg[0]?.invoiced || 0);
  const outstanding = roundMoney(outstandingAgg[0]?.outstanding || 0);
  const received = roundMoney(receivedAgg[0]?.received || 0);
  const methodTotal = methodMix.reduce((sum, row) => sum + row.amount, 0);

  return {
    period: { days, from: since.toISOString().slice(0, 10) },
    invoiced,
    received,
    outstanding,
    /** Days sales outstanding. Null rather than 0 when nothing was invoiced — a DSO of
     *  zero would read as "we collect instantly". */
    dso: invoiced > 0 ? Math.round((outstanding / invoiced) * days) : null,
    /** What share of what we billed has actually arrived. */
    collectionEfficiency: invoiced > 0 ? Math.round((received / invoiced) * 1000) / 10 : null,
    averageDaysToPay: settledAgg[0]?.avgDays != null ? Math.round(settledAgg[0].avgDays * 10) / 10 : null,
    settledInvoices: settledAgg[0]?.count || 0,
    paymentMix: methodMix.map(row => ({
      method: row._id || 'unspecified',
      amount: roundMoney(row.amount),
      count: row.count,
      share: methodTotal > 0 ? Math.round((row.amount / methodTotal) * 1000) / 10 : 0
    }))
  };
}

/**
 * Sales by item, category and client (2.4 #31).
 *
 * Line-level, so "what do we actually sell" has an answer. `$unwind` on the embedded
 * items is the whole reason this is cheap — the data is already denormalised onto the
 * invoice, so no join is involved.
 */
async function salesBreakdown(orgId, { from, to = new Date() } = {}) {
  const orgObjectId = new mongoose.Types.ObjectId(String(orgId));
  const match = {
    orgId: orgObjectId,
    deletedAt: null,
    status: { $nin: ['draft', 'cancelled'] }
  };
  if (from) match.date = { $gte: from, $lte: to };

  const [byItem, byClient] = await Promise.all([
    Invoice.aggregate([
      { $match: match },
      { $unwind: '$items' },
      {
        $group: {
          _id: { $toLower: '$items.desc' },
          description: { $first: '$items.desc' },
          hsn: { $first: '$items.hsn' },
          quantity: { $sum: '$items.qty' },
          // Gross of discounts: the discount is a separate figure and folding it in here
          // would hide it, which is the same mistake the Bill Generator used to make.
          value: { $sum: { $multiply: ['$items.qty', '$items.rate'] } },
          invoices: { $sum: 1 }
        }
      },
      { $sort: { value: -1 } },
      { $limit: 100 }
    ]),
    Invoice.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$clientId',
          value: { $sum: '$totals.total' },
          invoices: { $sum: 1 },
          billToName: { $first: '$billTo.name' }
        }
      },
      { $sort: { value: -1 } },
      { $limit: 50 },
      { $lookup: { from: 'clients', localField: '_id', foreignField: '_id', as: 'client' } },
      {
        $project: {
          _id: 0,
          clientId: '$_id',
          name: { $ifNull: [{ $first: '$client.companyName' }, { $ifNull: ['$billToName', 'Walk-in buyer'] }] },
          value: 1,
          invoices: 1
        }
      }
    ])
  ]);

  return {
    period: { from: from ? from.toISOString().slice(0, 10) : null, to: to.toISOString().slice(0, 10) },
    byItem: byItem.map(row => ({
      description: row.description,
      hsn: row.hsn || '',
      quantity: roundMoney(row.quantity),
      value: roundMoney(row.value),
      invoices: row.invoices
    })),
    byClient: byClient.map(row => ({ ...row, value: roundMoney(row.value) }))
  };
}

module.exports = { AGEING_BUCKETS, ageing, statement, collectionMetrics, salesBreakdown };
