import {
  HttpClient,
  environment,
  ɵɵdefineInjectable,
  ɵɵinject
} from "./chunk-6VNHH65J.js";

// src/app/core/api.service.ts
var ApiService = class _ApiService {
  http;
  api = environment.apiUrl;
  constructor(http) {
    this.http = http;
  }
  // ── Clients ──────────────────────────────────
  clients() {
    return this.http.get(`${this.api}/clients`);
  }
  createClient(payload) {
    return this.http.post(`${this.api}/clients`, payload);
  }
  updateClient(id, payload) {
    return this.http.put(`${this.api}/clients/${id}`, payload);
  }
  deleteClient(id) {
    return this.http.delete(`${this.api}/clients/${id}`);
  }
  // ── Items ────────────────────────────────────
  items() {
    return this.http.get(`${this.api}/items`);
  }
  createItem(payload) {
    return this.http.post(`${this.api}/items`, payload);
  }
  updateItem(id, payload) {
    return this.http.put(`${this.api}/items/${id}`, payload);
  }
  deleteItem(id) {
    return this.http.delete(`${this.api}/items/${id}`);
  }
  downloadItemsTemplate() {
    return this.http.get(`${this.api}/items/bulk-upload/template`, { responseType: "blob" });
  }
  bulkUploadItems(file) {
    const formData = new FormData();
    formData.append("file", file);
    return this.http.post(`${this.api}/items/bulk-upload`, formData);
  }
  // ── Invoices ─────────────────────────────────
  invoices(status = "") {
    const suffix = status ? `?status=${status}` : "";
    return this.http.get(`${this.api}/invoices${suffix}`);
  }
  invoice(id) {
    return this.http.get(`${this.api}/invoices/${id}`);
  }
  invoiceStats() {
    return this.http.get(`${this.api}/invoices/stats`);
  }
  createInvoice(payload) {
    return this.http.post(`${this.api}/invoices`, payload);
  }
  updateInvoice(id, payload) {
    return this.http.put(`${this.api}/invoices/${id}`, payload);
  }
  duplicateInvoice(id) {
    return this.http.post(`${this.api}/invoices/${id}/duplicate`, {});
  }
  markPaid(id) {
    return this.http.post(`${this.api}/invoices/${id}/mark-paid`, {});
  }
  sendReminder(id) {
    return this.http.post(`${this.api}/invoices/${id}/remind`, {});
  }
  remindAll() {
    return this.http.post(`${this.api}/invoices/remind-all`, {});
  }
  deleteInvoice(id) {
    return this.http.delete(`${this.api}/invoices/${id}`);
  }
  downloadInvoicePdf(id) {
    return this.http.get(`${this.api}/invoices/${id}/pdf`, { responseType: "blob" });
  }
  exportInvoicesCsv() {
    return this.http.get(`${this.api}/invoices/export.csv`, { responseType: "blob" });
  }
  // ── Payments ─────────────────────────────────
  payments() {
    return this.http.get(`${this.api}/payments`);
  }
  createPayment(payload) {
    return this.http.post(`${this.api}/payments`, payload);
  }
  exportPaymentsCsv() {
    return this.http.get(`${this.api}/payments/export.csv`, { responseType: "blob" });
  }
  // ── Reports ──────────────────────────────────
  gstSummary() {
    return this.http.get(`${this.api}/reports/gst-summary`);
  }
  exportGstSummaryCsv() {
    return this.http.get(`${this.api}/reports/gst-summary/export.csv`, { responseType: "blob" });
  }
  // ── Users ────────────────────────────────────
  users() {
    return this.http.get(`${this.api}/users`);
  }
  inviteUser(payload) {
    return this.http.post(`${this.api}/users/invite`, payload);
  }
  updateUser(id, payload) {
    return this.http.put(`${this.api}/users/${id}`, payload);
  }
  removeUser(id) {
    return this.http.delete(`${this.api}/users/${id}`);
  }
  changePassword(payload) {
    return this.http.post(`${this.api}/auth/change-password`, payload);
  }
  // ── Subscription ─────────────────────────────
  plans() {
    return this.http.get(`${this.api}/subscriptions/plans`);
  }
  subscription() {
    return this.http.get(`${this.api}/subscriptions/current`);
  }
  startSubscription(payload) {
    return this.http.post(`${this.api}/subscriptions/start`, payload);
  }
  cancelSubscription() {
    return this.http.post(`${this.api}/subscriptions/cancel`, {});
  }
  // ── Organisation ─────────────────────────────
  organisation() {
    return this.http.get(`${this.api}/organisations/current`);
  }
  publicBranding() {
    return this.http.get(`${this.api}/public/branding`);
  }
  updateOrganisation(payload) {
    return this.http.put(`${this.api}/organisations/current`, payload);
  }
  // ── Super admin ──────────────────────────────
  superOverview() {
    return this.http.get(`${this.api}/superadmin/overview`);
  }
  superOrganisations() {
    return this.http.get(`${this.api}/superadmin/organisations`);
  }
  superCreateOrganisation(payload) {
    return this.http.post(`${this.api}/superadmin/organisations`, payload);
  }
  superUpdateOrganisation(id, payload) {
    return this.http.put(`${this.api}/superadmin/organisations/${id}`, payload);
  }
  superDeleteOrganisation(id) {
    return this.http.delete(`${this.api}/superadmin/organisations/${id}`);
  }
  superPlans() {
    return this.http.get(`${this.api}/superadmin/plans`);
  }
  superSavePlan(code, payload) {
    return this.http.put(`${this.api}/superadmin/plans/${code}`, payload);
  }
  superMasters() {
    return this.http.get(`${this.api}/superadmin/masters`);
  }
  superSaveMasters(type, items) {
    return this.http.put(`${this.api}/superadmin/masters/${type}`, items);
  }
  superUpdateReminder(id, payload) {
    return this.http.put(`${this.api}/superadmin/reminders/${id}`, payload);
  }
  superUpdateTemplate(id, payload) {
    return this.http.put(`${this.api}/superadmin/templates/${id}`, payload);
  }
  superSettings() {
    return this.http.get(`${this.api}/superadmin/settings`);
  }
  superSaveSetting(key, value) {
    return this.http.put(`${this.api}/superadmin/settings/${key}`, value);
  }
  superAuditLogs(limit = 50) {
    return this.http.get(`${this.api}/superadmin/audit-logs?limit=${limit}`);
  }
  static \u0275fac = function ApiService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _ApiService)(\u0275\u0275inject(HttpClient));
  };
  static \u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _ApiService, factory: _ApiService.\u0275fac, providedIn: "root" });
};

export {
  ApiService
};
//# sourceMappingURL=chunk-36HDS2M4.js.map
