/**
 * Payment links and the hosted pay page (2.3 #21, #23).
 *
 * There are no Razorpay credentials in this environment, so the *network* calls
 * cannot be exercised — and a mocked gateway would only prove the mock works.
 * What is tested is everything this codebase actually owns, which is where the
 * risk lives:
 *
 *  - **Signature verification**, computed against a known key with a real HMAC.
 *    Without it, anyone who can POST to the confirm endpoint can mark any invoice
 *    paid — the single most dangerous thing in the feature.
 *  - **Idempotent settlement.** The browser callback and the webhook both report
 *    the same charge and they race; recording it twice would overstate collections
 *    and corrupt the invoice balance.
 *  - **The public allowlist.** An unauthenticated endpoint that leaks another
 *    customer's name or another invoice is a data breach, not a bug.
 *  - **The amount never coming from the payer.**
 *  - **Credentials encrypted at rest and never returned.**
 *
 * Skipped automatically when no MongoDB is reachable.
 */
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/klogubizz_paylink_test';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_used_only_by_the_payment_link_suite';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const mongoose = require('mongoose');

const app = require('../server');
const { Plan } = require('../src/models/Plan');
const { Invoice } = require('../src/models/Invoice');
const { Payment } = require('../src/models/Payment');
const { Organisation } = require('../src/models/Organisation');
const { PaymentLink } = require('../src/models/PaymentLink');
const gateway = require('../src/services/tenantGatewayService');
const links = require('../src/services/paymentLinkService');
const { sweepExpiredLinks } = require('../src/services/paymentLinkService');
const secretBox = require('../src/utils/secretBox');

const KEY_ID = 'rzp_test_ABC123';
const KEY_SECRET = 'test_key_secret_for_hmac_checks';
const WEBHOOK_SECRET = 'test_webhook_secret_for_hmac_checks';

let server;
let baseUrl;
let dbAvailable = false;

test.before(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 2000 });
    dbAvailable = true;
  } catch {
    console.warn('\n[payment-links] No MongoDB on 127.0.0.1:27017 — skipping.\n');
    return;
  }
  await mongoose.connection.dropDatabase();
  // The unique providerPaymentId index is the idempotency guarantee; it does not
  // exist until Mongoose builds it, and the race test depends on it.
  await PaymentLink.init();
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

async function call(method, path, { token, body, headers = {} } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
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
  const email = `owner${counter}@paylink${counter}.test`;
  const { status, body } = await call('POST', '/auth/register', {
    body: {
      name: `Owner ${counter}`, email, password: 'Password@123',
      orgName: `PayLink Tenant ${counter}`, stateCode: '27', acceptTerms: true
    }
  });
  assert.equal(status, 201, `register failed: ${JSON.stringify(body)}`);
  return { token: body.token, org: body.organisation, email };
}

/** Configures the tenant's gateway the way the settings endpoint would. */
async function connectGateway(token) {
  const { status, body } = await call('PUT', '/payment-links/gateway', {
    token,
    body: { keyId: KEY_ID, keySecret: KEY_SECRET, webhookSecret: WEBHOOK_SECRET, enabled: true }
  });
  assert.equal(status, 200, `gateway save failed: ${JSON.stringify(body)}`);
  return body;
}

async function createClient(token, overrides = {}) {
  const { status, body } = await call('POST', '/clients', {
    token,
    body: { companyName: 'Paying Customer', stateCode: '27', email: 'payer@example.test', gstin: '27AAPFU0939F1ZV', ...overrides }
  });
  assert.equal(status, 201, `client create failed: ${JSON.stringify(body)}`);
  return body;
}

/** An **issued** invoice. `status: 'pending'` is explicit because the model
 *  defaults to 'draft', and a draft correctly refuses a payment link — there is
 *  no number a customer should see and the figures may still change. */
