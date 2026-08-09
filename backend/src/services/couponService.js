const { Coupon } = require('../models/Coupon');
const { CouponRedemption } = require('../models/CouponRedemption');
const { httpError } = require('../utils/httpError');

/**
 * Discount codes (3.3 #10).
 *
 * See `models/Coupon.js` for why `providerOfferId` gates real charges. This file
 * is the arithmetic, the validation, and the one atomic claim that makes a
 * redemption cap mean something.
 */

/** Money, to paise. Percent discounts produce thirds of a rupee otherwise. */
function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

/**
 * What a coupon is worth against a price.
 *
 * Clamped at the price, so a ₹1,000 coupon on a ₹999 plan makes it free rather
 * than making it cost minus one rupee. A negative charge is not a discount; it
 * is a refund the gateway will refuse and an invoice nobody can read.
 */
function discountFor(coupon, price) {
  const list = Number(price) || 0;
  if (list <= 0) return { discountAmount: 0, finalPrice: 0 };

  const raw = coupon.discountType === 'percent'
    ? list * (Number(coupon.discountValue) || 0) / 100
    : Number(coupon.discountValue) || 0;

  const discountAmount = round2(Math.min(Math.max(raw, 0), list));
  return { discountAmount, finalPrice: round2(list - discountAmount) };
}

/**
 * Whether a coupon may be used, and why not when it may not.
 *
 * Every refusal names the actual reason. "This code is not valid" for an expired
 * code, a code for a different plan and a code already used by this account are
 * three different conversations, and collapsing them into one message turns each
 * into a support ticket.
 *
 * `orgId` is optional so the console can validate a coupon in the abstract; the
 * per-organisation check is skipped when it is absent rather than silently
 * passing.
 */
async function evaluate({ code, planCode, billingCycle, price, orgId, now = new Date() }) {
  const normalised = String(code || '').trim().toUpperCase();
  if (!normalised) throw httpError(400, 'Enter a discount code.', 'COUPON_REQUIRED');

  const coupon = await Coupon.findOne({ code: normalised });
  if (!coupon) throw httpError(404, `${normalised} is not a discount code we recognise.`, 'COUPON_NOT_FOUND');
  if (!coupon.active) throw httpError(400, `${normalised} is no longer available.`, 'COUPON_INACTIVE');

  if (coupon.validFrom && now < coupon.validFrom) {
    throw httpError(400, `${normalised} cannot be used yet.`, 'COUPON_NOT_STARTED');
  }
  if (coupon.validUntil && now > coupon.validUntil) {
    throw httpError(400, `${normalised} expired on ${coupon.validUntil.toISOString().slice(0, 10)}.`, 'COUPON_EXPIRED');
  }

  if (coupon.appliesToPlans.length && !coupon.appliesToPlans.includes(planCode)) {
    throw httpError(400, `${normalised} does not apply to this plan.`, 'COUPON_WRONG_PLAN');
  }
  if (coupon.appliesToCycles.length && !coupon.appliesToCycles.includes(billingCycle)) {
    const allowed = coupon.appliesToCycles.join(' or ');
    throw httpError(400, `${normalised} applies to ${allowed} billing only.`, 'COUPON_WRONG_CYCLE');
  }

  if (coupon.maxRedemptions != null && coupon.redemptionCount >= coupon.maxRedemptions) {
    throw httpError(409, `${normalised} has been fully claimed.`, 'COUPON_EXHAUSTED');
  }

  if (orgId && coupon.oncePerOrg) {
    const already = await CouponRedemption.findOne({ couponId: coupon._id, orgId }).lean();
    if (already) {
      throw httpError(409, `${normalised} has already been used on this account.`, 'COUPON_ALREADY_USED');
    }
  }

  const { discountAmount, finalPrice } = discountFor(coupon, price);
  return { coupon, discountAmount, finalPrice, listPrice: round2(price) };
}

