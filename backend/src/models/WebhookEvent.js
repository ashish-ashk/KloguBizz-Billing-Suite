const mongoose = require('mongoose');

// Every processed provider webhook, keyed by the provider's own event id.
// Razorpay retries a delivery until it gets a 2xx, so the same event arrives
// more than once as a matter of course — without this record a retry would
// re-apply its side effects (extending a billing period twice, for example).
const webhookEventSchema = new mongoose.Schema({
  provider: { type: String, required: true, default: 'razorpay' },
  eventId: { type: String, required: true },
  event: String,
  status: { type: String, enum: ['processed', 'ignored', 'failed'], default: 'processed' },
  error: String,
  payload: mongoose.Schema.Types.Mixed
}, { timestamps: true });

webhookEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });
webhookEventSchema.index({ createdAt: -1 });

module.exports = { WebhookEvent: mongoose.model('WebhookEvent', webhookEventSchema) };
