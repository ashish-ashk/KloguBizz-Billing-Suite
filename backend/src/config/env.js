require('dotenv').config();

// Convenience values committed to the repo so `npm start` works with no setup.
// Every one of them is public knowledge, so if any is still in effect while
// NODE_ENV=production the deployment is trivially compromisable — a known
// JWT_SECRET lets anyone forge a superadmin token. assertSecureConfig() below
// refuses to boot in that case rather than quietly serving traffic.
const DEV_DEFAULTS = {
  JWT_SECRET: 'local_dev_access_secret_change_me_now',
  JWT_REFRESH_SECRET: 'local_dev_refresh_secret_change_me_now',
  RAZORPAY_WEBHOOK_SECRET: 'local_webhook_secret',
  SUPER_ADMIN_PASSWORD: 'SuperAdmin@123'
};

// FRONTEND_URL accepts a comma-separated list so the app can be reached from
// more than one origin (apex + www, a custom domain, a preview deployment)
// without the CORS layer rejecting all but the first.
const frontendUrls = String(process.env.FRONTEND_URL || 'http://localhost:4200')
  .split(',')
  .map(url => url.trim().replace(/\/$/, ''))
  .filter(Boolean);

const env = {
  PORT: Number(process.env.PORT || 5000),
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/klogubizz',
  JWT_SECRET: process.env.JWT_SECRET || DEV_DEFAULTS.JWT_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || DEV_DEFAULTS.JWT_REFRESH_SECRET,
  FRONTEND_URL: frontendUrls[0],
  FRONTEND_URLS: frontendUrls,
  SUPER_ADMIN_EMAIL: process.env.SUPER_ADMIN_EMAIL || 'superadmin@klogubizz.local',
  SUPER_ADMIN_PASSWORD: process.env.SUPER_ADMIN_PASSWORD || DEV_DEFAULTS.SUPER_ADMIN_PASSWORD,
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY || '',
  FROM_EMAIL: process.env.FROM_EMAIL || 'invoices@klogubizz.local',
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || '',
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || '',
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET || DEV_DEFAULTS.RAZORPAY_WEBHOOK_SECRET
};

env.isProduction = env.NODE_ENV === 'production';
// True only when Razorpay credentials are present. Billing flows check this
// and fail closed in production instead of activating a plan for free.
env.billingConfigured = Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);

/**
 * Fails the boot when a production deployment is running on a dev default.
 * Errors (refuse to start) are reserved for misconfiguration that lets an
 * attacker in; warnings cover configuration that merely degrades a feature.
 */
function assertSecureConfig({ exitOnError = true } = {}) {
  const errors = [];
  const warnings = [];

  if (env.isProduction) {
    if (env.JWT_SECRET === DEV_DEFAULTS.JWT_SECRET) {
      errors.push('JWT_SECRET is still the public dev default — anyone could forge a superadmin token. Set a unique random value.');
    } else if (env.JWT_SECRET.length < 32) {
      errors.push('JWT_SECRET is shorter than 32 characters. Use at least 32 random characters.');
    }
    if (env.JWT_REFRESH_SECRET === DEV_DEFAULTS.JWT_REFRESH_SECRET) {
      warnings.push('JWT_REFRESH_SECRET is the dev default. Set it before enabling refresh tokens.');
    }
    // A warning, not an error: the running server never reads this value.
    // It is used solely by the seed script when it creates the superadmin
    // account, after which the real credential is the bcrypt hash in Mongo and
    // can be rotated in-app. Failing the boot on it therefore blocks deploys it
    // cannot protect — including a deployment whose superadmin password was
    // changed long ago. assertSeedConfig() below is where it does hard-fail,
    // because that is the only place the value is actually used.
    if (env.SUPER_ADMIN_PASSWORD === DEV_DEFAULTS.SUPER_ADMIN_PASSWORD) {
      warnings.push('SUPER_ADMIN_PASSWORD is the documented default. It is only used by `npm run seed`, which will refuse to run with it — but set it before seeding.');
    }
    if (!process.env.MONGO_URI) {
      errors.push('MONGO_URI is not set — the server would try a local database that does not exist in production.');
    }
    if (!process.env.FRONTEND_URL) {
      warnings.push('FRONTEND_URL is not set, so CORS only allows http://localhost:4200.');
    }
    // The webhook secret only matters once Razorpay is wired up, but when it
    // is, a default secret means anyone can forge a paid-subscription event
    // and upgrade themselves for free.
    if (env.billingConfigured && env.RAZORPAY_WEBHOOK_SECRET === DEV_DEFAULTS.RAZORPAY_WEBHOOK_SECRET) {
      errors.push('RAZORPAY_WEBHOOK_SECRET is the dev default while Razorpay keys are configured — webhook events could be forged.');
    }
    if (!env.billingConfigured) {
      warnings.push('Razorpay keys are not set. Paid plan changes will be rejected instead of activated.');
    }
    if (!env.SENDGRID_API_KEY) {
      warnings.push('SENDGRID_API_KEY is not set. Invites and reminders will be skipped, not delivered.');
    }
  }

  warnings.forEach(message => console.warn(`[config] WARNING: ${message}`));

  if (errors.length) {
    console.error('\n[config] Refusing to start — insecure production configuration:');
    errors.forEach(message => console.error(`  - ${message}`));
    console.error('');
    if (exitOnError) process.exit(1);
  }
  return { errors, warnings };
}

/**
 * Guards the seed script, which is the only thing that reads
 * SUPER_ADMIN_PASSWORD — and which is destructive.
 *
 * Two separate risks, both fatal:
 *
 *  1. Seeding with the documented default password creates a platform-owner
 *     account whose credentials are published in this repository. Unlike the
 *     boot-time checks this is worth refusing outright, because this is the
 *     moment the weak credential is actually written.
 *
 *  2. The seed wipes every collection before inserting sample data. Run against
 *     a production database it destroys every tenant's invoices, payments and
 *     clients, irreversibly. Requiring an explicit opt-in means that cannot
 *     happen by reflex, a mistyped command, or a stray deploy hook.
 */
function assertSeedConfig({ exitOnError = true } = {}) {
  const errors = [];

  if (env.SUPER_ADMIN_PASSWORD === DEV_DEFAULTS.SUPER_ADMIN_PASSWORD && env.isProduction) {
    errors.push('SUPER_ADMIN_PASSWORD is still the documented default. Set a unique value before seeding, or the platform owner account ships with a publicly known password.');
  }
  if (env.isProduction && process.env.ALLOW_DESTRUCTIVE_SEED !== 'true') {
    errors.push('Seeding deletes every organisation, invoice, payment and client in the database. Refusing to run against a production database. Set ALLOW_DESTRUCTIVE_SEED=true only if you genuinely intend to erase it.');
  }

  if (errors.length) {
    console.error('\n[seed] Refusing to seed:');
    errors.forEach(message => console.error(`  - ${message}`));
    console.error('');
    if (exitOnError) process.exit(1);
  }
  return { errors };
}

module.exports = { env, assertSecureConfig, assertSeedConfig, DEV_DEFAULTS };
