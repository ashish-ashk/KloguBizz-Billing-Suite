const mongoose = require('mongoose');
const { PaymentLink } = require('../models/PaymentLink');
const { Invoice } = require('../models/Invoice');
const { Organisation } = require('../models/Organisation');
const { asyncHandler } = require('../utils/asyncHandler');
const { httpError } = require('../utils/httpError');
const { tenantFilter } = require('../middleware/tenantMiddleware');
const { notDeleted } = require('../utils/softDelete');
const { logAudit } = require('../services/auditService');
const { recordEvent, EVENT } = require('../services/usageEventService');
const { paginate, parseSort } = require('../utils/pagination');
const { env } = require('../config/env');
const links = require('../services/paymentLinkService');
const gateway = require('../services/tenantGatewayService');
const { sendPaymentLinkEmail } = require('../services/emailService');
const { logger } = require('../utils/logger');

/**
 * Payment links (2.3 #21) — both halves.
 *
 * The **tenant-facing** half creates and manages links. The **public** half is
 * unauthenticated and is reached by whoever holds the URL, so it is written to a
 * different standard: an explicit allowlist of what it may return, no way to
 * enumerate, and the amount taken from the invoice rather than the request.
 *
 * `settle` is the one that has to be right. The browser callback and the webhook
 * both report the same charge and they race; the shared `paymentLinkService.settle`
 * is idempotent by unique index so the loser is reported as a duplicate rather
 * than recording money twice.
 */

// ── Tenant side ──────────────────────────────────

const SORTS = ['createdAt', 'expiresAt', 'amount'];

/** Never includes the token — it exists in the URL and nowhere else. */
function shapeLink(link) {
  const plain = typeof link.toObject === 'function' ? link.toObject() : { ...link };
  delete plain.tokenHash;
  delete plain.providerSignature;
  return {
    ...plain,
    isPayable: plain.status === 'active' && new Date(plain.expiresAt) > new Date()
  };
}

const listPaymentLinks = asyncHandler(async (req, res) => {
  const filter = tenantFilter(req);
  if (req.query.status) filter.status = req.query.status;
  if (req.query.invoiceId) filter.invoiceId = req.query.invoiceId;

  const page = await paginate(PaymentLink, filter, req.query, query => query
    .populate('invoiceId', 'invoiceNumber totals balanceDue status')
    .sort(parseSort(req.query, SORTS, { createdAt: -1 })));
  res.json({ ...page, data: page.data.map(shapeLink) });
});

/**
 * Creates a link and returns the URL **once**.
 *
 * The plaintext token is never stored, so this response is the only chance to
 * capture it — the same contract the invite and reset flows have. Re-sharing a
 * lost link means creating a new one, which is correct: a link is a credential.
 */
const createPaymentLink = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOne({ _id: req.body.invoiceId, ...notDeleted(req) });
  if (!invoice) throw httpError(404, 'Invoice not found');

  const org = await Organisation.findById(req.orgId);
  if (!gateway.isEnabled(org)) {
    throw httpError(
      409,
      'Set up your payment gateway in Settings before creating payment links.',
      'GATEWAY_NOT_CONFIGURED'
    );
  }

  const { link, url } = await links.createLink({ org, invoice, req });

  logAudit({
    req,
    action: 'payment_link.created',
    entity: 'paymentLink',
    entityId: link._id,
    meta: { reference: link.reference, invoiceNumber: invoice.invoiceNumber, amount: link.amount }
  });
  recordEvent({ req, type: EVENT.paymentLinkCreated });

  res.status(201).json({ link: shapeLink(link), url });
});

