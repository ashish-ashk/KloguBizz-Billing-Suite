/**
 * Tests for Phase 5 (GST compliance depth) and the previously-deferred items shipped
 * alongside it.
 *
 * The theme is that these are all cases where a plausible-looking implementation is
 * wrong in a way only a specific scenario reveals:
 *
 *  - **Classification.** A LUT export must charge no IGST while still being inter-state;
 *    a reverse-charge invoice must report its value and collect no tax; an exempt supply
 *    must keep its taxable value. Each of those is a different branch, and the naive
 *    version of any of them silently mis-taxes a real document.
 *  - **GSTR-1 sectioning.** Two invoices with identical totals belong in different tables
 *    depending on whether the buyer is registered, whether it crossed a state line, and
 *    how large it was. The threshold cases are the ones that get filed wrongly.
 *  - **ITC.** A duplicate purchase is a duplicate claim; an ineligible purchase must
 *    still be recorded; a reverse-charge purchase creates a liability *and* a credit.
 *  - **MFA.** RFC 6238 arithmetic, replay refusal, and the property that matters most —
 *    that no session token exists until the second factor is presented.
 *  - **Soft delete.** A deleted row must vanish from every list *and* stay restorable.
 *
 * Skipped automatically when no MongoDB is reachable. CI treats that skip as a failure.
 */
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/klogubizz_compliance_test';
process.env.NODE_ENV = 'test';
process.env.RAZORPAY_WEBHOOK_SECRET = 'test_webhook_secret';
process.env.JWT_SECRET = 'test_jwt_secret_used_only_by_the_compliance_suite';
process.env.SENDGRID_WEBHOOK_SECRET = 'test_sendgrid_webhook_secret';

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = require('../server');
const { Plan } = require('../src/models/Plan');
const { Organisation } = require('../src/models/Organisation');
const { User } = require('../src/models/User');
const { Invoice } = require('../src/models/Invoice');
const { Client } = require('../src/models/Client');
const { Item } = require('../src/models/Item');
const { EmailLog, Suppression } = require('../src/models/EmailLog');
const gst = require('../src/services/gstService');
const eInvoice = require('../src/services/eInvoiceService');
const totp = require('../src/utils/totp');
const { purgeExpiredDeletions } = require('../src/services/maintenanceService');
const { invalidateFeatureFlagCache } = require('../src/services/featureFlagService');

let server;
let baseUrl;
let dbAvailable = false;

test.before(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 2000 });
    dbAvailable = true;
  } catch {
    console.warn('\n[compliance] No MongoDB on 127.0.0.1:27017 — skipping integration tests.\n');
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
  const text = await response.text();
  let json;
  try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  return { status: response.status, body: json, headers: response.headers, text };
}

let counter = 0;
async function registerOrg(overrides = {}) {
  counter += 1;
  const email = `filer${counter}@tenant${counter}.test`;
  const { status, body } = await call('POST', '/auth/register', {
    body: {
      name: `Filer ${counter}`,
      email,
      password: 'Password@123',
      orgName: `Compliance Tenant ${counter}`,
      stateCode: '27',
      acceptTerms: true,
      ...overrides
    }
  });
  assert.equal(status, 201, `register failed: ${JSON.stringify(body)}`);
  // The supplier's own GSTIN, needed by every return and by e-invoicing. A real one so
  // the checksum validator accepts it.
  await Organisation.updateOne(
    { _id: body.organisation._id },
    { $set: { gstin: '27AAPFU0939F1ZV', state: 'Maharashtra', address: '1 Test Road, Mumbai' } }
  );
  return { token: body.token, org: body.organisation, email, userId: body.user.id };
}

async function createClient(token, overrides = {}) {
  const { status, body } = await call('POST', '/clients', {
    token,
    body: { companyName: 'Buyer Pvt Ltd', stateCode: '27', email: 'buyer@example.test', ...overrides }
  });
  assert.equal(status, 201, `client create failed: ${JSON.stringify(body)}`);
  return body;
}

async function createInvoice(token, overrides = {}) {
  const { status, body } = await call('POST', '/invoices', {
    token,
    body: {
      date: '2026-06-10',
      dueDate: '2026-07-10',
      status: 'pending',
      items: [{ desc: 'Consulting', hsn: '998311', qty: 1, rate: 10000, gstRate: 18 }],
      ...overrides
    }
  });
  assert.equal(status, 201, `invoice create failed: ${JSON.stringify(body)}`);
  return body;
}

async function createVendor(token, overrides = {}) {
  const { status, body } = await call('POST', '/purchases/vendors', {
    token,
    body: { name: 'Supplier Pvt Ltd', stateCode: '27', gstin: '27AAPFU0939F1ZV', ...overrides }
  });
  assert.equal(status, 201, `vendor create failed: ${JSON.stringify(body)}`);
  return body;
}

const maybe = fn => async t => {
  if (!dbAvailable) return t.skip('MongoDB not available');
  return fn(t);
};

// ── Classification (#29, #30, #31) ───────────────

test('the tax head follows the place of supply, not the buyer’s registered state', maybe(async () => {
  const tenant = await registerOrg();
  // A buyer registered in the supplier's own state, so an ordinary invoice is CGST+SGST.
  const client = await createClient(tenant.token, { stateCode: '27' });

  const local = await createInvoice(tenant.token, { clientId: client._id });
  assert.equal(local.totals.isIGST, false);
  assert.ok(local.totals.cgst > 0 && local.totals.sgst > 0);

  // Same buyer, goods delivered to their branch in another state. Before this field
  // existed the invoice would have charged CGST+SGST — the wrong tax head on a legal
  // declaration.
  const interstate = await createInvoice(tenant.token, { clientId: client._id, placeOfSupply: '29' });
  assert.equal(interstate.totals.isIGST, true, 'place of supply decides the head');
  assert.ok(interstate.totals.igst > 0);
  assert.equal(interstate.totals.cgst, 0);
  assert.equal(interstate.placeOfSupply, '29', 'and is stored on the document');
}));

test('a LUT export is inter-state and charges no IGST', maybe(async () => {
  // Both directions of the trap. An export is inter-state *by definition* even when the
  // state codes match, and a without-payment export charges nothing — charging IGST on
  // a LUT export overcharges the customer and misreports the return.
  const withoutPayment = gst.calculateInvoiceTotals(
    [{ desc: 'Software', qty: 1, rate: 100000, gstRate: 18 }],
    '27', '27',
    { supplyType: 'export-without-payment' }
  );
  assert.equal(withoutPayment.isIGST, true, 'an export is never intra-state');
  assert.equal(withoutPayment.igst, 0, 'and carries no tax under LUT');
  assert.equal(withoutPayment.subtotal, 100000, 'but the taxable value is still reported');
  assert.equal(withoutPayment.taxCharged, false);
  assert.match(withoutPayment.taxNote, /LUT/, 'and says why, so it does not look like a bug');

  const withPayment = gst.calculateInvoiceTotals(
    [{ desc: 'Software', qty: 1, rate: 100000, gstRate: 18 }],
    '27', '27',
    { supplyType: 'export-with-payment' }
  );
  assert.equal(withPayment.isIGST, true);
  assert.equal(withPayment.igst, 18000, 'with payment of tax, IGST applies and is refunded later');
}));

