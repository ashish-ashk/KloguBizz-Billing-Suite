const router = require('express').Router();
const { getOrganisation, updateOrganisation } = require('../controllers/organisationController');
const { protect } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { requireTenant } = require('../middleware/tenantMiddleware');

router.use(protect, requireTenant);
router.get('/current', getOrganisation);
router.put('/current', requireRole('admin'), updateOrganisation);

module.exports = router;
