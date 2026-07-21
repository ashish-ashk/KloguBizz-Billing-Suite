import { Routes } from '@angular/router';
import { authGuard, superAdminGuard, tenantAdminGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent) },
  { path: 'register', loadComponent: () => import('./features/auth/register.component').then(m => m.RegisterComponent) },
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
      { path: '', pathMatch: 'full', redirectTo: 'organisations' },
      { path: 'organisations', loadComponent: () => import('./features/super-admin/organisations.component').then(m => m.SuperOrganisationsComponent) },
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
