/**
 * One page of a list endpoint.
 *
 * Every list endpoint returns this envelope rather than a bare array. The
 * endpoints used to return the *entire* collection — an invoice list was every
 * invoice the tenant had ever raised, with its line items and populated client,
 * on every page view. `total` is what makes the window honest: a client can
 * always tell whether it is looking at everything or at the first slice.
 */
export interface Page<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasMore: boolean;
}

/** Query parameters accepted by the paginated list endpoints. */
export interface ListParams {
  page?: number;
  limit?: number;
  /** Server-side search. Replaces filtering a fully-downloaded list in the browser. */
  q?: string;
  /** `field` ascending, `-field` descending. Restricted server-side to indexed columns. */
  sort?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'superadmin' | 'admin' | 'accountant' | 'viewer';
  status: string;
  /**
   * The second factor's state — never its secret.
   *
   * The server sends exactly these three facts. `enabled` drives whether the
   * security page offers "Set up" or "Turn off"; it was missing from the session
   * payload entirely, so an enrolled account was shown "Off" and a Set up button
   * with no way to turn it off. `backupCodesRemaining` is here because zero left
   * plus a lost phone is a locked account, and a count nobody sees is a warning
   * nobody gets.
   */
  mfa?: {
    enabled: boolean;
    enrolledAt?: string | null;
    backupCodesRemaining: number;
  };
  platformRole?: string;
}

export interface Organisation {
  _id: string;
  name: string;
  adminEmail: string;
  ownerId?: string;
  gstin?: string;
  pan?: string;
  phone?: string;
  address?: string;
  state?: string;
  stateCode: string;
  plan: string;
  status: string;
  brandingConfig?: {
    /**
     * **Never present in an API response** — write-only.
     *
     * These carry base64 image data of up to 500KB/700KB and used to be inlined
     * in every `/auth/me` and `/organisations/current` payload; the bytes now
     * come back as the cacheable asset URLs below.
     *
     * They used to come back as `''`, which was worse than absent: an empty
     * string is how you *remove* an image, so a client that read an organisation,
     * changed one field and sent it back erased the logo. Omitted, there is
     * nothing to echo.
     *
     * Send a data URI to set an image, an empty string to clear one, and omit the
     * key to leave it alone.
     */
    logoUrl?: string;
    headerImageUrl?: string;
    /** Cacheable, content-addressed URL relative to the API root. Empty when
     *  nothing has been uploaded. Resolve with `ApiService.assetUrl()`. */
    logoAssetUrl?: string;
    headerImageAssetUrl?: string;
    /** Whether an image is on file, without shipping it. */
    hasLogo?: boolean;
    hasHeaderImage?: boolean;
    primaryColor?: string;
    invoicePrefix?: string;
    invoiceTitleLabel?: string;
    /** Round the payable total to a whole rupee (the Indian billing
     *  convention). Defaults to true when unset. */
    roundOffTotal?: boolean;
    /** Credit notes use their own consecutive series, as GST requires. */
    creditNotePrefix?: string;
    invoiceTemplateId?: string;
    customInvoiceTemplate?: import('./invoice-templates').CustomInvoiceTemplate | null;
    invoiceContent?: {
      showLogo?: boolean;
      showSignature?: boolean;
      showBankDetails?: boolean;
      showAmountInWords?: boolean;
      showGstBreakdown?: boolean;
    };
    /**
     * Organisation-level invoice defaults (2.3 #24–#26).
     *
     * Three `invoiceContent` toggles used to promise something the data could not
     * deliver: an empty bank block, a signature line with nothing above it, and no
     * default terms anywhere. Per-invoice fields still win when set.
     */
    invoiceDefaults?: {
      bankName?: string;
      accountName?: string;
      accountNumber?: string;
      ifsc?: string;
      branch?: string;
      /** Printed as text, not a QR — see the note in the security component about
       *  shipping a code this product cannot verify scans. */
      upiId?: string;
      /**
       * Write-only, and **absent** from responses rather than empty.
       *
       * The bytes come back as `signatureAssetUrl`. It previously returned `''`,
       * and an empty string means "remove this image" — so echoing a response
       * back erased the signature. There is now nothing to echo.
       */
      signatureUrl?: string;
      /** Cacheable URL for the uploaded signature. Read-only. */
      signatureAssetUrl?: string;
      /** Whether a signature is on file, without shipping it. */
      hasSignature?: boolean;
      signatoryName?: string;
      termsAndConditions?: string;
      defaultNotes?: string;
    };
  };
  themeConfig?: import('./theme').OrgThemeConfig;
  createdAt?: string;

  // ── Platform-console fields (Phase 4) ──
  /** Why the account is suspended or cancelled. Shown to the tenant — a status
   *  with no explanation is a support ticket. */
  statusReason?: string;
  statusChangedAt?: string;
  statusChangedBy?: string;
  /** When the trial lapses. Nothing auto-suspends on it; it drives the console's
   *  "expiring this week" list. */
  trialEndsAt?: string;
  /** Last authenticated request by any user of this organisation. */
  lastActiveAt?: string;
  /** Per-org ceilings that beat the plan's. `null` means "use the plan". */
  limitOverrides?: { userLimit?: number | null; invoiceLimit?: number | null; note?: string };
  /** Explicit per-org flag overrides. The *effective* flags are `flags` on the
   *  session payload — these are only the deltas an operator set. */
  featureFlags?: Record<string, boolean>;
  notice?: TenantNotice | null;
  /** Internal support context. Never present in a tenant-facing response — the
   *  API selects it out — and only populated in the platform console. */
  support?: OrgSupportContext;
}

/** An operator-authored banner, either for one tenant or platform-wide. */
export interface TenantNotice {
  message: string;
  level: 'info' | 'warning' | 'danger';
  expiresAt?: string | null;
  createdAt?: string;
  createdBy?: string;
  /** Which of the two banners this is. Set by the API, not stored. */
  scope?: 'platform' | 'organisation';
}

export interface OrgSupportContext {
  accountManager?: string;
  tags?: string[];
  riskLevel?: 'none' | 'watch' | 'high';
  notes?: string;
  updatedAt?: string;
}

/** Effective feature flags for the signed-in tenant, resolved server-side. */
export type FeatureFlags = Record<string, boolean>;

/** A superadmin acting as a tenant user. Reported by the server, never inferred
 *  from the token — the token deliberately looks like an ordinary one. */
export interface ImpersonationContext {
  by: string;
  byName: string;
  readOnly: boolean;
  expiresAt: string | null;
  /** Filled in client-side when a session is started, so the banner can name the
   *  tenant without a second request. */
  orgName?: string;
}

