const { Coupon } = require('../models/Coupon');
const { CouponRedemption } = require('../models/CouponRedemption');
const { BillingCredit } = require('../models/BillingCredit');
const { Organisation } = require('../models/Organisation');
const { asyncHandler } = require('../utils/asyncHandler');
const { httpError } = require('../utils/httpError');
const { logAudit } = require('../services/auditService');
const { env } = require('../config/env');
const { round2 } = require('../services/couponService');

/**
 * Discount codes and billing credits, from the platform console (3.3 #10).
 *
 * Both live behind `/superadmin` because both give money away, and neither is
 * something a tenant administrator should be able to do to their own account.
 */

/**
 * Every coupon, with the one thing an operator most needs to know about each.
 *
 * `usableAtCheckout` is computed rather than stored: a coupon with no provider
 * offer is refused at checkout on a paid plan, and an operator who has created
 * six launch codes and can use none of them should find that out from this list
 * rather than from the first customer who tries.
 */
const listCoupons = asyncHandler(async (req, res) => {
  const coupons = await Coupon.find().sort({ createdAt: -1 }).lean();
  res.json({
    coupons: coupons.map(coupon => ({
      ...coupon,
      remaining: coupon.maxRedemptions == null
        ? null
        : Math.max(0, coupon.maxRedemptions - (coupon.redemptionCount || 0)),
      usableAtCheckout: Boolean(coupon.providerOfferId) || !env.billingConfigured
    })),
    /**
     * Stated once, plainly, rather than left for someone to infer from a field
     * name. This is the single thing about coupons that can cost a customer
     * money without anyone noticing.
     */
    providerNote: env.billingConfigured
      ? 'A coupon can only discount a card payment if it has a matching Razorpay offer id. Without one it is refused at checkout rather than applied, so the customer is never charged more than they were shown.'
      : 'No payment provider is configured, so coupons apply directly. Before going live, every coupon needs a matching Razorpay offer id.'
  });
});

const upsertCoupon = asyncHandler(async (req, res) => {
  const code = String(req.body.code).trim().toUpperCase();

  /**
   * `cycles` without a count is refused rather than defaulted.
   *
   * Defaulting it to one would silently turn "three months half price" into one
   * month, and the customer would be the one to find out.
   */
  if (req.body.duration === 'cycles' && !(Number(req.body.durationCycles) > 0)) {
    throw httpError(400, 'A discount that runs for a number of cycles needs to say how many.', 'COUPON_CYCLES_REQUIRED');
  }
  if (req.body.discountType === 'percent' && Number(req.body.discountValue) > 100) {
    throw httpError(400, 'A percentage discount cannot be more than 100%.', 'COUPON_PERCENT_RANGE');
  }
  if (req.body.validFrom && req.body.validUntil && new Date(req.body.validFrom) > new Date(req.body.validUntil)) {
    throw httpError(400, 'The code would expire before it starts.', 'COUPON_DATES');
  }

  const existing = await Coupon.findOne({ code });

  /**
   * The code itself is immutable once it has been redeemed.
   *
   * Renaming a code that people are already holding invalidates it for every one
   * of them at once, with no error anyone can act on — they simply see "not a
   * code we recognise" for something they were sent last week.
   */
  if (existing && existing.code !== code && existing.redemptionCount > 0) {
    throw httpError(409, 'This code has already been used and cannot be renamed.', 'COUPON_IN_USE');
  }

  const coupon = await Coupon.findOneAndUpdate(
    { code },
    {
      ...req.body,
      code,
      createdBy: existing?.createdBy || req.user?.email
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );

  logAudit({
    req,
    action: existing ? 'coupon.updated' : 'coupon.created',
    entity: 'coupon',
    entityId: coupon._id,
    meta: { code, discountType: coupon.discountType, discountValue: coupon.discountValue }
  });
  res.status(existing ? 200 : 201).json(coupon);
});

/**
 * Retires a code without deleting it.
 *
 * Deleting would take the redemption history with it — and "who used LAUNCH50,
 * and what did we give away" is exactly the question asked when a code turns out
 * to have been shared publicly. Deactivating stops new redemptions and leaves
 * existing subscribers' discounts alone, because their price is snapshotted on
 * the subscription and does not consult this row.
 */
const deactivateCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByIdAndUpdate(req.params.id, { active: false }, { new: true });
  if (!coupon) throw httpError(404, 'Coupon not found');
  logAudit({ req, action: 'coupon.deactivated', entity: 'coupon', entityId: coupon._id, meta: { code: coupon.code } });
  res.json(coupon);
});

