const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { connectDatabase } = require('./src/config/database');
const { env } = require('./src/config/env');
const { errorHandler, notFoundHandler } = require('./src/middleware/errorMiddleware');

const app = express();

app.use(helmet());
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: '1mb' }));

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
app.use((req, res, next) => {
  if (req.body) req.body = stripOperators(req.body);
  if (req.query) {
    for (const key of Object.keys(req.query)) {
      if (key.startsWith('$') || typeof req.query[key] === 'object') delete req.query[key];
    }
  }
  next();
});

app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300 }));

app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'klogubizz-api', timestamp: new Date().toISOString() });
});

app.use('/api/v1/public', require('./src/routes/publicRoutes'));
app.use('/api/v1/auth', require('./src/routes/authRoutes'));
app.use('/api/v1/organisations', require('./src/routes/organisationRoutes'));
app.use('/api/v1/clients', require('./src/routes/clientRoutes'));
app.use('/api/v1/items', require('./src/routes/itemRoutes'));
app.use('/api/v1/invoices', require('./src/routes/invoiceRoutes'));
app.use('/api/v1/payments', require('./src/routes/paymentRoutes'));
app.use('/api/v1/users', require('./src/routes/userRoutes'));
app.use('/api/v1/subscriptions', require('./src/routes/subscriptionRoutes'));
app.use('/api/v1/reports', require('./src/routes/reportRoutes'));
app.use('/api/v1/superadmin', require('./src/routes/superadminRoutes'));
app.use('/api/v1/webhooks/razorpay', require('./src/routes/razorpayWebhookRoutes'));

app.use(notFoundHandler);
app.use(errorHandler);

if (require.main === module) {
  connectDatabase().then(() => {
    app.listen(env.PORT, () => {
      console.log(`KloguBizz API running on port ${env.PORT}`);
    });
  });
}

module.exports = app;
