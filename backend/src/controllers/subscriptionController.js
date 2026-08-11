const { Plan } = require('../models/Plan');
const { Subscription } = require('../models/Subscription');
const { Organisation } = require('../models/Organisation');
const { asyncHandler } = require('../utils/asyncHandler');
const { httpError } = require('../utils/httpError');
const { PlatformInvoice } = require('../models/PlatformInvoice');
const { snapshotFor } = require('../services/planVersionService');
const { CouponRedemption } = require('../models/CouponRedemption');
const { env } = require('../config/env');
const { createSubscription, cancelSubscription: cancelAtProvider } = require('../services/razorpayService');
const { getUsage } = require('../services/planService');
const { logAudit } = require('../services/auditService');
const coupons = require('../services/couponService');
const planChanges = require('../services/planChangeService');
const { BillingCredit } = require('../models/BillingCredit');

const listPlans = asyncHandler(async (req, res) => {
  res.json(await Plan.find({ active: true }).sort({ sortOrder: 1 }));
});

/**
 * The tenant's own tax invoices from us.
 *
 * On the subscription page, where the "Billing History" table used to show a row
 * with an amount reconstructed from the current plan price and no document
 * behind it at all. A customer needs the actual invoice to claim input tax
 * credit on what they pay us.
 */
const myPlatformInvoices = asyncHandler(async (req, res) => {
  const invoices = await PlatformInvoice.find({ orgId: req.orgId, status: 'issued' })
    .sort({ date: -1 })
    .limit(100)
    .lean();
  res.json({ invoices });
});

const currentSubscription = asyncHandler(async (req, res) => {
  const subscription = await Subscription.findOne({ orgId: req.orgId }).sort({ createdAt: -1 });
  const usage = await getUsage(req.orgId);
  /**
   * Credits owed to this tenant (3.3 #10).
   *
   * Shown to the customer as well as to us. A credit that only an operator can
   * see is a credit the customer has to remember to ask for, and the ones who
   * forget are the ones it was owed to.
   */
  const credits = await BillingCredit.find({ orgId: req.orgId, status: 'owed' })
    .sort({ createdAt: -1 }).lean();
  const creditBalance = coupons.round2(credits.reduce((sum, c) => sum + (c.amount || 0), 0));
  res.json({ subscription, usage, credits, creditBalance });
});

/** Whether a code is usable, and what it would be worth — before committing. */
const checkCoupon = asyncHandler(async (req, res) => {
  const { code, planCode, billingCycle = 'monthly' } = req.body;
  const plan = await Plan.findOne({ code: planCode, active: true }).lean();
  if (!plan) throw httpError(400, 'Unknown plan');

  const price = planChanges.priceOf(plan, billingCycle);
  const result = await coupons.evaluate({
    code, planCode, billingCycle, price, orgId: req.orgId
  });

  /**
   * The provider gate is checked here too, not only at checkout.
   *
   * Otherwise a customer is told "LAUNCH50 applied, ₹499" on the pricing page
   * and refused at the moment they press pay, which is the worst possible place
   * to discover it.
   */
  coupons.assertProviderCanHonour(result.coupon, {
    providerWillCharge: price > 0 && env.billingConfigured
  });

  res.json({
    code: result.coupon.code,
    description: result.coupon.description,
    duration: result.coupon.duration,
    durationCycles: result.coupon.durationCycles,
    listPrice: result.listPrice,
    discountAmount: result.discountAmount,
    finalPrice: result.finalPrice
  });
});

/**
 * What changing plan would do, before it is done.
 *
 * "You will be charged ₹1,999 and credited ₹412 for the 12 days left on Growth"
 * is a different decision from an unlabelled Change Plan button, and the
 * difference between an upgrade landing now and a downgrade landing in three
 * weeks is the thing customers most often get wrong about their own billing.
 */
