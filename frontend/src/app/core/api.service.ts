import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { CacheService } from './cache.service';
import {
  AttentionLists, AuditEntry, AuditFilters, Client, CreditNote, CreditNoteReason, CreditSummary,
  DataRightsStatus, DeviceSession, EInvoiceCheck, EInvoiceState, EInvoiceWorklist,
  FeatureAdoption, FeatureFlags, Gstr1Report, Gstr3bReport, GstSummary, ImpersonationSession,
  Invoice, InvoiceItem, InvoiceStats, ItcRegister, Item, ItemBulkUploadResult, ListParams,
  LoginHistoryFilters, Master, MastersResponse, MetricsSeries, MfaSetup,
  Organisation, OrgSummary, OrgSupportContext, OrgUser, Page, Payment, Plan, PlanUsage,
  PlatformMe, PlatformSummary, PlatformUser, PublicBranding, Purchase, Reminder,
  GatewaySettings, PaymentLink,
  RecurrenceFrequency, RecurringInvoice, RecurringInvoiceRun,
  SalesDocument, SalesDocumentKind, SalesDocumentStatus, SalesDocumentSummary, SecurityAlerts,
  Subscription, SuperOverview, SystemHealth, TenantDetail, TenantNotice, Vendor,
  ArAgeing, CollectionMetrics, CustomerStatement, LowStockReport, SalesBreakdown,
  StockValuationReport, ExpiringStockReport, StockLayerRow,
  Expense, ProfitLossReport, MasterOption, PlanVersion,
  StockMovement, TenantActivityEntry,
  BillingCredit, CouponQuote, PlanChangePreview, AdminCoupon, AdminCredit
} from './models';

/**
 * Cache namespaces. A mutation invalidates the namespaces it can affect, and the
 * next read refetches. Grouped as constants so an invalidation can never miss a
 * namespace because of a typo'd string literal.
 */
const NS = {
  clients: 'clients',
  items: 'items',
  invoices: 'invoices',
  payments: 'payments',
  creditNotes: 'credit-notes',
  salesDocuments: 'sales-documents',
  recurring: 'recurring-invoices',
  paymentLinks: 'payment-links',
  users: 'users',
  organisation: 'organisation',
  subscription: 'subscription',
  reports: 'reports',
  vendors: 'vendors',
  purchases: 'purchases',
  expenses: 'expenses',
  superadmin: 'superadmin'
} as const;

@Injectable({ providedIn: 'root' })
export class ApiService {
  private api = environment.apiUrl;
  private cache = inject(CacheService);

  constructor(private http: HttpClient) {}

  // ── helpers ──────────────────────────────────

