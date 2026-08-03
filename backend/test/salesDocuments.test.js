/**
 * Quotations, proforma invoices and delivery challans (2.2 #11, #12, #13).
 *
 * The tests are organised around the invariant that gives these documents their
 * meaning: **none of them is a tax invoice.** So most of what is asserted here
 * is what they must *not* do — reach a GST return, carry a balance, move stock,
 * consume an invoice number, or turn into two invoices.
 *
 * Skipped automatically when no MongoDB is reachable. Uses a throwaway database
 * that is dropped on the way out.
 */
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/klogubizz_salesdoc_test';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_used_only_by_the_sales_document_suite';

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const app = require('../server');
const { Plan } = require('../src/models/Plan');
const { Invoice } = require('../src/models/Invoice');
const { Item } = require('../src/models/Item');
const { Organisation } = require('../src/models/Organisation');
const { SalesDocument } = require('../src/models/SalesDocument');
const { StockMovement } = require('../src/models/StockMovement');
const { sweepExpiredQuotations } = require('../src/services/maintenanceService');
const { buildGstr1 } = require('../src/services/gstReturnService');

let server;
let baseUrl;
let dbAvailable = false;

test.before(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 2000 });
    dbAvailable = true;
  } catch {
    console.warn('\n[sales-documents] No MongoDB on 127.0.0.1:27017 — skipping.\n');
    return;
  }
  await mongoose.connection.dropDatabase();
  await Plan.create([
    { code: 'starter', name: 'Starter', monthlyPrice: 0, yearlyPrice: 0, userLimit: 5, invoiceLimit: 200, sortOrder: 0 }
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
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/pdf') || contentType.includes('text/csv')) {
    return { status: response.status, buffer: Buffer.from(await response.arrayBuffer()), headers: response.headers };
  }
  const text = await response.text();
  let json;
  try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  return { status: response.status, body: json, headers: response.headers };
}

const maybe = fn => async t => {
  if (!dbAvailable) return t.skip('MongoDB not available');
  return fn(t);
};

let counter = 0;
async function registerOrg() {
  counter += 1;
  const email = `owner${counter}@salesdoc${counter}.test`;
  const { status, body } = await call('POST', '/auth/register', {
    body: {
      name: `Owner ${counter}`, email, password: 'Password@123',
      orgName: `SalesDoc Tenant ${counter}`, stateCode: '27', acceptTerms: true
    }
  });
  assert.equal(status, 201, `register failed: ${JSON.stringify(body)}`);
  return { token: body.token, org: body.organisation, email };
}

async function createClient(token, overrides = {}) {
  const { status, body } = await call('POST', '/clients', {
    token,
    body: { companyName: 'Buyer Pvt Ltd', stateCode: '27', email: 'buyer@example.test', gstin: '27AAPFU0939F1ZV', ...overrides }
  });
  assert.equal(status, 201, `client create failed: ${JSON.stringify(body)}`);
  return body;
}

const LINE = { desc: 'Consulting', qty: 2, rate: 5000, gstRate: 18 };

async function createDoc(token, kind, overrides = {}) {
  const { status, body } = await call('POST', '/sales-documents', {
    token,
    body: { kind, items: [LINE], ...overrides }
  });
  assert.equal(status, 201, `${kind} create failed: ${JSON.stringify(body)}`);
  return body;
}

// ── Numbering ────────────────────────────────────

test('each kind draws from its own series and never touches the invoice counter', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token);

  const quote = await createDoc(tenant.token, 'quotation', { clientId: client._id });
  const proforma = await createDoc(tenant.token, 'proforma', { clientId: client._id });
  const challan = await createDoc(tenant.token, 'delivery-challan', { clientId: client._id, challanPurpose: 'job-work' });

  // The number alone says what kind of document it is.
  assert.match(quote.documentNumber, /^QT-\d{4}-\d{3}$/, quote.documentNumber);
  assert.match(proforma.documentNumber, /^PI-\d{4}-\d{3}$/, proforma.documentNumber);
  assert.match(challan.documentNumber, /^DC-\d{4}-\d{3}$/, challan.documentNumber);

  // Each series starts at 1 independently — they do not share a counter.
  assert.ok(quote.documentNumber.endsWith('001'));
  assert.ok(proforma.documentNumber.endsWith('001'));
  assert.ok(challan.documentNumber.endsWith('001'));

  // And crucially the *invoice* counter is untouched: a gap in the tax-invoice
  // series is what an auditor reads as a missing document.
  const org = await Organisation.findById(tenant.org._id).lean();
  assert.equal(org.invoiceSequence, 0, 'issuing quotations must not consume invoice numbers');
  assert.equal(org.quotationSequence, 1);
  assert.equal(org.proformaSequence, 1);
  assert.equal(org.deliveryChallanSequence, 1);
}));

