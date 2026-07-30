const mongoose = require('mongoose');

// Which invoice document elements render — tenant-level override of the
// platform defaults, set from the tenant Invoice Templates page.
const invoiceContentSchema = new mongoose.Schema({
  showLogo: { type: Boolean, default: true },
  showSignature: { type: Boolean, default: true },
  showBankDetails: { type: Boolean, default: true },
  showAmountInWords: { type: Boolean, default: true },
  showGstBreakdown: { type: Boolean, default: true }
}, { _id: false });

// A tenant-built invoice template ("Custom Template" in the Invoice
// Templates page) — the same knobs a built-in template has, picked one
// at a time. Only used when brandingConfig.invoiceTemplateId === 'custom'.
const customInvoiceTemplateSchema = new mongoose.Schema({
  font: { type: String, default: 'Helvetica' },
  headerStyle: { type: String, default: 'plain' },
  titleAlign: { type: String, default: 'right' },
  tableStyle: { type: String, default: 'bordered' },
  dividerStyle: { type: String, default: 'solid' },
  paperTone: { type: String, default: 'white' },
  compact: { type: Boolean, default: false },
  narrow: { type: Boolean, default: false }
}, { _id: false });

/**
 * Organisation-level invoice defaults (2.3 #24, #25, #26).
 *
 * Three toggles in `invoiceContent` promised something the data could not deliver:
 * `showBankDetails` rendered an empty block because `bankDetails` lived only on
 * `Invoice` and had to be retyped every time; `showSignature` drew a signature line
 * with nothing to put on it; and there was no default terms text anywhere, so every
 * invoice started from the same hardcoded 'Thank you for your business!'.
 *
 * Held here because they are properties of the business, not of a document. The
 * per-invoice fields still win when set, so a one-off account or a special condition
 * is still expressible.
 */
const invoiceDefaultsSchema = new mongoose.Schema({
  bankName: { type: String, default: '' },
  accountName: { type: String, default: '' },
  accountNumber: { type: String, default: '' },
  ifsc: { type: String, default: '' },
  branch: { type: String, default: '' },
  /** UPI id printed on the invoice. Stored as text, not a QR: a QR this product
   *  cannot verify scans is a payment instruction that might not work. */
  upiId: { type: String, default: '' },
  /** Base64 signature image, same storage choice as the logo (see #45's note). */
  signatureUrl: { type: String, default: '' },
  signatoryName: { type: String, default: '' },
  /** Default terms, overridable per invoice. */
  termsAndConditions: { type: String, default: '' },
  defaultNotes: { type: String, default: '' }
}, { _id: false });

const brandingSchema = new mongoose.Schema({
  logoUrl: String,
  headerImageUrl: String,
  primaryColor: { type: String, default: '#4f46e5' },
  invoicePrefix: { type: String, default: 'KLG' },
  creditNotePrefix: { type: String, default: 'CN' },
  // How many digits the per-financial-year counter is padded to. Was hardcoded
  // at 3, so the 1000th document of a year broke the visual format mid-series.
  invoiceNumberPadding: { type: Number, default: 3, min: 1, max: 10 },
  // Optional trailing text, for tenants whose existing scheme carries a branch
  // or book marker (e.g. '/A').
  invoiceNumberSuffix: { type: String, default: '' },
  invoiceTitleLabel: { type: String, default: '' },
  // Round the payable total to a whole rupee (the Indian billing convention).
  // Defaults to true; a tenant billing in exact paise can turn it off.
  roundOffTotal: { type: Boolean, default: true },
  invoiceTemplateId: { type: String, default: 'modern-minimal' },
  customInvoiceTemplate: { type: customInvoiceTemplateSchema, default: null },
  invoiceContent: { type: invoiceContentSchema, default: () => ({}) },
  invoiceDefaults: { type: invoiceDefaultsSchema, default: () => ({}) }
}, { _id: false });

// Custom palette a tenant admin builds from scratch in the Appearance page.
const customThemeSchema = new mongoose.Schema({
  primary: String,
  secondary: String,
  accent: String,
  background: String,
  text: String,
  mode: { type: String, enum: ['light', 'dark'], default: 'light' }
}, { _id: false });

// One role's theme: either references a built-in preset by id, or a fully
// custom palette — the frontend prefers `custom` when present.
const roleThemeSchema = new mongoose.Schema({
  presetId: { type: String, default: 'indigo' },
  custom: { type: customThemeSchema, default: null }
}, { _id: false });

// Per-role UI theme, set by the tenant admin from the Appearance page.
// Each role (admin/accountant/viewer) can have its own look, so an
// organisation can, say, give viewers a lighter/simpler theme than admins.
const themeConfigSchema = new mongoose.Schema({
  admin: { type: roleThemeSchema, default: () => ({}) },
  accountant: { type: roleThemeSchema, default: () => ({}) },
  viewer: { type: roleThemeSchema, default: () => ({}) }
}, { _id: false });

/**
 * Per-organisation plan overrides.
 *
 * A tenant who needs three extra seats used to force one of two bad options:
 * invent a new plan for them (which then shows up in the public pricing table and
 * in everyone's MRR-by-plan), or move them to the next tier up and charge them for
 * capacity they didn't ask for. Null means "use the plan's limit" — see
 * services/planService.js, which is the only place these are read.
 */
const limitOverrideSchema = new mongoose.Schema({
  userLimit: { type: Number, default: null, min: 1 },
  invoiceLimit: { type: Number, default: null, min: 1 },
  /** Free-text note so an override is never a mystery six months later. */
  note: { type: String, default: '' }
}, { _id: false });

