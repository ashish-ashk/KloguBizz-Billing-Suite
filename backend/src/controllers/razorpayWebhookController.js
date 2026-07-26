const { Organisation } = require('../models/Organisation');
const { Subscription } = require('../models/Subscription');
const { WebhookEvent } = require('../models/WebhookEvent');
const { asyncHandler } = require('../utils/asyncHandler');
const { httpError } = require('../utils/httpError');
const { verifyWebhookSignature } = require('../services/razorpayService');
const { logAudit } = require('../services/auditService');

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
    const found = await Subscription.findOne({ orgId }).sort({ createdAt: -1 });
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
      subscription.currentPeriodEnd = toDate(entity?.current_end || entity?.charge_at) || subscription.currentPeriodEnd;
      subscription.lastPaymentAt = new Date();
      subscription.failedPaymentCount = 0;
      await subscription.save();
      org.plan = subscription.planCode;
      org.status = 'active';
      await org.save();
      return { handled: true, action: `activated ${subscription.planCode}` };
    }

    // Mandate problem or failed charge: keep access but flag it, so dunning can
    // chase the customer instead of cutting them off on a single miss.
    case 'subscription.pending':
    case 'subscription.halted':
    case 'payment.failed': {
      subscription.status = 'past_due';
      subscription.failedPaymentCount = (subscription.failedPaymentCount || 0) + 1;
      await subscription.save();
      return { handled: true, action: 'marked past_due' };
    }

    case 'subscription.cancelled':
    case 'subscription.completed':
    case 'subscription.expired': {
      subscription.status = 'cancelled';
      subscription.endDate = toDate(entity?.ended_at) || new Date();
      await subscription.save();
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

module.exports = { handleWebhook };
