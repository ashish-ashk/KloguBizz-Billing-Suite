const { UsageEvent } = require('../models/UsageEvent');
const { Organisation } = require('../models/Organisation');
const { logger } = require('../utils/logger');

/**
 * The instrumentation seam.
 *
 * Controllers call `recordEvent` at the moment something interesting happens.
 * Nothing here is allowed to affect the caller: every write is fire-and-forget
 * and every failure is a warn line, never a rejected promise the controller has
 * to think about. An analytics insert that can fail a customer's invoice is worse
 * than no analytics.
 */

/**
 * Event types the console asks about by name.
 *
 * `type` on the model is a free string so adding an instrumentation point is a
 * one-line change, but the *dashboards* need a fixed vocabulary — a feature
 * adoption matrix has to know which features exist, including the ones with zero
 * usage, which by definition cannot be discovered from the data.
 */
const EVENT = {
  login: 'auth.login',
  signup: 'org.signup',
  invoiceCreated: 'invoice.created',
  billCreated: 'bill.created',
  invoicePdf: 'invoice.pdf',
  invoiceEmailed: 'invoice.emailed',
  paymentRecorded: 'payment.recorded',
  purchaseRecorded: 'purchase.recorded',
  gstReturnViewed: 'gst_return.viewed',
  eInvoiceGenerated: 'einvoice.generated',
  creditNote: 'credit_note.created',
  /** A quotation, proforma or delivery challan (2.2 #11–#13). One event for all
   *  three, with the kind in `meta` — the adoption matrix wants "do they use
   *  pre-invoice documents at all", not three near-identical rows. */
  salesDocumentCreated: 'sales_document.created',
  salesDocumentConverted: 'sales_document.converted',
  /** A standing instruction was set up (2.2 #14). The generated invoices
   *  themselves record `invoice.created` as normal, so recurring revenue is not
   *  invisible to the volume metrics. */
  recurringInvoiceCreated: 'recurring_invoice.created',
  /** A payment link was issued (2.3 #21). The payment it collects records
   *  `payment.recorded` as normal, so online collection is not invisible to the
   *  revenue figures. */
  paymentLinkCreated: 'payment_link.created',
  clientCreated: 'client.created',
  itemCreated: 'item.created',
  /** A cost with no vendor bill — salaries, rent, bank charges (2.4 #32). */
  expenseRecorded: 'expense.recorded',
  itemBulkUpload: 'item.bulk_upload',
  clientBulkUpload: 'client.bulk_upload',
  reportViewed: 'report.viewed',
  exportCsv: 'export.csv',
  templateChanged: 'template.changed',
  themeChanged: 'theme.changed',
  /** Daily per-user heartbeat — see `recordActivity`. */
  activity: 'app.active'
};

/**
 * The adoption matrix: which capabilities we report a per-tenant usage rate for,
 * and the label the console shows. Ordered roughly by where a tenant meets them
 * in the product, because the matrix is read as a funnel.
 */
const FEATURES = [
  { key: EVENT.invoiceCreated, label: 'Invoices' },
  { key: EVENT.billCreated, label: 'Bill Generator' },
  { key: EVENT.clientCreated, label: 'Clients' },
  { key: EVENT.itemCreated, label: 'Inventory' },
  { key: EVENT.itemBulkUpload, label: 'Bulk item upload' },
  { key: EVENT.paymentRecorded, label: 'Payments' },
  { key: EVENT.purchaseRecorded, label: 'Purchases / ITC' },
  { key: EVENT.gstReturnViewed, label: 'GST returns' },
  { key: EVENT.creditNote, label: 'Credit notes' },
  { key: EVENT.invoicePdf, label: 'PDF download' },
  { key: EVENT.invoiceEmailed, label: 'Invoice emails' },
  { key: EVENT.reportViewed, label: 'Reports' },
  { key: EVENT.exportCsv, label: 'CSV export' },
  { key: EVENT.templateChanged, label: 'Invoice templates' },
  { key: EVENT.themeChanged, label: 'Appearance themes' }
];

/** The midnight-UTC day key a timestamp falls in. */
function dayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

/**
 * Records one event.
 *
 * Returns nothing on purpose — there is no outcome a caller should branch on, and
 * an awaited analytics write is an analytics write on the critical path. Pass
 * `req` and the org and user are taken from it.
 */
function recordEvent({ req, type, orgId, userId, meta, value }) {
  if (!type) return;
  const resolvedOrg = orgId ?? req?.orgId ?? undefined;
  const resolvedUser = userId ?? req?.user?._id ?? undefined;

  UsageEvent.create({
    orgId: resolvedOrg || undefined,
    userId: resolvedUser || undefined,
    type,
    meta,
    value: Number.isFinite(value) ? value : 0,
    day: dayKey()
  }).catch(error => {
    (req?.log || logger).warn('usage event write failed', { type, err: error });
  });
}

/**
 * Per-day activity heartbeat, deduplicated in memory.
 *
 * DAU/WAU/MAU need to know *that* a user was active on a day, not how many
 * requests they made — and writing an event per request would make this
 * collection larger than every business collection combined for no extra
 * information. So the first request a user makes on a given day writes one row,
 * and the rest of that day's requests are a `Set.has` and nothing else.
 *
 * The cache is per-process, so N instances write at most N rows per user per day.
 * The dashboards count *distinct* users and orgs, so duplicates cost a little
 * storage and change no figure. It is cleared whenever the day key changes, which
 * is also what stops it growing without bound.
 */
let heartbeatDay = dayKey();
let heartbeatSeen = new Set();
/** How many keys to hold before giving up on deduplication for the rest of the
 *  day. A pathological number of distinct users in one process should degrade
 *  into extra writes, not unbounded memory. */
const MAX_HEARTBEAT_KEYS = 50000;

function recordActivity(req) {
  const userId = req?.user?._id;
  if (!userId) return;

  const today = dayKey();
  if (today !== heartbeatDay) {
    heartbeatDay = today;
    heartbeatSeen = new Set();
  }

  const key = `${userId}:${req.orgId || 'platform'}`;
  if (heartbeatSeen.has(key)) return;
  if (heartbeatSeen.size < MAX_HEARTBEAT_KEYS) heartbeatSeen.add(key);

  recordEvent({ req, type: EVENT.activity });

  // `lastActiveAt` on the organisation is the one usage figure that has to be
  // readable without touching the event collection: the org list, the at-risk
  // list and the tenant drill-down all show it, and none of them should have to
  // aggregate events to find out when a tenant was last seen.
  if (req.orgId) {
    Organisation.updateOne({ _id: req.orgId }, { $set: { lastActiveAt: new Date() } })
      .catch(error => (req.log || logger).warn('lastActiveAt update failed', { err: error }));
  }
}

/** Test hook: forget the heartbeat cache so a suite can assert a fresh write. */
function resetActivityCache() {
  heartbeatDay = dayKey();
  heartbeatSeen = new Set();
}

module.exports = { EVENT, FEATURES, dayKey, recordEvent, recordActivity, resetActivityCache };
