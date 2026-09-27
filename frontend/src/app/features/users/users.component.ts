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
            <div class="card metric" [class.indigo]="r === 'admin'" [class.info]="r === 'accountant'">
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
            @if (visibleUsers().length > 5) {
              <div style="padding:0 20px 14px">
                <div class="search-box" style="width:100%">
                  <span class="search-icon">⌕</span>
                  <input class="input" type="search" style="width:100%" placeholder="Search name, email or role"
                    [ngModel]="search()" (ngModelChange)="search.set($event)">
                </div>
              </div>
            }
            @if (visibleUsers().length === 0) {
              <app-empty-state icon="◉" title="No team members yet" message="Invite your accountant or a viewer to start collaborating." />
            } @else if (filteredUsers().length === 0) {
              <app-empty-state icon="⌕" title="No matching team members" message="Try a different search term." />
            } @else {
              @for (u of filteredUsers(); track u._id) {
                <div class="member-row" style="display:flex;align-items:center;gap:12px;padding:14px 20px;flex-wrap:wrap">
                  <app-avatar [name]="u.name" [size]="40" />
                  <div style="flex:1;min-width:0">
                    <div style="font-weight:700;font-size:14px">{{ u.name }}</div>
                    <div style="font-size:12px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ u.email }}</div>
                    <div style="font-size:11px;color:var(--faint);margin-top:2px">
                      {{ u.status === 'invited' ? 'Invite pending' : 'Last active ' + fmtDate(u.lastLoginAt) }}
                    </div>
                  </div>
                  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end">
                    @if (isOwner(u)) {
                      <app-pill status="purple" label="Owner" />
                    }
                    <app-pill [status]="u.role" />
                    @if (u.status === 'invited') {
                      <app-pill status="invited" />
                    }
                    @if (u.status === 'invited') {
                      <!-- A pending invitee has no account yet, so Edit/Remove
                           don't apply: the useful actions are re-sending the
                           link (invitations expire, and mail goes astray) and
                           withdrawing it to free the seat and the address. -->
                      <button class="btn ghost sm" type="button" [disabled]="saving()" (click)="resendInvite(u)">Resend</button>
                      <button class="btn danger sm" type="button" [disabled]="saving()" (click)="openRevoke(u)">Withdraw</button>
                    } @else {
                      <button class="btn ghost sm" type="button" [disabled]="isOwner(u)"
                        [title]="isOwner(u) ? 'Transfer ownership before you can edit the owner' : ''"
                        (click)="openEdit(u)">Edit</button>
                      <button class="btn ghost sm" type="button" [disabled]="isOwner(u)"
                        [title]="isOwner(u) ? 'Transfer ownership before you can reset this password' : 'Issue a new temporary password and sign them out everywhere'"
                        (click)="openResetPassword(u)">Reset password</button>
                      @if (!isSelf(u)) {
                        <button class="btn danger sm" type="button" [disabled]="isOwner(u)"
                          [title]="isOwner(u) ? 'Transfer ownership before you can remove the owner' : ''"
                          (click)="openRemove(u)">Remove</button>
                      }
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
              <table class="table stack-mobile">
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
                      <td data-label="Permission">{{ p.name }}</td>
                      <td data-label="Admin" style="text-align:center">
                        @if (p.admin) { <app-icon name="check" [size]="14" style="color:var(--green)" /> }
                        @else { <span style="color:var(--faint)">—</span> }
                      </td>
                      <td data-label="Accountant" style="text-align:center">
                        @if (p.accountant) { <app-icon name="check" [size]="14" style="color:var(--green)" /> }
                        @else { <span style="color:var(--faint)">—</span> }
                      </td>
                      <td data-label="Viewer" style="text-align:center">
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

        @if (auth.isOwner()) {
          <section class="card" style="margin-top:16px;padding:20px">
            <div class="card-title">Organisation Ownership</div>
            <div class="card-sub" style="margin-bottom:14px">Transfer the owner designation to another active teammate. The owner is the only person who can transfer ownership again.</div>
            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
              <div style="display:flex;align-items:center;gap:10px">
                <app-avatar [name]="auth.user()?.name || ''" [size]="36" />
                <div>
                  <div style="font-weight:700;font-size:13px">{{ auth.user()?.name }} <span style="color:var(--muted);font-weight:500">(you)</span></div>
                  <div style="font-size:12px;color:var(--muted)">Current owner</div>
                </div>
              </div>
              <button class="btn ghost" type="button" (click)="openTransfer()" [disabled]="transferTargets().length === 0">Transfer Ownership</button>
            </div>
            @if (transferTargets().length === 0) {
              <div class="hint" style="margin-top:10px">Invite at least one more active teammate before you can transfer ownership.</div>
            }
          </section>
        }
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

      <!-- Reset password confirm modal -->
      <app-modal [open]="resetPasswordOpen()" title="Reset Password" [width]="440" (close)="resetPasswordOpen.set(false)">
        <p style="margin:0;font-size:13px;color:var(--muted);line-height:1.6">
          A new temporary password is issued and emailed to them. Every device they're
          currently signed in on is signed out immediately, and they'll be asked to
          choose their own password the next time they sign in.
        </p>
        @if (resetPasswordTarget(); as u) {
          <div style="margin-top:12px;font-weight:700;font-size:13px">
            {{ u.name }} <span style="color:var(--muted);font-weight:500">· {{ u.email }}</span>
          </div>
        }
        <div class="modal-foot">
          <button class="btn ghost" type="button" (click)="resetPasswordOpen.set(false)">Cancel</button>
          <button class="btn primary solid" type="button" [disabled]="saving()" (click)="confirmResetPassword()">
            @if (saving()) { <span class="spinner"></span> }
            Reset Password
          </button>
        </div>
      </app-modal>

      <!-- Withdraw invitation modal -->
      <app-modal [open]="revokeOpen()" title="Withdraw Invitation" [width]="440" (close)="revokeOpen.set(false)">
        <p style="margin:0;font-size:13px;color:var(--muted);line-height:1.6">
          The invitation link stops working and the seat is freed. You can invite this
          address again at any time.
        </p>
        @if (revokeTarget(); as u) {
          <div style="margin-top:12px;font-weight:700;font-size:13px">
            {{ u.name }} <span style="color:var(--muted);font-weight:500">· {{ u.email }}</span>
          </div>
        }
        <div class="modal-foot">
          <button class="btn ghost" type="button" (click)="revokeOpen.set(false)">Cancel</button>
          <button class="btn danger solid" type="button" [disabled]="saving()" (click)="confirmRevoke()">
            @if (saving()) { <span class="spinner"></span> }
            Withdraw Invitation
          </button>
        </div>
      </app-modal>

      <!-- Copyable invitation credentials/link, shown when email delivery isn't
           available. Without this the admin has no way to get the invitee in at all. -->
      <app-modal [open]="!!pendingInviteShare()" title="Share these sign-in details" [width]="560" (close)="pendingInviteShare.set(null)">
        @if (pendingInviteShare(); as pending) {
          <p style="margin:0 0 14px;font-size:13px;color:var(--muted);line-height:1.6">
            Email delivery isn't configured on this deployment, so nothing was sent to
            <strong style="color:var(--text)">{{ pending.email }}</strong>.
            @if (pending.tempPassword) {
              Share their login email and temporary password with them directly.
            } @else {
              Send them this link instead — it expires in seven days.
            }
          </p>
          @if (pending.tempPassword) {
            <div class="info-box" style="font-family:var(--font-mono,monospace);font-size:12px;display:grid;gap:6px;">
              <div>Login email: {{ pending.email }}</div>
              <div>Temporary password: {{ pending.tempPassword }}</div>
            </div>
          } @else {
            <div class="info-box" style="word-break:break-all;font-family:var(--font-mono,monospace);font-size:12px;">
              {{ pending.url }}
            </div>
          }
          <div class="modal-foot">
            <button class="btn ghost" type="button" (click)="pendingInviteShare.set(null)">Close</button>
            <button class="btn primary" type="button" (click)="copyPendingShare()">Copy</button>
          </div>
        }
      </app-modal>

      <!-- Transfer ownership modal -->
      <app-modal [open]="transferOpen()" title="Transfer Ownership" [width]="440" (close)="transferOpen.set(false)">
        <div class="info-box danger" style="display:flex;gap:8px;align-items:flex-start;margin-bottom:16px">
          <app-icon name="alertTriangle" [size]="15" style="flex-shrink:0;margin-top:1px" />
          <span>This immediately makes the selected teammate the organisation owner. You'll remain an admin, but only the new owner can transfer ownership again.</span>
        </div>
        <div class="form">
          <div class="field">
            <label>Transfer to *</label>
            <select [(ngModel)]="newOwnerId">
              <option value="" disabled>Select a teammate</option>
              @for (u of transferTargets(); track u._id) {
                <option [value]="u._id">{{ u.name }} · {{ u.email }}</option>
              }
            </select>
          </div>
          <div class="field">
            <label>Your password *</label>
            <input type="password" [(ngModel)]="transferPassword" placeholder="Confirm it's you">
          </div>
          <div class="field">
            <label>Type TRANSFER to confirm *</label>
            <input [(ngModel)]="transferConfirmText" placeholder="TRANSFER">
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn ghost" type="button" (click)="transferOpen.set(false)">Cancel</button>
          <button class="btn danger solid" type="button" [disabled]="saving() || !transferValid()" (click)="confirmTransfer()">
            @if (saving()) { <span class="spinner"></span> }
            Transfer Ownership
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
  transferOpen = signal(false);
  editTarget = signal<OrgUser | null>(null);
  removeTarget = signal<OrgUser | null>(null);
  revokeOpen = signal(false);
  revokeTarget = signal<OrgUser | null>(null);
  resetPasswordOpen = signal(false);
  resetPasswordTarget = signal<OrgUser | null>(null);
  /** Set when an invitation could not be emailed (no provider configured), so the
   *  admin can share it themselves — a link for `resendInvite` (still the legacy
   *  token flow), or login credentials for a brand-new `inviteUser` (#65, which
   *  creates the account active with a system-generated password instead). */
  pendingInviteShare = signal<{ email: string; url?: string; tempPassword?: string } | null>(null);

  inviteName = '';
  inviteEmail = '';
  inviteRole = 'accountant';
  editRole: OrgUser['role'] = 'accountant';
  editStatus: OrgUser['status'] = 'active';
  newOwnerId = '';
  transferPassword = '';
  transferConfirmText = '';

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

  search = signal('');

  visibleUsers = computed(() => this.users().filter(u => u.status !== 'disabled'));

  transferTargets = computed(() =>
    this.visibleUsers().filter(u => u.status === 'active' && !this.isSelf(u))
  );

  filteredUsers = computed(() => {
    const q = this.search().trim().toLowerCase();
    if (!q) return this.visibleUsers();
    return this.visibleUsers().filter(u =>
      u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q)
    );
  });
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

  isOwner(u: OrgUser): boolean {
    return !!this.auth.organisation()?.ownerId && u._id === this.auth.organisation()?.ownerId;
  }

  // ── Ownership transfer ──────────────────────────
  openTransfer() {
    this.newOwnerId = '';
    this.transferPassword = '';
    this.transferConfirmText = '';
    this.transferOpen.set(true);
  }

  transferValid(): boolean {
    return !!this.newOwnerId && this.transferPassword.length > 0 && this.transferConfirmText.trim().toUpperCase() === 'TRANSFER';
  }

  confirmTransfer() {
    if (!this.transferValid() || this.saving()) return;
    this.saving.set(true);
    this.api.transferOwnership({ newOwnerId: this.newOwnerId, password: this.transferPassword }).subscribe({
      next: org => {
        this.saving.set(false);
        this.transferOpen.set(false);
        this.auth.setOrganisation(org);
        this.toast.success('Ownership transferred');
        this.load();
      },
      error: err => { this.saving.set(false); this.toast.httpError(err); }
    });
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
      next: result => {
        this.saving.set(false);
        this.inviteOpen.set(false);
        this.announceInvite(email, result.delivered, { tempPassword: result.tempPassword });
        this.load();
      },
      error: err => { this.saving.set(false); this.toast.httpError(err); }
    });
  }

  /** Sends a fresh link, replacing any outstanding one. Only reachable for a
   *  legacy invite issued before #65 — a new invite is active immediately and
   *  has nothing pending to resend. */
  resendInvite(u: OrgUser) {
    if (this.saving()) return;
    this.saving.set(true);
    this.api.resendInvite(u._id).subscribe({
      next: result => {
        this.saving.set(false);
        this.announceInvite(u.email, result.delivered, { url: result.inviteUrl });
        this.load();
      },
      error: err => { this.saving.set(false); this.toast.httpError(err); }
    });
  }

  /**
   * Reports the outcome honestly.
   *
   * With no email provider configured the backend returns the credentials (or,
   * for a legacy resend, the link) instead of sending them, so claiming
   * "invitation sent" would be a lie and the admin would have no way to get the
   * invitee in. They're surfaced for copying instead.
   */
  private announceInvite(email: string, delivered: boolean, share: { url?: string; tempPassword?: string }) {
    if (delivered) {
      this.toast.success('Invitation emailed to ' + email);
      this.pendingInviteShare.set(null);
      return;
    }
    if (share.url || share.tempPassword) {
      this.pendingInviteShare.set({ email, ...share });
      this.toast.info('Email is not configured — share these sign-in details yourself.');
      return;
    }
    this.toast.info(`Invitation created for ${email}, but the email could not be delivered.`);
  }

  copyPendingShare() {
    const pending = this.pendingInviteShare();
    if (!pending) return;
    const text = pending.tempPassword ? `${pending.email}\n${pending.tempPassword}` : (pending.url || '');
    navigator.clipboard?.writeText(text).then(
      () => this.toast.success(pending.tempPassword ? 'Login details copied' : 'Invitation link copied'),
      () => this.toast.error('Could not copy — select the text and copy it manually.')
    );
  }

  // ── Withdraw a pending invitation ──────────────
  openRevoke(u: OrgUser) {
    this.revokeTarget.set(u);
    this.revokeOpen.set(true);
  }

  confirmRevoke() {
    const u = this.revokeTarget();
    if (!u || this.saving()) return;
    this.saving.set(true);
    this.api.revokeInvite(u._id).subscribe({
      next: () => {
        this.saving.set(false);
        this.revokeOpen.set(false);
        this.toast.info(`Invitation for ${u.email} withdrawn`);
        this.load();
      },
      error: err => { this.saving.set(false); this.toast.httpError(err); }
    });
  }

  // ── Edit ───────────────────────────────────────
  openEdit(u: OrgUser) {
    if (this.isOwner(u)) return;
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

  // ── Reset password ──────────────────────────────
  openResetPassword(u: OrgUser) {
    if (this.isOwner(u)) return;
    this.resetPasswordTarget.set(u);
    this.resetPasswordOpen.set(true);
  }

  confirmResetPassword() {
    const u = this.resetPasswordTarget();
    if (!u || this.saving()) return;
    this.saving.set(true);
    this.api.resetUserPassword(u._id).subscribe({
      next: result => {
        this.saving.set(false);
        this.resetPasswordOpen.set(false);
        this.announceInvite(u.email, result.delivered, { tempPassword: result.tempPassword });
        this.load();
      },
      error: err => { this.saving.set(false); this.toast.httpError(err); }
    });
  }

  // ── Remove ─────────────────────────────────────
  openRemove(u: OrgUser) {
    if (this.isOwner(u)) return;
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
