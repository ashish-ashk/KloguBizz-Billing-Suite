const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },

  /**
   * The Razorpay plan each billing cycle maps to.
   *
   * ── Why these have to be stored, and cannot be derived ────────────────
   *
   * `razorpayService.createSubscription` used to send `plan_id: planCode` — our
   * own string, `"growth"`. **Razorpay plan ids are provider-generated and look
   * like `plan_NRxyz123abc`; you cannot choose them.** So every real checkout
   * would have been rejected by the gateway, and the failure was invisible
   * locally because development runs without credentials and takes a stub path
   * that never calls Razorpay at all.
   *
   * ── And why there are two of them ─────────────────────────────────────
   *
   * A Razorpay plan carries a **fixed period and a fixed amount**. Monthly
   * Growth and yearly Growth are therefore two different plans at the provider,
   * with two different ids — while this system models them as one plan with two
   * prices. Nothing was passing `billingCycle` down to the provider call either,
   * so even a correct id could only ever have billed one of the two.
   *
   * Empty means "not wired up yet", which is refused at checkout with a message
   * naming what to create rather than sending a request the gateway will reject.
   */
  providerPlanIds: {
    monthly: { type: String, default: '', trim: true },
    yearly: { type: String, default: '', trim: true }
  },
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
