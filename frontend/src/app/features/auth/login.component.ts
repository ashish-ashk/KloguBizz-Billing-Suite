import { AfterViewChecked, Component, ElementRef, OnInit, ViewChild, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ApiService } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { PublicBranding } from '../../core/models';
import { IconComponent } from '../../shared/icons';
import { AuthPreviewCardComponent } from '../../shared/auth-preview-card.component';
import { ToastsComponent, ModalComponent } from '../../shared/ui';
import { LegalContentComponent } from '../../shared/legal-content.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink, IconComponent, AuthPreviewCardComponent, ToastsComponent, ModalComponent, LegalContentComponent],
  template: `
    <app-toasts />
    <div class="auth-page">
      <section class="auth-panel page-enter">
        <div style="max-width:360px;width:100%;margin:0 auto;">
          <div class="brand auth-brand" style="margin-bottom:30px;">
            @if (brandLogo()) {
              <img [src]="brandLogo()" alt="Logo" class="auth-brand-logo" />
            } @else {
              <img src="klogu-logo.png" alt="Klogu Bizz" class="auth-brand-logo" />
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

          @if (mfaToken()) {
            <!--
              Step two. The server issues no token at all until the code is
              presented (see authController.login), so this is not an optional
              extra screen: without it, an account with 2FA enabled simply cannot
              sign in. That was the state this page shipped in.
            -->
            <form class="form" (ngSubmit)="submitCode()">
              <div class="info-box" style="display:flex;gap:8px;align-items:flex-start;">
                <app-icon name="lock" [size]="15" style="flex-shrink:0;margin-top:1px" />
                <span>{{ mfaMessage() }}</span>
              </div>
              <div class="field">
                <label for="mfaCode">{{ useBackupCode() ? 'Recovery code' : 'Six-digit code' }}</label>
                <input id="mfaCode" name="mfaCode" class="mono" [(ngModel)]="code"
                  [attr.inputmode]="useBackupCode() ? 'text' : 'numeric'"
                  [attr.maxlength]="useBackupCode() ? 32 : 6"
                  [placeholder]="useBackupCode() ? 'xxxx-xxxx' : '000000'"
                  autocomplete="one-time-code" required #codeInput />
              </div>
              @if (error()) {
                <div class="info-box danger">{{ error() }}</div>
              }
              <button class="btn primary lg block" type="submit" [disabled]="loading() || !code.trim()">
                @if (loading()) { <span class="spinner"></span> Verifying… } @else { Verify <app-icon name="chevronRight" [size]="15" /> }
              </button>
            </form>

            <p style="margin-top:14px;text-align:center;font-size:12.5px;">
              <button type="button" class="link-btn" style="font-size:12.5px;" (click)="toggleBackupCode()">
                {{ useBackupCode() ? 'Use a code from my app instead' : 'I lost my phone — use a recovery code' }}
              </button>
            </p>
            <p style="margin-top:8px;text-align:center;font-size:12.5px;">
              <button type="button" class="link-btn" style="font-size:12.5px;" (click)="cancelMfa()">
                Start over
              </button>
            </p>
          } @else {
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

          <p style="margin-top:16px;text-align:center;">
            <a routerLink="/forgot-password" style="color:var(--brand);font-weight:600;font-size:13px;">Forgot your password?</a>
          </p>

          <p style="margin-top:10px;color:var(--muted);font-size:13px;text-align:center;">
            New to {{ branding()?.appName || 'Klogu Bizz' }}? <a routerLink="/register" style="color:var(--brand);font-weight:600;">Create an account</a>
          </p>

          <p style="margin-top:10px;color:var(--faint,var(--muted));font-size:11.5px;text-align:center;">
            By signing in, you agree to our
            <button type="button" class="link-btn" style="font-size:11.5px;" (click)="legalOpen.set('terms')">Terms &amp; Conditions</button>
            and
            <button type="button" class="link-btn" style="font-size:11.5px;" (click)="legalOpen.set('sla')">SLA</button>.
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

    <app-modal [open]="legalOpen() !== null"
      [title]="legalOpen() === 'sla' ? 'Service Level Agreement' : 'Terms & Conditions'"
      [width]="640" (close)="legalOpen.set(null)">
      @if (legalOpen()) { <app-legal-content [type]="legalOpen()!" /> }
    </app-modal>
  `
})
export class LoginComponent implements OnInit, AfterViewChecked {
  email = '';
  password = '';
  error = signal('');
  loading = signal(false);
  showPassword = signal(false);
  showDemo = signal(false);
  justRegistered = signal(false);
  branding = signal<PublicBranding | null>(null);

