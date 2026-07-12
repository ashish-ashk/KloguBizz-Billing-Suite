function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function calculateInvoiceTotals(items, fromStateCode, toStateCode) {
  const subtotal = roundMoney(items.reduce((sum, item) => {
    return sum + Number(item.qty || 0) * Number(item.rate || 0);
  }, 0));
  const isIGST = String(fromStateCode) !== String(toStateCode);
  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  for (const item of items) {
    const lineAmount = Number(item.qty || 0) * Number(item.rate || 0);
    const tax = lineAmount * Number(item.gstRate || 0) / 100;
    if (isIGST) {
      igst += tax;
    } else {
      cgst += tax / 2;
      sgst += tax / 2;
    }
  }

  cgst = roundMoney(cgst);
  sgst = roundMoney(sgst);
  igst = roundMoney(igst);

  return {
    subtotal,
    cgst,
    sgst,
    igst,
    total: roundMoney(subtotal + cgst + sgst + igst),
    isIGST
  };
}

module.exports = { calculateInvoiceTotals, roundMoney };
