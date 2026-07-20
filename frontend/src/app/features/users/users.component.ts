import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppShellComponent } from '../../shared/app-shell.component';
import { IconComponent } from '../../shared/icons';
import { ModalComponent, PillComponent, AvatarComponent, EmptyStateComponent, SkeletonRowsComponent } from '../../shared/ui';
import { ApiService } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { AuthService } from '../../core/auth.service';
import { OrgUser } from '../../core/models';
import { fmtDate, isValidEmail } from '../../core/format';

interface PermissionRow {
  name: string;
  admin: boolean;
  accountant: boolean;
  viewer: boolean;
}

const ROLE_DESCRIPTIONS: Record<string, string> = {
  admin: 'Full access to all modules, can manage users and billing settings.',
  accountant: 'Can create and edit invoices, record payments and view reports. Cannot manage users.',
  viewer: 'Read-only access. Can view invoices and reports but cannot edit anything.'
};

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, AppShellComponent, IconComponent, ModalComponent, PillComponent, AvatarComponent, EmptyStateComponent, SkeletonRowsComponent],
  template: `
    <app-shell title="Users &amp; Roles" [subtitle]="subtitleText()">
      <button actions class="btn primary" type="button" (click)="openInvite()">+ Invite User</button>

      @if (loading()) {
        <div class="card" style="margin-bottom:16px"><app-skeleton-rows [count]="3" /></div>
        <div class="card"><app-skeleton-rows [count]="4" /></div>
      } @else {
        <!-- Role summary cards -->
        <section class="grid grid-3" style="margin-bottom:16px">
          @for (r of roles; track r) {
            <div class="card metric" [class.brand]="r === 'admin'" [class.info]="r === 'accountant'">
              <div class="accent" [style.background]="r === 'viewer' ? 'var(--slate)' : null"></div>
              <div class="metric-row">
                <span class="label">{{ roleLabel(r) }}</span>
                <app-pill [status]="r" />
              </div>
              <div class="value">{{ roleCount(r) }}</div>
              <div class="sub">{{ roleDescriptions[r] }}</div>
            </div>
          }
        </section>

        <section class="grid grid-2" style="align-items:start">
          <!-- Team members -->
          <div class="card flush">
            <div class="card-head">
              <div>
                <div class="card-title">Team Members</div>
                <div class="card-sub">People with access to this organisation</div>
              </div>
            </div>
            @if (visibleUsers().length === 0) {
              <app-empty-state icon="◉" title="No team members yet" message="Invite your accountant or a viewer to start collaborating." />
            } @else {
              @for (u of visibleUsers(); track u._id) {
                <div class="member-row" style="display:flex;align-items:center;gap:12px;padding:14px 20px">
                  <app-avatar [name]="u.name" [size]="40" />
                  <div style="flex:1;min-width:0">
                    <div style="font-weight:700;font-size:14px">{{ u.name }}</div>
                    <div style="font-size:12px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ u.email }}</div>
                    <div style="font-size:11px;color:var(--faint);margin-top:2px">
                      {{ u.status === 'invited' ? 'Invite pending' : 'Last active ' + fmtDate(u.lastLoginAt) }}
                    </div>
                  </div>
                  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end">
                    <app-pill [status]="u.role" />
                    @if (u.status === 'invited') {
                      <app-pill status="invited" />
                    }
                    <button class="btn ghost sm" type="button" (click)="openEdit(u)">Edit</button>
                    @if (!isSelf(u)) {
                      <button class="btn danger sm" type="button" (click)="openRemove(u)">Remove</button>
                    }
                  </div>
                </div>
              }
            }
          </div>

          <!-- Permissions matrix -->
          <div class="card flush">
            <div class="card-head">
              <div>
                <div class="card-title">Permissions Matrix</div>
                <div class="card-sub">What each role can do in Klogu Bizz</div>
              </div>
            </div>
            <div class="table-wrap">
              <table class="table">
                <thead>
                  <tr>
                    <th>Permission</th>
                    <th style="text-align:center">Admin</th>
                    <th style="text-align:center">Accountant</th>
                    <th style="text-align:center">Viewer</th>
                  </tr>
                </thead>
                <tbody>
                  @for (p of permissions; track p.name) {
                    <tr>
                      <td>{{ p.name }}</td>
                      <td style="text-align:center">
                        @if (p.admin) { <app-icon name="check" [size]="14" style="color:var(--green)" /> }
                        @else { <span style="color:var(--faint)">—</span> }
                      </td>
                      <td style="text-align:center">
                        @if (p.accountant) { <app-icon name="check" [size]="14" style="color:var(--green)" /> }
                        @else { <span style="color:var(--faint)">—</span> }
                      </td>
                      <td style="text-align:center">
                        @if (p.viewer) { <app-icon name="check" [size]="14" style="color:var(--green)" /> }
                        @else { <span style="color:var(--faint)">—</span> }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </section>
      }

      <!-- Invite modal -->
      <app-modal [open]="inviteOpen()" title="Invite User" (close)="inviteOpen.set(false)">
        <div class="form">
          <div class="field">
            <label>Full Name *</label>
            <input [(ngModel)]="inviteName" placeholder="e.g. Priya Sharma">
          </div>
          <div class="field">
            <label>Work Email *</label>
            <input type="email" [(ngModel)]="inviteEmail" placeholder="name&#64;company.com"
              [class.invalid]="inviteEmail.length > 0 && !isValidEmail(inviteEmail)">
            @if (inviteEmail.length > 0 && !isValidEmail(inviteEmail)) {
              <div class="error">Enter a valid email address.</div>
            }
          </div>
          <div class="field">
            <label>Role</label>
            <select [(ngModel)]="inviteRole">
              <option value="admin">Admin</option>
              <option value="accountant">Accountant</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
          <div class="info-box">
            <strong>{{ roleLabel(inviteRole) }}</strong> role includes: {{ roleDescriptions[inviteRole] }}
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn ghost" type="button" (click)="inviteOpen.set(false)">Cancel</button>
          <button class="btn primary" type="button" [disabled]="saving() || !inviteValid()" (click)="sendInvite()">
            @if (saving()) { <span class="spinner"></span> }
            Send Invite
          </button>
        </div>
      </app-modal>

      <!-- Edit modal -->
      <app-modal [open]="editOpen()" title="Edit User" (close)="editOpen.set(false)">
        @if (editTarget(); as u) {
          <div class="info-box" style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
            <app-avatar [name]="u.name" [size]="44" />
            <div style="min-width:0">
              <div style="font-weight:700;font-size:14px">{{ u.name }}</div>
              <div style="font-size:12px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ u.email }}</div>
            </div>
          </div>
          <div class="form">
            <div class="field">
              <label>Role</label>
              <select [(ngModel)]="editRole">
                <option value="admin">Admin</option>
                <option value="accountant">Accountant</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <div class="field">
              <label>Status</label>
              <select [(ngModel)]="editStatus">
                <option value="active">Active</option>
                <option value="invited">Invited</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>
          </div>
          <div class="modal-foot">
            <button class="btn ghost" type="button" (click)="editOpen.set(false)">Cancel</button>
            <button class="btn primary" type="button" [disabled]="saving()" (click)="saveEdit()">
              @if (saving()) { <span class="spinner"></span> }
              Save Changes
            </button>
          </div>
        }
      </app-modal>

      <!-- Remove confirm modal -->
      <app-modal [open]="removeOpen()" title="Remove User" [width]="420" (close)="removeOpen.set(false)">
        <p style="margin:0;font-size:13px;color:var(--muted);line-height:1.6">
          This user will lose access to Klogu Bizz immediately. You can re-invite them later.
        </p>
        @if (removeTarget(); as u) {
          <div style="margin-top:12px;font-weight:700;font-size:13px">
            {{ u.name }} <span style="color:var(--muted);font-weight:500">· {{ u.email }}</span>
          </div>
        }
        <div class="modal-foot">
          <button class="btn ghost" type="button" (click)="removeOpen.set(false)">Cancel</button>
          <button class="btn danger solid" type="button" [disabled]="saving()" (click)="confirmRemove()">
            @if (saving()) { <span class="spinner"></span> }
            Remove User
          </button>
        </div>
      </app-modal>
    </app-shell>
  `,
  styles: [`
    .member-row:not(:last-child) { border-bottom: 1px solid var(--border); }
  `]
})
export class UsersComponent implements OnInit {
  loading = signal(true);
  saving = signal(false);
  users = signal<OrgUser[]>([]);

