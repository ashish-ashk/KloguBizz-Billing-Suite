const { httpError } = require('../utils/httpError');

/**
 * Granular superadmin roles.
 *
 * `requireRole('superadmin')` is a single bit: every platform account could delete
 * any tenant, reprice every plan, and sign in as any customer. That is fine for
 * one founder and wrong for everything after — a support hire needs to help
 * customers without being able to wipe them, an accountant needs the billing pages
 * and nothing else, and an auditor needs to read the trail while being provably
 * unable to change it.
 *
 * The roles are deliberately coarse. Four named jobs that map onto how a small
 * SaaS team actually divides this work beats a permission matrix nobody configures
 * correctly — the tenant-side Users page already demonstrates what an unenforced
 * matrix looks like.
 */

const CAPABILITY = {
  /** Read the console: org list, tenant detail, plans, settings, masters. */
  platformRead: 'platform.read',
  /** Read the metrics dashboards. */
  metricsRead: 'metrics.read',
  /** Read the audit trail and the security console. */
  auditRead: 'audit.read',
  /** Create or edit a tenant: profile, plan, status, limits, flags, notices. */
  orgWrite: 'org.write',
  /** Irreversibly delete a tenant and everything it owns. */
  orgDelete: 'org.delete',
  /** Act on a tenant's users: impersonate, reset a password, force a logout. */
  tenantSupport: 'tenant.support',
  /** Change what things cost. */
  billingWrite: 'billing.write',
  /** Change platform-wide configuration: masters, templates, branding, settings. */
  settingsWrite: 'settings.write',
  /** Grant and revoke other platform accounts' roles. Owner only, always — it is
   *  the capability that can hand out every other capability. */
  platformAdmin: 'platform.admin'
};

const ALL_CAPABILITIES = Object.values(CAPABILITY);

const ROLE_CAPABILITIES = {
  // The platform owner. Unrestricted, and the default for any account that
  // predates this field — see resolvePlatformRole.
  owner: ALL_CAPABILITIES,
  // Revenue: plans, pricing, a tenant's plan and limits. No impersonation (that
  // is customer data, not billing data) and no deletion.
  billing: [
    CAPABILITY.platformRead, CAPABILITY.metricsRead, CAPABILITY.auditRead,
    CAPABILITY.orgWrite, CAPABILITY.billingWrite
  ],
  // Support: everything needed to help a customer, including acting as them.
  // Cannot delete a tenant and cannot change pricing.
  support: [
    CAPABILITY.platformRead, CAPABILITY.metricsRead, CAPABILITY.auditRead,
    CAPABILITY.orgWrite, CAPABILITY.tenantSupport
  ],
  // Read-only. The point of the role is that it has no write capability at all,
  // so a compliance reviewer can be given access without being trusted with it.
  auditor: [CAPABILITY.platformRead, CAPABILITY.metricsRead, CAPABILITY.auditRead]
};

/**
 * An account created before `platformRole` existed has no value stored. Treating
 * that as the most restrictive role would lock the platform owner out of their own
 * console on deploy; treating it as 'owner' preserves exactly the behaviour that
 * account had yesterday, which is the correct default for a permission model being
 * introduced to a live system. Migration 004 writes the field explicitly.
 */
function resolvePlatformRole(user) {
  if (!user || user.role !== 'superadmin') return null;
  return user.platformRole || 'owner';
}

function capabilitiesFor(user) {
  const role = resolvePlatformRole(user);
  return role ? (ROLE_CAPABILITIES[role] || []) : [];
}

function hasCapability(user, capability) {
  return capabilitiesFor(user).includes(capability);
}

/**
 * Route guard. Mounted *after* `requireRole('superadmin')`, so this is only ever
 * deciding between platform roles — a tenant user never reaches it.
 */
function requireCapability(capability) {
  return (req, res, next) => {
    if (!hasCapability(req.user, capability)) {
      throw httpError(
        403,
        `Your platform role (${resolvePlatformRole(req.user) || 'none'}) does not include "${capability}".`,
        'PLATFORM_CAPABILITY_REQUIRED'
      );
    }
    next();
  };
}

module.exports = {
  CAPABILITY,
  ROLE_CAPABILITIES,
  resolvePlatformRole,
  capabilitiesFor,
  hasCapability,
  requireCapability
};