export interface PublicBranding {
  appName: string;
  tagline: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  /** Cacheable asset URLs relative to the API root — resolve with
   *  `ApiService.assetUrl()`. The login page is unauthenticated and is hit by
   *  every visitor, so the images are no longer inlined here. */
  logoAssetUrl?: string;
  faviconAssetUrl?: string;
  /** Always empty; kept so an older client still parses the response. */
  logoUrl: string;
  faviconUrl: string;
}

/** Organisation decorated with counts for the super-admin table. */
export interface OrgSummary extends Organisation {
  userCount: number;
  invoiceCount: number;
  admin: { name: string; email: string } | null;
  owner: { name: string; email: string } | null;
  subscription: Subscription | null;
}

/** Audit filters, plus the two the login-history panel adds. */
export interface LoginHistoryFilters extends ListParams {
  outcome?: 'success' | 'failure';
  ip?: string;
  actorId?: string;
  orgId?: string;
}

export interface Client {
  _id: string;
  companyName: string;
  email: string;
  phone: string;
  gstin: string;
  address?: string;
  state: string;
  stateCode: string;
  status?: string;
}

export interface Item {
  _id: string;
  itemCode?: string;
  name: string;
  description?: string;
  type: 'goods' | 'service';
  hsn?: string;
  category?: string;
  unit: string;
  gstRate: number;
  cessRate?: number;
  sellingPrice: number;
  mrp?: number;
  purchasePrice?: number;
  taxInclusive?: boolean;
  stockQty?: number;
  /** What the stock on hand cost, from the open cost layers. Not
   *  `sellingPrice x quantity` — that books a profit not yet earned. */
  stockValue?: number;
  reorderLevel?: number;
  barcode?: string;
  /** Whether receipts of this item must carry a batch number and expiry date. */
  trackBatches?: boolean;
  status?: 'active' | 'inactive';
}

export interface ItemBulkUploadFailure {
  row: number;
  itemCode?: string;
  name?: string;
  errors: string[];
}

export interface ItemBulkUploadResult {
  totalRows: number;
  created: number;
  failed: ItemBulkUploadFailure[];
}

/**
 * Produced entirely by the backend's gstService — never assembled in the
 * browser, so the on-screen document, the PDF and the GST report always agree.
 * The optional fields are absent on invoices created before they existed, so
 * every read site must tolerate `undefined`.
 */
export interface InvoiceTotals {
  /** Value before any discount, so the discount stays auditable. */
  grossSubtotal?: number;
  discountTotal?: number;
  /** Taxable value: gross less discounts. This is what GST is charged on. */
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  /** GST compensation cess (tobacco, automobiles, aerated drinks...). */
  cess?: number;
  /** Adjustment that brings the payable total to a whole rupee. */
  roundOff?: number;
  total: number;
  isIGST: boolean;
  /** Intra-territory supply to a UT that levies UTGST rather than SGST — the
   *  amount is still in `sgst`, this only changes the label. */
  isUT?: boolean;

  // ── Classification, resolved server-side and stored (Phase 5) ──
  taxTreatment?: TaxTreatment;
  supplyType?: SupplyType;
  reverseCharge?: boolean;
  zeroRated?: boolean;
  /** False for an exempt, nil-rated, non-GST, LUT-export or reverse-charge supply. */
  taxCharged?: boolean;
  /** Why no tax was charged, in words — so a zero-tax invoice explains itself instead
   *  of looking like a bug. */
  taxNote?: string;
}

export interface InvoiceItem {
  desc: string;
  hsn: string;
  qty: number;
  rate: number;
  gstRate: number;
  /** GST compensation cess rate for this line. */
  cessRate?: number;
  /** Per-line trade discount. Kept separate from `rate` so the gross value
   *  survives and the customer can see what they were given. */
  discountPercent?: number;
  /** When true, `rate` already includes GST and cess. */
  taxInclusive?: boolean;
}

export interface BankDetails {
  bank?: string;
  account?: string;
  ifsc?: string;
}

/** Walk-in/not-yet-registered buyer details — used instead of `clientId` for a quick bill (Bill Generator's B2B-Unregistered/B2C modes). */
export interface BillTo {
  type?: 'b2b-unreg' | 'b2c';
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  stateCode?: string;
  gstin?: string;
}

/** Reasons recognised by GSTR-1's CDNR table. */
export type CreditNoteReason =
  | 'sales-return' | 'post-sale-discount' | 'correction'
  | 'deficiency-in-service' | 'order-cancelled' | 'other';

/**
 * A credit note against an issued invoice.
 *
 * Under GST an issued invoice is never deleted or silently rewritten — a
 * reduction is made by issuing one of these, which references the original and
 * appears separately in the return.
 */
export interface CreditNote {
  _id: string;
  creditNoteNumber: string;
  invoiceId: string;
  /** Snapshotted at issue time so the note reads completely on its own. */
  invoiceNumber: string;
  invoiceDate?: string;
  clientId: Client | string | null;
  billTo?: BillTo | null;
  date: string;
  reason: CreditNoteReason;
  reasonNote?: string;
  items: InvoiceItem[];
  discountPercent?: number;
  totals: InvoiceTotals;
  status: 'draft' | 'issued';
  notes?: string;
}

/** How much of an invoice can still be credited. */
export interface CreditSummary {
  invoiceNumber: string;
  invoiceTotal: number;
  credited: number;
  creditable: number;
  creditNotes: CreditNote[];
}

export interface Invoice {
  _id: string;
  invoiceNumber: string;
  /** Exactly one of `clientId`/`billTo` is set — a registered client for formal invoices, or embedded walk-in details for a quick bill. */
  clientId: Client | string | null;
  billTo?: BillTo | null;
  date: string;
  dueDate: string;
  paidDate?: string | null;
  /** 'cancelled' = fully reversed by credit note, or voided before collection.
   *  The document is retained either way. */
  status: 'draft' | 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled';
  cancelledAt?: string;
  cancelReason?: string;
  items: InvoiceItem[];
  /** Invoice-level discount, on top of any per-line discounts. */
  discountPercent?: number;

  // ── GST classification (Phase 5) ──
  /** The state whose tax applies. Distinct from the buyer's registered state, and it is
   *  what decides IGST versus CGST+SGST. */
  placeOfSupply?: string;
  taxTreatment?: TaxTreatment;
  supplyType?: SupplyType;
  /** Tax payable by the recipient: the value is reported, no tax is collected. */
  reverseCharge?: boolean;
  exportDetails?: ExportDetails | null;
  eInvoice?: EInvoiceState;

