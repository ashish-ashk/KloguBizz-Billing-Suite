const router = require('express').Router();
const { getOrganisation, updateOrganisation, transferOwnership } = require('../controllers/organisationController');
const { protect } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { requireTenant } = require('../middleware/tenantMiddleware');
const { validate } = require('../middleware/validate');
const { organisationUpdateSchema, transferOwnershipSchema, accountDeletionSchema } = require('../validators/schemas');
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
router.get('/current/data-rights', requireRole('admin'), dataRightsStatus);
router.get('/current/export', requireRole('admin'), exportTenantData);
router.post('/current/delete-account', requireRole('admin'), validate(accountDeletionSchema), requestDeletion);
router.post('/current/cancel-deletion', requireRole('admin'), cancelDeletion);

module.exports = router;
