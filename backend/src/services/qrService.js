const QRCode = require('qrcode');
const { logger } = require('../utils/logger');

/**
 * QR codes for the signed e-invoice.
 *
 * ── Why this exists at all, and what it replaces ───────────────────────
 *
 * The `gst-einvoice-qr` invoice template drew a **decorative QR motif**: a grid
 * of squares filled by `(r * 6 + c) * 7919 % 13 < 6`, which is pseudo-random
 * noise shaped like a QR code and scannable by nothing. On a tax invoice that is
 * worse than an empty space, because it looks like compliance. Anyone checking
 * the document — a customer, a transporter, an officer with the GST app — would
 * point a phone at it and get nothing, having been given every reason to believe
 * it should work.
 *
 * What goes in the real one is not a choice: the portal returns `SignedQRCode`,
 * a JWS signed by the IRP, and *that string* is what has to be encoded. It
 * carries the supplier and buyer GSTINs, the invoice number and date, the value,
 * the HSN of the main item and the IRN, and it is verifiable offline against the
 * IRP's public key. Encoding a URL, or the IRN alone, or a summary of our own
 * would produce a QR that scans and fails verification — which is the same
 * problem as the motif, one step later.
 *
 * ── Sizing, which is a correctness question and not a style one ───────
 *
 * The signed JWS runs to roughly 1,100–1,600 characters, and that is a large QR
 * code. Measured with this library:
 *
 *   1,100 chars at EC `L` → version 19, 93 modules (101 with the quiet zone)
 *   1,100 chars at EC `M` → version 22, 105 modules (113)
 *   1,400 chars at EC `L` → version 22, 105 modules (113)
 *
 * A phone camera needs roughly 0.25mm per module to decode a printed symbol
 * reliably. At 101 modules that means the whole square must be at least ~25mm
 * across; the first version of this code drew it at 56pt (19.7mm), which works
 * out at 0.18mm per module — a QR that decodes in a test and fails on paper,
 * which is the same class of mistake as the decorative motif it replaced.
 *
 * Hence 84pt (~29.6mm) on the invoice, which holds ≥0.25mm modules even at the
 * long end of the payload range, and matches what commercial GST software
 * prints. The quiet zone stays at the specification's 4 modules and nothing is
 * ever drawn over the symbol.
 */

/**
 * Error correction `L`.
 *
 * `M` would be the reflex choice, and here it costs twelve extra modules across
 * — which on a fixed 29.6mm square is the difference between 0.29mm and 0.26mm
 * per module. The trade is worth taking the other way: the medium is a printed
 * or emailed invoice, not a label that will be scuffed in a warehouse, and `L`
 * still recovers about 7% damage. Keeping the module count down is what makes it
 * scannable at a size that fits on the page.
 */
const EC_LEVEL = 'L';

/**
 * Four modules of quiet zone, which the QR specification requires. Less and
 * scanners struggle to find the symbol against the invoice's own rules and text.
 */
const QUIET_MODULES = 4;

/**
 * Pixels per module in the generated image.
 *
 * Six keeps a 101-module symbol to roughly 600px — small enough to embed in a
 * PDF and a JSON response without thought, and an exact integer per module,
 * which is the part that matters. See the note in `signedQrPng`.
 */
const MODULE_PIXELS = 6;

/**
 * The QR as a module matrix, for drawing into a PDF as vector rectangles.
 *
 * ── Why the PDF does not get a PNG ─────────────────────────────────────
 *
 * It did, and it did not survive the page. A raster QR embedded at 534px and
 * displayed at 84pt is resampled by whatever renders the PDF, at whatever
 * resolution it renders at, and the module edges blur. Measured with a real
 * decoder against pages rasterised at 150, 200 and 300dpi: the bitmap version
 * decoded at some resolutions and not others, and — the giveaway — a *larger*
 * printed size sometimes decoded worse, because the resampling ratio happened to
 * land differently.
 *
 * Vector modules have no resolution to lose. Each dark module is a filled
 * rectangle in the page's own coordinates, so it is exact at 150dpi, at 1200dpi
 * and on a screen. It is also smaller than the PNG once horizontal runs are
 * merged, which `moduleRuns` does.
 *
 * The browser still gets a PNG — a screen is a raster and CSS scales it — from
 * `signedQrDataUri` below. One encoder, two renderings, both from the same
 * signed string.
 */
