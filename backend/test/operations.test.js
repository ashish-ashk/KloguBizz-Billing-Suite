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
const { StockLayer } = require('../src/models/StockLayer');
const { EmailLog } = require('../src/models/EmailLog');
const { Master } = require('../src/models/Settings');
const { invalidateMasterCache } = require('../src/services/masterService');
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

  // Two rows: the opening balance the item was created with, then the sale.
  // Opening stock used to arrive as a bare `stockQty` on the item with nothing in
  // the ledger to explain it — which meant a rebuild from the ledger would wipe
  // it (see 'a balance can be rebuilt from the ledger').
  const movements = await StockMovement.find({ itemId: item._id }).sort({ createdAt: 1 }).lean();
  assert.equal(movements.length, 2);
  assert.equal(movements[0].reason, 'opening');
  assert.equal(movements[0].quantity, 100);
  assert.equal(movements[1].quantity, -5, 'signed: a sale is negative');
  assert.equal(movements[1].reason, 'sale');
  assert.equal(movements[1].documentNumber, invoice.invoiceNumber);
  // The balance travels with the row, so a ledger line reads without re-summing above it.
  assert.equal(movements[1].balanceAfter, 95);

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
  // Only the opening balance. Nothing was issued, so nothing left the shelf.
  assert.equal(await StockMovement.countDocuments({ itemId: item._id, reason: { $ne: 'opening' } }), 0);
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
  assert.equal(await StockMovement.countDocuments({ orgId: tenant.org._id, reason: { $ne: 'opening' } }), 0);
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

  // The damage row specifically — the item also carries an `opening` row from
  // the balance it was created with.
  const movement = await StockMovement.findOne({ itemId: item._id, reason: 'damage' }).lean();
  assert.equal(movement.note, 'Three rods bent in transit');
  // Written-off goods leave at what they cost, so the loss lands in the right
  // place instead of appearing as an unexplained change in quantity.
  assert.equal(movement.quantity, -3);
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
  /**
   * 100 opening, less the 5 sold.
   *
   * This assertion used to expect **-5**, and that was the repair path quietly
   * destroying data: opening stock arrived as a hand-set `stockQty` with no
   * ledger row, so rebuilding "from the ledger" threw the opening balance away
   * and left every item that had one short by its entire starting quantity. The
   * fix was not here — it was making opening stock a real movement.
   */
  assert.equal(rebuilt.body.stockQty, 95);
  assert.equal(rebuilt.body.stockValue, 0, 'the value is rebuilt alongside the quantity');
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

// ── Valuation (2.5 #41) ──────────────────────────

/** A vendor, since every valuation test needs a purchase to create cost layers. */
async function createVendor(token, overrides = {}) {
  const { status, body } = await call('POST', '/purchases/vendors', {
    token,
    body: { name: 'Steel Supplier', stateCode: '27', gstin: '27AAPFU0939F1ZV', ...overrides }
  });
  assert.equal(status, 201, `vendor create failed: ${JSON.stringify(body)}`);
  return body;
}

let billCounter = 0;
async function purchase(token, vendorId, items, overrides = {}) {
  billCounter += 1;
  const { status, body } = await call('POST', '/purchases', {
    token,
    body: { vendorId, billNumber: `SUP/${billCounter}`, billDate: '2026-06-01', items, ...overrides }
  });
  assert.equal(status, 201, `purchase failed: ${JSON.stringify(body)}`);
  return body;
}

test('a purchase creates a cost layer at the net rate, excluding recoverable tax', maybe(async () => {
  const tenant = await registerOrg();
  const item = await createItem(tenant.token, { stockQty: 0, purchasePrice: 0 });
  const vendor = await createVendor(tenant.token);

  await purchase(tenant.token, vendor._id, [
    { desc: 'Steel Rod', hsn: '7213', qty: 100, rate: 400, gstRate: 18 }
  ]);

  const layers = await StockLayer.find({ itemId: item._id }).lean();
  assert.equal(layers.length, 1);
  // GST on a purchase is an input tax credit, not a cost. Capitalising it would
  // overstate inventory by 18% and overstate COGS by the same when it sells.
  assert.equal(layers[0].unitCost, 400);
  assert.equal(layers[0].remaining, 100);
  assert.equal((await Item.findById(item._id).lean()).stockValue, 40000);
}));

test('an inclusive, discounted purchase line is netted down exactly once', maybe(async () => {
  const tenant = await registerOrg();
  const item = await createItem(tenant.token, { stockQty: 0, purchasePrice: 0 });
  const vendor = await createVendor(tenant.token);

  // 118 inclusive of 18% -> 100 taxable, less 10% -> 90.
  await purchase(tenant.token, vendor._id, [
    { desc: 'Steel Rod', hsn: '7213', qty: 10, rate: 118, gstRate: 18, taxInclusive: true, discountPercent: 10 }
  ]);

  const layer = await StockLayer.findOne({ itemId: item._id }).lean();
  // The same tax engine the bill's own totals use — a second implementation of
  // "strip the tax, then discount" would drift, and the inventory value would
  // disagree with the bill it came from by a few percent.
  assert.equal(layer.unitCost, 90);
}));

test('FIFO sells the oldest stock first and reports what it cost', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token);
  const item = await createItem(tenant.token, { stockQty: 0, purchasePrice: 0 });
  const vendor = await createVendor(tenant.token);

  await purchase(tenant.token, vendor._id, [{ desc: 'Steel Rod', hsn: '7213', qty: 10, rate: 100, gstRate: 18 }], { billDate: '2026-05-01' });
  await purchase(tenant.token, vendor._id, [{ desc: 'Steel Rod', hsn: '7213', qty: 10, rate: 200, gstRate: 18 }], { billDate: '2026-06-01' });

  // 15 units: all ten of the 100 batch, then five of the 200 batch.
  await createInvoice(tenant.token, {
    clientId: client._id,
    items: [{ desc: 'Steel Rod', hsn: '7213', qty: 15, rate: 500, gstRate: 18 }]
  });

  const sale = await StockMovement.findOne({ itemId: item._id, reason: 'sale' }).lean();
  assert.equal(sale.value, -2000, '10 x 100 + 5 x 200');
  assert.equal(sale.unitCost, 133.33, 'the weighted cost of what was actually taken');
  assert.equal(sale.valuationMethod, 'fifo');
  // Which layers, and how much of each — the record that makes reversal possible.
  assert.equal(sale.consumed.length, 2);
  assert.deepEqual(sale.consumed.map(c => c.quantity), [10, 5]);

  const remaining = await StockLayer.find({ itemId: item._id, remaining: { $gt: 0 } }).lean();
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].unitCost, 200);
  assert.equal(remaining[0].remaining, 5);
  assert.equal((await Item.findById(item._id).lean()).stockValue, 1000);
}));

test('weighted average blends receipts into one layer', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token);
  await call('PUT', '/organisations/current', {
    token: tenant.token,
    body: { inventory: { valuationMethod: 'weighted-average' } }
  });
  const item = await createItem(tenant.token, { stockQty: 0, purchasePrice: 0 });
  const vendor = await createVendor(tenant.token);

  await purchase(tenant.token, vendor._id, [{ desc: 'Steel Rod', hsn: '7213', qty: 10, rate: 100, gstRate: 18 }], { billDate: '2026-05-01' });
  await purchase(tenant.token, vendor._id, [{ desc: 'Steel Rod', hsn: '7213', qty: 10, rate: 200, gstRate: 18 }], { billDate: '2026-06-01' });

  const layers = await StockLayer.find({ itemId: item._id }).lean();
  assert.equal(layers.length, 1, 'receipts merge rather than queue');
  assert.equal(layers[0].unitCost, 150);
  assert.equal(layers[0].remaining, 20);

  await createInvoice(tenant.token, {
    clientId: client._id,
    items: [{ desc: 'Steel Rod', hsn: '7213', qty: 15, rate: 500, gstRate: 18 }]
  });
  const sale = await StockMovement.findOne({ itemId: item._id, reason: 'sale' }).lean();
  // Every unit costs the same under this method, which is the whole point of it.
  assert.equal(sale.unitCost, 150);
  assert.equal(sale.value, -2250);
}));

