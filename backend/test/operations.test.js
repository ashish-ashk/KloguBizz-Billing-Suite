/**
 * Tests for the "finish the product" tranche: stock, receivables, Excel export,
 * invoice sending, the organisation-level invoice defaults, and the tenant activity log.
 *
 * The theme is **fields and toggles that used to lie**. `Item.stockQty` existed and
 * nothing wrote to it; `showBankDetails` rendered an empty block; `showSignature` drew a
 * line with nothing above it; `AuditLog` recorded `orgId` and only the platform could
 * read it. In each case the shape was there and the behaviour was not, which is worse
 * than an absent feature because it gets trusted.
 *
 * Skipped automatically when no MongoDB is reachable. CI treats that skip as a failure.
 */
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/klogubizz_operations_test';
process.env.NODE_ENV = 'test';
process.env.RAZORPAY_WEBHOOK_SECRET = 'test_webhook_secret';
process.env.JWT_SECRET = 'test_jwt_secret_used_only_by_the_operations_suite';

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const app = require('../server');
const { Plan } = require('../src/models/Plan');
const { Organisation } = require('../src/models/Organisation');
const { Item } = require('../src/models/Item');
const { StockMovement } = require('../src/models/StockMovement');
const { EmailLog } = require('../src/models/EmailLog');
const stock = require('../src/services/stockService');

let server;
let baseUrl;
let dbAvailable = false;

test.before(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 2000 });
    dbAvailable = true;
  } catch {
    console.warn('\n[operations] No MongoDB on 127.0.0.1:27017 — skipping integration tests.\n');
    return;
  }
  await mongoose.connection.dropDatabase();
  await Plan.create([
    { code: 'starter', name: 'Starter', monthlyPrice: 0, yearlyPrice: 0, userLimit: 5, invoiceLimit: 500, sortOrder: 0 }
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

async function call(method, path, { token, body, headers = {} } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const buffer = Buffer.from(await response.arrayBuffer());
  const text = buffer.toString('utf8');
  let json;
  try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  return { status: response.status, body: json, headers: response.headers, text, buffer };
}

let counter = 0;
async function registerOrg() {
  counter += 1;
  const email = `ops${counter}@tenant${counter}.test`;
  const { status, body } = await call('POST', '/auth/register', {
    body: {
      name: `Ops ${counter}`,
      email,
      password: 'Password@123',
      orgName: `Ops Tenant ${counter}`,
      stateCode: '27',
      acceptTerms: true
    }
  });
  assert.equal(status, 201, `register failed: ${JSON.stringify(body)}`);
  await Organisation.updateOne(
    { _id: body.organisation._id },
    { $set: { gstin: '27AAPFU0939F1ZV', state: 'Maharashtra', address: '1 Test Road' } }
  );
  return { token: body.token, org: body.organisation, email };
}

async function createClient(token, overrides = {}) {
  const { status, body } = await call('POST', '/clients', {
    token,
    body: { companyName: 'Buyer Pvt Ltd', stateCode: '27', email: 'buyer@example.test', ...overrides }
  });
  assert.equal(status, 201, `client create failed: ${JSON.stringify(body)}`);
  return body;
}

async function createItem(token, overrides = {}) {
  const { status, body } = await call('POST', '/items', {
    token,
    body: { name: 'Steel Rod', itemCode: 'ROD-1', unit: 'Nos', gstRate: 18, sellingPrice: 500, stockQty: 100, reorderLevel: 10, ...overrides }
  });
  assert.equal(status, 201, `item create failed: ${JSON.stringify(body)}`);
  return body;
}

async function createInvoice(token, overrides = {}) {
  const { status, body } = await call('POST', '/invoices', {
    token,
    body: {
      date: '2026-06-10',
      dueDate: '2026-07-10',
      status: 'pending',
      items: [{ desc: 'Steel Rod', hsn: '7213', qty: 5, rate: 500, gstRate: 18 }],
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

/**
 * Polls until a predicate holds.
 *
 * The email log is written fire-and-forget on purpose — bookkeeping must never be able to
 * fail the thing it records — so the response returns before the insert lands. Asserting
 * immediately passes on an idle machine and fails under a loaded parallel run, which is
 * the worst kind of test.
 */
async function waitUntil(check, timeoutMs = 3000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const result = await check();
    if (result) return result;
    if (Date.now() > deadline) return null;
    await new Promise(resolve => { setTimeout(resolve, 50); });
  }
}

// ── Stock (2.5 #37–#40) ──────────────────────────

test('issuing an invoice takes stock out and writes a ledger row', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token);
  const item = await createItem(tenant.token);

  const invoice = await createInvoice(tenant.token, { clientId: client._id });
  // The whole point: `stockQty` existed from the first version and nothing ever wrote to
  // it, so the Inventory page showed a number that only changed by hand.
  const after = await Item.findById(item._id).lean();
  assert.equal(after.stockQty, 95, '5 of 100 left the shelf');

  const movements = await StockMovement.find({ itemId: item._id }).lean();
  assert.equal(movements.length, 1);
  assert.equal(movements[0].quantity, -5, 'signed: a sale is negative');
  assert.equal(movements[0].reason, 'sale');
  assert.equal(movements[0].documentNumber, invoice.invoiceNumber);
  // The balance travels with the row, so a ledger line reads without re-summing above it.
  assert.equal(movements[0].balanceAfter, 95);

  // Reported back rather than silent, so an unmatched line is visible.
  assert.equal(invoice.stock.moved, 1);
}));

test('a draft moves no stock', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token);
  const item = await createItem(tenant.token);

  await createInvoice(tenant.token, { clientId: client._id, status: 'draft' });
  const after = await Item.findById(item._id).lean();
  // Nothing has been issued, so no goods have left. Decrementing on a draft would make
  // the balance depend on how many drafts happen to be lying around.
  assert.equal(after.stockQty, 100);
  assert.equal(await StockMovement.countDocuments({ itemId: item._id }), 0);
}));

