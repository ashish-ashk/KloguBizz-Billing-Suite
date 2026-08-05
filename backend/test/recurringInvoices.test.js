/**
 * Recurring invoices, end to end (2.2 #14).
 *
 * The schedule arithmetic is covered by `recurrenceService.test.js` without a
 * database. What is tested here is the part that can actually hurt a customer:
 * **that a sweep which runs twice, or late, or on two instances at once, cannot
 * produce two invoices for the same period.** A duplicate reminder email is an
 * annoyance; a duplicate tax invoice has to be undone with a credit note.
 *
 * Skipped automatically when no MongoDB is reachable. Uses a throwaway database
 * that is dropped on the way out.
 */
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/klogubizz_recurring_test';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_used_only_by_the_recurring_suite';

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const app = require('../server');
const { Plan } = require('../src/models/Plan');
const { Invoice } = require('../src/models/Invoice');
const { Item } = require('../src/models/Item');
const { Organisation } = require('../src/models/Organisation');
const { RecurringInvoice, RecurringInvoiceRun } = require('../src/models/RecurringInvoice');
const { runRecurringSweep } = require('../src/services/recurringInvoiceService');
const { buildGstr1 } = require('../src/services/gstReturnService');

let server;
let baseUrl;
let dbAvailable = false;

test.before(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 2000 });
    dbAvailable = true;
  } catch {
    console.warn('\n[recurring] No MongoDB on 127.0.0.1:27017 — skipping.\n');
    return;
  }
  await mongoose.connection.dropDatabase();
  // The unique {recurringId, periodKey} index is the entire safety guarantee, and
  // it does not exist until Mongoose has built it. Waiting is not optional here:
  // the concurrency test would otherwise pass or fail depending on timing.
  await RecurringInvoiceRun.init();
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

const maybe = fn => async t => {
  if (!dbAvailable) return t.skip('MongoDB not available');
  return fn(t);
};

let counter = 0;
async function registerOrg() {
  counter += 1;
  const email = `owner${counter}@recurring${counter}.test`;
  const { status, body } = await call('POST', '/auth/register', {
    body: {
      name: `Owner ${counter}`, email, password: 'Password@123',
      orgName: `Recurring Tenant ${counter}`, stateCode: '27', acceptTerms: true
    }
  });
  assert.equal(status, 201, `register failed: ${JSON.stringify(body)}`);
  return { token: body.token, org: body.organisation, email };
}

async function createClient(token, overrides = {}) {
  const { status, body } = await call('POST', '/clients', {
    token,
    body: { companyName: 'Retainer Client', stateCode: '27', email: 'retainer@example.test', gstin: '27AAPFU0939F1ZV', ...overrides }
  });
  assert.equal(status, 201, `client create failed: ${JSON.stringify(body)}`);
  return body;
}

const LINE = { desc: 'Monthly retainer', qty: 1, rate: 20000, gstRate: 18 };

async function createSchedule(token, overrides = {}) {
  const { status, body } = await call('POST', '/recurring-invoices', {
    token,
    body: { title: 'Acme retainer', frequency: 'monthly', items: [LINE], ...overrides }
  });
  assert.equal(status, 201, `schedule create failed: ${JSON.stringify(body)}`);
  return body;
}

/** Backdates `nextRunAt` so the sweep sees the schedule as due. Faking the clock
 *  is not needed — the sweep's whole input is this one field. */
async function makeDue(scheduleId, when = new Date(Date.now() - 60000)) {
  await RecurringInvoice.updateOne({ _id: scheduleId }, { $set: { nextRunAt: when } });
}

// ── Creation ─────────────────────────────────────

test('a schedule is a template, not an invoice — nothing is raised on creation', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token);
  const schedule = await createSchedule(tenant.token, { clientId: client._id });

  assert.equal(schedule.status, 'active');
  assert.equal(schedule.occurrences, 0);
  assert.equal(schedule.scheduleLabel, 'Every month');
  assert.ok(schedule.nextRuns.length >= 3, 'the next few dates are projected for legibility');
  // No invoice, and no invoice number consumed.
  assert.equal(await Invoice.countDocuments({ orgId: tenant.org._id }), 0);
  const org = await Organisation.findById(tenant.org._id).lean();
  assert.equal(org.invoiceSequence, 0);
}));

test('autoSend is refused on a draft-generating schedule rather than silently ignored', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token);
  // There is nothing to send from a draft, so the combination is meaningless.
  const schedule = await createSchedule(tenant.token, {
    clientId: client._id, generateAsDraft: true, autoSend: true
  });
  assert.equal(schedule.autoSend, false);
}));

