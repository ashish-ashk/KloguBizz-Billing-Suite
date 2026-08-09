const { Organisation } = require('../models/Organisation');
const { Subscription } = require('../models/Subscription');
const { WebhookEvent } = require('../models/WebhookEvent');
const { asyncHandler } = require('../utils/asyncHandler');
const { httpError } = require('../utils/httpError');
const { verifyWebhookSignature } = require('../services/razorpayService');
const { logAudit } = require('../services/auditService');
const { restoreAfterPayment } = require('../services/tenantStatusService');
const platformInvoices = require('../services/platformInvoiceService');
const planChanges = require('../services/planChangeService');
const { Plan } = require('../models/Plan');

// Razorpay sends epoch seconds; Mongo wants a Date.
function toDate(epochSeconds) {
  return epochSeconds ? new Date(Number(epochSeconds) * 1000) : undefined;
}

/**
 * Locates the local Subscription a webhook refers to.
 *
 * Preference order matters: the provider's subscription id is the reliable
 * link, but a `payment.failed` event carries no subscription entity, so we
 * fall back to the `notes.orgId` that createSubscription stamps onto every
 * subscription it creates.
 */
async function resolveSubscription(payload) {
  const entity = payload?.subscription?.entity;
  const razorpayId = entity?.id;
  if (razorpayId) {
    const found = await Subscription.findOne({ razorpaySubscriptionId: razorpayId });
    if (found) return { subscription: found, entity };
  }
  const orgId = entity?.notes?.orgId || payload?.payment?.entity?.notes?.orgId;
  if (orgId) {
    /**
     * Cancelled subscriptions are excluded from the fallback (3.3 #10).
     *
     * A tenant who has changed plan has more than one local subscription, and
     * this fallback picks the newest. It previously included dead ones — so a
     * `payment.failed` arriving late for a mandate that had already been
     * replaced could mark the *live* subscription past due and start dunning a
     * customer who had paid.
     */
    const found = await Subscription.findOne({ orgId, status: { $ne: 'cancelled' } })
      .sort({ createdAt: -1 });
    if (found) return { subscription: found, entity };
  }
  return { subscription: null, entity };
}

/**
 * Applies a verified Razorpay event to local state.
 *
 * This is the only place a paid plan is ever granted. startSubscription
 * deliberately leaves the subscription `pending` and does NOT touch
 * Organisation.plan — it previously activated the plan the moment checkout was
 * created, so any tenant could POST their way onto the enterprise plan for
 * free.
 */
