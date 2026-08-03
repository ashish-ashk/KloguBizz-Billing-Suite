/**
 * Image storage and the resize pipeline (#45's object-storage half).
 *
 * Two things are under test, and they are independent on purpose:
 *
 *  1. **Resizing**, which happens on every upload regardless of where the bytes
 *     end up. This is where most of #45's benefit lands even with no bucket
 *     configured — the phone photo someone uploads as a logo stops being four
 *     megabytes inside a Mongo document.
 *  2. **The storage seam**, i.e. that an image written through the local driver
 *     comes back byte-identical, that keys are content-addressed, and that a
 *     document mid-migration (key *and* legacy data URI) still resolves.
 *
 * The S3 driver is deliberately not exercised here: there are no credentials in
 * this environment, and a mocked S3 would only prove the mock works. What is
 * tested is the seam it plugs into, which is the part this codebase owns.
 *
 * `STORAGE_DRIVER` is set per-test by reassigning `env` — the driver is selected
 * on every call rather than cached at require time, precisely so this is
 * possible without re-requiring the module graph.
 */
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/klogubizz_storage_test';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_used_only_by_the_storage_suite';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const mongoose = require('mongoose');

const { env } = require('../src/config/env');

// A throwaway directory for the local driver, set before anything reads env.
const uploadsDir = path.join(os.tmpdir(), `klogubizz-storage-test-${process.pid}`);
env.STORAGE_LOCAL_DIR = uploadsDir;

const storage = require('../src/services/storageService');
const { normaliseImage, describe: describeImages } = require('../src/services/imageService');
const { storeImage, resolveImage, versionOf } = require('../src/services/brandingAssetService');
const { Organisation } = require('../src/models/Organisation');
const { Plan } = require('../src/models/Plan');
const app = require('../server');

let server;
let baseUrl;
let dbAvailable = false;
const originalDriver = env.STORAGE_DRIVER;

/** A real PNG, generated rather than committed — deterministic and no fixture file. */
async function makePng({ width = 40, height = 40 } = {}) {
  const sharp = require('sharp');
  return sharp({ create: { width, height, channels: 4, background: { r: 12, g: 200, b: 90, alpha: 1 } } })
    .png()
    .toBuffer();
}

async function makeJpeg({ width = 40, height = 40 } = {}) {
  const sharp = require('sharp');
  return sharp({ create: { width, height, channels: 3, background: { r: 200, g: 30, b: 30 } } })
    .jpeg()
    .toBuffer();
}

function toDataUri(buffer, contentType) {
  return `data:${contentType};base64,${buffer.toString('base64')}`;
}

test.before(async () => {
  await fs.mkdir(uploadsDir, { recursive: true });
  try {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 2000 });
    dbAvailable = true;
  } catch {
    console.warn('\n[storage] No MongoDB on 127.0.0.1:27017 — DB-backed cases will skip.\n');
    return;
  }
  await mongoose.connection.dropDatabase();
  await Plan.create([{ code: 'starter', name: 'Starter', monthlyPrice: 0, yearlyPrice: 0, userLimit: 5, invoiceLimit: 50, sortOrder: 0 }]);
  server = app.listen(0);
  await new Promise(resolve => { server.once('listening', resolve); });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  env.STORAGE_DRIVER = originalDriver;
  await fs.rm(uploadsDir, { recursive: true, force: true }).catch(() => {});
  if (!dbAvailable) return;
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await new Promise(resolve => { server.close(resolve); });
});

const maybe = fn => async t => {
  if (!dbAvailable) return t.skip('MongoDB not available');
  return fn(t);
};

// ── The resize pipeline ──────────────────────────