test('cancelling an invoice returns the goods to the layers they left', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token);
  const item = await createItem(tenant.token, { stockQty: 0, purchasePrice: 0 });
  const vendor = await createVendor(tenant.token);

  await purchase(tenant.token, vendor._id, [{ desc: 'Steel Rod', hsn: '7213', qty: 10, rate: 100, gstRate: 18 }], { billDate: '2026-05-01' });
  await purchase(tenant.token, vendor._id, [{ desc: 'Steel Rod', hsn: '7213', qty: 10, rate: 200, gstRate: 18 }], { billDate: '2026-06-01' });

  const invoice = await createInvoice(tenant.token, {
    clientId: client._id,
    items: [{ desc: 'Steel Rod', hsn: '7213', qty: 15, rate: 500, gstRate: 18 }]
  });
  assert.equal((await Item.findById(item._id).lean()).stockValue, 1000);

  await call('POST', `/invoices/${invoice._id}/cancel`, {
    token: tenant.token,
    body: { reason: 'Customer changed their mind' }
  });

  // Back to 20 units worth 3000 — *exactly* what it was before the sale. Creating
  // a fresh layer at today's cost would rewrite the profit of a period that may
  // already have been reported.
  const layers = await StockLayer.find({ itemId: item._id }).sort({ receivedAt: 1 }).lean();
  assert.deepEqual(layers.map(l => [l.unitCost, l.remaining]), [[100, 10], [200, 10]]);
  assert.equal((await Item.findById(item._id).lean()).stockValue, 3000);
}));

test('a partial credit note restores only its share of the original cost', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token);
  const item = await createItem(tenant.token, { stockQty: 0, purchasePrice: 0 });
  const vendor = await createVendor(tenant.token);

  await purchase(tenant.token, vendor._id, [{ desc: 'Steel Rod', hsn: '7213', qty: 10, rate: 100, gstRate: 18 }]);
  const invoice = await createInvoice(tenant.token, {
    clientId: client._id,
    items: [{ desc: 'Steel Rod', hsn: '7213', qty: 10, rate: 500, gstRate: 18 }]
  });
  assert.equal((await Item.findById(item._id).lean()).stockValue, 0);

  const note = await call('POST', '/credit-notes', {
    token: tenant.token,
    body: {
      invoiceId: invoice._id,
      date: '2026-06-15',
      reason: 'sales-return',
      items: [{ desc: 'Steel Rod', hsn: '7213', qty: 4, rate: 500, gstRate: 18 }]
    }
  });
  assert.equal(note.status, 201, JSON.stringify(note.body));

  // Four units back at the 100 they left at — not at a guess, and not at zero.
  assert.equal((await Item.findById(item._id).lean()).stockValue, 400);
  const returned = await StockMovement.findOne({ itemId: item._id, reason: 'return' }).lean();
  assert.equal(returned.unitCost, 100);
  assert.equal(returned.value, 400);
}));

test('selling more than is on hand is allowed, and valued at the last cost', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token);
  const item = await createItem(tenant.token, { stockQty: 0, purchasePrice: 0 });
  const vendor = await createVendor(tenant.token);

  await purchase(tenant.token, vendor._id, [{ desc: 'Steel Rod', hsn: '7213', qty: 5, rate: 100, gstRate: 18 }]);

  // Goods sold before the supplier's bill was entered is the most ordinary thing
  // that happens in a real shop. Refusing the invoice over it would be the
  // software telling the business it is wrong about its own trade.
  const invoice = await createInvoice(tenant.token, {
    clientId: client._id,
    items: [{ desc: 'Steel Rod', hsn: '7213', qty: 8, rate: 500, gstRate: 18 }]
  });
  assert.ok(invoice._id);
  assert.equal((await Item.findById(item._id).lean()).stockQty, -3);

  const sale = await StockMovement.findOne({ itemId: item._id, reason: 'sale' }).lean();
  // 5 covered at 100, 3 uncovered valued at the last known cost rather than free.
  assert.equal(sale.value, -800);
}));

test('deleting a purchase takes its unsold stock back out', maybe(async () => {
  const tenant = await registerOrg();
  const item = await createItem(tenant.token, { stockQty: 0, purchasePrice: 0 });
  const vendor = await createVendor(tenant.token);
  const bill = await purchase(tenant.token, vendor._id, [{ desc: 'Steel Rod', hsn: '7213', qty: 10, rate: 100, gstRate: 18 }]);
  assert.equal((await Item.findById(item._id).lean()).stockQty, 10);

  const deleted = await call('DELETE', `/purchases/${bill._id}`, { token: tenant.token });
  assert.equal(deleted.status, 200);
  // `purchase-reversed` was in the reason enum from the day the ledger was
  // written and had never once been emitted: deleting a bill left its goods on
  // the shelf forever.
  const after = await Item.findById(item._id).lean();
  assert.equal(after.stockQty, 0);
  assert.equal(after.stockValue, 0);
  assert.ok(await StockMovement.findOne({ itemId: item._id, reason: 'purchase-reversed' }).lean());
}));

test('goods already sold cannot be un-received, and the response says so', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token);
  const item = await createItem(tenant.token, { stockQty: 0, purchasePrice: 0 });
  const vendor = await createVendor(tenant.token);
  const bill = await purchase(tenant.token, vendor._id, [{ desc: 'Steel Rod', hsn: '7213', qty: 10, rate: 100, gstRate: 18 }]);

  await createInvoice(tenant.token, {
    clientId: client._id,
    items: [{ desc: 'Steel Rod', hsn: '7213', qty: 6, rate: 500, gstRate: 18 }]
  });

  const deleted = await call('DELETE', `/purchases/${bill._id}`, { token: tenant.token });
  assert.equal(deleted.status, 200);
  // Only the unsold four come back. Removing the six would drive the layer
  // negative and rewrite the margin on an invoice already sent to a customer.
  assert.equal((await Item.findById(item._id).lean()).stockQty, 0);
  assert.equal(deleted.body.stock.stranded[0].quantity, 6);
}));

test('opening stock is a costed movement, and the balance cannot be hand-edited after', maybe(async () => {
  const tenant = await registerOrg();
  const item = await createItem(tenant.token, { stockQty: 40, purchasePrice: 25 });

  // Created with a balance — legitimate exactly once, at creation — and it
  // arrives as a ledger row with a cost rather than out of nowhere.
  assert.equal(item.stockQty, 40);
  assert.equal(item.stockValue, 1000);
  const opening = await StockMovement.findOne({ itemId: item._id, reason: 'opening' }).lean();
  assert.equal(opening.quantity, 40);
  assert.equal(opening.unitCost, 25);

  const edited = await call('PUT', `/items/${item._id}`, { token: tenant.token, body: { stockQty: 999 } });
  // The hand-edit is what made the number impossible to explain in the first place.
  assert.equal(edited.status, 400);
  assert.equal(edited.body.code, 'STOCK_NOT_EDITABLE');
  assert.equal((await Item.findById(item._id).lean()).stockQty, 40);
}));

test('the valuation report values stock at cost, not at what it hopes to sell for', maybe(async () => {
  const tenant = await registerOrg();
  const item = await createItem(tenant.token, { stockQty: 0, sellingPrice: 500, purchasePrice: 0 });
  const vendor = await createVendor(tenant.token);
  await purchase(tenant.token, vendor._id, [{ desc: 'Steel Rod', hsn: '7213', qty: 10, rate: 100, gstRate: 18 }]);

  const { status, body } = await call('GET', '/reports/stock/valuation', { token: tenant.token });
  assert.equal(status, 200);
  assert.equal(body.method, 'fifo');
  assert.equal(body.totals.value, 1000);
  // AS-2 carries inventory at the lower of cost and net realisable value —
  // `sellingPrice x quantity` books a profit that has not been earned.
  assert.equal(body.totals.retailValue, 5000);
  assert.equal(body.totals.unrealisedMargin, 4000);
  const row = body.items.find(i => String(i.itemId) === String(item._id));
  assert.equal(row.averageCost, 100);
  assert.equal(row.reconciled, true, 'the ledger balance and the layered quantity must agree');
}));

