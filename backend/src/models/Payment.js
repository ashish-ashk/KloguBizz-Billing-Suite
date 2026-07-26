const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true, index: true },
  // Optional: absent for payments against a walk-in/unregistered bill (see
  // Invoice.billTo) which has no registered Client document to reference.
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
  amount: { type: Number, required: true, min: 0 },
  method: { type: String, default: 'Bank Transfer' },
  reference: String,
  note: String,
  // Server-derived, never accepted from a request body. 'void' is a reversal:
  // the record stays for the audit trail but stops counting towards the
  // invoice balance and towards collections.
  status: { type: String, enum: ['success', 'failed', 'pending', 'void'], default: 'success' },
  voidedAt: Date,
  voidReason: String,
  date: { type: Date, default: Date.now }
}, { timestamps: true });

paymentSchema.index({ orgId: 1, date: -1 });
paymentSchema.index({ orgId: 1, status: 1 });
// Exactly the shape of the settlement aggregate in
// invoiceController.recalculateSettlement, which runs on every payment,
// mark-paid and repricing.
paymentSchema.index({ invoiceId: 1, status: 1 });

module.exports = { Payment: mongoose.model('Payment', paymentSchema) };
