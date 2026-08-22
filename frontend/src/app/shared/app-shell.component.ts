import { Component, HostListener, Input, computed, effect, signal, viewChild } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { ThemeService } from '../core/theme.service';
import { AvatarComponent, PillComponent, ToastsComponent, popScrollLock, pushScrollLock } from './ui';
import { IconComponent } from './icons';
import { CommandItem, QuickSearchComponent } from './quick-search.component';
import { ToastService } from '../core/toast.service';

const COLLAPSE_KEY = 'klogubizz_sidebar_collapsed';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, ToastsComponent, AvatarComponent, PillComponent, IconComponent, QuickSearchComponent],
  template: `
    @if (auth.impersonation(); as imp) {
      <!--
        The impersonation bar.

        Deliberately loud, fixed, full-width and unmissable, and it carries the
        three facts that stop this being dangerous: whose account this is, whether
        the session can write, and when it lapses. A support tool that lets someone
        forget they are inside a customer's account is how a customer's books get
        edited by accident.
      -->
      <div class="impersonation-bar no-print" [class.readonly]="imp.readOnly">
        <app-icon name="eye" [size]="15" />
        <span class="imp-text">
          Viewing as <strong>{{ auth.user()?.name }}</strong>
          @if (imp.orgName || auth.organisation()?.name) { <span>at <strong>{{ imp.orgName || auth.organisation()?.name }}</strong></span> }
          · {{ imp.readOnly ? 'read-only' : 'READ-WRITE — changes are real' }}
          @if (impersonationMinutesLeft() !== null) { <span class="imp-timer">· {{ impersonationMinutesLeft() }} min left</span> }
        </span>
        <button class="btn sm" type="button" (click)="auth.endImpersonation()">Exit support session</button>
      </div>
    }
    <button class="menu-toggle no-print" type="button" [class.drawer-open]="menuOpen()" (click)="menuOpen.set(!menuOpen())" aria-label="Toggle menu">
      <app-icon name="menu" [size]="17" />
    </button>
    <div class="drawer-backdrop no-print" [class.show]="menuOpen()" (click)="menuOpen.set(false)"></div>
    <div class="shell" [class.sidebar-collapsed]="collapsed()">
      <aside class="sidebar no-print" [class.open]="menuOpen()" [class.collapsed]="collapsed()">
        <div class="sidebar-logo">
          <div class="brand">
            @if (orgLogo()) {
              <img [src]="orgLogo()" alt="Logo" class="brand-logo-img" />
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
            <a routerLink="/sales-documents" routerLinkActive="active" title="Quotes &amp; Challans"><span class="nav-icon"><app-icon name="fileText" /></span><span class="nav-label">Quotes &amp; Challans</span></a>
            @if (can('recurringInvoices')) {
              <a routerLink="/recurring" routerLinkActive="active" title="Recurring Invoices"><span class="nav-icon"><app-icon name="clock" /></span><span class="nav-label">Recurring</span></a>
            }
            <div class="nav-section">Management</div>
            <a routerLink="/clients" routerLinkActive="active" title="Clients"><span class="nav-icon"><app-icon name="users" /></span><span class="nav-label">Clients</span></a>
            <a routerLink="/items" routerLinkActive="active" title="Items"><span class="nav-icon"><app-icon name="box" /></span><span class="nav-label">Items</span></a>
            @if (can('inventory')) {
              <a routerLink="/inventory" routerLinkActive="active" title="Inventory"><span class="nav-icon"><app-icon name="package" /></span><span class="nav-label">Inventory</span></a>
            }
            <a routerLink="/payments" routerLinkActive="active" title="Payments"><span class="nav-icon"><app-icon name="creditCard" /></span><span class="nav-label">Payments</span></a>
            @if (can('purchases')) {
              <a routerLink="/purchases" routerLinkActive="active" title="Purchases"><span class="nav-icon"><app-icon name="inbox" /></span><span class="nav-label">Purchases</span></a>
            }
            @if (can('receivables')) {
              <a routerLink="/receivables" routerLinkActive="active" title="Receivables"><span class="nav-icon"><app-icon name="clock" /></span><span class="nav-label">Receivables</span></a>
            }
            @if (can('profitLoss')) {
              <a routerLink="/profit-loss" routerLinkActive="active" title="Profit &amp; Loss"><span class="nav-icon"><app-icon name="rupee" /></span><span class="nav-label">Profit &amp; Loss</span></a>
            }
            <a routerLink="/reports" routerLinkActive="active" title="Reports"><span class="nav-icon"><app-icon name="chart" /></span><span class="nav-label">Reports</span></a>
            <a routerLink="/gst-returns" routerLinkActive="active" title="GST Returns"><span class="nav-icon"><app-icon name="percent" /></span><span class="nav-label">GST Returns</span></a>
            <a routerLink="/users" routerLinkActive="active" title="Users &amp; Roles"><span class="nav-icon"><app-icon name="shieldUser" /></span><span class="nav-label">Users &amp; Roles</span></a>
            <a routerLink="/subscription" routerLinkActive="active" title="Subscription"><span class="nav-icon"><app-icon name="package" /></span><span class="nav-label">Subscription</span></a>
            <a routerLink="/security" routerLinkActive="active" title="Security &amp; Privacy"><span class="nav-icon"><app-icon name="lock" /></span><span class="nav-label">Security &amp; Privacy</span></a>
            @if (auth.user()?.role === 'admin') {
              <a routerLink="/activity" routerLinkActive="active" title="Activity Log"><span class="nav-icon"><app-icon name="eye" /></span><span class="nav-label">Activity Log</span></a>
            }
            @if (auth.user()?.role === 'admin') {
              <div class="nav-section">Customize</div>
              <a routerLink="/appearance" routerLinkActive="active" title="Appearance"><span class="nav-icon"><app-icon name="palette" /></span><span class="nav-label">Appearance</span></a>
              @if (can('customBranding')) {
              <a routerLink="/invoice-templates" routerLinkActive="active" title="Invoice Templates"><span class="nav-icon"><app-icon name="template" /></span><span class="nav-label">Invoice Templates</span></a>
            }
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
          <!-- The logo lives in the sidebar only. It used to be repeated here as
               well, which showed the same mark twice on desktop. The topbar-left
               wrapper stays, because it is grid column 1 of the mobile topbar
               (see .topbar in styles.css) — the search column's centring depends
               on it existing. -->
          <div class="topbar-left">
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
                  @if (auth.hasMultipleOrgs()) {
                    <!-- Org-switcher (#53, #54). Only rendered at all once an
                         identity actually holds more than one membership —
                         the common case never sees this section. -->
                    <div class="user-dropdown-divider"></div>
                    <div class="user-dropdown-label">Switch organisation</div>
                    @for (m of auth.memberships(); track m.orgId) {
                      <button type="button" class="user-dropdown-org" [disabled]="switchingOrg()"
                        [class.active]="m.orgId === auth.organisation()?._id" (click)="switchOrg(m.orgId)">
                        <span>{{ m.orgName }}</span>
                        @if (m.orgId === auth.organisation()?._id) { <app-icon name="check" [size]="13" /> }
                      </button>
                    }
                  }
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
                @if (statusReason()) {
                  <!-- The reason an operator gave. "Suspended" with no explanation
                       is a support ticket, and the tenant is the person who most
                       needs to know why. -->
                  <span><strong>Reason:</strong> {{ statusReason() }}</span><br />
                }
                You can still view, print and export everything you have already recorded, but new
                changes cannot be saved.
                @if (orgStatus() === 'suspended') {
                  <a routerLink="/subscription" style="color:inherit;font-weight:700;text-decoration:underline;">Check your subscription</a>
                  or contact support to restore access.
                }
              </div>
            </div>
          }
          @for (notice of auth.notices(); track notice.message) {
            <!-- Operator-authored banners: a platform-wide announcement and/or a
                 message addressed to this tenant. Expiry is enforced server-side,
                 so a lapsed banner disappears even in a tab that stayed open. -->
            <div class="info-box no-print" [class.danger]="notice.level === 'danger'" [class.warn]="notice.level === 'warning'"
              style="margin-bottom:18px;display:flex;gap:10px;align-items:flex-start;">
              <app-icon [name]="notice.level === 'info' ? 'inbox' : 'alertTriangle'" [size]="16" style="flex-shrink:0;margin-top:1px" />
              <div style="line-height:1.6;">{{ notice.message }}</div>
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
  switchingOrg = signal(false);
  collapsed = signal(localStorage.getItem(COLLAPSE_KEY) === '1');
  quickSearch = viewChild(QuickSearchComponent);

  /**
   * The organisation's logo, resolved to a cacheable asset URL.
   *
   * It used to be read straight off `brandingConfig.logoUrl`, which was a base64
   * data URI embedded in every `/auth/me` response — so the same 500KB of image
   * came down the wire on every page load and every route change. The API now
   * returns a content-addressed URL that the browser caches once and never
   * re-requests. See services/brandingAssetService.js.
   */
  orgLogo = computed(() => this.api.assetUrl(this.auth.organisation()?.brandingConfig?.logoAssetUrl));

  /** Organisation status, which now genuinely gates writes server-side. */
  orgStatus = computed(() => this.auth.organisation()?.status);
  /** The reason an operator gave when suspending or cancelling, if any. */
  statusReason = computed(() => this.auth.organisation()?.statusReason || '');

  /**
   * Minutes until the support session lapses. Recomputed on a ticking signal rather
   * than once, so the number counts down instead of freezing at whatever it was
   * when the page loaded — a stale "30 min left" is worse than no timer.
   */
  private clock = signal(Date.now());
  impersonationMinutesLeft = computed<number | null>(() => {
    const expiresAt = this.auth.impersonation()?.expiresAt;
    if (!expiresAt) return null;
    const remaining = new Date(expiresAt).getTime() - this.clock();
    return remaining > 0 ? Math.ceil(remaining / 60000) : 0;
  });
  /** Suspended and cancelled accounts are read-only, not signed out. */
  accountBlocked = computed(() => {
    const status = this.orgStatus();
    return status === 'suspended' || status === 'cancelled';
  });

  /**
   * Whether the plan includes a capability.
   *
   * Hiding rather than disabling: a greyed-out menu of things somebody has not
   * bought is a permanent advertisement inside the product they are paying for.
   * The Subscription page is where the upsell belongs, and it lists every plan.
   */
  can(key: string): boolean {
    return this.auth.can(key);
  }

  commandItems = computed<CommandItem[]>(() => {
    const items: CommandItem[] = [
      { label: 'Dashboard', route: '/dashboard', icon: 'dashboard' },
      { label: 'Invoices', route: '/invoices', icon: 'invoice' },
      { label: 'Bill Generator', route: '/bill-generator', icon: 'calculator' },
      { label: 'Quotations', route: '/sales-documents', icon: 'fileText' },
      { label: 'Delivery Challans', route: '/sales-documents', icon: 'fileText' },
      ...(this.can('recurringInvoices') ? [{ label: 'Recurring Invoices', route: '/recurring', icon: 'clock' }] : []),
      { label: 'Clients', route: '/clients', icon: 'users' },
      { label: 'Items', route: '/items', icon: 'box' },
      ...(this.can('inventory') ? [
        { label: 'Inventory', route: '/inventory', icon: 'package' },
        { label: 'Stock ledger', route: '/inventory', icon: 'package' },
        { label: 'Low stock', route: '/inventory', icon: 'package' }
      ] : []),
      ...(this.can('stockValuation') ? [{ label: 'Stock valuation', route: '/inventory', icon: 'package' }] : []),
      { label: 'Payments', route: '/payments', icon: 'creditCard' },
      ...(this.can('purchases') ? [{ label: 'Purchases', route: '/purchases', icon: 'inbox' }] : []),
      ...(this.can('receivables') ? [{ label: 'Receivables', route: '/receivables', icon: 'clock' }] : []),
      ...(this.can('profitLoss') ? [{ label: 'Profit & Loss', route: '/profit-loss', icon: 'rupee' }] : []),
      ...(this.can('expenses') ? [{ label: 'Expenses', route: '/profit-loss', icon: 'rupee' }] : []),
      { label: 'Reports', route: '/reports', icon: 'chart' },
      { label: 'GST Returns', route: '/gst-returns', icon: 'percent' },
      { label: 'Security & Privacy', route: '/security', icon: 'lock' },
      { label: 'Users & Roles', route: '/users', icon: 'shieldUser' },
      { label: 'Subscription', route: '/subscription', icon: 'package' }
    ];
    if (this.auth.user()?.role === 'admin') {
      items.push(
        { label: 'Appearance', route: '/appearance', icon: 'palette' },
        ...(this.can('customBranding') ? [{ label: 'Invoice Templates', route: '/invoice-templates', icon: 'template' }] : [])
      );
    }
    if (this.auth.isSuperAdmin()) {
      items.push({ label: 'Super Admin', route: '/super-admin', icon: 'shield' });
    }
    return items;
  });

  /**
   * Escape closes the drawer.
   *
   * It covers the whole screen below 881px, which includes a narrowed desktop
   * window where there is a keyboard and no backdrop worth hunting for. Every
   * dialog in the app closes this way; the drawer behaving differently is just a
   * thing to learn.
   */
  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.menuOpen()) this.menuOpen.set(false);
  }

  constructor(
    public auth: AuthService,
    public theme: ThemeService,
    public router: Router,
    private api: ApiService,
    private toast: ToastService
  ) {
    // Locks background scroll while the full-width mobile drawer is open —
    // otherwise the page behind it keeps scrolling under the fixed overlay.
    effect(() => {
      if (this.menuOpen()) pushScrollLock(); else popScrollLock();
    });

    /**
     * Reconciles the session with the server on load.
     *
     * The app cached the organisation at login and never asked again, so a
     * suspension, a feature flag or a message addressed to this tenant stayed
     * invisible for the rest of the session. This is one request per app load, and
     * it is what makes every banner above actually appear.
     */
    this.auth.refreshSession().subscribe({ error: () => {} });

    // The impersonation bar is fixed-position, so the layout below it has to make
    // room. A class on <body> is the only place a fixed overlay's offset can be
    // applied to everything at once, including the fixed sidebar and topbar.
    effect(() => {
      document.body.classList.toggle('has-impersonation-bar', this.auth.isImpersonating());
    });

    // Ticks the countdown in the bar. One-minute resolution is what is displayed,
    // and the interval is only created when a session is actually running.
    effect(onCleanup => {
      if (!this.auth.isImpersonating()) return;
      const timer = setInterval(() => this.clock.set(Date.now()), 30_000);
      onCleanup(() => clearInterval(timer));
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

  /** Switches into another organisation this identity belongs to (#53, #54).
   *  Navigates back to the dashboard afterward — whatever record the current
   *  page was showing belongs to the org just left. */
  switchOrg(targetOrgId: string) {
    if (targetOrgId === this.auth.organisation()?._id) { this.userMenuOpen.set(false); return; }
    this.switchingOrg.set(true);
    this.auth.switchOrg(targetOrgId).subscribe({
      next: () => {
        this.switchingOrg.set(false);
        this.userMenuOpen.set(false);
        this.router.navigateByUrl('/dashboard');
      },
      error: err => {
        this.switchingOrg.set(false);
        this.toast.httpError(err);
      }
    });
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
