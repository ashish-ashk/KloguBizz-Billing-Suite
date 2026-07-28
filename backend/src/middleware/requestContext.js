const crypto = require('crypto');
const { logger } = require('../utils/logger');

/**
 * Request correlation.
 *
 * Attaches an id to every request and a logger that carries it, so the lines a
 * single request produces can be pulled back together — including the error
 * line, whose id is also returned to the client. When a tenant reports "it
 * failed at 3pm", the id in their error toast is enough to find the exact
 * request, rather than guessing from timestamps in an undifferentiated stream.
 *
 * An inbound `x-request-id` is honoured (so a proxy or a frontend retry keeps
 * one trace) but bounded and sanitised — it ends up in log lines and a response
 * header, and an unbounded caller-controlled value there is a log-injection and
 * header-splitting vector.
 */

const MAX_INBOUND_ID_LENGTH = 64;

function normaliseInboundId(value) {
  if (typeof value !== 'string') return null;
  const cleaned = value.trim().replace(/[^A-Za-z0-9._:-]/g, '');
  return cleaned ? cleaned.slice(0, MAX_INBOUND_ID_LENGTH) : null;
}

function requestContext(req, res, next) {
  req.id = normaliseInboundId(req.headers['x-request-id']) || crypto.randomUUID();
  res.setHeader('X-Request-Id', req.id);

  req.log = logger.child({ requestId: req.id });
  req.startedAt = process.hrtime.bigint();

  next();
}

// Health and readiness probes fire every few seconds on a container platform;
// logging them buries everything else.
const QUIET_PATHS = new Set(['/health', '/ready']);

/**
 * Logs one line per completed request, with the status and how long it took.
 *
 * Registered as a `finish` listener rather than wrapping `res.end`, so it
 * reports what was actually sent — including responses produced by the error
 * handler and requests the client aborted.
 */
function requestLogger(req, res, next) {
  if (QUIET_PATHS.has(req.path)) return next();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - req.startedAt) / 1e6;
    const context = {
      method: req.method,
      // `originalUrl` minus the query string: query values can carry search
      // terms and ids that don't belong in a log, and the route is what's
      // useful for spotting a slow or failing endpoint.
      path: req.originalUrl.split('?')[0],
      status: res.statusCode,
      durationMs: Math.round(durationMs * 10) / 10,
      orgId: req.orgId ? String(req.orgId) : undefined,
      userId: req.user?._id ? String(req.user._id) : undefined,
      ip: req.ip
    };

    // 5xx has already been logged with its stack by the error handler; this is
    // the access line, so it stays at warn to avoid double-reporting to Sentry.
    if (res.statusCode >= 500) req.log.warn('request failed', context);
    else if (res.statusCode >= 400) req.log.info('request rejected', context);
    else req.log.info('request', context);
  });

  next();
}

module.exports = { requestContext, requestLogger };
