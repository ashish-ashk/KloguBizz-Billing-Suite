import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ApiService } from '../../core/api.service';
import { PublicBranding } from '../../core/models';
import { IconComponent } from '../../shared/icons';
import { AuthPreviewCardComponent } from '../../shared/auth-preview-card.component';
import { ToastsComponent } from '../../shared/ui';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink, IconComponent, AuthPreviewCardComponent, ToastsComponent],
  template: `
    <app-toasts />
    <div class="auth-page">
      <section class="auth-panel page-enter">
        <div style="max-width:360px;width:100%;margin:0 auto;">
          <div class="brand" style="margin-bottom:30px;">
            @if (branding()?.logoUrl) {
              <img [src]="branding()?.logoUrl" alt="Logo" style="width:36px;height:36px;border-radius:10px;object-fit:contain;flex-shrink:0;" />
            } @else {
              <div class="brand-mark" [style.background]="'linear-gradient(135deg,' + (branding()?.accentColor || '#818cf8') + ',' + (branding()?.primaryColor || '#4f46e5') + ')'">K</div>
            }
            <div>
              <div class="brand-name" style="color:var(--text)">{{ branding()?.appName || 'Klogu Bizz' }}</div>
              <div class="brand-sub" style="color:var(--muted)">{{ branding()?.tagline || 'GST Billing Suite' }}</div>
            </div>
          </div>
          <div class="auth-eyebrow"><app-icon name="lock" [size]="11" /> Secure Sign In</div>
          <h1 style="margin:0 0 6px;font-size:25px;letter-spacing:-0.4px;">Welcome back</h1>
          <p style="margin:0 0 26px;color:var(--muted);font-size:14px;">Sign in to manage your invoices and payments.</p>

          @if (justRegistered()) {
            <div class="info-box ok" style="margin-bottom:18px;display:flex;gap:8px;align-items:flex-start;">
              <app-icon name="checkCircle" [size]="15" style="flex-shrink:0;margin-top:1px" />
              <span>Account created successfully — sign in to continue.</span>
            </div>
          }

          <form class="form" (ngSubmit)="submit()">
            <div class="field">
              <label for="email">Email address</label>
              <div class="auth-field">
                <app-icon name="mail" [size]="15" class="field-icon" />
                <input id="email" name="email" type="email" [(ngModel)]="email" placeholder="you@company.com" autocomplete="email" required />
              </div>
            </div>
            <div class="field">
              <label for="password">Password</label>
              <div class="auth-field">
                <app-icon name="lock" [size]="15" class="field-icon" />
                <input id="password" name="password" [type]="showPassword() ? 'text' : 'password'"
                  [(ngModel)]="password" placeholder="••••••••" autocomplete="current-password" required
                  style="padding-right:36px;" />
                <button type="button" class="link-btn" [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'"
                  (click)="showPassword.set(!showPassword())">
                  <app-icon [name]="showPassword() ? 'eyeOff' : 'eye'" [size]="15" />
                </button>
              </div>
            </div>
            @if (error()) {
              <div class="info-box danger">{{ error() }}</div>
            }
            <button class="btn primary lg block" type="submit" [disabled]="loading()">
              @if (loading()) { <span class="spinner"></span> Signing in… } @else { Sign In <app-icon name="chevronRight" [size]="15" /> }
            </button>
          </form>

          <p style="margin-top:20px;color:var(--muted);font-size:13px;text-align:center;">
            New to {{ branding()?.appName || 'Klogu Bizz' }}? <a routerLink="/register" style="color:var(--brand);font-weight:600;">Create an account</a>
          </p>

          <button type="button" class="btn ghost block sm" style="margin-top:14px;" (click)="showDemo.set(!showDemo())">
            <app-icon name="lock" [size]="14" />
            {{ showDemo() ? 'Hide demo credentials' : 'View demo credentials' }}
          </button>
          @if (showDemo()) {
            <div class="info-box" style="margin-top:10px;font-size:11.5px;">
              <strong>Demo logins</strong><br />
              Tenant admin: admin&#64;techsoft.local / Admin&#64;123<br />
              Super admin: superadmin&#64;klogubizz.local / SuperAdmin&#64;123
            </div>
          }
        </div>
      </section>
      <section class="auth-art"
        [style.background]="'linear-gradient(135deg,' + (branding()?.primaryColor || '#1e1b4b') + ' 0%,' + (branding()?.secondaryColor || '#312e81') + ' 55%,' + (branding()?.accentColor || '#4f46e5') + ' 100%)'">
        <app-auth-preview-card [accentColor]="branding()?.accentColor || '#818cf8'" />
        <div>
          <h2>Billing software, your team will actually trust.</h2>
          <p>
            Every invoice computes CGST, SGST and IGST server-side from state codes — no manual tax
            math, no spreadsheet drift. Payments, reminders and your whole team stay on one ledger.
          </p>
          <div class="art-badges">
            <span class="art-badge"><app-icon name="check" [size]="12" /> CGST · SGST · IGST automatic</span>
            <span class="art-badge"><app-icon name="check" [size]="12" /> Payment tracking</span>
            <span class="art-badge"><app-icon name="check" [size]="12" /> Multi-user roles</span>
          </div>
          <div class="auth-trust">
            <span><app-icon name="shield" [size]="13" /> Isolated data per organisation</span>
            <span><app-icon name="lock" [size]="13" /> Encrypted credentials</span>
            <span><app-icon name="checkCircle" [size]="13" /> Built for Indian GST</span>
          </div>
        </div>
      </section>
    </div>
  `
})
export class LoginComponent implements OnInit {
  email = '';
  password = '';
  error = signal('');
  loading = signal(false);
  showPassword = signal(false);
  showDemo = signal(false);
  justRegistered = signal(false);
  branding = signal<PublicBranding | null>(null);

  constructor(private auth: AuthService, private api: ApiService, private router: Router, private route: ActivatedRoute) {}

  ngOnInit() {
    this.api.publicBranding().subscribe({ next: b => this.branding.set(b), error: () => {} });
    const params = this.route.snapshot.queryParamMap;
    if (params.get('registered')) {
      this.justRegistered.set(true);
      this.email = params.get('email') || '';
    }
  }

  submit() {
    if (!this.email || !this.password) {
      this.error.set('Enter your email and password.');
      return;
    }
    this.error.set('');
    this.loading.set(true);
    this.auth.login(this.email.trim(), this.password).subscribe({
      next: res => this.router.navigateByUrl(res.user.role === 'superadmin' ? '/super-admin' : '/dashboard'),
      error: err => {
        this.loading.set(false);
        this.error.set(err?.error?.message || 'Invalid email or password.');
      }
    });
  }
}
