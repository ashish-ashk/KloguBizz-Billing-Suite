const router = require('express').Router();
const { handleWebhook } = require('../controllers/razorpayWebhookController');

router.post('/', handleWebhook);

module.exports = router;
