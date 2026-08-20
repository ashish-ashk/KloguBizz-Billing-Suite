const router = require('express').Router();
const { gstSummary, exportGstSummaryCsv } = require('../controllers/reportController');
const {
  gstr1, gstr1Json, gstr1Csv, gstr3b,
  checkEInvoice, generateEInvoice, cancelEInvoice, eInvoiceWorklist,
  cmp08, checkEwayBill, previewEwayBill, generateEwayBill, reconcileGstr2b
} = require('../controllers/gstReturnController');
const { protect } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { requireTenant } = require('../middleware/tenantMiddleware');
const { requireFlag } = require('../services/featureFlagService');
const { requireCapability } = require('../services/entitlementService');
const { validate } = require('../middleware/validate');
const {
  stockAdjustSchema, stockLocationCreateSchema, stockLocationUpdateSchema, stockTransferSchema
} = require('../validators/schemas');
const stockLocations = require('../controllers/stockLocationController');
const {
  ageingReport, ageingExcel,
  customerStatement, customerStatementExcel,
  collectionMetrics, salesBreakdown, invoicesExcel,
  stockLedger, lowStock, adjustStock, recomputeStock,
  stockValuation, expiringStock, itemStockLayers,
  tenantAuditLog
} = require('../controllers/receivablesController');

router.use(protect, requireTenant);
router.get('/gst-summary', gstSummary);
router.get('/gst-summary/export.csv', requireCapability('exports'), exportGstSummaryCsv);

/**
 * GSTR-1 and GSTR-3B (Phase 5).
 *
 * Readable by any role: a viewer who cannot see the return cannot check it, and
 * checking is the point of showing it before it is filed.
 */
router.get('/gstr1', gstr1);
router.get('/gstr1/export.json', requireCapability('exports'), gstr1Json);
router.get('/gstr1/export.csv', requireCapability('exports'), gstr1Csv);
router.get('/gstr3b', gstr3b);

/**
 * E-invoicing.
 *
 * Behind the `einvoicing` feature flag, which the platform console can now grant
 * per tenant — the flag stopped being decorative the moment these routes existed.
 * Reporting a document to the government is an admin action.
 */
/**
 * Receivables (2.4 #28, #29, #31, #33) and Excel export (#34).
 *
 * All readable by any role: these answer "who owes us what", and a viewer who cannot
 * see it cannot help chase it.
 */
router.get('/ageing', requireCapability('receivables'), ageingReport);
router.get('/ageing/export.xlsx', requireCapability('exports'), ageingExcel);
router.get('/statement/:clientId', customerStatement);
router.get('/statement/:clientId/export.xlsx', customerStatementExcel);
router.get('/collections', requireCapability('receivables'), collectionMetrics);
router.get('/sales-breakdown', salesBreakdown);
router.get('/invoices/export.xlsx', requireCapability('exports'), invoicesExcel);

/**
 * Stock (2.5 #37–#39). Adjusting is an admin action: it moves a balance without a
 * document behind it, which is exactly the operation that needs to be attributable.
 */
router.get('/stock/ledger', requireCapability('inventory'), stockLedger);
router.get('/stock/low', requireCapability('inventory'), lowStock);
router.post('/stock/:id/adjust', requireRole('admin'), requireCapability('inventory'), validate(stockAdjustSchema), adjustStock);
router.post('/stock/:id/recompute', requireRole('admin'), requireCapability('inventory'), recomputeStock);
/**
 * Valuation and expiry (2.5 #41, #42).
 *
 * Readable by any role for the same reason the ledger is: knowing what is on the
 * shelf and what it is worth is what everyone in the business is doing here.
 * Changing it still needs admin.
 */
router.get('/stock/valuation', stockValuation);
router.get('/stock/expiring', requireCapability('inventory'), expiringStock);
router.get('/stock/:id/layers', requireCapability('stockValuation'), itemStockLayers);

/**
 * Warehouses and transfers (2.5 #42).
 *
 * Declared before `/stock/:id/...` would be reached for the literal path, and
 * kept on the reports router because everything else about stock already lives
 * here. Creating a location and moving stock are admin: both change balances
 * with no customer document behind them, which is exactly what needs a name
 * against it.
 */
router.get('/stock/locations', requireCapability('warehouses'), stockLocations.listLocations);
router.post('/stock/locations', requireCapability('warehouses'), requireRole('admin'), validate(stockLocationCreateSchema), stockLocations.createLocation);
router.put('/stock/locations/:id', requireCapability('warehouses'), requireRole('admin'), validate(stockLocationUpdateSchema), stockLocations.updateLocation);
router.post('/stock/transfer', requireCapability('warehouses'), requireRole('admin'), validate(stockTransferSchema), stockLocations.transferStock);
router.get('/stock/:id/locations', requireCapability('warehouses'), stockLocations.itemLocations);

/**
 * The tenant's own audit trail (2.6 #50).
 *
 * `AuditLog` has recorded `orgId` from the start and was only ever exposed on the
 * superadmin route, so a tenant admin could not see who in their own organisation
 * changed what. Admin-only: it names individual users' actions.
 */
router.get('/activity', requireRole('admin'), tenantAuditLog);

router.get('/e-invoice/worklist', requireFlag('einvoicing'), eInvoiceWorklist);
router.get('/e-invoice/:id/check', requireFlag('einvoicing'), checkEInvoice);
router.post('/e-invoice/:id/generate', requireRole('admin'), requireFlag('einvoicing'), generateEInvoice);
router.post('/e-invoice/:id/cancel', requireRole('admin'), requireFlag('einvoicing'), cancelEInvoice);

/**
 * E-way bills (2.1 #6).
 *
 * `check` is readable by anyone: whether a consignment needs a bill is a
 * dispatch-floor question, and the person loading the lorry is rarely the admin.
 * Generating one is a filing with the government, so it is not.
 */
/** CMP-08 — the composition dealer's quarterly statement (2.1 #10). */
router.get('/gst/cmp-08', requireCapability('compositionAndQrmp'), cmp08);

router.get('/eway-bill/:id/check', checkEwayBill);
router.post('/eway-bill/:id/preview', requireRole('admin', 'accountant'), previewEwayBill);
router.post('/eway-bill/:id/generate', requireRole('admin'), generateEwayBill);

/**
 * GSTR-2B reconciliation (2.1 #7).
 *
 * Takes the portal's own JSON download in the body — no GSP connection needed.
 * A POST because it carries a document, not because it changes anything: nothing
 * is written, and the report is computed and returned.
 */
router.post('/gstr-2b/reconcile', requireCapability('gstr2b'), requireRole('admin', 'accountant'), reconcileGstr2b);

module.exports = router;
