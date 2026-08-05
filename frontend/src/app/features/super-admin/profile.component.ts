import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AvatarComponent, SkeletonRowsComponent } from '../../shared/ui';
import { IconComponent } from '../../shared/icons';
import { MfaEnrolmentComponent } from '../../shared/mfa-enrolment.component';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { PlatformMe, PlatformUser } from '../../core/models';
import { fmtDate } from '../../core/format';

const ROLE_NOTES: Record<string, string> = {
  owner: 'Everything, including deleting a tenant and changing pricing.',
  billing: 'Plans, pricing and a tenant’s plan or limits. No impersonation, no deletion.',
  support: 'Help a customer, including viewing their account as them. No pricing, no deletion.',
  auditor: 'Read-only. Can read the console and the audit trail, and change nothing.'
};

@Component({
  selector: 'app-super-profile',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink, AvatarComponent, SkeletonRowsComponent, IconComponent,
    MfaEnrolmentComponent
  ],
  template: `
    <div class="page-head">
      <div>
        <h1>Profile &amp; Security</h1>
        <p>Your platform account, and who else has one</p>
      </div>
    </div>

    <div class="grid grid-2" style="align-items:start;">
      <div style="display:grid;gap:16px;">
        <section class="card">
          <div class="card-title" style="margin-bottom:16px;">Your account</div>
          <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px;">
            <app-avatar [name]="name" [size]="64" />
            <div>
              <div style="font-weight:700;font-size:15px;">{{ name }}</div>
              <div style="font-size:12px;color:var(--muted);">{{ email }}</div>
              <span style="display:inline-flex;align-items:center;gap:4px;margin-top:6px;font-size:10px;font-weight:800;background:var(--red-bg);color:var(--red);border-radius:6px;padding:3px 8px;">
                <app-icon name="shield" [size]="11" /> {{ (me()?.platformRole || 'owner') | uppercase }}
              </span>
            </div>
          </div>
          @if (me(); as m) {
            <div class="card-sub" style="margin-bottom:8px">{{ roleNote(m.platformRole) }}</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              @for (c of m.capabilities; track c) { <span class="pill mono" style="font-size:10px">{{ c }}</span> }
            </div>
          }
        </section>

        <section class="card">
          <div class="card-title" style="margin-bottom:16px;">Change Password</div>
          <div class="form">
            <div class="field"><label>Current Password</label><input type="password" [(ngModel)]="currentPassword" autocomplete="current-password" /></div>
            <div class="field"><label>New Password</label><input type="password" [(ngModel)]="newPassword" autocomplete="new-password" /></div>
            <div class="field"><label>Confirm New Password</label><input type="password" [(ngModel)]="confirmPassword" autocomplete="new-password" /></div>
            @if (newPassword) {
              <div style="display:grid;gap:5px;font-size:12px;">
                @for (rule of rules; track rule.label) {
                  <div [style.color]="rule.test(newPassword) ? 'var(--green)' : 'var(--faint)'">
                    {{ rule.test(newPassword) ? '✓' : '○' }} {{ rule.label }}
                  </div>
                }
                @if (confirmPassword && confirmPassword !== newPassword) {
                  <div style="color:var(--red);">✗ Passwords do not match</div>
                }
              </div>
            }
            <div>
              <button class="btn primary sm" type="button" [disabled]="!canChangePassword() || saving()" (click)="changePassword()">Update Password</button>
            </div>
          </div>
        </section>

        <!--
          The real enrolment UI, shared with the tenant security page.

          This card previously said "Not available yet" — text written in Phase 4,
          before MFA existed, and left behind when Phase 5 shipped it. Since the
          server requires MFA on platform accounts and blocks the console with
          MFA_ENROLMENT_REQUIRED, that stale text made this a dead end: the operator
          was told to set up 2FA and sent to the one page that claimed it did not
          exist. The required flag is set here, so the component hides "Turn off"
          rather than offering a button the API will refuse.
        -->
        <app-mfa-enrolment [required]="true" (enrolled)="onEnrolled()" />
      </div>

      <div style="display:grid;gap:16px;">
        <section class="card flush">
          <div class="card-head">
            <div>
              <div class="card-title">Platform accounts</div>
              <div class="card-sub">
                Who can reach this console, and how much of it. Roles are enforced on every route.
              </div>
            </div>
          </div>
          @if (loadingUsers()) {
            <app-skeleton-rows [count]="3" />
          } @else {
            <div class="table-wrap">
              <table class="table stack-mobile">
                <thead><tr><th>Account</th><th>Role</th><th>Last sign-in</th></tr></thead>
                <tbody>
                  @for (u of users(); track u._id) {
                    <tr>
                      <td data-label="Account">
                        <div class="strong">{{ u.name }}@if (isSelf(u)) { <span class="pill" style="margin-left:6px">You</span> }</div>
                        <div class="muted" style="font-size:11px">{{ u.email }}</div>
                      </td>
                      <td data-label="Role">
                        @if (canManageRoles() && !isSelf(u)) {
                          <select [ngModel]="u.platformRole" (ngModelChange)="changeRole(u, $event)" style="max-width:140px">
                            @for (r of roles; track r) { <option [value]="r">{{ r }}</option> }
                          </select>
                        } @else {
                          <span class="pill">{{ u.platformRole }}</span>
                        }
                      </td>
                      <td class="muted" data-label="Last sign-in">{{ u.lastLoginAt ? fmtDate(u.lastLoginAt) : 'Never' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            @if (canManageRoles()) {
              <div class="card-sub" style="padding:12px 20px">
                You cannot change your own role, and the last owner cannot be demoted — either would
                lock the platform out of its own console with no way back.
              </div>
            }
          }
        </section>

        <section class="card">
          <div class="card-head">
            <div>
              <div class="card-title">Audit trail</div>
              <div class="card-sub">Every recorded change, sign-in and support session</div>
            </div>
            <a class="btn secondary sm" routerLink="/super-admin/audit">Open console →</a>
          </div>
        </section>
      </div>
    </div>
  `
})
export class SuperProfileComponent implements OnInit {
  saving = signal(false);
  loadingUsers = signal(true);
  me = signal<PlatformMe | null>(null);
  users = signal<PlatformUser[]>([]);

