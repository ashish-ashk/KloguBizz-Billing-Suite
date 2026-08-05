const mongoose = require('mongoose');
const { RecurringInvoice, RecurringInvoiceRun } = require('../models/RecurringInvoice');
const { asyncHandler } = require('../utils/asyncHandler');
const { httpError } = require('../utils/httpError');
const { tenantFilter } = require('../middleware/tenantMiddleware');
const { notDeleted, scopeFilter, deletionPatch, RESTORE_PATCH } = require('../utils/softDelete');
const { logAudit } = require('../services/auditService');
const { recordEvent, EVENT } = require('../services/usageEventService');
const { paginate, escapeRegex, parseSort } = require('../utils/pagination');
const { totalsFor, normalizeBuyer } = require('./invoiceController');
const { runRecurringSweep, generateOne, advance, periodsBehind } = require('../services/recurringInvoiceService');
const { nextOccurrence, periodKeyFor, describeSchedule } = require('../services/recurrenceService');

/**
 * Recurring invoice schedules (2.2 #14).
 *
 * A schedule is a template plus a recurrence, not an invoice — so this controller
 * has no send, no payment and no PDF. The one thing it does that has consequence
 * is `runNow`, and that goes through exactly the same code the hourly sweep uses,
 * including the same idempotency claim: a tenant who clicks "run now" and then
 * waits for the sweep gets one invoice, not two.
 */

const SORTS = ['nextRunAt', 'createdAt', 'title', 'occurrences'];

/**
 * The preview a schedule needs to be legible.
 *
 * `nextRuns` is computed rather than stored: storing a projection means it goes
 * stale the moment the frequency is edited, and the arithmetic is cheap. Three is
 * enough to make "every quarter starting in March" obvious at a glance, which a
 * date and a frequency word are not.
 */
function shape(schedule) {
  const plain = typeof schedule.toObject === 'function' ? schedule.toObject() : { ...schedule };
  const anchorDay = plain.startDate ? new Date(plain.startDate).getUTCDate() : undefined;

  const nextRuns = [];
  let cursor = plain.nextRunAt ? new Date(plain.nextRunAt) : null;
  for (let i = 0; i < 3 && cursor && plain.status === 'active'; i += 1) {
    if (plain.endsOn && cursor > new Date(plain.endsOn)) break;
    if (plain.endAfterCount && plain.occurrences + i >= plain.endAfterCount) break;
    nextRuns.push(new Date(cursor));
    cursor = nextOccurrence(cursor, { frequency: plain.frequency, interval: plain.interval, anchorDay });
  }

  const behind = plain.status === 'active' && plain.nextRunAt
    ? Math.max(0, periodsBehind(plain, new Date()).length)
    : 0;

  return {
    ...plain,
    scheduleLabel: describeSchedule(plain),
    nextRuns,
    // Surfaced so "why hasn't this run" is answerable from the list rather than
    // needing the log — a schedule can be behind because the tenant's quota is
    // exhausted, and that is not obvious from a date.
    periodsBehind: behind,
    isBehind: behind > 1,
    nextPeriodKey: plain.nextRunAt ? periodKeyFor(plain.nextRunAt, plain.frequency) : null
  };
}

function buildFilter(req) {
  const filter = scopeFilter(req);
  if (req.query.status) filter.status = req.query.status;
  if (req.query.clientId) filter.clientId = req.query.clientId;
  if (req.query.q) {
    const term = escapeRegex(String(req.query.q).trim());
    if (term) {
      filter.$or = [
        { title: { $regex: term, $options: 'i' } },
        { 'billTo.name': { $regex: term, $options: 'i' } }
      ];
    }
  }
  return filter;
}

const listRecurring = asyncHandler(async (req, res) => {
  const page = await paginate(RecurringInvoice, buildFilter(req), req.query, query => query
    .populate('clientId', 'companyName gstin stateCode')
    .sort(parseSort(req.query, SORTS, { nextRunAt: 1 })));
  res.json({ ...page, data: page.data.map(shape) });
});

const getRecurring = asyncHandler(async (req, res) => {
  const schedule = await RecurringInvoice.findOne({ _id: req.params.id, ...notDeleted(req) }).populate('clientId');
  if (!schedule) throw httpError(404, 'Schedule not found');
  res.json(shape(schedule));
});

/**
 * The run history for one schedule.
 *
 * Includes failures and skips, not only successes — "it hasn't invoiced since
 * June" is only answerable if the attempts that did not produce an invoice are
 * visible too. That was the whole lesson of `ReminderLog`.
 */
const recurringRuns = asyncHandler(async (req, res) => {
  const schedule = await RecurringInvoice.findOne({ _id: req.params.id, ...notDeleted(req) }).select('_id').lean();
  if (!schedule) throw httpError(404, 'Schedule not found');
  const page = await paginate(
    RecurringInvoiceRun,
    { recurringId: schedule._id, orgId: new mongoose.Types.ObjectId(String(req.orgId)) },
    req.query,
    query => query.sort({ scheduledFor: -1 })
  );
  res.json(page);
});

