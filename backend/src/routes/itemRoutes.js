const multer = require('multer');
const router = require('express').Router();
const {
  listItems, itemByBarcode, createItem, updateItem, deleteItem, restoreItem,
  downloadItemTemplate, bulkUploadItems
} = require('../controllers/itemController');
const { protect } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { requireTenant } = require('../middleware/tenantMiddleware');
const { httpError } = require('../utils/httpError');
const { validate } = require('../middleware/validate');
const { itemCreateSchema, itemUpdateSchema } = require('../validators/schemas');
const { requireFlag } = require('../services/featureFlagService');

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== XLSX_MIME && !/\.xlsx$/i.test(file.originalname)) {
      return cb(httpError(400, 'Only .xlsx Excel files are supported. Please use the provided template.'));
    }
    cb(null, true);
  }
});

// Normalizes multer's own errors (e.g. file-too-large) into the app's { message } error shape.
function excelUpload(req, res, next) {
  upload.single('file')(req, res, err => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') return next(httpError(400, 'File is too large. Maximum size is 5MB.'));
    return next(err.statusCode ? err : httpError(400, err.message || 'File upload failed.'));
  });
}

router.use(protect, requireTenant);
router.get('/', listItems);
// Bulk import is behind a per-tenant feature flag, so the platform console can
// enable it for a pilot or withdraw it from a tenant abusing it without inventing
// a plan tier. See services/featureFlagService.js.
router.get('/bulk-upload/template', requireRole('admin', 'accountant'), requireFlag('bulkUpload'), downloadItemTemplate);
router.post('/bulk-upload', requireRole('admin', 'accountant'), requireFlag('bulkUpload'), excelUpload, bulkUploadItems);
/**
 * Before `/:id`, or a barcode would be parsed as an id and 400 on the cast.
 * Readable by every role: scanning to look something up is not an admin action.
 */
router.get('/barcode/:barcode', itemByBarcode);
router.post('/', requireRole('admin', 'accountant'), validate(itemCreateSchema), createItem);
router.put('/:id', requireRole('admin', 'accountant'), validate(itemUpdateSchema), updateItem);
router.delete('/:id', requireRole('admin'), deleteItem);
router.post('/:id/restore', requireRole('admin'), restoreItem);

module.exports = router;
