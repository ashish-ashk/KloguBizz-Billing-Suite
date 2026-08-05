const mongoose = require('mongoose');

/**
 * A shareable link that lets a customer pay an invoice online (2.3 #21, #23).
 *
 * Razorpay was wired only for *our* subscriptions — the tenant paying us — and
 * never for tenant → customer collection. So the product could produce an
 * invoice and chase it, but the only way to actually be paid was a bank transfer
 * the tenant then reconciled by hand. This is the missing half of getting paid.
 *
 * The design constraints, each of which shows up somewhere concrete below:
 *
 *  - **The link is a bearer credential**, so only its SHA-256 hash is stored —
 *    the same rule invite and reset tokens follow (`services/tokenService.js`).
 *    Anyone holding the URL can see one invoice and pay it, which is exactly the
 *    intended capability and nothing more.
 *  - **The amount is never taken from the payer.** It is read from the invoice at
 *    the moment the order is created. A hosted page that trusted a posted amount
 *    would let anyone settle a ₹1,00,000 invoice for ₹1.
 *  - **Recording a payment twice is the failure to design against.** Both the
 *    browser callback and the webhook report the same successful payment, and
 *    they race. `providerPaymentId` is uniquely indexed so the second one loses.
 *  - **It expires.** A payment link that works forever is a standing charge
 *    against a customer's card details long after the invoice was settled some
 *    other way.
 */

const PAYMENT_LINK_STATUSES = ['active', 'paid', 'expired', 'cancelled'];

const paymentLinkSchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true, index: true },

  /**
   * Only the hash. The plaintext exists in the emailed/copied URL and nowhere
   * else — not in the database, not in a log.
   */
  tokenHash: { type: String, required: true },
  /**
   * A short public reference shown on the page and in the audit trail, so a
   * support conversation can identify *which* link without anyone pasting the
   * live token into a ticket.
   */
  reference: { type: String, required: true },

  /**
   * The amount this link was created for, snapshotted for display and for the
   * audit trail. The order is still priced from the invoice's live `balanceDue`
   * at creation time — if a part-payment arrives by another route in between, the
   * customer should be asked for what is actually still owed, not this figure.
   */
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'INR' },

  status: { type: String, enum: PAYMENT_LINK_STATUSES, default: 'active', index: true },
  expiresAt: { type: Date, required: true },

  // ── Gateway state ──
  provider: { type: String, enum: ['razorpay'], default: 'razorpay' },
  /** The gateway's order id, created when the payer opens the page and commits
   *  to paying — not when the link is made, so an unused link costs nothing at
   *  the provider. */
  providerOrderId: String,
  /**
   * The gateway's payment id for the successful charge.
   *
   * Uniquely indexed (sparse) because this is the idempotency key for the whole
   * feature: the browser callback and the webhook both report it, and whichever
   * arrives second must be recognised as a duplicate rather than recorded as a
   * second payment.
   */
  providerPaymentId: String,
  providerSignature: String,

  /** The `Payment` row this produced, so the link and the ledger are tied. */
  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
  paidAt: Date,
  /** How we learned it was paid. Useful when reconciling: a link marked paid by
   *  webhook alone means the customer's browser never came back, which is normal
   *  but worth being able to see. */
  settledBy: { type: String, enum: ['callback', 'webhook', 'manual'] },

  /** Recorded so a failed attempt is visible rather than looking like an
   *  untouched link — "I tried to pay and it didn't work" needs an answer. */
  lastError: String,
  attempts: { type: Number, default: 0 },

  createdBy: String
}, { timestamps: true });

// Token lookup on the public route, on every hit.
paymentLinkSchema.index({ tokenHash: 1 }, { unique: true });
// The idempotency guarantee. Sparse: most links have no payment id.
paymentLinkSchema.index({ providerPaymentId: 1 }, { unique: true, sparse: true });
paymentLinkSchema.index({ orgId: 1, createdAt: -1 });
paymentLinkSchema.index({ invoiceId: 1, status: 1 });
// Drives the expiry sweep.
paymentLinkSchema.index({ status: 1, expiresAt: 1 });

module.exports = {
  PaymentLink: mongoose.model('PaymentLink', paymentLinkSchema),
  PAYMENT_LINK_STATUSES
};
