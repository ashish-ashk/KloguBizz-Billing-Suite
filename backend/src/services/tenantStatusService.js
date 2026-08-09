const { Organisation } = require('../models/Organisation');
const { Membership } = require('../models/Membership');
const { User } = require('../models/User');
const { revokeAllForOrg } = require('./sessionService');
const { logAudit } = require('./auditService');

/**
 * Invalidates every access token in an organisation.
 *
 * Every user with an **active membership** in this org, not `User.orgId` — a
 * membership can put someone in an org that is not their identity's legacy
 * "home" org (#53, #54), and a suspend that missed them would be a suspension
 * with a hole in it.
 *
 * Lives here rather than in `platformController` because the dunning sweep needs
 * it too, and a suspension that forgets to cut sessions leaves a tenant writing
 * for another fifteen minutes.
 */
async function bumpSessionVersionForOrg(orgId) {
  const userIds = await Membership.find({ orgId, status: 'active' }).distinct('userId');
  const result = await User.updateMany({ _id: { $in: userIds } }, { $inc: { sessionVersion: 1 } });
  return result.modifiedCount ?? 0;
}

/**
 * Changing a tenant's status, from anywhere.
 *
 * Extracted from `platformController.setTenantStatus`, which is where this
 * logic lived and where it could only be reached by an HTTP request with a
 * `req.user` on it. Dunning needs the same behaviour from a background sweep —
 * and the alternative, a second implementation in the job, is how you end up
 * with an automatic suspension that forgets to cut live sessions and a tenant
 * who keeps writing for fifteen minutes after being suspended.
 *
 * `actor` is a string rather than a user, because the caller is sometimes not a
 * person. "Automatic (non-payment)" in the audit trail is more honest than
 * attributing a machine's decision to whoever happened to deploy last.
 */

/**
 * @param {object} params
 * @param {object} params.org        A loaded Organisation document.
 * @param {string} params.status     One of trial|active|suspended|cancelled.
 * @param {string} params.reason     Shown to the tenant. Required for suspend/cancel.
 * @param {string} params.actor      Who or what decided this.
 * @param {boolean} [params.forNonPayment]  Marks an automatic billing suspension,
 *   so only the same mechanism will lift it again.
 * @param {object} [params.req]      Present for a human action, so the audit
 *   entry carries the IP and user agent. Absent for a job.
 */
async function setStatus({ org, status, reason, actor, forNonPayment = false, req }) {
  const previous = org.status;
  org.status = status;
  org.statusReason = status === 'active' || status === 'trial' ? '' : reason;
  org.statusChangedAt = new Date();
  org.statusChangedBy = actor;
  /**
   * Cleared whenever the account is *not* suspended for money.
   *
   * Which matters in the awkward direction: an operator manually suspending a
   * tenant who was already in dunning must clear this flag, or the next
   * successful payment would silently reverse a human decision that money was
   * never the point of.
   */
  org.suspendedForNonPayment = status === 'suspended' ? forNonPayment === true : false;
  await org.save();

  // Suspending has to cut live sessions for writes to actually stop being
  // attempted. `protect` re-reads the org on every request, so this is belt and
  // braces rather than the enforcement itself — but it also means the tenant
  // sees the banner immediately instead of on their next navigation.
  if (status === 'suspended' || status === 'cancelled') {
    await bumpSessionVersionForOrg(org._id);
    await revokeAllForOrg(org._id, 'admin_revoked');
  }

  logAudit({
    req: req || {},
    action: `org.status_${status}`,
    entity: 'organisation',
    entityId: org._id,
    orgId: org._id,
    actorName: req ? undefined : actor,
    meta: { from: previous, to: status, reason: org.statusReason, automatic: !req }
  });

  return { previous, status };
}

/**
 * Restores an account that was suspended for non-payment.
 *
 * Refuses to touch an account suspended for any other reason — that is the
 * whole purpose of `suspendedForNonPayment`. A tenant suspended for abuse or a
 * legal hold who then pays an invoice must stay suspended; reinstating them
 * because money arrived would undo a decision money was never about.
 *
 * Returns whether anything was restored, so the caller can report it rather
 * than assume it.
 */
async function restoreAfterPayment(orgId, actor = 'Automatic (payment received)') {
  const org = await Organisation.findById(orgId);
  if (!org) return { restored: false, reason: 'organisation not found' };
  if (org.status !== 'suspended') return { restored: false, reason: `status is ${org.status}` };
  if (!org.suspendedForNonPayment) {
    return { restored: false, reason: 'suspended by a person, for a reason other than payment' };
  }

  await setStatus({ org, status: 'active', reason: '', actor });
  return { restored: true };
}

module.exports = { setStatus, restoreAfterPayment, bumpSessionVersionForOrg };
