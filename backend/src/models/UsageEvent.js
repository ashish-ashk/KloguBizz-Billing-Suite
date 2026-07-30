const mongoose = require('mongoose');

/**
 * Raw product-usage events.
 *
 * Phase 4's platform console is a set of charts, and before this collection
 * existed there was no data to draw them from. The only usage signal anywhere in
 * the product was `User.lastLoginAt` — a single scalar, overwritten on every
 * login, from which no rate, trend, cohort or adoption figure can be recovered.
 * Counting rows in `Invoice` answers "how many invoices exist"; it cannot answer
 * "how many tenants opened a report last week", "did anyone ever use bulk
 * upload", or "which tenants are paying but dormant".
 *
 * Two deliberate constraints keep this from becoming an expensive second write
 * path on every request:
 *
 *  - **Writes are fire-and-forget** (see services/usageEventService.js). An
 *    analytics insert must never fail, slow, or roll back the business
 *    transaction that produced it.
 *  - **Rows expire.** This is the highest-volume collection in the system by
 *    design. The dashboards read from the daily rollup (`MetricsDaily`), which is
 *    permanent; the raw rows only need to survive long enough to be rolled up and
 *    to answer the 30/90-day questions directly. `USAGE_EVENT_RETENTION_DAYS=0`
 *    disables expiry for a deployment that wants to keep everything.
 *
 * `type` is a dotted namespace (`invoice.created`, `export.csv`) rather than an
 * enum: a new instrumentation point should not require a schema migration, and an
 * unknown type is harmless — it simply doesn't appear in a chart that doesn't ask
 * for it. The curated list the dashboards *do* ask for lives in
 * services/usageEventService.js.
 */
const usageEventSchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: { type: String, required: true },
  /** Anything worth knowing about this occurrence — never anything sensitive. */
  meta: mongoose.Schema.Types.Mixed,
  /** Monetary value where the event has one (invoice total, payment amount), so
   *  GMV can be summed without joining back to the source collection. */
  value: { type: Number, default: 0 },
  /** Midnight-UTC bucket, denormalised at write time so the rollup and every
   *  "distinct orgs active on day X" query is a plain indexed match rather than a
   *  `$dateTrunc` over the whole collection. */
  day: { type: String, required: true }
}, { timestamps: { createdAt: true, updatedAt: false } });

// Every dashboard query is one of these three shapes: a window by time, a
// window for one tenant, or a window for one event type.
usageEventSchema.index({ createdAt: -1 });
usageEventSchema.index({ day: 1, type: 1 });
usageEventSchema.index({ orgId: 1, createdAt: -1 });
usageEventSchema.index({ type: 1, createdAt: -1 });

const RETENTION_DAYS = Number(process.env.USAGE_EVENT_RETENTION_DAYS ?? 120);
if (Number.isFinite(RETENTION_DAYS) && RETENTION_DAYS > 0) {
  usageEventSchema.index(
    { createdAt: 1 },
    { expireAfterSeconds: Math.floor(RETENTION_DAYS * 86400), name: 'usage_event_ttl' }
  );
}

module.exports = { UsageEvent: mongoose.model('UsageEvent', usageEventSchema) };
