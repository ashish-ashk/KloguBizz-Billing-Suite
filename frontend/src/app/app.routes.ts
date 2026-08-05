import { Routes } from '@angular/router';
import { authGuard, superAdminGuard, tenantAdminGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent) },
  { path: 'register', loadComponent: () => import('./features/auth/register.component').then(m => m.RegisterComponent) },
  // Unauthenticated recovery/onboarding routes. `accept-invite` in particular
  // was referenced by every invitation email but never actually existed, so the
  // link fell through to the wildcard below and invited users could never
  // activate their account.
  { path: 'accept-invite', loadComponent: () => import('./features/auth/accept-invite.component').then(m => m.AcceptInviteComponent) },
  { path: 'forgot-password', loadComponent: () => import('./features/auth/forgot-password.component').then(m => m.ForgotPasswordComponent) },
  { path: 'reset-password', loadComponent: () => import('./features/auth/reset-password.component').then(m => m.ResetPasswordComponent) },
  // Confirming an address has to work without a session: the link arrives by email and
  // is frequently opened on a different device from the one that registered.
  { path: 'verify-email', loadComponent: () => import('./features/auth/verify-email.component').then(m => m.VerifyEmailComponent) },
  { path: 'terms', data: { type: 'terms' }, loadComponent: () => import('./features/legal/legal-page.component').then(m => m.LegalPageComponent) },
  { path: 'sla', data: { type: 'sla' }, loadComponent: () => import('./features/legal/legal-page.component').then(m => m.LegalPageComponent) },
  {
    path: '',
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'invoices', loadComponent: () => import('./features/invoices/invoices.component').then(m => m.InvoicesComponent) },
      { path: 'invoices/new', loadComponent: () => import('./features/invoices/invoice-editor.component').then(m => m.InvoiceEditorComponent) },
      { path: 'invoices/:id/edit', loadComponent: () => import('./features/invoices/invoice-editor.component').then(m => m.InvoiceEditorComponent) },
      { path: 'invoices/:id/print', loadComponent: () => import('./features/invoices/invoice-print.component').then(m => m.InvoicePrintComponent) },
      { path: 'bill-generator', loadComponent: () => import('./features/bill-generator/bill-generator.component').then(m => m.BillGeneratorComponent) },
      { path: 'bill-generator/:id/edit', loadComponent: () => import('./features/bill-generator/bill-generator.component').then(m => m.BillGeneratorComponent) },
      { path: 'clients', loadComponent: () => import('./features/clients/clients.component').then(m => m.ClientsComponent) },
      { path: 'items', loadComponent: () => import('./features/items/items.component').then(m => m.ItemsComponent) },
      { path: 'payments', loadComponent: () => import('./features/payments/payments.component').then(m => m.PaymentsComponent) },
      { path: 'reports', loadComponent: () => import('./features/reports/reports.component').then(m => m.ReportsComponent) },
      // Phase 5: the section-wise return, which is what can actually be filed.
      { path: 'gst-returns', loadComponent: () => import('./features/reports/gst-returns.component').then(m => m.GstReturnsComponent) },
      { path: 'purchases', loadComponent: () => import('./features/purchases/purchases.component').then(m => m.PurchasesComponent) },
      // Quotations, proforma invoices and delivery challans — the paperwork
      // before the invoice (2.2 #11–#13).
      { path: 'sales-documents', loadComponent: () => import('./features/sales-documents/sales-documents.component').then(m => m.SalesDocumentsComponent) },
      // Standing instructions that raise an invoice every period (2.2 #14).
      { path: 'recurring', loadComponent: () => import('./features/recurring/recurring-invoices.component').then(m => m.RecurringInvoicesComponent) },
      { path: 'receivables', loadComponent: () => import('./features/reports/receivables.component').then(m => m.ReceivablesComponent) },
      { path: 'activity', loadComponent: () => import('./features/account/activity.component').then(m => m.ActivityComponent) },
      { path: 'security', loadComponent: () => import('./features/account/security.component').then(m => m.AccountSecurityComponent) },
      { path: 'users', loadComponent: () => import('./features/users/users.component').then(m => m.UsersComponent) },
      { path: 'subscription', loadComponent: () => import('./features/subscription/subscription.component').then(m => m.SubscriptionComponent) },
      { path: 'appearance', canActivate: [tenantAdminGuard], loadComponent: () => import('./features/appearance/appearance.component').then(m => m.AppearanceComponent) },
      { path: 'invoice-templates', canActivate: [tenantAdminGuard], loadComponent: () => import('./features/invoice-templates/invoice-templates.component').then(m => m.InvoiceTemplatesComponent) },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' }
    ]
  },
  {
    path: 'super-admin',
    canActivate: [superAdminGuard],
    loadComponent: () => import('./features/super-admin/super-admin-layout.component').then(m => m.SuperAdminLayoutComponent),
    children: [
      // The console now opens on the platform dashboard rather than the org list.
      // The list is a directory; the dashboard is the screen that says whether the
      // business is healthy, which is what an operator signs in for.
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', loadComponent: () => import('./features/super-admin/dashboard.component').then(m => m.SuperDashboardComponent) },
      { path: 'organisations', loadComponent: () => import('./features/super-admin/organisations.component').then(m => m.SuperOrganisationsComponent) },
      // Declared after the literal path so it cannot swallow it.
      { path: 'organisations/:id', loadComponent: () => import('./features/super-admin/tenant-detail.component').then(m => m.SuperTenantDetailComponent) },
      { path: 'audit', loadComponent: () => import('./features/super-admin/audit.component').then(m => m.SuperAuditComponent) },
      { path: 'masters', loadComponent: () => import('./features/super-admin/masters.component').then(m => m.SuperMastersComponent) },
      { path: 'templates', loadComponent: () => import('./features/super-admin/templates.component').then(m => m.SuperTemplatesComponent) },
      { path: 'reminders', loadComponent: () => import('./features/super-admin/reminders.component').then(m => m.SuperRemindersComponent) },
      { path: 'plans', loadComponent: () => import('./features/super-admin/plans.component').then(m => m.SuperPlansComponent) },
      { path: 'branding', loadComponent: () => import('./features/super-admin/branding.component').then(m => m.SuperBrandingComponent) },
      { path: 'profile', loadComponent: () => import('./features/super-admin/profile.component').then(m => m.SuperProfileComponent) }
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];
