const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },
  planCode: { type: String, required: true },
  /**
   * The plan version this subscription was sold on (3.3 #9).
   *
   * Pinned at signup and kept until somebody deliberately moves it, which is what
   * grandfathering *is*. Absent on subscriptions that predate versioning — the
   * resolver treats that as "whatever the plan says now", which is exactly the
   * old behaviour and therefore cannot change anything retroactively.
   */
  planVersion: { type: Number, default: null },

  /**
   * What this subscriber actually agreed to, copied at signup.
   *
   * Denormalised on purpose, and not merely as a cache. Nothing stored the price
   * before, so it was resolved by joining to the live `Plan` at read time — which
   * meant a price change rewrote the amount shown against charges **already
   * taken**, and restated historical MRR. A customer's own billing history
   * stopping agreement with their bank statement is not a rounding problem; it
   * is the product telling them something false about money.
   *
   * The version rows are the audit trail; this is the fast path every read uses.
   */
  pricing: {
    monthlyPrice: { type: Number, default: null },
    yearlyPrice: { type: Number, default: null }
  },

  /**
   * The limits this subscriber is held to.
   *
   * Snapshotted for the same reason. Lowering `invoiceLimit` from 200 to 100 put
   * every existing subscriber over quota mid-month, and the first they heard of
   * it was an invoice being refused.
   */
  limits: {
    userLimit: { type: Number, default: null },
    invoiceLimit: { type: Number, default: null }
  },

  billingCycle: { type: String, enum: ['monthly', 'yearly'], default: 'monthly' },
  // 'pending' means checkout was created but no payment has been confirmed
  // yet. A subscription only becomes 'active' — and the org only gets the plan
  // — when a verified provider webhook says the money arrived, see
  // razorpayWebhookController.applyEvent.
  status: { type: String, enum: ['trial', 'pending', 'active', 'past_due', 'cancelled'], default: 'trial' },
  razorpaySubscriptionId: String,
  startDate: { type: Date, default: Date.now },
  // End of the paid-up period. Cancelling sets cancelAtPeriodEnd rather than
  // revoking access on the spot — the customer paid through this date.
  currentPeriodEnd: Date,
  cancelAtPeriodEnd: { type: Boolean, default: false },
  cancelledAt: Date,
  lastPaymentAt: Date,
  failedPaymentCount: { type: Number, default: 0 },
  endDate: Date
}, { timestamps: true });

subscriptionSchema.index({ orgId: 1, status: 1 });
subscriptionSchema.index({ razorpaySubscriptionId: 1 });

module.exports = { Subscription: mongoose.model('Subscription', subscriptionSchema) };
