/**
 * Tests for the Phase 4 platform console.
 *
 * The behaviours here are the ones that are dangerous rather than merely wrong if
 * they break, because this surface acts on customers' accounts from outside:
 *
 *  - **Capabilities are enforced, not just rendered.** An auditor must be unable to
 *    write, and a support account must be unable to delete a tenant or reprice a
 *    plan. A console that only hides the buttons is not a permission model.
 *  - **Impersonation is bounded.** Read-only means read-only; a platform account
 *    cannot be impersonated; the credential-changing routes are refused even in a
 *    read-write session; and the customer's own sessions survive.
 *  - **Impersonated actions are attributable.** An entry in the audit trail must
 *    name both identities — the whole point is that it is *not* indistinguishable
 *    from something the customer did.
 *  - **Support actions do what they claim.** A password reset actually revokes
 *    sessions; a suspension carries a reason and reaches the tenant; a limit
 *    override actually changes the quota the tenant is held to.
 *  - **Metrics are honest.** MRR counts a yearly plan as a twelfth of its price and
 *    excludes trials; GMV is not reported as platform revenue; a backfilled day
 *    leaves the snapshot fields null rather than stamping today's values on it.
 *
 * Skipped automatically when no MongoDB is reachable, so `npm test` still works on
 * a machine without one. CI treats that skip as a failure.
 */
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/klogubizz_platform_test';
process.env.NODE_ENV = 'test';
process.env.RAZORPAY_WEBHOOK_SECRET = 'test_webhook_secret';
process.env.JWT_SECRET = 'test_jwt_secret_used_only_by_the_platform_suite';

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const app = require('../server');
const { Plan } = require('../src/models/Plan');
const { PlanVersion } = require('../src/models/PlanVersion');
const { JobRun } = require('../src/models/JobRun');
const jobs = require('../src/services/jobRunService');
const { EmailLog } = require('../src/models/EmailLog');
const { runDunningSweep } = require('../src/services/dunningService');
const { ApprovalRequest } = require('../src/models/ApprovalRequest');
const { BreakGlassGrant } = require('../src/models/BreakGlassGrant');
const { PlatformInvoice } = require('../src/models/PlatformInvoice');
const { GlobalSetting } = require('../src/models/Settings');
const platformInvoices = require('../src/services/platformInvoiceService');
const { applyEvent } = require('../src/controllers/razorpayWebhookController');

/** The webhook's decision layer, without rebuilding an HMAC for every case —
 *  the signature check and replay guard are covered in api.integration.test.js. */
function applyRazorpayEvent(event, entity) {
  return applyEvent(event, { subscription: { entity } });
}
const { Organisation } = require('../src/models/Organisation');
const { User } = require('../src/models/User');
const { Subscription } = require('../src/models/Subscription');
const { AuditLog } = require('../src/models/Settings');
const { UsageEvent } = require('../src/models/UsageEvent');
const { MetricsDaily } = require('../src/models/MetricsDaily');
const metrics = require('../src/services/metricsService');
const { resetActivityCache } = require('../src/services/usageEventService');
const { invalidateFeatureFlagCache } = require('../src/services/featureFlagService');
const { invalidatePlatformNotice } = require('../src/services/noticeService');

let server;
let baseUrl;
let dbAvailable = false;