  totals: InvoiceTotals;
  /** Settlement state, persisted by the backend from successful payments. */
  amountPaid?: number;
  /** Total of issued credit notes — reduces what is owed like a payment does. */
  amountCredited?: number;
  balanceDue?: number;
  notes?: string;
  paymentTerms?: string;
  bankDetails?: BankDetails;
}

export interface InvoiceStats {
  /** Money actually received (successful payments), not the face value of
   *  invoices whose status happens to be 'paid'. */
  totalRevenue: number;
  /** Outstanding balances, not invoice totals — a part-paid invoice
   *  contributes only what is still owed. */
  pendingAmount: number;
  overdueAmount: number;
  outstandingAmount?: number;
  /** Whole-organisation counts — the invoice list's status tabs read them from
   *  here, since the list itself is now a page rather than the full collection. */
  counts: {
    total: number; paid: number; pending: number; overdue: number;
    draft: number; cancelled?: number; partial?: number;
  };
  /** Average days from invoice date to payment date, or null if nothing has been
   *  collected. Computed by the server — the Payments page used to derive it by
   *  reducing over every invoice in the browser. */
  avgCollectionDays?: number | null;
  monthlyRevenue: Array<{ month: string; revenue: number }>;
  topClients: Array<{ name: string; revenue: number }>;
}

export interface GstSummary {
  /** The period covered — the report is financial-year scoped rather than
   *  aggregating all history. */
  period: { from: string; to: string; label: string };
  byMonth: Array<{ month: string; gross: number; discount: number; taxable: number; cgst: number; sgst: number; igst: number; cess: number; total: number; invoiceCount: number }>;
  byRate: Array<{ rate: number; taxable: number; tax: number; cess: number }>;
  /** HSN/SAC-wise summary — a required table in GSTR-1. */
  byHsn: Array<{ hsn: string; description?: string; qty: number; taxable: number; tax: number; cess: number }>;
  totals: { gross: number; discount: number; taxable: number; cgst: number; sgst: number; igst: number; cess: number; tax: number; total: number; invoiceCount: number };
}

// ── GST classification (Phase 5) ─────────────────

/**
 * How a supply is classified. `gstRate: 0` used to be the only way to say "no tax",
 * which collapsed five legally distinct things — they appear in different tables of the
 * return, and only some count towards turnover.
 */
export type TaxTreatment = 'taxable' | 'exempt' | 'nil-rated' | 'non-gst' | 'zero-rated';

/**
 * The nature of the supply. The with/without-payment distinction is not cosmetic:
 * charging IGST on a LUT export overcharges the customer, and not charging it on a
 * with-payment export understates the liability.
 */
export type SupplyType =
  | 'regular'
  | 'export-with-payment' | 'export-without-payment'
  | 'sez-with-payment' | 'sez-without-payment'
  | 'deemed-export';

export interface ExportDetails {
  countryCode?: string;
  portCode?: string;
  shippingBillNumber?: string;
  shippingBillDate?: string;
  currency?: string;
  conversionRate?: number;
  lutNumber?: string;
}

/** E-invoice state. `not-required`, `pending`, `generated` and `failed` are four
 *  genuinely different situations that were previously indistinguishable. */
export interface EInvoiceState {
  status: 'not-required' | 'pending' | 'generated' | 'cancelled' | 'failed';
  irn?: string;
  ackNo?: string;
  ackDate?: string;
  /** The IRP's own scannable QR — unlike the template's decorative motif. */
  signedQrCode?: string;
  generatedAt?: string;
  cancelledAt?: string;
  errorCode?: string;
  error?: string;
  attempts?: number;
}

export interface Vendor {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  /** Absent for an unregistered supplier — the case that attracts reverse charge. */
  gstin?: string;
  pan?: string;
  address?: string;
  state?: string;
  stateCode: string;
  registrationType?: 'regular' | 'composition' | 'unregistered' | 'overseas' | 'sez';
  notes?: string;
  status?: 'active' | 'inactive';
  deletedAt?: string | null;
}

/** Where a purchase's credit goes in GSTR-3B table 4. Not a boolean, because "can I
 *  claim this" has more than two answers and the return asks for them separately. */
export type ItcCategory = 'inputs' | 'capital-goods' | 'input-services' | 'ineligible' | 'blocked';

export interface PurchaseItc {
  category: ItcCategory;
  eligible: boolean;
  note?: string;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  claimedInPeriod?: string;
}

export interface Purchase {
  _id: string;
  vendorId: Vendor | string;
  /** The supplier's own number and date — what GSTR-2A/2B reconciliation matches on. */
  billNumber: string;
  billDate: string;
  dueDate?: string;
  vendorSnapshot?: { name?: string; gstin?: string; stateCode?: string; registrationType?: string };
  items: InvoiceItem[];
  discountPercent?: number;
  placeOfSupply?: string;
  taxTreatment?: TaxTreatment;
  supplyType?: 'regular' | 'import-goods' | 'import-services' | 'sez' | 'deemed-export';
  reverseCharge?: boolean;
  totals: InvoiceTotals;
  itc: PurchaseItc;
  amountPaid?: number;
  balanceDue?: number;
  status: 'draft' | 'recorded' | 'partial' | 'paid' | 'cancelled';
  notes?: string;
  category?: string;
  deletedAt?: string | null;
}

export interface ItcRegister {
  period: { from: string; to: string };
  byCategory: Array<{
    category: ItcCategory; eligible: boolean; purchases: number;
    taxableValue: number; invoiceValue: number;
    cgst: number; sgst: number; igst: number; cess: number; total: number;
    /** Tax paid, whether or not it was claimable. */
    taxPaid: number;
  }>;
  claimable: { cgst: number; sgst: number; igst: number; cess: number; total: number };
  /** Tax paid that cannot be claimed — a real cost. */
  ineligible: number;
}

/** One rate-wise row inside a GSTR-1 document. Field names are the GSTN's. */
export interface Gstr1RateRow {
  rt: number; txval: number; iamt: number; camt: number; samt: number; csamt: number;
}

