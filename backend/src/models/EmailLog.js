const mongoose = require('mongoose');

/**
 * Every email the platform tries to send (#58).
 *
 * Delivery was completely invisible: `sendEmail` returned `{skipped:true}` when no key
 * was configured, logged a line and moved on, and there was no record either way. The
 * practical consequence is that "did the customer ever get the reminder?" had no
 * answer — not a hard one, *no* answer — which is a problem when the reminder is the
 * product feature and the customer says they were never chased.
 *
 * `ReminderLog` already recorded an outcome per reminder attempt, but only for
 * reminders, and only the immediate provider response. Bounces and complaints arrive
 * *later*, asynchronously, from the provider — which is why this collection exists
 * separately and why `events` is an array rather than a single status.
 */

/**
 * Provider-agnostic status.
 *
 * `sent` and `delivered` are deliberately different: `sent` means the provider
 * accepted it, `delivered` means the receiving server did. The gap between them is
 * where every real delivery problem lives, and collapsing them is why "we sent it"
 * gets said about mail that bounced.
 */
const EMAIL_STATUSES = [
  'skipped',    // no provider configured, or no recipient
  'suppressed', // deliberately not sent — the address is on the suppression list
  'sent',       // the provider accepted it
  'failed',     // the provider rejected it
  'delivered',  // the receiving server accepted it
  'bounced',    // hard or soft bounce
  'spam',       // recipient marked it as spam
  'dropped',    // provider dropped it (previous bounce, unsubscribe)
  'opened'
];

const emailLogSchema = new mongoose.Schema({
  // Null for platform mail with no tenant context (a superadmin's own reset).
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', index: true },
  to: { type: String, required: true, lowercase: true, trim: true },
  subject: String,
  /** Which flow produced it: invite, password-reset, reminder, verification... */
  type: { type: String, required: true },
  status: { type: String, enum: EMAIL_STATUSES, default: 'sent', index: true },
  /** Why it was skipped, suppressed or rejected. */
  reason: String,
  /** The provider's own id, which is what its webhook events reference. */
  providerMessageId: String,
  /**
   * The provider's asynchronous events, appended as they arrive. Kept as a list
   * rather than overwriting `status` alone, because "delivered, then marked as spam"
   * is a different story from "marked as spam", and only one of them is recoverable.
   */
  events: {
    type: [new mongoose.Schema({
      event: String,
      at: Date,
      reason: String,
      raw: mongoose.Schema.Types.Mixed
    }, { _id: false })],
    default: []
  },
  meta: mongoose.Schema.Types.Mixed
}, { timestamps: true });

emailLogSchema.index({ createdAt: -1 });
emailLogSchema.index({ to: 1, createdAt: -1 });
emailLogSchema.index({ orgId: 1, createdAt: -1 });
emailLogSchema.index({ type: 1, status: 1, createdAt: -1 });
// The provider's webhook looks a message up by its own id.
emailLogSchema.index({ providerMessageId: 1 }, { sparse: true });

/**
 * Retention.
 *
 * A year: long enough to answer "you never told me" for any dispute that realistically
 * arises, short enough that the highest-volume non-analytics collection in the system
 * does not grow without bound. `EMAIL_LOG_RETENTION_DAYS=0` disables expiry.
 */
const RETENTION_DAYS = Number(process.env.EMAIL_LOG_RETENTION_DAYS ?? 365);
if (Number.isFinite(RETENTION_DAYS) && RETENTION_DAYS > 0) {
  emailLogSchema.index(
    { createdAt: 1 },
    { expireAfterSeconds: Math.floor(RETENTION_DAYS * 86400), name: 'email_log_ttl' }
  );
}

/**
 * The suppression list.
 *
 * An address that hard-bounced or complained must stop being emailed, and not as a
 * courtesy: continuing to send to it is what destroys a sending domain's reputation,
 * at which point *every* tenant's mail starts landing in spam. So this is a
 * platform-wide list, not a per-tenant one — the reputation being protected is shared.
 */
const suppressionSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  reason: { type: String, enum: ['bounce', 'spam-complaint', 'unsubscribe', 'manual', 'invalid'], required: true },
  detail: String,
  /** Which provider event or operator added it, for when someone asks why. */
  source: String,
  suppressedAt: { type: Date, default: Date.now },
  /** Set when an operator deliberately lifts a suppression. */
  releasedAt: Date,
  releasedBy: String
}, { timestamps: true });

suppressionSchema.index({ suppressedAt: -1 });

module.exports = {
  EmailLog: mongoose.model('EmailLog', emailLogSchema),
  Suppression: mongoose.model('Suppression', suppressionSchema),
  EMAIL_STATUSES
};