/** Creates a link and emails it to the customer in one step — the common case. */
const sendPaymentLink = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOne({ _id: req.params.invoiceId, ...notDeleted(req) }).populate('clientId');
  if (!invoice) throw httpError(404, 'Invoice not found');

  const org = await Organisation.findById(req.orgId);
  if (!gateway.isEnabled(org)) {
    throw httpError(409, 'Set up your payment gateway in Settings before sending payment links.', 'GATEWAY_NOT_CONFIGURED');
  }

  const to = String(req.body?.to || invoice.clientId?.email || invoice.billTo?.email || '').trim();
  if (!to) {
    throw httpError(
      400,
      'There is no email address for this customer. Add one to their record, or supply one with the request.',
      'NO_RECIPIENT'
    );
  }

  const { link, url } = await links.createLink({ org, invoice, req });
  const result = await sendPaymentLinkEmail({
    to,
    orgId: req.orgId,
    orgName: org.name,
    clientName: invoice.clientId?.companyName || invoice.billTo?.name,
    invoiceNumber: invoice.invoiceNumber,
    amount: link.amount,
    payUrl: url,
    expiresAt: link.expiresAt,
    // A customer's instinct is to reply to a payment request; routing that to the
    // transactional sender loses it silently.
    replyTo: org.adminEmail
  });

  logAudit({
    req,
    action: 'payment_link.sent',
    entity: 'paymentLink',
    entityId: link._id,
    meta: { reference: link.reference, invoiceNumber: invoice.invoiceNumber, to, delivered: !!result.sent }
  });

  res.status(201).json({
    link: shapeLink(link),
    // Handed back only when there is no mail provider and this is not production —
    // the same rule the invite and reset flows follow.
    url: result.skipped && !env.isProduction ? url : undefined,
    delivered: !!result.sent,
    to,
    message: result.sent
      ? `A payment link has been emailed to ${to}.`
      : (result.reason || 'No email provider is configured, so nothing was sent. Copy the link and share it yourself.')
  });
});

/** Revokes a link. The invoice is untouched — only the ability to pay via this
 *  particular URL is withdrawn. */
const cancelPaymentLink = asyncHandler(async (req, res) => {
  const link = await PaymentLink.findOne({ _id: req.params.id, ...tenantFilter(req) });
  if (!link) throw httpError(404, 'Payment link not found');
  if (link.status === 'paid') {
    throw httpError(409, 'This link has already been paid and cannot be cancelled.', 'ALREADY_PAID');
  }
  link.status = 'cancelled';
  await link.save();
  logAudit({ req, action: 'payment_link.cancelled', entity: 'paymentLink', entityId: link._id, meta: { reference: link.reference } });
  res.json(shapeLink(link));
});

// ── Gateway settings ─────────────────────────────

const getGatewaySettings = asyncHandler(async (req, res) => {
  const org = await Organisation.findById(req.orgId);
  res.json(gateway.describe(org));
});

/**
 * Stores the tenant's gateway credentials.
 *
 * The secrets are encrypted before they touch the database, and an empty value
 * means "leave the stored one alone" rather than "clear it" — otherwise the
 * console, which never receives the secret back, would wipe it on every save that
 * only changed the key id. That is the same write-only-field trap the logo had.
 */
const saveGatewaySettings = asyncHandler(async (req, res) => {
  const org = await Organisation.findById(req.orgId);
  const gatewayConfig = org.paymentGateway || {};

  if (req.body.keyId !== undefined) gatewayConfig.keyId = String(req.body.keyId || '').trim();
  if (req.body.keySecret) gatewayConfig.keySecret = gateway.protectSecret(String(req.body.keySecret).trim());
  if (req.body.webhookSecret) gatewayConfig.webhookSecret = gateway.protectSecret(String(req.body.webhookSecret).trim());
  if (req.body.linkValidityDays !== undefined) {
    gatewayConfig.linkValidityDays = Math.min(Math.max(Number(req.body.linkValidityDays) || 14, 1), 90);
  }

  if (req.body.enabled !== undefined) {
    const wantsEnabled = Boolean(req.body.enabled);
    // Refused rather than silently stored as enabled-but-broken, which would
    // produce links that fail at checkout in front of a customer.
    if (wantsEnabled && !(gatewayConfig.keyId && gatewayConfig.keySecret)) {
      throw httpError(400, 'Add both the key id and the key secret before turning online payments on.', 'GATEWAY_INCOMPLETE');
    }
    gatewayConfig.enabled = wantsEnabled;
  }

  if (gatewayConfig.enabled && !gatewayConfig.connectedAt) {
    gatewayConfig.connectedAt = new Date();
    gatewayConfig.connectedBy = req.user?.name || req.user?.email || '';
  }

  org.paymentGateway = gatewayConfig;
  await org.save();

  logAudit({
    req,
    action: 'payment_gateway.updated',
    entity: 'organisation',
    entityId: org._id,
    // Never the secret, and never enough of it to be useful — only *that* it changed.
    meta: {
      enabled: gatewayConfig.enabled,
      keyId: gatewayConfig.keyId,
      secretChanged: Boolean(req.body.keySecret),
      webhookSecretChanged: Boolean(req.body.webhookSecret)
    }
  });
  res.json(gateway.describe(org));
});

