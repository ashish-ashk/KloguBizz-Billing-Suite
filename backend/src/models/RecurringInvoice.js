const mongoose = require('mongoose');

/**
 * A standing instruction to raise the same invoice on a schedule (2.2 #14).
 *
 * Retainers, AMCs, subscriptions and rent are all the same invoice every period,
 * and re-typing one monthly is both tedious and the most likely thing in the
 * product to be forgotten — an invoice nobody raised is revenue nobody collects.
 *
 * This is a **template plus a schedule**, not an invoice. It has no number, no
 * status a customer would recognise, no settlement state, and it never reaches a
 * GST return. Each run produces a real `Invoice`, which is the document that does
 * all of those things.
 *
 * The hard part is not the schedule, it is **never generating twice for the same
 * period**. An hourly sweep across every tenant, running on more than one
 * instance, that creates legal documents which cannot be deleted, has to be
 * idempotent by construction rather than by luck. That is what
 * `RecurringInvoiceRun` below is for: a unique `{recurringId, periodKey}` claim
 * that is inserted *before* the invoice is created. A duplicate key is not an
 * error, it is the answer — someone already did this period.
 */

// Mirrors Invoice's, so the same GST engine prices the generated document.
const lineItemSchema = new mongoose.Schema({
  desc: { type: String, required: true },
  hsn: String,
  qty: { type: Number, required: true, min: 0 },
  rate: { type: Number, required: true, min: 0 },
  gstRate: { type: Number, required: true, default: 18 },
  cessRate: { type: Number, default: 0, min: 0 },
  discountPercent: { type: Number, default: 0, min: 0, max: 100 },
  taxInclusive: { type: Boolean, default: false }
}, { _id: false });

const billToSchema = new mongoose.Schema({
  type: { type: String, enum: ['b2b-unreg', 'b2c'] },
  name: String,
  phone: String,
  email: String,
  address: String,
  stateCode: String,
  gstin: String
}, { _id: false });

/**
 * How often, expressed as a unit plus a count.
 *
 * `weekly`/`monthly`/`quarterly`/`yearly` covers essentially every real billing
 * arrangement; `interval` handles "every 2 months" without a second vocabulary.
 * `daily` exists mostly for testing a schedule without waiting a week, and is
 * documented as such rather than hidden.
 */
const FREQUENCIES = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'];

const STATUSES = ['active', 'paused', 'completed', 'cancelled'];

const recurringInvoiceSchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },
  /** A name the tenant recognises in a list — "Acme monthly retainer". Not on
   *  the generated invoice; it is for the operator, not the customer. */
  title: { type: String, required: true, trim: true },

  // Buyer — the same two shapes Invoice supports.
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
  billTo: billToSchema,

  // ── The template ──
  items: { type: [lineItemSchema], default: [] },
  discountPercent: { type: Number, default: 0, min: 0, max: 100 },
  placeOfSupply: String,
  taxTreatment: { type: String, default: 'taxable' },
  supplyType: { type: String, default: 'regular' },
  reverseCharge: { type: Boolean, default: false },
  notes: String,
  paymentTerms: { type: String, default: 'Net 15' },
  /** Days between the generated invoice's date and its due date. Stored rather
   *  than parsed out of `paymentTerms`, which is free text a tenant may localise. */
  dueInDays: { type: Number, default: 15, min: 0, max: 365 },

  // ── The schedule ──
  frequency: { type: String, enum: FREQUENCIES, required: true, default: 'monthly' },
  /** "Every N <frequency>". 1 for the ordinary case. */
  interval: { type: Number, default: 1, min: 1, max: 60 },
  startDate: { type: Date, required: true },
  /**
   * When the next invoice is due to be raised.
   *
   * The sweep's entire query is `{status:'active', nextRunAt: {$lte: now}}`, so
   * this is the hot field and is indexed accordingly. Advanced by exactly one
   * period per generated invoice — never set to "now plus one period", which
   * would silently drop a missed period after downtime.
   */
  nextRunAt: { type: Date, required: true, index: true },

  /**
   * Two independent ways to stop, because tenants express the end both ways:
   * "until March" and "twelve invoices". Either may be set, or neither for an
   * open-ended arrangement.
   */
  endsOn: Date,
  endAfterCount: { type: Number, min: 1 },

  status: { type: String, enum: STATUSES, default: 'active' },
  /**
   * Whether to email the generated invoice to the customer automatically.
   *
   * Off by default, deliberately. An invoice that goes out unreviewed is the one
   * thing a tenant cannot take back, and the first time a template has a wrong
   * rate in it they will discover it from the customer rather than from us.
   */
  autoSend: { type: Boolean, default: false },
  /**
   * Whether the generated invoice is issued or left as a draft.
   *
   * A draft consumes no invoice number and moves no stock, so "generate as
   * draft" is the safe default for a tenant who wants the typing done but the
   * decision kept. `autoSend` requires this to be false — there is nothing to
   * send from a draft, and pretending otherwise would fail silently.
   */
  generateAsDraft: { type: Boolean, default: false },

  // ── Outcome tracking ──
  occurrences: { type: Number, default: 0 },
  lastRunAt: Date,
  lastInvoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
  lastInvoiceNumber: String,
  /**
   * Why the last attempt failed, and how many have failed in a row.
   *
   * A schedule that cannot generate — the plan's invoice quota is exhausted, the
   * client was deleted — must not retry silently forever, and must not be
   * abandoned on the first failure either (a quota resets next month). After
   * `MAX_CONSECUTIVE_FAILURES` it pauses itself with the reason retained, which
   * is a state the tenant can see and act on.
   */
  lastError: String,
  consecutiveFailures: { type: Number, default: 0 },

  /** Soft delete (#37), matching utils/softDelete.js. */
  deletedAt: { type: Date, default: null },
  deletedBy: String
}, { timestamps: true });

