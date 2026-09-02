const secretBox = require('../utils/secretBox');
const { env } = require('../config/env');
const { httpError } = require('../utils/httpError');
const { logger } = require('../utils/logger');
const { isValidGstin } = require('../validators/common');

/**
 * E-invoice credentials, split the way the IRP actually splits them.
 *
 * The whole reason e-invoicing could not "work for all tenants" before is that
 * the credentials lived in five environment variables, which is one set for the
 * entire platform. Reporting is per-taxpayer: an invoice sent under the wrong
 * username lands in the wrong business's GSTR-1.
 *
 * So there are two halves, and they belong to different parties:
 *
 *   **Platform** — `IRP_BASE_URL`, `IRP_CLIENT_ID`, `IRP_CLIENT_SECRET`,
 *   `IRP_PUBLIC_KEY`. These identify *this software* to the portal and are the
 *   same for everyone. They stay in the environment.
 *
 *   **Tenant** — GSTIN, API username, API password. Created by the business
 *   itself on the e-invoice portal, under its own registration. Stored per
 *   organisation, and the password encrypted at rest under its own namespace,
 *   for the same reason a payment key secret is: a readable one in a backup is
 *   the ability to file returns as that business.
 *
 * A tenant enrolled as a direct API user may hold their own client pair; when
 * they supply one it wins over the platform's, which is the only case where the
 * two halves overlap.
 */

const NAMESPACE = 'einvoice';

/**
 * The IRP's public key, as configured.
 *
 * Accepted in three forms because an RSA public key is multi-line and
 * environment variables are not: a real PEM, a PEM with the newlines escaped as
 * `\n` (what most dashboards produce when you paste one in), or base64 of the
 * whole PEM. Normalising here means a deployment cannot half-work because of
 * how the value survived a copy and paste.
 */
function publicKeyPem() {
  const raw = (env.IRP_PUBLIC_KEY || '').trim();
  if (!raw) return '';
  if (raw.includes('-----BEGIN')) return raw.replace(/\\n/g, '\n');
  try {
    const decoded = Buffer.from(raw, 'base64').toString('utf8');
    if (decoded.includes('-----BEGIN')) return decoded;
  } catch {
    // Falls through to the refusal below.
  }
  logger.warn('IRP_PUBLIC_KEY is set but is not a PEM public key');
  return '';
}

/** Whether the *platform* half is present. Says nothing about any tenant. */
function isPlatformConfigured() {
  return Boolean(env.IRP_BASE_URL && env.IRP_CLIENT_ID && env.IRP_CLIENT_SECRET && publicKeyPem());
}

/** Which platform pieces are missing, for an operator-facing message. */
function missingPlatformSettings() {
  const missing = [];
  if (!env.IRP_BASE_URL) missing.push('IRP_BASE_URL');
  if (!env.IRP_CLIENT_ID) missing.push('IRP_CLIENT_ID');
  if (!env.IRP_CLIENT_SECRET) missing.push('IRP_CLIENT_SECRET');
  if (!publicKeyPem()) missing.push('IRP_PUBLIC_KEY');
  return missing;
}

/** Whether *this tenant* has entered their own portal credentials. */
function isTenantConfigured(org) {
  const creds = org?.eInvoicing?.credentials;
  return Boolean(creds?.gstin && creds.username && creds.password);
}

/** Whether an invoice for this tenant could actually be reported right now. */
function isReady(org) {
  return Boolean(org?.eInvoicing?.enabled) && isPlatformConfigured() && isTenantConfigured(org);
}

/**
 * Everything one call to the IRP needs, assembled and decrypted.
 *
 * Throws rather than returning partials: every caller needs all of it, and a
 * missing piece surfaces as an opaque portal rejection instead of a
 * configuration message anybody can act on.
 */
