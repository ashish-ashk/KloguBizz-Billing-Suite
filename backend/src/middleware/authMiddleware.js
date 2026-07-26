const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const { User } = require('../models/User');
const { Organisation } = require('../models/Organisation');
const { httpError } = require('../utils/httpError');
const { asyncHandler } = require('../utils/asyncHandler');

// Routes a suspended tenant may still write to. Suspension is a commercial
// measure, not a punishment: the tenant keeps access to the pages that let them
// fix the problem (see their plan, pay, change password, sign out). What stops
// is creating new business documents.
const SUSPENDED_ALLOWED_PREFIXES = [
  '/api/v1/auth',
  '/api/v1/public',
  '/api/v1/organisations/current',
  '/api/v1/subscriptions'
];

function isReadOnlyRequest(method) {
  return method === 'GET' || method === 'HEAD' || method === 'OPTIONS';
}

const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw httpError(401, 'Authentication token required');

  const payload = jwt.verify(token, env.JWT_SECRET);
  const user = await User.findById(payload.sub).select('-passwordHash');
  if (!user || user.status !== 'active') throw httpError(401, 'Invalid or inactive user');

  // `payload.sv` is absent on tokens issued before this field existed —
  // treat that as version 0 so pre-existing sessions aren't force-logged-out.
  if ((payload.sv ?? 0) !== (user.sessionVersion || 0)) {
    throw httpError(401, 'Your session has ended because this account signed in on another device.', 'SESSION_REVOKED');
  }

  req.user = user;
  req.orgId = user.orgId ? String(user.orgId) : null;

  /**
   * Enforce organisation suspension.
   *
   * `Organisation.status` accepted 'suspended' and the super-admin panel set
   * it, but nothing anywhere read it — only `user.status` was ever checked — so
   * a suspended tenant carried on invoicing exactly as before. The Suspend
   * button did nothing at all.
   *
   * The super admin is exempt: they operate above tenants and need to be able
   * to work on a suspended one.
   */
  if (req.orgId && user.role !== 'superadmin') {
    const org = await Organisation.findById(req.orgId).select('status').lean();
    if (!org) throw httpError(401, 'Your organisation no longer exists.');

    if (org.status === 'suspended' || org.status === 'cancelled') {
      const allowed = SUSPENDED_ALLOWED_PREFIXES.some(prefix => req.originalUrl.startsWith(prefix));
      // Reads stay open so the tenant can still see and export their own
      // records — it is their business data, and withholding it would be worse
      // than unhelpful. Writes are refused.
      if (!allowed && !isReadOnlyRequest(req.method)) {
        throw httpError(
          403,
          org.status === 'suspended'
            ? 'This account is suspended, so changes cannot be saved. Your existing records are still available to view and export. Please contact support to restore access.'
            : 'This account has been cancelled, so changes cannot be saved. Your existing records are still available to view and export.',
          org.status === 'suspended' ? 'ORG_SUSPENDED' : 'ORG_CANCELLED'
        );
      }
    }
    // Exposed so a response can carry a banner without every controller
    // re-querying the organisation.
    req.orgStatus = org.status;
  }

  next();
});

module.exports = { protect };
