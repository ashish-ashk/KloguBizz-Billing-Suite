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

// ── An MFA secret encrypted with a key we no longer have ──

const { verifySecondFactor } = require('../src/controllers/mfaController');
const { resetMfa } = require('../src/seed/reset-mfa');
const totpUtil = require('../src/utils/totp');

test('an unreadable secret says so, instead of throwing a 500', maybeDb(async () => {
  const user = {
    _id: new mongoose.Types.ObjectId(),
    email: 'locked@example.test',
    // Well-formed, and encrypted under a key this process does not have.
    mfa: { enabled: true, secret: 'AAAAAAAAAAAAAAAA:BBBBBBBBBBBBBBBBBBBBBB:CCCCCCCC', backupCodes: [] }
  };

  /**
   * The failure met in production. `decryptSecret` threw straight out of
   * `verifySecondFactor`, so signing in returned a bare 500 — "Something went
   * wrong on our side" — on the one screen the user cannot get past. The most
   * dangerous configuration change in the system announced itself as a generic
   * server error.
   */
  const result = verifySecondFactor(user, '123456');
  assert.equal(result.valid, false);
  assert.equal(result.code, 'MFA_SECRET_UNREADABLE');
  assert.match(result.reason, /recovery code/i, 'and it names the route that still works');
  // Not counted toward the lockout: locking the account over a server-side
  // misconfiguration would take away the recovery route as well.
  assert.equal(result.notCountedAsFailure, true);
}));

test('a recovery code still works when the secret cannot be read', maybeDb(async () => {
  const code = 'ABCD-1234';
  const user = {
    _id: new mongoose.Types.ObjectId(),
    email: 'recovering@example.test',
    mfa: {
      enabled: true,
      secret: 'AAAAAAAAAAAAAAAA:BBBBBBBBBBBBBBBBBBBBBB:CCCCCCCC',
      backupCodes: [totpUtil.hashBackupCode(code)]
    }
  };

  /**
   * Recovery codes are **hashed, not encrypted**, so they are precisely the
   * mechanism that survives a key change — and throwing on decryption made the
   * one path designed for this situation unreachable. This is the difference
   * between "locked out until an operator intervenes" and "recoverable by the
   * person holding their own recovery codes".
   */
  const result = verifySecondFactor(user, code);
  assert.equal(result.valid, true);
  assert.equal(result.method, 'backup-code');
  assert.equal(user.mfa.backupCodes.length, 0, 'and it is consumed');
}));

test('the command-line reset clears the factor and cuts every session', maybeDb(async () => {
  await mongoose.connection.dropDatabase();
  const created = await User.create({
    name: 'Locked Owner',
    email: 'owner@locked.test',
    passwordHash: 'x',
    role: 'superadmin',
    status: 'active',
    sessionVersion: 3,
    mfa: { enabled: true, secret: 'AAAA:BBBB:CCCC', backupCodes: ['deadbeef'] }
  });

  const result = await resetMfa('owner@locked.test', { exit: false });
  assert.equal(result.ok, true);

  const after = await User.findById(created._id).lean();
  assert.equal(after.mfa.enabled, false);
  assert.ok(!after.mfa.secret);
  assert.equal((after.mfa.backupCodes || []).length, 0);
  /**
   * Sessions issued *under* the second factor must not outlive it — and if this
   * is being run over a suspected compromise rather than a lost key, the
   * sessions are the thing that matters most.
   */
  assert.equal(after.sessionVersion, 4);
  assert.equal(after.passwordHash, 'x', 'the password is untouched');
}));

test('resetting MFA leaves a trail', maybeDb(async () => {
  await mongoose.connection.dropDatabase();
  await User.create({
    name: 'Traced', email: 'traced@locked.test', passwordHash: 'x',
    role: 'admin', status: 'active', mfa: { enabled: true, secret: 'A:B:C', backupCodes: [] }
  });
  await resetMfa('traced@locked.test', { exit: false });

  // An operation that quietly weakens an account's authentication and leaves no
  // trace is indistinguishable from an attacker who reached the same shell.
  const { AuditLog } = require('../src/models/Settings');
  const entry = await AuditLog.findOne({ action: 'user.mfa_reset_by_operator' }).lean();
  assert.ok(entry, 'the reset is audited');
  assert.equal(entry.meta.email, 'traced@locked.test');
}));

// ── Item 2: the plans advertise what the product actually does ──

const capabilities = require('../src/services/planCapabilities');
const { PLANS } = require('../src/seed/platformDefaults');

