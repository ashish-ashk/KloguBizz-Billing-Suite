const router = require('express').Router();
const { tenantGatewayWebhook } = require('../controllers/paymentLinkController');

/**
 * A tenant's own Razorpay webhook.
 *
 * Separate from `/webhooks/razorpay`, which is the *platform's* — the two are
 * signed with different secrets, and verifying a tenant's event against the
 * platform secret would either fail or, worse, succeed for the wrong party.
 *
 * Unauthenticated in the ordinary sense, and not unauthenticated in effect: the
 * organisation is resolved from the order's `notes.orgId` and the payload is then
 * verified against *that tenant's* webhook secret before anything is written. An
 * unsigned or wrongly-signed request writes nothing.
 *
 * `req.rawBody` is captured by `express.json`'s `verify` hook in server.js — the
 * signature is over the exact bytes sent, and a re-serialised body will not match.
 */
router.post('/', tenantGatewayWebhook);

module.exports = router;