/** Who used a code, on what, and for how much. */
const couponRedemptions = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id).lean();
  if (!coupon) throw httpError(404, 'Coupon not found');

  const redemptions = await CouponRedemption.find({ couponId: coupon._id })
    .sort({ appliedAt: -1 }).limit(500).lean();
  const orgs = await Organisation.find({ _id: { $in: redemptions.map(r => r.orgId) } })
    .select('name').lean();
  const names = new Map(orgs.map(o => [String(o._id), o.name]));

  res.json({
    coupon,
    given: round2(redemptions.reduce((sum, r) => sum + (r.discountAmount || 0), 0)),
    redemptions: redemptions.map(r => ({ ...r, orgName: names.get(String(r.orgId)) || 'deleted tenant' }))
  });
});

/**
 * Credits owed, and settled.
 *
 * The console's list of money to give back. Defaults to what is outstanding,
 * because that is the actionable half — see `models/BillingCredit.js` for why
 * these are not applied automatically.
 */
const listCredits = asyncHandler(async (req, res) => {
  const status = ['owed', 'settled', 'void'].includes(req.query.status) ? req.query.status : 'owed';
  const credits = await BillingCredit.find({ status }).sort({ createdAt: -1 }).limit(500).lean();
  const orgs = await Organisation.find({ _id: { $in: credits.map(c => c.orgId) } }).select('name').lean();
  const names = new Map(orgs.map(o => [String(o._id), o.name]));

  res.json({
    status,
    total: round2(credits.reduce((sum, c) => sum + (c.amount || 0), 0)),
    credits: credits.map(c => ({ ...c, orgName: names.get(String(c.orgId)) || 'deleted tenant' }))
  });
});

/** A credit raised by hand — a goodwill gesture, or an off-system adjustment. */
const createCredit = asyncHandler(async (req, res) => {
  const org = await Organisation.findById(req.params.id).select('name').lean();
  if (!org) throw httpError(404, 'Tenant not found');

  const credit = await BillingCredit.create({
    orgId: org._id,
    amount: round2(req.body.amount),
    reason: 'manual',
    note: req.body.note || ''
  });

  logAudit({
    req, action: 'billing.credit_raised', entity: 'organisation', entityId: org._id,
    meta: { amount: credit.amount, note: credit.note }
  });
  res.status(201).json(credit);
});

/**
 * Records how a credit was actually given back.
 *
 * The settlement happens elsewhere — in Razorpay, in a bank transfer, or as a
 * decision to write it off — and this is where that is written down. Requiring a
 * method rather than a free-text note is what makes "how much have we actually
 * refunded" answerable later.
 */
const settleCredit = asyncHandler(async (req, res) => {
  const credit = await BillingCredit.findById(req.params.id);
  if (!credit) throw httpError(404, 'Credit not found');
  if (credit.status !== 'owed') {
    throw httpError(409, `This credit is already ${credit.status}.`, 'CREDIT_NOT_OWED');
  }

  credit.status = req.body.method === 'write-off' ? 'void' : 'settled';
  credit.settlement = {
    method: req.body.method,
    reference: req.body.reference || '',
    settledAt: new Date(),
    settledBy: req.user?.email || '',
    note: req.body.note || ''
  };
  await credit.save();

  logAudit({
    req, action: 'billing.credit_settled', entity: 'organisation', entityId: credit.orgId,
    meta: { amount: credit.amount, method: credit.settlement.method, reference: credit.settlement.reference }
  });
  res.json(credit);
});

module.exports = {
  listCoupons, upsertCoupon, deactivateCoupon, couponRedemptions,
  listCredits, createCredit, settleCredit
};
