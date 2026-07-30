const router = require('express').Router();
const {
  listVendors, createVendor, updateVendor, deleteVendor, restoreVendor,
  listPurchases, getPurchase, createPurchase, updatePurchase, payPurchase,
  deletePurchase, restorePurchase, itcRegister, exportPurchasesCsv
} = require('../controllers/purchaseController');
const { protect } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { requireTenant } = require('../middleware/tenantMiddleware');
const { validate } = require('../middleware/validate');
const {
  vendorCreateSchema, vendorUpdateSchema,
  purchaseCreateSchema, purchaseUpdateSchema, purchasePaySchema
} = require('../validators/schemas');

/**
 * Purchases, vendors and the ITC register.
 *
 * Role split mirrors the sales side, with one deliberate difference: recording a
 * purchase is an accountant's job (it is bookkeeping), but **deleting** one is not —
 * a purchase carries an input tax credit that may already have been claimed in a filed
 * return, so removing it is an admin decision for the same reason writing off revenue
 * is.
 */
router.use(protect, requireTenant);

// ── Vendors ──
router.get('/vendors', listVendors);
router.post('/vendors', requireRole('admin', 'accountant'), validate(vendorCreateSchema), createVendor);
router.post('/vendors/:id/restore', requireRole('admin'), restoreVendor);
router.put('/vendors/:id', requireRole('admin', 'accountant'), validate(vendorUpdateSchema), updateVendor);
router.delete('/vendors/:id', requireRole('admin'), deleteVendor);

// ── Purchases ──
// Literal paths first, so neither is swallowed by '/:id'.
router.get('/export.csv', exportPurchasesCsv);
router.get('/itc-register', itcRegister);
router.get('/', listPurchases);
router.post('/', requireRole('admin', 'accountant'), validate(purchaseCreateSchema), createPurchase);
router.post('/:id/pay', requireRole('admin', 'accountant'), validate(purchasePaySchema), payPurchase);
router.post('/:id/restore', requireRole('admin'), restorePurchase);
router.get('/:id', getPurchase);
router.put('/:id', requireRole('admin', 'accountant'), validate(purchaseUpdateSchema), updatePurchase);
router.delete('/:id', requireRole('admin'), deletePurchase);

module.exports = router;