test('an oversized upload is resized within its profile, preserving aspect ratio', async () => {
  if (!describeImages().available) return;
  // 3000x2000 is an ordinary phone photo, and an ordinary thing to upload as a logo.
  const source = await makePng({ width: 3000, height: 2000 });
  const result = await normaliseImage({ buffer: source, contentType: 'image/png', kind: 'logo' });

  assert.equal(result.processed, true);
  assert.ok(result.bytesOut < result.bytesIn, 'the resized image should be smaller');
  // The `logo` profile is 600x600 with fit:inside — so the wider side is capped
  // and the ratio survives rather than the image being squashed to a square.
  assert.ok(result.width <= 600 && result.height <= 600, `expected <=600x600, got ${result.width}x${result.height}`);
  assert.equal(result.width, 600);
  assert.equal(result.height, 400, '3:2 in, 3:2 out');
});

test('a small image is never upscaled', async () => {
  if (!describeImages().available) return;
  const source = await makePng({ width: 40, height: 40 });
  const result = await normaliseImage({ buffer: source, contentType: 'image/png', kind: 'logo' });
  assert.equal(result.width, 40, 'withoutEnlargement — a 40px logo stays 40px rather than being blown up');
  assert.equal(result.height, 40);
});

test('transparency survives a resize', async () => {
  if (!describeImages().available) return;
  const sharp = require('sharp');
  const transparent = await sharp({ create: { width: 800, height: 800, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .png().toBuffer();
  const result = await normaliseImage({ buffer: transparent, contentType: 'image/png', kind: 'logo' });
  const meta = await sharp(result.buffer).metadata();
  // A logo flattened onto white is unusable on any template with a tinted or
  // dark header panel, so alpha has to be kept.
  assert.equal(result.contentType, 'image/png');
  assert.equal(meta.hasAlpha, true);
});

test('a JPEG stays a JPEG, and an SVG is passed through untouched', async () => {
  if (!describeImages().available) return;
  const jpeg = await normaliseImage({ buffer: await makeJpeg({ width: 900, height: 900 }), contentType: 'image/jpeg', kind: 'logo' });
  assert.equal(jpeg.contentType, 'image/jpeg');
  assert.equal(jpeg.processed, true);

  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>');
  const out = await normaliseImage({ buffer: svg, contentType: 'image/svg+xml', kind: 'logo' });
  // Rasterising an SVG would throw away the one property that makes it worth
  // using, and it is already tiny.
  assert.equal(out.processed, false);
  assert.equal(out.reason, 'svg-passthrough');
  assert.deepEqual(out.buffer, svg);
});

test('something that is not an image is stored as sent rather than throwing', async () => {
  const junk = Buffer.from('this is definitely not a PNG');
  const result = await normaliseImage({ buffer: junk, contentType: 'image/png', kind: 'logo' });
  // A corrupt upload must fail where it is *rendered*, with the surrounding
  // document intact — not by taking down the save.
  assert.equal(result.processed, false);
  assert.deepEqual(result.buffer, junk);
});

// ── The storage seam ─────────────────────────────

test('the inline driver is the default, and reports itself as not external', () => {
  env.STORAGE_DRIVER = 'inline';
  assert.equal(storage.isExternal(), false);
  assert.equal(storage.describe().driver, 'inline');
});

test('an unrecognised driver falls back to inline rather than crashing', () => {
  env.STORAGE_DRIVER = 'gopher';
  assert.equal(storage.isExternal(), false, 'a typo in STORAGE_DRIVER must not take the app down');
  assert.equal(storage.describe().driver, 'inline');
});

test('the local driver round-trips bytes and content-addresses the key', async () => {
  env.STORAGE_DRIVER = 'local';
  const png = await makePng();

  const first = await storage.put({ scope: 'org/abc', kind: 'logo', buffer: png, contentType: 'image/png' });
  assert.match(first.key, /^org\/abc\/logo\/[0-9a-f]{16}\.png$/);

  const read = await storage.get(first.key);
  assert.deepEqual(read.buffer, png, 'what comes back must be byte-identical to what went in');

  // Content-addressed: the same bytes cannot produce a second object.
  const again = await storage.put({ scope: 'org/abc', kind: 'logo', buffer: png, contentType: 'image/png' });
  assert.equal(again.key, first.key);
  assert.equal(again.reused, true);

  // Different bytes, different key — which is what makes the immutable
  // year-long cache policy on the asset route safe.
  const other = await storage.put({ scope: 'org/abc', kind: 'logo', buffer: await makePng({ width: 41, height: 41 }), contentType: 'image/png' });
  assert.notEqual(other.key, first.key);

  assert.equal(await storage.remove(first.key), true);
  assert.equal(await storage.get(first.key), null, 'a removed object reads as absent, not as an error');
});

test('a key cannot escape the storage root', async () => {
  env.STORAGE_DRIVER = 'local';
  // buildKey sanitises, but this is the check that still holds if a key ever
  // arrives from a stored document or a migration instead.
  await assert.rejects(
    () => storage.get('../../../../etc/passwd').then(r => { if (r === null) throw new Error('Refusing'); }),
    /Refusing|ENOENT/,
    'traversal must not resolve outside the root'
  );
  const key = storage.buildKey({ scope: '../../evil', kind: 'logo', buffer: Buffer.from('x'), contentType: 'image/png' });
  assert.ok(!key.includes('..'), `sanitised key should not contain traversal: ${key}`);
});

test('reading falls back to the legacy data URI when a key resolves to nothing', async () => {
  env.STORAGE_DRIVER = 'local';
  const png = await makePng();
  const resolved = await resolveImage({
    key: 'org/missing/logo/0000000000000000.png',
    dataUri: toDataUri(png, 'image/png')
  });
  // This is the shape of a half-completed migration, or an S3 blip. An
  // older-but-present logo beats a blank one.
  assert.ok(resolved, 'should not resolve to null when a usable data URI is present');
  assert.deepEqual(resolved.buffer, png);
});

test('the key wins over the legacy data URI when both are present', async () => {
  env.STORAGE_DRIVER = 'local';
  const stored = await makePng({ width: 60, height: 60 });
  const legacy = await makePng({ width: 61, height: 61 });
  const put = await storage.put({ scope: 'org/pref', kind: 'logo', buffer: stored, contentType: 'image/png' });

  const resolved = await resolveImage({ key: put.key, dataUri: toDataUri(legacy, 'image/png') });
  assert.deepEqual(resolved.buffer, stored, 'the migrated copy is the current one');
  // The version comes from the key's own content hash rather than a hash of the
  // key string, so it is stable across any future change to the key format.
  assert.equal(resolved.version, versionOf({ key: put.key }));
  assert.match(resolved.version, /^[0-9a-f]{16}$/);
});

test('storeImage keeps bytes inline with no external store, and moves them out with one', async () => {
  const png = await makePng({ width: 900, height: 900 });
  const dataUri = toDataUri(png, 'image/png');

  env.STORAGE_DRIVER = 'inline';
  const inline = await storeImage({ scope: 'org/xyz', kind: 'logo', dataUri });
  assert.equal(inline.key, '', 'nothing is stored externally');
  assert.match(inline.dataUri, /^data:image\/png;base64,/);
  if (describeImages().available) {
    // Still resized — the whole point of doing the work even with no bucket.
    assert.ok(inline.bytesOut < inline.bytesIn, 'the inline copy is the resized one');
  }

  env.STORAGE_DRIVER = 'local';
  const external = await storeImage({ scope: 'org/xyz', kind: 'logo', dataUri });
  assert.match(external.key, /^org\/xyz\/logo\/[0-9a-f]{16}\.png$/);
  assert.equal(external.dataUri, '', 'the inline field is cleared so the two cannot disagree');
  assert.ok((await storage.get(external.key)).buffer.length > 0);
});

test('an explicit removal clears both fields through the same path', async () => {
  env.STORAGE_DRIVER = 'local';
  const removed = await storeImage({ scope: 'org/xyz', kind: 'logo', dataUri: '' });
  // Every call site clears both with the code that sets them; the alternative is
  // one of them forgetting, and a "removed" logo that keeps rendering.
  assert.deepEqual({ key: removed.key, dataUri: removed.dataUri }, { key: '', dataUri: '' });
  assert.equal(removed.removed, true);
});

// ── End to end, through the HTTP layer ───────────

test('an uploaded logo is resized, stored externally, and served from the asset route', maybe(async () => {
  env.STORAGE_DRIVER = 'local';
  const big = await makePng({ width: 2400, height: 2400 });
  const org = await Organisation.create({ name: 'Storage Co', adminEmail: 'a@storage.test', stateCode: '27', status: 'active' });

  const placed = await storeImage({ scope: `org/${org._id}`, kind: 'logo', dataUri: toDataUri(big, 'image/png') });
  await Organisation.updateOne({ _id: org._id }, { $set: { 'brandingConfig.logoKey': placed.key, 'brandingConfig.logoUrl': '' } });

  const version = versionOf({ key: placed.key });
  const res = await fetch(`${baseUrl}/api/v1/assets/org/${org._id}/logo?v=${version}`);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'image/png');
  // The URL carries the content hash, so a cached copy can never be the wrong one.
  assert.match(res.headers.get('cache-control'), /immutable/);
  assert.equal(res.headers.get('etag'), `"${version}"`);
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');

  const bytes = Buffer.from(await res.arrayBuffer());
  assert.ok(bytes.length > 0);
  if (describeImages().available) {
    assert.ok(bytes.length < big.length, 'the served image is the resized one, not the upload');
  }

  // A conditional request still short-circuits.
  const cached = await fetch(`${baseUrl}/api/v1/assets/org/${org._id}/logo?v=${version}`, {
    headers: { 'If-None-Match': `"${version}"` }
  });
  assert.equal(cached.status, 304);
}));

test('a legacy inline logo is still served after the storage driver is switched on', maybe(async () => {
  env.STORAGE_DRIVER = 'local';
  const png = await makePng({ width: 120, height: 120 });
  // A document that predates migration 007: data URI only, no key.
  const org = await Organisation.create({
    name: 'Legacy Storage Co',
    adminEmail: 'b@storage.test',
    stateCode: '27',
    status: 'active',
    brandingConfig: { logoUrl: toDataUri(png, 'image/png') }
  });

  const res = await fetch(`${baseUrl}/api/v1/assets/org/${org._id}/logo`);
  assert.equal(res.status, 200, 'an un-migrated tenant must not lose its logo the moment a bucket is configured');
  assert.deepEqual(Buffer.from(await res.arrayBuffer()), png);
}));

test('an SVG asset is served with the headers that stop it being treated as a page', maybe(async () => {
  env.STORAGE_DRIVER = 'inline';
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8"/></svg>');
  const org = await Organisation.create({
    name: 'Svg Co',
    adminEmail: 'c@storage.test',
    stateCode: '27',
    status: 'active',
    brandingConfig: { logoUrl: toDataUri(svg, 'image/svg+xml') }
  });

  const res = await fetch(`${baseUrl}/api/v1/assets/org/${org._id}/logo`);
  assert.equal(res.status, 200);
  // An SVG is the one image type that is also a document — rendered as a
  // top-level page it can execute script on this origin.
  assert.equal(res.headers.get('content-disposition'), 'attachment');
  assert.match(res.headers.get('content-security-policy'), /sandbox/);
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
}));

test('a missing image is a 404 rather than an empty 200', maybe(async () => {
  const org = await Organisation.create({ name: 'No Logo Co', adminEmail: 'd@storage.test', stateCode: '27', status: 'active' });
  assert.equal((await fetch(`${baseUrl}/api/v1/assets/org/${org._id}/logo`)).status, 404);
  assert.equal((await fetch(`${baseUrl}/api/v1/assets/org/${org._id}/nonsense`)).status, 404);
}));
