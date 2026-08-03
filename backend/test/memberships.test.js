/**
 * Memberships & org-switching (#53, #54) against a real MongoDB.
 *
 * Before this, `User.email` was globally unique and `orgId`/`role` were fixed
 * at creation — a person genuinely could not belong to two organisations, so
 * inviting an existing KloguBizz user into a second business was flatly
 * refused as "already registered". These tests cover the fix: linking an
 * existing identity into a further org, switching between them, and that the
 * things which used to key off `User.orgId` (seat counting, ownership
 * transfer, the org-delete cascade) now key off `Membership` instead.
 *
 * Skipped automatically when no MongoDB is reachable. Uses a throwaway
 * database that is dropped on the way out.
 */
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/klogubizz_membership_test';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_used_only_by_the_membership_suite';

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const bcrypt = require('bcryptjs');
const app = require('../server');
const { Plan } = require('../src/models/Plan');
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
    console.warn('\n[memberships] No MongoDB on 127.0.0.1:27017 — skipping.\n');
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

const maybe = fn => async t => {
  if (!dbAvailable) return t.skip('MongoDB not available');
  return fn(t);
};

let counter = 0;
async function registerOrg(overrides = {}) {
  counter += 1;
  const email = `owner${counter}@member${counter}.test`;
  const { status, body } = await call('POST', '/auth/register', {
    body: {
      name: `Owner ${counter}`, email, password: 'Password@123',
      orgName: `Member Tenant ${counter}`, stateCode: '27', acceptTerms: true,
      ...overrides
    }
  });
  assert.equal(status, 201, `register failed: ${JSON.stringify(body)}`);
  return { email, password: 'Password@123', org: body.organisation };
}

async function login(email, password = 'Password@123') {
  const res = await call('POST', '/auth/login', { body: { email, password } });
  assert.equal(res.status, 200, `login failed: ${JSON.stringify(res.body)}`);
  return res.body;
}

/** A platform account, created directly since there is deliberately no
 *  self-service way to mint one — same pattern as platformConsole.test.js. */
async function platformAccount() {
  counter += 1;
  const email = `platform-owner-${counter}@member.test`;
  await User.create({
    name: `Platform Owner ${counter}`,
    email,
    passwordHash: await bcrypt.hash('Password@123', 12),
    role: 'superadmin',
    platformRole: 'owner',
    status: 'active'
  });
  return (await login(email)).token;
}

test('an already-active identity added to a second organisation is linked instantly, with nothing to accept', maybe(async () => {
  const orgA = await registerOrg();
  const orgB = await registerOrg();
  const sessionA = await login(orgA.email);

  // orgB's owner invites orgA's owner into orgB.
  const invite = await call('POST', '/users/invite', {
    token: (await login(orgB.email)).token,
    body: { name: 'Cross-org accountant', email: orgA.email, role: 'accountant' }
  });
  assert.equal(invite.status, 201, JSON.stringify(invite.body));
  // Nothing to accept: the identity is already active.
  assert.equal(invite.body.user.status, 'active');
  assert.equal(invite.body.user.role, 'accountant');
  assert.equal(invite.body.inviteUrl, undefined);

  // orgA's owner can still sign into orgA exactly as before…
  assert.equal((await call('GET', '/auth/me', { token: sessionA.token })).status, 200);

  // …and their session now lists both organisations.
  const me = await call('GET', '/auth/me', { token: sessionA.token });
  assert.equal(me.body.memberships.length, 2);
  const orgNames = me.body.memberships.map(m => m.orgName).sort();
  assert.deepEqual(orgNames, [orgA.org.name, orgB.org.name].sort());
}));

test('switching organisations re-issues a session for the other membership', maybe(async () => {
  const orgA = await registerOrg();
  const orgB = await registerOrg();
  await call('POST', '/users/invite', {
    token: (await login(orgB.email)).token,
    body: { name: 'Switcher', email: orgA.email, role: 'viewer' }
  });

  const session = await login(orgA.email);
  assert.equal(session.organisation._id, String(orgA.org._id));

  const switched = await call('POST', '/auth/switch-org', {
    token: session.token,
    body: { targetOrgId: orgB.org._id }
  });
  assert.equal(switched.status, 200, JSON.stringify(switched.body));
  assert.equal(switched.body.organisation._id, String(orgB.org._id));
  assert.equal(switched.body.user.role, 'viewer', 'the role for THIS org, not whatever it is in org A');
  assert.ok(switched.body.refreshToken, 'switching starts its own device session');

  // The original session in org A is untouched.
  assert.equal((await call('GET', '/auth/me', { token: session.token })).status, 200);

  // Switching to an org this identity has no membership in is refused.
  const denied = await call('POST', '/auth/switch-org', { token: session.token, body: { targetOrgId: new mongoose.Types.ObjectId().toString() } });
  assert.equal(denied.status, 403);
  assert.equal(denied.body.code, 'MEMBERSHIP_REVOKED');
}));

