const { Invoice } = require('../models/Invoice');
const { asyncHandler } = require('../utils/asyncHandler');
const { httpError } = require('../utils/httpError');
const { tenantFilter } = require('../middleware/tenantMiddleware');
const { toCsv } = require('../services/csvService');
const { roundMoney, calculateLine } = require('../services/gstService');

/**
 * Resolves the reporting period from the query string.
 *
 * The report used to have no date filter at all — it re-aggregated the org's
 * entire history on every page view, which is both slow and not what anyone
 * filing a return actually wants. Defaults to the current Indian financial
 * year (1 Apr – 31 Mar), which is the period GST returns are framed in.
 */
function resolvePeriod(query) {
  if (query.from || query.to) {
    const from = query.from ? new Date(query.from) : new Date(0);
    const to = query.to ? new Date(query.to) : new Date();
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw httpError(400, 'from and to must be valid dates (YYYY-MM-DD)');
    }
    if (from > to) throw httpError(400, '`from` cannot be after `to`');
    to.setHours(23, 59, 59, 999);
    return { from, to, label: 'custom' };
  }

  const now = new Date();
  const currentFyStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const requestedFy = query.fy ? Number(query.fy) : currentFyStart;
  if (!Number.isInteger(requestedFy) || requestedFy < 2000 || requestedFy > 2100) {
    throw httpError(400, 'fy must be a financial-year start year, e.g. 2026 for FY2026-27');
  }
  return {
    from: new Date(requestedFy, 3, 1, 0, 0, 0, 0),
    to: new Date(requestedFy + 1, 2, 31, 23, 59, 59, 999),
    label: `FY${requestedFy}-${String(requestedFy + 1).slice(-2)}`
  };
}

async function buildSummary(req) {
  const period = resolvePeriod(req.query);
  const filter = {
    ...tenantFilter(req),
    // Drafts were never issued, so they are not part of any return. Cancelled
    // invoices are excluded too: their charge has been reversed by credit note
    // (or voided before collection), so counting their tax would overstate the
    // liability. The credit notes themselves are reported separately, as
    // GSTR-1's CDNR table expects.
    status: { $nin: ['draft', 'cancelled'] },
    date: { $gte: period.from, $lte: period.to }
  };
  // Only the fields the summary needs, so a long history doesn't drag whole
  // documents (notes, bank details, embedded buyers) into memory.
  const invoices = await Invoice.find(filter, 'date items totals discountPercent').lean();

  const byMonth = {};
  const byRate = {};
  const byHsn = {};

  invoices.forEach(inv => {
    const month = inv.date.toISOString().slice(0, 7);
    if (!byMonth[month]) {
      byMonth[month] = { month, gross: 0, discount: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0, cess: 0, total: 0, invoiceCount: 0 };
    }
    const bucket = byMonth[month];
    // Header figures come straight from the stored totals — the same numbers
    // printed on the customer's invoice.
    bucket.cgst = roundMoney(bucket.cgst + (inv.totals?.cgst || 0));
    bucket.sgst = roundMoney(bucket.sgst + (inv.totals?.sgst || 0));
    bucket.igst = roundMoney(bucket.igst + (inv.totals?.igst || 0));
    bucket.cess = roundMoney(bucket.cess + (inv.totals?.cess || 0));
    bucket.total = roundMoney(bucket.total + (inv.totals?.total || 0));
    bucket.gross = roundMoney(bucket.gross + (inv.totals?.grossSubtotal ?? inv.totals?.subtotal ?? 0));
    bucket.discount = roundMoney(bucket.discount + (inv.totals?.discountTotal || 0));
    bucket.taxable = roundMoney(bucket.taxable + (inv.totals?.subtotal || 0));
    bucket.invoiceCount += 1;

    (inv.items || []).forEach(item => {
      // Priced through the same helper the invoice itself used, so the report's
      // taxable value always matches the customer's copy. The report previously
      // used a bare `qty * rate`, which ignored discounts and tax-inclusive
      // pricing — precisely the discrepancy a GST audit surfaces.
      const { taxable, gstRate, cessRate, tax, cess } = calculateLine(item, inv.discountPercent);

      if (!byRate[gstRate]) byRate[gstRate] = { rate: gstRate, taxable: 0, tax: 0, cess: 0 };
      byRate[gstRate].taxable = roundMoney(byRate[gstRate].taxable + taxable);
      byRate[gstRate].tax = roundMoney(byRate[gstRate].tax + tax);
      byRate[gstRate].cess = roundMoney(byRate[gstRate].cess + cess);

      // HSN-wise summary — a required table in GSTR-1, previously absent
      // entirely.
      const hsn = String(item.hsn || '').trim() || 'Unclassified';
      if (!byHsn[hsn]) byHsn[hsn] = { hsn, description: item.desc, qty: 0, taxable: 0, tax: 0, cess: 0 };
      byHsn[hsn].qty = roundMoney(byHsn[hsn].qty + (Number(item.qty) || 0));
      byHsn[hsn].taxable = roundMoney(byHsn[hsn].taxable + taxable);
      byHsn[hsn].tax = roundMoney(byHsn[hsn].tax + tax);
      byHsn[hsn].cess = roundMoney(byHsn[hsn].cess + cess);
    });
  });

  const monthRows = Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month));
  const rateRows = Object.values(byRate).sort((a, b) => a.rate - b.rate);
  const hsnRows = Object.values(byHsn).sort((a, b) => b.taxable - a.taxable);
  const sum = pick => roundMoney(monthRows.reduce((total, row) => total + pick(row), 0));

  return {
    period: {
      from: period.from.toISOString().slice(0, 10),
      to: period.to.toISOString().slice(0, 10),
      label: period.label
    },
    byMonth: monthRows,
    byRate: rateRows,
    byHsn: hsnRows,
    totals: {
      gross: sum(r => r.gross),
      discount: sum(r => r.discount),
      taxable: sum(r => r.taxable),
      cgst: sum(r => r.cgst),
      sgst: sum(r => r.sgst),
      igst: sum(r => r.igst),
      cess: sum(r => r.cess),
      tax: sum(r => r.cgst + r.sgst + r.igst + r.cess),
      total: sum(r => r.total),
      invoiceCount: invoices.length
    }
  };
}

