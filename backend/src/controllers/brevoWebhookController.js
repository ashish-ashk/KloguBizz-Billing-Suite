const crypto = require('crypto');
const { env } = require('../config/env');
const { EmailLog, Suppression } = require('../models/EmailLog');
const { asyncHandler } = require('../utils/asyncHandler');
const { httpError } = require('../utils/httpError');
const { logger } = require('../utils/logger');

/**
 * Ingests Brevo's transactional webhook (#58's asynchronous half).
 *
 * The immediate provider response only says "accepted for delivery". Everything that
 * actually matters — delivered, bounced, marked as spam, blocked — arrives later, out
 * of band, and without ingesting it the product cannot tell a delivered reminder from
 * one that bounced two seconds after being accepted.
 *
 * **Authentication is mandatory.** An unauthenticated endpoint that writes delivery
 * state and adds addresses to a suppression list is an endpoint anyone can use to stop
 * a competitor's mail: post a fabricated `hard_bounce` event for their address and the
 * platform stops sending to it. Brevo's webhook config has no custom-header field, so
 * the shared secret travels as a query parameter on the URL you register with Brevo
 * (`.../webhooks/brevo/events?secret=...`) instead — a missing or wrong one is a 401,
 * and a webhook with no secret configured is refused outright rather than left open.
 */

/** Events that mean "stop sending to this address". Soft bounces and deferrals are
 *  temporary and must NOT suppress — see isHardBounce below. */
const SUPPRESSING_EVENTS = {
  hard_bounce: 'bounce',
  invalid_email: 'bounce',
  spam: 'spam-complaint',
  unsubscribed: 'unsubscribe',
  blocked: 'bounce'
};

/** Brevo's event names mapped onto our own status vocabulary. */
const STATUS_BY_EVENT = {
  request: 'sent',
  delivered: 'delivered',
  hard_bounce: 'bounced',
  soft_bounce: 'bounced',
  blocked: 'bounced',
  invalid_email: 'bounced',
  spam: 'spam',
  deferred: 'sent',
  opened: 'opened',
  click: 'opened',
  unsubscribed: 'bounced'
};

/**
 * A soft bounce is a temporary failure (mailbox full, server busy) and must **not**
 * suppress the address — doing so would permanently stop mail to a customer whose
 * inbox was briefly full. Only a hard bounce / invalid address / blocked / spam
 * complaint means the address itself is the problem.
 */
function isHardBounce(event) {
  return event.event !== 'soft_bounce' && event.event !== 'deferred';
}

function verifySignature(req) {
  if (!env.BREVO_WEBHOOK_SECRET) {
    throw httpError(
      503,
      'The email event webhook is not configured. Set BREVO_WEBHOOK_SECRET before registering this URL in Brevo.',
      'WEBHOOK_NOT_CONFIGURED'
    );
  }
  const supplied = String(req.query?.secret || '');
  const expected = env.BREVO_WEBHOOK_SECRET;
  const a = Buffer.from(supplied, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  // Length is compared first because `timingSafeEqual` throws on a mismatch — and the
  // comparison itself is constant-time so a near-miss cannot be found by timing.
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw httpError(401, 'Invalid webhook signature', 'INVALID_SIGNATURE');
  }
}

/** Brevo wraps the provider message id in angle brackets; normalise both sides
 *  the same way so a lookup against what `sendEmail` stored actually matches. */
function normaliseMessageId(value) {
  return String(value || '').trim().replace(/^</, '').replace(/>$/, '');
}

const handleBrevoEvents = asyncHandler(async (req, res) => {
  verifySignature(req);

  // Brevo posts one event object per request, not a batch array like SendGrid.
  const events = Array.isArray(req.body) ? req.body : [req.body].filter(Boolean);
  if (!events.length) return res.json({ received: true, processed: 0 });

  let processed = 0;
  let suppressed = 0;

  for (const event of events) {
    const email = String(event.email || '').toLowerCase().trim();
    if (!email || !event.event) continue;

    const status = STATUS_BY_EVENT[event.event];
    const at = event.ts ? new Date(Number(event.ts) * 1000) : new Date();

    // Matched on the provider's own message id where present, falling back to the
    // most recent message to that address. The fallback matters: a bounce can arrive
    // for a message sent before this collection existed.
    const messageId = normaliseMessageId(event['message-id']);
    const filter = messageId ? { providerMessageId: messageId } : { to: email };

    const update = {
      $push: {
        events: {
          event: event.event,
          at,
          reason: event.reason || '',
          // The raw payload is kept because the provider's fields are the only
          // authority on why something bounced, and paraphrasing them loses the code.
          raw: { reason: event.reason, tag: event.tag }
        }
      }
    };
    // `opened`/`click` deliberately do not overwrite `delivered`: an open or click is
    // additional information about a delivered message, not a newer state of it.
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
            detail: String(event.reason || '').slice(0, 500),
            source: `brevo:${event.event}`,
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

  logger.info('brevo events ingested', { count: events.length, processed, suppressed });
  // 200 with a body rather than 204: a misconfiguration is visible in Brevo's own
  // delivery log this way, same as it was for the SendGrid webhook.
  res.json({ received: true, processed, suppressed });
});

module.exports = { handleBrevoEvents, isHardBounce, SUPPRESSING_EVENTS, STATUS_BY_EVENT };
