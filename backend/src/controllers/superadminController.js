const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { Organisation } = require('../models/Organisation');
const { Plan } = require('../models/Plan');
const { Reminder, InvoiceTemplate, AuditLog, Master, GlobalSetting } = require('../models/Settings');
const { User } = require('../models/User');
const { Client } = require('../models/Client');
const { Invoice } = require('../models/Invoice');
const { Payment } = require('../models/Payment');
const { Subscription } = require('../models/Subscription');
const { asyncHandler } = require('../utils/asyncHandler');
const { httpError } = require('../utils/httpError');
const { logAudit } = require('../services/auditService');

const overview = asyncHandler(async (req, res) => {
  const [organisations, users, invoices, payments, orgsByStatus, revenueAgg] = await Promise.all([
    Organisation.countDocuments(),
    User.countDocuments(),
    Invoice.countDocuments(),
    Payment.countDocuments(),
    Organisation.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Payment.aggregate([{ $match: { status: 'success' } }, { $group: { _id: null, total: { $sum: '$amount' } } }])
  ]);
  const statusCounts = Object.fromEntries(orgsByStatus.map(s => [s._id, s.count]));
  res.json({
    organisations,
    users,
    invoices,
    payments,
    active: statusCounts.active || 0,
    trial: statusCounts.trial || 0,
    suspended: statusCounts.suspended || 0,
    totalRevenue: revenueAgg[0]?.total || 0
  });
});

// Org list decorated with per-org user/invoice counts and admin user, the
// way the control panel table wants it.
const listOrganisations = asyncHandler(async (req, res) => {
  const orgs = await Organisation.find().sort({ createdAt: -1 }).lean();
  const orgIds = orgs.map(o => o._id);
  const [userCounts, invoiceCounts, admins, subs] = await Promise.all([
    User.aggregate([{ $match: { orgId: { $in: orgIds } } }, { $group: { _id: '$orgId', count: { $sum: 1 } } }]),
    Invoice.aggregate([{ $match: { orgId: { $in: orgIds } } }, { $group: { _id: '$orgId', count: { $sum: 1 } } }]),
    User.find({ orgId: { $in: orgIds }, role: 'admin' }).select('orgId name email').lean(),
    Subscription.find({ orgId: { $in: orgIds } }).sort({ createdAt: -1 }).lean()
  ]);
  const countMap = list => Object.fromEntries(list.map(e => [String(e._id), e.count]));
  const userMap = countMap(userCounts);
  const invoiceMap = countMap(invoiceCounts);
  const adminMap = {};
  admins.forEach(a => { if (!adminMap[String(a.orgId)]) adminMap[String(a.orgId)] = a; });
  const subMap = {};
  subs.forEach(s => { if (!subMap[String(s.orgId)]) subMap[String(s.orgId)] = s; });

  res.json(orgs.map(o => ({
    ...o,
    userCount: userMap[String(o._id)] || 0,
    invoiceCount: invoiceMap[String(o._id)] || 0,
    admin: adminMap[String(o._id)] || null,
    subscription: subMap[String(o._id)] || null
  })));
});

// Creates the tenant plus its admin user in one step and returns a one-time
// temporary password for hand-off.
const createOrganisation = asyncHandler(async (req, res) => {
  const { name, adminName, adminEmail, gstin, phone, address, state, stateCode = '27', plan = 'starter' } = req.body;
  if (!name || !adminEmail) throw httpError(400, 'name and adminEmail are required');
  const existing = await User.findOne({ email: adminEmail.toLowerCase() });
  if (existing) throw httpError(409, 'A user with this email already exists');

  const org = await Organisation.create({ name, adminEmail, gstin, phone, address, state, stateCode, plan, status: 'active' });
  const tempPassword = crypto.randomBytes(6).toString('base64url');
  const admin = await User.create({
    orgId: org._id,
    name: adminName || name,
    email: adminEmail,
    passwordHash: await bcrypt.hash(tempPassword, 12),
    role: 'admin',
    status: 'active'
  });
  await Subscription.create({ orgId: org._id, planCode: plan, status: 'active', billingCycle: 'monthly' });
  logAudit({ req, action: 'org.created', entity: 'organisation', entityId: org._id, meta: { name, plan } });
  res.status(201).json({ organisation: org, admin: { ...admin.toObject(), passwordHash: undefined }, tempPassword });
});

const updateOrganisation = asyncHandler(async (req, res) => {
  const org = await Organisation.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!org) throw httpError(404, 'Organisation not found');
  logAudit({ req, action: 'org.updated', entity: 'organisation', entityId: org._id, meta: { fields: Object.keys(req.body) } });
  res.json(org);
});

