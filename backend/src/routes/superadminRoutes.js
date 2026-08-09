const router = require('express').Router();
const {
  overview,
  listOrganisations,
  createOrganisation,
  updateOrganisation,
  deleteOrganisation,
  listPlansAdmin,
  upsertPlan,
  planHistory,
  listMasters,
  saveMasters,
  updateReminder,
  getSettings,
  saveSetting,
  listAuditLogs,
  exportAuditLogsCsv
} = require('../controllers/superadminController');
const platform = require('../controllers/platformController');
const coupons = require('../controllers/couponController');
const { protect } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { CAPABILITY, requireCapability } = require('../middleware/platformRoleMiddleware');
const { validate, validatedElsewhere } = require('../middleware/validate');
/**
 * Request shapes for the console (#63).
 *
 * These routes had no validator at all until the generated API description named
 * them. The console is the least-exercised surface in the product and the one
 * where a bad write does the most damage.
 */
const {
  tenantLimitsSchema, tenantFlagsSchema, tenantNoticeSchema, tenantSupportSchema,
  tenantUserUpdateSchema, platformRoleSchema, broadcastSchema, planUpsertSchema,
  mastersSaveSchema, reminderUpdateSchema, organisationAdminUpdateSchema,
  couponUpsertSchema, creditCreateSchema, creditSettleSchema
} = require('../validators/schemas');
const { requireApproval, requireCapabilityOrGrant } = require('../middleware/approvalMiddleware');
const { assertDeletionConfirmed } = require('../controllers/superadminController');
const { superadminIpAllowlist } = require('../middleware/accountGuards');
const { emailDeliverability, releaseSuppression, listSuppressions } = require('../controllers/platformController');

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
/**
 * The IP allowlist is mounted here and nowhere else: it must never restrict a
 * tenant, and one mount point at the only place it applies means it cannot drift.
 * Empty by default (see env.SUPERADMIN_IP_ALLOWLIST).
 */
router.use(superadminIpAllowlist, protect, requireRole('superadmin'));

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
/** Individual job executions, for when the summary says something is wrong and
 *  the next question is "since when, and with what error". */
router.get('/system/jobs', requireCapability(CAPABILITY.platformRead), platform.jobRuns);

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
router.put('/organisations/:id/limits', requireCapability(CAPABILITY.orgWrite), validate(tenantLimitsSchema), platform.setTenantLimits);
router.put('/organisations/:id/flags', requireCapability(CAPABILITY.orgWrite), validate(tenantFlagsSchema), platform.setTenantFlags);
router.post('/organisations/:id/trial', requireCapability(CAPABILITY.orgWrite), platform.setTenantTrial);
router.put('/organisations/:id/notice', requireCapability(CAPABILITY.orgWrite), validate(tenantNoticeSchema), platform.setTenantNotice);
router.put('/organisations/:id/support', requireCapability(CAPABILITY.orgWrite), validate(tenantSupportSchema), platform.setTenantSupport);
router.post('/organisations/:id/force-logout', requireCapability(CAPABILITY.tenantSupport), platform.forceLogoutOrg);
router.post('/organisations/:id/impersonate', requireCapability(CAPABILITY.tenantSupport), platform.impersonate);

router.get('/organisations/:id', requireCapability(CAPABILITY.platformRead), platform.tenantDetail);
router.put('/organisations/:id', requireCapability(CAPABILITY.orgWrite), validate(organisationAdminUpdateSchema), updateOrganisation);
// Irreversible and platform-wide: its own capability, held only by an owner.
/**
 * Deleting a tenant needs a second operator (3.4 #12).
 *
 * The one action in this console that is both irreversible and total: it erases
 * a business's entire records. Roles do not help here — the person clicking has
 * exactly the permission required, and the difference between a legitimate
 * deletion and a catastrophic one is a mis-click on a list of similar names.
 *
 * `requireCapabilityOrGrant` rather than the plain guard, so an owner locked out
 * of their own console at 3am is not the reason a customer stays broken. The
 * approval requirement still applies on top: break-glass gets you the
 * capability, not a bypass of the second signature.
 */
router.delete(
  '/organisations/:id',
  requireCapabilityOrGrant(CAPABILITY.orgDelete),
  requireApproval({
    capability: CAPABILITY.orgDelete,
    describe: req => `Permanently delete organisation ${req.params.id} and everything it owns`,
    preview: req => ({ organisationId: req.params.id }),
    // The typed-name confirmation is a local check on the request itself, so it
    // runs first. `deleteOrganisation` checks it again — belt and braces, and
    // the controller must stay correct when called any other way.
    precondition: assertDeletionConfirmed
  }),
  deleteOrganisation
);

// ── Approvals and emergency access (3.4 #12) ──
/** The platform's own tax invoices, and whether we are configured to issue any. */
router.get('/platform-invoices', requireCapability(CAPABILITY.billingWrite), platform.listPlatformInvoices);

