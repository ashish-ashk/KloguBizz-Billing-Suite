import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { IconComponent } from '../../shared/icons';
import { AuthShellComponent } from './auth-shell.component';

/** Completes a password reset using the token from the emailed link. */
@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [FormsModule, RouterLink, IconComponent, AuthShellComponent],
  template: `
    <app-auth-shell
      eyebrow="Account Recovery" eyebrowIcon="lock"
      heading="Choose a new password"
      subheading="Pick something you haven't used before. Signing in again afterwards will end any other sessions on your account."
      artHeading="A clean slate for your account."
      artBody="Resetting your password signs out every other device, so if someone else had access, they lose it now.">

      @if (fatalError()) {
        <div class="info-box danger" style="display:flex;gap:8px;align-items:flex-start;">
          <app-icon name="alertTriangle" [size]="15" style="flex-shrink:0;margin-top:1px" />
          <span>{{ fatalError() }}</span>
        </div>
        <p style="margin-top:20px;color:var(--muted);font-size:13px;">
          <a routerLink="/forgot-password" style="color:var(--brand);font-weight:600;">Request a new reset link</a>
        </p>
      } @else {
        <form class="form" (ngSubmit)="submit()">
          <div class="field">
            <label for="password">New password</label>
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
            <label for="confirm">Confirm new password</label>
            <div class="auth-field">
              <app-icon name="lock" [size]="15" class="field-icon" />
              <input id="confirm" name="confirm" [type]="showPassword() ? 'text' : 'password'"
                [(ngModel)]="confirm" placeholder="Re-enter your password" autocomplete="new-password" required />
            </div>
            @if (confirm && password !== confirm) {
              <span class="error">Passwords do not match.</span>
            }
          </div>

          @if (error()) { <div class="info-box danger">{{ error() }}</div> }

          <button class="btn primary lg block" type="submit" [disabled]="!canSubmit()">
            @if (saving()) { <span class="spinner"></span> Saving… }
            @else { Set new password <app-icon name="chevronRight" [size]="15" /> }
          </button>
        </form>
      }

      <p style="margin-top:20px;color:var(--muted);font-size:13px;text-align:center;">
        <a routerLink="/login" style="color:var(--brand);font-weight:600;">Back to sign in</a>
      </p>
    </app-auth-shell>
  `
})
export class ResetPasswordComponent implements OnInit {
  password = '';
  confirm = '';
  showPassword = signal(false);
  saving = signal(false);
  error = signal('');
  fatalError = signal('');

  private token = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private auth: AuthService,
    private toast: ToastService
  ) {}

  ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    if (!this.token) {
      this.fatalError.set('This reset link is missing its token. Please use the link from your email exactly as it was sent.');
    }
  }

  canSubmit(): boolean {
    return !this.saving() && this.password.length >= 8 && this.password === this.confirm;
  }

  submit() {
    if (!this.canSubmit()) {
      if (this.password.length < 8) this.error.set('Your password must be at least 8 characters.');
      else if (this.password !== this.confirm) this.error.set('The two passwords do not match.');
      return;
    }
    this.error.set('');
    this.saving.set(true);
    this.auth.resetPassword({ token: this.token, password: this.password }).subscribe({
      next: result => {
        this.saving.set(false);
        this.toast.success(result.message || 'Your password has been reset.');
        // Deliberately not auto-signed-in: the reset invalidated every session
        // server-side, so the user proves the new password works right away.
        this.router.navigateByUrl('/login');
      },
      error: err => {
        this.saving.set(false);
        const message = err?.error?.message || 'We could not reset your password. Please try again.';
        // A spent or expired token can't be recovered by retrying, so send the
        // user to request a fresh one instead of leaving a form that can't work.
        if (err?.status === 410 || err?.error?.code === 'INVALID_RESET') {
          this.fatalError.set(message);
        } else {
          this.error.set(message);
        }
      }
    });
  }
}
