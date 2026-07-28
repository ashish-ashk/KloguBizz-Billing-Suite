const { Organisation } = require('../models/Organisation');
const { GlobalSetting } = require('../models/Settings');
const { asyncHandler } = require('../utils/asyncHandler');
const { httpError } = require('../utils/httpError');
const { parseDataUri, contentVersion } = require('../services/brandingAssetService');

/**
 * Serves branding images as ordinary cacheable HTTP resources.
 *
 * These endpoints are **unauthenticated**, and that is a deliberate decision
 * rather than an oversight:
 *
 *  - A company logo and a letterhead are already public information — they are
 *    printed on every invoice the tenant sends to every customer. There is
 *    nothing to protect.
 *  - An `<img src>` cannot carry an `Authorization` header, and this app holds
 *    its JWT in localStorage rather than a cookie. An authenticated asset
 *    endpoint could not be rendered by the browser at all without re-fetching
 *    each image through XHR and re-inlining it — which is the base64 problem
 *    again, with extra steps.
 *
 * What is exposed is exactly the image and nothing else: the org id is required,
 * only these two fields are read, and no other tenant data is reachable through
 * the route.
 */

const ORG_ASSET_FIELDS = {
  logo: 'brandingConfig.logoUrl',
  header: 'brandingConfig.headerImageUrl'
};

const PLATFORM_ASSET_FIELDS = {
  logo: 'logoUrl',
  favicon: 'faviconUrl'
};

// One year. Safe because the URL carries a content hash — a changed image is a
// changed URL, so a cached copy can never be the wrong one.
const IMMUTABLE_MAX_AGE = 31536000;
// Without a version, a stale copy is possible, so cache only briefly.
const UNVERSIONED_MAX_AGE = 300;

/**
 * Sends an image with validators and the right freshness policy, honouring a
 * conditional request.
 *
 * The ETag is the content hash, so a client that does send `If-None-Match` gets a
 * 304 with no body — and a client following the `immutable` directive never asks
 * at all.
 */
function sendImage(req, res, { contentType, buffer }, source) {
  const etag = `"${contentVersion(source)}"`;
  const versioned = Boolean(req.query.v);

  res.setHeader('ETag', etag);
  res.setHeader('Content-Type', contentType);
  res.setHeader(
    'Cache-Control',
    versioned
      ? `public, max-age=${IMMUTABLE_MAX_AGE}, immutable`
      : `public, max-age=${UNVERSIONED_MAX_AGE}, must-revalidate`
  );
  // These are public images; nothing tenant-specific varies by request headers.
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

  if (req.headers['if-none-match'] === etag) {
    return res.status(304).end();
  }
  return res.send(buffer);
}

const orgAsset = asyncHandler(async (req, res) => {
  const field = ORG_ASSET_FIELDS[req.params.kind];
  if (!field) throw httpError(404, 'Unknown asset');

  // Only the one field is read, so serving a logo does not pull the rest of the
  // organisation document (including the *other* image) off disk.
  const org = await Organisation.findById(req.params.orgId).select(field).lean();
  if (!org) throw httpError(404, 'Not found');

  const source = req.params.kind === 'logo'
    ? org.brandingConfig?.logoUrl
    : org.brandingConfig?.headerImageUrl;
  const image = parseDataUri(source);
  if (!image) throw httpError(404, 'No image has been uploaded');

  return sendImage(req, res, image, source);
});

const platformAsset = asyncHandler(async (req, res) => {
  const field = PLATFORM_ASSET_FIELDS[req.params.kind];
  if (!field) throw httpError(404, 'Unknown asset');

  const setting = await GlobalSetting.findOne({ key: 'branding' }).lean();
  const source = setting?.value?.[field];
  const image = parseDataUri(source);
  if (!image) throw httpError(404, 'No image has been uploaded');

  return sendImage(req, res, image, source);
});

module.exports = { orgAsset, platformAsset };
