const { Invoice } = require('../models/Invoice');
const { Organisation } = require('../models/Organisation');
const { Reminder, GlobalSetting } = require('../models/Settings');
const { ReminderLog } = require('../models/ReminderLog');
const { sendReminderEmail } = require('./emailService');
const { env } = require('../config/env');

/**
 * Automated payment reminders.
 *
 * This file used to be a three-line stub returning
 * `{scanned:0, sent:0, note:'placeholder'}` — and nothing called it. The whole
 * super-admin "Reminders & Receipts" page (offset days, enable toggle, subject,
 * body) was therefore decorative: no schedule ever ran, and the configured copy
 * was ignored because sendReminderEmail hardcoded its own.
 *
 * Design notes:
 *  - A Reminder's `daysOffset` is relative to the due date: negative is before
 *    (a courtesy notice), positive is after (chasing an overdue invoice).
 *  - Sends are deduplicated per invoice per stage via ReminderLog, so a sweep
 *    that runs hourly does not email the customer hourly.
 *  - Every attempt is logged, including skips and failures, so delivery is
 *    auditable rather than invisible.
 *  - Sends are serialised with a small gap, because blasting a provider from a
 *    tight loop is the fastest way to get rate-limited or marked as spam.
 */

const SEND_SPACING_MS = 150;
// Bound the work one sweep will do, so a tenant with a huge overdue book can't
// make a single run take forever. The remainder is picked up next sweep.
const MAX_SENDS_PER_SWEEP = 200;

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

/** Whole days since the due date: positive = overdue, negative = not due yet. */
function daysPastDue(dueDate) {
  return Math.floor((startOfToday() - new Date(dueDate).setHours(0, 0, 0, 0)) / 86400000);
}

function stageFor(reminder) {
  return `offset:${reminder.daysOffset}`;
}

/**
 * Picks the reminder stage an invoice is due for right now.
 *
 * When several stages have been passed (an invoice 30 days overdue has passed
 * the 3-, 7- and 15-day marks) the *latest* applicable one is chosen, so an
 * invoice that has been sitting unchased doesn't work through the whole backlog
 * of notices one sweep at a time.
 */
function dueStage(invoice, reminders) {
  const overdue = daysPastDue(invoice.dueDate);
  const applicable = reminders
    .filter(r => r.enabled !== false)
    .filter(r => overdue >= Number(r.daysOffset || 0))
    .sort((a, b) => Number(b.daysOffset || 0) - Number(a.daysOffset || 0));
  return applicable[0] || null;
}

/**
 * Runs one pass over every organisation's unpaid invoices.
 *
 * @param options.orgId  restrict to one tenant (used by the manual trigger)
 * @param options.dryRun report what would be sent without sending it
 */
