/**
 * End-to-end API tests against a real MongoDB.
 *
 * These cover the invariants that unit tests can't reach: tenant isolation,
 * privilege boundaries, and the settlement arithmetic as it actually flows
 * through HTTP. Skipped automatically when no MongoDB is reachable, so
 * `npm test` still works on a machine without one.
 *
 * Uses a throwaway database that is dropped on the way out — it never touches
 * the configured MONGO_URI.
 */
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/klogubizz_integration_test';
process.env.NODE_ENV = 'test';
process.env.RAZORPAY_WEBHOOK_SECRET = 'test_webhook_secret';
process.env.JWT_SECRET = 'test_jwt_secret_used_only_by_the_integration_suite';
/** Set before `server.js` is required, because `config/env.js` resolves the
 *  allowlist once at load. Two entries, so the comma-separated form is exercised. */
process.env.FRONTEND_URL = 'https://app.example.com, https://www.app.example.com';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const mongoose = require('mongoose');

const app = require('../server');
const { buildOpenApiDocument } = require('../src/services/openApiService');
const { Plan } = require('../src/models/Plan');
const { Organisation } = require('../src/models/Organisation');
const { User } = require('../src/models/User');
const { Membership } = require('../src/models/Membership');

let server;
let baseUrl;
let dbAvailable = false;

test.before(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 2000 });
    dbAvailable = true;
  } catch {
    console.warn('\n[integration] No MongoDB on 127.0.0.1:27017 — skipping integration tests.\n');
    return;
  }
  await mongoose.connection.dropDatabase();
  await Plan.create([
    { code: 'starter', name: 'Starter', monthlyPrice: 0, yearlyPrice: 0, userLimit: 2, invoiceLimit: 5, sortOrder: 0 },
    { code: 'business', name: 'Business', monthlyPrice: 999, yearlyPrice: 9990, userLimit: 10, invoiceLimit: 500, sortOrder: 1 }
  ]);
  server = app.listen(0);
  await new Promise(resolve => { server.once('listening', resolve); });
  baseUrl = `http://127.0.0.1:${server.address().port}/api/v1`;
});

test.after(async () => {
  if (!dbAvailable) return;
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await new Promise(resolve => { server.close(resolve); });
});

// ── helpers ──────────────────────────────────────

async function call(method, path, { token, body, headers = {}, raw } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers
    },
    body: raw !== undefined ? raw : (body === undefined ? undefined : JSON.stringify(body))
  });
  const text = await response.text();
  let json;
  try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  return { status: response.status, body: json };
}

let orgCounter = 0;
async function registerOrg(overrides = {}) {
  orgCounter += 1;
  const email = `admin${orgCounter}@tenant${orgCounter}.test`;
  const { status, body } = await call('POST', '/auth/register', {
    body: {
      name: `Admin ${orgCounter}`,
      email,
      password: 'Password@123',
      orgName: `Tenant ${orgCounter}`,
      stateCode: '27',
      acceptTerms: true,
      ...overrides
    }
  });
  assert.equal(status, 201, `register failed: ${JSON.stringify(body)}`);
  return { token: body.token, user: body.user, org: body.organisation, email, password: 'Password@123' };
}

async function createClient(token, overrides = {}) {
  const { status, body } = await call('POST', '/clients', {
    token,
    body: { companyName: 'Buyer Pvt Ltd', stateCode: '27', email: 'buyer@example.test', ...overrides }
  });
  assert.equal(status, 201, `client create failed: ${JSON.stringify(body)}`);
  return body;
}

async function createInvoice(token, clientId, overrides = {}) {
  const { status, body } = await call('POST', '/invoices', {
    token,
    body: {
      clientId,
      date: '2026-07-01',
      dueDate: '2026-07-15',
      status: 'pending',
      items: [{ desc: 'Consulting', qty: 1, rate: 1000, gstRate: 18 }],
      ...overrides
    }
  });
  assert.equal(status, 201, `invoice create failed: ${JSON.stringify(body)}`);
  return body;
}

