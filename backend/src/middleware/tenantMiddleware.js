const { httpError } = require('../utils/httpError');

function requireTenant(req, res, next) {
  if (!req.orgId) throw httpError(403, 'Tenant context required');
  next();
}

function tenantFilter(req) {
  return { orgId: req.orgId };
}

module.exports = { requireTenant, tenantFilter };