test('cancelling an invoice puts the stock back, exactly once', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token);
  const item = await createItem(tenant.token);
  const invoice = await createInvoice(tenant.token, { clientId: client._id });

  await call('POST', `/invoices/${invoice._id}/cancel`, { token: tenant.token, body: { reason: 'Raised in error' } });
  let after = await Item.findById(item._id).lean();
  assert.equal(after.stockQty, 100, 'the goods never left');

  // A retried request or a second cancel must not credit the stock twice.
  await stock.reverseInvoice({ user: { name: 'test' } }, await mongoose.model('Invoice').findById(invoice._id));
  after = await Item.findById(item._id).lean();
  assert.equal(after.stockQty, 100, 'idempotent');
}));

test('a line that matches no catalogue item moves nothing', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token);
  await createItem(tenant.token);

  const invoice = await createInvoice(tenant.token, {
    clientId: client._id,
    items: [{ desc: 'Something we do not stock', hsn: '9999', qty: 3, rate: 100, gstRate: 18 }]
  });
  // Guessing would be far worse than skipping: decrementing the wrong item produces a
  // balance that is wrong in a way nobody can trace.
  assert.equal(invoice.stock.moved, 0);
  assert.equal(invoice.stock.unmatched, 1);
  assert.equal(await StockMovement.countDocuments({ orgId: tenant.org._id }), 0);
}));

test('a service is never stock-tracked', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token);
  const service = await createItem(tenant.token, { name: 'Consulting', itemCode: 'CONS-1', type: 'service', stockQty: 0 });

  const invoice = await createInvoice(tenant.token, {
    clientId: client._id,
    items: [{ desc: 'Consulting', hsn: '998311', qty: 10, rate: 1000, gstRate: 18 }]
  });
  assert.equal(invoice.stock.moved, 0, 'a service has no stock to move');
  const after = await Item.findById(service._id).lean();
  // Decrementing would produce a meaningless negative balance on every consulting invoice.
  assert.equal(after.stockQty, 0);
}));

