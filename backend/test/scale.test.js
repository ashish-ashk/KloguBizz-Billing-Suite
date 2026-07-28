/**
 * Tests for the Phase 3 "make it scale" work.
 *
 * These cover the behaviours that are easy to break silently, because breaking
 * them produces a working-looking app with wrong numbers:
 *
 *  - Pagination that returns a page but an honest `total`, and a `limit` that
 *    cannot be raised past the ceiling.
 *  - Tenant isolation *through* pagination — the invariant that matters most, and
 *    one a page boundary could hide.
 *  - Overdue derived from the due date at read time, so the numbers are right
 *    without the scheduled sweep having run.
 *  - `saveMasters` no longer being a destructive delete-then-insert.
 *  - The org-delete cascade actually reaching every tenant-scoped collection.
 *  - Global settings being validated instead of accepted as arbitrary JSON.
 *  - Branding images served as cacheable assets rather than base64 in every
 *    payload.
 *
 * Skipped automatically when no MongoDB is reachable, so `npm test` still works
 * on a machine without one. CI treats that skip as a failure.
 */
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/klogubizz_scale_test';
process.env.NODE_ENV = 'test';
process.env.RAZORPAY_WEBHOOK_SECRET = 'test_webhook_secret';
process.env.JWT_SECRET = 'test_jwt_secret_used_only_by_the_scale_suite';

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const app = require('../server');
const { Plan } = require('../src/models/Plan');
const { Organisation } = require('../src/models/Organisation');
const { Invoice } = require('../src/models/Invoice');
const { Item } = require('../src/models/Item');
const { CreditNote } = require('../src/models/CreditNote');
const { ReminderLog } = require('../src/models/ReminderLog');
const { Master, AuditLog } = require('../src/models/Settings');
const { User } = require('../src/models/User');
const { sweepOverdueInvoices } = require('../src/services/maintenanceService');

let server;
let baseUrl;
let dbAvailable = false;