  // ── Second factor ────────────────────────────
  /** Non-empty once the password was accepted and a code is owed. Its presence
   *  *is* the step-two flag — there is no separate boolean to fall out of sync. */
  mfaToken = signal('');
  mfaMessage = signal('');
  useBackupCode = signal(false);
  code = '';

  /**
   * The platform logo, as a cacheable asset URL.
   *
   * `/public/branding` is unauthenticated and is hit by every visitor to this
   * page; it used to inline the logo as base64, so the bytes came down on every
   * single visit with no way for the browser to cache them.
   */
  brandLogo = computed(() => this.api.assetUrl(this.branding()?.logoAssetUrl));

  legalOpen = signal<'terms' | 'sla' | null>(null);

  /**
   * Focus moves to the code box when the second step appears.
   *
   * Done here rather than with the `autofocus` attribute: `autofocus` only acts
   * on initial page load, so on this screen — where the field is created by a
   * form submission, not a navigation — it would do nothing at all. It also
   * moves focus without warning on screens where the user did not ask for it,
   * which is why the accessibility lint rejects it outright.
   */
  @ViewChild('codeInput') private codeInput?: ElementRef<HTMLInputElement>;
  private codeFocused = false;

  constructor(
    private auth: AuthService,
    private api: ApiService,
    private router: Router,
    private route: ActivatedRoute,
    private toast: ToastService
  ) {}

  ngOnInit() {
    this.api.publicBranding().subscribe({ next: b => this.branding.set(b), error: () => {} });
    const params = this.route.snapshot.queryParamMap;
    if (params.get('registered')) {
      this.justRegistered.set(true);
      this.email = params.get('email') || '';
    }
  }

  ngAfterViewChecked() {
    if (!this.mfaToken()) { this.codeFocused = false; return; }
    // Guarded, or every change-detection pass would yank the caret back to the
    // start of whatever the user has already typed.
    if (this.codeFocused || !this.codeInput) return;
    this.codeFocused = true;
    this.codeInput.nativeElement.focus();
  }

  submit() {
    if (!this.email || !this.password) {
      this.error.set('Enter your email and password.');
      return;
    }
    this.error.set('');
    this.loading.set(true);
    this.auth.login(this.email.trim(), this.password).subscribe({
      next: res => {
        this.loading.set(false);
        // A correct password on an account with 2FA returns a challenge, not a
        // session: no token, no user. Reading `res.user.role` here would throw,
        // which is exactly what left the page spinning forever.
        if (res.mfaRequired && res.mfaToken) {
          this.mfaToken.set(res.mfaToken);
          this.mfaMessage.set(res.message || 'Enter the six-digit code from your authenticator app.');
          this.password = '';
          return;
        }
        this.land(res.user?.role);
      },
      error: err => {
        this.loading.set(false);
        this.error.set(err?.error?.message || 'Invalid email or password.');
      }
    });
  }

  submitCode() {
    const code = this.code.trim();
    if (!code) return;
    this.error.set('');
    this.loading.set(true);
    this.auth.verifyMfa(this.mfaToken(), code).subscribe({
      next: res => {
        this.loading.set(false);
        if (res.usedBackupCode) {
          const left = res.remainingBackupCodes ?? 0;
          // Said on the way in, not buried in the security page: a recovery code
          // is single-use, and running out with no phone means no way back in.
          this.toast.info(left
            ? `Recovery code used — ${left} left. Generate a new set from Security.`
            : 'That was your last recovery code. Generate a new set from Security now.');
        }
        this.land(res.user?.role);
      },
      error: err => {
        this.loading.set(false);
        const code = err?.error?.code;
        // A lockout or an expired challenge cannot be retried from this screen,
        // so drop back to the password form rather than leaving the user typing
        // codes at a token the server will keep refusing.
        if (code === 'ACCOUNT_LOCKED' || err?.status === 400) {
          this.cancelMfa();
          this.error.set(err?.error?.message || 'That sign-in attempt expired. Please sign in again.');
          return;
        }
        this.error.set(err?.error?.message || 'That code is not right. Try the next one your app shows.');
        this.code = '';
      }
    });
  }

  toggleBackupCode() {
    this.useBackupCode.set(!this.useBackupCode());
    this.code = '';
    this.error.set('');
  }

  cancelMfa() {
    this.mfaToken.set('');
    this.mfaMessage.set('');
    this.useBackupCode.set(false);
    this.code = '';
    this.error.set('');
  }

  private land(role?: string) {
    this.router.navigateByUrl(role === 'superadmin' ? '/super-admin' : '/dashboard');
  }
}
