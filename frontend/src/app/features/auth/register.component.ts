import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ApiService } from '../../core/api.service';
import { PublicBranding } from '../../core/models';
import { STATES, isValidEmail } from '../../core/format';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="auth-page">
      <section class="auth-panel page-enter">
        <div style="max-width:380px;width:100%;margin:0 auto;">
          <div class="brand" style="margin-bottom:28px;">
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
          <h1 style="margin:0 0 6px;font-size:24px;letter-spacing:-0.4px;">Create your organisation</h1>
          <p style="margin:0 0 24px;color:var(--muted);font-size:14px;">14-day free trial · No credit card required</p>

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
              <input id="email" name="email" type="email" [(ngModel)]="email" placeholder="you@company.com" required />
            </div>
            <div class="field">
              <label for="password">Password</label>
              <input id="password" name="password" type="password" [(ngModel)]="password" placeholder="At least 8 characters" required />
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
            @if (error()) {
              <div class="info-box danger">{{ error() }}</div>
            }
            <button class="btn primary lg block" type="submit" [disabled]="loading()">
              @if (loading()) { <span class="spinner"></span> Creating account… } @else { Create Account }
            </button>
          </form>

          <p style="margin-top:20px;color:var(--muted);font-size:13px;text-align:center;">
            Already have an account? <a routerLink="/login" style="color:var(--brand);font-weight:600;">Sign in</a>
          </p>
        </div>
      </section>
      <section class="auth-art"
        [style.background]="'linear-gradient(135deg,' + (branding()?.primaryColor || '#1e1b4b') + ' 0%,' + (branding()?.secondaryColor || '#312e81') + ' 55%,' + (branding()?.accentColor || '#4f46e5') + ' 100%)'">
        <h2>Launch-ready from day one.</h2>
        <p>
          Your organisation gets its own isolated workspace — clients, invoices, payments and team
          roles — with GST math handled server-side, every time.
        </p>
        <div class="art-badges">
          <span class="art-badge">✓ Tenant isolation</span>
          <span class="art-badge">✓ Invoice numbering</span>
          <span class="art-badge">✓ Free trial</span>
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
  states = STATES;
  error = signal('');
  loading = signal(false);
  branding = signal<PublicBranding | null>(null);

  constructor(private auth: AuthService, private api: ApiService, private router: Router) {}

  ngOnInit() {
    this.api.publicBranding().subscribe({ next: b => this.branding.set(b), error: () => {} });
  }

  submit() {
    if (!this.name.trim() || !this.orgName.trim()) { this.error.set('Enter your name and company name.'); return; }
    if (!isValidEmail(this.email)) { this.error.set('Enter a valid email address.'); return; }
    if (this.password.length < 8) { this.error.set('Password must be at least 8 characters.'); return; }
    this.error.set('');
    this.loading.set(true);
    this.auth.register({
      name: this.name.trim(),
      orgName: this.orgName.trim(),
      email: this.email.trim(),
      password: this.password,
      stateCode: this.stateCode
    }).subscribe({
      next: () => this.router.navigateByUrl('/dashboard'),
      error: err => {
        this.loading.set(false);
        this.error.set(err?.error?.message || 'Registration failed. Please try again.');
      }
    });
  }
}