const previewPlanChange = asyncHandler(async (req, res) => {
  const { planCode, billingCycle = 'monthly' } = req.query;
  const plan = await Plan.findOne({ code: planCode, active: true }).lean();
  if (!plan) throw httpError(400, 'Unknown plan');

  const subscription = await Subscription.findOne({
    orgId: req.orgId, status: { $in: ['trial', 'active', 'past_due'] }
  }).sort({ createdAt: -1 });

  if (!subscription) {
    return res.json({
      direction: 'new',
      listPrice: planChanges.priceOf(plan, billingCycle),
      message: `You will be moved to ${plan.name} as soon as payment clears.`
    });
  }

  res.json(await planChanges.preview({ subscription, toPlan: plan, toBillingCycle: billingCycle }));
});

/**
 * Begins a plan change.
 *
 * This creates the checkout and records a *pending* subscription. It does not
 * grant the plan: `Organisation.plan` is only moved by a verified provider
 * webhook confirming the money arrived (see
 * razorpayWebhookController.applyEvent).
 *
 * Previously this set status:'active' and switched the org's plan the moment
 * checkout was created, with no payment confirmation anywhere in the flow — so
 * `POST /subscriptions/start {"planCode":"enterprise"}` handed out the
 * enterprise plan for free.
 *
 * Downgrades to a free plan are applied immediately, since there is nothing to
 * collect.
 */
