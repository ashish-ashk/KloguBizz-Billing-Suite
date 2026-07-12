const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  monthlyPrice: Number,
  yearlyPrice: Number,
  userLimit: Number,
  invoiceLimit: Number,
  features: { type: [String], default: [] },
  active: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = { Plan: mongoose.model('Plan', planSchema) };