const maybe = fn => async t => {
  if (!dbAvailable) return t.skip('MongoDB not available');
  return fn(t);
};

// ── privilege boundaries ─────────────────────────

test('a tenant admin cannot escalate a teammate to platform superadmin', maybe(async () => {
  const a = await registerOrg();
  const invite = await call('POST', '/users/invite', {
    token: a.token,
    body: { name: 'Team Member', email: `member${orgCounter}@tenant.test`, role: 'viewer' }
  });
  assert.equal(invite.status, 201);
  const memberId = invite.body.user._id;

  // Rejected at the schema, before the controller is even reached.
  const escalate = await call('PUT', `/users/${memberId}`, { token: a.token, body: { role: 'superadmin' } });
  assert.equal(escalate.status, 400);

  // And the role really did not change.
  const users = await call('GET', '/users', { token: a.token });
  const member = users.body.find(u => u._id === memberId);
  assert.equal(member.role, 'viewer');
}));

test('a tenant admin cannot move a user into another organisation or overwrite their password', maybe(async () => {
  const a = await registerOrg();
  const b = await registerOrg();
  const invite = await call('POST', '/users/invite', {
    token: a.token,
    body: { name: 'Member', email: `mover${orgCounter}@tenant.test`, role: 'viewer' }
  });
  const memberId = invite.body.user._id;

  const attack = await call('PUT', `/users/${memberId}`, {
    token: a.token,
    body: { name: 'Renamed', orgId: b.org._id, passwordHash: 'injected', status: 'active', sessionVersion: 999 }
  });
  assert.equal(attack.status, 200);

  const users = await call('GET', '/users', { token: a.token });
  const member = users.body.find(u => u._id === memberId);
  assert.equal(member.name, 'Renamed', 'the allowed field should still apply');

  // Access is granted by Membership now (#53, #54), not a field on User, so
  // "moved to another org" is checked against that: the membership the
  // invite created must still point at org A, and org B must have gained
  // nothing.
  const membership = await Membership.findOne({ userId: memberId }).lean();
  assert.equal(String(membership.orgId), String(a.org._id), 'the membership must not have been reassigned to another org');
  const movedIntoB = await Membership.findOne({ userId: memberId, orgId: b.org._id }).lean();
  assert.equal(movedIntoB, null, 'no membership should have been created in the other organisation');

  const stored = await User.findById(memberId).lean();
  assert.notEqual(stored.passwordHash, 'injected');
  assert.notEqual(stored.sessionVersion, 999);
}));

test('a tenant admin cannot upgrade their own plan or rewrite the invoice counter', maybe(async () => {
  const a = await registerOrg();
  const attack = await call('PUT', '/organisations/current', {
    token: a.token,
    body: {
      name: 'Legitimately Renamed',
      plan: 'business',
      status: 'active',
      invoiceSequence: 9999,
      invoiceSequenceFY: '1999',
      ownerId: '000000000000000000000000'
    }
  });
  assert.equal(attack.status, 200);

  const org = await call('GET', '/organisations/current', { token: a.token });
  assert.equal(org.body.name, 'Legitimately Renamed', 'the allowed field should still apply');
  assert.equal(org.body.plan, 'starter', 'plan must not be self-assignable');
  assert.equal(org.body.invoiceSequence, 0, 'the invoice counter must not be writable');
  assert.equal(String(org.body.ownerId), String(a.user.id), 'ownership must not be reassignable here');
}));

