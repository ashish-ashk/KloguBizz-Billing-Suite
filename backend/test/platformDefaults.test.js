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

// ── Preparing a production database (`npm run bootstrap`) ──

const { bootstrap } = require('../src/seed/bootstrap');
const { Plan } = require('../src/models/Plan');
const { Master, Reminder } = require('../src/models/Settings');
const { User } = require('../src/models/User');
const { Organisation } = require('../src/models/Organisation');
const { Invoice } = require('../src/models/Invoice');

/** Passed explicitly, because `config/env.js` resolves the environment once at
 *  module load and would otherwise hand these tests the developer's own `.env`. */
const OWNER = { email: 'owner@bootstrap.test', password: 'Bootstrap#Pass#1' };

const maybeDb = fn => async t => {
  if (!dbAvailable) return t.skip('MongoDB not available');
  return fn(t);
};

test('bootstrap fills an empty database with what a platform needs to sell', maybeDb(async () => {
  await mongoose.connection.dropDatabase();
  const report = await bootstrap({ exit: false, ...OWNER });

  /**
   * The gap this closes. `npm run seed` was the only way to get plans into a
   * database, and it also wipes every collection and inserts a demo tenant whose
   * users share a password published in this repository. A fresh production
   * database therefore *looked* fine until somebody opened the subscription page
   * and found no plans on it.
   */
  assert.ok(report.plans > 0);
  assert.equal(await Plan.countDocuments(), 4);
  assert.ok(await Master.countDocuments({ type: 'gstRate' }) > 0, 'the tax-rate dropdown has options');
  assert.ok(await Master.countDocuments({ type: 'paymentMethod' }) > 0);
  assert.equal(await Reminder.countDocuments(), 4);
  assert.equal(report.ownerCreated, true);
}));

test('bootstrap invents no tenant, unlike seed', maybeDb(async () => {
  await mongoose.connection.dropDatabase();
  await bootstrap({ exit: false, ...OWNER });

  /**
   * The whole point of it being a separate script. A production platform must
   * not ship with a demo organisation whose four accounts all use `Admin@123`.
   */
  assert.equal(await Organisation.countDocuments(), 0);
  assert.equal(await Invoice.countDocuments(), 0);
  assert.equal(await User.countDocuments(), 1, 'the platform owner, and nobody else');

  const owner = await User.findOne().lean();
  assert.equal(owner.role, 'superadmin');
  assert.equal(owner.platformRole, 'owner');
}));

test('bootstrap is safe to re-run against a live platform', maybeDb(async () => {
  await mongoose.connection.dropDatabase();
  await bootstrap({ exit: false, ...OWNER });

  // Somebody repriced a plan in the console, and a tenant exists.
  await Plan.updateOne({ code: 'growth' }, { $set: { monthlyPrice: 4999 } });
  const org = await Organisation.create({ name: 'Real Customer', adminEmail: 'real@customer.test', stateCode: '27' });

  const second = await bootstrap({ exit: false, ...OWNER });

  /**
   * This is the script somebody reaches for a year later to add a plan, so it
   * has to be harmless on a database with paying customers in it. `$setOnInsert`
   * is what stops a re-run resetting a price that was changed deliberately.
   */
  assert.equal(second.plans, 0);
  assert.equal(second.ownerCreated, false);
  assert.equal((await Plan.findOne({ code: 'growth' }).lean()).monthlyPrice, 4999, 'the console price survives');
  assert.equal(await Organisation.countDocuments({ _id: org._id }), 1, 'and so does the customer');
  assert.equal(await User.countDocuments({ role: 'superadmin' }), 1, 'no second owner');
}));

test('bootstrap will not create an owner with the published default password', maybeDb(async () => {
  await mongoose.connection.dropDatabase();

  /**
   * `process.exit` is intercepted rather than letting the guard end the test
   * run. What is being asserted is that it refuses **before writing anything** —
   * it originally refused after inserting the plans and masters, which is a
   * refusal that leaves the database changed, and that is not what the word
   * means.
   */
  const realExit = process.exit;
  let exitCode = null;
  process.exit = code => { exitCode = code; throw new Error('exited'); };
  try {
    await bootstrap({ exit: false, email: 'owner@bootstrap.test', password: 'SuperAdmin@123' });
  } catch (error) {
    assert.equal(error.message, 'exited');
  } finally {
    process.exit = realExit;
  }

  assert.equal(exitCode, 1);
  assert.equal(await Plan.countDocuments(), 0, 'a refusal leaves the database untouched');
  assert.equal(await Master.countDocuments(), 0);
  assert.equal(await User.countDocuments(), 0);
}));

test('requiring the seed script does not wipe a database', maybeDb(async () => {
  await mongoose.connection.dropDatabase();
  await Organisation.create({ name: 'Still Here', adminEmail: 'still@here.test', stateCode: '27' });

  /**
   * `seed.js` deletes thirteen collections as its first act, and used to run on
   * import. Importing it — from a test, a script, or a one-liner checking the
   * file still parses after a refactor — wiped whatever database `MONGO_URI`
   * pointed at, with no confirmation. That is exactly how it went wrong once.
   */
  const seedModule = require('../src/seed/seed');
  assert.equal(typeof seedModule.seed, 'function', 'it still exports the function');
  assert.equal(await Organisation.countDocuments(), 1, 'and importing it destroyed nothing');
}));
