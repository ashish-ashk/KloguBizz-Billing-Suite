const {
  z, objectId, gstin, pan, stateCode,
  money, percent, nonNegativeNumber,
  shortText, longText, email, optionalEmail, phone, isoDate
} = require('./common');

// ── Auth ─────────────────────────────────────────

const registerSchema = z.object({
  name: shortText.min(2, 'must be at least 2 characters'),
  email,
  password: z.string().min(8, 'must be at least 8 characters').max(200),
  orgName: shortText.min(2, 'must be at least 2 characters'),
  stateCode: stateCode.optional(),
  acceptTerms: z.literal(true, { errorMap: () => ({ message: 'must be accepted to create an account' }) })
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, 'is required'),
  password: z.string().min(1, 'is required').max(200)
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'is required').max(200),
  newPassword: z.string().min(8, 'must be at least 8 characters').max(200)
});

// Tokens are base64url of 32 random bytes; bounded so an absurd payload is
// rejected before it reaches a hash.
const opaqueToken = z.string().min(20, 'is not a valid token').max(200, 'is not a valid token');

const acceptInviteSchema = z.object({
  token: opaqueToken,
  password: z.string().min(8, 'must be at least 8 characters').max(200),
  acceptTerms: z.literal(true, { errorMap: () => ({ message: 'must be accepted to activate your account' }) })
});

const refreshTokenSchema = z.object({
  refreshToken: opaqueToken
});

// Logout is deliberately lenient: an absent/garbage token is just "already
// signed out" (see authController.logout), so this only bounds the payload
// size rather than requiring a well-formed token.
const logoutSchema = z.object({
  refreshToken: z.string().max(200).optional()
});

// `targetOrgId`, not `orgId` — server.js strips `orgId` from every request
// body unconditionally (it's the tenant-isolation boundary and must only ever
// come from the authenticated token), so switching organisations needs its
// own field name to say "the org I want to switch *to*".
const switchOrgSchema = z.object({
  targetOrgId: objectId
});

const forgotPasswordSchema = z.object({
  // Deliberately lenient: the endpoint responds identically whether or not the
  // address exists, so a strict format error here would leak more than it helps.
  email: z.string().trim().toLowerCase().min(1, 'is required').max(200)
});

const resetPasswordSchema = z.object({
  token: opaqueToken,
  password: z.string().min(8, 'must be at least 8 characters').max(200)
});

// ── Clients ──────────────────────────────────────

const clientCreateSchema = z.object({
  companyName: shortText.min(2, 'must be at least 2 characters'),
  email: optionalEmail,
  phone,
  gstin,
  address: longText.optional().nullable(),
  state: shortText.optional().nullable(),
  stateCode,
  status: z.enum(['active', 'inactive']).optional()
});

const clientUpdateSchema = clientCreateSchema.partial();

// ── Items ────────────────────────────────────────

const itemCreateSchema = z.object({
  itemCode: shortText.optional().nullable(),
  name: shortText.min(1, 'is required'),
  description: longText.optional().nullable(),
  type: z.enum(['goods', 'service']).optional(),
  hsn: shortText.optional().nullable(),
  category: shortText.optional().nullable(),
  unit: shortText.optional().nullable(),
  gstRate: percent.optional(),
  cessRate: percent.optional(),
  sellingPrice: money,
  mrp: money.optional().nullable(),
  purchasePrice: money.optional().nullable(),
  taxInclusive: z.coerce.boolean().optional(),
  stockQty: z.coerce.number().refine(Number.isFinite, 'must be a number').optional(),
  reorderLevel: nonNegativeNumber.optional().nullable(),
  barcode: shortText.optional().nullable(),
  status: z.enum(['active', 'inactive']).optional()
});

const itemUpdateSchema = itemCreateSchema.partial();

// ── Invoices ─────────────────────────────────────

const lineItemSchema = z.object({
  desc: shortText.min(1, 'is required'),
  hsn: shortText.optional().nullable(),
  qty: money.refine(value => value > 0, 'must be greater than zero'),
  rate: money,
  gstRate: percent.default(18),
  cessRate: percent.default(0),
  // Per-line trade discount. Was previously folded into `rate` by the Bill
  // Generator because the backend had nowhere to put it, which silently
  // destroyed the gross value and hid the discount from the customer.
  discountPercent: percent.default(0),
  // When true, `rate` already contains GST and cess, and the taxable value is
  // back-calculated from it.
  taxInclusive: z.coerce.boolean().default(false)
});

