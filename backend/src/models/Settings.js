const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
  name: String,
  daysOffset: Number,
  enabled: { type: Boolean, default: true },
  subject: String,
  template: String
}, { timestamps: true });

const auditLogSchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', index: true },
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  actorName: String,
  action: { type: String, required: true },
  entity: String,
  entityId: String,
  meta: mongoose.Schema.Types.Mixed,
  // The id of the request that produced this entry, so an audited action can be
  // traced back through the access log.
  requestId: String,
  /**
   * Where the action came from.
   *
   * Login history, per-IP failure patterns and "impossible travel" are all
   * questions about the *origin* of an action, and none of them could be asked:
   * the log recorded who and what but never from where. The user agent is stored
   * truncated — it is a fingerprint for "same device", not a field anyone reads in
   * full.
   */
  ip: String,
  userAgent: String,
  /**
   * Set when the actor was a superadmin acting *as* a tenant user. Without it an
   * impersonated action is indistinguishable in the trail from one the customer
   * performed themselves — which is the one thing an impersonation feature must
   * never allow.
   */
  impersonatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  impersonatorName: String
}, { timestamps: true });

// The console filters by org, actor, action, entity and date range. Without
// these every filtered query is a collection scan — and an audit log is the one
// collection that only ever grows.
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ orgId: 1, createdAt: -1 });
auditLogSchema.index({ actorId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ entity: 1, entityId: 1, createdAt: -1 });
// The security console asks "what came from this address" (brute force, shared
// credentials) and "what did this superadmin do while impersonating".
auditLogSchema.index({ ip: 1, createdAt: -1 });
auditLogSchema.index({ impersonatorId: 1, createdAt: -1 }, { sparse: true });

/**
 * Retention.
 *
 * The log had no retention policy at all, so it grew without limit. A TTL index
 * expires entries after the configured window — two years by default, which
 * comfortably covers the GST audit window that motivates keeping them, without
 * accumulating forever.
 *
 * `AUDIT_RETENTION_DAYS=0` disables expiry for a deployment with a statutory
 * requirement to keep everything. Note that changing the value on an existing
 * database does not alter the index in place: MongoDB requires the index to be
 * dropped and rebuilt, which is a deliberate migration rather than a silent
 * effect of an env var.
 */
const AUDIT_RETENTION_DAYS = Number(process.env.AUDIT_RETENTION_DAYS ?? 730);
if (Number.isFinite(AUDIT_RETENTION_DAYS) && AUDIT_RETENTION_DAYS > 0) {
  auditLogSchema.index(
    { createdAt: 1 },
    { expireAfterSeconds: Math.floor(AUDIT_RETENTION_DAYS * 86400), name: 'audit_ttl' }
  );
}

/**
 * Append-only.
 *
 * An audit trail that can be edited is not evidence. The controller exposes no
 * update route, but "no route today" is not a guarantee — a future refactor that
 * adds a generic `PUT` would silently make the trail mutable. These hooks make
 * the model itself refuse, so the guarantee holds regardless of what is wired up
 * above it.
 */
function refuseMutation(next) {
  next(new Error('Audit log entries are append-only and cannot be modified.'));
}
auditLogSchema.pre('findOneAndUpdate', refuseMutation);
auditLogSchema.pre('updateOne', refuseMutation);
auditLogSchema.pre('updateMany', refuseMutation);
auditLogSchema.pre('replaceOne', refuseMutation);
// An existing document may not be re-saved; a brand-new one obviously may.
auditLogSchema.pre('save', function guardResave(next) {
  if (!this.isNew) return next(new Error('Audit log entries are append-only and cannot be modified.'));
  return next();
});

// Global master data managed by the super admin: GST rate slabs, HSN/SAC
// codes, payment methods and units of measure. `type` discriminates the kind.
const masterSchema = new mongoose.Schema({
  type: { type: String, required: true, enum: ['gstRate', 'hsn', 'paymentMethod', 'unit'], index: true },
  code: String,
  label: String,
  description: String,
  rate: Number,
  active: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 }
}, { timestamps: true });
masterSchema.index({ type: 1, sortOrder: 1 });

// Free-form key/value settings (branding, email config, template options...).
const globalSettingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: mongoose.Schema.Types.Mixed
}, { timestamps: true });

module.exports = {
  Reminder: mongoose.model('Reminder', reminderSchema),
  AuditLog: mongoose.model('AuditLog', auditLogSchema),
  Master: mongoose.model('Master', masterSchema),
  GlobalSetting: mongoose.model('GlobalSetting', globalSettingSchema)
};
