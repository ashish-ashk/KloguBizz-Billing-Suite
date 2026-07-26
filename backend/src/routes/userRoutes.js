const router = require('express').Router();
const {
  listUsers, inviteUser, resendInvite, revokeInvite,
  updateUser, removeUser
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { requireTenant } = require('../middleware/tenantMiddleware');
const { validate } = require('../middleware/validate');
const { userInviteSchema, userUpdateSchema } = require('../validators/schemas');

router.use(protect, requireTenant);
router.get('/', requireRole('admin'), listUsers);
router.post('/invite', requireRole('admin'), validate(userInviteSchema), inviteUser);
// Invitation management. Declared before `/:id` so 'invite' can never be
// mistaken for an id by the router.
router.post('/:id/resend-invite', requireRole('admin'), resendInvite);
router.delete('/:id/invite', requireRole('admin'), revokeInvite);
router.put('/:id', requireRole('admin'), validate(userUpdateSchema), updateUser);
router.delete('/:id', requireRole('admin'), removeUser);

module.exports = router;