test('a pending (not yet accepted) invite blocks being added elsewhere until it is resolved', maybe(async () => {
  const orgA = await registerOrg();
  const orgB = await registerOrg();
  const email = `pending${counter}@member.test`;

  const firstInvite = await call('POST', '/users/invite', {
    token: (await login(orgA.email)).token,
    body: { name: 'Not Yet Active', email }
  });
  assert.equal(firstInvite.status, 201);

  const secondInvite = await call('POST', '/users/invite', {
    token: (await login(orgB.email)).token,
    body: { name: 'Not Yet Active', email }
  });
  assert.equal(secondInvite.status, 409);
  assert.equal(secondInvite.body.code, 'EMAIL_IN_USE');
}));

test('removing someone from one organisation does not delete an identity that still belongs to another', maybe(async () => {
  const orgA = await registerOrg();
  const orgB = await registerOrg();
  const sessionB = await login(orgB.email);
  await call('POST', '/users/invite', {
    token: sessionB.token,
    body: { name: 'Shared accountant', email: orgA.email, role: 'accountant' }
  });

  const user = await User.findOne({ email: orgA.email }).lean();
  const removed = await call('DELETE', `/users/${user._id}`, { token: sessionB.token });
  assert.equal(removed.status, 200, JSON.stringify(removed.body));

  // Removed from org B…
  const membershipB = await Membership.findOne({ userId: user._id, orgId: orgB.org._id }).lean();
  assert.equal(membershipB.status, 'disabled');

  // …but still very much themself in org A, identity intact.
  const stillThere = await User.findById(user._id).lean();
  assert.ok(stillThere, 'the identity must not have been deleted');
  const sessionA = await login(orgA.email);
  assert.equal(sessionA.organisation._id, String(orgA.org._id));
}));

test('deleting an organisation only deletes identities with no membership left anywhere', maybe(async () => {
  const orgA = await registerOrg();
  const orgB = await registerOrg();
  // A second, shared identity: belongs to org A only, and separately to both
  // org A and org B, so the cascade can be checked against each case.
  const soleInOrgA = `sole${counter}@member.test`;
  await call('POST', '/users/invite', { token: (await login(orgA.email)).token, body: { name: 'Sole', email: soleInOrgA, role: 'viewer' } });
  await call('POST', '/users/invite', {
    token: (await login(orgB.email)).token,
    body: { name: 'Shared', email: orgA.email, role: 'viewer' }
  });

  const soleUserId = (await User.findOne({ email: soleInOrgA }).lean())._id;
  const sharedUserId = (await User.findOne({ email: orgA.email }).lean())._id;

  const platformToken = await platformAccount();
  const deletion = await call('DELETE', `/superadmin/organisations/${orgA.org._id}`, {
    token: platformToken,
    body: { confirmName: orgA.org.name }
  });
  assert.equal(deletion.status, 204, JSON.stringify(deletion.body));

  // Orphaned no more: the membership rows for the deleted org are gone.
  assert.equal(await Membership.countDocuments({ orgId: orgA.org._id }), 0);

  // Belonged only to org A — the identity is gone with it.
  assert.equal(await User.findById(soleUserId).lean(), null, 'an identity with no membership left anywhere should be removed');

  // Still belongs to org B — deleting org A must not have touched them.
  const stillExists = await User.findById(sharedUserId).lean();
  assert.ok(stillExists, 'an identity that still belongs to another organisation must survive');
  const remainingMembership = await Membership.findOne({ userId: sharedUserId, orgId: orgB.org._id }).lean();
  assert.ok(remainingMembership, 'their membership in the surviving organisation must be untouched');
  assert.equal(remainingMembership.status, 'active');
}));

test('transferring ownership requires the target to hold an active membership in this org', maybe(async () => {
  const orgA = await registerOrg();
  const orgB = await registerOrg();
  const sessionA = await login(orgA.email);

  // orgB's owner is a real identity, but not a member of org A.
  const rejected = await call('POST', '/organisations/current/transfer-ownership', {
    token: sessionA.token,
    body: { newOwnerId: (await User.findOne({ email: orgB.email }).lean())._id, password: orgA.password }
  });
  assert.equal(rejected.status, 404, JSON.stringify(rejected.body));

  // Add them properly, then the transfer succeeds and promotes their role.
  await call('POST', '/users/invite', { token: sessionA.token, body: { name: 'New Owner', email: orgB.email, role: 'viewer' } });
  const targetId = (await User.findOne({ email: orgB.email }).lean())._id;
  const transferred = await call('POST', '/organisations/current/transfer-ownership', {
    token: sessionA.token,
    body: { newOwnerId: targetId, password: orgA.password }
  });
  assert.equal(transferred.status, 200, JSON.stringify(transferred.body));
  assert.equal(String(transferred.body.ownerId), String(targetId));

  const membership = await Membership.findOne({ userId: targetId, orgId: orgA.org._id }).lean();
  assert.equal(membership.role, 'admin', 'the new owner must hold admin in this org, not whatever role they had elsewhere');
}));
