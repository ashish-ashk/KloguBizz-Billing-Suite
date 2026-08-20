const router = require('express').Router();
const {
  listExpenseCategories, listExpenses, createExpense, updateExpense, deleteExpense, restoreExpense, exportExpensesCsv,
  profitLoss, profitLossExcel
} = require('../controllers/expenseController');
const { protect } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { requireTenant } = require('../middleware/tenantMiddleware');
const { requireCapability, requireCapabilityForWrites } = require('../services/entitlementService');
const { validate } = require('../middleware/validate');
const { expenseCreateSchema, expenseUpdateSchema } = require('../validators/schemas');

router.use(protect, requireTenant);
/**
 * Two capabilities, not one.
 *
 * Expenses and the profit-and-loss report happen to share a router and are two
 * different things to buy. Gating the group on `expenses` would refuse the P&L to
 * a tenant granted `profitLoss` on its own — which an operator can legitimately
 * do for a bespoke deal.
 *
 * Recording an expense is a write and is gated as one; reading back expenses a
 * tenant already entered is not, because those are their own books. The P&L *is*
 * the feature, so it is gated outright.
 */

/**
 * Reading the P&L is not an admin action.
 *
 * It is the number everyone in the business is working towards, and hiding it
 * from the people doing the work is the kind of restriction that gets solved by
 * screenshotting it into a group chat. Recording and deleting costs still needs
 * admin or accountant, in line with every other financial document here.
 */
router.get('/profit-loss', requireCapability('profitLoss'), profitLoss);
router.get('/profit-loss/export.xlsx', requireCapability('profitLoss'), requireCapability('exports'), profitLossExcel);

router.get('/categories', listExpenseCategories);
router.get('/', listExpenses);
router.get('/export.csv', exportExpensesCsv);
router.post('/', requireCapabilityForWrites('expenses'), requireRole('admin', 'accountant'), validate(expenseCreateSchema), createExpense);
router.put('/:id', requireCapabilityForWrites('expenses'), requireRole('admin', 'accountant'), validate(expenseUpdateSchema), updateExpense);
router.delete('/:id', requireCapabilityForWrites('expenses'), requireRole('admin', 'accountant'), deleteExpense);
router.post('/:id/restore', requireCapabilityForWrites('expenses'), requireRole('admin', 'accountant'), restoreExpense);

module.exports = router;
