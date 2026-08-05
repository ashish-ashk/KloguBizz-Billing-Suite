const crypto = require('crypto');
const Razorpay = require('razorpay');
const secretBox = require('../utils/secretBox');
const { httpError } = require('../utils/httpError');
const { logger } = require('../utils/logger');

/**
 * A tenant's own payment gateway, for collecting from their customers
 * (2.3 #21, #23).
 *
 * The provider boundary for tenant → customer collection, kept separate from
 * `services/razorpayService.js`, which is the *platform's* gateway for
 * subscriptions. Sharing one module would mean one bug could charge the wrong
 * party, and the two have different secrets, different failure modes and
 * different consequences.
 *
 * Everything here is per-tenant: the client is built from the organisation's own
 * encrypted credentials on each call rather than cached, because a cached client
 * keyed by nothing is how one tenant's order ends up created on another tenant's
 * account.
 *
 * With no credentials configured, the network calls are a **documented refusal**
 * (`501 GATEWAY_NOT_CONFIGURED`) rather than a mock. That is the same decision the
 * e-invoicing seam makes and for the same reason: a fake success here would mark
 * an invoice paid with money that does not exist, which is worse than an error
 * because nobody would notice until a reconciliation.
 */

const NAMESPACE = 'gateway';

/** Whether this tenant can actually take a payment right now. */
function isEnabled(org) {
  const gateway = org?.paymentGateway;
  return Boolean(gateway?.enabled && gateway.keyId && gateway.keySecret);
}

/**
 * The tenant's credentials, decrypted.
 *
 * Throws rather than returning empties: every caller needs all of them, and a
 * silent partial result would produce a confusing gateway error instead of a
 * clear configuration one.
 */
function credentials(org) {
  const gateway = org?.paymentGateway;
  if (!isEnabled(org)) {
    throw httpError(
      501,
      'Online payments are not set up for this business yet. Add your payment gateway keys in Settings, or pay by bank transfer using the details on the invoice.',
      'GATEWAY_NOT_CONFIGURED'
    );
  }
  try {
    return {
      keyId: gateway.keyId,
      keySecret: secretBox.decrypt(gateway.keySecret, NAMESPACE),
      webhookSecret: gateway.webhookSecret ? secretBox.decrypt(gateway.webhookSecret, NAMESPACE) : ''
    };
  } catch (error) {
    // Almost always a rotated JWT_SECRET with no MFA_ENCRYPTION_KEY set — the
    // documented consequence of the fallback key. Say so, because "decryption
    // failed" is not actionable and this is.
    logger.error('tenant gateway credentials could not be decrypted', { orgId: String(org?._id), err: error });
    throw httpError(
      500,
      'The stored payment gateway credentials could not be read. Re-enter them in Settings. (This happens if the server encryption key was changed.)',
      'GATEWAY_CREDENTIALS_UNREADABLE'
    );
  }
}

/** Encrypts a secret for storage. Idempotent: an already-encrypted value passes
 *  through, so a console round-trip cannot double-encrypt it. */
function protectSecret(value) {
  if (!value) return '';
  return secretBox.looksEncrypted(value) ? value : secretBox.encrypt(value, NAMESPACE);
}

function client(org) {
  const { keyId, keySecret } = credentials(org);
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

/**
 * Creates an order at the gateway for one payment attempt.
 *
 * `amountPaise` is an integer of the smallest currency unit, which is what
 * Razorpay expects — passing rupees would silently charge a hundredth of the
 * invoice. The conversion happens in exactly one place (`toPaise`) so it cannot
 * be got wrong twice differently.
 */
async function createOrder(org, { amountPaise, currency = 'INR', receipt, notes = {} }) {
  const razorpay = client(org);
  if (!Number.isInteger(amountPaise) || amountPaise <= 0) {
    throw httpError(400, 'A payment order needs a positive whole amount in paise.');
  }
  try {
    return await razorpay.orders.create({
      amount: amountPaise,
      currency,
      receipt,
      // Echoed back on the webhook, which is how a webhook that arrives with no
      // matching order in our database can still be attributed.
      notes: { ...notes, orgId: String(org._id) }
    });
  } catch (error) {
    const detail = error?.error?.description || error?.message || 'The payment gateway rejected the request.';
    logger.error('tenant gateway order creation failed', { orgId: String(org._id), err: error });
    throw httpError(502, detail, 'GATEWAY_ORDER_FAILED');
  }
}

/**
 * Verifies that a completed checkout really came from the gateway.
 *
 * This is the single most security-critical function in the feature: without it,
 * anyone who can POST to the verify endpoint can mark any invoice paid. Razorpay
 * signs `order_id|payment_id` with the key secret; the HMAC is compared in
 * constant time so it cannot be probed a byte at a time through response timing —
 * the same rule the platform webhook check follows.
 */
function verifyCheckoutSignature(org, { orderId, paymentId, signature }) {
  if (!orderId || !paymentId || !signature) return false;
  const { keySecret } = credentials(org);
  const expected = crypto
    .createHmac('sha256', keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  const provided = String(signature);
  if (provided.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(provided, 'utf8'));
}

/**
 * Verifies a webhook against the *tenant's* webhook secret.
 *
 * `rawBody` must be the exact bytes received. A re-serialised body will not
 * match, because key order and whitespace change on a JSON round-trip — the trap
 * the platform webhook hit before `server.js` started capturing the raw buffer.
 */
function verifyWebhookSignature(org, rawBody, signature) {
  if (!rawBody || !signature) return false;
  const { webhookSecret } = credentials(org);
  if (!webhookSecret) return false;
  const expected = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
  const provided = String(signature);
  if (provided.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(provided, 'utf8'));
}

/**
 * Confirms a payment id with the gateway rather than trusting what was posted.
 *
 * Used by the webhook path, where there is no signed `order_id|payment_id` pair
 * to check. Returns `null` when the gateway cannot be reached, and the caller
 * treats that as "not yet confirmed" rather than as a failure — a network blip
 * must not mark an invoice unpaid, and the webhook will be retried.
 */
async function fetchPayment(org, paymentId) {
  try {
    const razorpay = client(org);
    return await razorpay.payments.fetch(paymentId);
  } catch (error) {
    logger.warn('could not fetch payment from tenant gateway', { orgId: String(org._id), paymentId, err: error });
    return null;
  }
}

/** Rupees → paise, the only place the conversion happens. */
function toPaise(rupees) {
  return Math.round(Number(rupees || 0) * 100);
}

/** Paise → rupees, for comparing what the gateway reports against the invoice. */
function fromPaise(paise) {
  return Math.round(Number(paise || 0)) / 100;
}

/** What the console may safely see: which key is configured, never the secret. */
function describe(org) {
  const gateway = org?.paymentGateway || {};
  return {
    provider: gateway.provider || 'razorpay',
    enabled: Boolean(gateway.enabled),
    configured: Boolean(gateway.keyId && gateway.keySecret),
    keyId: gateway.keyId || '',
    // The last four only. Enough to confirm *which* secret is stored without
    // ever returning it — the affordance every payment dashboard uses.
    keySecretHint: gateway.keySecret ? '••••••••' : '',
    hasWebhookSecret: Boolean(gateway.webhookSecret),
    linkValidityDays: gateway.linkValidityDays ?? 14,
    connectedAt: gateway.connectedAt || null,
    connectedBy: gateway.connectedBy || ''
  };
}

module.exports = {
  isEnabled,
  credentials,
  protectSecret,
  createOrder,
  verifyCheckoutSignature,
  verifyWebhookSignature,
  fetchPayment,
  toPaise,
  fromPaise,
  describe,
  NAMESPACE
};
