/**
 * Invite, password-reset and suspension flows against a real MongoDB.
 *
 * These are the flows Phase 2 introduced or repaired: before this, invited
 * teammates were permanently locked out, there was no password recovery at all,
 * and suspending an organisation did nothing.
 *
 * Skipped automatically when no MongoDB is reachable. Uses a throwaway database
 * that is dropped on the way out.
 */
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/klogubizz_authflow_test';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_used_only_by_the_auth_flow_suite';

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const app = require('../server');
const { Plan } = require('../src/models/Plan');
const { User } = require('../src/models/User');
const { Organisation } = require('../src/models/Organisation');
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
    console.warn('\n[auth-flows] No MongoDB on 127.0.0.1:27017 — skipping.\n');
    return;
  }
  await mongoose.connection.dropDatabase();
  await Plan.create([
    { code: 'starter', name: 'Starter', monthlyPrice: 0, yearlyPrice: 0, userLimit: 5, invoiceLimit: 50, sortOrder: 0 }
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

let counter = 0;
async function registerOrg() {
  counter += 1;
  const email = `owner${counter}@flow${counter}.test`;
  const { status, body } = await call('POST', '/auth/register', {
    body: {
      name: `Owner ${counter}`, email, password: 'Password@123',
      orgName: `Flow Tenant ${counter}`, stateCode: '27', acceptTerms: true
    }
  });
  assert.equal(status, 201, `register failed: ${JSON.stringify(body)}`);
  return { token: body.token, org: body.organisation, email, password: 'Password@123' };
}

/** Pulls the plaintext token out of the local-mode URL the API hands back. */
function tokenFromUrl(url) {
  assert.ok(url, 'expected a link to be returned in local mode');
  return decodeURIComponent(new URL(url).searchParams.get('token'));
}

const maybe = fn => async t => {
  if (!dbAvailable) return t.skip('MongoDB not available');
  return fn(t);
};

// ── Invitations ──────────────────────────────────

test('an invited teammate can actually activate their account and sign in', maybe(async () => {
  const owner = await registerOrg();
  const invite = await call('POST', '/users/invite', {
    token: owner.token,
    body: { name: 'New Teammate', email: `mate${counter}@flow.test`, role: 'accountant' }
  });
  assert.equal(invite.status, 201);
  const inviteToken = tokenFromUrl(invite.body.inviteUrl);

  // Before activation the account exists but cannot be used — this is exactly
  // the state every invited user used to be stuck in forever.
  const premature = await call('POST', '/auth/login', {
    body: { email: `mate${counter}@flow.test`, password: 'anything' }
  });
  assert.equal(premature.status, 401);

  // The accept screen can show who is being invited, and to which org.
  const details = await call('GET', `/auth/invite/${encodeURIComponent(inviteToken)}`);
  assert.equal(details.status, 200);
  assert.equal(details.body.name, 'New Teammate');
  assert.equal(details.body.role, 'accountant');
  assert.equal(details.body.orgName, owner.org.name);

  const accepted = await call('POST', '/auth/accept-invite', {
    body: { token: inviteToken, password: 'NewMate@123', acceptTerms: true }
  });
  assert.equal(accepted.status, 200, JSON.stringify(accepted.body));
  // Accepting signs them straight in, and puts them in the right organisation.
  assert.ok(accepted.body.token);
  assert.equal(accepted.body.user.status, 'active');
  assert.equal(accepted.body.organisation._id, String(owner.org._id));

  // The token is single-use.
  const replay = await call('POST', '/auth/accept-invite', {
    body: { token: inviteToken, password: 'Another@123', acceptTerms: true }
  });
  assert.equal(replay.status, 400);

  // And the new password works on a normal sign-in.
  const login = await call('POST', '/auth/login', {
    body: { email: `mate${counter}@flow.test`, password: 'NewMate@123' }
  });
  assert.equal(login.status, 200);
}));

test('accepting an invitation requires accepting the terms', maybe(async () => {
  const owner = await registerOrg();
  const invite = await call('POST', '/users/invite', {
    token: owner.token, body: { name: 'Terms Refuser', email: `terms${counter}@flow.test` }
  });
  const inviteToken = tokenFromUrl(invite.body.inviteUrl);

  const refused = await call('POST', '/auth/accept-invite', {
    body: { token: inviteToken, password: 'Password@123', acceptTerms: false }
  });
  assert.equal(refused.status, 400);
  // Still redeemable once they do accept.
  const accepted = await call('POST', '/auth/accept-invite', {
    body: { token: inviteToken, password: 'Password@123', acceptTerms: true }
  });
  assert.equal(accepted.status, 200);
}));

test('the invite token is stored only as a hash', maybe(async () => {
  const owner = await registerOrg();
  const invite = await call('POST', '/users/invite', {
    token: owner.token, body: { name: 'Hash Check', email: `hash${counter}@flow.test` }
  });
  const inviteToken = tokenFromUrl(invite.body.inviteUrl);

  const stored = await User.findOne({ email: `hash${counter}@flow.test` }).lean();
  assert.ok(stored.inviteTokenHash, 'a hash should be stored');
  assert.notEqual(stored.inviteTokenHash, inviteToken, 'the plaintext token must never be stored');
  assert.equal(stored.inviteToken, undefined, 'the old plaintext field should be gone');
  assert.ok(stored.inviteTokenExpires > new Date(), 'the invite should carry an expiry');
}));

test('an expired invitation is refused with a distinct, actionable error', maybe(async () => {
  const owner = await registerOrg();
  const email = `expired${counter}@flow.test`;
  const invite = await call('POST', '/users/invite', { token: owner.token, body: { name: 'Late', email } });
  const inviteToken = tokenFromUrl(invite.body.inviteUrl);

  await User.updateOne({ email }, { inviteTokenExpires: new Date(Date.now() - 1000) });

  const details = await call('GET', `/auth/invite/${encodeURIComponent(inviteToken)}`);
  assert.equal(details.status, 410);
  assert.equal(details.body.code, 'INVITE_EXPIRED');

  const accepted = await call('POST', '/auth/accept-invite', {
    body: { token: inviteToken, password: 'Password@123', acceptTerms: true }
  });
  assert.equal(accepted.status, 410);
}));

test('resending replaces the old link, and withdrawing frees the email address', maybe(async () => {
  const owner = await registerOrg();
  const email = `resend${counter}@flow.test`;
  const first = await call('POST', '/users/invite', { token: owner.token, body: { name: 'Resend Me', email } });
  const firstToken = tokenFromUrl(first.body.inviteUrl);
  const userId = first.body.user._id;

  const resent = await call('POST', `/users/${userId}/resend-invite`, { token: owner.token, body: {} });
  assert.equal(resent.status, 200);
  const secondToken = tokenFromUrl(resent.body.inviteUrl);
  assert.notEqual(firstToken, secondToken);

  // The superseded link must stop working, or a leaked old email stays usable.
  assert.equal((await call('GET', `/auth/invite/${encodeURIComponent(firstToken)}`)).status, 400);
  assert.equal((await call('GET', `/auth/invite/${encodeURIComponent(secondToken)}`)).status, 200);

  // Withdrawing removes the record entirely, so the address can be re-invited —
  // emails are globally unique, so a soft-disable would block that forever.
  assert.equal((await call('DELETE', `/users/${userId}/invite`, { token: owner.token })).status, 204);
  assert.equal((await call('GET', `/auth/invite/${encodeURIComponent(secondToken)}`)).status, 400);
  const reinvited = await call('POST', '/users/invite', { token: owner.token, body: { name: 'Second Go', email } });
  assert.equal(reinvited.status, 201);
}));

test('inviting an address that already exists reports it clearly', maybe(async () => {
  const owner = await registerOrg();
  const dup = await call('POST', '/users/invite', {
    token: owner.token, body: { name: 'Duplicate', email: owner.email }
  });
  assert.equal(dup.status, 409);
  assert.equal(dup.body.code, 'EMAIL_IN_USE');
}));

test('an activated user cannot have their invitation resent or withdrawn', maybe(async () => {
  const owner = await registerOrg();
  const users = await call('GET', '/users', { token: owner.token });
  const ownerId = users.body[0]._id;

  assert.equal((await call('POST', `/users/${ownerId}/resend-invite`, { token: owner.token, body: {} })).status, 409);
  assert.equal((await call('DELETE', `/users/${ownerId}/invite`, { token: owner.token })).status, 409);
}));

// ── Password reset ───────────────────────────────

test('a user can reset a forgotten password and sign in with the new one', maybe(async () => {
  const owner = await registerOrg();

  const requested = await call('POST', '/auth/forgot-password', { body: { email: owner.email } });
  assert.equal(requested.status, 200);
  const resetToken = tokenFromUrl(requested.body.resetUrl);

  const stored = await User.findOne({ email: owner.email }).lean();
  assert.ok(stored.resetTokenHash);
  assert.notEqual(stored.resetTokenHash, resetToken, 'the plaintext reset token must never be stored');

  const reset = await call('POST', '/auth/reset-password', { body: { token: resetToken, password: 'Brand@New1' } });
  assert.equal(reset.status, 200);

  assert.equal((await call('POST', '/auth/login', { body: { email: owner.email, password: 'Brand@New1' } })).status, 200);
  assert.equal((await call('POST', '/auth/login', { body: { email: owner.email, password: owner.password } })).status, 401);

  // Single use.
  assert.equal((await call('POST', '/auth/reset-password', { body: { token: resetToken, password: 'Third@Try1' } })).status, 400);
}));

test('a reset invalidates sessions that were already open', maybe(async () => {
  const owner = await registerOrg();
  // The token from registration is live and works.
  assert.equal((await call('GET', '/auth/me', { token: owner.token })).status, 200);

  const requested = await call('POST', '/auth/forgot-password', { body: { email: owner.email } });
  await call('POST', '/auth/reset-password', {
    body: { token: tokenFromUrl(requested.body.resetUrl), password: 'Rotated@123' }
  });

  // A reset may follow a compromise, so every existing session has to die.
  const after = await call('GET', '/auth/me', { token: owner.token });
  assert.equal(after.status, 401);
}));

test('a reset clears a brute-force lockout so a locked-out owner can recover', maybe(async () => {
  const owner = await registerOrg();
  for (let i = 0; i < 9; i += 1) {
    const attempt = await call('POST', '/auth/login', { body: { email: owner.email, password: 'Wrong@123' } });
    if (attempt.status === 429) break;
  }
  assert.equal((await call('POST', '/auth/login', { body: { email: owner.email, password: owner.password } })).status, 429);

  const requested = await call('POST', '/auth/forgot-password', { body: { email: owner.email } });
  await call('POST', '/auth/reset-password', {
    body: { token: tokenFromUrl(requested.body.resetUrl), password: 'Unlocked@1' }
  });

  const login = await call('POST', '/auth/login', { body: { email: owner.email, password: 'Unlocked@1' } });
  assert.equal(login.status, 200, 'the lockout should be cleared by a successful reset');
}));

test('forgot-password does not reveal whether an address has an account', maybe(async () => {
  const owner = await registerOrg();
  const real = await call('POST', '/auth/forgot-password', { body: { email: owner.email } });
  const fake = await call('POST', '/auth/forgot-password', { body: { email: 'nobody-at-all@nowhere.test' } });

  assert.equal(real.status, fake.status);
  assert.equal(real.body.message, fake.body.message);
  // No token is minted for an address with no account.
  assert.equal(fake.body.resetUrl, undefined);
}));

test('an expired reset link is refused', maybe(async () => {
  const owner = await registerOrg();
  const requested = await call('POST', '/auth/forgot-password', { body: { email: owner.email } });
  const resetToken = tokenFromUrl(requested.body.resetUrl);

  await User.updateOne({ email: owner.email }, { resetTokenExpires: new Date(Date.now() - 1000) });

  const reset = await call('POST', '/auth/reset-password', { body: { token: resetToken, password: 'TooLate@1' } });
  assert.equal(reset.status, 410);
  assert.equal(reset.body.code, 'RESET_EXPIRED');
}));

test('an invited user cannot use password reset to bypass the invite flow', maybe(async () => {
  const owner = await registerOrg();
  const email = `bypass${counter}@flow.test`;
  await call('POST', '/users/invite', { token: owner.token, body: { name: 'Not Yet', email } });

  // Accepting the invite is the only way in — a reset here would activate the
  // account without terms acceptance.
  const requested = await call('POST', '/auth/forgot-password', { body: { email } });
  assert.equal(requested.status, 200);
  assert.equal(requested.body.resetUrl, undefined, 'no reset link for an unactivated invitee');
}));

// ── Suspension ───────────────────────────────────

test('a suspended organisation cannot write, but can still read and export', maybe(async () => {
  const owner = await registerOrg();
  const client = await call('POST', '/clients', {
    token: owner.token, body: { companyName: 'Buyer Co', stateCode: '27' }
  });
  assert.equal(client.status, 201);

  await Organisation.updateOne({ _id: owner.org._id }, { status: 'suspended' });

  // Writes are refused with an explanation, not a bare 403.
  const blocked = await call('POST', '/clients', {
    token: owner.token, body: { companyName: 'Should Not Save', stateCode: '27' }
  });
  assert.equal(blocked.status, 403);
  assert.equal(blocked.body.code, 'ORG_SUSPENDED');

  const blockedInvoice = await call('POST', '/invoices', {
    token: owner.token,
    body: { clientId: client.body._id, date: '2026-07-01', dueDate: '2026-07-15', items: [{ desc: 'X', qty: 1, rate: 100 }] }
  });
  assert.equal(blockedInvoice.status, 403);

  // Their own records stay readable — it is their business data.
  assert.equal((await call('GET', '/clients', { token: owner.token })).status, 200);
  assert.equal((await call('GET', '/invoices', { token: owner.token })).status, 200);
  assert.equal((await call('GET', '/invoices/export.csv', { token: owner.token })).status, 200);
  // And the routes needed to resolve the situation still work.
  assert.equal((await call('GET', '/subscriptions/current', { token: owner.token })).status, 200);
  assert.equal((await call('GET', '/auth/me', { token: owner.token })).status, 200);

  // Lifting the suspension restores writes.
  await Organisation.updateOne({ _id: owner.org._id }, { status: 'active' });
  assert.equal((await call('POST', '/clients', {
    token: owner.token, body: { companyName: 'Now Fine', stateCode: '27' }
  })).status, 201);
}));

// ── Reminder sweep ───────────────────────────────

test('the reminder sweep uses the configured stage and does not chase twice', maybe(async () => {
  const owner = await registerOrg();
  await Reminder.deleteMany({});
  await Reminder.create([
    { name: 'Due soon', daysOffset: -3, enabled: true, subject: 'Upcoming: {{invoiceNumber}}', template: 'Hi {{clientName}}, {{invoiceNumber}} {{dueState}}.' },
    { name: 'Overdue', daysOffset: 7, enabled: true, subject: 'Overdue: {{invoiceNumber}}', template: '{{invoiceNumber}} is {{overdueDays}} days late.' }
  ]);

  const client = await call('POST', '/clients', {
    token: owner.token, body: { companyName: 'Chased Co', stateCode: '27', email: 'chased@buyer.test' }
  });
  // Well past the 7-day stage.
  const invoice = await call('POST', '/invoices', {
    token: owner.token,
    body: {
      clientId: client.body._id, date: '2026-01-01', dueDate: '2026-01-10', status: 'pending',
      items: [{ desc: 'Overdue work', qty: 1, rate: 5000, gstRate: 18 }]
    }
  });
  assert.equal(invoice.status, 201);

  const first = await runReminderSweep({ orgId: String(owner.org._id) });
  assert.equal(first.scanned >= 1, true);

  const logs = await ReminderLog.find({ invoiceId: invoice.body._id }).lean();
  assert.equal(logs.length, 1, 'the attempt should be recorded even with no email provider');
  // The later stage wins: an invoice months overdue shouldn't work through the
  // earlier notices one sweep at a time.
  assert.equal(logs[0].stage, 'offset:7');
  assert.equal(logs[0].to, 'chased@buyer.test');
  // With no SendGrid key this is a skip, not a send — so it must NOT be treated
  // as already-chased once email is switched on.
  assert.equal(logs[0].status, 'skipped');
  assert.equal(logs[0].balanceDue, 5900);

  // A second sweep re-attempts (previous outcome was a skip) but never
  // duplicates a successful send.
  await ReminderLog.updateMany({ invoiceId: invoice.body._id }, { status: 'sent' });
  const second = await runReminderSweep({ orgId: String(owner.org._id) });
  assert.equal(second.sent, 0, 'an already-chased invoice must not be chased again');
  assert.equal((await ReminderLog.countDocuments({ invoiceId: invoice.body._id })), 1);
}));

test('a paid invoice is never chased', maybe(async () => {
  const owner = await registerOrg();
  await Reminder.deleteMany({});
  await Reminder.create({ name: 'Overdue', daysOffset: 1, enabled: true });

  const client = await call('POST', '/clients', {
    token: owner.token, body: { companyName: 'Paid Co', stateCode: '27', email: 'paid@buyer.test' }
  });
  const invoice = await call('POST', '/invoices', {
    token: owner.token,
    body: {
      clientId: client.body._id, date: '2026-01-01', dueDate: '2026-01-10', status: 'pending',
      items: [{ desc: 'Settled work', qty: 1, rate: 1000, gstRate: 0 }]
    }
  });
  await call('POST', `/invoices/${invoice.body._id}/mark-paid`, { token: owner.token, body: {} });

  await runReminderSweep({ orgId: String(owner.org._id) });
  assert.equal(await ReminderLog.countDocuments({ invoiceId: invoice.body._id }), 0);
}));

test('remind-all returns immediately and does the work in the background', maybe(async () => {
  const owner = await registerOrg();
  await Reminder.deleteMany({});
  await Reminder.create({ name: 'Overdue', daysOffset: 1, enabled: true });

  const client = await call('POST', '/clients', {
    token: owner.token, body: { companyName: 'Bulk Co', stateCode: '27', email: 'bulk@buyer.test' }
  });
  await call('POST', '/invoices', {
    token: owner.token,
    body: {
      clientId: client.body._id, date: '2026-01-01', dueDate: '2026-01-10', status: 'pending',
      items: [{ desc: 'Work', qty: 1, rate: 1000, gstRate: 0 }]
    }
  });

  const bulk = await call('POST', '/invoices/remind-all', { token: owner.token, body: {} });
  // 202 Accepted, not 200 — the old version blocked the request while sending
  // serially and timed out on any real overdue book.
  assert.equal(bulk.status, 202);
  assert.equal(bulk.body.queued, true);
  assert.equal(bulk.body.eligible, 1);
}));
