const { Subscription } = require('../models/Subscription');
const { Organisation } = require('../models/Organisation');
const { BillingCredit } = require('../models/BillingCredit');
const { Plan } = require('../models/Plan');
const { cancelSubscription: cancelAtProvider } = require('./razorpayService');
const { round2 } = require('./couponService');
const { logger } = require('../utils/logger');

/**
 * Mid-cycle plan changes (3.3 #10).
 *
 * ── The decision the plan said had to be made ─────────────────────────
 *
 * The improvement plan left this open: credit the unused remainder, or charge
 * the difference from the next cycle. The answer here is **neither, uniformly**,
 * because upgrades and downgrades are not symmetrical and treating them as one
 * case is where this normally goes wrong.
 *
 *   - **An upgrade takes effect immediately, and the unused remainder of the old
 *     plan is credited.** The customer wants the bigger plan *now* — that is why
 *     they are upgrading — and making them wait until the period ends is
 *     refusing money that is being offered. The days they already bought are
 *     theirs, so charging for those days twice is charging twice.
 *
 *   - **A downgrade takes effect at the end of the period, and no money moves.**
 *     They paid through that date and they keep what they paid for. Refunding a
 *     downgrade also creates an obvious loop — upgrade, downgrade, repeat — and
 *     no SMB SaaS does it.
 *
 * The asymmetry is the point: each direction resolves in the customer's favour
 * on the thing they care about, and neither leaves the product holding money it
 * did not earn.
 *
 * ── The bug this file exists to fix ───────────────────────────────────
 *
 * A plan change created a new provider subscription and **left the old mandate
 * running**. Razorpay charged both cards' worth every month, indefinitely, and
 * nothing in the system knew. Worse, `resolveSubscription` falls back to the
 * newest local subscription when an event carries no subscription id — so a
 * failure on the abandoned mandate marked the *live* subscription past due and
 * started dunning a customer who had paid.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** What a plan costs on a cycle. */
function priceOf(plan, billingCycle) {
  return Number((billingCycle === 'yearly' ? plan?.yearlyPrice : plan?.monthlyPrice) || 0);
}

/**
 * A price reduced to what it costs per month, so cycles can be compared.
 *
 * Switching from ₹999 monthly to ₹9,990 yearly is an upgrade in commitment and a
 * *reduction* in monthly cost, and comparing the raw numbers would call it a
 * tenfold upgrade. Normalising makes the comparison mean the thing it is being
 * asked to decide.
 */
function monthlyEquivalent(price, billingCycle) {
  return billingCycle === 'yearly' ? Number(price || 0) / 12 : Number(price || 0);
}

/**
 * Which direction a change goes, measured against what the customer pays today.
 *
 * Against their snapshot, not the live plan price: a grandfathered customer on
 * ₹499 moving to a ₹999 plan is upgrading even if the plan they are leaving now
 * lists at ₹1,499. What they pay is what they would stop paying.
 */
function classify({ subscription, toPlan, toBillingCycle }) {
  const currentCycle = subscription?.billingCycle || 'monthly';
  const currentPrice = currentCycle === 'yearly'
    ? subscription?.pricing?.yearlyPrice
    : subscription?.pricing?.monthlyPrice;

  const from = monthlyEquivalent(currentPrice, currentCycle);
  const to = monthlyEquivalent(priceOf(toPlan, toBillingCycle), toBillingCycle);

  const samePlan = subscription?.planCode === toPlan?.code;
  if (samePlan && currentCycle === toBillingCycle) return { direction: 'none', from, to };
  // A tolerance rather than equality: these are floats divided by twelve, and
  // two prices that are the same to the paisa should not be called an upgrade
  // because of a representation error nine digits down.
  if (Math.abs(to - from) < 0.005) return { direction: 'lateral', from, to };
  return { direction: to > from ? 'upgrade' : 'downgrade', from, to };
}

/**
 * The boundaries of the period the customer is currently in.
 *
 * `currentPeriodStart` is authoritative where it exists. Where it does not —
 * every subscription that predates it — the last payment is the honest fallback,
 * and failing that the subscription start. Returns null when there is nothing to
 * prorate against rather than inventing a period, because a guessed denominator
 * produces a credit that cannot be defended when the customer asks how it was
 * worked out.
 */
function currentPeriod(subscription, now = new Date()) {
  const end = subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : null;
  if (!end || end <= now) return null;

  const start = subscription.currentPeriodStart
    || subscription.lastPaymentAt
    || subscription.startDate;
  if (!start) return null;

  const from = new Date(start);
  if (from >= end) return null;
  return { start: from, end };
}

