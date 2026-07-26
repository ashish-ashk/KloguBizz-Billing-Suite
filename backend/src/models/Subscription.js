const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },
  planCode: { type: String, required: true },
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