// ── Public side (unauthenticated) ────────────────

/**
 * The hosted pay page's data.
 *
 * Unauthenticated and reachable by anyone with the URL. Returns a hand-built
 * allowlist (`paymentLinkService.publicView`) rather than a filtered document,
 * because the risk on a page like this is not what was removed today but what a
 * field added next month would silently expose.
 */
const publicPaymentLink = asyncHandler(async (req, res) => {
  const resolved = await links.resolveByToken(req.params.token);
  res.json(links.publicView(resolved));
});

/** Creates the gateway order. The payer sends no amount — there is no field for
 *  one; it is read from the invoice. */
const startPublicPayment = asyncHandler(async (req, res) => {
  const resolved = await links.resolveByToken(req.params.token);
  const order = await links.startPayment(resolved);
  logAudit({
    req: { orgId: resolved.org._id, ip: req.ip, headers: req.headers, id: req.id },
    action: 'payment_link.attempted',
    entity: 'paymentLink',
    entityId: resolved.link._id,
    orgId: resolved.org._id,
    meta: { reference: resolved.link.reference, orderId: order.orderId, amount: order.amount }
  });
  res.json(order);
});

/**
 * Confirms a completed checkout.
 *
 * The signature check is the whole security of this endpoint: without it anyone
 * who can POST here could mark any invoice paid. It is verified **before**
 * anything is written, and a failure is recorded on the link so a genuinely
 * failed attempt is visible rather than looking like an untouched link.
 */
const confirmPublicPayment = asyncHandler(async (req, res) => {
  const { link, invoice, org } = await links.resolveByToken(req.params.token);
  const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body || {};

  if (!orderId || !paymentId || !signature) {
    throw httpError(400, 'The payment confirmation is incomplete.', 'CONFIRMATION_INCOMPLETE');
  }
  // The order must be the one we created for this link, or a valid signature from
  // some *other* order could be replayed against this invoice.
  if (link.providerOrderId && link.providerOrderId !== orderId) {
    throw httpError(409, 'This confirmation does not match the payment that was started.', 'ORDER_MISMATCH');
  }

  if (!gateway.verifyCheckoutSignature(org, { orderId, paymentId, signature })) {
    link.lastError = 'Signature verification failed';
    await link.save();
    logger.warn('payment link confirmation failed signature verification', {
      orgId: String(org._id), reference: link.reference, orderId, paymentId
    });
    throw httpError(400, 'This payment could not be verified. Nothing has been charged to your account by us — please contact the sender.', 'SIGNATURE_INVALID');
  }

  // What the gateway says it actually captured, rather than what the page thinks.
  // `null` (gateway unreachable) falls back to the invoice balance inside settle.
  const confirmed = await gateway.fetchPayment(org, paymentId);
  const capturedRupees = confirmed?.amount ? gateway.fromPaise(confirmed.amount) : undefined;

  const result = await links.settle({
    link, invoice, org, paymentId, signature,
    capturedRupees,
    settledBy: 'callback',
    instrument: confirmed?.method
  });

  if (!result.duplicate && result.payment) {
    logAudit({
      req: { orgId: org._id, ip: req.ip, headers: req.headers, id: req.id },
      action: 'payment.recorded',
      entity: 'payment',
      entityId: result.payment._id,
      orgId: org._id,
      meta: {
        invoiceNumber: invoice.invoiceNumber,
        amount: result.payment.amount,
        via: 'payment-link',
        reference: link.reference
      }
    });
    recordEvent({ orgId: org._id, type: EVENT.paymentRecorded, meta: { via: 'payment-link' } });
  }

  const refreshed = await Invoice.findById(invoice._id).select('invoiceNumber balanceDue status').lean();
  res.json({
    ok: true,
    // Honest about the duplicate case rather than reporting a second success: the
    // webhook may well have got here first, and the customer's outcome is the same.
    duplicate: Boolean(result.duplicate),
    paid: true,
    invoiceNumber: refreshed.invoiceNumber,
    balanceDue: refreshed.balanceDue,
    message: 'Thank you — your payment has been received.'
  });
});