/**
 * What the unused remainder of the current period is worth.
 *
 * Returns a zero-amount result rather than null when there is simply nothing to
 * credit, so callers can report "nothing owed" without distinguishing it from
 * "could not work it out" — which they can, via `reason`.
 */
function prorate({ subscription, toPlanCode, now = new Date() }) {
  const nothing = amount => ({ amount, daysUnused: 0, daysInPeriod: 0, dailyRate: 0 });

  const paid = subscription?.billingCycle === 'yearly'
    ? subscription?.pricing?.yearlyPrice
    : subscription?.pricing?.monthlyPrice;

  if (!(Number(paid) > 0)) return { ...nothing(0), reason: 'the current plan is free' };
  if (subscription.status !== 'active') return { ...nothing(0), reason: 'the subscription is not active' };

  const period = currentPeriod(subscription, now);
  if (!period) return { ...nothing(0), reason: 'no paid-up period is on record' };

  const daysInPeriod = (period.end - period.start) / DAY_MS;
  const daysUnused = Math.max(0, Math.min(daysInPeriod, (period.end - now) / DAY_MS));
  const dailyRate = Number(paid) / daysInPeriod;

  return {
    amount: round2(daysUnused * dailyRate),
    daysUnused: Math.round(daysUnused * 100) / 100,
    daysInPeriod: Math.round(daysInPeriod * 100) / 100,
    dailyRate: round2(dailyRate),
    periodStart: period.start,
    periodEnd: period.end,
    fromPlanCode: subscription.planCode,
    toPlanCode
  };
}

/**
 * What would happen, without doing it.
 *
 * The subscription page needs this before the customer commits: "you will be
 * charged ₹1,999 and credited ₹412 for the 12 days left on Growth" is a
 * different decision from the same change described as "change plan".
 */
async function preview({ subscription, toPlan, toBillingCycle, now = new Date() }) {
  const { direction } = classify({ subscription, toPlan, toBillingCycle });
  const listPrice = priceOf(toPlan, toBillingCycle);

  if (direction === 'none') {
    return { direction, message: 'You are already on this plan.', listPrice };
  }

  if (direction === 'downgrade') {
    const period = currentPeriod(subscription, now);
    const effectiveAt = period?.end || now;
    /**
     * `scheduled` is reported, not inferred from `direction`.
     *
     * A downgrade is *usually* scheduled, but not when there is no paid-up
     * period to protect — a trial, or a subscription the provider has never
     * charged — and then it applies immediately. The caller has no way to know
     * which, and a button reading "Schedule Change" over a change that happens
     * on the spot is the page lying about what the click does. Caught by driving
     * this in a browser; the API tests were all on subscriptions that had a
     * period.
     */
    return {
      direction,
      scheduled: Boolean(period),
      listPrice,
      effectiveAt,
      credit: { amount: 0, reason: 'a downgrade moves no money' },
      message: period
        ? `You keep ${subscription.planCode} until ${effectiveAt.toISOString().slice(0, 10)}, which you have already paid for. ${toPlan.name} starts then.`
        : `You will move to ${toPlan.name} now.`
    };
  }

  const credit = prorate({ subscription, toPlanCode: toPlan.code, now });
  return {
    direction,
    scheduled: false,
    listPrice,
    effectiveAt: now,
    credit,
    message: credit.amount > 0
      ? `${toPlan.name} starts as soon as payment clears. ${credit.daysUnused} unused days on ${subscription.planCode} are worth ₹${credit.amount}, which will be credited back to you.`
      : `${toPlan.name} starts as soon as payment clears.`
  };
}

/**
 * Records the credit an upgrade earns.
 *
 * Owed, not applied — see `models/BillingCredit.js`. Nothing here reduces a
 * charge, because nothing here can: the gateway holds the price. Writing it down
 * and showing it to an operator is the honest version of a promise this codebase
 * cannot keep on its own.
 */
