const router = require('express').Router();
const {
  overview,
  listOrganisations,
  createOrganisation,
  updateOrganisation,
  deleteOrganisation,
  listPlansAdmin,
  upsertPlan,
  listMasters,
  saveMasters,
  updateReminder,
  getSettings,
  saveSetting,
  listAuditLogs,
  exportAuditLogsCsv
} = require('../controllers/superadminController');
const platform = require('../controllers/platformController');
const { protect } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { CAPABILITY, requireCapability } = require('../middleware/platformRoleMiddleware');

/**
 * The platform console.
 *
 * Every route is behind `requireRole('superadmin')` as before, and now
 * additionally behind a capability. The capability is the interesting part: this
 * surface can delete a tenant, reprice every plan and sign in as any customer, and
 * until Phase 4 a single boolean decided who could do all three. See
 * middleware/platformRoleMiddleware.js for the four roles and what each holds.
 *
 * Read routes take `platformRead`, so an auditor sees the console; every write
 * takes the capability that names it, so the auditor cannot use it.
 */
router.use(protect, requireRole('superadmin'));

// What this operator is allowed to do — the console reads it to decide what to
// render. Not a control (each route is guarded), a courtesy.
router.get('/me', platform.platformMe);

// ── Observability (3.1) ──────────────────────────
router.get('/metrics/summary', requireCapability(CAPABILITY.metricsRead), platform.metricsSummary);
router.get('/metrics/series', requireCapability(CAPABILITY.metricsRead), platform.metricsSeries);
router.get('/metrics/attention', requireCapability(CAPABILITY.metricsRead), platform.metricsAttention);
router.get('/metrics/adoption', requireCapability(CAPABILITY.metricsRead), platform.metricsAdoption);
// Recomputing the rollup only rewrites derived data, but it is still a write, and
// "the auditor role cannot write" has to hold without exceptions to be worth
// anything.
router.post('/metrics/rebuild', requireCapability(CAPABILITY.orgWrite), platform.metricsRebuild);
router.get('/system/health', requireCapability(CAPABILITY.platformRead), platform.systemHealth);

// ── Organisations ────────────────────────────────
router.get('/overview', requireCapability(CAPABILITY.platformRead), overview);
router.get('/organisations', requireCapability(CAPABILITY.platformRead), listOrganisations);
router.post('/organisations', requireCapability(CAPABILITY.orgWrite), createOrganisation);

// Tenant drill-down and lifecycle actions. Declared before the bare `/:id`
// handlers so a literal segment is never swallowed by the parameter.
router.get('/organisations/:id/users', requireCapability(CAPABILITY.platformRead), platform.tenantUsers);
router.get('/organisations/:id/invoices', requireCapability(CAPABILITY.platformRead), platform.tenantInvoices);
router.get('/organisations/:id/timeline', requireCapability(CAPABILITY.auditRead), platform.tenantTimeline);
router.post('/organisations/:id/status', requireCapability(CAPABILITY.orgWrite), platform.setTenantStatus);
router.put('/organisations/:id/limits', requireCapability(CAPABILITY.orgWrite), platform.setTenantLimits);
router.put('/organisations/:id/flags', requireCapability(CAPABILITY.orgWrite), platform.setTenantFlags);
router.post('/organisations/:id/trial', requireCapability(CAPABILITY.orgWrite), platform.setTenantTrial);
router.put('/organisations/:id/notice', requireCapability(CAPABILITY.orgWrite), platform.setTenantNotice);
router.put('/organisations/:id/support', requireCapability(CAPABILITY.orgWrite), platform.setTenantSupport);
router.post('/organisations/:id/force-logout', requireCapability(CAPABILITY.tenantSupport), platform.forceLogoutOrg);
router.post('/organisations/:id/impersonate', requireCapability(CAPABILITY.tenantSupport), platform.impersonate);

router.get('/organisations/:id', requireCapability(CAPABILITY.platformRead), platform.tenantDetail);
router.put('/organisations/:id', requireCapability(CAPABILITY.orgWrite), updateOrganisation);
// Irreversible and platform-wide: its own capability, held only by an owner.
router.delete('/organisations/:id', requireCapability(CAPABILITY.orgDelete), deleteOrganisation);

// ── Tenant users (support actions) ───────────────
router.put('/users/:id', requireCapability(CAPABILITY.tenantSupport), platform.updateTenantUser);
router.post('/users/:id/reset-password', requireCapability(CAPABILITY.tenantSupport), platform.resetTenantUserPassword);
router.post('/users/:id/unlock', requireCapability(CAPABILITY.tenantSupport), platform.unlockTenantUser);
router.post('/users/:id/force-logout', requireCapability(CAPABILITY.tenantSupport), platform.forceLogoutUser);

// ── Platform accounts ────────────────────────────
router.get('/platform-users', requireCapability(CAPABILITY.platformRead), platform.listPlatformUsers);
router.put('/platform-users/:id/role', requireCapability(CAPABILITY.platformAdmin), platform.setPlatformRole);

// ── Broadcast ────────────────────────────────────
router.put('/broadcast', requireCapability(CAPABILITY.settingsWrite), platform.setBroadcast);

// ── Plans & pricing ──────────────────────────────
router.get('/plans', requireCapability(CAPABILITY.platformRead), listPlansAdmin);
router.post('/plans', requireCapability(CAPABILITY.billingWrite), upsertPlan);
router.put('/plans/:code', requireCapability(CAPABILITY.billingWrite), upsertPlan);

// ── Platform configuration ───────────────────────
router.get('/masters', requireCapability(CAPABILITY.platformRead), listMasters);
router.put('/masters/:type', requireCapability(CAPABILITY.settingsWrite), saveMasters);
router.put('/reminders/:id', requireCapability(CAPABILITY.settingsWrite), updateReminder);
router.get('/settings', requireCapability(CAPABILITY.platformRead), getSettings);
router.put('/settings/:key', requireCapability(CAPABILITY.settingsWrite), saveSetting);

// ── Audit & security (3.4) ───────────────────────
// Declared before the plain list so the literal path isn't shadowed by it.
router.get('/audit-logs/export.csv', requireCapability(CAPABILITY.auditRead), exportAuditLogsCsv);
router.get('/audit-logs', requireCapability(CAPABILITY.auditRead), listAuditLogs);
router.get('/security/logins', requireCapability(CAPABILITY.auditRead), platform.loginHistory);
router.get('/security/alerts', requireCapability(CAPABILITY.auditRead), platform.securityAlerts);

module.exports = router;
