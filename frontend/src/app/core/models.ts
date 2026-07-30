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
     * Always empty in an API response. The images are base64 data URIs of up to
     * 500KB/700KB and used to be inlined in every `/auth/me` and
     * `/organisations/current` payload; they are now served from the cacheable
     * asset URLs below. Still the field to *write* when uploading or removing an
     * image — send a data URI to set one, an empty string to clear it, and omit
     * the key entirely to leave it untouched.
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
  reorderLevel?: number;
  barcode?: string;
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
}

export interface Subscription {
  _id: string;
  planCode: string;
  billingCycle: 'monthly' | 'yearly';
  status: 'trial' | 'active' | 'past_due' | 'cancelled';
  startDate?: string;
  endDate?: string;
  createdAt?: string;
}

export interface PlanUsage {
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

export interface SystemHealth {
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