test('a schedule with no line items or no title is refused', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token);
  assert.equal((await call('POST', '/recurring-invoices', {
    token: tenant.token, body: { title: 'Empty', frequency: 'monthly', items: [], clientId: client._id }
  })).status, 400);
  assert.equal((await call('POST', '/recurring-invoices', {
    token: tenant.token, body: { title: '', frequency: 'monthly', items: [LINE], clientId: client._id }
  })).status, 400);
}));

// ── The idempotency guarantee ────────────────────

test('the sweep generates one invoice, priced by the same engine as a manual one', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token);
  const schedule = await createSchedule(tenant.token, { clientId: client._id });
  await makeDue(schedule._id);

  const result = await runRecurringSweep({ orgId: tenant.org._id });
  assert.equal(result.generated, 1, JSON.stringify(result));

  const invoices = await Invoice.find({ orgId: tenant.org._id }).lean();
  assert.equal(invoices.length, 1);
  const invoice = invoices[0];
  assert.match(invoice.invoiceNumber, /^KLG-\d{4}-\d{3}$/, 'an issued invoice takes a real number');
  assert.equal(invoice.status, 'pending');
  // Intra-state, so CGST+SGST — the same figures the manual path produces.
  assert.equal(invoice.totals.subtotal, 20000);
  assert.equal(invoice.totals.cgst, 1800);
  assert.equal(invoice.totals.sgst, 1800);
  assert.equal(invoice.totals.total, 23600);
  assert.equal(invoice.balanceDue, 23600);
  // The link back, so "where did this invoice come from" is answerable.
  assert.equal(String(invoice.recurringInvoiceId), String(schedule._id));

  const stored = await RecurringInvoice.findById(schedule._id).lean();
  assert.equal(stored.occurrences, 1);
  assert.equal(stored.lastInvoiceNumber, invoice.invoiceNumber);
  assert.ok(new Date(stored.nextRunAt) > new Date(), 'the schedule advanced');
}));

test('running the sweep twice for the same period produces one invoice', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token);
  const schedule = await createSchedule(tenant.token, { clientId: client._id });
  await makeDue(schedule._id);

  await runRecurringSweep({ orgId: tenant.org._id });

  /**
   * Force the schedule back to the **same** period — the situation a corrected
   * date, a restored backup or a clock adjustment creates.
   *
   * It has to be a date inside the current month, not simply "earlier": this is a
   * monthly schedule keyed by `YYYY-MM`, so stepping back far enough to land in
   * the previous month is a genuinely different period and *should* generate.
   */
  const now = new Date();
  const sameMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 6));
  await makeDue(schedule._id, sameMonth);
  const second = await runRecurringSweep({ orgId: tenant.org._id });

  // The {recurringId, periodKey} claim already exists, so the period is skipped.
  assert.equal(second.generated, 0, JSON.stringify(second));
  assert.equal(second.skipped, 1);
  assert.equal(await Invoice.countDocuments({ orgId: tenant.org._id }), 1, 'still exactly one invoice');
}));

test('concurrent sweeps produce exactly one invoice', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token);
  const schedule = await createSchedule(tenant.token, { clientId: client._id });
  await makeDue(schedule._id);

  // Two instances hitting the same schedule at the same moment. They race on the
  // unique run claim, not on invoice creation.
  const results = await Promise.all([
    runRecurringSweep({ orgId: tenant.org._id }), runRecurringSweep({ orgId: tenant.org._id }), runRecurringSweep({ orgId: tenant.org._id }), runRecurringSweep({ orgId: tenant.org._id })
  ]);
  const generated = results.reduce((sum, r) => sum + r.generated, 0);

  assert.equal(generated, 1, `exactly one sweep should generate, got ${generated}`);
  assert.equal(await Invoice.countDocuments({ orgId: tenant.org._id }), 1);
  assert.equal(await RecurringInvoiceRun.countDocuments({ recurringId: schedule._id }), 1);
}));

test('"run now" and the sweep together still produce one invoice for the period', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token);
  const schedule = await createSchedule(tenant.token, { clientId: client._id });
  await makeDue(schedule._id);

  const manual = await call('POST', `/recurring-invoices/${schedule._id}/run-now`, { token: tenant.token, body: {} });
  assert.equal(manual.status, 201, JSON.stringify(manual.body));

  // The sweep must not then generate the same period again — which is why
  // run-now goes through the same claim rather than its own code path.
  await makeDue(schedule._id, new Date(Date.now() - 60000));
  const swept = await runRecurringSweep({ orgId: tenant.org._id });
  assert.equal(swept.generated, 0, JSON.stringify(swept));
  assert.equal(await Invoice.countDocuments({ orgId: tenant.org._id }), 1);

  // And a second manual click is refused with a clear reason.
  await makeDue(schedule._id, new Date(Date.now() - 60000));
  const again = await call('POST', `/recurring-invoices/${schedule._id}/run-now`, { token: tenant.token, body: {} });
  assert.equal(again.status, 409);
  assert.equal(again.body.code, 'ALREADY_GENERATED');
}));

