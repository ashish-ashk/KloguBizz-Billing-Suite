const mongoose = require('mongoose');

/**
 * A plan as it stood at a moment in time (3.3 #9).
 *
 * `Plan` is a single mutable row per code, and `upsertPlan` overwrites it. That
 * is not merely lossy — it is retroactive. Because nothing anywhere stores what
 * a subscriber actually agreed to, every price is resolved by joining
 * `Subscription.planCode` to the live `Plan` at read time, so raising Growth
 * from ₹999 to ₹1,499 silently:
 *
 *   - reprices every existing Growth customer's **next** charge, with no
 *     grandfathering and no notice;
 *   - rewrites the amount shown against charges **already taken**, so a
 *     customer's own billing history stops matching their bank statement;
 *   - restates historical **MRR and ARPA**, because the metrics job multiplies
 *     today's price by the subscriber count for every past month.
 *
 * The same applies to limits: lowering `invoiceLimit` from 200 to 100 puts every
 * existing subscriber over quota mid-month, and the first they know of it is an
 * invoice being refused.
 *
 * So a version is written **before** the live row changes, and it is immutable.
 * A subscription pins the version it was sold on, and keeps it until somebody
 * deliberately moves it.
 *
 * ── The limit of this, stated plainly ─────────────────────────────────
 *
 * This governs what the product **displays, enforces and reports**. It does not
 * govern what the payment gateway actually collects: `razorpayService`
 * passes `plan_id: planCode` and the real amount lives in a Razorpay plan object
 * this codebase never reads or writes. An existing mandate keeps charging
 * whatever Razorpay was told when it was created. Making the two agree means
 * creating a new Razorpay plan per version and migrating mandates, which is a
 * provider-side project — see `versionedProviderPlanId` below for the seam.
 */
const planVersionSchema = new mongoose.Schema({
  /** The plan this is a version of. Not a ref: `Plan.code` is the stable
   *  identity the whole system already joins on. */
  planCode: { type: String, required: true, index: true },

  /** Monotonic per code, starting at 1. */
  version: { type: Number, required: true },

  // ── The snapshot ──
  name: String,
  monthlyPrice: Number,
  yearlyPrice: Number,
  userLimit: Number,
  invoiceLimit: Number,
  /**
   * Marketing copy, snapshotted for completeness rather than for enforcement.
   *
   * Worth being explicit: `Plan.features` gates nothing. Every real feature gate
   * goes through `featureFlagService`, which reads `Organisation.featureFlags`
   * and deliberately does not consult the plan at all. Versioning this list
   * changes what a historical plan *said*, not what it did.
   */
  features: { type: [String], default: [] },

  /**
   * When this version became the live one.
   *
   * There is deliberately no `effectiveTo`. It is exactly derivable — a version
   * ends when the next one begins, and the highest-numbered version is current —
   * and storing it would mean *updating* a row this file claims is immutable.
   * A snapshot with a mutable field is not a snapshot, and the guard below would
   * have had to carve out an exception that the next change would widen.
   */
  effectiveFrom: { type: Date, required: true },

  /** Who changed it, so a price change has a name against it. The audit log
   *  records the action; this keeps the answer beside the numbers. */
  changedBy: String,
  /** Why. Optional, but the console asks for it — "why did this go up" is the
   *  first question anyone has and the hardest to reconstruct later. */
  changeNote: String,

  /**
   * The provider's plan id for this version, if one was ever created.
   *
   * The seam for making the gateway agree with us. Empty today, because
   * `razorpayService` uses the bare plan code; a future version that creates a
   * Razorpay plan per price would record it here and hand it to
   * `subscriptions.create` instead.
   */
  versionedProviderPlanId: { type: String, default: '' }
}, { timestamps: true });

/** One row per code per version, enforced rather than assumed — two writers
 *  racing on the same plan edit would otherwise both claim the same number. */
planVersionSchema.index({ planCode: 1, version: 1 }, { unique: true });
/** "What was this plan on this date" — the query a dispute is settled with. */
planVersionSchema.index({ planCode: 1, effectiveFrom: -1 });

/**
 * Immutable, for the same reason the stock ledger and the audit log are: a
 * historical record that can be edited answers no question. A wrong version is
 * corrected by publishing another one.
 */
function refuseMutation(next) {
  next(new Error('Plan versions are immutable. Publish a new version instead.'));
}
planVersionSchema.pre('findOneAndUpdate', refuseMutation);
planVersionSchema.pre('updateOne', refuseMutation);
planVersionSchema.pre('updateMany', refuseMutation);
planVersionSchema.pre('save', function guardResave(next) {
  if (!this.isNew) return next(new Error('Plan versions are immutable.'));
  return next();
});

module.exports = { PlanVersion: mongoose.model('PlanVersion', planVersionSchema) };
