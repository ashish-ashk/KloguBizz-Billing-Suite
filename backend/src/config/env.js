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
  SUPER_ADMIN_PASSWORD: 'SuperAdmin@1234'
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
    if (env.SUPER_ADMIN_PASSWORD === DEV_DEFAULTS.SUPER_ADMIN_PASSWORD) {
      errors.push('SUPER_ADMIN_PASSWORD is still the documented default. Change it before deploying.');
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

module.exports = { env, assertSecureConfig, DEV_DEFAULTS };