test('an exempt supply keeps its value and loses its tax', maybe(async () => {
  for (const treatment of ['exempt', 'nil-rated', 'non-gst']) {
    const totals = gst.calculateInvoiceTotals(
      [{ desc: 'Fresh produce', qty: 10, rate: 500, gstRate: 0 }],
      '27', '29',
      { taxTreatment: treatment }
    );
    // Dropping the taxable value would understate turnover, not just tax — and turnover
    // is what registration and e-invoicing thresholds are measured on.
    assert.equal(totals.subtotal, 5000, `${treatment} still reports its value`);
    assert.equal(totals.igst, 0);
    assert.equal(totals.taxCharged, false);
    assert.equal(totals.taxTreatment, treatment, 'and the classification is persisted');
  }
}));

test('a reverse-charge invoice reports its value and collects no tax', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token, { stateCode: '27' });
  const invoice = await createInvoice(tenant.token, { clientId: client._id, reverseCharge: true });

  // Under RCM the recipient pays the government directly. Collecting it here would tax
  // the same supply twice.
  assert.equal(invoice.totals.cgst, 0);
  assert.equal(invoice.totals.sgst, 0);
  assert.equal(invoice.totals.subtotal, 10000, 'the taxable value is still on the document');
  assert.equal(invoice.totals.total, 10000, 'and the customer owes only that');
  assert.equal(invoice.totals.reverseCharge, true);
}));

test('changing the classification on an issued invoice is refused', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token, { stateCode: '27' });
  const invoice = await createInvoice(tenant.token, { clientId: client._id });

  // These fields change the tax charged, so treating them as cosmetic would be a way to
  // silently re-tax a document the customer already holds.
  for (const patch of [{ taxTreatment: 'exempt' }, { reverseCharge: true }, { placeOfSupply: '29' }]) {
    const attempt = await call('PUT', `/invoices/${invoice._id}`, { token: tenant.token, body: patch });
    assert.equal(attempt.status, 409, `${JSON.stringify(patch)} should be locked`);
    assert.equal(attempt.body.code, 'INVOICE_LOCKED');
  }

  // A note is still editable — nothing reported depends on it.
  const note = await call('PUT', `/invoices/${invoice._id}`, { token: tenant.token, body: { notes: 'Paid by NEFT' } });
  assert.equal(note.status, 200);
}));

// ── GSTR-1 (#2.1.2) ──────────────────────────────

test('GSTR-1 puts each invoice in exactly one section', maybe(async () => {
  const tenant = await registerOrg();
  const registered = await createClient(tenant.token, { companyName: 'Registered Buyer', stateCode: '29', gstin: '29AAPFU0939F1ZR' });

  // B2B — buyer has a GSTIN.
  await createInvoice(tenant.token, { clientId: registered._id });
  // B2CL — no GSTIN, inter-state, above the ₹2.5L threshold.
  await createInvoice(tenant.token, {
    billTo: { type: 'b2c', name: 'Big walk-in', stateCode: '29' },
    items: [{ desc: 'Machine', hsn: '8479', qty: 1, rate: 300000, gstRate: 18 }]
  });
  // B2CS — no GSTIN, below the threshold.
  await createInvoice(tenant.token, {
    billTo: { type: 'b2c', name: 'Small walk-in', stateCode: '29' },
    items: [{ desc: 'Part', hsn: '8479', qty: 1, rate: 5000, gstRate: 18 }]
  });
  // EXP — an export.
  await createInvoice(tenant.token, {
    billTo: { type: 'b2c', name: 'Overseas Ltd', stateCode: '97' },
    supplyType: 'export-without-payment',
    exportDetails: { countryCode: 'US', portCode: 'INNSA1', shippingBillNumber: 'SB123', currency: 'USD' },
    items: [{ desc: 'Software', hsn: '998314', qty: 1, rate: 400000, gstRate: 18 }]
  });
  // NIL — exempt.
  await createInvoice(tenant.token, {
    clientId: registered._id,
    taxTreatment: 'exempt',
    items: [{ desc: 'Exempt service', hsn: '9992', qty: 1, rate: 2000, gstRate: 0 }]
  });

  const { status, body } = await call('GET', '/reports/gstr1?month=2026-06', { token: tenant.token });
  assert.equal(status, 200);

  assert.equal(body.sections.b2b.length, 1, 'one registered buyer');
  assert.equal(body.sections.b2b[0].ctin, '29AAPFU0939F1ZR');
  // The exempt invoice is to the same registered buyer but must NOT appear in B2B —
  // reporting it in both tables would double-count the turnover.
  assert.equal(body.sections.b2b[0].inv.length, 1, 'the exempt invoice is not also in B2B');

  assert.equal(body.sections.b2cl.length, 1, 'the large inter-state B2C sale is itemised');
  assert.ok(body.sections.b2cl[0].inv[0].val > body.summary.b2clThreshold);

  assert.ok(body.sections.b2cs.length >= 1, 'the small one is aggregated');
  assert.ok(body.sections.b2cs.every(row => row.pos && typeof row.rt === 'number'));

  assert.equal(body.sections.exp.length, 1);
  assert.equal(body.sections.exp[0].exp_typ, 'WOPAY', 'without payment of tax');
  assert.equal(body.sections.exp[0].inv[0].sbnum, 'SB123');

  assert.equal(body.sections.nil.exempt, 2000, 'the exempt value is reported once, under NIL');

  // Required tables that previously did not exist at all.
  assert.ok(body.sections.hsn.length >= 3, 'the HSN summary is populated');
  assert.ok(body.sections.docIssued.length >= 1, 'and the document series is accounted for');
  assert.equal(body.sections.docIssued[0].cancel, 0);
}));

