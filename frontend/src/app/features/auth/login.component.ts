import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ApiService } from '../../core/api.service';
import { PublicBranding } from '../../core/models';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="auth-page">
      <section class="auth-panel page-enter">
        <div style="max-width:360px;width:100%;margin:0 auto;">
          <div class="brand" style="margin-bottom:34px;">
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
          <h1 style="margin:0 0 6px;font-size:24px;letter-spacing:-0.4px;">Welcome back</h1>
          <p style="margin:0 0 26px;color:var(--muted);font-size:14px;">Sign in to manage your invoices and payments.</p>

          <form class="form" (ngSubmit)="submit()">
            <div class="field">
              <label for="email">Email address</label>
              <input id="email" name="email" type="email" [(ngModel)]="email" placeholder="you@company.com" autocomplete="email" required />
            </div>
            <div class="field">
              <label for="password">Password</label>
              <div style="position:relative;">
                <input id="password" name="password" [type]="showPassword() ? 'text' : 'password'"
                  [(ngModel)]="password" placeholder="••••••••" autocomplete="current-password" required
                  style="padding-right:64px;" />
                <button type="button" (click)="showPassword.set(!showPassword())"
                  style="position:absolute;right:8px;top:50%;transform:translateY(-50%);border:0;background:transparent;color:var(--brand);font-size:11px;font-weight:700;cursor:pointer;">
                  {{ showPassword() ? 'HIDE' : 'SHOW' }}
                </button>
              </div>
            </div>
            @if (error()) {
              <div class="info-box danger">{{ error() }}</div>
            }
            <button class="btn primary lg block" type="submit" [disabled]="loading()">
              @if (loading()) { <span class="spinner"></span> Signing in… } @else { Sign In }
            </button>
          </form>

          <p style="margin-top:22px;color:var(--muted);font-size:13px;text-align:center;">
            New to {{ branding()?.appName || 'Klogu Bizz' }}? <a routerLink="/register" style="color:var(--brand);font-weight:600;">Create an account</a>
          </p>
          <div class="info-box" style="margin-top:18px;">
            <strong>Demo logins</strong><br />
            Tenant admin: admin&#64;techsoft.local / Admin&#64;123<br />
            Super admin: superadmin&#64;klogubizz.local / SuperAdmin&#64;123
          </div>
        </div>
      </section>
      <section class="auth-art"
        [style.background]="'linear-gradient(135deg,' + (branding()?.primaryColor || '#1e1b4b') + ' 0%,' + (branding()?.secondaryColor || '#312e81') + ' 55%,' + (branding()?.accentColor || '#4f46e5') + ' 100%)'">
        <h2>GST billing that runs itself.</h2>
        <p>
          Create GST-compliant invoices in seconds, track payments and reminders automatically,
          and keep your whole team on the same page — from one clean dashboard.
        </p>
        <div class="art-badges">
          <span class="art-badge">✓ CGST · SGST · IGST automatic</span>
          <span class="art-badge">✓ Payment tracking</span>
          <span class="art-badge">✓ Multi-user roles</span>
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
  branding = signal<PublicBranding | null>(null);

  constructor(private auth: AuthService, private api: ApiService, private router: Router) {}

  ngOnInit() {
    this.api.publicBranding().subscribe({ next: b => this.branding.set(b), error: () => {} });
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