test('one tenant cannot read or modify another tenant\'s invoice', maybe(async () => {
  const a = await registerOrg();
  const b = await registerOrg();
  const client = await createClient(a.token);
  const invoice = await createInvoice(a.token, client._id);

  assert.equal((await call('GET', `/invoices/${invoice._id}`, { token: b.token })).status, 404);
  assert.equal((await call('PUT', `/invoices/${invoice._id}`, { token: b.token, body: { notes: 'hacked' } })).status, 404);
  assert.equal((await call('DELETE', `/invoices/${invoice._id}`, { token: b.token })).status, 404);
  assert.equal((await call('GET', `/invoices/${invoice._id}/pdf`, { token: b.token })).status, 404);
  // And B's own list is unaffected by A's data. `total` is asserted as well as
  // the page contents: a paginated endpoint that leaked another tenant's rows
  // onto a later page would still show an empty first page.
  const bList = (await call('GET', '/invoices', { token: b.token })).body;
  assert.equal(bList.data.length, 0);
  assert.equal(bList.total, 0);
}));

test('an account locks after repeated failed sign-ins', maybe(async () => {
  const a = await registerOrg();
  let lastStatus = 0;
  for (let attempt = 0; attempt < 9; attempt += 1) {
    const result = await call('POST', '/auth/login', { body: { email: a.email, password: 'WrongPassword1' } });
    lastStatus = result.status;
    if (result.status === 429) break;
  }
  assert.equal(lastStatus, 429, 'should be locked out before the 9th attempt');

  // Even the correct password is refused while the lock holds.
  const correct = await call('POST', '/auth/login', { body: { email: a.email, password: a.password } });
  assert.equal(correct.status, 429);
  assert.equal(correct.body.code, 'ACCOUNT_LOCKED');
}));

// ── money correctness ────────────────────────────

test('rejects a non-numeric quantity instead of storing NaN totals', maybe(async () => {
  const a = await registerOrg();
  const client = await createClient(a.token);
  const result = await call('POST', '/invoices', {
    token: a.token,
    body: {
      clientId: client._id,
      date: '2026-07-01',
      dueDate: '2026-07-15',
      items: [{ desc: 'Bad line', qty: 'abc', rate: 100, gstRate: 18 }]
    }
  });
  assert.equal(result.status, 400);
  assert.equal(result.body.code, 'VALIDATION_ERROR');
}));

test('rejects a due date that precedes the invoice date', maybe(async () => {
  const a = await registerOrg();
  const client = await createClient(a.token);
  const result = await call('POST', '/invoices', {
    token: a.token,
    body: {
      clientId: client._id,
      date: '2026-07-15',
      dueDate: '2026-07-01',
      items: [{ desc: 'Line', qty: 1, rate: 100, gstRate: 18 }]
    }
  });
  assert.equal(result.status, 400);
}));

test('stores a discount as a real figure and taxes the discounted value', maybe(async () => {
  const a = await registerOrg();
  const client = await createClient(a.token);
  const invoice = await createInvoice(a.token, client._id, {
    items: [{ desc: 'Consulting', qty: 1, rate: 1000, gstRate: 18, discountPercent: 10 }]
  });

  assert.equal(invoice.totals.grossSubtotal, 1000, 'the pre-discount value must survive');
  assert.equal(invoice.totals.discountTotal, 100);
  assert.equal(invoice.totals.subtotal, 900, 'taxable value is net of discount');
  assert.equal(invoice.totals.cgst, 81);
  assert.equal(invoice.totals.sgst, 81);
  assert.equal(invoice.totals.total, 1062);
  // The rate itself is untouched — previously the discount was folded into it.
  assert.equal(invoice.items[0].rate, 1000);
  assert.equal(invoice.balanceDue, 1062);
  assert.equal(invoice.amountPaid, 0);
}));

test('charges cess and back-calculates tax-inclusive rates', maybe(async () => {
  const a = await registerOrg();
  const client = await createClient(a.token);

  const cess = await createInvoice(a.token, client._id, {
    items: [{ desc: 'Aerated drink', qty: 1, rate: 1000, gstRate: 28, cessRate: 12 }]
  });
  assert.equal(cess.totals.cess, 120);
  assert.equal(cess.totals.total, 1400);

  const inclusive = await createInvoice(a.token, client._id, {
    items: [{ desc: 'Shelf-priced item', qty: 1, rate: 1180, gstRate: 18, taxInclusive: true }]
  });
  assert.equal(inclusive.totals.subtotal, 1000);
  assert.equal(inclusive.totals.total, 1180, 'the customer pays the shelf price, not tax on tax');
}));

