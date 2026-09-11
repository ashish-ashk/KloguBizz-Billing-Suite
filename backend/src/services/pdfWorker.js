const { renderInvoicePdf } = require('./pdfService');

// The Piscina worker entry point: it calls this with the (already-plain,
// JSON-round-tripped) payload and structured-clones whatever it resolves to
// back to the main thread.
module.exports = renderInvoicePdf;
