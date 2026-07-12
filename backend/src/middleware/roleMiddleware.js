const { httpError } = require('../utils/httpError');

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw httpError(403, 'You do not have permission for this action');
    }
    next();
  };
}

module.exports = { requireRole };
