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

async function createSubscription({ planCode, orgId }) {
  const razorpay = client();
  if (!razorpay) {
    return { id: `local_${orgId}_${planCode}`, status: 'created', localMode: true };
  }
  return razorpay.subscriptions.create({
    plan_id: planCode,
    total_count: 120,
    notes: { orgId: String(orgId), planCode }
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
  cancelSubscription,
  verifyWebhookSignature,
  isConfigured: () => env.billingConfigured
};