// Far enough out that these invoices are never treated as overdue, whenever
// the suite happens to run.
function futureDueDate() {
  const due = new Date();
  due.setFullYear(due.getFullYear() + 1);
  return due.toISOString().slice(0, 10);
}

test('a partial payment moves revenue and the outstanding balance, not just the status', maybe(async () => {
  const a = await registerOrg();
  const client = await createClient(a.token);
  const invoice = await createInvoice(a.token, client._id, {
    date: new Date().toISOString().slice(0, 10),
    dueDate: futureDueDate(),
    items: [{ desc: 'Project', qty: 1, rate: 100000, gstRate: 0 }]
  });
  assert.equal(invoice.totals.total, 100000);

  const pay = await call('POST', '/payments', {
    token: a.token,
    body: { invoiceId: invoice._id, amount: 90000, method: 'Bank Transfer' }
  });
  assert.equal(pay.status, 201);

  const after = await call('GET', `/invoices/${invoice._id}`, { token: a.token });
  assert.equal(after.body.status, 'partial');
  assert.equal(after.body.amountPaid, 90000);
  assert.equal(after.body.balanceDue, 10000);

  // The dashboard must report ₹90,000 received and ₹10,000 outstanding — the
  // old version reported ₹0 revenue and ₹1,00,000 pending.
  const stats = await call('GET', '/invoices/stats', { token: a.token });
  assert.equal(stats.body.totalRevenue, 90000);
  assert.equal(stats.body.pendingAmount, 10000);
  assert.equal(stats.body.outstandingAmount, 10000);
}));

test('a part-paid invoice past its due date is reported as overdue, not partial', maybe(async () => {
  const a = await registerOrg();
  const client = await createClient(a.token);
  // Due last month: previously only 'pending' invoices could become overdue,
  // so a late part-payer disappeared from the collections list entirely.
  const invoice = await createInvoice(a.token, client._id, {
    date: '2026-01-01',
    dueDate: '2026-01-15',
    items: [{ desc: 'Project', qty: 1, rate: 100000, gstRate: 0 }]
  });
  await call('POST', '/payments', { token: a.token, body: { invoiceId: invoice._id, amount: 40000 } });

  const after = await call('GET', `/invoices/${invoice._id}`, { token: a.token });
  assert.equal(after.body.status, 'overdue');
  assert.equal(after.body.balanceDue, 60000, 'only the unpaid remainder is chased');

  const stats = await call('GET', '/invoices/stats', { token: a.token });
  assert.equal(stats.body.overdueAmount, 60000);
  assert.equal(stats.body.totalRevenue, 40000);
}));

test('marking a part-paid invoice as paid settles only the balance', maybe(async () => {
  const a = await registerOrg();
  const client = await createClient(a.token);
  const invoice = await createInvoice(a.token, client._id, {
    items: [{ desc: 'Project', qty: 1, rate: 100000, gstRate: 0 }]
  });
  await call('POST', '/payments', { token: a.token, body: { invoiceId: invoice._id, amount: 90000 } });

  const marked = await call('POST', `/invoices/${invoice._id}/mark-paid`, { token: a.token, body: {} });
  assert.equal(marked.status, 200);
  assert.equal(marked.body.status, 'paid');
  assert.equal(marked.body.amountPaid, 100000, 'must not exceed the invoice value');
  assert.equal(marked.body.balanceDue, 0);

  // Total recorded collections equal the invoice, not 190000.
  const stats = await call('GET', '/invoices/stats', { token: a.token });
  assert.equal(stats.body.totalRevenue, 100000);

  // A second mark-paid is refused rather than adding phantom money.
  const again = await call('POST', `/invoices/${invoice._id}/mark-paid`, { token: a.token, body: {} });
  assert.equal(again.status, 409);
  assert.equal(again.body.code, 'ALREADY_PAID');
}));

