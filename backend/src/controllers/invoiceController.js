const mongoose = require('mongoose');
const { Organisation } = require('../models/Organisation');
const { Client } = require('../models/Client');
const { Invoice } = require('../models/Invoice');
const { Payment } = require('../models/Payment');
const { CreditNote } = require('../models/CreditNote');
const { asyncHandler } = require('../utils/asyncHandler');
const { httpError } = require('../utils/httpError');
const { tenantFilter } = require('../middleware/tenantMiddleware');
const { calculateInvoiceTotals, roundMoney } = require('../services/gstService');
const { nextInvoiceNumber } = require('../services/invoiceNumberService');
const { renderInvoicePdf } = require('../services/pdfService');
const { getPlatformDefaults } = require('../services/platformSettingsService');
const { sendReminderEmail } = require('../services/emailService');
const { assertInvoiceQuota } = require('../services/planService');
const { logAudit } = require('../services/auditService');
const { runReminderSweep, daysPastDue } = require('../services/reminderService');
const { ReminderLog } = require('../models/ReminderLog');
const { Reminder } = require('../models/Settings');
const { paginate, escapeRegex, parseSort } = require('../utils/pagination');
const { streamCsv } = require('../services/csvService');
const { env } = require('../config/env');
const { recordEvent, EVENT } = require('../services/usageEventService');

/**
 * The configured reminder stage an invoice at `overdueDays` has reached, so a
 * manual send uses the same wording the automated sweep would have used.
 * Returns null when no stage applies (nothing configured, or not due yet), in
 * which case emailService falls back to its defaults.
 */
async function currentReminderStage(overdueDays) {
  const stages = await Reminder.find({ enabled: { $ne: false } }).lean();
  return stages
    .filter(stage => overdueDays >= Number(stage.daysOffset || 0))
    .sort((a, b) => Number(b.daysOffset || 0) - Number(a.daysOffset || 0))[0] || null;
}

async function totalsFor(req, body) {
  const org = await Organisation.findById(req.orgId);
  let toStateCode;
  if (body.clientId) {
    const client = await Client.findOne({ _id: body.clientId, ...tenantFilter(req) });
    if (!client) throw httpError(400, 'Valid clientId is required');
    toStateCode = client.stateCode;
  } else if (body.billTo?.name) {
    toStateCode = body.billTo.stateCode || org.stateCode;
  } else {
    throw httpError(400, 'Provide a registered client or buyer details');
  }
  return calculateInvoiceTotals(body.items || [], org.stateCode, toStateCode, {
    discountPercent: body.discountPercent,
    // Whole-rupee rounding is the Indian billing convention, but a tenant that
    // bills in exact paise can turn it off.
    roundOff: org.brandingConfig?.roundOffTotal !== false
  });
}

/**
 * Recomputes an invoice's settlement state from its successful payments and
 * persists it.
 *
 * Single source of truth for `amountPaid`, `balanceDue`, `status` and
 * `paidDate`. Both markPaid and payment recording route through here, which is
 * what stops the two from disagreeing — markPaid used to force status:'paid'
 * and write a Payment for the *full* invoice total even when part-payments
 * already existed, so recorded collections ended up exceeding the invoice.
 *
 * Status is only ever moved between the settlement states; a draft stays a
 * draft until it is issued.
 */
