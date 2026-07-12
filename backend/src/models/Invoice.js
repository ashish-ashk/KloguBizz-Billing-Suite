const mongoose = require('mongoose');

const lineItemSchema = new mongoose.Schema({
  desc: { type: String, required: true },
  hsn: String,
  qty: { type: Number, required: true, min: 0 },
  rate: { type: Number, required: true, min: 0 },
  gstRate: { type: Number, required: true, default: 18 }
}, { _id: false });

const totalsSchema = new mongoose.Schema({
  subtotal: { type: Number, default: 0 },
  cgst: { type: Number, default: 0 },
  sgst: { type: Number, default: 0 },
  igst: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  isIGST: { type: Boolean, default: false }
}, { _id: false });

const invoiceSchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  invoiceNumber: { type: String, required: true },
  date: { type: Date, required: true },
  dueDate: { type: Date, required: true },
  status: { type: String, enum: ['draft', 'pending', 'partial', 'paid', 'overdue'], default: 'draft' },
  paidDate: Date,
  items: { type: [lineItemSchema], default: [] },
  totals: { type: totalsSchema, default: () => ({}) },
  notes: String,
  paymentTerms: { type: String, default: 'Net 15' },
  bankDetails: {
    bank: String,
    account: String,
    ifsc: String
  }
}, { timestamps: true });

invoiceSchema.index({ orgId: 1, invoiceNumber: 1 }, { unique: true });
invoiceSchema.index({ orgId: 1, status: 1, date: -1 });
invoiceSchema.index({ orgId: 1, clientId: 1 });

module.exports = { Invoice: mongoose.model('Invoice', invoiceSchema) };
