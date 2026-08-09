const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const { User } = require('../models/User');
const { Organisation } = require('../models/Organisation');
const { httpError } = require('../utils/httpError');
const { asyncHandler } = require('../utils/asyncHandler');
const { recordActivity } = require('../services/usageEventService');
const { getActiveMembership } = require('../services/membershipService');
const { logAudit } = require('../services/auditService');
const { isForbiddenWhileImpersonating } = require('../services/impersonationService');
const { requireVerifiedEmail, requireSuperadminMfa } = require('./accountGuards');

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

  /**
   * An unverifiable token is a **401**, not a 500.
   *
   * `jwt.verify` throws for the most ordinary event in the system — an access
   * token reaching its fifteen-minute expiry — and this call used to let that
   * throw straight through to the error handler, which had no case for it and
   * returned `500 {"message":"jwt expired"}`.
   *
   * That single wrong status code broke the entire session-recovery path,
   * because every part of it keys off 401: the client's silent refresh never
   * ran, the retry never happened, and `forceLogout` never fired. What the user
   * saw was the app quietly stopping about fifteen minutes after signing in —
   * an unexplained error toast, no data, and no redirect to sign in again, with
   * a reload changing nothing. It read exactly like an idle timeout, which is
   * how it went unnoticed: the broken behaviour resembled a plausible feature.
   *
   * The distinction below is kept because the two cases are genuinely different.
   * `TOKEN_EXPIRED` is routine and the client should renew and retry.
   * `TOKEN_INVALID` means malformed or signed with the wrong key — nothing to
   * renew, so the session ends. Neither is a server fault, and neither should
   * ever have been reported as one.
   */
  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw httpError(401, 'Your session has expired. Please sign in again.', 'TOKEN_EXPIRED');
    }
    throw httpError(401, 'Your session is no longer valid. Please sign in again.', 'TOKEN_INVALID');
  }
  const user = await User.findById(payload.sub).select('-passwordHash');
  if (!user || user.status !== 'active') throw httpError(401, 'Invalid or inactive user');

  // `payload.sv` is absent on tokens issued before this field existed —
  // treat that as version 0 so pre-existing sessions aren't force-logged-out.
  if ((payload.sv ?? 0) !== (user.sessionVersion || 0)) {
    throw httpError(401, 'Your session has ended because this account signed in on another device.', 'SESSION_REVOKED');
  }

  req.user = user;

  /**
   * Which organisation, and with what role (#53, #54).
   *
   * `user.orgId`/`user.role` are no longer authoritative once memberships
   * exist — a user can belong to more than one organisation, so "their org"
   * is a property of *this token*, not of the identity. `payload.orgId` names
   * which membership the token was issued for (see authController.signToken);
   * the membership itself is re-checked on every request rather than trusted
   * from the token alone, so a role change or removal takes effect immediately
   * rather than only once the 15-minute access token expires.
   *
   * A platform account has no membership at all — it isn't a tenant identity —
   * so this only runs for ordinary users.
   */
  if (user.role === 'superadmin') {
    req.orgId = null;
  } else {
    const membership = await getActiveMembership(user._id, payload.orgId);
    if (!membership) {
      throw httpError(401, 'You no longer have access to this organisation.', 'MEMBERSHIP_REVOKED');
    }
    // In-memory only — overrides the stale field on the loaded document so
    // every downstream read of req.user.role sees the role for *this*
    // organisation without every caller needing to know memberships exist.
    req.user.role = membership.role;
    req.orgId = String(membership.orgId);
    req.membership = membership;
  }

  /**
   * Impersonation ("view as tenant").
   *
   * The claim is inside the signed token, so it cannot be removed to launder an
   * impersonation session into an ordinary one. Everything downstream — the audit
   * writer, the response payloads, the banner the operator sees — keys off
   * `req.impersonation`, so there is exactly one place that decides whether a
   * request is being made by someone wearing another identity.
   */
  if (payload.imp) {
    // A superadmin account is never a valid impersonation target: it would be a
    // lateral move to full platform control that the audit trail would attribute
    // to the *target*. The issuing endpoint refuses it too; this is the check that
    // still holds if a token outlives a role change.
    if (user.role === 'superadmin') {
      throw httpError(403, 'A platform account cannot be impersonated.', 'IMPERSONATION_FORBIDDEN');
    }

    req.impersonation = {
      by: payload.imp.by,
      byName: payload.imp.byName,
      readOnly: Boolean(payload.imp.ro),
      expiresAt: payload.exp ? new Date(payload.exp * 1000) : null
    };

    if (isForbiddenWhileImpersonating(req.originalUrl)) {
      throw httpError(
        403,
        'That action cannot be performed while viewing as a tenant. It changes the account’s credentials or ownership.',
        'IMPERSONATION_FORBIDDEN'
      );
    }

    if (req.impersonation.readOnly && !isReadOnlyRequest(req.method)) {
      throw httpError(
        403,
        'This is a read-only support session. Start a read-write session to make changes.',
        'IMPERSONATION_READ_ONLY'
      );
    }

    // Every write made while impersonating is recorded, not just the ones a
    // controller happens to audit. This is the data-access half of the guarantee:
    // a tenant can be told exactly what support did inside their account.
    if (!isReadOnlyRequest(req.method)) {
      logAudit({
        req,
        action: 'impersonation.write',
        entity: 'organisation',
        entityId: req.orgId,
        meta: { method: req.method, path: req.originalUrl.split('?')[0] }
      });
    }
  }

  /**
   * Enforce organisation suspension.
   *
   * `Organisation.status` accepted 'suspended' and the super-admin panel set
   * it, but nothing anywhere read it — only `user.status` was ever checked — so
   * a suspended tenant carried on invoicing exactly as before. The Suspend
   * button did nothing at all.
   *
   * The super admin is exempt: they operate above tenants and need to be able
   * to work on a suspended one. An *impersonated* session is not exempt — the
   * point of impersonation is to see what the customer sees, and a support
   * session that could write to a suspended account would be a way around the
   * suspension.
   */
  if (req.orgId && user.role !== 'superadmin') {
    const org = await Organisation.findById(req.orgId).select('status statusReason').lean();
    if (!org) throw httpError(401, 'Your organisation no longer exists.');

    if (org.status === 'suspended' || org.status === 'cancelled') {
      const allowed = SUSPENDED_ALLOWED_PREFIXES.some(prefix => req.originalUrl.startsWith(prefix));
      // Reads stay open so the tenant can still see and export their own
      // records — it is their business data, and withholding it would be worse
      // than unhelpful. Writes are refused.
      if (!allowed && !isReadOnlyRequest(req.method)) {
        // The reason, when one was given, is included: "suspended" with no
        // explanation is a support ticket, and the tenant is the person who most
        // needs to know why.
        const because = org.statusReason ? ` Reason: ${org.statusReason}` : '';
        throw httpError(
          403,
          (org.status === 'suspended'
            ? 'This account is suspended, so changes cannot be saved. Your existing records are still available to view and export. Please contact support to restore access.'
            : 'This account has been cancelled, so changes cannot be saved. Your existing records are still available to view and export.') + because,
          org.status === 'suspended' ? 'ORG_SUSPENDED' : 'ORG_CANCELLED'
        );
      }
    }
    // Exposed so a response can carry a banner without every controller
    // re-querying the organisation.
    req.orgStatus = org.status;
  }

  /**
   * Usage capture.
   *
   * One row per user per day, deduplicated in memory — see
   * services/usageEventService.js. Placed here rather than in a controller
   * because "was this tenant active" is a property of *any* authenticated
   * request, and because there is then no instrumentation point to forget.
   *
   * An impersonated request is deliberately excluded: support reading a tenant's
   * invoices is not the tenant using the product, and counting it would make the
   * at-risk list quietly wrong for exactly the accounts support is looking at.
   */
  if (!req.impersonation) recordActivity(req);

  /**
   * Account-state guards, run here rather than mounted globally.
   *
   * A global `app.use` would execute *before* this middleware and therefore before
   * `req.user` exists, so both guards would no-op on every request — enforcement that
   * reads like enforcement and does nothing. Running them from inside `protect` is the
   * only placement where the thing they inspect has been loaded, and it means every
   * authenticated route gets them without any router having to remember.
   *
   * Each is a plain `(req, res, next)` and calls `next(error)` on refusal, so the
   * chaining below hands control to the error handler exactly as a mounted middleware
   * would.
   */
  return requireSuperadminMfa(req, res, mfaError => {
    if (mfaError) return next(mfaError);
    return requireVerifiedEmail(req, res, next);
  });
});

/**
 * Tagged rather than name-matched (#63).
 *
 * The generated API description needs to know which routes require a token.
 * Inferring it from `Function.name` fails here for a subtle reason: `protect` is
 * wrapped by `asyncHandler`, so the function Express actually holds is anonymous
 * — and the document would have declared the entire authenticated API public,
 * which is the worst possible thing for a spec to be wrong about.
 */
protect.isAuthGuard = true;

module.exports = { protect };
