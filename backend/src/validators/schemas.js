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

const invoiceBaseShape = {
  clientId: objectId.optional().nullable(),
  billTo: billToSchema.optional().nullable(),
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

module.exports = {
  registerSchema, loginSchema, changePasswordSchema,
  clientCreateSchema, clientUpdateSchema,
  itemCreateSchema, itemUpdateSchema,
  invoiceCreateSchema, invoiceUpdateSchema, markPaidSchema,
  paymentCreateSchema,
  userInviteSchema, userUpdateSchema,
  organisationUpdateSchema, transferOwnershipSchema,
  subscriptionStartSchema
};