export interface Gstr1Report {
  period: { from: string; to: string; label: string; fp: string; granularity: string };
  supplier: { gstin: string; name: string; stateCode: string };
  summary: {
    invoiceCount: number; creditNoteCount: number;
    taxable: number; igst: number; cgst: number; sgst: number; cess: number; invoiceValue: number;
    creditNotes: { taxable: number; igst: number; cgst: number; sgst: number; cess: number; value: number };
    netTaxable: number; netIgst: number; netCgst: number; netSgst: number; netCess: number;
    b2clThreshold: number;
  };
  sections: {
    b2b: Array<{ ctin: string; cfs: string; inv: Array<{ inum: string; idt: string; val: number; pos: string; rchrg: string; inv_typ: string; irn?: string; itms: Gstr1RateRow[] }> }>;
    b2cl: Array<{ pos: string; inv: Array<{ inum: string; idt: string; val: number; itms: Gstr1RateRow[] }> }>;
    b2cs: Array<{ sply_ty: string; pos: string; typ: string } & Gstr1RateRow>;
    cdnr: Array<{ ctin: string; cfs: string; nt: Array<{ nt_num: string; nt_dt: string; inum: string; idt: string; val: number; pos: string; itms: Gstr1RateRow[] }> }>;
    cdnur: Array<{ typ: string; nt_num: string; nt_dt: string; inum: string; val: number; pos: string }>;
    exp: Array<{ exp_typ: string; inv: Array<{ inum: string; idt: string; val: number; sbnum: string; sbdt: string; sbpcode: string; itms: Gstr1RateRow[] }> }>;
    nil: { exempt: number; nilRated: number; nonGst: number; inter_reg: number; intr_reg: number; inter_unreg: number; intr_unreg: number };
    hsn: Array<{ hsn_sc: string; desc?: string; uqc: string; qty: number; txval: number; iamt: number; camt: number; samt: number; csamt: number; rt: number }>;
    docIssued: Array<{ prefix: string; from: string; to: string; totnum: number; cancel: number; net_issue: number }>;
  };
}

/** Tax amounts under one GSTR-3B line. */
export interface Gstr3bBlock { taxable: number; igst: number; cgst: number; sgst: number; cess: number }

export interface Gstr3bReport {
  period: { from: string; to: string; label: string; fp: string };
  supplier: { gstin: string; name: string; stateCode: string };
  outward: {
    taxable: Gstr3bBlock;
    zeroRated: Gstr3bBlock;
    nilExempt: Gstr3bBlock;
    reverseChargeSupplies: Gstr3bBlock;
    /** 3.1(d) — the liability an inward reverse-charge supply creates. */
    inwardReverseCharge: Gstr3bBlock;
    creditNotes: { taxable: number; igst: number; cgst: number; sgst: number; cess: number };
  };
  itc: {
    importGoods: Gstr3bBlock; importServices: Gstr3bBlock;
    /** 4(A)(3) — the credit for the same reverse-charge supply. Both lines are filed. */
    inwardReverseCharge: Gstr3bBlock;
    other: Gstr3bBlock;
    available: { igst: number; cgst: number; sgst: number; cess: number };
    ineligible: Gstr3bBlock;
  };
  inwardExemptNil: Gstr3bBlock;
  netPayable: {
    igst: Gstr3bHead; cgst: Gstr3bHead; sgst: Gstr3bHead; cess: Gstr3bHead;
    totalCash: number;
  };
  /** Stated in the payload, not just the UI: this is a preparation aid. */
  disclaimer: string;
}

/** Per-head, because credit under one head cannot be set off against another
 *  arbitrarily — a surplus is carry-forward, not a reduction elsewhere. */
export interface Gstr3bHead { liability: number; itc: number; payable: number; carryForward: number }

export interface EInvoiceCheck {
  invoiceNumber: string;
  eligibility: { required: boolean; reason: string };
  valid: boolean;
  problems: Array<{ field: string; message: string }>;
  providerConfigured: boolean;
  current: EInvoiceState | null;
  /** The validated NIC payload, so a tenant with no IRP integration can upload it by
   *  hand rather than retyping the invoice into a portal. */
  payload: Record<string, unknown> | null;
}

export interface EInvoiceWorklist {
  enabled: boolean;
  providerConfigured: boolean;
  outstanding: number;
  invoices: Array<Invoice & { eInvoice?: EInvoiceState }>;
}

export interface DataRightsStatus {
  organisation: string;
  isOwner: boolean;
  records: Record<string, number>;
  deletion: {
    requested: boolean;
    requestedAt?: string;
    requestedBy?: string;
    scheduledFor?: string;
    graceDays?: number;
  };
}

/** MFA enrolment material. A QR is rendered client-side from `uri` — every
 *  authenticator app accepts either the code or manual entry of `secret`. */
export interface MfaSetup {
  secret: string;
  uri: string;
  digits: number;
  period: number;
  message: string;
}

/** One row in the signed-in user's device/session list (#50, #51). */
export interface DeviceSession {
  id: string;
  userAgent: string | null;
  ip: string | null;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
}

/** One organisation the signed-in identity can act in (#53, #54) — the
 *  org-switcher's data, returned by `/auth/me`. */
export interface OrgMembership {
  orgId: string;
  orgName: string;
  role: 'admin' | 'accountant' | 'viewer';
}

// ── Pre-invoice sales documents (2.2 #11–#13) ──

export type SalesDocumentKind = 'quotation' | 'proforma' | 'delivery-challan';
export type SalesDocumentStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted';
export type ChallanPurpose =
  | 'job-work' | 'approval' | 'supply-on-approval'
  | 'liquid-gas' | 'semi-knocked-down' | 'exhibition' | 'other';

/**
 * A quotation, proforma invoice or delivery challan.
 *
 * **None of these is a tax invoice**, which is why none of them carries
 * `amountPaid`/`balanceDue` — they are offers and movements, not debts. The one
 * that matters commercially is `convertedToInvoiceNumber`: once set, the
 * document is locked and the invoice is the live document.
 */
export interface SalesDocument {
  _id: string;
  kind: SalesDocumentKind;
  /** For display — 'Quotation', 'Proforma Invoice', 'Delivery Challan'. */
  kindLabel: string;
  documentNumber: string;
  clientId?: string | Client | null;
  billTo?: {
    type?: 'b2b-unreg' | 'b2c';
    name?: string; phone?: string; email?: string;
    address?: string; stateCode?: string; gstin?: string;
  } | null;
  date: string;
  /** Quotation-only; null for the other kinds. */
  validUntil?: string | null;
  status: SalesDocumentStatus;
  /**
   * What to show the user. Differs from `status` for a lapsed quotation, whose
   * stored status only catches up when the hourly sweep runs — expiry is derived
   * server-side so the figure is right the instant it lapses.
   */
  effectiveStatus: SalesDocumentStatus;
  isExpired: boolean;
  isConverted: boolean;
  isEditable: boolean;
  items: InvoiceItem[];
  discountPercent?: number;
  placeOfSupply?: string;
  taxTreatment?: string;
  supplyType?: string;
  reverseCharge?: boolean;
  totals: Invoice['totals'];
  challanPurpose?: ChallanPurpose;
  transport?: {
    vehicleNumber?: string; transporterName?: string; transporterGstin?: string;
    lrNumber?: string; dispatchedFrom?: string; shipTo?: string; distanceKm?: number;
  } | null;
  convertedToInvoiceId?: string | null;
  convertedToInvoiceNumber?: string;
  convertedAt?: string;
  notes?: string;
  terms?: string;
  paymentTerms?: string;
  createdAt?: string;
}