// A walk-in / unregistered buyer, used instead of clientId.
const billToSchema = z.object({
  type: z.enum(['b2b-unreg', 'b2c']).optional(),
  name: shortText.min(1, 'is required'),
  phone,
  email: optionalEmail,
  address: longText.optional().nullable(),
  stateCode: stateCode.optional(),
  gstin
});

/**
 * GST classification, shared by invoices and purchases.
 *
 * These decide the tax head and the GSTR-1 table a document lands in, so they are
 * validated as enums rather than accepted as free strings: an unrecognised
 * `taxTreatment` would silently fall back to 'taxable' inside the engine and produce
 * a return that puts an exempt supply in the wrong table.
 */
const TAX_TREATMENTS = ['taxable', 'exempt', 'nil-rated', 'non-gst', 'zero-rated'];
const SUPPLY_TYPES = [
  'regular', 'export-with-payment', 'export-without-payment',
  'sez-with-payment', 'sez-without-payment', 'deemed-export'
];

const exportDetailsSchema = z.object({
  // ISO 3166-1 alpha-2. Two letters, so a state code typed here is rejected rather
  // than reported to the GSTN as a country.
  countryCode: z.union([z.literal(''), z.string().trim().toUpperCase().length(2, 'must be a two-letter country code')]).optional().nullable(),
  portCode: shortText.optional().nullable(),
  shippingBillNumber: shortText.optional().nullable(),
  shippingBillDate: isoDate.optional().nullable(),
  currency: z.union([z.literal(''), z.string().trim().toUpperCase().length(3, 'must be a three-letter currency code')]).optional().nullable(),
  conversionRate: money.optional(),
  lutNumber: shortText.optional().nullable()
}).optional().nullable();

const invoiceBaseShape = {
  clientId: objectId.optional().nullable(),
  billTo: billToSchema.optional().nullable(),
  // The state whose tax applies. Distinct from the buyer's registered state (#29).
  placeOfSupply: stateCode.optional().nullable(),
  taxTreatment: z.enum(TAX_TREATMENTS).optional(),
  supplyType: z.enum(SUPPLY_TYPES).optional(),
  reverseCharge: z.coerce.boolean().optional(),
  exportDetails: exportDetailsSchema,
  date: isoDate,
  dueDate: isoDate,
  status: z.enum(['draft', 'pending', 'partial', 'paid', 'overdue']).optional(),
  items: z.array(lineItemSchema).min(1, 'must contain at least one line item').max(500, 'cannot exceed 500 line items'),
  // Invoice-level discount, applied on top of any per-line discounts.
  discountPercent: percent.optional(),
  notes: longText.optional().nullable(),
  paymentTerms: shortText.optional().nullable(),
  bankDetails: z.object({
    bank: shortText.optional().nullable(),
    account: shortText.optional().nullable(),
    ifsc: z.union([
      z.literal(''),
      z.string().trim().toUpperCase().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'is not a valid IFSC code')
    ]).optional().nullable()
  }).optional().nullable()
};

// Exactly one buyer: a registered client reference, or embedded walk-in
// details. Both or neither is a request the controller cannot price.
function assertOneBuyer(data, ctx) {
  const hasClient = Boolean(data.clientId);
  const hasBillTo = Boolean(data.billTo?.name);
  if (hasClient && hasBillTo) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['clientId'], message: 'cannot be combined with buyer details — choose one' });
  }
  if (!hasClient && !hasBillTo) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['clientId'], message: 'is required, or provide buyer details instead' });
  }
}

const invoiceCreateSchema = z.object(invoiceBaseShape)
  .superRefine(assertOneBuyer)
  .refine(data => data.dueDate >= data.date, {
    path: ['dueDate'],
    message: 'cannot be before the invoice date'
  });

// Updates are partial, so the buyer check only applies when the request
// actually touches the buyer — the controller merges with the stored document.
const invoiceUpdateSchema = z.object(invoiceBaseShape).partial()
  .refine(data => !(data.clientId && data.billTo?.name), {
    path: ['clientId'],
    message: 'cannot be combined with buyer details — choose one'
  })
  .refine(data => !(data.date && data.dueDate) || data.dueDate >= data.date, {
    path: ['dueDate'],
    message: 'cannot be before the invoice date'
  });

const markPaidSchema = z.object({
  method: shortText.optional(),
  reference: shortText.optional(),
  date: isoDate.optional()
});

// ── Payments ─────────────────────────────────────

const paymentCreateSchema = z.object({
  invoiceId: objectId,
  amount: money.refine(value => value > 0, 'must be greater than zero'),
  method: shortText.optional(),
  reference: shortText.optional().nullable(),
  note: longText.optional().nullable(),
  date: isoDate.optional()
  // `status` is deliberately absent: it is derived server-side. Accepting it
  // let a caller post a 'failed' payment that still showed in the list and the
  // CSV export while contributing nothing to the invoice balance.
});

