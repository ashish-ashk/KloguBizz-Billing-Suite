const path = require('path');
const Piscina = require('piscina');

/**
 * Runs the same `renderInvoicePdf` from ./pdfService, but on a worker thread
 * instead of the request thread.
 *
 * pdfkit's drawing calls are synchronous, so a render used to block the whole
 * Node event loop for its full duration — one tenant generating an invoice
 * PDF stalled every other tenant's request (even a plain GET) until it
 * finished. Moving it here keeps the event loop free to keep serving
 * everyone else while the render runs.
 */
const pool = new Piscina({
  filename: path.join(__dirname, 'pdfWorker.js'),
  minThreads: 1,
  // Render's Starter tier is 0.5 vCPU — more threads than that adds
  // scheduling overhead without adding real parallelism. This pool exists to
  // stop one render from blocking the process, not to parallelize across
  // cores that aren't there; raise it via env on a box with real headroom.
  maxThreads: Number(process.env.PDF_WORKER_THREADS) || 2
});

/**
 * Mongoose documents and ObjectIds don't survive structured clone across the
 * worker boundary, so the payload takes the same JSON round-trip it would
 * already take going out over `res.json()` before crossing into the worker.
 */
async function renderInvoicePdf(payload) {
  const plain = JSON.parse(JSON.stringify(payload));
  const result = await pool.run(plain);
  return Buffer.isBuffer(result) ? result : Buffer.from(result);
}

module.exports = { renderInvoicePdf };