// ── Payment links (2.3 #21) ──

export type PaymentLinkStatus = 'active' | 'paid' | 'expired' | 'cancelled';

/**
 * A shareable link that lets a customer pay one invoice online.
 *
 * The token is **never** in this object — it exists in the URL the create call
 * returns once, and nowhere else. A lost link means creating a new one, which is
 * correct: a link is a bearer credential.
 */
export interface PaymentLink {
  _id: string;
  invoiceId: string | Invoice;
  reference: string;
  amount: number;
  currency: string;
  status: PaymentLinkStatus;
  expiresAt: string;
  provider: string;
  providerPaymentId?: string;
  paidAt?: string;
  settledBy?: 'callback' | 'webhook' | 'manual';
  attempts: number;
  lastError?: string;
  isPayable: boolean;
  createdBy?: string;
  createdAt: string;
}

/** What the console may see about the tenant's gateway — which key is
 *  configured, never the secret. */
export interface GatewaySettings {
  provider: string;
  enabled: boolean;
  configured: boolean;
  keyId: string;
  hasWebhookSecret: boolean;
  linkValidityDays: number;
  connectedAt: string | null;
  connectedBy: string;
}

// ── Recurring invoices (2.2 #14) ──

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
export type RecurringStatus = 'active' | 'paused' | 'completed' | 'cancelled';

/**
 * A standing instruction to raise the same invoice on a schedule.
 *
 * A template plus a recurrence — **not** an invoice. It has no number, no
 * balance and never reaches a GST return; each run produces a real `Invoice`
 * that does all three.
 */
export interface RecurringInvoice {
  _id: string;
  title: string;
  clientId?: string | Client | null;
  billTo?: SalesDocument['billTo'];
  items: InvoiceItem[];
  discountPercent?: number;
  placeOfSupply?: string;
  taxTreatment?: string;
  supplyType?: string;
  reverseCharge?: boolean;
  notes?: string;
  paymentTerms?: string;
  dueInDays?: number;

  frequency: RecurrenceFrequency;
  interval: number;
  startDate: string;
  nextRunAt: string;
  endsOn?: string | null;
  endAfterCount?: number | null;
  status: RecurringStatus;
  autoSend: boolean;
  /** When true the generated invoice is a draft — it takes no invoice number and
   *  moves no stock, so it is the safe mode for a template not yet trusted. */
  generateAsDraft: boolean;

  occurrences: number;
  lastRunAt?: string;
  lastInvoiceId?: string;
  lastInvoiceNumber?: string;
  lastError?: string;
  consecutiveFailures?: number;

  // Derived server-side so the API, the list and the log all agree.
  scheduleLabel: string;
  nextRuns: string[];
  periodsBehind: number;
  isBehind: boolean;
  nextPeriodKey: string | null;
  createdAt?: string;
}

/** One attempted run — including the ones that produced nothing, because "why
 *  hasn't it invoiced since June" is only answerable if failures are visible. */
export interface RecurringInvoiceRun {
  _id: string;
  periodKey: string;
  scheduledFor: string;
  status: 'generated' | 'failed' | 'skipped';
  invoiceId?: string;
  invoiceNumber?: string;
  total?: number;
  emailed?: boolean;
  reason?: string;
  trigger: 'scheduled' | 'manual';
  createdAt: string;
}

/** Pipeline figures for one kind. Every rate is `null` rather than 0 when there
 *  is nothing to divide by — a 0% win rate reads as "we lose everything". */
export interface SalesDocumentSummary {
  kind: SalesDocumentKind;
  total: number;
  totalValue: number;
  byStatus: Partial<Record<SalesDocumentStatus, { count: number; value: number }>>;
  openCount: number;
  openValue: number;
  conversionRate: number | null;
  /** Challans only: goods that left and were never billed. */
  awaitingInvoice?: number;
}

// ── Receivables, stock and activity (2.4–2.6) ────

/**
 * AR ageing. The buckets are returned by the server rather than derived here, so the
 * boundaries are defined in exactly one place — a report whose buckets are computed
 * client-side eventually disagrees with the one that is exported.
 */
export interface ArAgeing {
  asOf: string;
  buckets: Array<{ key: string; label: string; amount: number }>;
  total: number;
  clients: Array<{
    clientId: string | null;
    name: string;
    email: string;
    phone: string;
    buckets: Record<string, number>;
    invoices: number;
    total: number;
    oldestDue: string | null;
    /** Worst days overdue across this customer's open invoices — the sort key, because
     *  the report is read to decide who to chase. */
    maxDaysPastDue: number;
  }>;
}

export interface CustomerStatement {
  client: { _id: string; name: string; email?: string; phone?: string; gstin?: string; address?: string };
  period: { from: string | null; to: string };
  /** Everything owed before the window. Omitting it is the classic statement bug:
   *  the closing balance is only right if the period starts at the beginning. */
  openingBalance: number;
  closingBalance: number;
  totals: { invoiced: number; credited: number; received: number };
  lines: Array<{
    date: string;
    type: 'invoice' | 'credit-note' | 'payment' | 'opening';
    reference: string;
    description: string;
    debit: number;
    credit: number;
    balance: number;
    status?: string;
    dueDate?: string;
  }>;
}

export interface CollectionMetrics {
  period: { days: number; from: string };
  invoiced: number;
  received: number;
  outstanding: number;
  /** Days sales outstanding. Null when nothing was invoiced — a DSO of 0 would read
   *  as "we collect instantly". */
  dso: number | null;
  collectionEfficiency: number | null;
  averageDaysToPay: number | null;
  settledInvoices: number;
  paymentMix: Array<{ method: string; amount: number; count: number; share: number }>;
}

export interface SalesBreakdown {
  period: { from: string | null; to: string };
  byItem: Array<{ description: string; hsn: string; quantity: number; value: number; invoices: number }>;
  byClient: Array<{ clientId: string | null; name: string; value: number; invoices: number }>;
}

/** One row of the stock ledger. Signed: negative reduces stock. */
export interface StockMovement {
  _id: string;
  itemId: string;
  itemName: string;
  reason: 'sale' | 'sale-reversed' | 'purchase' | 'purchase-reversed' | 'opening' | 'adjustment' | 'damage' | 'return';
  quantity: number;
  /** The balance after this movement, so a row reads without re-summing above it. */
  balanceAfter: number | null;
  documentType: 'invoice' | 'credit-note' | 'purchase' | 'manual';
  documentNumber?: string;
  note?: string;
  actorName?: string;
  /** On the way in, what the goods cost. On the way out, the weighted cost of
   *  the layers actually consumed — the cost of goods sold. */
  unitCost?: number | null;
  /** Signed like `quantity`, so total movement is a sum rather than a conditional. */
  value?: number | null;
  batchNumber?: string;
  expiryDate?: string | null;
  valuationMethod?: 'fifo' | 'weighted-average' | null;
  createdAt: string;
}