/**
 * The tenant's own Razorpay webhook.
 *
 * Reconciliation, not the primary path: the browser callback usually gets here
 * first, and this exists for when it does not — the customer closed the tab, the
 * network dropped, the redirect was blocked. Both settle through the same
 * idempotent function.
 *
 * The organisation is resolved from the order's `notes.orgId`, which
 * `tenantGatewayService.createOrder` always sets, because the *tenant's* webhook
 * secret is needed to verify the signature and we cannot know which tenant to ask
 * without it.
 */
const tenantGatewayWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const event = req.body?.event;
  const entity = req.body?.payload?.payment?.entity;

  if (!signature) throw httpError(400, 'Missing signature', 'SIGNATURE_REQUIRED');
  if (!entity) return res.json({ received: true, ignored: 'no payment entity' });

  const orgId = entity.notes?.orgId;
  if (!orgId || !mongoose.Types.ObjectId.isValid(String(orgId))) {
    // Not one of ours, or from an order created outside this flow. Acknowledged so
    // the gateway stops retrying, but nothing is written.
    return res.json({ received: true, ignored: 'no organisation in notes' });
  }

  const org = await Organisation.findById(orgId);
  if (!org || !gateway.isEnabled(org)) return res.json({ received: true, ignored: 'gateway not configured' });

  if (!gateway.verifyWebhookSignature(org, req.rawBody, signature)) {
    logger.warn('tenant gateway webhook failed signature verification', { orgId: String(orgId), event });
    throw httpError(400, 'Invalid signature', 'SIGNATURE_INVALID');
  }

  // Only a captured payment settles an invoice. 'payment.authorized' means the
  // money is held, not taken, and treating it as paid would show a settled
  // invoice for funds that may never arrive.
  if (event !== 'payment.captured') {
    return res.json({ received: true, ignored: `event ${event} does not settle an invoice` });
  }

  const link = await PaymentLink.findOne({ providerOrderId: entity.order_id, orgId: org._id });
  if (!link) return res.json({ received: true, ignored: 'no matching payment link' });

  const invoice = await Invoice.findById(link.invoiceId);
  if (!invoice) return res.json({ received: true, ignored: 'invoice no longer exists' });

  const result = await links.settle({
    link, invoice, org,
    paymentId: entity.id,
    capturedRupees: gateway.fromPaise(entity.amount),
    settledBy: 'webhook',
    instrument: entity.method
  });

  if (!result.duplicate && result.payment) {
    logAudit({
      req: { orgId: org._id, ip: req.ip, headers: req.headers, id: req.id },
      action: 'payment.recorded',
      entity: 'payment',
      entityId: result.payment._id,
      orgId: org._id,
      meta: {
        invoiceNumber: invoice.invoiceNumber,
        amount: result.payment.amount,
        via: 'payment-link-webhook',
        reference: link.reference
      }
    });
  }

  res.json({ received: true, duplicate: Boolean(result.duplicate), recorded: Boolean(result.payment) });
});

module.exports = {
  listPaymentLinks,
  createPaymentLink,
  sendPaymentLink,
  cancelPaymentLink,
  getGatewaySettings,
  saveGatewaySettings,
  publicPaymentLink,
  startPublicPayment,
  confirmPublicPayment,
  tenantGatewayWebhook
};