// Permanently removes a tenant and all of its data.
const deleteOrganisation = asyncHandler(async (req, res) => {
  const org = await Organisation.findById(req.params.id);
  if (!org) throw httpError(404, 'Organisation not found');
  await Promise.all([
    User.deleteMany({ orgId: org._id }),
    Client.deleteMany({ orgId: org._id }),
    Invoice.deleteMany({ orgId: org._id }),
    Payment.deleteMany({ orgId: org._id }),
    Subscription.deleteMany({ orgId: org._id })
  ]);
  await org.deleteOne();
  logAudit({ req, action: 'org.deleted', entity: 'organisation', entityId: req.params.id, meta: { name: org.name } });
  res.status(204).end();
});

const listPlansAdmin = asyncHandler(async (req, res) => {
  res.json(await Plan.find().sort({ sortOrder: 1 }));
});

const upsertPlan = asyncHandler(async (req, res) => {
  const plan = await Plan.findOneAndUpdate(
    { code: req.params.code || req.body.code },
    req.body,
    { new: true, upsert: true, runValidators: true }
  );
  logAudit({ req, action: 'plan.updated', entity: 'plan', entityId: plan.code, meta: { name: plan.name } });
  res.json(plan);
});

// ---- Masters: GST rates, HSN codes, payment methods, units ----

const listMasters = asyncHandler(async (req, res) => {
  const [reminders, templates, masters] = await Promise.all([
    Reminder.find().sort({ daysOffset: 1 }),
    InvoiceTemplate.find(),
    Master.find().sort({ sortOrder: 1, createdAt: 1 })
  ]);
  const grouped = { gstRate: [], hsn: [], paymentMethod: [], unit: [] };
  masters.forEach(m => { (grouped[m.type] || (grouped[m.type] = [])).push(m); });
  res.json({ reminders, templates, masters: grouped });
});

// Bulk-replace all masters of one type in a single save.
const saveMasters = asyncHandler(async (req, res) => {
  const { type } = req.params;
  if (!['gstRate', 'hsn', 'paymentMethod', 'unit'].includes(type)) throw httpError(400, 'Unknown master type');
  const items = Array.isArray(req.body) ? req.body : [];
  await Master.deleteMany({ type });
  const docs = await Master.insertMany(items.map((item, i) => ({
    type,
    code: item.code,
    label: item.label,
    description: item.description,
    rate: item.rate,
    active: item.active !== false,
    sortOrder: i
  })));
  logAudit({ req, action: 'masters.saved', entity: 'master', entityId: type, meta: { count: docs.length } });
  res.json(docs);
});

const updateReminder = asyncHandler(async (req, res) => {
  const reminder = await Reminder.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!reminder) throw httpError(404, 'Reminder not found');
  logAudit({ req, action: 'reminder.updated', entity: 'reminder', entityId: reminder._id, meta: { name: reminder.name } });
  res.json(reminder);
});

const updateTemplate = asyncHandler(async (req, res) => {
  if (req.body.isDefault) {
    await InvoiceTemplate.updateMany({}, { isDefault: false });
  }
  const template = await InvoiceTemplate.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!template) throw httpError(404, 'Template not found');
  logAudit({ req, action: 'template.updated', entity: 'invoiceTemplate', entityId: template._id, meta: { name: template.name } });
  res.json(template);
});

// ---- Global key/value settings (branding, email, template options...) ----

const getSettings = asyncHandler(async (req, res) => {
  const settings = await GlobalSetting.find();
  res.json(Object.fromEntries(settings.map(s => [s.key, s.value])));
});

const saveSetting = asyncHandler(async (req, res) => {
  const setting = await GlobalSetting.findOneAndUpdate(
    { key: req.params.key },
    { value: req.body },
    { new: true, upsert: true }
  );
  logAudit({ req, action: 'settings.saved', entity: 'setting', entityId: req.params.key });
  res.json({ key: setting.key, value: setting.value });
});

const listAuditLogs = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  res.json(await AuditLog.find().sort({ createdAt: -1 }).limit(limit));
});

module.exports = {
  overview,
  listOrganisations,
  createOrganisation,
  updateOrganisation,
  deleteOrganisation,
  listPlansAdmin,
  upsertPlan,
  listMasters,
  saveMasters,
  updateReminder,
  updateTemplate,
  getSettings,
  saveSetting,
  listAuditLogs
};