function resolveConfig(org) {
  if (!isPlatformConfigured()) {
    throw httpError(
      501,
      `E-invoicing is not set up on this server yet. Missing: ${missingPlatformSettings().join(', ')}.`,
      'IRP_NOT_CONFIGURED'
    );
  }
  if (!isTenantConfigured(org)) {
    throw httpError(
      501,
      'Your e-invoice portal credentials are not set. Add your GSTIN, API username and password '
      + 'under Business Profile → E-Invoicing.',
      'EINVOICE_CREDENTIALS_MISSING'
    );
  }

  const creds = org.eInvoicing.credentials;
  let password;
  let tenantClientSecret = '';
  try {
    password = secretBox.decrypt(creds.password, NAMESPACE);
    if (creds.clientSecret) tenantClientSecret = secretBox.decrypt(creds.clientSecret, NAMESPACE);
  } catch (error) {
    // Almost always a rotated JWT_SECRET with no MFA_ENCRYPTION_KEY set — the
    // documented consequence of secretBox's fallback key. Say which, because
    // "decryption failed" is not actionable and re-entering the password is.
    logger.error('e-invoice credentials could not be decrypted', { orgId: String(org?._id), err: error });
    throw httpError(
      500,
      'Your stored e-invoice password could not be read. Re-enter it under Business Profile → E-Invoicing. '
      + '(This happens if the server encryption key was changed.)',
      'EINVOICE_CREDENTIALS_UNREADABLE'
    );
  }

  return {
    baseUrl: env.IRP_BASE_URL,
    // A direct API user's own pair wins; otherwise the platform reports on their
    // behalf. Both halves of the pair come from the same place — mixing a
    // tenant id with the platform secret would fail as an unmatched pair.
    clientId: creds.clientId || env.IRP_CLIENT_ID,
    clientSecret: creds.clientId ? tenantClientSecret : env.IRP_CLIENT_SECRET,
    gstin: creds.gstin,
    username: creds.username,
    password,
    publicKeyPem: publicKeyPem(),
    environment: creds.environment || 'sandbox'
  };
}

/** Encrypts a secret for storage. Idempotent, so a re-save cannot double-encrypt. */
function protectSecret(value) {
  if (!value) return '';
  return secretBox.looksEncrypted(value) ? value : secretBox.encrypt(value, NAMESPACE);
}

/**
 * Validates and normalises what a tenant typed, returning the patch to store.
 *
 * The GSTIN is checked here rather than left to the portal: it is the field that
 * decides *whose* return the invoice lands in, and the portal's rejection for a
 * mismatched GSTIN is a code, not a sentence.
 */
function buildCredentialPatch(existing, input) {
  const patch = { ...(existing || {}) };

  if (input.gstin !== undefined) {
    const gstin = String(input.gstin || '').trim().toUpperCase();
    if (gstin && !isValidGstin(gstin)) {
      throw httpError(400, `"${gstin}" is not a valid GSTIN — check the last character and the length (15).`, 'BAD_GSTIN');
    }
    patch.gstin = gstin;
  }

  if (input.username !== undefined) patch.username = String(input.username || '').trim();

  // An empty password means "leave the stored one alone", not "clear it" — the
  // form never receives the current password back, so an untouched field arrives
  // empty on every save.
  if (input.password) patch.password = protectSecret(String(input.password));

  if (input.clientId !== undefined) patch.clientId = String(input.clientId || '').trim();
  if (input.clientSecret) patch.clientSecret = protectSecret(String(input.clientSecret));

  if (input.environment !== undefined) {
    const environment = String(input.environment || 'sandbox');
    if (!['sandbox', 'production'].includes(environment)) {
      throw httpError(400, 'The e-invoice environment must be "sandbox" or "production".', 'BAD_ENVIRONMENT');
    }
    patch.environment = environment;
  }

  if (patch.clientId && !patch.clientSecret) {
    throw httpError(
      400,
      'A client ID needs its client secret. Enter both, or leave both blank to report through this platform.',
      'INCOMPLETE_CLIENT_PAIR'
    );
  }

  return patch;
}

/**
 * What the tenant's own settings screen may see.
 *
 * Never the password, and never the client secret — only whether one is stored.
 * The GSTIN and username are shown because they are what the tenant needs to
 * confirm they entered the right account.
 */
function describe(org) {
  const eInvoicing = org?.eInvoicing || {};
  const creds = eInvoicing.credentials || {};
  return {
    enabled: Boolean(eInvoicing.enabled),
    turnoverDeclared: eInvoicing.turnoverDeclared ?? null,
    lutNumber: eInvoicing.lutNumber || '',
    platformConfigured: isPlatformConfigured(),
    missingPlatformSettings: missingPlatformSettings(),
    credentials: {
      gstin: creds.gstin || '',
      username: creds.username || '',
      hasPassword: Boolean(creds.password),
      clientId: creds.clientId || '',
      hasClientSecret: Boolean(creds.clientSecret),
      environment: creds.environment || 'sandbox',
      verifiedAt: creds.verifiedAt || null,
      lastError: creds.lastError || ''
    },
    ready: isReady(org)
  };
}

module.exports = {
  NAMESPACE,
  publicKeyPem,
  isPlatformConfigured,
  missingPlatformSettings,
  isTenantConfigured,
  isReady,
  resolveConfig,
  protectSecret,
  buildCredentialPatch,
  describe
};
