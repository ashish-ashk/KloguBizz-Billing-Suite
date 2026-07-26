const router = require('express').Router();
const { getOrganisation, updateOrganisation, transferOwnership } = require('../controllers/organisationController');
const { protect } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { requireTenant } = require('../middleware/tenantMiddleware');
const { validate } = require('../middleware/validate');
const { organisationUpdateSchema, transferOwnershipSchema } = require('../validators/schemas');

router.use(protect, requireTenant);
router.get('/current', getOrganisation);
router.put('/current', requireRole('admin'), validate(organisationUpdateSchema), updateOrganisation);
router.post('/current/transfer-ownership', requireRole('admin'), validate(transferOwnershipSchema), transferOwnership);

module.exports = router;
