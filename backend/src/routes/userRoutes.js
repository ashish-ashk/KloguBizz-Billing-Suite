const router = require('express').Router();
const { listUsers, inviteUser, updateUser, removeUser } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { requireTenant } = require('../middleware/tenantMiddleware');
const { validate } = require('../middleware/validate');
const { userInviteSchema, userUpdateSchema } = require('../validators/schemas');

router.use(protect, requireTenant);
router.get('/', requireRole('admin'), listUsers);
router.post('/invite', requireRole('admin'), validate(userInviteSchema), inviteUser);
router.put('/:id', requireRole('admin'), validate(userUpdateSchema), updateUser);
router.delete('/:id', requireRole('admin'), removeUser);

module.exports = router;
