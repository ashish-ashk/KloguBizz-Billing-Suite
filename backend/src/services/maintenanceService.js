const { Invoice } = require('../models/Invoice');
const { Client } = require('../models/Client');
const { Item } = require('../models/Item');
const { Vendor } = require('../models/Vendor');
const { Purchase } = require('../models/Purchase');
const { Payment } = require('../models/Payment');
const { CreditNote } = require('../models/CreditNote');
const { Subscription } = require('../models/Subscription');
const { ReminderLog } = require('../models/ReminderLog');
const { SalesDocument } = require('../models/SalesDocument');
const { User } = require('../models/User');
const { Organisation } = require('../models/Organisation');
const { purgeCutoff } = require('../utils/softDelete');
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

/**
 * Empties the recycle bin (#37) and honours completed erasure requests (#62).
 *
 * A soft delete that is never purged is not a recycle bin, it is a hidden row that
 * grows forever — and an erasure request that is never carried out is a compliance
 * claim the product does not honour. Both windows are the same `SOFT_DELETE_GRACE_DAYS`
 * so there is one number for a tenant to be told and one for an operator to reason
 * about.
 *
 * Ordering matters in the tenant purge: the organisation row is removed **last**, so an
 * interruption leaves a tenant whose data is partly gone but whose record still exists
 * and can be purged again on the next run. The other order leaves orphans nothing will
 * ever look for — the same reasoning as `saveMasters` writing before deleting.
 */
/**
 * Ages lapsed quotations into 'expired' (2.2 #11).
 *
 * Global, one write for every tenant, exactly like the overdue sweep above and
 * for the same reasons. And exactly like it, **the stored value is not what the
 * product reads**: `salesDocumentController.isExpired` derives expiry from
 * `validUntil` at read time, so a quotation that lapsed at midnight shows as
 * expired immediately rather than whenever this next runs. This sweep exists so
 * the persisted status eventually agrees — for anyone querying the collection
 * directly, and so the status filter on the list is not a special case.
 *
 * Only `draft` and `sent` are aged. An accepted or rejected quotation has been
 * *decided*; relabelling that as merely lapsed would lose the decision, and the
 * conversion-rate figure is computed from exactly those two.
 */
async function sweepExpiredQuotations() {
  const result = await SalesDocument.updateMany(
    {
      kind: 'quotation',
      status: { $in: ['draft', 'sent'] },
      deletedAt: null,
      // A comparison operator never matches a null or missing field, so this
      // cannot sweep a quotation that simply has no expiry date — the trap the
      // aggregation form of this query hit in Phase 3.
      validUntil: { $lt: new Date() }
    },
    { $set: { status: 'expired' } }
  );
  return { expiredQuotations: result.modifiedCount ?? 0 };
}

async function purgeExpiredDeletions() {
  const cutoff = purgeCutoff();
  const expired = { clients: 0, items: 0, invoices: 0, vendors: 0, purchases: 0, salesDocuments: 0, organisations: 0 };

  for (const [key, Model] of [
    ['clients', Client],
    ['items', Item],
    ['invoices', Invoice],
    ['vendors', Vendor],
    ['purchases', Purchase],
    ['salesDocuments', SalesDocument]
  ]) {
    const result = await Model.deleteMany({ deletedAt: { $ne: null, $lt: cutoff } });
    expired[key] = result.deletedCount ?? 0;
  }

  // Tenants whose owner asked for erasure and whose grace window has passed.
  const doomed = await Organisation.find({ deletedAt: { $ne: null, $lt: cutoff } }).select('_id name').lean();
  for (const org of doomed) {
    for (const Model of [User, Client, Item, Invoice, Payment, CreditNote, Vendor, Purchase, Subscription, ReminderLog, SalesDocument]) {
      await Model.deleteMany({ orgId: org._id });
    }
    await Organisation.deleteOne({ _id: org._id });
    // Deliberately at info, not debug: an irreversible platform-wide deletion should
    // be visible in the log without anyone having raised the level to find it.
    // `AuditLog` is not touched — it is the surviving record that this happened.
    logger.info('purged tenant after erasure grace period', { orgId: String(org._id), name: org.name });
    expired.organisations += 1;
  }

  return expired;
}

async function runOnce() {
  if (running) return null;
  running = true;
  try {
    const result = await sweepOverdueInvoices();
    if (result.updated) logger.info('overdue sweep', result);

    const quotations = await sweepExpiredQuotations();
    if (quotations.expiredQuotations) logger.info('quotation expiry sweep', quotations);

    const purged = await purgeExpiredDeletions();
    if (Object.values(purged).some(Boolean)) logger.info('recycle bin purge', purged);

    return { ...result, ...quotations, purged };
  } catch (error) {
    logger.error('maintenance sweep failed', { err: error });
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
  sweepExpiredQuotations,
  purgeExpiredDeletions,
  startMaintenanceScheduler,
  stopMaintenanceScheduler
};