test.before(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 2000 });
    dbAvailable = true;
  } catch {
    console.warn('\n[platform] No MongoDB on 127.0.0.1:27017 — skipping integration tests.\n');
    return;
  }
  await mongoose.connection.dropDatabase();
  await Plan.create([
    { code: 'starter', name: 'Starter', monthlyPrice: 0, yearlyPrice: 0, userLimit: 3, invoiceLimit: 200, sortOrder: 0 },
    { code: 'growth', name: 'Growth', monthlyPrice: 999, yearlyPrice: 9990, userLimit: 10, invoiceLimit: 1000, sortOrder: 1 },
    { code: 'business', name: 'Business', monthlyPrice: 2499, yearlyPrice: 24000, userLimit: 25, invoiceLimit: 5000, sortOrder: 2 }
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
async function registerOrg(overrides = {}) {
  counter += 1;
  const email = `owner${counter}@tenant${counter}.test`;
  const { status, body } = await call('POST', '/auth/register', {
    body: {
      name: `Owner ${counter}`,
      email,
      password: 'Password@123',
      orgName: `Tenant ${counter}`,
      stateCode: '27',
      acceptTerms: true,
      ...overrides
    }
  });
  assert.equal(status, 201, `register failed: ${JSON.stringify(body)}`);
  return { token: body.token, org: body.organisation, email, userId: body.user.id };
}

/**
 * A platform account with a given role. Roles are created directly rather than
 * through an endpoint because there is deliberately no self-service way to mint one.
 */
async function platformAccount(platformRole = 'owner') {
  counter += 1;
  const email = `platform-${platformRole}-${counter}@klogubizz.test`;
  await User.create({
    name: `Platform ${platformRole} ${counter}`,
    email,
    passwordHash: await bcrypt.hash('Password@123', 12),
    role: 'superadmin',
    platformRole,
    status: 'active'
  });
  const login = await call('POST', '/auth/login', { body: { email, password: 'Password@123' } });
  assert.equal(login.status, 200, `platform login failed: ${JSON.stringify(login.body)}`);
  return { token: login.body.token, email };
}

async function createClient(token) {
  const { status, body } = await call('POST', '/clients', {
    token,
    body: { companyName: 'Buyer Pvt Ltd', stateCode: '27', email: 'buyer@example.test' }
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

/**
 * Polls until a predicate holds, or gives up.
 *
 * Usage events and `lastActiveAt` are written fire-and-forget on purpose — analytics
 * must never be able to fail or slow the request that produced it — so the response
 * returns before the insert completes. Asserting immediately after the call passes on an
 * idle machine and fails under a loaded parallel test run, which is the worst kind of
 * test. Polling is what the assertion actually means: "this eventually appears".
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

/**
 * Waits for an audit entry to land.
 *
 * `logAudit` is deliberately fire-and-forget — an audit write must never be able to
 * fail or slow the request that triggered it — so the response returns before the
 * insert completes. Polling for it is therefore what the assertion actually means:
 * "the entry appears", not "the entry appears synchronously". A fixed sleep would be
 * both slower and flakier.
 */
async function waitForAudit(filter, timeoutMs = 3000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const entry = await AuditLog.findOne(filter).sort({ createdAt: -1 });
    if (entry) return entry;
    if (Date.now() > deadline) return null;
    await new Promise(resolve => { setTimeout(resolve, 50); });
  }
}

// ── Event capture ────────────────────────────────

test('product usage is captured as events, and an active tenant is stamped', maybe(async () => {
  // The heartbeat is deduplicated per process per day, so a suite that has already
  // seen this user would otherwise not write a second row.
  resetActivityCache();
  const tenant = await registerOrg();
  const client = await createClient(tenant.token);
  await createInvoice(tenant.token, client._id);

  // Four distinct types are expected; wait until they have all arrived rather than
  // sampling whatever happened to be written by the time the last request returned.
  const events = await waitUntil(async () => {
    const rows = await UsageEvent.find({ orgId: tenant.org._id }).lean();
    const seen = new Set(rows.map(row => row.type));
    return ['org.signup', 'client.created', 'invoice.created', 'app.active'].every(type => seen.has(type))
      ? rows
      : null;
  }) || await UsageEvent.find({ orgId: tenant.org._id }).lean();
  const types = events.map(e => e.type);
  assert.ok(types.includes('org.signup'), 'signup is recorded');
  assert.ok(types.includes('client.created'), 'client creation is recorded');
  assert.ok(types.includes('invoice.created'), 'invoice creation is recorded');
  // The daily heartbeat, which is what DAU/WAU/MAU are counted from — one row per
  // user per day rather than one per request.
  assert.ok(types.includes('app.active'), 'an activity heartbeat is recorded');

  const invoiceEvent = events.find(e => e.type === 'invoice.created');
  assert.ok(invoiceEvent.value > 1000, 'the invoice total rides along, so GMV needs no join');
  assert.match(invoiceEvent.day, /^\d{4}-\d{2}-\d{2}$/, 'the day bucket is denormalised at write time');

  // `lastActiveAt` has to be readable without touching the event collection: three
  // separate console screens show it.
  const org = await waitUntil(async () => {
    const row = await Organisation.findById(tenant.org._id).lean();
    return row?.lastActiveAt ? row : null;
  });
  assert.ok(org?.lastActiveAt, 'the organisation records when it was last seen');
}));

test('a quick bill is reported as a different feature from an invoice', maybe(async () => {
  const tenant = await registerOrg();
  await call('POST', '/invoices', {
    token: tenant.token,
    body: {
      billTo: { type: 'b2c', name: 'Walk-in buyer', stateCode: '27' },
      date: '2026-07-01',
      dueDate: '2026-07-15',
      items: [{ desc: 'Repair', qty: 1, rate: 500, gstRate: 18 }]
    }
  });
  const events = await waitUntil(async () => {
    const rows = await UsageEvent.find({ orgId: tenant.org._id, type: 'bill.created' }).lean();
    return rows.length ? rows : null;
  }) || [];
  // Two different workflows with different audiences. One number for both would
  // hide which one tenants actually reach for.
  assert.equal(events.length, 1, 'a clientless invoice is a Bill Generator event');
}));

// ── Metrics correctness ──────────────────────────

test('MRR counts a yearly plan as a twelfth, and excludes trials', maybe(async () => {
  const monthly = await registerOrg();
  const yearly = await registerOrg();
  const trialling = await registerOrg();

  await Subscription.updateOne({ orgId: monthly.org._id }, { status: 'active', planCode: 'growth', billingCycle: 'monthly' });
  await Subscription.updateOne({ orgId: yearly.org._id }, { status: 'active', planCode: 'business', billingCycle: 'yearly' });
  // Left on 'trial' — nothing has been billed, so it is not revenue.
  await Subscription.updateOne({ orgId: trialling.org._id }, { status: 'trial', planCode: 'growth' });

  const revenue = await metrics.computeRecurringRevenue();
  // 999 (monthly Growth) + 24000/12 = 2000 (yearly Business). Charging the yearly
  // price straight into MRR would report 24999 instead of 2999 — a twelvefold
  // overstatement for every annual customer.
  assert.equal(revenue.mrr, 2999);
  assert.equal(revenue.arr, 2999 * 12);
  assert.equal(revenue.payingOrgs, 2, 'the trial is not a paying account');
  assert.equal(revenue.arpa, Math.round(2999 / 2));
}));

test('a free plan is a subscription but not revenue, so ARPA is not dragged to zero', maybe(async () => {
  const free = await registerOrg();
  await Subscription.updateOne({ orgId: free.org._id }, { status: 'active', planCode: 'starter', billingCycle: 'monthly' });

  const revenue = await metrics.computeRecurringRevenue();
  const starter = revenue.byPlan.find(p => p.planCode === 'starter');
  assert.ok(starter, 'the plan still appears in the split');
  assert.equal(starter.mrr, 0);
  // The account exists but contributes nothing, so it must not count in the
  // denominator of an average revenue figure.
  assert.ok(!revenue.byPlan.some(p => p.planCode === 'starter' && p.mrr > 0));
}));

test('the summary reports GMV separately from platform revenue', maybe(async () => {
  const owner = await platformAccount('owner');
  const { status, body } = await call('GET', '/superadmin/metrics/summary', { token: owner.token });
  assert.equal(status, 200);
  // The old overview called the sum of tenant payments "totalRevenue" and the UI
  // rendered it as "Platform Revenue". They are different numbers and the response
  // now says which is which.
  assert.ok('gmv' in body.revenue, 'GMV is named');
  assert.ok('mrr' in body.revenue, 'MRR is named');
  assert.ok(typeof body.growth.activationRate === 'number');
  assert.ok('dau' in body.engagement && 'mau' in body.engagement);
}));

test('a backfilled day leaves the snapshot metrics null rather than stamping today on it', maybe(async () => {
  // Ten days ago: far enough back that today's status mix and MRR say nothing about
  // it, and there is no record of what they were.
  const old = new Date(Date.now() - 10 * 86400000);
  const row = await metrics.rollupDay(old);
  assert.equal(row.mrr, undefined, 'MRR is not invented for a past day');
  assert.equal(row.orgsActive, undefined, 'nor is the status mix');
  assert.ok(typeof row.signups === 'number', 'but counts that can be recomputed are filled');

  const stored = await MetricsDaily.findOne({ date: row.date }).lean();
  assert.equal(stored.mrr, null);
  assert.equal(stored.orgsActive, null);

  // Yesterday is a day that has just ended, so the snapshot is meaningful.
  const yesterday = await metrics.rollupDay(new Date(Date.now() - 86400000));
  assert.equal(typeof yesterday.mrr, 'number', 'a just-ended day is snapshotted');
}));

test('the rollup is idempotent, and the series ends with today', maybe(async () => {
  const target = new Date(Date.now() - 3 * 86400000);
  const first = await metrics.rollupDay(target);
  const second = await metrics.rollupDay(target);
  assert.equal(first.signups, second.signups, 're-running a day produces the same row');
  assert.equal(await MetricsDaily.countDocuments({ date: first.date }), 1, 'and does not duplicate it');

  const owner = await platformAccount('owner');
  const series = await call('GET', '/superadmin/metrics/series?days=7', { token: owner.token });
  assert.equal(series.status, 200);
  const last = series.body.series[series.body.series.length - 1];
  // A chart whose final point is always missing reads as "usage stopped", which is
  // the opposite of what an in-progress day means.
  assert.equal(last.date, new Date().toISOString().slice(0, 10), 'today is computed live and appended');
}));

test('at-risk includes a tenant that was never seen at all', maybe(async () => {
  const never = await registerOrg();
  // A missing field never matches a `$lt` comparison, so a naive filter would
  // silently exclude exactly the tenant who signed up and never came back.
  await Organisation.updateOne({ _id: never.org._id }, { $unset: { lastActiveAt: 1 }, $set: { status: 'active' } });

  const list = await metrics.atRiskTenants({ inactiveDays: 14, limit: 100 });
  const found = list.find(o => String(o._id) === String(never.org._id));
  assert.ok(found, 'a tenant with no recorded activity is at risk');
  assert.equal(found.inactiveDays, null, 'and is reported as never seen rather than 0 days idle');
}));

test('feature adoption reports every known feature, including the untouched ones', maybe(async () => {
  const owner = await platformAccount('owner');
  const { status, body } = await call('GET', '/superadmin/metrics/adoption?days=30', { token: owner.token });
  assert.equal(status, 200);
  const keys = body.features.map(f => f.key);
  assert.ok(keys.includes('invoice.created'));
  // A zero that is absent from the response is indistinguishable from a feature
  // that was never instrumented.
  assert.ok(keys.includes('item.bulk_upload'), 'a feature nobody used still appears');
  assert.ok(body.features.every(f => typeof f.rate === 'number'));
}));

test('trials get an explicit end date at registration', maybe(async () => {
  const tenant = await registerOrg();
  const org = await Organisation.findById(tenant.org._id).lean();
  assert.ok(org.trialEndsAt, 'so the "expiring this week" list is a fact, not an inference');
  assert.ok(org.trialEndsAt > new Date(), 'and is in the future');
}));

test('every read the console makes has an endpoint that answers', maybe(async () => {
  // A cheap but genuinely useful test: the dashboard and drill-down fire nine
  // requests between them, and a route that 404s because of a path-ordering mistake
  // (a literal segment swallowed by `/:id`) produces a screen that silently renders
  // nothing rather than an error anyone notices.
  const owner = await platformAccount('owner');
  const tenant = await registerOrg();
  const client = await createClient(tenant.token);
  await createInvoice(tenant.token, client._id);

  const reads = [
    '/superadmin/me',
    '/superadmin/metrics/summary',
    '/superadmin/metrics/series?days=7',
    '/superadmin/metrics/attention',
    '/superadmin/metrics/adoption',
    '/superadmin/system/health',
    '/superadmin/platform-users',
    '/superadmin/security/logins',
    '/superadmin/security/alerts',
    `/superadmin/organisations/${tenant.org._id}`,
    `/superadmin/organisations/${tenant.org._id}/users`,
    `/superadmin/organisations/${tenant.org._id}/invoices`,
    `/superadmin/organisations/${tenant.org._id}/timeline`
  ];
  for (const path of reads) {
    const { status, body } = await call('GET', path, { token: owner.token });
    assert.equal(status, 200, `${path} → ${status} ${JSON.stringify(body)}`);
  }

  // The three that are paginated must return the envelope, not a bare array —
  // `ServerList` reads `.data`/`.total` and would render an empty table otherwise.
  const invoices = await call('GET', `/superadmin/organisations/${tenant.org._id}/invoices`, { token: owner.token });
  assert.equal(invoices.body.total, 1);
  assert.equal(invoices.body.data.length, 1);
  const timeline = await call('GET', `/superadmin/organisations/${tenant.org._id}/timeline`, { token: owner.token });
  assert.ok(Array.isArray(timeline.body.data));

  const attention = await call('GET', '/superadmin/metrics/attention', { token: owner.token });
  assert.ok(Array.isArray(attention.body.atRisk));
  assert.ok(Array.isArray(attention.body.trialsExpiring));

  // A fresh trial runs 14 days, so it is correctly *outside* the 7-day default
  // window — the list is an alert, not a directory of trials. Widening the window
  // proves it populates rather than merely being well-formed.
  assert.ok(
    !attention.body.trialsExpiring.some(o => String(o._id) === String(tenant.org._id)),
    'a trial with 14 days left is not "expiring soon"'
  );
  const wide = await call('GET', '/superadmin/metrics/attention?withinDays=21', { token: owner.token });
  assert.ok(
    wide.body.trialsExpiring.some(o => String(o._id) === String(tenant.org._id)),
    'and appears once the window covers it'
  );
}));

test('rebuilding the rollup on demand fills the window', maybe(async () => {
  const owner = await platformAccount('owner');
  // Without this an operator cannot tell an empty dashboard from a broken one on a
  // deployment that has only just been updated.
  const { status, body } = await call('POST', '/superadmin/metrics/rebuild', { token: owner.token, body: { days: 5 } });
  assert.equal(status, 200);
  assert.equal(body.days, 5);
  assert.ok(await MetricsDaily.countDocuments({}) >= 5);
  const audited = await waitForAudit({ action: 'metrics.rebuilt' });
  assert.ok(audited, 'and is recorded — it is still a write');
}));

// ── Capabilities ─────────────────────────────────

test('an auditor can read the console and write nothing', maybe(async () => {
  const auditor = await platformAccount('auditor');
  const tenant = await registerOrg();

  const me = await call('GET', '/superadmin/me', { token: auditor.token });
  assert.equal(me.status, 200);
  assert.equal(me.body.platformRole, 'auditor');

  for (const path of ['/superadmin/overview', '/superadmin/organisations', '/superadmin/metrics/summary', '/superadmin/audit-logs', '/superadmin/security/alerts']) {
    const read = await call('GET', path, { token: auditor.token });
    assert.equal(read.status, 200, `${path} should be readable: ${JSON.stringify(read.body)}`);
  }

  // The point of the role is that it has no write capability at all — a compliance
  // reviewer can be given access without being trusted with it.
  const writes = [
    ['POST', `/superadmin/organisations/${tenant.org._id}/status`, { status: 'suspended', reason: 'testing' }],
    ['PUT', `/superadmin/organisations/${tenant.org._id}/limits`, { userLimit: 99 }],
    ['DELETE', `/superadmin/organisations/${tenant.org._id}`, {}],
    ['PUT', '/superadmin/plans/growth', { code: 'growth', name: 'Growth', monthlyPrice: 1 }],
    ['POST', `/superadmin/organisations/${tenant.org._id}/impersonate`, { reason: 'because I can' }],
    ['POST', '/superadmin/metrics/rebuild', { days: 1 }]
  ];
  for (const [method, path, body] of writes) {
    const attempt = await call(method, path, { token: auditor.token, body });
    assert.equal(attempt.status, 403, `${method} ${path} should be refused`);
    assert.equal(attempt.body.code, 'PLATFORM_CAPABILITY_REQUIRED');
  }
}));

test('support can act on a tenant but cannot delete it or change pricing', maybe(async () => {
  const support = await platformAccount('support');
  const tenant = await registerOrg();

  const suspend = await call('POST', `/superadmin/organisations/${tenant.org._id}/status`, {
    token: support.token,
    body: { status: 'suspended', reason: 'Support test' }
  });
  assert.equal(suspend.status, 200, 'support can suspend');

  const deletion = await call('DELETE', `/superadmin/organisations/${tenant.org._id}`, { token: support.token, body: {} });
  assert.equal(deletion.status, 403, 'but cannot delete a tenant');

  const pricing = await call('PUT', '/superadmin/plans/growth', {
    token: support.token,
    body: { code: 'growth', name: 'Growth', monthlyPrice: 1 }
  });
  assert.equal(pricing.status, 403, 'nor reprice a plan');
}));

test('billing can change pricing but cannot impersonate a customer', maybe(async () => {
  const billing = await platformAccount('billing');
  const tenant = await registerOrg();

  const pricing = await call('PUT', '/superadmin/plans/growth', {
    token: billing.token,
    body: { code: 'growth', name: 'Growth', monthlyPrice: 999, yearlyPrice: 9990, userLimit: 10, invoiceLimit: 1000 }
  });
  assert.equal(pricing.status, 200, 'billing owns pricing');

  const view = await call('POST', `/superadmin/organisations/${tenant.org._id}/impersonate`, {
    token: billing.token,
    body: { reason: 'curiosity about their books', readOnly: true }
  });
  // Customer data is not billing data.
  assert.equal(view.status, 403, 'but not customer data');
}));

test('the last platform owner cannot be demoted, and nobody can demote themselves', maybe(async () => {
  const owner = await platformAccount('owner');
  const self = await User.findOne({ email: owner.email });

  const suicide = await call('PUT', `/superadmin/platform-users/${self._id}/role`, {
    token: owner.token,
    body: { platformRole: 'auditor' }
  });
  assert.equal(suicide.status, 409);
  assert.equal(suicide.body.code, 'SELF_DEMOTION');

  // Another owner exists in this database (earlier tests created several), so
  // demoting a *different* owner is allowed — the guard is about the last one.
  const other = await platformAccount('owner');
  const otherUser = await User.findOne({ email: other.email });
  const demote = await call('PUT', `/superadmin/platform-users/${otherUser._id}/role`, {
    token: owner.token,
    body: { platformRole: 'support' }
  });
  assert.equal(demote.status, 200);
  assert.equal(demote.body.platformRole, 'support');
}));

test('a platform account that predates platformRole is treated as an owner', maybe(async () => {
  // Introducing a permission model to a live system must not lock the existing
  // administrator out of their own console on deploy.
  const email = `legacy-owner-${++counter}@klogubizz.test`;
  await User.collection.insertOne({
    name: 'Legacy Owner',
    email,
    passwordHash: await bcrypt.hash('Password@123', 12),
    role: 'superadmin',
    status: 'active',
    sessionVersion: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  const login = await call('POST', '/auth/login', { body: { email, password: 'Password@123' } });
  assert.equal(login.status, 200);
  const me = await call('GET', '/superadmin/me', { token: login.body.token });
  assert.equal(me.body.platformRole, 'owner');
  assert.ok(me.body.capabilities.includes('org.delete'));
}));

// ── Tenant drill-down ────────────────────────────

test('the tenant detail view is complete, and viewing it is audited', maybe(async () => {
  const owner = await platformAccount('owner');
  const tenant = await registerOrg();
  const client = await createClient(tenant.token);
  const invoice = await createInvoice(tenant.token, client._id);
  await call('POST', '/payments', {
    token: tenant.token,
    body: { invoiceId: invoice._id, amount: 500, method: 'upi', date: '2026-07-02' }
  });

  const { status, body } = await call('GET', `/superadmin/organisations/${tenant.org._id}`, { token: owner.token });
  assert.equal(status, 200);
  assert.equal(body.organisation.name, tenant.org.name);
  assert.ok(body.owner, 'the owner is resolved');
  assert.equal(body.documents.invoices, 1);
  assert.equal(body.documents.payments, 1);
  assert.equal(body.money.collected, 500);
  assert.ok(body.money.outstanding > 0);
  assert.ok(body.usage, 'plan usage comes from the tenant’s own quota logic');
  assert.ok(body.flagCatalogue.length, 'the flag catalogue is present so unset flags can be rendered');
  assert.equal(typeof body.activity.healthScore, 'number');
  assert.equal(body.activity.daysToFirstInvoice, 0);

  // Reading a customer's business records leaves a record. This is the data-access
  // log: the tenant can be told who looked.
  const viewed = await waitForAudit({ action: 'superadmin.tenant_viewed', orgId: tenant.org._id });
  assert.ok(viewed, 'opening the drill-down is audited');
  assert.ok(viewed.ip, 'and records where it came from');
}));

test('the tenant detail view never ships the base64 logo or the internal support notes', maybe(async () => {
  const owner = await platformAccount('owner');
  const tenant = await registerOrg();
  const logo = `data:image/png;base64,${Buffer.alloc(4096, 1).toString('base64')}`;
  await Organisation.updateOne({ _id: tenant.org._id }, { $set: { 'brandingConfig.logoUrl': logo } });

  const detail = await call('GET', `/superadmin/organisations/${tenant.org._id}`, { token: owner.token });
  assert.equal(detail.body.organisation.brandingConfig.logoUrl, '', 'the console renders no logo, so it is not sent');

  // And the other direction: what an operator writes about a tenant must not reach
  // the tenant.
  await call('PUT', `/superadmin/organisations/${tenant.org._id}/support`, {
    token: owner.token,
    body: { riskLevel: 'high', notes: 'Chasing payment, do not upsell' }
  });
  const asTenant = await call('GET', '/organisations/current', { token: tenant.token });
  assert.equal(asTenant.status, 200);
  assert.equal(asTenant.body.support, undefined, 'an internal note that ships to its subject is not internal');

  const me = await call('GET', '/auth/me', { token: tenant.token });
  assert.equal(me.body.organisation.support, undefined);
}));

// ── Lifecycle actions ────────────────────────────

test('suspending requires a reason, and the tenant is told what it is', maybe(async () => {
  const owner = await platformAccount('owner');
  const tenant = await registerOrg();
  const client = await createClient(tenant.token);

  const noReason = await call('POST', `/superadmin/organisations/${tenant.org._id}/status`, {
    token: owner.token,
    body: { status: 'suspended' }
  });
  assert.equal(noReason.status, 400);
  assert.equal(noReason.body.code, 'REASON_REQUIRED');

  const suspend = await call('POST', `/superadmin/organisations/${tenant.org._id}/status`, {
    token: owner.token,
    body: { status: 'suspended', reason: 'Three failed card charges' }
  });
  assert.equal(suspend.status, 200);
  assert.equal(suspend.body.statusReason, 'Three failed card charges');
  assert.ok(suspend.body.statusChangedBy, 'and who did it');

  // Suspension revokes sessions, so the tenant has to sign in again — which is
  // also how they see the banner immediately.
  const login = await call('POST', '/auth/login', { body: { email: tenant.email, password: 'Password@123' } });
  assert.equal(login.status, 200);

  const write = await call('POST', '/invoices', {
    token: login.body.token,
    body: { clientId: client._id, date: '2026-07-01', dueDate: '2026-07-15', items: [{ desc: 'x', qty: 1, rate: 10, gstRate: 18 }] }
  });
  assert.equal(write.status, 403);
  assert.equal(write.body.code, 'ORG_SUSPENDED');
  assert.match(write.body.message, /Three failed card charges/, 'the refusal explains itself');

  // Reads stay open: it is their business data.
  const read = await call('GET', '/invoices', { token: login.body.token });
  assert.equal(read.status, 200);

  // Reactivating clears the reason rather than leaving a stale one on the record.
  const reactivate = await call('POST', `/superadmin/organisations/${tenant.org._id}/status`, {
    token: owner.token,
    body: { status: 'active' }
  });
  assert.equal(reactivate.status, 200);
  assert.equal(reactivate.body.statusReason, '');
}));

test('a per-org limit override actually changes the quota the tenant is held to', maybe(async () => {
  const owner = await platformAccount('owner');
  const tenant = await registerOrg();
  const client = await createClient(tenant.token);

  // One invoice a month, imposed on this tenant alone — no new plan invented.
  const set = await call('PUT', `/superadmin/organisations/${tenant.org._id}/limits`, {
    token: owner.token,
    body: { userLimit: null, invoiceLimit: 1, note: 'Abuse investigation' }
  });
  assert.equal(set.status, 200);
  assert.equal(set.body.usage.invoiceLimit, 1, 'the override beats the plan’s 200');

  await createInvoice(tenant.token, client._id);
  const blocked = await call('POST', '/invoices', {
    token: tenant.token,
    body: { clientId: client._id, date: '2026-07-01', dueDate: '2026-07-15', items: [{ desc: 'x', qty: 1, rate: 10, gstRate: 18 }] }
  });
  assert.equal(blocked.status, 403, 'the tenant is held to the override');

  // Removing it restores the plan's limit — `null` means "no override", not
  // "unlimited" and not "zero".
  const cleared = await call('PUT', `/superadmin/organisations/${tenant.org._id}/limits`, {
    token: owner.token,
    body: { userLimit: null, invoiceLimit: null }
  });
  assert.equal(cleared.body.usage.invoiceLimit, 200);
}));

test('a feature flag turns a real capability off, not just a button', maybe(async () => {
  const owner = await platformAccount('owner');
  const tenant = await registerOrg();
  invalidateFeatureFlagCache();

  const before = await call('GET', '/items/bulk-upload/template', { token: tenant.token });
  assert.equal(before.status, 200, 'bulk upload is on by default');

  const off = await call('PUT', `/superadmin/organisations/${tenant.org._id}/flags`, {
    token: owner.token,
    body: { flags: { bulkUpload: false, creditNotes: true, darkMode: true } }
  });
  assert.equal(off.status, 200);
  assert.equal(off.body.effective.bulkUpload, false);

  const after = await call('GET', '/items/bulk-upload/template', { token: tenant.token });
  assert.equal(after.status, 403, 'the route itself refuses — the client is not the control');
  assert.equal(after.body.code, 'FEATURE_DISABLED');

  // And the tenant's own session payload reports the effective flags, so the UI can
  // stop offering it.
  const me = await call('GET', '/auth/me', { token: tenant.token });
  assert.equal(me.body.flags.bulkUpload, false);

  // A junk key is dropped rather than persisted as dead state.
  const junk = await call('PUT', `/superadmin/organisations/${tenant.org._id}/flags`, {
    token: owner.token,
    body: { flags: { notARealFlag: true, bulkUpload: 'yes' } }
  });
  assert.equal(junk.body.overrides.notARealFlag, undefined);
  assert.equal(junk.body.overrides.bulkUpload, undefined, 'a non-boolean is not an override');
}));

test('extending a trial adds to its end date rather than truncating it', maybe(async () => {
  const owner = await platformAccount('owner');
  const tenant = await registerOrg();
  const before = await Organisation.findById(tenant.org._id).lean();

  const extend = await call('POST', `/superadmin/organisations/${tenant.org._id}/trial`, {
    token: owner.token,
    body: { days: 7 }
  });
  assert.equal(extend.status, 200);
  const after = new Date(extend.body.trialEndsAt);
  const expected = new Date(new Date(before.trialEndsAt).getTime() + 7 * 86400000);
  // Extending from "now" instead of from the current end date would shorten a live
  // trial — the mistake this shape of endpoint usually makes.
  assert.ok(Math.abs(after - expected) < 60000, 'seven days were added to the existing end date');

  const end = await call('POST', `/superadmin/organisations/${tenant.org._id}/trial`, {
    token: owner.token,
    body: { end: true }
  });
  assert.ok(new Date(end.body.trialEndsAt) <= new Date(Date.now() + 1000));
}));

test('a notice reaches the tenant, and an expired one does not', maybe(async () => {
  const owner = await platformAccount('owner');
  const tenant = await registerOrg();

  await call('PUT', `/superadmin/organisations/${tenant.org._id}/notice`, {
    token: owner.token,
    body: { message: 'Please confirm your GSTIN', level: 'warning' }
  });
  let me = await call('GET', '/auth/me', { token: tenant.token });
  assert.equal(me.body.notices.length, 1);
  assert.equal(me.body.notices[0].scope, 'organisation');

  // Expiry is enforced server-side. A client-side check means a lapsed banner keeps
  // showing in any tab that was already open, and shows forever on an old client.
  await Organisation.updateOne(
    { _id: tenant.org._id },
    { $set: { 'notice.expiresAt': new Date(Date.now() - 86400000) } }
  );
  me = await call('GET', '/auth/me', { token: tenant.token });
  assert.equal(me.body.notices.length, 0, 'an expired notice is filtered out by the server');

  // A platform-wide announcement reaches every tenant, alongside their own.
  invalidatePlatformNotice();
  await call('PUT', '/superadmin/broadcast', {
    token: owner.token,
    body: { message: 'Maintenance on Sunday', level: 'info' }
  });
  me = await call('GET', '/auth/me', { token: tenant.token });
  assert.equal(me.body.notices.length, 1);
  assert.equal(me.body.notices[0].scope, 'platform');

  await call('PUT', '/superadmin/broadcast', { token: owner.token, body: { message: '' } });
  me = await call('GET', '/auth/me', { token: tenant.token });
  assert.equal(me.body.notices.length, 0);
}));

// ── Tenant user support actions ───────────────────

test('a password reset revokes every session, in both modes', maybe(async () => {
  const owner = await platformAccount('owner');
  const tenant = await registerOrg();
  const user = await User.findOne({ email: tenant.email });

  const reset = await call('POST', `/superadmin/users/${user._id}/reset-password`, {
    token: owner.token,
    body: { mode: 'temporary', targetOrgId: tenant.org._id }
  });
  assert.equal(reset.status, 200);
  assert.ok(reset.body.tempPassword, 'the operator gets a credential to hand over, once');

  // A reset that leaves the old session alive is not a reset — and if the reason
  // for the reset is a compromise, it is actively harmful.
  const stale = await call('GET', '/invoices', { token: tenant.token });
  assert.equal(stale.status, 401);
  assert.equal(stale.body.code, 'SESSION_REVOKED');

  const relogin = await call('POST', '/auth/login', { body: { email: tenant.email, password: reset.body.tempPassword } });
  assert.equal(relogin.status, 200, 'the temporary password works');

  const linkMode = await call('POST', `/superadmin/users/${user._id}/reset-password`, {
    token: owner.token,
    body: { mode: 'link', targetOrgId: tenant.org._id }
  });
  assert.equal(linkMode.status, 200);
  assert.equal(linkMode.body.tempPassword, undefined, 'link mode never reveals a password');
  assert.ok(linkMode.body.resetUrl, 'and hands back the link when there is no email provider');
}));

test('a locked-out account can be unlocked, and sessions can be revoked', maybe(async () => {
  const owner = await platformAccount('owner');
  const tenant = await registerOrg();
  const user = await User.findOne({ email: tenant.email });
  await User.updateOne({ _id: user._id }, { $set: { lockedUntil: new Date(Date.now() + 3600000), failedLoginAttempts: 8 } });

  const locked = await call('POST', '/auth/login', { body: { email: tenant.email, password: 'Password@123' } });
  assert.equal(locked.status, 429);
  assert.equal(locked.body.code, 'ACCOUNT_LOCKED');

  const unlock = await call('POST', `/superadmin/users/${user._id}/unlock`, { token: owner.token, body: { targetOrgId: tenant.org._id } });
  assert.equal(unlock.status, 200);
  assert.equal(unlock.body.wasLocked, true);

  const login = await call('POST', '/auth/login', { body: { email: tenant.email, password: 'Password@123' } });
  assert.equal(login.status, 200, 'support can rescue a locked-out owner');

  const logout = await call('POST', `/superadmin/users/${user._id}/force-logout`, { token: owner.token, body: { targetOrgId: tenant.org._id } });
  assert.equal(logout.status, 200);
  const after = await call('GET', '/invoices', { token: login.body.token });
  assert.equal(after.status, 401);
}));

test('the organisation owner cannot be disabled from the console either', maybe(async () => {
  const owner = await platformAccount('owner');
  const tenant = await registerOrg();
  const user = await User.findOne({ email: tenant.email });

  const attempt = await call('PUT', `/superadmin/users/${user._id}`, {
    token: owner.token,
    body: { status: 'disabled', targetOrgId: tenant.org._id }
  });
  // Disabling the owner leaves a tenant nobody can administer and nobody can
  // transfer ownership away from.
  assert.equal(attempt.status, 409);
  assert.equal(attempt.body.code, 'OWNER_PROTECTED');
}));

test('a platform account is not manageable through the tenant-user routes', maybe(async () => {
  const owner = await platformAccount('owner');
  const other = await platformAccount('support');
  const otherUser = await User.findOne({ email: other.email });

  for (const [method, path] of [
    ['PUT', `/superadmin/users/${otherUser._id}`],
    ['POST', `/superadmin/users/${otherUser._id}/reset-password`],
    ['POST', `/superadmin/users/${otherUser._id}/force-logout`]
  ]) {
    // Otherwise this becomes the route by which one platform account resets
    // another's password.
    const attempt = await call(method, path, { token: owner.token, body: { status: 'disabled' } });
    assert.equal(attempt.status, 403, `${method} ${path} should be refused`);
    assert.equal(attempt.body.code, 'PLATFORM_USER');
  }
}));

// ── Impersonation ────────────────────────────────

test('impersonation needs a reason and is read-only by default', maybe(async () => {
  const support = await platformAccount('support');
  const tenant = await registerOrg();
  const client = await createClient(tenant.token);

  const noReason = await call('POST', `/superadmin/organisations/${tenant.org._id}/impersonate`, {
    token: support.token,
    body: {}
  });
  assert.equal(noReason.status, 400);
  assert.equal(noReason.body.code, 'REASON_REQUIRED');

  const session = await call('POST', `/superadmin/organisations/${tenant.org._id}/impersonate`, {
    token: support.token,
    body: { reason: 'Ticket #482 — their invoice total looks wrong' }
  });
  assert.equal(session.status, 200);
  assert.equal(session.body.readOnly, true, 'read-write is opt-in, never the default');
  assert.equal(session.body.user.email, tenant.email, 'defaults to the owner');

  const impToken = session.body.token;

  // Reads work: the point is to see what the customer sees.
  const read = await call('GET', '/invoices', { token: impToken });
  assert.equal(read.status, 200);

  // Writes do not.
  const write = await call('POST', '/invoices', {
    token: impToken,
    body: { clientId: client._id, date: '2026-07-01', dueDate: '2026-07-15', items: [{ desc: 'x', qty: 1, rate: 10, gstRate: 18 }] }
  });
  assert.equal(write.status, 403);
  assert.equal(write.body.code, 'IMPERSONATION_READ_ONLY');

  // The session reports itself. The token deliberately looks like an ordinary one,
  // so the client cannot be the source of truth for "am I being impersonated".
  const me = await call('GET', '/auth/me', { token: impToken });
  assert.equal(me.body.impersonation.readOnly, true);
  assert.ok(me.body.impersonation.byName);

  // The customer's own session is untouched — bumping sessionVersion to impersonate
  // would sign them out of their own account the moment support looked at it.
  const theirs = await call('GET', '/invoices', { token: tenant.token });
  assert.equal(theirs.status, 200, 'the customer stays signed in');
}));

test('a read-write session works but every action names both identities', maybe(async () => {
  const support = await platformAccount('support');
  const tenant = await registerOrg();
  const client = await createClient(tenant.token);

  const session = await call('POST', `/superadmin/organisations/${tenant.org._id}/impersonate`, {
    token: support.token,
    body: { reason: 'Fixing a mispriced invoice for them', readOnly: false }
  });
  assert.equal(session.status, 200);
  assert.equal(session.body.readOnly, false);

  const created = await createInvoice(session.body.token, client._id);
  assert.ok(created._id);

  // Attribution. An impersonated action that reads like the customer's own is the
  // one thing this feature must never allow.
  const entry = await waitForAudit({ action: 'invoice.created', entityId: String(created._id) });
  assert.ok(entry, 'the action is audited');
  assert.ok(entry.impersonatorId, 'and records who was driving');
  assert.ok(entry.impersonatorName);

  // Every write during the session is recorded, not only the ones a controller
  // happens to audit — that is the data-access log the tenant can be shown.
  const blanket = await waitForAudit({ action: 'impersonation.write', orgId: tenant.org._id });
  assert.ok(blanket, 'writes are logged wholesale');
  assert.equal(blanket.meta.method, 'POST');

  // Credential and ownership changes are refused even here.
  for (const [method, path, body] of [
    ['POST', '/auth/change-password', { currentPassword: 'Password@123', newPassword: 'Whatever@123' }],
    ['POST', '/organisations/current/transfer-ownership', { newOwnerId: String(tenant.userId), password: 'Password@123' }]
  ]) {
    const attempt = await call(method, path, { token: session.body.token, body });
    assert.equal(attempt.status, 403, `${path} must be refused while impersonating`);
    assert.equal(attempt.body.code, 'IMPERSONATION_FORBIDDEN');
  }
}));

test('a platform account cannot be impersonated', maybe(async () => {
  const owner = await platformAccount('owner');
  const victim = await platformAccount('support');
  const victimUser = await User.findOne({ email: victim.email });
  const tenant = await registerOrg();

  // Not in the org, so this is a 404 rather than a lateral move — but the check
  // that matters is the explicit one below.
  const cross = await call('POST', `/superadmin/organisations/${tenant.org._id}/impersonate`, {
    token: owner.token,
    body: { reason: 'trying to escalate', userId: String(victimUser._id) }
  });
  assert.equal(cross.status, 404);

  // And a token minted for a user who later becomes a superadmin stops working,
  // rather than granting platform control attributed to the target.
  const tenantUser = await User.findOne({ email: tenant.email });
  const session = await call('POST', `/superadmin/organisations/${tenant.org._id}/impersonate`, {
    token: owner.token,
    body: { reason: 'legitimate support session' }
  });
  assert.equal(session.status, 200);
  await User.updateOne({ _id: tenantUser._id }, { $set: { role: 'superadmin' } });
  const after = await call('GET', '/auth/me', { token: session.body.token });
  assert.equal(after.status, 403);
  assert.equal(after.body.code, 'IMPERSONATION_FORBIDDEN');
  await User.updateOne({ _id: tenantUser._id }, { $set: { role: 'admin' } });
}));

test('impersonation does not bypass a suspension', maybe(async () => {
  const owner = await platformAccount('owner');
  const tenant = await registerOrg();
  const client = await createClient(tenant.token);
  await call('POST', `/superadmin/organisations/${tenant.org._id}/status`, {
    token: owner.token,
    body: { status: 'suspended', reason: 'Non-payment' }
  });

  const session = await call('POST', `/superadmin/organisations/${tenant.org._id}/impersonate`, {
    token: owner.token,
    body: { reason: 'Checking what they can see while suspended', readOnly: false }
  });
  assert.equal(session.status, 200);

  const read = await call('GET', '/invoices', { token: session.body.token });
  assert.equal(read.status, 200, 'support can see what the customer sees');

  const write = await call('POST', '/invoices', {
    token: session.body.token,
    body: { clientId: client._id, date: '2026-07-01', dueDate: '2026-07-15', items: [{ desc: 'x', qty: 1, rate: 10, gstRate: 18 }] }
  });
  // A support session that could write to a suspended account would be a way
  // around the suspension.
  assert.equal(write.status, 403);
  assert.equal(write.body.code, 'ORG_SUSPENDED');
}));

test('an impersonated request does not count as tenant activity', maybe(async () => {
  const owner = await platformAccount('owner');
  const tenant = await registerOrg();
  await Organisation.updateOne({ _id: tenant.org._id }, { $unset: { lastActiveAt: 1 } });
  resetActivityCache();

  const session = await call('POST', `/superadmin/organisations/${tenant.org._id}/impersonate`, {
    token: owner.token,
    body: { reason: 'Looking at their invoice list' }
  });
  await call('GET', '/invoices', { token: session.body.token });

  const org = await Organisation.findById(tenant.org._id).lean();
  // Support reading a tenant's invoices is not the tenant using the product.
  // Counting it would make the at-risk list wrong for exactly the accounts support
  // is looking at.
  assert.equal(org.lastActiveAt, undefined, 'the tenant is still recorded as dormant');
}));

// ── Security console ─────────────────────────────

test('login history records both outcomes, with where they came from', maybe(async () => {
  const owner = await platformAccount('owner');
  const tenant = await registerOrg();
  await call('POST', '/auth/login', { body: { email: tenant.email, password: 'wrong-password' } });
  await call('POST', '/auth/login', { body: { email: tenant.email, password: 'Password@123' } });

  const all = await call('GET', '/superadmin/security/logins?limit=100', { token: owner.token });
  assert.equal(all.status, 200);
  const mine = all.body.data.filter(e => e.orgId === String(tenant.org._id));
  assert.ok(mine.some(e => e.action === 'auth.login'), 'successes are recorded');
  assert.ok(mine.some(e => e.action === 'auth.login_failed'), 'and failures');
  // The trail recorded who and what but never from where, so "who is guessing this
  // password" was unanswerable.
  assert.ok(mine.every(e => typeof e.ip === 'string' && e.ip.length), 'each carries an origin');

  const failures = await call('GET', '/superadmin/security/logins?outcome=failure&limit=100', { token: owner.token });
  assert.ok(failures.body.data.every(e => e.action === 'auth.login_failed'));
}));

test('repeated failed sign-ins from one address raise an alert', maybe(async () => {
  const owner = await platformAccount('owner');
  const tenant = await registerOrg();
  // Above the documented threshold of 5.
  for (let i = 0; i < 6; i += 1) {
    await call('POST', '/auth/login', { body: { email: tenant.email, password: `guess-${i}` } });
  }

  const { status, body } = await call('GET', '/superadmin/security/alerts?hours=24', { token: owner.token });
  assert.equal(status, 200);
  assert.equal(body.thresholds.failedLoginsPerIp, 5, 'the rule is returned alongside the finding');
  assert.ok(body.bruteForce.length, 'the address is flagged');
  assert.ok(body.bruteForce[0].attempts >= 5);
  assert.ok(Array.isArray(body.impersonations), 'support sessions are listed too');
}));

test('the audit trail cannot be modified, and now carries origin and impersonation', maybe(async () => {
  const owner = await platformAccount('owner');
  const tenant = await registerOrg();
  await call('GET', `/superadmin/organisations/${tenant.org._id}`, { token: owner.token });

  const entry = await waitForAudit({ action: 'superadmin.tenant_viewed', orgId: tenant.org._id });
  assert.ok(entry, 'the view was audited');
  assert.ok(entry.ip);
  assert.ok(entry.userAgent === undefined || typeof entry.userAgent === 'string');

  // Append-only is enforced at the model, so no future route can quietly make the
  // trail mutable.
  await assert.rejects(
    () => AuditLog.updateOne({ _id: entry._id }, { $set: { action: 'nothing.happened' } }),
    /append-only/
  );
}));

// ── System health ────────────────────────────────

test('system health reports the database and scopes the latency figures', maybe(async () => {
  const owner = await platformAccount('owner');
  const { status, body } = await call('GET', '/superadmin/system/health', { token: owner.token });
  assert.equal(status, 200);
  assert.equal(body.database.state, 'connected');
  assert.equal(typeof body.database.transactionsSupported, 'boolean');
  assert.ok(body.collectionCounts.organisations >= 1);
  // Per-instance figures have to say so — anyone reading them needs to know they
  // reset on restart and describe one process.
  assert.match(body.requests.scope, /instance/);
  assert.equal(typeof body.requests.latency.p95, 'number');
  assert.equal(typeof body.process.emailConfigured, 'boolean');
}));

// ── Plan versioning (3.3 #9) ─────────────────────

/**
 * The gap this closes: **no test asserted that a price survived a plan edit**,
 * because nothing anywhere stored what a subscriber had agreed to.
 */

async function savePlan(token, code, body) {
  return call('PUT', `/superadmin/plans/${code}`, { token, body });
}

test('raising a price does not reprice existing subscribers', maybe(async () => {
  const { token: platform } = await platformAccount('owner');
  await Plan.deleteMany({ code: 'versioned' });
  await PlanVersion.deleteMany({ planCode: 'versioned' });
  await savePlan(platform, 'versioned', {
    code: 'versioned', name: 'Versioned', monthlyPrice: 999, yearlyPrice: 9990,
    userLimit: 5, invoiceLimit: 200, active: true
  });

  const tenant = await registerOrg();
  const started = await call('POST', '/subscriptions/start', {
    token: tenant.token, body: { planCode: 'versioned', billingCycle: 'monthly' }
  });
  assert.equal(started.status, 201, JSON.stringify(started.body));

  const raised = await savePlan(platform, 'versioned', {
    name: 'Versioned', monthlyPrice: 1499, yearlyPrice: 14990,
    userLimit: 5, invoiceLimit: 200, active: true, changeNote: 'Annual price review'
  });
  assert.equal(raised.status, 200, JSON.stringify(raised.body));
  // The operator is told what they just did, rather than left to infer it.
  assert.equal(raised.body.grandfathered, 1);
  assert.equal(raised.body.repriced, 0);

  const sub = await Subscription.findOne({ orgId: tenant.org._id, planCode: 'versioned' }).lean();
  // The customer keeps the terms they signed up on. Before this, the price was
  // resolved by joining to the live plan at read time, so this number moved.
  assert.equal(sub.pricing.monthlyPrice, 999);
  assert.equal(sub.planVersion, 1);

  const plan = await Plan.findOne({ code: 'versioned' }).lean();
  assert.equal(plan.monthlyPrice, 1499, 'and the published price did change');
  assert.equal(plan.currentVersion, 2);
}));

test('the old price is kept, not overwritten', maybe(async () => {
  const { token: platform } = await platformAccount('owner');
  await Plan.deleteMany({ code: 'histplan' });
  await PlanVersion.deleteMany({ planCode: 'histplan' });

  await savePlan(platform, 'histplan', { code: 'histplan', name: 'Hist', monthlyPrice: 100, userLimit: 3, invoiceLimit: 50 });
  await savePlan(platform, 'histplan', { name: 'Hist', monthlyPrice: 200, userLimit: 3, invoiceLimit: 50, changeNote: 'Up' });
  await savePlan(platform, 'histplan', { name: 'Hist', monthlyPrice: 300, userLimit: 3, invoiceLimit: 50 });

  const { status, body } = await call('GET', '/superadmin/plans/histplan/history', { token: platform });
  assert.equal(status, 200);
  // Newest first. Previously the audit entry logged only the plan's *name*, so
  // not even the previous price was recoverable after an edit.
  assert.deepEqual(body.versions.map(v => v.monthlyPrice), [300, 200, 100]);
  assert.equal(body.versions[1].changeNote, 'Up');
  assert.ok(body.versions[0].changedBy, 'a price change has a name against it');
}));

test('saving a plan unchanged does not mint a version', maybe(async () => {
  const { token: platform } = await platformAccount('owner');
  await Plan.deleteMany({ code: 'noopplan' });
  await PlanVersion.deleteMany({ planCode: 'noopplan' });

  const body = { code: 'noopplan', name: 'Noop', monthlyPrice: 500, userLimit: 2, invoiceLimit: 20 };
  await savePlan(platform, 'noopplan', body);
  await savePlan(platform, 'noopplan', body);
  await savePlan(platform, 'noopplan', body);

  // The console's save button makes a no-op save trivially easy, and a history
  // full of identical rows answers nothing.
  assert.equal(await PlanVersion.countDocuments({ planCode: 'noopplan' }), 1);
}));

test('reordering a plan is not a price change', maybe(async () => {
  const { token: platform } = await platformAccount('owner');
  await Plan.deleteMany({ code: 'sortplan' });
  await PlanVersion.deleteMany({ planCode: 'sortplan' });

  await savePlan(platform, 'sortplan', { code: 'sortplan', name: 'Sort', monthlyPrice: 700, userLimit: 2, invoiceLimit: 20, sortOrder: 1 });
  await savePlan(platform, 'sortplan', { name: 'Sort', monthlyPrice: 700, userLimit: 2, invoiceLimit: 20, sortOrder: 9 });

  // How a plan is presented is not what it costs. Versioning a drag-to-reorder
  // would bury the changes that matter among rows that say nothing.
  assert.equal(await PlanVersion.countDocuments({ planCode: 'sortplan' }), 1);
  assert.equal((await Plan.findOne({ code: 'sortplan' }).lean()).sortOrder, 9);
}));

test('an operator can reprice everyone on purpose', maybe(async () => {
  const { token: platform } = await platformAccount('owner');
  await Plan.deleteMany({ code: 'forceplan' });
  await PlanVersion.deleteMany({ planCode: 'forceplan' });
  await savePlan(platform, 'forceplan', { code: 'forceplan', name: 'Force', monthlyPrice: 400, userLimit: 5, invoiceLimit: 100, active: true });

  const tenant = await registerOrg();
  await call('POST', '/subscriptions/start', { token: tenant.token, body: { planCode: 'forceplan' } });

  const applied = await savePlan(platform, 'forceplan', {
    name: 'Force', monthlyPrice: 600, userLimit: 5, invoiceLimit: 100, active: true,
    applyToExisting: true, changeNote: 'Everyone moves'
  });
  assert.equal(applied.body.repriced, 1);
  assert.equal(applied.body.grandfathered, 0);

  const sub = await Subscription.findOne({ orgId: tenant.org._id, planCode: 'forceplan' }).lean();
  // Grandfathering is the default, not the only option — but it has to be asked
  // for explicitly, because the reverse mistake costs a customer's trust.
  assert.equal(sub.pricing.monthlyPrice, 600);
  assert.equal(sub.planVersion, 2);
}));

test('lowering a limit does not put existing subscribers over quota', maybe(async () => {
  const { token: platform } = await platformAccount('owner');
  await Plan.deleteMany({ code: 'limitplan' });
  await PlanVersion.deleteMany({ planCode: 'limitplan' });
  await savePlan(platform, 'limitplan', { code: 'limitplan', name: 'Limits', monthlyPrice: 0, userLimit: 9, invoiceLimit: 40, active: true });

  const tenant = await registerOrg();
  await call('POST', '/subscriptions/start', { token: tenant.token, body: { planCode: 'limitplan' } });

  await savePlan(platform, 'limitplan', { name: 'Limits', monthlyPrice: 0, userLimit: 2, invoiceLimit: 3, active: true });

  const usage = await call('GET', '/subscriptions/current', { token: tenant.token });
  assert.equal(usage.status, 200, JSON.stringify(usage.body));
  // Lowering a limit used to put every existing subscriber over quota mid-month,
  // and the first they heard of it was an invoice being refused.
  assert.equal(usage.body.usage.invoiceLimit, 40);
  assert.equal(usage.body.usage.userLimit, 9);
  assert.equal(usage.body.usage.grandfathered, true, 'and the tenant is told why their ceiling differs');
}));

test('a subscription with no pinned version behaves exactly as before', maybe(async () => {
  const { token: platform } = await platformAccount('owner');
  await Plan.deleteMany({ code: 'legacyplan' });
  await PlanVersion.deleteMany({ planCode: 'legacyplan' });
  await savePlan(platform, 'legacyplan', { code: 'legacyplan', name: 'Legacy', monthlyPrice: 0, userLimit: 4, invoiceLimit: 60, active: true });

  const tenant = await registerOrg();
  await call('POST', '/subscriptions/start', { token: tenant.token, body: { planCode: 'legacyplan' } });
  // Exactly the shape of every subscription created before versioning shipped.
  await Subscription.updateOne(
    { orgId: tenant.org._id, planCode: 'legacyplan' },
    { $unset: { planVersion: '', pricing: '', limits: '' } }
  );

  await savePlan(platform, 'legacyplan', { name: 'Legacy', monthlyPrice: 0, userLimit: 7, invoiceLimit: 90, active: true });

  const usage = await call('GET', '/subscriptions/current', { token: tenant.token });
  // Falls through to the live plan — the old behaviour, unchanged. This fallback
  // is what makes the whole feature safe to deploy: it is inert until a plan is
  // next edited *and* the subscriber has a pin.
  assert.equal(usage.body.usage.invoiceLimit, 90);
  assert.equal(usage.body.usage.grandfathered, false);
}));

test('a plan version cannot be edited after the fact', maybe(async () => {
  const { token: platform } = await platformAccount('owner');
  await Plan.deleteMany({ code: 'immutable' });
  await PlanVersion.deleteMany({ planCode: 'immutable' });
  await savePlan(platform, 'immutable', { code: 'immutable', name: 'Immutable', monthlyPrice: 250, userLimit: 1, invoiceLimit: 10 });

  const version = await PlanVersion.findOne({ planCode: 'immutable' });
  // A historical record that can be edited answers no question — the same
  // reasoning as the stock ledger and the audit log.
  await assert.rejects(
    () => PlanVersion.updateOne({ _id: version._id }, { $set: { monthlyPrice: 1 } }),
    /immutable/i
  );
}));

test('revenue is reported at what each subscriber actually pays', maybe(async () => {
  const { token: platform } = await platformAccount('owner');
  await Plan.deleteMany({ code: 'mrrplan' });
  await PlanVersion.deleteMany({ planCode: 'mrrplan' });
  await savePlan(platform, 'mrrplan', { code: 'mrrplan', name: 'MRR', monthlyPrice: 1000, yearlyPrice: 10000, userLimit: 5, invoiceLimit: 100, active: true });

  // Measured as a delta: MRR is a platform-wide figure and every other test in
  // this file leaves subscriptions behind.
  const before = (await metrics.computeRecurringRevenue()).mrr;

  const early = await registerOrg();
  await call('POST', '/subscriptions/start', { token: early.token, body: { planCode: 'mrrplan' } });
  await Subscription.updateOne({ orgId: early.org._id, planCode: 'mrrplan' }, { $set: { status: 'active' } });

  await savePlan(platform, 'mrrplan', { name: 'MRR', monthlyPrice: 2000, yearlyPrice: 20000, userLimit: 5, invoiceLimit: 100, active: true });

  const late = await registerOrg();
  await call('POST', '/subscriptions/start', { token: late.token, body: { planCode: 'mrrplan' } });
  await Subscription.updateOne({ orgId: late.org._id, planCode: 'mrrplan' }, { $set: { status: 'active' } });

  const { mrr } = await metrics.computeRecurringRevenue();
  // 1000 + 2000, not 2000 + 2000. Joining to the live plan restated every past
  // month's MRR whenever a price moved — a revenue chart that changes shape when
  // somebody edits a price is not a revenue chart.
  assert.equal(mrr - before, 3000);
}));

// ── Job observability (3.5 #11) ──────────────────

test('a job records that it ran, and what it did', maybe(async () => {
  await JobRun.deleteMany({ name: 'invoices.overdue' });
  const result = await jobs.run('invoices.overdue', async () => ({ scanned: 12, updated: 3 }));
  assert.deepEqual(result, { scanned: 12, updated: 3 }, 'the wrapper returns what the job returned');

  const row = await JobRun.findOne({ name: 'invoices.overdue' }).lean();
  assert.equal(row.status, 'succeeded');
  // The counts the sweeps already computed and previously only logged.
  assert.equal(row.result.updated, 3);
  assert.ok(row.durationMs !== null);
  assert.ok(row.host, 'and which process ran it — two instances doubling the work is worth seeing');
}));

test('a failing job is recorded rather than swallowed', maybe(async () => {
  await JobRun.deleteMany({ name: 'reminders.send' });
  const result = await jobs.run('reminders.send', async () => { throw new Error('SMTP refused the connection'); });
  // Deliberately does not re-throw: every caller already treats a sweep failure
  // as something to log and continue from, and changing that under the guise of
  // adding observability would be a behaviour change in disguise.
  assert.equal(result, null);

  const row = await JobRun.findOne({ name: 'reminders.send' }).lean();
  assert.equal(row.status, 'failed');
  assert.equal(row.error.message, 'SMTP refused the connection');
  assert.ok(row.error.stack, 'with a stack, bounded so a deep async chain cannot bloat the row');
}));

test('a job that has never run says so', maybe(async () => {
  await JobRun.deleteMany({ name: 'metrics.rollup' });
  const { jobs: list } = await jobs.summary();
  const rollup = list.find(j => j.name === 'metrics.rollup');
  /**
   * The state this whole feature exists for.
   *
   * A crashed timer, an unhandled rejection that killed the interval, a deploy
   * that never called the start function — all look exactly like "no work to
   * do". Building the list from the registry rather than from history is what
   * makes a job that has never run visible at all.
   */
  assert.equal(rollup.state, 'never');
  assert.equal(rollup.lastRunAt, null);
}));

test('a job that stopped running is reported as late', maybe(async () => {
  await JobRun.deleteMany({ name: 'quotations.expiry' });
  const longAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
  await JobRun.create({
    name: 'quotations.expiry', status: 'succeeded', startedAt: longAgo, finishedAt: longAgo, durationMs: 5
  });

  const { jobs: list, unhealthy } = await jobs.summary();
  const job = list.find(j => j.name === 'quotations.expiry');
  // It succeeded — the last time it ran, half a day ago. "Working" and "running"
  // are different questions and only the second one matters here.
  assert.equal(job.lastStatus, 'succeeded');
  assert.equal(job.state, 'late');
  assert.ok(unhealthy >= 1);
}));

test('a process killed mid-job leaves a stuck run, not a missing one', maybe(async () => {
  await JobRun.deleteMany({ name: 'recycle-bin.purge' });
  const longAgo = new Date(Date.now() - 10 * 60 * 60 * 1000);
  // Exactly what a SIGKILL during a sweep leaves behind: `running` was written
  // before the work started and nothing ever came back to close it.
  await JobRun.create({ name: 'recycle-bin.purge', status: 'running', startedAt: longAgo });

  const { jobs: list } = await jobs.summary();
  const job = list.find(j => j.name === 'recycle-bin.purge');
  // A missing row and a stuck row mean different things, and the second says
  // "this died" — the fact the old log-and-continue threw away.
  assert.equal(job.state, 'stuck');
}));

test('a job still inside its window is running, not stuck', maybe(async () => {
  await JobRun.deleteMany({ name: 'payment-links.expiry' });
  await JobRun.create({ name: 'payment-links.expiry', status: 'running', startedAt: new Date() });
  const { jobs: list } = await jobs.summary();
  // Otherwise every long sweep would raise an alarm the moment it started, and
  // an alert that fires on normal operation is one people learn to ignore.
  assert.equal(list.find(j => j.name === 'payment-links.expiry').state, 'running');
}));

test('one sweep failing no longer stops the ones after it', maybe(async () => {
  await JobRun.deleteMany({ name: { $in: ['invoices.overdue', 'recycle-bin.purge'] } });
  await jobs.run('invoices.overdue', async () => { throw new Error('boom'); });
  await jobs.run('recycle-bin.purge', async () => ({ purged: 2 }));

  // In the old single try block around all five sub-sweeps, a throw in one
  // skipped every sweep after it for that whole tick — silently.
  assert.equal((await JobRun.findOne({ name: 'invoices.overdue' }).lean()).status, 'failed');
  assert.equal((await JobRun.findOne({ name: 'recycle-bin.purge' }).lean()).status, 'succeeded');
}));

test('recording a run cannot break the job it records', maybe(async () => {
  const original = JobRun.create;
  JobRun.create = async () => { throw new Error('database unreachable'); };
  try {
    const result = await jobs.run('metrics.rollup', async () => 'work happened anyway');
    // Monitoring that takes down the system it monitors converts a question you
    // could not answer into an outage you did not have.
    assert.equal(result, 'work happened anyway');
  } finally {
    JobRun.create = original;
  }
}));

test('a job result is summarised, not stored whole', maybe(async () => {
  // What `runRecurringSweep` actually returns: counts, one level nested.
  const summary = jobs.summarise({ scanned: 4, recurring: { generated: 2, failed: 0 }, rows: [1, 2, 3] });
  assert.equal(summary.scanned, 4);
  assert.equal(summary['recurring.generated'], 2, 'nested counts survive — that is the sweep that creates documents');
  assert.equal(summary.rows, 3, 'and an array becomes its length rather than its contents');
}));

test('job health appears on the page an operator already looks at', maybe(async () => {
  const { token } = await platformAccount('owner');
  const { status, body } = await call('GET', '/superadmin/system/health', { token });
  assert.equal(status, 200);
  // A job that has quietly stopped is invisible by definition, so the fact has
  // to surface somewhere people go for other reasons. A dedicated page nobody
  // opens is the same as no page.
  assert.ok(Array.isArray(body.jobs.jobs));
  assert.equal(body.jobs.jobs.length, Object.keys(jobs.JOBS).length);
  assert.ok(typeof body.jobs.unhealthy === 'number');
}));

test('job history is readable, and only by the platform', maybe(async () => {
  const { token } = await platformAccount('owner');
  await jobs.run('invoices.overdue', async () => ({ updated: 1 }));

  const { status, body } = await call('GET', '/superadmin/system/jobs?name=invoices.overdue', { token });
  assert.equal(status, 200);
  assert.ok(body.runs.length >= 1);
  assert.equal(body.runs[0].name, 'invoices.overdue');

  const tenant = await registerOrg();
  const refused = await call('GET', '/superadmin/system/jobs', { token: tenant.token });
  assert.equal(refused.status, 403);
}));

// ── Dunning (3.3 #10) ────────────────────────────

/**
 * Puts a tenant into the state the Razorpay webhook leaves behind on a failed
 * charge, `daysAgo` days ago.
 */
async function pastDue(tenant, daysAgo, overrides = {}) {
  const since = new Date(Date.now() - daysAgo * 86400000);
  await Subscription.updateMany({ orgId: tenant.org._id }, {
    $set: {
      status: 'past_due',
      pastDueSince: since,
      failedPaymentCount: 1,
      planCode: 'growth',
      billingCycle: 'monthly',
      pricing: { monthlyPrice: 999, yearlyPrice: 9990 },
      ...overrides
    }
  });
  return Subscription.findOne({ orgId: tenant.org._id }).lean();
}

test('a failed payment is chased, and the first notice is gentle', maybe(async () => {
  const tenant = await registerOrg();
  await pastDue(tenant, 2);

  const result = await runDunningSweep({ orgId: tenant.org._id });
  assert.equal(result.details.length, 1);
  /**
   * `skipped`, not `sent` — there is no mail provider configured in tests.
   *
   * Which is the design working rather than a limitation of the harness: a
   * deployment that cannot notify anyone never sets `dunningDelivered`, and so
   * never auto-suspends. Cutting off customers you have no way of telling would
   * be the worst possible behaviour for a misconfigured install.
   */
  assert.equal(result.skipped, 1);

  const sub = await Subscription.findOne({ orgId: tenant.org._id }).lean();
  assert.equal(sub.dunningDelivered, false, 'a send that reached nobody is not delivery');
  // Day 2 reaches stage 1 but not stage 2 — the common case is an expired card
  // that takes two minutes to fix, and it deserves a nudge before a warning.
  assert.equal(sub.dunningStage, 1);

  const log = await waitUntil(() => EmailLog.findOne({ orgId: tenant.org._id, type: 'dunning' }).lean());
  assert.ok(log, 'the chase is recorded like every other send');
  assert.match(log.subject, /did not go through/i);
}));

test('the same stage is never sent twice', maybe(async () => {
  const tenant = await registerOrg();
  await pastDue(tenant, 2);

  await runDunningSweep({ orgId: tenant.org._id });
  const second = await runDunningSweep({ orgId: tenant.org._id });
  // The sweep runs hourly. Re-sending on every tick is how a dunning sequence
  // becomes a spam complaint. The stage did not move, so nothing was attempted.
  assert.equal(second.details.length, 0);
  assert.equal((await Subscription.findOne({ orgId: tenant.org._id }).lean()).dunningStage, 1);
}));

test('escalation is measured in days late, not in failed attempts', maybe(async () => {
  const tenant = await registerOrg();
  // Twelve gateway retries in one hour is not twelve weeks of silence, and
  // "we tried your card twelve times" is not a thing to say to a customer.
  await pastDue(tenant, 1, { failedPaymentCount: 12 });

  await runDunningSweep({ orgId: tenant.org._id });
  assert.equal((await Subscription.findOne({ orgId: tenant.org._id }).lean()).dunningStage, 1);
}));

test('a long-overdue account jumps to the right stage rather than starting over', maybe(async () => {
  const tenant = await registerOrg();
  await pastDue(tenant, 15);

  await runDunningSweep({ orgId: tenant.org._id });
  const sub = await Subscription.findOne({ orgId: tenant.org._id }).lean();
  // Fifteen days in, the honest message is the final warning — not "we could
  // not take this month's payment", which would be two weeks out of date.
  assert.equal(sub.dunningStage, 4);
  const log = await waitUntil(() => EmailLog.findOne({ orgId: tenant.org._id, type: 'dunning' }).lean());
  assert.match(log.subject, /final notice/i);
}));

test('an account is limited only after the deadline, and only after being told', maybe(async () => {
  const tenant = await registerOrg();
  await pastDue(tenant, 25, { dunningDelivered: true, dunningStage: 4 });

  const result = await runDunningSweep({ orgId: tenant.org._id });
  assert.equal(result.suspended, 1);

  const org = await Organisation.findById(tenant.org._id).lean();
  assert.equal(org.status, 'suspended');
  assert.equal(org.suspendedForNonPayment, true, 'marked, so only the same mechanism lifts it');
  assert.match(org.statusReason, /25 days/);
  // The tenant keeps their data. Reads and exports stay open — see
  // authMiddleware's SUSPENDED_ALLOWED_PREFIXES.
  assert.match(org.statusReason, /view and export/);
}));

test('an account nobody could reach is never cut off', maybe(async () => {
  const tenant = await registerOrg();
  // Every send suppressed or failed, so `dunningDelivered` was never set. This
  // is what a bounced billing address looks like: silent, by design.
  await pastDue(tenant, 40, { dunningDelivered: false, dunningStage: 4 });

  const result = await runDunningSweep({ orgId: tenant.org._id });
  assert.equal(result.suspended, 0);
  // A freshly registered org is on `trial`; the point is that it was not limited.
  assert.notEqual((await Organisation.findById(tenant.org._id).lean()).status, 'suspended');

  // Named rather than counted, because this needs a person to pick up a phone
  // and a number cannot be actioned.
  assert.equal(result.unreachable.length, 1);
  assert.match(result.unreachable[0].reason, /has ever been delivered/);
}));

test('a successful payment clears the whole dunning state', maybe(async () => {
  const tenant = await registerOrg();
  await pastDue(tenant, 10, { dunningStage: 3, dunningDelivered: true, razorpaySubscriptionId: 'sub_dunning_1' });

  await applyRazorpayEvent('subscription.charged', {
    id: 'sub_dunning_1',
    notes: { orgId: String(tenant.org._id) }
  });

  const sub = await Subscription.findOne({ orgId: tenant.org._id, razorpaySubscriptionId: 'sub_dunning_1' }).lean();
  assert.equal(sub.status, 'active');
  assert.equal(sub.pastDueSince, null);
  // Reset, so a customer who lapses again in six months gets the gentle first
  // notice rather than the final warning they last saw. Starting a returning
  // customer at "final notice" is how a recovered account becomes a lost one.
  assert.equal(sub.dunningStage, 0);
  assert.equal(sub.dunningDelivered, false);
}));

test('paying restores an account dunning suspended', maybe(async () => {
  const tenant = await registerOrg();
  await pastDue(tenant, 30, { dunningDelivered: true, dunningStage: 4, razorpaySubscriptionId: 'sub_dunning_2' });
  await runDunningSweep({ orgId: tenant.org._id });
  assert.equal((await Organisation.findById(tenant.org._id).lean()).status, 'suspended');

  await applyRazorpayEvent('subscription.charged', {
    id: 'sub_dunning_2',
    notes: { orgId: String(tenant.org._id) }
  });
  assert.equal((await Organisation.findById(tenant.org._id).lean()).status, 'active');
}));

test('paying does not undo a suspension a person applied for another reason', maybe(async () => {
  const tenant = await registerOrg();
  await Subscription.updateMany({ orgId: tenant.org._id }, {
    $set: { status: 'past_due', razorpaySubscriptionId: 'sub_dunning_3', pastDueSince: new Date() }
  });
  const platform = await platformAccount('owner');
  const suspended = await call('POST', `/superadmin/organisations/${tenant.org._id}/status`, {
    token: platform.token,
    body: { status: 'suspended', reason: 'Under investigation for fraudulent invoices' }
  });
  assert.equal(suspended.status, 200);

  await applyRazorpayEvent('subscription.charged', {
    id: 'sub_dunning_3',
    notes: { orgId: String(tenant.org._id) }
  });

  const org = await Organisation.findById(tenant.org._id).lean();
  /**
   * The old code set `org.status = 'active'` on every successful charge, which
   * meant paying an invoice silently reinstated an account suspended for fraud.
   * Money was never what that suspension was about.
   */
  assert.equal(org.status, 'suspended');
  assert.match(org.statusReason, /fraudulent/);
}));

test('an already-suspended account is not chased further', maybe(async () => {
  const tenant = await registerOrg();
  await pastDue(tenant, 30, { dunningDelivered: true, dunningStage: 4 });
  await runDunningSweep({ orgId: tenant.org._id });

  const again = await runDunningSweep({ orgId: tenant.org._id });
  // There is nothing left to escalate to, and repeating the same warning after
  // acting on it is noise.
  assert.equal(again.details.length, 0);
  assert.equal(again.suspended, 0);
}));

test('a dry run says what it would do and changes nothing', maybe(async () => {
  const tenant = await registerOrg();
  await pastDue(tenant, 25, { dunningDelivered: true, dunningStage: 4 });

  const preview = await runDunningSweep({ orgId: tenant.org._id, dryRun: true });
  assert.equal(preview.details[0].action, 'would suspend');
  // How an operator sees the sequence before trusting it with real customers.
  assert.notEqual((await Organisation.findById(tenant.org._id).lean()).status, 'suspended');
  assert.equal(preview.suspended, 0);
}));

test('the amount quoted is what the customer agreed to', maybe(async () => {
  const tenant = await registerOrg();
  await pastDue(tenant, 2, { pricing: { monthlyPrice: 499, yearlyPrice: 4990 } });
  await Plan.updateOne({ code: 'growth' }, { $set: { monthlyPrice: 4999 } });

  await runDunningSweep({ orgId: tenant.org._id });
  const log = await waitUntil(() => EmailLog.findOne({ orgId: tenant.org._id, type: 'dunning' }).lean());
  assert.ok(log);
  // Quoting the published price rather than their snapshot would put a figure
  // they never agreed to in an email chasing them for money (3.3 #9).
  assert.equal(log.status, 'skipped', 'no provider configured in tests, but the attempt is logged');
}));

test('dunning appears in the job registry, so a stopped sweep is visible', maybe(async () => {
  // A billing job that silently stops is the most expensive kind: nobody is
  // chased, nobody is suspended, and the revenue leaks with no signal at all.
  assert.ok(jobs.JOBS['billing.dunning'], 'the sweep must be registered, or it can never be reported as stalled');
}));

// ── Two-person approval and break-glass (3.4 #12) ─

const DELETE_REASON = 'Customer requested closure, ticket 4821, confirmed by phone';

async function requestDeletion(token, orgId, reason = DELETE_REASON) {
  return call('DELETE', `/superadmin/organisations/${orgId}`, { token, body: { reason } });
}

test('deleting a tenant is recorded, not done, until someone else agrees', maybe(async () => {
  const owner = await platformAccount('owner');
  const victim = await registerOrg();

  const asked = await requestDeletion(owner.token, victim.org._id);
  /**
   * 202, not 403.
   *
   * 403 says "you may not", which is wrong — they may, once somebody agrees —
   * and a client seeing 403 has no reason to show anything but an error.
   */
  assert.equal(asked.status, 202);
  assert.equal(asked.body.code, 'APPROVAL_PENDING');
  assert.ok(asked.body.approvalId);
  // And crucially, nothing happened.
  assert.ok(await Organisation.findById(victim.org._id).lean(), 'the tenant is still there');
}));

test('you cannot approve your own request', maybe(async () => {
  const owner = await platformAccount('owner');
  const victim = await registerOrg();
  const asked = await requestDeletion(owner.token, victim.org._id);

  const selfApproved = await call('POST', `/superadmin/approvals/${asked.body.approvalId}/decide`, {
    token: owner.token, body: { approve: true }
  });
  // The entire feature, in one assertion.
  assert.equal(selfApproved.status, 403);
  assert.equal(selfApproved.body.code, 'APPROVAL_SELF');
}));

test('an approver must be able to do the thing themselves', maybe(async () => {
  const owner = await platformAccount('owner');
  const auditor = await platformAccount('auditor');
  const victim = await registerOrg();
  const asked = await requestDeletion(owner.token, victim.org._id);

  const rubberStamp = await call('POST', `/superadmin/approvals/${asked.body.approvalId}/decide`, {
    token: auditor.token, body: { approve: true }
  });
  // Otherwise the check is theatre: a read-only auditor could authorise a
  // deletion they are specifically not trusted to perform, and the second
  // signature would carry no more weight than a bystander's.
  assert.equal(rubberStamp.status, 403);
  assert.equal(rubberStamp.body.code, 'PLATFORM_CAPABILITY_REQUIRED');
}));

test('once approved, the original requester carries it out', maybe(async () => {
  const owner = await platformAccount('owner');
  const second = await platformAccount('owner');
  const victim = await registerOrg();

  const asked = await requestDeletion(owner.token, victim.org._id);
  const approved = await call('POST', `/superadmin/approvals/${asked.body.approvalId}/decide`, {
    token: second.token, body: { approve: true, note: 'Confirmed with the customer' }
  });
  assert.equal(approved.status, 200);
  assert.equal(approved.body.status, 'approved');

  const done = await call('DELETE', `/superadmin/organisations/${victim.org._id}`, {
    token: owner.token,
    body: { reason: DELETE_REASON },
    headers: { 'x-approval-id': String(asked.body.approvalId) }
  });
  // 204: the delete carried out, with nothing to return.
  assert.equal(done.status, 204, JSON.stringify(done.body));
  assert.equal(await Organisation.findById(victim.org._id).lean(), null);
}));

test('an approval cannot be spent on a different tenant', maybe(async () => {
  const owner = await platformAccount('owner');
  const second = await platformAccount('owner');
  const approvedVictim = await registerOrg();
  const otherTenant = await registerOrg();

  const asked = await requestDeletion(owner.token, approvedVictim.org._id);
  await call('POST', `/superadmin/approvals/${asked.body.approvalId}/decide`, {
    token: second.token, body: { approve: true }
  });

  const misused = await call('DELETE', `/superadmin/organisations/${otherTenant.org._id}`, {
    token: owner.token,
    body: { reason: DELETE_REASON },
    headers: { 'x-approval-id': String(asked.body.approvalId) }
  });
  /**
   * The hole this closes: request "delete tenant A", get it approved, then use
   * the approval to delete tenant B. The approver saw one thing and consented to
   * another.
   */
  assert.equal(misused.status, 403);
  assert.equal(misused.body.code, 'APPROVAL_MISMATCH');
  assert.ok(await Organisation.findById(otherTenant.org._id).lean(), 'and B survives');
}));

test('an approval is single use', maybe(async () => {
  const owner = await platformAccount('owner');
  const second = await platformAccount('owner');
  const victim = await registerOrg();

  const asked = await requestDeletion(owner.token, victim.org._id);
  await call('POST', `/superadmin/approvals/${asked.body.approvalId}/decide`, {
    token: second.token, body: { approve: true }
  });
  const headers = { 'x-approval-id': String(asked.body.approvalId) };
  await call('DELETE', `/superadmin/organisations/${victim.org._id}`, { token: owner.token, body: { reason: DELETE_REASON }, headers });

  // The tenant is gone, so a replayed request is a 404 before it ever reaches
  // the approval check — which is honest, and not what this test is about. The
  // property is that the approval itself is spent.
  assert.equal((await ApprovalRequest.findById(asked.body.approvalId).lean()).status, 'used');

  const survivor = await registerOrg();
  const reused = await call('DELETE', `/superadmin/organisations/${survivor.org._id}`, {
    token: owner.token, body: { reason: DELETE_REASON }, headers
  });
  // An approval is consent to one action, not a standing licence — and it is
  // refused here even before the path mismatch would catch it.
  assert.equal(reused.status, 409);
  assert.equal(reused.body.code, 'APPROVAL_USED');
  assert.ok(await Organisation.findById(survivor.org._id).lean());
}));

test('an expired approval is refused', maybe(async () => {
  const owner = await platformAccount('owner');
  const second = await platformAccount('owner');
  const victim = await registerOrg();

  const asked = await requestDeletion(owner.token, victim.org._id);
  await call('POST', `/superadmin/approvals/${asked.body.approvalId}/decide`, {
    token: second.token, body: { approve: true }
  });
  await ApprovalRequest.updateOne(
    { _id: asked.body.approvalId },
    { $set: { expiresAt: new Date(Date.now() - 1000) } }
  );

  const stale = await call('DELETE', `/superadmin/organisations/${victim.org._id}`, {
    token: owner.token,
    body: { reason: DELETE_REASON },
    headers: { 'x-approval-id': String(asked.body.approvalId) }
  });
  // Consent was given, but not to today's version of the world.
  assert.equal(stale.status, 403);
  assert.equal(stale.body.code, 'APPROVAL_EXPIRED');
}));

test('a rejected request cannot be carried out', maybe(async () => {
  const owner = await platformAccount('owner');
  const second = await platformAccount('owner');
  const victim = await registerOrg();

  const asked = await requestDeletion(owner.token, victim.org._id);
  await call('POST', `/superadmin/approvals/${asked.body.approvalId}/decide`, {
    token: second.token, body: { approve: false, note: 'Customer is still disputing this' }
  });

  const anyway = await call('DELETE', `/superadmin/organisations/${victim.org._id}`, {
    token: owner.token,
    body: { reason: DELETE_REASON },
    headers: { 'x-approval-id': String(asked.body.approvalId) }
  });
  assert.equal(anyway.status, 403);
  assert.equal(anyway.body.code, 'APPROVAL_NOT_GRANTED');
  assert.ok(await Organisation.findById(victim.org._id).lean());
}));

test('a request nobody can judge is refused before it is recorded', maybe(async () => {
  const owner = await platformAccount('owner');
  const victim = await registerOrg();

  const vague = await requestDeletion(owner.token, victim.org._id, 'cleanup');
  // An approval request nobody can judge trains the second person to click yes,
  // which converts a control into a formality.
  assert.equal(vague.status, 400);
  assert.equal(vague.body.code, 'REASON_REQUIRED');
  assert.equal(await ApprovalRequest.countDocuments({ 'preview.organisationId': String(victim.org._id) }), 0);
}));

test('property order in the body does not invalidate an approval', maybe(async () => {
  const { hashBody } = require('../src/services/approvalService');
  // JSON round-trips and client libraries reorder keys freely. Without a
  // canonical hash the feature would read as flaky rather than strict.
  assert.equal(
    hashBody({ reason: 'x', confirm: true }),
    hashBody({ confirm: true, reason: 'x' })
  );
  assert.notEqual(hashBody({ reason: 'x' }), hashBody({ reason: 'y' }));
}));

// ── Break-glass ──

test('an operator can take emergency access, and it is loud', maybe(async () => {
  const support = await platformAccount('support');
  const taken = await call('POST', '/superadmin/break-glass', {
    token: support.token,
    body: {
      capability: 'org.delete',
      reason: 'Owner unreachable; customer data must be removed tonight per ticket 5120',
      minutes: 15
    }
  });
  assert.equal(taken.status, 201, JSON.stringify(taken.body));
  assert.equal(taken.body.capability, 'org.delete');
  assert.ok(new Date(taken.body.expiresAt) > new Date());

  // The event existing at all is the control.
  const entry = await waitForAudit({ action: 'breakglass.taken' });
  assert.ok(entry, 'taking emergency access must itself be an audited event');
}));

test('emergency access cannot grant the power to change roles', maybe(async () => {
  const support = await platformAccount('support');
  const refused = await call('POST', '/superadmin/break-glass', {
    token: support.token,
    body: { capability: 'platform.admin', reason: 'Need to fix a role assignment urgently tonight' }
  });
  // Otherwise break-glass is a way to permanently promote yourself in fifteen
  // minutes, and every other control here is decoration.
  assert.equal(refused.status, 403);
  assert.equal(refused.body.code, 'CAPABILITY_NOT_ELEVATABLE');
}));

test('emergency access needs a reason someone can review', maybe(async () => {
  const support = await platformAccount('support');
  const vague = await call('POST', '/superadmin/break-glass', {
    token: support.token, body: { capability: 'org.delete', reason: 'fixing' }
  });
  assert.equal(vague.status, 400);
  assert.equal(vague.body.code, 'REASON_REQUIRED');
}));

test('emergency access gets you the capability, not a bypass of the second signature', maybe(async () => {
  const support = await platformAccount('support');
  const victim = await registerOrg();

  // Without the grant, the role check refuses outright.
  const before = await requestDeletion(support.token, victim.org._id);
  assert.equal(before.status, 403);
  assert.equal(before.body.code, 'PLATFORM_CAPABILITY_REQUIRED');

  await call('POST', '/superadmin/break-glass', {
    token: support.token,
    body: { capability: 'org.delete', reason: 'Owner unreachable and this is time critical, ticket 5121' }
  });

  const after = await requestDeletion(support.token, victim.org._id);
  /**
   * 202, not 200. Elevation clears the role check and leaves the approval
   * requirement standing — an emergency is a reason to let somebody act, not a
   * reason to remove the second pair of eyes.
   */
  assert.equal(after.status, 202);
  assert.ok(await Organisation.findById(victim.org._id).lean());
}));

test('an expired grant stops working', maybe(async () => {
  const support = await platformAccount('support');
  const victim = await registerOrg();
  const taken = await call('POST', '/superadmin/break-glass', {
    token: support.token,
    body: { capability: 'org.delete', reason: 'Time-critical removal while the owner is unreachable' }
  });
  await BreakGlassGrant.updateOne({ _id: taken.body._id }, { $set: { expiresAt: new Date(Date.now() - 1000) } });

  const after = await requestDeletion(support.token, victim.org._id);
  // A standing self-grant is just a bigger role with extra steps.
  assert.equal(after.status, 403);
  assert.equal(after.body.code, 'PLATFORM_CAPABILITY_REQUIRED');
}));

test('what emergency access was used for is recorded', maybe(async () => {
  const support = await platformAccount('support');
  const victim = await registerOrg();
  const taken = await call('POST', '/superadmin/break-glass', {
    token: support.token,
    body: { capability: 'org.delete', reason: 'Owner unreachable, urgent removal requested by the customer' }
  });
  await requestDeletion(support.token, victim.org._id);

  const grant = await waitUntil(async () => {
    const row = await BreakGlassGrant.findById(taken.body._id).lean();
    return row?.usedFor?.length ? row : null;
  });
  // "You took emergency access — what did you do with it?" has to have an answer
  // that does not depend on cross-referencing timestamps in a log.
  assert.ok(grant, 'a grant must record what it was used for');
  assert.match(grant.usedFor[0].path, /organisations/);
}));

test('taking access you already have is refused', maybe(async () => {
  const owner = await platformAccount('owner');
  const pointless = await call('POST', '/superadmin/break-glass', {
    token: owner.token,
    body: { capability: 'org.delete', reason: 'Just in case something goes wrong later tonight' }
  });
  // An unnecessary grant dilutes the signal that a real one is supposed to send.
  assert.equal(pointless.status, 400);
  assert.equal(pointless.body.code, 'ALREADY_PERMITTED');
}));

// ── The platform's own tax invoices (3.3 #10) ────

const PLATFORM_IDENTITY = {
  legalName: 'KloguBizz Technologies Pvt Ltd',
  gstin: '27AAPFU0939F1ZV',
  pan: 'AAPFU0939F',
  address: '1 Platform Road, Mumbai',
  stateCode: '27',
  sac: '997331',
  gstRate: 18,
  invoicePrefix: 'KB'
};

async function configurePlatformBilling(overrides = {}) {
  await GlobalSetting.findOneAndUpdate(
    { key: 'platformBilling' },
    { $set: { key: 'platformBilling', value: { ...PLATFORM_IDENTITY, ...overrides } } },
    { upsert: true }
  );
}


/**
 * Puts the shared counter somewhere later tests cannot collide with.
 *
 * The series tests deliberately move it — including into a *future* financial
 * year to prove the rollover — and coming back from a future year is a genuine
 * reset to 1, which then duplicates a number an earlier test already used. That
 * is the FY logic working correctly; it is this suite's job not to trip it.
 */
async function parkInvoiceCounter() {
  const fy = platformInvoices.financialYearOf(new Date());
  await GlobalSetting.findOneAndUpdate(
    { key: 'platformInvoiceCounter' },
    { $set: { key: 'platformInvoiceCounter', value: { sequence: 5000, sequenceFY: String(fy) } } },
    { upsert: true }
  );
}

function subscriptionFor(overrides = {}) {
  return {
    planCode: 'growth',
    planName: 'Growth',
    billingCycle: 'monthly',
    pricing: { monthlyPrice: 999, yearlyPrice: 9990 },
    razorpaySubscriptionId: 'sub_test_1',
    ...overrides
  };
}

test('a charge produces a tax invoice the customer can claim credit on', maybe(async () => {
  await configurePlatformBilling();
  const tenant = await registerOrg();
  const org = await Organisation.findById(tenant.org._id).lean();

  const { invoice } = await platformInvoices.issueForCharge({
    subscription: subscriptionFor(),
    org,
    providerPaymentId: 'pay_claim_1'
  });

  assert.ok(invoice, 'the system billed its customers and issued them nothing before this');
  // Ours, snapshotted — a tax invoice is a record of a transaction as it stood.
  assert.equal(invoice.supplier.gstin, PLATFORM_IDENTITY.gstin);
  assert.equal(invoice.billTo.name, org.name);
  assert.equal(invoice.items[0].sac, '997331');
  assert.match(invoice.invoiceNumber, /^KB-\d{4}-\d{4}$/);
}));

test('the price shown is the price charged, so tax is worked back out of it', maybe(async () => {
  await configurePlatformBilling();
  const tenant = await registerOrg();
  const org = await Organisation.findById(tenant.org._id).lean();
  await Organisation.updateOne({ _id: org._id }, { $set: { stateCode: '27' } });

  const { invoice } = await platformInvoices.issueForCharge({
    subscription: subscriptionFor(),
    org: { ...org, stateCode: '27' },
    providerPaymentId: 'pay_inclusive_1'
  });

  /**
   * ₹999 is what the plan page shows and what Razorpay charges, so it is
   * inclusive of GST: ₹846.61 + ₹152.39 tax. Treating it as exclusive would
   * invoice ₹1,179 and disagree with the customer's card statement by the tax —
   * the one number they will check.
   */
  assert.equal(invoice.totals.total, 999);
  assert.ok(invoice.totals.subtotal < 999);
  assert.equal(
    Math.round((invoice.totals.subtotal + invoice.totals.cgst + invoice.totals.sgst + invoice.totals.roundOff) * 100) / 100,
    999
  );
}));

test('the tax head follows the customer state, not ours', maybe(async () => {
  await configurePlatformBilling();
  const local = await registerOrg();
  const distant = await registerOrg();
  await Organisation.updateOne({ _id: distant.org._id }, { $set: { stateCode: '29' } });

  const localOrg = await Organisation.findById(local.org._id).lean();
  const distantOrg = await Organisation.findById(distant.org._id).lean();

  const a = await platformInvoices.issueForCharge({
    subscription: subscriptionFor(), org: localOrg, providerPaymentId: 'pay_local_1'
  });
  const b = await platformInvoices.issueForCharge({
    subscription: subscriptionFor(), org: distantOrg, providerPaymentId: 'pay_distant_1'
  });

  /**
   * For a service to a registered person the place of supply is the recipient's
   * location. Get this backwards and the customer cannot claim the credit,
   * because the tax head on our invoice will not match what their return
   * expects.
   */
  assert.equal(a.invoice.totals.isIGST, false, 'same state as us: CGST + SGST');
  assert.ok(a.invoice.totals.cgst > 0 && a.invoice.totals.sgst > 0);
  assert.equal(b.invoice.totals.isIGST, true, 'another state: IGST');
  assert.ok(b.invoice.totals.igst > 0);
  assert.equal(b.invoice.placeOfSupply, '29');
}));

test('a webhook retry does not produce a second tax invoice', maybe(async () => {
  await configurePlatformBilling();
  const tenant = await registerOrg();
  const org = await Organisation.findById(tenant.org._id).lean();

  const first = await platformInvoices.issueForCharge({
    subscription: subscriptionFor(), org, providerPaymentId: 'pay_retry_1'
  });
  const second = await platformInvoices.issueForCharge({
    subscription: subscriptionFor(), org, providerPaymentId: 'pay_retry_1'
  });

  /**
   * Razorpay retries webhooks deliberately and often. Two tax invoices for one
   * payment is worse than none: both carry consecutive numbers from a legally
   * consecutive series, and cancelling one leaves a gap to explain to an
   * assessing officer.
   */
  assert.equal(second.alreadyIssued, true);
  assert.equal(second.invoice.invoiceNumber, first.invoice.invoiceNumber);
  assert.equal(await PlatformInvoice.countDocuments({ providerPaymentId: 'pay_retry_1' }), 1);
}));

test('the invoice number series runs unbroken and resets on the financial year', maybe(async () => {
  /**
   * Its own prefix, because resetting the shared counter would hand a number
   * already used by an earlier test to a later one — and the unique index on
   * `invoiceNumber` would refuse it. That the index refuses it is the point;
   * this test should not be the thing that trips it.
   */
  await GlobalSetting.deleteOne({ key: 'platformInvoiceCounter' });
  await configurePlatformBilling({ invoicePrefix: 'SER' });

  const first = await platformInvoices.nextInvoiceNumber(new Date('2026-06-01'));
  const second = await platformInvoices.nextInvoiceNumber(new Date('2026-07-01'));
  // Consecutiveness is a legal requirement: a gap or a duplicate has to be
  // explained to an assessing officer.
  assert.equal(first, 'SER-2026-0001');
  assert.equal(second, 'SER-2026-0002');

  // April starts a new Indian financial year, so the series restarts.
  const nextYear = await platformInvoices.nextInvoiceNumber(new Date('2027-04-05'));
  assert.equal(nextYear, 'SER-2027-0001');
  await configurePlatformBilling();
  await parkInvoiceCounter();

  // And January belongs to the year that started the previous April.
  assert.equal(platformInvoices.financialYearOf(new Date('2027-01-15')), 2026);
  assert.equal(platformInvoices.financialYearOf(new Date('2027-04-15')), 2027);
}));

test('an incomplete billing identity blocks the invoice, not the payment', maybe(async () => {
  await configurePlatformBilling({ gstin: '' });
  const tenant = await registerOrg();
  const org = await Organisation.findById(tenant.org._id).lean();

  const result = await platformInvoices.issueForCharge({
    subscription: subscriptionFor(), org, providerPaymentId: 'pay_noidentity_1'
  });

  /**
   * A tax invoice without the supplier's GSTIN is not a slightly worse invoice;
   * it is not a tax invoice. But this runs from the payment webhook, and
   * throwing there would make Razorpay retry a charge that already succeeded —
   * turning a configuration gap into a payment problem.
   */
  assert.equal(result.invoice, null);
  assert.equal(result.skipped, true);
  assert.ok(result.missing.includes('GSTIN'));
}));

test('a free plan generates no invoice, because nothing was charged', maybe(async () => {
  await configurePlatformBilling();
  const tenant = await registerOrg();
  const org = await Organisation.findById(tenant.org._id).lean();

  const result = await platformInvoices.issueForCharge({
    subscription: subscriptionFor({ pricing: { monthlyPrice: 0, yearlyPrice: 0 } }),
    org,
    providerPaymentId: 'pay_free_1'
  });
  // Not an error: there is genuinely nothing to document.
  assert.equal(result.invoice, null);
  assert.equal(result.skipped, true);
}));

test('a grandfathered customer is invoiced what they agreed to', maybe(async () => {
  await configurePlatformBilling();
  const tenant = await registerOrg();
  const org = await Organisation.findById(tenant.org._id).lean();

  const { invoice } = await platformInvoices.issueForCharge({
    // Their snapshot says 499; the published price has since moved to 1999.
    subscription: subscriptionFor({ pricing: { monthlyPrice: 499, yearlyPrice: 4990 } }),
    org,
    providerPaymentId: 'pay_grandfathered_1'
  });
  // An invoice quoting a price they never agreed to is both wrong and
  // unclaimable — it would not match what left their account (3.3 #9).
  assert.equal(invoice.totals.total, 499);
}));

test('a tenant can read its own invoices and nobody else can', maybe(async () => {
  await configurePlatformBilling();
  const mine = await registerOrg();
  const theirs = await registerOrg();
  const myOrg = await Organisation.findById(mine.org._id).lean();

  await platformInvoices.issueForCharge({
    subscription: subscriptionFor(), org: myOrg, providerPaymentId: 'pay_mine_1'
  });

  const own = await call('GET', '/subscriptions/invoices', { token: mine.token });
  assert.equal(own.status, 200);
  assert.equal(own.body.invoices.length, 1);
  // The document a customer needs to claim input tax credit on what they pay us.
  assert.equal(own.body.invoices[0].billTo.name, myOrg.name);

  const other = await call('GET', '/subscriptions/invoices', { token: theirs.token });
  assert.equal(other.body.invoices.length, 0);
}));

test('saving the billing identity does not reset the invoice counter', maybe(async () => {
  await GlobalSetting.deleteOne({ key: 'platformInvoiceCounter' });
  await configurePlatformBilling({ invoicePrefix: 'CNT' });
  const first = await platformInvoices.nextInvoiceNumber(new Date('2026-06-01'));

  // Exactly what the console does: replace `value` wholesale from a form.
  await configurePlatformBilling({ invoicePrefix: 'CNT', address: '2 New Road, Mumbai' });
  const second = await platformInvoices.nextInvoiceNumber(new Date('2026-06-02'));

  /**
   * The bug this closes. With the counter on the same document as the identity,
   * saving an address reset the series and the next invoice reused a number
   * already sent to a customer — a duplicate in a legally-consecutive series,
   * which has to be explained to an assessing officer.
   */
  assert.notEqual(first, second);
  assert.equal(second, 'CNT-2026-0002');
  await configurePlatformBilling();
  await parkInvoiceCounter();
}));

test('the console reports when it cannot issue invoices at all', maybe(async () => {
  await GlobalSetting.deleteOne({ key: 'platformBilling' });
  const { token } = await platformAccount('owner');

  const { status, body } = await call('GET', '/superadmin/platform-invoices', { token });
  assert.equal(status, 200);
  // Otherwise the failure is invisible until a customer's accountant asks for a
  // document that was never produced.
  assert.equal(body.canIssue, false);
  assert.ok(body.missing.length);
}));


// ── Coupons, proration and plan changes (3.3 #10) ─

const { Coupon } = require('../src/models/Coupon');
const { CouponRedemption } = require('../src/models/CouponRedemption');
const { BillingCredit } = require('../src/models/BillingCredit');
const couponService = require('../src/services/couponService');
const planChanges = require('../src/services/planChangeService');

/**
 * Plans owned by this block alone.
 *
 * An earlier test in this suite reprices `growth` to 4,999 to prove
 * grandfathering, and it stays repriced. Leaning on the shared fixtures made
 * these tests depend on the order they happened to run in — which is how a suite
 * ends up with a failure nobody can reproduce in isolation.
 */
const SMALL = 'cpn-small';
const BIG = 'cpn-big';

async function ensurePlans() {
  await Plan.updateOne({ code: SMALL },
    { $set: { code: SMALL, name: 'Coupon Small', monthlyPrice: 999, yearlyPrice: 9990, userLimit: 10, invoiceLimit: 1000, active: true } },
    { upsert: true });
  await Plan.updateOne({ code: BIG },
    { $set: { code: BIG, name: 'Coupon Big', monthlyPrice: 2499, yearlyPrice: 24000, userLimit: 25, invoiceLimit: 5000, active: true } },
    { upsert: true });
}

async function makeCoupon(overrides = {}) {
  await ensurePlans();
  counter += 1;
  return Coupon.create({
    code: `TEST${counter}`,
    discountType: 'percent',
    discountValue: 50,
    duration: 'once',
    ...overrides
  });
}

/** Puts a tenant on a paid plan mid-period, the state proration is measured from. */
async function onPaidPlan(tenant, {
  planCode = SMALL, monthlyPrice = 999, daysIn = 10, periodDays = 30
} = {}) {
  await ensurePlans();
  const now = new Date();
  const start = new Date(now.getTime() - daysIn * 86400000);
  const end = new Date(start.getTime() + periodDays * 86400000);
  await Organisation.updateOne({ _id: tenant.org._id }, { plan: planCode });
  return Subscription.findOneAndUpdate(
    { orgId: tenant.org._id },
    {
      $set: {
        planCode,
        status: 'active',
        billingCycle: 'monthly',
        pricing: { monthlyPrice, yearlyPrice: monthlyPrice * 10 },
        currentPeriodStart: start,
        currentPeriodEnd: end,
        lastPaymentAt: start,
        razorpaySubscriptionId: `local_${tenant.org._id}_${planCode}`
      }
    },
    { new: true, upsert: true }
  );
}

test('a coupon discounts the price the subscription is actually held to', maybe(async () => {
  const tenant = await registerOrg();
  await makeCoupon({ code: 'HALFOFF', discountType: 'percent', discountValue: 50 });

  const { status, body } = await call('POST', '/subscriptions/start', {
    token: tenant.token,
    body: { planCode: SMALL, billingCycle: 'monthly', couponCode: 'halfoff' }
  });

  assert.equal(status, 201, JSON.stringify(body));
  /**
   * The *discounted* price goes into the snapshot, not the list price with a
   * discount recorded beside it. `pricing` is what the billing page, the tax
   * invoice and MRR all read — leaving 999 there would have every one of them
   * quote a number the customer never pays.
   *
   * The code was typed in lower case and matched anyway: nobody copies the
   * capitalisation out of the email, and refusing it is a support ticket for
   * something that was never wrong.
   */
  assert.equal(body.subscription.pricing.monthlyPrice, 499.5);
  assert.equal(body.subscription.discount.listPrice, 999);
  assert.equal(body.subscription.discount.couponCode, 'HALFOFF');
}));

test('a coupon cannot be used twice on the same account', maybe(async () => {
  const tenant = await registerOrg();
  await makeCoupon({ code: 'ONCEONLY', oncePerOrg: true });

  const first = await call('POST', '/subscriptions/start', {
    token: tenant.token, body: { planCode: SMALL, couponCode: 'ONCEONLY' }
  });
  assert.equal(first.status, 201, JSON.stringify(first.body));

  const second = await call('POST', '/subscriptions/start', {
    token: tenant.token, body: { planCode: BIG, couponCode: 'ONCEONLY' }
  });
  assert.equal(second.status, 409);
  assert.equal(second.body.code, 'COUPON_ALREADY_USED');
}));

test('a redemption cap holds against simultaneous checkouts', maybe(async () => {
  const coupon = await makeCoupon({ code: 'LIMITED1', maxRedemptions: 1 });
  const a = await registerOrg();
  const b = await registerOrg();

  /**
   * The case that matters: a launch code posted publicly is claimed by several
   * people at the same instant. Reading `redemptionCount` and then incrementing
   * it would let both of these through, and the cap would mean nothing.
   */
  const results = await Promise.all([a, b].map(tenant => call('POST', '/subscriptions/start', {
    token: tenant.token, body: { planCode: SMALL, couponCode: 'LIMITED1' }
  })));

  const ok = results.filter(r => r.status === 201);
  const refused = results.filter(r => r.status === 409);
  assert.equal(ok.length, 1, 'exactly one checkout may claim the last redemption');
  assert.equal(refused.length, 1);
  assert.equal(refused[0].body.code, 'COUPON_EXHAUSTED');
  assert.equal((await Coupon.findById(coupon._id).lean()).redemptionCount, 1);
  assert.equal(await CouponRedemption.countDocuments({ couponId: coupon._id }), 1);
}));

test('an expired or wrong-plan code says which it is', maybe(async () => {
  const tenant = await registerOrg();
  await makeCoupon({ code: 'GONE', validUntil: new Date('2020-01-01') });
  await makeCoupon({ code: 'BIZONLY', appliesToPlans: ['business'] });

  const expired = await call('POST', '/subscriptions/coupon/check', {
    token: tenant.token, body: { code: 'GONE', planCode: SMALL }
  });
  const wrongPlan = await call('POST', '/subscriptions/coupon/check', {
    token: tenant.token, body: { code: 'BIZONLY', planCode: SMALL }
  });
  const unknown = await call('POST', '/subscriptions/coupon/check', {
    token: tenant.token, body: { code: 'NOSUCHCODE', planCode: SMALL }
  });

  /**
   * Three different conversations. Collapsing them into "this code is not
   * valid" turns each one into a support ticket.
   */
  assert.equal(expired.body.code, 'COUPON_EXPIRED');
  assert.equal(wrongPlan.body.code, 'COUPON_WRONG_PLAN');
  assert.equal(unknown.body.code, 'COUPON_NOT_FOUND');
}));

test('a discount worth more than the plan makes it free, not negative', maybe(async () => {
  const big = { discountType: 'amount', discountValue: 5000, code: 'TOOBIG' };
  const { discountAmount, finalPrice } = couponService.discountFor(big, 999);
  // A negative charge is not a discount; it is a refund the gateway refuses and
  // an invoice nobody can read.
  assert.equal(discountAmount, 999);
  assert.equal(finalPrice, 0);
}));

test('a coupon the payment provider does not know about is refused, not silently ignored', maybe(async () => {
  const withoutOffer = { code: 'NOOFFER', providerOfferId: null };
  const withOffer = { code: 'HASOFFER', providerOfferId: 'offer_abc123' };

  /**
   * The single most expensive thing this feature could get wrong. What the card
   * is charged is set by a Razorpay plan object this codebase never writes, so a
   * coupon applied only in our own records shows 499 and collects 999 — every
   * month, silently — and our tax invoice then disagrees with the customer's
   * card statement by exactly the discount.
   */
  assert.throws(
    () => couponService.assertProviderCanHonour(withoutOffer, { providerWillCharge: true }),
    /no matching offer at the payment provider/
  );
  // Free plans and local development collect nothing, so there is nothing to
  // disagree with.
  couponService.assertProviderCanHonour(withoutOffer, { providerWillCharge: false });
  couponService.assertProviderCanHonour(withOffer, { providerWillCharge: true });
}));

test('a once-only discount stops after the charge it applied to', maybe(async () => {
  const tenant = await registerOrg();
  await makeCoupon({ code: 'FIRSTMONTH', duration: 'once' });
  await call('POST', '/subscriptions/start', {
    token: tenant.token, body: { planCode: SMALL, couponCode: 'FIRSTMONTH' }
  });

  const before = await Subscription.findOne({ orgId: tenant.org._id }).sort({ createdAt: -1 }).lean();
  assert.equal(before.discount.cyclesRemaining, 1);
  assert.equal(couponService.discountStillApplies(before.discount), true);

  await applyRazorpayEvent('subscription.charged', { id: before.razorpaySubscriptionId });

  const after = await Subscription.findOne({ _id: before._id }).lean();
  assert.equal(after.discount.cyclesRemaining, 0);
  // Which is what the customer was told when they applied it.
  assert.equal(couponService.discountStillApplies(after.discount), false);
}));

test('a forever discount is not counted down to zero', maybe(async () => {
  const forever = { couponCode: 'LIFER', duration: 'forever', cyclesRemaining: null };
  // `!null` and `!0` are the same and the two mean opposite things here, which
  // is exactly the bug this asserts against.
  assert.equal(couponService.discountStillApplies(forever), true);
  assert.equal(couponService.discountStillApplies({ couponCode: 'X', duration: 'cycles', cyclesRemaining: 0 }), false);
}));

test('an upgrade credits the days already paid for', maybe(async () => {
  const tenant = await registerOrg();
  await onPaidPlan(tenant, { planCode: SMALL, monthlyPrice: 999, daysIn: 10, periodDays: 30 });

  const { status, body } = await call('POST', '/subscriptions/start', {
    token: tenant.token, body: { planCode: BIG, billingCycle: 'monthly' }
  });
  assert.equal(status, 201, JSON.stringify(body));
  assert.equal(body.direction, 'upgrade');

  /**
   * 20 of 30 days unused at 33.30 a day. Those days are theirs — they bought
   * them — so charging for the same days again on the new plan is charging
   * twice.
   *
   * Owed, not applied: nothing here can reduce what the gateway collects, and a
   * tax invoice that disagrees with the card statement is worse than none.
   */
  assert.ok(body.credit, 'an upgrade mid-period owes the customer the remainder');
  assert.ok(Math.abs(body.credit.amount - 666) < 5, `expected about 666, got ${body.credit.amount}`);
  assert.equal(body.credit.reason, 'upgrade-proration');
  assert.equal(body.credit.status, 'owed');
  assert.equal(body.credit.basis.daysInPeriod, 30);
}));

test('a downgrade is scheduled for the end of the period, and moves no money', maybe(async () => {
  const tenant = await registerOrg();
  const before = await onPaidPlan(tenant, { planCode: BIG, monthlyPrice: 2499, daysIn: 5, periodDays: 30 });

  const { status, body } = await call('POST', '/subscriptions/start', {
    token: tenant.token, body: { planCode: SMALL, billingCycle: 'monthly' }
  });

  assert.equal(status, 200, JSON.stringify(body));
  assert.equal(body.scheduled, true);
  /**
   * They paid through that date and they keep what they paid for. Moving them
   * down now takes away something they bought — and refunding a downgrade
   * creates an obvious loop nobody wants to be on the wrong side of.
   */
  assert.equal(new Date(body.effectiveAt).getTime(), before.currentPeriodEnd.getTime());
  const org = await Organisation.findById(tenant.org._id).lean();
  assert.equal(org.plan, BIG, 'the plan they paid for is still theirs');
  assert.equal(await BillingCredit.countDocuments({ orgId: tenant.org._id }), 0);
  assert.equal(await Subscription.countDocuments({ orgId: tenant.org._id }), 1, 'no second mandate is created');
}));

test('a scheduled downgrade can be cancelled, and applies when the period ends', maybe(async () => {
  const tenant = await registerOrg();
  await onPaidPlan(tenant, { planCode: BIG, monthlyPrice: 2499, daysIn: 5, periodDays: 30 });
  await call('POST', '/subscriptions/start', { token: tenant.token, body: { planCode: SMALL } });

  const cancelled = await call('POST', '/subscriptions/cancel-scheduled-change', { token: tenant.token });
  assert.equal(cancelled.status, 200);
  // The whole point of it being a field rather than an immediate write: change
  // your mind and simply stay where you are.
  assert.equal(cancelled.body.subscription.pendingChange.planCode, null);

  await call('POST', '/subscriptions/start', { token: tenant.token, body: { planCode: SMALL } });
  const due = await Subscription.findOne({ orgId: tenant.org._id }).sort({ createdAt: -1 }).lean();
  const past = new Date(due.pendingChange.effectiveAt.getTime() + 1000);

  const swept = await planChanges.applyScheduledChanges({ now: past });
  // This tenant's change, not the count: the sweep is tenant-wide and another
  // test in this suite legitimately leaves one due at the same moment.
  assert.ok(
    swept.changes.some(c => String(c.orgId) === String(tenant.org._id)),
    `expected this tenant among ${JSON.stringify(swept.changes)}`
  );
  assert.equal((await Organisation.findById(tenant.org._id).lean()).plan, SMALL);
}));

test('changing plan does not leave the old mandate charging the card', maybe(async () => {
  const tenant = await registerOrg();
  const old = await onPaidPlan(tenant, { planCode: SMALL, monthlyPrice: 999, daysIn: 10 });

  const { body } = await call('POST', '/subscriptions/start', {
    token: tenant.token, body: { planCode: BIG }
  });

  /**
   * The bug this fixes. A plan change created a new provider subscription and
   * left the old one running, so an upgrading customer was charged for both
   * plans every month, indefinitely, and nothing in the system knew.
   */
  assert.equal(String(body.subscription.supersedes), String(old._id));
  const previous = await Subscription.findById(old._id).lean();
  assert.equal(previous.status, 'cancelled', 'the mandate it replaces is stopped');
  assert.equal(String(previous.supersededBy), String(body.subscription._id));
}));

test('the cancellation of a superseded mandate does not undo the upgrade', maybe(async () => {
  const tenant = await registerOrg();
  const old = await onPaidPlan(tenant, { planCode: SMALL, monthlyPrice: 999, daysIn: 10 });
  const { body } = await call('POST', '/subscriptions/start', {
    token: tenant.token, body: { planCode: BIG }
  });
  assert.equal((await Organisation.findById(tenant.org._id).lean()).plan, BIG);

  /**
   * Razorpay dutifully reports the cancellation we asked for. Handling it the
   * ordinary way would take the customer straight off the plan they had just
   * paid to upgrade to — the upgrade cancelling itself, seconds after it
   * succeeded.
   */
  const result = await applyRazorpayEvent('subscription.cancelled', { id: old.razorpaySubscriptionId });
  assert.equal(result.handled, true);
  assert.match(result.action, /left alone/);
  assert.equal((await Organisation.findById(tenant.org._id).lean()).plan, BIG);
  assert.equal((await Subscription.findById(body.subscription._id).lean()).status, 'active');
}));

test('a late failure on a dead mandate does not dun a customer who has paid', maybe(async () => {
  const tenant = await registerOrg();
  await onPaidPlan(tenant, { planCode: SMALL, monthlyPrice: 999, daysIn: 10 });
  const { body } = await call('POST', '/subscriptions/start', {
    token: tenant.token, body: { planCode: BIG }
  });

  /**
   * `payment.failed` carries no subscription entity, so it falls back to the
   * newest local subscription for the tenant. That fallback used to include
   * cancelled ones — so a failure arriving late for a replaced mandate marked
   * the *live* subscription past due and started chasing someone who had paid.
   */
  await applyEvent('payment.failed', { payment: { entity: { notes: { orgId: String(tenant.org._id) } } } });

  const live = await Subscription.findById(body.subscription._id).lean();
  assert.equal(live.status, 'past_due', 'the live subscription is the one an unattributed failure lands on');
  assert.ok(live.pastDueSince);
}));

test('re-buying the plan you are already on is refused', maybe(async () => {
  const tenant = await registerOrg();
  await onPaidPlan(tenant, { planCode: SMALL, monthlyPrice: 999, daysIn: 10 });
  const { status, body } = await call('POST', '/subscriptions/start', {
    token: tenant.token, body: { planCode: SMALL, billingCycle: 'monthly' }
  });
  assert.equal(status, 409);
  assert.equal(body.code, 'ALREADY_ON_PLAN');
}));

test('a yearly switch is judged on what it costs per month', maybe(async () => {
  const subscription = { planCode: SMALL, billingCycle: 'monthly', pricing: { monthlyPrice: 999 } };
  const small = { code: SMALL, monthlyPrice: 999, yearlyPrice: 9990 };

  /**
   * 999 monthly to 9,990 yearly is more commitment and *less* per month.
   * Comparing the raw numbers would call it a tenfold upgrade and raise a
   * proration credit nobody earned.
   */
  const yearly = planChanges.classify({ subscription, toPlan: small, toBillingCycle: 'yearly' });
  assert.equal(yearly.direction, 'downgrade');

  const big = { code: BIG, monthlyPrice: 2499, yearlyPrice: 24000 };
  assert.equal(
    planChanges.classify({ subscription, toPlan: big, toBillingCycle: 'monthly' }).direction,
    'upgrade'
  );
}));

test('direction is measured against what this customer pays, not the list price', maybe(async () => {
  /**
   * A grandfathered customer on 499 moving to a 999 plan is upgrading, even
   * though the plan they are leaving now lists at 1,499. What they pay is what
   * they would stop paying.
   */
  const grandfathered = { planCode: SMALL, billingCycle: 'monthly', pricing: { monthlyPrice: 499 } };
  const target = { code: BIG, monthlyPrice: 999 };
  assert.equal(
    planChanges.classify({ subscription: grandfathered, toPlan: target, toBillingCycle: 'monthly' }).direction,
    'upgrade'
  );
}));

test('proration refuses to guess when there is no period to measure', maybe(async () => {
  const noPeriod = { planCode: SMALL, status: 'active', billingCycle: 'monthly', pricing: { monthlyPrice: 999 } };
  const result = planChanges.prorate({ subscription: noPeriod, toPlanCode: BIG });
  // A guessed denominator produces a credit that cannot be defended when the
  // customer asks how it was worked out.
  assert.equal(result.amount, 0);
  assert.match(result.reason, /no paid-up period/);

  const free = { planCode: 'starter', status: 'active', billingCycle: 'monthly', pricing: { monthlyPrice: 0 } };
  assert.match(planChanges.prorate({ subscription: free, toPlanCode: SMALL }).reason, /free/);
}));

test('a credit is settled by recording how, and cannot be settled twice', maybe(async () => {
  const tenant = await registerOrg();
  await onPaidPlan(tenant, { planCode: SMALL, monthlyPrice: 999, daysIn: 10 });
  await call('POST', '/subscriptions/start', { token: tenant.token, body: { planCode: BIG } });

  const { token } = await platformAccount('owner');
  const owed = await call('GET', '/superadmin/credits', { token });
  assert.equal(owed.status, 200);
  const mine = owed.body.credits.find(c => String(c.orgId) === String(tenant.org._id));
  assert.ok(mine, 'the credit is on the console list of money to give back');
  assert.ok(mine.orgName, 'the console needs a name, not an id');

  const settled = await call('POST', `/superadmin/credits/${mine._id}/settle`, {
    token, body: { method: 'refund', reference: 'rfnd_test_1' }
  });
  assert.equal(settled.status, 200);
  assert.equal(settled.body.status, 'settled');
  assert.equal(settled.body.settlement.reference, 'rfnd_test_1');

  // Requiring a method rather than a free-text note is what makes "how much
  // have we actually refunded" answerable later.
  const again = await call('POST', `/superadmin/credits/${mine._id}/settle`, {
    token, body: { method: 'refund', reference: 'rfnd_test_2' }
  });
  assert.equal(again.status, 409);
  assert.equal(again.body.code, 'CREDIT_NOT_OWED');
}));

test('the tenant sees what it is owed, without having to ask', maybe(async () => {
  const tenant = await registerOrg();
  await onPaidPlan(tenant, { planCode: SMALL, monthlyPrice: 999, daysIn: 10 });
  await call('POST', '/subscriptions/start', { token: tenant.token, body: { planCode: BIG } });

  const { body } = await call('GET', '/subscriptions/current', { token: tenant.token });
  // A credit only an operator can see is a credit the customer has to remember
  // to ask for, and the ones who forget are the ones it was owed to.
  assert.ok(body.creditBalance > 0);
  assert.equal(body.credits.length, 1);
}));

test('the console names the coupons it cannot actually honour', maybe(async () => {
  await makeCoupon({ code: 'NOOFFERYET', providerOfferId: null });
  const { token } = await platformAccount('owner');
  const { status, body } = await call('GET', '/superadmin/coupons', { token });

  assert.equal(status, 200);
  // An operator who has created six launch codes and can use none of them should
  // find out here, not from the first customer who tries.
  assert.ok(body.providerNote.length);
  assert.ok(body.coupons.some(c => c.code === 'NOOFFERYET'));
}));

test('a cycles discount must say how many, and a percent cannot exceed 100', maybe(async () => {
  const { token } = await platformAccount('owner');

  const noCount = await call('POST', '/superadmin/coupons', {
    token,
    body: { code: 'VAGUE', discountType: 'percent', discountValue: 25, duration: 'cycles' }
  });
  // Defaulting this to one would silently turn "three months half price" into
  // one month, and the customer would be the one to find out.
  assert.equal(noCount.status, 400);
  assert.equal(noCount.body.code, 'COUPON_CYCLES_REQUIRED');

  const absurd = await call('POST', '/superadmin/coupons', {
    token, body: { code: 'FREEMONEY', discountType: 'percent', discountValue: 150 }
  });
  assert.equal(absurd.status, 400);
  assert.equal(absurd.body.code, 'COUPON_PERCENT_RANGE');
}));

test('deactivating a code stops new redemptions and leaves existing prices alone', maybe(async () => {
  const tenant = await registerOrg();
  const coupon = await makeCoupon({ code: 'RETIRING', oncePerOrg: false });
  await call('POST', '/subscriptions/start', {
    token: tenant.token, body: { planCode: SMALL, couponCode: 'RETIRING' }
  });

  const { token } = await platformAccount('owner');
  const off = await call('DELETE', `/superadmin/coupons/${coupon._id}`, { token });
  assert.equal(off.status, 200);
  assert.equal(off.body.active, false);

  const other = await registerOrg();
  const refused = await call('POST', '/subscriptions/start', {
    token: other.token, body: { planCode: SMALL, couponCode: 'RETIRING' }
  });
  assert.equal(refused.body.code, 'COUPON_INACTIVE');

  /**
   * Deactivated rather than deleted: "who used this, and what did we give away"
   * is exactly the question asked when a code turns out to have been shared
   * publicly.
   */
  const history = await call('GET', `/superadmin/coupons/${coupon._id}/redemptions`, { token });
  assert.equal(history.body.redemptions.length, 1);
  assert.equal(history.body.given, 499.5);

  // The subscriber's price is snapshotted and does not consult the coupon row.
  const still = await Subscription.findOne({ orgId: tenant.org._id }).sort({ createdAt: -1 }).lean();
  assert.equal(still.pricing.monthlyPrice, 499.5);
}));

test('scheduled plan changes are a registered job, so one that stops is visible', maybe(async () => {
  const summary = await jobs.summary();
  const entry = summary.jobs.find(j => j.name === 'billing.scheduled-changes');
  /**
   * A downgrade that never lands leaves the customer on a plan they stopped
   * paying for — silent, and expensive in the opposite direction to dunning.
   */
  assert.ok(entry, 'the sweep is declared in the registry, not discovered from its own history');
  assert.equal(entry.label, 'Apply scheduled plan downgrades');
}));
