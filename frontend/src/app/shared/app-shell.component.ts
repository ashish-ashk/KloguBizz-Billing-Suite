import { Component, HostListener, Input, computed, effect, signal, viewChild } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { ThemeService } from '../core/theme.service';
import { AvatarComponent, PillComponent, ToastsComponent, popScrollLock, pushScrollLock } from './ui';
import { IconComponent } from './icons';
import { CommandItem, QuickSearchComponent } from './quick-search.component';

const COLLAPSE_KEY = 'klogubizz_sidebar_collapsed';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, ToastsComponent, AvatarComponent, PillComponent, IconComponent, QuickSearchComponent],
  template: `
    <button class="menu-toggle no-print" type="button" [class.drawer-open]="menuOpen()" (click)="menuOpen.set(!menuOpen())" aria-label="Toggle menu">
      <app-icon name="menu" [size]="17" />
    </button>
    <div class="drawer-backdrop no-print" [class.show]="menuOpen()" (click)="menuOpen.set(false)"></div>
    <div class="shell" [class.sidebar-collapsed]="collapsed()">
      <aside class="sidebar no-print" [class.open]="menuOpen()" [class.collapsed]="collapsed()">
        <div class="sidebar-logo">
          <div class="brand">
            @if (auth.organisation()?.brandingConfig?.logoUrl) {
              <img [src]="auth.organisation()?.brandingConfig?.logoUrl" alt="Logo" class="brand-logo-img" />
            } @else {
              <img src="klogu-logo.png" alt="Klogu Bizz" class="brand-logo-img" />
            }
            <div class="brand-text">
              <div class="brand-name">Klogu Bizz</div>
              <div class="brand-sub">GST Billing Suite</div>
            </div>
          </div>
        </div>
        <div class="sidebar-scroll">
          <nav class="nav" (click)="menuOpen.set(false)">
            <div class="nav-section">Main Menu</div>
            <a routerLink="/dashboard" routerLinkActive="active" title="Dashboard"><span class="nav-icon"><app-icon name="dashboard" /></span><span class="nav-label">Dashboard</span></a>
            <a routerLink="/invoices" routerLinkActive="active" title="Invoices"><span class="nav-icon"><app-icon name="invoice" /></span><span class="nav-label">Invoices</span></a>
            <a routerLink="/bill-generator" routerLinkActive="active" title="Bill Generator"><span class="nav-icon"><app-icon name="calculator" /></span><span class="nav-label">Bill Generator</span></a>
            <div class="nav-section">Management</div>
            <a routerLink="/clients" routerLinkActive="active" title="Clients"><span class="nav-icon"><app-icon name="users" /></span><span class="nav-label">Clients</span></a>
            <a routerLink="/items" routerLinkActive="active" title="Inventory"><span class="nav-icon"><app-icon name="box" /></span><span class="nav-label">Inventory</span></a>
            <a routerLink="/payments" routerLinkActive="active" title="Payments"><span class="nav-icon"><app-icon name="creditCard" /></span><span class="nav-label">Payments</span></a>
            <a routerLink="/reports" routerLinkActive="active" title="Reports"><span class="nav-icon"><app-icon name="chart" /></span><span class="nav-label">Reports</span></a>
            <a routerLink="/users" routerLinkActive="active" title="Users &amp; Roles"><span class="nav-icon"><app-icon name="shieldUser" /></span><span class="nav-label">Users &amp; Roles</span></a>
            <a routerLink="/subscription" routerLinkActive="active" title="Subscription"><span class="nav-icon"><app-icon name="package" /></span><span class="nav-label">Subscription</span></a>
            @if (auth.user()?.role === 'admin') {
              <div class="nav-section">Customize</div>
              <a routerLink="/appearance" routerLinkActive="active" title="Appearance"><span class="nav-icon"><app-icon name="palette" /></span><span class="nav-label">Appearance</span></a>
              <a routerLink="/invoice-templates" routerLinkActive="active" title="Invoice Templates"><span class="nav-icon"><app-icon name="template" /></span><span class="nav-label">Invoice Templates</span></a>
            }
            @if (auth.isSuperAdmin()) {
              <div class="nav-section">Platform</div>
              <a routerLink="/super-admin" routerLinkActive="active" title="Super Admin"><span class="nav-icon"><app-icon name="shield" /></span><span class="nav-label">Super Admin</span></a>
            }
          </nav>
        </div>
        <div class="sidebar-foot">
          <div class="sidebar-user-row">
            <div class="sidebar-org" title="{{ auth.organisation()?.name || auth.user()?.name }}">
              <div class="brand-mark org-mark">{{ orgInitials() }}</div>
              <div class="org-info">
                <div class="org-name">{{ auth.organisation()?.name || auth.user()?.name || '—' }}</div>
                <div class="org-plan">{{ auth.user()?.email }}</div>
              </div>
            </div>
            <button class="sidebar-icon-btn nav-label" type="button" (click)="auth.logout()" title="Sign Out" aria-label="Sign Out">
              <app-icon name="logout" [size]="14" />
            </button>
          </div>
        </div>
      </aside>
      <main class="main">
        <div class="topbar no-print">
          <button class="icon-btn sidebar-toggle-btn" type="button" (click)="toggleCollapse()"
            [attr.aria-label]="collapsed() ? 'Expand sidebar' : 'Collapse sidebar'" [title]="collapsed() ? 'Expand sidebar' : 'Collapse sidebar'">
            <app-icon name="menu" [size]="17" />
          </button>
          <div class="topbar-left">
            <div class="topbar-brand" title="{{ auth.organisation()?.name }}">
              @if (auth.organisation()?.brandingConfig?.logoUrl) {
                <img [src]="auth.organisation()?.brandingConfig?.logoUrl" alt="Logo" class="brand-logo-img" />
              } @else {
                <img src="klogu-logo.png" alt="Klogu Bizz" class="brand-logo-img" />
              }
            </div>
            <div class="topbar-crumb">
              <span class="crumb-org">{{ auth.organisation()?.name || 'Workspace' }}</span>
              <app-icon name="chevronRight" [size]="12" class="crumb-sep" />
              <span class="crumb-page">{{ title }}</span>
            </div>
          </div>
          <app-quick-search class="no-print" [items]="commandItems()" (navigate)="router.navigateByUrl($event)" />
          <div class="topbar-right">
            @if (theme.canToggleDarkMode()) {
              <button class="icon-btn" type="button" (click)="theme.toggleDarkMode()"
                [attr.aria-label]="theme.isDarkActive() ? 'Switch to light mode' : 'Switch to dark mode'"
                [title]="theme.isDarkActive() ? 'Switch to Light Mode' : 'Switch to Dark Mode'">
                <app-icon [name]="theme.isDarkActive() ? 'sun' : 'moon'" [size]="15" />
              </button>
            }
            <div class="topbar-user" (click)="toggleUserMenu($event)">
              <app-avatar [name]="auth.user()?.name || '?'" [size]="30" />
              <div class="topbar-user-info">
                <div class="topbar-user-name">{{ auth.user()?.name }}</div>
                <app-pill [status]="auth.user()?.role || 'viewer'" />
              </div>
              <app-icon name="chevronDown" [size]="13" class="chevron" [class.open]="userMenuOpen()" />
              @if (userMenuOpen()) {
                <div class="user-dropdown" (click)="$event.stopPropagation()">
                  <div class="user-dropdown-head">
                    <app-avatar [name]="auth.user()?.name || '?'" [size]="32" />
                    <div class="user-dropdown-id">
                      <div class="user-dropdown-name">{{ auth.user()?.name }}</div>
                      <div class="user-dropdown-email">{{ auth.user()?.email }}</div>
                    </div>
                  </div>
                  <div class="user-dropdown-divider"></div>
                  <button type="button" (click)="auth.logout()"><app-icon name="logout" [size]="14" /> Sign Out</button>
                </div>
              }
            </div>
          </div>
        </div>
        <div class="page page-enter">
          @if (accountBlocked()) {
            <!-- A suspended or cancelled account can read and export but cannot
                 save. Without this banner every write just fails with a toast
                 and the tenant has no idea why, or what to do about it. -->
            <div class="info-box danger no-print" style="margin-bottom:18px;display:flex;gap:10px;align-items:flex-start;">
              <app-icon name="alertTriangle" [size]="16" style="flex-shrink:0;margin-top:1px" />
              <div style="line-height:1.6;">
                <strong>{{ orgStatus() === 'suspended' ? 'This account is suspended.' : 'This account has been cancelled.' }}</strong><br />
                You can still view, print and export everything you have already recorded, but new
                changes cannot be saved.
                @if (orgStatus() === 'suspended') {
                  <a routerLink="/subscription" style="color:inherit;font-weight:700;text-decoration:underline;">Check your subscription</a>
                  or contact support to restore access.
                }
              </div>
            </div>
          }
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
  collapsed = signal(localStorage.getItem(COLLAPSE_KEY) === '1');
  quickSearch = viewChild(QuickSearchComponent);

  /** Organisation status, which now genuinely gates writes server-side. */
  orgStatus = computed(() => this.auth.organisation()?.status);
  /** Suspended and cancelled accounts are read-only, not signed out. */
  accountBlocked = computed(() => {
    const status = this.orgStatus();
    return status === 'suspended' || status === 'cancelled';
  });

  commandItems = computed<CommandItem[]>(() => {
    const items: CommandItem[] = [
      { label: 'Dashboard', route: '/dashboard', icon: 'dashboard' },
      { label: 'Invoices', route: '/invoices', icon: 'invoice' },
      { label: 'Bill Generator', route: '/bill-generator', icon: 'calculator' },
      { label: 'Clients', route: '/clients', icon: 'users' },
      { label: 'Inventory', route: '/items', icon: 'box' },
      { label: 'Payments', route: '/payments', icon: 'creditCard' },
      { label: 'Reports', route: '/reports', icon: 'chart' },
      { label: 'Users & Roles', route: '/users', icon: 'shieldUser' },
      { label: 'Subscription', route: '/subscription', icon: 'package' }
    ];
    if (this.auth.user()?.role === 'admin') {
      items.push(
        { label: 'Appearance', route: '/appearance', icon: 'palette' },
        { label: 'Invoice Templates', route: '/invoice-templates', icon: 'template' }
      );
    }
    if (this.auth.isSuperAdmin()) {
      items.push({ label: 'Super Admin', route: '/super-admin', icon: 'shield' });
    }
    return items;
  });

  constructor(public auth: AuthService, public theme: ThemeService, public router: Router) {
    // Locks background scroll while the full-width mobile drawer is open —
    // otherwise the page behind it keeps scrolling under the fixed overlay.
    effect(() => {
      if (this.menuOpen()) pushScrollLock(); else popScrollLock();
    });
  }

  orgInitials(): string {
    const name = this.auth.organisation()?.name || this.auth.user()?.name || '?';
    return name.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('');
  }

  toggleCollapse() {
    this.collapsed.update(v => !v);
    localStorage.setItem(COLLAPSE_KEY, this.collapsed() ? '1' : '0');
  }

  toggleUserMenu(event: Event) {
    event.stopPropagation();
    this.userMenuOpen.update(v => !v);
  }

  @HostListener('document:click')
  closeUserMenu() {
    this.userMenuOpen.set(false);
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      this.quickSearch()?.focusInput();
    }
  }
}
