const approvals = require('../services/approvalService');
const { hasCapability, resolvePlatformRole } = require('./platformRoleMiddleware');
const { httpError } = require('../utils/httpError');
const { asyncHandler } = require('../utils/asyncHandler');

/**
 * Route guards for two-person approval and break-glass (3.4 #12).
 */

/**
 * `requireCapability`, plus break-glass.
 *
 * A drop-in replacement for the plain guard on routes where emergency elevation
 * should be possible. The role check is tried first and short-circuits, so the
 * ordinary path costs nothing extra — a grant lookup on every console request
 * would be a database round trip to answer a question that is almost always no.
 *
 * When a grant *is* used, the request is marked so everything downstream can say
 * so: `req.breakGlass` is what puts "under emergency elevation" in the audit
 * trail instead of leaving it indistinguishable from ordinary work.
 */
function requireCapabilityOrGrant(capability) {
  return asyncHandler(async (req, res, next) => {
    if (hasCapability(req.user, capability)) return next();

    const grant = await approvals.activeGrant(req.user?._id, capability);
    if (!grant) {
      throw httpError(
        403,
        `Your platform role (${resolvePlatformRole(req.user) || 'none'}) does not include "${capability}".`,
        'PLATFORM_CAPABILITY_REQUIRED'
      );
    }

    req.breakGlass = { grantId: grant._id, capability, reason: grant.reason };
    await approvals.recordGrantUse(grant, req);
    return next();
  });
}

/**
 * Refuses an action until a second person has agreed to it.
 *
 * Returns **202**, not 403. The distinction is the whole user experience of this
 * feature: 403 says "you may not", which is wrong — they may, once somebody
 * agrees — and a client seeing 403 has no reason to show anything but an error.
 * 202 says "recorded, not yet done", which is exactly what happened, and carries
 * the id the requester needs to come back with.
 *
 * @param {object} options
 * @param {string} options.capability  What the approval authorises.
 * @param {function} options.describe  `(req) => string`. The sentence the
 *   approver reads. A path and an id are not something anyone can consent to.
 * @param {function} [options.preview] `(req) => object`, extra context to show.
 * @param {function} [options.precondition] `async (req) => void`. Runs before
 *   anything is recorded and may throw. Sending a second person a request that
 *   would fail on its own merits wastes their attention and fills the queue with
 *   noise — and an approval queue people learn to skim is one that stops working.
 */
function requireApproval({ capability, describe, preview, precondition }) {
  return asyncHandler(async (req, res, next) => {
    if (precondition) await precondition(req);

    const approvalId = req.get('x-approval-id') || req.body?.approvalId;

    if (approvalId) {
      // Throws on any mismatch — see `consumeApproval` for each hole it closes.
      const approval = await approvals.consumeApproval({ req, approvalId, capability });
      req.approval = approval;
      return next();
    }

    /**
     * The reason is required *before* anything is recorded.
     *
     * An approval request nobody can judge is worse than none: it trains the
     * second person to click yes, which converts a control into a formality.
     */
    const reason = String(req.body?.reason || '').trim();
    if (reason.length < 10) {
      throw httpError(
        400,
        'A specific reason is required — a second person has to be able to judge this, and "cleanup" cannot be judged.',
        'REASON_REQUIRED'
      );
    }

    const created = await approvals.requestApproval({
      req,
      capability,
      action: describe(req),
      preview: preview ? preview(req) : null,
      reason
    });

    return res.status(202).json({
      status: 'approval_pending',
      code: 'APPROVAL_PENDING',
      approvalId: created._id,
      action: created.action,
      message: 'This needs a second platform operator to approve it. '
        + 'Once approved, repeat this action to carry it out.'
    });
  });
}

module.exports = { requireApproval, requireCapabilityOrGrant };
