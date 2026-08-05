const mongoose = require('mongoose');
const { RecurringInvoice, RecurringInvoiceRun } = require('../models/RecurringInvoice');
const { Invoice } = require('../models/Invoice');
const { Client } = require('../models/Client');
const { Organisation } = require('../models/Organisation');
const { calculateInvoiceTotals } = require('./gstService');
const { nextInvoiceNumber } = require('./invoiceNumberService');
const { getUsage } = require('./planService');
const { nextOccurrence, periodKeyFor, isComplete } = require('./recurrenceService');
const { logAudit } = require('./auditService');
const { logger } = require('../utils/logger');
const stock = require('./stockService');

/**
 * The recurring-invoice sweep (2.2 #14).
 *
 * Structured like the reminder and overdue sweeps: one global hourly job across
 * every tenant, streamed rather than loaded, and idempotent so that running it
 * twice — or on two instances at once — cannot double up.
 *
 * What makes this one riskier than the others, and therefore what the code is
 * shaped around: it **creates tax invoices**, which cannot be deleted and are
 * reported in a GST return. A duplicate reminder email is an annoyance; a
 * duplicate invoice is a compliance problem the tenant has to resolve with a
 * credit note. So:
 *
 *  - The `{recurringId, periodKey}` claim is inserted **before** the invoice
 *    exists. Losing that race is the normal, expected outcome for the second
 *    caller, not an error.
 *  - `periodKey` comes from the *scheduled* date, so a late or repeated sweep
 *    computes the same key. See recurrenceService.
 *  - `nextRunAt` advances by exactly **one** period per generated invoice, so a
 *    schedule that is behind catches up one invoice per sweep rather than
 *    emitting a backlog in one go — or, worse, silently skipping it.
 *  - The plan's invoice quota is checked per tenant. A background job that
 *    ignored it would be a way to exceed a capped plan without touching the UI.
 */

/** After this many consecutive failures a schedule pauses itself rather than
 *  retrying hourly forever. A quota resets monthly, so failing once is not fatal;
 *  failing repeatedly means something needs a human. */
const MAX_CONSECUTIVE_FAILURES = 5;

/**
 * A ceiling on how far behind a schedule may be before it stops trying to catch
 * up period by period.
 *
 * If `nextRunAt` is more than this many periods in the past, something is wrong
 * — a schedule imported with a start date years ago, a clock problem — and
 * generating a hundred back-dated invoices one sweep at a time is not a
 * recovery, it is an incident. The schedule is paused with the reason recorded
 * instead. This is a deliberate refusal rather than a silent skip forward,
 * because skipping forward loses periods a tenant may genuinely have wanted.
 */
const MAX_BEHIND_PERIODS = 60;

/** How many schedules one sweep will process. A bound, not a policy: it stops a
 *  pathological backlog from turning one sweep into an hour-long job, and the
 *  remainder are picked up by the next run. Logged when it bites, so a capped
 *  sweep is never mistaken for a complete one. */
const MAX_PER_SWEEP = 200;

function periodsBehind(schedule, now) {
  const behind = [];
  let cursor = new Date(schedule.nextRunAt);
  const anchorDay = new Date(schedule.startDate).getUTCDate();
  while (cursor <= now && behind.length <= MAX_BEHIND_PERIODS + 1) {
    behind.push(new Date(cursor));
    cursor = nextOccurrence(cursor, { frequency: schedule.frequency, interval: schedule.interval, anchorDay });
  }
  return behind;
}

/**
 * Builds the invoice body from the template.
 *
 * The buyer's *current* state is used, not one snapshotted when the schedule was
 * created: a customer who has since moved to another state must be charged the
 * right tax head today. Prices come from the template, which is the whole point
 * of a standing instruction.
 */
