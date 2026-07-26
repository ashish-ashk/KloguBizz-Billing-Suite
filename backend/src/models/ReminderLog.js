const mongoose = require('mongoose');

/**
 * Every reminder we attempted, and what came of it.
 *
 * Two problems this solves. First, delivery was completely invisible:
 * sendEmail returned `{skipped:true}` in local mode and threw on a provider
 * error, and either way nothing was recorded — so there was no way to answer
 * "did the customer actually get chased?". Second, nothing prevented repeats,
 * so a sweep could email the same customer about the same invoice every single
 * day. `stage` plus the compound index below make each reminder stage
 * once-per-invoice.
 */
const reminderLogSchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true, index: true },
  reminderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Reminder' },
  /**
   * Which configured reminder this was. Derived from the Reminder's
   * `daysOffset` (e.g. 'offset:-3' for a courtesy notice three days before due,
   * 'offset:7' for a week overdue) so the identity survives the Reminder
   * document being renamed or re-saved. 'manual' for a one-off send from the UI.
   */
  stage: { type: String, required: true },
  to: String,
  subject: String,
  status: { type: String, enum: ['sent', 'skipped', 'failed'], required: true },
  reason: String,
  /** Balance at the time of sending, for reconstructing why it was chased. */
  balanceDue: Number,
  overdueDays: Number,
  trigger: { type: String, enum: ['scheduled', 'manual', 'bulk'], default: 'scheduled' }
}, { timestamps: true });

// The dedup key: one attempt per invoice per stage. Only successful sends are
// counted as "already done" — see reminderService, which queries on status.
reminderLogSchema.index({ invoiceId: 1, stage: 1, status: 1 });
reminderLogSchema.index({ orgId: 1, createdAt: -1 });

module.exports = { ReminderLog: mongoose.model('ReminderLog', reminderLogSchema) };
