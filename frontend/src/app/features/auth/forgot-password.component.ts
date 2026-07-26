import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { IconComponent } from '../../shared/icons';
import { AuthShellComponent } from './auth-shell.component';

/**
 * Requests a password reset link.
 *
 * There was previously no recovery path at all: a user who forgot their
 * password was simply locked out, and support could not help because the super
 * admin had no way to reset one either.
 */
@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [FormsModule, RouterLink, IconComponent, AuthShellComponent],
  template: `
    <app-auth-shell
      eyebrow="Account Recovery" eyebrowIcon="lock"
      heading="Forgot your password?"
      subheading="Enter the email address you sign in with and we will send you a link to choose a new password."
      artHeading="Locked out? Not for long."
      artBody="Reset links are single-use and expire after an hour. Resetting also signs out every other device, in case someone else got in.">

      @if (sent()) {
        <div class="info-box ok" style="display:flex;gap:8px;align-items:flex-start;">
          <app-icon name="checkCircle" [size]="15" style="flex-shrink:0;margin-top:1px" />
          <span>{{ message() }}</span>
        </div>

        @if (localResetUrl(); as url) {
          <!-- Development convenience: with no email provider configured the
               backend hands the link back so the flow is testable. It never does
               this in production. -->
          <div class="info-box" style="margin-top:14px;font-size:12px;">
            <strong>Development mode</strong> — no email provider is configured, so here is the link:<br />
            <a [href]="url" style="color:var(--brand);word-break:break-all;">{{ url }}</a>
          </div>
        }

        <p style="margin-top:20px;color:var(--muted);font-size:13px;line-height:1.6;">
          Didn't get it? Check your spam folder, or
          <button type="button" class="link-btn" style="font-size:13px;" (click)="reset()">try a different address</button>.
        </p>
      } @else {
        <form class="form" (ngSubmit)="submit()">
          <div class="field">
            <label for="email">Email address</label>
            <div class="auth-field">
              <app-icon name="mail" [size]="15" class="field-icon" />
              <input id="email" name="email" type="email" [(ngModel)]="email"
                placeholder="you@company.com" autocomplete="email" required />
            </div>
          </div>

          @if (error()) { <div class="info-box danger">{{ error() }}</div> }

          <button class="btn primary lg block" type="submit" [disabled]="loading() || !email.trim()">
            @if (loading()) { <span class="spinner"></span> Sending… }
            @else { Send reset link <app-icon name="chevronRight" [size]="15" /> }
          </button>
        </form>
      }

      <p style="margin-top:20px;color:var(--muted);font-size:13px;text-align:center;">
        <a routerLink="/login" style="color:var(--brand);font-weight:600;">Back to sign in</a>
      </p>
    </app-auth-shell>
  `
})
export class ForgotPasswordComponent {
  email = '';
  loading = signal(false);
  sent = signal(false);
  error = signal('');
  message = signal('');
  localResetUrl = signal<string | null>(null);

  constructor(private auth: AuthService) {}

  submit() {
    if (this.loading() || !this.email.trim()) return;
    this.error.set('');
    this.loading.set(true);
    this.auth.forgotPassword(this.email.trim()).subscribe({
      next: result => {
        this.loading.set(false);
        // The API answers identically whether or not the address has an account,
        // so this screen must not imply the address was found.
        this.message.set(result.message);
        this.localResetUrl.set(result.resetUrl || null);
        this.sent.set(true);
      },
      error: err => {
        this.loading.set(false);
        this.error.set(err?.error?.message || 'We could not send the reset link. Please try again in a moment.');
      }
    });
  }

  reset() {
    this.sent.set(false);
    this.localResetUrl.set(null);
    this.email = '';
  }
}
