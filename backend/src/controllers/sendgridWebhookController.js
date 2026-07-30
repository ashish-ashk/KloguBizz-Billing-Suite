const crypto = require('crypto');
const { env } = require('../config/env');
const { EmailLog, Suppression } = require('../models/EmailLog');
const { asyncHandler } = require('../utils/asyncHandler');
const { httpError } = require('../utils/httpError');
const { logger } = require('../utils/logger');

/**
 * Ingests SendGrid's event webhook (#58's asynchronous half).
 *
 * The immediate provider response only says "accepted for delivery". Everything that
 * actually matters — delivered, bounced, marked as spam, dropped — arrives later, out
 * of band, and without ingesting it the product cannot tell a delivered reminder from
 * one that bounced two seconds after being accepted.
 *
 * **Authentication is mandatory.** An unauthenticated endpoint that writes delivery
 * state and adds addresses to a suppression list is an endpoint anyone can use to stop
 * a competitor's mail: post a fabricated `bounce` event for their address and the
 * platform stops sending to it. So a missing or wrong secret is a 401, and a webhook
 * with no secret configured is refused outright rather than left open.
 */

/** Events that mean "stop sending to this address". */
const SUPPRESSING_EVENTS = {
  bounce: 'bounce',
  dropped: 'bounce',
  spamreport: 'spam-complaint',
  unsubscribe: 'unsubscribe',
  group_unsubscribe: 'unsubscribe'
};

/** SendGrid's event names mapped onto our own status vocabulary. */
const STATUS_BY_EVENT = {
  processed: 'sent',
  delivered: 'delivered',
  bounce: 'bounced',
  blocked: 'bounced',
  dropped: 'dropped',
  spamreport: 'spam',
  open: 'opened',
  deferred: 'sent'
};

/**
 * A soft bounce is a temporary failure (mailbox full, server busy) and must **not**
 * suppress the address — doing so would permanently stop mail to a customer whose
 * inbox was briefly full. Only a hard bounce means the address is wrong.
 */
function isHardBounce(event) {
  if (event.event !== 'bounce') return true;
  return String(event.type || 'blocked').toLowerCase() !== 'blocked';
}

function verifySignature(req) {
  if (!env.SENDGRID_WEBHOOK_SECRET) {
    throw httpError(
      503,
      'The email event webhook is not configured. Set SENDGRID_WEBHOOK_SECRET before enabling it in SendGrid.',
      'WEBHOOK_NOT_CONFIGURED'
    );
  }
  const supplied = String(req.headers['x-klogubizz-webhook-secret'] || '');
  const expected = env.SENDGRID_WEBHOOK_SECRET;
  const a = Buffer.from(supplied, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  // Length is compared first because `timingSafeEqual` throws on a mismatch — and the
  // comparison itself is constant-time so a near-miss cannot be found by timing.
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw httpError(401, 'Invalid webhook signature', 'INVALID_SIGNATURE');
  }
}

const handleSendgridEvents = asyncHandler(async (req, res) => {
  verifySignature(req);

  const events = Array.isArray(req.body) ? req.body : [];
  if (!events.length) return res.json({ received: true, processed: 0 });

  let processed = 0;
  let suppressed = 0;

  for (const event of events) {
    const email = String(event.email || '').toLowerCase().trim();
    if (!email || !event.event) continue;

    const status = STATUS_BY_EVENT[event.event];
    const at = event.timestamp ? new Date(Number(event.timestamp) * 1000) : new Date();

    // Matched on the provider's own message id where present, falling back to the
    // most recent message to that address. The fallback matters: a bounce can arrive
    // for a message sent before this collection existed.
    const filter = event.sg_message_id
      ? { providerMessageId: String(event.sg_message_id).split('.')[0] }
      : { to: email };

    const update = {
      $push: {
        events: {
          event: event.event,
          at,
          reason: event.reason || event.type || '',
          // The raw payload is kept because the provider's fields are the only
          // authority on why something bounced, and paraphrasing them loses the code.
          raw: { type: event.type, reason: event.reason, status: event.status }
        }
      }
    };
    // `opened` deliberately does not overwrite `delivered`: an open is additional
    // information about a delivered message, not a newer state of it.
    if (status && status !== 'opened') update.$set = { status };

    const result = await EmailLog.findOneAndUpdate(filter, update, { sort: { createdAt: -1 } });
    if (result) processed += 1;

    const suppressionReason = SUPPRESSING_EVENTS[event.event];
    if (suppressionReason && isHardBounce(event)) {
      await Suppression.findOneAndUpdate(
        { email },
        {
          $set: {
            email,
            reason: suppressionReason,
            detail: String(event.reason || event.type || '').slice(0, 500),
            source: `sendgrid:${event.event}`,
            suppressedAt: at,
            // An address that bounces again after being released is re-suppressed.
            releasedAt: null,
            releasedBy: ''
          }
        },
        { upsert: true }
      );
      suppressed += 1;
    }
  }

  logger.info('sendgrid events ingested', { count: events.length, processed, suppressed });
  // 200 with a body rather than 204: SendGrid retries anything that is not a 2xx, and
  // the counts make a misconfiguration visible in its own delivery log.
  res.json({ received: true, processed, suppressed });
});

module.exports = { handleSendgridEvents, isHardBounce, SUPPRESSING_EVENTS, STATUS_BY_EVENT };