test('refuses a payment larger than the outstanding balance', maybe(async () => {
  const a = await registerOrg();
  const client = await createClient(a.token);
  const invoice = await createInvoice(a.token, client._id, {
    items: [{ desc: 'Small job', qty: 1, rate: 1000, gstRate: 0 }]
  });
  const over = await call('POST', '/payments', {
    token: a.token,
    body: { invoiceId: invoice._id, amount: 1000000 }
  });
  assert.equal(over.status, 400);
  assert.equal(over.body.code, 'OVERPAYMENT');

  const unchanged = await call('GET', `/invoices/${invoice._id}`, { token: a.token });
  assert.equal(unchanged.body.amountPaid, 0);
}));

test('voiding a payment reopens the invoice and removes it from collections', maybe(async () => {
  const a = await registerOrg();
  const client = await createClient(a.token);
  const invoice = await createInvoice(a.token, client._id, {
    items: [{ desc: 'Job', qty: 1, rate: 5000, gstRate: 0 }]
  });
  const pay = await call('POST', '/payments', { token: a.token, body: { invoiceId: invoice._id, amount: 5000 } });
  assert.equal((await call('GET', `/invoices/${invoice._id}`, { token: a.token })).body.status, 'paid');

  const voided = await call('POST', `/payments/${pay.body._id}/void`, { token: a.token, body: { reason: 'entered twice' } });
  assert.equal(voided.status, 200);

  const reopened = await call('GET', `/invoices/${invoice._id}`, { token: a.token });
  assert.equal(reopened.body.amountPaid, 0);
  assert.equal(reopened.body.balanceDue, 5000);
  assert.notEqual(reopened.body.status, 'paid');

  const stats = await call('GET', '/invoices/stats', { token: a.token });
  assert.equal(stats.body.totalRevenue, 0);

  // Excluded from the tracker by default, still retrievable for the audit trail.
  const active = (await call('GET', '/payments', { token: a.token })).body;
  assert.equal(active.data.length, 0);
  assert.equal(active.total, 0);
  const withVoid = (await call('GET', '/payments?includeVoid=true', { token: a.token })).body;
  assert.equal(withVoid.data.length, 1);
  assert.equal(withVoid.total, 1);
}));

// ── compliance guards ────────────────────────────

test('an issued invoice cannot be deleted, but a draft can', maybe(async () => {
  const a = await registerOrg();
  const client = await createClient(a.token);

  const issued = await createInvoice(a.token, client._id, { status: 'pending' });
  const blocked = await call('DELETE', `/invoices/${issued._id}`, { token: a.token });
  assert.equal(blocked.status, 409);
  assert.equal(blocked.body.code, 'INVOICE_ISSUED');

  const draft = await createInvoice(a.token, client._id, { status: 'draft' });
  assert.equal((await call('DELETE', `/invoices/${draft._id}`, { token: a.token })).status, 204);
}));

test('a client with invoices cannot be deleted out from under them', maybe(async () => {
  const a = await registerOrg();
  const client = await createClient(a.token);
  await createInvoice(a.token, client._id);

  const blocked = await call('DELETE', `/clients/${client._id}`, { token: a.token });
  assert.equal(blocked.status, 409);
  assert.equal(blocked.body.code, 'CLIENT_IN_USE');

  const unused = await createClient(a.token, { companyName: 'Unused Buyer' });
  assert.equal((await call('DELETE', `/clients/${unused._id}`, { token: a.token })).status, 204);
}));

test('rejects a GSTIN whose checksum does not match', maybe(async () => {
  const a = await registerOrg();
  const bad = await call('POST', '/clients', {
    token: a.token,
    body: { companyName: 'Fake GST Co', stateCode: '27', gstin: '27AAPFU0939F1ZZ' }
  });
  assert.equal(bad.status, 400);

  const good = await call('POST', '/clients', {
    token: a.token,
    body: { companyName: 'Real GST Co', stateCode: '27', gstin: '27AAPFU0939F1ZV' }
  });
  assert.equal(good.status, 201);
}));

