const multer = require('multer');
const router = require('express').Router();
const {
  listClients, createClient, updateClient, deleteClient, restoreClient,
  downloadClientTemplate, bulkUploadClients
} = require('../controllers/clientController');
const { protect } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { requireTenant } = require('../middleware/tenantMiddleware');
const { validate } = require('../middleware/validate');
const { clientCreateSchema, clientUpdateSchema } = require('../validators/schemas');
const { requireFlag } = require('../services/featureFlagService');
const { requireCapability } = require('../services/entitlementService');
const { httpError } = require('../utils/httpError');

/**
 * A customer list is text, so 2MB is already thousands of rows — and the row cap
 * in the import service refuses a long file with an explanation before anything
 * is parsed. The size limit here is only to stop something absurd being read
 * into memory.
 */
const ACCEPTED = /\.(csv|txt|xlsx)$/i;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    /**
     * Judged on the filename, not the browser's mime type.
     *
     * Browsers disagree about what a .csv is — `text/csv`, `application/csv`,
     * `application/vnd.ms-excel` and `text/plain` are all in use for the same
     * file, and on Windows the type depends on which program is registered to
     * open it. Filtering on mime type rejects correct files on some machines and
     * not others, which is the worst possible way for this to fail.
     */
    if (!ACCEPTED.test(file.originalname || '')) {
      return cb(httpError(400, 'Please upload a .csv file (or an .xlsx saved from the template).', 'BAD_FILE_TYPE'));
    }
    cb(null, true);
  }
});

// Turns multer's own errors — file too large, above all — into the app's error shape.
function csvUpload(req, res, next) {
  upload.single('file')(req, res, err => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(httpError(400, 'That file is larger than 2MB. A customer list is text, so this usually means a spreadsheet with images or formatting in it — save it as CSV and try again.', 'FILE_TOO_LARGE'));
    }
    return next(err.statusCode ? err : httpError(400, err.message || 'That upload failed.'));
  });
}

router.use(protect, requireTenant);
router.get('/', listClients);

/**
 * Before `/:id`, or "bulk-upload" is read as an id and 400s on the cast.
 *
 * Behind the same flag and capability as the item importer: one bulk-upload
 * switch, so the platform console can withdraw it from a tenant abusing it
 * without inventing a second control that does nearly the same thing.
 */
router.get('/bulk-upload/template', requireRole('admin', 'accountant'), requireFlag('bulkUpload'), requireCapability('bulkUpload'), downloadClientTemplate);
router.post('/bulk-upload', requireRole('admin', 'accountant'), requireFlag('bulkUpload'), requireCapability('bulkUpload'), csvUpload, bulkUploadClients);

router.post('/', requireRole('admin', 'accountant'), validate(clientCreateSchema), createClient);
router.put('/:id', requireRole('admin', 'accountant'), validate(clientUpdateSchema), updateClient);
router.delete('/:id', requireRole('admin'), deleteClient);
router.post('/:id/restore', requireRole('admin'), restoreClient);

module.exports = router;
