const { GlobalSetting } = require('../models/Settings');
const { logger } = require('../utils/logger');

/**
 * Per-organisation feature flags, resolved over platform defaults.
 *
 * Before this, everything optional in the product was gated on `plan` — which
 * meant that letting one tenant trial a capability required moving them to a
 * different tier, and that turning something off for a single misbehaving tenant
 * was impossible. A flag decouples "what can this tenant do" from "what are they
 * paying for", which is what makes a beta, a pilot and a kill-switch possible at
 * all.
 *
 * Resolution order, most specific first:
 *
 *   1. the organisation's own `featureFlags[key]`, if it is a boolean
 *   2. the platform default from the `featureFlags` global setting
 *   3. the flag's built-in default below
 *
 * Only step 1 is per-tenant, and it is stored as an explicit boolean rather than
 * "present means on" — otherwise there is no way to express "off for this tenant,
 * even though the platform default is on".
 */

/**
 * The flag catalogue.
 *
 * `enforcedBy` says where turning the flag off actually changes behaviour, and it
 * is a required field on purpose. The super-admin console already had one page of
 * switches that were wired to nothing (#18, the invoice-template gallery), and a
 * toggle an operator believes in but which does nothing is worse than an absent
 * feature: they will use it to promise a customer something.
 *
 * `available: false` marks a flag that is reserved for a capability the product
 * does not have yet. The console renders it as such rather than as a switch,
 * because the honest answer to "can I turn e-invoicing on for this tenant" today is
 * "there is nothing to turn on".
 */
const FLAGS = [
  {
    key: 'bulkUpload',
    label: 'Bulk item upload',
    description: 'Spreadsheet import and the template download on the Inventory page.',
    default: true,
    available: true,
    enforcedBy: 'itemController.bulkUploadItems / downloadItemTemplate'
  },
  {
    key: 'creditNotes',
    label: 'Credit notes',
    description: 'Issuing GST credit notes against an invoice.',
    default: true,
    available: true,
    enforcedBy: 'creditNoteController.createCreditNote'
  },
  {
    key: 'darkMode',
    label: 'Dark mode',
    description: 'Personal light/dark preference for this tenant’s users, independent of their plan.',
    default: true,
    available: true,
    enforcedBy: 'frontend ThemeService.canToggleDarkMode'
  },
  {
    key: 'einvoicing',
    label: 'E-invoicing (IRN + QR)',
    description: 'IRP integration for invoices above the turnover threshold. Not built yet — Phase 5.',
    default: false,
    available: false,
    enforcedBy: null
  },
  {
    key: 'apiAccess',
    label: 'API access',
    description: 'Per-tenant API keys and a public REST surface. Not built yet.',
    default: false,
    available: false,
    enforcedBy: null
  }
];

const FLAG_KEYS = FLAGS.map(flag => flag.key);
const BUILT_IN_DEFAULTS = Object.fromEntries(FLAGS.map(flag => [flag.key, flag.default]));

// The platform defaults are read on every resolve, which happens on every
// `/auth/me`. One document, cached for a minute — the same pattern and the same
// reasoning as masterService.
const CACHE_TTL_MS = 60 * 1000;
let cache = { value: null, at: 0 };

async function platformDefaults() {
  if (cache.value && Date.now() - cache.at < CACHE_TTL_MS) return cache.value;
  let stored = {};
  try {
    const setting = await GlobalSetting.findOne({ key: 'featureFlags' }).lean();
    if (setting?.value && typeof setting.value === 'object') stored = setting.value;
  } catch (error) {
    // A missing or unreadable settings document must not break login. Falling
    // back to the built-in defaults is the safe direction: it can only ever
    // produce the behaviour the product shipped with.
    logger.warn('feature flag defaults unreadable', { err: error });
  }
  const resolved = { ...BUILT_IN_DEFAULTS };
  for (const key of FLAG_KEYS) {
    if (typeof stored[key] === 'boolean') resolved[key] = stored[key];
  }
  cache = { value: resolved, at: Date.now() };
  return resolved;
}

function invalidateFeatureFlagCache() {
  cache = { value: null, at: 0 };
}

/**
 * The effective flags for one organisation.
 *
 * Returns every known flag, always — a caller checking `flags.apiAccess` must not
 * have to distinguish `false` from "this deployment forgot to configure it".
 */
async function resolveFlags(org) {
  const defaults = await platformDefaults();
  const overrides = (org && org.featureFlags) || {};
  const resolved = { ...defaults };
  for (const key of FLAG_KEYS) {
    if (typeof overrides[key] === 'boolean') resolved[key] = overrides[key];
  }
  return resolved;
}

/**
 * Keeps only recognised keys, and only booleans.
 *
 * An unrecognised key is dropped rather than rejected: a flag removed from the
 * product should not make an old console request fail, and a typo'd key that
 * silently does nothing is better than one that persists forever as dead state.
 */
function sanitiseFlagOverrides(input) {
  const clean = {};
  if (!input || typeof input !== 'object') return clean;
  for (const key of FLAG_KEYS) {
    if (typeof input[key] === 'boolean') clean[key] = input[key];
  }
  return clean;
}

/**
 * Route guard for a flag.
 *
 * Reads the organisation itself rather than trusting anything on the request: the
 * flags returned to the client are for rendering, and a client that hides a button
 * is not a control.
 */
function requireFlag(key) {
  const { Organisation } = require('../models/Organisation');
  const { httpError } = require('../utils/httpError');
  const definition = FLAGS.find(flag => flag.key === key);

  return async function guard(req, res, next) {
    try {
      const org = req.orgId ? await Organisation.findById(req.orgId).select('featureFlags').lean() : null;
      const flags = await resolveFlags(org);
      if (!flags[key]) {
        return next(httpError(
          403,
          `${definition?.label || key} is not enabled for this organisation. Contact support if you need it.`,
          'FEATURE_DISABLED'
        ));
      }
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = {
  FLAGS,
  FLAG_KEYS,
  requireFlag,
  BUILT_IN_DEFAULTS,
  platformDefaults,
  resolveFlags,
  sanitiseFlagOverrides,
  invalidateFeatureFlagCache
};
