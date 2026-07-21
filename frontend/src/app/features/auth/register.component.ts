import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ApiService } from '../../core/api.service';
import { PublicBranding } from '../../core/models';
import { STATES, isValidEmail } from '../../core/format';
import { IconComponent } from '../../shared/icons';
import { AuthPreviewCardComponent } from '../../shared/auth-preview-card.component';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink, IconComponent, AuthPreviewCardComponent],
  template: `
    <div class="auth-page">
      <section class="auth-panel page-enter">
        <div style="max-width:380px;width:100%;margin:0 auto;">
          <div class="brand" style="margin-bottom:24px;">
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
          <div class="auth-eyebrow"><app-icon name="checkCircle" [size]="11" /> 14-Day Free Trial</div>
          <h1 style="margin:0 0 6px;font-size:25px;letter-spacing:-0.4px;">Create your organisation</h1>
          <p style="margin:0 0 24px;color:var(--muted);font-size:14px;">No credit card required · Cancel anytime</p>

          <form class="form" (ngSubmit)="submit()">
            <div class="field">
              <label for="name">Your full name</label>
              <input id="name" name="name" [(ngModel)]="name" placeholder="Priya Sharma" required />
            </div>
            <div class="field">
              <label for="orgName">Company name</label>
              <input id="orgName" name="orgName" [(ngModel)]="orgName" placeholder="Acme Traders Pvt Ltd" required />
            </div>
            <div class="field">
              <label for="email">Work email</label>
              <div class="auth-field">
                <app-icon name="mail" [size]="15" class="field-icon" />
                <input id="email" name="email" type="email" [(ngModel)]="email" placeholder="you@company.com" required />
              </div>
            </div>
            <div class="field">
              <label for="password">Password</label>
              <div class="auth-field">
                <app-icon name="lock" [size]="15" class="field-icon" />
                <input id="password" name="password" [type]="showPassword() ? 'text' : 'password'"
                  [(ngModel)]="password" placeholder="At least 8 characters" required style="padding-right:36px;" />
                <button type="button" class="link-btn" [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'"
                  (click)="showPassword.set(!showPassword())">
                  <app-icon [name]="showPassword() ? 'eyeOff' : 'eye'" [size]="15" />
                </button>
              </div>
              @if (password && password.length < 8) {
                <span class="error">Password must be at least 8 characters.</span>
              }
            </div>
            <div class="field">
              <label for="state">State (for GST)</label>
              <select id="state" name="stateCode" [(ngModel)]="stateCode">
                @for (s of states; track s.code) {
                  <option [value]="s.code">{{ s.name }} ({{ s.code }})</option>
                }
              </select>
              <span class="hint">Used to decide CGST/SGST vs IGST on your invoices.</span>
            </div>
            <label class="checkbox" style="align-items:flex-start;flex-wrap:wrap;line-height:1.5;">
              <input type="checkbox" name="acceptTerms" [(ngModel)]="acceptTerms" style="margin-top:2px;">
              <span>
                I agree to the <a routerLink="/terms" target="_blank" style="color:var(--brand);font-weight:600;">Terms &amp; Conditions</a>
                and <a routerLink="/sla" target="_blank" style="color:var(--brand);font-weight:600;">Service Level Agreement</a>
              </span>
            </label>
            @if (error()) {
              <div class="info-box danger">{{ error() }}</div>
            }
            <button class="btn primary lg block" type="submit" [disabled]="loading() || !acceptTerms">
              @if (loading()) { <span class="spinner"></span> Creating account… } @else { Create Account <app-icon name="chevronRight" [size]="15" /> }
            </button>
          </form>

          <p style="margin-top:20px;color:var(--muted);font-size:13px;text-align:center;">
            Already have an account? <a routerLink="/login" style="color:var(--brand);font-weight:600;">Sign in</a>
          </p>
        </div>
      </section>
      <section class="auth-art"
        [style.background]="'linear-gradient(135deg,' + (branding()?.primaryColor || '#1e1b4b') + ' 0%,' + (branding()?.secondaryColor || '#312e81') + ' 55%,' + (branding()?.accentColor || '#4f46e5') + ' 100%)'">
        <app-auth-preview-card [accentColor]="branding()?.accentColor || '#818cf8'" />
        <div>
          <h2>Launch-ready from day one.</h2>
          <p>
            Your organisation gets its own isolated workspace — clients, invoices, payments and team
            roles — with GST math handled server-side, every time.
          </p>
          <div class="art-badges">
            <span class="art-badge"><app-icon name="check" [size]="12" /> Tenant isolation</span>
            <span class="art-badge"><app-icon name="check" [size]="12" /> Invoice numbering</span>
            <span class="art-badge"><app-icon name="check" [size]="12" /> Free trial</span>
          </div>
          <div class="auth-trust">
            <span><app-icon name="shield" [size]="13" /> Isolated data per organisation</span>
            <span><app-icon name="lock" [size]="13" /> Encrypted credentials</span>
            <span><app-icon name="checkCircle" [size]="13" /> No credit card required</span>
          </div>
        </div>
      </section>
    </div>
  `
})
export class RegisterComponent implements OnInit {
  name = '';
  orgName = '';
  email = '';
  password = '';
  stateCode = '27';
  acceptTerms = false;
  states = STATES;
  error = signal('');
  loading = signal(false);
  showPassword = signal(false);
  branding = signal<PublicBranding | null>(null);

  constructor(private auth: AuthService, private api: ApiService, private router: Router) {}

  ngOnInit() {
    this.api.publicBranding().subscribe({ next: b => this.branding.set(b), error: () => {} });
  }

  submit() {
    if (!this.name.trim() || !this.orgName.trim()) { this.error.set('Enter your name and company name.'); return; }
    if (!isValidEmail(this.email)) { this.error.set('Enter a valid email address.'); return; }
    if (this.password.length < 8) { this.error.set('Password must be at least 8 characters.'); return; }
    if (!this.acceptTerms) { this.error.set('Please accept the Terms & Conditions and SLA to continue.'); return; }
    this.error.set('');
    this.loading.set(true);
    const email = this.email.trim();
    this.auth.register({
      name: this.name.trim(),
      orgName: this.orgName.trim(),
      email,
      password: this.password,
      stateCode: this.stateCode,
      acceptTerms: this.acceptTerms
    }).subscribe({
      next: () => this.router.navigate(['/login'], { queryParams: { registered: 1, email } }),
      error: err => {
        this.loading.set(false);
        this.error.set(err?.error?.message || 'Registration failed. Please try again.');
      }
    });
  }
}