test('a credit note goes to CDNR or CDNUR depending on the buyer', maybe(async () => {
  const tenant = await registerOrg();
  const registered = await createClient(tenant.token, { stateCode: '29', gstin: '29AAPFU0939F1ZR' });
  // A credit note is dated when it is issued, so both documents are put in the current
  // month — the return period a note lands in is its own date, not the invoice's, which
  // is exactly why CDNR carries the original document's number and date separately.
  const thisMonth = new Date().toISOString().slice(0, 7);
  const invoice = await createInvoice(tenant.token, {
    clientId: registered._id,
    date: `${thisMonth}-01`,
    dueDate: `${thisMonth}-28`
  });

  const note = await call('POST', '/credit-notes', {
    token: tenant.token,
    body: { invoiceId: invoice._id, reason: 'sales-return' }
  });
  assert.equal(note.status, 201, JSON.stringify(note.body));

  const { body } = await call('GET', `/reports/gstr1?month=${thisMonth}`, { token: tenant.token });
  assert.equal(body.sections.cdnr.length, 1);
  const row = body.sections.cdnr[0].nt[0];
  // CDNR requires the original document's number and date — a credit note with no
  // original is not a credit note.
  assert.equal(row.inum, invoice.invoiceNumber);
  assert.ok(row.idt, 'and its date');
  assert.equal(row.ntty, 'C');

  // And the summary nets them, which is the figure that should tie to the books.
  assert.ok(body.summary.creditNoteCount >= 1);
  assert.ok(body.summary.netTaxable < body.summary.taxable);
}));

test('a cancelled invoice leaves the outward tables but is accounted for in the series', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token, { stateCode: '27' });
  const keep = await createInvoice(tenant.token, { clientId: client._id });
  const void_ = await createInvoice(tenant.token, { clientId: client._id });

  await call('POST', `/invoices/${void_._id}/cancel`, { token: tenant.token, body: { reason: 'Raised in error' } });

  const { body } = await call('GET', '/reports/gstr1?month=2026-06', { token: tenant.token });
  const numbers = body.sections.b2cs.length + body.sections.b2b.flatMap(p => p.inv).length;
  assert.equal(body.summary.invoiceCount, 1, 'the cancelled invoice is not reported as a supply');
  assert.ok(numbers >= 0);

  // But a gap in the series with no cancellation recorded is a red flag in a return, so
  // the document is still counted there.
  const series = body.sections.docIssued[0];
  assert.equal(series.totnum, 2);
  assert.equal(series.cancel, 1);
  assert.equal(series.net_issue, 1);
  assert.ok(keep.invoiceNumber);
}));

test('the GSTN JSON omits empty sections and needs the filer’s GSTIN', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token, { stateCode: '27' });
  await createInvoice(tenant.token, { clientId: client._id });

  const download = await call('GET', '/reports/gstr1/export.json?month=2026-06', { token: tenant.token });
  assert.equal(download.status, 200);
  assert.match(download.headers.get('content-disposition'), /GSTR1-27AAPFU0939F1ZV-062026\.json/);
  const payload = JSON.parse(download.text);
  assert.equal(payload.gstin, '27AAPFU0939F1ZV');
  assert.equal(payload.fp, '062026');
  // An empty `[]` tells the utility "I am filing a nil return for this table", which is
  // not the same claim as staying silent.
  assert.equal(payload.b2b, undefined, 'a section with nothing in it is omitted, not sent empty');
  assert.ok(payload.b2cs || payload.hsn, 'and populated sections are present');

  // Without a GSTIN the file has no key and would fail validation at upload for a reason
  // the user cannot see, so it is refused up front.
  await Organisation.updateOne({ _id: tenant.org._id }, { $set: { gstin: '' } });
  const refused = await call('GET', '/reports/gstr1/export.json?month=2026-06', { token: tenant.token });
  assert.equal(refused.status, 400);
  assert.equal(refused.body.code, 'GSTIN_REQUIRED');
}));

// ── Purchases and ITC (#2.1.5) ───────────────────

test('a purchase carries claimable input tax credit', maybe(async () => {
  const tenant = await registerOrg();
  const vendor = await createVendor(tenant.token);

  const { status, body } = await call('POST', '/purchases', {
    token: tenant.token,
    body: {
      vendorId: vendor._id,
      billNumber: 'SUP/2026/001',
      billDate: '2026-06-05',
      items: [{ desc: 'Raw material', hsn: '7208', qty: 100, rate: 500, gstRate: 18 }]
    }
  });
  assert.equal(status, 201, JSON.stringify(body));
  assert.equal(body.totals.subtotal, 50000);
  // Same state, so CGST+SGST — and the ITC mirrors it. Getting the state comparison
  // backwards would put the credit under the wrong head.
  assert.equal(body.totals.cgst, 4500);
  assert.equal(body.itc.cgst, 4500);
  assert.equal(body.itc.sgst, 4500);
  assert.equal(body.itc.eligible, true);
  assert.equal(body.balanceDue, body.totals.total, 'and it is payable');
}));

test('the same supplier bill cannot be entered twice', maybe(async () => {
  const tenant = await registerOrg();
  const vendor = await createVendor(tenant.token);
  const payload = {
    vendorId: vendor._id,
    billNumber: 'SUP/2026/DUP',
    billDate: '2026-06-05',
    items: [{ desc: 'Raw material', hsn: '7208', qty: 1, rate: 1000, gstRate: 18 }]
  };
  const first = await call('POST', '/purchases', { token: tenant.token, body: payload });
  assert.equal(first.status, 201);

  const second = await call('POST', '/purchases', { token: tenant.token, body: payload });
  // Entering it twice claims the same input credit twice, which is exactly what an audit
  // looks for — so the message says so rather than "already exists".
  assert.equal(second.status, 409);
  assert.equal(second.body.code, 'DUPLICATE_PURCHASE');
  assert.match(second.body.message, /same input tax credit twice/);
}));

test('an ineligible purchase is recorded but claims nothing', maybe(async () => {
  const tenant = await registerOrg();
  const vendor = await createVendor(tenant.token);

  const { body } = await call('POST', '/purchases', {
    token: tenant.token,
    body: {
      vendorId: vendor._id,
      billNumber: 'CAR/2026/1',
      billDate: '2026-06-06',
      itcCategory: 'blocked',
      itcNote: 'Motor car — section 17(5)',
      items: [{ desc: 'Company car', hsn: '8703', qty: 1, rate: 800000, gstRate: 28 }]
    }
  });
  // The tax was paid and the expense is real; only the credit is refused. Omitting the
  // purchase entirely would take it off the books.
  assert.equal(body.totals.cgst > 0, true, 'the tax paid is recorded');
  assert.equal(body.itc.cgst, 0, 'but nothing is claimable');
  assert.equal(body.itc.eligible, false);
  assert.equal(body.itc.category, 'blocked');

  const register = await call('GET', '/purchases/itc-register?from=2026-06-01&to=2026-06-30', { token: tenant.token });
  assert.equal(register.status, 200);
  assert.equal(register.body.claimable.total, 0, 'and the claimable total excludes it');
  assert.ok(register.body.ineligible > 0, 'while the ineligible tax is still reported');
}));

