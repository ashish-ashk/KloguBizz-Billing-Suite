const { Subscription } = require('../models/Subscription');
const { Organisation } = require('../models/Organisation');
const { Plan } = require('../models/Plan');
const { User } = require('../models/User');
const { Membership } = require('../models/Membership');
const { sendDunningEmail } = require('./emailService');
const { setStatus } = require('./tenantStatusService');
const { logger } = require('../utils/logger');

/**
 * Chasing failed subscription payments (3.3 #10).
 *
 * `failedPaymentCount` has been incremented by the Razorpay webhook since
 * billing shipped, and **nothing has ever read it**. A customer whose card
 * expires stops paying, keeps full access, and is never told — the revenue is
 * lost silently and the first anyone notices is a manual look at the numbers
 * months later. That is the whole gap.
 *
 * ── Why days, not attempts ────────────────────────────────────────────
 *
 * The escalation is measured from `pastDueSince`, not from `failedPaymentCount`.
 * Three failures could be three gateway retries in one hour or three months
 * apart, and "we tried your card three times" is not a thing to say to a
 * customer. "Your payment has been failing for a week" is.
 *
 * ── The rule that shapes the rest ─────────────────────────────────────
 *
 * **Never suspend an account whose owner was never actually told.** Email
 * suppression is silent by design — one bounce and every later send to that
 * address is a no-op — so an account can pass through the entire sequence with
 * nobody having received a word of it. Suspending them then is punishing
 * somebody for a message they did not get, and it is the failure mode most
 * likely to turn a lapsed card into a lost customer and a complaint.
 *
 * So the final step is gated on `dunningDelivered`, and tenants that reach the
 * end without a single delivered message are **reported for a human to chase**
 * another way rather than cut off. That is deliberately the expensive choice:
 * it leaves unpaid accounts running, and it is still the right one.
 */

/**
 * The sequence, in days past due.
 *
 * Spaced so that the common case — a card that expired and needs two minutes of
 * attention — gets a gentle nudge and a week to act before anything hardens.
 * Everything after day 7 is progressively more direct, because by then the
 * silence is the problem rather than the payment.
 */
const STAGES = [
  {
    stage: 1,
    afterDays: 1,
    tone: 'notice',
    subject: 'Your payment did not go through',
    lead: 'We could not take this month\'s payment. It is usually an expired card or a bank '
      + 'declining an automatic charge, and it takes a moment to fix.'
  },
  {
    stage: 2,
    afterDays: 3,
    tone: 'notice',
    subject: 'Still unable to take your payment',
    lead: 'We have tried again and the payment is still not going through. Your account is '
      + 'working normally — updating your payment details will keep it that way.'
  },
  {
    stage: 3,
    afterDays: 7,
    tone: 'warning',
    subject: 'Action needed on your subscription',
    lead: 'Your payment has been failing for a week. If it is not settled, the account will '
      + 'become read-only — you will still be able to see and export everything, but not '
      + 'create or edit.'
  },
  {
    stage: 4,
    afterDays: 14,
    tone: 'warning',
    subject: 'Final notice before your account becomes read-only',
    lead: 'This is the last reminder before the account is limited. Nothing is deleted and '
      + 'nothing is lost — but new invoices, edits and payments will stop until this is settled.'
  }
];

/** After this many days past due, and only once a message has actually been
 *  delivered, the account becomes read-only. */
const SUSPEND_AFTER_DAYS = 21;

/** Statuses a dunning sweep considers. `past_due` is set by the webhook on a
 *  failed charge; nothing else is behind on money. */
const CHASEABLE = ['past_due'];

/** Bounded like every other sweep: a run that tries to email a thousand people
 *  in one tick is one that gets the sending domain rate-limited. */
const MAX_PER_SWEEP = 200;
const SEND_SPACING_MS = 150;

const wait = ms => new Promise(resolve => { setTimeout(resolve, ms); });

function daysSince(date) {
  if (!date) return 0;
  return Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
}

/** The highest stage whose threshold this subscription has passed. */
function stageFor(days) {
  let found = null;
  for (const stage of STAGES) {
    if (days >= stage.afterDays) found = stage;
  }
  return found;
}

/**
 * Who to write to.
 *
 * The organisation's owner, resolved through `Membership` rather than through
 * `User.orgId` — since memberships (#53, #54) an identity can belong to several
 * organisations, and the person who owns *this* one is the one whose card is
 * failing. Falls back to any admin, because an owner who has left is exactly the
 * situation where the card stops working.
 */
async function billingContactFor(org) {
  if (org.ownerId) {
    const owner = await User.findById(org.ownerId).select('name email status').lean();
    if (owner && owner.status === 'active' && owner.email) return owner;
  }
  const adminMembership = await Membership.findOne({ orgId: org._id, role: 'admin', status: 'active' })
    .sort({ createdAt: 1 }).lean();
  if (!adminMembership) return null;
  const admin = await User.findById(adminMembership.userId).select('name email status').lean();
  return admin && admin.status === 'active' && admin.email ? admin : null;
}

/**
 * One pass over everything past due.
 *
 * `dryRun` returns what it *would* do without sending or suspending anything,
 * which is how an operator sees the sequence before trusting it with real
 * customers — and how the console previews a suspension that is about to happen.
 */
