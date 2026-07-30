const router = require('express').Router();
const { handleSendgridEvents } = require('../controllers/sendgridWebhookController');

/**
 * No `protect` here, deliberately: the caller is SendGrid, which has no account. The
 * shared secret checked inside the controller is the authentication, and a missing or
 * wrong one is a 401 — see the note there about why an open endpoint would be abusable.
 */
router.post('/events', handleSendgridEvents);

module.exports = router;