/** `startDate` in the future means the first invoice is raised then; in the past
 *  or absent means "start now", which is what a tenant setting up an existing
 *  retainer expects — not a backdated catch-up from whenever they first signed. */
function resolveFirstRun(startDate) {
  const start = startDate ? new Date(startDate) : new Date();
  return start;
}

const createRecurring = asyncHandler(async (req, res) => {
  const body = normalizeBuyer(req.body);
  if (!Array.isArray(body.items) || !body.items.length) {
    throw httpError(400, 'At least one line item is required');
  }
  if (!String(body.title || '').trim()) throw httpError(400, 'A title is required');

  // Priced now purely to validate the template and reject a NaN before it can
  // become a schedule that fails silently every month. The generated invoice is
  // re-priced at generation time against the buyer's state *then*.
  await totalsFor(req, body);

  const startDate = resolveFirstRun(body.startDate);
  const schedule = await RecurringInvoice.create({
    ...body,
    orgId: req.orgId,
    startDate,
    nextRunAt: startDate,
    status: body.status === 'paused' ? 'paused' : 'active',
    // `autoSend` on a draft-generating schedule is meaningless: there is nothing
    // to send from a draft. Refused rather than silently ignored.
    autoSend: body.generateAsDraft ? false : Boolean(body.autoSend)
  });

  logAudit({
    req,
    action: 'recurring_invoice.created',
    entity: 'recurringInvoice',
    entityId: schedule._id,
    meta: { title: schedule.title, frequency: schedule.frequency, interval: schedule.interval, nextRunAt: schedule.nextRunAt }
  });
  recordEvent({ req, type: EVENT.recurringInvoiceCreated, meta: { frequency: schedule.frequency } });
  res.status(201).json(shape(schedule));
});

const updateRecurring = asyncHandler(async (req, res) => {
  const schedule = await RecurringInvoice.findOne({ _id: req.params.id, ...notDeleted(req) });
  if (!schedule) throw httpError(404, 'Schedule not found');

  const body = normalizeBuyer(req.body);
  // The counters and the run history are outcomes, never inputs.
  for (const field of ['orgId', 'occurrences', 'lastRunAt', 'lastInvoiceId', 'lastInvoiceNumber', 'consecutiveFailures', 'lastError']) {
    delete body[field];
  }

  const frequencyChanged = body.frequency && body.frequency !== schedule.frequency;
  const intervalChanged = body.interval && Number(body.interval) !== schedule.interval;

  Object.assign(schedule, body);
  if (schedule.generateAsDraft) schedule.autoSend = false;

  /**
   * Changing the frequency re-bases the next run.
   *
   * Otherwise a monthly schedule switched to yearly keeps next month's date and
   * raises one more monthly invoice before the change takes effect — which reads
   * as the edit not having worked. Rebasing from *now* rather than from the old
   * date also means switching frequency cannot accidentally create a backlog.
   */
  if ((frequencyChanged || intervalChanged) && schedule.status === 'active') {
    schedule.nextRunAt = nextOccurrence(new Date(), {
      frequency: schedule.frequency,
      interval: schedule.interval,
      anchorDay: new Date(schedule.startDate).getUTCDate()
    });
  }
  if (body.items) await totalsFor(req, schedule.toObject());
  await schedule.save();

  logAudit({
    req,
    action: 'recurring_invoice.updated',
    entity: 'recurringInvoice',
    entityId: schedule._id,
    meta: { title: schedule.title, fields: Object.keys(body), rebased: frequencyChanged || intervalChanged }
  });
  res.json(shape(schedule));
});

/**
 * Pause / resume / cancel.
 *
 * Resuming re-bases `nextRunAt` to the next occurrence from now when the stored
 * date is in the past. A schedule paused for three months would otherwise resume
 * three periods behind and start catching up — generating back-dated invoices
 * nobody asked for, which is the opposite of what "resume" means.
 */
