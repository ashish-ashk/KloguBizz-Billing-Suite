const router = require('express').Router();
const { listUsers, inviteUser, updateUser, removeUser } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { requireTenant } = require('../middleware/tenantMiddleware');

router.use(protect, requireTenant);
router.get('/', requireRole('admin'), listUsers);
router.post('/invite', requireRole('admin'), inviteUser);
router.put('/:id', requireRole('admin'), updateUser);
router.delete('/:id', requireRole('admin'), removeUser);

module.exports = router;
