import { Component, HostListener, signal, viewChild } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ToastsComponent, AvatarComponent } from '../../shared/ui';
import { IconComponent } from '../../shared/icons';
import { CommandItem, QuickSearchComponent } from '../../shared/quick-search.component';

const COLLAPSE_KEY = 'klogubizz_sidebar_collapsed';

const SUPER_ADMIN_COMMANDS: CommandItem[] = [
  { label: 'Organizations', route: '/super-admin/organisations', icon: 'package' },
  { label: 'Masters', route: '/super-admin/masters', icon: 'template' },
  { label: 'Invoice Templates', route: '/super-admin/templates', icon: 'invoice' },
  { label: 'Reminders & Receipts', route: '/super-admin/reminders', icon: 'creditCard' },
  { label: 'Subscription Plans', route: '/super-admin/plans', icon: 'chart' },
  { label: 'Branding & Logo', route: '/super-admin/branding', icon: 'palette' },
  { label: 'Profile & Security', route: '/super-admin/profile', icon: 'user' },
  { label: 'Tenant App', route: '/dashboard', icon: 'chevronLeft' }
];

@Component({
  selector: 'app-super-admin-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, ToastsComponent, AvatarComponent, IconComponent, QuickSearchComponent],
  template: `
    <button class="menu-toggle no-print" type="button" (click)="menuOpen.set(!menuOpen())" aria-label="Toggle menu">
      <app-icon name="menu" [size]="19" />
    </button>
    <div class="shell" [class.sidebar-collapsed]="collapsed()">
      <aside class="sidebar super no-print" [class.open]="menuOpen()" [class.collapsed]="collapsed()">
        <div class="sidebar-glow" aria-hidden="true"></div>
        <button class="collapse-toggle no-print" type="button" (click)="toggleCollapse()"
          [attr.aria-label]="collapsed() ? 'Expand sidebar' : 'Collapse sidebar'" [title]="collapsed() ? 'Expand' : 'Collapse'">
          <app-icon [name]="collapsed() ? 'chevronRight' : 'chevronLeft'" [size]="13" />
        </button>
        <div class="sidebar-logo">
          <div class="brand">
            <div class="brand-mark"><app-icon name="shield" [size]="18" /></div>
            <div class="brand-text">
              <div class="brand-name">Klogu Bizz</div>
              <div class="owner-badge"><app-icon name="shield" [size]="10" /><span class="nav-label">Owner Panel</span></div>
            </div>
          </div>
        </div>
        <nav class="nav" (click)="menuOpen.set(false)">
          <div class="nav-section">Core Management</div>
          <a routerLink="/super-admin/organisations" routerLinkActive="active" title="Organizations"><span class="nav-icon"><app-icon name="package" /></span><span class="nav-label">Organizations</span></a>
          <a routerLink="/super-admin/masters" routerLinkActive="active" title="Masters"><span class="nav-icon"><app-icon name="template" /></span><span class="nav-label">Masters</span></a>
          <div class="nav-section">Global Settings</div>
          <a routerLink="/super-admin/templates" routerLinkActive="active" title="Invoice Templates"><span class="nav-icon"><app-icon name="invoice" /></span><span class="nav-label">Invoice Templates</span></a>
          <a routerLink="/super-admin/reminders" routerLinkActive="active" title="Reminders &amp; Receipts"><span class="nav-icon"><app-icon name="creditCard" /></span><span class="nav-label">Reminders &amp; Receipts</span></a>
          <a routerLink="/super-admin/plans" routerLinkActive="active" title="Subscription Plans"><span class="nav-icon"><app-icon name="chart" /></span><span class="nav-label">Subscription Plans</span></a>
          <a routerLink="/super-admin/branding" routerLinkActive="active" title="Branding &amp; Logo"><span class="nav-icon"><app-icon name="palette" /></span><span class="nav-label">Branding &amp; Logo</span></a>
          <a routerLink="/super-admin/profile" routerLinkActive="active" title="Profile &amp; Security"><span class="nav-icon"><app-icon name="user" /></span><span class="nav-label">Profile &amp; Security</span></a>
          <div class="nav-divider"></div>
          <a routerLink="/dashboard" title="Tenant App"><span class="nav-icon"><app-icon name="chevronLeft" /></span><span class="nav-label">Tenant App</span></a>
        </nav>
        <div class="sidebar-foot">
          <div class="sidebar-user-row">
            <div class="sidebar-org">
              <app-avatar [name]="auth.user()?.name || '?'" [size]="32" />
              <div class="org-info">
                <div class="org-name">{{ auth.user()?.name || '—' }}</div>
                <div class="org-plan">{{ auth.user()?.email }}</div>
              </div>
            </div>
            <button class="sidebar-icon-btn nav-label" type="button" (click)="auth.logout()" title="Sign Out" aria-label="Sign Out">
              <app-icon name="logout" [size]="15" />
            </button>
          </div>
        </div>
      </aside>
      <main class="main">
        <div class="topbar no-print">
          <div class="topbar-crumb">
            <span class="crumb-org">Owner Panel</span>
            <app-icon name="chevronRight" [size]="13" class="crumb-sep" />
            <span class="crumb-page">Platform Control</span>
          </div>
          <app-quick-search class="no-print" [items]="commandItems" (navigate)="router.navigateByUrl($event)" />
          <div class="topbar-right">
            <div class="topbar-user" (click)="toggleUserMenu($event)">
              <app-avatar [name]="auth.user()?.name || '?'" [size]="34" />
              <div class="topbar-user-info">
                <div class="topbar-user-name">{{ auth.user()?.name }}</div>
              </div>
              <app-icon name="chevronDown" [size]="14" class="chevron" [class.open]="userMenuOpen()" />
              @if (userMenuOpen()) {
                <div class="user-dropdown" (click)="$event.stopPropagation()">
                  <div class="user-dropdown-head">
                    <app-avatar [name]="auth.user()?.name || '?'" [size]="36" />
                    <div class="user-dropdown-id">
                      <div class="user-dropdown-name">{{ auth.user()?.name }}</div>
                      <div class="user-dropdown-email">{{ auth.user()?.email }}</div>
                    </div>
                  </div>
                  <div class="user-dropdown-divider"></div>
                  <button type="button" (click)="auth.logout()"><app-icon name="logout" [size]="15" /> Sign Out</button>
                </div>
              }
            </div>
          </div>
        </div>
        <div class="page page-enter">
          <router-outlet />
        </div>
      </main>
    </div>
    <app-toasts />
  `
})
export class SuperAdminLayoutComponent {
  menuOpen = signal(false);
  userMenuOpen = signal(false);
  collapsed = signal(localStorage.getItem(COLLAPSE_KEY) === '1');
  commandItems = SUPER_ADMIN_COMMANDS;
  quickSearch = viewChild(QuickSearchComponent);

  constructor(public auth: AuthService, public router: Router) {}

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