async function recalculateSettlement(invoice) {
  const [paymentAgg, creditAgg] = await Promise.all([
    Payment.aggregate([
      { $match: { invoiceId: invoice._id, orgId: invoice.orgId, status: 'success' } },
      { $group: { _id: '$invoiceId', amount: { $sum: '$amount' } } }
    ]),
    // Credit notes reduce what is owed just as much as a payment does — a fully
    // credited invoice is settled even though no money changed hands. Only
    // issued notes count; a draft has not been given to the customer.
    CreditNote.aggregate([
      { $match: { invoiceId: invoice._id, orgId: invoice.orgId, status: 'issued' } },
      { $group: { _id: '$invoiceId', amount: { $sum: '$totals.total' } } }
    ])
  ]);

  const invoiceTotal = roundMoney(invoice.totals?.total || 0);
  const amountCredited = roundMoney(creditAgg[0]?.amount || 0);
  // What the customer is actually liable for after credits.
  const total = roundMoney(Math.max(0, invoiceTotal - amountCredited));
  const amountPaid = roundMoney(paymentAgg[0]?.amount || 0);
  const balanceDue = roundMoney(Math.max(0, total - amountPaid));

  invoice.amountPaid = amountPaid;
  invoice.amountCredited = amountCredited;
  invoice.balanceDue = balanceDue;

  if (invoice.status !== 'draft') {
    const pastDue = invoice.dueDate && invoice.dueDate < new Date();
    // A fully credited invoice is closed, not "paid" — nothing was collected.
    if (amountCredited >= invoiceTotal && invoiceTotal > 0) {
      invoice.status = 'cancelled';
      invoice.paidDate = undefined;
    } else if (amountPaid >= total && total > 0) {
      invoice.status = 'paid';
      invoice.paidDate = invoice.paidDate || new Date();
    } else {
      // 'overdue' outranks 'partial': a part-paid invoice that is also late
      // needs chasing, and `amountPaid`/`balanceDue` still record how much
      // came in. Previously a partial invoice could never become overdue at
      // all, so late part-payers dropped off the collections list entirely.
      invoice.status = pastDue ? 'overdue' : (amountPaid > 0 ? 'partial' : 'pending');
      invoice.paidDate = undefined;
    }
  }

  await invoice.save();
  return invoice;
}

// clientId/billTo are mutually exclusive (a registered-client invoice vs a
// walk-in quick bill) — clearing the other whenever one is set lets a bill
// be "converted" to a client invoice (or vice versa) just by switching which
// one the request populates, without stale data lingering on the document.
function normalizeBuyer(body) {
  if (body.clientId === undefined && body.billTo === undefined) return body;
  const out = { ...body };
  if (out.clientId) out.billTo = null;
  else if (out.billTo?.name) out.clientId = null;
  return out;
}

/**
 * The statuses that represent money still owed.
 *
 * 'overdue' is stored, but it is a denormalisation: an invoice falls due at
 * midnight, and the value in the database only catches up when the scheduled
 * sweep next runs (see services/maintenanceService.js). The sweep used to be a
 * collection-wide `updateMany` executed at the top of every list, stats and
 * export request — a write on every read.
 *
 * Rather than write on read, the read derives it. These helpers translate a
 * requested status into a filter that is correct against `dueDate` right now,
 * so removing the write cost nothing in accuracy.
 */
const OPEN_STATUSES = ['pending', 'partial', 'overdue'];

function applyStatusFilter(filter, status) {
  if (!status) return filter;

  if (status === 'unpaid') {
    // Everything with money still outstanding, however it is aged. This is what
    // a collections view wants — the Payments tracker used to assemble it by
    // downloading every invoice and filtering three statuses in the browser.
    filter.status = { $in: OPEN_STATUSES };
    filter.$or = [{ balanceDue: { $gt: 0 } }, { balanceDue: { $exists: false } }];
    return filter;
  }

  if (status === 'overdue') {
    // Anything open and past its due date, whether or not the sweep has
    // relabelled it yet. Served by the { orgId, status, dueDate } index.
    filter.status = { $in: OPEN_STATUSES };
    filter.dueDate = { $lt: new Date() };
    return filter;
  }

  if (status === 'pending' || status === 'partial') {
    // The mirror image: still open, but *not* yet past due — otherwise an
    // invoice that fell due an hour ago would show up under both filters until
    // the next sweep.
    filter.status = status;
    filter.$or = [{ dueDate: { $gte: new Date() } }, { dueDate: null }, { dueDate: { $exists: false } }];
    return filter;
  }

  filter.status = status;
  return filter;
}

// Sorting is restricted to indexed columns. An open `?sort=` invites a sort on
// an unindexed field, which MongoDB performs in memory and refuses outright past
// 32MB.
const INVOICE_SORTS = ['date', 'createdAt', 'invoiceNumber', 'dueDate', 'status'];

function buildInvoiceFilter(req) {
  const filter = tenantFilter(req);
  applyStatusFilter(filter, req.query.status);
  if (req.query.clientId) filter.clientId = req.query.clientId;
  if (req.query.q) {
    const term = escapeRegex(String(req.query.q).trim());
    if (term) {
      // Search matches the invoice number or a walk-in buyer's name. `$or` is
      // used carefully here: `applyStatusFilter` may already have set `$or` for
      // the due-date window, so the two are combined under `$and` rather than
      // one silently overwriting the other.
      const search = [
        { invoiceNumber: { $regex: term, $options: 'i' } },
        { 'billTo.name': { $regex: term, $options: 'i' } }
      ];
      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: search }];
        delete filter.$or;
      } else {
        filter.$or = search;
      }
    }
  }
  return filter;
}

