/**
 * Structured logging.
 *
 * The backend previously logged with bare `console.log` / `console.error`, which
 * means: no levels (so you cannot turn the noise down in production or up while
 * debugging), no timestamps, no request correlation, and — the one that actually
 * costs you an incident — no way to tell which tenant or which request a line
 * belongs to. A 500 in the Render log was a stack trace with nothing attached to
 * it.
 *
 * This is a deliberately small, dependency-free implementation rather than pino.
 * It emits one JSON object per line, which is what every log aggregator
 * (Render's own, CloudWatch, Loki, Datadog) parses natively, and it keeps a
 * human-readable format for local development where JSON lines are unpleasant to
 * read.
 *
 * Error tracking (Sentry et al.) hooks in through `onError` rather than being
 * wired in directly — the reporter is injected at boot, so this module stays
 * free of a network dependency and the tests stay offline.
 */

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 };

function resolveLevel() {
  const configured = String(process.env.LOG_LEVEL || '').toLowerCase();
  if (LEVELS[configured]) return configured;
  // Tests are silent unless something goes wrong, so a passing suite has clean
  // output; production defaults to info.
  if (process.env.NODE_ENV === 'test') return 'error';
  return 'info';
}

let threshold = LEVELS[resolveLevel()];
// JSON in production (machine-parsed), pretty in development (human-read).
let asJson = process.env.NODE_ENV === 'production' || process.env.LOG_FORMAT === 'json';

// Optional external error reporter, installed at boot. Kept as a plain callback
// so nothing here depends on a specific vendor.
let errorReporter = null;

function setErrorReporter(reporter) {
  errorReporter = typeof reporter === 'function' ? reporter : null;
}

/**
 * Fields that must never reach a log line, wherever they appear in the payload.
 * A logged password hash or JWT is a credential leak into a system that is
 * usually retained for months and read by more people than the database is.
 */
const REDACTED_KEYS = new Set([
  'password', 'newpassword', 'currentpassword', 'passwordhash',
  'token', 'accesstoken', 'refreshtoken', 'invitetoken', 'resettoken',
  'authorization', 'cookie', 'secret', 'signature',
  // Base64 logo/letterhead data URIs — hundreds of kilobytes that would
  // otherwise be copied verbatim into every log line that touches an org.
  'logourl', 'headerimageurl'
]);

function redact(value, depth = 0) {
  if (depth > 6 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.slice(0, 50).map(item => redact(item, depth + 1));
  const out = {};
  for (const [key, val] of Object.entries(value)) {
    out[key] = REDACTED_KEYS.has(key.toLowerCase()) ? '[redacted]' : redact(val, depth + 1);
  }
  return out;
}

/**
 * Serialises an Error properly. `JSON.stringify(error)` yields `{}` because
 * `message` and `stack` are non-enumerable — which is how stack traces quietly
 * vanish from structured logs.
 */
function serialiseError(error) {
  if (!(error instanceof Error)) return error;
  return {
    name: error.name,
    message: error.message,
    code: error.code,
    status: error.status,
    stack: error.stack
  };
}

function write(level, message, context = {}) {
  if (LEVELS[level] < threshold) return;

  const { err, ...rest } = context;
  const entry = {
    level,
    time: new Date().toISOString(),
    msg: message,
    ...redact(rest)
  };
  if (err) entry.err = serialiseError(err);

  const stream = LEVELS[level] >= LEVELS.warn ? process.stderr : process.stdout;

  if (asJson) {
    stream.write(`${JSON.stringify(entry)}\n`);
  } else {
    const tag = level.toUpperCase().padEnd(5);
    const extras = Object.keys(rest).length ? ` ${JSON.stringify(redact(rest))}` : '';
    const stack = err ? `\n${serialiseError(err).stack || serialiseError(err).message}` : '';
    stream.write(`${tag} ${entry.time} ${message}${extras}${stack}\n`);
  }

  // Report after logging, never instead of it — a failing reporter must not
  // swallow the line or take the request down with it.
  if (level === 'error' && errorReporter) {
    try {
      errorReporter(err instanceof Error ? err : new Error(message), entry);
    } catch (reporterError) {
      process.stderr.write(`error reporter threw: ${reporterError.message}\n`);
    }
  }
}

const logger = {
  debug: (message, context) => write('debug', message, context),
  info: (message, context) => write('info', message, context),
  warn: (message, context) => write('warn', message, context),
  error: (message, context) => write('error', message, context),

  /**
   * A logger that carries fixed fields — used per request so every line for a
   * request is stamped with its id, the tenant and the actor without each call
   * site having to remember to pass them.
   */
  child(bindings = {}) {
    const merge = context => ({ ...bindings, ...context });
    return {
      debug: (message, context) => write('debug', message, merge(context)),
      info: (message, context) => write('info', message, merge(context)),
      warn: (message, context) => write('warn', message, merge(context)),
      error: (message, context) => write('error', message, merge(context)),
      child: (extra = {}) => logger.child({ ...bindings, ...extra })
    };
  },

  setLevel(level) {
    if (LEVELS[level]) threshold = LEVELS[level];
  },
  setFormat(format) {
    asJson = format === 'json';
  },
  setErrorReporter
};

module.exports = { logger, setErrorReporter, LEVELS };
