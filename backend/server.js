const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { connectDatabase } = require('./src/config/database');
const { env, assertSecureConfig } = require('./src/config/env');
const { errorHandler, notFoundHandler } = require('./src/middleware/errorMiddleware');
const { requestContext, requestLogger } = require('./src/middleware/requestContext');
const { logger } = require('./src/utils/logger');

// Refuse to boot a production deployment that is still running on the dev
// defaults committed to this repo. Done before anything else so the process
// dies before it can accept a single request.
assertSecureConfig();

const app = express();

// `req.ip` is otherwise the proxy's address on Render/Vercel/any load balancer,
// which quietly breaks both the per-IP rate limiter (every request appears to
// come from one address, so one abusive client can lock everyone out) and the
// IP recorded in the logs. Trusting one hop is the correct setting for a single
// platform proxy — trusting all of them would let a client spoof
// X-Forwarded-For and evade the limiter entirely.
app.set('trust proxy', 1);

app.use(helmet());

// First in the chain: everything after this — including the error handler — can
// rely on `req.id` and `req.log` existing.
app.use(requestContext);
app.use(requestLogger);

// Multiple origins are supported (apex + www, custom domains, previews) —
// see env.FRONTEND_URLS. Requests with no Origin header (server-to-server,
// curl, health checks) are allowed through; browsers always send one.
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || env.FRONTEND_URLS.includes(origin.replace(/\/$/, ''))) return callback(null, true);
    return callback(new Error(`Origin ${origin} is not allowed by CORS`));
  },
  credentials: true
}));

app.use(express.json({
  limit: '1mb',
  // Razorpay signs the exact bytes it sent, so the webhook handler cannot use
  // the parsed body (key order and whitespace differ after a JSON round-trip).
  // Capturing the buffer here means the webhook route gets the real payload
  // without having to be mounted ahead of this parser.
  verify: (req, res, buf) => { req.rawBody = buf; }
}));

// Strip MongoDB operator keys ($gt, $where, dotted paths...) from user input
// to block NoSQL injection.
function stripOperators(value) {
  if (Array.isArray(value)) return value.map(stripOperators);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !key.startsWith('$') && !key.includes('.'))
        .map(([key, val]) => [key, stripOperators(val)])
    );
  }
  return value;
}

// Fields no request may ever set. `orgId` is the tenant isolation boundary and
// is always derived from the authenticated token — accepting it from a body
// would let an update move a record into another tenant. `_id`/`__v` are
// Mongo-managed. Controllers additionally allowlist their own fields
// (see utils/pickFields.js); this is the blanket layer under that so a future
// controller cannot reintroduce the hole by spreading req.body.
const FORBIDDEN_BODY_KEYS = ['orgId', '_id', '__v'];
function stripForbidden(value) {
  if (Array.isArray(value)) return value.map(stripForbidden);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !FORBIDDEN_BODY_KEYS.includes(key))
        .map(([key, val]) => [key, stripForbidden(val)])
    );
  }
  return value;
}

app.use((req, res, next) => {
  if (req.body) req.body = stripForbidden(stripOperators(req.body));
  if (req.query) {
    for (const key of Object.keys(req.query)) {
      if (key.startsWith('$') || typeof req.query[key] === 'object') delete req.query[key];
    }
  }
  next();
});

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  skip: require('./src/middleware/rateLimitOptions').skipRateLimitInTests
}));

// Liveness: the process is up. Deliberately does not touch the database so a
// transient DB blip doesn't get the container killed and restarted.
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'klogubizz-api', timestamp: new Date().toISOString() });
});

// Readiness: can this instance actually serve requests? Returns 503 when
// Mongo is not connected, so a load balancer takes it out of rotation instead
// of routing traffic to an instance that 500s on every query.
app.get('/ready', (req, res) => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const state = states[mongoose.connection.readyState] || 'unknown';
  const ready = mongoose.connection.readyState === 1;
  res.status(ready ? 200 : 503).json({
    status: ready ? 'READY' : 'NOT_READY',
    database: state,
    timestamp: new Date().toISOString()
  });
});