async function applyEvent(event, payload) {
  const { subscription, entity } = await resolveSubscription(payload);
  if (!subscription) return { handled: false, reason: 'no matching local subscription' };

  const org = await Organisation.findById(subscription.orgId);
  if (!org) return { handled: false, reason: 'organisation no longer exists' };

  switch (event) {
    // Payment received — this is what actually grants the plan.
    case 'subscription.activated':
    case 'subscription.charged': {
      subscription.status = 'active';
      subscription.startDate = toDate(entity?.start_at) || subscription.startDate;
      /**
       * Both ends of the period, because proration needs the denominator (3.3 #10).
       *
       * Falling back to now for the start rather than leaving it null: a period
       * whose end is known and whose start is not cannot be prorated at all, and
       * "when the money arrived" is the honest approximation of when the period
       * began for a charge that has just cleared.
       */
      subscription.currentPeriodStart = toDate(entity?.current_start) || new Date();
      subscription.currentPeriodEnd = toDate(entity?.current_end || entity?.charge_at) || subscription.currentPeriodEnd;
      subscription.lastPaymentAt = new Date();

      /**
       * The discount counts down one charge (3.3 #10).
       *
       * `forever` is a null count and is left alone. A `once` coupon was stored
       * as one remaining cycle, so it reaches zero here and the next renewal is
       * at list price — which is what the customer was told when they applied it.
       */
      if (subscription.discount?.couponCode && subscription.discount.cyclesRemaining != null) {
        subscription.discount.cyclesRemaining = Math.max(0, subscription.discount.cyclesRemaining - 1);
      }
      /**
       * The money arrived, so the whole dunning state resets (3.3 #10).
       *
       * Including `dunningStage`: a customer who lapses again in six months
       * should get the gentle first notice, not the final warning they last saw.
       * Starting a returning customer at "final notice" is how a recovered
       * account becomes a cancelled one.
       */
      subscription.failedPaymentCount = 0;
      subscription.pastDueSince = null;
      subscription.dunningStage = 0;
      subscription.lastDunningAt = null;
      subscription.dunningDelivered = false;
      await subscription.save();

      /**
       * Stop the mandate this subscription replaces (3.3 #10).
       *
       * A plan change created a new provider subscription and left the old one
       * running, so an upgrading customer was charged for both plans every month
       * indefinitely. Done here rather than at checkout because the replacement
       * has now actually been paid for — cancelling first would leave a customer
       * whose payment then failed with no subscription at all.
       *
       * Cannot throw: `retirePredecessor` swallows its own errors, because a
       * failure here would return non-200 and make Razorpay retry a charge that
       * already succeeded.
       */
      await planChanges.retirePredecessor(subscription);

      org.plan = subscription.planCode;
      /**
       * Restores an account **only** if dunning was what limited it.
       *
       * The old code set `org.status = 'active'` unconditionally, which meant a
       * successful charge silently reinstated a tenant an operator had suspended
       * for fraud, abuse or a legal hold — undoing a human decision that money
       * was never the point of.
       */
      if (org.status === 'suspended') {
        const restored = await restoreAfterPayment(org._id);
        if (!restored.restored) {
          return { handled: true, action: `payment recorded; suspension left in place (${restored.reason})` };
        }
      } else {
        org.status = 'active';
        await org.save();
      }

      /**
       * The tax invoice for the money just taken (3.3 #10).
       *
       * A registered supplier must issue one, and until now this system took
       * payment and issued the customer nothing they could claim credit against.
       *
       * Deliberately after the subscription and organisation are saved, and
       * deliberately unable to fail this handler: the charge has already
       * succeeded, and a non-200 here makes Razorpay retry a payment that went
       * through. A missing document is a problem for a person; a retried charge
       * is a problem for the customer.
       */
      const plan = await Plan.findOne({ code: subscription.planCode }).select('name').lean();
      await platformInvoices.issueForChargeSafely({
        subscription: { ...subscription.toObject(), planName: plan?.name },
        org,
        providerPaymentId: String(
          payload?.payment?.entity?.id || entity?.id || `sub_${subscription._id}_${Date.now()}`
        ),
        period: { start: toDate(entity?.current_start), end: toDate(entity?.current_end) }
      });
      return { handled: true, action: `activated ${subscription.planCode}` };
    }

    // Mandate problem or failed charge: keep access but flag it, so dunning can
    // chase the customer instead of cutting them off on a single miss.
    case 'subscription.pending':
    case 'subscription.halted':
    case 'payment.failed': {
      subscription.status = 'past_due';
      subscription.failedPaymentCount = (subscription.failedPaymentCount || 0) + 1;
      /**
       * Stamped once, on the first failure, and never moved by a later one.
       *
       * The escalation is measured in *days late*, and re-stamping this on every
       * gateway retry would reset the clock each time — an account failing daily
       * would sit permanently at "one day overdue" and never escalate at all.
       */
      if (!subscription.pastDueSince) subscription.pastDueSince = new Date();
      await subscription.save();
      return { handled: true, action: 'marked past_due' };
    }

    case 'subscription.cancelled':
    case 'subscription.completed':
    case 'subscription.expired': {
      subscription.status = 'cancelled';
      subscription.endDate = toDate(entity?.ended_at) || new Date();
      await subscription.save();

      /**
       * A superseded mandate ending must **not** drop the tenant to starter.
       *
       * Upgrading cancels the old mandate at the provider, and the provider
       * duly reports that cancellation back here. Handling it the ordinary way
       * would take the customer straight off the plan they had just paid to
       * upgrade to — the upgrade cancelling itself, seconds after it succeeded.
       *
       * `supersededBy` is set by `retirePredecessor` at the moment we ask for
       * the cancellation, so it is already true when this arrives.
       */
      if (subscription.supersededBy) {
        return { handled: true, action: 'superseded mandate ended; plan left alone' };
      }

      /**
       * Nor must it, if a newer subscription is live for this tenant.
       *
       * The belt to the previous braces: `resolveSubscription` falls back to the
       * newest local subscription when an event carries no id, and a cancellation
       * arriving for a mandate we never linked would otherwise revoke a plan the
       * customer is paying for.
       */
      const live = await Subscription.findOne({
        orgId: subscription.orgId,
        _id: { $ne: subscription._id },
        status: 'active'
      }).lean();
      if (live) {
        return { handled: true, action: 'a newer subscription is active; plan left alone' };
      }

      // Drop to the free tier rather than suspending — the tenant remains
      // entitled to their own invoice history.
      org.plan = 'starter';
      await org.save();
      return { handled: true, action: 'cancelled, reverted to starter' };
    }

    default:
      return { handled: false, reason: `unhandled event ${event}` };
  }
}

const handleWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  // Previously `if (signature && !verify(...))` — omitting the header entirely
  // skipped verification, so any caller could post forged billing events.
  if (!signature) throw httpError(400, 'Missing x-razorpay-signature header');
  if (!verifyWebhookSignature(req.rawBody, signature)) {
    throw httpError(400, 'Invalid Razorpay signature');
  }

  const event = req.body?.event || 'unknown';
  const payload = req.body?.payload || {};
  // Razorpay doesn't put an event id in the body, so derive a stable one from
  // the signature: it's a deterministic HMAC of the exact payload, so a retry
  // of the same delivery yields the same key while a genuinely different event
  // yields a different one.
  const eventId = String(signature);

  const existing = await WebhookEvent.findOne({ provider: 'razorpay', eventId }).lean();
  if (existing) {
    return res.json({ received: true, event, duplicate: true });
  }

  let result;
  try {
    result = await applyEvent(event, payload);
  } catch (error) {
    await WebhookEvent.create({
      provider: 'razorpay', eventId, event, status: 'failed', error: error.message, payload: req.body
    }).catch(() => {});
    throw error;
  }

  await WebhookEvent.create({
    provider: 'razorpay',
    eventId,
    event,
    status: result.handled ? 'processed' : 'ignored',
    error: result.handled ? undefined : result.reason,
    payload: req.body
  });

  if (result.handled) {
    logAudit({ req: {}, action: `billing.${event}`, entity: 'subscription', meta: { action: result.action } });
  }

  res.json({ received: true, event, handled: result.handled });
});

module.exports = {
  handleWebhook,
  /**
   * Exported for tests.
   *
   * The signature check and replay guard around it are covered separately in
   * `api.integration.test.js`; this is the unit that decides what an event
   * *means*, and the billing consequences of that — a charge clearing a dunning
   * state, a failure stamping the clock — are worth testing without rebuilding
   * an HMAC in every case.
   */
  applyEvent
};