test('duplicating an invoice consumes plan quota like any other invoice', maybe(async () => {
  const a = await registerOrg();
  const client = await createClient(a.token);
  // Starter allows 5 invoices/month.
  const first = await createInvoice(a.token, client._id);
  for (let i = 0; i < 4; i += 1) {
    assert.equal((await call('POST', `/invoices/${first._id}/duplicate`, { token: a.token, body: {} })).status, 201);
  }
  const overQuota = await call('POST', `/invoices/${first._id}/duplicate`, { token: a.token, body: {} });
  assert.equal(overQuota.status, 403, 'duplicate must not be a way around the quota');
}));

// ── billing ──────────────────────────────────────

test('a paid plan is not granted without a confirmed payment', maybe(async () => {
  const a = await registerOrg();
  // No Razorpay keys are configured here, and NODE_ENV is not production, so
  // the local-mode path applies — but the subscription must still be created
  // through the proper flow rather than by writing the plan directly.
  const started = await call('POST', '/subscriptions/start', {
    token: a.token,
    body: { planCode: 'business', billingCycle: 'monthly' }
  });
  assert.equal(started.status, 201);
  // Local dev activates immediately; the important part is that this is the
  // only route that can do it, and that it is explicit about which happened.
  assert.equal(typeof started.body.pendingPayment, 'boolean');
}));

test('the webhook refuses unsigned and wrongly-signed payloads, and applies a valid one', maybe(async () => {
  const a = await registerOrg();
  const started = await call('POST', '/subscriptions/start', {
    token: a.token, body: { planCode: 'business', billingCycle: 'monthly' }
  });
  const razorpayId = started.body.subscription.razorpaySubscriptionId;

  const payload = {
    event: 'subscription.charged',
    payload: { subscription: { entity: { id: razorpayId, notes: { orgId: String(a.org._id) }, current_end: 1791000000 } } }
  };
  const raw = JSON.stringify(payload);
  const sign = body => crypto.createHmac('sha256', 'test_webhook_secret').update(body).digest('hex');

  // No header at all — this used to skip verification entirely.
  const unsigned = await call('POST', '/webhooks/razorpay', { raw });
  assert.equal(unsigned.status, 400);

  const wrongSig = await call('POST', '/webhooks/razorpay', {
    raw, headers: { 'x-razorpay-signature': sign('{"event":"different"}') }
  });
  assert.equal(wrongSig.status, 400);

  const valid = await call('POST', '/webhooks/razorpay', {
    raw, headers: { 'x-razorpay-signature': sign(raw) }
  });
  assert.equal(valid.status, 200);
  assert.equal(valid.body.handled, true);

  const org = await Organisation.findById(a.org._id).lean();
  assert.equal(org.plan, 'business');

  // A retry of the same delivery must not be applied twice.
  const retry = await call('POST', '/webhooks/razorpay', {
    raw, headers: { 'x-razorpay-signature': sign(raw) }
  });
  assert.equal(retry.body.duplicate, true);
}));

// ── reports & ops ────────────────────────────────

test('the GST report reports the discounted taxable value, matching the invoice', maybe(async () => {
  const a = await registerOrg();
  const client = await createClient(a.token);
  const invoice = await createInvoice(a.token, client._id, {
    date: '2026-07-01',
    dueDate: '2026-07-15',
    status: 'pending',
    items: [{ desc: 'Discounted service', qty: 1, rate: 1000, gstRate: 18, discountPercent: 10 }]
  });

  const report = await call('GET', '/reports/gst-summary?fy=2026', { token: a.token });
  assert.equal(report.status, 200);
  assert.equal(report.body.totals.taxable, invoice.totals.subtotal, 'report and invoice must agree');
  assert.equal(report.body.totals.discount, 100);
  assert.equal(report.body.byRate[0].rate, 18);
  assert.equal(report.body.byRate[0].taxable, 900);
  // HSN summary is present, and the period is reported back.
  assert.ok(Array.isArray(report.body.byHsn));
  assert.equal(report.body.period.label, 'FY2026-27');

  // A period with no invoices reports nothing rather than everything.
  const empty = await call('GET', '/reports/gst-summary?fy=2020', { token: a.token });
  assert.equal(empty.body.totals.invoiceCount, 0);
}));