export interface StockValuationReport {
  method: 'fifo' | 'weighted-average';
  totals: {
    value: number;
    retailValue: number;
    quantity: number;
    /** The gap between the two — margin sitting on the shelf, not yet earned. */
    unrealisedMargin: number;
  };
  /** Items whose ledger balance and layered quantity disagree, i.e. something
   *  moved stock without moving its cost. Invisible in every other view. */
  unreconciled: number;
  items: Array<{
    itemId: string;
    name: string;
    itemCode: string;
    unit: string;
    category: string;
    quantity: number;
    layers: number;
    oldestReceipt: string;
    value: number;
    averageCost: number;
    retailValue: number;
    ledgerQuantity: number;
    reconciled: boolean;
  }>;
}

export interface ExpiringStockReport {
  days: number;
  count: number;
  batches: Array<{
    layerId: string;
    itemId: string;
    name: string;
    itemCode: string;
    unit: string;
    batchNumber: string;
    expiryDate: string;
    daysLeft: number;
    expired: boolean;
    quantity: number;
    value: number;
    sourceNumber: string;
  }>;
}

export interface Expense {
  _id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  paymentMethod?: string;
  reference?: string;
  paidTo?: string;
  notes?: string;
  createdAt?: string;
}

/** A master list entry: `value` is what validation checks, `label` is what a
 *  person reads. Rendering the value in a dropdown looks broken and lets two
 *  spellings of the same category into the accounts. */
export interface MasterOption {
  value: string;
  label: string;
  description?: string;
}

export interface ProfitLossReport {
  period: { from: string; to: string; label?: string };
  /** Revenue when invoiced and costs when incurred, regardless of what has been
   *  paid — what Indian businesses file on, and what makes periods comparable. */
  basis: 'accrual';
  revenue: {
    gross: number;
    creditNotes: number;
    net: number;
    invoices: number;
    /** Collected on the government's behalf. Shown so nobody mistakes the
     *  revenue line for the money that came in. */
    taxCollected: number;
    creditsByReason: Array<{ reason: string; amount: number; count: number }>;
  };
  costOfGoodsSold: { total: number; sold: number; returned: number };
  grossProfit: number;
  /** Null rather than zero when nothing was sold — a margin on no revenue is
   *  undefined, and 0% would read as "we sold things and made nothing". */
  grossMargin: number | null;
  expenses: Array<{ category: string; amount: number; count: number; source: string }>;
  totalExpenses: number;
  netProfit: number;
  netMargin: number | null;
  /** What was left out and why, on the report rather than in documentation — a
   *  figure nobody can reconcile to their own records is not trusted. */
  excluded: { inventoryPurchases: number; capitalGoods: number };
}

export interface StockLayerRow {
  _id: string;
  unitCost: number;
  quantity: number;
  remaining: number;
  value: number;
  sourceType: 'purchase' | 'opening' | 'adjustment' | 'return';
  sourceNumber?: string;
  receivedAt: string;
  batchNumber?: string;
  expiryDate?: string | null;
  closedAt?: string | null;
}

export interface LowStockReport {
  count: number;
  items: Array<{
    _id: string;
    name: string;
    itemCode?: string;
    unit: string;
    stockQty: number;
    reorderLevel: number;
    shortfall: number;
    category?: string;
  }>;
}

export interface TenantActivityEntry {
  _id: string;
  action: string;
  entity?: string;
  entityId?: string;
  actorName?: string;
  meta?: Record<string, unknown>;
  createdAt: string;
  /** Set when the action was taken by KloguBizz support inside this account — the
   *  visible half of the platform's data-access log. */
  bySupport: string | null;
}

export interface Payment {
  _id: string;
  invoiceId: Invoice | string;
  clientId: Client | string | null;
  amount: number;
  method: string;
  reference?: string;
  note?: string;
  /** 'void' is a reversal: kept for the audit trail, excluded from balances. */
  status: 'success' | 'failed' | 'pending' | 'void';
  voidedAt?: string;
  voidReason?: string;
  date: string;
}

export interface OrgUser {
  _id: string;
  name: string;
  email: string;
  role: 'superadmin' | 'admin' | 'accountant' | 'viewer';
  status: 'active' | 'invited' | 'disabled';
  lastLoginAt?: string;
  createdAt?: string;
}

export interface Plan {
  _id?: string;
  code: string;
  name: string;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  userLimit: number;
  invoiceLimit: number;
  features: string[];
  active?: boolean;
  sortOrder?: number;
  /**
   * The Razorpay plan each cycle maps to (3.3 #10).
   *
   * Provider-generated (`plan_NRxyz...`) and therefore not derivable from
   * `code`. Monthly and yearly are two separate plans at Razorpay, because a
   * plan there carries a fixed period and amount.
   */
  providerPlanIds?: { monthly?: string; yearly?: string };
  /** Computed by the console: whether a subscription can actually be opened on
   *  this cycle. A free cycle needs no provider plan. */
  sellable?: { monthly: boolean; yearly: boolean };
  /**
   * What the plan unlocks, as keys.
   *
   * `features` is the display copy; this is what a gate reads. Both are
   * generated from one catalogue on the server so a card cannot advertise
   * something the plan does not include.
   */
  capabilities?: string[];
}

/** A plan as it stood at a point in time. Immutable — a wrong version is
 *  corrected by publishing another one. */
export interface PlanVersion {
  planCode: string;
  version: number;
  name: string;
  monthlyPrice?: number;
  yearlyPrice?: number;
  userLimit?: number;
  invoiceLimit?: number;
  features: string[];
  effectiveFrom: string;
  changedBy?: string;
  changeNote?: string;
}

