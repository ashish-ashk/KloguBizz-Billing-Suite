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

  /**
   * The coupon applied to this subscription, snapshotted (3.3 #10).
   *
   * Copied rather than referenced, for the reason `pricing` is copied: the
   * coupon is editable and can be deleted, and a subscriber's own billing page
   * telling them a different story next month than it did today is the failure
   * the snapshot exists to prevent. `pricing` already holds the *discounted*
   * price, so nothing has to re-derive it; this records why it is what it is.
   */
  discount: {
    couponCode: { type: String, default: null },
    discountType: { type: String, enum: ['percent', 'amount', null], default: null },
    discountValue: { type: Number, default: null },
    /** The undiscounted price, so "₹499 (was ₹999)" needs no join. */
    listPrice: { type: Number, default: null },
    duration: { type: String, enum: ['once', 'cycles', 'forever', null], default: null },
    /**
     * Charges left at the discounted price, counted down by the charge webhook.
     *
     * Null for `forever` and for `once` — `once` is expressed as 1 and reaches 0
     * after the first charge. Counting down beats counting charges backwards
     * from `startDate`, because a failed-then-retried charge is one charge to a
     * customer and two rows to anyone reconstructing it later.
     */
    cyclesRemaining: { type: Number, default: null },
    appliedAt: { type: Date, default: null }
  },

  /**
   * A plan change that has been agreed but has not happened yet (3.3 #10).
   *
   * Only downgrades land here. A customer who downgrades has already paid
   * through the end of the current period, and moving them down on the spot
   * takes away something they bought — so the change is recorded, the customer
   * is told the date, and `billing.scheduled-changes` applies it when the period
   * ends. Cleared if they change their mind, which is the whole point of it
   * being a field rather than an immediate write.
   */
  pendingChange: {
    planCode: { type: String, default: null },
    billingCycle: { type: String, enum: ['monthly', 'yearly', null], default: null },
    effectiveAt: { type: Date, default: null },
    requestedAt: { type: Date, default: null },
    requestedBy: { type: String, default: null }
  },

  /**
   * The subscription this one replaces, and whether its mandate has been stopped.
   *
   * A plan change creates a **new** provider subscription. Nothing used to stop
   * the old one, so an upgrading customer was left with two live Razorpay
   * mandates charging the same card every month — and because `resolveSubscription`
   * matches the newest local subscription when an event carries no id, a failure
   * on the dead mandate marked the live subscription past due.
   *
   * The old mandate is cancelled when the new one **activates**, not when
   * checkout is created: cancelling first would leave a customer whose payment
   * then failed with no subscription at all.
   */
  supersedes: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', default: null },
  supersededBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', default: null },

  billingCycle: { type: String, enum: ['monthly', 'yearly'], default: 'monthly' },
  // 'pending' means checkout was created but no payment has been confirmed
  // yet. A subscription only becomes 'active' — and the org only gets the plan
  // — when a verified provider webhook says the money arrived, see
  // razorpayWebhookController.applyEvent.
  status: { type: String, enum: ['trial', 'pending', 'active', 'past_due', 'cancelled'], default: 'trial' },
  razorpaySubscriptionId: String,
  startDate: { type: Date, default: Date.now },
  /**
   * Start of the period currently paid for.
   *
   * Recorded because proration needs a denominator (3.3 #10): "how much of this
   * period is unused" is unanswerable from the end date alone. `startDate` is
   * not a substitute — after six charges it is six months before the period the
   * customer is actually in, and using it would credit them for the whole
   * subscription rather than the remainder of one month.
   */
  currentPeriodStart: Date,
  // End of the paid-up period. Cancelling sets cancelAtPeriodEnd rather than
  // revoking access on the spot — the customer paid through this date.
  currentPeriodEnd: Date,
  cancelAtPeriodEnd: { type: Boolean, default: false },
  cancelledAt: Date,
  lastPaymentAt: Date,
  failedPaymentCount: { type: Number, default: 0 },

  /**
   * When this subscription first went past due (3.3 #10).
   *
   * `failedPaymentCount` alone cannot drive dunning: three failures could be
   * three retries in an hour or three months apart, and the escalation everyone
   * actually wants is measured in *days late*, not attempts. Set on the first
   * failure and cleared on a successful charge, so it is the anchor every stage
   * is measured from.
   */
  pastDueSince: { type: Date, default: null },

  /** The highest dunning stage already sent, so a restarted sweep does not
   *  begin the sequence again from the top. */
  dunningStage: { type: Number, default: 0 },
  lastDunningAt: { type: Date, default: null },

  /**
   * Whether a dunning message has ever actually reached a person.
   *
   * Suppression is silent by design — a bounced billing address makes every send
   * a no-op — and suspending an account whose owner was never successfully told
   * is punishing someone for a message they did not receive. The sweep refuses
   * to suspend while this is false, and reports those tenants for a human to
   * chase another way.
   */
  dunningDelivered: { type: Boolean, default: false },

  endDate: Date
}, { timestamps: true });

subscriptionSchema.index({ orgId: 1, status: 1 });
subscriptionSchema.index({ razorpaySubscriptionId: 1 });

module.exports = { Subscription: mongoose.model('Subscription', subscriptionSchema) };
