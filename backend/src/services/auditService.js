const { AuditLog } = require('../models/Settings');

// Fire-and-forget audit trail writer. Never throws — auditing must not
// break the request that triggered it.
function logAudit({ req, action, entity, entityId, meta }) {
  const doc = {
    orgId: req?.orgId || undefined,
    actorId: req?.user?._id,
    actorName: req?.user?.name,
    action,
    entity,
    entityId: entityId ? String(entityId) : undefined,
    meta
  };
  AuditLog.create(doc).catch(err => console.error('audit log failed:', err.message));
}

module.exports = { logAudit };
