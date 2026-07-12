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
  status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, { timestamps: true });

clientSchema.index({ orgId: 1, companyName: 1 });
clientSchema.index({ orgId: 1, gstin: 1 });

module.exports = { Client: mongoose.model('Client', clientSchema) };