test('no plan advertises a capability the product does not have', maybeDb(async () => {
  /**
   * The failure this whole catalogue exists to prevent.
   *
   * The shipped plans advertised Client Portal, API Access, Dedicated Manager,
   * SLA 99.9%, an on-premise option and 24/7 phone support. None existed. A
   * customer who bought Business for the API had a fair complaint, and no test
   * anywhere would have caught it because the list was free text.
   */
  const banned = [
    /client portal/i, /api access/i, /dedicated manager/i, /\bsla\b/i,
    /on-?premise/i, /24\/7/i, /custom integrations/i, /custom contracts/i
  ];

  for (const plan of PLANS) {
    for (const line of plan.features) {
      for (const pattern of banned) {
        assert.ok(!pattern.test(line), `${plan.code} still advertises "${line}"`);
      }
    }
  }
}));

test('e-invoicing and e-way bills are not advertised while the provider call is a stub', maybeDb(async () => {
  /**
   * Everything around them is real and tested — eligibility, validation, the
   * payload, the validity window — and `callIrp` / `callEwbApi` both throw 501.
   * Nothing can actually be filed, so nothing may be sold on it. They join the
   * list the day the adapter is written, which is the rule this file enforces.
   */
  const advertised = capabilities.CAPABILITIES.map(c => c.label.toLowerCase()).join(' | ');
  assert.ok(!/e-?invoic/.test(advertised), 'e-invoicing must not be advertised yet');
  assert.ok(!/e-?way/.test(advertised), 'e-way bills must not be advertised yet');
}));

test('every capability names where it is enforced', maybeDb(async () => {
  // The same discipline `featureFlagService` uses: a capability an operator
  // believes in but which does nothing is worse than an absent one, because
  // they will promise it to a customer.
  for (const capability of capabilities.CAPABILITIES) {
    assert.ok(capability.key, 'a capability needs a key a gate can read');
    assert.ok(capability.label, `${capability.key} needs a label`);
    assert.ok(capability.enforcedBy, `${capability.key} must say where it is enforced`);
  }
}));

test('the tiers are cumulative, so a more expensive plan never loses something', maybeDb(async () => {
  const starter = capabilities.capabilitiesFor('starter');
  const growth = capabilities.capabilitiesFor('growth');
  const business = capabilities.capabilitiesFor('business');
  const enterprise = capabilities.capabilitiesFor('enterprise');

  /**
   * "Everything in Growth" has to be true, not just printed. A tier that
   * silently dropped a capability the cheaper one had would be the worst kind of
   * pricing bug: the customer paid more and lost a feature.
   */
  starter.forEach(key => assert.ok(growth.includes(key), `growth lost ${key}`));
  growth.forEach(key => assert.ok(business.includes(key), `business lost ${key}`));
  business.forEach(key => assert.ok(enterprise.includes(key), `enterprise lost ${key}`));

  assert.ok(growth.length > starter.length, 'and each tier actually adds something');
  assert.ok(business.length > growth.length);
}));

test('the cheapest plan can still do the things a billing product is for', maybeDb(async () => {
  const starter = capabilities.capabilitiesFor('starter');
  // Core is listed rather than assumed, so the cheapest card says what it *can*
  // do instead of only what it cannot.
  ['invoicing', 'clientsAndItems', 'payments', 'gstReturns', 'reminders'].forEach(key => {
    assert.ok(starter.includes(key), `starter must include ${key}`);
  });
  // And genuinely does not include the paid tiers' work.
  ['warehouses', 'profitLoss', 'gstr2b'].forEach(key => {
    assert.ok(!starter.includes(key), `starter must not include ${key}`);
  });
}));

test('an unknown plan code still gets the core set, so a tenant can keep billing', maybeDb(async () => {
  const orphan = capabilities.capabilitiesFor('a-plan-that-was-deleted');
  /**
   * A tenant whose plan was renamed or removed out from under them must keep
   * being able to invoice. Losing the ability to bill because of a pricing change
   * nobody told them about is far worse than a missing report.
   */
  assert.deepEqual(orphan.sort(), [...capabilities.CORE_KEYS].sort());
  assert.ok(orphan.includes('invoicing'));
}));

test('the card copy is generated from the same list the gate reads', maybeDb(async () => {
  const business = capabilities.capabilitiesFor('business');
  const copy = capabilities.featureCopyFor('business');

  // Every line after the "Everything in Growth" header must correspond to a real
  // capability the plan holds — that is what makes the card unable to lie.
  copy.slice(1).forEach(line => {
    const match = capabilities.CAPABILITIES.find(c => c.label === line);
    assert.ok(match, `"${line}" is not a catalogue label`);
    assert.ok(business.includes(match.key), `business does not actually include ${match.key}`);
  });
}));