/**
 * Refuses a coupon the payment provider will not honour.
 *
 * Separate from `evaluate` because it is not a property of the coupon — the same
 * coupon is fine on a free plan and dangerous on a paid one. See
 * `models/Coupon.js`: applying a discount the gateway does not know about
 * collects the full price while telling the customer otherwise.
 *
 * Fails closed, and names the fix, because the alternative failure is invisible
 * until a customer compares their bank statement to the page they signed up on.
 */
function assertProviderCanHonour(coupon, { providerWillCharge }) {
  if (!providerWillCharge) return;
  if (coupon.providerOfferId) return;
  throw httpError(
    409,
    `${coupon.code} cannot be applied to a card payment yet: it has no matching offer at the payment provider, so the card would be charged the full price. Create the offer in Razorpay and record its id against this coupon.`,
    'COUPON_NOT_AT_PROVIDER'
  );
}

/**
 * Claims one redemption, atomically.
 *
 * The cap lives in the filter, so the check and the increment are a single
 * operation. Reading `redemptionCount` and then incrementing it would let two
 * simultaneous checkouts both pass a cap of one — and for a launch code posted
 * on social media, simultaneous checkouts are the normal case rather than a
 * race worth ignoring.
 *
 * The redemption row is written after the claim; if that fails, the claim is
 * given back. The unique index on `{couponId, orgId}` is what actually enforces
 * `oncePerOrg`, and it is the reason this can fail after a successful claim.
 */
async function redeem({ coupon, orgId, subscriptionId, billingCycle, listPrice, discountAmount, finalPrice }) {
  const filter = { _id: coupon._id, active: true };
  if (coupon.maxRedemptions != null) {
    filter.redemptionCount = { $lt: coupon.maxRedemptions };
  }

  const claimed = await Coupon.findOneAndUpdate(filter, { $inc: { redemptionCount: 1 } }, { new: true });
  if (!claimed) {
    throw httpError(409, `${coupon.code} has been fully claimed.`, 'COUPON_EXHAUSTED');
  }

  try {
    const redemption = await CouponRedemption.create({
      couponId: coupon._id,
      code: coupon.code,
      orgId,
      subscriptionId,
      billingCycle,
      originalPrice: listPrice,
      discountAmount,
      finalPrice
    });
    return redemption.toObject();
  } catch (error) {
    // Give the claim back rather than burning a redemption nobody received.
    await Coupon.updateOne({ _id: coupon._id }, { $inc: { redemptionCount: -1 } }).catch(() => {});
    if (error?.code === 11000) {
      throw httpError(409, `${coupon.code} has already been used on this account.`, 'COUPON_ALREADY_USED');
    }
    throw error;
  }
}

/**
 * What to store on the subscription when a coupon is applied.
 *
 * `once` becomes one remaining cycle rather than a special case downstream, so
 * the webhook has exactly one rule to follow: count down, and stop discounting
 * at zero.
 */
function subscriptionDiscountFrom(coupon, listPrice) {
  return {
    couponCode: coupon.code,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    listPrice: round2(listPrice),
    duration: coupon.duration,
    cyclesRemaining: coupon.duration === 'forever'
      ? null
      : (coupon.duration === 'once' ? 1 : coupon.durationCycles || 1),
    appliedAt: new Date()
  };
}

/**
 * Whether a discount still applies to the charge about to happen.
 *
 * Read by the charge webhook. `forever` is a null count, which is why this tests
 * for null explicitly rather than treating it as falsy — `!null` and `!0` are
 * the same, and the two mean opposite things here.
 */
function discountStillApplies(discount) {
  if (!discount?.couponCode) return false;
  if (discount.duration === 'forever') return true;
  return Number(discount.cyclesRemaining || 0) > 0;
}

module.exports = {
  evaluate,
  assertProviderCanHonour,
  redeem,
  discountFor,
  subscriptionDiscountFrom,
  discountStillApplies,
  round2
};