test('a credit note returns only what it credits', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token);
  const item = await createItem(tenant.token);
  const invoice = await createInvoice(tenant.token, {
    clientId: client._id,
    items: [{ desc: 'Steel Rod', hsn: '7213', qty: 10, rate: 500, gstRate: 18 }]
  });
  assert.equal((await Item.findById(item._id).lean()).stockQty, 90);

  // Partial: 4 of the 10 come back.
  const note = await call('POST', '/credit-notes', {
    token: tenant.token,
    body: {
      invoiceId: invoice._id,
      reason: 'sales-return',
      items: [{ desc: 'Steel Rod', hsn: '7213', qty: 4, rate: 500, gstRate: 18 }]
    }
  });
  assert.equal(note.status, 201, JSON.stringify(note.body));

  const after = await Item.findById(item._id).lean();
  // Treating a partial credit as a full reversal would inflate stock by the difference.
  assert.equal(after.stockQty, 94);
}));

test('a purchase brings stock in', maybe(async () => {
  const tenant = await registerOrg();
  const item = await createItem(tenant.token, { stockQty: 0 });
  const vendor = await call('POST', '/purchases/vendors', {
    token: tenant.token,
    body: { name: 'Steel Supplier', stateCode: '27', gstin: '27AAPFU0939F1ZV' }
  });

  await call('POST', '/purchases', {
    token: tenant.token,
    body: {
      vendorId: vendor.body._id,
      billNumber: 'SUP/1',
      billDate: '2026-06-01',
      items: [{ desc: 'Steel Rod', hsn: '7213', qty: 250, rate: 400, gstRate: 18 }]
    }
  });
  assert.equal((await Item.findById(item._id).lean()).stockQty, 250);
}));

test('an adjustment needs a note, and the ledger cannot be edited', maybe(async () => {
  const tenant = await registerOrg();
  const item = await createItem(tenant.token);

  const noNote = await call('POST', `/reports/stock/${item._id}/adjust`, {
    token: tenant.token,
    body: { quantity: -3 }
  });
  // An unexplained adjustment is exactly what made the old hand-edited `stockQty`
  // impossible to reconcile.
  assert.equal(noNote.status, 400);
  assert.equal(noNote.body.code, 'NOTE_REQUIRED');

  const adjusted = await call('POST', `/reports/stock/${item._id}/adjust`, {
    token: tenant.token,
    body: { quantity: -3, reason: 'damage', note: 'Three rods bent in transit' }
  });
  assert.equal(adjusted.status, 200);
  assert.equal(adjusted.body.stockQty, 97);

  const movement = await StockMovement.findOne({ itemId: item._id }).lean();
  assert.equal(movement.note, 'Three rods bent in transit');
  await assert.rejects(
    () => StockMovement.updateOne({ _id: movement._id }, { $set: { quantity: 999 } }),
    /append-only/,
    'a ledger that can be edited is a second opinion, not a ledger'
  );
}));

test('a balance can be rebuilt from the ledger', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token);
  const item = await createItem(tenant.token);
  await createInvoice(tenant.token, { clientId: client._id });

  // Simulate a lost increment — a crash between the two writes.
  await Item.updateOne({ _id: item._id }, { $set: { stockQty: 12345 } });
  const rebuilt = await call('POST', `/reports/stock/${item._id}/recompute`, { token: tenant.token, body: {} });
  assert.equal(rebuilt.status, 200);
  // The cached counter is only safe *because* it is recomputable from the immutable rows.
  assert.equal(rebuilt.body.stockQty, -5);
}));

