const crypto = require('crypto');
const storage = require('./storageService');
const { normaliseImage } = require('./imageService');

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
 * **Object storage (#45's other half) now sits behind this too.** Phase 3 fixed
 * delivery but left the bytes inline in Mongo. There are now two places an image
 * can live, and this module is the only thing that knows which:
 *
 *   - a **storage key** (`brandingConfig.logoKey`) when an external store is
 *     configured — see services/storageService.js;
 *   - the legacy **inline data URI** (`brandingConfig.logoUrl`) otherwise, or on
 *     a document that predates the migration.
 *
 * Every reader goes through `resolveImage`, which prefers the key and falls back
 * to the data URI, so a half-migrated database is a normal state rather than a
 * broken one — that matters because the migration cannot be atomic across
 * thousands of documents and an image is worse than useless if it is only
 * readable after a backfill completes. Every writer goes through `storeImage`,
 * which resizes first (services/imageService.js) and then decides where the
 * bytes belong.
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
 * The cache-busting version for an image, wherever it lives.
 *
 * A storage key already *contains* the content hash (see
 * storageService.buildKey), so it is used directly rather than re-hashing the
 * key string — which would be a hash of a hash, and would change if the key
 * format ever changed even though the image had not.
 */
function versionOf({ key, dataUri } = {}) {
  if (key) {
    const match = /([0-9a-f]{16})\.[a-z0-9]+$/i.exec(String(key));
    if (match) return match[1];
    return contentVersion(String(key));
  }
  return contentVersion(dataUri);
}

/**
 * URLs are relative to the API root the client already knows. Returning an
 * absolute URL would mean guessing the public hostname, which differs between
 * the apex domain, the www variant and any custom domain a tenant is served on —
 * exactly the assumption that made single-origin CORS a problem.
 */
function orgAssetUrl(orgId, kind, source) {
  const version = versionOf(source);
  return version ? `/assets/org/${orgId}/${kind}?v=${version}` : '';
}

function platformAssetUrl(kind, source) {
  const version = versionOf(source);
  return version ? `/assets/platform/${kind}?v=${version}` : '';
}

/**
 * Reads an image's bytes from whichever place it lives.
 *
 * The key wins when both are present, which is the state a document is left in
 * mid-migration and also after an upload that has not yet cleared the legacy
 * field. Returns `null` for "no image", never a throw — the asset route renders
 * that as a 404 and the PDF renderer skips the image, both of which are already
 * handled.
 *
 * A key that resolves to nothing deliberately falls back to the data URI rather
 * than failing: that is the shape of a partially-completed migration, or an S3
 * outage, and an older-but-present logo beats a blank one.
 */
async function resolveImage({ key, dataUri } = {}) {
  if (key) {
    const stored = await storage.get(key);
    if (stored?.buffer?.length) {
      return {
        buffer: stored.buffer,
        // A stored object may not carry a content type (the local driver writes
        // bare bytes), so it is derived from the key's extension, which
        // `buildKey` set from the type at upload time.
        contentType: stored.contentType || contentTypeFromKey(key),
        version: versionOf({ key })
      };
    }
  }
  const parsed = parseDataUri(dataUri);
  if (!parsed) return null;
  return { ...parsed, version: versionOf({ dataUri }) };
}

const EXTENSION_TYPES = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml'
};

function contentTypeFromKey(key) {
  const ext = String(key || '').split('.').pop()?.toLowerCase();
  return EXTENSION_TYPES[ext] || 'application/octet-stream';
}

/**
 * Prepares an uploaded image for storage: resize, then place.
 *
 * Takes the data URI the client sent and returns what the *document* should
 * record — `{ key }` when an external store is configured, `{ dataUri }`
 * otherwise. The caller writes whichever it gets and clears the other field, so
 * exactly one of the two is ever populated for a freshly-saved image.
 *
 * `''` (an explicit removal) passes straight through as `{ dataUri: '', key: '' }`
 * so a caller can clear both fields with the same code path that sets them —
 * the alternative is every call site special-casing deletion, which is how one
 * of them ends up not clearing the key and the "removed" logo keeps rendering.
 */
