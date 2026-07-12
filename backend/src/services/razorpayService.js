const crypto = require('crypto');
const Razorpay = require('razorpay');
const { env } = require('../config/env');

function client() {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) return null;
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

function verifyWebhookSignature(rawBody, signature) {
  const expected = crypto
    .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');
  return expected === signature;
}

module.exports = { createSubscription, verifyWebhookSignature };
