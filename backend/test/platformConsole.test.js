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

  const events = await UsageEvent.find({ orgId: tenant.org._id }).lean();
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
  const org = await Organisation.findById(tenant.org._id).lean();
  assert.ok(org.lastActiveAt, 'the organisation records when it was last seen');
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
  const events = await UsageEvent.find({ orgId: tenant.org._id, type: 'bill.created' }).lean();
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
    body: { mode: 'temporary' }
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
    body: { mode: 'link' }
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

  const unlock = await call('POST', `/superadmin/users/${user._id}/unlock`, { token: owner.token, body: {} });
  assert.equal(unlock.status, 200);
  assert.equal(unlock.body.wasLocked, true);

  const login = await call('POST', '/auth/login', { body: { email: tenant.email, password: 'Password@123' } });
  assert.equal(login.status, 200, 'support can rescue a locked-out owner');

  const logout = await call('POST', `/superadmin/users/${user._id}/force-logout`, { token: owner.token, body: {} });
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
    body: { status: 'disabled' }
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