// ── Batch and expiry (2.5 #42) ───────────────────

test('a batch keeps its own layer, and expiring stock is reported before it expires', maybe(async () => {
  const tenant = await registerOrg();
  const item = await createItem(tenant.token, {
    name: 'Paracetamol', itemCode: 'MED-1', stockQty: 0, trackBatches: true, purchasePrice: 0
  });
  const vendor = await createVendor(tenant.token);

  const soon = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);
  const later = new Date(Date.now() + 300 * 86400000).toISOString().slice(0, 10);
  await purchase(tenant.token, vendor._id, [
    { desc: 'Paracetamol', hsn: '3004', qty: 50, rate: 10, gstRate: 12, batchNumber: 'B-EXPIRING', expiryDate: soon }
  ], { billDate: '2026-05-01' });
  await purchase(tenant.token, vendor._id, [
    { desc: 'Paracetamol', hsn: '3004', qty: 50, rate: 12, gstRate: 12, batchNumber: 'B-FRESH', expiryDate: later }
  ], { billDate: '2026-05-02' });

  const layers = await StockLayer.find({ itemId: item._id }).sort({ receivedAt: 1 }).lean();
  assert.deepEqual(layers.map(l => l.batchNumber), ['B-EXPIRING', 'B-FRESH']);

  const { status, body } = await call('GET', '/reports/stock/expiring?days=30', { token: tenant.token });
  assert.equal(status, 200);
  assert.equal(body.count, 1, 'only the batch inside the window');
  assert.equal(body.batches[0].batchNumber, 'B-EXPIRING');
  assert.equal(body.batches[0].expired, false);
  assert.equal(body.batches[0].quantity, 50);
}));

test('a batch is never blended away, even under weighted average', maybe(async () => {
  const tenant = await registerOrg();
  await call('PUT', '/organisations/current', {
    token: tenant.token,
    body: { inventory: { valuationMethod: 'weighted-average' } }
  });
  const item = await createItem(tenant.token, { name: 'Paracetamol', itemCode: 'MED-2', stockQty: 0, purchasePrice: 0 });
  const vendor = await createVendor(tenant.token);

  const d1 = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);
  const d2 = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
  await purchase(tenant.token, vendor._id, [{ desc: 'Paracetamol', hsn: '3004', qty: 10, rate: 10, gstRate: 12, batchNumber: 'A', expiryDate: d1 }]);
  await purchase(tenant.token, vendor._id, [{ desc: 'Paracetamol', hsn: '3004', qty: 10, rate: 20, gstRate: 12, batchNumber: 'B', expiryDate: d2 }]);

  // Blending two batches into one row would destroy the ability to say which
  // stock expires when — a physical fact the accounting method has no business
  // averaging away.
  const layers = await StockLayer.find({ itemId: item._id }).lean();
  assert.equal(layers.length, 2);
}));

test('first-expiry-first-out dispenses the shorter-dated batch, not the older receipt', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token);
  await call('PUT', '/organisations/current', {
    token: tenant.token,
    body: { inventory: { consumeByExpiry: true } }
  });
  const item = await createItem(tenant.token, { name: 'Paracetamol', itemCode: 'MED-3', stockQty: 0, purchasePrice: 0 });
  const vendor = await createVendor(tenant.token);

  const soon = new Date(Date.now() + 20 * 86400000).toISOString().slice(0, 10);
  const later = new Date(Date.now() + 400 * 86400000).toISOString().slice(0, 10);
  // Received FIRST but expires LAST — under plain FIFO this would go out first.
  await purchase(tenant.token, vendor._id, [
    { desc: 'Paracetamol', hsn: '3004', qty: 10, rate: 10, gstRate: 12, batchNumber: 'LONG', expiryDate: later }
  ], { billDate: '2026-05-01' });
  await purchase(tenant.token, vendor._id, [
    { desc: 'Paracetamol', hsn: '3004', qty: 10, rate: 20, gstRate: 12, batchNumber: 'SHORT', expiryDate: soon }
  ], { billDate: '2026-06-01' });

  await createInvoice(tenant.token, {
    clientId: client._id,
    items: [{ desc: 'Paracetamol', hsn: '3004', qty: 10, rate: 50, gstRate: 12 }]
  });

  const left = await StockLayer.find({ itemId: item._id, remaining: { $gt: 0 } }).lean();
  assert.equal(left.length, 1);
  assert.equal(left[0].batchNumber, 'LONG', 'the short-dated batch goes first, which is the entire point');
}));

// ── Barcode (2.5 #44) ────────────────────────────

test('a barcode resolves to exactly one item, and cannot be duplicated', maybe(async () => {
  const tenant = await registerOrg();
  const item = await createItem(tenant.token, {
    name: 'Scanned Rod', itemCode: 'SCAN-1', barcode: '8901234567894', stockQty: 0
  });

  const found = await call('GET', '/items/barcode/8901234567894', { token: tenant.token });
  assert.equal(found.status, 200);
  assert.equal(String(found.body._id), String(item._id));

  const missing = await call('GET', '/items/barcode/0000000000000', { token: tenant.token });
  // A code the till can act on — "add this as a new item" — rather than an error
  // the cashier can only stare at.
  assert.equal(missing.status, 404);
  assert.equal(missing.body.code, 'BARCODE_NOT_FOUND');

  const duplicate = await call('POST', '/items', {
    token: tenant.token,
    body: { name: 'Impostor', itemCode: 'SCAN-2', unit: 'Nos', gstRate: 18, sellingPrice: 100, barcode: '8901234567894' }
  });
  // A barcode that resolves to two items is worse than none: the scan silently
  // picks one. Refused explicitly *and* by a unique index — the index alone does
  // not exist on a fresh database until Mongoose finishes building it in the
  // background, and not at all where `autoIndex` is off, which is production.
  assert.equal(duplicate.status, 409, JSON.stringify(duplicate.body));
  assert.equal(duplicate.body.code, 'BARCODE_IN_USE');

  // Saving the same item again keeps its own barcode — the check must exclude
  // the row it is checking, or nothing with a barcode could ever be edited.
  const resaved = await call('PUT', `/items/${item._id}`, {
    token: tenant.token,
    body: { name: 'Scanned Rod', sellingPrice: 550, barcode: '8901234567894' }
  });
  assert.equal(resaved.status, 200, JSON.stringify(resaved.body));
}));

test('two tenants may use the same barcode', maybe(async () => {
  const first = await registerOrg();
  const second = await registerOrg();
  const a = await createItem(first.token, { name: 'Shared Code', itemCode: 'SH-1', barcode: '5012345678900', stockQty: 0 });
  const b = await createItem(second.token, { name: 'Shared Code', itemCode: 'SH-1', barcode: '5012345678900', stockQty: 0 });
  assert.ok(a._id && b._id, 'uniqueness is per tenant — the same product exists in many shops');

  const found = await call('GET', '/items/barcode/5012345678900', { token: second.token });
  assert.equal(String(found.body._id), String(b._id), 'and a scan resolves within the scanning tenant only');
}));

// ── Profit & loss (2.4 #32) ──────────────────────

/**
 * A tenant with the chart of accounts seeded, since `assertValidMaster` is
 * permissive when a list is empty and half these tests are about what happens
 * when it is not.
 */
async function withExpenseCategories() {
  await Master.deleteMany({ type: 'expenseCategory' });
  await Master.create([
    { type: 'expenseCategory', code: 'salaries', label: 'Salaries & wages', active: true, sortOrder: 0 },
    { type: 'expenseCategory', code: 'rent', label: 'Rent', active: true, sortOrder: 1 },
    { type: 'expenseCategory', code: 'freight', label: 'Freight & transport', active: true, sortOrder: 2 },
    { type: 'expenseCategory', code: 'other', label: 'Other expenses', active: true, sortOrder: 3 }
  ]);
  invalidateMasterCache('expenseCategory');
}