// ── Credit notes ─────────────────────────────────

const creditNoteCreateSchema = z.object({
  invoiceId: objectId,
  date: isoDate.optional(),
  // A classification, not free text: GSTR-1's CDNR table requires one.
  reason: z.enum(['sales-return', 'post-sale-discount', 'correction', 'deficiency-in-service', 'order-cancelled', 'other']).optional(),
  reasonNote: longText.optional().nullable(),
  // Omitted for a full reversal, in which case the controller copies the
  // invoice's own lines so HSN codes and rates stay consistent for the return.
  items: z.array(lineItemSchema).max(500, 'cannot exceed 500 line items').optional(),
  discountPercent: percent.optional(),
  notes: longText.optional().nullable()
});

// ── Quotations, proforma invoices, delivery challans (2.2 #11–#13) ──

const CHALLAN_PURPOSES = [
  'job-work', 'approval', 'supply-on-approval',
  'liquid-gas', 'semi-knocked-down', 'exhibition', 'other'
];

const transportSchema = z.object({
  vehicleNumber: shortText.optional().nullable(),
  transporterName: shortText.optional().nullable(),
  transporterGstin: gstin,
  lrNumber: shortText.optional().nullable(),
  dispatchedFrom: longText.optional().nullable(),
  shipTo: longText.optional().nullable(),
  distanceKm: nonNegativeNumber.optional().nullable()
});

/**
 * The fields shared by all three kinds.
 *
 * `documentNumber` is deliberately absent: it comes from the org's atomic
 * per-kind counter, and accepting one from the request would desync that
 * counter and risk colliding with a number already issued — the same rule
 * `invoiceCreateSchema` follows.
 */
const salesDocumentBase = {
  clientId: objectId.optional().nullable(),
  billTo: billToSchema.optional().nullable(),
  date: isoDate.optional(),
  /** Quotation-only; the controller nulls it for the other kinds. */
  validUntil: isoDate.optional().nullable(),
  items: z.array(lineItemSchema).min(1, 'at least one line item is required').max(500, 'cannot exceed 500 line items'),
  discountPercent: percent.optional(),
  placeOfSupply: stateCode.optional(),
  taxTreatment: z.enum(TAX_TREATMENTS).optional(),
  supplyType: z.enum(SUPPLY_TYPES).optional(),
  reverseCharge: z.coerce.boolean().optional(),
  challanPurpose: z.enum(CHALLAN_PURPOSES).optional(),
  transport: transportSchema.optional().nullable(),
  notes: longText.optional().nullable(),
  terms: longText.optional().nullable(),
  paymentTerms: shortText.optional().nullable()
};

const salesDocumentCreateSchema = z.object({
  kind: z.enum(['quotation', 'proforma', 'delivery-challan']),
  // Only these two are settable at creation — 'converted' in particular is the
  // outcome of the convert endpoint and nothing else, or the link between the
  // document and its invoice could be fabricated.
  status: z.enum(['draft', 'sent']).optional(),
  ...salesDocumentBase
});

const salesDocumentUpdateSchema = z.object({
  ...salesDocumentBase,
  // Optional on update: an edit that changes only the notes should not have to
  // resend every line.
  items: z.array(lineItemSchema).min(1, 'at least one line item is required').max(500).optional()
});

const salesDocumentStatusSchema = z.object({
  status: z.enum(['draft', 'sent', 'accepted', 'rejected', 'expired'])
});

/** Conversion may override the invoice's own dates; everything else is carried
 *  over from the document being converted. */
const salesDocumentConvertSchema = z.object({
  date: isoDate.optional(),
  dueDate: isoDate.optional()
});

// ── Users ────────────────────────────────────────

const userInviteSchema = z.object({
  name: shortText.min(2, 'must be at least 2 characters'),
  email,
  role: z.enum(['admin', 'accountant', 'viewer']).optional()
});

const userUpdateSchema = z.object({
  name: shortText.min(2, 'must be at least 2 characters').optional(),
  // 'superadmin' is intentionally not an option here — see
  // userController.ASSIGNABLE_ROLES.
  role: z.enum(['admin', 'accountant', 'viewer']).optional(),
  status: z.enum(['active', 'disabled']).optional()
});

// ── Organisation ─────────────────────────────────

