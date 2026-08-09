const mongoose = require('mongoose');

/**
 * Money owed back to a tenant, and how it was settled (3.3 #10).
 *
 * Raised when a customer upgrades part-way through a period they have already
 * paid for: the days they bought on the old plan and will not use are theirs,
 * and charging them again for the same days on the new plan is charging twice.
 *
 * ── Why this is a ledger and not a number the invoice subtracts ───────
 *
 * The obvious implementation is a balance that reduces the next tax invoice. It
 * is wrong here, and the reason is worth stating because it is not obvious.
 *
 * What the card is charged is decided by Razorpay, from a plan object this
 * codebase never writes. A credit that reduces our invoice but not the charge
 * produces a tax invoice that **disagrees with the customer's bank statement** —
 * exactly the failure that made subscription pricing tax-inclusive rather than
 * exclusive. A document that does not match what left their account is worse
 * than no document: it is the one number they check, and it is wrong.
 *
 * So a credit is recorded as **owed**, surfaced on the console, and settled by a
 * person recording how — a gateway refund, a discount on the next renewal, or a
 * deliberate write-off. That is slower than automating it, and it is the honest
 * shape: the alternative is a promise the code cannot keep.
 *
 * The automated path is a small change once refunds have been run against a real
 * Razorpay account, which — see `docs/LAUNCH-READINESS.md` — has never happened.
 * `settlement.reference` is where the refund id goes when it does.
 */
const billingCreditSchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },

  /** Positive, in rupees. A credit is always owed *to* the tenant. */
  amount: { type: Number, required: true, min: 0 },

  reason: {
    type: String,
    enum: ['upgrade-proration', 'manual'],
    default: 'manual'
  },
  /** Free text for the console, e.g. "18 of 30 days unused on Growth". */
  note: { type: String, default: '' },

  /**
   * The arithmetic that produced it, kept so the number can be defended.
   *
   * "Where did ₹599 come from" is the first question anyone asks about a credit,
   * and reconstructing it later needs the plan price and the period boundaries
   * as they stood, both of which move.
   */
  basis: {
    fromPlanCode: String,
    toPlanCode: String,
    periodStart: Date,
    periodEnd: Date,
    daysUnused: Number,
    daysInPeriod: Number,
    dailyRate: Number
  },

  sourceSubscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' },

  status: { type: String, enum: ['owed', 'settled', 'void'], default: 'owed', index: true },

  settlement: {
    /** How it was actually given back. */
    method: { type: String, enum: ['refund', 'next-invoice', 'write-off', null], default: null },
    /** The gateway refund id, or whatever identifies the adjustment elsewhere. */
    reference: { type: String, default: '' },
    settledAt: Date,
    settledBy: String,
    note: String
  }
}, { timestamps: true });

billingCreditSchema.index({ status: 1, createdAt: -1 });

module.exports = { BillingCredit: mongoose.model('BillingCredit', billingCreditSchema) };