const listInvoices = asyncHandler(async (req, res) => {
  const filter = buildInvoiceFilter(req);
  const sort = parseSort(req.query, INVOICE_SORTS, { date: -1, createdAt: -1 });
  const page = await paginate(Invoice, filter, req.query, query => query
    // Only the buyer fields the list actually renders. Populating the whole
    // client document pulled its full address and contact block into every row.
    .populate('clientId', 'companyName gstin email')
    .sort(sort));
  res.json(page);
});

/**
 * Aggregated numbers for the dashboard.
 *
 * Revenue is measured from money actually received (successful Payment
 * records), not from invoice status. The previous version summed the totals of
 * invoices whose status happened to be 'paid', which meant a ₹1,00,000 invoice
 * with ₹90,000 received counted as ₹0 revenue *and* ₹1,00,000 pending — both
 * wrong, and wrong in opposite directions.
 *
 * Outstanding figures come from the persisted `balanceDue`, so a part-paid
 * invoice contributes only what is still owed.
 *
 * Runs as aggregation pipelines rather than loading every invoice in the org
 * into memory and reducing in JavaScript.
 *
 * The overdue split is computed inside the pipeline from `dueDate`, not read
 * from the stored status, so the dashboard is correct the moment an invoice
 * falls due — it no longer needs a write-on-read sweep to have run first.
 */
