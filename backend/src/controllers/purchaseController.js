const mongoose = require('mongoose');
const { Vendor } = require('../models/Vendor');
const { Purchase, ITC_CATEGORIES } = require('../models/Purchase');
const { Organisation } = require('../models/Organisation');
const { asyncHandler } = require('../utils/asyncHandler');
const { httpError } = require('../utils/httpError');
const { tenantFilter } = require('../middleware/tenantMiddleware');
const { calculateInvoiceTotals, roundMoney } = require('../services/gstService');
const { logAudit } = require('../services/auditService');
const { pickFields } = require('../utils/pickFields');
const { paginate, escapeRegex, parseSort } = require('../utils/pagination');
const { streamCsv } = require('../services/csvService');
const { notDeleted, scopeFilter, deletionPatch, RESTORE_PATCH } = require('../utils/softDelete');
const { recordEvent, EVENT } = require('../services/usageEventService');
const stock = require('../services/stockService');

/**
 * Vendors and purchase invoices — the inward side of the ledger, and with it input
 * tax credit.
 *
 * This is the gap that made the product "sales-only": with no purchases there is no
 * ITC, and with no ITC there is no *net* GST liability, only output tax. GSTR-3B is a
 * subtraction and cannot be computed from one operand.
 *
 * Two things are handled with more care than the outward equivalents, because the
 * failure modes are different:
 *
 *  - **Duplicates.** The document number belongs to the supplier, so nothing stops the
 *    same bill being entered twice — and entering it twice claims the same credit
 *    twice, which is exactly what a GST audit looks for. The unique index catches it;
 *    this layer turns that into a message that names the existing record.
 *  - **Eligibility.** Not every tax paid on a purchase is claimable. The category is
 *    recorded per purchase and the claimable amounts are stored separately from the
 *    invoiced ones, because a partially-eligible purchase is claimed proportionally and
 *    the return wants the claimed figure.
 */

// ── Vendors ──────────────────────────────────────

const VENDOR_FIELDS = [
  'name', 'email', 'phone', 'gstin', 'pan', 'address',
  'state', 'stateCode', 'registrationType', 'notes', 'status'
];
const VENDOR_SORTS = ['name', 'createdAt', 'stateCode'];

const listVendors = asyncHandler(async (req, res) => {
  const filter = scopeFilter(req);
  if (req.query.status) filter.status = String(req.query.status);
  if (req.query.q) {
    const term = escapeRegex(String(req.query.q).trim());
    if (term) {
      filter.$or = [
        { name: { $regex: term, $options: 'i' } },
        { gstin: { $regex: term, $options: 'i' } },
        { email: { $regex: term, $options: 'i' } }
      ];
    }
  }
  res.json(await paginate(Vendor, filter, req.query, query => query
    .sort(parseSort(req.query, VENDOR_SORTS, { name: 1 }))
    .lean()));
});

const createVendor = asyncHandler(async (req, res) => {
  const payload = pickFields(req.body, VENDOR_FIELDS);
  // An unregistered supplier has no GSTIN, which is not an edge case — a purchase
  // from one can attract reverse charge, where we pay the tax. Nothing is required
  // here beyond a name and a state.
  const vendor = await Vendor.create({ ...payload, orgId: req.orgId });
  logAudit({ req, action: 'vendor.created', entity: 'vendor', entityId: vendor._id, meta: { name: vendor.name, gstin: vendor.gstin } });
  res.status(201).json(vendor);
});

const updateVendor = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findOneAndUpdate(
    { _id: req.params.id, ...notDeleted(req) },
    pickFields(req.body, VENDOR_FIELDS),
    { new: true, runValidators: true }
  );
  if (!vendor) throw httpError(404, 'Vendor not found');
  logAudit({ req, action: 'vendor.updated', entity: 'vendor', entityId: vendor._id, meta: { name: vendor.name } });
  res.json(vendor);
});

/**
 * Archives a vendor.
 *
 * Soft, always. A vendor named on a purchase is referenced by every ITC figure that
 * purchase contributed to, and removing the row would leave those figures pointing at
 * nothing — the same dangling-reference problem hard-deleting a client had.
 */
