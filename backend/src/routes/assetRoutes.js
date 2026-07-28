const router = require('express').Router();
const { orgAsset, platformAsset } = require('../controllers/assetController');

// Unauthenticated by design — see the note at the top of assetController.js.
// These serve only the two branding images, which already appear on every
// invoice the tenant sends out.
router.get('/org/:orgId/:kind', orgAsset);
router.get('/platform/:kind', platformAsset);

module.exports = router;
