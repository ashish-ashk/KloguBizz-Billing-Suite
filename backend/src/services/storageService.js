const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const { env } = require('../config/env');
const { logger } = require('../utils/logger');

/**
 * Blob storage for uploaded images (#45's object-storage half).
 *
 * A pure content-addressed key/value store for bytes. It deliberately knows
 * nothing about organisations, branding fields or data URIs — that mapping
 * lives in `brandingAssetService`, which already owns it. This file answers one
 * question: given some bytes, where do they go, and how do I get them back.
 *
 * Three drivers, and **which one is the default matters a great deal**:
 *
 *  - `inline` (**the default**) — no external store at all; the caller keeps
 *    the existing base64-in-the-document behaviour. This stays the default on
 *    purpose. The API runs on Render, whose filesystem is *ephemeral*: making
 *    local disk the default would mean every tenant's logo silently vanished on
 *    the next deploy, which is a far worse failure than a large document,
 *    because it is invisible until a customer notices their invoices lost their
 *    branding. Inline storage is slow and inelegant; it is not lossy.
 *  - `local` — a directory on disk. Correct for a VPS or anything with a real
 *    persistent volume, wrong on ephemeral infrastructure. `assertSecureConfig`
 *    warns when this is selected in production for exactly that reason.
 *  - `s3` — S3 or any S3-compatible store (Cloudflare R2, Backblaze B2,
 *    MinIO) via a custom endpoint. This is the one to use in production.
 *
 * Keys are **content-addressed**: `<scope>/<kind>/<sha256-16>.<ext>`. Two
 * consequences worth stating, because the whole caching design rests on them:
 * re-uploading an identical image is a no-op that cannot produce a second
 * object, and a *changed* image is a different key, so the immutable
 * `max-age=1y` the asset route already sends can never serve a stale image.
 *
 * Deletion of the superseded key is deliberately **not** automatic on replace.
 * See `remove`'s note: a shared key is a real possibility, and an orphaned
 * 40KB object is cheaper than a logo that disappears from historical invoices.
 */

const DRIVERS = ['inline', 'local', 's3'];

const EXTENSIONS = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg'
};

function extensionFor(contentType) {
  return EXTENSIONS[String(contentType || '').toLowerCase()] || 'bin';
}

/** 16 hex characters of SHA-256 — a cache key, not a security boundary, and the
 *  same length `brandingAssetService.contentVersion` already uses so the two
 *  agree about what "version" means. */
function contentHash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 16);
}

/**
 * Builds the key for some bytes. `scope` is a caller-chosen namespace —
 * `org/<id>` or `platform` — and is sanitised rather than trusted, because a
 * key becomes a filesystem path under the local driver and `../` in a path is
 * how a blob store turns into arbitrary file write.
 */
function buildKey({ scope, kind, buffer, contentType }) {
  const safe = String(scope || 'misc').replace(/[^a-zA-Z0-9/_-]/g, '').replace(/\.\.+/g, '');
  const safeKind = String(kind || 'file').replace(/[^a-zA-Z0-9_-]/g, '');
  return `${safe}/${safeKind}/${contentHash(buffer)}.${extensionFor(contentType)}`;
}

// ── inline driver ────────────────────────────────
//
// A null object. Present so `isExternal()` is the only branch a caller needs
// rather than every call site having to check whether storage exists at all.

const inlineDriver = {
  name: 'inline',
  external: false,
  async put() { throw new Error('The inline driver does not store objects — callers must keep the data URI.'); },
  async get() { return null; },
  async remove() { return false; },
  describe() { return { driver: 'inline', note: 'Images are stored as base64 inside the document.' }; }
};

// ── local driver ─────────────────────────────────

function localRoot() {
  return path.resolve(env.STORAGE_LOCAL_DIR);
}

/**
 * Resolves a key to an absolute path and refuses anything that escapes the
 * root. `buildKey` already sanitises, but this is the check that still holds if
 * a key ever arrives from somewhere else — a stored document, a migration, a
 * future caller — which is precisely when path traversal gets through.
 */
function localPathFor(key) {
  const root = localRoot();
  const resolved = path.resolve(root, key);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw new Error(`Refusing to resolve a storage key outside the storage root: ${key}`);
  }
  return resolved;
}

const localDriver = {
  name: 'local',
  external: true,
  async put({ key, buffer }) {
    const target = localPathFor(key);
    await fs.mkdir(path.dirname(target), { recursive: true });
    // Content-addressed, so an existing file with this key holds identical
    // bytes and rewriting it would be pure waste.
    try {
      const existing = await fs.stat(target);
      if (existing.size === buffer.length) return { key, size: buffer.length, reused: true };
    } catch {
      // Not there yet — the normal path.
    }
    await fs.writeFile(target, buffer);
    return { key, size: buffer.length, reused: false };
  },
  async get({ key }) {
    try {
      const buffer = await fs.readFile(localPathFor(key));
      return { buffer };
    } catch {
      return null;
    }
  },
  async remove({ key }) {
    try {
      await fs.unlink(localPathFor(key));
      return true;
    } catch {
      return false;
    }
  },
  describe() {
    return { driver: 'local', directory: localRoot(), note: 'Requires a persistent volume — files are lost on redeploy otherwise.' };
  }
};