async function runDunningSweep({ orgId = null, dryRun = false, now = new Date() } = {}) {
  const filter = { status: { $in: CHASEABLE }, pastDueSince: { $ne: null } };
  if (orgId) filter.orgId = orgId;

  const subscriptions = await Subscription.find(filter).limit(MAX_PER_SWEEP + 1).lean();
  const capped = subscriptions.length > MAX_PER_SWEEP;
  const batch = capped ? subscriptions.slice(0, MAX_PER_SWEEP) : subscriptions;

  const result = {
    scanned: batch.length,
    sent: 0,
    skipped: 0,
    failed: 0,
    suspended: 0,
    /** Past the deadline with nothing ever delivered. Named, not counted: these
     *  need a person to pick up a phone, and a number cannot be actioned. */
    unreachable: [],
    dryRun,
    details: []
  };
  if (capped) {
    result.note = `Stopped at ${MAX_PER_SWEEP} accounts. The rest will be picked up on the next run.`;
  }

  for (const subscription of batch) {
    const days = daysSince(subscription.pastDueSince);
    const org = await Organisation.findById(subscription.orgId);
    if (!org) continue;

    // Already limited. Nothing further to escalate to, and continuing to mail
    // somebody the same warning after acting on it is just noise.
    if (org.status === 'suspended' || org.status === 'cancelled') {
      result.skipped += 1;
      continue;
    }

    // ── The final step ──
    if (days >= SUSPEND_AFTER_DAYS) {
      if (!subscription.dunningDelivered) {
        // See the header: never cut off somebody who was never told.
        result.unreachable.push({
          orgId: String(org._id),
          name: org.name,
          daysPastDue: days,
          reason: 'no dunning message has ever been delivered to this account'
        });
        result.skipped += 1;
        continue;
      }
      if (dryRun) {
        result.details.push({ orgId: String(org._id), name: org.name, action: 'would suspend', daysPastDue: days });
        continue;
      }
      await setStatus({
        org,
        status: 'suspended',
        reason: `Subscription payment has been outstanding for ${days} days. `
          + 'Your records remain available to view and export — settling the payment restores full access.',
        actor: 'Automatic (non-payment)',
        forNonPayment: true
      });
      result.suspended += 1;
      result.details.push({ orgId: String(org._id), name: org.name, action: 'suspended', daysPastDue: days });
      continue;
    }

    // ── An escalation step ──
    const stage = stageFor(days);
    if (!stage || stage.stage <= (subscription.dunningStage || 0)) {
      // Either too early, or this step has already been sent. Re-sending on
      // every hourly tick is how a dunning sequence becomes a spam complaint.
      result.skipped += 1;
      continue;
    }

    const contact = await billingContactFor(org);
    if (!contact) {
      result.unreachable.push({
        orgId: String(org._id),
        name: org.name,
        daysPastDue: days,
        reason: 'no active owner or admin with an email address'
      });
      result.skipped += 1;
      continue;
    }

    if (dryRun) {
      result.details.push({
        orgId: String(org._id), name: org.name, action: `would send stage ${stage.stage}`,
        to: contact.email, daysPastDue: days
      });
      continue;
    }

    const plan = await Plan.findOne({ code: subscription.planCode }).select('name').lean();
    // The subscriber's own snapshot, not the published price (3.3 #9) — quoting
    // a figure they never agreed to in a payment-chasing email would be worse
    // than quoting none.
    const amount = subscription.billingCycle === 'yearly'
      ? subscription.pricing?.yearlyPrice
      : subscription.pricing?.monthlyPrice;

    const outcome = await sendDunningEmail({
      to: contact.email,
      orgId: org._id,
      name: contact.name,
      orgName: org.name,
      planName: plan?.name || subscription.planCode,
      amount,
      billingCycle: subscription.billingCycle,
      daysPastDue: days,
      stage: stage.stage,
      subject: stage.subject,
      lead: stage.lead,
      tone: stage.tone,
      suspendInDays: Math.max(0, SUSPEND_AFTER_DAYS - days)
    });

    /**
     * The stage advances even when the send did not succeed.
     *
     * Otherwise a permanently suppressed address makes the sweep retry stage 1
     * every hour forever, and the account never progresses towards the outcome
     * it should reach. What a failed send must *not* do is set
     * `dunningDelivered` — which is exactly what keeps the suspension gate shut
     * for an account nobody could reach.
     */
    const patch = {
      dunningStage: stage.stage,
      lastDunningAt: now
    };
    if (outcome.sent) {
      patch.dunningDelivered = true;
      result.sent += 1;
    } else if (outcome.failed) {
      result.failed += 1;
    } else {
      result.skipped += 1;
    }
    await Subscription.updateOne({ _id: subscription._id }, { $set: patch });

    result.details.push({
      orgId: String(org._id),
      name: org.name,
      action: `stage ${stage.stage}`,
      to: contact.email,
      daysPastDue: days,
      outcome: outcome.sent ? 'sent' : (outcome.failed ? 'failed' : `skipped: ${outcome.reason}`)
    });

    await wait(SEND_SPACING_MS);
  }

  if (result.unreachable.length) {
    logger.warn('dunning: accounts that cannot be reached', { count: result.unreachable.length });
  }
  return result;
}

module.exports = { runDunningSweep, STAGES, SUSPEND_AFTER_DAYS, billingContactFor, stageFor, daysSince };