const invoiceStats = asyncHandler(async (req, res) => {
  const orgId = new mongoose.Types.ObjectId(String(req.orgId));
  const now = new Date();

  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
  twelveMonthsAgo.setDate(1);
  twelveMonthsAgo.setHours(0, 0, 0, 0);

  const [statusAgg, receivedAgg, monthlyAgg, topClientsAgg, collectionAgg] = await Promise.all([
    // Counts and outstanding balances per status, in one pass.
    Invoice.aggregate([
      { $match: { orgId } },
      {
        // Derive the reporting status. An open invoice past its due date is
        // overdue regardless of what the stored field says, which is what lets
        // the scheduled sweep run hourly without the dashboard going stale.
        //
        // The guard is a **type check**, not a null check, and the distinction is
        // not academic: in an aggregation expression a *missing* field is not
        // equal to null (`{$ne: ['$dueDate', null]}` is `true` when the field is
        // absent) while `{$lt: ['$dueDate', <date>]}` is also `true`, because
        // missing sorts before every date. A null check therefore catches an
        // explicit `dueDate: null` and silently reports every invoice with no due
        // date at all as overdue. `$type` covers absent, null and any wrong type
        // in one condition.
        $addFields: {
          reportingStatus: {
            $cond: [
              {
                $and: [
                  { $in: ['$status', OPEN_STATUSES] },
                  { $eq: [{ $type: '$dueDate' }, 'date'] },
                  { $lt: ['$dueDate', now] }
                ]
              },
              'overdue',
              '$status'
            ]
          }
        }
      },
      {
        $group: {
          _id: '$reportingStatus',
          count: { $sum: 1 },
          balance: { $sum: { $ifNull: ['$balanceDue', 0] } },
          invoiced: { $sum: { $ifNull: ['$totals.total', 0] } }
        }
      }
    ]),
    // Total collected, ever.
    Payment.aggregate([
      { $match: { orgId, status: 'success' } },
      { $group: { _id: null, amount: { $sum: '$amount' } } }
    ]),
    // Collections per month for the trailing 12 months, by payment date —
    // which is when the money arrived, rather than when the invoice was
    // stamped paid.
    Payment.aggregate([
      { $match: { orgId, status: 'success', date: { $gte: twelveMonthsAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$date' } }, revenue: { $sum: '$amount' } } },
      { $sort: { _id: 1 } }
    ]),
    // Top clients by money received. Walk-in bills have no clientId and are
    // grouped out, same as before.
    Payment.aggregate([
      { $match: { orgId, status: 'success', clientId: { $ne: null } } },
      { $group: { _id: '$clientId', revenue: { $sum: '$amount' } } },
      { $sort: { revenue: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'clients', localField: '_id', foreignField: '_id', as: 'client' } },
      { $project: { revenue: 1, name: { $ifNull: [{ $first: '$client.companyName' }, 'Unknown'] } } }
    ]),
    // How long settled invoices took to collect, and how many payments there
    // are. The Payments page derived both by reducing over the full invoice and
    // payment arrays in the browser — which stops being possible once those
    // endpoints return a page, and was the reason they could not be paginated.
    Invoice.aggregate([
      { $match: { orgId, status: 'paid', paidDate: { $ne: null }, date: { $ne: null } } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          // Milliseconds between raising and collecting, averaged. Negative
          // values (a payment back-dated before the invoice) are clamped so one
          // data-entry slip cannot drag the average below zero.
          totalMs: { $sum: { $max: [0, { $subtract: ['$paidDate', '$date'] }] } }
        }
      }
    ])
  ]);

  const byStatus = Object.fromEntries(statusAgg.map(row => [row._id, row]));
  const count = status => byStatus[status]?.count || 0;
  const balance = statuses => roundMoney(statuses.reduce((sum, s) => sum + (byStatus[s]?.balance || 0), 0));

  const settled = collectionAgg[0];
  const avgCollectionDays = settled?.count
    ? Math.round(settled.totalMs / settled.count / 86400000)
    : null;

  res.json({
    totalRevenue: roundMoney(receivedAgg[0]?.amount || 0),
    // What is still owed, not the face value of unpaid invoices.
    pendingAmount: balance(['pending', 'partial']),
    overdueAmount: balance(['overdue']),
    // Everything issued and not yet collected, however it is aged.
    outstandingAmount: balance(['pending', 'partial', 'overdue']),
    // The invoice list's status tabs read their counts from here. They used to be
    // derived by filtering the fully-downloaded invoice array in the browser,
    // which is no longer possible now that the list is a page — and was wrong
    // anyway once the list exceeded one page.
    counts: {
      total: statusAgg.reduce((sum, row) => sum + row.count, 0),
      paid: count('paid'),
      pending: count('pending') + count('partial'),
      overdue: count('overdue'),
      draft: count('draft'),
      cancelled: count('cancelled'),
      // Kept separate as well as folded into `pending`, so a caller can show
      // part-paid invoices distinctly without another query.
      partial: count('partial')
    },
    // Average days from invoice date to payment date across settled invoices,
    // or null when nothing has been collected yet.
    avgCollectionDays,
    monthlyRevenue: monthlyAgg.map(row => ({ month: row._id, revenue: roundMoney(row.revenue) })),
    topClients: topClientsAgg.map(row => ({ name: row.name, revenue: roundMoney(row.revenue) }))
  });
});

const getInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOne({ _id: req.params.id, ...tenantFilter(req) }).populate('clientId');
  if (!invoice) throw httpError(404, 'Invoice not found');
  res.json(invoice);
});

const createInvoice = asyncHandler(async (req, res) => {
  await assertInvoiceQuota(req.orgId);
  const body = normalizeBuyer(req.body);
  // The number is always server-generated from the org's atomic counter,
  // never taken from the request — a client-supplied value would bypass
  // that counter (leaving it out of sync) and risks colliding with a
  // number the counter has already handed out.
  delete body.invoiceNumber;
  const totals = await totalsFor(req, body);
  const invoice = await Invoice.create({
    ...body,
    orgId: req.orgId,
    invoiceNumber: await nextInvoiceNumber(req.orgId),
    totals,
    // Nothing collected yet, so the whole total is outstanding. Keeping these
    // in step with `totals` from the moment of creation means the dashboard
    // never has to guess.
    amountPaid: 0,
    balanceDue: totals.total
  });
  logAudit({ req, action: 'invoice.created', entity: 'invoice', entityId: invoice._id, meta: { invoiceNumber: invoice.invoiceNumber, total: totals.total } });
  // A clientless invoice came from the Bill Generator, so the two are reported as
  // separate features in the console's adoption matrix — they are different
  // workflows with different audiences, and one number for both hides which one
  // tenants actually reach for.
  recordEvent({
    req,
    type: invoice.clientId ? EVENT.invoiceCreated : EVENT.billCreated,
    value: totals.total,
    meta: { invoiceNumber: invoice.invoiceNumber }
  });
  res.status(201).json(invoice);
});