async function pl(token, query = '') {
  const { status, body } = await call('GET', `/expenses/profit-loss${query}`, { token });
  assert.equal(status, 200, JSON.stringify(body));
  return body;
}

test('buying stock is not an expense — it becomes one when the stock sells', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token);
  const item = await createItem(tenant.token, { stockQty: 0, purchasePrice: 0, sellingPrice: 500 });
  const vendor = await createVendor(tenant.token);

  // 100 units at 200 = 20,000 of stock bought.
  await purchase(tenant.token, vendor._id, [
    { desc: 'Steel Rod', hsn: '7213', qty: 100, rate: 200, gstRate: 18 }
  ], { billDate: '2026-06-01' });

  const beforeSale = await pl(tenant.token, '?from=2026-04-01&to=2027-03-31');
  /**
   * The whole point of this report.
   *
   * The obvious implementation — "revenue minus purchases" — reports a 20,000
   * loss here. Nothing has been consumed: cash became goods on a shelf. A
   * business that stocked up would see a loss it did not make, then a wildly
   * overstated profit in the month it sold.
   */
  assert.equal(beforeSale.totalExpenses, 0, 'stock on the shelf is not an expense');
  // And no zero-value row for the bill that became stock in full — a statement
  // padded with empty lines invites the reader to wonder what is missing.
  assert.equal(beforeSale.expenses.length, 0);
  assert.equal(beforeSale.netProfit, 0);
  assert.equal(beforeSale.excluded.inventoryPurchases, 20000, 'and the report says where it went');

  // Sell 40 of them for 500 each.
  await createInvoice(tenant.token, {
    clientId: client._id,
    date: '2026-06-20',
    items: [{ desc: 'Steel Rod', hsn: '7213', qty: 40, rate: 500, gstRate: 18 }]
  });

  const after = await pl(tenant.token, '?from=2026-04-01&to=2027-03-31');
  assert.equal(after.revenue.net, 20000, '40 x 500, taxable value');
  assert.equal(after.costOfGoodsSold.total, 8000, '40 x 200 — only what left the shelf');
  assert.equal(after.grossProfit, 12000);
  // Still zero: the other 60 units are stock, not cost.
  assert.equal(after.totalExpenses, 0, 'the unsold 60 are still an asset');
  assert.equal(after.netProfit, 12000);
  assert.ok(item._id);
}));

test('GST is neither revenue nor cost', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token);
  await createItem(tenant.token, { stockQty: 0, purchasePrice: 0 });

  await createInvoice(tenant.token, {
    clientId: client._id,
    date: '2026-06-20',
    items: [{ desc: 'Consulting', hsn: '998311', qty: 1, rate: 10000, gstRate: 18 }]
  });

  const report = await pl(tenant.token, '?from=2026-04-01&to=2027-03-31');
  // Charged 11,800 and earned 10,000. The 1,800 is collected on the
  // government's behalf and owed to it — booking it as revenue would overstate
  // income by the tax rate and make every margin wrong.
  assert.equal(report.revenue.net, 10000);
  assert.equal(report.revenue.taxCollected, 1800, 'shown, so nobody mistakes revenue for money in');
}));

test('a credit note reduces revenue', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token);
  const invoice = await createInvoice(tenant.token, {
    clientId: client._id,
    date: '2026-06-10',
    items: [{ desc: 'Consulting', hsn: '998311', qty: 1, rate: 10000, gstRate: 18 }]
  });
  await call('POST', '/credit-notes', {
    token: tenant.token,
    body: {
      invoiceId: invoice._id,
      date: '2026-06-15',
      reason: 'post-sale-discount',
      items: [{ desc: 'Consulting', hsn: '998311', qty: 1, rate: 2500, gstRate: 18 }]
    }
  });

  const report = await pl(tenant.token, '?from=2026-04-01&to=2027-03-31');
  assert.equal(report.revenue.gross, 10000);
  // No other invoice-side report nets these — the GST summary deliberately does
  // not, because a return reports them in their own table. A P&L that ignored
  // them would overstate revenue by every discount and return ever given.
  assert.equal(report.revenue.creditNotes, 2500);
  assert.equal(report.revenue.net, 7500);
  assert.equal(report.revenue.creditsByReason[0].reason, 'post-sale-discount');
}));

test('a purchase that never became stock is an expense straight away', maybe(async () => {
  const tenant = await registerOrg();
  await withExpenseCategories();
  const vendor = await createVendor(tenant.token);

  // Nothing in the catalogue matches this line, so it moved no stock — it was
  // consumed, not stored.
  await purchase(tenant.token, vendor._id, [
    { desc: 'Courier charges for June', hsn: '996812', qty: 1, rate: 4000, gstRate: 18 }
  ], { billDate: '2026-06-05', category: 'freight' });

  const report = await pl(tenant.token, '?from=2026-04-01&to=2027-03-31');
  assert.equal(report.totalExpenses, 4000);
  // Named, not coded. The document stores the master's `code`; the statement
  // renders its `label`. Getting that backwards put "salaries" on a statement
  // beside "Salaries & wages" as two separate lines for the same thing.
  const line = report.expenses.find(e => e.category === 'Freight & transport');
  assert.equal(line.amount, 4000);
  assert.equal(line.source, 'purchases');
  assert.equal(report.excluded.inventoryPurchases, 0);
}));

test('one bill part stock and part expense is split, not counted twice', maybe(async () => {
  const tenant = await registerOrg();
  await withExpenseCategories();
  await createItem(tenant.token, { stockQty: 0, purchasePrice: 0 });
  const vendor = await createVendor(tenant.token);

  await purchase(tenant.token, vendor._id, [
    // Matches the catalogue: becomes stock.
    { desc: 'Steel Rod', hsn: '7213', qty: 10, rate: 200, gstRate: 18 },
    // Does not: consumed now.
    { desc: 'Delivery to site', hsn: '996812', qty: 1, rate: 1500, gstRate: 18 }
  ], { billDate: '2026-06-05', category: 'freight' });

  const report = await pl(tenant.token, '?from=2026-04-01&to=2027-03-31');
  // 2,000 of the 3,500 bill went on the shelf; only the 1,500 was consumed.
  // Charging the whole bill would double-count the rods against COGS later.
  assert.equal(report.excluded.inventoryPurchases, 2000);
  assert.equal(report.totalExpenses, 1500);
}));

test('capital goods are excluded from expenses and reported as excluded', maybe(async () => {
  const tenant = await registerOrg();
  await withExpenseCategories();
  const vendor = await createVendor(tenant.token);

  await purchase(tenant.token, vendor._id, [
    { desc: 'Lathe machine', hsn: '8458', qty: 1, rate: 250000, gstRate: 18 }
  ], { billDate: '2026-06-05', itcCategory: 'capital-goods', category: 'other' });

  const report = await pl(tenant.token, '?from=2026-04-01&to=2027-03-31');
  // A machine used for years is not one year's expense. The correct treatment is
  // depreciation, which needs an asset register this product does not have — so
  // it is left out *and said to be left out*, rather than silently either way.
  assert.equal(report.totalExpenses, 0);
  assert.equal(report.excluded.capitalGoods, 250000);
}));

test('input tax that cannot be claimed is a real expense', maybe(async () => {
  const tenant = await registerOrg();
  await withExpenseCategories();
  const vendor = await createVendor(tenant.token);

  await purchase(tenant.token, vendor._id, [
    { desc: 'Client entertainment', hsn: '996331', qty: 1, rate: 10000, gstRate: 18 }
  ], { billDate: '2026-06-05', itcCategory: 'blocked', category: 'other' });

  const report = await pl(tenant.token, '?from=2026-04-01&to=2027-03-31');
  // Section 17(5): the tax was paid and cannot be recovered, so it is money gone
  // rather than an asset. Dropping it would understate the true cost by 18%.
  const taxLine = report.expenses.find(e => e.category === 'Input tax not claimable');
  assert.ok(taxLine, 'blocked input tax must appear as its own line');
  assert.equal(taxLine.amount, 1800);
  assert.equal(report.totalExpenses, 11800, 'the cost plus the tax on it');
}));

