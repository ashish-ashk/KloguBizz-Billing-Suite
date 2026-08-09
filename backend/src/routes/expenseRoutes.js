const router = require('express').Router();
const {
  listExpenseCategories, listExpenses, createExpense, updateExpense, deleteExpense, restoreExpense, exportExpensesCsv,
  profitLoss, profitLossExcel
} = require('../controllers/expenseController');
const { protect } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { requireTenant } = require('../middleware/tenantMiddleware');
const { validate } = require('../middleware/validate');
const { expenseCreateSchema, expenseUpdateSchema } = require('../validators/schemas');

router.use(protect, requireTenant);

/**
 * Reading the P&L is not an admin action.
 *
 * It is the number everyone in the business is working towards, and hiding it
 * from the people doing the work is the kind of restriction that gets solved by
 * screenshotting it into a group chat. Recording and deleting costs still needs
 * admin or accountant, in line with every other financial document here.
 */
router.get('/profit-loss', profitLoss);
router.get('/profit-loss/export.xlsx', profitLossExcel);

router.get('/categories', listExpenseCategories);
router.get('/', listExpenses);
router.get('/export.csv', exportExpensesCsv);
router.post('/', requireRole('admin', 'accountant'), validate(expenseCreateSchema), createExpense);
router.put('/:id', requireRole('admin', 'accountant'), validate(expenseUpdateSchema), updateExpense);
router.delete('/:id', requireRole('admin', 'accountant'), deleteExpense);
router.post('/:id/restore', requireRole('admin', 'accountant'), restoreExpense);

module.exports = router;