const setRecurringStatus = asyncHandler(async (req, res) => {
  const status = String(req.body?.status || '');
  if (!['active', 'paused', 'cancelled'].includes(status)) {
    throw httpError(400, 'status must be active, paused or cancelled');
  }

  const schedule = await RecurringInvoice.findOne({ _id: req.params.id, ...notDeleted(req) });
  if (!schedule) throw httpError(404, 'Schedule not found');
  if (schedule.status === 'completed') {
    throw httpError(409, 'This schedule has finished its run and cannot be restarted. Create a new one.', 'SCHEDULE_COMPLETED');
  }

  const previous = schedule.status;
  schedule.status = status;

  if (status === 'active' && new Date(schedule.nextRunAt) < new Date()) {
    schedule.nextRunAt = nextOccurrence(new Date(), {
      frequency: schedule.frequency,
      interval: schedule.interval,
      anchorDay: new Date(schedule.startDate).getUTCDate()
    });
    // Resuming is also a fresh start for the failure counter, or a schedule
    // paused *by* failures would pause itself again on its next hiccup.
    schedule.consecutiveFailures = 0;
    schedule.lastError = '';
  }
  await schedule.save();

  logAudit({
    req,
    action: `recurring_invoice.${status}`,
    entity: 'recurringInvoice',
    entityId: schedule._id,
    meta: { title: schedule.title, from: previous, to: status, nextRunAt: schedule.nextRunAt }
  });
  res.json(shape(schedule));
});

/**
 * Raises this period's invoice immediately.
 *
 * Goes through the same `generateOne` the sweep uses, so it shares the
 * `{recurringId, periodKey}` claim — clicking this and then waiting for the
 * hourly sweep produces one invoice, not two. That is the whole reason it is not
 * a separate code path.
 */
const runRecurringNow = asyncHandler(async (req, res) => {
  const schedule = await RecurringInvoice.findOne({ _id: req.params.id, ...notDeleted(req) });
  if (!schedule) throw httpError(404, 'Schedule not found');
  if (schedule.status === 'cancelled' || schedule.status === 'completed') {
    throw httpError(409, `This schedule is ${schedule.status}.`, 'SCHEDULE_INACTIVE');
  }

  const scheduledFor = new Date(schedule.nextRunAt) <= new Date() ? new Date(schedule.nextRunAt) : new Date();
  const outcome = await generateOne(schedule, scheduledFor, { trigger: 'manual', req });

  if (!outcome.generated) {
    if (outcome.reason === 'ALREADY_GENERATED') {
      throw httpError(
        409,
        `An invoice for ${outcome.periodKey} has already been generated from this schedule.`,
        'ALREADY_GENERATED'
      );
    }
    throw httpError(409, outcome.message || 'The invoice could not be generated.', outcome.reason);
  }

  await advance(schedule, scheduledFor, { generated: true });
  await RecurringInvoice.updateOne(
    { _id: schedule._id },
    {
      $set: {
        lastInvoiceId: outcome.invoice._id,
        lastInvoiceNumber: outcome.invoice.invoiceNumber,
        consecutiveFailures: 0,
        lastError: ''
      }
    }
  );

  logAudit({
    req,
    action: 'recurring_invoice.run_now',
    entity: 'invoice',
    entityId: outcome.invoice._id,
    meta: {
      invoiceNumber: outcome.invoice.invoiceNumber,
      recurringId: String(schedule._id),
      periodKey: outcome.periodKey
    }
  });

  const refreshed = await RecurringInvoice.findById(schedule._id);
  res.status(201).json({ schedule: shape(refreshed), invoice: outcome.invoice });
});

/** What the next sweep *would* do for this tenant, creating nothing. The only
 *  safe way to inspect a schedule that is behind. */
const previewRecurring = asyncHandler(async (req, res) => {
  const result = await runRecurringSweep({ orgId: req.orgId, dryRun: true });
  res.json(result);
});

const deleteRecurring = asyncHandler(async (req, res) => {
  const schedule = await RecurringInvoice.findOne({ _id: req.params.id, ...notDeleted(req) });
  if (!schedule) throw httpError(404, 'Schedule not found');
  Object.assign(schedule, deletionPatch(req));
  // A deleted schedule must also stop running, or the recycle bin would keep
  // invoicing — the bin is for things that are no longer in effect.
  schedule.status = 'cancelled';
  await schedule.save();
  logAudit({ req, action: 'recurring_invoice.deleted', entity: 'recurringInvoice', entityId: schedule._id, meta: { title: schedule.title } });
  res.json(shape(schedule));
});

const restoreRecurring = asyncHandler(async (req, res) => {
  const schedule = await RecurringInvoice.findOneAndUpdate(
    { _id: req.params.id, ...tenantFilter(req), deletedAt: { $ne: null } },
    { $set: RESTORE_PATCH },
    { new: true }
  );
  if (!schedule) throw httpError(404, 'Schedule not found in the recycle bin');
  // Restored as paused, never straight back to active: it may be months behind,
  // and resuming is a decision with invoices attached.
  logAudit({ req, action: 'recurring_invoice.restored', entity: 'recurringInvoice', entityId: schedule._id, meta: { title: schedule.title } });
  res.json(shape(schedule));
});

module.exports = {
  listRecurring,
  getRecurring,
  recurringRuns,
  createRecurring,
  updateRecurring,
  setRecurringStatus,
  runRecurringNow,
  previewRecurring,
  deleteRecurring,
  restoreRecurring
};
