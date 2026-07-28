import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { CacheService } from './cache.service';
import {
  AuditEntry, AuditFilters, Client, CreditNote, CreditNoteReason, CreditSummary, GstSummary, Invoice, InvoiceItem,
  InvoiceStats, Item, ItemBulkUploadResult, ListParams, Master, MastersResponse,
  Organisation, OrgSummary, OrgUser, Page, Payment, Plan, PlanUsage, PublicBranding, Reminder, Subscription, SuperOverview
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
  users: 'users',
  organisation: 'organisation',
  subscription: 'subscription',
  reports: 'reports',
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
      () => this.http.get<{ subscription: Subscription | null; usage: PlanUsage }>(`${this.api}/subscriptions/current`)
    );
  }
  /**
   * Starts a plan change. For a paid plan this only creates the checkout —
   * `pendingPayment` is true until a verified provider webhook confirms the
   * money arrived, and the tenant stays on their current plan until then.
   */
  startSubscription(payload: { planCode: string; billingCycle: string }) {
    return this.afterWrite(
      this.http.post<{
        subscription: Subscription;
        pendingPayment: boolean;
        checkout: { keyId: string; subscriptionId: string } | null;
        message: string;
      }>(`${this.api}/subscriptions/start`, payload),
      NS.subscription, NS.organisation
    );
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
  superSavePlan(code: string, payload: Partial<Plan>) {
    return this.afterWrite(this.http.put<Plan>(`${this.api}/superadmin/plans/${code}`, payload), NS.superadmin, 'plans');
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
    return this.afterWrite(this.http.put(`${this.api}/superadmin/settings/${key}`, value), NS.superadmin);
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
}
