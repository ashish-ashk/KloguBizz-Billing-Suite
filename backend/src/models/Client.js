const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },
  companyName: { type: String, required: true, trim: true },
  email: { type: String, lowercase: true, trim: true },
  phone: String,
  gstin: String,
  address: String,
  state: String,
  stateCode: { type: String, required: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  // Soft delete (#37). A client referenced by invoices must never actually vanish —
  // `populate` would yield null and the invoice list, CSV and PDF would render a
  // blank buyer. Purged only after the grace window, and only if still unreferenced.
  deletedAt: { type: Date, default: null },
  deletedBy: String
}, { timestamps: true });

clientSchema.index({ orgId: 1, companyName: 1 });
clientSchema.index({ orgId: 1, gstin: 1 });
clientSchema.index({ orgId: 1, deletedAt: 1 });

module.exports = { Client: mongoose.model('Client', clientSchema) };