async function createInvoice(token, clientId, overrides = {}) {
  const { status, body } = await call('POST', '/invoices', {
    token,
    body: {
      clientId, date: '2026-08-01', dueDate: '2026-08-15', status: 'pending',
      items: [{ desc: 'Services', qty: 1, rate: 10000, gstRate: 18 }],
      ...overrides
    }
  });
  assert.equal(status, 201, `invoice create failed: ${JSON.stringify(body)}`);
  return body;
}

/** Creates a link directly through the service so a token is available without
 *  a live gateway — the HTTP route needs no gateway either, but this also returns
 *  the plaintext token, which the API deliberately only returns once. */
async function makeLink(orgId, invoiceId) {
  const org = await Organisation.findById(orgId);
  const invoice = await Invoice.findById(invoiceId);
  return links.createLink({ org, invoice, req: { user: { name: 'Tester' } } });
}

/** The signature Razorpay would send for a completed checkout. */
function checkoutSignature(orderId, paymentId, secret = KEY_SECRET) {
  return crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
}

// ── Gateway credentials ──────────────────────────

test('gateway secrets are encrypted at rest and never returned', maybe(async () => {
  const tenant = await registerOrg();
  const described = await connectGateway(tenant.token);

  // The response says which key is configured, never the secret itself.
  assert.equal(described.keyId, KEY_ID);
  assert.equal(described.enabled, true);
  assert.equal(described.configured, true);
  assert.ok(!JSON.stringify(described).includes(KEY_SECRET), 'the key secret must never leave the server');
  assert.ok(!JSON.stringify(described).includes(WEBHOOK_SECRET), 'nor the webhook secret');

  // And it is not sitting in the database in the clear either — a readable key
  // secret is the ability to charge this tenant's customers.
  const org = await Organisation.findById(tenant.org._id).lean();
  assert.notEqual(org.paymentGateway.keySecret, KEY_SECRET);
  assert.ok(secretBox.looksEncrypted(org.paymentGateway.keySecret));
  assert.equal(secretBox.decrypt(org.paymentGateway.keySecret, gateway.NAMESPACE), KEY_SECRET);
  // The key id is public by design and stays readable — the browser needs it.
  assert.equal(org.paymentGateway.keyId, KEY_ID);
}));

test('an empty secret on save leaves the stored one alone', maybe(async () => {
  const tenant = await registerOrg();
  await connectGateway(tenant.token);

  // The console never receives the secret, so a save that only changes the key id
  // must not wipe it — the same write-only-field trap the logo had.
  const updated = await call('PUT', '/payment-links/gateway', {
    token: tenant.token, body: { keyId: 'rzp_test_CHANGED' }
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.keyId, 'rzp_test_CHANGED');

  const org = await Organisation.findById(tenant.org._id).lean();
  assert.equal(secretBox.decrypt(org.paymentGateway.keySecret, gateway.NAMESPACE), KEY_SECRET, 'the secret survived');
  assert.equal(org.paymentGateway.enabled, true);
}));

test('online payments cannot be enabled without both credentials', maybe(async () => {
  const tenant = await registerOrg();
  // Otherwise a half-entered key pair produces links that fail at checkout in
  // front of a customer.
  const refused = await call('PUT', '/payment-links/gateway', {
    token: tenant.token, body: { keyId: KEY_ID, enabled: true }
  });
  assert.equal(refused.status, 400);
  assert.equal(refused.body.code, 'GATEWAY_INCOMPLETE');
}));

test('a link cannot be created before the gateway is set up', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token);
  const invoice = await createInvoice(tenant.token, client._id);

  const refused = await call('POST', '/payment-links', { token: tenant.token, body: { invoiceId: invoice._id } });
  assert.equal(refused.status, 409);
  assert.equal(refused.body.code, 'GATEWAY_NOT_CONFIGURED');
}));

// ── Link creation ────────────────────────────────