  /**
   * Turns a params object into an `HttpParams`, dropping empty values so the
   * cache key for "no filters" is stable rather than depending on which optional
   * fields happened to be `undefined` versus `''`.
   */
  private params(params: ListParams = {}): HttpParams {
    let httpParams = new HttpParams();
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === '') continue;
      httpParams = httpParams.set(key, String(value));
    }
    return httpParams;
  }

  /** Namespace + query string: distinct filters are distinct cache entries. */
  private key(namespace: string, params: ListParams = {}): string {
    const query = this.params(params).toString();
    return query ? `${namespace}?${query}` : namespace;
  }

  private list<T>(namespace: string, path: string, params: ListParams = {}): Observable<Page<T>> {
    return this.cache.through(
      this.key(namespace, params),
      () => this.http.get<Page<T>>(`${this.api}${path}`, { params: this.params(params) })
    );
  }

  /** Invalidates the given namespaces after a successful mutation. */
  private afterWrite<T>(source: Observable<T>, ...namespaces: string[]): Observable<T> {
    return source.pipe(tap(() => this.cache.invalidate(...namespaces)));
  }

  /**
   * Resolves a branding asset path returned by the API into a URL an `<img src>`
   * can use.
   *
   * The API returns these relative (`/assets/org/<id>/logo?v=<hash>`) rather than
   * absolute, because the correct public hostname differs between the apex
   * domain, the www variant, a custom domain and a local dev server — the same
   * assumption that made single-origin CORS a problem. Resolving against the
   * configured API root is the one place that knows the answer.
   */
  assetUrl(path?: string | null): string {
    if (!path) return '';
    // A data URI (a pending upload not yet saved) or an absolute URL is already
    // usable as-is.
    if (/^(data:|https?:\/\/)/i.test(path)) return path;
    return `${this.api}${path.startsWith('/') ? path : `/${path}`}`;
  }

  /** Called on logout — the next user must not see the previous one's data. */
  clearCache() {
    this.cache.clear();
  }

  // ── Clients ──────────────────────────────────
  clients(params: ListParams = {}) { return this.list<Client>(NS.clients, '/clients', params); }
  createClient(payload: Partial<Client>) {
    return this.afterWrite(this.http.post<Client>(`${this.api}/clients`, payload), NS.clients);
  }
  updateClient(id: string, payload: Partial<Client>) {
    return this.afterWrite(this.http.put<Client>(`${this.api}/clients/${id}`, payload), NS.clients, NS.invoices);
  }
  deleteClient(id: string) {
    return this.afterWrite(this.http.delete(`${this.api}/clients/${id}`), NS.clients);
  }

  // ── Items ────────────────────────────────────
  items(params: ListParams = {}) { return this.list<Item>(NS.items, '/items', params); }
  createItem(payload: Partial<Item>) {
    return this.afterWrite(this.http.post<Item>(`${this.api}/items`, payload), NS.items);
  }
  updateItem(id: string, payload: Partial<Item>) {
    return this.afterWrite(this.http.put<Item>(`${this.api}/items/${id}`, payload), NS.items);
  }
  deleteItem(id: string) {
    return this.afterWrite(this.http.delete(`${this.api}/items/${id}`), NS.items);
  }
  downloadItemsTemplate() { return this.http.get(`${this.api}/items/bulk-upload/template`, { responseType: 'blob' }); }
  bulkUploadItems(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.afterWrite(
      this.http.post<ItemBulkUploadResult>(`${this.api}/items/bulk-upload`, formData),
      NS.items
    );
  }

  // ── Invoices ─────────────────────────────────
  /**
   * One page of invoices. `status` is matched against the due date server-side,
   * so 'overdue' is correct the moment an invoice falls due rather than waiting
   * for a background sweep to relabel it.
   */
  invoices(params: ListParams = {}) { return this.list<Invoice>(NS.invoices, '/invoices', params); }
  invoice(id: string) { return this.http.get<Invoice>(`${this.api}/invoices/${id}`); }
  invoiceStats() {
    return this.cache.through(`${NS.invoices}:stats`, () => this.http.get<InvoiceStats>(`${this.api}/invoices/stats`));
  }
  createInvoice(payload: Partial<Invoice>) {
    return this.afterWrite(this.http.post<Invoice>(`${this.api}/invoices`, payload), NS.invoices, NS.reports, NS.subscription);
  }
  updateInvoice(id: string, payload: Partial<Invoice>) {
    return this.afterWrite(this.http.put<Invoice>(`${this.api}/invoices/${id}`, payload), NS.invoices, NS.reports);
  }
  duplicateInvoice(id: string) {
    return this.afterWrite(this.http.post<Invoice>(`${this.api}/invoices/${id}/duplicate`, {}), NS.invoices, NS.subscription);
  }
  markPaid(id: string) {
    return this.afterWrite(this.http.post<Invoice>(`${this.api}/invoices/${id}/mark-paid`, {}), NS.invoices, NS.payments, NS.reports);
  }
  sendReminder(id: string) { return this.http.post<{ ok: boolean }>(`${this.api}/invoices/${id}/remind`, {}); }
  /** Queues a background sweep and returns immediately (202). It used to send
   *  serially inside the request, which timed out on any real overdue book. */
  remindAll() {
    return this.http.post<{
      queued: boolean; eligible: number; withoutEmail: number; total: number; message: string;
    }>(`${this.api}/invoices/remind-all`, {});
  }
  deleteInvoice(id: string) {
    return this.afterWrite(this.http.delete(`${this.api}/invoices/${id}`), NS.invoices, NS.reports);
  }
  downloadInvoicePdf(id: string) { return this.http.get(`${this.api}/invoices/${id}/pdf`, { responseType: 'blob' }); }
  /** Voids an issued invoice that was raised in error and never paid. The
   *  document is retained — its number stays in the series, as GST requires. */
  cancelInvoice(id: string, reason?: string) {
    return this.afterWrite(
      this.http.post<Invoice>(`${this.api}/invoices/${id}/cancel`, { reason }),
      NS.invoices, NS.reports
    );
  }
  /** The full filtered set, streamed server-side — not just the current page. */
  exportInvoicesCsv(params: ListParams = {}) {
    return this.http.get(`${this.api}/invoices/export.csv`, { params: this.params(params), responseType: 'blob' });
  }

  // ── Credit notes ─────────────────────────────
  creditNotes(params: ListParams = {}) { return this.list<CreditNote>(NS.creditNotes, '/credit-notes', params); }
  creditNote(id: string) { return this.http.get<CreditNote>(`${this.api}/credit-notes/${id}`); }
  /** The ceiling and history for one invoice, so the form can show it up front. */
  creditSummary(invoiceId: string) {
    return this.http.get<CreditSummary>(`${this.api}/credit-notes/for-invoice/${invoiceId}`);
  }
  createCreditNote(payload: {
    invoiceId: string;
    reason?: CreditNoteReason;
    reasonNote?: string;
    items?: Partial<InvoiceItem>[];
    notes?: string;
  }) {
    return this.afterWrite(
      this.http.post<{ creditNote: CreditNote; invoice: Invoice }>(`${this.api}/credit-notes`, payload),
      NS.creditNotes, NS.invoices, NS.reports
    );
  }
  exportCreditNotesCsv(params: ListParams = {}) {
    return this.http.get(`${this.api}/credit-notes/export.csv`, { params: this.params(params), responseType: 'blob' });
  }

  // ── Quotations, proforma, delivery challans (2.2 #11–#13) ──
  salesDocuments(params: ListParams = {}) {
    return this.list<SalesDocument>(NS.salesDocuments, '/sales-documents', params);
  }
  salesDocument(id: string) { return this.http.get<SalesDocument>(`${this.api}/sales-documents/${id}`); }
  salesDocumentSummary(kind: SalesDocumentKind) {
    return this.cache.through(
      `${NS.salesDocuments}:summary:${kind}`,
      () => this.http.get<SalesDocumentSummary>(`${this.api}/sales-documents/summary`, { params: { kind } })
    );
  }
  createSalesDocument(payload: Partial<SalesDocument> & { kind: SalesDocumentKind }) {
    return this.afterWrite(
      this.http.post<SalesDocument>(`${this.api}/sales-documents`, payload),
      NS.salesDocuments
    );
  }
  updateSalesDocument(id: string, payload: Partial<SalesDocument>) {
    return this.afterWrite(
      this.http.put<SalesDocument>(`${this.api}/sales-documents/${id}`, payload),
      NS.salesDocuments
    );
  }
  setSalesDocumentStatus(id: string, status: SalesDocumentStatus) {
    return this.afterWrite(
      this.http.put<SalesDocument>(`${this.api}/sales-documents/${id}/status`, { status }),
      NS.salesDocuments
    );
  }
  /** Raises a real tax invoice. Invalidates invoices and reports too, because it
   *  genuinely created one — and the invoice quota has now been consumed. */
  convertSalesDocument(id: string, payload: { date?: string; dueDate?: string } = {}) {
    return this.afterWrite(
      this.http.post<{ document: SalesDocument; invoice: Invoice }>(`${this.api}/sales-documents/${id}/convert`, payload),
      NS.salesDocuments, NS.invoices, NS.reports, NS.items
    );
  }
  deleteSalesDocument(id: string) {
    return this.afterWrite(this.http.delete<SalesDocument>(`${this.api}/sales-documents/${id}`), NS.salesDocuments);
  }
  restoreSalesDocument(id: string) {
    return this.afterWrite(this.http.post<SalesDocument>(`${this.api}/sales-documents/${id}/restore`, {}), NS.salesDocuments);
  }
  downloadSalesDocumentPdf(id: string) {
    return this.http.get(`${this.api}/sales-documents/${id}/pdf`, { responseType: 'blob' });
  }
  exportSalesDocumentsCsv(params: ListParams = {}) {
    return this.http.get(`${this.api}/sales-documents/export.csv`, { params: this.params(params), responseType: 'blob' });
  }

  // ── Recurring invoices (2.2 #14) ──
  recurringInvoices(params: ListParams = {}) {
    return this.list<RecurringInvoice>(NS.recurring, '/recurring-invoices', params);
  }
  recurringInvoice(id: string) { return this.http.get<RecurringInvoice>(`${this.api}/recurring-invoices/${id}`); }
  /** Includes failures and skips, not only successes. */
  recurringRuns(id: string, params: ListParams = {}) {
    return this.http.get<Page<RecurringInvoiceRun>>(`${this.api}/recurring-invoices/${id}/runs`, { params: this.params(params) });
  }
  /** What the next sweep would do, creating nothing — the only safe way to
   *  inspect a schedule that is behind. */
  recurringPreview() {
    return this.http.get<{ dryRun: boolean; generated: number; invoices: Array<{ title: string; scheduledFor: string; periodsBehind: number }> }>(
      `${this.api}/recurring-invoices/preview`
    );
  }
  createRecurringInvoice(payload: Partial<RecurringInvoice> & { title: string; frequency: RecurrenceFrequency }) {
    return this.afterWrite(this.http.post<RecurringInvoice>(`${this.api}/recurring-invoices`, payload), NS.recurring);
  }
  updateRecurringInvoice(id: string, payload: Partial<RecurringInvoice>) {
    return this.afterWrite(this.http.put<RecurringInvoice>(`${this.api}/recurring-invoices/${id}`, payload), NS.recurring);
  }
  setRecurringStatus(id: string, status: 'active' | 'paused' | 'cancelled') {
    return this.afterWrite(this.http.put<RecurringInvoice>(`${this.api}/recurring-invoices/${id}/status`, { status }), NS.recurring);
  }
  /** Raises this period's invoice now. Shares the sweep's idempotency claim, so
   *  clicking it and then waiting for the hourly job yields one invoice. */
  runRecurringNow(id: string) {
    return this.afterWrite(
      this.http.post<{ schedule: RecurringInvoice; invoice: Invoice }>(`${this.api}/recurring-invoices/${id}/run-now`, {}),
      NS.recurring, NS.invoices, NS.reports, NS.items
    );
  }
  deleteRecurringInvoice(id: string) {
    return this.afterWrite(this.http.delete<RecurringInvoice>(`${this.api}/recurring-invoices/${id}`), NS.recurring);
  }
  restoreRecurringInvoice(id: string) {
    return this.afterWrite(this.http.post<RecurringInvoice>(`${this.api}/recurring-invoices/${id}/restore`, {}), NS.recurring);
  }

  // ── Payment links (2.3 #21) ──
  paymentLinks(params: ListParams = {}) {
    return this.list<PaymentLink>(NS.paymentLinks, '/payment-links', params);
  }
  /**
   * Creates a link. **The URL is returned once and never again** — the token is
   * stored only as a hash, so a lost link means creating a new one. Capture it
   * from this response or it is gone.
   */
  createPaymentLink(invoiceId: string) {
    return this.afterWrite(
      this.http.post<{ link: PaymentLink; url: string }>(`${this.api}/payment-links`, { invoiceId }),
      NS.paymentLinks
    );
  }
  /** Creates a link and emails it in one step — the common case. */
  sendPaymentLink(invoiceId: string, to?: string) {
    return this.afterWrite(
      this.http.post<{ link: PaymentLink; url?: string; delivered: boolean; to: string; message: string }>(
        `${this.api}/payment-links/send/${invoiceId}`, to ? { to } : {}
      ),
      NS.paymentLinks
    );
  }
  cancelPaymentLink(id: string) {
    return this.afterWrite(this.http.post<PaymentLink>(`${this.api}/payment-links/${id}/cancel`, {}), NS.paymentLinks);
  }
  gatewaySettings() {
    return this.http.get<GatewaySettings>(`${this.api}/payment-links/gateway`);
  }
  /** An omitted secret means "leave the stored one alone" — the console never
   *  receives it, so sending an empty string would wipe it. */
  saveGatewaySettings(payload: {
    keyId?: string; keySecret?: string; webhookSecret?: string;
    enabled?: boolean; linkValidityDays?: number;
  }) {
    return this.http.put<GatewaySettings>(`${this.api}/payment-links/gateway`, payload);
  }

  // ── Payments ─────────────────────────────────
  payments(params: ListParams = {}) { return this.list<Payment>(NS.payments, '/payments', params); }
  createPayment(payload: Partial<Payment> & { invoiceId: string }) {
    return this.afterWrite(
      this.http.post<Payment>(`${this.api}/payments`, payload),
      NS.payments, NS.invoices, NS.reports
    );
  }
  /** Reverses a recorded payment. Voids rather than deletes, so the original
   *  stays in the audit trail while the invoice balance reopens. */
  voidPayment(id: string, reason?: string) {
    return this.afterWrite(
      this.http.post<{ payment: Payment; invoice: Invoice | null }>(`${this.api}/payments/${id}/void`, { reason }),
      NS.payments, NS.invoices, NS.reports
    );
  }
  exportPaymentsCsv(params: ListParams = {}) {
    return this.http.get(`${this.api}/payments/export.csv`, { params: this.params(params), responseType: 'blob' });
  }

  // ── Vendors & purchases (Phase 5) ────────────
  //
  // The inward side of the ledger. Without it there is no input tax credit, and without
  // ITC there is no net GST liability — only output tax, which is one side of one.

  vendors(params: ListParams = {}) { return this.list<Vendor>(NS.vendors, '/purchases/vendors', params); }
  createVendor(payload: Partial<Vendor>) {
    return this.afterWrite(this.http.post<Vendor>(`${this.api}/purchases/vendors`, payload), NS.vendors);
  }
  updateVendor(id: string, payload: Partial<Vendor>) {
    return this.afterWrite(this.http.put<Vendor>(`${this.api}/purchases/vendors/${id}`, payload), NS.vendors, NS.purchases);
  }
  /** Archives rather than deletes — a vendor named on a purchase is referenced by every
   *  ITC figure that purchase contributed to. */
  deleteVendor(id: string) {
    return this.afterWrite(
      this.http.delete<{ ok: boolean; purchases: number; message: string }>(`${this.api}/purchases/vendors/${id}`),
      NS.vendors
    );
  }
  restoreVendor(id: string) {
    return this.afterWrite(this.http.post<Vendor>(`${this.api}/purchases/vendors/${id}/restore`, {}), NS.vendors);
  }

  purchases(params: ListParams = {}) { return this.list<Purchase>(NS.purchases, '/purchases', params); }
  purchase(id: string) { return this.http.get<Purchase>(`${this.api}/purchases/${id}`); }
  createPurchase(payload: Record<string, unknown>) {
    return this.afterWrite(this.http.post<Purchase>(`${this.api}/purchases`, payload), NS.purchases, NS.reports);
  }
  updatePurchase(id: string, payload: Record<string, unknown>) {
    return this.afterWrite(this.http.put<Purchase>(`${this.api}/purchases/${id}`, payload), NS.purchases, NS.reports);
  }
  payPurchase(id: string, amount: number) {
    return this.afterWrite(this.http.post<Purchase>(`${this.api}/purchases/${id}/pay`, { amount }), NS.purchases);
  }
  deletePurchase(id: string) {
    return this.afterWrite(
      this.http.delete<{ ok: boolean; message: string }>(`${this.api}/purchases/${id}`),
      NS.purchases, NS.reports
    );
  }
  restorePurchase(id: string) {
    return this.afterWrite(this.http.post<Purchase>(`${this.api}/purchases/${id}/restore`, {}), NS.purchases, NS.reports);
  }
  /** The document behind GSTR-3B table 4, and the first thing a CA asks for. */
  itcRegister(params: ListParams = {}) {
    return this.cache.through(
      this.key(`${NS.reports}:itc`, params),
      () => this.http.get<ItcRegister>(`${this.api}/purchases/itc-register`, { params: this.params(params) })
    );
  }
  exportPurchasesCsv(params: ListParams = {}) {
    return this.http.get(`${this.api}/purchases/export.csv`, { params: this.params(params), responseType: 'blob' });
  }

  // ── GST returns (Phase 5) ────────────────────
  //
  // The existing gstSummary is a month × rate glance and cannot be filed. These are the
  // actual section-wise return.

  /** `params` takes `month=YYYY-MM`, or `from`/`to`. Defaults to the last complete
   *  month — the one someone sitting down to file is filing. */
  gstr1(params: ListParams = {}) {
    return this.cache.through(
      this.key(`${NS.reports}:gstr1`, params),
      () => this.http.get<Gstr1Report>(`${this.api}/reports/gstr1`, { params: this.params(params) })
    );
  }
  /** The GSTN offline-utility file, for upload rather than retyping. */
  downloadGstr1Json(params: ListParams = {}) {
    return this.http.get(`${this.api}/reports/gstr1/export.json`, { params: this.params(params), responseType: 'blob' });
  }
  downloadGstr1Csv(params: ListParams = {}) {
    return this.http.get(`${this.api}/reports/gstr1/export.csv`, { params: this.params(params), responseType: 'blob' });
  }
  gstr3b(params: ListParams = {}) {
    return this.cache.through(
      this.key(`${NS.reports}:gstr3b`, params),
      () => this.http.get<Gstr3bReport>(`${this.api}/reports/gstr3b`, { params: this.params(params) })
    );
  }

  // ── E-invoicing (Phase 5) ────────────────────

  /** Pre-flight: what the IRP would reject, and why, before any network call. */
  checkEInvoice(invoiceId: string) {
    return this.http.get<EInvoiceCheck>(`${this.api}/reports/e-invoice/${invoiceId}/check`);
  }
  generateEInvoice(invoiceId: string) {
    return this.afterWrite(
      this.http.post<{ ok: boolean; eInvoice: EInvoiceState }>(`${this.api}/reports/e-invoice/${invoiceId}/generate`, {}),
      NS.invoices
    );
  }
  eInvoiceWorklist(params: ListParams = {}) {
    return this.http.get<EInvoiceWorklist>(`${this.api}/reports/e-invoice/worklist`, { params: this.params(params) });
  }

  // ── Recycle bin (#37) ────────────────────────

  restoreClient(id: string) {
    return this.afterWrite(this.http.post<Client>(`${this.api}/clients/${id}/restore`, {}), NS.clients);
  }
  restoreItem(id: string) {
    return this.afterWrite(this.http.post<Item>(`${this.api}/items/${id}/restore`, {}), NS.items);
  }
  restoreInvoice(id: string) {
    return this.afterWrite(this.http.post<Invoice>(`${this.api}/invoices/${id}/restore`, {}), NS.invoices, NS.reports);
  }

  // ── Data rights (#62) ────────────────────────

  dataRights() { return this.http.get<DataRightsStatus>(`${this.api}/organisations/current/data-rights`); }
  /** A complete, machine-readable export — streamed server-side. */
  exportTenantData() {
    return this.http.get(`${this.api}/organisations/current/export`, { responseType: 'blob' });
  }
  requestAccountDeletion(payload: { confirmName: string; password: string; reason?: string }) {
    return this.http.post<{ ok: boolean; scheduledFor: string; graceDays: number; message: string }>(
      `${this.api}/organisations/current/delete-account`, payload
    );
  }
  cancelAccountDeletion() {
    return this.http.post<{ ok: boolean; message: string }>(`${this.api}/organisations/current/cancel-deletion`, {});
  }

  // ── MFA (#7) ─────────────────────────────────

  /** Stages a secret. Nothing about sign-in changes until `enableMfa` proves the
   *  authenticator app can actually produce a code. */
  mfaSetup() { return this.http.post<MfaSetup>(`${this.api}/auth/mfa/setup`, {}); }
  mfaEnable(code: string) {
    return this.http.post<{ ok: boolean; backupCodes: string[]; message: string }>(`${this.api}/auth/mfa/enable`, { code });
  }
  mfaDisable(payload: { password: string; code: string }) {
    return this.http.post<{ ok: boolean; message: string }>(`${this.api}/auth/mfa/disable`, payload);
  }

  // ── Device sessions (#50, #51) ──────────────────
  listSessions() { return this.http.get<DeviceSession[]>(`${this.api}/auth/sessions`); }
  revokeSession(id: string) {
    return this.http.delete<{ ok: boolean }>(`${this.api}/auth/sessions/${id}`);
  }
  mfaRegenerateBackupCodes(code: string) {
    return this.http.post<{ ok: boolean; backupCodes: string[]; message: string }>(`${this.api}/auth/mfa/backup-codes`, { code });
  }
  resendEmailVerification() {
    return this.http.post<{ ok: boolean; delivered: boolean; verifyUrl?: string; message: string }>(
      `${this.api}/auth/resend-verification`, {}
    );
  }

  // ── Receivables & reporting (2.4 #28–#34) ────
  //
  // All of this was computable from data that already existed; it was simply never
  // asked for. The product could say how much was outstanding and nothing else.

  /** AR ageing with per-customer buckets. */
  arAgeing() {
    return this.cache.through(`${NS.reports}:ageing`, () => this.http.get<ArAgeing>(`${this.api}/reports/ageing`));
  }
  downloadAgeingExcel() {
    return this.http.get(`${this.api}/reports/ageing/export.xlsx`, { responseType: 'blob' });
  }
  /** Statement of account: invoices and payments interleaved with a running balance. */
  customerStatement(clientId: string, params: ListParams = {}) {
    return this.cache.through(
      this.key(`${NS.reports}:statement:${clientId}`, params),
      () => this.http.get<CustomerStatement>(`${this.api}/reports/statement/${clientId}`, { params: this.params(params) })
    );
  }
  downloadStatementExcel(clientId: string, params: ListParams = {}) {
    return this.http.get(`${this.api}/reports/statement/${clientId}/export.xlsx`, {
      params: this.params(params), responseType: 'blob'
    });
  }
  /** DSO, collection efficiency and the payment-method mix. */
  collectionMetrics(days = 90) {
    return this.cache.through(
      this.key(`${NS.reports}:collections`, { days }),
      () => this.http.get<CollectionMetrics>(`${this.api}/reports/collections`, { params: this.params({ days }) })
    );
  }
  salesBreakdown(params: ListParams = {}) {
    return this.cache.through(
      this.key(`${NS.reports}:sales`, params),
      () => this.http.get<SalesBreakdown>(`${this.api}/reports/sales-breakdown`, { params: this.params(params) })
    );
  }
  downloadInvoicesExcel(params: ListParams = {}) {
    return this.http.get(`${this.api}/reports/invoices/export.xlsx`, { params: this.params(params), responseType: 'blob' });
  }

  // ── Stock (2.5 #37–#39) ──────────────────────

  stockLedger(params: ListParams = {}) {
    return this.list<StockMovement>(`${NS.items}:ledger`, '/reports/stock/ledger', params);
  }
  lowStock() {
    return this.cache.through(`${NS.items}:low`, () => this.http.get<LowStockReport>(`${this.api}/reports/stock/low`));
  }
  /** A correction, posted as a movement with a mandatory note — not an edit. */
  adjustStock(itemId: string, payload: {
    quantity: number; note: string; reason?: string;
    unitCost?: number | null; batchNumber?: string; expiryDate?: string;
  }) {
    return this.afterWrite(
      this.http.post<{ stockQty: number; unitCost: number | null; value: number | null }>(
        `${this.api}/reports/stock/${itemId}/adjust`, payload
      ),
      NS.items
    );
  }
  recomputeStock(itemId: string) {
    return this.afterWrite(
      this.http.post<{ ok: boolean; stockQty: number; stockValue: number }>(
        `${this.api}/reports/stock/${itemId}/recompute`, {}
      ),
      NS.items
    );
  }

  // ── Valuation, batches and barcodes (2.5 #41, #42, #44) ──

  stockValuation() {
    return this.cache.through(
      `${NS.items}:valuation`,
      () => this.http.get<StockValuationReport>(`${this.api}/reports/stock/valuation`)
    );
  }
  expiringStock(days?: number) {
    return this.cache.through(
      `${NS.items}:expiring:${days ?? 'default'}`,
      () => this.http.get<ExpiringStockReport>(`${this.api}/reports/stock/expiring`, {
        params: this.params(days == null ? {} : { days })
      })
    );
  }
  /** The open cost layers behind one item — the audit trail for its valuation. */
  stockLayers(itemId: string) {
    return this.http.get<{ count: number; layers: StockLayerRow[] }>(`${this.api}/reports/stock/${itemId}/layers`);
  }
  /**
   * One item, by barcode.
   *
   * Deliberately not `items({ q })`: a scanner needs "this exact item" or
   * "nothing", where the search returns a page of near-matches ranked by nothing
   * in particular. A till that silently picks the first of several rings up the
   * wrong product.
   */
  itemByBarcode(barcode: string) {
    return this.http.get<Item>(`${this.api}/items/barcode/${encodeURIComponent(barcode)}`);
  }

  // ── Expenses and profit & loss (2.4 #32) ─────

  expenses(params: ListParams = {}) {
    return this.list<Expense>(NS.expenses, '/expenses', params);
  }
  expenseCategories() {
    return this.cache.through(
      `${NS.expenses}:categories`,
      () => this.http.get<{ categories: MasterOption[] }>(`${this.api}/expenses/categories`)
    );
  }
  createExpense(payload: Partial<Expense>) {
    // Invalidates reports too: a cost that does not move the profit figure the
    // moment it is recorded looks like it was not saved.
    return this.afterWrite(this.http.post<Expense>(`${this.api}/expenses`, payload), NS.expenses, NS.reports);
  }
  updateExpense(id: string, payload: Partial<Expense>) {
    return this.afterWrite(this.http.put<Expense>(`${this.api}/expenses/${id}`, payload), NS.expenses, NS.reports);
  }
  deleteExpense(id: string) {
    return this.afterWrite(this.http.delete<{ ok: boolean }>(`${this.api}/expenses/${id}`), NS.expenses, NS.reports);
  }
  profitLoss(params: { fy?: number; from?: string; to?: string } = {}) {
    return this.cache.through(
      this.key(`${NS.reports}:pl`, params),
      () => this.http.get<ProfitLossReport>(`${this.api}/expenses/profit-loss`, { params: this.params(params) })
    );
  }
  profitLossExcel(params: { fy?: number; from?: string; to?: string } = {}) {
    return this.http.get(`${this.api}/expenses/profit-loss/export.xlsx`, {
      params: this.params(params), responseType: 'blob'
    });
  }

  // ── Tenant activity log (2.6 #50) ────────────

  /** The tenant's own audit trail. Recorded since Phase 1, exposed only to the
   *  platform until now — so an owner could not see who changed what. */
  tenantActivity(params: ListParams = {}) {
    return this.list<TenantActivityEntry>('activity', '/reports/activity', params);
  }

  /** Emails the invoice to the customer with the PDF attached (2.3 #19). */
  sendInvoiceToCustomer(id: string, payload: { to?: string; cc?: string; message?: string } = {}) {
    return this.afterWrite(
      this.http.post<{ ok: boolean; delivered: boolean; suppressed: boolean; to: string; message: string }>(
        `${this.api}/invoices/${id}/send`, payload
      ),
      NS.invoices
    );
  }

  // ── Reports ──────────────────────────────────
  /**
   * GST summary for one financial year (start year, e.g. 2026 for FY2026-27).
   * The endpoint is period-scoped — it used to aggregate the org's entire
   * history on every page view.
   */
  gstSummary(fy?: number) {
    const params: ListParams = fy ? { fy } : {};
    return this.cache.through(
      this.key(`${NS.reports}:gst`, params),
      () => this.http.get<GstSummary>(`${this.api}/reports/gst-summary`, { params: this.params(params) })
    );
  }
  exportGstSummaryCsv(fy?: number) {
    const params: ListParams = fy ? { fy } : {};
    return this.http.get(`${this.api}/reports/gst-summary/export.csv`, { params: this.params(params), responseType: 'blob' });
  }

  // ── Users ────────────────────────────────────
  /** Not paginated: a tenant's seat count is capped by their plan, so this list
   *  is bounded by construction rather than by a page size. */
  users() {
    return this.cache.through(NS.users, () => this.http.get<OrgUser[]>(`${this.api}/users`));
  }
  /** `inviteUrl` is only returned in local mode (no email provider configured),
   *  so the flow stays testable without leaking a live credential in production. */
  inviteUser(payload: { name: string; email: string; role: string }) {
    return this.afterWrite(
      this.http.post<{ user: OrgUser; inviteUrl?: string; delivered: boolean }>(`${this.api}/users/invite`, payload),
      NS.users, NS.subscription
    );
  }
  /** Issues a fresh invitation link, invalidating any outstanding one. */
  resendInvite(id: string) {
    return this.afterWrite(
      this.http.post<{ user: OrgUser; inviteUrl?: string; delivered: boolean }>(`${this.api}/users/${id}/resend-invite`, {}),
      NS.users
    );
  }
  /** Withdraws a pending invitation, freeing the seat and the email address. */
  revokeInvite(id: string) {
    return this.afterWrite(this.http.delete(`${this.api}/users/${id}/invite`), NS.users, NS.subscription);
  }
  updateUser(id: string, payload: Partial<OrgUser>) {
    return this.afterWrite(this.http.put<OrgUser>(`${this.api}/users/${id}`, payload), NS.users);
  }
  removeUser(id: string) {
    return this.afterWrite(this.http.delete<OrgUser>(`${this.api}/users/${id}`), NS.users, NS.subscription);
  }
  changePassword(payload: { currentPassword: string; newPassword: string }) {
    return this.http.post<{ ok: boolean }>(`${this.api}/auth/change-password`, payload);
  }

  // ── Subscription ─────────────────────────────
  plans() { return this.cache.through('plans', () => this.http.get<Plan[]>(`${this.api}/subscriptions/plans`)); }
  subscription() {
    return this.cache.through(
      NS.subscription,
      () => this.http.get<{
        subscription: Subscription | null;
        usage: PlanUsage;
        /** Money owed back after a mid-cycle upgrade (3.3 #10). Shown to the
         *  customer as well as to us: a credit only an operator can see is one
         *  the customer has to remember to ask for. */
        credits: BillingCredit[];
        creditBalance: number;
      }>(`${this.api}/subscriptions/current`)
    );
  }

  /**
   * Whether a discount code is usable, and what it would be worth.
   *
   * POST rather than GET despite being a read: the code stays out of access logs
   * and browser history.
   */
  checkCoupon(payload: { code: string; planCode: string; billingCycle: string }) {
    return this.http.post<CouponQuote>(`${this.api}/subscriptions/coupon/check`, payload);
  }

  /**
   * What changing plan would do, before it is done.
   *
   * An upgrade lands now and earns a credit for the days already paid for; a
   * downgrade lands at the end of the period and moves no money. Those are
   * different enough decisions that the button should not say the same thing for
   * both.
   */
  previewPlanChange(planCode: string, billingCycle: string) {
    return this.http.get<PlanChangePreview>(
      `${this.api}/subscriptions/preview-change?planCode=${encodeURIComponent(planCode)}&billingCycle=${billingCycle}`
    );
  }

  cancelScheduledPlanChange() {
    return this.afterWrite(
      this.http.post<{ subscription: Subscription; message: string }>(`${this.api}/subscriptions/cancel-scheduled-change`, {}),
      NS.subscription, NS.organisation
    );
  }
  /**
   * Starts a plan change. For a paid plan this only creates the checkout —
   * `pendingPayment` is true until a verified provider webhook confirms the
   * money arrived, and the tenant stays on their current plan until then.
   */
  startSubscription(payload: { planCode: string; billingCycle: string; couponCode?: string }) {
    return this.afterWrite(
      this.http.post<{
        subscription: Subscription;
        pendingPayment: boolean;
        checkout: { keyId: string; subscriptionId: string } | null;
        message: string;
        /** 'downgrade' returns 200 with `scheduled: true` and no checkout — there
         *  is nothing to collect until the new term starts. */
        direction?: 'new' | 'upgrade' | 'downgrade' | 'lateral';
        scheduled?: boolean;
        effectiveAt?: string;
        credit?: BillingCredit | null;
      }>(`${this.api}/subscriptions/start`, payload),
      NS.subscription, NS.organisation
    );
  }
  // ── Discount codes and credits, console side (3.3 #10) ──
  adminCoupons() {
    return this.cache.through(
      `${NS.superadmin}:coupons`,
      () => this.http.get<{ coupons: AdminCoupon[]; providerNote: string }>(`${this.api}/superadmin/coupons`)
    );
  }
  saveCoupon(payload: AdminCoupon) {
    return this.afterWrite(this.http.post<AdminCoupon>(`${this.api}/superadmin/coupons`, payload), NS.superadmin);
  }
  /** Retires rather than deletes: the redemption history is what answers "who
   *  used this, and what did we give away". */
  retireCoupon(id: string) {
    return this.afterWrite(this.http.delete<AdminCoupon>(`${this.api}/superadmin/coupons/${id}`), NS.superadmin);
  }
  couponRedemptions(id: string) {
    return this.http.get<{
      given: number;
      redemptions: Array<{ _id: string; orgName: string; appliedAt: string; originalPrice: number; finalPrice: number }>;
    }>(`${this.api}/superadmin/coupons/${id}/redemptions`);
  }
  adminCredits(status: 'owed' | 'settled' | 'void' = 'owed') {
    return this.cache.through(
      `${NS.superadmin}:credits:${status}`,
      () => this.http.get<{ total: number; credits: AdminCredit[] }>(`${this.api}/superadmin/credits?status=${status}`)
    );
  }
  settleCredit(id: string, payload: { method: string; reference?: string; note?: string }) {
    return this.afterWrite(this.http.post(`${this.api}/superadmin/credits/${id}/settle`, payload), NS.superadmin);
  }

  cancelSubscription() {
    return this.afterWrite(this.http.post<Subscription>(`${this.api}/subscriptions/cancel`, {}), NS.subscription);
  }

  // ── Organisation ─────────────────────────────
  organisation() {
    return this.cache.through(NS.organisation, () => this.http.get<Organisation>(`${this.api}/organisations/current`));
  }
  publicBranding() { return this.http.get<PublicBranding>(`${this.api}/public/branding`); }
  /**
   * Partial update: `brandingConfig` and `themeConfig` are merged server-side, so
   * only the keys you send are written. That matters for the logo — it is no
   * longer returned to the client, so sending the whole object back would blank
   * it. Send `logoUrl` only when the user actually changed it.
   */
  updateOrganisation(payload: Partial<Organisation>) {
    return this.afterWrite(
      this.http.put<Organisation>(`${this.api}/organisations/current`, payload),
      NS.organisation
    );
  }
  transferOwnership(payload: { newOwnerId: string; password: string }) {
    return this.afterWrite(
      this.http.post<Organisation>(`${this.api}/organisations/current/transfer-ownership`, payload),
      NS.organisation, NS.users
    );
  }

  // ── Super admin ──────────────────────────────
  superOverview() {
    return this.cache.through(`${NS.superadmin}:overview`, () => this.http.get<SuperOverview>(`${this.api}/superadmin/overview`));
  }
  superOrganisations(params: ListParams = {}) {
    return this.list<OrgSummary>(`${NS.superadmin}:orgs`, '/superadmin/organisations', params);
  }
  superCreateOrganisation(payload: Record<string, unknown>) {
    return this.afterWrite(
      this.http.post<{ organisation: Organisation; admin: OrgUser; tempPassword: string }>(`${this.api}/superadmin/organisations`, payload),
      NS.superadmin
    );
  }
  superUpdateOrganisation(id: string, payload: Partial<Organisation>) {
    return this.afterWrite(
      this.http.put<Organisation>(`${this.api}/superadmin/organisations/${id}`, payload),
      NS.superadmin
    );
  }
  /** Irreversible. `confirmName` must match the organisation's name. */
  superDeleteOrganisation(id: string, confirmName?: string) {
    return this.afterWrite(
      this.http.delete(`${this.api}/superadmin/organisations/${id}`, { body: { confirmName } }),
      NS.superadmin
    );
  }
  superPlans() { return this.cache.through(`${NS.superadmin}:plans`, () => this.http.get<Plan[]>(`${this.api}/superadmin/plans`)); }
  superSavePlan(code: string, payload: Partial<Plan> & { changeNote?: string; applyToExisting?: boolean }) {
    // The response reports how many subscribers each choice affected — the whole
    // point of the grandfathering decision, so the caller can say so.
    return this.afterWrite(
      this.http.put<Plan & { version: number; repriced: number; grandfathered: number }>(
        `${this.api}/superadmin/plans/${code}`, payload
      ),
      NS.superadmin, 'plans'
    );
  }
  superPlanHistory(code: string) {
    return this.http.get<{ versions: PlanVersion[] }>(`${this.api}/superadmin/plans/${code}/history`);
  }
  superMasters() {
    return this.cache.through(`${NS.superadmin}:masters`, () => this.http.get<MastersResponse>(`${this.api}/superadmin/masters`));
  }
  superSaveMasters(type: string, items: Master[]) {
    return this.afterWrite(this.http.put<Master[]>(`${this.api}/superadmin/masters/${type}`, items), NS.superadmin);
  }
  superUpdateReminder(id: string, payload: Partial<Reminder>) {
    return this.afterWrite(this.http.put<Reminder>(`${this.api}/superadmin/reminders/${id}`, payload), NS.superadmin);
  }
  superSettings() {
    return this.cache.through(`${NS.superadmin}:settings`, () => this.http.get<Record<string, any>>(`${this.api}/superadmin/settings`));
  }
  superSaveSetting(key: string, value: unknown) {
    return this.afterWrite(
      this.http.put<{ key: string; value: unknown }>(`${this.api}/superadmin/settings/${key}`, value),
      NS.superadmin
    );
  }
  /** Filterable and paginated. Was an unfiltered list capped at 200 rows, which
   *  made the trail unusable past the first 200 events. */
  superAuditLogs(filters: AuditFilters = {}) {
    return this.list<AuditEntry>(`${NS.superadmin}:audit`, '/superadmin/audit-logs', filters);
  }
  exportAuditLogsCsv(filters: AuditFilters = {}) {
    return this.http.get(`${this.api}/superadmin/audit-logs/export.csv`, {
      params: this.params(filters),
      responseType: 'blob'
    });
  }

  // ── Platform console (Phase 4) ───────────────
  //
  // Reads are cached with the usual 30s TTL; every action invalidates the
  // `superadmin` namespace, because all of them change something the console is
  // showing somewhere else on the page.

  /** What this operator's platform role permits. Read once per console load. */
  platformMe() {
    return this.cache.through(`${NS.superadmin}:me`, () => this.http.get<PlatformMe>(`${this.api}/superadmin/me`));
  }

  platformSummary() {
    return this.cache.through(`${NS.superadmin}:metrics`, () => this.http.get<PlatformSummary>(`${this.api}/superadmin/metrics/summary`));
  }
  platformSeries(days = 30) {
    return this.cache.through(
      this.key(`${NS.superadmin}:series`, { days }),
      () => this.http.get<MetricsSeries>(`${this.api}/superadmin/metrics/series`, { params: this.params({ days }) })
    );
  }
  /** The two actionable lists — at-risk tenants and expiring trials — together,
   *  because the dashboard shows them side by side. */
  platformAttention(params: ListParams = {}) {
    return this.cache.through(
      this.key(`${NS.superadmin}:attention`, params),
      () => this.http.get<AttentionLists>(`${this.api}/superadmin/metrics/attention`, { params: this.params(params) })
    );
  }
  platformAdoption(days = 30) {
    return this.cache.through(
      this.key(`${NS.superadmin}:adoption`, { days }),
      () => this.http.get<FeatureAdoption>(`${this.api}/superadmin/metrics/adoption`, { params: this.params({ days }) })
    );
  }
  rebuildMetrics(days = 30) {
    return this.afterWrite(
      this.http.post<{ ok: boolean; days: number; from: string; to: string }>(`${this.api}/superadmin/metrics/rebuild`, { days }),
      NS.superadmin
    );
  }
  systemHealth() {
    // Deliberately uncached: the point of a health panel is that it is current.
    return this.http.get<SystemHealth>(`${this.api}/superadmin/system/health`);
  }

  // Tenant drill-down
  tenantDetail(id: string) {
    return this.cache.through(`${NS.superadmin}:org:${id}`, () => this.http.get<TenantDetail>(`${this.api}/superadmin/organisations/${id}`));
  }
  tenantInvoices(id: string, params: ListParams = {}) {
    return this.list<Invoice>(`${NS.superadmin}:org:${id}:invoices`, `/superadmin/organisations/${id}/invoices`, params);
  }
  tenantTimeline(id: string, params: ListParams = {}) {
    return this.list<AuditEntry>(`${NS.superadmin}:org:${id}:timeline`, `/superadmin/organisations/${id}/timeline`, params);
  }

  // Tenant lifecycle actions
  /** Suspend, cancel or reactivate. A reason is mandatory for the first two — the
   *  tenant is shown it. */
  setTenantStatus(id: string, status: string, reason?: string) {
    return this.afterWrite(
      this.http.post<Organisation>(`${this.api}/superadmin/organisations/${id}/status`, { status, reason }),
      NS.superadmin
    );
  }
  setTenantLimits(id: string, payload: { userLimit: number | null; invoiceLimit: number | null; note?: string }) {
    return this.afterWrite(
      this.http.put<{ limitOverrides: Organisation['limitOverrides']; usage: PlanUsage }>(`${this.api}/superadmin/organisations/${id}/limits`, payload),
      NS.superadmin
    );
  }
  setTenantFlags(id: string, flags: Record<string, boolean>) {
    return this.afterWrite(
      this.http.put<{ overrides: Record<string, boolean>; effective: FeatureFlags }>(`${this.api}/superadmin/organisations/${id}/flags`, { flags }),
      NS.superadmin
    );
  }
  setTenantTrial(id: string, payload: { days?: number; endsAt?: string; end?: boolean }) {
    return this.afterWrite(
      this.http.post<Organisation>(`${this.api}/superadmin/organisations/${id}/trial`, payload),
      NS.superadmin
    );
  }
  setTenantNotice(id: string, payload: { message: string; level?: string; expiresAt?: string | null }) {
    return this.afterWrite(
      this.http.put<{ notice: TenantNotice | null }>(`${this.api}/superadmin/organisations/${id}/notice`, payload),
      NS.superadmin
    );
  }
  setTenantSupport(id: string, payload: OrgSupportContext) {
    return this.afterWrite(
      this.http.put<{ support: OrgSupportContext }>(`${this.api}/superadmin/organisations/${id}/support`, payload),
      NS.superadmin
    );
  }
  forceLogoutOrg(id: string) {
    return this.afterWrite(
      this.http.post<{ ok: boolean; users: number }>(`${this.api}/superadmin/organisations/${id}/force-logout`, {}),
      NS.superadmin
    );
  }
  /** Starts a "view as tenant" session. The returned token replaces the operator's
   *  own until they exit — see AuthService.startImpersonation. */
  impersonate(id: string, payload: { userId?: string; readOnly: boolean; reason: string }) {
    return this.http.post<ImpersonationSession>(`${this.api}/superadmin/organisations/${id}/impersonate`, payload);
  }

  // Tenant user actions.
  //
  // `targetOrgId` (not `orgId`) — the backend strips a literal `orgId` key from
  // every request body unconditionally (it's the tenant-isolation boundary and
  // must only ever come from the token), so these routes — flat by user id,
  // ambiguous now that one identity can hold more than one membership (#53,
  // #54) — need their own field name to say which org's membership this
  // targets. The tenant drill-down page always knows which org it's viewing.
  setTenantUser(id: string, targetOrgId: string, payload: { role?: string; status?: string }) {
    return this.afterWrite(this.http.put<OrgUser>(`${this.api}/superadmin/users/${id}`, { ...payload, targetOrgId }), NS.superadmin);
  }
  /** `link` emails the normal reset link and the operator never sees a password;
   *  `temporary` returns one once, for when the address no longer receives mail.
   *  Both revoke every session. */
  resetTenantUserPassword(id: string, targetOrgId: string, mode: 'link' | 'temporary' = 'link') {
    return this.afterWrite(
      this.http.post<{ ok: boolean; mode: string; tempPassword?: string; resetUrl?: string; delivered?: boolean; message: string }>(
        `${this.api}/superadmin/users/${id}/reset-password`, { mode, targetOrgId }
      ),
      NS.superadmin
    );
  }
  unlockTenantUser(id: string, targetOrgId: string) {
    return this.afterWrite(
      this.http.post<{ ok: boolean; wasLocked: boolean }>(`${this.api}/superadmin/users/${id}/unlock`, { targetOrgId }),
      NS.superadmin
    );
  }
  forceLogoutTenantUser(id: string, targetOrgId: string) {
    return this.afterWrite(this.http.post<{ ok: boolean }>(`${this.api}/superadmin/users/${id}/force-logout`, { targetOrgId }), NS.superadmin);
  }

  // Platform accounts
  platformUsers() {
    return this.cache.through(`${NS.superadmin}:platform-users`, () => this.http.get<PlatformUser[]>(`${this.api}/superadmin/platform-users`));
  }
  setPlatformRole(id: string, platformRole: string) {
    return this.afterWrite(
      this.http.put<PlatformUser>(`${this.api}/superadmin/platform-users/${id}/role`, { platformRole }),
      NS.superadmin
    );
  }

  /** A banner for every tenant. An empty message clears it. */
  setBroadcast(payload: { message: string; level?: string; expiresAt?: string | null }) {
    return this.afterWrite(this.http.put<TenantNotice>(`${this.api}/superadmin/broadcast`, payload), NS.superadmin);
  }

  // Security console
  loginHistory(filters: LoginHistoryFilters = {}) {
    return this.list<AuditEntry>(`${NS.superadmin}:logins`, '/superadmin/security/logins', filters);
  }
  securityAlerts(hours = 24) {
    return this.cache.through(
      this.key(`${NS.superadmin}:alerts`, { hours }),
      () => this.http.get<SecurityAlerts>(`${this.api}/superadmin/security/alerts`, { params: this.params({ hours }) })
    );
  }
}