async function raiseUpgradeCredit({ subscription, toPlanCode, now = new Date() }) {
  const basis = prorate({ subscription, toPlanCode, now });
  if (!(basis.amount > 0)) return null;

  const credit = await BillingCredit.create({
    orgId: subscription.orgId,
    amount: basis.amount,
    reason: 'upgrade-proration',
    note: `${basis.daysUnused} of ${basis.daysInPeriod} days unused on ${subscription.planCode}`,
    basis: {
      fromPlanCode: basis.fromPlanCode,
      toPlanCode: basis.toPlanCode,
      periodStart: basis.periodStart,
      periodEnd: basis.periodEnd,
      daysUnused: basis.daysUnused,
      daysInPeriod: basis.daysInPeriod,
      dailyRate: basis.dailyRate
    },
    sourceSubscriptionId: subscription._id
  });
  return credit.toObject();
}

/**
 * Stops the mandate a newly-activated subscription replaces.
 *
 * Called from the charge webhook, once the replacement has actually been paid
 * for. Deliberately not called at checkout: cancelling the old mandate before
 * the new one clears would leave a customer whose card then failed with no
 * subscription at all — a worse outcome than the double charge this fixes.
 *
 * Never throws. It runs inside the webhook, and a provider error here would make
 * Razorpay retry a charge that already succeeded. An old mandate that outlives
 * its replacement is a billing problem for a person; a retried charge is money
 * taken twice from a customer.
 */
async function retirePredecessor(subscription) {
  if (!subscription?.supersedes) return { retired: false, reason: 'nothing to retire' };

  try {
    const previous = await Subscription.findById(subscription.supersedes);
    if (!previous) return { retired: false, reason: 'predecessor no longer exists' };
    if (previous.status === 'cancelled') return { retired: false, reason: 'already cancelled' };

    /**
     * Cancelled at the provider **immediately**, not at cycle end.
     *
     * The customer is now paying for the replacement, and leaving the old
     * mandate to run one more cycle is exactly the double charge this exists to
     * stop. Their access does not depend on it: the new subscription is active.
     */
    await cancelAtProvider(previous.razorpaySubscriptionId, { cancelAtCycleEnd: false });

    previous.status = 'cancelled';
    previous.cancelledAt = new Date();
    previous.endDate = new Date();
    previous.supersededBy = subscription._id;
    await previous.save();

    return { retired: true, previousId: previous._id };
  } catch (error) {
    logger.error('could not retire the superseded subscription — it may still be charging', {
      err: error,
      subscriptionId: String(subscription._id),
      supersedes: String(subscription.supersedes)
    });
    return { retired: false, reason: error.message };
  }
}

/**
 * Applies downgrades whose period has ended.
 *
 * Registered as `billing.scheduled-changes` so a sweep that stops running is
 * visible on the console (3.5 #11) — a scheduled downgrade that never happens
 * leaves the customer on a plan they stopped paying for, which is the failure
 * direction that costs money rather than trust.
 *
 * Only the local plan moves. The provider mandate is a separate matter: a
 * downgrade means a new mandate at the lower price, which the customer has to
 * authorise, so this cancels the old one and leaves them to check out again
 * rather than silently charging a card for something they did not confirm.
 */
async function applyScheduledChanges({ now = new Date() } = {}) {
  const due = await Subscription.find({
    'pendingChange.planCode': { $ne: null },
    'pendingChange.effectiveAt': { $lte: now },
    status: { $in: ['active', 'past_due'] }
  });

  const applied = [];
  for (const subscription of due) {
    const target = subscription.pendingChange.planCode;
    try {
      const plan = await Plan.findOne({ code: target, active: true }).lean();
      if (!plan) {
        logger.warn('scheduled plan change points at a plan that no longer exists', {
          subscriptionId: String(subscription._id), target
        });
        continue;
      }

      await cancelAtProvider(subscription.razorpaySubscriptionId, { cancelAtCycleEnd: false })
        .catch(error => logger.error('could not cancel the mandate for a scheduled downgrade', { err: error }));

      subscription.status = 'cancelled';
      subscription.endDate = now;
      subscription.pendingChange = {
        planCode: null, billingCycle: null, effectiveAt: null, requestedAt: null, requestedBy: null
      };
      await subscription.save();

      await Organisation.findByIdAndUpdate(subscription.orgId, { plan: target });
      applied.push({ orgId: subscription.orgId, planCode: target });
    } catch (error) {
      logger.error('could not apply a scheduled plan change', {
        err: error, subscriptionId: String(subscription._id)
      });
    }
  }

  return { due: due.length, applied: applied.length, changes: applied };
}

module.exports = {
  classify,
  prorate,
  preview,
  priceOf,
  currentPeriod,
  raiseUpgradeCredit,
  retirePredecessor,
  applyScheduledChanges
};