test('a client-supplied document number is ignored', maybe(async () => {
  const tenant = await registerOrg();
  const doc = await createDoc(tenant.token, 'quotation', {
    billTo: { name: 'Walk-in', stateCode: '27' },
    documentNumber: 'QT-1999-666'
  });
  assert.notEqual(doc.documentNumber, 'QT-1999-666', 'the number must come from the org counter, never the request');
}));

// ── Pricing ──────────────────────────────────────

test('a quotation is priced by the same GST engine as the invoice it becomes', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token);
  const quote = await createDoc(tenant.token, 'quotation', { clientId: client._id });

  // Same state as the org (27), so CGST+SGST rather than IGST.
  assert.equal(quote.totals.subtotal, 10000);
  assert.equal(quote.totals.cgst, 900);
  assert.equal(quote.totals.sgst, 900);
  assert.equal(quote.totals.igst, 0);
  assert.equal(quote.totals.total, 11800);

  const converted = await call('POST', `/sales-documents/${quote._id}/convert`, { token: tenant.token, body: {} });
  assert.equal(converted.status, 201, JSON.stringify(converted.body));
  // The quoted figure and the invoiced figure agree — a quotation that quotes a
  // different tax head from the invoice is worse than no quotation.
  assert.deepEqual(
    {
      subtotal: converted.body.invoice.totals.subtotal,
      cgst: converted.body.invoice.totals.cgst,
      sgst: converted.body.invoice.totals.sgst,
      total: converted.body.invoice.totals.total
    },
    { subtotal: 10000, cgst: 900, sgst: 900, total: 11800 }
  );
}));

test('an inter-state quotation quotes IGST, as the invoice will charge', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token, { stateCode: '29', gstin: '29AAPFU0939F1ZR' });
  const quote = await createDoc(tenant.token, 'quotation', { clientId: client._id });
  assert.equal(quote.totals.igst, 1800);
  assert.equal(quote.totals.cgst, 0);
  assert.equal(quote.totals.isIGST, true);
}));

// ── The core invariant: not a tax invoice ────────

test('pre-invoice documents never appear in a GST return', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token);
  await createDoc(tenant.token, 'quotation', { clientId: client._id });
  await createDoc(tenant.token, 'proforma', { clientId: client._id });
  await createDoc(tenant.token, 'delivery-challan', { clientId: client._id, challanPurpose: 'job-work' });

  const orgId = new mongoose.Types.ObjectId(String(tenant.org._id));
  const report = await buildGstr1(orgId, { from: '2020-01-01', to: '2099-12-31' });

  // A quotation in GSTR-1 would declare turnover that was never supplied; a
  // proforma there would double-count the eventual invoice.
  const sections = [
    ...(report.b2b || []), ...(report.b2cl || []), ...(report.b2cs || []),
    ...(report.exp || []), ...(report.nil || [])
  ];
  assert.equal(sections.length, 0, 'no pre-invoice document may reach an outward-supply table');
  const documented = JSON.stringify(report);
  assert.ok(!documented.includes('QT-'), 'a quotation number must not appear anywhere in the return');
  assert.ok(!documented.includes('PI-'), 'a proforma number must not appear anywhere in the return');
  assert.ok(!documented.includes('DC-'), 'a challan number must not appear anywhere in the return');
}));

