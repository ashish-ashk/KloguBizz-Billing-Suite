const mongoose = require('mongoose');

/**
 * A purchase invoice (an inward supply), and the input tax credit it carries.
 *
 * The missing half of the product. Without purchases there is no ITC, so the only
 * GST figure the app could produce was output tax — which is not a liability, it is
 * one side of one. GSTR-3B is a net computation and simply cannot be built from
 * sales alone.
 *
 * Two things distinguish this from `Invoice` and both matter:
 *
 *  - **The document number is the supplier's, not ours.** There is no series to
 *    allocate and no counter to protect; instead there is a duplicate risk that
 *    `Invoice` does not have. Claiming the same purchase invoice twice is claiming
 *    the same credit twice, which is exactly the kind of error a GST audit looks
 *    for, so `{orgId, vendorId, billNumber}` is unique.
 *  - **The tax is an asset, not a liability.** The same `totals` shape is used, but
 *    what it represents is credit available rather than tax collected — hence the
 *    ITC block below, which records how much of it is actually claimable and why.
 */

const lineItemSchema = new mongoose.Schema({
  desc: { type: String, required: true },
  hsn: String,
  qty: { type: Number, required: true, min: 0 },
  rate: { type: Number, required: true, min: 0 },
  gstRate: { type: Number, required: true, default: 18 },
  cessRate: { type: Number, default: 0, min: 0 },
  discountPercent: { type: Number, default: 0, min: 0, max: 100 },
  taxInclusive: { type: Boolean, default: false },
  /**
   * Batch and expiry (2.5 #42), recorded where they are actually known.
   *
   * A batch belongs to the consignment, not to the product — the same medicine
   * arrives as batch A this month and batch B next month, at different costs and
   * with different expiry dates. So it is captured on the *purchase line*, which
   * is the only place in the system that describes one consignment, and it flows
   * straight onto the cost layer that line creates.
   */
  batchNumber: { type: String, trim: true },
  expiryDate: { type: Date, default: null }
}, { _id: false });

// Same shape as Invoice's, priced by the same engine — see services/gstService.js.
const totalsSchema = new mongoose.Schema({
  grossSubtotal: { type: Number, default: 0 },
  discountTotal: { type: Number, default: 0 },
  subtotal: { type: Number, default: 0 },
  cgst: { type: Number, default: 0 },
  sgst: { type: Number, default: 0 },
  igst: { type: Number, default: 0 },
  cess: { type: Number, default: 0 },
  roundOff: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  isIGST: { type: Boolean, default: false },
  isUT: { type: Boolean, default: false },
  taxTreatment: { type: String, default: 'taxable' },
  supplyType: { type: String, default: 'regular' },
  reverseCharge: { type: Boolean, default: false },
  zeroRated: { type: Boolean, default: false },
  taxCharged: { type: Boolean, default: true },
  taxNote: { type: String, default: '' }
}, { _id: false });

/**
 * Where the credit goes in GSTR-3B's table 4.
 *
 * Not a boolean, because "can I claim this" has more than two answers and the
 * return asks for them separately. Capital goods and input services are reported on
 * their own lines; `blocked` covers section 17(5) items (motor cars, club
 * memberships, personal consumption) where the tax was paid and is simply not
 * creditable — recording it as ineligible rather than omitting the purchase keeps
 * the expense on the books.
 */
const ITC_CATEGORIES = ['inputs', 'capital-goods', 'input-services', 'ineligible', 'blocked'];

const itcSchema = new mongoose.Schema({
  category: { type: String, enum: ITC_CATEGORIES, default: 'inputs' },
  /** Derived from `category`, stored so a report can filter on it directly. */
  eligible: { type: Boolean, default: true },
  /** Why a claim was reduced or refused — an ITC decision needs a reason on file. */
  note: String,
  /**
   * The claimable amounts. Normally the whole tax on the purchase, but recorded
   * separately because they are not always: a partially-eligible purchase (common
   * duty, mixed use) is claimed proportionally, and the return wants the claimed
   * figure, not the invoiced one.
   */
  cgst: { type: Number, default: 0 },
  sgst: { type: Number, default: 0 },
  igst: { type: Number, default: 0 },
  cess: { type: Number, default: 0 },
  /** Which return period the credit was taken in, once it has been. */
  claimedInPeriod: String,
  claimedAt: Date
}, { _id: false });

const purchaseSchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true, index: true },
  /**
   * The supplier's own invoice number and date. Both are reported to the GSTN and
   * are what GSTR-2A/2B reconciliation matches on, so neither is optional and
   * neither is ours to generate.
   */
  billNumber: { type: String, required: true, trim: true },
  billDate: { type: Date, required: true },
  dueDate: Date,
  /**
   * Snapshotted supplier identity.
   *
   * A purchase record has to stay readable and reportable after the vendor row is
   * edited or archived — the GSTIN reported in a return is the one that was on the
   * document, not whatever the vendor's current record says.
   */
  vendorSnapshot: {
    name: String,
    gstin: String,
    stateCode: String,
    registrationType: String
  },
  items: { type: [lineItemSchema], default: [] },
  discountPercent: { type: Number, default: 0, min: 0, max: 100 },
  /** The state whose tax applies — usually ours, since we are the recipient. */
  placeOfSupply: String,
  taxTreatment: { type: String, default: 'taxable' },
  /**
   * `import-goods` and `import-services` are separate because GSTR-3B reports them
   * on separate lines, and IGST on imported goods is paid at customs rather than to
   * the supplier.
   */
  supplyType: {
    type: String,
    enum: ['regular', 'import-goods', 'import-services', 'sez', 'deemed-export'],
    default: 'regular'
  },
  /** The buyer pays the tax directly. Common for unregistered suppliers, freight,
   *  legal services and imports of services. */
  reverseCharge: { type: Boolean, default: false },
  totals: { type: totalsSchema, default: () => ({}) },
  itc: { type: itcSchema, default: () => ({}) },

  // Accounts payable. Mirrors Invoice's settlement fields so the same reasoning
  // (and the same round-off handling) applies at the other end of the ledger.
  amountPaid: { type: Number, default: 0, min: 0 },
  balanceDue: { type: Number, default: 0 },
  status: { type: String, enum: ['draft', 'recorded', 'partial', 'paid', 'cancelled'], default: 'recorded' },
  paidDate: Date,

  notes: String,
  category: String,
  deletedAt: { type: Date, default: null },
  deletedBy: String
}, { timestamps: true });

/**
 * The duplicate guard.
 *
 * Sparse-free and deliberately strict: the same supplier cannot have two purchases
 * with the same bill number, because that is either a data-entry mistake or a
 * double claim of the same input credit. A soft-deleted row still occupies its
 * number — restoring it must not collide with a re-entry — which is why the index
 * does not exclude `deletedAt`.
 */
purchaseSchema.index({ orgId: 1, vendorId: 1, billNumber: 1 }, { unique: true });
purchaseSchema.index({ orgId: 1, billDate: -1 });
purchaseSchema.index({ orgId: 1, status: 1, billDate: -1 });
purchaseSchema.index({ orgId: 1, deletedAt: 1 });
// Drives the ITC register's eligible/ineligible split for a period.
purchaseSchema.index({ orgId: 1, 'itc.eligible': 1, billDate: -1 });

module.exports = { Purchase: mongoose.model('Purchase', purchaseSchema), ITC_CATEGORIES };