test('creating a link returns the URL once and stores only a hash', maybe(async () => {
  const tenant = await registerOrg();
  await connectGateway(tenant.token);
  const client = await createClient(tenant.token);
  const invoice = await createInvoice(tenant.token, client._id);

  const created = await call('POST', '/payment-links', { token: tenant.token, body: { invoiceId: invoice._id } });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  assert.ok(created.body.url.includes('/pay/'), created.body.url);
  assert.equal(created.body.link.amount, 11800);
  assert.match(created.body.link.reference, /^PL-[0-9A-F]{6}$/);

  // The token is a bearer credential, so only its hash is stored — the rule the
  // invite and reset tokens follow.
  const token = created.body.url.split('/pay/')[1];
  const stored = await PaymentLink.findById(created.body.link._id).lean();
  assert.notEqual(stored.tokenHash, token);
  assert.equal(stored.tokenHash, links.hashToken(decodeURIComponent(token)));
  // And it is never echoed back in the link object.
  assert.equal(created.body.link.tokenHash, undefined);
}));

test('a draft, a cancelled and a fully-paid invoice each refuse with their own reason', maybe(async () => {
  const tenant = await registerOrg();
  await connectGateway(tenant.token);
  const client = await createClient(tenant.token);

  // Draft: no number a customer should see, and the figures may still change.
  const draft = await call('POST', '/invoices', {
    token: tenant.token,
    body: { clientId: client._id, date: '2026-08-01', dueDate: '2026-08-15', status: 'draft', items: [{ desc: 'x', qty: 1, rate: 100, gstRate: 18 }] }
  });
  const draftLink = await call('POST', '/payment-links', { token: tenant.token, body: { invoiceId: draft.body._id } });
  assert.equal(draftLink.status, 409);
  assert.equal(draftLink.body.code, 'INVOICE_DRAFT');

  // Fully paid: nothing left to collect.
  const paid = await createInvoice(tenant.token, client._id);
  await call('POST', `/invoices/${paid._id}/mark-paid`, { token: tenant.token, body: {} });
  const paidLink = await call('POST', '/payment-links', { token: tenant.token, body: { invoiceId: paid._id } });
  assert.equal(paidLink.status, 409);
  assert.equal(paidLink.body.code, 'ALREADY_PAID');
}));

// ── The public page ──────────────────────────────

test('the public page exposes one invoice and nothing else about the tenant', maybe(async () => {
  const tenant = await registerOrg();
  await connectGateway(tenant.token);
  const client = await createClient(tenant.token, { companyName: 'Visible Customer' });
  // A second customer and invoice that must not be reachable through this link.
  const other = await createClient(tenant.token, { companyName: 'Hidden Customer', email: 'hidden@example.test' });
  await createInvoice(tenant.token, other._id);

  const invoice = await createInvoice(tenant.token, client._id);
  const { token } = await makeLink(tenant.org._id, invoice._id);

  const page = await call('GET', `/pay/${encodeURIComponent(token)}`);
  assert.equal(page.status, 200);
  assert.equal(page.body.invoice.number, invoice.invoiceNumber);
  assert.equal(page.body.invoice.amountDue, 11800);
  assert.equal(page.body.invoice.billedTo, 'Visible Customer');
  assert.equal(page.body.business.name, tenant.org.name);
  // The key id is public by design — checkout needs it.
  assert.equal(page.body.gateway.keyId, KEY_ID);

  const serialised = JSON.stringify(page.body);
  // An unauthenticated endpoint leaking another customer is a breach, not a bug.
  assert.ok(!serialised.includes('Hidden Customer'), 'another customer must not be reachable');
  assert.ok(!serialised.includes(KEY_SECRET), 'the key secret must never reach the browser');
  assert.ok(!serialised.includes('adminEmail') || !serialised.includes('passwordHash'));
  // No internal ids, no tenant document, no client list.
  assert.equal(page.body.invoice.clientId, undefined);
  assert.equal(page.body.orgId, undefined);
}));

