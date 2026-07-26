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
    logoUrl?: string;
    headerImageUrl?: string;
    primaryColor?: string;
    invoicePrefix?: string;
    invoiceTitleLabel?: string;
    /** Round the payable total to a whole rupee (the Indian billing
     *  convention). Defaults to true when unset. */
    roundOffTotal?: boolean;
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
}

export interface PublicBranding {
  appName: string;
  tagline: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
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

export interface Invoice {
  _id: string;
  invoiceNumber: string;
  /** Exactly one of `clientId`/`billTo` is set — a registered client for formal invoices, or embedded walk-in details for a quick bill. */
  clientId: Client | string | null;
  billTo?: BillTo | null;
  date: string;
  dueDate: string;
  paidDate?: string | null;
  status: 'draft' | 'pending' | 'partial' | 'paid' | 'overdue';
  items: InvoiceItem[];
  /** Invoice-level discount, on top of any per-line discounts. */
  discountPercent?: number;
  totals: InvoiceTotals;
  /** Settlement state, persisted by the backend from successful payments. */
  amountPaid?: number;
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
  counts: { total: number; paid: number; pending: number; overdue: number; draft: number };
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
  userLimit: number | null;
  invoicesThisMonth: number;
  invoiceLimit: number | null;
}

export interface Reminder {
  _id: string;
  name: string;
  daysOffset: number;
  enabled: boolean;
  subject?: string;
  template?: string;
}

export interface InvoiceTemplate {
  _id: string;
  name: string;
  layout: string;
  accentColor: string;
  enabled: boolean;
  isDefault?: boolean;
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
  templates: InvoiceTemplate[];
  masters: { gstRate: Master[]; hsn: Master[]; paymentMethod: Master[]; unit: Master[] };
}

export interface AuditEntry {
  _id: string;
  action: string;
  entity?: string;
  entityId?: string;
  actorName?: string;
  meta?: Record<string, unknown>;
  createdAt: string;
}

export interface SuperOverview {
  organisations: number;
  users: number;
  invoices: number;
  payments: number;
  active: number;
  trial: number;
  suspended: number;
  totalRevenue: number;
}
