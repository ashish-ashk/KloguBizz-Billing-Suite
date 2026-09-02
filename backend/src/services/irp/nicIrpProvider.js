const nic = require('./nicCrypto');
const { logger } = require('../../utils/logger');

/**
 * The NIC Invoice Registration Portal, spoken to directly.
 *
 * This is the adapter that `eInvoiceService.callIrp` was left as a seam for. It
 * talks to the government's own API (`einvoice1.gst.gov.in`, or the sandbox at
 * `einv-apisandbox.nic.in`) rather than to a reseller, because that is what the
 * request was: the government portal.
 *
 * ── How the credentials divide, and why it matters for a SaaS ──────────
 *
 * Two different parties own the two halves, and conflating them is the mistake
 * that makes an integration work for one tenant and no others:
 *
 *  - `clientId` / `clientSecret` identify **the software** to the IRP. One pair
 *    for the whole platform, from the environment.
 *  - `gstin` / `username` / `password` identify **the taxpayer**. Every tenant
 *    has their own, created by them on the e-invoice portal under their own
 *    GSTIN, and an invoice reported under the wrong one is reported against the
 *    wrong business's return.
 *
 * So the tenant's half is stored per organisation and encrypted, and every call
 * here takes it as an argument. Nothing in this file reads global state for a
 * taxpayer credential — there is no default tenant to fall back to, deliberately.
 *
 * A tenant who is a direct API user rather than reporting through the platform
 * may also supply their own client pair; `resolveConfig` prefers theirs when
 * present.
 */

const AUTH_PATH = '/eivital/dec/v1.04/auth';
const GENERATE_PATH = '/eicore/v1.03/Invoice';
const CANCEL_PATH = '/eicore/v1.03/Invoice/Cancel';

/**
 * Paths differ between the sandbox and production deployments of the same API,
 * and the base URL alone does not disambiguate them. Both forms are tried in
 * order: the versioned path first, then the short form the sandbox exposes.
 */
const PATH_FALLBACKS = {
  auth: [AUTH_PATH, '/api/auth'],
  generate: [GENERATE_PATH, '/api/Invoice'],
  cancel: [CANCEL_PATH, '/api/Invoice/Cancel']
};

/** A government API that hangs must not hold a request open behind it. */
const TIMEOUT_MS = 25000;

/**
 * NIC error codes this adapter treats as something other than a plain failure.
 * The full list runs to hundreds; these three change control flow.
 */
const CODE = {
  /** The invoice is already registered. Not a failure — see `recoverDuplicate`. */
  DUPLICATE_IRN: '2150',
  /** The auth token is invalid or expired. Re-authenticate once and retry. */
  INVALID_TOKEN: '1005',
  /** Also seen for an expired token on some deployments. */
  TOKEN_EXPIRED: '1006'
};

/**
 * Auth tokens, cached in memory per taxpayer.
 *
 * A token is valid for six hours in production and one in the sandbox, and the
 * authentication call is rate-limited — re-authenticating per invoice would be
 * throttled within a batch.
 *
 * In memory rather than in the database on purpose. It is a bearer credential
 * with a short life, so persisting it means encrypting another secret at rest
 * and keeping it fresh, to save an occasional handshake. Several instances each
 * holding their own is fine: the IRP returns the *same* token to a repeat
 * request while it is still valid.
 *
 * Keyed by base URL as well as taxpayer, so a tenant who moves from sandbox to
 * production cannot pick up a sandbox token for a production call.
 */
const tokenCache = new Map();

const cacheKey = config => `${config.baseUrl}|${config.gstin}|${config.username}`;

function cachedSession(config) {
  const hit = tokenCache.get(cacheKey(config));
  if (!hit) return null;
  // Two minutes of headroom, so a token does not expire between this check and
  // the call it is used for.
  if (hit.expiresAt - Date.now() < 120000) {
    tokenCache.delete(cacheKey(config));
    return null;
  }
  return hit;
}

function forgetSession(config) {
  tokenCache.delete(cacheKey(config));
}

/** Clears everything. Used by tests, and after a credential change. */
function clearSessions() {
  tokenCache.clear();
}

// ── Error shaping ────────────────────────────────────────────────────────

/**
 * The IRP's `ErrorDetails`, turned into something a business owner can act on.
 *
 * It arrives as an array of `{ ErrorCode, ErrorMessage }`, sometimes as a JSON
 * string, and occasionally base64-encoded. All three are unwrapped here rather
 * than at each call site.
 */
function parseErrorDetails(raw) {
  if (!raw) return [];
  let value = raw;

  if (typeof value === 'string') {
    const text = value.trim();
    try {
      value = JSON.parse(text);
    } catch {
      try {
        value = JSON.parse(Buffer.from(text, 'base64').toString('utf8'));
      } catch {
        return [{ code: '', message: text }];
      }
    }
  }

  const list = Array.isArray(value) ? value : [value];
  return list
    .map(entry => ({
      code: String(entry?.ErrorCode ?? entry?.errorCode ?? '').trim(),
      message: String(entry?.ErrorMessage ?? entry?.errorMessage ?? '').trim()
    }))
    .filter(entry => entry.code || entry.message);
}