test('a delivery challan moves no stock — the invoice raised from it does', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token);
  const item = await call('POST', '/items', {
    token: tenant.token,
    body: { name: 'Tracked Widget', itemCode: 'TW-1', type: 'goods', sellingPrice: 500, gstRate: 18, stockQty: 100, unit: 'Nos' }
  });
  assert.equal(item.status, 201, JSON.stringify(item.body));

  const line = { desc: 'Tracked Widget', itemCode: 'TW-1', qty: 10, rate: 500, gstRate: 18 };
  const challan = await createDoc(tenant.token, 'delivery-challan', {
    clientId: client._id, challanPurpose: 'supply-on-approval', items: [line]
  });

  // Goods have physically moved, but ownership has not transferred — and a
  // return of unsold approval goods would need a compensating movement nobody
  // records. Stock moves when ownership does.
  let stored = await Item.findOne({ itemCode: 'TW-1', orgId: tenant.org._id }).lean();
  assert.equal(stored.stockQty, 100, 'a challan must not decrement stock');
  assert.equal(await StockMovement.countDocuments({ orgId: tenant.org._id }), 0);

  const converted = await call('POST', `/sales-documents/${challan._id}/convert`, { token: tenant.token, body: {} });
  assert.equal(converted.status, 201, JSON.stringify(converted.body));

  // Fire-and-forget ledger write — poll rather than asserting immediately.
  for (let attempt = 0; attempt < 40; attempt += 1) {
    stored = await Item.findOne({ itemCode: 'TW-1', orgId: tenant.org._id }).lean();
    if (stored.stockQty === 90) break;
    await new Promise(resolve => { setTimeout(resolve, 50); });
  }
  assert.equal(stored.stockQty, 90, 'the invoice raised from the challan is what moves stock');
}));

test('a quotation carries no settlement state and no payment can be recorded against it', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token);
  const quote = await createDoc(tenant.token, 'quotation', { clientId: client._id });

  // A quotation is an offer, not a debt.
  assert.equal(quote.balanceDue, undefined);
  assert.equal(quote.amountPaid, undefined);

  // `/payments` takes an invoiceId; a sales-document id is not one.
  const attempt = await call('POST', '/payments', {
    token: tenant.token,
    body: { invoiceId: quote._id, amount: 100, method: 'upi', date: '2026-08-01' }
  });
  assert.ok(attempt.status >= 400, `a payment against a quotation must be refused, got ${attempt.status}`);

  // And it is absent from receivables, which read invoices only.
  const ageing = await call('GET', '/reports/ar-ageing', { token: tenant.token });
  if (ageing.status === 200) {
    assert.ok(!JSON.stringify(ageing.body).includes(quote.documentNumber));
  }
}));

// ── Conversion ───────────────────────────────────

test('converting produces one invoice, links both ways, and cannot happen twice', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token);
  const quote = await createDoc(tenant.token, 'quotation', { clientId: client._id });

  const first = await call('POST', `/sales-documents/${quote._id}/convert`, { token: tenant.token, body: {} });
  assert.equal(first.status, 201, JSON.stringify(first.body));
  const invoice = first.body.invoice;
  assert.match(invoice.invoiceNumber, /^KLG-\d{4}-\d{3}$/);
  assert.equal(invoice.status, 'pending', 'a conversion raises a real invoice, not another draft');

  // Both directions are stored, because both questions get asked.
  assert.equal(String(invoice.sourceDocument.documentId), String(quote._id));
  assert.equal(invoice.sourceDocument.documentNumber, quote.documentNumber);
  assert.equal(invoice.sourceDocument.kind, 'quotation');
  assert.equal(first.body.document.status, 'converted');
  assert.equal(first.body.document.convertedToInvoiceNumber, invoice.invoiceNumber);

  // Two clicks must not produce two tax invoices for one order.
  const second = await call('POST', `/sales-documents/${quote._id}/convert`, { token: tenant.token, body: {} });
  assert.equal(second.status, 409);
  assert.equal(second.body.code, 'ALREADY_CONVERTED');
  assert.equal(await Invoice.countDocuments({ orgId: tenant.org._id }), 1, 'exactly one invoice exists');
}));

test('concurrent conversions still produce exactly one invoice', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token);
  const quote = await createDoc(tenant.token, 'quotation', { clientId: client._id });

  // The race the conditional claim exists for.
  const results = await Promise.all(
    Array.from({ length: 5 }, () => call('POST', `/sales-documents/${quote._id}/convert`, { token: tenant.token, body: {} }))
  );
  const created = results.filter(r => r.status === 201);
  const refused = results.filter(r => r.status === 409);

  assert.equal(created.length, 1, `exactly one conversion should win, got ${created.length}`);
  assert.equal(refused.length, 4);
  assert.equal(await Invoice.countDocuments({ orgId: tenant.org._id }), 1);
}));

