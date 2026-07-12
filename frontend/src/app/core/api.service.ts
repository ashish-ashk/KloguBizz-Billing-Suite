import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import {
  AuditEntry, Client, GstSummary, Invoice, InvoiceStats, InvoiceTemplate, Master, MastersResponse,
  Organisation, OrgSummary, OrgUser, Payment, Plan, PlanUsage, PublicBranding, Reminder, Subscription, SuperOverview
} from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ── Clients ──────────────────────────────────
  clients() { return this.http.get<Client[]>(`${this.api}/clients`); }
  createClient(payload: Partial<Client>) { return this.http.post<Client>(`${this.api}/clients`, payload); }
  updateClient(id: string, payload: Partial<Client>) { return this.http.put<Client>(`${this.api}/clients/${id}`, payload); }
  deleteClient(id: string) { return this.http.delete(`${this.api}/clients/${id}`); }

  // ── Invoices ─────────────────────────────────
  invoices(status = '') {
    const suffix = status ? `?status=${status}` : '';
    return this.http.get<Invoice[]>(`${this.api}/invoices${suffix}`);
  }
  invoice(id: string) { return this.http.get<Invoice>(`${this.api}/invoices/${id}`); }
  invoiceStats() { return this.http.get<InvoiceStats>(`${this.api}/invoices/stats`); }
  createInvoice(payload: Partial<Invoice>) { return this.http.post<Invoice>(`${this.api}/invoices`, payload); }
  updateInvoice(id: string, payload: Partial<Invoice>) { return this.http.put<Invoice>(`${this.api}/invoices/${id}`, payload); }
  duplicateInvoice(id: string) { return this.http.post<Invoice>(`${this.api}/invoices/${id}/duplicate`, {}); }
  markPaid(id: string) { return this.http.post<Invoice>(`${this.api}/invoices/${id}/mark-paid`, {}); }
  sendReminder(id: string) { return this.http.post<{ ok: boolean }>(`${this.api}/invoices/${id}/remind`, {}); }
  remindAll() { return this.http.post<{ sent: number; skipped: number; total: number }>(`${this.api}/invoices/remind-all`, {}); }
  deleteInvoice(id: string) { return this.http.delete(`${this.api}/invoices/${id}`); }
  downloadInvoicePdf(id: string) { return this.http.get(`${this.api}/invoices/${id}/pdf`, { responseType: 'blob' }); }
  exportInvoicesCsv() { return this.http.get(`${this.api}/invoices/export.csv`, { responseType: 'blob' }); }

  // ── Payments ─────────────────────────────────
  payments() { return this.http.get<Payment[]>(`${this.api}/payments`); }
  createPayment(payload: Partial<Payment> & { invoiceId: string }) {
    return this.http.post<Payment>(`${this.api}/payments`, payload);
  }
  exportPaymentsCsv() { return this.http.get(`${this.api}/payments/export.csv`, { responseType: 'blob' }); }

  // ── Reports ──────────────────────────────────
  gstSummary() { return this.http.get<GstSummary>(`${this.api}/reports/gst-summary`); }
  exportGstSummaryCsv() { return this.http.get(`${this.api}/reports/gst-summary/export.csv`, { responseType: 'blob' }); }

  // ── Users ────────────────────────────────────
  users() { return this.http.get<OrgUser[]>(`${this.api}/users`); }
  inviteUser(payload: { name: string; email: string; role: string }) {
    return this.http.post<{ user: OrgUser; inviteUrl: string }>(`${this.api}/users/invite`, payload);
  }
  updateUser(id: string, payload: Partial<OrgUser>) { return this.http.put<OrgUser>(`${this.api}/users/${id}`, payload); }
  removeUser(id: string) { return this.http.delete<OrgUser>(`${this.api}/users/${id}`); }
  changePassword(payload: { currentPassword: string; newPassword: string }) {
    return this.http.post<{ ok: boolean }>(`${this.api}/auth/change-password`, payload);
  }

  // ── Subscription ─────────────────────────────
  plans() { return this.http.get<Plan[]>(`${this.api}/subscriptions/plans`); }
  subscription() {
    return this.http.get<{ subscription: Subscription | null; usage: PlanUsage }>(`${this.api}/subscriptions/current`);
  }
  startSubscription(payload: { planCode: string; billingCycle: string }) {
    return this.http.post(`${this.api}/subscriptions/start`, payload);
  }
  cancelSubscription() { return this.http.post<Subscription>(`${this.api}/subscriptions/cancel`, {}); }

  // ── Organisation ─────────────────────────────
  organisation() { return this.http.get<Organisation>(`${this.api}/organisations/current`); }
  publicBranding() { return this.http.get<PublicBranding>(`${this.api}/public/branding`); }
  updateOrganisation(payload: Partial<Organisation>) {
    return this.http.put<Organisation>(`${this.api}/organisations/current`, payload);
  }

  // ── Super admin ──────────────────────────────
  superOverview() { return this.http.get<SuperOverview>(`${this.api}/superadmin/overview`); }
  superOrganisations() { return this.http.get<OrgSummary[]>(`${this.api}/superadmin/organisations`); }
  superCreateOrganisation(payload: Record<string, unknown>) {
    return this.http.post<{ organisation: Organisation; admin: OrgUser; tempPassword: string }>(`${this.api}/superadmin/organisations`, payload);
  }
  superUpdateOrganisation(id: string, payload: Partial<Organisation>) {
    return this.http.put<Organisation>(`${this.api}/superadmin/organisations/${id}`, payload);
  }
  superDeleteOrganisation(id: string) { return this.http.delete(`${this.api}/superadmin/organisations/${id}`); }
  superPlans() { return this.http.get<Plan[]>(`${this.api}/superadmin/plans`); }
  superSavePlan(code: string, payload: Partial<Plan>) {
    return this.http.put<Plan>(`${this.api}/superadmin/plans/${code}`, payload);
  }
  superMasters() { return this.http.get<MastersResponse>(`${this.api}/superadmin/masters`); }
  superSaveMasters(type: string, items: Master[]) {
    return this.http.put<Master[]>(`${this.api}/superadmin/masters/${type}`, items);
  }
  superUpdateReminder(id: string, payload: Partial<Reminder>) {
    return this.http.put<Reminder>(`${this.api}/superadmin/reminders/${id}`, payload);
  }
  superUpdateTemplate(id: string, payload: Partial<InvoiceTemplate>) {
    return this.http.put<InvoiceTemplate>(`${this.api}/superadmin/templates/${id}`, payload);
  }
  superSettings() { return this.http.get<Record<string, any>>(`${this.api}/superadmin/settings`); }
  superSaveSetting(key: string, value: unknown) {
    return this.http.put(`${this.api}/superadmin/settings/${key}`, value);
  }
  superAuditLogs(limit = 50) { return this.http.get<AuditEntry[]>(`${this.api}/superadmin/audit-logs?limit=${limit}`); }
}
