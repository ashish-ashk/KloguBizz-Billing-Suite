const { Organisation } = require('../models/Organisation');
const { asyncHandler } = require('../utils/asyncHandler');
const { httpError } = require('../utils/httpError');
const { logAudit } = require('../services/auditService');
const credentials = require('../services/eInvoiceCredentialService');
const eInvoice = require('../services/eInvoiceService');
const nicIrp = require('../services/irp/nicIrpProvider');

/**
 * A tenant's own e-invoicing settings.
 *
 * The screen that makes e-invoicing work for more than one business. Everything
 * here is the taxpayer half of the credentials — the platform half is
 * environment configuration and is only ever *reported* by this controller,
 * never set by it.
 *
 * Admin only, on the route. These credentials can file returns in the business's
 * name, and the turnover declaration is a compliance statement about the
 * business as a whole; neither is an accountant's to change.
 */

const getSettings = asyncHandler(async (req, res) => {
  const org = await Organisation.findById(req.orgId).lean();
  if (!org) throw httpError(404, 'Organisation not found');
  res.json(credentials.describe(org));
});

/**
 * Saves the credentials.
 *
 * Every change clears `verifiedAt`. A credential set that was verified last
 * week and edited today is not verified, and leaving the tick in place would
 * mean the screen asserting something it no longer knows.
 */
const updateSettings = asyncHandler(async (req, res) => {
  const org = await Organisation.findById(req.orgId);
  if (!org) throw httpError(404, 'Organisation not found');

  const before = org.eInvoicing?.credentials || {};
  const patch = credentials.buildCredentialPatch(before, req.body?.credentials || {});

  const changed = ['gstin', 'username', 'clientId', 'environment']
    .filter(key => (patch[key] || '') !== (before[key] || ''));
  const secretsChanged = Boolean(req.body?.credentials?.password || req.body?.credentials?.clientSecret);

  org.eInvoicing = {
    ...(org.eInvoicing?.toObject ? org.eInvoicing.toObject() : org.eInvoicing),
    credentials: {
      ...patch,
      verifiedAt: changed.length || secretsChanged ? null : before.verifiedAt,
      lastError: changed.length || secretsChanged ? '' : before.lastError
    }
  };

  if (req.body?.enabled !== undefined) {
    const enabled = Boolean(req.body.enabled);
    /**
     * Turning it on with nothing to turn on would leave every invoice reporting
     * "eligible" and then failing at the portal. Refused with the reason rather
     * than accepted and left to fail one invoice at a time.
     */
    if (enabled && !credentials.isTenantConfigured({ eInvoicing: org.eInvoicing })) {
      throw httpError(
        400,
        'Add your GSTIN, API username and password before switching e-invoicing on.',
        'EINVOICE_CREDENTIALS_MISSING'
      );
    }
    if (enabled && !org.eInvoicing.enabled) org.eInvoicing.enabledAt = new Date();
    org.eInvoicing.enabled = enabled;
  }

  if (req.body?.turnoverDeclared !== undefined) {
    const turnover = req.body.turnoverDeclared === null ? null : Number(req.body.turnoverDeclared);
    if (turnover !== null && (!Number.isFinite(turnover) || turnover < 0)) {
      throw httpError(400, 'The declared turnover must be a number of 0 or more.', 'BAD_TURNOVER');
    }
    org.eInvoicing.turnoverDeclared = turnover;
  }

  if (req.body?.lutNumber !== undefined) {
    org.eInvoicing.lutNumber = String(req.body.lutNumber || '').trim().slice(0, 40);
  }

  await org.save();

  /**
   * The secrets are never in the audit trail, and neither is the password's
   * length or a hint of it. What is recorded is which *fields* moved — enough
   * to answer "who changed the portal account and when", which is the question
   * an audit of a mis-filed return actually asks.
   */
  nicIrp.clearSessions();
  logAudit({
    req,
    action: 'org.einvoice_settings_updated',
    entity: 'organisation',
    entityId: org._id,
    meta: { fields: changed, secretsChanged, enabled: org.eInvoicing.enabled }
  });

  res.json(credentials.describe(org.toObject()));
});

/**
 * Authenticates against the portal without reporting anything.
 *
 * Deliberately not "generate a test invoice": an IRN cannot be un-generated
 * after twenty-four hours, so a test that filed one would leave a real document
 * registered against the business every time somebody pressed the button.
 * Authentication alone proves the client pair, the username, the password, the
 * GSTIN and the public key are all mutually consistent, which is everything
 * this screen can be wrong about.
 */
const testConnection = asyncHandler(async (req, res) => {
  const org = await Organisation.findById(req.orgId);
  if (!org) throw httpError(404, 'Organisation not found');

  try {
    const result = await eInvoice.testConnection(org.toObject());
    org.eInvoicing.credentials.verifiedAt = new Date();
    org.eInvoicing.credentials.lastError = '';
    await org.save();
    logAudit({ req, action: 'org.einvoice_verified', entity: 'organisation', entityId: org._id, meta: {} });
    res.json({
      ok: true,
      message: `Connected to the ${org.eInvoicing.credentials.environment} e-invoice portal as ${org.eInvoicing.credentials.username}.`,
      tokenExpiry: result.tokenExpiry,
      expiresAt: result.expiresAt
    });
  } catch (error) {
    // Stored so the settings screen can show what went wrong last time without
    // the tenant having to press the button again to find out.
    org.eInvoicing.credentials.verifiedAt = null;
    org.eInvoicing.credentials.lastError = String(error.message || '').slice(0, 300);
    await org.save();
    throw error;
  }
});

module.exports = { getSettings, updateSettings, testConnection };