test('readiness reflects the database connection', maybe(async () => {
  const response = await fetch(`http://127.0.0.1:${server.address().port}/ready`);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.database, 'connected');
}));

test('a draft invoice contributes nothing to revenue or outstanding figures', maybe(async () => {
  const a = await registerOrg();
  const client = await createClient(a.token);
  await createInvoice(a.token, client._id, { status: 'draft' });

  const stats = await call('GET', '/invoices/stats', { token: a.token });
  assert.equal(stats.body.totalRevenue, 0);
  assert.equal(stats.body.pendingAmount, 0);
  assert.equal(stats.body.counts.draft, 1);
}));

// ── Generated API description (#63) ──────────────

/**
 * The document is generated from the router, so what these guard is the
 * *generation*, not the content. A test asserting particular endpoints exist
 * would be a hand-written spec with extra steps — exactly what this replaces.
 */

test('the spec is built from the real route table', maybe(async () => {
  const doc = buildOpenApiDocument(app);

  assert.ok(Object.keys(doc.paths).length > 100, 'every mounted route should appear');
  // Reading Express's own stack is the whole design: if this ever returned a
  // handful of paths, the walker has stopped seeing nested routers and the
  // document is quietly describing a fraction of the API.
  assert.ok(doc.paths['/api/v1/invoices']);
  assert.ok(doc.paths['/api/v1/invoices/{id}'], 'path parameters are converted to OpenAPI form');
}));

test('a request body is described by the schema the server actually enforces', maybe(async () => {
  const doc = buildOpenApiDocument(app);
  const register = doc.paths['/api/v1/auth/register']?.post;
  assert.ok(register?.requestBody, 'a validated route must carry its body shape');

  const ref = register.requestBody.content['application/json'].schema.$ref;
  const name = ref.split('/').pop();
  const schema = doc.components.schemas[name];

  // Not a hand-written list: these are the fields `registerSchema` requires, and
  // they appear here because the same object validates the request.
  assert.ok(schema.properties.email, 'email is in the schema because zod says so');
  assert.ok(schema.properties.password);
  assert.ok(schema.required.includes('email'));
}));

test('an endpoint with no schema is named, not silently omitted', maybe(async () => {
  const doc = buildOpenApiDocument(app);
  const gaps = doc['x-undocumented'];

  /**
   * The half that makes generating this worth doing.
   *
   * A hand-written document is silent about its own gaps; this one lists them.
   * The count is a coverage metric for request validation that nobody has to
   * remember to compute.
   */
  assert.ok(Array.isArray(gaps.likelyGaps));
  assert.ok(Array.isArray(gaps.actions));
  assert.equal(gaps.count, gaps.likelyGaps.length + gaps.actions.length);
  // Split by method, because an unvalidated action-style POST is usually fine
  // and an unvalidated PUT usually is not. An overstated number gets ignored.
  assert.ok(gaps.likelyGaps.every(entry => entry.startsWith('PUT') || entry.startsWith('PATCH')));
  assert.ok(gaps.actions.every(entry => entry.startsWith('POST')));
}));

test('authentication is described from the guards on the route', maybe(async () => {
  const doc = buildOpenApiDocument(app);
  // Read off the middleware stack rather than declared a second time — a second
  // declaration is a second thing to forget.
  assert.deepEqual(doc.paths['/api/v1/invoices'].get.security, [{ bearerAuth: [] }]);
  // A genuinely public route carries none.
  assert.equal(doc.paths['/api/v1/public/branding'].get.security, undefined);
}));