export interface Subscription {
  _id: string;
  /** The plan version this was sold on. Null for subscriptions created before
   *  versioning — those fall back to the published plan, which is the old
   *  behaviour exactly. */
  planVersion?: number | null;
  /** What this customer actually agreed to, copied at signup, so a later price
   *  change cannot rewrite the amount shown against charges already taken. */
  pricing?: { monthlyPrice?: number | null; yearlyPrice?: number | null };
  limits?: { userLimit?: number | null; invoiceLimit?: number | null };
  planCode: string;
  billingCycle: 'monthly' | 'yearly';
  status: 'trial' | 'active' | 'past_due' | 'cancelled';
  startDate?: string;
  endDate?: string;
  createdAt?: string;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  /** The coupon behind the price, snapshotted (3.3 #10). `pricing` already holds
   *  the discounted figure; this is what makes "was ₹999" sayable. */
  discount?: {
    couponCode?: string | null;
    discountType?: 'percent' | 'amount' | null;
    discountValue?: number | null;
    listPrice?: number | null;
    duration?: 'once' | 'cycles' | 'forever' | null;
    cyclesRemaining?: number | null;
  } | null;
  /** A downgrade already agreed, landing at the end of the paid-up period. */
  pendingChange?: {
    planCode?: string | null;
    billingCycle?: 'monthly' | 'yearly' | null;
    effectiveAt?: string | null;
  } | null;
}

/** Money owed back to the tenant — see the backend's `BillingCredit` model. */
export interface BillingCredit {
  _id: string;
  amount: number;
  reason: 'upgrade-proration' | 'manual';
  note?: string;
  status: 'owed' | 'settled' | 'void';
  createdAt?: string;
}

/** What a coupon would be worth, before committing to it. */
export interface CouponQuote {
  code: string;
  description?: string;
  duration?: 'once' | 'cycles' | 'forever';
  durationCycles?: number | null;
  listPrice: number;
  discountAmount: number;
  finalPrice: number;
}

/** A warehouse, with what it currently holds (2.5 #42). */
export interface StockLocation {
  _id: string;
  name: string;
  code?: string;
  address?: string;
  stateCode?: string;
  /** The one every movement that names no warehouse falls back to. */
  isDefault: boolean;
  status: 'active' | 'archived';
  note?: string;
  quantity: number;
  value: number;
  itemCount: number;
}

/** What one item holds, per warehouse. */
export interface StockLocationBalance {
  locationId: string;
  locationName: string;
  quantity: number;
  value: number;
}

/** A discount code as the console edits it. */
export interface AdminCoupon {
  _id?: string;
  code: string;
  description?: string;
  discountType: 'percent' | 'amount';
  discountValue: number;
  duration?: 'once' | 'cycles' | 'forever';
  durationCycles?: number | null;
  appliesToPlans?: string[];
  appliesToCycles?: string[];
  maxRedemptions?: number | null;
  redemptionCount?: number;
  oncePerOrg?: boolean;
  /** Without this the code cannot discount a card payment, so it is refused at
   *  checkout rather than applied — see the backend's `Coupon` model. */
  providerOfferId?: string | null;
  usableAtCheckout?: boolean;
  active?: boolean;
}

/** A credit as the console lists it, with the tenant's name resolved. */
export interface AdminCredit {
  _id: string;
  orgId: string;
  orgName: string;
  amount: number;
  reason: string;
  note?: string;
  status: 'owed' | 'settled' | 'void';
  createdAt?: string;
}

/** What a plan change would do, before it is done. */
export interface PlanChangePreview {
  direction: 'new' | 'none' | 'lateral' | 'upgrade' | 'downgrade';
  /** Whether it lands later rather than now. Reported by the server, never
   *  inferred from `direction`: a downgrade with no paid-up period to protect
   *  applies immediately, and a button reading "Schedule Change" over that is
   *  the page lying about what the click does. */
  scheduled?: boolean;
  listPrice?: number;
  effectiveAt?: string;
  credit?: { amount: number; daysUnused?: number; reason?: string };
  message: string;
}

export interface PlanUsage {
  /** Which version of the plan this tenant is held to, and whether that differs
   *  from the published one — the "why is my ceiling different" question, from
   *  the other direction to `limitOverrides`. */
  planVersion?: number | null;
  grandfathered?: boolean;
  plan: string;
  planName: string;
  users: number;
  /** The ceiling actually in force — a per-org override beats the plan's. */
  userLimit: number | null;
  invoicesThisMonth: number;
  invoiceLimit: number | null;
  /** Present when an operator has granted extra capacity, so the page can explain
   *  why the ceiling differs from the published plan instead of looking wrong. */
  limitOverrides?: { userLimit: number | null; invoiceLimit: number | null };
}

export interface Reminder {
  _id: string;
  name: string;
  daysOffset: number;
  enabled: boolean;
  subject?: string;
  template?: string;
}

export interface Master {
  _id?: string;
  type: 'gstRate' | 'hsn' | 'paymentMethod' | 'unit';
  code?: string;
  label?: string;
  description?: string;
  rate?: number;
  active: boolean;
  sortOrder?: number;
}

export interface MastersResponse {
  reminders: Reminder[];
  masters: { gstRate: Master[]; hsn: Master[]; paymentMethod: Master[]; unit: Master[] };
}

export interface AuditEntry {
  _id: string;
  action: string;
  entity?: string;
  entityId?: string;
  actorId?: string;
  actorName?: string;
  orgId?: string;
  /** The request that produced this entry, for correlating with the server log. */
  requestId?: string;
  meta?: Record<string, unknown>;
  createdAt: string;
}

/** Filters accepted by the super-admin audit console. */
export interface AuditFilters extends ListParams {
  orgId?: string;
  actorId?: string;
  /** Prefix match, so `invoice.` returns every invoice event. */
  action?: string;
  entity?: string;
  from?: string;
  to?: string;
}

export interface SuperOverview {
  organisations: number;
  users: number;
  invoices: number;
  payments: number;
  active: number;
  trial: number;
  suspended: number;
  cancelled?: number;
  /**
   * Everything tenants have collected *from their own customers* through the
   * platform. This was called `totalRevenue` and shown as "Platform Revenue",
   * which it never was — it is GMV, and on a healthy platform it dwarfs what we
   * earn. `mrr`/`arr` below are the platform's own revenue.
   */
  gmv?: number;
  /** @deprecated Same value as `gmv`, kept so an older client still renders. */
  totalRevenue: number;
  mrr?: number;
  arr?: number;
  payingOrgs?: number;
}

// ── Platform console (Phase 4) ───────────────────

/** What this operator's platform role lets them do. The console renders from it;
 *  the server enforces it. */
export interface PlatformMe {
  id: string;
  name: string;
  email: string;
  platformRole: 'owner' | 'billing' | 'support' | 'auditor';
  capabilities: string[];
  roles: string[];
}