  inviteOpen = signal(false);
  editOpen = signal(false);
  removeOpen = signal(false);
  editTarget = signal<OrgUser | null>(null);
  removeTarget = signal<OrgUser | null>(null);

  inviteName = '';
  inviteEmail = '';
  inviteRole = 'accountant';
  editRole: OrgUser['role'] = 'accountant';
  editStatus: OrgUser['status'] = 'active';

  readonly roles: Array<'admin' | 'accountant' | 'viewer'> = ['admin', 'accountant', 'viewer'];
  readonly roleDescriptions = ROLE_DESCRIPTIONS;
  readonly permissions: PermissionRow[] = [
    { name: 'View Dashboard', admin: true, accountant: true, viewer: true },
    { name: 'View Invoices', admin: true, accountant: true, viewer: true },
    { name: 'Create/Edit Invoices', admin: true, accountant: true, viewer: false },
    { name: 'Payment Tracking', admin: true, accountant: true, viewer: false },
    { name: 'View Reports', admin: true, accountant: true, viewer: true },
    { name: 'Manage Users', admin: true, accountant: false, viewer: false },
    { name: 'App Settings', admin: true, accountant: false, viewer: false },
    { name: 'Billing & Subscription', admin: true, accountant: false, viewer: false }
  ];

  fmtDate = fmtDate;
  isValidEmail = isValidEmail;