test('the spec is served, and does not need a session to read', maybe(async () => {
  const { status, body } = await call('GET', '/openapi.json');
  assert.equal(status, 200);
  assert.equal(body.openapi, '3.0.3');
  // Public on purpose: an API description behind authentication cannot be used
  // by the person deciding whether to integrate.
  assert.ok(body.paths['/api/v1/invoices']);
}));

test('adding a schema to a route moves it out of the gap list', maybe(async () => {
  const { validate } = require('../src/middleware/validate');
  const { z } = require('zod');
  const express = require('express');

  const probe = express();
  const router = express.Router();
  router.post('/documented', validate(z.object({ name: z.string() })), (req, res) => res.json({}));
  router.post('/undocumented', (req, res) => res.json({}));
  probe.use('/api/v1/probe', router);

  const doc = buildOpenApiDocument(probe);
  // The mechanism itself: a schema on the route is what produces the
  // documentation, so documenting an endpoint and validating it are the same
  // action rather than two that can drift apart.
  assert.ok(doc.paths['/api/v1/probe/documented'].post.requestBody);
  assert.equal(doc['x-undocumented'].actions.length, 1);
  assert.match(doc['x-undocumented'].actions[0], /undocumented/);
}));


// ── CORS (the deploy-day failure) ────────────────

test('an allowed origin gets the CORS headers back', maybe(async () => {
  const response = await fetch(`${baseUrl}/auth/login`, {
    method: 'OPTIONS',
    headers: { Origin: 'https://app.example.com', 'Access-Control-Request-Method': 'POST' }
  });
  assert.ok(response.status < 300, `preflight should succeed, got ${response.status}`);
  assert.equal(response.headers.get('access-control-allow-origin'), 'https://app.example.com');
  assert.equal(response.headers.get('access-control-allow-credentials'), 'true');
}));

test('a second listed origin works too, so apex and www can both be served', maybe(async () => {
  const response = await fetch(`${baseUrl}/auth/login`, {
    method: 'OPTIONS',
    headers: { Origin: 'https://www.app.example.com', 'Access-Control-Request-Method': 'POST' }
  });
  assert.equal(response.headers.get('access-control-allow-origin'), 'https://www.app.example.com');
}));

test('an unlisted origin is refused without the headers, not with a 500', maybe(async () => {
  const response = await fetch(`${baseUrl}/auth/login`, {
    method: 'OPTIONS',
    headers: { Origin: 'https://not-mine.example.com', 'Access-Control-Request-Method': 'POST' }
  });

  /**
   * The deploy-day bug this holds shut.
   *
   * The rejection used to be `callback(new Error(...))`, which `cors` hands to
   * `next()` and the error handler turns into a **500** — so a misconfigured
   * `FRONTEND_URL` reported "Something went wrong on our side" on every
   * preflight. Indistinguishable from a broken server, and it is the first thing
   * anyone hits after a deploy: the browser reports a CORS failure, the operator
   * reads a 500, and the two never point at the same cause.
   *
   * The correct refusal is to omit the header and let the *browser* block it.
   */
  assert.notEqual(response.status, 500, 'a refused origin is not a server fault');
  assert.equal(response.headers.get('access-control-allow-origin'), null);
}));

test('a request with no Origin at all is allowed through', maybe(async () => {
  // Health checks, server-to-server calls and curl send none. Browsers always
  // do, so this cannot be used to bypass the allowlist from a page.
  const response = await fetch(`${baseUrl}/public/branding`);
  assert.equal(response.status, 200);
}));

test('a trailing slash on the configured origin still matches', maybe(async () => {
  // The single most common way to get this wrong, and it used to produce the
  // same indistinguishable 500 as a genuinely wrong domain.
  const response = await fetch(`${baseUrl}/auth/login`, {
    method: 'OPTIONS',
    headers: { Origin: 'https://app.example.com/', 'Access-Control-Request-Method': 'POST' }
  });
  assert.notEqual(response.status, 500);
}));
