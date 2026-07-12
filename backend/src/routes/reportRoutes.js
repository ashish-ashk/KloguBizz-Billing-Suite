const router = require('express').Router();
const { gstSummary, exportGstSummaryCsv } = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');
const { requireTenant } = require('../middleware/tenantMiddleware');

router.use(protect, requireTenant);
router.get('/gst-summary', gstSummary);
router.get('/gst-summary/export.csv', exportGstSummaryCsv);

module.exports = router;