async function buildInvoiceBody(schedule, org, scheduledFor) {
  let buyerStateCode;
  if (schedule.clientId) {
    const client = await Client.findOne({ _id: schedule.clientId, orgId: schedule.orgId, deletedAt: null }).lean();
    if (!client) {
      const error = new Error('The customer on this schedule no longer exists.');
      error.code = 'CLIENT_MISSING';
      throw error;
    }
    buyerStateCode = client.stateCode;
  } else if (schedule.billTo?.name) {
    buyerStateCode = schedule.billTo.stateCode || org.stateCode;
  } else {
    const error = new Error('This schedule has no customer.');
    error.code = 'NO_BUYER';
    throw error;
  }

  const placeOfSupply = schedule.placeOfSupply || buyerStateCode;
  const items = schedule.items.map(item => ({
    desc: item.desc, hsn: item.hsn, qty: item.qty, rate: item.rate,
    gstRate: item.gstRate, cessRate: item.cessRate,
    discountPercent: item.discountPercent, taxInclusive: item.taxInclusive
  }));

  const totals = calculateInvoiceTotals(items, org.stateCode, placeOfSupply, {
    discountPercent: schedule.discountPercent,
    roundOff: org.brandingConfig?.roundOffTotal !== false,
    taxTreatment: schedule.taxTreatment,
    supplyType: schedule.supplyType,
    reverseCharge: schedule.reverseCharge
  });

  const date = new Date(scheduledFor);
  const dueDate = new Date(date.getTime() + (schedule.dueInDays ?? 15) * 86400000);

  return {
    orgId: schedule.orgId,
    clientId: schedule.clientId || undefined,
    billTo: schedule.clientId ? undefined : schedule.billTo,
    date,
    dueDate,
    items,
    discountPercent: schedule.discountPercent,
    placeOfSupply,
    taxTreatment: schedule.taxTreatment,
    supplyType: schedule.supplyType,
    reverseCharge: schedule.reverseCharge,
    totals,
    notes: schedule.notes,
    paymentTerms: schedule.paymentTerms,
    amountPaid: 0,
    amountCredited: 0,
    balanceDue: totals.total,
    recurringInvoiceId: schedule._id
  };
}

/**
 * Generates one invoice for one due period of one schedule.
 *
 * Returns `{ generated, run, invoice, reason }`. Never throws for an expected
 * outcome — a lost race, an exhausted quota and a deleted customer are all
 * *results*, recorded and reported, because a sweep that throws on the first
 * tenant's problem stops working for every tenant behind it.
 */
async function generateOne(schedule, scheduledFor, { trigger = 'scheduled', req = null } = {}) {
  const periodKey = periodKeyFor(scheduledFor, schedule.frequency);

  // The claim, before anything is created. A duplicate key here means another
  // sweep (or another instance) already owns this period.
  let run;
  try {
    run = await RecurringInvoiceRun.create({
      recurringId: schedule._id,
      orgId: schedule.orgId,
      periodKey,
      scheduledFor,
      status: 'generated', // provisional; corrected below if it fails
      trigger
    });
  } catch (error) {
    if (error?.code === 11000) {
      return { generated: false, reason: 'ALREADY_GENERATED', periodKey };
    }
    throw error;
  }

  try {
    const org = await Organisation.findById(schedule.orgId).lean();
    if (!org) throw Object.assign(new Error('Organisation not found'), { code: 'ORG_MISSING' });

    // A suspended or cancelled tenant must not have invoices raised on their
    // behalf — `protect` refuses their own writes, and a background job doing it
    // anyway would be a way around the suspension.
    if (org.status === 'suspended' || org.status === 'cancelled') {
      throw Object.assign(new Error(`The organisation is ${org.status}.`), { code: 'ORG_INACTIVE' });
    }

    // The plan's monthly ceiling. Checked here rather than trusting the UI,
    // because this path never goes through it.
    const usage = await getUsage(schedule.orgId);
    if (usage.invoiceLimit && usage.invoicesThisMonth >= usage.invoiceLimit) {
      throw Object.assign(
        new Error(`Monthly invoice limit reached (${usage.invoiceLimit} on the ${usage.planName} plan).`),
        { code: 'QUOTA_EXCEEDED' }
      );
    }

    const body = await buildInvoiceBody(schedule, org, scheduledFor);
    const asDraft = schedule.generateAsDraft === true;

    const invoice = await Invoice.create({
      ...body,
      // A draft takes no number from the counter — the same rule the manual
      // create path follows — so a schedule left in draft mode cannot punch
      // gaps in the invoice series.
      invoiceNumber: asDraft ? `DRAFT-${periodKey}-${String(schedule._id).slice(-6)}` : await nextInvoiceNumber(schedule.orgId),
      status: asDraft ? 'draft' : 'pending'
    });

    // Stock moves only for an issued invoice, matching the manual path.
    if (!asDraft) {
      await stock.applyInvoice(req || { orgId: String(schedule.orgId) }, invoice).catch(error => {
        // A ledger problem must not invalidate an invoice that has been issued.
        logger.error('stock movement failed for a recurring invoice', {
          invoiceId: String(invoice._id), err: error
        });
      });
    }

    run.invoiceId = invoice._id;
    run.invoiceNumber = invoice.invoiceNumber;
    run.total = invoice.totals?.total;
    await run.save();

    return { generated: true, run, invoice, periodKey, asDraft };
  } catch (error) {
    // The claim is *kept*, marked failed. Deleting it would let the next sweep
    // retry the same period and risk a duplicate if the first attempt had in
    // fact created the invoice before failing.
    run.status = 'failed';
    run.reason = error.message;
    await run.save().catch(() => {});
    return { generated: false, reason: error.code || 'FAILED', message: error.message, periodKey, run };
  }
}

