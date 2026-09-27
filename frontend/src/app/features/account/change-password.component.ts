import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppShellComponent } from '../../shared/app-shell.component';
import { ModalComponent } from '../../shared/ui';
import { LegalContentComponent } from '../../shared/legal-content.component';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';

/**
 * Forced password change for an account created via the tenant-invite flow with a
 * system-generated temporary password (#65). `middleware/accountGuards.js`'s
 * `requirePasswordChange` refuses every other route on the server until this
 * succeeds — `AuthService.requirePasswordChange` and `login.component.ts` are what
 * land the user here, but the server-side gate is what actually matters.
 *
 * Also collects Terms & Conditions/SLA acceptance, same as `register` and the
 * legacy accept-invite flow both require — this is the one guaranteed moment an
 * invited-and-immediately-active account interacts with itself, so it doubles as
 * that acceptance rather than skipping it.
 *
 * Changing the password bumps `sessionVersion` (the same as the existing
 * super-admin "Update Password" card does), which invalidates the current access
 * token immediately — so this deliberately signs the user out and sends them back
 * to `/login` rather than pretending the old session continues.
 */
@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, FormsModule, AppShellComponent, ModalComponent, LegalContentComponent],
  template: `
    <app-shell title="Set a new password" subtitle="You're signing in with a temporary password — choose one only you know">
      <div class="card" style="max-width:420px;">
        <div class="form">
          <div class="field">
            <label>Temporary password</label>
            <input type="password" [(ngModel)]="currentPassword" autocomplete="current-password" />
            <span class="hint">The one-time password from your invitation email.</span>
          </div>
          <div class="field">
            <label>New password</label>
            <input type="password" [(ngModel)]="newPassword" autocomplete="new-password" />
            <span class="hint">At least 8 characters.</span>
          </div>
          <div class="field">
            <label>Confirm new password</label>
            <input type="password" [(ngModel)]="confirmPassword" autocomplete="new-password" />
          </div>
          @if (confirmPassword && newPassword !== confirmPassword) {
            <div class="hint" style="color:var(--danger,#dc2626);">Passwords don't match.</div>
          }
          <label class="checkbox" style="align-items:flex-start;flex-wrap:wrap;line-height:1.5;">
            <input type="checkbox" name="acceptTerms" [(ngModel)]="acceptTerms" style="margin-top:2px;">
            <span>
              I agree to the <button type="button" class="link-btn" (click)="legalOpen.set('terms')">Terms &amp; Conditions</button>
              and <button type="button" class="link-btn" (click)="legalOpen.set('sla')">Service Level Agreement</button>
            </span>
          </label>
          <div>
            <button class="btn primary sm" type="button" [disabled]="!canSubmit() || saving()" (click)="submit()">
              {{ saving() ? 'Updating…' : 'Set new password' }}
            </button>
          </div>
        </div>
      </div>
    </app-shell>

    <app-modal [open]="legalOpen() !== null"
      [title]="legalOpen() === 'sla' ? 'Service Level Agreement' : 'Terms & Conditions'"
      [width]="640" (close)="legalOpen.set(null)">
      @if (legalOpen()) { <app-legal-content [type]="legalOpen()!" /> }
    </app-modal>
  `
})
export class ChangePasswordComponent {
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  acceptTerms = false;
  saving = signal(false);
  legalOpen = signal<'terms' | 'sla' | null>(null);

  constructor(private api: ApiService, private auth: AuthService, private toast: ToastService) {}

  canSubmit(): boolean {
    return !!this.currentPassword
      && this.newPassword.length >= 8
      && this.newPassword === this.confirmPassword
      && this.acceptTerms;
  }

  submit() {
    if (!this.canSubmit()) return;
    this.saving.set(true);
    this.api.changePassword({
      currentPassword: this.currentPassword,
      newPassword: this.newPassword,
      acceptTerms: this.acceptTerms
    }).subscribe({
      next: () => {
        this.saving.set(false);
        // The password change already bumped sessionVersion server-side, so the
        // access token this session is holding is dead the moment the next
        // request goes out — sign out explicitly rather than let that happen as
        // an unexplained 401 on whatever they click next.
        this.auth.forceLogout('Password updated. Please sign in with your new password.');
      },
      error: err => { this.saving.set(false); this.toast.httpError(err); }
    });
  }
}
