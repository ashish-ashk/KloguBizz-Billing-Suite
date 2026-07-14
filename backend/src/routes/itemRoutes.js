const router = require('express').Router();
const { listItems, createItem, updateItem, deleteItem } = require('../controllers/itemController');
const { protect } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { requireTenant } = require('../middleware/tenantMiddleware');

router.use(protect, requireTenant);
router.get('/', listItems);
router.post('/', requireRole('admin', 'accountant'), createItem);
router.put('/:id', requireRole('admin', 'accountant'), updateItem);
router.delete('/:id', requireRole('admin'), deleteItem);

module.exports = router;
