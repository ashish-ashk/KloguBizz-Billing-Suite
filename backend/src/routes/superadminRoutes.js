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
  listAuditLogs
} = require('../controllers/superadminController');
const { protect } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.use(protect, requireRole('superadmin'));
router.get('/overview', overview);
router.get('/organisations', listOrganisations);
router.post('/organisations', createOrganisation);
router.put('/organisations/:id', updateOrganisation);
router.delete('/organisations/:id', deleteOrganisation);
router.get('/plans', listPlansAdmin);
router.post('/plans', upsertPlan);
router.put('/plans/:code', upsertPlan);
router.get('/masters', listMasters);
router.put('/masters/:type', saveMasters);
router.put('/reminders/:id', updateReminder);
router.get('/settings', getSettings);
router.put('/settings/:key', saveSetting);
router.get('/audit-logs', listAuditLogs);

module.exports = router;