const organisationUpdateSchema = z.object({
  name: shortText.min(2, 'must be at least 2 characters').optional(),
  gstin,
  pan,
  phone,
  address: longText.optional().nullable(),
  state: shortText.optional().nullable(),
  stateCode: stateCode.optional(),
  // Branding and theme are nested free-form config validated by the Mongoose
  // schema; passthrough keeps them intact without restating every knob here.
  brandingConfig: z.record(z.any()).optional(),
  themeConfig: z.record(z.any()).optional()
});

const transferOwnershipSchema = z.object({
  newOwnerId: objectId,
  password: z.string().min(1, 'is required').max(200)
});

// ── Subscriptions ────────────────────────────────

const subscriptionStartSchema = z.object({
  planCode: shortText.min(1, 'is required'),
  billingCycle: z.enum(['monthly', 'yearly']).optional()
});

// ── Vendors and purchases (Phase 5) ──────────────

const vendorCreateSchema = z.object({
  name: shortText.min(1, 'is required'),
  email: optionalEmail,
  phone,
  // Optional on purpose: an unregistered supplier has no GSTIN, and a purchase from
  // one is precisely the case that attracts reverse charge.
  gstin,
  pan,
  address: longText.optional().nullable(),
  state: shortText.optional().nullable(),
  stateCode,
  registrationType: z.enum(['regular', 'composition', 'unregistered', 'overseas', 'sez']).optional(),
  notes: longText.optional().nullable(),
  status: z.enum(['active', 'inactive']).optional()
});
const vendorUpdateSchema = vendorCreateSchema.partial();

const purchaseBaseShape = {
  vendorId: objectId,
  // The supplier's own number, which is what GSTR-2A/2B reconciliation matches on.
  billNumber: shortText.min(1, 'is required'),
  billDate: isoDate,
  dueDate: isoDate.optional().nullable(),
  items: z.array(lineItemSchema).min(1, 'must contain at least one line item').max(500, 'cannot exceed 500 line items'),
  discountPercent: percent.optional(),
  placeOfSupply: stateCode.optional().nullable(),
  taxTreatment: z.enum(TAX_TREATMENTS).optional(),
  supplyType: z.enum(['regular', 'import-goods', 'import-services', 'sez', 'deemed-export']).optional(),
  reverseCharge: z.coerce.boolean().optional(),
  itcCategory: z.enum(['inputs', 'capital-goods', 'input-services', 'ineligible', 'blocked']).optional(),
  itcNote: longText.optional().nullable(),
  notes: longText.optional().nullable(),
  category: shortText.optional().nullable(),
  status: z.enum(['draft', 'recorded']).optional()
};
const purchaseCreateSchema = z.object(purchaseBaseShape);
const purchaseUpdateSchema = z.object(purchaseBaseShape).partial();
const purchasePaySchema = z.object({ amount: money.refine(value => value > 0, 'must be greater than zero') });

// ── MFA, verification and erasure ────────────────

// Six digits, or a formatted backup code. Both are accepted here and told apart by
// the verifier, so a user pasting a recovery code into the code box is not rejected
// by validation before it is even tried.
const mfaCode = z.string().trim().min(6, 'is required').max(20);
const mfaEnableSchema = z.object({ code: mfaCode });
const mfaVerifySchema = z.object({ mfaToken: z.string().min(10, 'is required'), code: mfaCode });
const mfaDisableSchema = z.object({ password: z.string().min(1, 'is required'), code: mfaCode });
const verifyEmailSchema = z.object({ token: z.string().min(10, 'is required') });
const accountDeletionSchema = z.object({
  confirmName: z.string().min(1, 'is required'),
  password: z.string().min(1, 'is required'),
  reason: longText.optional().nullable()
});

module.exports = {
  TAX_TREATMENTS, SUPPLY_TYPES,
  vendorCreateSchema, vendorUpdateSchema,
  purchaseCreateSchema, purchaseUpdateSchema, purchasePaySchema,
  mfaEnableSchema, mfaVerifySchema, mfaDisableSchema,
  verifyEmailSchema, accountDeletionSchema,
  registerSchema, loginSchema, changePasswordSchema,
  acceptInviteSchema, forgotPasswordSchema, resetPasswordSchema,
  refreshTokenSchema, logoutSchema, switchOrgSchema,
  clientCreateSchema, clientUpdateSchema,
  itemCreateSchema, itemUpdateSchema,
  invoiceCreateSchema, invoiceUpdateSchema, markPaidSchema,
  paymentCreateSchema,
  creditNoteCreateSchema,
  salesDocumentCreateSchema, salesDocumentUpdateSchema,
  salesDocumentStatusSchema, salesDocumentConvertSchema,
  userInviteSchema, userUpdateSchema,
  organisationUpdateSchema, transferOwnershipSchema,
  subscriptionStartSchema
};