  name = '';
  email = '';
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  fmtDate = fmtDate;
  roles = ['owner', 'billing', 'support', 'auditor'];

  readonly rules = [
    { label: '8+ characters', test: (p: string) => p.length >= 8 },
    { label: 'Uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
    { label: 'Number', test: (p: string) => /\d/.test(p) },
    { label: 'Special character', test: (p: string) => /[^A-Za-z0-9]/.test(p) }
  ];

  constructor(private api: ApiService, private auth: AuthService, private toast: ToastService) {}

  ngOnInit() {
    this.name = this.auth.user()?.name || '';
    this.email = this.auth.user()?.email || '';
    this.loadMe();
    this.loadUsers();
  }

  /** Extracted so `onEnrolled` can re-run it — this request is one of the ones
   *  refused with MFA_ENROLMENT_REQUIRED before enrolment. */
  loadMe() {
    this.api.platformMe().subscribe({ next: me => this.me.set(me), error: () => {} });
  }

  loadUsers() {
    this.loadingUsers.set(true);
    this.api.platformUsers().subscribe({
      next: users => { this.users.set(users); this.loadingUsers.set(false); },
      // Deliberately quiet when the block is MFA: the enrolment card above is
      // already telling the operator exactly what to do, and a second toast
      // saying the request was refused only adds noise to the page they were
      // sent to in order to fix it.
      error: err => {
        this.loadingUsers.set(false);
        if (err?.error?.code !== 'MFA_ENROLMENT_REQUIRED') this.toast.httpError(err);
      }
    });
  }

  /**
   * Enrolment just succeeded, so the requests that were refused with
   * `MFA_ENROLMENT_REQUIRED` can now go through.
   *
   * Without this the operator enrols and then sits on a page whose panels are
   * still empty, with no indication that a reload would fix it.
   */
  onEnrolled() {
    this.loadMe();
    this.loadUsers();
  }

  isSelf(user: PlatformUser): boolean {
    return String(user._id) === String(this.auth.user()?.id);
  }

  canManageRoles(): boolean {
    return this.me()?.capabilities.includes('platform.admin') === true;
  }

  roleNote(role: string): string {
    return ROLE_NOTES[role] || '';
  }

  changeRole(user: PlatformUser, role: string) {
    if (role === user.platformRole) return;
    this.saving.set(true);
    this.api.setPlatformRole(user._id, role).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success(`${user.name} is now ${role}`);
        this.loadUsers();
      },
      error: err => {
        this.saving.set(false);
        this.toast.httpError(err);
        // The select has already moved to the rejected value, so put it back.
        this.loadUsers();
      }
    });
  }

  canChangePassword(): boolean {
    return !!this.currentPassword
      && this.rules.every(r => r.test(this.newPassword))
      && this.newPassword === this.confirmPassword;
  }

  changePassword() {
    this.saving.set(true);
    this.api.changePassword({ currentPassword: this.currentPassword, newPassword: this.newPassword }).subscribe({
      next: () => {
        this.saving.set(false);
        this.currentPassword = this.newPassword = this.confirmPassword = '';
        this.toast.success('Password updated');
      },
      error: err => { this.saving.set(false); this.toast.httpError(err); }
    });
  }
}
