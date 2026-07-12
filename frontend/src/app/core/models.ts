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
    primaryColor?: string;
    invoicePrefix?: string;
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

export interface InvoiceTotals {
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  isIGST: boolean;
}

export interface InvoiceItem {
  desc: string;
  hsn: string;
  qty: number;
  rate: number;
  gstRate: number;
}

export interface BankDetails {
  bank?: string;
  account?: string;
  ifsc?: string;
}

export interface Invoice {
  _id: string;
  invoiceNumber: string;
  clientId: Client | string;
  date: string;
  dueDate: string;
  paidDate?: string | null;
  status: 'draft' | 'pending' | 'partial' | 'paid' | 'overdue';
  items: InvoiceItem[];
  totals: InvoiceTotals;
  notes?: string;
  paymentTerms?: string;
  bankDetails?: BankDetails;
}

export interface InvoiceStats {
  totalRevenue: number;
  pendingAmount: number;
  overdueAmount: number;
  counts: { total: number; paid: number; pending: number; overdue: number; draft: number };
  monthlyRevenue: Array<{ month: string; revenue: number }>;
  topClients: Array<{ name: string; revenue: number }>;
}

export interface GstSummary {
  byMonth: Array<{ month: string; taxable: number; cgst: number; sgst: number; igst: number; total: number; invoiceCount: number }>;
  byRate: Array<{ rate: number; taxable: number; tax: number }>;
  totals: { taxable: number; tax: number; invoiceCount: number };
}

export interface Payment {
  _id: string;
  invoiceId: Invoice | string;
  clientId: Client | string;
  amount: number;
  method: string;
  reference?: string;
  note?: string;
  status: 'success' | 'failed' | 'pending';
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