test('a reverse-charge purchase creates both a liability and a credit', maybe(async () => {
  const tenant = await registerOrg();
  // An unregistered supplier — the classic reverse-charge case.
  const vendor = await createVendor(tenant.token, { name: 'Unregistered Transporter', gstin: '', registrationType: 'unregistered' });

  const { status, body } = await call('POST', '/purchases', {
    token: tenant.token,
    body: {
      vendorId: vendor._id,
      billNumber: 'FREIGHT/1',
      billDate: '2026-06-07',
      reverseCharge: true,
      items: [{ desc: 'Freight', hsn: '996511', qty: 1, rate: 10000, gstRate: 5 }]
    }
  });
  assert.equal(status, 201, JSON.stringify(body));
  // The supplier charged nothing, so the invoice carries no tax...
  assert.equal(body.totals.cgst, 0);
  assert.equal(body.totals.total, 10000);
  // ...but we owe the tax directly and may claim it back. Netting these to zero would be
  // right on the total and wrong on both lines of the return.
  assert.equal(body.itc.cgst, 250);
  assert.equal(body.itc.sgst, 250);
}));

// ── GSTR-3B (#2.1.3) ─────────────────────────────

test('GSTR-3B nets output tax against input credit, per head', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token, { stateCode: '27' });
  const vendor = await createVendor(tenant.token);

  // ₹1,00,000 of sales at 18% intra-state → 9,000 CGST + 9,000 SGST of liability.
  await createInvoice(tenant.token, {
    clientId: client._id,
    items: [{ desc: 'Service', hsn: '998311', qty: 1, rate: 100000, gstRate: 18 }]
  });
  // ₹50,000 of purchases at 18% → 4,500 + 4,500 of credit.
  await call('POST', '/purchases', {
    token: tenant.token,
    body: {
      vendorId: vendor._id,
      billNumber: 'IN/1',
      billDate: '2026-06-05',
      items: [{ desc: 'Input', hsn: '7208', qty: 1, rate: 50000, gstRate: 18 }]
    }
  });

  const { status, body } = await call('GET', '/reports/gstr3b?month=2026-06', { token: tenant.token });
  assert.equal(status, 200);
  assert.equal(body.outward.taxable.cgst, 9000);
  assert.equal(body.itc.available.cgst, 4500);
  // The whole point of the report: a *net* figure, which was uncomputable before
  // purchases existed.
  assert.equal(body.netPayable.cgst.payable, 4500);
  assert.equal(body.netPayable.sgst.payable, 4500);
  // IGST credit cannot be used against a CGST liability arbitrarily, so a head with no
  // liability and no credit is zero rather than absorbing another head's surplus.
  assert.equal(body.netPayable.igst.payable, 0);
  assert.equal(body.netPayable.totalCash, 9000);
  assert.match(body.disclaimer, /Reconcile/, 'and it says it is a preparation aid');
}));

test('GSTR-3B keeps a reverse-charge purchase on both sides', maybe(async () => {
  const tenant = await registerOrg();
  const vendor = await createVendor(tenant.token, { gstin: '', registrationType: 'unregistered' });
  await call('POST', '/purchases', {
    token: tenant.token,
    body: {
      vendorId: vendor._id,
      billNumber: 'RCM/1',
      billDate: '2026-06-08',
      reverseCharge: true,
      items: [{ desc: 'Legal fees', hsn: '9982', qty: 1, rate: 20000, gstRate: 18 }]
    }
  });

  const { body } = await call('GET', '/reports/gstr3b?month=2026-06', { token: tenant.token });
  // 3.1(d): the liability.
  assert.equal(body.outward.inwardReverseCharge.cgst, 1800);
  // 4(A)(3): the credit. Both lines, same number — the return is filed line by line.
  assert.equal(body.itc.inwardReverseCharge.cgst, 1800);
  assert.equal(body.netPayable.cgst.payable, 0, 'and they offset to nothing payable in cash');
}));

// ── E-invoicing (#2.1.4) ─────────────────────────

test('e-invoicing validates the document before any network call', maybe(async () => {
  const tenant = await registerOrg();
  invalidateFeatureFlagCache();
  await Organisation.updateOne(
    { _id: tenant.org._id },
    { $set: { 'eInvoicing.enabled': true, featureFlags: { einvoicing: true } } }
  );

  const registered = await createClient(tenant.token, { stateCode: '29', gstin: '29AAPFU0939F1ZR' });
  // An invoice with no HSN on its line: mandatory for an e-invoice, optional everywhere
  // else in this product, which is exactly why it has to be checked here.
  const bad = await createInvoice(tenant.token, {
    clientId: registered._id,
    items: [{ desc: 'Unclassified thing', qty: 1, rate: 1000, gstRate: 18 }]
  });

  const check = await call('GET', `/reports/e-invoice/${bad._id}/check`, { token: tenant.token });
  assert.equal(check.status, 200);
  assert.equal(check.body.eligibility.required, true);
  assert.equal(check.body.valid, false);
  assert.ok(check.body.problems.some(p => p.field.includes('hsn')), 'the missing HSN is named');
  assert.equal(check.body.payload, null, 'and no payload is offered for an invalid document');

  // A well-formed one produces the real NIC payload, which is useful even with no
  // provider: it can be uploaded to the portal by hand.
  const good = await createInvoice(tenant.token, { clientId: registered._id });
  const ok = await call('GET', `/reports/e-invoice/${good._id}/check`, { token: tenant.token });
  assert.equal(ok.body.valid, true);
  assert.equal(ok.body.payload.Version, '1.1');
  assert.equal(ok.body.payload.DocDtls.No, good.invoiceNumber);
  assert.equal(ok.body.payload.BuyerDtls.Gstin, '29AAPFU0939F1ZR');
  assert.equal(ok.body.payload.ValDtls.IgstVal, good.totals.igst);
  assert.equal(ok.body.payload.ItemList[0].HsnCd, '998311');
  // A SAC code (99…) is a service.
  assert.equal(ok.body.payload.ItemList[0].IsServc, 'Y');
  assert.equal(ok.body.providerConfigured, false);
}));

test('generating without a provider fails loudly and keeps the payload', maybe(async () => {
  const tenant = await registerOrg();
  invalidateFeatureFlagCache();
  await Organisation.updateOne(
    { _id: tenant.org._id },
    { $set: { 'eInvoicing.enabled': true, featureFlags: { einvoicing: true } } }
  );
  const registered = await createClient(tenant.token, { stateCode: '29', gstin: '29AAPFU0939F1ZR' });
  const invoice = await createInvoice(tenant.token, { clientId: registered._id });

  const attempt = await call('POST', `/reports/e-invoice/${invoice._id}/generate`, { token: tenant.token });
  // A mocked success that stamped a made-up IRN would be indistinguishable from
  // compliance until an audit — which is the failure mode the decorative QR already had.
  assert.equal(attempt.status, 501);
  assert.equal(attempt.body.code, 'IRP_NOT_CONFIGURED');
  assert.ok(attempt.body.payload, 'the validated payload is still returned for manual upload');

  const stored = await Invoice.findById(invoice._id).lean();
  assert.equal(stored.eInvoice.status, 'pending', 'and the document records that it is outstanding');
  assert.equal(stored.eInvoice.errorCode, 'IRP_NOT_CONFIGURED');
}));

