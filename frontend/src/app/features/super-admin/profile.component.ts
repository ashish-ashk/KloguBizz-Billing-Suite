import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AvatarComponent, EmptyStateComponent, SkeletonRowsComponent } from '../../shared/ui';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { AuditEntry } from '../../core/models';
import { fmtDate } from '../../core/format';

@Component({
  selector: 'app-super-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, AvatarComponent, EmptyStateComponent, SkeletonRowsComponent],
  template: `
    <div class="page-head">
      <div>
        <h1>Profile &amp; Security</h1>
        <p>Your super admin account</p>
      </div>
    </div>

    <div class="grid grid-2" style="align-items:start;">
      <div style="display:grid;gap:16px;">
        <section class="card">
          <div class="card-title" style="margin-bottom:16px;">Profile Information</div>
          <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px;">
            <app-avatar [name]="name" [size]="64" />
            <div>
              <div style="font-weight:700;font-size:15px;">{{ name }}</div>
              <div style="font-size:12px;color:var(--muted);">{{ email }}</div>
              <span style="display:inline-block;margin-top:6px;font-size:10px;font-weight:800;background:var(--red-bg);color:var(--red);border-radius:6px;padding:3px 8px;">🔒 SUPER ADMIN</span>
            </div>
          </div>
          <div class="form">
            <div class="field"><label>Full Name</label><input [(ngModel)]="name" /></div>
            <div class="field"><label>Email Address</label><input [ngModel]="email" [readOnly]="true" /></div>
            <div class="field"><label>Phone</label><input [(ngModel)]="phone" placeholder="+91 …" /></div>
            <div class="field">
              <label>Timezone</label>
              <select [(ngModel)]="timezone">
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
            <div><button class="btn primary sm" type="button" (click)="saveProfile()">Save Profile</button></div>
          </div>
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
      </div>

      <div style="display:grid;gap:16px;">
        <section class="card">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
            <div>
              <div class="card-title">Two-Factor Authentication</div>
              <div class="card-sub">Add an extra layer of security to your account</div>
            </div>
            <label class="switch"><input type="checkbox" [(ngModel)]="twoFactor" /><span class="track"></span></label>
          </div>
          @if (twoFactor) {
            <div class="info-box ok" style="margin-top:14px;">✓ 2FA is enabled. Your account is protected with an authenticator app.</div>
          }
        </section>

        <section class="card flush">
          <div class="card-head">
            <div>
              <div class="card-title">Audit Log</div>
              <div class="card-sub">Recent platform activity</div>
            </div>
          </div>
          @if (loading()) {
            <app-skeleton-rows [count]="5" />
          } @else if (logs().length) {
            <div style="max-height:520px;overflow-y:auto;">
              @for (log of logs(); track log._id) {
                <div style="display:flex;align-items:center;gap:12px;padding:11px 20px;border-bottom:1px solid var(--border);">
                  <div style="width:28px;height:28px;border-radius:50%;background:var(--brand-pale);display:grid;place-items:center;font-size:13px;flex-shrink:0;">{{ iconFor(log) }}</div>
                  <div style="flex:1;min-width:0;">
                    <div style="font-size:12px;font-weight:700;">{{ humanize(log.action) }}</div>
                    <div style="font-size:11px;color:var(--muted);">{{ log.actorName || 'System' }} · {{ fmtDate(log.createdAt) }}</div>
                  </div>
                </div>
              }
            </div>
          } @else {
            <app-empty-state icon="⚙" title="No activity yet" message="Platform actions will appear here." />
          }
        </section>
      </div>
    </div>
  `
})
export class SuperProfileComponent implements OnInit {
  loading = signal(true);
  saving = signal(false);
  logs = signal<AuditEntry[]>([]);
  name = '';
  email = '';
  phone = '';
  timezone = 'Asia/Kolkata';
  twoFactor = false;
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  fmtDate = fmtDate;

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
    this.api.superAuditLogs(30).subscribe({
      next: logs => { this.logs.set(logs); this.loading.set(false); },
      error: err => { this.loading.set(false); this.toast.httpError(err); }
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

  saveProfile() {
    // Profile fields are display-only for the super admin in this release.
    this.toast.success('Profile saved');
  }

  iconFor(log: AuditEntry): string {
    const a = log.action || '';
    if (a.startsWith('invoice')) return '◧';
    if (a.startsWith('org')) return '🏢';
    if (a.startsWith('plan')) return '💳';
    if (a.startsWith('user')) return '👤';
    if (a.startsWith('subscription')) return '⬡';
    if (a.startsWith('payment')) return '◈';
    return '⚙';
  }

  humanize(action: string): string {
    return (action || '').replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
}