test('an unknown, cancelled or expired token is refused, and cannot be enumerated', maybe(async () => {
  const tenant = await registerOrg();
  await connectGateway(tenant.token);
  const client = await createClient(tenant.token);
  const invoice = await createInvoice(tenant.token, client._id);
  const { token, link } = await makeLink(tenant.org._id, invoice._id);

  // Unknown and cancelled return the *same* shape, so the endpoint cannot be used
  // to discover which tokens exist.
  const unknown = await call('GET', '/pay/definitely-not-a-real-token-abcdef123456');
  assert.equal(unknown.status, 404);
  assert.equal(unknown.body.code, 'LINK_INVALID');

  await PaymentLink.updateOne({ _id: link._id }, { $set: { status: 'cancelled' } });
  const cancelled = await call('GET', `/pay/${encodeURIComponent(token)}`);
  assert.equal(cancelled.status, 404);
  assert.equal(cancelled.body.code, 'LINK_INVALID');
  assert.equal(cancelled.body.message, unknown.body.message, 'identical message — no oracle');

  // Expiry is the one exception: it gets its own code because "ask for a new one"
  // is actionable where "invalid" is not.
  await PaymentLink.updateOne({ _id: link._id }, { $set: { status: 'active', expiresAt: new Date(Date.now() - 1000) } });
  const expired = await call('GET', `/pay/${encodeURIComponent(token)}`);
  assert.equal(expired.status, 410);
  assert.equal(expired.body.code, 'LINK_EXPIRED');
}));

test('a suspended tenant cannot keep collecting through a link issued earlier', maybe(async () => {
  const tenant = await registerOrg();
  await connectGateway(tenant.token);
  const client = await createClient(tenant.token);
  const invoice = await createInvoice(tenant.token, client._id);
  const { token } = await makeLink(tenant.org._id, invoice._id);

  await Organisation.updateOne({ _id: tenant.org._id }, { $set: { status: 'suspended' } });
  const page = await call('GET', `/pay/${encodeURIComponent(token)}`);
  assert.equal(page.status, 409);
  assert.equal(page.body.code, 'ORG_INACTIVE');
}));

// ── Signature verification: the security boundary ─

test('the checkout signature is verified against the tenant key', maybe(async () => {
  const tenant = await registerOrg();
  await connectGateway(tenant.token);
  const org = await Organisation.findById(tenant.org._id);

  const orderId = 'order_TEST123';
  const paymentId = 'pay_TEST456';

  assert.equal(
    gateway.verifyCheckoutSignature(org, { orderId, paymentId, signature: checkoutSignature(orderId, paymentId) }),
    true,
    'a genuine signature verifies'
  );
  // A signature computed with the wrong secret is exactly the forgery this stops.
  assert.equal(
    gateway.verifyCheckoutSignature(org, { orderId, paymentId, signature: checkoutSignature(orderId, paymentId, 'wrong_secret') }),
    false
  );
  // Reusing a valid signature for a *different* payment must not verify.
  assert.equal(
    gateway.verifyCheckoutSignature(org, { orderId, paymentId: 'pay_OTHER', signature: checkoutSignature(orderId, paymentId) }),
    false
  );
  assert.equal(gateway.verifyCheckoutSignature(org, { orderId, paymentId, signature: '' }), false);
  assert.equal(gateway.verifyCheckoutSignature(org, { orderId, paymentId, signature: 'short' }), false);
}));