const startSubscription = asyncHandler(async (req, res) => {
  const { planCode, billingCycle = 'monthly', couponCode } = req.body;
  const plan = await Plan.findOne({ code: planCode, active: true });
  if (!plan) throw httpError(400, 'Unknown plan');

  const listPrice = Number(planChanges.priceOf(plan, billingCycle));
  const isFree = listPrice <= 0;

  const existing = await Subscription.findOne({
    orgId: req.orgId, status: { $in: ['trial', 'active', 'past_due'] }
  }).sort({ createdAt: -1 });

  const change = existing
    ? planChanges.classify({ subscription: existing, toPlan: plan.toObject(), toBillingCycle: billingCycle })
    : { direction: 'new' };

  if (change.direction === 'none') {
    throw httpError(409, `You are already on the ${plan.name} plan.`, 'ALREADY_ON_PLAN');
  }

  /**
   * A downgrade is scheduled, not applied (3.3 #10).
   *
   * The customer paid through the end of this period, and moving them down now
   * takes away something they bought. Nothing is charged and no checkout is
   * created — there is nothing to collect until the new term starts, and asking
   * for a card at the moment somebody chooses to spend less is a way to lose
   * them entirely.
   */
  if (change.direction === 'downgrade') {
    const period = planChanges.currentPeriod(existing);
    if (period) {
      existing.pendingChange = {
        planCode,
        billingCycle,
        effectiveAt: period.end,
        requestedAt: new Date(),
        requestedBy: req.user?.email || String(req.user?._id || '')
      };
      await existing.save();

      logAudit({
        req,
        action: 'subscription.downgrade_scheduled',
        entity: 'subscription',
        entityId: existing._id,
        meta: { from: existing.planCode, to: planCode, effectiveAt: period.end }
      });

      return res.json({
        subscription: existing,
        scheduled: true,
        effectiveAt: period.end,
        message: `You keep ${existing.planCode} until ${period.end.toISOString().slice(0, 10)}, which you have already paid for. ${plan.name} starts then.`
      });
    }
    // No paid-up period to protect — nothing is being taken away, so apply it
    // through the ordinary path below.
  }

  const price = listPrice;

  // A paid plan with no payment provider configured has to fail closed. In
  // development there are no keys and razorpayService runs in local mode, which
  // is fine; in production it would mean giving the plan away.
  if (!isFree && !env.billingConfigured) {
    if (env.isProduction) {
      throw httpError(
        503,
        'Online payments are not configured on this deployment, so paid plans cannot be activated. Please contact support.',
        'BILLING_UNAVAILABLE'
      );
    }
    req.log.warn('Razorpay not configured — activating plan without payment (development only)', { planCode });
  }

  /**
   * The coupon, resolved and claimed before anything is created (3.3 #10).
   *
   * Deliberately ordered this way: `evaluate` and the provider gate both throw,
   * and every one of their failures is a message the customer needs to see
   * *instead of* a checkout, not after one. Claiming the redemption before the
   * provider call also means a code capped at 100 uses cannot be handed to 101
   * people by 101 simultaneous requests.
   */
  let discount = null;
  let claimed = null;
  let providerOfferId = null;
  let priced = { listPrice: price, discountAmount: 0, finalPrice: price };

  if (couponCode) {
    const evaluated = await coupons.evaluate({
      code: couponCode, planCode, billingCycle, price, orgId: req.orgId
    });
    coupons.assertProviderCanHonour(evaluated.coupon, {
      providerWillCharge: !isFree && env.billingConfigured
    });

    claimed = await coupons.redeem({
      coupon: evaluated.coupon,
      orgId: req.orgId,
      billingCycle,
      listPrice: evaluated.listPrice,
      discountAmount: evaluated.discountAmount,
      finalPrice: evaluated.finalPrice
    });
    discount = coupons.subscriptionDiscountFrom(evaluated.coupon, evaluated.listPrice);
    priced = evaluated;
    providerOfferId = evaluated.coupon.providerOfferId || null;
  }

  /**
   * The Razorpay plan for *this cycle* (3.3 #10).
   *
   * Monthly and yearly are two different plans at the provider, each with its
   * own id — this system models them as one plan with two prices, so the mapping
   * has to be resolved here. An unconfigured cycle is refused by
   * `createSubscription` with a message naming the plan and the cycle.
   */
  const provider = await createSubscription({
    planCode,
    orgId: req.orgId,
    providerPlanId: billingCycle === 'yearly'
      ? plan.providerPlanIds?.yearly
      : plan.providerPlanIds?.monthly,
    billingCycle,
    offerId: providerOfferId || null
  });

  // Free plans, and local development without Razorpay, activate straight
  // away. Everything else waits for the webhook.
  const activateNow = isFree || (provider.localMode && !env.isProduction);

  /**
   * The prices and limits this customer is agreeing to, copied onto the
   * subscription (3.3 #9).
   *
   * Nothing stored them before, so every price was resolved by joining to the
   * live `Plan` at read time — which meant a later price change rewrote the
   * amount shown against charges already taken, and restated historical MRR. The
   * snapshot is what makes those figures stable, and the pinned version is what
   * makes this customer's terms survive the next price rise.
   */
  const snapshot = await snapshotFor(plan.toObject());

  /**
   * The discounted price is what goes into the snapshot.
   *
   * Not the list price with a discount recorded beside it. `pricing` is what
   * every read uses — the billing page, the tax invoice, MRR — and leaving the
   * list price there would have all of them quote a number the customer never
   * pays. `discount.listPrice` keeps the "was ₹999" for display.
   */
  if (discount) {
    const field = billingCycle === 'yearly' ? 'yearlyPrice' : 'monthlyPrice';
    snapshot.pricing = { ...snapshot.pricing, [field]: priced.finalPrice };
  }

  const subscription = await Subscription.create({
    orgId: req.orgId,
    planCode,
    billingCycle,
    status: activateNow ? 'active' : 'pending',
    razorpaySubscriptionId: provider.id,
    /**
     * The mandate this replaces, so the charge webhook can stop it (3.3 #10).
     *
     * Recorded now and acted on later. Cancelling the old subscription here
     * would leave a customer whose payment then failed with nothing at all.
     */
    supersedes: existing && change.direction !== 'new' ? existing._id : null,
    discount: discount || undefined,
    ...snapshot
  });

  if (claimed) {
    await CouponRedemption.updateOne({ _id: claimed._id }, { subscriptionId: subscription._id });
  }

  /**
   * The credit an upgrade earns, raised at checkout rather than on activation.
   *
   * The unused days are unused from the moment the customer commits, and
   * deferring the calculation to the webhook would measure them from whenever
   * the payment happened to clear — which for a bank redirect can be the next
   * day. Raised as *owed*, not applied; see `models/BillingCredit.js`.
   */
  let credit = null;
  if (existing && change.direction === 'upgrade') {
    credit = await planChanges.raiseUpgradeCredit({ subscription: existing, toPlanCode: planCode });
  }

  if (activateNow) {
    await Organisation.findByIdAndUpdate(req.orgId, { plan: planCode, status: 'active' });
    // Nothing is waiting on a webhook in this path, so the mandate this
    // replaces has to be stopped here or it never is.
    await planChanges.retirePredecessor(subscription);
  }

  logAudit({
    req,
    action: activateNow ? 'subscription.started' : 'subscription.checkout_created',
    entity: 'subscription',
    entityId: subscription._id,
    meta: {
      planCode, billingCycle, activated: activateNow, direction: change.direction,
      couponCode: discount?.couponCode || null, creditRaised: credit?.amount || 0
    }
  });

  res.status(201).json({
    subscription,
    provider,
    direction: change.direction,
    discount: discount ? { ...discount, discountAmount: priced.discountAmount } : null,
    credit,
    // The frontend needs the key id to open Razorpay Checkout, and needs to
    // know whether it should wait for confirmation rather than showing success.
    checkout: activateNow ? null : { keyId: env.RAZORPAY_KEY_ID, subscriptionId: provider.id },
    pendingPayment: !activateNow,
    message: activateNow
      ? `You are now on the ${plan.name} plan.`
      : `Complete the payment to activate the ${plan.name} plan. Your current plan stays active until then.`
  });
});

