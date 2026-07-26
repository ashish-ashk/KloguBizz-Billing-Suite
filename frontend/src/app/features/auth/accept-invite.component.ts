import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { IconComponent } from '../../shared/icons';
import { ModalComponent } from '../../shared/ui';
import { LegalContentComponent } from '../../shared/legal-content.component';
import { AuthShellComponent } from './auth-shell.component';

/**
 * Redeems a team invitation.
 *
 * This screen did not exist. `inviteUser` emailed a link to
 * `/accept-invite?token=…`, but there was no such route (the URL fell through
 * to the `**` wildcard and redirected to /dashboard) and no backend endpoint to
 * redeem the token — so every invited teammate was permanently locked out.
 */
@Component({
  selector: 'app-accept-invite',
  standalone: true,
  imports: [FormsModule, RouterLink, IconComponent, ModalComponent, LegalContentComponent, AuthShellComponent],
  template: `
    <app-auth-shell
      eyebrow="Team Invitation" eyebrowIcon="users"
      [heading]="invite() ? 'Join ' + (invite()!.orgName || 'the team') : 'Team invitation'"
      [subheading]="invite() ? 'Choose a password to activate your account.' : ''"
      artHeading="One ledger, your whole team."
      artBody="Roles keep everyone on the same invoices and payments without stepping on each other — admins bill, accountants reconcile, viewers report.">

      @if (loading()) {
        <div class="info-box" style="display:flex;gap:10px;align-items:center;">
          <span class="spinner"></span> Checking your invitation…
        </div>
      } @else if (fatalError()) {
        <div class="info-box danger" style="display:flex;gap:8px;align-items:flex-start;">
          <app-icon name="alertTriangle" [size]="15" style="flex-shrink:0;margin-top:1px" />
          <span>{{ fatalError() }}</span>
        </div>
        <p style="margin-top:20px;color:var(--muted);font-size:13px;">
          Ask your administrator to send a new invitation, or
          <a routerLink="/login" style="color:var(--brand);font-weight:600;">sign in</a>
          if you already have an account.
        </p>
      } @else {
        <!-- An "as" binding is only allowed on a primary @if, not on an
             @else if, so it happens in a nested block here. -->
        @if (invite(); as inv) {
        <div class="info-box" style="margin-bottom:18px;">
          <strong>{{ inv.name }}</strong><br />
          <span style="color:var(--muted);">{{ inv.email }}</span>
          · <span class="pill">{{ inv.role }}</span>
        </div>

        <form class="form" (ngSubmit)="submit()">
          <div class="field">
            <label for="password">Choose a password</label>
            <div class="auth-field">
              <app-icon name="lock" [size]="15" class="field-icon" />
              <input id="password" name="password" [type]="showPassword() ? 'text' : 'password'"
                [(ngModel)]="password" placeholder="At least 8 characters" autocomplete="new-password"
                required style="padding-right:36px;" />
              <button type="button" class="link-btn" [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'"
                (click)="showPassword.set(!showPassword())">
                <app-icon [name]="showPassword() ? 'eyeOff' : 'eye'" [size]="15" />
              </button>
            </div>
          </div>

          <div class="field">
            <label for="confirm">Confirm password</label>
            <div class="auth-field">
              <app-icon name="lock" [size]="15" class="field-icon" />
              <input id="confirm" name="confirm" [type]="showPassword() ? 'text' : 'password'"
                [(ngModel)]="confirm" placeholder="Re-enter your password" autocomplete="new-password" required />
            </div>
            @if (confirm && password !== confirm) {
              <span class="error">Passwords do not match.</span>
            }
          </div>

          <label style="display:flex;gap:9px;align-items:flex-start;font-size:12.5px;color:var(--muted);line-height:1.55;cursor:pointer;">
            <input type="checkbox" name="acceptTerms" [(ngModel)]="acceptTerms" style="margin-top:2px;flex-shrink:0;" />
            <span>
              I agree to the
              <button type="button" class="link-btn" style="font-size:12.5px;" (click)="legalOpen.set('terms')">Terms &amp; Conditions</button>
              and
              <button type="button" class="link-btn" style="font-size:12.5px;" (click)="legalOpen.set('sla')">SLA</button>.
            </span>
          </label>

          @if (error()) { <div class="info-box danger">{{ error() }}</div> }

          <button class="btn primary lg block" type="submit" [disabled]="!canSubmit()">
            @if (saving()) { <span class="spinner"></span> Activating… }
            @else { Activate my account <app-icon name="chevronRight" [size]="15" /> }
          </button>
        </form>

        <p style="margin-top:16px;color:var(--faint,var(--muted));font-size:11.5px;text-align:center;">
          This invitation expires {{ expiryLabel() }}.
        </p>
        }
      }
    </app-auth-shell>

    <app-modal [open]="legalOpen() !== null"
      [title]="legalOpen() === 'sla' ? 'Service Level Agreement' : 'Terms & Conditions'"
      [width]="720" (close)="legalOpen.set(null)">
      @if (legalOpen(); as which) { <app-legal-content [type]="which" /> }
    </app-modal>
  `
})
export class AcceptInviteComponent implements OnInit {
  loading = signal(true);
  saving = signal(false);
  /** A problem with the invitation itself — the form is not shown at all. */
  fatalError = signal('');
  /** A problem with this submission — the form stays usable. */
  error = signal('');
  showPassword = signal(false);
  legalOpen = signal<'terms' | 'sla' | null>(null);
  invite = signal<{ name: string; email: string; role: string; orgName: string | null; expiresAt: string } | null>(null);

