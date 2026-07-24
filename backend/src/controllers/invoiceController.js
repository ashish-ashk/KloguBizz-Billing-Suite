const { Organisation } = require('../models/Organisation');
const { Client } = require('../models/Client');
const { Invoice } = require('../models/Invoice');
const { Payment } = require('../models/Payment');
const { asyncHandler } = require('../utils/asyncHandler');
const { httpError } = require('../utils/httpError');
const { tenantFilter } = require('../middleware/tenantMiddleware');
const { calculateInvoiceTotals } = require('../services/gstService');
const { nextInvoiceNumber } = require('../services/invoiceNumberService');
const { renderInvoicePdf } = require('../services/pdfService');
const { sendReminderEmail } = require('../services/emailService');
const { assertInvoiceQuota } = require('../services/planService');
const { logAudit } = require('../services/auditService');
const { toCsv } = require('../services/csvService');

async function totalsFor(req, body) {
  const org = await Organisation.findById(req.orgId);
  let toStateCode;
  if (body.clientId) {
    const client = await Client.findOne({ _id: body.clientId, ...tenantFilter(req) });
    if (!client) throw httpError(400, 'Valid clientId is required');
    toStateCode = client.stateCode;
  } else if (body.billTo?.name) {
    toStateCode = body.billTo.stateCode || org.stateCode;
  } else {
    throw httpError(400, 'Provide a registered client or buyer details');
  }
  return calculateInvoiceTotals(body.items || [], org.stateCode, toStateCode);
}

// clientId/billTo are mutually exclusive (a registered-client invoice vs a
// walk-in quick bill) — clearing the other whenever one is set lets a bill
// be "converted" to a client invoice (or vice versa) just by switching which
// one the request populates, without stale data lingering on the document.
function normalizeBuyer(body) {
  if (body.clientId === undefined && body.billTo === undefined) return body;
  const out = { ...body };
  if (out.clientId) out.billTo = null;
  else if (out.billTo?.name) out.clientId = null;
  return out;
}

// Pending invoices past their due date become overdue. Cheap enough to run
// on every list/stats call; replaces a scheduled job in local setups.
async function sweepOverdue(orgFilter) {
  await Invoice.updateMany(
    { ...orgFilter, status: 'pending', dueDate: { $lt: new Date() } },
    { status: 'overdue' }
  );
}

const listInvoices = asyncHandler(async (req, res) => {
  const filter = tenantFilter(req);
  await sweepOverdue(filter);
  if (req.query.status) filter.status = req.query.status;
  if (req.query.clientId) filter.clientId = req.query.clientId;
  if (req.query.q) filter.invoiceNumber = { $regex: req.query.q.trim(), $options: 'i' };
  const invoices = await Invoice.find(filter).populate('clientId').sort({ date: -1, createdAt: -1 });
  res.json(invoices);
});

// Aggregated numbers for the dashboard: headline metrics, monthly revenue
// for the trailing 12 months and top clients by collected revenue.
const invoiceStats = asyncHandler(async (req, res) => {
  const filter = tenantFilter(req);
  await sweepOverdue(filter);
  const invoices = await Invoice.find(filter).populate('clientId', 'companyName');

  const sum = list => list.reduce((s, inv) => s + (inv.totals?.total || 0), 0);
  const byStatus = status => invoices.filter(inv => inv.status === status);
  const paid = byStatus('paid');
  const pending = byStatus('pending').concat(byStatus('partial'));
  const overdue = byStatus('overdue');

  const monthly = {};
  paid.forEach(inv => {
    const at = inv.paidDate || inv.date;
    if (!at) return;
    const key = at.toISOString().slice(0, 7);
    monthly[key] = (monthly[key] || 0) + (inv.totals?.total || 0);
  });

  const clientRevenue = {};
  paid.forEach(inv => {
    const name = inv.clientId?.companyName;
    if (!name) return;
    clientRevenue[name] = (clientRevenue[name] || 0) + (inv.totals?.total || 0);
  });

  res.json({
    totalRevenue: sum(paid),
    pendingAmount: sum(pending),
    overdueAmount: sum(overdue),
    counts: {
      total: invoices.length,
      paid: paid.length,
      pending: pending.length,
      overdue: overdue.length,
      draft: byStatus('draft').length
    },
    monthlyRevenue: Object.entries(monthly).sort().slice(-12).map(([month, revenue]) => ({ month, revenue })),
    topClients: Object.entries(clientRevenue)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, revenue]) => ({ name, revenue }))
  });
});

const getInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOne({ _id: req.params.id, ...tenantFilter(req) }).populate('clientId');
  if (!invoice) throw httpError(404, 'Invoice not found');
  res.json(invoice);
});

const createInvoice = asyncHandler(async (req, res) => {
  await assertInvoiceQuota(req.orgId);
  const body = normalizeBuyer(req.body);
  const totals = await totalsFor(req, body);
  const invoice = await Invoice.create({
    ...body,
    orgId: req.orgId,
    invoiceNumber: body.invoiceNumber || await nextInvoiceNumber(req.orgId),
    totals
  });
  logAudit({ req, action: 'invoice.created', entity: 'invoice', entityId: invoice._id, meta: { invoiceNumber: invoice.invoiceNumber, total: totals.total } });
  res.status(201).json(invoice);
});

const updateInvoice = asyncHandler(async (req, res) => {
  const update = normalizeBuyer(req.body);
  if (req.body.items || req.body.clientId !== undefined || req.body.billTo !== undefined) {
    const existing = await Invoice.findOne({ _id: req.params.id, ...tenantFilter(req) });
    if (!existing) throw httpError(404, 'Invoice not found');
    update.totals = await totalsFor(req, normalizeBuyer({ ...existing.toObject(), ...req.body }));
  }
  const invoice = await Invoice.findOneAndUpdate(
    { _id: req.params.id, ...tenantFilter(req) },
    update,
    { new: true, runValidators: true }
  );
  if (!invoice) throw httpError(404, 'Invoice not found');
  logAudit({ req, action: 'invoice.updated', entity: 'invoice', entityId: invoice._id, meta: { invoiceNumber: invoice.invoiceNumber } });
  res.json(invoice);
});

const duplicateInvoice = asyncHandler(async (req, res) => {
  const source = await Invoice.findOne({ _id: req.params.id, ...tenantFilter(req) });
  if (!source) throw httpError(404, 'Invoice not found');
  const copy = source.toObject();
  delete copy._id;
  delete copy.createdAt;
  delete copy.updatedAt;
  const invoice = await Invoice.create({
    ...copy,
    invoiceNumber: await nextInvoiceNumber(req.orgId),
    date: new Date(),
    dueDate: new Date(Date.now() + 15 * 86400000),
    status: 'draft',
    paidDate: null
  });
  logAudit({ req, action: 'invoice.duplicated', entity: 'invoice', entityId: invoice._id, meta: { from: source.invoiceNumber, to: invoice.invoiceNumber } });
  res.status(201).json(invoice);
});

const markPaid = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOneAndUpdate(
    { _id: req.params.id, ...tenantFilter(req) },
    { status: 'paid', paidDate: new Date() },
    { new: true }
  );
  if (!invoice) throw httpError(404, 'Invoice not found');
  await Payment.create({
    orgId: req.orgId,
    invoiceId: invoice._id,
    clientId: invoice.clientId || undefined,
    amount: invoice.totals.total,
    method: req.body.method || 'Manual',
    reference: req.body.reference || 'marked-paid'
  });
  logAudit({ req, action: 'invoice.paid', entity: 'invoice', entityId: invoice._id, meta: { invoiceNumber: invoice.invoiceNumber } });
  res.json(invoice);
});

const sendReminder = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOne({ _id: req.params.id, ...tenantFilter(req) }).populate('clientId');
  if (!invoice) throw httpError(404, 'Invoice not found');
  const email = invoice.clientId?.email || invoice.billTo?.email;
  const name = invoice.clientId?.companyName || invoice.billTo?.name;
  if (!email) throw httpError(400, 'This buyer has no email address on file');
  const org = await Organisation.findById(req.orgId);
  const overdueDays = Math.max(0, Math.floor((Date.now() - invoice.dueDate.getTime()) / 86400000));
  const result = await sendReminderEmail({
    to: email,
    clientName: name,
    invoiceNumber: invoice.invoiceNumber,
    amount: `INR ${invoice.totals.total.toLocaleString('en-IN')}`,
    dueDate: invoice.dueDate,
    orgName: org?.name || 'KloguBizz',
    overdueDays
  });
  logAudit({ req, action: 'invoice.reminder_sent', entity: 'invoice', entityId: invoice._id, meta: { to: email } });
  res.json({ ok: true, ...result });
});

const deleteInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOneAndDelete({ _id: req.params.id, ...tenantFilter(req) });
  if (!invoice) throw httpError(404, 'Invoice not found');
  logAudit({ req, action: 'invoice.deleted', entity: 'invoice', entityId: invoice._id, meta: { invoiceNumber: invoice.invoiceNumber } });
  res.status(204).end();
});

const exportInvoicesCsv = asyncHandler(async (req, res) => {
  const filter = tenantFilter(req);
  await sweepOverdue(filter);
  if (req.query.status) filter.status = req.query.status;
  const invoices = await Invoice.find(filter).populate('clientId', 'companyName gstin').sort({ date: -1 });
  const csv = toCsv(invoices, [
    { label: 'Invoice Number', value: i => i.invoiceNumber },
    { label: 'Client', value: i => i.clientId?.companyName || i.billTo?.name || '' },
    { label: 'GSTIN', value: i => i.clientId?.gstin || i.billTo?.gstin || '' },
    { label: 'Date', value: i => i.date?.toISOString().slice(0, 10) },
    { label: 'Due Date', value: i => i.dueDate?.toISOString().slice(0, 10) },
    { label: 'Status', value: i => i.status },
    { label: 'Subtotal', value: i => i.totals.subtotal.toFixed(2) },
    { label: 'CGST', value: i => i.totals.cgst.toFixed(2) },
    { label: 'SGST', value: i => i.totals.sgst.toFixed(2) },
    { label: 'IGST', value: i => i.totals.igst.toFixed(2) },
    { label: 'Total', value: i => i.totals.total.toFixed(2) }
  ]);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="invoices.csv"');
  res.send(csv);
});

// Sends reminder emails for every pending/partial/overdue invoice with a
// client email on file. Used by the "Remind all" action on the Payments page.
const remindAll = asyncHandler(async (req, res) => {
  const filter = tenantFilter(req);
  await sweepOverdue(filter);
  filter.status = { $in: ['pending', 'partial', 'overdue'] };
  const invoices = await Invoice.find(filter).populate('clientId');
  const org = await Organisation.findById(req.orgId);
  let sent = 0;
  let skipped = 0;
  for (const invoice of invoices) {
    const email = invoice.clientId?.email || invoice.billTo?.email;
    if (!email) { skipped += 1; continue; }
    const overdueDays = Math.max(0, Math.floor((Date.now() - invoice.dueDate.getTime()) / 86400000));
    await sendReminderEmail({
      to: email,
      clientName: invoice.clientId?.companyName || invoice.billTo?.name,
      invoiceNumber: invoice.invoiceNumber,
      amount: `INR ${invoice.totals.total.toLocaleString('en-IN')}`,
      dueDate: invoice.dueDate,
      orgName: org?.name || 'KloguBizz',
      overdueDays
    });
    sent += 1;
  }
  logAudit({ req, action: 'invoice.remind_all', entity: 'invoice', meta: { sent, skipped } });
  res.json({ sent, skipped, total: invoices.length });
});

const invoicePdf = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOne({ _id: req.params.id, ...tenantFilter(req) }).populate('clientId');
  if (!invoice) throw httpError(404, 'Invoice not found');
  const org = await Organisation.findById(req.orgId);
  const client = invoice.clientId || (invoice.billTo?.name ? {
    companyName: invoice.billTo.name,
    address: invoice.billTo.address,
    gstin: invoice.billTo.gstin,
    stateCode: invoice.billTo.stateCode
  } : null);
  const buffer = await renderInvoicePdf({ invoice, client, org });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoiceNumber}.pdf"`);
  res.send(buffer);
});

module.exports = {
  listInvoices,
  invoiceStats,
  getInvoice,
  createInvoice,
  updateInvoice,
  duplicateInvoice,
  markPaid,
  sendReminder,
  remindAll,
  deleteInvoice,
  invoicePdf,
  exportInvoicesCsv
};