/**
 * Cancels a scheduled downgrade.
 *
 * The reason `pendingChange` is a field rather than an immediate write: a
 * customer who downgrades in week one and changes their mind in week two should
 * simply stay where they are, not have to downgrade and then buy the same plan
 * back.
 */
const cancelPendingChange = asyncHandler(async (req, res) => {
  const subscription = await Subscription.findOne({ orgId: req.orgId }).sort({ createdAt: -1 });
  if (!subscription?.pendingChange?.planCode) {
    throw httpError(404, 'There is no scheduled plan change to cancel.', 'NO_PENDING_CHANGE');
  }

  const was = subscription.pendingChange.planCode;
  subscription.pendingChange = {
    planCode: null, billingCycle: null, effectiveAt: null, requestedAt: null, requestedBy: null
  };
  await subscription.save();

  logAudit({
    req, action: 'subscription.downgrade_cancelled', entity: 'subscription',
    entityId: subscription._id, meta: { was }
  });
  res.json({ subscription, message: `You will stay on ${subscription.planCode}.` });
});

/**
 * Cancels at the end of the paid-up period.
 *
 * The old version set `endDate = now`, cutting access off the instant Cancel
 * was clicked even though the customer had paid through the end of the period —
 * and it never told Razorpay, so the recurring mandate kept charging their card
 * indefinitely.
 */
const cancelSubscription = asyncHandler(async (req, res) => {
  const subscription = await Subscription.findOne({ orgId: req.orgId }).sort({ createdAt: -1 });
  if (!subscription) throw httpError(404, 'No active subscription');
  if (subscription.status === 'cancelled') {
    throw httpError(409, 'This subscription is already cancelled.', 'ALREADY_CANCELLED');
  }

  await cancelAtProvider(subscription.razorpaySubscriptionId, { cancelAtCycleEnd: true });

  subscription.cancelAtPeriodEnd = true;
  subscription.cancelledAt = new Date();
  // Access runs to the end of the period already paid for. The webhook flips
  // status to 'cancelled' once the provider confirms the term ended; when there
  // is no period on record (a free or local subscription), end it now.
  if (subscription.currentPeriodEnd && subscription.currentPeriodEnd > new Date()) {
    subscription.endDate = subscription.currentPeriodEnd;
  } else {
    subscription.status = 'cancelled';
    subscription.endDate = new Date();
    await Organisation.findByIdAndUpdate(req.orgId, { plan: 'starter' });
  }
  await subscription.save();

  logAudit({ req, action: 'subscription.cancelled', entity: 'subscription', entityId: subscription._id, meta: { planCode: subscription.planCode, effective: subscription.endDate } });
  res.json(subscription);
});

module.exports = {
  myPlatformInvoices, listPlans, currentSubscription, startSubscription, cancelSubscription,
  checkCoupon, previewPlanChange, cancelPendingChange
};