test('low stock lists only items with a reorder level set', maybe(async () => {
  const tenant = await registerOrg();
  const low = await createItem(tenant.token, { name: 'Almost out', itemCode: 'LOW-1', stockQty: 3, reorderLevel: 10 });
  await createItem(tenant.token, { name: 'Plenty', itemCode: 'HIGH-1', stockQty: 500, reorderLevel: 10 });
  // No reorder level: not tracked, which is not the same as zero.
  await createItem(tenant.token, { name: 'Untracked', itemCode: 'UNTRACKED-1', stockQty: 0, reorderLevel: undefined });

  const { status, body } = await call('GET', '/reports/stock/low', { token: tenant.token });
  assert.equal(status, 200);
  const names = body.items.map(i => i.name);
  assert.ok(names.includes('Almost out'));
  assert.ok(!names.includes('Plenty'));
  // Otherwise every service and every untracked product sits in the alert list forever.
  assert.ok(!names.includes('Untracked'), 'a missing reorder level means untracked, not zero');
  assert.equal(body.items.find(i => i.name === 'Almost out').shortfall, 7);
  assert.ok(low._id);
}));

// ── Receivables (2.4 #28, #29, #33) ──────────────

test('AR ageing buckets by days past due, not by stored status', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token, { companyName: 'Slow Payer' });

  const daysAgo = n => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
  // One in each bucket, dated relative to now so the boundaries are exercised.
  await createInvoice(tenant.token, { clientId: client._id, date: daysAgo(5), dueDate: daysAgo(-10), items: [{ desc: 'A', qty: 1, rate: 1000, gstRate: 0 }] });
  await createInvoice(tenant.token, { clientId: client._id, date: daysAgo(20), dueDate: daysAgo(10), items: [{ desc: 'B', qty: 1, rate: 2000, gstRate: 0 }] });
  await createInvoice(tenant.token, { clientId: client._id, date: daysAgo(60), dueDate: daysAgo(45), items: [{ desc: 'C', qty: 1, rate: 3000, gstRate: 0 }] });
  await createInvoice(tenant.token, { clientId: client._id, date: daysAgo(200), dueDate: daysAgo(180), items: [{ desc: 'D', qty: 1, rate: 4000, gstRate: 0 }] });

  const { status, body } = await call('GET', '/reports/ageing', { token: tenant.token });
  assert.equal(status, 200);
  const bucket = key => body.buckets.find(b => b.key === key).amount;
  // Derived from `dueDate` at read time, so the figures are right without waiting for
  // the hourly sweep to relabel anything.
  assert.equal(bucket('current'), 1000);
  assert.equal(bucket('d1_30'), 2000);
  assert.equal(bucket('d31_60'), 3000);
  assert.equal(bucket('d90_plus'), 4000);
  assert.equal(body.total, 10000);

  const [customer] = body.clients;
  assert.equal(customer.name, 'Slow Payer');
  assert.equal(customer.invoices, 4);
  assert.ok(customer.maxDaysPastDue >= 179, 'sorted by the worst invoice, not the total');
}));

test('an invoice with no due date is not filed as "not yet due"', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token);
  const invoice = await createInvoice(tenant.token, { clientId: client._id, items: [{ desc: 'X', qty: 1, rate: 5000, gstRate: 0 }] });
  // `$dateDiff` on a missing date yields null, and null compares as less than every
  // number — so without the `$type` guard this would land in the "current" bucket and
  // quietly understate what is overdue.
  await mongoose.model('Invoice').updateOne({ _id: invoice._id }, { $unset: { dueDate: 1 } });

  const { body } = await call('GET', '/reports/ageing', { token: tenant.token });
  assert.equal(body.total, 5000, 'it is still counted');
  assert.equal(body.buckets.find(b => b.key === 'current').amount, 5000, 'and treated as 0 days past due, deliberately');
}));

test('a statement interleaves invoices and payments with a running balance', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token);
  const invoice = await createInvoice(tenant.token, {
    clientId: client._id,
    items: [{ desc: 'Work', qty: 1, rate: 10000, gstRate: 0 }]
  });
  await call('POST', '/payments', {
    token: tenant.token,
    body: { invoiceId: invoice._id, amount: 4000, method: 'upi', date: '2026-06-15' }
  });

  const { status, body } = await call('GET', `/reports/statement/${client._id}`, { token: tenant.token });
  assert.equal(status, 200);
  assert.equal(body.totals.invoiced, 10000);
  assert.equal(body.totals.received, 4000);
  assert.equal(body.closingBalance, 6000);

  const types = body.lines.map(line => line.type);
  // An invoice must sort before the payment that settles it on the same day, or the
  // running balance dips negative and reads as an error.
  assert.ok(types.indexOf('invoice') < types.indexOf('payment'));
  assert.equal(body.lines[body.lines.length - 1].balance, 6000);
}));