// ── s3 driver ────────────────────────────────────
//
// Loaded lazily so a deployment that does not use S3 never pays to require the
// SDK, and so a missing/broken SDK install surfaces as a clear storage error
// rather than a boot failure for an unrelated feature.

let s3ClientPromise = null;

async function s3Client() {
  if (!s3ClientPromise) {
    s3ClientPromise = (async () => {
      const { S3Client } = require('@aws-sdk/client-s3');
      return new S3Client({
        region: env.S3_REGION,
        // Set for R2/B2/MinIO; omitted for real AWS S3, where the SDK derives it.
        ...(env.S3_ENDPOINT ? { endpoint: env.S3_ENDPOINT } : {}),
        // Required by R2 and MinIO: they address buckets by path rather than by
        // a virtual host, which is not the SDK's default.
        ...(env.S3_FORCE_PATH_STYLE ? { forcePathStyle: true } : {}),
        credentials: {
          accessKeyId: env.S3_ACCESS_KEY_ID,
          secretAccessKey: env.S3_SECRET_ACCESS_KEY
        }
      });
    })();
  }
  return s3ClientPromise;
}

const s3Driver = {
  name: 's3',
  external: true,
  async put({ key, buffer, contentType }) {
    const { PutObjectCommand } = require('@aws-sdk/client-s3');
    const client = await s3Client();
    await client.send(new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      // The object is content-addressed, so it can never change under this key.
      CacheControl: 'public, max-age=31536000, immutable'
    }));
    return { key, size: buffer.length, reused: false };
  },
  async get({ key }) {
    const { GetObjectCommand } = require('@aws-sdk/client-s3');
    try {
      const client = await s3Client();
      const result = await client.send(new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
      const chunks = [];
      for await (const chunk of result.Body) chunks.push(chunk);
      return { buffer: Buffer.concat(chunks), contentType: result.ContentType };
    } catch (error) {
      // A genuinely missing object is an expected outcome (the caller renders a
      // 404); anything else is worth a log line, because "the logo stopped
      // loading" is otherwise indistinguishable from "the logo was deleted".
      if (error?.name !== 'NoSuchKey' && error?.$metadata?.httpStatusCode !== 404) {
        logger.error('s3 object read failed', { key, err: error });
      }
      return null;
    }
  },
  async remove({ key }) {
    const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
    try {
      const client = await s3Client();
      await client.send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
      return true;
    } catch (error) {
      logger.warn('s3 object delete failed', { key, err: error });
      return false;
    }
  },
  describe() {
    return {
      driver: 's3',
      bucket: env.S3_BUCKET,
      region: env.S3_REGION,
      endpoint: env.S3_ENDPOINT || 'aws',
      note: 'Objects are content-addressed and served with an immutable cache policy.'
    };
  }
};

// ── driver selection ─────────────────────────────

const IMPLEMENTATIONS = { inline: inlineDriver, local: localDriver, s3: s3Driver };

function activeDriver() {
  const selected = DRIVERS.includes(env.STORAGE_DRIVER) ? env.STORAGE_DRIVER : 'inline';
  return IMPLEMENTATIONS[selected];
}

/** Whether an external store is configured at all. When false, every caller
 *  keeps the inline data-URI path — there is no half-migrated mode. */
function isExternal() {
  return activeDriver().external;
}

/**
 * Stores bytes and returns their key.
 *
 * Throws on the inline driver rather than silently succeeding: a caller that
 * reaches this without checking `isExternal()` has a bug, and swallowing it
 * would produce a document referencing a key nothing wrote.
 */
async function put({ scope, kind, buffer, contentType }) {
  if (!buffer?.length) throw new Error('storageService.put requires a non-empty buffer');
  const key = buildKey({ scope, kind, buffer, contentType });
  const result = await activeDriver().put({ key, buffer, contentType });
  return { ...result, key, contentType };
}

/** Reads bytes back. `null` when the object is absent — never a throw, because
 *  a missing image is a 404 the route already renders. */
async function get(key) {
  if (!key) return null;
  return activeDriver().get({ key });
}

/**
 * Deletes an object. Called only on an explicit "remove this image" action,
 * never on replace.
 *
 * Content-addressing makes deletion on replace actively unsafe: two
 * organisations that upload the same file share a key, so deleting "the old
 * one" can remove an object another tenant is still using. An orphaned object
 * costs fractions of a cent; a logo that vanishes from a customer's invoices
 * costs their trust.
 */
async function remove(key) {
  if (!key) return false;
  return activeDriver().remove({ key });
}

/** For the system-health endpoint, so which store is in use — and whether it is
 *  one that survives a deploy — is a visible fact rather than an assumption. */
function describe() {
  return activeDriver().describe();
}

module.exports = { put, get, remove, isExternal, describe, buildKey, contentHash, extensionFor, DRIVERS };