const deleteVendor = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ _id: req.params.id, ...notDeleted(req) });
  if (!vendor) throw httpError(404, 'Vendor not found');

  const purchases = await Purchase.countDocuments({ vendorId: vendor._id, ...notDeleted(req) });
  await Vendor.updateOne({ _id: vendor._id }, { $set: deletionPatch(req) });
  logAudit({ req, action: 'vendor.deleted', entity: 'vendor', entityId: vendor._id, meta: { name: vendor.name, purchases } });
  res.json({
    ok: true,
    recoverable: true,
    purchases,
    message: purchases
      ? `${vendor.name} has been archived. Their ${purchases} purchase record(s) are unaffected.`
      : `${vendor.name} has been archived and can be restored.`
  });
});

const restoreVendor = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findOneAndUpdate(
    { _id: req.params.id, ...tenantFilter(req), deletedAt: { $ne: null } },
    { $set: RESTORE_PATCH },
    { new: true }
  );
  if (!vendor) throw httpError(404, 'No archived vendor with that id');
  logAudit({ req, action: 'vendor.restored', entity: 'vendor', entityId: vendor._id, meta: { name: vendor.name } });
  res.json(vendor);
});

// ── Purchases ────────────────────────────────────

const PURCHASE_FIELDS = [
  'vendorId', 'billNumber', 'billDate', 'dueDate', 'items', 'discountPercent',
  'placeOfSupply', 'taxTreatment', 'supplyType', 'reverseCharge',
  'notes', 'category', 'status'
];
const PURCHASE_SORTS = ['billDate', 'createdAt', 'billNumber'];

/**
 * Prices a purchase.
 *
 * The state codes are the mirror image of a sale: the *supplier's* state is the origin
 * and ours is the place of supply, because we are the recipient. Getting this backwards
 * would put an interstate purchase's tax in CGST+SGST and make the ITC unclaimable
 * against the right head.
 */
async function totalsForPurchase(req, body, vendor) {
  const org = await Organisation.findById(req.orgId).select('stateCode brandingConfig.roundOffTotal').lean();
  const placeOfSupply = body.placeOfSupply || org?.stateCode;
  return calculateInvoiceTotals(body.items || [], vendor.stateCode, placeOfSupply, {
    discountPercent: body.discountPercent,
    roundOff: org?.brandingConfig?.roundOffTotal !== false,
    taxTreatment: body.taxTreatment,
    // A purchase's supply types are its own set (imports rather than exports), and
    // none of them changes the tax head the way an export does — the engine treats an
    // unrecognised value as 'regular', which is the right answer here.
    supplyType: 'regular',
    reverseCharge: body.reverseCharge
  });
}

/**
 * The claimable amounts.
 *
 * A blocked or ineligible purchase claims nothing — the tax was still paid and the
 * expense is still recorded, but no credit arises. Under reverse charge the credit is
 * claimable even though the supplier charged nothing, because *we* paid the tax
 * directly; the amounts therefore come from the computed tax on the supply, not from
 * what the supplier billed.
 */
function computeItc(totals, body) {
  const category = ITC_CATEGORIES.includes(body.itcCategory) ? body.itcCategory : 'inputs';
  const eligible = category !== 'ineligible' && category !== 'blocked';

  // With reverse charge the engine charges no tax (the supplier does not collect it),
  // so the creditable amount has to be derived from the taxable value and the rate
  // rather than read off the totals — which are correctly zero.
  const reverseChargeTax = body.reverseCharge
    ? recomputeReverseChargeTax(totals, body)
    : null;

  const source = reverseChargeTax || totals;
  return {
    category,
    eligible,
    note: String(body.itcNote || '').slice(0, 500),
    cgst: eligible ? roundMoney(source.cgst || 0) : 0,
    sgst: eligible ? roundMoney(source.sgst || 0) : 0,
    igst: eligible ? roundMoney(source.igst || 0) : 0,
    cess: eligible ? roundMoney(source.cess || 0) : 0
  };
}

