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
  /** Legacy inline signature image. Empty once the image lives in object
   *  storage — `signatureKey` then holds it. See services/brandingAssetService.js. */
  signatureUrl: { type: String, default: '' },
  /** Object-storage key for the signature image (#45). */
  signatureKey: { type: String, default: '' },
  signatoryName: { type: String, default: '' },
  /** Default terms, overridable per invoice. */
  termsAndConditions: { type: String, default: '' },
  defaultNotes: { type: String, default: '' }
}, { _id: false });

const brandingSchema = new mongoose.Schema({
  /**
   * Images live in one of two places (#45), and exactly one of each pair is
   * populated for a freshly-saved image:
   *
   *  - `*Key` — a content-addressed object-storage key, when an external store
   *    is configured (`STORAGE_DRIVER=s3|local`).
   *  - `*Url` — the legacy inline base64 data URI, used when no store is
   *    configured and on documents that predate migration 007.
   *
   * Nothing reads these fields directly: `brandingAssetService.resolveImage`
   * prefers the key and falls back to the data URI, so a partially-migrated
   * database keeps working.
   */
  logoUrl: String,
  logoKey: { type: String, default: '' },
  headerImageUrl: String,
  headerImageKey: { type: String, default: '' },
  primaryColor: { type: String, default: '#4f46e5' },
  invoicePrefix: { type: String, default: 'KLG' },
  creditNotePrefix: { type: String, default: 'CN' },
  // Prefixes for the three pre-invoice documents (2.2 #11–#13). Distinct
  // defaults so the number alone says what kind of document it is.
  quotationPrefix: { type: String, default: 'QT' },
  proformaPrefix: { type: String, default: 'PI' },
  deliveryChallanPrefix: { type: String, default: 'DC' },
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

/**
 * The tenant's *own* payment gateway, for collecting from their customers
 * (2.3 #21).
 *
 * Distinct from the platform's Razorpay keys in `env`, which are how tenants pay
 * **us**. These are how a tenant's customer pays **them**, so the money never
 * touches a platform account — which is both the simplest arrangement and the one
 * that avoids us becoming a payment aggregator, a regulated activity in India.
 *
 * The alternative is Razorpay Route, where funds land in the platform account and
 * are split to sub-merchants. That is a better experience (one onboarding, we can
 * take a cut) and a much larger commitment: it makes us the merchant of record and
 * needs its own compliance. Per-tenant keys are deliberately the first
 * implementation, and the seam is narrow enough that Route can be added as a
 * second `provider` later without touching the payment-link flow.
 *
 * **The secrets are encrypted at rest** (`utils/secretBox.js`, namespace
 * `gateway`) for exactly the reason the MFA secret is: a readable key secret in
 * the database is the ability to charge that tenant's customers, for anyone who
 * can read a backup. `keyId` is *not* encrypted — it is public by design, appears
 * in the browser, and is what the checkout script needs.
 */
const paymentGatewaySchema = new mongoose.Schema({
  provider: { type: String, enum: ['razorpay'], default: 'razorpay' },
  /** Public. Sent to the browser to open checkout. */
  keyId: { type: String, default: '' },
  /** Encrypted. Never returned by any API — the console gets `••••1234`. */
  keySecret: { type: String, default: '' },
  /**
   * Encrypted. The tenant's own webhook secret, distinct from the platform's:
   * a webhook for a tenant's collection is signed with the tenant's secret, and
   * verifying it against ours would fail — or worse, succeed for the wrong
   * tenant if the two were ever shared.
   */
  webhookSecret: { type: String, default: '' },
  /** Off until the tenant explicitly turns it on, so a half-entered key pair
   *  cannot start producing links that fail at checkout. */
  enabled: { type: Boolean, default: false },
  connectedAt: Date,
  connectedBy: String,
  /** How long a generated link stays payable. A link that works forever is a
   *  standing charge against card details long after the invoice was settled. */
  linkValidityDays: { type: Number, default: 14, min: 1, max: 90 }
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

/**
 * How this tenant values its stock (2.5 #41).
 *
 * **Not a global constant**, because the choice is an accounting policy the
 * business makes and is expected to keep: AS-2 and Ind AS 2 both permit FIFO and
 * weighted average (and both prohibit LIFO, which is why it is not offered), but
 * they also require the method to be applied *consistently*. Changing it
 * re-values everything on hand, so it is a deliberate setting rather than
 * something derived.
 *
 * FIFO is the default: it is what a stock book does naturally, it survives
 * inflation without distorting margin, and it is the answer most Indian SMBs and
 * their auditors expect.
 */
const inventorySchema = new mongoose.Schema({
  valuationMethod: { type: String, enum: ['fifo', 'weighted-average'], default: 'fifo' },
  /**
   * Consume the earliest-expiring batch first rather than the earliest-received.
   *
   * Off by default because it only makes sense where goods expire, and where they
   * do it is not a preference but a requirement — dispensing the older-expiring
   * pack is the entire point of tracking expiry. Only affects items with expiry
   * dates recorded; everything else still runs in receipt order.
   */
  consumeByExpiry: { type: Boolean, default: false },
  /**
   * Warn this many days before a batch expires. Nothing is blocked — an expiry
   * date is information a person acts on, not a rule the software should enforce
   * by refusing to sell.
   */
  expiryWarningDays: { type: Number, default: 30, min: 0, max: 365 }
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
   * Whether this suspension was applied automatically for non-payment (3.3 #10).
   *
   * The distinction is load-bearing, not bookkeeping. When a customer's card
   * finally goes through, the dunning sweep restores their access — and it must
   * restore *only* what it took away. A tenant suspended by an operator for
   * fraud, abuse or a legal hold who then happens to pay an invoice must stay
   * suspended; silently reinstating them because money arrived would undo a
   * human decision that money was never the point of.
   */
  suspendedForNonPayment: { type: Boolean, default: false },
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
  paymentGateway: { type: paymentGatewaySchema, default: () => ({}) },
  inventory: { type: inventorySchema, default: () => ({}) },
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
  creditNoteSequenceFY: { type: String, default: null },
  /**
   * Counters for the three pre-invoice documents (2.2 #11–#13).
   *
   * Separate from the invoice counter so a quotation can never consume an
   * invoice number — a gap in the tax-invoice series is what an auditor reads
   * as a missing document. Same FY-reset semantics as above, and the same
   * migration-safe handling of a null FY: an org that starts issuing
   * quotations today gets 1, and one that somehow already has a count keeps it.
   */
  quotationSequence: { type: Number, default: 0 },
  quotationSequenceFY: { type: String, default: null },
  proformaSequence: { type: Number, default: 0 },
  proformaSequenceFY: { type: String, default: null },
  deliveryChallanSequence: { type: Number, default: 0 },
  deliveryChallanSequenceFY: { type: String, default: null }
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
