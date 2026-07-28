const { logger } = require('../utils/logger');

function notFoundHandler(req, res, next) {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
}

/**
 * Turns a Mongoose ValidationError into the same shape the zod layer produces,
 * so a caller gets one consistent error format regardless of which layer caught
 * the problem. Schema-level validators (the `enum`s and `required`s on the
 * models) previously surfaced as a 500 with Mongoose's own prose.
 */
function validationDetails(error) {
  return Object.values(error.errors || {}).map(field => ({
    path: field.path,
    message: field.message
  }));
}

// `next` is declared but unused on purpose: Express identifies error-handling
// middleware by its four-parameter signature.
function errorHandler(error, req, res, next) {
  const log = req.log || logger;

  // MongoDB duplicate-key error (e.g. an invoice number colliding with the
  // orgId+invoiceNumber unique index) — without this it falls through to a
  // raw 500 carrying the internal Mongo error string (collection/index
  // names, the offending document) straight to the client.
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || {}).filter(k => k !== 'orgId').join(', ') || 'value';
    return res.status(409).json({ message: `That ${field} is already in use.`, code: 'DUPLICATE_KEY', requestId: req.id });
  }

  // A malformed ObjectId in a path parameter is a client mistake, not a server
  // fault — it used to produce a 500.
  if (error.name === 'CastError') {
    return res.status(400).json({ message: `${error.path} is not a valid id.`, code: 'INVALID_ID', requestId: req.id });
  }

  if (error.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Some of the values sent are not valid.',
      code: 'VALIDATION_FAILED',
      details: validationDetails(error),
      requestId: req.id
    });
  }

  const statusCode = error.statusCode || 500;
  const isServerFault = statusCode >= 500;

  // Only server faults are logged with a stack — a 404 or a rejected login is
  // expected traffic, and logging those at error level makes the real failures
  // impossible to find (and, once an error reporter is wired up, drowns it).
  if (isServerFault) {
    log.error('unhandled request error', {
      err: error,
      method: req.method,
      path: req.originalUrl.split('?')[0],
      orgId: req.orgId ? String(req.orgId) : undefined,
      userId: req.user?._id ? String(req.user._id) : undefined
    });
  } else {
    log.debug('request error', { status: statusCode, message: error.message, code: error.code });
  }

  res.status(statusCode).json({
    // A 5xx message is an internal detail (a Mongoose message, a driver string,
    // a file path) and is not safe to hand to a caller in production. 4xx
    // messages are written for the user and are returned as-is.
    message: isServerFault && process.env.NODE_ENV === 'production'
      ? 'Something went wrong on our side. Please try again.'
      : (error.message || 'Internal server error'),
    code: error.code,
    details: process.env.NODE_ENV === 'production' ? undefined : error.details,
    // Echoed so a user can quote it in a support request and it can be found in
    // the logs directly.
    requestId: req.id
  });
}

module.exports = { notFoundHandler, errorHandler };