recurringInvoiceSchema.index({ orgId: 1, status: 1, nextRunAt: 1 });
recurringInvoiceSchema.index({ orgId: 1, clientId: 1 });
recurringInvoiceSchema.index({ orgId: 1, deletedAt: 1 });
// The sweep's query, across every tenant. Deliberately not org-scoped: it is one
// global job, the same shape as the overdue and reminder sweeps.
recurringInvoiceSchema.index({ status: 1, nextRunAt: 1 });

/**
 * One attempted run of one schedule, and the dedup key that makes the sweep
 * idempotent.
 *
 * `{recurringId, periodKey}` is **unique**, and the insert happens *before* the
 * invoice is created. Two instances sweeping at the same moment therefore race
 * on this insert rather than on invoice creation: one wins and generates, the
 * other gets a duplicate-key error and skips. `ReminderLog` establishes the
 * pattern; the difference is that this one has to be a hard unique index rather
 * than a query, because the consequence of losing the race is a second real tax
 * invoice rather than a second email.
 *
 * Failures are recorded too, with `status: 'failed'` — and deliberately keep the
 * claim, so a failed period is not silently retried into a duplicate on the next
 * sweep. Retrying is an explicit action (`retryRun`), which clears the row.
 */
const recurringInvoiceRunSchema = new mongoose.Schema({
  recurringId: { type: mongoose.Schema.Types.ObjectId, ref: 'RecurringInvoice', required: true, index: true },
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },
  /**
   * The period this run is *for*, derived from the scheduled date rather than
   * from "now" — `2026-08` for a monthly schedule, `2026-W32` for a weekly one.
   * Deriving it from the schedule is what makes a catch-up run after downtime
   * still produce one invoice per period rather than several for today.
   */
  periodKey: { type: String, required: true },
  scheduledFor: { type: Date, required: true },
  status: { type: String, enum: ['generated', 'failed', 'skipped'], required: true },
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
  invoiceNumber: String,
  total: Number,
  emailed: { type: Boolean, default: false },
  reason: String,
  trigger: { type: String, enum: ['scheduled', 'manual'], default: 'scheduled' }
}, { timestamps: true });

// The claim. Everything about the sweep's safety rests on this being unique.
recurringInvoiceRunSchema.index({ recurringId: 1, periodKey: 1 }, { unique: true });
recurringInvoiceRunSchema.index({ orgId: 1, createdAt: -1 });

module.exports = {
  RecurringInvoice: mongoose.model('RecurringInvoice', recurringInvoiceSchema),
  RecurringInvoiceRun: mongoose.model('RecurringInvoiceRun', recurringInvoiceRunSchema),
  FREQUENCIES,
  STATUSES
};