export interface PlatformSummary {
  revenue: {
    /** Monthly recurring revenue — a rate, snapshotted. */
    mrr: number;
    arr: number;
    arpa: number | null;
    payingOrgs: number;
    /** Tenant collections flowing through the product. Not our revenue. */
    gmv: number;
    byPlan: Array<{ planCode: string; planName: string; orgs: number; mrr: number }>;
  };
  growth: {
    orgsTotal: number;
    usersTotal: number;
    signups: { last24h: number; last7d: number; last30d: number };
    activatedOrgs: number;
    /** Share of tenants that have raised at least one invoice. */
    activationRate: number;
    byStatus: { active: number; trial: number; suspended: number; cancelled: number };
    trials: { expiringIn7d: number; expired: number };
  };
  engagement: {
    dau: number; wau: number; mau: number;
    activeOrgs7d: number; activeOrgs30d: number;
    /** DAU÷MAU. */
    stickiness: number;
  };
  volume: {
    invoices30d: number;
    invoiceValue30d: number;
    invoicesTotal: number;
    paymentsTotal: number;
    creditNotesTotal: number;
  };
}

/**
 * One day of the rollup. The snapshot fields are `null` on a backfilled day —
 * nothing records when an organisation's status changed, so they can be observed
 * but never reconstructed. Charts must skip nulls rather than plotting them as 0.
 */
export interface MetricsDay {
  date: string;
  signups: number;
  orgsTotal: number;
  orgsActive: number | null;
  orgsTrial: number | null;
  orgsSuspended: number | null;
  orgsCancelled: number | null;
  activeOrgs: number;
  activeUsers: number;
  logins: number;
  invoicesCreated: number;
  invoiceValue: number;
  paymentsRecorded: number;
  paymentValue: number;
  creditNotesIssued: number;
  pdfRenders: number;
  exports: number;
  emailsSent: number;
  mrr: number | null;
  payingOrgs: number | null;
}

export interface MetricsSeries {
  days: number;
  series: MetricsDay[];
}

/** A tenant that is being billed and has gone quiet. */
export interface AtRiskTenant {
  _id: string;
  name: string;
  adminEmail: string;
  plan: string;
  status: string;
  lastActiveAt?: string;
  createdAt?: string;
  trialEndsAt?: string;
  /** Null when the tenant has never been seen at all. */
  inactiveDays: number | null;
  support?: OrgSupportContext;
}

export interface ExpiringTrial {
  _id: string;
  name: string;
  adminEmail: string;
  plan: string;
  trialEndsAt: string;
  createdAt?: string;
  lastActiveAt?: string;
}

export interface AttentionLists {
  atRisk: AtRiskTenant[];
  trialsExpiring: ExpiringTrial[];
}

export interface FeatureAdoption {
  days: number;
  orgsTotal: number;
  features: Array<{ key: string; label: string; orgs: number; rate: number }>;
}

/** One background job's health. `late` and `never` are the states this whole
 *  feature exists to make visible — a stopped timer looks like idleness. */
export interface JobHealth {
  name: string;
  label: string;
  intervalMs: number;
  state: 'healthy' | 'running' | 'failing' | 'late' | 'stuck' | 'never';
  lastRunAt: string | null;
  lastStatus: string | null;
  lastDurationMs: number | null;
  lastResult: Record<string, number | string | boolean> | null;
  lastError: string | null;
  lastSuccessAt: string | null;
  host: string | null;
}

export interface SystemHealth {
  jobs?: { jobs: JobHealth[]; unhealthy: number; checkedAt: string };
  database: {
    state: string;
    name?: string;
    collections?: number;
    objects?: number;
    dataSizeBytes?: number;
    storageSizeBytes?: number;
    indexSizeBytes?: number;
    replicaSet?: string | null;
    transactionsSupported?: boolean;
    statsError?: string;
  };
  collectionCounts: Record<string, number>;
  requests: {
    /** Stated by the API: these figures describe one instance since boot. */
    scope: string;
    uptimeSeconds: number;
    requestsPerMinute: number;
    errorRate: number;
    latency: { p50: number; p95: number; p99: number };
    slowestRoutes: Array<{ route: string; count: number; errors: number; p50: number; p95: number; p99: number }>;
    busiestRoutes: Array<{ route: string; count: number; errors: number; p50: number; p95: number; p99: number }>;
  };
  process: {
    nodeVersion: string;
    environment: string;
    uptimeSeconds: number;
    memory: number;
    emailConfigured: boolean;
    billingConfigured: boolean;
  };
}

/** A flag as the console renders it. `available: false` means the capability it
 *  would gate does not exist yet, so it is shown as reserved, not as a switch. */
export interface FeatureFlagDefinition {
  key: string;
  label: string;
  description: string;
  default: boolean;
  available: boolean;
  enforcedBy: string | null;
}

/** Everything about one tenant, for the drill-down. */
export interface TenantDetail {
  organisation: Organisation;
  owner: OrgUser | null;
  users: OrgUser[];
  subscription: Subscription | null;
  subscriptionHistory: Subscription[];
  usage: PlanUsage | null;
  flags: FeatureFlags;
  flagCatalogue: FeatureFlagDefinition[];
  documents: { invoices: number; clients: number; items: number; payments: number; creditNotes: number };
  money: { invoiced: number; collected: number; outstanding: number };
  activity: {
    lastActiveAt: string | null;
    firstInvoiceAt: string | null;
    daysToFirstInvoice: number | null;
    /** 0–100, from usage recency + payment standing + volume. Deliberately a
     *  transparent weighted sum — see metricsService.healthScore. */
    healthScore: number;
  };
  timeline: AuditEntry[];
  recentEvents: Array<{ _id: string; type: string; meta?: Record<string, unknown>; value?: number; createdAt: string; userId?: string }>;
}

export interface PlatformUser {
  _id: string;
  name: string;
  email: string;
  platformRole: 'owner' | 'billing' | 'support' | 'auditor';
  status?: string;
  lastLoginAt?: string;
  createdAt?: string;
}

export interface SecurityAlerts {
  windowHours: number;
  /** The rules, returned alongside the findings — an alert whose threshold the
   *  operator cannot see is one they learn to ignore. */
  thresholds: { failedLoginsPerIp: number; deletesPerActor: number; exportsPerOrg: number };
  bruteForce: Array<{ ip: string; attempts: number; accountCount: number; last: string }>;
  massDeletes: Array<{ actorId?: string; actorName?: string; count: number; last: string }>;
  massExports: Array<{ orgId: string; orgName?: string; count: number; last: string }>;
  offHoursPlatformActions: Array<{ _id: string; action: string; actorName?: string; orgId?: string; createdAt: string; hour: number; ip?: string }>;
  impersonations: AuditEntry[];
}

/** Result of starting an impersonation session. */
export interface ImpersonationSession {
  token: string;
  expiresAt: string;
  readOnly: boolean;
  user: AuthUser;
  organisation: Organisation;
  impersonation: ImpersonationContext;
}
