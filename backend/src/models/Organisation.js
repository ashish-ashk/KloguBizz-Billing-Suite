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
  invoiceContent: { type: invoiceContentSchema, default: () => ({}) }
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

module.exports = { Organisation: mongoose.model('Organisation', organisationSchema) };
