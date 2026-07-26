function notFoundHandler(req, res, next) {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
}

function errorHandler(error, req, res, next) {
  // MongoDB duplicate-key error (e.g. an invoice number colliding with the
  // orgId+invoiceNumber unique index) — without this it falls through to a
  // raw 500 carrying the internal Mongo error string (collection/index
  // names, the offending document) straight to the client.
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || {}).filter(k => k !== 'orgId').join(', ') || 'value';
    return res.status(409).json({ message: `That ${field} is already in use.`, code: 'DUPLICATE_KEY' });
  }
  const statusCode = error.statusCode || 500;
  res.status(statusCode).json({
    message: error.message || 'Internal server error',
    code: error.code,
    details: process.env.NODE_ENV === 'production' ? undefined : error.details
  });
}

module.exports = { notFoundHandler, errorHandler };