app.use('/api/v1/public', require('./src/routes/publicRoutes'));
// Branding images, served as cacheable resources rather than base64 inside every
// JSON payload. See services/brandingAssetService.js.
app.use('/api/v1/assets', require('./src/routes/assetRoutes'));
app.use('/api/v1/auth', require('./src/routes/authRoutes'));
app.use('/api/v1/organisations', require('./src/routes/organisationRoutes'));
app.use('/api/v1/clients', require('./src/routes/clientRoutes'));
app.use('/api/v1/items', require('./src/routes/itemRoutes'));
app.use('/api/v1/invoices', require('./src/routes/invoiceRoutes'));
app.use('/api/v1/payments', require('./src/routes/paymentRoutes'));
app.use('/api/v1/credit-notes', require('./src/routes/creditNoteRoutes'));
// Quotations, proforma invoices and delivery challans — the pre-invoice
// documents. None of them is a tax invoice; see models/SalesDocument.js.
app.use('/api/v1/sales-documents', require('./src/routes/salesDocumentRoutes'));
// Standing instructions that raise an invoice on a schedule. What they produce
// are ordinary tax invoices; see models/RecurringInvoice.js.
app.use('/api/v1/recurring-invoices', require('./src/routes/recurringInvoiceRoutes'));
app.use('/api/v1/users', require('./src/routes/userRoutes'));
app.use('/api/v1/subscriptions', require('./src/routes/subscriptionRoutes'));
app.use('/api/v1/reports', require('./src/routes/reportRoutes'));
// Purchases, vendors and the ITC register — the inward half of the ledger,
// without which there is no input tax credit and no net GST liability.
app.use('/api/v1/purchases', require('./src/routes/purchaseRoutes'));
app.use('/api/v1/superadmin', require('./src/routes/superadminRoutes'));
app.use('/api/v1/webhooks/razorpay', require('./src/routes/razorpayWebhookRoutes'));
// SendGrid delivery events (bounces, complaints, opens). Authenticated by a shared
// secret — an open endpoint that writes delivery state and suppresses addresses is
// one anyone could use to stop a competitor's mail.
app.use('/api/v1/webhooks/sendgrid', require('./src/routes/sendgridWebhookRoutes'));

app.use(notFoundHandler);
app.use(errorHandler);

if (require.main === module) {
  connectDatabase()
    .then(() => {
      const server = app.listen(env.PORT, () => {
        logger.info('KloguBizz API listening', { port: env.PORT, env: process.env.NODE_ENV || 'development' });
      });

      // Automated payment reminders. Previously the reminder schedule was
      // configurable in the super-admin panel but no job ever ran it, so no
      // scheduled reminder was ever sent.
      require('./src/services/reminderService').startReminderScheduler();

      // Housekeeping that used to run as a write on every single read: ageing
      // pending invoices into 'overdue'. See services/maintenanceService.js.
      require('./src/services/maintenanceService').startMaintenanceScheduler();

      // Rolls raw usage events up into one permanent row per day, which is what
      // the platform console's trend charts read. Without it every chart would
      // aggregate the highest-volume collection in the database on each page
      // view. See services/metricsService.js.
      require('./src/services/metricsService').startMetricsScheduler();

      // Render (and any container platform) sends SIGTERM before replacing an
      // instance. Without this the process is killed mid-request, dropping
      // in-flight work and leaving Mongo sockets to time out.
      const shutdown = signal => async () => {
        logger.info('shutting down gracefully', { signal });
        server.close(async () => {
          await mongoose.connection.close().catch(() => {});
          process.exit(0);
        });
        // Don't hang forever on a stuck connection.
        setTimeout(() => process.exit(1), 10000).unref();
      };
      process.on('SIGTERM', shutdown('SIGTERM'));
      process.on('SIGINT', shutdown('SIGINT'));

      // A rejected promise or a thrown error outside a request would otherwise
      // print an unstructured warning (or, for uncaughtException, leave the
      // process in an undefined state) and never reach an error reporter.
      process.on('unhandledRejection', reason => {
        logger.error('unhandled promise rejection', { err: reason instanceof Error ? reason : new Error(String(reason)) });
      });
      process.on('uncaughtException', error => {
        logger.error('uncaught exception — exiting', { err: error });
        // State is no longer trustworthy after an uncaught throw; let the
        // platform restart a clean process rather than serving from a
        // half-broken one.
        process.exit(1);
      });
    })
    .catch(error => {
      logger.error('failed to start KloguBizz API', { err: error });
      process.exit(1);
    });
}

module.exports = app;