test.before(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 2000 });
    dbAvailable = true;
  } catch {
    console.warn('\n[scale] No MongoDB on 127.0.0.1:27017 — skipping integration tests.\n');
    return;
  }
  await mongoose.connection.dropDatabase();
  await Plan.create([
    // A generous invoice limit: several of these tests create dozens of invoices
    // to exercise paging, and the plan quota is not what is under test.
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
  const text = await response.text();
  let json;
  try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  return { status: response.status, body: json, headers: response.headers };
}

let counter = 0;
async function registerOrg() {
  counter += 1;
  const email = `scale${counter}@tenant${counter}.test`;
  const { status, body } = await call('POST', '/auth/register', {
    body: {
      name: `Admin ${counter}`,
      email,
      password: 'Password@123',
      orgName: `Scale Tenant ${counter}`,
      stateCode: '27',
      acceptTerms: true
    }
  });
  assert.equal(status, 201, `register failed: ${JSON.stringify(body)}`);
  return { token: body.token, org: body.organisation, email };
}

async function superadminToken() {
  const email = `platform-owner@klogubizz.test`;
  const existing = await User.findOne({ email });
  if (!existing) {
    const bcrypt = require('bcryptjs');
    await User.create({
      name: 'Platform Owner',
      email,
      passwordHash: await bcrypt.hash('Password@123', 12),
      role: 'superadmin',
      status: 'active'
    });
  }
  const login = await call('POST', '/auth/login', { body: { email, password: 'Password@123' } });
  assert.equal(login.status, 200, `superadmin login failed: ${JSON.stringify(login.body)}`);
  return login.body.token;
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
      dueDate: '2027-07-15',
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

// ── pagination (#40) ─────────────────────────────

test('a list endpoint returns one page plus an honest total', maybe(async () => {
  const a = await registerOrg();
  const client = await createClient(a.token);
  for (let i = 0; i < 12; i += 1) await createInvoice(a.token, client._id);

  const firstPage = await call('GET', '/invoices?limit=5', { token: a.token });
  assert.equal(firstPage.status, 200);
  assert.equal(firstPage.body.data.length, 5, 'the window is respected');
  // The point of the envelope: the caller can tell it is looking at a window.
  assert.equal(firstPage.body.total, 12);
  assert.equal(firstPage.body.pages, 3);
  assert.equal(firstPage.body.page, 1);
  assert.equal(firstPage.body.hasMore, true);

  const lastPage = await call('GET', '/invoices?limit=5&page=3', { token: a.token });
  assert.equal(lastPage.body.data.length, 2);
  assert.equal(lastPage.body.hasMore, false);

  // Pages must not overlap or skip: 5 + 5 + 2 distinct ids covering all 12.
  const second = await call('GET', '/invoices?limit=5&page=2', { token: a.token });
  const ids = new Set([...firstPage.body.data, ...second.body.data, ...lastPage.body.data].map(i => i._id));
  assert.equal(ids.size, 12, 'every invoice appears exactly once across the pages');
}));

test('limit is capped, so a caller cannot ask for the whole collection', maybe(async () => {
  const a = await registerOrg();
  const client = await createClient(a.token);
  await createInvoice(a.token, client._id);

  const huge = await call('GET', '/invoices?limit=100000', { token: a.token });
  assert.equal(huge.status, 200);
  // Clamped to MAX_LIMIT rather than honoured — this is the guard that stops the
  // unbounded read being reintroduced through the query string.
  assert.equal(huge.body.limit, 200);

  // Nonsense values fall back to the default instead of erroring or disabling the bound.
  for (const value of ['0', '-5', 'abc', '']) {
    const result = await call('GET', `/invoices?limit=${value}`, { token: a.token });
    assert.equal(result.status, 200, `limit=${value} should not fail the read`);
    assert.ok(result.body.limit > 0 && result.body.limit <= 200, `limit=${value} gave ${result.body.limit}`);
  }
}));

test('tenant isolation holds across every page, not just the first', maybe(async () => {
  const a = await registerOrg();
  const b = await registerOrg();
  const clientA = await createClient(a.token);
  const clientB = await createClient(b.token);
  for (let i = 0; i < 7; i += 1) await createInvoice(a.token, clientA._id);
  await createInvoice(b.token, clientB._id);

  // B sees exactly its own one invoice, and `total` proves nothing is hiding on a
  // later page.
  const bList = await call('GET', '/invoices?limit=2', { token: b.token });
  assert.equal(bList.body.total, 1);
  assert.equal(bList.body.data.length, 1);

  // Walking every page of B's list must never surface one of A's documents.
  const aIds = new Set((await call('GET', '/invoices?limit=200', { token: a.token })).body.data.map(i => i._id));
  for (let page = 1; page <= 4; page += 1) {
    const result = await call('GET', `/invoices?limit=2&page=${page}`, { token: b.token });
    result.body.data.forEach(invoice => {
      assert.ok(!aIds.has(invoice._id), `tenant A's invoice leaked onto B's page ${page}`);
    });
  }
}));

test('server-side search filters in the database rather than the browser', maybe(async () => {
  const a = await registerOrg();
  const client = await createClient(a.token);
  const target = await createInvoice(a.token, client._id);
  for (let i = 0; i < 3; i += 1) await createInvoice(a.token, client._id);

  const found = await call('GET', `/invoices?q=${encodeURIComponent(target.invoiceNumber)}`, { token: a.token });
  assert.equal(found.body.total, 1);
  assert.equal(found.body.data[0]._id, target._id);

  // A regex metacharacter must be treated as a literal, not compiled — an
  // unescaped `(` is a 500 and an unescaped `.*` is a full scan disguised as a
  // search.
  for (const term of ['(', '.*', '[', '\\', '?']) {
    const result = await call('GET', `/invoices?q=${encodeURIComponent(term)}`, { token: a.token });
    assert.equal(result.status, 200, `q=${term} should not error`);
    assert.equal(result.body.total, 0, `q=${term} should match nothing literally`);
  }
}));

// ── overdue derived at read time (#43) ───────────

test('an invoice past its due date reads as overdue without the sweep having run', maybe(async () => {
  const a = await registerOrg();
  const client = await createClient(a.token);
  const invoice = await createInvoice(a.token, client._id, {
    date: '2026-01-01',
    dueDate: '2026-01-15',
    items: [{ desc: 'Job', qty: 1, rate: 10000, gstRate: 0 }]
  });

  // Force the stored status to the pre-sweep value, so this proves the *read*
  // derives the state rather than reading a flag a background job set.
  await Invoice.updateOne({ _id: invoice._id }, { $set: { status: 'pending' } });

  const overdueFilter = await call('GET', '/invoices?status=overdue', { token: a.token });
  assert.equal(overdueFilter.body.total, 1, 'the overdue filter finds it with a stale stored status');

  const stats = await call('GET', '/invoices/stats', { token: a.token });
  assert.equal(stats.body.overdueAmount, 10000, 'the dashboard counts it as overdue');
  assert.equal(stats.body.pendingAmount, 0, 'and not also as pending');

  // The mirror image: it must not appear under the not-yet-due filter.
  const pendingFilter = await call('GET', '/invoices?status=pending', { token: a.token });
  assert.equal(pendingFilter.body.total, 0);
}));

test('an invoice with no due date is never treated as overdue', maybe(async () => {
  const a = await registerOrg();
  const client = await createClient(a.token);
  const invoice = await createInvoice(a.token, client._id, {
    items: [{ desc: 'Job', qty: 1, rate: 4000, gstRate: 0 }]
  });
  // A null date sorts before every real date in MongoDB, so a bare `$lt` on it
  // would report this as overdue. Both the query and the aggregation guard against
  // that; this is the test that keeps them honest.
  await Invoice.updateOne({ _id: invoice._id }, { $unset: { dueDate: '' }, $set: { status: 'pending' } });

  const overdue = await call('GET', '/invoices?status=overdue', { token: a.token });
  assert.equal(overdue.body.total, 0);

  const stats = await call('GET', '/invoices/stats', { token: a.token });
  assert.equal(stats.body.overdueAmount, 0);
  assert.equal(stats.body.pendingAmount, 4000);
}));

test('the scheduled sweep ages past-due invoices across every tenant in one write', maybe(async () => {
  const a = await registerOrg();
  const b = await registerOrg();
  const clientA = await createClient(a.token);
  const clientB = await createClient(b.token);
  const invA = await createInvoice(a.token, clientA._id, { date: '2026-01-01', dueDate: '2026-01-10' });
  const invB = await createInvoice(b.token, clientB._id, { date: '2026-01-01', dueDate: '2026-01-10' });
  await Invoice.updateMany({ _id: { $in: [invA._id, invB._id] } }, { $set: { status: 'pending' } });

  const result = await sweepOverdueInvoices();
  assert.ok(result.updated >= 2, `expected at least both tenants' invoices, got ${result.updated}`);

  // Both tenants, from a single global write.
  assert.equal((await Invoice.findById(invA._id)).status, 'overdue');
  assert.equal((await Invoice.findById(invB._id)).status, 'overdue');
}));

test('the unpaid filter returns everything with a balance, however aged', maybe(async () => {
  const a = await registerOrg();
  const client = await createClient(a.token);
  const future = await createInvoice(a.token, client._id, { dueDate: '2027-01-01' });
  const past = await createInvoice(a.token, client._id, { date: '2026-01-01', dueDate: '2026-01-05' });
  const settled = await createInvoice(a.token, client._id);
  await call('POST', `/invoices/${settled._id}/mark-paid`, { token: a.token, body: {} });

  const unpaid = await call('GET', '/invoices?status=unpaid&limit=200', { token: a.token });
  const ids = unpaid.body.data.map(i => i._id);
  assert.ok(ids.includes(future._id), 'a not-yet-due invoice is still owed');
  assert.ok(ids.includes(past._id), 'an overdue invoice is still owed');
  assert.ok(!ids.includes(settled._id), 'a paid invoice is not');
}));

// ── masters are no longer destructively replaced (#47) ──

test('saving masters updates in place and only deletes what was removed', maybe(async () => {
  const token = await superadminToken();

  const first = await call('PUT', '/superadmin/masters/gstRate', {
    token,
    body: [
      { code: '5', label: '5%', rate: 5 },
      { code: '18', label: '18%', rate: 18 },
      { code: '28', label: '28%', rate: 28 }
    ]
  });
  assert.equal(first.status, 200);
  const idsBefore = Object.fromEntries((await Master.find({ type: 'gstRate' }).lean()).map(m => [m.code, String(m._id)]));

  // Re-save with one row relabelled, one dropped, one added.
  const second = await call('PUT', '/superadmin/masters/gstRate', {
    token,
    body: [
      { code: '5', label: '5% (revised)', rate: 5 },
      { code: '18', label: '18%', rate: 18 },
      { code: '3', label: '3% (gold)', rate: 3 }
    ]
  });
  assert.equal(second.status, 200);

  const after = await Master.find({ type: 'gstRate' }).lean();
  const byCode = Object.fromEntries(after.map(m => [m.code, m]));
  assert.deepEqual(Object.keys(byCode).sort(), ['18', '3', '5']);
  assert.equal(byCode['5'].label, '5% (revised)', 'an existing row is updated');
  assert.equal(byCode['28'], undefined, 'a removed row is deleted');

  // Ids are stable for surviving rows. The old implementation rotated every `_id`
  // on every save, so nothing could hold a durable reference to a master.
  assert.equal(String(byCode['5']._id), idsBefore['5'], 'ids survive a save');
  assert.equal(String(byCode['18']._id), idsBefore['18']);
}));

test('a master row without a code is refused rather than duplicated on every save', maybe(async () => {
  const token = await superadminToken();
  const result = await call('PUT', '/superadmin/masters/unit', {
    token,
    body: [{ code: 'Nos', label: 'Numbers' }, { label: 'No code here' }]
  });
  assert.equal(result.status, 400);
  assert.match(result.body.message, /code/i);

  const duplicate = await call('PUT', '/superadmin/masters/unit', {
    token,
    body: [{ code: 'Kg', label: 'Kilogram' }, { code: 'kg', label: 'Kilogram again' }]
  });
  assert.equal(duplicate.status, 409, 'a case-insensitive duplicate code is rejected');
}));

// ── global settings validation (#64) ─────────────

test('a malformed branding payload is rejected instead of breaking the login page', maybe(async () => {
  const token = await superadminToken();

  const good = await call('PUT', '/superadmin/settings/branding', {
    token,
    body: { appName: 'Klogu Bizz', primaryColor: '#4F46E5' }
  });
  assert.equal(good.status, 200);

  // `branding` is served unauthenticated to every visitor. A colour that isn't a
  // colour used to be stored happily and then break the page for everyone.
  const badColour = await call('PUT', '/superadmin/settings/branding', {
    token,
    body: { appName: 'Klogu Bizz', primaryColor: 'not-a-colour' }
  });
  assert.equal(badColour.status, 400);
  assert.equal(badColour.body.code, 'INVALID_SETTING');

  const badEmail = await call('PUT', '/superadmin/settings/branding', {
    token,
    body: { supportEmail: 'definitely not an email' }
  });
  assert.equal(badEmail.status, 400);

  // An unknown key is a typo or a stale client; storing it writes a row nothing
  // will ever read.
  const unknown = await call('PUT', '/superadmin/settings/nonsense-key', { token, body: { a: 1 } });
  assert.equal(unknown.status, 400);
  assert.equal(unknown.body.code, 'UNKNOWN_SETTING');

  // And the good value is still intact after the rejected ones.
  const settings = await call('GET', '/superadmin/settings', { token });
  assert.equal(settings.body.branding.primaryColor, '#4F46E5');
}));

test('an unknown platform template id cannot be made the default', maybe(async () => {
  const token = await superadminToken();
  const bad = await call('PUT', '/superadmin/settings/defaultInvoiceTemplate', {
    token,
    body: { templateId: 'a-template-that-does-not-exist' }
  });
  assert.equal(bad.status, 400);

  const good = await call('PUT', '/superadmin/settings/defaultInvoiceTemplate', {
    token,
    body: { templateId: 'corporate-formal', accentColor: '#111111' }
  });
  assert.equal(good.status, 200);
}));

// ── org delete cascade (#36) ─────────────────────

test('deleting a tenant removes every one of its collections but keeps the audit trail', maybe(async () => {
  const a = await registerOrg();
  const token = await superadminToken();
  const client = await createClient(a.token);
  const invoice = await createInvoice(a.token, client._id);

  // One document in each tenant-scoped collection the cascade used to miss.
  await call('POST', '/items', {
    token: a.token,
    body: { name: 'Widget', unit: 'Nos', gstRate: 18, sellingPrice: 100 }
  });
  const credit = await call('POST', '/credit-notes', { token: a.token, body: { invoiceId: invoice._id } });
  assert.equal(credit.status, 201, `credit note failed: ${JSON.stringify(credit.body)}`);
  const orgId = a.org._id;
  await ReminderLog.create({ orgId, invoiceId: invoice._id, stage: 'manual', to: 'x@y.test', status: 'sent' });

  assert.ok(await Item.countDocuments({ orgId }) > 0, 'precondition: the item exists');
  assert.ok(await CreditNote.countDocuments({ orgId }) > 0, 'precondition: the credit note exists');
  assert.ok(await ReminderLog.countDocuments({ orgId }) > 0, 'precondition: the reminder log exists');

  const deleted = await call('DELETE', `/superadmin/organisations/${orgId}`, {
    token,
    body: { confirmName: a.org.name }
  });
  assert.equal(deleted.status, 204);

  // Items, credit notes and reminder logs were the three the cascade missed —
  // they used to be orphaned forever, pointing at an organisation that was gone.
  for (const [name, Model] of [['items', Item], ['credit notes', CreditNote], ['reminder logs', ReminderLog], ['invoices', Invoice]]) {
    assert.equal(await Model.countDocuments({ orgId }), 0, `${name} should be gone`);
  }
  assert.equal(await Organisation.countDocuments({ _id: orgId }), 0);
  assert.equal(await User.countDocuments({ orgId }), 0);

  // The audit trail is deliberately *not* cascaded: it is the record of what was
  // done, including this deletion.
  const trail = await AuditLog.countDocuments({ orgId });
  assert.ok(trail > 0, 'the audit trail for a deleted tenant is retained');
}));

test('deleting a tenant refuses a mismatched confirmation name', maybe(async () => {
  const a = await registerOrg();
  const token = await superadminToken();
  const result = await call('DELETE', `/superadmin/organisations/${a.org._id}`, {
    token,
    body: { confirmName: 'Some Other Tenant' }
  });
  assert.equal(result.status, 400);
  assert.equal(result.body.code, 'CONFIRMATION_MISMATCH');
  assert.equal(await Organisation.countDocuments({ _id: a.org._id }), 1, 'the tenant survives');
}));

// ── branding assets (#45) ────────────────────────

// A 1x1 transparent PNG, as the uploader would send it.
const TINY_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8AAAwAB/AEBQ0iSAAAAAElFTkSuQmCC';

test('a logo is served as a cacheable asset and is absent from the hot payloads', maybe(async () => {
  const a = await registerOrg();

  const saved = await call('PUT', '/organisations/current', {
    token: a.token,
    body: { brandingConfig: { logoUrl: TINY_PNG } }
  });
  assert.equal(saved.status, 200);

  // The response advertises the asset, not the bytes.
  const branding = saved.body.brandingConfig;
  assert.equal(branding.logoUrl, '', 'the base64 is not echoed back');
  assert.equal(branding.hasLogo, true);
  assert.match(branding.logoAssetUrl, /^\/assets\/org\/[0-9a-f]{24}\/logo\?v=[0-9a-f]{16}$/);

  // /auth/me is called on every page load — this is the payload that mattered.
  const me = await call('GET', '/auth/me', { token: a.token });
  assert.equal(me.body.organisation.brandingConfig.logoUrl, '');
  assert.ok(me.body.organisation.brandingConfig.logoAssetUrl);

  // The asset itself serves the real image, immutably cacheable because the URL
  // carries a content hash.
  const assetPath = branding.logoAssetUrl;
  const asset = await fetch(`${baseUrl}${assetPath}`);
  assert.equal(asset.status, 200);
  assert.equal(asset.headers.get('content-type'), 'image/png');
  assert.match(asset.headers.get('cache-control'), /immutable/);
  const etag = asset.headers.get('etag');
  assert.ok(etag);

  // A conditional request is answered 304, with no body.
  const revalidated = await fetch(`${baseUrl}${assetPath}`, { headers: { 'If-None-Match': etag } });
  assert.equal(revalidated.status, 304);
}));

test('an unrelated branding save does not blank the logo', maybe(async () => {
  const a = await registerOrg();
  await call('PUT', '/organisations/current', {
    token: a.token,
    body: { brandingConfig: { logoUrl: TINY_PNG } }
  });

  // This is the regression the merge semantics exist to prevent: the client no
  // longer holds the logo's bytes, so a whole-object write would destroy it.
  const recoloured = await call('PUT', '/organisations/current', {
    token: a.token,
    body: { brandingConfig: { primaryColor: '#ff0000' } }
  });
  assert.equal(recoloured.status, 200);
  assert.equal(recoloured.body.brandingConfig.primaryColor, '#ff0000');
  assert.equal(recoloured.body.brandingConfig.hasLogo, true, 'the logo survived an unrelated save');

  // The stored value really is still the image, not a URL that happened to be
  // echoed back into the field.
  const org = await Organisation.findById(a.org._id).lean();
  assert.ok(org.brandingConfig.logoUrl.startsWith('data:image/png;base64,'));

  // And an explicit empty string still clears it.
  const cleared = await call('PUT', '/organisations/current', {
    token: a.token,
    body: { brandingConfig: { logoUrl: '' } }
  });
  assert.equal(cleared.body.brandingConfig.hasLogo, false);
  assert.equal(cleared.body.brandingConfig.logoAssetUrl, '');
}));

test('the public branding endpoint returns asset urls, not base64', maybe(async () => {
  const token = await superadminToken();
  await call('PUT', '/superadmin/settings/branding', {
    token,
    body: { appName: 'Klogu Bizz', logoUrl: TINY_PNG }
  });

  // Unauthenticated, and hit by every visitor to the login page.
  const publicBranding = await call('GET', '/public/branding');
  assert.equal(publicBranding.status, 200);
  assert.equal(publicBranding.body.logoUrl, '', 'no base64 on the unauthenticated path');
  assert.match(publicBranding.body.logoAssetUrl, /^\/assets\/platform\/logo\?v=[0-9a-f]{16}$/);

  const asset = await fetch(`${baseUrl}${publicBranding.body.logoAssetUrl}`);
  assert.equal(asset.status, 200);
  assert.match(asset.headers.get('cache-control'), /immutable/);
}));

test('a missing asset is a 404 rather than an empty 200', maybe(async () => {
  const a = await registerOrg();
  const noLogo = await fetch(`${baseUrl}/assets/org/${a.org._id}/logo`);
  assert.equal(noLogo.status, 404);

  const unknownKind = await fetch(`${baseUrl}/assets/org/${a.org._id}/not-a-kind`);
  assert.equal(unknownKind.status, 404);

  // A malformed id is a client error, not a 500.
  const badId = await fetch(`${baseUrl}/assets/org/not-an-object-id/logo`);
  assert.equal(badId.status, 400);
}));

// ── audit console (#39) ──────────────────────────

test('the audit log is filterable, paginated and exportable', maybe(async () => {
  const a = await registerOrg();
  const token = await superadminToken();
  const client = await createClient(a.token);
  await createInvoice(a.token, client._id);

  const all = await call('GET', '/superadmin/audit-logs?limit=5', { token });
  assert.equal(all.status, 200);
  assert.ok(all.body.total > 0);
  assert.ok(all.body.data.length <= 5);

  // A prefix match on the action, which is what makes the trail navigable.
  const invoiceEvents = await call('GET', '/superadmin/audit-logs?action=invoice.', { token });
  assert.ok(invoiceEvents.body.total > 0);
  invoiceEvents.body.data.forEach(row => assert.match(row.action, /^invoice\./));

  const byOrg = await call('GET', `/superadmin/audit-logs?orgId=${a.org._id}`, { token });
  assert.ok(byOrg.body.total > 0);
  byOrg.body.data.forEach(row => assert.equal(String(row.orgId), String(a.org._id)));

  const badDate = await call('GET', '/superadmin/audit-logs?from=not-a-date', { token });
  assert.equal(badDate.status, 400);

  const csv = await fetch(`${baseUrl}/superadmin/audit-logs/export.csv`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert.equal(csv.status, 200);
  assert.match(csv.headers.get('content-type'), /text\/csv/);
  const text = await csv.text();
  assert.match(text.split('\r\n')[0], /^Timestamp,Organisation,Actor/);
}));

test('an audit entry cannot be modified', maybe(async () => {
  const entry = await AuditLog.create({ action: 'test.immutability', entity: 'test' });

  // The trail is evidence. No route exposes an update today, but the model itself
  // refuses so a future generic `PUT` cannot quietly make it mutable.
  await assert.rejects(
    () => AuditLog.findByIdAndUpdate(entry._id, { action: 'tampered' }),
    /append-only/
  );
  await assert.rejects(
    () => AuditLog.updateOne({ _id: entry._id }, { $set: { action: 'tampered' } }),
    /append-only/
  );

  const reread = await AuditLog.findById(entry._id).lean();
  assert.equal(reread.action, 'test.immutability');
}));

// ── streamed exports ─────────────────────────────

test('a CSV export covers the whole filtered set, not the current page', maybe(async () => {
  const a = await registerOrg();
  const client = await createClient(a.token);
  for (let i = 0; i < 12; i += 1) await createInvoice(a.token, client._id);

  // Deliberately passing a small limit: an export is expected to be complete, so
  // the paging parameters must not silently truncate it.
  const csv = await fetch(`${baseUrl}/invoices/export.csv?limit=2`, {
    headers: { Authorization: `Bearer ${a.token}` }
  });
  assert.equal(csv.status, 200);
  const rows = (await csv.text()).trim().split('\r\n');
  assert.equal(rows.length, 13, 'a header plus every invoice');
  assert.match(rows[0], /^Invoice Number,Client,GSTIN/);
}));

// ── invoice numbering (#66) ──────────────────────

test('invoice number padding is configurable and never truncates', maybe(async () => {
  const a = await registerOrg();
  const client = await createClient(a.token);

  await call('PUT', '/organisations/current', {
    token: a.token,
    body: { brandingConfig: { invoiceNumberPadding: 5 } }
  });
  const wide = await createInvoice(a.token, client._id);
  assert.match(wide.invoiceNumber, /-\d{5}$/, `expected 5-digit padding, got ${wide.invoiceNumber}`);

  // Past the configured width the digits continue rather than being cut — an
  // invoice number is a legal reference and must never be shortened.
  await Organisation.updateOne(
    { _id: a.org._id },
    { $set: { invoiceSequence: 999999, 'brandingConfig.invoiceNumberPadding': 3 } }
  );
  const overflow = await createInvoice(a.token, client._id);
  assert.match(overflow.invoiceNumber, /-1000000$/, `expected the full number, got ${overflow.invoiceNumber}`);
}));

// ── request correlation (#57) ────────────────────

test('every response carries a request id, and an error echoes it', maybe(async () => {
  const ok = await fetch(`${baseUrl}/public/branding`);
  assert.ok(ok.headers.get('x-request-id'), 'the header is always present');

  // A caller-supplied id is honoured so a trace survives across a proxy.
  const supplied = await fetch(`${baseUrl}/public/branding`, { headers: { 'X-Request-Id': 'my-trace-123' } });
  assert.equal(supplied.headers.get('x-request-id'), 'my-trace-123');

  // Anything unbounded or unsafe in that header is sanitised — it lands in log
  // lines and in a response header.
  const hostile = await fetch(`${baseUrl}/public/branding`, {
    headers: { 'X-Request-Id': 'a'.repeat(500) }
  });
  assert.ok(hostile.headers.get('x-request-id').length <= 64);

  // And the id is in the error body, so a user can quote it in a support request.
  const notFound = await call('GET', '/invoices/000000000000000000000000', { token: (await registerOrg()).token });
  assert.equal(notFound.status, 404);
  assert.ok(notFound.body.requestId, 'an error response carries the request id');
}));
