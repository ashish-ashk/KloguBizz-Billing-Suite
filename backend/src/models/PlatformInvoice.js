const mongoose = require('mongoose');

/**
 * A tax invoice the **platform** issues to a tenant (3.3 #10).
 *
 * A registered supplier in India must issue a tax invoice for what it charges.
 * This system billed its customers and issued them nothing — Razorpay took the
 * money, `Subscription` recorded that it had, and the customer received no
 * document they could claim input tax credit against. That is not a missing
 * nicety; it is a compliance failure on our side and money the customer cannot
 * claim on theirs.
 *
 * ── Why a separate model, when the plan said "just an `Invoice`" ──────
 *
 * The plan called this "genuinely just an `Invoice` with us as the supplier".
 * Investigating says otherwise, and the reasons are structural rather than
 * stylistic:
 *
 *   - **There is no platform `Organisation`.** Superadmins are created with
 *     `orgId: null`, deliberately — they operate above tenants. Inventing one
 *     puts a fake tenant into `Organisation`, which is counted by the tenant
 *     total, MRR, ARPA, the churn lists and the at-risk lists. Every platform
 *     metric would be off by one, permanently, in a way nobody would ever
 *     attribute to this decision.
 *   - **Invoice numbering counters are fields on an `Organisation`**
 *     (`invoiceSequence`, `invoiceSequenceFY`), so a platform series has no home
 *     without that fake tenant.
 *   - **`tenantFilter(req)` scopes every invoice read by `orgId`.** A platform
 *     invoice living in `Invoice` would either be invisible or would leak into a
 *     tenant's own invoice list, GST returns and revenue reports — as *their*
 *     sales. Charging a customer ₹999 and having it appear in their GSTR-1 as
 *     something they sold is a filing error we would have created.
 *
 * What *is* genuinely reusable is the tax engine:
 * `gstService.calculateInvoiceTotals` is pure and takes the supplier's state
 * code as an argument, so the CGST/SGST-versus-IGST decision, the rounding and
 * the totals are the same code that prices every tenant invoice. The document
 * model is not reusable; the arithmetic is.
 */
const lineSchema = new mongoose.Schema({
  description: { type: String, required: true },
  /** Service accounting code. 997331 (licensing services for the right to use
   *  software) is the default for a SaaS subscription; configurable, because a
   *  tenant's auditor may prefer 998314 and the difference is theirs to make. */
  sac: { type: String, required: true },
  qty: { type: Number, default: 1 },
  rate: { type: Number, required: true },
  gstRate: { type: Number, required: true }
}, { _id: false });

const totalsSchema = new mongoose.Schema({
  subtotal: { type: Number, default: 0 },
  cgst: { type: Number, default: 0 },
  sgst: { type: Number, default: 0 },
  igst: { type: Number, default: 0 },
  cess: { type: Number, default: 0 },
  roundOff: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  isIGST: { type: Boolean, default: false }
}, { _id: false });

const platformInvoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true, unique: true },
  date: { type: Date, required: true },

  /** Who was billed. A real tenant, unlike the supplier side. */
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },

  /**
   * The customer's details, **snapshotted**.
   *
   * A tax invoice is a legal record of a transaction as it stood. A tenant who
   * later corrects their GSTIN or moves office must not retroactively change a
   * document already filed with their old details — the copy they hold and the
   * copy we hold have to stay the same document.
   */
  billTo: {
    name: String,
    gstin: String,
    address: String,
    stateCode: String,
    email: String
  },

  /** Ours, snapshotted for the same reason. */
  supplier: {
    name: String,
    gstin: String,
    pan: String,
    address: String,
    stateCode: String
  },

  /**
   * Where the supply is treated as made, and therefore which tax applies.
   *
   * For a service supplied to a registered person, the place of supply is the
   * recipient's location — so a Karnataka customer of a Maharashtra platform is
   * an inter-state supply attracting IGST, and a Maharashtra customer attracts
   * CGST + SGST. Getting this backwards means the customer cannot claim the
   * credit, because the tax head on our invoice will not match what their return
   * expects.
   */
  placeOfSupply: { type: String, required: true },

  items: { type: [lineSchema], default: [] },
  totals: { type: totalsSchema, default: () => ({}) },

  // ── What it was for ──
  planCode: String,
  planName: String,
  billingCycle: { type: String, enum: ['monthly', 'yearly'] },
  periodStart: Date,
  periodEnd: Date,

  /**
   * The provider payment this invoice documents.
   *
   * Uniquely indexed (sparse) and claimed before the invoice is written, so a
   * webhook retry — which Razorpay does, deliberately and often — cannot produce
   * two tax invoices for one charge. Duplicate tax invoices are not a cosmetic
   * problem: both carry consecutive numbers from a legally-consecutive series,
   * and cancelling one leaves a gap that has to be explained.
   */
  providerPaymentId: { type: String, default: null },
  providerSubscriptionId: String,

  status: { type: String, enum: ['issued', 'cancelled'], default: 'issued' },
  cancelledAt: Date,
  cancelReason: String
}, { timestamps: true });

platformInvoiceSchema.index({ orgId: 1, date: -1 });
platformInvoiceSchema.index({ date: -1 });
/** The idempotency key. Sparse, because an invoice raised by hand has no
 *  provider payment behind it. */
platformInvoiceSchema.index(
  { providerPaymentId: 1 },
  { unique: true, sparse: true, partialFilterExpression: { providerPaymentId: { $type: 'string' } } }
);

module.exports = { PlatformInvoice: mongoose.model('PlatformInvoice', platformInvoiceSchema) };
