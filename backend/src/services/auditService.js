const { AuditLog } = require('../models/Settings');
const { logger } = require('../utils/logger');

/**
 * A user agent is a fingerprint here, not a document. Truncated so a crafted
 * 8KB header can't be used to bloat the one collection that only ever grows.
 */
const MAX_USER_AGENT = 200;

/**
 * Fire-and-forget audit trail writer. Never throws — auditing must not
 * break the request that triggered it.
 *
 * A failed write is reported at warn level rather than swallowed into an
 * unstructured console line: an audit gap is worth knowing about, even though it
 * is not worth failing the user's request over.
 *
 * Origin (`ip`, `userAgent`) and impersonation are read off the request rather
 * than passed by each caller. That is the only way the guarantee holds: forty
 * `logAudit` call sites would each have to remember, and the one that forgot would
 * be the entry someone later needed.
 */
function logAudit({ req, action, entity, entityId, meta, orgId }) {
  const impersonation = req?.impersonation;
  const doc = {
    /**
     * Which organisation the entry is *about*.
     *
     * Normally the actor's own, which is what a tenant action means. A platform
     * action has no actor org at all — a superadmin has no `orgId` — so without the
     * explicit override every console action against a tenant was filed with no
     * organisation, and therefore appeared in neither that tenant's timeline nor
     * the audit console's per-org filter. Which is to say: the record of what
     * support did to a customer was unreachable from the customer.
     */
    orgId: orgId || req?.orgId || undefined,
    actorId: req?.user?._id,
    actorName: req?.user?.name,
    action,
    entity,
    entityId: entityId ? String(entityId) : undefined,
    meta,
    // Ties the entry to the request that produced it, so an audited action can be
    // correlated with the access log and any error it raised.
    requestId: req?.id,
    ip: req?.ip,
    userAgent: typeof req?.headers?.['user-agent'] === 'string'
      ? req.headers['user-agent'].slice(0, MAX_USER_AGENT)
      : undefined,
    // When a superadmin is acting as a tenant user, both identities are recorded:
    // `actorId` is whose account did it, `impersonatorId` is who was driving.
    impersonatorId: impersonation?.by || undefined,
    impersonatorName: impersonation?.byName || undefined
  };
  AuditLog.create(doc).catch(error => {
    (req?.log || logger).warn('audit log write failed', { action, entity, err: error });
  });
}

module.exports = { logAudit };
