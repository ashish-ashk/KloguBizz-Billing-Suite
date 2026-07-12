import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ToastsComponent, AvatarComponent } from '../../shared/ui';

@Component({
  selector: 'app-super-admin-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, ToastsComponent, AvatarComponent],
  template: `
    <button class="menu-toggle no-print" type="button" (click)="menuOpen.set(!menuOpen())" aria-label="Toggle menu">☰</button>
    <div class="shell">
      <aside class="sidebar super no-print" [class.open]="menuOpen()">
        <div class="sidebar-logo">
          <div class="brand">
            <div class="brand-mark">K</div>
            <div>
              <div class="brand-name">Klogu Bizz</div>
            </div>
          </div>
          <div style="font-size:10px;background:rgba(220,38,38,.2);color:#fca5a5;border-radius:6px;padding:3px 8px;margin-top:6px;display:inline-block;font-weight:600;">🔐 Owner Control Panel</div>
        </div>
        <nav class="nav" (click)="menuOpen.set(false)">
          <div class="nav-section">Core Management</div>
          <a routerLink="/super-admin/organisations" routerLinkActive="active"><span class="icon">🏢</span> Organizations</a>
          <a routerLink="/super-admin/masters" routerLinkActive="active"><span class="icon">🗄</span> Masters</a>
          <div class="nav-section">Global Settings</div>
          <a routerLink="/super-admin/templates" routerLinkActive="active"><span class="icon">◧</span> Invoice Templates</a>
          <a routerLink="/super-admin/reminders" routerLinkActive="active"><span class="icon">🔔</span> Reminders &amp; Receipts</a>
          <a routerLink="/super-admin/plans" routerLinkActive="active"><span class="icon">💳</span> Subscription Plans</a>
          <a routerLink="/super-admin/branding" routerLinkActive="active"><span class="icon">🎨</span> Branding &amp; Logo</a>
          <a routerLink="/super-admin/profile" routerLinkActive="active"><span class="icon">👤</span> Profile &amp; Security</a>
          <div style="height:1px;background:rgba(255,255,255,.08);margin:14px 12px;"></div>
          <a routerLink="/dashboard"><span class="icon">←</span> Tenant App</a>
        </nav>
        <div class="sidebar-foot">
          <div class="sidebar-org">
            <app-avatar [name]="auth.user()?.name || '?'" [size]="32" />
            <div style="overflow:hidden">
              <div class="org-name">{{ auth.user()?.name || '—' }}</div>
              <div class="org-plan">{{ auth.user()?.email }}</div>
            </div>
          </div>
          <button class="signout-btn" type="button" (click)="auth.logout()">⎋ Sign Out</button>
        </div>
      </aside>
      <main class="main">
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

  constructor(public auth: AuthService) {}
}