const gstSummary = asyncHandler(async (req, res) => {
  res.json(await buildSummary(req));
});

const exportGstSummaryCsv = asyncHandler(async (req, res) => {
  const { byMonth, byRate, byHsn, period } = await buildSummary(req);

  // All three sections in one file, because a return needs all three and
  // separate downloads lose the connection between them. Previously only the
  // monthly section was exported at all.
  const monthCsv = toCsv(byMonth, [
    { label: 'Month', value: r => r.month },
    { label: 'Invoices', value: r => r.invoiceCount },
    { label: 'Gross Value', value: r => r.gross.toFixed(2) },
    { label: 'Discount', value: r => r.discount.toFixed(2) },
    { label: 'Taxable Value', value: r => r.taxable.toFixed(2) },
    { label: 'CGST', value: r => r.cgst.toFixed(2) },
    { label: 'SGST/UTGST', value: r => r.sgst.toFixed(2) },
    { label: 'IGST', value: r => r.igst.toFixed(2) },
    { label: 'Cess', value: r => r.cess.toFixed(2) },
    { label: 'Total', value: r => r.total.toFixed(2) }
  ]);
  const rateCsv = toCsv(byRate, [
    { label: 'GST Rate (%)', value: r => r.rate },
    { label: 'Taxable Value', value: r => r.taxable.toFixed(2) },
    { label: 'Tax', value: r => r.tax.toFixed(2) },
    { label: 'Cess', value: r => r.cess.toFixed(2) }
  ]);
  const hsnCsv = toCsv(byHsn, [
    { label: 'HSN/SAC', value: r => r.hsn },
    { label: 'Description', value: r => r.description || '' },
    { label: 'Quantity', value: r => r.qty },
    { label: 'Taxable Value', value: r => r.taxable.toFixed(2) },
    { label: 'Tax', value: r => r.tax.toFixed(2) },
    { label: 'Cess', value: r => r.cess.toFixed(2) }
  ]);

  const csv = [
    `GST Summary,${period.label},${period.from} to ${period.to}`,
    '',
    'BY MONTH',
    monthCsv,
    '',
    'BY GST RATE',
    rateCsv,
    '',
    'BY HSN/SAC',
    hsnCsv
  ].join('\r\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="gst-summary-${period.label}.csv"`);
  res.send(csv);
});

module.exports = { gstSummary, exportGstSummaryCsv };
