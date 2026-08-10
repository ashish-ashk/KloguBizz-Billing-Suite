const bcrypt = require('bcryptjs');
const { connectDatabase } = require('../config/database');
const { env } = require('../config/env');
const { User } = require('../models/User');
const { Plan } = require('../models/Plan');
const { Reminder, Master, GlobalSetting } = require('../models/Settings');
const { PLANS, MASTERS, SETTINGS, REMINDERS } = require('./platformDefaults');

/**
 * Prepares an empty database for real customers.
 *
 * ── Why this exists separately from `seed.js` ─────────────────────────
 *
 * `npm run seed` was the only way to get plans, masters, reminders and a
 * platform owner into a database — and it also **deletes every collection** and
 * inserts a demo tenant whose four users share the password `Admin@123`, which
 * is published in this repository. So preparing a production database meant
 * choosing between putting demo accounts with known credentials into it, or
 * hand-inserting the plan documents and hoping the shape was right.
 *
 * Neither is acceptable at the point where real money starts moving, and the gap
 * was invisible: a fresh database *looks* fine until somebody opens the
 * subscription page and finds no plans on it.
 *
 * ── The two rules this file lives by ──────────────────────────────────
 *
 * **It never deletes anything.** Everything is an upsert keyed on the natural
 * identifier, so running it against a live database with paying customers is
 * safe — which matters, because it is the thing somebody will run when a plan
 * needs adding a year from now.
 *
 * **It never invents a tenant.** No demo organisation, no sample invoices, no
 * accounts with a password anyone can look up. The only account it creates is
 * the platform owner, from `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD`, and
 * only when one does not already exist.
 */

/**
 * Refuses to create a platform owner whose password is publicly known.
 *
 * `seed.js` has the same check, and it is repeated rather than shared because
 * the other half of its guard — the destructive-seed opt-in — must *not* apply
 * here. Requiring `ALLOW_DESTRUCTIVE_SEED` for a script that deletes nothing
 * would teach whoever runs it to set that variable, and it would still be set
 * the day somebody reaches for `npm run seed` by mistake.
 */
function assertOwnerPassword(password) {
  if (password !== 'SuperAdmin@123') return;
  console.error('\n[bootstrap] Refusing to create the platform owner:');
  console.error('  - SUPER_ADMIN_PASSWORD is still the documented default, which is published in this');
  console.error('    repository. Set a real one before creating the account that can reach every tenant.\n');
  process.exit(1);
}

/**
 * `email` and `password` are parameters rather than reads of `env`.
 *
 * `config/env.js` resolves the environment once at module load, so a caller that
 * sets `process.env.SUPER_ADMIN_PASSWORD` afterwards changes nothing — which
 * made the refusal path untestable, and meant every test run inherited whatever
 * happened to be in the developer's own `.env`. Defaulting to the resolved value
 * keeps the command-line behaviour identical.
 */
async function bootstrap({
  exit = true,
  email = env.SUPER_ADMIN_EMAIL,
  password = env.SUPER_ADMIN_PASSWORD
} = {}) {
  await connectDatabase();
  const report = { plans: 0, masters: 0, settings: 0, reminders: 0, ownerCreated: false };

  /**
   * The password is checked **before** anything is written.
   *
   * It ran after the reference data at first, which meant a run that printed
   * "Refusing to create the platform owner" had already inserted four plans and
   * twenty-four masters — a refusal that left the database changed, which is not
   * what the word means. Only relevant when there is no owner yet: an existing
   * platform never needs the variable at all.
   */
  const existingOwner = await User.findOne({ role: 'superadmin' }).select('_id email').lean();
  if (!existingOwner) assertOwnerPassword(password);

  /**
   * Plans are upserted by code, and `$setOnInsert` guards the price.
   *
   * An existing plan's price is **not** overwritten: somebody may have changed
   * it deliberately in the console, and a re-run silently resetting it to the
   * shipped default would reprice a live product. New plans get the defaults;
   * existing ones keep whatever they say now.
   */
  for (const plan of PLANS) {
    const result = await Plan.updateOne(
      { code: plan.code },
      { $setOnInsert: plan },
      { upsert: true }
    );
    if (result.upsertedCount) report.plans += 1;
  }

  // Masters are reference data the dropdowns read. Keyed on the fields that
  // identify one — a GST rate by its rate, an HSN by its code, the rest by label.
  for (const master of MASTERS) {
    const key = { type: master.type };
    if (master.rate !== undefined && master.type === 'gstRate') key.rate = master.rate;
    else if (master.code) key.code = master.code;
    else key.label = master.label;

    const result = await Master.updateOne(key, { $setOnInsert: master }, { upsert: true });
    if (result.upsertedCount) report.masters += 1;
  }

  for (const setting of SETTINGS) {
    const result = await GlobalSetting.updateOne(
      { key: setting.key },
      { $setOnInsert: setting },
      { upsert: true }
    );
    if (result.upsertedCount) report.settings += 1;
  }

  for (const reminder of REMINDERS) {
    const result = await Reminder.updateOne(
      { name: reminder.name },
      { $setOnInsert: reminder },
      { upsert: true }
    );
    if (result.upsertedCount) report.reminders += 1;
  }

  /**
   * The platform owner, only if there is not one already.
   *
   * Deliberately not an upsert on the password: re-running this must never
   * reset the credential of an account that has been in use, and the real
   * credential after the first run is the hash in the database, rotated in-app.
   */
  if (!existingOwner) {
    await User.create({
      name: 'Platform Owner',
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role: 'superadmin',
      platformRole: 'owner',
      status: 'active'
    });
    report.ownerCreated = true;
  }

  console.log('\n[bootstrap] ready for customers:');
  console.log(`  plans added:     ${report.plans}${report.plans ? '' : '  (already present)'}`);
  console.log(`  masters added:   ${report.masters}${report.masters ? '' : '  (already present)'}`);
  console.log(`  settings added:  ${report.settings}${report.settings ? '' : '  (already present)'}`);
  console.log(`  reminders added: ${report.reminders}${report.reminders ? '' : '  (already present)'}`);
  console.log(report.ownerCreated
    ? `  platform owner:  created as ${email}`
    : `  platform owner:  already exists (${existingOwner?.email}) — left alone`);

  if (report.ownerCreated) {
    console.log('\n  Next: sign in and enrol MFA immediately. It is mandatory on platform');
    console.log('  accounts in production and the console is blocked until it is done.');
  }
  console.log('\n  Nothing was deleted. This is safe to re-run.\n');

  if (exit) process.exit(0);
  return report;
}

module.exports = { bootstrap };

if (require.main === module) {
  bootstrap().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