// ── Catch-up after downtime ──────────────────────

test('a schedule behind by several periods catches up one per sweep, not all at once', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token);
  const schedule = await createSchedule(tenant.token, { clientId: client._id, frequency: 'daily' });
  // Five days of downtime.
  await makeDue(schedule._id, new Date(Date.now() - 5 * 86400000));

  const first = await runRecurringSweep({ orgId: tenant.org._id });
  assert.equal(first.generated, 1, 'one per sweep — a backlog must not become a burst');
  assert.equal(await Invoice.countDocuments({ orgId: tenant.org._id }), 1);

  const second = await runRecurringSweep({ orgId: tenant.org._id });
  assert.equal(second.generated, 1);
  assert.equal(await Invoice.countDocuments({ orgId: tenant.org._id }), 2);

  // Each invoice is dated to its own period, not all to today — and each has its
  // own period key, so nothing is deduped away.
  const runs = await RecurringInvoiceRun.find({ recurringId: schedule._id }).sort({ scheduledFor: 1 }).lean();
  assert.equal(runs.length, 2);
  assert.notEqual(runs[0].periodKey, runs[1].periodKey);
}));

test('a schedule absurdly far behind pauses itself instead of emitting a backlog', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token);
  const schedule = await createSchedule(tenant.token, { clientId: client._id, frequency: 'daily' });
  // Two years of daily periods: a misconfiguration or a clock problem, not a
  // genuine backlog anyone wants invoiced.
  await makeDue(schedule._id, new Date(Date.now() - 700 * 86400000));

  const result = await runRecurringSweep({ orgId: tenant.org._id });
  assert.equal(result.generated, 0);
  assert.equal(result.paused, 1);

  const stored = await RecurringInvoice.findById(schedule._id).lean();
  assert.equal(stored.status, 'paused');
  assert.match(stored.lastError, /periods behind/);
  assert.equal(await Invoice.countDocuments({ orgId: tenant.org._id }), 0, 'nothing was generated');
}));

// ── Limits, failures and lifecycle ───────────────

test('endAfterCount completes the schedule after exactly that many invoices', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token);
  const schedule = await createSchedule(tenant.token, {
    clientId: client._id, frequency: 'daily', endAfterCount: 2
  });

  for (let i = 0; i < 4; i += 1) {
    await makeDue(schedule._id, new Date(Date.now() - (4 - i) * 86400000));
    await runRecurringSweep({ orgId: tenant.org._id });
  }

  const stored = await RecurringInvoice.findById(schedule._id).lean();
  assert.equal(stored.occurrences, 2, 'not one more than asked for');
  assert.equal(stored.status, 'completed');
  assert.equal(await Invoice.countDocuments({ orgId: tenant.org._id }), 2);
}));

test('the sweep respects the plan invoice quota and pauses after repeated failures', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token);
  // No invoices allowed at all for this tenant.
  await Organisation.updateOne({ _id: tenant.org._id }, { $set: { 'limitOverrides.invoiceLimit': 1 } });

  const schedule = await createSchedule(tenant.token, { clientId: client._id, frequency: 'daily' });

  // First run consumes the single allowed invoice.
  await makeDue(schedule._id);
  assert.equal((await runRecurringSweep({ orgId: tenant.org._id })).generated, 1);

  /**
   * Subsequent runs are over quota. A background job that ignored the plan would
   * be a way to exceed a capped plan without touching the UI.
   *
   * Each iteration is backdated to a *different* day, because this is a daily
   * schedule and the period key is per-day: reusing today would hit the existing
   * run claim and be skipped as already-generated rather than reaching the quota
   * check at all — which is correct behaviour, and would make this test pass for
   * the wrong reason.
   */
  for (let i = 0; i < 5; i += 1) {
    await makeDue(schedule._id, new Date(Date.now() - (10 - i) * 86400000));
    await runRecurringSweep({ orgId: tenant.org._id });
  }

  const stored = await RecurringInvoice.findById(schedule._id).lean();
  assert.equal(await Invoice.countDocuments({ orgId: tenant.org._id }), 1, 'the quota held');
  assert.equal(stored.status, 'paused', 'it stopped retrying hourly forever');
  assert.match(stored.lastError, /limit/i);

  // The failed attempts are visible, not silent.
  const failures = await RecurringInvoiceRun.countDocuments({ recurringId: schedule._id, status: 'failed' });
  assert.ok(failures >= 1, 'a failed run is recorded so "why has it not invoiced" is answerable');
}));