/**
 * Advances the schedule after a run, and closes it if it has finished.
 *
 * Conditional on `nextRunAt` still being what we read, so two instances cannot
 * both advance it — the run claim already prevents a duplicate invoice, and this
 * prevents a double *advance*, which would skip a period.
 */
async function advance(schedule, scheduledFor, { generated }) {
  const anchorDay = new Date(schedule.startDate).getUTCDate();
  const next = nextOccurrence(scheduledFor, {
    frequency: schedule.frequency,
    interval: schedule.interval,
    anchorDay
  });

  const occurrences = schedule.occurrences + (generated ? 1 : 0);
  const finished = isComplete({
    occurrences,
    endAfterCount: schedule.endAfterCount,
    endsOn: schedule.endsOn,
    nextRunAt: next
  });

  const update = {
    nextRunAt: next,
    occurrences,
    lastRunAt: new Date(),
    ...(finished ? { status: 'completed' } : {})
  };

  await RecurringInvoice.updateOne(
    { _id: schedule._id, nextRunAt: schedule.nextRunAt },
    { $set: update }
  );
  return { next, finished };
}

async function recordFailure(schedule, message) {
  const failures = (schedule.consecutiveFailures || 0) + 1;
  const shouldPause = failures >= MAX_CONSECUTIVE_FAILURES;
  await RecurringInvoice.updateOne(
    { _id: schedule._id },
    {
      $set: {
        consecutiveFailures: failures,
        lastError: message,
        lastRunAt: new Date(),
        ...(shouldPause ? { status: 'paused' } : {})
      }
    }
  );
  if (shouldPause) {
    logger.warn('recurring invoice schedule paused after repeated failures', {
      recurringId: String(schedule._id), orgId: String(schedule.orgId), failures, message
    });
  }
  return { paused: shouldPause, failures };
}

/**
 * The sweep. Called hourly by maintenanceService, and directly by tests.
 *
 * `orgId` scopes it to one tenant (used by the "run now" action); `dryRun`
 * reports what *would* happen without creating anything, which is the only safe
 * way to let someone inspect a schedule that is behind.
 */