router.get('/approvals', requireCapability(CAPABILITY.platformRead), platform.listApprovals);
router.post('/approvals/:id/decide', requireCapability(CAPABILITY.platformRead), platform.decideApproval);
router.post('/break-glass', requireCapability(CAPABILITY.platformRead), platform.takeBreakGlass);
router.get('/break-glass', requireCapability(CAPABILITY.auditRead), platform.listBreakGlass);

// ── Tenant users (support actions) ───────────────
router.put('/users/:id', requireCapability(CAPABILITY.tenantSupport), validate(tenantUserUpdateSchema), platform.updateTenantUser);
router.post('/users/:id/reset-password', requireCapability(CAPABILITY.tenantSupport), platform.resetTenantUserPassword);
router.post('/users/:id/unlock', requireCapability(CAPABILITY.tenantSupport), platform.unlockTenantUser);
router.post('/users/:id/force-logout', requireCapability(CAPABILITY.tenantSupport), platform.forceLogoutUser);

// ── Platform accounts ────────────────────────────
router.get('/platform-users', requireCapability(CAPABILITY.platformRead), platform.listPlatformUsers);
router.put('/platform-users/:id/role', requireCapability(CAPABILITY.platformAdmin), validate(platformRoleSchema), platform.setPlatformRole);

// ── Broadcast ────────────────────────────────────
router.put('/broadcast', requireCapability(CAPABILITY.settingsWrite), validate(broadcastSchema), platform.setBroadcast);

// ── Plans & pricing ──────────────────────────────
router.get('/plans', requireCapability(CAPABILITY.platformRead), listPlansAdmin);
router.post('/plans', requireCapability(CAPABILITY.billingWrite), validate(planUpsertSchema), upsertPlan);
router.put('/plans/:code', requireCapability(CAPABILITY.billingWrite), validate(planUpsertSchema), upsertPlan);
/** Every price this plan has ever carried. Readable with plain platform read
 *  access: "what did we charge in March" is a support question, not a pricing one. */
router.get('/plans/:code/history', requireCapability(CAPABILITY.platformRead), planHistory);

// ── Discount codes and billing credits (3.3 #10) ─
/**
 * Both give money away, so both need `billingWrite` to change and only
 * `platformRead` to look at. Support answers "why was this customer charged
 * ₹499" far more often than anyone creates a coupon.
 */
router.get('/coupons', requireCapability(CAPABILITY.platformRead), coupons.listCoupons);
router.post('/coupons', requireCapability(CAPABILITY.billingWrite), validate(couponUpsertSchema), coupons.upsertCoupon);
router.put('/coupons/:code', requireCapability(CAPABILITY.billingWrite), validate(couponUpsertSchema), coupons.upsertCoupon);
router.delete('/coupons/:id', requireCapability(CAPABILITY.billingWrite), coupons.deactivateCoupon);
router.get('/coupons/:id/redemptions', requireCapability(CAPABILITY.platformRead), coupons.couponRedemptions);

router.get('/credits', requireCapability(CAPABILITY.platformRead), coupons.listCredits);
router.post('/tenants/:id/credits', requireCapability(CAPABILITY.billingWrite), validate(creditCreateSchema), coupons.createCredit);
router.post('/credits/:id/settle', requireCapability(CAPABILITY.billingWrite), validate(creditSettleSchema), coupons.settleCredit);

// ── Platform configuration ───────────────────────
router.get('/masters', requireCapability(CAPABILITY.platformRead), listMasters);
router.put('/masters/:type', requireCapability(CAPABILITY.settingsWrite), validate(mastersSaveSchema), saveMasters);
router.put('/reminders/:id', requireCapability(CAPABILITY.settingsWrite), validate(reminderUpdateSchema), updateReminder);
router.get('/settings', requireCapability(CAPABILITY.platformRead), getSettings);
router.put('/settings/:key', requireCapability(CAPABILITY.settingsWrite),
  validatedElsewhere('validators/settings.js assertValidSetting — the body shape depends on :key'), saveSetting);

// ── Audit & security (3.4) ───────────────────────
// Declared before the plain list so the literal path isn't shadowed by it.
router.get('/audit-logs/export.csv', requireCapability(CAPABILITY.auditRead), exportAuditLogsCsv);
router.get('/audit-logs', requireCapability(CAPABILITY.auditRead), listAuditLogs);
router.get('/security/logins', requireCapability(CAPABILITY.auditRead), platform.loginHistory);
router.get('/security/alerts', requireCapability(CAPABILITY.auditRead), platform.securityAlerts);

// ── Email deliverability (3.5 / #58) ─────────────
router.get('/email/deliverability', requireCapability(CAPABILITY.platformRead), emailDeliverability);
router.get('/email/suppressions', requireCapability(CAPABILITY.platformRead), listSuppressions);
router.post('/email/suppressions/release', requireCapability(CAPABILITY.settingsWrite), releaseSuppression);

module.exports = router;
