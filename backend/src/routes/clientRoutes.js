const router = require('express').Router();
const { listClients, createClient, updateClient, deleteClient } = require('../controllers/clientController');
const { protect } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { requireTenant } = require('../middleware/tenantMiddleware');

router.use(protect, requireTenant);
router.get('/', listClients);
router.post('/', requireRole('admin', 'accountant'), createClient);
router.put('/:id', requireRole('admin', 'accountant'), updateClient);
router.delete('/:id', requireRole('admin'), deleteClient);

module.exports = router;
