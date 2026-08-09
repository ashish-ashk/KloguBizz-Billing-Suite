const mongoose = require('mongoose');

/**
 * A cost with no vendor bill behind it (2.4 #32).
 *
 * `Purchase` covers everything bought from a registered supplier against a GST
 * invoice, and it is deliberately strict about that: a vendor, a bill number,
 * and a uniqueness constraint on the pair so the same input tax credit cannot be
 * claimed twice. That strictness is right for what it models and makes it unable
 * to hold most of what a business actually spends money on.
 *
 * **Salaries are the clearest case.** They are the largest expense in most
 * businesses, they have no vendor, no bill number and no GST, and a profit
 * figure that omits them is not merely incomplete — it is wrong in the
 * direction that flatters. The same applies to bank charges, rent paid to an
 * unregistered landlord, petty cash, fuel, and every cash expense a small
 * business has.
 *
 * So this is the second cost document, and the split between the two is not
 * arbitrary: **a `Purchase` may carry input tax credit; an `Expense` never
 * does.** That single rule decides which one a cost belongs in, keeps the GST
 * returns reading only from `Purchase` where the credit lives, and means this
 * model needs no tax fields at all — the amount recorded here is simply what it
 * cost.
 */
const expenseSchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },

  /** When the cost was incurred, which is what the P&L groups by — not when it
   *  was entered, and not when it was paid. */
  date: { type: Date, required: true },

  /**
   * Which line of the P&L this lands on.
   *
   * Validated against the `expenseCategory` master rather than an enum here, so
   * the list can be changed without a deploy — and so a tenant filing under
   * "Freight" cannot silently invent "freight ", "Frieght" and "Transport" as
   * three separate lines in their own accounts.
   */
  category: { type: String, required: true, trim: true },

  description: { type: String, required: true, trim: true },

  /** What it cost. No tax fields: anything carrying claimable GST is a
   *  `Purchase`, which is the whole basis of the split. */
  amount: { type: Number, required: true, min: 0 },

  /** How it was settled, validated against the `paymentMethod` master — the same
   *  list payments against invoices use, because it is the same question. */
  paymentMethod: { type: String, trim: true },

  /** A cheque number, a UTR, a receipt number. Free text because the useful
   *  reference differs by method and constraining it would only be obeyed by
   *  people who did not need the constraint. */
  reference: { type: String, trim: true },

  /** Who it was paid to. A plain name, not a `Vendor` reference: the point of
   *  this model is costs from parties the vendor master does not and should not
   *  contain. */
  paidTo: { type: String, trim: true },

  notes: { type: String, trim: true },

  /** Soft, like every other document a report may already have counted. */
  deletedAt: { type: Date, default: null },
  deletedBy: String
}, { timestamps: true });

/** The P&L query: one tenant, one period. */
expenseSchema.index({ orgId: 1, date: -1 });
/** Grouping by line, within a period. */
expenseSchema.index({ orgId: 1, category: 1, date: -1 });
expenseSchema.index({ orgId: 1, deletedAt: 1 });

module.exports = { Expense: mongoose.model('Expense', expenseSchema) };
