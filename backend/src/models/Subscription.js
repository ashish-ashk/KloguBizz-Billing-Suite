const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },
  planCode: { type: String, required: true },
  billingCycle: { type: String, enum: ['monthly', 'yearly'], default: 'monthly' },
  status: { type: String, enum: ['trial', 'active', 'past_due', 'cancelled'], default: 'trial' },
  razorpaySubscriptionId: String,
  startDate: { type: Date, default: Date.now },
  endDate: Date
}, { timestamps: true });

subscriptionSchema.index({ orgId: 1, status: 1 });
subscriptionSchema.index({ razorpaySubscriptionId: 1 });

module.exports = { Subscription: mongoose.model('Subscription', subscriptionSchema) };
