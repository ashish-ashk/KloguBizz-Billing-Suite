const router = require('express').Router();
const { publicBranding } = require('../controllers/publicController');

router.get('/branding', publicBranding);

module.exports = router;