  visibleUsers = computed(() => this.users().filter(u => u.status !== 'disabled'));
  subtitleText = computed(() => {
    if (this.loading()) return 'Loading team…';
    const list = this.visibleUsers();
    const active = list.filter(u => u.status === 'active').length;
    return list.length + ' team members · ' + active + ' active';
  });

  constructor(private api: ApiService, private toast: ToastService, public auth: AuthService) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.api.users().subscribe({
      next: list => { this.users.set(list); this.loading.set(false); },
      error: err => { this.loading.set(false); this.toast.httpError(err); }
    });
  }

  roleCount(role: string): number {
    return this.visibleUsers().filter(u => u.role === role).length;
  }

  roleLabel(role: string): string {
    return role.charAt(0).toUpperCase() + role.slice(1);
  }

  isSelf(u: OrgUser): boolean {
    const myEmail = this.auth.user()?.email;
    return !!myEmail && u.email.toLowerCase() === myEmail.toLowerCase();
  }

  // ── Invite ─────────────────────────────────────
  openInvite() {
    this.inviteName = '';
    this.inviteEmail = '';
    this.inviteRole = 'accountant';
    this.inviteOpen.set(true);
  }

  inviteValid(): boolean {
    return this.inviteName.trim().length > 0 && isValidEmail(this.inviteEmail);
  }

  sendInvite() {
    if (!this.inviteValid() || this.saving()) return;
    this.saving.set(true);
    const email = this.inviteEmail.trim();
    this.api.inviteUser({ name: this.inviteName.trim(), email, role: this.inviteRole }).subscribe({
      next: () => {
        this.saving.set(false);
        this.inviteOpen.set(false);
        this.toast.success('Invitation sent to ' + email);
        this.load();
      },
      error: err => { this.saving.set(false); this.toast.httpError(err); }
    });
  }

  // ── Edit ───────────────────────────────────────
  openEdit(u: OrgUser) {
    this.editTarget.set(u);
    this.editRole = u.role;
    this.editStatus = u.status;
    this.editOpen.set(true);
  }

  saveEdit() {
    const u = this.editTarget();
    if (!u || this.saving()) return;
    this.saving.set(true);
    this.api.updateUser(u._id, { role: this.editRole, status: this.editStatus }).subscribe({
      next: () => {
        this.saving.set(false);
        this.editOpen.set(false);
        this.toast.success('User updated');
        this.load();
      },
      error: err => { this.saving.set(false); this.toast.httpError(err); }
    });
  }

  // ── Remove ─────────────────────────────────────
  openRemove(u: OrgUser) {
    this.removeTarget.set(u);
    this.removeOpen.set(true);
  }

  confirmRemove() {
    const u = this.removeTarget();
    if (!u || this.saving()) return;
    this.saving.set(true);
    this.api.removeUser(u._id).subscribe({
      next: () => {
        this.saving.set(false);
        this.removeOpen.set(false);
        this.toast.info('User removed');
        this.load();
      },
      error: err => { this.saving.set(false); this.toast.httpError(err); }
    });
  }
}