async function runReminderSweep({ orgId = null, dryRun = false } = {}) {
  const reminders = await Reminder.find({ enabled: { $ne: false } }).sort({ daysOffset: 1 }).lean();
  if (!reminders.length) {
    return { scanned: 0, sent: 0, skipped: 0, failed: 0, note: 'No reminder stages are configured.' };
  }

  const emailSettings = (await GlobalSetting.findOne({ key: 'email' }).lean())?.value || {};

  const filter = {
    // 'cancelled' is deliberately absent: a voided or fully-credited invoice is
    // no longer money owed and must never be chased.
    status: { $in: ['pending', 'partial', 'overdue'] },
    // Nothing left to chase. `$exists:false` covers invoices created before
    // balanceDue was persisted.
    $or: [{ balanceDue: { $gt: 0 } }, { balanceDue: { $exists: false } }]
  };
  if (orgId) filter.orgId = orgId;

  const invoices = await Invoice.find(filter)
    .populate('clientId', 'companyName email')
    .sort({ dueDate: 1 })
    .lean();

  // Organisations are fetched once and reused rather than per invoice.
  const orgCache = new Map();
  async function orgFor(id) {
    const key = String(id);
    if (!orgCache.has(key)) {
      orgCache.set(key, await Organisation.findById(id).select('name status').lean());
    }
    return orgCache.get(key);
  }

  const result = { scanned: invoices.length, sent: 0, skipped: 0, failed: 0, dryRun, details: [] };

  for (const invoice of invoices) {
    if (result.sent >= MAX_SENDS_PER_SWEEP) {
      result.note = `Stopped at ${MAX_SENDS_PER_SWEEP} sends; the rest go out on the next sweep.`;
      break;
    }

    const stage = dueStage(invoice, reminders);
    if (!stage) continue;
    const stageKey = stageFor(stage);

    // Already chased at this stage — the dedup that stops daily repeats.
    const already = await ReminderLog.exists({ invoiceId: invoice._id, stage: stageKey, status: 'sent' });
    if (already) continue;

    const org = await orgFor(invoice.orgId);
    // Don't chase on behalf of a tenant who isn't currently a customer.
    if (!org || org.status === 'suspended' || org.status === 'cancelled') continue;

    const to = invoice.clientId?.email || invoice.billTo?.email;
    const clientName = invoice.clientId?.companyName || invoice.billTo?.name;
    const overdueDays = Math.max(0, daysPastDue(invoice.dueDate));
    const balanceDue = invoice.balanceDue ?? invoice.totals?.total ?? 0;

    const logEntry = {
      orgId: invoice.orgId,
      invoiceId: invoice._id,
      reminderId: stage._id,
      stage: stageKey,
      to,
      balanceDue,
      overdueDays,
      trigger: 'scheduled'
    };

    if (!to) {
      result.skipped += 1;
      if (!dryRun) await ReminderLog.create({ ...logEntry, status: 'skipped', reason: 'no email address on file' });
      continue;
    }

    if (dryRun) {
      result.details.push({ invoiceNumber: invoice.invoiceNumber, to, stage: stageKey, overdueDays, balanceDue });
      result.sent += 1;
      continue;
    }

    const outcome = await sendReminderEmail({
      to,
      clientName,
      invoiceNumber: invoice.invoiceNumber,
      amount: `INR ${Number(balanceDue).toLocaleString('en-IN')}`,
      balanceDue: `INR ${Number(balanceDue).toLocaleString('en-IN')}`,
      dueDate: invoice.dueDate,
      orgName: org.name || emailSettings.fromName || 'KloguBizz',
      overdueDays,
      // The configured copy, finally used.
      subject: stage.subject,
      template: stage.template,
      viewUrl: `${env.FRONTEND_URL}/invoices/${invoice._id}/print`
    });

    if (outcome.sent) result.sent += 1;
    else if (outcome.failed) result.failed += 1;
    else result.skipped += 1;

    await ReminderLog.create({
      ...logEntry,
      // A local-mode skip records as 'skipped', not 'sent', so it isn't treated
      // as already-chased once email is switched on for real.
      status: outcome.sent ? 'sent' : outcome.failed ? 'failed' : 'skipped',
      reason: outcome.reason
    });

    await wait(SEND_SPACING_MS);
  }

  return result;
}

/**
 * Starts the background schedule.
 *
 * A plain interval rather than a cron dependency: the sweep is idempotent (the
 * ReminderLog dedup means running it more often than needed changes nothing),
 * so precise scheduling buys nothing. Hourly is frequent enough that a reminder
 * goes out within an hour of becoming due.
 *
 * The timer is unref'd so it never holds the process open during shutdown, and
 * overlapping runs are prevented by an in-process guard — across multiple
 * instances the ReminderLog dedup is what keeps duplicates out, since the guard
 * is per-process.
 */
const SWEEP_INTERVAL_MS = 60 * 60 * 1000;
let running = false;
let timer = null;

async function sweepOnce() {
  if (running) return;
  running = true;
  try {
    const result = await runReminderSweep();
    if (result.sent || result.failed) {
      console.log(`[reminders] scanned=${result.scanned} sent=${result.sent} skipped=${result.skipped} failed=${result.failed}`);
    }
  } catch (error) {
    console.error('[reminders] sweep failed:', error.message);
  } finally {
    running = false;
  }
}

function startReminderScheduler() {
  if (timer) return timer;
  // A short delay on boot so the sweep doesn't compete with startup, and so a
  // crash-looping process doesn't hammer the mail provider.
  setTimeout(sweepOnce, 60 * 1000).unref();
  timer = setInterval(sweepOnce, SWEEP_INTERVAL_MS);
  timer.unref();
  console.log('[reminders] scheduler started (hourly)');
  return timer;
}

function stopReminderScheduler() {
  if (timer) clearInterval(timer);
  timer = null;
}

module.exports = { runReminderSweep, startReminderScheduler, stopReminderScheduler, daysPastDue };
