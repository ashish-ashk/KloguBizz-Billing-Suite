import { Component, HostListener, Input, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { ThemeService } from '../core/theme.service';
import { AvatarComponent, PillComponent, ToastsComponent } from './ui';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, ToastsComponent, AvatarComponent, PillComponent],
  template: `
    <button class="menu-toggle no-print" type="button" (click)="menuOpen.set(!menuOpen())" aria-label="Toggle menu">☰</button>
    <div class="shell">
      <aside class="sidebar no-print" [class.open]="menuOpen()">
        <div class="sidebar-logo">
          <div class="brand">
            @if (auth.organisation()?.brandingConfig?.logoUrl) {
              <img [src]="auth.organisation()?.brandingConfig?.logoUrl" alt="Logo"
                style="width:36px;height:36px;border-radius:10px;object-fit:contain;background:#fff;flex-shrink:0;padding:2px;" />
            } @else {
              <div class="brand-mark">K</div>
            }
            <div>
              <div class="brand-name">Klogu Bizz</div>
              <div class="brand-sub">GST Billing Suite</div>
            </div>
          </div>
        </div>
        <nav class="nav" (click)="menuOpen.set(false)">
          <div class="nav-section">Main Menu</div>
          <a routerLink="/dashboard" routerLinkActive="active"><span class="icon">▤</span> Dashboard</a>
          <a routerLink="/invoices" routerLinkActive="active"><span class="icon">◧</span> Invoices</a>
          <a routerLink="/bill-generator" routerLinkActive="active"><span class="icon">⊞</span> Bill Generator</a>
          <div class="nav-section">Management</div>
          <a routerLink="/clients" routerLinkActive="active"><span class="icon">◫</span> Clients</a>
          <a routerLink="/payments" routerLinkActive="active"><span class="icon">◈</span> Payments</a>
          <a routerLink="/reports" routerLinkActive="active"><span class="icon">📊</span> Reports</a>
          <a routerLink="/users" routerLinkActive="active"><span class="icon">◉</span> Users &amp; Roles</a>
          <a routerLink="/subscription" routerLinkActive="active"><span class="icon">⬡</span> Subscription</a>
          @if (auth.user()?.role === 'admin') {
            <a routerLink="/appearance" routerLinkActive="active"><span class="icon">🎨</span> Appearance</a>
            <a routerLink="/invoice-templates" routerLinkActive="active"><span class="icon">📄</span> Invoice Templates</a>
          }
          @if (auth.isSuperAdmin()) {
            <div class="nav-section">Platform</div>
            <a routerLink="/super-admin" routerLinkActive="active"><span class="icon">🔐</span> Super Admin</a>
          }
        </nav>
        <div class="sidebar-foot">
          <div class="sidebar-org">
            <div class="brand-mark" style="width:32px;height:32px;font-size:12px;border-radius:8px;background:rgba(99,102,241,.3);box-shadow:none;color:#a5b4fc;">
              {{ orgInitials() }}
            </div>
            <div style="overflow:hidden">
              <div class="org-name">{{ auth.organisation()?.name || auth.user()?.name || '—' }}</div>
              <div class="org-plan">{{ auth.user()?.email }}</div>
            </div>
          </div>
          <button class="signout-btn" type="button" (click)="auth.logout()">⎋ Sign Out</button>
        </div>
      </aside>
      <main class="main">
        <div class="topbar no-print">
          <div class="topbar-greeting">Welcome back, {{ firstName() }} 👋</div>
          <div class="topbar-right">
            @if (theme.canToggleDarkMode()) {
              <button class="icon-btn" type="button" (click)="theme.toggleDarkMode()"
                [attr.aria-label]="theme.isDarkActive() ? 'Switch to light mode' : 'Switch to dark mode'"
                [title]="theme.isDarkActive() ? 'Switch to Light Mode' : 'Switch to Dark Mode'">
                {{ theme.isDarkActive() ? '☀' : '🌙' }}
              </button>
            }
            <div class="topbar-user" (click)="toggleUserMenu($event)">
              <app-avatar [name]="auth.user()?.name || '?'" [size]="32" />
              <div class="topbar-user-info">
                <div class="topbar-user-name">{{ auth.user()?.name }}</div>
                <app-pill [status]="auth.user()?.role || 'viewer'" />
              </div>
              <span class="chevron" [class.open]="userMenuOpen()">▾</span>
              @if (userMenuOpen()) {
                <div class="user-dropdown" (click)="$event.stopPropagation()">
                  <div class="user-dropdown-email">{{ auth.user()?.email }}</div>
                  <button type="button" (click)="auth.logout()">⎋ Sign Out</button>
                </div>
              }
            </div>
          </div>
        </div>
        <div class="page page-enter">
          <div class="page-head">
            <div>
              <h1>{{ title }}</h1>
              @if (subtitle) { <p>{{ subtitle }}</p> }
            </div>
            <div class="page-actions no-print">
              <ng-content select="[actions]" />
            </div>
          </div>
          <ng-content />
        </div>
      </main>
    </div>
    <app-toasts />
  `
})
export class AppShellComponent {
  @Input({ required: true }) title = '';
  @Input() subtitle = '';
  menuOpen = signal(false);
  userMenuOpen = signal(false);

  constructor(public auth: AuthService, public theme: ThemeService) {}

  orgInitials(): string {
    const name = this.auth.organisation()?.name || this.auth.user()?.name || '?';
    return name.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('');
  }

  firstName(): string {
    return (this.auth.user()?.name || '').split(/\s+/)[0] || 'there';
  }

  toggleUserMenu(event: Event) {
    event.stopPropagation();
    this.userMenuOpen.update(v => !v);
  }

  @HostListener('document:click')
  closeUserMenu() {
    this.userMenuOpen.set(false);
  }
}