/**
 * An operator-authored message shown to one tenant.
 *
 * The alternative to this field is emailing them and hoping, which is what
 * support had to do: there was no way to put a sentence in front of a specific
 * organisation. `expiresAt` matters more than it looks — a banner with no end date
 * becomes furniture nobody reads.
 */
const noticeSchema = new mongoose.Schema({
  message: { type: String, default: '' },
  level: { type: String, enum: ['info', 'warning', 'danger'], default: 'info' },
  expiresAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  createdBy: { type: String, default: '' }
}, { _id: false });

/** Internal, support-only account context. Never returned to the tenant. */
const supportSchema = new mongoose.Schema({
  accountManager: { type: String, default: '' },
  tags: { type: [String], default: [] },
  riskLevel: { type: String, enum: ['none', 'watch', 'high'], default: 'none' },
  notes: { type: String, default: '' },
  updatedAt: Date
}, { _id: false });

const organisationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  adminEmail: { type: String, required: true, lowercase: true, trim: true },
  // Canonical owner of the org — distinct from the 'admin' role, which any
  // number of users may hold. Only the owner may transfer ownership.
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  gstin: String,
  pan: String,
  phone: String,
  address: String,
  state: String,
  stateCode: { type: String, default: '27' },
  plan: { type: String, default: 'starter' },
  status: { type: String, enum: ['trial', 'active', 'suspended', 'cancelled'], default: 'trial' },
  /**
   * Why the status is what it is, and who set it.
   *
   * Suspension was enforceable from Phase 2 but anonymous and unexplained: the
   * tenant saw "this account is suspended" with no reason, and the next operator
   * to look had no idea who had done it or what for. The reason is shown to the
   * tenant — it is about them, and withholding it only generates a support ticket.
   */
  statusReason: { type: String, default: '' },
  statusChangedAt: Date,
  statusChangedBy: { type: String, default: '' },
  /**
   * When the trial runs out. Set at registration; backfilled from `createdAt` for
   * organisations that predate it (migration 004). Nothing auto-suspends on this
   * date — it drives the console's "expiring in the next 7 days" list, which is
   * the actionable form of the same information.
   */
  trialEndsAt: Date,
  limitOverrides: { type: limitOverrideSchema, default: () => ({}) },
  /**
   * Per-organisation feature toggles, resolved over the platform defaults by
   * services/featureFlagService.js. A plain object rather than a `Map` on purpose:
   * `toObject()` leaves a Map as a Map, which `JSON.stringify` renders as `{}` —
   * the flags would silently vanish from every API response.
   */
  featureFlags: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
  notice: { type: noticeSchema, default: null },
  support: { type: supportSchema, default: () => ({}) },
  /** Last time any user of this organisation made an authenticated request.
   *  Maintained by services/usageEventService.js at most once per day per
   *  process, so it costs nothing on the request path. */
  lastActiveAt: Date,
  /**
   * E-invoicing configuration.
   *
   * `enabled` is a tenant decision, not something inferred from invoices raised
   * here: the threshold is measured on the *previous year's aggregate* turnover
   * across all of a business's GSTINs, which this product cannot see and would get
   * wrong for anyone who onboarded mid-year. `turnoverDeclared` records what the
   * tenant told us, so the figure behind the decision is on file.
   */
  eInvoicing: {
    enabled: { type: Boolean, default: false },
    turnoverDeclared: { type: Number, default: null },
    enabledAt: Date,
    /** Their own LUT reference, for zero-rated supplies without payment of tax. */
    lutNumber: { type: String, default: '' }
  },
  /**
   * Self-service account deletion (#62 / DPDP erasure).
   *
   * A grace window rather than an immediate wipe: an erasure request made in anger
   * or by mistake is unrecoverable, and a tenant's invoices are records they may be
   * statutorily required to keep. Purged by maintenanceService after the window.
   */
  deletedAt: { type: Date, default: null },
  deletionRequestedBy: String,
  deletionReason: String,
  brandingConfig: { type: brandingSchema, default: () => ({}) },
  themeConfig: { type: themeConfigSchema, default: () => ({}) },
  invoiceSequence: { type: Number, default: 0 },
  // Which financial year (Apr–Mar, labelled by its starting calendar year,
  // e.g. '2026' for FY2026-27) `invoiceSequence` currently counts against.
  // Null for orgs created before this field existed — see
  // invoiceNumberService.js's nextInvoiceNumber for the migration-safe
  // handling of that case (it must NOT reset an org's existing count).
  invoiceSequenceFY: { type: String, default: null },
  // Credit notes need their own consecutive series: GST requires a distinct
  // numbering series per document type, so a credit note must never draw from
  // the tax-invoice counter. Same FY-reset semantics as above.
  creditNoteSequence: { type: Number, default: 0 },
  creditNoteSequenceFY: { type: String, default: null }
}, { timestamps: true });

organisationSchema.index({ adminEmail: 1 });
organisationSchema.index({ status: 1, plan: 1 });
// The console's two actionable lists: trials about to lapse, and paying tenants
// that have gone quiet. Both are sorted scans over the whole collection without
// an index on the field they sort by.
organisationSchema.index({ status: 1, trialEndsAt: 1 });
organisationSchema.index({ lastActiveAt: 1 });
// Drives the scheduled purge of tenants past their erasure grace window.
organisationSchema.index({ deletedAt: 1 }, { sparse: true });

module.exports = { Organisation: mongoose.model('Organisation', organisationSchema) };