/**
 * Recomputes the tax on a reverse-charge purchase.
 *
 * Under RCM the invoice carries no tax, so `totals` has zeros in the tax heads — but
 * the recipient owes that tax to the government *and* may claim it back as credit.
 * Both figures are the same number and it has to be computed rather than read.
 */
function recomputeReverseChargeTax(totals, body) {
  const withTax = calculateInvoiceTotals(body.items || [], '27', '27', {
    discountPercent: body.discountPercent,
    roundOff: false
  });
  const tax = roundMoney((withTax.cgst || 0) + (withTax.sgst || 0) + (withTax.igst || 0));
  if (totals.isIGST) return { igst: tax, cgst: 0, sgst: 0, cess: withTax.cess || 0 };
  const half = roundMoney(tax / 2);
  return { igst: 0, cgst: half, sgst: roundMoney(tax - half), cess: withTax.cess || 0 };
}

const listPurchases = asyncHandler(async (req, res) => {
  const filter = scopeFilter(req);
  if (req.query.status) filter.status = String(req.query.status);
  if (req.query.vendorId && /^[0-9a-fA-F]{24}$/.test(req.query.vendorId)) filter.vendorId = req.query.vendorId;
  if (req.query.itc === 'eligible') filter['itc.eligible'] = true;
  if (req.query.itc === 'ineligible') filter['itc.eligible'] = false;
  if (req.query.from || req.query.to) {
    filter.billDate = {};
    if (req.query.from) filter.billDate.$gte = new Date(req.query.from);
    if (req.query.to) {
      const to = new Date(req.query.to);
      to.setHours(23, 59, 59, 999);
      filter.billDate.$lte = to;
    }
  }
  if (req.query.q) {
    const term = escapeRegex(String(req.query.q).trim());
    if (term) filter.billNumber = { $regex: term, $options: 'i' };
  }

  res.json(await paginate(Purchase, filter, req.query, query => query
    .populate('vendorId', 'name gstin stateCode')
    .sort(parseSort(req.query, PURCHASE_SORTS, { billDate: -1 }))
    .lean()));
});

const getPurchase = asyncHandler(async (req, res) => {
  const purchase = await Purchase.findOne({ _id: req.params.id, ...tenantFilter(req) })
    .populate('vendorId', 'name gstin stateCode registrationType');
  if (!purchase) throw httpError(404, 'Purchase not found');
  res.json(purchase);
});

const createPurchase = asyncHandler(async (req, res) => {
  const body = pickFields(req.body, [...PURCHASE_FIELDS, 'itcCategory', 'itcNote']);
  const vendor = await Vendor.findOne({ _id: body.vendorId, ...notDeleted(req) });
  if (!vendor) throw httpError(400, 'A valid vendor is required');

  const totals = await totalsForPurchase(req, body, vendor);
  const itc = computeItc(totals, body);

  /**
   * The duplicate check, done explicitly *as well as* by the unique index.
   *
   * Relying on the index alone looked sufficient and is not: Mongoose builds indexes in
   * the background, so on a fresh database the constraint does not exist for the first
   * moments of the process's life — and with `autoIndex` disabled (the usual production
   * setting) it does not exist until someone builds it by hand. A guard against claiming
   * the same input tax credit twice cannot be conditional on index state.
   *
   * The index stays as the backstop for the genuinely concurrent case, which no
   * read-then-write can close.
   */
  const existing = await Purchase.findOne({
    orgId: req.orgId,
    vendorId: vendor._id,
    billNumber: body.billNumber
  }).select('_id billDate deletedAt').lean();
  if (existing) {
    throw httpError(
      409,
      `A purchase from ${vendor.name} with bill number ${body.billNumber} is already recorded`
      + `${existing.deletedAt ? ' (in the recycle bin — restore it instead)' : ''}. `
      + 'Entering it twice would claim the same input tax credit twice.',
      'DUPLICATE_PURCHASE'
    );
  }

  try {
    const purchase = await Purchase.create({
      ...body,
      orgId: req.orgId,
      // Snapshotted, so the record stays reportable after the vendor row changes —
      // the GSTIN in a return is the one that was on the document.
      vendorSnapshot: {
        name: vendor.name,
        gstin: vendor.gstin,
        stateCode: vendor.stateCode,
        registrationType: vendor.registrationType
      },
      totals,
      itc,
      amountPaid: 0,
      balanceDue: totals.total,
      status: body.status === 'draft' ? 'draft' : 'recorded'
    });
    logAudit({
      req,
      action: 'purchase.created',
      entity: 'purchase',
      entityId: purchase._id,
      meta: { billNumber: purchase.billNumber, vendor: vendor.name, total: totals.total, itcCategory: itc.category }
    });
    recordEvent({ req, type: EVENT.purchaseRecorded, value: totals.total, meta: { billNumber: purchase.billNumber } });
    // Goods in. A draft purchase moves nothing, for the same reason a draft invoice
    // does not: nothing has been received yet.
    const stockResult = purchase.status === 'draft' ? null : await stock.applyPurchase(req, purchase);
    res.status(201).json({
      ...purchase.toObject(),
      stock: stockResult ? { moved: stockResult.moved, unmatched: stockResult.unmatched } : undefined
    });
  } catch (error) {
    // The unique index is the real guard; this turns it into an answer. Claiming the
    // same input credit twice is the failure mode, so the message names the duplicate
    // rather than saying "already exists".
    if (error.code === 11000) {
      throw httpError(
        409,
        `A purchase from ${vendor.name} with bill number ${body.billNumber} is already recorded. `
        + 'Entering it twice would claim the same input tax credit twice.',
        'DUPLICATE_PURCHASE'
      );
    }
    throw error;
  }
});

