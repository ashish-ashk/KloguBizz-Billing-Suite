const { logger } = require('../utils/logger');

/**
 * Normalises and resizes uploaded branding images (#45's resize half).
 *
 * The uploader caps a logo at 500KB in the browser, which is a courtesy rather
 * than a control — the API is reachable directly — and 500KB is in any case far
 * more than a logo needs. What actually arrives is whatever the customer had to
 * hand: frequently a photo straight off a phone, several megapixels of JPEG
 * carrying an EXIF orientation flag, uploaded as a "logo" that renders 40pt
 * wide on an invoice.
 *
 * So every upload is re-encoded here rather than stored as sent:
 *
 *  - **Bounded dimensions.** Each kind has a ceiling sized to what actually
 *    renders it (see `PROFILES`), with `fit: 'inside'` + `withoutEnlargement`
 *    so aspect ratio survives and a small image is never upscaled into
 *    blurriness.
 *  - **EXIF orientation applied, then stripped.** `.rotate()` with no argument
 *    bakes in the orientation flag. Without it, a phone photo that looks
 *    upright in the browser (which honours the flag) prints sideways in the
 *    PDF, because pdfkit does not. The metadata then goes, which also drops any
 *    GPS coordinates the customer did not mean to publish on every invoice.
 *  - **Format kept, except SVG.** PNG stays PNG (logos need transparency),
 *    JPEG stays JPEG. SVG is passed through untouched — it is already small
 *    and rasterising it would throw away the one property that makes it worth
 *    using — see the note on why that is safe below.
 *
 * `sharp` is a native module. If it fails to load — a platform with no prebuilt
 * binary, an install that skipped optional deps — this module degrades to a
 * documented passthrough rather than taking down every upload path with it. A
 * slightly-too-large logo is a much smaller problem than an app that cannot
 * save branding at all, and `describe()` reports which mode is in effect so the
 * console can say so out loud instead of it being invisible.
 */

let sharp = null;
let sharpLoadError = null;
try {
  sharp = require('sharp');
} catch (error) {
  sharpLoadError = error.message;
  logger.warn('sharp is unavailable — uploaded images will be stored as sent', { err: error });
}

/**
 * Per-kind ceilings, each sized to the largest place the image is actually
 * drawn rather than to a single global number.
 *
 * `header` is a full-width letterhead across an A4 page, so it gets the most
 * pixels; a `logo` renders at most a couple of centimetres; a `signature` is
 * drawn into a 145x30pt box by pdfService and never needs more.
 */
const PROFILES = {
  logo: { width: 600, height: 600 },
  header: { width: 1600, height: 400 },
  signature: { width: 600, height: 200 },
  favicon: { width: 180, height: 180 }
};

const DEFAULT_PROFILE = PROFILES.logo;

/**
 * SVG is deliberately not rasterised.
 *
 * It is already a few kilobytes, it is the one format that stays sharp at any
 * size, and re-encoding it to PNG would silently downgrade the customer's
 * logo. It is passed through as-is — which is safe *here* because these images
 * are only ever sent with an `image/svg+xml` content type from an endpoint that
 * serves nothing else, never interpreted as a document; an SVG rendered as a
 * page could carry script, which is why the asset route sets a restrictive
 * content type and `Content-Disposition` rather than trusting the extension.
 */
function isSvg(contentType) {
  return String(contentType || '').toLowerCase().includes('svg');
}

function profileFor(kind) {
  return PROFILES[kind] || DEFAULT_PROFILE;
}

/**
 * Re-encodes one image.
 *
 * Returns `{ buffer, contentType, width, height, bytesIn, bytesOut, processed }`.
 * `processed: false` means the bytes came back untouched — either sharp is
 * unavailable, the input is an SVG, or the re-encode failed — and the caller
 * stores what it was given. It is never an error: a corrupt or exotic upload
 * should fail at the point it is *rendered*, with the surrounding document
 * still intact, exactly as pdfService already handles a bad image.
 */
async function normaliseImage({ buffer, contentType, kind }) {
  const bytesIn = buffer?.length || 0;
  const untouched = { buffer, contentType, bytesIn, bytesOut: bytesIn, processed: false };

  if (!buffer?.length) return untouched;
  if (!sharp) return { ...untouched, reason: 'sharp-unavailable' };
  if (isSvg(contentType)) return { ...untouched, reason: 'svg-passthrough' };

  const { width, height } = profileFor(kind);
  try {
    const pipeline = sharp(buffer, { failOn: 'none' })
      // No argument: apply the EXIF orientation flag rather than a fixed angle.
      .rotate()
      .resize({ width, height, fit: 'inside', withoutEnlargement: true });

    const meta = await sharp(buffer, { failOn: 'none' }).metadata();
    // Transparency has to survive — a logo flattened onto white is unusable on
    // any template with a tinted or dark header panel.
    const keepAlpha = meta.hasAlpha || meta.format === 'png' || meta.format === 'gif';
    const out = keepAlpha
      ? await pipeline.png({ compressionLevel: 9, palette: true }).toBuffer()
      : await pipeline.jpeg({ quality: 82, mozjpeg: true }).toBuffer();

    const outMeta = await sharp(out).metadata();
    return {
      buffer: out,
      contentType: keepAlpha ? 'image/png' : 'image/jpeg',
      width: outMeta.width,
      height: outMeta.height,
      bytesIn,
      bytesOut: out.length,
      processed: true
    };
  } catch (error) {
    // A file that is not really an image, or one sharp cannot decode. Stored as
    // sent; the render path already tolerates an undecodable image.
    logger.warn('image normalisation failed — storing as uploaded', { kind, err: error });
    return { ...untouched, reason: 'decode-failed' };
  }
}

/** Reported by the system-health endpoint so "images are not being resized" is
 *  visible rather than something you discover from a 4MB invoice. */
function describe() {
  return {
    available: Boolean(sharp),
    error: sharpLoadError,
    profiles: PROFILES
  };
}

module.exports = { normaliseImage, describe, PROFILES, isSvg };
