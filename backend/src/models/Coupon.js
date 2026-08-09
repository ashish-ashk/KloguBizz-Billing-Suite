const mongoose = require('mongoose');

/**
 * A discount code (3.3 #10).
 *
 * Cheap to build now and impossible before, for one reason: `Subscription`
 * already snapshots the price a customer agreed to (#9). A coupon is a
 * discounted snapshot plus a record of which code produced it. Without the
 * snapshot there would have been nowhere to put the discounted price, because
 * every price was resolved from the live `Plan` at read time.
 *
 * ── The gate this model exists to enforce ─────────────────────────────
 *
 * What the customer's card is actually charged is decided by a Razorpay plan
 * object this codebase never reads or writes — `razorpayService` passes
 * `plan_id: planCode` and nothing else. For plan versioning that limit is
 * survivable, because versioning governs what the product *displays and
 * enforces*.
 *
 * For a coupon it is not survivable. Showing "₹499/month with LAUNCH50" and
 * letting Razorpay collect ₹999 is not a display bug; it is taking ₹500 the
 * customer did not agree to, every month, silently. And the tax invoice we issue
 * would then disagree with their card statement by exactly the discount — which
 * is the same class of error as pricing tax exclusively when the gateway charges
 * inclusive.
 *
 * So `providerOfferId` is **required before a coupon can be applied to a charge
 * the provider will collect**. A coupon without one still works where no
 * provider charge happens — free plans, and local development — and is otherwise
 * refused at checkout by name, rather than accepted and quietly ignored. The
 * console says which coupons are in that state.
 */
const couponSchema = new mongoose.Schema({
  /**
   * The code the customer types.
   *
   * Stored uppercase and matched uppercase, because nobody types a coupon with
   * the capitalisation from the email, and "your code is invalid" for `launch50`
   * against `LAUNCH50` is a support ticket for something that was never wrong.
   */
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  description: { type: String, default: '' },

  /**
   * Percent off, or a flat amount off.
   *
   * Both, rather than normalising to one, because they behave differently across
   * billing cycles: 50% off is 50% off a monthly and a yearly charge alike,
   * while ₹500 off is a half-price month and a rounding error on a year. An
   * operator picking between them is making a real commercial choice.
   */
  discountType: { type: String, enum: ['percent', 'amount'], required: true },
  discountValue: { type: Number, required: true, min: 0 },

  /**
   * How long the discount lasts.
   *
   * `once` is a first-charge discount, `cycles` runs for a fixed number of
   * charges, `forever` never ends. Recorded on the subscription when applied, so
   * the answer does not depend on counting charges backwards later.
   */
  duration: { type: String, enum: ['once', 'cycles', 'forever'], default: 'once' },
  durationCycles: { type: Number, default: null, min: 1 },

  /** Empty means every plan / every cycle. Named plans or cycles restrict it. */
  appliesToPlans: { type: [String], default: [] },
  appliesToCycles: { type: [String], default: [] },

  validFrom: { type: Date, default: null },
  validUntil: { type: Date, default: null },

  /**
   * A hard cap on total redemptions, and the counter behind it.
   *
   * The counter is incremented by a conditional `findOneAndUpdate` that carries
   * the cap in its filter, so the check and the increment are one atomic
   * operation. Reading the count and then incrementing it would let two
   * simultaneous checkouts both pass a cap of one — which for a launch code
   * posted publicly is not a hypothetical race but the normal case.
   */
  maxRedemptions: { type: Number, default: null, min: 1 },
  redemptionCount: { type: Number, default: 0 },

  /** One per organisation, enforced by a unique index on the redemption. */
  oncePerOrg: { type: Boolean, default: true },

  /**
   * The provider's offer id, without which this cannot discount a real charge.
   *
   * See the note at the top of this file. This is the seam, and it is the same
   * shape as `PlanVersion.versionedProviderPlanId` — both exist because the
   * gateway holds the authoritative price and this codebase does not write it.
   */
  providerOfferId: { type: String, default: null },

  active: { type: Boolean, default: true },
  createdBy: String
}, { timestamps: true });

couponSchema.index({ active: 1, validUntil: 1 });

module.exports = { Coupon: mongoose.model('Coupon', couponSchema) };