const updatePurchase = asyncHandler(async (req, res) => {
  const existing = await Purchase.findOne({ _id: req.params.id, ...notDeleted(req) });
  if (!existing) throw httpError(404, 'Purchase not found');

  const body = pickFields(req.body, [...PURCHASE_FIELDS, 'itcCategory', 'itcNote']);
  const vendor = await Vendor.findOne({ _id: body.vendorId || existing.vendorId, ...notDeleted(req) });
  if (!vendor) throw httpError(400, 'A valid vendor is required');

  const merged = {
    items: body.items ?? existing.items,
    discountPercent: body.discountPercent ?? existing.discountPercent,
    placeOfSupply: body.placeOfSupply ?? existing.placeOfSupply,
    taxTreatment: body.taxTreatment ?? existing.taxTreatment,
    reverseCharge: body.reverseCharge ?? existing.reverseCharge,
    itcCategory: body.itcCategory ?? existing.itc?.category,
    itcNote: body.itcNote ?? existing.itc?.note
  };
  const totals = await totalsForPurchase(req, merged, vendor);
  const itc = computeItc(totals, merged);

  Object.assign(existing, body, {
    totals,
    // The claim period survives an edit: it records that the credit was *taken* in a
    // filed return, which correcting a typo afterwards does not undo.
    itc: { ...itc, claimedInPeriod: existing.itc?.claimedInPeriod, claimedAt: existing.itc?.claimedAt },
    vendorSnapshot: {
      name: vendor.name,
      gstin: vendor.gstin,
      stateCode: vendor.stateCode,
      registrationType: vendor.registrationType
    },
    balanceDue: roundMoney(Math.max(0, totals.total - (existing.amountPaid || 0)))
  });
  await existing.save();

  logAudit({ req, action: 'purchase.updated', entity: 'purchase', entityId: existing._id, meta: { billNumber: existing.billNumber, total: totals.total } });
  res.json(existing);
});