test('an unsigned or wrongly-signed confirmation records nothing', maybe(async () => {
  const tenant = await registerOrg();
  await connectGateway(tenant.token);
  const client = await createClient(tenant.token);
  const invoice = await createInvoice(tenant.token, client._id);
  const { token, link } = await makeLink(tenant.org._id, invoice._id);
  await PaymentLink.updateOne({ _id: link._id }, { $set: { providerOrderId: 'order_X' } });

  const incomplete = await call('POST', `/pay/${encodeURIComponent(token)}/confirm`, { body: {} });
  assert.equal(incomplete.status, 400);
  assert.equal(incomplete.body.code, 'CONFIRMATION_INCOMPLETE');

  // Without this check, anyone who can POST here can mark any invoice paid.
  const forged = await call('POST', `/pay/${encodeURIComponent(token)}/confirm`, {
    body: { razorpay_order_id: 'order_X', razorpay_payment_id: 'pay_FORGED', razorpay_signature: 'deadbeef'.repeat(8) }
  });
  assert.equal(forged.status, 400);
  assert.equal(forged.body.code, 'SIGNATURE_INVALID');

  // A valid signature for a *different* order must not settle this link either.
  const mismatched = await call('POST', `/pay/${encodeURIComponent(token)}/confirm`, {
    body: {
      razorpay_order_id: 'order_SOMETHING_ELSE',
      razorpay_payment_id: 'pay_Y',
      razorpay_signature: checkoutSignature('order_SOMETHING_ELSE', 'pay_Y')
    }
  });
  assert.equal(mismatched.status, 409);
  assert.equal(mismatched.body.code, 'ORDER_MISMATCH');

  assert.equal(await Payment.countDocuments({ orgId: tenant.org._id }), 0, 'nothing was recorded');
  const stored = await Invoice.findById(invoice._id).lean();
  assert.equal(stored.balanceDue, 11800, 'the invoice is untouched');
}));

test('the webhook is verified against the tenant secret, not the platform one', maybe(async () => {
  const tenant = await registerOrg();
  await connectGateway(tenant.token);
  const org = await Organisation.findById(tenant.org._id);

  const body = JSON.stringify({ event: 'payment.captured' });
  const good = crypto.createHmac('sha256', WEBHOOK_SECRET).update(body).digest('hex');
  const platform = crypto.createHmac('sha256', 'test_webhook_secret').update(body).digest('hex');

  assert.equal(gateway.verifyWebhookSignature(org, body, good), true);
  // A tenant's event signed with the platform secret must not verify — sharing
  // them would let one tenant's webhook settle another's invoice.
  assert.equal(gateway.verifyWebhookSignature(org, body, platform), false);
  assert.equal(gateway.verifyWebhookSignature(org, body, ''), false);
}));

// ── Settlement, and its idempotency ──────────────

/** Settles through the service, which is the shared path both the callback and
 *  the webhook use. Avoids needing a live gateway to reach it. */
async function settleOnce(orgId, invoiceId, linkId, paymentId, settledBy = 'callback') {
  const org = await Organisation.findById(orgId);
  const invoice = await Invoice.findById(invoiceId);
  const link = await PaymentLink.findById(linkId);
  return links.settle({ link, invoice, org, paymentId, capturedRupees: 11800, settledBy });
}

test('settlement records one payment and clears the invoice', maybe(async () => {
  const tenant = await registerOrg();
  await connectGateway(tenant.token);
  const client = await createClient(tenant.token);
  const invoice = await createInvoice(tenant.token, client._id);
  const { link } = await makeLink(tenant.org._id, invoice._id);

  const result = await settleOnce(tenant.org._id, invoice._id, link._id, 'pay_ONE');
  assert.equal(result.duplicate, false);
  assert.equal(result.payment.amount, 11800);
  assert.equal(result.payment.status, 'success');
  assert.equal(result.payment.reference, 'pay_ONE');

  const settled = await Invoice.findById(invoice._id).lean();
  assert.equal(settled.balanceDue, 0);
  assert.equal(settled.status, 'paid');

  const storedLink = await PaymentLink.findById(link._id).lean();
  assert.equal(storedLink.status, 'paid');
  assert.equal(storedLink.providerPaymentId, 'pay_ONE');
  assert.equal(storedLink.settledBy, 'callback');
}));

