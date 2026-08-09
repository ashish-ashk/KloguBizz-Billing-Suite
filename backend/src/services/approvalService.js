const crypto = require('crypto');
const { ApprovalRequest } = require('../models/ApprovalRequest');
const { BreakGlassGrant } = require('../models/BreakGlassGrant');
const { CAPABILITY, hasCapability } = require('../middleware/platformRoleMiddleware');
const { logAudit } = require('./auditService');
const { httpError } = require('../utils/httpError');

/**
 * Two-person approval and break-glass elevation (3.4 #12).
 *
 * See `models/ApprovalRequest.js` for why the requester retries rather than the
 * approver executing, and `models/BreakGlassGrant.js` for why break-glass is
 * self-service and what makes that safe.
 */

/** How long an approval stays usable once given. */
const APPROVAL_TTL_MS = 60 * 60 * 1000;

/** The longest a break-glass grant can last. Deliberately short: this is for
 *  getting through an incident, not for working around a role for an afternoon. */
const MAX_BREAK_GLASS_MINUTES = 60;

/**
 * Capabilities break-glass will never hand out.
 *
 * `platform.admin` is the capability that grants capabilities. Elevating into it
 * would turn a fifteen-minute emergency into a permanent promotion, and every
 * other control in this file into decoration.
 */
const NEVER_ELEVATABLE = [CAPABILITY.platformAdmin];

/**
 * A stable fingerprint of a request body.
 *
 * Keys are sorted before hashing so that two bodies differing only in property
 * order — which JSON round-trips and client libraries reorder freely — produce
 * the same hash. Without that, an approval would be spent by a retry that is
 * byte-different and semantically identical, and the feature would read as
 * flaky rather than strict.
 */
function hashBody(body) {
  /**
   * `approvalId` is stripped before hashing.
   *
   * The retried request carries it, the original did not, and hashing it would
   * guarantee a mismatch on the one call the whole flow exists to let through —
   * making the body-carried form of the approval unusable and the header the
   * only one that works. It is metadata *about* the authorisation, not part of
   * what is being authorised.
   */
  const rest = { ...(body ?? {}) };
  delete rest.approvalId;
  const canonical = JSON.stringify(sortKeys(rest));
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return Object.keys(value).sort().reduce((out, key) => {
      out[key] = sortKeys(value[key]);
      return out;
    }, {});
  }
  return value;
}

/** Records an intent and returns it, for the route to hand back as a 202. */
async function requestApproval({ req, capability, action, preview, reason }) {
  const created = await ApprovalRequest.create({
    capability,
    action,
    method: req.method,
    path: req.originalUrl.split('?')[0],
    bodyHash: hashBody(req.body),
    preview: preview ?? null,
    requestedBy: { userId: req.user?._id, name: req.user?.name, email: req.user?.email },
    reason
  });

  logAudit({
    req,
    action: 'approval.requested',
    entity: 'approval',
    entityId: created._id,
    meta: { capability, what: action, reason }
  });
  return created;
}

/**
 * Checks an approval presented against a retried request.
 *
 * Every failure here is a refusal rather than a warning, and each one is a
 * specific hole being closed:
 *
 *   - **Not approved / rejected** — no consent was given.
 *   - **Expired** — consent was given, but not to today's version of the world.
 *   - **Already used** — an approval is for one action, not a standing licence.
 *   - **Different request** — the approver saw one thing; this is another. This
 *     is the one that matters most: without it, "delete tenant A" approved
 *     becomes "delete tenant B" executed.
 *   - **Same person** — see `approve`, which refuses it at source too. Checked
 *     twice on purpose: this is the entire property the feature exists to
 *     provide, and it should not rest on one line in one place.
 */
async function consumeApproval({ req, approvalId, capability }) {
  const approval = await ApprovalRequest.findById(approvalId);
  if (!approval) throw httpError(404, 'That approval does not exist.', 'APPROVAL_NOT_FOUND');

  if (approval.status === 'used') {
    throw httpError(409, 'That approval has already been used. Request a new one.', 'APPROVAL_USED');
  }
  if (approval.status !== 'approved') {
    throw httpError(403, `That request is ${approval.status}, not approved.`, 'APPROVAL_NOT_GRANTED');
  }
  if (approval.expiresAt && approval.expiresAt < new Date()) {
    approval.status = 'expired';
    await approval.save();
    throw httpError(403, 'That approval has expired. Request a new one.', 'APPROVAL_EXPIRED');
  }
  if (approval.capability !== capability) {
    throw httpError(403, 'That approval was for a different kind of action.', 'APPROVAL_MISMATCH');
  }

  const path = req.originalUrl.split('?')[0];
  if (approval.path !== path || approval.bodyHash !== hashBody(req.body)) {
    throw httpError(
      403,
      'This request is not the one that was approved. Approval is for exactly what the approver saw.',
      'APPROVAL_MISMATCH'
    );
  }
  if (String(approval.decidedBy?.userId) === String(req.user?._id)) {
    throw httpError(403, 'You cannot approve your own request.', 'APPROVAL_SELF');
  }

  approval.status = 'used';
  approval.usedAt = new Date();
  await approval.save();
  return approval;
}

