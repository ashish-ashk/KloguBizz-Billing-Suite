const { Invoice } = require('../models/Invoice');
const { logger } = require('../utils/logger');

/**
 * Background housekeeping.
 *
 * Ageing an unpaid invoice into 'overdue' used to happen inside `sweepOverdue`,
 * which every invoice list, stats and CSV call invoked first — an `updateMany`
 * across the org's invoices on every single read. A dashboard refresh was a
 * write; ten users on the invoice list were ten collection-wide writes a minute.
 *
 * Becoming overdue is a once-a-day transition, so it belongs on a schedule. Two
 * things make that safe rather than merely cheaper:
 *
 *  - The sweep is now **global** — one `updateMany` covering every tenant, not
 *    one per org. It is a single indexed write regardless of how many tenants
 *    exist.
 *  - Read paths no longer depend on it. `invoiceController` derives the overdue
 *    state from `dueDate` when it filters and when it aggregates, so the numbers
 *    are correct the instant an invoice falls due — the stored status is a
 *    denormalisation the schedule keeps in step for display, not the source of
 *    truth for money.
 */

// Hourly. The transition happens at midnight, so this is well inside the
// resolution anyone cares about, and the job is idempotent.
const SWEEP_INTERVAL_MS = 60 * 60 * 1000;

let running = false;
let timer = null;

/**
 * Moves every tenant's past-due unpaid invoices to 'overdue' in one write.
 *
 * 'partial' is included because a part-paid invoice that is late is still money
 * owed — it used to be skipped, so late part-payers never appeared in the
 * overdue filter at all. 'cancelled' and 'draft' are untouched: neither is a
 * debt.
 */
async function sweepOverdueInvoices() {
  const result = await Invoice.updateMany(
    {
      status: { $in: ['pending', 'partial'] },
      // A plain `$lt` on a date never matches a null or missing field in
      // MongoDB's query language, so invoices with no due date are correctly
      // left alone.
      dueDate: { $lt: new Date() },
      // Nothing outstanding means nothing to chase, whatever the status says.
      $or: [{ balanceDue: { $gt: 0 } }, { balanceDue: { $exists: false } }]
    },
    { $set: { status: 'overdue' } }
  );
  return { matched: result.matchedCount ?? 0, updated: result.modifiedCount ?? 0 };
}

async function runOnce() {
  if (running) return null;
  running = true;
  try {
    const result = await sweepOverdueInvoices();
    if (result.updated) logger.info('overdue sweep', result);
    return result;
  } catch (error) {
    logger.error('overdue sweep failed', { err: error });
    return null;
  } finally {
    running = false;
  }
}

/**
 * The timer is unref'd so it never holds the process open during a graceful
 * shutdown. Overlapping runs are prevented in-process; across instances the
 * write is idempotent, so a concurrent run from another instance is harmless.
 */
function startMaintenanceScheduler() {
  if (timer) return timer;
  // Shortly after boot rather than immediately, so it doesn't compete with
  // startup or with the connection pool warming up.
  setTimeout(runOnce, 15 * 1000).unref();
  timer = setInterval(runOnce, SWEEP_INTERVAL_MS);
  timer.unref();
  logger.info('maintenance scheduler started', { intervalMs: SWEEP_INTERVAL_MS });
  return timer;
}

function stopMaintenanceScheduler() {
  if (timer) clearInterval(timer);
  timer = null;
}

module.exports = {
  sweepOverdueInvoices,
  startMaintenanceScheduler,
  stopMaintenanceScheduler
};
