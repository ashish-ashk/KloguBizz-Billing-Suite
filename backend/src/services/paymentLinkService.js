const crypto = require('crypto');
const { PaymentLink } = require('../models/PaymentLink');
const { Payment } = require('../models/Payment');
const { Invoice } = require('../models/Invoice');
const { Organisation } = require('../models/Organisation');
const { env } = require('../config/env');
const { httpError } = require('../utils/httpError');
const { logger } = require('../utils/logger');
const { roundMoney } = require('./gstService');
const gateway = require('./tenantGatewayService');
const { recalculateSettlement } = require('../controllers/invoiceController');

/**
 * Payment links and the hosted pay page (2.3 #21, #23).
 *
 * The flow, and why it is split this way:
 *
 *  1. **Create** — the tenant generates a link for an invoice. Nothing is created
 *     at the gateway yet, so an unused link costs nothing and leaves no orphaned
 *     order.
 *  2. **Open** — the customer loads `/pay/:token`. They see one invoice and
 *     nothing else about the tenant.
 *  3. **Start** — they commit to paying, and only now is a gateway order created,
 *     priced from the invoice's **live balance** rather than from the amount the
 *     link was made for. If a part-payment arrived by bank transfer in between,
 *     they are asked for what is actually still owed.
 *  4. **Settle** — the browser callback and/or the webhook reports success. Both
 *     race, and the unique `providerPaymentId` index means the loser is
 *     recognised as a duplicate instead of recording a second payment.
 *
 * The rule that matters most: **the amount never comes from the payer.** It is
 * read from the invoice server-side at step 3 and re-checked against what the
 * gateway actually captured at step 4.
 */

/** A link is a bearer credential: 32 bytes of CSPRNG, hashed at rest. */
function newToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

