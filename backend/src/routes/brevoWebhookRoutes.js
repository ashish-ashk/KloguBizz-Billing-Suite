const router = require('express').Router();
const { handleBrevoEvents } = require('../controllers/brevoWebhookController');

/**
 * No `protect` here, deliberately: the caller is Brevo, which has no account. The
 * shared secret checked inside the controller (as a `?secret=` query parameter, since
 * Brevo's webhook config has no custom-header field) is the authentication, and a
 * missing or wrong one is a 401 — see the note there about why an open endpoint would
 * be abusable.
 */
router.post('/events', handleBrevoEvents);

module.exports = router;
