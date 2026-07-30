const router = require('express').Router();
const { listClients, createClient, updateClient, deleteClient, restoreClient } = require('../controllers/clientController');
const { protect } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { requireTenant } = require('../middleware/tenantMiddleware');
const { validate } = require('../middleware/validate');
const { clientCreateSchema, clientUpdateSchema } = require('../validators/schemas');

router.use(protect, requireTenant);
router.get('/', listClients);
router.post('/', requireRole('admin', 'accountant'), validate(clientCreateSchema), createClient);
router.put('/:id', requireRole('admin', 'accountant'), validate(clientUpdateSchema), updateClient);
router.delete('/:id', requireRole('admin'), deleteClient);
router.post('/:id/restore', requireRole('admin'), restoreClient);

module.exports = router;