/** Records a payment against a purchase — accounts payable, not a GST event. */
const payPurchase = asyncHandler(async (req, res) => {
  const purchase = await Purchase.findOne({ _id: req.params.id, ...notDeleted(req) });
  if (!purchase) throw httpError(404, 'Purchase not found');

  const amount = Number(req.body?.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw httpError(400, 'amount must be a positive number');
  const outstanding = roundMoney(Math.max(0, (purchase.totals?.total || 0) - (purchase.amountPaid || 0)));
  if (amount > outstanding + 0.01) {
    throw httpError(400, `Only ${outstanding.toFixed(2)} is outstanding on this purchase.`, 'OVERPAYMENT');
  }

  purchase.amountPaid = roundMoney((purchase.amountPaid || 0) + amount);
  purchase.balanceDue = roundMoney(Math.max(0, (purchase.totals?.total || 0) - purchase.amountPaid));
  purchase.status = purchase.balanceDue <= 0.01 ? 'paid' : 'partial';
  if (purchase.status === 'paid') purchase.paidDate = new Date();
  await purchase.save();

  logAudit({ req, action: 'purchase.paid', entity: 'purchase', entityId: purchase._id, meta: { amount, balanceDue: purchase.balanceDue } });
  res.json(purchase);
});

const deletePurchase = asyncHandler(async (req, res) => {
  const purchase = await Purchase.findOne({ _id: req.params.id, ...notDeleted(req) });
  if (!purchase) throw httpError(404, 'Purchase not found');
  // Soft, so an ITC figure that has already been reported can be reconstructed. A
  // purchase whose credit was claimed in a filed return is history, not a mistake to
  // erase.
  await Purchase.updateOne({ _id: purchase._id }, { $set: deletionPatch(req) });
  logAudit({
    req,
    action: 'purchase.deleted',
    entity: 'purchase',
    entityId: purchase._id,
    meta: { billNumber: purchase.billNumber, claimedInPeriod: purchase.itc?.claimedInPeriod || null }
  });
  res.json({ ok: true, recoverable: true, message: 'Purchase moved to the recycle bin.' });
});

const restorePurchase = asyncHandler(async (req, res) => {
  const purchase = await Purchase.findOneAndUpdate(
    { _id: req.params.id, ...tenantFilter(req), deletedAt: { $ne: null } },
    { $set: RESTORE_PATCH },
    { new: true }
  );
  if (!purchase) throw httpError(404, 'No archived purchase with that id');
  logAudit({ req, action: 'purchase.restored', entity: 'purchase', entityId: purchase._id, meta: { billNumber: purchase.billNumber } });
  res.json(purchase);
});

/**
 * The ITC register for a period.
 *
 * The document behind table 4 of GSTR-3B, and the thing a CA asks for first: every
 * inward supply with the credit it carries, split by whether that credit is claimable.
 */
const itcRegister = asyncHandler(async (req, res) => {
  const from = req.query.from ? new Date(req.query.from) : new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
  const to = req.query.to ? new Date(req.query.to) : new Date();
  to.setHours(23, 59, 59, 999);

  /**
   * `orgId` is cast explicitly.
   *
   * `tenantFilter` returns the id as a **string**, which Mongoose casts for `find` but
   * *not* inside an aggregation `$match` — the pipeline is sent to the server as-is, so a
   * string never matches an ObjectId and the whole register silently returns nothing. An
   * empty ITC report reads as "no credit available", which is a wrong answer that looks
   * like a correct one.
   */
  const orgId = new mongoose.Types.ObjectId(String(req.orgId));

  const rows = await Purchase.aggregate([
    {
      $match: {
        orgId,
        deletedAt: null,
        status: { $ne: 'draft' },
        billDate: { $gte: from, $lte: to }
      }
    },
    {
      $group: {
        _id: { category: '$itc.category', eligible: '$itc.eligible' },
        purchases: { $sum: 1 },
        taxableValue: { $sum: '$totals.subtotal' },
        invoiceValue: { $sum: '$totals.total' },
        cgst: { $sum: '$itc.cgst' },
        sgst: { $sum: '$itc.sgst' },
        igst: { $sum: '$itc.igst' },
        cess: { $sum: '$itc.cess' },
        // The tax actually on the invoice, which differs from the claimable amount for
        // an ineligible purchase — where the claimable figure is zero by definition. A
        // report that only summed the claimable side would show a blocked purchase as
        // having cost no tax at all, which is the opposite of the point of recording it.
        invoiceCgst: { $sum: '$totals.cgst' },
        invoiceSgst: { $sum: '$totals.sgst' },
        invoiceIgst: { $sum: '$totals.igst' },
        invoiceCess: { $sum: '$totals.cess' }
      }
    },
    { $sort: { '_id.category': 1 } }
  ]);

  const byCategory = rows.map(row => ({
    category: row._id.category || 'inputs',
    eligible: row._id.eligible !== false,
    purchases: row.purchases,
    taxableValue: roundMoney(row.taxableValue),
    invoiceValue: roundMoney(row.invoiceValue),
    // Claimable.
    cgst: roundMoney(row.cgst),
    sgst: roundMoney(row.sgst),
    igst: roundMoney(row.igst),
    cess: roundMoney(row.cess),
    total: roundMoney(row.cgst + row.sgst + row.igst + row.cess),
    // Paid, whether or not it was claimable.
    taxPaid: roundMoney(row.invoiceCgst + row.invoiceSgst + row.invoiceIgst + row.invoiceCess)
  }));

  const claimable = byCategory.filter(row => row.eligible);
  const sum = key => roundMoney(claimable.reduce((total, row) => total + row[key], 0));

  recordEvent({ req, type: EVENT.reportViewed, meta: { report: 'itc-register' } });
  res.json({
    period: { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) },
    byCategory,
    claimable: { cgst: sum('cgst'), sgst: sum('sgst'), igst: sum('igst'), cess: sum('cess'), total: sum('total') },
    // The tax paid that cannot be claimed — a real cost, and one the claimable-side
    // figures would report as zero.
    ineligible: byCategory
      .filter(row => !row.eligible)
      .reduce((total, row) => roundMoney(total + row.taxPaid), 0)
  });
});