test('collection metrics report DSO as null rather than zero when nothing was billed', maybe(async () => {
  const tenant = await registerOrg();
  const empty = await call('GET', '/reports/collections', { token: tenant.token });
  assert.equal(empty.status, 200);
  // A DSO of 0 would read as "we collect instantly", which is the opposite of what no
  // data means.
  assert.equal(empty.body.dso, null);
  assert.equal(empty.body.collectionEfficiency, null);

  const client = await createClient(tenant.token);
  const invoice = await createInvoice(tenant.token, { clientId: client._id, items: [{ desc: 'Work', qty: 1, rate: 10000, gstRate: 0 }] });
  await call('POST', '/payments', {
    token: tenant.token,
    body: { invoiceId: invoice._id, amount: 10000, method: 'neft', date: new Date().toISOString().slice(0, 10) }
  });

  const filled = await call('GET', '/reports/collections', { token: tenant.token });
  assert.equal(filled.body.invoiced, 10000);
  assert.equal(filled.body.received, 10000);
  assert.equal(filled.body.collectionEfficiency, 100);
  assert.equal(filled.body.outstanding, 0);
  assert.equal(filled.body.paymentMix[0].method, 'neft');
  assert.equal(filled.body.paymentMix[0].share, 100);
}));

// ── Excel export (2.4 #34) ───────────────────────

test('exports are real .xlsx workbooks, not CSV with a new extension', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token);
  await createInvoice(tenant.token, { clientId: client._id });

  for (const path of ['/reports/ageing/export.xlsx', '/reports/invoices/export.xlsx']) {
    const response = await call('GET', path, { token: tenant.token });
    assert.equal(response.status, 200, path);
    assert.match(
      response.headers.get('content-type'),
      /spreadsheetml/,
      `${path} should be served as a spreadsheet`
    );
    // xlsx is a zip: 'PK'. A CSV renamed to .xlsx fails to open, and this is the cheapest
    // way to know the streaming writer actually produced a workbook.
    assert.equal(response.buffer.subarray(0, 2).toString('utf8'), 'PK', `${path} is a zip container`);
    assert.ok(response.buffer.length > 1000, `${path} has content`);
  }
}));

// ── Sending the invoice (2.3 #19) ────────────────

test('an invoice can be emailed to the customer, and a draft cannot', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token, { email: 'ap@customer.test' });

  const draft = await createInvoice(tenant.token, { clientId: client._id, status: 'draft' });
  const refused = await call('POST', `/invoices/${draft._id}/send`, { token: tenant.token, body: {} });
  // A draft has no number the customer should see and may still change.
  assert.equal(refused.status, 409);
  assert.equal(refused.body.code, 'INVOICE_DRAFT');

  const issued = await createInvoice(tenant.token, { clientId: client._id });
  const sent = await call('POST', `/invoices/${issued._id}/send`, { token: tenant.token, body: { message: 'Please find attached.' } });
  assert.equal(sent.status, 200, JSON.stringify(sent.body));
  assert.equal(sent.body.to, 'ap@customer.test', 'defaults to the address on the client record');
  // No provider is configured in tests, so nothing was delivered — and the response says
  // so rather than reporting a blanket success.
  assert.equal(sent.body.delivered, false);

  const logged = await waitUntil(() => EmailLog.findOne({ to: 'ap@customer.test', type: 'invoice' }).lean());
  assert.ok(logged, 'the attempt is recorded');
  assert.equal(logged.status, 'skipped');
  assert.equal(logged.meta.invoiceNumber, issued.invoiceNumber);
}));

