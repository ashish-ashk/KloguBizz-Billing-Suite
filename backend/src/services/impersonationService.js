const jwt = require('jsonwebtoken');
const { env } = require('../config/env');

/**
 * "View as tenant".
 *
 * The most valuable support capability in the product, and until now the only way
 * to do it was to ask the customer for their password. That is not a workaround —
 * it is a policy failure: it trains customers to hand over credentials, it leaves
 * no trace of who looked, and any action taken is indistinguishable from one the
 * customer performed.
 *
 * The design constraints, each of which is enforced somewhere concrete:
 *
 *  - **Short-lived.** 30 minutes, in the token's own `exp`. An impersonation
 *    session that outlives the support conversation is a standing credential for
 *    someone else's business data.
 *  - **Never a new session for the customer.** `sessionVersion` is *read*, never
 *    bumped. Bumping it — which every other token-issuing path here does
 *    deliberately — would sign the customer out of their own account the moment
 *    support looked at it.
 *  - **Attributable.** The `imp` claim carries the operator's id, so
 *    services/auditService.js can record both identities on every entry, and
 *    middleware/authMiddleware.js can enforce the rest.
 *  - **Optionally read-only**, which is the mode most support work needs: see what
 *    they see, change nothing.
 *
 * The claim is inside the signed JWT rather than alongside it, so it cannot be
 * stripped to turn an impersonation token into an ordinary one.
 */

const IMPERSONATION_TTL_SECONDS = 30 * 60;

function issueImpersonationToken({ targetUser, operator, readOnly = true }) {
  return jwt.sign(
    {
      sub: targetUser._id,
      role: targetUser.role,
      orgId: targetUser.orgId,
      // The customer's current session version, so their own sessions keep
      // working — and so that if they sign in (bumping it) this token stops,
      // which is the correct direction to fail.
      sv: targetUser.sessionVersion || 0,
      imp: {
        by: String(operator._id),
        byName: operator.name || operator.email,
        ro: Boolean(readOnly)
      }
    },
    env.JWT_SECRET,
    { expiresIn: IMPERSONATION_TTL_SECONDS }
  );
}

/**
 * Requests that are refused even in a read-write impersonation session.
 *
 * These change *who the customer is* rather than what their data says: a
 * credential change, or a transfer of ownership. Support may need to fix an
 * invoice on a customer's behalf; nobody needs to change their password while
 * wearing their identity, and the audit trail could not meaningfully distinguish
 * that from an account takeover.
 */
const ALWAYS_FORBIDDEN = [
  '/api/v1/auth/change-password',
  '/api/v1/organisations/current/transfer-ownership'
];

function isForbiddenWhileImpersonating(originalUrl) {
  const path = String(originalUrl || '').split('?')[0];
  return ALWAYS_FORBIDDEN.some(forbidden => path.startsWith(forbidden));
}

module.exports = {
  IMPERSONATION_TTL_SECONDS,
  issueImpersonationToken,
  isForbiddenWhileImpersonating,
  ALWAYS_FORBIDDEN
};
