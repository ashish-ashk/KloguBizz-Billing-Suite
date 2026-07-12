const router = require('express').Router();
const { register, login, me } = require('../controllers/authController');
const { changePassword } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, me);
router.post('/change-password', protect, changePassword);

module.exports = router;
