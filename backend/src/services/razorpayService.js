const crypto = require('crypto');
const Razorpay = require('razorpay');
const { env } = require('../config/env');

function client() {
  if (!env.billingConfigured) return null;
  return new Razorpay({
    key_id: env.RAZORPAY_KEY_ID,
    key_secret: env.RAZORPAY_KEY_SECRET
  });
}

/**
 * Refuses a checkout for a cycle that has no Razorpay plan behind it.
 *
 * Exported so it can be tested directly: the check inside `createSubscription`
 * only runs once credentials exist, and the test suite deliberately has none —
 * so the guard against the launch blocker would otherwise be the one thing not
 * covered.
 *
 * Refused here rather than sent and rejected. The gateway's own error for a bad
 * plan id is generic, reaches us as a 5xx, and says nothing about which plan or
 * which cycle is unconfigured. This says both, and names the fix.
 */
function assertProviderPlan({ planCode, providerPlanId, billingCycle }) {
  if (providerPlanId) return;
  const error = new Error(
    `The ${planCode} plan has no Razorpay plan id for ${billingCycle} billing, so a subscription cannot be created. `
    + `Create a ${billingCycle} plan in the Razorpay dashboard and record its id (plan_...) against ${planCode}.`
  );
  error.statusCode = 503;
  error.code = 'PROVIDER_PLAN_NOT_CONFIGURED';
  throw error;
}

/**
 * How many charges to authorise on the mandate.
 *
 * Razorpay requires a count, and it is a count of *periods* — so 120 is ten
 * years monthly and one hundred and twenty years yearly. Sending 120 for an
 * annual plan asks the customer to authorise a mandate outliving everyone
 * involved, which some banks refuse outright.
 */
function totalCountFor(billingCycle) {
  return billingCycle === 'yearly' ? 10 : 120;
}

/**
 * Opens a subscription at the provider.
 *
 * `providerPlanId` is the **Razorpay** plan id, not our plan code. This used to
 * send `plan_id: planCode` — our own `"growth"` — and Razorpay ids are
 * provider-generated (`plan_NRxyz123abc`) and cannot be chosen, so every real
 * checkout would have been rejected. It never showed up in development because
 * without credentials this function returns the local stub below and never calls
 * the gateway.
 *
 * `offerId` is how a discount reaches the card (3.3 #10). The amount collected
 * is set by the Razorpay plan, so a coupon applied only in our own records would
 * show one price and charge another; `couponService.assertProviderCanHonour`
 * refuses that case before it gets here, and this passes the offer through when
 * there is one.
 */
async function createSubscription({ planCode, orgId, providerPlanId, billingCycle = 'monthly', offerId = null }) {
  const razorpay = client();
  if (!razorpay) {
    return { id: `local_${orgId}_${planCode}_${Date.now()}`, status: 'created', localMode: true };
  }

  assertProviderPlan({ planCode, providerPlanId, billingCycle });

  return razorpay.subscriptions.create({
    plan_id: providerPlanId,
    total_count: totalCountFor(billingCycle),
    ...(offerId ? { offer_id: offerId } : {}),
    notes: { orgId: String(orgId), planCode, billingCycle }
  });
}

// Cancels the recurring mandate at the provider. Without this, cancelling in
// KloguBizz only updated our own record while Razorpay kept charging the card.
async function cancelSubscription(razorpaySubscriptionId, { cancelAtCycleEnd = true } = {}) {
  const razorpay = client();
  if (!razorpay || !razorpaySubscriptionId || String(razorpaySubscriptionId).startsWith('local_')) {
    return { localMode: true };
  }
  return razorpay.subscriptions.cancel(razorpaySubscriptionId, cancelAtCycleEnd);
}

/**
 * Verifies a webhook payload against the shared secret.
 *
 * `rawBody` must be the exact bytes Razorpay sent — a re-serialised
 * `JSON.stringify(req.body)` will not match, because key order and whitespace
 * change on a parse/stringify round-trip. server.js captures the buffer via
 * express.json's `verify` hook for exactly this reason.
 *
 * Compared with timingSafeEqual so the check can't be probed one byte at a
 * time through response timing.
 */
function verifyWebhookSignature(rawBody, signature) {
  if (!rawBody || !signature) return false;
  const expected = crypto
    .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');
  const provided = String(signature);
  if (provided.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(provided, 'utf8'));
}

module.exports = {
  createSubscription,
  assertProviderPlan,
  totalCountFor,
  cancelSubscription,
  verifyWebhookSignature,
  isConfigured: () => env.billingConfigured
};