const PURCHASE_CSV_COLUMNS = [
  { label: 'Bill Number', value: p => p.billNumber },
  { label: 'Bill Date', value: p => p.billDate?.toISOString().slice(0, 10) },
  { label: 'Vendor', value: p => p.vendorSnapshot?.name || '' },
  { label: 'Vendor GSTIN', value: p => p.vendorSnapshot?.gstin || '' },
  { label: 'Place of Supply', value: p => p.placeOfSupply || '' },
  { label: 'Reverse Charge', value: p => (p.reverseCharge ? 'Yes' : 'No') },
  { label: 'Taxable Value', value: p => Number(p.totals?.subtotal || 0).toFixed(2) },
  { label: 'CGST', value: p => Number(p.totals?.cgst || 0).toFixed(2) },
  { label: 'SGST', value: p => Number(p.totals?.sgst || 0).toFixed(2) },
  { label: 'IGST', value: p => Number(p.totals?.igst || 0).toFixed(2) },
  { label: 'Cess', value: p => Number(p.totals?.cess || 0).toFixed(2) },
  { label: 'Total', value: p => Number(p.totals?.total || 0).toFixed(2) },
  { label: 'ITC Category', value: p => p.itc?.category || '' },
  { label: 'ITC Claimable', value: p => Number((p.itc?.cgst || 0) + (p.itc?.sgst || 0) + (p.itc?.igst || 0) + (p.itc?.cess || 0)).toFixed(2) },
  { label: 'Amount Paid', value: p => Number(p.amountPaid || 0).toFixed(2) },
  { label: 'Balance Due', value: p => Number(p.balanceDue || 0).toFixed(2) }
];

const exportPurchasesCsv = asyncHandler(async (req, res) => {
  const cursor = Purchase.find({ ...notDeleted(req), status: { $ne: 'draft' } })
    .sort({ billDate: -1 })
    .lean()
    .cursor();
  recordEvent({ req, type: EVENT.exportCsv, meta: { of: 'purchases' } });
  await streamCsv(res, { filename: 'purchases.csv', columns: PURCHASE_CSV_COLUMNS, cursor });
});

module.exports = {
  listVendors, createVendor, updateVendor, deleteVendor, restoreVendor,
  listPurchases, getPurchase, createPurchase, updatePurchase, payPurchase,
  deletePurchase, restorePurchase, itcRegister, exportPurchasesCsv,
  computeItc, totalsForPurchase
};