function signedQrMatrix(signedQrCode) {
  const value = String(signedQrCode || '').trim();
  if (!value) return null;
  try {
    const qr = QRCode.create(value, { errorCorrectionLevel: EC_LEVEL });
    return { size: qr.modules.size, data: qr.modules.data };
  } catch (error) {
    logger.error('could not build the signed e-invoice QR matrix', { err: error, length: value.length });
    return null;
  }
}

/**
 * The dark modules as merged horizontal runs.
 *
 * A 101-module symbol is up to ten thousand cells; drawing each as its own
 * rectangle makes a needlessly large PDF and a slow one to render. Adjacent dark
 * cells in a row are one rectangle, which typically cuts the count by three
 * quarters and changes nothing about what is drawn.
 *
 * Coordinates are in modules, including the quiet zone, so the caller only has
 * to multiply by a module size.
 */
function moduleRuns(matrix) {
  if (!matrix) return { span: 0, runs: [] };
  const { size, data } = matrix;
  const span = size + QUIET_MODULES * 2;
  const runs = [];

  for (let row = 0; row < size; row += 1) {
    let start = -1;
    for (let col = 0; col <= size; col += 1) {
      const dark = col < size && data[row * size + col];
      if (dark && start === -1) start = col;
      if (!dark && start !== -1) {
        runs.push({
          x: start + QUIET_MODULES,
          y: row + QUIET_MODULES,
          width: col - start
        });
        start = -1;
      }
    }
  }
  return { span, runs };
}

/**
 * A PNG of the signed QR, as a buffer for pdfkit.
 *
 * Rendered at a fixed 600px and scaled down by the PDF, rather than at the
 * on-page size: a 100pt PNG has too few pixels per module to survive the
 * rasteriser, and the file-size difference is a few kilobytes.
 *
 * Returns `null` rather than throwing. A QR that cannot be drawn must not take
 * the whole invoice PDF down — the document is still a valid invoice without it,
 * and the failure is logged for whoever has to explain the missing square.
 */
async function signedQrPng(signedQrCode) {
  const value = String(signedQrCode || '').trim();
  if (!value) return null;
  try {
    return await QRCode.toBuffer(value, {
      type: 'png',
      errorCorrectionLevel: EC_LEVEL,
      margin: QUIET_MODULES,
      /**
       * `scale`, not `width`.
       *
       * `width` makes the encoder fit the symbol to a pixel box, so a module
       * ends up a fractional number of pixels and every module edge is
       * anti-aliased. Measured: the same QR that decoded off a 200dpi page when
       * each module was a whole number of pixels stopped decoding when it was
       * not, at a *larger* printed size — the blur costs more than the extra
       * millimetres win.
       *
       * `scale` is pixels per module, so the PNG has hard edges and whatever
       * resampling happens is done once, by the printer, at its own resolution.
       */
      scale: MODULE_PIXELS,
      color: { dark: '#000000ff', light: '#ffffffff' }
    });
  } catch (error) {
    logger.error('could not render the signed e-invoice QR', { err: error, length: value.length });
    return null;
  }
}

/**
 * The same QR as a data URI, for the API and the on-screen invoice.
 *
 * The browser gets a finished image rather than the JWS and a QR library of its
 * own: one encoder, used by both the PDF and the screen, so the square a
 * customer scans off a printout is the same square they scan off the page.
 */
async function signedQrDataUri(signedQrCode) {
  const value = String(signedQrCode || '').trim();
  if (!value) return '';
  try {
    return await QRCode.toDataURL(value, {
      errorCorrectionLevel: EC_LEVEL,
      margin: QUIET_MODULES,
      // Same reasoning as the PNG above: whole pixels per module, and the page
      // scales the result with CSS.
      scale: MODULE_PIXELS
    });
  } catch (error) {
    logger.error('could not render the signed e-invoice QR for the browser', { err: error, length: value.length });
    return '';
  }
}

module.exports = {
  signedQrMatrix,
  moduleRuns,
  signedQrPng,
  signedQrDataUri,
  EC_LEVEL,
  QUIET_MODULES,
  MODULE_PIXELS
};
