const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateInvoiceTotals } = require('../src/services/gstService');

test('calculates CGST and SGST for same-state invoices', () => {
  const totals = calculateInvoiceTotals([{ qty: 1, rate: 1000, gstRate: 18 }], '27', '27');
  assert.equal(totals.subtotal, 1000);
  assert.equal(totals.cgst, 90);
  assert.equal(totals.sgst, 90);
  assert.equal(totals.igst, 0);
  assert.equal(totals.total, 1180);
  assert.equal(totals.isIGST, false);
});

test('calculates IGST for inter-state invoices', () => {
  const totals = calculateInvoiceTotals([{ qty: 2, rate: 500, gstRate: 18 }], '27', '29');
  assert.equal(totals.subtotal, 1000);
  assert.equal(totals.cgst, 0);
  assert.equal(totals.sgst, 0);
  assert.equal(totals.igst, 180);
  assert.equal(totals.total, 1180);
  assert.equal(totals.isIGST, true);
});