test('a B2C invoice is out of scope for e-invoicing', maybe(async () => {
  const tenant = await registerOrg();
  invalidateFeatureFlagCache();
  await Organisation.updateOne(
    { _id: tenant.org._id },
    { $set: { 'eInvoicing.enabled': true, featureFlags: { einvoicing: true } } }
  );
  const invoice = await createInvoice(tenant.token, {
    billTo: { type: 'b2c', name: 'Walk-in', stateCode: '27' }
  });

  const check = await call('GET', `/reports/e-invoice/${invoice._id}/check`, { token: tenant.token });
  assert.equal(check.body.eligibility.required, false);
  assert.match(check.body.eligibility.reason, /B2C/);

  // And it must not clutter the worklist — a permanently non-empty worklist is one
  // nobody uses.
  const worklist = await call('GET', '/reports/e-invoice/worklist', { token: tenant.token });
  assert.equal(worklist.status, 200);
  assert.ok(!worklist.body.invoices.some(row => String(row._id) === String(invoice._id)));
}));

test('the e-invoicing routes are gated by the feature flag', maybe(async () => {
  const tenant = await registerOrg();
  invalidateFeatureFlagCache();
  // The flag defaults to off, and the flag is what the platform console toggles — this
  // is what stopped it being decorative.
  const refused = await call('GET', '/reports/e-invoice/worklist', { token: tenant.token });
  assert.equal(refused.status, 403);
  assert.equal(refused.body.code, 'FEATURE_DISABLED');
}));

test('an IRN can only be cancelled within 24 hours', maybe(async () => {
  const fresh = eInvoice.canCancelIrn({ irn: 'x', status: 'generated', generatedAt: new Date() });
  assert.equal(fresh.allowed, true);

  const old = eInvoice.canCancelIrn({
    irn: 'x', status: 'generated', generatedAt: new Date(Date.now() - 30 * 3600 * 1000)
  });
  assert.equal(old.allowed, false);
  // The advice matters as much as the refusal: the IRP can only say no.
  assert.match(old.reason, /credit note/);
}));

// ── MFA (#7) ─────────────────────────────────────

test('TOTP matches the RFC 6238 test vectors', maybe(async () => {
  // The premise for deferring MFA four times was "needs a TOTP dependency". These are
  // the RFC's own SHA-1 vectors against the implementation in utils/totp.js.
  const secret = totp.base32Encode(Buffer.from('12345678901234567890', 'ascii'));
  assert.equal(totp.codeForCounter(secret, Math.floor(59 / 30)), '287082');
  assert.equal(totp.codeForCounter(secret, Math.floor(1111111109 / 30)), '081804');
  assert.equal(totp.codeForCounter(secret, Math.floor(1234567890 / 30)), '005924');
  assert.equal(totp.codeForCounter(secret, Math.floor(2000000000 / 30)), '279037');
}));