function irpError(errors, fallback) {
  const listed = errors.length
    ? errors.map(e => (e.code ? `${e.message} (${e.code})` : e.message)).join('; ')
    : fallback;
  const error = new Error(listed);
  error.statusCode = 502;
  error.code = 'IRP_REJECTED';
  error.irpErrors = errors;
  return error;
}

// ── Transport ────────────────────────────────────────────────────────────

async function postJson(url, headers, body) {
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });
  } catch (cause) {
    const error = new Error(
      cause?.name === 'TimeoutError'
        ? 'The e-invoice portal did not respond in time. The invoice has not been reported — try again.'
        : `The e-invoice portal could not be reached: ${cause?.message || 'network error'}`
    );
    error.statusCode = 504;
    error.code = 'IRP_UNREACHABLE';
    throw error;
  }

  const text = await response.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    /**
     * An HTML error page rather than JSON. Almost always a wrong base URL or a
     * portal maintenance window, and the raw HTML in a toast is useless — so it
     * says which, and the body goes to the log.
     */
    logger.warn('IRP returned a non-JSON response', { url, status: response.status, body: text.slice(0, 500) });
    const error = new Error(
      `The e-invoice portal returned something unexpected (HTTP ${response.status}). `
      + 'Check the portal URL in the platform settings.'
    );
    error.statusCode = 502;
    error.code = 'IRP_BAD_RESPONSE';
    throw error;
  }
  return { httpStatus: response.status, json };
}

/**
 * Posts to the first path that is not a 404.
 *
 * The sandbox and production deployments expose the same operations under
 * different paths, and a 404 on the first is information rather than a failure.
 * Only a 404 falls through — anything else, including a rejection, is the real
 * answer and is returned.
 */
async function postToFirstAvailable(config, kind, headers, body) {
  const paths = PATH_FALLBACKS[kind];
  let last;
  for (const path of paths) {
    const result = await postJson(`${config.baseUrl.replace(/\/+$/, '')}${path}`, headers, body);
    if (result.httpStatus !== 404) return result;
    last = result;
  }
  return last;
}

// ── Authentication ───────────────────────────────────────────────────────

/**
 * Authenticates the taxpayer and returns a usable session.
 *
 * `Status` is the IRP's own success flag and is `'1'` as a *string* in some
 * deployments and `1` as a number in others, so it is compared loosely on
 * purpose.
 */
async function authenticate(config) {
  const cached = cachedSession(config);
  if (cached) return cached;

  const appKey = nic.generateAppKey();
  const body = {
    UserName: config.username,
    Password: nic.encryptPassword(config.password, config.publicKeyPem),
    AppKey: nic.encryptAppKey(appKey, config.publicKeyPem),
    ForceRefreshAccessToken: false
  };

  const { json } = await postToFirstAvailable(config, 'auth', {
    client_id: config.clientId,
    client_secret: config.clientSecret,
    Gstin: config.gstin
  }, body);

  if (String(json.Status) !== '1') {
    throw irpError(
      parseErrorDetails(json.ErrorDetails),
      'The e-invoice portal refused these credentials. Check the username, password and GSTIN.'
    );
  }

  // Both response shapes are in use: the fields at the top level, or nested
  // under `Data`. Neither is wrong per the specification.
  const data = json.Data && typeof json.Data === 'object' ? json.Data : json;
  const authToken = data.AuthToken;
  const sekWrapped = data.Sek;

  if (!authToken || !sekWrapped) {
    throw irpError([], 'The e-invoice portal authenticated but returned no session key.');
  }

  const session = {
    authToken,
    sek: nic.decryptSek(sekWrapped, appKey),
    /**
     * `TokenExpiry` is a local timestamp with no zone, which cannot be parsed
     * into an instant without guessing. The token's *documented* life is used
     * instead — one hour on the sandbox, six in production — and a rejection
     * mid-session is handled by the retry in `callWithSession` anyway.
     */
    expiresAt: Date.now() + (config.environment === 'production' ? 6 : 1) * 3600000,
    tokenExpiryReported: data.TokenExpiry || null
  };

  tokenCache.set(cacheKey(config), session);
  return session;
}

/**
 * Runs an authenticated call, re-authenticating once if the token is stale.
 *
 * The retry exists because a cached token can be invalidated on the IRP's side —
 * by an expiry we mis-estimated, or by the same taxpayer authenticating from
 * another system. One retry, so a genuinely bad credential cannot loop.
 */
async function callWithSession(config, kind, buildPayload) {
  const attempt = async () => {
    const session = await authenticate(config);
    const headers = {
      client_id: config.clientId,
      client_secret: config.clientSecret,
      Gstin: config.gstin,
      user_name: config.username,
      AuthToken: session.authToken
    };
    const { json } = await postToFirstAvailable(config, kind, headers, nic.encryptPayload(buildPayload(), session.sek));
    return { json, session };
  };

  let { json, session } = await attempt();

  let errors = String(json.Status) === '1' ? [] : parseErrorDetails(json.ErrorDetails);
  if (errors.some(e => e.code === CODE.INVALID_TOKEN || e.code === CODE.TOKEN_EXPIRED)) {
    forgetSession(config);
    ({ json, session } = await attempt());
    errors = String(json.Status) === '1' ? [] : parseErrorDetails(json.ErrorDetails);
  }

  return { json, session, errors };
}

