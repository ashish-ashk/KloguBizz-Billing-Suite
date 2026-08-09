const mongoose = require('mongoose');

/**
 * One use of one coupon by one tenant (3.3 #10).
 *
 * A separate document rather than a counter on `Coupon`, because "how many times
 * has this been used" and "who used it, on what, for how much" are different
 * questions and only the second one is ever asked after the fact. When a launch
 * code turns out to have been shared publicly, the counter says how bad it is
 * and this says which accounts to look at.
 *
 * It is also the enforcement mechanism for `oncePerOrg`: the unique index below
 * refuses the second redemption rather than a read-then-check that two
 * simultaneous requests both pass.
 */
const couponRedemptionSchema = new mongoose.Schema({
  couponId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon', required: true, index: true },
  /** Denormalised so the audit trail survives the coupon being deleted. */
  code: { type: String, required: true },

  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },
  subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' },

  /**
   * The arithmetic as it stood, snapshotted for the same reason the subscription
   * snapshots its price: the coupon is editable and the plan price moves, so
   * recomputing this later would produce a number that was never true.
   */
  billingCycle: { type: String, enum: ['monthly', 'yearly'] },
  originalPrice: { type: Number, required: true },
  discountAmount: { type: Number, required: true },
  finalPrice: { type: Number, required: true },

  appliedAt: { type: Date, default: Date.now }
}, { timestamps: true });

/** What makes `oncePerOrg` true rather than merely intended. */
couponRedemptionSchema.index({ couponId: 1, orgId: 1 }, { unique: true });

module.exports = { CouponRedemption: mongoose.model('CouponRedemption', couponRedemptionSchema) };