async function storeImage({ scope, kind, dataUri }) {
  if (dataUri === '' || dataUri === null) return { key: '', dataUri: '', removed: true };

  const parsed = parseDataUri(dataUri);
  if (!parsed) return null;

  const normalised = await normaliseImage({ buffer: parsed.buffer, contentType: parsed.contentType, kind });

  if (!storage.isExternal()) {
    // Inline: store the *resized* bytes, not what was uploaded. This is where
    // most of #45's benefit lands even with no bucket configured — a 4MB phone
    // photo becomes a few tens of KB inside the document.
    return {
      key: '',
      dataUri: `data:${normalised.contentType};base64,${normalised.buffer.toString('base64')}`,
      bytesIn: normalised.bytesIn,
      bytesOut: normalised.bytesOut,
      processed: normalised.processed
    };
  }

  const stored = await storage.put({
    scope,
    kind,
    buffer: normalised.buffer,
    contentType: normalised.contentType
  });
  return {
    key: stored.key,
    // Cleared, so the two can never disagree about which is current.
    dataUri: '',
    bytesIn: normalised.bytesIn,
    bytesOut: normalised.bytesOut,
    processed: normalised.processed
  };
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

  // Either field may hold the current image — see resolveImage. The URL is
  // versioned from whichever one does, so moving an image into object storage
  // changes its URL exactly once (on migration) and never again.
  const logoSource = { key: branding.logoKey || '', dataUri: branding.logoUrl || '' };
  const headerSource = { key: branding.headerImageKey || '', dataUri: branding.headerImageUrl || '' };

  branding.logoAssetUrl = orgAssetUrl(plain._id, 'logo', logoSource);
  branding.headerImageAssetUrl = orgAssetUrl(plain._id, 'header', headerSource);
  branding.hasLogo = Boolean(logoSource.key || logoSource.dataUri);
  branding.hasHeaderImage = Boolean(headerSource.key || headerSource.dataUri);
  /**
   * The write-only fields are **omitted**, not blanked.
   *
   * They used to come back as `''`, and an empty string is not neutral here: it
   * is the documented way to *remove* an image (`storeImage` returns
   * `{ removed: true }` for it). So any client that read an organisation, changed
   * one unrelated field and sent the object back erased the logo, the letterhead
   * and the signature — and the response looked like a success.
   *
   * The app guards against it with its own dirty flags, which is why this was not
   * visible in the product. That guard is the kind that survives until somebody
   * adds a field, and the same trap sat waiting for every other caller of this
   * API. Omitting the key removes the ambiguity instead of documenting it: there
   * is nothing to echo back. Deliberately sending `''` still removes an image,
   * because that is a real thing to want.
   */
  delete branding.logoUrl;
  delete branding.headerImageUrl;
  // The keys go too. They are an internal storage detail, the client has the
  // asset URL it actually needs, and shipping a bucket path invites someone to
  // build a second way of fetching images that bypasses the cache policy.
  delete branding.logoKey;
  delete branding.headerImageKey;

  if (branding.invoiceDefaults) {
    const defaults = { ...branding.invoiceDefaults };
    const signatureSource = { key: defaults.signatureKey || '', dataUri: defaults.signatureUrl || '' };
    defaults.hasSignature = Boolean(signatureSource.key || signatureSource.dataUri);
    defaults.signatureAssetUrl = orgAssetUrl(plain._id, 'signature', signatureSource);
    delete defaults.signatureUrl;
    delete defaults.signatureKey;
    branding.invoiceDefaults = defaults;
  }

  plain.brandingConfig = branding;
  return plain;
}

module.exports = {
  parseDataUri,
  contentVersion,
  versionOf,
  orgAssetUrl,
  platformAssetUrl,
  resolveImage,
  storeImage,
  contentTypeFromKey,
  serialiseOrganisation
};
