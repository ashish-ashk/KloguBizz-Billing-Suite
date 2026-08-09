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
  sortOrder: { type: Number, default: 0 },
  /**
   * Which `PlanVersion` this row currently matches (3.3 #9).
   *
   * This row stays the live, mutable definition — every existing read joins on
   * `code` and keeps working — but each edit now archives the outgoing values
   * first. Defaulted rather than required, because twelve test files and the
   * seed script create plans directly, and a required field would break all of
   * them to record something the system can derive on first edit.
   */
  currentVersion: { type: Number, default: 1 }
}, { timestamps: true });

module.exports = { Plan: mongoose.model('Plan', planSchema) };