// ── Operations ───────────────────────────────────────────────────────────

/**
 * A duplicate is not a failure.
 *
 * If a previous attempt reached the IRP but its response did not reach us — a
 * timeout, a dropped connection — the invoice *is* registered, and trying again
 * returns error 2150. Reporting that as a failure would leave a tenant with an
 * invoice the government considers reported and this product considers failed,
 * and no way to reconcile the two by hand.
 *
 * The IRP returns the existing IRN alongside the error, in `InfoDtls`, so the
 * right answer is recoverable. It is dug out here.
 */
function recoverDuplicate(json, errors) {
  if (!errors.some(e => e.code === CODE.DUPLICATE_IRN)) return null;

  const info = json.InfoDtls;
  let parsed = info;
  if (typeof info === 'string') {
    try { parsed = JSON.parse(info); } catch { parsed = null; }
  }
  const entries = Array.isArray(parsed) ? parsed : [parsed].filter(Boolean);
  for (const entry of entries) {
    const desc = entry?.Desc ?? entry?.desc;
    const irn = (typeof desc === 'object' ? desc?.Irn : null)
      ?? entry?.Irn
      ?? (typeof desc === 'string' ? desc : null);
    if (irn && String(irn).length >= 32) return String(irn);
  }
  // Some deployments put it in the error message itself.
  const fromMessage = errors
    .map(e => (e.message.match(/[0-9a-f]{64}/i) || [])[0])
    .find(Boolean);
  return fromMessage || null;
}

/** Normalises a successful IRP response into the shape the app stores. */
function shapeResult(data) {
  return {
    irn: data.Irn || data.IRN || '',
    ackNo: String(data.AckNo ?? ''),
    ackDate: data.AckDt || null,
    signedInvoice: data.SignedInvoice || '',
    signedQrCode: data.SignedQRCode || data.SignedQrCode || '',
    irpStatus: data.Status || 'ACT',
    ewbNo: data.EwbNo ? String(data.EwbNo) : '',
    ewbDate: data.EwbDt || null,
    ewbValidTill: data.EwbValidTill || null
  };
}

/** Reports an invoice and returns its IRN and signed QR. */
async function generateIrn(config, payload) {
  const { json, session, errors } = await callWithSession(config, 'generate', () => payload);

  if (errors.length) {
    const duplicate = recoverDuplicate(json, errors);
    if (duplicate) {
      return {
        irn: duplicate,
        ackNo: '',
        ackDate: null,
        signedInvoice: '',
        // No signed QR comes back with a duplicate — the invoice is registered
        // but the QR has to be fetched separately, which the caller reports as
        // `duplicate` so the tenant knows why the QR is missing.
        signedQrCode: '',
        irpStatus: 'ACT',
        duplicate: true
      };
    }
    throw irpError(errors, 'The e-invoice portal rejected this invoice.');
  }

  if (!json.Data) throw irpError([], 'The e-invoice portal reported success but returned no data.');
  return shapeResult(nic.decryptResponseData(json.Data, session.sek));
}

/**
 * Cancels an IRN.
 *
 * `CnlRsn` is a numeric code the IRP defines: 1 duplicate, 2 data entry
 * mistake, 3 order cancelled, 4 other. Anything else is refused by the portal,
 * so it is mapped rather than passed through.
 */
async function cancelIrn(config, { irn, reasonCode = '2', remarks = '' }) {
  const { json, session, errors } = await callWithSession(config, 'cancel', () => ({
    Irn: irn,
    CnlRsn: String(reasonCode),
    CnlRem: String(remarks || 'Cancelled by the issuer').slice(0, 100)
  }));

  if (errors.length) throw irpError(errors, 'The e-invoice portal refused to cancel this IRN.');
  const data = json.Data ? nic.decryptResponseData(json.Data, session.sek) : {};
  return { irn: data.Irn || irn, cancelDate: data.CancelDate || null };
}

/**
 * A credentials check that reports an invoice to nobody.
 *
 * Authentication alone is the whole test: it proves the client pair, the
 * taxpayer's username and password, the GSTIN and the public key are all
 * mutually consistent, without registering a document. A "test" that generated
 * a real IRN would be untestable, because an IRN cannot be un-generated after
 * twenty-four hours.
 */
async function testCredentials(config) {
  const session = await authenticate(config);
  return {
    ok: true,
    tokenExpiry: session.tokenExpiryReported,
    expiresAt: new Date(session.expiresAt).toISOString()
  };
}

module.exports = {
  authenticate,
  generateIrn,
  cancelIrn,
  testCredentials,
  clearSessions,
  parseErrorDetails,
  recoverDuplicate,
  shapeResult,
  CODE,
  PATH_FALLBACKS
};
