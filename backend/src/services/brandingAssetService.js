const crypto = require('crypto');

/**
 * Branding images, served as cacheable HTTP resources instead of inline base64.
 *
 * A tenant's logo and letterhead are stored as base64 data URIs inside the
 * `Organisation` document (500KB and 700KB caps respectively). That in itself is
 * a modelling choice this module does not change — what it changes is the
 * delivery. Those strings were embedded in the JSON of:
 *
 *   - `POST /auth/login`, `POST /auth/register`, `GET /auth/me`
 *   - `GET /organisations/current`
 *   - `GET /public/branding`, on **every unauthenticated login-page hit**
 *
 * `/auth/me` runs on every page load and every route change in the app, so a
 * tenant with both images uploaded was re-downloading up to ~1.2MB of
 * base64 — uncacheable, because it is part of a JSON body that also carries
 * mutable session state — over and over, on every navigation.
 *
 * The fix is to send a URL and serve the bytes separately:
 *
 *   - The URL is **content-addressed** (`?v=<short sha-256 of the data URI>`),
 *     so it changes only when the image changes.
 *   - The asset response is `immutable`, `max-age=1y`, with a matching ETag, so
 *     the browser fetches each image exactly once and thereafter never asks
 *     again — not even a conditional request.
 *   - The JSON payloads shrink to a couple of hundred bytes.
 *
 * This is not object storage. #45's proper fix is S3/R2 plus a resize pipeline,
 * which needs credentials this deployment does not yet have; the base64 still
 * sits in Mongo and is still read from there. What is fixed is the part that was
 * costing every request: the bytes are now cached by the browser and are absent
 * from the hot payloads.
 */

/** Anything that isn't a plausible image data URI is treated as absent. */
const DATA_URI_PATTERN = /^data:(image\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/i;

function parseDataUri(value) {
  if (typeof value !== 'string' || !value) return null;
  const match = DATA_URI_PATTERN.exec(value.trim());
  if (!match) return null;
  const [, contentType, base64] = match;
  const buffer = Buffer.from(base64, 'base64');
  if (!buffer.length) return null;
  return { contentType, buffer };
}

/**
 * A short content hash used as the cache-busting query value.
 *
 * 16 hex characters of SHA-256 is ample: this is a cache key, not a security
 * boundary, and a collision would only mean a stale image for one tenant.
 */
function contentVersion(value) {
  if (typeof value !== 'string' || !value) return null;
  return crypto.createHash('sha256').update(value).digest('hex').slice(0, 16);
}

/**
 * URLs are relative to the API root the client already knows. Returning an
 * absolute URL would mean guessing the public hostname, which differs between
 * the apex domain, the www variant and any custom domain a tenant is served on —
 * exactly the assumption that made single-origin CORS a problem.
 */
function orgAssetUrl(orgId, kind, source) {
  const version = contentVersion(source);
  return version ? `/assets/org/${orgId}/${kind}?v=${version}` : '';
}

function platformAssetUrl(kind, source) {
  const version = contentVersion(source);
  return version ? `/assets/platform/${kind}?v=${version}` : '';
}

/**
 * Prepares an organisation for an API response: the base64 comes out, asset URLs
 * go in.
 *
 * Accepts a Mongoose document or a plain object and always returns a plain
 * object. `logoUrl`/`headerImageUrl` are replaced with empty strings rather than
 * deleted, so a client that reads them sees "nothing here" instead of
 * `undefined` — and `hasLogo`/`hasHeaderImage` tell the settings page whether an
 * image is on file without shipping it.
 */
function serialiseOrganisation(org) {
  if (!org) return org;
  const plain = typeof org.toObject === 'function' ? org.toObject() : { ...org };
  const branding = { ...(plain.brandingConfig || {}) };

  const logoSource = branding.logoUrl || '';
  const headerSource = branding.headerImageUrl || '';

  branding.logoAssetUrl = orgAssetUrl(plain._id, 'logo', logoSource);
  branding.headerImageAssetUrl = orgAssetUrl(plain._id, 'header', headerSource);
  branding.hasLogo = Boolean(logoSource);
  branding.hasHeaderImage = Boolean(headerSource);
  branding.logoUrl = '';
  branding.headerImageUrl = '';

  plain.brandingConfig = branding;
  return plain;
}

module.exports = {
  parseDataUri,
  contentVersion,
  orgAssetUrl,
  platformAssetUrl,
  serialiseOrganisation
};