test('a converted document is locked against editing and deletion', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token);
  const quote = await createDoc(tenant.token, 'quotation', { clientId: client._id });
  await call('POST', `/sales-documents/${quote._id}/convert`, { token: tenant.token, body: {} });

  // It produced a tax document; the two disagreeing about what was agreed is
  // the failure this prevents.
  const edit = await call('PUT', `/sales-documents/${quote._id}`, {
    token: tenant.token, body: { items: [{ ...LINE, rate: 1 }] }
  });
  assert.equal(edit.status, 409);
  assert.equal(edit.body.code, 'DOCUMENT_CONVERTED');

  const removed = await call('DELETE', `/sales-documents/${quote._id}`, { token: tenant.token });
  assert.equal(removed.status, 409);
  assert.equal(removed.body.code, 'DOCUMENT_CONVERTED');

  const status = await call('PUT', `/sales-documents/${quote._id}/status`, { token: tenant.token, body: { status: 'draft' } });
  assert.equal(status.status, 409);
}));

test('conversion consumes the invoice quota rather than bypassing it', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token);
  // A one-invoice ceiling for this org.
  await Organisation.updateOne({ _id: tenant.org._id }, { $set: { 'limitOverrides.invoiceLimit': 1 } });

  const first = await createDoc(tenant.token, 'quotation', { clientId: client._id });
  const second = await createDoc(tenant.token, 'quotation', { clientId: client._id });

  assert.equal((await call('POST', `/sales-documents/${first._id}/convert`, { token: tenant.token, body: {} })).status, 201);

  // Otherwise conversion is an unlimited-invoice hole, exactly the one Duplicate
  // had before Phase 1 closed it (#17).
  const overQuota = await call('POST', `/sales-documents/${second._id}/convert`, { token: tenant.token, body: {} });
  assert.equal(overQuota.status, 403, JSON.stringify(overQuota.body));

  // And the failed attempt must not have left the document stuck as converted.
  const stillOpen = await SalesDocument.findById(second._id).lean();
  assert.notEqual(stillOpen.status, 'converted', 'a refused conversion must not lock the document');
  assert.ok(!stillOpen.convertedToInvoiceId, 'and must not have been linked to an invoice');
}));

test('a rejected quotation cannot be invoiced without being reopened', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token);
  const quote = await createDoc(tenant.token, 'quotation', { clientId: client._id });

  await call('PUT', `/sales-documents/${quote._id}/status`, { token: tenant.token, body: { status: 'rejected' } });
  const refused = await call('POST', `/sales-documents/${quote._id}/convert`, { token: tenant.token, body: {} });
  assert.equal(refused.status, 409);
  assert.equal(refused.body.code, 'DOCUMENT_REJECTED');

  // Reopening it makes the conversion legitimate again.
  await call('PUT', `/sales-documents/${quote._id}/status`, { token: tenant.token, body: { status: 'accepted' } });
  assert.equal((await call('POST', `/sales-documents/${quote._id}/convert`, { token: tenant.token, body: {} })).status, 201);
}));

// ── Expiry ───────────────────────────────────────

test('a lapsed quotation reads as expired immediately, before any sweep runs', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token);
  const quote = await createDoc(tenant.token, 'quotation', {
    clientId: client._id,
    validUntil: new Date(Date.now() - 86400000).toISOString(),
    status: 'sent'
  });

  // Derived from validUntil, not read from the stored status — the same rule
  // overdue invoices follow, so the figure is right the instant it lapses.
  const fetched = await call('GET', `/sales-documents/${quote._id}`, { token: tenant.token });
  assert.equal(fetched.body.isExpired, true);
  assert.equal(fetched.body.effectiveStatus, 'expired');
  assert.equal(fetched.body.status, 'sent', 'the stored status is left for the sweep to reconcile');

  // The sweep then makes the stored value agree.
  const swept = await sweepExpiredQuotations();
  assert.ok(swept.expiredQuotations >= 1);
  assert.equal((await SalesDocument.findById(quote._id).lean()).status, 'expired');
}));

