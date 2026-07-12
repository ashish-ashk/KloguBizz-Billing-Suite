const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
  name: String,
  daysOffset: Number,
  enabled: { type: Boolean, default: true },
  subject: String,
  template: String
}, { timestamps: true });

const invoiceTemplateSchema = new mongoose.Schema({
  name: String,
  layout: { type: String, default: 'standard' },
  accentColor: { type: String, default: '#4f46e5' },
  enabled: { type: Boolean, default: true },
  isDefault: { type: Boolean, default: false }
}, { timestamps: true });

const auditLogSchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', index: true },
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  actorName: String,
  action: { type: String, required: true },
  entity: String,
  entityId: String,
  meta: mongoose.Schema.Types.Mixed
}, { timestamps: true });
auditLogSchema.index({ createdAt: -1 });

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
  InvoiceTemplate: mongoose.model('InvoiceTemplate', invoiceTemplateSchema),
  AuditLog: mongoose.model('AuditLog', auditLogSchema),
  Master: mongoose.model('Master', masterSchema),
  GlobalSetting: mongoose.model('GlobalSetting', globalSettingSchema)
};