const updateInvoice = asyncHandler(async (req, res) => {
  const update = normalizeBuyer(req.body);
  // Immutable once issued — same reasoning as createInvoice above, and it
  // also stops an edit from accidentally reassigning an already-used number.
  delete update.invoiceNumber;
  const pricingChanged = req.body.items
    || req.body.discountPercent !== undefined
    || req.body.clientId !== undefined
    || req.body.billTo !== undefined;

  const existing = await Invoice.findOne({ _id: req.params.id, ...tenantFilter(req) });
  if (!existing) throw httpError(404, 'Invoice not found');

  /**
   * An issued invoice is a document the customer holds and the GST return has
   * counted. Repricing it silently — which is what this endpoint used to
   * allow, on a fully-paid invoice, with no versioning and no diff in the audit
   * log — makes our copy disagree with theirs and with the return.
   *
   * Presentational fields stay editable, because correcting a note or a due
   * date changes nothing that has been reported.
   */
  if (existing.status !== 'draft' && pricingChanged) {
    throw httpError(
      409,
      `Invoice ${existing.invoiceNumber} has been issued, so its items and amounts can no longer be changed. Issue a credit note to reduce or reverse it.`,
      'INVOICE_LOCKED'
    );
  }
  if (existing.status === 'cancelled') {
    throw httpError(409, `Invoice ${existing.invoiceNumber} has been cancelled and can no longer be edited.`, 'INVOICE_CANCELLED');
  }
  // Status is a settlement outcome, owned by recalculateSettlement — letting a
  // caller set it directly would desync it from the payments on record.
  if (update.status !== undefined && existing.status !== 'draft' && update.status !== existing.status) {
    throw httpError(
      409,
      'An issued invoice\'s status follows its payments and credit notes and cannot be set directly. Record a payment, or issue a credit note.',
      'STATUS_DERIVED'
    );
  }

  if (pricingChanged) {
    update.totals = await totalsFor(req, normalizeBuyer({ ...existing.toObject(), ...req.body }));
  }
  const invoice = await Invoice.findOneAndUpdate(
    { _id: req.params.id, ...tenantFilter(req) },
    update,
    { new: true, runValidators: true }
  );
  if (!invoice) throw httpError(404, 'Invoice not found');
  // Repricing moves the total, so the outstanding balance and the settlement
  // status have to be recomputed against whatever has already been received —
  // otherwise editing a part-paid invoice leaves balanceDue pointing at the
  // old figure.
  if (pricingChanged) await recalculateSettlement(invoice);
  logAudit({ req, action: 'invoice.updated', entity: 'invoice', entityId: invoice._id, meta: { invoiceNumber: invoice.invoiceNumber, total: invoice.totals?.total } });
  res.json(invoice);
});

const duplicateInvoice = asyncHandler(async (req, res) => {
  // Duplicating creates a real invoice and consumes a number from the org's
  // counter, so it has to respect the plan's monthly quota — otherwise Duplicate
  // is simply a way around the limit that createInvoice enforces.
  await assertInvoiceQuota(req.orgId);
  const source = await Invoice.findOne({ _id: req.params.id, ...tenantFilter(req) });
  if (!source) throw httpError(404, 'Invoice not found');
  const copy = source.toObject();
  delete copy._id;
  delete copy.createdAt;
  delete copy.updatedAt;
  const invoice = await Invoice.create({
    ...copy,
    invoiceNumber: await nextInvoiceNumber(req.orgId),
    date: new Date(),
    dueDate: new Date(Date.now() + 15 * 86400000),
    status: 'draft',
    paidDate: null,
    // The copy is a fresh unpaid document — carrying over the source's
    // settlement would show it as already collected.
    amountPaid: 0,
    balanceDue: source.totals?.total || 0
  });
  logAudit({ req, action: 'invoice.duplicated', entity: 'invoice', entityId: invoice._id, meta: { from: source.invoiceNumber, to: invoice.invoiceNumber } });
  res.status(201).json(invoice);
});