test('MFA enrolment is staged, then confirmed with a live code', maybe(async () => {
  const tenant = await registerOrg();

  const setup = await call('POST', '/auth/mfa/setup', { token: tenant.token });
  assert.equal(setup.status, 200);
  assert.ok(setup.body.secret);
  assert.match(setup.body.uri, /^otpauth:\/\/totp\//);

  // Staged, not enabled: a secret handed out and immediately switched on locks out
  // anyone whose authenticator was misconfigured or who closed the tab.
  let user = await User.findById(tenant.userId);
  assert.equal(user.mfa.enabled, false);
  assert.ok(user.mfa.secret);
  // Encrypted at rest — a readable secret is a second password anyone with the database
  // can use forever.
  assert.notEqual(user.mfa.secret, setup.body.secret);
  assert.equal(totp.decryptSecret(user.mfa.secret), setup.body.secret);

  const wrong = await call('POST', '/auth/mfa/enable', { token: tenant.token, body: { code: '000000' } });
  assert.equal(wrong.status, 400);

  const code = totp.codeForCounter(setup.body.secret, totp.currentCounter());
  const enable = await call('POST', '/auth/mfa/enable', { token: tenant.token, body: { code } });
  assert.equal(enable.status, 200, JSON.stringify(enable.body));
  assert.equal(enable.body.backupCodes.length, totp.BACKUP_CODE_COUNT);

  user = await User.findById(tenant.userId);
  assert.equal(user.mfa.enabled, true);
  // Recovery codes are stored hashed, so the plaintext shown once is the only copy.
  assert.ok(user.mfa.backupCodes.every(hash => !enable.body.backupCodes.includes(hash)));
}));

test('login issues no session until the second factor is presented', maybe(async () => {
  const tenant = await registerOrg();
  const setup = await call('POST', '/auth/mfa/setup', { token: tenant.token });
  await call('POST', '/auth/mfa/enable', {
    token: tenant.token,
    body: { code: totp.codeForCounter(setup.body.secret, totp.currentCounter()) }
  });

  const login = await call('POST', '/auth/login', { body: { email: tenant.email, password: 'Password@123' } });
  assert.equal(login.status, 200);
  // The property that matters: no token at all, so there is no window in which a
  // half-authenticated session exists and no route that has to check a flag.
  assert.equal(login.body.token, undefined);
  assert.equal(login.body.mfaRequired, true);
  assert.ok(login.body.mfaToken);

  const wrong = await call('POST', '/auth/mfa/verify', { body: { mfaToken: login.body.mfaToken, code: '111111' } });
  assert.equal(wrong.status, 401);
  assert.equal(wrong.body.code, 'MFA_CODE_INVALID');

  // The *next* step's code, because enrolment above already consumed the current one —
  // which is the replay guard working, not a quirk of the test. It is inside the ±1
  // verification window, so it is accepted.
  const code = totp.codeForCounter(setup.body.secret, totp.currentCounter() + 1);
  const verify = await call('POST', '/auth/mfa/verify', { body: { mfaToken: login.body.mfaToken, code } });
  assert.equal(verify.status, 200, JSON.stringify(verify.body));
  assert.ok(verify.body.token, 'and only now is a session issued');

  const usable = await call('GET', '/invoices', { token: verify.body.token });
  assert.equal(usable.status, 200);

  // Replay: the same code is valid for its whole 30-second step, so without recording
  // the consumed counter the same six digits work twice.
  const again = await call('POST', '/auth/login', { body: { email: tenant.email, password: 'Password@123' } });
  const replay = await call('POST', '/auth/mfa/verify', { body: { mfaToken: again.body.mfaToken, code } });
  assert.equal(replay.status, 401);
  assert.match(replay.body.message, /already been used/);
}));

/**
 * The platform-account path, which is the one that actually broke in production.
 *
 * A superadmin has no membership and no organisation, so `resolveSession` takes a
 * different branch from every other MFA test above — and MFA is *mandatory* on
 * these accounts, meaning if this branch returns a payload the client cannot use,
 * the console is unreachable with no way to undo the enrolment from the UI.
 *
 * The assertions are deliberately about the payload's *shape* rather than just its
 * status: the frontend reads `user.role` to choose where to land and writes
 * `user`/`token` to localStorage, and a missing field there is what turned a
 * successful sign-in into a blank page.
 */
test('a platform account can complete an MFA sign-in and gets a usable session', maybe(async () => {
  const password = 'Platform@123';
  const email = `operator${(counter += 1)}@platform.test`;
  // Created directly: there is no self-serve route to a platform account, by design.
  await User.create({
    name: 'Operator',
    email,
    passwordHash: await bcrypt.hash(password, 12),
    role: 'superadmin',
    platformRole: 'owner',
    status: 'active'
  });

  const first = await call('POST', '/auth/login', { body: { email, password } });
  assert.equal(first.status, 200, JSON.stringify(first.body));
  const setup = await call('POST', '/auth/mfa/setup', { token: first.body.token });
  assert.equal(setup.status, 200, JSON.stringify(setup.body));
  const enable = await call('POST', '/auth/mfa/enable', {
    token: first.body.token,
    body: { code: totp.codeForCounter(setup.body.secret, totp.currentCounter()) }
  });
  assert.equal(enable.status, 200, JSON.stringify(enable.body));

  // Sign out and back in — the step that was broken.
  const login = await call('POST', '/auth/login', { body: { email, password } });
  assert.equal(login.body.mfaRequired, true);
  assert.equal(login.body.token, undefined);

  const verify = await call('POST', '/auth/mfa/verify', {
    body: { mfaToken: login.body.mfaToken, code: totp.codeForCounter(setup.body.secret, totp.currentCounter() + 1) }
  });
  assert.equal(verify.status, 200, JSON.stringify(verify.body));
  assert.ok(verify.body.token, 'a session is issued');
  assert.ok(verify.body.refreshToken, 'and it can be renewed — without this the tab dies at 15 minutes');
  // Both read by the client immediately after sign-in. `undefined` here is what
  // produced the literal string "undefined" in localStorage and the blank page.
  assert.equal(verify.body.user.role, 'superadmin');
  assert.ok(verify.body.user.id);

  // And the console is genuinely reachable — the MFA gate is satisfied, not merely bypassed.
  const console_ = await call('GET', '/superadmin/me', { token: verify.body.token });
  assert.equal(console_.status, 200, JSON.stringify(console_.body));
  assert.equal(console_.body.platformRole, 'owner');
}));

test('a backup code works once and is then consumed', maybe(async () => {
  const tenant = await registerOrg();
  const setup = await call('POST', '/auth/mfa/setup', { token: tenant.token });
  const enable = await call('POST', '/auth/mfa/enable', {
    token: tenant.token,
    body: { code: totp.codeForCounter(setup.body.secret, totp.currentCounter()) }
  });
  const [backupCode] = enable.body.backupCodes;

  const login = await call('POST', '/auth/login', { body: { email: tenant.email, password: 'Password@123' } });
  const verify = await call('POST', '/auth/mfa/verify', { body: { mfaToken: login.body.mfaToken, code: backupCode } });
  assert.equal(verify.status, 200);
  assert.equal(verify.body.usedBackupCode, true);
  // The user is told how many are left, because running out is a lockout.
  assert.equal(verify.body.remainingBackupCodes, totp.BACKUP_CODE_COUNT - 1);

  const second = await call('POST', '/auth/login', { body: { email: tenant.email, password: 'Password@123' } });
  const reuse = await call('POST', '/auth/mfa/verify', { body: { mfaToken: second.body.mfaToken, code: backupCode } });
  // A recovery code that keeps working is just a weaker password.
  assert.equal(reuse.status, 401);
}));

test('disabling MFA needs the password and a code', maybe(async () => {
  const tenant = await registerOrg();
  const setup = await call('POST', '/auth/mfa/setup', { token: tenant.token });
  await call('POST', '/auth/mfa/enable', {
    token: tenant.token,
    body: { code: totp.codeForCounter(setup.body.secret, totp.currentCounter()) }
  });
  const login = await call('POST', '/auth/login', { body: { email: tenant.email, password: 'Password@123' } });
  const session = await call('POST', '/auth/mfa/verify', {
    // +1 for the same reason as above: enrolment consumed the current step.
    body: { mfaToken: login.body.mfaToken, code: totp.codeForCounter(setup.body.secret, totp.currentCounter() + 1) }
  });
  assert.equal(session.status, 200, JSON.stringify(session.body));

  // A stolen password must not be enough to remove the control that exists because
  // passwords get stolen.
  const noCode = await call('POST', '/auth/mfa/disable', {
    token: session.body.token,
    body: { password: 'Password@123', code: '000000' }
  });
  assert.equal(noCode.status, 400);

  const wrongPassword = await call('POST', '/auth/mfa/disable', {
    token: session.body.token,
    body: { password: 'NotMyPassword@1', code: totp.codeForCounter(setup.body.secret, totp.currentCounter() + 1) }
  });
  // Password is checked before the code, so a wrong password is a 401 regardless.
  assert.equal(wrongPassword.status, 401);
}));

/**
 * The status code on an unusable token, which is load-bearing in a way that is
 * easy to miss.
 *
 * Every part of session recovery keys off 401 — the client's silent refresh, its
 * one retry, and the forced sign-out when neither works. `jwt.verify` throws on
 * the most routine event in the system (a fifteen-minute access token reaching
 * its expiry), and letting that reach the error handler produced a **500**. The
 * result was an application that stopped working a quarter of an hour after
 * sign-in, showed an unexplained error, and never offered a way back.
 *
 * Asserting the *code* rather than only the status matters too: `TOKEN_EXPIRED`
 * is routine and recoverable, `TOKEN_INVALID` is not, and a client that cannot
 * tell them apart has to treat every stale token as a full sign-out.
 */
test('an expired or malformed token is a 401, never a 500', maybe(async () => {
  const tenant = await registerOrg();

  const expired = jwt.sign(
    { sub: tenant.userId, role: 'admin', orgId: String(tenant.org._id), sv: 0 },
    process.env.JWT_SECRET,
    { expiresIn: -60 }
  );
  const withExpired = await call('GET', '/invoices', { token: expired });
  assert.equal(withExpired.status, 401, `expired token must be 401, got ${withExpired.status}`);
  assert.equal(withExpired.body.code, 'TOKEN_EXPIRED');

  // The literal string a client writes when it stores `undefined` — the exact
  // value that was in a real user's browser.
  const garbage = await call('GET', '/invoices', { token: 'undefined' });
  assert.equal(garbage.status, 401, `malformed token must be 401, got ${garbage.status}`);
  assert.equal(garbage.body.code, 'TOKEN_INVALID');

  // Correctly formed, signed with the wrong key: forgery, not staleness.
  const forged = jwt.sign({ sub: tenant.userId, role: 'admin' }, 'not-the-real-secret');
  const wrongKey = await call('GET', '/invoices', { token: forged });
  assert.equal(wrongKey.status, 401, `wrongly-signed token must be 401, got ${wrongKey.status}`);
  assert.equal(wrongKey.body.code, 'TOKEN_INVALID');

  // And no message leaks the library's internals to the user.
  for (const r of [withExpired, garbage, wrongKey]) {
    assert.doesNotMatch(r.body.message, /jwt|malformed|signature/i, `leaked internals: ${r.body.message}`);
  }
}));

test('the superadmin IP allowlist matches plain addresses and CIDR blocks', maybe(async () => {
  const { ipMatches } = require('../src/middleware/accountGuards');
  assert.equal(ipMatches('203.0.113.9', '203.0.113.9'), true);
  assert.equal(ipMatches('::ffff:203.0.113.9', '203.0.113.9'), true, 'IPv4-mapped IPv6 is normalised');
  assert.equal(ipMatches('203.0.113.9', '203.0.113.0/24'), true);
  assert.equal(ipMatches('203.0.114.9', '203.0.113.0/24'), false);
  assert.equal(ipMatches('10.1.2.3', '10.0.0.0/8'), true);
  // An entry that cannot be parsed must never match — quietly accepting an address that
  // was not actually checked is worse than refusing to support the syntax.
  assert.equal(ipMatches('2001:db8::1', '203.0.113.0/24'), false);
  assert.equal(ipMatches('203.0.113.9', 'nonsense/24'), false);
}));

// ── Soft delete and the recycle bin (#37) ────────

test('a deleted record leaves every list and can be restored', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token, { companyName: 'Deletable Buyer' });

  const removed = await call('DELETE', `/clients/${client._id}`, { token: tenant.token });
  assert.equal(removed.status, 204);

  // The row still exists — that is the point — but must be invisible to every ordinary
  // read. A deleted row that still shows up in a report is worse than a hard delete,
  // because the numbers are wrong in a way nobody can see.
  const stillThere = await Client.findById(client._id).lean();
  assert.ok(stillThere.deletedAt);
  assert.ok(stillThere.deletedBy);

  const list = await call('GET', '/clients', { token: tenant.token });
  assert.ok(!list.body.data.some(row => row._id === client._id), 'gone from the list');

  const bin = await call('GET', '/clients?deleted=only', { token: tenant.token });
  assert.ok(bin.body.data.some(row => row._id === client._id), 'and visible in the recycle bin');

  const restored = await call('POST', `/clients/${client._id}/restore`, { token: tenant.token });
  assert.equal(restored.status, 200);
  const back = await call('GET', '/clients', { token: tenant.token });
  assert.ok(back.body.data.some(row => row._id === client._id), 'and back in the list');
}));