/**
 * The second person's decision.
 *
 * Refusing self-approval here is the whole feature. Everything else is
 * bookkeeping around it.
 */
async function decide({ req, approvalId, approve, note }) {
  const approval = await ApprovalRequest.findById(approvalId);
  if (!approval) throw httpError(404, 'That approval request does not exist.');
  if (approval.status !== 'pending') {
    throw httpError(409, `That request is already ${approval.status}.`, 'APPROVAL_DECIDED');
  }
  if (String(approval.requestedBy?.userId) === String(req.user?._id)) {
    throw httpError(
      403,
      'You cannot approve your own request — a second person is the entire point.',
      'APPROVAL_SELF'
    );
  }
  /**
   * The approver must be able to do the thing themselves.
   *
   * Otherwise the check is theatre: an auditor with read-only access could
   * authorise a tenant deletion they are specifically not trusted to perform,
   * and the second signature would carry no more weight than a bystander's.
   */
  if (!hasCapability(req.user, approval.capability)) {
    throw httpError(
      403,
      `You cannot approve this: your role does not include "${approval.capability}".`,
      'PLATFORM_CAPABILITY_REQUIRED'
    );
  }

  approval.status = approve ? 'approved' : 'rejected';
  approval.decidedBy = { userId: req.user._id, name: req.user.name, email: req.user.email };
  approval.decidedAt = new Date();
  approval.decisionNote = note;
  if (approve) approval.expiresAt = new Date(Date.now() + APPROVAL_TTL_MS);
  await approval.save();

  logAudit({
    req,
    action: approve ? 'approval.granted' : 'approval.rejected',
    entity: 'approval',
    entityId: approval._id,
    meta: {
      capability: approval.capability,
      what: approval.action,
      requestedBy: approval.requestedBy?.email,
      note
    }
  });
  return approval;
}

// ── Break-glass ──────────────────────────────────

/**
 * Grants the caller a capability, briefly.
 *
 * Self-service by design — the case this serves is the one where the second
 * person is unreachable. See `models/BreakGlassGrant.js` for why that is a
 * considered trade rather than an oversight.
 */
async function breakGlass({ req, capability, reason, minutes = 15 }) {
  if (!Object.values(CAPABILITY).includes(capability)) {
    throw httpError(400, `Unknown capability "${capability}".`);
  }
  if (NEVER_ELEVATABLE.includes(capability)) {
    throw httpError(
      403,
      'Emergency access cannot grant the ability to change roles — that would make it a permanent promotion.',
      'CAPABILITY_NOT_ELEVATABLE'
    );
  }
  if (hasCapability(req.user, capability)) {
    // Not an error, but worth refusing: an unnecessary grant dilutes the signal
    // that a real one is supposed to send.
    throw httpError(400, 'Your role already includes that capability.', 'ALREADY_PERMITTED');
  }
  const cleanReason = String(reason || '').trim();
  if (cleanReason.length < 10) {
    throw httpError(
      400,
      'A specific reason is required — this is reviewed afterwards, and "fixing something" cannot be reviewed.',
      'REASON_REQUIRED'
    );
  }

  const span = Math.min(MAX_BREAK_GLASS_MINUTES, Math.max(1, Number(minutes) || 15));
  const grant = await BreakGlassGrant.create({
    capability,
    grantedTo: { userId: req.user._id, name: req.user.name, email: req.user.email },
    reason: cleanReason,
    grantedAt: new Date(),
    expiresAt: new Date(Date.now() + span * 60000)
  });

  // Loud on purpose. This event existing at all is the control.
  logAudit({
    req,
    action: 'breakglass.taken',
    entity: 'user',
    entityId: req.user._id,
    meta: { capability, reason: cleanReason, minutes: span }
  });
  return grant;
}

/** An active grant for this user and capability, or null. */
async function activeGrant(userId, capability) {
  if (!userId) return null;
  return BreakGlassGrant.findOne({
    'grantedTo.userId': userId,
    capability,
    revokedAt: null,
    expiresAt: { $gt: new Date() }
  }).sort({ expiresAt: -1 });
}

/** Appends to a grant's usage trail. Best-effort: a failure to record must not
 *  refuse a request the grant legitimately permits. */
async function recordGrantUse(grant, req) {
  try {
    await BreakGlassGrant.updateOne(
      { _id: grant._id },
      { $push: { usedFor: { at: new Date(), method: req.method, path: req.originalUrl.split('?')[0] } } }
    );
  } catch { /* the grant is still valid; the trail is not worth failing over */ }
}

module.exports = {
  requestApproval,
  consumeApproval,
  decide,
  breakGlass,
  activeGrant,
  recordGrantUse,
  hashBody,
  APPROVAL_TTL_MS,
  MAX_BREAK_GLASS_MINUTES,
  NEVER_ELEVATABLE
};