test('salaries can be recorded at all, and land in the P&L', maybe(async () => {
  const tenant = await registerOrg();
  await withExpenseCategories();

  const created = await call('POST', '/expenses', {
    token: tenant.token,
    body: { date: '2026-06-30', category: 'salaries', description: 'June payroll', amount: 185000, paymentMethod: 'Bank Transfer' }
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));

  const report = await pl(tenant.token, '?from=2026-04-01&to=2027-03-31');
  // The largest expense most businesses have, and it had no home in the data
  // model at all: payroll has no vendor and no bill number, so it cannot be a
  // Purchase. A profit figure without it is wrong in the flattering direction.
  const line = report.expenses.find(e => e.category === 'Salaries & wages');
  assert.equal(line.amount, 185000);
  assert.equal(line.source, 'expenses');
  assert.equal(report.netProfit, -185000);
}));

test('an expense category outside the chart of accounts is refused', maybe(async () => {
  const tenant = await registerOrg();
  await withExpenseCategories();

  const bad = await call('POST', '/expenses', {
    token: tenant.token,
    body: { date: '2026-06-30', category: 'Frieght', description: 'Typo', amount: 100 }
  });
  // Without this a tenant's own accounts grow "Freight", "freight " and
  // "Frieght" as three separate lines, and nobody notices until the P&L is
  // unreadable.
  assert.equal(bad.status, 400);
  assert.equal(bad.body.code, 'INVALID_MASTER_VALUE');
}));

test('stock written off is an expense, and kept apart from cost of sales', maybe(async () => {
  const tenant = await registerOrg();
  const item = await createItem(tenant.token, { stockQty: 0, purchasePrice: 0 });
  const vendor = await createVendor(tenant.token);
  await purchase(tenant.token, vendor._id, [
    { desc: 'Steel Rod', hsn: '7213', qty: 10, rate: 200, gstRate: 18 }
  ], { billDate: '2026-06-01' });

  await call('POST', `/reports/stock/${item._id}/adjust`, {
    token: tenant.token,
    body: { quantity: -3, reason: 'damage', note: 'Three bent in the crate' }
  });

  const report = await pl(tenant.token, '?from=2026-04-01&to=2027-03-31');
  const line = report.expenses.find(e => e.category === 'Stock damaged or written off');
  assert.equal(line.amount, 600, '3 x 200');
  // Deliberately not folded into cost of sales: shrinkage is the number a
  // business most wants to see on its own, and burying it in COGS hides it.
  assert.equal(report.costOfGoodsSold.total, 0);
}));

test('the period is respected on both sides', maybe(async () => {
  const tenant = await registerOrg();
  await withExpenseCategories();
  const client = await createClient(tenant.token);

  await createInvoice(tenant.token, {
    clientId: client._id, date: '2026-05-10',
    items: [{ desc: 'Consulting', hsn: '998311', qty: 1, rate: 5000, gstRate: 18 }]
  });
  await createInvoice(tenant.token, {
    clientId: client._id, date: '2026-09-10', dueDate: '2026-10-10',
    items: [{ desc: 'Consulting', hsn: '998311', qty: 1, rate: 7000, gstRate: 18 }]
  });
  await call('POST', '/expenses', {
    token: tenant.token,
    body: { date: '2026-05-20', category: 'rent', description: 'May rent', amount: 2000 }
  });
  await call('POST', '/expenses', {
    token: tenant.token,
    body: { date: '2026-09-20', category: 'rent', description: 'September rent', amount: 3000 }
  });

  const q1 = await pl(tenant.token, '?from=2026-04-01&to=2026-06-30');
  assert.equal(q1.revenue.net, 5000);
  assert.equal(q1.totalExpenses, 2000);
  assert.equal(q1.netProfit, 3000);

  const year = await pl(tenant.token, '?fy=2026');
  assert.equal(year.revenue.net, 12000);
  assert.equal(year.totalExpenses, 5000);
  assert.equal(year.netProfit, 7000);
  assert.equal(year.period.label, 'FY2026-27');
}));

test('margins are null rather than zero when nothing was earned', maybe(async () => {
  const tenant = await registerOrg();
  await withExpenseCategories();
  await call('POST', '/expenses', {
    token: tenant.token,
    body: { date: '2026-06-30', category: 'rent', description: 'Rent before trading started', amount: 5000 }
  });

  const report = await pl(tenant.token, '?from=2026-04-01&to=2027-03-31');
  assert.equal(report.revenue.net, 0);
  // A margin on no revenue is undefined, not 0% — reporting 0% would read as
  // "we sold things and made nothing", which is a different and wrong story.
  assert.equal(report.grossMargin, null);
  assert.equal(report.netMargin, null);
  assert.equal(report.netProfit, -5000);
}));

test('a deleted expense stops counting but can be brought back', maybe(async () => {
  const tenant = await registerOrg();
  await withExpenseCategories();
  const created = await call('POST', '/expenses', {
    token: tenant.token,
    body: { date: '2026-06-30', category: 'rent', description: 'June rent', amount: 9000 }
  });
  assert.equal((await pl(tenant.token, '?fy=2026')).totalExpenses, 9000);

  await call('DELETE', `/expenses/${created.body._id}`, { token: tenant.token });
  assert.equal((await pl(tenant.token, '?fy=2026')).totalExpenses, 0);

  // Soft, because a period's profit may already have been reported on it.
  const restored = await call('POST', `/expenses/${created.body._id}/restore`, { token: tenant.token });
  assert.equal(restored.status, 200);
  assert.equal((await pl(tenant.token, '?fy=2026')).totalExpenses, 9000);
}));