/**
 * Settles an invoice in full by recording a payment for whatever is still
 * outstanding.
 *
 * It used to write a payment for the *entire* invoice total and force
 * status:'paid' regardless of what had already been received — so marking a
 * part-paid invoice as paid recorded more money than the invoice was worth,
 * inflating collection stats and the payments export. Now it settles only the
 * balance, and refuses when there is nothing left to settle.
 */
const markPaid = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOne({ _id: req.params.id, ...tenantFilter(req) });
  if (!invoice) throw httpError(404, 'Invoice not found');

  // Recompute first: `balanceDue` may be stale on documents created before it
  // was persisted, and this is a money decision.
  await recalculateSettlement(invoice);

  if (invoice.balanceDue <= 0) {
    throw httpError(409, 'This invoice is already fully paid.', 'ALREADY_PAID');
  }

  // Issuing happens implicitly: a draft being marked paid becomes a real
  // invoice, so recalculateSettlement is allowed to move its status.
  if (invoice.status === 'draft') invoice.status = 'pending';

  const payment = await Payment.create({
    orgId: req.orgId,
    invoiceId: invoice._id,
    clientId: invoice.clientId || undefined,
    amount: invoice.balanceDue,
    method: req.body.method || 'Manual',
    reference: req.body.reference || 'marked-paid',
    date: req.body.date || new Date(),
    status: 'success'
  });

  await recalculateSettlement(invoice);
  logAudit({ req, action: 'invoice.paid', entity: 'invoice', entityId: invoice._id, meta: { invoiceNumber: invoice.invoiceNumber, amount: payment.amount } });
  res.json(invoice);
});

/**
 * Sends one reminder now, using the configured template for whichever stage
 * this invoice has reached, and records the attempt.
 *
 * The manual send previously used hardcoded copy and left no delivery record at
 * all — there was no way to tell whether a customer had ever been chased, or
 * what they were told.
 */
const sendReminder = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOne({ _id: req.params.id, ...tenantFilter(req) }).populate('clientId');
  if (!invoice) throw httpError(404, 'Invoice not found');

  const email = invoice.clientId?.email || invoice.billTo?.email;
  const name = invoice.clientId?.companyName || invoice.billTo?.name;
  if (!email) throw httpError(400, 'This buyer has no email address on file');

  const org = await Organisation.findById(req.orgId);
  const overdueDays = Math.max(0, daysPastDue(invoice.dueDate));
  const balanceDue = invoice.balanceDue ?? invoice.totals?.total ?? 0;
  const stage = await currentReminderStage(overdueDays);
  const amount = `INR ${Number(balanceDue).toLocaleString('en-IN')}`;

  const result = await sendReminderEmail({
    to: email,
    clientName: name,
    invoiceNumber: invoice.invoiceNumber,
    // Chase what is still owed, not the original face value — a part-paid
    // invoice was previously chased for the full amount.
    amount,
    balanceDue: amount,
    dueDate: invoice.dueDate,
    orgName: org?.name || 'KloguBizz',
    overdueDays,
    subject: stage?.subject,
    template: stage?.template,
    viewUrl: `${env.FRONTEND_URL}/invoices/${invoice._id}/print`
  });

  await ReminderLog.create({
    orgId: req.orgId,
    invoiceId: invoice._id,
    reminderId: stage?._id,
    stage: stage ? `offset:${stage.daysOffset}` : 'manual',
    to: email,
    status: result.sent ? 'sent' : result.failed ? 'failed' : 'skipped',
    reason: result.reason,
    balanceDue,
    overdueDays,
    trigger: 'manual'
  });

  logAudit({ req, action: 'invoice.reminder_sent', entity: 'invoice', entityId: invoice._id, meta: { to: email, delivered: !!result.sent } });
  recordEvent({ req, type: EVENT.invoiceEmailed, meta: { invoiceNumber: invoice.invoiceNumber, delivered: !!result.sent } });
  res.json({ ok: true, ...result });
});

/**
 * Voids an issued invoice that was never acted on.
 *
 * The narrow case a credit note is overkill for: an invoice raised in error,
 * with nothing collected and nothing credited. The document is kept (its number
 * stays in the series, which is what GST requires) but it stops counting as
 * money owed and drops out of reminders and the outstanding figures.
 *
 * Once any payment exists, this is refused — reversing a real charge is what
 * credit notes are for.
 */
const cancelInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOne({ _id: req.params.id, ...tenantFilter(req) });
  if (!invoice) throw httpError(404, 'Invoice not found');

  if (invoice.status === 'draft') {
    throw httpError(409, 'This invoice is still a draft — delete it instead of cancelling it.', 'INVOICE_IS_DRAFT');
  }
  if (invoice.status === 'cancelled') {
    throw httpError(409, 'This invoice is already cancelled.', 'ALREADY_CANCELLED');
  }

  await recalculateSettlement(invoice);
  if (invoice.amountPaid > 0) {
    throw httpError(
      409,
      `Invoice ${invoice.invoiceNumber} has ${invoice.amountPaid.toFixed(2)} recorded against it, so it cannot be cancelled. Void the payment first, or issue a credit note to reverse the charge.`,
      'INVOICE_HAS_PAYMENTS'
    );
  }

  invoice.status = 'cancelled';
  invoice.cancelledAt = new Date();
  invoice.cancelReason = req.body?.reason;
  invoice.balanceDue = 0;
  invoice.paidDate = undefined;
  await invoice.save();

  logAudit({ req, action: 'invoice.cancelled', entity: 'invoice', entityId: invoice._id, meta: { invoiceNumber: invoice.invoiceNumber, reason: invoice.cancelReason } });
  res.json(invoice);
});

/**
 * Deletes a draft.
 *
 * Only drafts. Once an invoice is issued it has been given to a customer and
 * counted in a GST return, and under GST it must be reversed with a credit
 * note rather than erased — deleting it also punches a permanent hole in the
 * invoice number series, which is itself a compliance problem. Credit notes are
 * the follow-up to this change; until they exist, an issued invoice can still
 * be corrected by editing it.
 */
const deleteInvoice = asyncHandler(async (req, res) => {
  const existing = await Invoice.findOne({ _id: req.params.id, ...tenantFilter(req) });
  if (!existing) throw httpError(404, 'Invoice not found');

  if (existing.status !== 'draft') {
    throw httpError(
      409,
      `Invoice ${existing.invoiceNumber} has been issued and cannot be deleted — deleting it would leave a gap in your invoice number series and in your GST records. Only drafts can be deleted.`,
      'INVOICE_ISSUED'
    );
  }
  const paymentCount = await Payment.countDocuments({ ...tenantFilter(req), invoiceId: existing._id });
  if (paymentCount > 0) {
    throw httpError(409, 'This invoice has payments recorded against it and cannot be deleted.', 'INVOICE_HAS_PAYMENTS');
  }

  await existing.deleteOne();
  logAudit({ req, action: 'invoice.deleted', entity: 'invoice', entityId: existing._id, meta: { invoiceNumber: existing.invoiceNumber } });
  res.status(204).end();
});

// Missing/undefined figures export as 0.00 rather than blowing up on
// `.toFixed` — documents created before a totals field existed have no value
// for it.
function money(value) {
  return Number(value || 0).toFixed(2);
}

const INVOICE_CSV_COLUMNS = [
  { label: 'Invoice Number', value: i => i.invoiceNumber },
  { label: 'Client', value: i => i.clientId?.companyName || i.billTo?.name || '' },
  { label: 'GSTIN', value: i => i.clientId?.gstin || i.billTo?.gstin || '' },
  { label: 'Date', value: i => i.date?.toISOString().slice(0, 10) },
  { label: 'Due Date', value: i => i.dueDate?.toISOString().slice(0, 10) },
  { label: 'Status', value: i => i.status },
  { label: 'Gross Value', value: i => money(i.totals?.grossSubtotal ?? i.totals?.subtotal) },
  { label: 'Discount', value: i => money(i.totals?.discountTotal) },
  { label: 'Taxable Value', value: i => money(i.totals?.subtotal) },
  { label: 'CGST', value: i => money(i.totals?.cgst) },
  { label: 'SGST/UTGST', value: i => money(i.totals?.sgst) },
  { label: 'IGST', value: i => money(i.totals?.igst) },
  { label: 'Cess', value: i => money(i.totals?.cess) },
  { label: 'Round Off', value: i => money(i.totals?.roundOff) },
  { label: 'Total', value: i => money(i.totals?.total) },
  { label: 'Amount Paid', value: i => money(i.amountPaid) },
  { label: 'Balance Due', value: i => money(i.balanceDue) }
];