async function runRecurringSweep({ orgId = null, dryRun = false, now = new Date() } = {}) {
  const filter = { status: 'active', nextRunAt: { $lte: now }, deletedAt: null };
  if (orgId) filter.orgId = new mongoose.Types.ObjectId(String(orgId));

  const cursor = RecurringInvoice.find(filter).sort({ nextRunAt: 1 }).cursor();

  const result = {
    scanned: 0, generated: 0, skipped: 0, failed: 0, paused: 0, completed: 0,
    capped: false, dryRun, invoices: []
  };

  for await (const schedule of cursor) {
    if (result.scanned >= MAX_PER_SWEEP) {
      result.capped = true;
      break;
    }
    result.scanned += 1;

    const behind = periodsBehind(schedule, now);
    if (!behind.length) { result.skipped += 1; continue; }

    // Too far behind to be a genuine backlog. Paused rather than fast-forwarded,
    // because skipping forward silently discards periods.
    if (behind.length > MAX_BEHIND_PERIODS) {
      if (!dryRun) {
        await RecurringInvoice.updateOne(
          { _id: schedule._id },
          {
            $set: {
              status: 'paused',
              lastError: `Schedule is ${behind.length}+ periods behind — paused rather than generating a backlog. Check the next run date and resume.`,
              lastRunAt: new Date()
            }
          }
        );
      }
      logger.warn('recurring schedule too far behind — paused', {
        recurringId: String(schedule._id), orgId: String(schedule.orgId), periodsBehind: behind.length
      });
      result.paused += 1;
      continue;
    }

    // One period per sweep. The rest catch up on subsequent runs, which keeps a
    // backlog from becoming a burst of back-dated invoices.
    const scheduledFor = behind[0];

    if (dryRun) {
      result.invoices.push({
        recurringId: String(schedule._id),
        title: schedule.title,
        scheduledFor,
        periodKey: periodKeyFor(scheduledFor, schedule.frequency),
        periodsBehind: behind.length
      });
      result.generated += 1;
      continue;
    }

    const outcome = await generateOne(schedule, scheduledFor);

    if (outcome.generated) {
      const { finished } = await advance(schedule, scheduledFor, { generated: true });
      if (finished) result.completed += 1;
      // Success clears the failure counter — a schedule that failed once last
      // month should not be one failure from pausing forever.
      if (schedule.consecutiveFailures) {
        await RecurringInvoice.updateOne({ _id: schedule._id }, { $set: { consecutiveFailures: 0, lastError: '' } });
      }
      await RecurringInvoice.updateOne(
        { _id: schedule._id },
        { $set: { lastInvoiceId: outcome.invoice._id, lastInvoiceNumber: outcome.invoice.invoiceNumber } }
      );
      result.generated += 1;
      result.invoices.push({
        recurringId: String(schedule._id),
        invoiceId: String(outcome.invoice._id),
        invoiceNumber: outcome.invoice.invoiceNumber,
        total: outcome.invoice.totals?.total,
        draft: outcome.asDraft
      });
      logAudit({
        req: { orgId: schedule.orgId },
        action: 'invoice.recurring_generated',
        entity: 'invoice',
        entityId: outcome.invoice._id,
        orgId: schedule.orgId,
        meta: {
          invoiceNumber: outcome.invoice.invoiceNumber,
          recurringId: String(schedule._id),
          title: schedule.title,
          periodKey: outcome.periodKey
        }
      });
      continue;
    }

    if (outcome.reason === 'ALREADY_GENERATED') {
      // Another instance owns this period. Still advance, or this schedule would
      // sit on the same period forever.
      await advance(schedule, scheduledFor, { generated: false });
      result.skipped += 1;
      continue;
    }

    const { paused } = await recordFailure(schedule, outcome.message || outcome.reason);
    if (paused) result.paused += 1;
    result.failed += 1;
  }

  if (result.capped) {
    // A silent cap reads as "everything is done".
    logger.warn('recurring sweep hit its per-run cap', { cap: MAX_PER_SWEEP, ...result });
  }
  return result;
}

module.exports = {
  runRecurringSweep,
  generateOne,
  advance,
  periodsBehind,
  MAX_CONSECUTIVE_FAILURES,
  MAX_BEHIND_PERIODS,
  MAX_PER_SWEEP
};