test('a deleted draft invoice keeps its number', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token);
  const draft = await createInvoice(tenant.token, { clientId: client._id, status: 'draft' });

  await call('DELETE', `/invoices/${draft._id}`, { token: tenant.token });
  const restored = await call('POST', `/invoices/${draft._id}/restore`, { token: tenant.token });
  assert.equal(restored.status, 200);
  // The number came from the org's atomic counter. Releasing it would produce two
  // documents with the same number if the draft were later restored.
  assert.equal(restored.body.invoiceNumber, draft.invoiceNumber);
}));

test('an issued invoice is not soft-deletable either', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token);
  const issued = await createInvoice(tenant.token, { clientId: client._id });

  const attempt = await call('DELETE', `/invoices/${issued._id}`, { token: tenant.token });
  // Soft delete is a recycle bin for work in progress. Under GST an issued invoice is
  // reversed by a credit note, not removed — hiding it would be the same compliance
  // problem in a nicer wrapper.
  assert.equal(attempt.status, 409);
  assert.equal(attempt.body.code, 'INVOICE_ISSUED');
}));

test('the recycle bin is purged after the grace period', maybe(async () => {
  const tenant = await registerOrg();
  const item = await call('POST', '/items', {
    token: tenant.token,
    body: { name: 'Doomed item', unit: 'Nos', gstRate: 18, sellingPrice: 100 }
  });
  assert.equal(item.status, 201);
  await call('DELETE', `/items/${item.body._id}`, { token: tenant.token });

  // Nothing is purged while it is still inside the window.
  let purged = await purgeExpiredDeletions();
  assert.equal(purged.items, 0);
  assert.ok(await Item.findById(item.body._id));

  // Aged past the window, it goes for real — otherwise the "bin" is just a hidden row
  // that grows forever.
  await Item.updateOne({ _id: item.body._id }, { $set: { deletedAt: new Date(Date.now() - 400 * 86400000) } });
  purged = await purgeExpiredDeletions();
  assert.equal(purged.items, 1);
  assert.equal(await Item.findById(item.body._id), null);
}));

// ── Email delivery logging (#58) ─────────────────

test('every send outcome is recorded, including the silent ones', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token, { email: 'chase@example.test' });
  const invoice = await createInvoice(tenant.token, { clientId: client._id });

  await call('POST', `/invoices/${invoice._id}/remind`, { token: tenant.token });

  const logs = await EmailLog.find({ to: 'chase@example.test' }).lean();
  assert.equal(logs.length, 1);
  // The actual bug in #58: with no provider configured `sendEmail` logged a line and
  // returned, so a deployment that was sending and one that was not looked identical and
  // nothing recorded which.
  assert.equal(logs[0].status, 'skipped');
  assert.equal(logs[0].type, 'reminder');
  assert.ok(logs[0].reason.includes('SENDGRID_API_KEY'));
  assert.equal(String(logs[0].orgId), String(tenant.org._id));
}));