/** A short, non-secret handle for support conversations and the audit trail. */
function newReference() {
  return `PL-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

function publicUrl(token) {
  return `${env.FRONTEND_URL}/pay/${encodeURIComponent(token)}`;
}

/**
 * Creates a link for an invoice.
 *
 * Refuses on a draft (there is no number a customer should see and the figures
 * may still change), on a cancelled invoice, and on one with nothing left to pay —
 * each with a distinct code, because "cannot create a link" is not an actionable
 * message and each of these has a different fix.
 */
async function createLink({ org, invoice, req }) {
  if (invoice.status === 'draft') {
    throw httpError(409, 'This invoice is still a draft. Issue it before asking the customer to pay.', 'INVOICE_DRAFT');
  }
  if (invoice.status === 'cancelled') {
    throw httpError(409, 'This invoice has been cancelled, so it cannot be paid.', 'INVOICE_CANCELLED');
  }

  await recalculateSettlement(invoice);
  const due = roundMoney(invoice.balanceDue);
  if (due <= 0) {
    throw httpError(409, `Invoice ${invoice.invoiceNumber} is already fully settled.`, 'ALREADY_PAID');
  }

  const token = newToken();
  const validityDays = org.paymentGateway?.linkValidityDays ?? 14;

  const link = await PaymentLink.create({
    orgId: org._id,
    invoiceId: invoice._id,
    tokenHash: hashToken(token),
    reference: newReference(),
    amount: due,
    currency: 'INR',
    provider: org.paymentGateway?.provider || 'razorpay',
    expiresAt: new Date(Date.now() + validityDays * 86400000),
    createdBy: req?.user?.name || req?.user?.email || ''
  });

  // The plaintext token is returned once, here, and never stored.
  return { link, token, url: publicUrl(token) };
}

/**
 * Resolves a public token to its link, invoice and organisation.
 *
 * Every failure returns the *same* shape of error, so the endpoint cannot be used
 * to probe which tokens exist — the rule the invite and reset lookups follow.
 * Expiry is the one exception: it gets its own code, because "this link has
 * expired, ask for a new one" is genuinely actionable where "invalid" is not.
 */
async function resolveByToken(token) {
  const invalid = () => httpError(404, 'This payment link is not valid. Please ask the sender for a new one.', 'LINK_INVALID');
  if (!token) throw invalid();

  const link = await PaymentLink.findOne({ tokenHash: hashToken(token) });
  if (!link) throw invalid();

  if (link.status === 'cancelled') throw invalid();
  if (link.status === 'expired' || link.expiresAt < new Date()) {
    throw httpError(410, 'This payment link has expired. Please ask the sender for a new one.', 'LINK_EXPIRED');
  }

  const [invoice, org] = await Promise.all([
    Invoice.findById(link.invoiceId).populate('clientId', 'companyName'),
    Organisation.findById(link.orgId)
  ]);
  if (!invoice || !org) throw invalid();

  // A tenant whose account is suspended must not be able to keep collecting
  // through a link issued before the suspension.
  if (org.status === 'suspended' || org.status === 'cancelled') {
    throw httpError(409, 'This business cannot accept payments at the moment. Please contact them directly.', 'ORG_INACTIVE');
  }

  return { link, invoice, org };
}

/**
 * What the public page is allowed to know.
 *
 * Deliberately a hand-built allowlist rather than a filtered document. This is an
 * **unauthenticated** endpoint reachable by anyone with the URL, so the risk is
 * not what is removed today but what a future field addition would silently
 * expose. Nothing here identifies another customer, another invoice, or anything
 * internal — and `keyId` is included because it is public by design and the
 * checkout script needs it.
 */
function publicView({ link, invoice, org }) {
  const due = roundMoney(invoice.balanceDue);
  return {
    reference: link.reference,
    status: link.status === 'paid' || due <= 0 ? 'paid' : 'active',
    expiresAt: link.expiresAt,
    business: {
      name: org.name,
      // The logo is an asset URL, never bytes — the same rule the login page
      // follows. Nothing else about the organisation is exposed.
      logoAssetUrl: org.brandingConfig?.logoKey || org.brandingConfig?.logoUrl
        ? `/assets/org/${org._id}/logo`
        : '',
      supportEmail: org.adminEmail || ''
    },
    invoice: {
      number: invoice.invoiceNumber,
      date: invoice.date,
      dueDate: invoice.dueDate,
      total: roundMoney(invoice.totals?.total || 0),
      // The live figure, which is what will actually be charged.
      amountDue: due,
      currency: link.currency,
      billedTo: invoice.clientId?.companyName || invoice.billTo?.name || ''
    },
    gateway: {
      enabled: gateway.isEnabled(org),
      provider: org.paymentGateway?.provider || 'razorpay',
      keyId: gateway.isEnabled(org) ? org.paymentGateway.keyId : ''
    }
  };
}

/**
 * Creates the gateway order for one attempt.
 *
 * Priced from `invoice.balanceDue` here and nowhere else. The payer sends no
 * amount at all — there is no field for it — because a hosted page that trusted a
 * posted figure would let anyone settle a large invoice for a rupee.
 */
async function startPayment({ link, invoice, org }) {
  await recalculateSettlement(invoice);
  const due = roundMoney(invoice.balanceDue);

  if (due <= 0) {
    // Settled by another route while the page was open. Reconciled rather than
    // charged — taking money for a paid invoice is worse than a failed attempt.
    link.status = 'paid';
    link.settledBy = link.settledBy || 'manual';
    await link.save();
    throw httpError(409, `Invoice ${invoice.invoiceNumber} has already been paid in full.`, 'ALREADY_PAID');
  }

  const order = await gateway.createOrder(org, {
    amountPaise: gateway.toPaise(due),
    currency: link.currency,
    receipt: link.reference,
    notes: { invoiceNumber: invoice.invoiceNumber, paymentLinkId: String(link._id) }
  });

  link.providerOrderId = order.id;
  link.attempts += 1;
  await link.save();

  return {
    orderId: order.id,
    amount: due,
    amountPaise: order.amount,
    currency: order.currency,
    keyId: org.paymentGateway.keyId,
    reference: link.reference,
    business: org.name,
    invoiceNumber: invoice.invoiceNumber
  };
}

/**
 * Records a successful gateway payment against the invoice.
 *
 * Idempotent by construction: `providerPaymentId` is uniquely indexed, so the
 * second of the racing callback/webhook pair fails the write and is reported as
 * `duplicate: true` rather than producing a second `Payment` row.
 *
 * `capturedRupees` is what the gateway says it actually took. It is trusted over
 * the invoice's balance for the *amount recorded* — the money really did move —
 * but a mismatch is logged loudly, because it means the balance changed between
 * the order and the capture and the difference needs a human.
 */
async function settle({ link, invoice, org, paymentId, signature, capturedRupees, settledBy, instrument }) {
  if (link.providerPaymentId && link.providerPaymentId === paymentId) {
    return { duplicate: true, link, payment: null };
  }

  await recalculateSettlement(invoice);
  const due = roundMoney(invoice.balanceDue);
  const captured = roundMoney(capturedRupees ?? due);

  // Never record more than is owed: an over-payment would inflate collection
  // figures and the payments export, which is the exact hole `createPayment`
  // closed for manual entry.
  const amount = Math.min(captured, due > 0 ? due : captured);
  if (captured !== due) {
    logger.warn('gateway captured an amount that differs from the invoice balance', {
      orgId: String(org._id), invoiceNumber: invoice.invoiceNumber, captured, due, paymentId
    });
  }

  // Claim the payment id first. Losing this race is the expected outcome for the
  // slower of the callback and the webhook.
  try {
    const claimed = await PaymentLink.findOneAndUpdate(
      { _id: link._id, providerPaymentId: { $in: [null, ''] } },
      {
        $set: {
          providerPaymentId: paymentId,
          providerSignature: signature || '',
          settledBy,
          paidAt: new Date(),
          status: 'paid'
        }
      },
      { new: true }
    );
    if (!claimed) {
      return { duplicate: true, link: await PaymentLink.findById(link._id), payment: null };
    }
    link.set(claimed.toObject());
  } catch (error) {
    if (error?.code === 11000) {
      // Another link already owns this payment id — the same charge reported twice.
      return { duplicate: true, link, payment: null };
    }
    throw error;
  }

  if (amount <= 0) {
    // Nothing left to record, but the link is correctly marked paid above.
    return { duplicate: false, link, payment: null, alreadySettled: true };
  }

  /**
   * The gateway's own instrument ('card', 'upi', 'netbanking') is recorded as the
   * method without validating it against the tenant's `paymentMethod` masters.
   *
   * That validation exists to stop a *user* typing free text into the manual
   * payment form. Here the value is reported by the gateway for money that has
   * already moved, and rejecting it because a tenant has not added "upi" to a
   * dropdown would refuse to record a real payment — losing the money in our
   * books while the customer's card is charged.
   */
  const payment = await Payment.create({
    orgId: link.orgId,
    invoiceId: invoice._id,
    clientId: invoice.clientId || undefined,
    amount,
    method: instrument || 'online',
    reference: paymentId,
    note: `Paid online via ${link.provider} (${link.reference})`,
    date: new Date(),
    status: 'success'
  });

  link.paymentId = payment._id;
  await link.save();

  if (invoice.status === 'draft') invoice.status = 'pending';
  await recalculateSettlement(invoice);

  return { duplicate: false, link, payment, amount };
}

/** Ages links past their validity. Called by the hourly maintenance sweep, so an
 *  expired link reads as expired in the tenant's list too, not only on the public
 *  page (which derives it). */
async function sweepExpiredLinks() {
  const result = await PaymentLink.updateMany(
    { status: 'active', expiresAt: { $lt: new Date() } },
    { $set: { status: 'expired' } }
  );
  return { expiredPaymentLinks: result.modifiedCount ?? 0 };
}

module.exports = {
  createLink,
  resolveByToken,
  publicView,
  startPayment,
  settle,
  sweepExpiredLinks,
  hashToken,
  publicUrl
};
