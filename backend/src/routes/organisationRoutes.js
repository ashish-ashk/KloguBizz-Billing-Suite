const router = require('express').Router();
const { getOrganisation, updateOrganisation, transferOwnership } = require('../controllers/organisationController');
const { protect } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { requireTenant } = require('../middleware/tenantMiddleware');
const { validate } = require('../middleware/validate');
const { requireFlag } = require('../services/featureFlagService');
const { requireCapability } = require('../services/entitlementService');
const {
  getSettings: getEInvoiceSettings,
  updateSettings: updateEInvoiceSettings,
  testConnection: testEInvoiceConnection
} = require('../controllers/eInvoiceSettingsController');
const { getSeries, updateSeries } = require('../controllers/documentSeriesController');
const { organisationUpdateSchema, transferOwnershipSchema, accountDeletionSchema, documentSeriesSchema, eInvoiceSettingsSchema } = require('../validators/schemas');
const {
  exportTenantData, requestDeletion, cancelDeletion, dataRightsStatus
} = require('../controllers/dataRightsController');

router.use(protect, requireTenant);
router.get('/current', getOrganisation);
router.put('/current', requireRole('admin'), validate(organisationUpdateSchema), updateOrganisation);
router.post('/current/transfer-ownership', requireRole('admin'), validate(transferOwnershipSchema), transferOwnership);

/**
 * Data portability and erasure (#62).
 *
 * The export is a GET so it can be a plain download link, and is admin-only because
 * it is every record the organisation holds in one file. Deletion is additionally
 * owner-and-password gated inside the controller.
 */
/**
 * Document numbering (item 7).
 *
 * Admin only: it decides what appears on every tax document the business issues,
 * and the next-number field can move a series forward.
 */
router.get('/current/document-series', requireRole('admin'), getSeries);
router.put('/current/document-series', requireRole('admin'), validate(documentSeriesSchema), updateSeries);

/**
 * E-invoicing settings: this tenant's own credentials on the government portal.
 *
 * Admin only. These credentials file returns in the business's name, and the
 * turnover declaration is a compliance statement about the whole business —
 * neither is an accountant's to change. Behind the same feature flag as the
 * reporting endpoints, so an operator can withdraw the whole feature at once.
 */
router.get('/current/e-invoicing', requireRole('admin'), requireFlag('einvoicing'), requireCapability('eInvoicing'), getEInvoiceSettings);
router.put('/current/e-invoicing', requireRole('admin'), requireFlag('einvoicing'), requireCapability('eInvoicing'), validate(eInvoiceSettingsSchema), updateEInvoiceSettings);
router.post('/current/e-invoicing/test', requireRole('admin'), requireFlag('einvoicing'), requireCapability('eInvoicing'), testEInvoiceConnection);

router.get('/current/data-rights', requireRole('admin'), dataRightsStatus);
router.get('/current/export', requireRole('admin'), exportTenantData);
router.post('/current/delete-account', requireRole('admin'), validate(accountDeletionSchema), requestDeletion);
router.post('/current/cancel-deletion', requireRole('admin'), cancelDeletion);

module.exports = router;