/**
 * The full filtered set, not one page — an export is expected to be complete.
 * It is streamed from a cursor rather than loaded, so "complete" no longer means
 * "the whole collection plus the whole CSV string, in memory, at once".
 */
const exportInvoicesCsv = asyncHandler(async (req, res) => {
  const filter = buildInvoiceFilter(req);
  const cursor = Invoice.find(filter)
    .populate('clientId', 'companyName gstin')
    .sort({ date: -1 })
    .cursor();
  recordEvent({ req, type: EVENT.exportCsv, meta: { of: 'invoices' } });
  await streamCsv(res, { filename: 'invoices.csv', columns: INVOICE_CSV_COLUMNS, cursor });
});

/**
 * Chases every unpaid invoice for this tenant.
 *
 * Runs as a background job rather than inside the request. The old version sent
 * emails serially in the request handler, so a tenant with 500 overdue invoices
 * held the connection open for minutes and then hit the platform's request
 * timeout — losing both the response and any idea of how far it had got.
 *
 * The work goes through the same sweep the scheduler uses, so it gets the
 * configured templates, the per-stage dedup (a customer already chased today is
 * not chased again) and a ReminderLog entry per attempt for free.
 */
const remindAll = asyncHandler(async (req, res) => {
  const filter = tenantFilter(req);

  // Report what is *eligible* so the response is immediately meaningful, then
  // let the sweep decide what actually needs sending. Counted with a cursor
  // rather than an array: the point of this endpoint is a tenant with a large
  // overdue book, so materialising all of them just to count the ones with an
  // email address would reintroduce the problem at the other end.
  let total = 0;
  let withEmail = 0;
  const cursor = Invoice.find({ ...filter, status: { $in: OPEN_STATUSES } })
    .populate('clientId', 'email')
    .select('clientId billTo')
    .lean()
    .cursor();
  for await (const invoice of cursor) {
    total += 1;
    if (invoice.clientId?.email || invoice.billTo?.email) withEmail += 1;
  }

  const orgId = req.orgId;
  const actor = { orgId, user: req.user };
  // Deliberately not awaited: the response returns immediately and the sweep
  // continues in the background. Errors are logged rather than surfaced,
  // because there is no longer a request to surface them to — the per-invoice
  // outcome lands in ReminderLog either way.
  setImmediate(() => {
    runReminderSweep({ orgId })
      .then(result => {
        logAudit({
          req: actor,
          action: 'invoice.remind_all',
          entity: 'invoice',
          meta: { sent: result.sent, skipped: result.skipped, failed: result.failed, scanned: result.scanned }
        });
        req.log.info('manual reminder sweep finished', { orgId: String(orgId), ...result, details: undefined });
      })
      .catch(error => req.log.error('manual reminder sweep failed', { orgId: String(orgId), err: error }));
  });

  res.status(202).json({
    queued: true,
    eligible: withEmail,
    withoutEmail: total - withEmail,
    total,
    message: `Chasing ${withEmail} invoice${withEmail === 1 ? '' : 's'} in the background. Customers already reminded at this stage will be skipped.`
  });
});

const invoicePdf = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOne({ _id: req.params.id, ...tenantFilter(req) }).populate('clientId');
  if (!invoice) throw httpError(404, 'Invoice not found');
  const org = await Organisation.findById(req.orgId);
  const client = invoice.clientId || (invoice.billTo?.name ? {
    companyName: invoice.billTo.name,
    address: invoice.billTo.address,
    gstin: invoice.billTo.gstin,
    stateCode: invoice.billTo.stateCode
  } : null);
  // The platform default applies when this tenant has never chosen a
  // template — previously there was no way for the super admin's choice to
  // reach the renderer at all.
  const platformDefaults = await getPlatformDefaults();
  const buffer = await renderInvoicePdf({ invoice, client, org, platformDefaults });
  recordEvent({ req, type: EVENT.invoicePdf, meta: { invoiceNumber: invoice.invoiceNumber } });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoiceNumber}.pdf"`);
  res.send(buffer);
});

module.exports = {
  recalculateSettlement,
  listInvoices,
  invoiceStats,
  getInvoice,
  createInvoice,
  updateInvoice,
  duplicateInvoice,
  markPaid,
  cancelInvoice,
  sendReminder,
  remindAll,
  deleteInvoice,
  invoicePdf,
  exportInvoicesCsv
};
