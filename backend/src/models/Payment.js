const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true, index: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  amount: { type: Number, required: true, min: 0 },
  method: { type: String, default: 'Bank Transfer' },
  reference: String,
  note: String,
  status: { type: String, enum: ['success', 'failed', 'pending'], default: 'success' },
  date: { type: Date, default: Date.now }
}, { timestamps: true });

paymentSchema.index({ orgId: 1, date: -1 });
paymentSchema.index({ orgId: 1, status: 1 });

module.exports = { Payment: mongoose.model('Payment', paymentSchema) };