test('one tenant never sees another tenant costs', maybe(async () => {
  const first = await registerOrg();
  const second = await registerOrg();
  await withExpenseCategories();
  await call('POST', '/expenses', {
    token: first.token,
    body: { date: '2026-06-30', category: 'rent', description: 'Their rent', amount: 50000 }
  });

  const mine = await pl(second.token, '?fy=2026');
  assert.equal(mine.totalExpenses, 0);
  assert.equal(mine.netProfit, 0);
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

  /**
   * Fire-and-forget writes, so poll rather than assume — and poll for the
   * **specific** entry this test asserts on, not merely for a non-empty page.
   *
   * Registering also writes audit entries, so the page becomes non-empty before
   * `client.created` has necessarily landed. Breaking on the first row that
   * appears therefore passed on an idle machine and failed under a loaded
   * parallel run, which is the least useful kind of test failure.
   */
  let page;
  const deadline = Date.now() + 5000;
  do {
    page = await call('GET', '/reports/activity?limit=50', { token: tenantA.token });
    if (page.body?.data?.some(entry => entry.action === 'client.created')) break;
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

// ── Warehouses and transfers (2.5 #42) ───────────

const { StockLocation } = require('../src/models/StockLocation');

async function locations(token) {
  const { status, body } = await call('GET', '/reports/stock/locations', { token });
  assert.equal(status, 200, JSON.stringify(body));
  return body.locations;
}

async function makeLocation(token, name, overrides = {}) {
  const { status, body } = await call('POST', '/reports/stock/locations', {
    token, body: { name, ...overrides }
  });
  assert.equal(status, 201, `location create failed: ${JSON.stringify(body)}`);
  return body;
}

async function transfer(token, body) {
  return call('POST', '/reports/stock/transfer', { token, body });
}

async function heldAt(orgId, itemId, locationId) {
  const rows = await StockLayer.aggregate([
    {
      $match: {
        orgId: new mongoose.Types.ObjectId(String(orgId)),
        itemId: new mongoose.Types.ObjectId(String(itemId)),
        locationId: new mongoose.Types.ObjectId(String(locationId)),
        remaining: { $gt: 0 }
      }
    },
    { $group: { _id: null, quantity: { $sum: '$remaining' }, value: { $sum: { $multiply: ['$remaining', '$unitCost'] } } } }
  ]);
  return { quantity: rows[0]?.quantity || 0, value: Math.round((rows[0]?.value || 0) * 100) / 100 };
}

test('a new tenant gets a default warehouse, and its stock lands in it', maybe(async () => {
  const tenant = await registerOrg();
  const list = await locations(tenant.token);

  /**
   * Without this a new tenant would have no location at all, so every layer
   * would be stamped `null` — invisible to per-location balances and impossible
   * to transfer. They would find out only after building up stock they then
   * could not move.
   */
  assert.equal(list.length, 1);
  assert.equal(list[0].isDefault, true);

  const item = await createItem(tenant.token, { name: 'Located Rod', itemCode: 'LOC-1', stockQty: 40 });
  const held = await heldAt(tenant.org._id, item._id, list[0]._id);
  assert.equal(held.quantity, 40, 'opening stock goes to the default warehouse');
}));

test('selling from one warehouse does not draw down another', maybe(async () => {
  const tenant = await registerOrg();
  const [main] = await locations(tenant.token);
  const second = await makeLocation(tenant.token, 'Second Godown');
  const client = await createClient(tenant.token);
  const item = await createItem(tenant.token, { name: 'Split Rod', itemCode: 'SPLIT-1', stockQty: 0 });

  // 10 in each, at different costs, so the cost drawn says which warehouse the
  // sale actually came from.
  await call('POST', `/reports/stock/${item._id}/adjust`, {
    token: tenant.token,
    body: { quantity: 10, note: 'stocking main', unitCost: 100, locationId: main._id }
  });
  await call('POST', `/reports/stock/${item._id}/adjust`, {
    token: tenant.token,
    body: { quantity: 10, note: 'stocking second', unitCost: 300, locationId: second._id }
  });

  await createInvoice(tenant.token, {
    clientId: client._id,
    locationId: second._id,
    items: [{ desc: 'Split Rod', hsn: '7213', qty: 4, rate: 500, gstRate: 18 }]
  });

  /**
   * The whole feature in one assertion. Without the location filter on
   * consumption the sale would have taken Main's older, cheaper layer — the
   * books would still balance in total while both warehouses' physical counts
   * drifted from the system, and nothing would say so.
   */
  assert.equal((await heldAt(tenant.org._id, item._id, main._id)).quantity, 10, 'Main is untouched');
  assert.equal((await heldAt(tenant.org._id, item._id, second._id)).quantity, 6);

  const movement = await StockMovement.findOne({ orgId: tenant.org._id, itemId: item._id, reason: 'sale' }).lean();
  assert.equal(movement.unitCost, 300, 'and it cost what the *second* godown paid');
  assert.equal(String(movement.locationId), String(second._id));
}));

test('a transfer moves the goods without changing what they are worth', maybe(async () => {
  const tenant = await registerOrg();
  const [main] = await locations(tenant.token);
  const second = await makeLocation(tenant.token, 'Transfer Target');
  const item = await createItem(tenant.token, { name: 'Moving Rod', itemCode: 'MOVE-1', stockQty: 0 });

  await call('POST', `/reports/stock/${item._id}/adjust`, {
    token: tenant.token, body: { quantity: 10, note: 'in', unitCost: 250, locationId: main._id }
  });

  const before = await Item.findById(item._id).select('stockQty stockValue').lean();
  const { status, body } = await transfer(tenant.token, {
    fromLocationId: main._id, toLocationId: second._id,
    lines: [{ itemId: item._id, quantity: 6 }], note: 'van run'
  });
  assert.equal(status, 201, JSON.stringify(body));

  /**
   * The rule the whole transfer is built around. Nothing was bought or sold and
   * no profit has moved — the goods are simply somewhere else. The naive
   * implementation receives them at *today's* cost, which would let a business
   * change its reported profit by driving a van between its own godowns.
   */
  const after = await Item.findById(item._id).select('stockQty stockValue').lean();
  assert.equal(after.stockQty, before.stockQty, 'the total on hand is unchanged');
  assert.equal(after.stockValue, before.stockValue, 'and so is what it is worth');

  assert.equal((await heldAt(tenant.org._id, item._id, main._id)).quantity, 4);
  assert.equal((await heldAt(tenant.org._id, item._id, second._id)).quantity, 6);
  assert.equal((await heldAt(tenant.org._id, item._id, second._id)).value, 1500, 'at the cost it left at');
}));

test('a transfer keeps the goods in their place in the FIFO queue', maybe(async () => {
  const tenant = await registerOrg();
  const [main] = await locations(tenant.token);
  const second = await makeLocation(tenant.token, 'Round Trip');
  const item = await createItem(tenant.token, { name: 'Queue Rod', itemCode: 'QUEUE-1', stockQty: 0 });

  // Two consignments at different costs, the cheap one older.
  const old = await StockLayer.create({
    orgId: tenant.org._id, itemId: item._id, locationId: main._id,
    unitCost: 100, quantity: 5, remaining: 5, sourceType: 'opening',
    receivedAt: new Date('2026-01-01')
  });
  await StockLayer.create({
    orgId: tenant.org._id, itemId: item._id, locationId: main._id,
    unitCost: 400, quantity: 5, remaining: 5, sourceType: 'opening',
    receivedAt: new Date('2026-06-01')
  });
  await Item.updateOne({ _id: item._id }, { stockQty: 10, stockValue: 2500 });

  // Send the old one to the other godown and straight back.
  await transfer(tenant.token, {
    fromLocationId: main._id, toLocationId: second._id, lines: [{ itemId: item._id, quantity: 5 }]
  });
  await transfer(tenant.token, {
    fromLocationId: second._id, toLocationId: main._id, lines: [{ itemId: item._id, quantity: 5 }]
  });

  const client = await createClient(tenant.token);
  await createInvoice(tenant.token, {
    clientId: client._id, locationId: main._id,
    items: [{ desc: 'Queue Rod', hsn: '7213', qty: 5, rate: 900, gstRate: 18 }]
  });

  /**
   * Stamping the arriving layers with today's date would have made the oldest
   * goods in the business the newest, so this sale would report ₹400 a unit
   * instead of ₹100 — and expiry-first ordering would silently reverse for
   * anyone using it.
   */
  const sale = await StockMovement.findOne({ orgId: tenant.org._id, itemId: item._id, reason: 'sale' }).lean();
  assert.equal(sale.unitCost, 100, 'a round trip must not reorder the queue');
  assert.equal(String(old.receivedAt.toISOString()).slice(0, 10), '2026-01-01');
}));

test('a transfer of stock you do not have is refused, not short-drawn', maybe(async () => {
  const tenant = await registerOrg();
  const [main] = await locations(tenant.token);
  const second = await makeLocation(tenant.token, 'Empty Godown');
  const item = await createItem(tenant.token, { name: 'Scarce Rod', itemCode: 'SCARCE-1', stockQty: 0 });
  await call('POST', `/reports/stock/${item._id}/adjust`, {
    token: tenant.token, body: { quantity: 3, note: 'in', unitCost: 100, locationId: main._id }
  });

  const { status, body } = await transfer(tenant.token, {
    fromLocationId: main._id, toLocationId: second._id, lines: [{ itemId: item._id, quantity: 8 }]
  });

  /**
   * Unlike a sale, which is allowed to go short — goods sold before the bill was
   * entered is the most common thing that happens in a real shop. Moving goods
   * you do not have is not a thing that happens at all, and allowing it would
   * create value out of nothing at the destination.
   */
  assert.equal(status, 400);
  assert.equal(body.code, 'TRANSFER_INSUFFICIENT');
  assert.match(body.message, /holds 3/);
  assert.equal((await heldAt(tenant.org._id, item._id, main._id)).quantity, 3, 'and nothing moved');
}));

test('a multi-line transfer moves all of it or none of it', maybe(async () => {
  const tenant = await registerOrg();
  const [main] = await locations(tenant.token);
  const second = await makeLocation(tenant.token, 'All Or Nothing');
  const ok = await createItem(tenant.token, { name: 'Fine Rod', itemCode: 'FINE-1', stockQty: 0 });
  const short = await createItem(tenant.token, { name: 'Short Rod', itemCode: 'SHORT-1', stockQty: 0 });
  await call('POST', `/reports/stock/${ok._id}/adjust`, {
    token: tenant.token, body: { quantity: 10, note: 'in', unitCost: 100, locationId: main._id }
  });

  const { status } = await transfer(tenant.token, {
    fromLocationId: main._id, toLocationId: second._id,
    lines: [{ itemId: ok._id, quantity: 5 }, { itemId: short._id, quantity: 1 }]
  });

  // Everything is checked before anything moves: a partial transfer leaves the
  // warehouse in a state nobody asked for.
  assert.equal(status, 400);
  assert.equal((await heldAt(tenant.org._id, ok._id, main._id)).quantity, 10, 'the good line did not move either');
}));

test('a warehouse in another state is refused, and says why', maybe(async () => {
  const tenant = await registerOrg();
  const { status, body } = await call('POST', '/reports/stock/locations', {
    token: tenant.token, body: { name: 'Bengaluru Godown', stateCode: '29' }
  });

  /**
   * Not a nicety. Storing goods in another state needs a separate GST
   * registration, and moving stock there is a supply between distinct persons —
   * a tax invoice, an entry in GSTR-1 and IGST. Treating it as an internal
   * transfer would understate output tax, which surfaces as a demand years later
   * rather than as an error today. That is the multi-GSTIN work deferred in
   * 2.1 #9.
   */
  assert.equal(status, 400);
  assert.equal(body.code, 'LOCATION_OTHER_STATE');
  assert.match(body.message, /own GST registration/);
}));

test('a warehouse holding stock cannot be archived', maybe(async () => {
  const tenant = await registerOrg();
  const [main] = await locations(tenant.token);
  const second = await makeLocation(tenant.token, 'Closing Down');
  const item = await createItem(tenant.token, { name: 'Stranded Rod', itemCode: 'STRAND-1', stockQty: 0 });
  await call('POST', `/reports/stock/${item._id}/adjust`, {
    token: tenant.token, body: { quantity: 5, note: 'in', unitCost: 100, locationId: second._id }
  });

  const refused = await call('PUT', `/reports/stock/locations/${second._id}`, {
    token: tenant.token, body: { status: 'archived' }
  });
  /**
   * Otherwise the goods become unreachable: nothing can be sold or transferred
   * out of an archived location, so the quantity stays on the books, keeps
   * counting towards the valuation, and cannot be touched.
   */
  assert.equal(refused.status, 409);
  assert.equal(refused.body.code, 'LOCATION_NOT_EMPTY');

  await transfer(tenant.token, {
    fromLocationId: second._id, toLocationId: main._id, lines: [{ itemId: item._id, quantity: 5 }]
  });
  const allowed = await call('PUT', `/reports/stock/locations/${second._id}`, {
    token: tenant.token, body: { status: 'archived' }
  });
  assert.equal(allowed.status, 200);
  assert.equal(allowed.body.status, 'archived');
}));

test('the default warehouse cannot be archived at all', maybe(async () => {
  const tenant = await registerOrg();
  const [main] = await locations(tenant.token);
  const { status, body } = await call('PUT', `/reports/stock/locations/${main._id}`, {
    token: tenant.token, body: { status: 'archived' }
  });
  // Everything that names no location falls back to it, so archiving it would
  // leave those movements with nowhere to go.
  assert.equal(status, 409);
  assert.equal(body.code, 'LOCATION_IS_DEFAULT');
}));

test('a cancelled invoice returns the stock to the warehouse it left', maybe(async () => {
  const tenant = await registerOrg();
  const [main] = await locations(tenant.token);
  const second = await makeLocation(tenant.token, 'Return Target');
  const client = await createClient(tenant.token);
  const item = await createItem(tenant.token, { name: 'Returning Rod', itemCode: 'RET-1', stockQty: 0 });
  await call('POST', `/reports/stock/${item._id}/adjust`, {
    token: tenant.token, body: { quantity: 10, note: 'in', unitCost: 120, locationId: second._id }
  });

  const invoice = await createInvoice(tenant.token, {
    clientId: client._id, locationId: second._id,
    items: [{ desc: 'Returning Rod', hsn: '7213', qty: 4, rate: 500, gstRate: 18 }]
  });
  assert.equal((await heldAt(tenant.org._id, item._id, second._id)).quantity, 6);

  // Cancelled, not deleted: an issued invoice has reached a customer and been
  // counted in a return, so it is reversed rather than erased.
  const cancelled = await call('POST', `/invoices/${invoice._id}/cancel`, {
    token: tenant.token, body: { reason: 'customer changed their mind' }
  });
  assert.equal(cancelled.status, 200, JSON.stringify(cancelled.body));

  /**
   * The invoice records where the goods went out from, so a cancellation months
   * later puts them back there even if the tenant's default has changed since.
   */
  assert.equal((await heldAt(tenant.org._id, item._id, second._id)).quantity, 10);
  assert.equal((await heldAt(tenant.org._id, item._id, main._id)).quantity, 0);
}));

test('two warehouses that paid different prices are valued separately', maybe(async () => {
  const tenant = await registerOrg();
  const [main] = await locations(tenant.token);
  const second = await makeLocation(tenant.token, 'Dearer Godown');
  const item = await createItem(tenant.token, { name: 'Blend Rod', itemCode: 'BLEND-1', stockQty: 0 });

  // Weighted average is the case that would blend them if the blend were not
  // scoped per location.
  await call('PUT', '/organisations/current', {
    token: tenant.token, body: { inventorySettings: { valuationMethod: 'weighted-average' } }
  });

  await call('POST', `/reports/stock/${item._id}/adjust`, {
    token: tenant.token, body: { quantity: 10, note: 'cheap', unitCost: 100, locationId: main._id }
  });
  await call('POST', `/reports/stock/${item._id}/adjust`, {
    token: tenant.token, body: { quantity: 10, note: 'dear', unitCost: 300, locationId: second._id }
  });

  /**
   * Merging them would make each warehouse's valuation wrong in opposite
   * directions while the total stayed right — the kind of error that survives
   * every check anyone thinks to run.
   */
  assert.equal((await heldAt(tenant.org._id, item._id, main._id)).value, 1000);
  assert.equal((await heldAt(tenant.org._id, item._id, second._id)).value, 3000);
}));

test('the ledger says where a transfer went, from both ends', maybe(async () => {
  const tenant = await registerOrg();
  const [main] = await locations(tenant.token);
  const second = await makeLocation(tenant.token, 'Readable Godown');
  const item = await createItem(tenant.token, { name: 'Legible Rod', itemCode: 'LEG-1', stockQty: 0 });
  await call('POST', `/reports/stock/${item._id}/adjust`, {
    token: tenant.token, body: { quantity: 8, note: 'in', unitCost: 50, locationId: main._id }
  });

  await transfer(tenant.token, {
    fromLocationId: main._id, toLocationId: second._id,
    lines: [{ itemId: item._id, quantity: 3 }], note: 'restocking the shop'
  });

  const rows = await StockMovement.find({
    orgId: tenant.org._id, itemId: item._id, reason: { $in: ['transfer-out', 'transfer-in'] }
  }).lean();
  assert.equal(rows.length, 2);

  const out = rows.find(r => r.reason === 'transfer-out');
  const incoming = rows.find(r => r.reason === 'transfer-in');
  /**
   * Their own reasons rather than a pair of adjustments: nothing was wrong,
   * nothing changed in total, and filing it as an adjustment would make every
   * transfer look like a stock discrepancy in the one report people read to find
   * stock discrepancies.
   */
  assert.equal(out.locationName, main.name);
  assert.equal(out.transferLocationName, second.name);
  assert.equal(incoming.locationName, second.name);
  assert.equal(String(incoming.transferPairId), String(out._id));
  assert.equal(String(out.transferPairId), String(incoming._id));
  // Signed like everything else in this ledger, so a balance is a $sum.
  assert.equal(out.quantity, -3);
  assert.equal(incoming.quantity, 3);
}));

test('a location list says what each warehouse holds', maybe(async () => {
  const tenant = await registerOrg();
  const [main] = await locations(tenant.token);
  const second = await makeLocation(tenant.token, 'Counted Godown', { code: 'CNT' });
  const item = await createItem(tenant.token, { name: 'Counted Rod', itemCode: 'CNT-1', stockQty: 0 });
  await call('POST', `/reports/stock/${item._id}/adjust`, {
    token: tenant.token, body: { quantity: 7, note: 'in', unitCost: 200, locationId: second._id }
  });

  const list = await locations(tenant.token);
  const row = list.find(l => String(l._id) === String(second._id));
  assert.equal(row.quantity, 7);
  assert.equal(row.value, 1400);
  assert.equal(row.itemCount, 1);
  assert.equal(list.find(l => String(l._id) === String(main._id)).quantity, 0);

  const perItem = await call('GET', `/reports/stock/${item._id}/locations`, { token: tenant.token });
  assert.equal(perItem.status, 200);
  assert.equal(perItem.body.balances.length, 1);
  assert.equal(perItem.body.balances[0].locationName, 'Counted Godown');
}));

test('two warehouses cannot share a name', maybe(async () => {
  const tenant = await registerOrg();
  await makeLocation(tenant.token, 'Duplicate Godown');
  const { status, body } = await call('POST', '/reports/stock/locations', {
    token: tenant.token, body: { name: 'Duplicate Godown' }
  });
  // Otherwise a transfer form offers two identical options and the operator has
  // no way to tell which is which.
  assert.equal(status, 409);
  assert.equal(body.code, 'LOCATION_EXISTS');
}));

test('one tenant cannot transfer into another tenant warehouse', maybe(async () => {
  const mine = await registerOrg();
  const theirs = await registerOrg();
  const [myMain] = await locations(mine.token);
  const theirGodown = await makeLocation(theirs.token, 'Their Godown');
  const item = await createItem(mine.token, { name: 'Isolated Rod', itemCode: 'ISO-1', stockQty: 0 });
  await call('POST', `/reports/stock/${item._id}/adjust`, {
    token: mine.token, body: { quantity: 5, note: 'in', unitCost: 100, locationId: myMain._id }
  });

  const { status, body } = await transfer(mine.token, {
    fromLocationId: myMain._id, toLocationId: theirGodown._id, lines: [{ itemId: item._id, quantity: 2 }]
  });
  // Resolution is scoped by orgId, so another tenant's warehouse simply does not
  // exist from here.
  assert.equal(status, 400);
  assert.equal(body.code, 'LOCATION_NOT_FOUND');
  assert.equal(await StockLocation.countDocuments({ orgId: mine.org._id }), 1);
}));

// ── Item 4: the signature reaches the invoice, and survives ──

/** A 2x1 PNG. Small, valid, and enough for pdfkit to embed. */
const TINY_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAAFUlEQVR4nGP8z8DAwMDAxMDAwMAAAB4EAgHrTIFTAAAAAElFTkSuQmCC';

/** How many images pdfkit actually embedded. The only honest way to ask whether
 *  a signature reached the page — a 200 and some bytes prove neither. */
function embeddedImages(buffer) {
  return (buffer.toString('latin1').match(/\/Subtype\s*\/Image/g) || []).length;
}

test('an uploaded signature is embedded in the rendered invoice', maybe(async () => {
  const tenant = await registerOrg();
  const saved = await call('PUT', '/organisations/current', {
    token: tenant.token,
    body: { brandingConfig: { invoiceDefaults: { signatureUrl: TINY_PNG, signatoryName: 'A Signatory' } } }
  });
  assert.equal(saved.status, 200, JSON.stringify(saved.body));
  assert.equal(saved.body.brandingConfig.invoiceDefaults.hasSignature, true);

  const client = await createClient(tenant.token);
  const invoice = await createInvoice(tenant.token, { clientId: client._id });
  const pdf = await call('GET', `/invoices/${invoice._id}/pdf`, { token: tenant.token });
  assert.equal(pdf.status, 200);
  assert.ok(embeddedImages(pdf.buffer) > 0, 'the signature has to actually reach the page');
}));

test('the write-only image fields are omitted from a response, not blanked', maybe(async () => {
  const tenant = await registerOrg();
  await call('PUT', '/organisations/current', {
    token: tenant.token,
    body: { brandingConfig: { logoUrl: TINY_PNG, invoiceDefaults: { signatureUrl: TINY_PNG } } }
  });

  const { body } = await call('GET', '/organisations/current', { token: tenant.token });
  const branding = body.brandingConfig;

  /**
   * They came back as `''`, and an empty string is not neutral: it is the
   * documented way to *remove* an image. So any client that read an
   * organisation, changed one unrelated field and sent it back erased the logo,
   * the letterhead and the signature — and got a 200 for it.
   *
   * Omitted, there is nothing to echo. The bytes are still reachable through the
   * asset URL, which is what a client actually needs.
   */
  assert.equal(branding.logoUrl, undefined, 'nothing to echo back');
  assert.equal(branding.headerImageUrl, undefined);
  assert.equal(branding.invoiceDefaults.signatureUrl, undefined);
  assert.ok(branding.logoAssetUrl, 'and the bytes are still reachable');
  assert.ok(branding.invoiceDefaults.signatureAssetUrl);
}));

test('a client that echoes the whole response back keeps its images', maybe(async () => {
  const tenant = await registerOrg();
  await call('PUT', '/organisations/current', {
    token: tenant.token,
    body: { brandingConfig: { invoiceDefaults: { signatureUrl: TINY_PNG } } }
  });

  // Exactly what a naive client does: read, change one field, send it all back.
  const read = await call('GET', '/organisations/current', { token: tenant.token });
  const echoed = { ...read.body.brandingConfig.invoiceDefaults, bankName: 'HDFC Bank' };
  const resaved = await call('PUT', '/organisations/current', {
    token: tenant.token, body: { brandingConfig: { invoiceDefaults: echoed } } }
  );
  assert.equal(resaved.status, 200);

  assert.equal(resaved.body.brandingConfig.invoiceDefaults.hasSignature, true, 'the signature survived');
  assert.equal(resaved.body.brandingConfig.invoiceDefaults.bankName, 'HDFC Bank', 'and the edit landed');

  /**
   * And the derived fields it echoed were not stored as if they were real. The
   * document would otherwise accumulate fields nothing reads, one of which
   * (`hasSignature`) then disagrees with whether an image is actually there.
   */
  const stored = await Organisation.findById(tenant.org._id).lean();
  const defaults = stored.brandingConfig.invoiceDefaults;
  assert.equal(defaults.hasSignature, undefined);
  assert.equal(defaults.signatureAssetUrl, undefined);
}));

test('an empty string still removes an image on purpose', maybe(async () => {
  const tenant = await registerOrg();
  await call('PUT', '/organisations/current', {
    token: tenant.token, body: { brandingConfig: { invoiceDefaults: { signatureUrl: TINY_PNG } } }
  });

  // Deliberately clearing it is a real thing to want, and stays supported —
  // the fix removed the *ambiguity*, not the capability.
  const cleared = await call('PUT', '/organisations/current', {
    token: tenant.token, body: { brandingConfig: { invoiceDefaults: { signatureUrl: '' } } }
  });
  assert.equal(cleared.body.brandingConfig.invoiceDefaults.hasSignature, false);
}));

test('the signature line still prints when no image was uploaded', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token);
  const invoice = await createInvoice(tenant.token, { clientId: client._id });

  // `showSignature` used to draw a line with nothing above it because there was
  // nowhere to store a signature at all. The line and the name are still the
  // right output for a tenant who has not uploaded one — a document nobody can
  // sign is worse than a blank line.
  const pdf = await call('GET', `/invoices/${invoice._id}/pdf`, { token: tenant.token });
  assert.equal(pdf.status, 200);
  assert.ok(pdf.buffer.length > 1000, 'the invoice still renders');
}));