test('a suspended tenant has no invoices raised on its behalf', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token);
  const schedule = await createSchedule(tenant.token, { clientId: client._id });
  await Organisation.updateOne({ _id: tenant.org._id }, { $set: { status: 'suspended' } });
  await makeDue(schedule._id);

  const result = await runRecurringSweep({ orgId: tenant.org._id });
  // `protect` refuses their own writes; a background job doing it anyway would be
  // a way around the suspension.
  assert.equal(result.generated, 0);
  assert.equal(await Invoice.countDocuments({ orgId: tenant.org._id }), 0);
}));

test('a paused schedule does not run, and resuming does not backfill', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token);
  const schedule = await createSchedule(tenant.token, { clientId: client._id, frequency: 'daily' });

  await call('PUT', `/recurring-invoices/${schedule._id}/status`, { token: tenant.token, body: { status: 'paused' } });
  await makeDue(schedule._id, new Date(Date.now() - 30 * 86400000));
  assert.equal((await runRecurringSweep({ orgId: tenant.org._id })).generated, 0, 'a paused schedule is not swept');

  const resumed = await call('PUT', `/recurring-invoices/${schedule._id}/status`, { token: tenant.token, body: { status: 'active' } });
  assert.equal(resumed.status, 200);
  // Resuming means "from now", not "catch up on the month I was paused" — which
  // would generate back-dated invoices nobody asked for.
  assert.ok(new Date(resumed.body.nextRunAt) > new Date(), 'nextRunAt was rebased forward');
  assert.equal((await runRecurringSweep({ orgId: tenant.org._id })).generated, 0);
  assert.equal(await Invoice.countDocuments({ orgId: tenant.org._id }), 0);
}));

test('deleting a schedule stops it running', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token);
  const schedule = await createSchedule(tenant.token, { clientId: client._id });

  assert.equal((await call('DELETE', `/recurring-invoices/${schedule._id}`, { token: tenant.token })).status, 200);
  await makeDue(schedule._id);
  // The recycle bin must not keep invoicing.
  assert.equal((await runRecurringSweep({ orgId: tenant.org._id })).generated, 0);
  assert.equal(await Invoice.countDocuments({ orgId: tenant.org._id }), 0);
  assert.equal((await call('GET', '/recurring-invoices', { token: tenant.token })).body.total, 0);
}));

// ── Draft mode, stock, and the GST boundary ──────

test('a draft-generating schedule consumes no invoice number and moves no stock', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token);
  const item = await call('POST', '/items', {
    token: tenant.token,
    body: { name: 'Widget', itemCode: 'W-1', type: 'goods', sellingPrice: 100, gstRate: 18, stockQty: 50, unit: 'Nos' }
  });
  assert.equal(item.status, 201);

  const schedule = await createSchedule(tenant.token, {
    clientId: client._id,
    generateAsDraft: true,
    items: [{ desc: 'Widget', itemCode: 'W-1', qty: 5, rate: 100, gstRate: 18 }]
  });
  await makeDue(schedule._id);
  assert.equal((await runRecurringSweep({ orgId: tenant.org._id })).generated, 1);

  const invoice = await Invoice.findOne({ orgId: tenant.org._id }).lean();
  assert.equal(invoice.status, 'draft');
  // A draft must not punch a gap in the tax-invoice series.
  assert.ok(!/^KLG-/.test(invoice.invoiceNumber), `a draft should not take a real number: ${invoice.invoiceNumber}`);
  const org = await Organisation.findById(tenant.org._id).lean();
  assert.equal(org.invoiceSequence, 0);

  const stored = await Item.findOne({ itemCode: 'W-1', orgId: tenant.org._id }).lean();
  assert.equal(stored.stockQty, 50, 'a draft moves no stock, matching the manual path');
}));