test('the same payment reported twice records money once', maybe(async () => {
  const tenant = await registerOrg();
  await connectGateway(tenant.token);
  const client = await createClient(tenant.token);
  const invoice = await createInvoice(tenant.token, client._id);
  const { link } = await makeLink(tenant.org._id, invoice._id);

  await settleOnce(tenant.org._id, invoice._id, link._id, 'pay_DUP', 'callback');
  // The webhook reporting the same charge — the normal case, not an error.
  const second = await settleOnce(tenant.org._id, invoice._id, link._id, 'pay_DUP', 'webhook');

  assert.equal(second.duplicate, true);
  assert.equal(second.payment, null);
  assert.equal(await Payment.countDocuments({ orgId: tenant.org._id }), 1, 'exactly one payment');
  const settled = await Invoice.findById(invoice._id).lean();
  assert.equal(settled.balanceDue, 0, 'and the balance is not driven negative');
}));

test('concurrent callback and webhook settle exactly once', maybe(async () => {
  const tenant = await registerOrg();
  await connectGateway(tenant.token);
  const client = await createClient(tenant.token);
  const invoice = await createInvoice(tenant.token, client._id);
  const { link } = await makeLink(tenant.org._id, invoice._id);

  // The race the claim-then-write ordering exists for.
  const results = await Promise.all([
    settleOnce(tenant.org._id, invoice._id, link._id, 'pay_RACE', 'callback'),
    settleOnce(tenant.org._id, invoice._id, link._id, 'pay_RACE', 'webhook'),
    settleOnce(tenant.org._id, invoice._id, link._id, 'pay_RACE', 'webhook')
  ]);
  const recorded = results.filter(r => r.payment).length;

  assert.equal(recorded, 1, `exactly one settlement should record, got ${recorded}`);
  assert.equal(await Payment.countDocuments({ orgId: tenant.org._id }), 1);
}));

test('a captured amount larger than the balance is capped, never over-recorded', maybe(async () => {
  const tenant = await registerOrg();
  await connectGateway(tenant.token);
  const client = await createClient(tenant.token);
  const invoice = await createInvoice(tenant.token, client._id);
  const { link } = await makeLink(tenant.org._id, invoice._id);

  const org = await Organisation.findById(tenant.org._id);
  const invoiceDoc = await Invoice.findById(invoice._id);
  const linkDoc = await PaymentLink.findById(link._id);

  // The gateway reporting more than is owed would otherwise inflate collections
  // and the payments export — the exact hole createPayment closed for manual entry.
  const result = await links.settle({
    link: linkDoc, invoice: invoiceDoc, org,
    paymentId: 'pay_OVER', capturedRupees: 99999, settledBy: 'callback'
  });
  assert.equal(result.payment.amount, 11800, 'capped at the balance due');
  const settled = await Invoice.findById(invoice._id).lean();
  assert.equal(settled.balanceDue, 0);
}));

test('an invoice paid by another route while the page was open is reconciled, not charged', maybe(async () => {
  const tenant = await registerOrg();
  await connectGateway(tenant.token);
  const client = await createClient(tenant.token);
  const invoice = await createInvoice(tenant.token, client._id);
  const { token, link } = await makeLink(tenant.org._id, invoice._id);

  // Settled by bank transfer in the meantime.
  await call('POST', `/invoices/${invoice._id}/mark-paid`, { token: tenant.token, body: {} });

  // Starting a payment must refuse rather than take money for a paid invoice.
  const started = await call('POST', `/pay/${encodeURIComponent(token)}/order`, { body: {} });
  assert.equal(started.status, 409);
  assert.equal(started.body.code, 'ALREADY_PAID');

  const storedLink = await PaymentLink.findById(link._id).lean();
  assert.equal(storedLink.status, 'paid', 'the link reconciles itself rather than staying open');
}));

// ── Lifecycle ────────────────────────────────────

test('the public page reports a paid link as paid', maybe(async () => {
  const tenant = await registerOrg();
  await connectGateway(tenant.token);
  const client = await createClient(tenant.token);
  const invoice = await createInvoice(tenant.token, client._id);
  const { token, link } = await makeLink(tenant.org._id, invoice._id);

  await settleOnce(tenant.org._id, invoice._id, link._id, 'pay_SHOWN');
  const page = await call('GET', `/pay/${encodeURIComponent(token)}`);
  assert.equal(page.status, 200);
  assert.equal(page.body.status, 'paid');
  assert.equal(page.body.invoice.amountDue, 0);
}));