test('a bounced address is suppressed and then refused', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token, { email: 'bounces@example.test' });
  const invoice = await createInvoice(tenant.token, { clientId: client._id });
  await call('POST', `/invoices/${invoice._id}/remind`, { token: tenant.token });

  const unauthorised = await call('POST', '/webhooks/sendgrid/events', {
    body: [{ email: 'bounces@example.test', event: 'bounce', type: 'bounce', timestamp: Math.floor(Date.now() / 1000) }]
  });
  // An open endpoint here is one anyone could use to stop a competitor's mail by posting
  // a fabricated bounce.
  assert.equal(unauthorised.status, 401);

  const accepted = await call('POST', '/webhooks/sendgrid/events', {
    headers: { 'x-klogubizz-webhook-secret': 'test_sendgrid_webhook_secret' },
    body: [{
      email: 'bounces@example.test',
      event: 'bounce',
      type: 'bounce',
      reason: '550 no such user',
      timestamp: Math.floor(Date.now() / 1000)
    }]
  });
  assert.equal(accepted.status, 200);
  assert.equal(accepted.body.suppressed, 1);

  const suppression = await Suppression.findOne({ email: 'bounces@example.test' }).lean();
  assert.equal(suppression.reason, 'bounce');

  // The next send is refused rather than attempted — continuing to mail a bounced
  // address is what destroys a sending domain's reputation for every tenant.
  await call('POST', `/invoices/${invoice._id}/remind`, { token: tenant.token });
  const logs = await EmailLog.find({ to: 'bounces@example.test' }).sort({ createdAt: -1 }).lean();
  assert.equal(logs[0].status, 'suppressed');
}));

test('a soft bounce does not suppress the address', maybe(async () => {
  const { isHardBounce } = require('../src/controllers/sendgridWebhookController');
  // A full mailbox is temporary. Suppressing on it would permanently stop mail to a
  // customer whose inbox was briefly full.
  assert.equal(isHardBounce({ event: 'bounce', type: 'blocked' }), false);
  assert.equal(isHardBounce({ event: 'bounce', type: 'bounce' }), true);
  assert.equal(isHardBounce({ event: 'spamreport' }), true);
}));

// ── Data rights (#62) ────────────────────────────

test('a tenant can export everything it holds', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token);
  await createInvoice(tenant.token, { clientId: client._id });
  const vendor = await createVendor(tenant.token);
  await call('POST', '/purchases', {
    token: tenant.token,
    body: { vendorId: vendor._id, billNumber: 'EXP/1', billDate: '2026-06-01', items: [{ desc: 'x', qty: 1, rate: 100, gstRate: 18 }] }
  });

  const download = await call('GET', '/organisations/current/export', { token: tenant.token });
  assert.equal(download.status, 200);
  assert.match(download.headers.get('content-disposition'), /klogubizz-export-/);

  const payload = JSON.parse(download.text);
  assert.equal(payload.format, 'klogubizz-tenant-export/1');
  assert.equal(payload.clients.length, 1);
  assert.equal(payload.invoices.length, 1);
  assert.equal(payload.purchases.length, 1);
  assert.equal(payload.vendors.length, 1);
  // Credentials are never in an export — it lands in a downloads folder.
  assert.ok(payload.users.every(user => user.passwordHash === undefined));
  assert.ok(payload.users.every(user => !user.mfa?.secret));
}));

test('self-service deletion is confirmed, reasoned and reversible within the window', maybe(async () => {
  const tenant = await registerOrg();

  const wrongName = await call('POST', '/organisations/current/delete-account', {
    token: tenant.token,
    body: { confirmName: 'Not The Name', password: 'Password@123' }
  });
  assert.equal(wrongName.status, 400);
  assert.equal(wrongName.body.code, 'CONFIRMATION_MISMATCH');

  const wrongPassword = await call('POST', '/organisations/current/delete-account', {
    token: tenant.token,
    body: { confirmName: tenant.org.name, password: 'WrongPassword@1' }
  });
  assert.equal(wrongPassword.status, 401);

  const scheduled = await call('POST', '/organisations/current/delete-account', {
    token: tenant.token,
    body: { confirmName: tenant.org.name, password: 'Password@123', reason: 'Closing the business' }
  });
  assert.equal(scheduled.status, 200, JSON.stringify(scheduled.body));
  assert.ok(scheduled.body.scheduledFor);

  const org = await Organisation.findById(tenant.org._id).lean();
  assert.ok(org.deletedAt);
  // Cancelled rather than suspended: read-only with exports still working is exactly
  // right for a grace window — they can still take their data out.
  assert.equal(org.status, 'cancelled');

  const stillExports = await call('GET', '/organisations/current/export', { token: tenant.token });
  assert.equal(stillExports.status, 200, 'the export keeps working during the grace period');

  const cancelled = await call('POST', '/organisations/current/cancel-deletion', { token: tenant.token });
  assert.equal(cancelled.status, 200);
  const restored = await Organisation.findById(tenant.org._id).lean();
  assert.equal(restored.deletedAt, null);
  assert.equal(restored.status, 'active');
}));

test('a tenant past its erasure window is purged', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token);
  await createInvoice(tenant.token, { clientId: client._id });

  await call('POST', '/organisations/current/delete-account', {
    token: tenant.token,
    body: { confirmName: tenant.org.name, password: 'Password@123' }
  });
  await Organisation.updateOne(
    { _id: tenant.org._id },
    { $set: { deletedAt: new Date(Date.now() - 400 * 86400000) } }
  );

  const purged = await purgeExpiredDeletions();
  assert.equal(purged.organisations, 1);
  assert.equal(await Organisation.findById(tenant.org._id), null);
  assert.equal(await Invoice.countDocuments({ orgId: tenant.org._id }), 0);
  assert.equal(await User.countDocuments({ orgId: tenant.org._id }), 0);
}));

// ── Email verification (#52) ──────────────────────

test('verification is skipped when no provider can send it, and works when asked for', maybe(async () => {
  // With no mail provider there is nothing to verify with, so the address is treated as
  // verified — the alternative is an account nobody can finish creating.
  const tenant = await registerOrg();
  const user = await User.findById(tenant.userId);
  assert.ok(user.emailVerifiedAt, 'auto-verified when verification cannot be sent');

  // The redemption path itself still works, and is what the enforced mode uses.
  const { createToken } = require('../src/services/tokenService');
  const { token, hash } = createToken();
  await User.updateOne(
    { _id: tenant.userId },
    { $set: { emailVerifiedAt: null, emailVerifyTokenHash: hash, emailVerifyTokenExpires: new Date(Date.now() + 3600000) } }
  );

  const bad = await call('POST', '/auth/verify-email', { body: { token: 'not-a-real-token-value' } });
  assert.equal(bad.status, 400);
  assert.equal(bad.body.code, 'INVALID_VERIFICATION');

  const good = await call('POST', '/auth/verify-email', { body: { token } });
  assert.equal(good.status, 200);
  const verified = await User.findById(tenant.userId);
  assert.ok(verified.emailVerifiedAt);

  // Single use: the token is cleared, so the link cannot be replayed.
  const replay = await call('POST', '/auth/verify-email', { body: { token } });
  assert.equal(replay.status, 400);
}));
