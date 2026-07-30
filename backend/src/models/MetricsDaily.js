const mongoose = require('mongoose');

/**
 * One row per day, platform-wide: the permanent record the console's trend
 * charts read.
 *
 * Why a rollup at all, when `UsageEvent` holds the same information? Because the
 * raw events expire, and because a 90-day chart drawn from them is 90 days of
 * aggregation over the busiest collection in the database on every page view of
 * the dashboard — the exact shape of the problem Phase 3 spent its time removing
 * from the tenant-facing lists. A day that has passed cannot change, so it is
 * computed once.
 *
 * Rows are **global**, not per-tenant. A per-org-per-day matrix would be rows ×
 * tenants and is not what any of these charts plot; per-tenant figures are
 * derived on demand in the tenant drill-down, where the query is naturally
 * scoped to one organisation and stays small.
 *
 * `date` is the midnight-UTC `YYYY-MM-DD` key and is unique, so the rollup is an
 * idempotent upsert — safe to re-run for a day that was already computed, which
 * is what makes backfilling and recovering from a missed night trivial.
 */
const metricsDailySchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true },

  // ── Growth ──
  /** Organisations created on this day. */
  signups: { type: Number, default: 0 },
  /** Cumulative organisation count at the end of this day — stored so a
   *  "total tenants over time" line doesn't need a running sum over all history. */
  orgsTotal: { type: Number, default: 0 },

  /**
   * Status mix, and the MRR fields below, are **snapshots**: nothing records when
   * an organisation's status last changed, so these can only be observed, never
   * reconstructed. They are therefore written only when the day being rolled up
   * has just ended — a backfill of an older day leaves them `null`, and the charts
   * skip nulls rather than plotting today's mix against last month's date.
   */
  orgsActive: { type: Number, default: null },
  orgsTrial: { type: Number, default: null },
  orgsSuspended: { type: Number, default: null },
  orgsCancelled: { type: Number, default: null },

  // ── Engagement ──
  /** Distinct organisations and users that did anything at all. */
  activeOrgs: { type: Number, default: 0 },
  activeUsers: { type: Number, default: 0 },
  logins: { type: Number, default: 0 },

  // ── Volume ──
  invoicesCreated: { type: Number, default: 0 },
  /** Face value of those invoices — the GMV flowing through the platform, which
   *  is a different number from the platform's own revenue. */
  invoiceValue: { type: Number, default: 0 },
  paymentsRecorded: { type: Number, default: 0 },
  paymentValue: { type: Number, default: 0 },
  creditNotesIssued: { type: Number, default: 0 },
  pdfRenders: { type: Number, default: 0 },
  exports: { type: Number, default: 0 },
  emailsSent: { type: Number, default: 0 },

  // ── Platform revenue (subscriptions), as at the end of this day ──
  /** Monthly recurring revenue in rupees. A snapshot, not a sum of the day's
   *  transactions: MRR is a rate, and the only honest way to chart it is to
   *  record what it was each day. Null on a backfilled day, for the reason given
   *  against the status mix above. */
  mrr: { type: Number, default: null },
  payingOrgs: { type: Number, default: null },

  /** When this row was computed, so a stale or half-written day is visible. */
  computedAt: Date
}, { timestamps: true });

metricsDailySchema.index({ date: -1 });

module.exports = { MetricsDaily: mongoose.model('MetricsDaily', metricsDailySchema) };
