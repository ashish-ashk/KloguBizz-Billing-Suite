/**
 * Credit notes, invoice immutability and cancellation, against a real MongoDB.
 *
 * Before this, an issued invoice could be hard-deleted (destroying the audit
 * trail and gapping the number series) or silently repriced after payment, and
 * there was no sanctioned way to reverse a charge at all.
 *
 * Skipped automatically when no MongoDB is reachable.
 */
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/klogubizz_creditnote_test';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_used_only_by_the_credit_note_suite';

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const app = require('../server');
const { Plan } = require('../src/models/Plan');
const { Reminder } = require('../src/models/Settings');
const { ReminderLog } = require('../src/models/ReminderLog');
const { runReminderSweep } = require('../src/services/reminderService');

let server;
let baseUrl;
let dbAvailable = false;

test.before(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 2000 });
    dbAvailable = true;
  } catch {
    console.warn('\n[credit-notes] No MongoDB on 127.0.0.1:27017 — skipping.\n');
    return;
  }
  await mongoose.connection.dropDatabase();
  await Plan.create({ code: 'starter', name: 'Starter', monthlyPrice: 0, yearlyPrice: 0, userLimit: 5, invoiceLimit: 200, sortOrder: 0 });
  server = app.listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api/v1`;
});

test.after(async () => {
  if (!dbAvailable) return;
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await new Promise(resolve => server.close(resolve));
});

async function call(method, path, { token, body } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  let json;
  try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  return { status: response.status, body: json };
}

let counter = 0;
async function setup({ toStateCode = '27' } = {}) {
  counter += 1;
  const email = `cn-owner${counter}@cn${counter}.test`;
  const reg = await call('POST', '/auth/register', {
    body: {
      name: `CN Owner ${counter}`, email, password: 'Password@123',
      orgName: `CN Tenant ${counter}`, stateCode: '27', acceptTerms: true
    }
  });
  assert.equal(reg.status, 201, JSON.stringify(reg.body));
  const token = reg.body.token;

  const client = await call('POST', '/clients', {
    token, body: { companyName: `CN Buyer ${counter}`, stateCode: toStateCode, email: `cnbuyer${counter}@x.test` }
  });
  assert.equal(client.status, 201);
  return { token, org: reg.body.organisation, clientId: client.body._id };
}

async function issueInvoice(token, clientId, overrides = {}) {
  const { status, body } = await call('POST', '/invoices', {
    token,
    body: {
      clientId,
      date: '2026-07-01',
      dueDate: '2026-07-15',
      status: 'pending',
      items: [{ desc: 'Consulting', qty: 1, rate: 10000, gstRate: 18 }],
      ...overrides
    }
  });
  assert.equal(status, 201, JSON.stringify(body));
  return body;
}

const maybe = fn => async t => {
  if (!dbAvailable) return t.skip('MongoDB not available');
  return fn(t);
};

// ── Credit notes ─────────────────────────────────

test('a full credit note closes the invoice without recording revenue', maybe(async () => {
  const { token, clientId } = await setup();
  const invoice = await issueInvoice(token, clientId);
  assert.equal(invoice.totals.total, 11800);

  const created = await call('POST', '/credit-notes', {
    token, body: { invoiceId: invoice._id, reason: 'sales-return' }
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const note = created.body.creditNote;

  // Defaults to reversing the whole invoice, with the same tax heads.
  assert.equal(note.totals.total, 11800);
  assert.equal(note.totals.cgst, 900);
  assert.equal(note.totals.sgst, 900);
  assert.equal(note.invoiceNumber, invoice.invoiceNumber, 'the original document is referenced');
  // Its own series, not the invoice counter — GST requires distinct series.
  assert.match(note.creditNoteNumber, /^CN-\d{4}-001$/);

  const after = await call('GET', `/invoices/${invoice._id}`, { token });
  assert.equal(after.body.amountCredited, 11800);
  assert.equal(after.body.balanceDue, 0);
  // Closed, but not "paid" — no money was collected.
  assert.equal(after.body.status, 'cancelled');

  const stats = await call('GET', '/invoices/stats', { token });
  assert.equal(stats.body.totalRevenue, 0, 'a credit is not revenue');
  assert.equal(stats.body.outstandingAmount, 0, 'and it is no longer owed');
}));

test('a partial credit note reduces the balance by exactly its amount', maybe(async () => {
  const { token, clientId } = await setup();
  const invoice = await issueInvoice(token, clientId, {
    items: [{ desc: 'Widgets', qty: 10, rate: 1000, gstRate: 18 }]
  });
  assert.equal(invoice.totals.total, 11800);

  // Two of ten units returned.
  const created = await call('POST', '/credit-notes', {
    token,
    body: {
      invoiceId: invoice._id,
      reason: 'sales-return',
      items: [{ desc: 'Widgets returned', hsn: '', qty: 2, rate: 1000, gstRate: 18 }]
    }
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.creditNote.totals.total, 2360);

  const after = await call('GET', `/invoices/${invoice._id}`, { token });
  assert.equal(after.body.amountCredited, 2360);
  assert.equal(after.body.balanceDue, 9440);
  // Still owed, so still open.
  assert.notEqual(after.body.status, 'cancelled');
}));

test('credits cannot exceed the invoice, in one note or cumulatively', maybe(async () => {
  const { token, clientId } = await setup();
  const invoice = await issueInvoice(token, clientId);

  const tooBig = await call('POST', '/credit-notes', {
    token,
    body: { invoiceId: invoice._id, items: [{ desc: 'Over-credit', qty: 1, rate: 999999, gstRate: 18 }] }
  });
  assert.equal(tooBig.status, 400);
  assert.equal(tooBig.body.code, 'CREDIT_EXCEEDS_INVOICE');

  // Half, then more than the remaining half.
  const half = await call('POST', '/credit-notes', {
    token, body: { invoiceId: invoice._id, items: [{ desc: 'Half', qty: 1, rate: 5000, gstRate: 18 }] }
  });
  assert.equal(half.status, 201);

  const overflow = await call('POST', '/credit-notes', {
    token, body: { invoiceId: invoice._id, items: [{ desc: 'Too much', qty: 1, rate: 8000, gstRate: 18 }] }
  });
  assert.equal(overflow.status, 400, 'the cumulative ceiling must be enforced too');

  // Exactly the remainder is accepted.
  const rest = await call('POST', '/credit-notes', {
    token, body: { invoiceId: invoice._id, items: [{ desc: 'Remainder', qty: 1, rate: 5000, gstRate: 18 }] }
  });
  assert.equal(rest.status, 201);

  // And now nothing is left to credit.
  const exhausted = await call('POST', '/credit-notes', {
    token, body: { invoiceId: invoice._id, items: [{ desc: 'Nope', qty: 1, rate: 1, gstRate: 18 }] }
  });
  assert.equal(exhausted.status, 409);
  assert.equal(exhausted.body.code, 'ALREADY_CREDITED');
}));

test('a credit note reverses the same tax heads the invoice charged', maybe(async () => {
  // Inter-state supply: the invoice charges IGST, so the credit must too.
  const { token, clientId } = await setup({ toStateCode: '29' });
  const invoice = await issueInvoice(token, clientId);
  assert.equal(invoice.totals.isIGST, true);
  assert.equal(invoice.totals.igst, 1800);

  const created = await call('POST', '/credit-notes', { token, body: { invoiceId: invoice._id } });
  assert.equal(created.body.creditNote.totals.isIGST, true);
  assert.equal(created.body.creditNote.totals.igst, 1800);
  assert.equal(created.body.creditNote.totals.cgst, 0);
}));

test('a draft invoice cannot be credited', maybe(async () => {
  const { token, clientId } = await setup();
  const draft = await issueInvoice(token, clientId, { status: 'draft' });
  const attempt = await call('POST', '/credit-notes', { token, body: { invoiceId: draft._id } });
  assert.equal(attempt.status, 409);
  assert.equal(attempt.body.code, 'INVOICE_IS_DRAFT');
}));

test('the credit summary reports the ceiling before the form is submitted', maybe(async () => {
  const { token, clientId } = await setup();
  const invoice = await issueInvoice(token, clientId);

  const before = await call('GET', `/credit-notes/for-invoice/${invoice._id}`, { token });
  assert.equal(before.body.invoiceTotal, 11800);
  assert.equal(before.body.credited, 0);
  assert.equal(before.body.creditable, 11800);

  await call('POST', '/credit-notes', {
    token, body: { invoiceId: invoice._id, items: [{ desc: 'Part', qty: 1, rate: 1000, gstRate: 18 }] }
  });

  const after = await call('GET', `/credit-notes/for-invoice/${invoice._id}`, { token });
  assert.equal(after.body.credited, 1180);
  assert.equal(after.body.creditable, 10620);
  assert.equal(after.body.creditNotes.length, 1);
}));

test('credit notes are tenant-isolated', maybe(async () => {
  const a = await setup();
  const b = await setup();
  const invoice = await issueInvoice(a.token, a.clientId);
  const created = await call('POST', '/credit-notes', { token: a.token, body: { invoiceId: invoice._id } });

  assert.equal((await call('GET', `/credit-notes/${created.body.creditNote._id}`, { token: b.token })).status, 404);
  assert.equal((await call('GET', '/credit-notes', { token: b.token })).body.length, 0);
  // B cannot credit A's invoice either.
  assert.equal((await call('POST', '/credit-notes', { token: b.token, body: { invoiceId: invoice._id } })).status, 404);
}));

test('an accountant may record payments but not write off revenue', maybe(async () => {
  const { token, clientId, org } = await setup();
  const invoice = await issueInvoice(token, clientId);

  const invite = await call('POST', '/users/invite', {
    token, body: { name: 'Book Keeper', email: `acct${counter}@cn.test`, role: 'accountant' }
  });
  const inviteToken = decodeURIComponent(new URL(invite.body.inviteUrl).searchParams.get('token'));
  const accepted = await call('POST', '/auth/accept-invite', {
    body: { token: inviteToken, password: 'Accountant@1', acceptTerms: true }
  });
  const accountantToken = accepted.body.token;
  assert.equal(String(accepted.body.organisation._id), String(org._id));

  // Can take money in...
  assert.equal((await call('POST', '/payments', {
    token: accountantToken, body: { invoiceId: invoice._id, amount: 100 }
  })).status, 201);
  // ...but not reverse a charge.
  assert.equal((await call('POST', '/credit-notes', {
    token: accountantToken, body: { invoiceId: invoice._id }
  })).status, 403);
}));

// ── Invoice immutability ─────────────────────────

test('an issued invoice cannot be repriced, but its notes can be corrected', maybe(async () => {
  const { token, clientId } = await setup();
  const invoice = await issueInvoice(token, clientId);

  const reprice = await call('PUT', `/invoices/${invoice._id}`, {
    token, body: { items: [{ desc: 'Sneaky rewrite', qty: 1, rate: 1, gstRate: 18 }] }
  });
  assert.equal(reprice.status, 409);
  assert.equal(reprice.body.code, 'INVOICE_LOCKED');

  const discount = await call('PUT', `/invoices/${invoice._id}`, { token, body: { discountPercent: 90 } });
  assert.equal(discount.status, 409, 'a discount is a repricing too');

  // Presentational corrections are still allowed — they change nothing reported.
  const note = await call('PUT', `/invoices/${invoice._id}`, {
    token, body: { notes: 'PO reference 4471', paymentTerms: 'Net 30' }
  });
  assert.equal(note.status, 200);
  assert.equal(note.body.notes, 'PO reference 4471');
  assert.equal(note.body.totals.total, 11800, 'the amount is untouched');
}));

test('a draft invoice can still be freely edited', maybe(async () => {
  const { token, clientId } = await setup();
  const draft = await issueInvoice(token, clientId, { status: 'draft' });
  const edited = await call('PUT', `/invoices/${draft._id}`, {
    token, body: { items: [{ desc: 'Revised scope', qty: 2, rate: 2000, gstRate: 18 }] }
  });
  assert.equal(edited.status, 200);
  assert.equal(edited.body.totals.total, 4720);
}));

test('an issued invoice\'s status cannot be set directly', maybe(async () => {
  const { token, clientId } = await setup();
  const invoice = await issueInvoice(token, clientId);
  // Marking it paid without any payment would desync the ledger from reality.
  const forced = await call('PUT', `/invoices/${invoice._id}`, { token, body: { status: 'paid' } });
  assert.equal(forced.status, 409);
  assert.equal(forced.body.code, 'STATUS_DERIVED');
}));

// ── Cancellation ─────────────────────────────────

test('an unpaid issued invoice can be cancelled, and stops being chased', maybe(async () => {
  const { token, clientId, org } = await setup();
  await Reminder.deleteMany({});
  await Reminder.create({ name: 'Overdue', daysOffset: 1, enabled: true });

  const invoice = await issueInvoice(token, clientId, { date: '2026-01-01', dueDate: '2026-01-10' });

  const cancelled = await call('POST', `/invoices/${invoice._id}/cancel`, {
    token, body: { reason: 'raised against the wrong client' }
  });
  assert.equal(cancelled.status, 200);
  assert.equal(cancelled.body.status, 'cancelled');
  assert.equal(cancelled.body.balanceDue, 0);

  // No longer money owed.
  const stats = await call('GET', '/invoices/stats', { token });
  assert.equal(stats.body.outstandingAmount, 0);

  // And never chased.
  await runReminderSweep({ orgId: String(org._id) });
  assert.equal(await ReminderLog.countDocuments({ invoiceId: invoice._id }), 0);

  // The document itself is retained — the number stays in the series.
  const stillThere = await call('GET', `/invoices/${invoice._id}`, { token });
  assert.equal(stillThere.status, 200);
  assert.equal(stillThere.body.invoiceNumber, invoice.invoiceNumber);

  // Cancelling twice is refused.
  assert.equal((await call('POST', `/invoices/${invoice._id}/cancel`, { token, body: {} })).status, 409);
}));

test('an invoice with a payment against it cannot be cancelled', maybe(async () => {
  const { token, clientId } = await setup();
  const invoice = await issueInvoice(token, clientId);
  await call('POST', '/payments', { token, body: { invoiceId: invoice._id, amount: 500 } });

  const attempt = await call('POST', `/invoices/${invoice._id}/cancel`, { token, body: {} });
  assert.equal(attempt.status, 409);
  assert.equal(attempt.body.code, 'INVOICE_HAS_PAYMENTS');
}));

test('a cancelled invoice is excluded from the GST return', maybe(async () => {
  const { token, clientId } = await setup();
  const kept = await issueInvoice(token, clientId);
  const voided = await issueInvoice(token, clientId);
  await call('POST', `/invoices/${voided._id}/cancel`, { token, body: { reason: 'duplicate' } });

  const report = await call('GET', '/reports/gst-summary?fy=2026', { token });
  assert.equal(report.body.totals.invoiceCount, 1, 'only the live invoice counts');
  assert.equal(report.body.totals.taxable, kept.totals.subtotal);
}));

// ── Masters enforcement ──────────────────────────

test('a GST rate outside the configured slabs is rejected, and a new slab is honoured', maybe(async () => {
  const { token } = await setup();
  const { Master } = require('../src/models/Settings');
  const { invalidateMasterCache } = require('../src/services/masterService');

  await Master.deleteMany({ type: 'gstRate' });
  await Master.create([
    { type: 'gstRate', rate: 0, label: 'Nil', active: true, sortOrder: 0 },
    { type: 'gstRate', rate: 18, label: 'Standard', active: true, sortOrder: 1 }
  ]);
  invalidateMasterCache('gstRate');

  const bogus = await call('POST', '/items', {
    token, body: { name: 'Odd rate item', sellingPrice: 100, gstRate: 17 }
  });
  assert.equal(bogus.status, 400);
  assert.equal(bogus.body.code, 'INVALID_MASTER_VALUE');

  // The 3% slab that applies to gold — previously impossible, because the model
  // carried a hardcoded enum of [0,5,12,18,28] and ignored Masters entirely.
  await Master.create({ type: 'gstRate', rate: 3, label: 'Gold and jewellery', active: true, sortOrder: 2 });
  invalidateMasterCache('gstRate');

  const gold = await call('POST', '/items', {
    token, body: { name: 'Gold chain', sellingPrice: 50000, gstRate: 3 }
  });
  assert.equal(gold.status, 201, JSON.stringify(gold.body));
  assert.equal(gold.body.gstRate, 3);
}));

test('an unconfigured payment method is rejected', maybe(async () => {
  const { token, clientId } = await setup();
  const invoice = await issueInvoice(token, clientId);
  const { Master } = require('../src/models/Settings');
  const { invalidateMasterCache } = require('../src/services/masterService');

  await Master.deleteMany({ type: 'paymentMethod' });
  await Master.create({ type: 'paymentMethod', label: 'Bank Transfer', active: true, sortOrder: 0 });
  invalidateMasterCache('paymentMethod');

  const bogus = await call('POST', '/payments', {
    token, body: { invoiceId: invoice._id, amount: 100, method: 'Cowrie Shells' }
  });
  assert.equal(bogus.status, 400);
  assert.equal(bogus.body.code, 'INVALID_MASTER_VALUE');

  const valid = await call('POST', '/payments', {
    token, body: { invoiceId: invoice._id, amount: 100, method: 'Bank Transfer' }
  });
  assert.equal(valid.status, 201);
}));

test('masters validation stays permissive when nothing is configured', maybe(async () => {
  const { token } = await setup();
  const { Master } = require('../src/models/Settings');
  const { invalidateMasterCache } = require('../src/services/masterService');

  // A deployment that has never seeded masters must keep working rather than
  // rejecting every write.
  await Master.deleteMany({ type: 'unit' });
  invalidateMasterCache('unit');

  const created = await call('POST', '/items', {
    token, body: { name: 'Unusual unit', sellingPrice: 10, unit: 'Furlongs', gstRate: 18 }
  });
  assert.equal(created.status, 201);
}));