test('a schedule itself never reaches a GST return — only the invoices it produces', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token);
  const schedule = await createSchedule(tenant.token, { clientId: client._id });

  const orgId = new mongoose.Types.ObjectId(String(tenant.org._id));
  // `report.sections.b2b`, not `report.b2b` — the latter is always undefined,
  // which makes a length assertion on it pass without proving anything.
  let report = await buildGstr1(orgId, { from: '2020-01-01', to: '2099-12-31' });
  assert.equal(report.sections.b2b.length, 0, 'a schedule alone declares nothing');

  await makeDue(schedule._id);
  await runRecurringSweep({ orgId: tenant.org._id });

  report = await buildGstr1(orgId, { from: '2020-01-01', to: '2099-12-31' });
  // The generated invoice *is* reportable — recurring revenue must not be
  // invisible to the return.
  assert.equal(report.sections.b2b.length, 1);
  assert.equal(report.sections.b2b[0].inv.length, 1);
  assert.ok(!JSON.stringify(report).includes('Acme retainer'), 'the schedule title is not a document');
}));

// ── Run history, preview, isolation ──────────────

test('the run log records what happened, including the failures', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token);
  const schedule = await createSchedule(tenant.token, { clientId: client._id });
  await makeDue(schedule._id);
  await runRecurringSweep({ orgId: tenant.org._id });

  const runs = await call('GET', `/recurring-invoices/${schedule._id}/runs`, { token: tenant.token });
  assert.equal(runs.status, 200);
  assert.equal(runs.body.total, 1);
  assert.equal(runs.body.data[0].status, 'generated');
  assert.ok(runs.body.data[0].invoiceNumber);
  assert.ok(runs.body.data[0].periodKey);
}));

test('preview reports what would happen without creating anything', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token);
  const schedule = await createSchedule(tenant.token, { clientId: client._id });
  await makeDue(schedule._id);

  const preview = await call('GET', '/recurring-invoices/preview', { token: tenant.token });
  assert.equal(preview.status, 200);
  assert.equal(preview.body.dryRun, true);
  assert.equal(preview.body.generated, 1, 'it reports the intent');
  // The only safe way to inspect a schedule that is behind.
  assert.equal(await Invoice.countDocuments({ orgId: tenant.org._id }), 0, 'and creates nothing');
  assert.equal(await RecurringInvoiceRun.countDocuments({ recurringId: schedule._id }), 0);
}));

test('changing the frequency rebases the next run rather than letting one more slip through', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token);
  const schedule = await createSchedule(tenant.token, { clientId: client._id, frequency: 'monthly' });

  const updated = await call('PUT', `/recurring-invoices/${schedule._id}`, {
    token: tenant.token, body: { frequency: 'yearly' }
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.frequency, 'yearly');
  assert.equal(updated.body.scheduleLabel, 'Every year');
  // Otherwise next month's date survives and one more monthly invoice goes out
  // after the change — which reads as the edit not having worked.
  const next = new Date(updated.body.nextRunAt);
  assert.ok(next > new Date(Date.now() + 300 * 86400000), `expected roughly a year out, got ${next.toISOString()}`);
}));

test('one tenant cannot see or run another tenant\'s schedules', maybe(async () => {
  const a = await registerOrg();
  const b = await registerOrg();
  const clientA = await createClient(a.token);
  const schedule = await createSchedule(a.token, { clientId: clientA._id });

  assert.equal((await call('GET', `/recurring-invoices/${schedule._id}`, { token: b.token })).status, 404);
  // A valid payload on purpose: a title too short would 400 at validation and
  // never reach the tenant check, so the test would pass without proving it.
  assert.equal((await call('PUT', `/recurring-invoices/${schedule._id}`, { token: b.token, body: { title: 'Stolen retainer' } })).status, 404);
  assert.equal((await call('POST', `/recurring-invoices/${schedule._id}/run-now`, { token: b.token, body: {} })).status, 404);
  assert.equal((await call('DELETE', `/recurring-invoices/${schedule._id}`, { token: b.token })).status, 404);
  assert.equal((await call('GET', '/recurring-invoices', { token: b.token })).body.total, 0);
}));

test('the sweep can be scoped to one tenant without touching another', maybe(async () => {
  const a = await registerOrg();
  const b = await registerOrg();
  const scheduleA = await createSchedule(a.token, { clientId: (await createClient(a.token))._id });
  const scheduleB = await createSchedule(b.token, { clientId: (await createClient(b.token))._id });
  await makeDue(scheduleA._id);
  await makeDue(scheduleB._id);

  const result = await runRecurringSweep({ orgId: a.org._id });
  assert.equal(result.generated, 1);
  assert.equal(await Invoice.countDocuments({ orgId: a.org._id }), 1);
  assert.equal(await Invoice.countDocuments({ orgId: b.org._id }), 0, 'B was untouched');
}));