test('a quotation with no expiry date is never swept, and other kinds never expire', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token);
  const openEnded = await createDoc(tenant.token, 'quotation', { clientId: client._id, status: 'sent' });
  const proforma = await createDoc(tenant.token, 'proforma', {
    clientId: client._id,
    // Sent even though a proforma does not expire — the controller nulls it.
    validUntil: new Date(Date.now() - 86400000).toISOString()
  });

  await sweepExpiredQuotations();

  // A comparison operator never matches a missing/null field, so "no expiry"
  // cannot be swept — the trap the aggregation form of this hit in Phase 3.
  assert.equal((await SalesDocument.findById(openEnded._id).lean()).status, 'sent');
  const storedProforma = await SalesDocument.findById(proforma._id).lean();
  assert.equal(storedProforma.validUntil, null, 'only a quotation has an expiry');
  assert.notEqual(storedProforma.status, 'expired');
}));

test('an accepted quotation is not relabelled as expired', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token);
  const quote = await createDoc(tenant.token, 'quotation', {
    clientId: client._id,
    validUntil: new Date(Date.now() - 86400000).toISOString()
  });
  await call('PUT', `/sales-documents/${quote._id}/status`, { token: tenant.token, body: { status: 'accepted' } });

  await sweepExpiredQuotations();
  // It has been *decided*; relabelling that as merely lapsed would lose the
  // decision the conversion-rate figure is computed from.
  assert.equal((await SalesDocument.findById(quote._id).lean()).status, 'accepted');
  const fetched = await call('GET', `/sales-documents/${quote._id}`, { token: tenant.token });
  assert.equal(fetched.body.isExpired, false);
}));

// ── Listing, PDF, summary, isolation ─────────────

test('the list is filterable by kind and returns the paginated envelope', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token);
  await createDoc(tenant.token, 'quotation', { clientId: client._id });
  await createDoc(tenant.token, 'quotation', { clientId: client._id });
  await createDoc(tenant.token, 'proforma', { clientId: client._id });

  const quotes = await call('GET', '/sales-documents?kind=quotation', { token: tenant.token });
  assert.equal(quotes.status, 200);
  assert.equal(quotes.body.total, 2);
  assert.ok(Array.isArray(quotes.body.data), 'the envelope carries .data, which ServerList reads');
  assert.ok(quotes.body.data.every(d => d.kind === 'quotation'));
  assert.ok(quotes.body.data.every(d => d.kindLabel === 'Quotation'));

  const all = await call('GET', '/sales-documents', { token: tenant.token });
  assert.equal(all.body.total, 3);

  const bogus = await call('GET', '/sales-documents?kind=nonsense', { token: tenant.token });
  assert.equal(bogus.status, 400);
}));

test('the PDF renders and is titled for its kind, never "Tax Invoice"', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token);
  const proforma = await createDoc(tenant.token, 'proforma', { clientId: client._id });

  const pdf = await call('GET', `/sales-documents/${proforma._id}/pdf`, { token: tenant.token });
  assert.equal(pdf.status, 200);
  assert.equal(pdf.headers.get('content-type'), 'application/pdf');
  assert.equal(pdf.buffer.slice(0, 4).toString(), '%PDF');
  assert.match(pdf.headers.get('content-disposition'), /PI-\d{4}-\d{3}\.pdf/);
}));

test('the summary reports pipeline value and a win rate only once something is decided', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token);

  const empty = await call('GET', '/sales-documents/summary?kind=quotation', { token: tenant.token });
  assert.equal(empty.status, 200);
  // Null, not 0 — a 0% win rate reads as "we lose everything" rather than "we
  // have not quoted yet", the same rule the receivables metrics follow.
  assert.equal(empty.body.conversionRate, null);

  const won = await createDoc(tenant.token, 'quotation', { clientId: client._id, status: 'sent' });
  const lost = await createDoc(tenant.token, 'quotation', { clientId: client._id, status: 'sent' });
  await createDoc(tenant.token, 'quotation', { clientId: client._id, status: 'sent' });

  const open = await call('GET', '/sales-documents/summary?kind=quotation', { token: tenant.token });
  assert.equal(open.body.openCount, 3);
  assert.equal(open.body.openValue, 35400, '3 x 11800 still in play');
  assert.equal(open.body.conversionRate, null, 'nothing decided yet');

  await call('POST', `/sales-documents/${won._id}/convert`, { token: tenant.token, body: {} });
  await call('PUT', `/sales-documents/${lost._id}/status`, { token: tenant.token, body: { status: 'rejected' } });

  const decided = await call('GET', '/sales-documents/summary?kind=quotation', { token: tenant.token });
  // One won, one lost, one still open — 50%, not 33%: an undecided quotation is
  // not a loss, and counting it as one makes the figure drop every time you quote.
  assert.equal(decided.body.conversionRate, 50);
  assert.equal(decided.body.openCount, 1);
}));

