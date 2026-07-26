const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateInvoiceTotals, calculateLine } = require('../src/services/gstService');

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

test('applies a per-line discount to the taxable value, not just the total', () => {
  const totals = calculateInvoiceTotals(
    [{ qty: 1, rate: 1000, gstRate: 18, discountPercent: 10 }], '27', '27'
  );
  assert.equal(totals.grossSubtotal, 1000);
  assert.equal(totals.discountTotal, 100);
  // Tax is charged on the discounted value, which is what GST requires when
  // the discount appears on the invoice.
  assert.equal(totals.subtotal, 900);
  assert.equal(totals.cgst, 81);
  assert.equal(totals.sgst, 81);
  assert.equal(totals.total, 1062);
});

test('applies an invoice-level discount on top of line discounts', () => {
  const totals = calculateInvoiceTotals(
    [{ qty: 1, rate: 1000, gstRate: 18, discountPercent: 10 }], '27', '27',
    { discountPercent: 50 }
  );
  assert.equal(totals.grossSubtotal, 1000);
  // 1000 → 900 after the line discount → 450 after the invoice discount.
  assert.equal(totals.subtotal, 450);
  assert.equal(totals.discountTotal, 550);
  assert.equal(totals.total, 531);
});

test('back-calculates tax from a tax-inclusive rate instead of taxing it again', () => {
  const totals = calculateInvoiceTotals(
    [{ qty: 1, rate: 1180, gstRate: 18, taxInclusive: true }], '27', '27'
  );
  // The customer pays the ₹1180 shown on the shelf; tax is extracted from it.
  assert.equal(totals.subtotal, 1000);
  assert.equal(totals.cgst, 90);
  assert.equal(totals.sgst, 90);
  assert.equal(totals.total, 1180);
});

test('charges compensation cess in addition to GST', () => {
  const totals = calculateInvoiceTotals(
    [{ qty: 1, rate: 1000, gstRate: 28, cessRate: 12 }], '27', '27'
  );
  assert.equal(totals.subtotal, 1000);
  assert.equal(totals.cgst, 140);
  assert.equal(totals.sgst, 140);
  assert.equal(totals.cess, 120);
  assert.equal(totals.total, 1400);
});

test('rounds the payable total to a whole rupee and records the adjustment', () => {
  const totals = calculateInvoiceTotals([{ qty: 3, rate: 33.33, gstRate: 18 }], '27', '27');
  // 99.99 taxable + 18.00 tax = 117.99 → 118, so round-off is +0.01.
  assert.equal(totals.subtotal, 99.99);
  assert.equal(totals.total, 118);
  assert.equal(totals.roundOff, 0.01);
  // The adjustment always reconciles the parts to the whole.
  const parts = totals.subtotal + totals.cgst + totals.sgst + totals.igst + totals.cess + totals.roundOff;
  assert.equal(Math.round(parts * 100) / 100, totals.total);
});

test('can be told not to round, for tenants billing in exact paise', () => {
  const totals = calculateInvoiceTotals(
    [{ qty: 3, rate: 33.33, gstRate: 18 }], '27', '27', { roundOff: false }
  );
  assert.equal(totals.total, 117.99);
  assert.equal(totals.roundOff, 0);
});

test('splits CGST and SGST so the halves always sum back to the line tax', () => {
  // 0.05 tax cannot be halved evenly into paise.
  const totals = calculateInvoiceTotals([{ qty: 1, rate: 1, gstRate: 5 }], '27', '27');
  assert.equal(totals.cgst + totals.sgst, 0.05);
});

test('flags a UT supply so the state share can be labelled UTGST', () => {
  // 35 = Andaman & Nicobar, which levies UTGST rather than SGST.
  const ut = calculateInvoiceTotals([{ qty: 1, rate: 1000, gstRate: 18 }], '35', '35');
  assert.equal(ut.isUT, true);
  assert.equal(ut.sgst, 90);

  // Delhi has its own legislature and levies SGST.
  const delhi = calculateInvoiceTotals([{ qty: 1, rate: 1000, gstRate: 18 }], '07', '07');
  assert.equal(delhi.isUT, false);

  // An inter-state supply is IGST regardless of either end being a UT.
  const interstate = calculateInvoiceTotals([{ qty: 1, rate: 1000, gstRate: 18 }], '27', '35');
  assert.equal(interstate.isUT, false);
  assert.equal(interstate.isIGST, true);
});

test('rejects non-numeric input instead of persisting NaN totals', () => {
  assert.throws(
    () => calculateInvoiceTotals([{ qty: 'abc', rate: 100, gstRate: 18 }], '27', '27'),
    /items\[0\]\.qty must be a number/
  );
  assert.throws(
    () => calculateInvoiceTotals([{ qty: 1, rate: 'free', gstRate: 18 }], '27', '27'),
    /items\[0\]\.rate must be a number/
  );
});

test('treats missing and empty numeric fields as zero rather than failing', () => {
  const totals = calculateInvoiceTotals([{ qty: 1, rate: 100, gstRate: 18, cessRate: '', discountPercent: null }], '27', '27');
  assert.equal(totals.cess, 0);
  assert.equal(totals.subtotal, 100);
});

test('handles a state code supplied without its leading zero', () => {
  // '7' and '07' are the same state; a mismatch here would wrongly charge IGST.
  const totals = calculateInvoiceTotals([{ qty: 1, rate: 1000, gstRate: 18 }], '7', '07');
  assert.equal(totals.isIGST, false);
  assert.equal(totals.igst, 0);
});

test('per-line figures sum to the invoice totals', () => {
  // calculateLine is what the PDF renderer, the on-screen document and the GST
  // report use to show each line. If it ever drifts from the aggregate, the
  // printed lines stop adding up to the printed total — which is the exact
  // class of bug this split was introduced to prevent.
  const items = [
    { desc: 'A', qty: 3, rate: 33.33, gstRate: 18 },
    { desc: 'B', qty: 1, rate: 250, gstRate: 18, discountPercent: 10 },
    { desc: 'C', qty: 2, rate: 1180, gstRate: 18, taxInclusive: true },
    { desc: 'D', qty: 5, rate: 99.99, gstRate: 28, cessRate: 12 }
  ];
  const invoiceDiscount = 7;
  const totals = calculateInvoiceTotals(items, '27', '27', { discountPercent: invoiceDiscount });

  const lines = items.map((item, i) => calculateLine(item, invoiceDiscount, `items[${i}]`));
  const sum = pick => Math.round(lines.reduce((s, l) => s + pick(l), 0) * 100) / 100;

  assert.equal(sum(l => l.gross), totals.grossSubtotal);
  assert.equal(sum(l => l.discount), totals.discountTotal);
  assert.equal(sum(l => l.taxable), totals.subtotal);
  assert.equal(sum(l => l.cess), totals.cess);
  assert.equal(sum(l => l.tax), Math.round((totals.cgst + totals.sgst + totals.igst) * 100) / 100);
  // Each line's own total is internally consistent too.
  lines.forEach(l => assert.equal(l.total, Math.round((l.taxable + l.tax + l.cess) * 100) / 100));
});

test('produces zeroed totals for an empty or missing item list', () => {
  for (const items of [[], null, undefined]) {
    const totals = calculateInvoiceTotals(items, '27', '27');
    assert.equal(totals.total, 0);
    assert.equal(totals.subtotal, 0);
    assert.equal(totals.roundOff, 0);
  }
});