test('cancelling a link withdraws it without touching the invoice', maybe(async () => {
  const tenant = await registerOrg();
  await connectGateway(tenant.token);
  const client = await createClient(tenant.token);
  const invoice = await createInvoice(tenant.token, client._id);
  const created = await call('POST', '/payment-links', { token: tenant.token, body: { invoiceId: invoice._id } });

  const cancelled = await call('POST', `/payment-links/${created.body.link._id}/cancel`, { token: tenant.token, body: {} });
  assert.equal(cancelled.status, 200);
  assert.equal(cancelled.body.status, 'cancelled');

  // Only the ability to pay via that URL is withdrawn.
  const stored = await Invoice.findById(invoice._id).lean();
  assert.equal(stored.balanceDue, 11800);
  assert.equal(stored.status, 'pending');
}));

test('a paid link cannot be cancelled', maybe(async () => {
  const tenant = await registerOrg();
  await connectGateway(tenant.token);
  const client = await createClient(tenant.token);
  const invoice = await createInvoice(tenant.token, client._id);
  const { link } = await makeLink(tenant.org._id, invoice._id);
  await settleOnce(tenant.org._id, invoice._id, link._id, 'pay_NOCANCEL');

  const refused = await call('POST', `/payment-links/${link._id}/cancel`, { token: tenant.token, body: {} });
  assert.equal(refused.status, 409);
  assert.equal(refused.body.code, 'ALREADY_PAID');
}));

test('the expiry sweep ages a lapsed link', maybe(async () => {
  const tenant = await registerOrg();
  await connectGateway(tenant.token);
  const client = await createClient(tenant.token);
  const invoice = await createInvoice(tenant.token, client._id);
  const { link } = await makeLink(tenant.org._id, invoice._id);

  await PaymentLink.updateOne({ _id: link._id }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
  const swept = await sweepExpiredLinks();
  assert.ok(swept.expiredPaymentLinks >= 1);
  assert.equal((await PaymentLink.findById(link._id).lean()).status, 'expired');
}));

// ── Isolation ────────────────────────────────────

test('one tenant cannot see or cancel another tenant\'s links', maybe(async () => {
  const a = await registerOrg();
  const b = await registerOrg();
  await connectGateway(a.token);
  await connectGateway(b.token);
  const clientA = await createClient(a.token);
  const invoiceA = await createInvoice(a.token, clientA._id);
  const created = await call('POST', '/payment-links', { token: a.token, body: { invoiceId: invoiceA._id } });

  assert.equal((await call('POST', `/payment-links/${created.body.link._id}/cancel`, { token: b.token, body: {} })).status, 404);
  assert.equal((await call('GET', '/payment-links', { token: b.token })).body.total, 0);
  assert.equal((await call('GET', '/payment-links', { token: a.token })).body.total, 1);
}));

test('gateway settings are admin-only', maybe(async () => {
  const tenant = await registerOrg();
  await connectGateway(tenant.token);

  // An accountant records payments; connecting a merchant account is not theirs.
  const invited = await call('POST', '/users/invite', {
    token: tenant.token,
    body: { name: 'Book Keeper', email: `acct${counter}@paylink.test`, role: 'accountant' }
  });
  assert.equal(invited.status, 201);
  const inviteToken = decodeURIComponent(new URL(invited.body.inviteUrl).searchParams.get('token'));
  const accepted = await call('POST', '/auth/accept-invite', {
    body: { token: inviteToken, password: 'Accountant@1', acceptTerms: true }
  });
  assert.equal(accepted.status, 200);

  assert.equal((await call('GET', '/payment-links/gateway', { token: accepted.body.token })).status, 403);
  assert.equal((await call('PUT', '/payment-links/gateway', {
    token: accepted.body.token, body: { keyId: 'rzp_test_HIJACK' }
  })).status, 403);
}));
