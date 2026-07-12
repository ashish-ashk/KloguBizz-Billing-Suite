const { Invoice } = require('../models/Invoice');
const { asyncHandler } = require('../utils/asyncHandler');
const { tenantFilter } = require('../middleware/tenantMiddleware');
const { toCsv } = require('../services/csvService');

// Aggregates issued invoices (everything except drafts) into a GST filing
// summary: taxable value + tax collected per month, and per GST rate slab.
async function buildSummary(req) {
  const filter = { ...tenantFilter(req), status: { $ne: 'draft' } };
  const invoices = await Invoice.find(filter);

  const byMonth = {};
  const byRate = {};

  invoices.forEach(inv => {
    const month = inv.date.toISOString().slice(0, 7);
    if (!byMonth[month]) byMonth[month] = { month, taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0, invoiceCount: 0 };
    byMonth[month].cgst += inv.totals.cgst;
    byMonth[month].sgst += inv.totals.sgst;
    byMonth[month].igst += inv.totals.igst;
    byMonth[month].total += inv.totals.total;
    byMonth[month].invoiceCount += 1;

    inv.items.forEach(item => {
      const qty = Number(item.qty) || 0;
      const rate = Number(item.rate) || 0;
      const gstRate = Number(item.gstRate) || 0;
      const taxable = qty * rate;
      const tax = taxable * gstRate / 100;
      byMonth[month].taxable += taxable;
      if (!byRate[gstRate]) byRate[gstRate] = { rate: gstRate, taxable: 0, tax: 0 };
      byRate[gstRate].taxable += taxable;
      byRate[gstRate].tax += tax;
    });
  });

  const monthRows = Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month));
  const rateRows = Object.values(byRate).sort((a, b) => a.rate - b.rate);
  return {
    byMonth: monthRows,
    byRate: rateRows,
    totals: {
      taxable: rateRows.reduce((s, r) => s + r.taxable, 0),
      tax: rateRows.reduce((s, r) => s + r.tax, 0),
      invoiceCount: invoices.length
    }
  };
}

const gstSummary = asyncHandler(async (req, res) => {
  res.json(await buildSummary(req));
});

const exportGstSummaryCsv = asyncHandler(async (req, res) => {
  const { byMonth } = await buildSummary(req);
  const csv = toCsv(byMonth, [
    { label: 'Month', value: r => r.month },
    { label: 'Invoices', value: r => r.invoiceCount },
    { label: 'Taxable Value', value: r => r.taxable.toFixed(2) },
    { label: 'CGST', value: r => r.cgst.toFixed(2) },
    { label: 'SGST', value: r => r.sgst.toFixed(2) },
    { label: 'IGST', value: r => r.igst.toFixed(2) },
    { label: 'Total', value: r => r.total.toFixed(2) }
  ]);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="gst-summary.csv"');
  res.send(csv);
});

module.exports = { gstSummary, exportGstSummaryCsv };
