/**
 * The platform-wide default invoice template.
 *
 * The super-admin Invoice Templates page previously wrote to a separate
 * `InvoiceTemplate` collection that nothing read — the platform owner's choice
 * reached no invoice at all. These tests hold the wiring that makes it real.
 */
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/klogubizz_platformdefault_test';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_used_only_by_the_platform_default_suite';

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { resolveTemplate } = require('../src/services/invoiceTemplates');
const { GlobalSetting } = require('../src/models/Settings');

let dbAvailable = false;

test.before(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 2000 });
    dbAvailable = true;
    await mongoose.connection.dropDatabase();
  } catch {
    console.warn('\n[platform-defaults] No MongoDB on 127.0.0.1:27017 — DB-backed cases skipped.\n');
  }
});

test.after(async () => {
  if (!dbAvailable) return;
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

test('a tenant with no template of their own falls back to the platform default', () => {
  // No branding at all — this is the case that used to silently land on the
  // hardcoded fallback regardless of what the platform owner had chosen.
  const withDefault = resolveTemplate({}, 'gst-ledger-register');
  assert.equal(withDefault.id, 'gst-ledger-register');

  const noBranding = resolveTemplate(undefined, 'pos-receipt');
  assert.equal(noBranding.id, 'pos-receipt');
});

test('a tenant\'s own choice always beats the platform default', () => {
  const template = resolveTemplate({ invoiceTemplateId: 'corporate-formal' }, 'pos-receipt');
  assert.equal(template.id, 'corporate-formal');
});

test('a tenant custom template beats both', () => {
  const template = resolveTemplate(
    { invoiceTemplateId: 'custom', customInvoiceTemplate: { font: 'Times-Roman', tableStyle: 'ledger' } },
    'pos-receipt'
  );
  assert.equal(template.id, 'custom');
  assert.equal(template.tableStyle, 'ledger');
});

test('an unknown or absent default still resolves to a usable template', () => {
  // A deployment that has never set the platform default must render something
  // rather than crashing on a missing template.
  const noDefault = resolveTemplate({}, undefined);
  assert.ok(noDefault.id, 'a template is always returned');
  assert.ok(noDefault.font, 'and it is fully populated');

  const bogusDefault = resolveTemplate({}, 'a-template-that-does-not-exist');
  assert.ok(bogusDefault.id);
});

test('the saved global setting is what the renderer reads', async t => {
  if (!dbAvailable) return t.skip('MongoDB not available');
  const { getPlatformDefaults, invalidatePlatformDefaults } = require('../src/services/platformSettingsService');

  // Nothing configured yet: a sane built-in default.
  invalidatePlatformDefaults();
  const initial = await getPlatformDefaults();
  assert.equal(initial.templateId, 'modern-minimal');

  await GlobalSetting.create({
    key: 'defaultInvoiceTemplate',
    value: { templateId: 'enterprise-grid', accentColor: '#059669' }
  });
  invalidatePlatformDefaults();

  const saved = await getPlatformDefaults();
  assert.equal(saved.templateId, 'enterprise-grid');
  assert.equal(saved.accentColor, '#059669');

  // And that value genuinely drives resolution for a tenant with no choice.
  assert.equal(resolveTemplate({}, saved.templateId).id, 'enterprise-grid');
});

test('a rendered PDF actually uses the platform default', async t => {
  if (!dbAvailable) return t.skip('MongoDB not available');
  const { renderInvoicePdf } = require('../src/services/pdfService');
  const { calculateInvoiceTotals } = require('../src/services/gstService');

  const items = [{ desc: 'Consulting', hsn: '998311', qty: 1, rate: 1000, gstRate: 18 }];
  const invoice = {
    invoiceNumber: 'KLG-2026-001',
    date: new Date('2026-07-01'),
    dueDate: new Date('2026-07-15'),
    items,
    totals: calculateInvoiceTotals(items, '27', '27')
  };
  const org = { name: 'Test Co', stateCode: '27', brandingConfig: {} };
  const client = { companyName: 'Buyer', stateCode: '27' };

  // pos-receipt is structurally distinct (narrow page, stacked rows), so the
  // template genuinely taking effect is observable in the output rather than
  // having to be taken on trust.
  const receipt = await renderInvoicePdf({ invoice, client, org, platformDefaults: { templateId: 'pos-receipt' } });
  const standard = await renderInvoicePdf({ invoice, client, org, platformDefaults: { templateId: 'corporate-formal' } });

  assert.ok(receipt.length > 0 && standard.length > 0);
  assert.notEqual(receipt.length, standard.length, 'the platform default must change what is rendered');

  // A tenant's own choice still wins over the platform default at render time.
  const tenantChoice = await renderInvoicePdf({
    invoice,
    client,
    org: { ...org, brandingConfig: { invoiceTemplateId: 'corporate-formal' } },
    platformDefaults: { templateId: 'pos-receipt' }
  });
  assert.equal(tenantChoice.length, standard.length, 'the tenant choice should render identically to picking it directly');
});