test('the challan summary reports how many are still awaiting an invoice', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token);
  const a = await createDoc(tenant.token, 'delivery-challan', { clientId: client._id, challanPurpose: 'approval' });
  await createDoc(tenant.token, 'delivery-challan', { clientId: client._id, challanPurpose: 'job-work' });

  let summary = await call('GET', '/sales-documents/summary?kind=delivery-challan', { token: tenant.token });
  // Goods that left and were never billed — the whole reason to track challans.
  assert.equal(summary.body.awaitingInvoice, 2);

  await call('POST', `/sales-documents/${a._id}/convert`, { token: tenant.token, body: {} });
  summary = await call('GET', '/sales-documents/summary?kind=delivery-challan', { token: tenant.token });
  assert.equal(summary.body.awaitingInvoice, 1);
}));

test('one tenant cannot see or convert another tenant\'s documents', maybe(async () => {
  const a = await registerOrg();
  const b = await registerOrg();
  const clientA = await createClient(a.token);
  const doc = await createDoc(a.token, 'quotation', { clientId: clientA._id });

  assert.equal((await call('GET', `/sales-documents/${doc._id}`, { token: b.token })).status, 404);
  assert.equal((await call('PUT', `/sales-documents/${doc._id}`, { token: b.token, body: { notes: 'x' } })).status, 404);
  assert.equal((await call('POST', `/sales-documents/${doc._id}/convert`, { token: b.token, body: {} })).status, 404);
  assert.equal((await call('DELETE', `/sales-documents/${doc._id}`, { token: b.token })).status, 404);

  const list = await call('GET', '/sales-documents', { token: b.token });
  assert.equal(list.body.total, 0);
}));

test('soft delete hides a document from the list and restore brings it back', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token);
  const doc = await createDoc(tenant.token, 'quotation', { clientId: client._id });

  assert.equal((await call('DELETE', `/sales-documents/${doc._id}`, { token: tenant.token })).status, 200);
  assert.equal((await call('GET', '/sales-documents', { token: tenant.token })).body.total, 0);
  // The recycle bin opts back in explicitly.
  assert.equal((await call('GET', '/sales-documents?deleted=only', { token: tenant.token })).body.total, 1);

  assert.equal((await call('POST', `/sales-documents/${doc._id}/restore`, { token: tenant.token })).status, 200);
  assert.equal((await call('GET', '/sales-documents', { token: tenant.token })).body.total, 1);
}));

test('the CSV export reports the derived status, not the stale stored one', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token);
  await createDoc(tenant.token, 'quotation', {
    clientId: client._id,
    status: 'sent',
    validUntil: new Date(Date.now() - 86400000).toISOString()
  });

  const csv = await call('GET', '/sales-documents/export.csv', { token: tenant.token });
  assert.equal(csv.status, 200);
  const text = csv.buffer.toString();
  assert.ok(text.startsWith('Number,Type,Date'), text.slice(0, 60));
  // Otherwise the spreadsheet disagrees with the screen.
  assert.ok(text.includes('expired'), 'the export must not say "sent" for a lapsed quotation');
}));

test('a line item is required — an empty quotation is refused', maybe(async () => {
  const tenant = await registerOrg();
  const client = await createClient(tenant.token);
  const empty = await call('POST', '/sales-documents', {
    token: tenant.token,
    body: { kind: 'quotation', clientId: client._id, items: [] }
  });
  assert.equal(empty.status, 400);
}));
