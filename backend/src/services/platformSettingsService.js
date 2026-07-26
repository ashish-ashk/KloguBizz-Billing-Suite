const { GlobalSetting } = require('../models/Settings');

/**
 * Platform-wide defaults set by the super admin.
 *
 * The super-admin "Invoice Templates" page used to write to a separate
 * `InvoiceTemplate` collection (with its own `layout`/`accentColor` fields) that
 * nothing ever read — a completely different system from the 22 real templates
 * tenants actually render. Nothing the platform owner chose there affected a
 * single invoice. This is the setting that genuinely applies, used when a tenant
 * has not picked a template of their own.
 *
 * Cached briefly because it is read on every PDF render but changes rarely.
 */

const CACHE_TTL_MS = 60 * 1000;
let cached = null;
let cachedAt = 0;

const DEFAULTS = {
  // Matches the frontend and Organisation schema fallback, so a fresh install
  // renders the same template everywhere.
  templateId: 'modern-minimal',
  accentColor: '#4f46e5'
};

async function getPlatformDefaults() {
  if (cached && Date.now() - cachedAt < CACHE_TTL_MS) return cached;
  const setting = await GlobalSetting.findOne({ key: 'defaultInvoiceTemplate' }).lean();
  cached = { ...DEFAULTS, ...(setting?.value || {}) };
  cachedAt = Date.now();
  return cached;
}

/** Called when the setting is saved, so the next render sees it immediately. */
function invalidatePlatformDefaults() {
  cached = null;
  cachedAt = 0;
}

module.exports = { getPlatformDefaults, invalidatePlatformDefaults, PLATFORM_TEMPLATE_DEFAULTS: DEFAULTS };
