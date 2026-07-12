const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const { User } = require('../models/User');
const { httpError } = require('../utils/httpError');
const { asyncHandler } = require('../utils/asyncHandler');

const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw httpError(401, 'Authentication token required');

  const payload = jwt.verify(token, env.JWT_SECRET);
  const user = await User.findById(payload.sub).select('-passwordHash');
  if (!user || user.status !== 'active') throw httpError(401, 'Invalid or inactive user');

  req.user = user;
  req.orgId = user.orgId ? String(user.orgId) : null;
  next();
});

module.exports = { protect };
