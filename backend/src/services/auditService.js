const { AuditLog } = require('../models/Settings');
const { logger } = require('../utils/logger');

/**
 * Fire-and-forget audit trail writer. Never throws — auditing must not
 * break the request that triggered it.
 *
 * A failed write is reported at warn level rather than swallowed into an
 * unstructured console line: an audit gap is worth knowing about, even though it
 * is not worth failing the user's request over.
 */
function logAudit({ req, action, entity, entityId, meta }) {
  const doc = {
    orgId: req?.orgId || undefined,
    actorId: req?.user?._id,
    actorName: req?.user?.name,
    action,
    entity,
    entityId: entityId ? String(entityId) : undefined,
    meta,
    // Ties the entry to the request that produced it, so an audited action can be
    // correlated with the access log and any error it raised.
    requestId: req?.id
  };
  AuditLog.create(doc).catch(error => {
    (req?.log || logger).warn('audit log write failed', { action, entity, err: error });
  });
}

module.exports = { logAudit };