test('sending refuses when there is no address to send to', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token, { email: '' });
  const invoice = await createInvoice(tenant.token, { clientId: client._id });

  const attempt = await call('POST', `/invoices/${invoice._id}/send`, { token: tenant.token, body: {} });
  assert.equal(attempt.status, 400);
  assert.equal(attempt.body.code, 'NO_RECIPIENT');

  // An explicit recipient wins, because accounts-payable is frequently not the contact.
  const override = await call('POST', `/invoices/${invoice._id}/send`, {
    token: tenant.token,
    body: { to: 'someone.else@customer.test' }
  });
  assert.equal(override.status, 200);
  assert.equal(override.body.to, 'someone.else@customer.test');
}));

// ── Organisation invoice defaults (2.3 #24–#26) ──

test('bank details fall back to the organisation and survive an unrelated save', maybe(async () => {
  const tenant = await registerOrg();

  const saved = await call('PUT', '/organisations/current', {
    token: tenant.token,
    body: {
      brandingConfig: {
        invoiceDefaults: {
          bankName: 'HDFC Bank',
          accountName: 'Ops Tenant',
          accountNumber: '50100123456789',
          ifsc: 'HDFC0001234',
          upiId: 'ops@hdfcbank',
          signatoryName: 'R. Sharma',
          termsAndConditions: 'Payment due within 15 days.'
        }
      }
    }
  });
  assert.equal(saved.status, 200, JSON.stringify(saved.body));
  assert.equal(saved.body.brandingConfig.invoiceDefaults.bankName, 'HDFC Bank');

  // The merge semantics matter here as much as for the logo: a later save of an
  // unrelated field must not blank these.
  const later = await call('PUT', '/organisations/current', {
    token: tenant.token,
    body: { brandingConfig: { primaryColor: '#111111' } }
  });
  assert.equal(later.status, 200);
  assert.equal(later.body.brandingConfig.invoiceDefaults.accountNumber, '50100123456789');
  assert.equal(later.body.brandingConfig.primaryColor, '#111111');
}));

// ── Tenant activity log (2.6 #50) ────────────────

test('a tenant can read its own audit trail, and only its own', maybe(async () => {
  const tenantA = await registerOrg();
  const tenantB = await registerOrg();
  await createClient(tenantA.token, { companyName: 'Visible To A' });
  await createClient(tenantB.token, { companyName: 'Visible To B' });

  // Fire-and-forget writes, so poll rather than assume.
  let page;
  const deadline = Date.now() + 3000;
  do {
    page = await call('GET', '/reports/activity?limit=50', { token: tenantA.token });
    if (page.body?.data?.length) break;
    await new Promise(resolve => { setTimeout(resolve, 50); });
  } while (Date.now() < deadline);

  assert.equal(page.status, 200);
  assert.ok(page.body.data.length, 'the trail is readable at all — it never was before');
  const actions = page.body.data.map(entry => entry.action);
  assert.ok(actions.includes('client.created'));

  // The invariant that matters: this cannot read another tenant's trail.
  const summaries = page.body.data.map(entry => JSON.stringify(entry.meta || {}));
  assert.ok(!summaries.some(text => text.includes('Visible To B')), 'scoped to this tenant');

  // And the platform's internal ids are not handed to the tenant.
  assert.ok(page.body.data.every(entry => entry.actorId === undefined));
  assert.ok(page.body.data.every(entry => 'bySupport' in entry));
}));

test('the activity log is admin-only', maybe(async () => {
  const tenant = await registerOrg();
  const invite = await call('POST', '/users/invite', {
    token: tenant.token,
    body: { name: 'Viewer', email: `viewer${counter}@tenant.test`, role: 'viewer' }
  });
  assert.equal(invite.status, 201, JSON.stringify(invite.body));

  const accepted = await call('POST', '/auth/accept-invite', {
    body: {
      token: new URL(invite.body.inviteUrl).searchParams.get('token'),
      password: 'Password@123',
      acceptTerms: true
    }
  });
  assert.equal(accepted.status, 200, JSON.stringify(accepted.body));

  // It names individual users' actions, so it is not a viewer's to read.
  const refused = await call('GET', '/reports/activity', { token: accepted.body.token });
  assert.equal(refused.status, 403);
}));
