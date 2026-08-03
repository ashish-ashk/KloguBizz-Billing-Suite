const { Organisation } = require('../models/Organisation');
const { GlobalSetting } = require('../models/Settings');
const { asyncHandler } = require('../utils/asyncHandler');
const { httpError } = require('../utils/httpError');
const { resolveImage } = require('../services/brandingAssetService');
const { isSvg } = require('../services/imageService');

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

/**
 * Which document fields hold each kind of image.
 *
 * Two per kind since #45: the object-storage key and the legacy inline data
 * URI. Both are selected so `resolveImage` can prefer the key and fall back —
 * a document mid-migration has both, and a document that predates the
 * migration has only the second.
 */
const ORG_ASSET_FIELDS = {
  logo: { key: 'brandingConfig.logoKey', dataUri: 'brandingConfig.logoUrl' },
  header: { key: 'brandingConfig.headerImageKey', dataUri: 'brandingConfig.headerImageUrl' },
  signature: {
    key: 'brandingConfig.invoiceDefaults.signatureKey',
    dataUri: 'brandingConfig.invoiceDefaults.signatureUrl'
  }
};

const PLATFORM_ASSET_FIELDS = {
  logo: { key: 'logoKey', dataUri: 'logoUrl' },
  favicon: { key: 'faviconKey', dataUri: 'faviconUrl' }
};

/** Walks a dotted path, so one lookup table can describe nested fields. */
function pluck(doc, dottedPath) {
  return String(dottedPath).split('.').reduce((node, part) => (node == null ? node : node[part]), doc);
}

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
function sendImage(req, res, { contentType, buffer, version }) {
  const etag = `"${version}"`;
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
  /**
   * An SVG is the one image type that is also a *document*: rendered as a
   * top-level page it can execute script, which on this origin would be script
   * running next to the API. `nosniff` plus an attachment disposition means a
   * browser will render it inside an `<img>` (the only way this app uses it) but
   * will not treat a direct navigation to the URL as a page. The other formats
   * get the same header at no cost.
   */
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (isSvg(contentType)) {
    res.setHeader('Content-Disposition', 'attachment');
    res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox");
  }

  if (req.headers['if-none-match'] === etag) {
    return res.status(304).end();
  }
  return res.send(buffer);
}

const orgAsset = asyncHandler(async (req, res) => {
  const fields = ORG_ASSET_FIELDS[req.params.kind];
  if (!fields) throw httpError(404, 'Unknown asset');

  // Only the two fields for this kind are read, so serving a logo does not pull
  // the rest of the organisation document (including the *other* images) off
  // disk — which is the whole point when the legacy field is 500KB of base64.
  const org = await Organisation.findById(req.params.orgId)
    .select(`${fields.key} ${fields.dataUri}`)
    .lean();
  if (!org) throw httpError(404, 'Not found');

  const image = await resolveImage({
    key: pluck(org, fields.key),
    dataUri: pluck(org, fields.dataUri)
  });
  if (!image) throw httpError(404, 'No image has been uploaded');

  return sendImage(req, res, image);
});

const platformAsset = asyncHandler(async (req, res) => {
  const fields = PLATFORM_ASSET_FIELDS[req.params.kind];
  if (!fields) throw httpError(404, 'Unknown asset');

  const setting = await GlobalSetting.findOne({ key: 'branding' }).lean();
  const image = await resolveImage({
    key: setting?.value?.[fields.key],
    dataUri: setting?.value?.[fields.dataUri]
  });
  if (!image) throw httpError(404, 'No image has been uploaded');

  return sendImage(req, res, image);
});

module.exports = { orgAsset, platformAsset };