  password = '';
  confirm = '';
  acceptTerms = false;

  private token = '';

  constructor(private route: ActivatedRoute, private router: Router, private auth: AuthService) {}

  ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    if (!this.token) {
      this.loading.set(false);
      this.fatalError.set('This invitation link is missing its token. Please use the link from your invitation email exactly as it was sent.');
      return;
    }
    // Resolve the invite before showing the form, so the person can see they're
    // joining the right organisation rather than typing a password on faith.
    this.auth.inviteDetails(this.token).subscribe({
      next: details => { this.invite.set(details); this.loading.set(false); },
      error: err => {
        this.loading.set(false);
        this.fatalError.set(err?.error?.message || 'This invitation link is invalid or has already been used.');
      }
    });
  }

  canSubmit(): boolean {
    return !this.saving()
      && this.password.length >= 8
      && this.password === this.confirm
      && this.acceptTerms;
  }

  expiryLabel(): string {
    const raw = this.invite()?.expiresAt;
    if (!raw) return 'soon';
    return new Date(raw).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  submit() {
    if (!this.canSubmit()) {
      if (this.password.length < 8) this.error.set('Your password must be at least 8 characters.');
      else if (this.password !== this.confirm) this.error.set('The two passwords do not match.');
      else if (!this.acceptTerms) this.error.set('Please accept the Terms & Conditions and SLA to continue.');
      return;
    }
    this.error.set('');
    this.saving.set(true);
    // Accepting signs the user straight in, so they land in the app rather than
    // at a login form immediately after choosing a password.
    this.auth.acceptInvite({ token: this.token, password: this.password, acceptTerms: true }).subscribe({
      next: () => {
        this.saving.set(false);
        this.router.navigateByUrl('/dashboard');
      },
      error: err => {
        this.saving.set(false);
        const message = err?.error?.message || 'We could not activate your account. Please try again.';
        // An expired or spent token can't be recovered by retrying, so switch
        // to the dead-end state instead of leaving a form that cannot succeed.
        if (err?.status === 410 || err?.error?.code === 'INVALID_INVITE') {
          this.invite.set(null);
          this.fatalError.set(message);
        } else {
          this.error.set(message);
        }
      }
    });
  }
}
