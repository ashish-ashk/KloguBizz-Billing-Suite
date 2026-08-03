const { env } = require('../config/env');
const storage = require('../services/storageService');
const { parseDataUri } = require('../services/brandingAssetService');
const { normaliseImage } = require('../services/imageService');
const { logger } = require('../utils/logger');

/**
 * Moves inline base64 branding images out to object storage (#45).
 *
 * Five images across two collections: an organisation's logo, letterhead and
 * signature, and the platform's own logo and favicon. Each is read from its
 * legacy `*Url` data-URI field, resized, written to the configured store, and
 * replaced by a `*Key`.
 *
 * **A no-op when no external store is configured**, which is the important
 * property. `STORAGE_DRIVER` defaults to `inline`, and on an ephemeral
 * filesystem there is nowhere durable to put the bytes — a migration that
 * "moved" them to a disk that is wiped on the next deploy would destroy every
 * tenant's branding while reporting success. So with no store configured this
 * reports `skipped` and changes nothing, and it is safe to run again after a
 * bucket is added.
 *
 * Nothing here is destructive even when it does run: the legacy field is
 * cleared only *after* the object has been written, one document at a time, and
 * `brandingAssetService.resolveImage` reads whichever field is populated — so a
 * run that is interrupted half way leaves a database where some documents read
 * from storage and some read inline, and every image still renders. That is why
 * the reader was built to prefer-then-fall-back rather than switch wholesale.
 *
 * Images are resized on the way through, so this doubles as the one-off
 * backfill for the resize pipeline: a tenant who uploaded a 4MB phone photo two
 * months ago gets a bounded one without re-uploading.
 */

const ORG_IMAGES = [
  { kind: 'logo', urlPath: 'brandingConfig.logoUrl', keyPath: 'brandingConfig.logoKey' },
  { kind: 'header', urlPath: 'brandingConfig.headerImageUrl', keyPath: 'brandingConfig.headerImageKey' },
  {
    kind: 'signature',
    urlPath: 'brandingConfig.invoiceDefaults.signatureUrl',
    keyPath: 'brandingConfig.invoiceDefaults.signatureKey'
  }
];

const PLATFORM_IMAGES = [
  { kind: 'logo', urlField: 'logoUrl', keyField: 'logoKey' },
  { kind: 'favicon', urlField: 'faviconUrl', keyField: 'faviconKey' }
];

function pluck(doc, dottedPath) {
  return String(dottedPath).split('.').reduce((node, part) => (node == null ? node : node[part]), doc);
}

/** Resizes and stores one data URI, returning the new key. */
async function moveOne({ scope, kind, dataUri }) {
  const parsed = parseDataUri(dataUri);
  if (!parsed) return null;
  const normalised = await normaliseImage({ buffer: parsed.buffer, contentType: parsed.contentType, kind });
  const stored = await storage.put({
    scope,
    kind,
    buffer: normalised.buffer,
    contentType: normalised.contentType
  });
  return { key: stored.key, bytesIn: normalised.bytesIn, bytesOut: normalised.bytesOut };
}

module.exports = {
  description: 'Move inline base64 branding images into object storage and resize them',

  async up(db) {
    if (!storage.isExternal()) {
      logger.warn('migration 007: no external image store configured — nothing to move', {
        storageDriver: env.STORAGE_DRIVER
      });
      return {
        skipped: true,
        reason: `STORAGE_DRIVER=${env.STORAGE_DRIVER}; images stay inline. Re-run this migration after configuring s3.`
      };
    }

    const organisations = db.collection('organisations');
    const settings = db.collection('globalsettings');

    let orgImagesMoved = 0;
    let orgsTouched = 0;
    let bytesBefore = 0;
    let bytesAfter = 0;
    let failures = 0;

    const cursor = organisations.find(
      {
        $or: [
          { 'brandingConfig.logoUrl': { $regex: '^data:image' } },
          { 'brandingConfig.headerImageUrl': { $regex: '^data:image' } },
          { 'brandingConfig.invoiceDefaults.signatureUrl': { $regex: '^data:image' } }
        ]
      },
      {
        projection: {
          _id: 1,
          'brandingConfig.logoUrl': 1,
          'brandingConfig.headerImageUrl': 1,
          'brandingConfig.invoiceDefaults.signatureUrl': 1
        }
      }
    );

    for await (const org of cursor) {
      const set = {};
      for (const { kind, urlPath, keyPath } of ORG_IMAGES) {
        const dataUri = pluck(org, urlPath);
        if (!dataUri || !String(dataUri).startsWith('data:image')) continue;
        try {
          const moved = await moveOne({ scope: `org/${org._id}`, kind, dataUri });
          if (!moved) continue;
          set[keyPath] = moved.key;
          // Cleared only now the object exists. One update per document, so an
          // interrupted run never leaves a document with neither field set.
          set[urlPath] = '';
          orgImagesMoved += 1;
          bytesBefore += moved.bytesIn;
          bytesAfter += moved.bytesOut;
        } catch (error) {
          // A single unreadable image must not stop the backfill for every other
          // tenant. Left inline, which still renders.
          failures += 1;
          logger.error('migration 007: failed to move an organisation image', {
            orgId: String(org._id), kind, err: error
          });
        }
      }
      if (Object.keys(set).length) {
        await organisations.updateOne({ _id: org._id }, { $set: set });
        orgsTouched += 1;
      }
    }

    // Platform branding: one document, two images, read on every
    // unauthenticated login-page hit.
    let platformImagesMoved = 0;
    const branding = await settings.findOne({ key: 'branding' });
    if (branding?.value) {
      const set = {};
      for (const { kind, urlField, keyField } of PLATFORM_IMAGES) {
        const dataUri = branding.value[urlField];
        if (!dataUri || !String(dataUri).startsWith('data:image')) continue;
        try {
          const moved = await moveOne({ scope: 'platform', kind, dataUri });
          if (!moved) continue;
          set[`value.${keyField}`] = moved.key;
          set[`value.${urlField}`] = '';
          platformImagesMoved += 1;
          bytesBefore += moved.bytesIn;
          bytesAfter += moved.bytesOut;
        } catch (error) {
          failures += 1;
          logger.error('migration 007: failed to move a platform image', { kind, err: error });
        }
      }
      if (Object.keys(set).length) await settings.updateOne({ _id: branding._id }, { $set: set });
    }

    return {
      storageDriver: env.STORAGE_DRIVER,
      orgsTouched,
      orgImagesMoved,
      platformImagesMoved,
      bytesBefore,
      bytesAfter,
      failures
    };
  }
};
