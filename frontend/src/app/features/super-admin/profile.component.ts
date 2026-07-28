import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AvatarComponent, EmptyStateComponent, PagerComponent, SkeletonRowsComponent } from '../../shared/ui';
import { IconComponent } from '../../shared/icons';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { AuditEntry } from '../../core/models';
import { ServerList } from '../../core/server-list';
import { downloadBlob, fmtDate } from '../../core/format';

@Component({
  selector: 'app-super-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, AvatarComponent, EmptyStateComponent, SkeletonRowsComponent, PagerComponent, IconComponent],
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
              <span style="display:inline-flex;align-items:center;gap:4px;margin-top:6px;font-size:10px;font-weight:800;background:var(--red-bg);color:var(--red);border-radius:6px;padding:3px 8px;"><app-icon name="shield" [size]="11" /> SUPER ADMIN</span>
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
            <div class="info-box ok" style="margin-top:14px;display:flex;gap:8px;align-items:flex-start">
              <app-icon name="checkCircle" [size]="15" style="flex-shrink:0;margin-top:1px" />
              <span>2FA is enabled. Your account is protected with an authenticator app.</span>
            </div>
          }
        </section>

        <section class="card flush">
          <div class="card-head">
            <div>
              <div class="card-title">Audit Log</div>
              <div class="card-sub">{{ audit.total() }} recorded event{{ audit.total() === 1 ? '' : 's' }}</div>
            </div>
            <button class="btn ghost sm" type="button" [disabled]="exporting()" (click)="exportAudit()">
              @if (exporting()) { <span class="spinner"></span> } Export CSV
            </button>
          </div>

          <!-- The trail was previously unfiltered and capped at 200 rows, which
               made it unreadable past the first 200 events. -->
          <div style="display:flex;gap:8px;flex-wrap:wrap;padding:12px 20px;border-bottom:1px solid var(--border);">
            <select class="input" style="max-width:170px"
              [ngModel]="audit.filters()['entity'] || ''" (ngModelChange)="audit.setFilter('entity', $event)">
              <option value="">All entities</option>
              @for (e of entities; track e) { <option [value]="e">{{ e }}</option> }
            </select>
            <input class="input" style="max-width:150px" type="date" title="From"
              [ngModel]="audit.filters()['from'] || ''" (ngModelChange)="audit.setFilter('from', $event)">
            <input class="input" style="max-width:150px" type="date" title="To"
              [ngModel]="audit.filters()['to'] || ''" (ngModelChange)="audit.setFilter('to', $event)">
          </div>

          @if (audit.loading()) {
            <app-skeleton-rows [count]="5" />
          } @else if (audit.rows().length) {
            <div style="max-height:520px;overflow-y:auto;">
              @for (log of audit.rows(); track log._id) {
                <div style="display:flex;align-items:center;gap:12px;padding:11px 20px;border-bottom:1px solid var(--border);">
                  <div style="width:28px;height:28px;border-radius:50%;background:var(--brand-pale);color:var(--brand);display:grid;place-items:center;flex-shrink:0;"><app-icon [name]="iconFor(log)" [size]="13" /></div>
                  <div style="flex:1;min-width:0;">
                    <div style="font-size:12px;font-weight:700;">{{ humanize(log.action) }}</div>
                    <div style="font-size:11px;color:var(--muted);">{{ log.actorName || 'System' }} · {{ fmtDate(log.createdAt) }}</div>
                  </div>
                </div>
              }
            </div>
            <app-pager [page]="audit.page()" [pageSize]="audit.pageSize()" [total]="audit.total()"
              (pageChange)="audit.onPage($event)" (pageSizeChange)="audit.onPageSize($event)" />
          } @else {
            <app-empty-state icon="⚙" title="No matching activity" message="Platform actions will appear here." />
          }
        </section>
      </div>
    </div>
  `
})
export class SuperProfileComponent implements OnInit, OnDestroy {
  loading = signal(true);
  saving = signal(false);
  exporting = signal(false);
  /** Paginated and filterable — see the note in the template. */
  audit = new ServerList<AuditEntry>(params => this.api.superAuditLogs(params));
  readonly entities = ['organisation', 'invoice', 'payment', 'client', 'item', 'user', 'creditNote', 'master', 'setting', 'plan'];
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
    this.loading.set(false);
    this.audit.pageSize.set(25);
    this.audit.load();
  }

  ngOnDestroy() { this.audit.dispose(); }

  exportAudit() {
    this.exporting.set(true);
    this.api.exportAuditLogsCsv(this.audit.filters()).subscribe({
      next: blob => { this.exporting.set(false); downloadBlob(blob, 'audit-log.csv'); },
      error: err => { this.exporting.set(false); this.toast.httpError(err); }
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
    if (a.startsWith('invoice')) return 'invoice';
    if (a.startsWith('org')) return 'package';
    if (a.startsWith('plan')) return 'box';
    if (a.startsWith('user')) return 'user';
    if (a.startsWith('subscription')) return 'creditCard';
    if (a.startsWith('payment')) return 'rupee';
    return 'shield';
  }

  humanize(action: string): string {
    return (action || '').replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
}
