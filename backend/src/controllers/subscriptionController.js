const { Plan } = require('../models/Plan');
const { Subscription } = require('../models/Subscription');
const { Organisation } = require('../models/Organisation');
const { asyncHandler } = require('../utils/asyncHandler');
const { httpError } = require('../utils/httpError');
const { PlatformInvoice } = require('../models/PlatformInvoice');
const { snapshotFor } = require('../services/planVersionService');
const { env } = require('../config/env');
const { createSubscription, cancelSubscription: cancelAtProvider } = require('../services/razorpayService');
const { getUsage } = require('../services/planService');
const { logAudit } = require('../services/auditService');

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
  res.json({ subscription, usage });
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
  const { planCode, billingCycle = 'monthly' } = req.body;
  const plan = await Plan.findOne({ code: planCode, active: true });
  if (!plan) throw httpError(400, 'Unknown plan');

  const price = billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
  const isFree = !price || Number(price) <= 0;

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

  const provider = await createSubscription({ planCode, orgId: req.orgId });

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

  const subscription = await Subscription.create({
    orgId: req.orgId,
    planCode,
    billingCycle,
    status: activateNow ? 'active' : 'pending',
    razorpaySubscriptionId: provider.id,
    ...snapshot
  });

  if (activateNow) {
    await Organisation.findByIdAndUpdate(req.orgId, { plan: planCode, status: 'active' });
  }

  logAudit({
    req,
    action: activateNow ? 'subscription.started' : 'subscription.checkout_created',
    entity: 'subscription',
    entityId: subscription._id,
    meta: { planCode, billingCycle, activated: activateNow }
  });

  res.status(201).json({
    subscription,
    provider,
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
  myPlatformInvoices, listPlans, currentSubscription, startSubscription, cancelSubscription };
