import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/icons';
import {
  AvatarComponent, EmptyStateComponent, ModalComponent, PagerComponent, PillComponent, SkeletonRowsComponent
} from '../../shared/ui';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { ServerList } from '../../core/server-list';
import { AuditEntry, Invoice, OrgUser, PlatformMe, TenantDetail } from '../../core/models';
import { fmtINR, fmtDate } from '../../core/format';

/**
 * The per-tenant drill-down (Part 3.2).
 *
 * There was no such view. The console had a table row and a modal that repeated
 * eight fields from it, so answering "why is this customer unhappy" meant opening a
 * Mongo shell. Everything an operator needs is on one screen: who they are, what
 * they are paying, what they have actually done, what support has done to them, and
 * the actions that resolve the call they are on.
 *
 * Opening this page is audited server-side (`superadmin.tenant_viewed`) — reading a
 * customer's business records leaves a record.
 */
@Component({
  selector: 'app-super-tenant-detail',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink, IconComponent,
    AvatarComponent, PillComponent, ModalComponent, EmptyStateComponent, SkeletonRowsComponent, PagerComponent
  ],
  template: `
    <div class="page-head">
      <div style="display:flex;align-items:center;gap:14px;min-width:0">
        <a class="btn ghost sm" routerLink="/super-admin/organisations"><app-icon name="chevronLeft" [size]="13" /> Back</a>
        @if (detail(); as d) {
          <app-avatar [name]="d.organisation.name" [size]="42" />
          <div style="min-width:0">
            <h1 style="margin:0">{{ d.organisation.name }}</h1>
            <p style="margin:2px 0 0">
              {{ d.organisation.adminEmail }} · <span class="mono">{{ d.organisation.gstin || 'No GSTIN' }}</span>
            </p>
          </div>
        }
      </div>
      @if (detail(); as d) {
        <div class="page-actions">
          <app-pill [status]="d.organisation.status" />
          <span class="pill" [class.purple]="d.activity.healthScore >= 70" [class.partial]="d.activity.healthScore < 40">
            Health {{ d.activity.healthScore }}
          </span>
          @if (can('tenant.support')) {
            <button class="btn secondary" type="button" (click)="openImpersonate()"><app-icon name="eye" [size]="13" /> View as tenant</button>
          }
          @if (can('org.write')) {
            @if (d.organisation.status !== 'suspended') {
              <button class="btn danger" type="button" (click)="openStatus('suspended')">Suspend</button>
            } @else {
              <button class="btn success" type="button" (click)="openStatus('active')">Reactivate</button>
            }
          }
        </div>
      }
    </div>

    @if (loading()) {
      <div class="card flush"><app-skeleton-rows [count]="8" /></div>
    }

    @if (detail(); as d) {
      @if (d.organisation.statusReason) {
        <div class="info-box danger" style="margin-bottom:18px;display:flex;gap:8px;align-items:flex-start">
          <app-icon name="alertTriangle" [size]="15" style="flex-shrink:0;margin-top:1px" />
          <span>
            <strong>{{ d.organisation.status === 'suspended' ? 'Suspended' : 'Cancelled' }}:</strong>
            {{ d.organisation.statusReason }}
            @if (d.organisation.statusChangedBy) { <span class="muted"> — by {{ d.organisation.statusChangedBy }} on {{ fmtDate(d.organisation.statusChangedAt) }}</span> }
          </span>
        </div>
      }

      <!-- Money and volume -->
      <section class="grid grid-5" style="margin-bottom:20px">
        <div class="stat-block"><div class="sb-label">Invoiced</div><div class="sb-value">{{ fmtINR(d.money.invoiced, true) }}</div></div>
        <div class="stat-block"><div class="sb-label">Collected</div><div class="sb-value">{{ fmtINR(d.money.collected, true) }}</div></div>
        <div class="stat-block"><div class="sb-label">Outstanding</div><div class="sb-value">{{ fmtINR(d.money.outstanding, true) }}</div></div>
        <div class="stat-block"><div class="sb-label">Documents</div><div class="sb-value">{{ d.documents.invoices }} inv · {{ d.documents.creditNotes }} CN</div></div>
        <div class="stat-block">
          <div class="sb-label">Last active</div>
          <div class="sb-value">{{ d.activity.lastActiveAt ? fmtDate(d.activity.lastActiveAt) : 'Never' }}</div>
        </div>
      </section>

      <section class="grid grid-2" style="margin-bottom:20px">
        <!-- Profile -->
        <div class="card">
          <div class="card-title">Profile</div>
          <div class="card-sub" style="margin-bottom:14px">Registered details and provenance</div>
          <div class="grid grid-2" style="gap:10px">
            <div class="stat-block"><div class="sb-label">Owner</div><div class="sb-value">{{ d.owner?.name || '—' }}</div></div>
            <div class="stat-block"><div class="sb-label">Owner email</div><div class="sb-value" style="overflow:hidden;text-overflow:ellipsis">{{ d.owner?.email || d.organisation.adminEmail }}</div></div>
            <div class="stat-block"><div class="sb-label">Phone</div><div class="sb-value">{{ d.organisation.phone || '—' }}</div></div>
            <div class="stat-block"><div class="sb-label">State</div><div class="sb-value">{{ d.organisation.state || d.organisation.stateCode }}</div></div>
            <div class="stat-block"><div class="sb-label">Joined</div><div class="sb-value">{{ fmtDate(d.organisation.createdAt) }}</div></div>
            <div class="stat-block">
              <div class="sb-label">First invoice</div>
              <div class="sb-value">
                @if (d.activity.daysToFirstInvoice === null) { Never } @else { {{ d.activity.daysToFirstInvoice }} days after signup }
              </div>
            </div>
          </div>
          <div class="stat-block" style="margin-top:10px"><div class="sb-label">Address</div><div class="sb-value">{{ d.organisation.address || '—' }}</div></div>
        </div>

        <!-- Plan, usage and limit overrides -->
        <div class="card">
          <div class="card-title">Plan &amp; usage</div>
          <div class="card-sub" style="margin-bottom:14px">
            {{ d.usage?.planName || d.organisation.plan }}
            @if (d.subscription) { · subscription {{ d.subscription.status }} ({{ d.subscription.billingCycle }}) }
          </div>
          @if (d.usage; as u) {
            <div class="grid grid-2" style="gap:10px;margin-bottom:12px">
              <div class="stat-block">
                <div class="sb-label">Seats</div>
                <div class="sb-value">{{ u.users }} / {{ u.userLimit ?? '∞' }}</div>
              </div>
              <div class="stat-block">
                <div class="sb-label">Invoices this month</div>
                <div class="sb-value">{{ u.invoicesThisMonth }} / {{ u.invoiceLimit ?? '∞' }}</div>
              </div>
            </div>
          }
          @if (can('org.write')) {
            <!-- Per-org ceilings. The alternative was inventing a bespoke plan for
                 every tenant who needed one extra seat, which then appears in the
                 pricing table and in MRR-by-plan. -->
            <div class="form-section-title">Limit overrides</div>
            <div class="grid grid-2">
              <div class="field">
                <label>Seat limit</label>
                <input type="number" min="1" [(ngModel)]="limitForm.userLimit" placeholder="Use plan default">
              </div>
              <div class="field">
                <label>Monthly invoice limit</label>
                <input type="number" min="1" [(ngModel)]="limitForm.invoiceLimit" placeholder="Use plan default">
              </div>
            </div>
            <div class="field">
              <label>Why</label>
              <input [(ngModel)]="limitForm.note" placeholder="Agreed with the customer on 12 Aug">
            </div>
            <div class="actions" style="justify-content:flex-end">
              <button class="btn primary sm" type="button" [disabled]="saving()" (click)="saveLimits()">Save limits</button>
            </div>
          }
        </div>
      </section>

      <section class="grid grid-2" style="margin-bottom:20px">
        <!-- Trial -->
        <div class="card">
          <div class="card-title">Trial</div>
          <div class="card-sub" style="margin-bottom:14px">
            @if (d.organisation.trialEndsAt) { Ends {{ fmtDate(d.organisation.trialEndsAt) }} } @else { No trial end date recorded }
          </div>
          @if (can('org.write')) {
            <div class="actions">
              <button class="btn secondary sm" type="button" [disabled]="saving()" (click)="extendTrial(7)">+7 days</button>
              <button class="btn secondary sm" type="button" [disabled]="saving()" (click)="extendTrial(14)">+14 days</button>
              <button class="btn secondary sm" type="button" [disabled]="saving()" (click)="extendTrial(30)">+30 days</button>
              <button class="btn ghost sm" type="button" [disabled]="saving()" (click)="endTrial()">End now</button>
            </div>
            <div class="card-sub" style="margin-top:8px">
              Extending adds to the current end date, not to today. Nothing is suspended automatically when a trial lapses.
            </div>
          }
        </div>

        <!-- Feature flags -->
        <div class="card">
          <div class="card-title">Feature flags</div>
          <div class="card-sub" style="margin-bottom:14px">Overrides the platform default for this tenant only</div>
          <div style="display:grid;gap:10px">
            @for (f of d.flagCatalogue; track f.key) {
              <label style="display:flex;align-items:flex-start;gap:9px;cursor:pointer" [class.muted]="!f.available">
                <input type="checkbox" [disabled]="!f.available || !can('org.write')"
                  [checked]="flagForm[f.key]" (change)="toggleFlag(f.key, $event)" style="margin-top:3px">
                <span>
                  <span style="font-weight:600;font-size:12.5px">{{ f.label }}</span>
                  @if (!f.available) { <span class="pill draft" style="margin-left:6px">Not built yet</span> }
                  <div class="muted" style="font-size:11px;line-height:1.5">{{ f.description }}</div>
                </span>
              </label>
            }
          </div>
          @if (can('org.write')) {
            <div class="actions" style="justify-content:flex-end;margin-top:12px">
              <button class="btn primary sm" type="button" [disabled]="saving()" (click)="saveFlags()">Save flags</button>
            </div>
          }
        </div>
      </section>

      <section class="grid grid-2" style="margin-bottom:20px">
        <!-- Message this tenant -->
        <div class="card">
          <div class="card-title">Message this tenant</div>
          <div class="card-sub" style="margin-bottom:14px">Shown as a banner inside their app. Empty clears it.</div>
          <div class="field">
            <label>Message</label>
            <textarea rows="3" [(ngModel)]="noticeForm.message" [disabled]="!can('org.write')"
              placeholder="Your GSTIN could not be verified — please check it under Settings."></textarea>
          </div>
          <div class="grid grid-2">
            <div class="field">
              <label>Level</label>
              <select [(ngModel)]="noticeForm.level" [disabled]="!can('org.write')">
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="danger">Critical</option>
              </select>
            </div>
            <div class="field">
              <label>Expires</label>
              <input type="date" [(ngModel)]="noticeForm.expiresAt" [disabled]="!can('org.write')">
            </div>
          </div>
          @if (can('org.write')) {
            <div class="actions" style="justify-content:flex-end">
              <button class="btn primary sm" type="button" [disabled]="saving()" (click)="saveNotice()">Save notice</button>
            </div>
          }
        </div>

        <!-- Internal support context -->
        <div class="card">
          <div class="card-title">Support notes</div>
          <div class="card-sub" style="margin-bottom:14px">Internal only — never shown to the tenant.</div>
          <div class="grid grid-2">
            <div class="field">
              <label>Account manager</label>
              <input [(ngModel)]="supportForm.accountManager" [disabled]="!can('org.write')">
            </div>
            <div class="field">
              <label>Risk</label>
              <select [(ngModel)]="supportForm.riskLevel" [disabled]="!can('org.write')">
                <option value="none">None</option>
                <option value="watch">Watch</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <div class="field">
            <label>Tags (comma separated)</label>
            <input [(ngModel)]="supportTags" [disabled]="!can('org.write')" placeholder="enterprise, migrating-from-tally">
          </div>
          <div class="field">
            <label>Notes</label>
            <textarea rows="3" [(ngModel)]="supportForm.notes" [disabled]="!can('org.write')"></textarea>
          </div>
          @if (can('org.write')) {
            <div class="actions" style="justify-content:flex-end">
              <button class="btn primary sm" type="button" [disabled]="saving()" (click)="saveSupport()">Save notes</button>
            </div>
          }
        </div>
      </section>

      <!-- Users -->
      <section class="card flush" style="margin-bottom:20px">
        <div class="card-head">
          <div>
            <div class="card-title">Users</div>
            <div class="card-sub">{{ d.users.length }} account{{ d.users.length === 1 ? '' : 's' }}</div>
          </div>
          @if (can('tenant.support')) {
            <button class="btn secondary sm" type="button" [disabled]="saving()" (click)="forceLogoutOrg()">Sign out everyone</button>
          }
        </div>
        <div class="table-wrap">
          <table class="table stack-mobile">
            <thead><tr><th>Name</th><th>Role</th><th>Status</th><th>Last login</th><th style="text-align:right">Actions</th></tr></thead>
            <tbody>
              @for (u of d.users; track u._id) {
                <tr>
                  <td data-label="Name">
                    <div class="strong">{{ u.name }}@if (isOwner(d, u)) { <span class="pill purple" style="margin-left:6px">Owner</span> }</div>
                    <div class="muted" style="font-size:11px">{{ u.email }}</div>
                  </td>
                  <td data-label="Role">
                    @if (can('tenant.support') && u.status !== 'invited') {
                      <select [ngModel]="u.role" (ngModelChange)="changeRole(u, $event)" style="max-width:130px">
                        <option value="admin">Admin</option>
                        <option value="accountant">Accountant</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    } @else {
                      <span class="pill">{{ u.role }}</span>
                    }
                  </td>
                  <td data-label="Status"><app-pill [status]="u.status" /></td>
                  <td class="muted" data-label="Last login">{{ u.lastLoginAt ? fmtDate(u.lastLoginAt) : 'Never' }}</td>
                  <td data-label="">
                    @if (can('tenant.support') && u.status === 'active') {
                      <div class="actions">
                        <button class="btn ghost sm" type="button" (click)="openReset(u)">Reset password</button>
                        <button class="btn ghost sm" type="button" (click)="unlock(u)">Unlock</button>
                        <button class="btn ghost sm" type="button" (click)="forceLogoutUser(u)">Sign out</button>
                        @if (!isOwner(d, u)) {
                          <button class="btn danger sm" type="button" (click)="disableUser(u)">Disable</button>
                        }
                      </div>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>

      <section class="grid grid-2" style="margin-bottom:20px">
        <!-- What was done to this account -->
        <div class="card flush">
          <div class="card-head">
            <div><div class="card-title">Timeline</div><div class="card-sub">Recent changes, including support actions</div></div>
            <a class="btn ghost sm" [routerLink]="['/super-admin/audit']" [queryParams]="{ orgId: orgId }">Full audit →</a>
          </div>
          @if (d.timeline.length) {
            <div class="table-wrap">
              <table class="table">
                <thead><tr><th>When</th><th>Action</th><th>Actor</th></tr></thead>
                <tbody>
                  @for (e of d.timeline; track e._id) {
                    <tr>
                      <td class="muted" style="white-space:nowrap">{{ fmtDate(e.createdAt) }}</td>
                      <td class="mono" style="font-size:11px">{{ e.action }}</td>
                      <td>
                        {{ e.actorName || '—' }}
                        @if (impersonatorOf(e); as by) {
                          <!-- An impersonated action names both identities. Without
                               this it is indistinguishable from one the customer
                               performed themselves. -->
                          <span class="pill danger" style="margin-left:6px">as, by {{ by }}</span>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <app-empty-state icon="◷" title="Nothing recorded yet" message="Changes to this account will appear here." />
          }
        </div>

        <!-- What they actually used -->
        <div class="card flush">
          <div class="card-head">
            <div><div class="card-title">Recent activity</div><div class="card-sub">Product usage, newest first</div></div>
          </div>
          @if (d.recentEvents.length) {
            <div class="table-wrap">
              <table class="table">
                <thead><tr><th>When</th><th>Event</th><th class="num">Value</th></tr></thead>
                <tbody>
                  @for (e of d.recentEvents; track e._id) {
                    <tr>
                      <td class="muted" style="white-space:nowrap">{{ fmtDate(e.createdAt) }}</td>
                      <td class="mono" style="font-size:11px">{{ e.type }}</td>
                      <td class="num">{{ e.value ? fmtINR(e.value, true) : '' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <app-empty-state icon="▤" title="No usage captured yet" message="Events are recorded from the moment this tenant next signs in." />
          }
        </div>
      </section>

      <!-- Their invoices, for support -->
      <section class="card flush">
        <div class="card-head">
          <div><div class="card-title">Invoices</div><div class="card-sub">Read-only, for support</div></div>
        </div>
        @if (invoices.loading()) {
          <app-skeleton-rows [count]="4" />
        } @else if (!invoices.rows().length) {
          <app-empty-state icon="◧" title="No invoices" message="This tenant has not raised an invoice." />
        } @else {
          <div class="table-wrap">
            <table class="table stack-mobile">
              <thead><tr><th>Number</th><th>Buyer</th><th>Date</th><th class="num">Total</th><th class="num">Balance</th><th>Status</th></tr></thead>
              <tbody>
                @for (inv of invoices.rows(); track inv._id) {
                  <tr>
                    <td class="num" data-label="Number">{{ inv.invoiceNumber }}</td>
                    <td data-label="Buyer">{{ buyerName(inv) }}</td>
                    <td class="muted" data-label="Date">{{ fmtDate(inv.date) }}</td>
                    <td class="num strong" data-label="Total">{{ fmtINR(inv.totals.total) }}</td>
                    <td class="num" data-label="Balance">{{ fmtINR(inv.balanceDue) }}</td>
                    <td data-label="Status"><app-pill [status]="inv.status" /></td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <app-pager [page]="invoices.page()" [pageSize]="invoices.pageSize()" [total]="invoices.total()"
            (pageChange)="invoices.onPage($event)" (pageSizeChange)="invoices.onPageSize($event)" />
        }
      </section>
    }

    <!-- Impersonation -->
    <app-modal [open]="showImpersonate()" title="View as tenant" [width]="520" (close)="showImpersonate.set(false)">
      <div class="info-box warn" style="margin-bottom:14px;display:flex;gap:8px;align-items:flex-start">
        <app-icon name="alertTriangle" [size]="15" style="flex-shrink:0;margin-top:1px" />
        <span>
          You will be signed in as this tenant's user for 30 minutes. Every request is attributed to you
          in the audit trail, and the tenant can be told exactly what was done.
        </span>
      </div>
      <div class="field">
        <label>Which user</label>
        <select [(ngModel)]="impersonateUserId">
          <option value="">Owner (or the first admin)</option>
          @for (u of activeUsers(); track u._id) { <option [value]="u._id">{{ u.name }} — {{ u.role }}</option> }
        </select>
      </div>
      <div class="field">
        <label>Reason *</label>
        <input [(ngModel)]="impersonateReason" placeholder="Ticket #482 — invoice total looks wrong to them">
        @if (impersonateReason && impersonateReason.trim().length < 5) { <div class="error">Give a reason of at least 5 characters</div> }
      </div>
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
        <input type="checkbox" [(ngModel)]="impersonateReadOnly">
        <span>Read-only session <span class="muted">(recommended — the session cannot change their data)</span></span>
      </label>
      @if (!impersonateReadOnly) {
        <div class="info-box danger" style="margin-top:12px;display:flex;gap:8px;align-items:flex-start">
          <app-icon name="alertTriangle" [size]="15" style="flex-shrink:0;margin-top:1px" />
          <span>A read-write session edits the customer's real books. Every write is recorded against your name.</span>
        </div>
      }
      <div class="modal-foot">
        <button class="btn ghost" type="button" (click)="showImpersonate.set(false)">Cancel</button>
        <button class="btn primary" type="button" [disabled]="saving() || impersonateReason.trim().length < 5" (click)="startImpersonation()">
          @if (saving()) { <span class="spinner"></span> } Start session
        </button>
      </div>
    </app-modal>

    <!-- Status change -->
    <app-modal [open]="!!statusTarget()" [title]="statusTarget() === 'active' ? 'Reactivate tenant' : 'Suspend tenant'" (close)="statusTarget.set(null)">
      @if (statusTarget() === 'active') {
        <p style="margin:0 0 10px">Restore full access? Their users will be able to save changes again.</p>
      } @else {
        <p style="margin:0 0 10px">
          Suspending stops all writes. The tenant can still view, print and export what they already have —
          it is their business data.
        </p>
        <div class="field">
          <label>Reason *</label>
          <input [(ngModel)]="statusReason" placeholder="Payment failed three times — card expired">
          <div class="card-sub" style="margin-top:5px">The tenant is shown this. "Suspended" with no explanation just becomes a support ticket.</div>
        </div>
      }
      <div class="modal-foot">
        <button class="btn ghost" type="button" (click)="statusTarget.set(null)">Cancel</button>
        <button class="btn" [class.danger]="statusTarget() !== 'active'" [class.solid]="statusTarget() !== 'active'"
          [class.success]="statusTarget() === 'active'" type="button"
          [disabled]="saving() || (statusTarget() !== 'active' && statusReason.trim().length < 3)"
          (click)="confirmStatus()">
          {{ statusTarget() === 'active' ? 'Reactivate' : 'Suspend' }}
        </button>
      </div>
    </app-modal>

    <!-- Password reset -->
    <app-modal [open]="!!resetTarget()" title="Reset password" (close)="closeReset()">
      @if (resetTarget(); as u) {
        <p style="margin:0 0 12px">Reset the password for <strong>{{ u.name }}</strong> ({{ u.email }})? Every open session is signed out.</p>
        @if (resetResult()) {
          <div class="info-box ok" style="display:flex;gap:8px;align-items:flex-start">
            <app-icon name="checkCircle" [size]="15" style="flex-shrink:0;margin-top:1px" />
            <span>{{ resetResult()!.message }}</span>
          </div>
          @if (resetResult()!.tempPassword) {
            <div class="stat-block" style="margin-top:10px">
              <div class="sb-label">Temporary password (shown once)</div>
              <div class="sb-value mono">{{ resetResult()!.tempPassword }}</div>
            </div>
          }
          @if (resetResult()!.resetUrl) {
            <div class="stat-block" style="margin-top:10px">
              <div class="sb-label">Reset link (no email provider configured)</div>
              <div class="sb-value mono" style="word-break:break-all;font-size:11px">{{ resetResult()!.resetUrl }}</div>
            </div>
          }
          <div class="modal-foot"><button class="btn primary" type="button" (click)="closeReset()">Done</button></div>
        } @else {
          <div class="modal-foot">
            <button class="btn ghost" type="button" (click)="closeReset()">Cancel</button>
            <button class="btn secondary" type="button" [disabled]="saving()" (click)="doReset('temporary')">Temporary password</button>
            <button class="btn primary" type="button" [disabled]="saving()" (click)="doReset('link')">Email reset link</button>
          </div>
        }
      }
    </app-modal>
  `
})
export class SuperTenantDetailComponent implements OnInit, OnDestroy {
  orgId = '';
  loading = signal(true);
  saving = signal(false);
  detail = signal<TenantDetail | null>(null);
  me = signal<PlatformMe | null>(null);

  invoices = new ServerList<Invoice>(params => this.api.tenantInvoices(this.orgId, params));

  showImpersonate = signal(false);
  impersonateUserId = '';
  impersonateReason = '';
  impersonateReadOnly = true;

  statusTarget = signal<string | null>(null);
  statusReason = '';

  resetTarget = signal<OrgUser | null>(null);
  resetResult = signal<{ message: string; tempPassword?: string; resetUrl?: string } | null>(null);

  limitForm: { userLimit: number | null; invoiceLimit: number | null; note: string } = { userLimit: null, invoiceLimit: null, note: '' };
  flagForm: Record<string, boolean> = {};
  noticeForm = { message: '', level: 'info', expiresAt: '' };
  supportForm: { accountManager: string; riskLevel: string; notes: string } = { accountManager: '', riskLevel: 'none', notes: '' };
  supportTags = '';

  fmtINR = fmtINR;
  fmtDate = fmtDate;

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private toast: ToastService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.orgId = this.route.snapshot.paramMap.get('id') || '';
    this.api.platformMe().subscribe({ next: me => this.me.set(me), error: () => {} });
    this.load();
    this.invoices.refresh();
  }

  ngOnDestroy() { this.invoices.dispose(); }

  /** Mirrors the server's capability check so the page doesn't offer buttons that
   *  would 403. The server is the control; this is the courtesy. */
  can(capability: string): boolean {
    return this.me()?.capabilities.includes(capability) === true;
  }

  load() {
    this.loading.set(true);
    this.api.tenantDetail(this.orgId).subscribe({
      next: d => {
        this.detail.set(d);
        this.loading.set(false);
        this.syncForms(d);
      },
      error: err => { this.loading.set(false); this.toast.httpError(err); }
    });
  }

  /** Seeds the editable cards from what the server currently holds. */
  private syncForms(d: TenantDetail) {
    this.limitForm = {
      userLimit: d.organisation.limitOverrides?.userLimit ?? null,
      invoiceLimit: d.organisation.limitOverrides?.invoiceLimit ?? null,
      note: d.organisation.limitOverrides?.note || ''
    };
    // Seeded from the *effective* flags, so a checkbox reflects what is actually in
    // force. Saving then writes an explicit override for every flag, which is what
    // makes "off, even though the platform default is on" expressible at all.
    this.flagForm = {};
    for (const flag of d.flagCatalogue) this.flagForm[flag.key] = d.flags[flag.key] === true;

    this.noticeForm = {
      message: d.organisation.notice?.message || '',
      level: d.organisation.notice?.level || 'info',
      expiresAt: d.organisation.notice?.expiresAt ? String(d.organisation.notice.expiresAt).slice(0, 10) : ''
    };
    this.supportForm = {
      accountManager: d.organisation.support?.accountManager || '',
      riskLevel: d.organisation.support?.riskLevel || 'none',
      notes: d.organisation.support?.notes || ''
    };
    this.supportTags = (d.organisation.support?.tags || []).join(', ');
  }

  isOwner(d: TenantDetail, user: OrgUser): boolean {
    return !!d.organisation.ownerId && String(d.organisation.ownerId) === String(user._id);
  }

  activeUsers(): OrgUser[] {
    return (this.detail()?.users || []).filter(u => u.status === 'active' && u.role !== 'superadmin');
  }

  buyerName(invoice: Invoice): string {
    const client = invoice.clientId;
    if (client && typeof client === 'object') return client.companyName;
    return invoice.billTo?.name || '—';
  }

  /** The operator behind an impersonated audit entry, if there was one. */
  impersonatorOf(entry: AuditEntry): string | null {
    const value = (entry as unknown as Record<string, unknown>)['impersonatorName'];
    return typeof value === 'string' && value ? value : null;
  }

  // ── Actions ──────────────────────────────────

  private done(message: string) {
    this.saving.set(false);
    this.toast.success(message);
    this.load();
  }

  private failed(err: unknown) {
    this.saving.set(false);
    this.toast.httpError(err);
  }

  saveLimits() {
    this.saving.set(true);
    this.api.setTenantLimits(this.orgId, {
      userLimit: this.limitForm.userLimit === null || String(this.limitForm.userLimit) === '' ? null : Number(this.limitForm.userLimit),
      invoiceLimit: this.limitForm.invoiceLimit === null || String(this.limitForm.invoiceLimit) === '' ? null : Number(this.limitForm.invoiceLimit),
      note: this.limitForm.note
    }).subscribe({ next: () => this.done('Limits updated'), error: err => this.failed(err) });
  }

  toggleFlag(key: string, event: Event) {
    this.flagForm[key] = (event.target as HTMLInputElement).checked;
  }

  saveFlags() {
    this.saving.set(true);
    this.api.setTenantFlags(this.orgId, { ...this.flagForm })
      .subscribe({ next: () => this.done('Feature flags updated'), error: err => this.failed(err) });
  }

  extendTrial(days: number) {
    this.saving.set(true);
    this.api.setTenantTrial(this.orgId, { days })
      .subscribe({ next: () => this.done(`Trial extended by ${days} days`), error: err => this.failed(err) });
  }

  endTrial() {
    this.saving.set(true);
    this.api.setTenantTrial(this.orgId, { end: true })
      .subscribe({ next: () => this.done('Trial ended'), error: err => this.failed(err) });
  }

  saveNotice() {
    this.saving.set(true);
    this.api.setTenantNotice(this.orgId, {
      message: this.noticeForm.message,
      level: this.noticeForm.level,
      expiresAt: this.noticeForm.expiresAt || null
    }).subscribe({
      next: () => this.done(this.noticeForm.message.trim() ? 'Notice saved' : 'Notice cleared'),
      error: err => this.failed(err)
    });
  }

  saveSupport() {
    this.saving.set(true);
    this.api.setTenantSupport(this.orgId, {
      accountManager: this.supportForm.accountManager,
      riskLevel: this.supportForm.riskLevel as 'none' | 'watch' | 'high',
      notes: this.supportForm.notes,
      tags: this.supportTags.split(',').map(tag => tag.trim()).filter(Boolean)
    }).subscribe({ next: () => this.done('Support notes saved'), error: err => this.failed(err) });
  }

  openStatus(status: string) {
    this.statusReason = '';
    this.statusTarget.set(status);
  }

  confirmStatus() {
    const status = this.statusTarget();
    if (!status) return;
    this.saving.set(true);
    this.api.setTenantStatus(this.orgId, status, this.statusReason.trim()).subscribe({
      next: () => { this.statusTarget.set(null); this.done(status === 'active' ? 'Tenant reactivated' : 'Tenant suspended'); },
      error: err => this.failed(err)
    });
  }

  forceLogoutOrg() {
    this.saving.set(true);
    this.api.forceLogoutOrg(this.orgId).subscribe({
      next: res => this.done(`Signed out ${res.users} user${res.users === 1 ? '' : 's'}`),
      error: err => this.failed(err)
    });
  }

  changeRole(user: OrgUser, role: string) {
    if (role === user.role) return;
    this.saving.set(true);
    this.api.setTenantUser(user._id, { role })
      .subscribe({ next: () => this.done(`${user.name} is now ${role}`), error: err => this.failed(err) });
  }

  disableUser(user: OrgUser) {
    this.saving.set(true);
    this.api.setTenantUser(user._id, { status: 'disabled' })
      .subscribe({ next: () => this.done(`${user.name} disabled`), error: err => this.failed(err) });
  }

  unlock(user: OrgUser) {
    this.saving.set(true);
    this.api.unlockTenantUser(user._id).subscribe({
      next: res => this.done(res.wasLocked ? `${user.name} unlocked` : `${user.name} was not locked`),
      error: err => this.failed(err)
    });
  }

  forceLogoutUser(user: OrgUser) {
    this.saving.set(true);
    this.api.forceLogoutTenantUser(user._id)
      .subscribe({ next: () => this.done(`${user.name} signed out`), error: err => this.failed(err) });
  }

  openReset(user: OrgUser) {
    this.resetResult.set(null);
    this.resetTarget.set(user);
  }

  closeReset() {
    this.resetTarget.set(null);
    this.resetResult.set(null);
  }

  doReset(mode: 'link' | 'temporary') {
    const user = this.resetTarget();
    if (!user) return;
    this.saving.set(true);
    this.api.resetTenantUserPassword(user._id, mode).subscribe({
      next: res => {
        this.saving.set(false);
        this.resetResult.set({ message: res.message, tempPassword: res.tempPassword, resetUrl: res.resetUrl });
      },
      error: err => this.failed(err)
    });
  }

  openImpersonate() {
    this.impersonateUserId = '';
    this.impersonateReason = '';
    this.impersonateReadOnly = true;
    this.showImpersonate.set(true);
  }

  startImpersonation() {
    const name = this.detail()?.organisation.name;
    this.saving.set(true);
    this.api.impersonate(this.orgId, {
      userId: this.impersonateUserId || undefined,
      readOnly: this.impersonateReadOnly,
      reason: this.impersonateReason.trim()
    }).subscribe({
      next: session => {
        this.saving.set(false);
        this.showImpersonate.set(false);
        // Swaps the active session and navigates into the tenant app. The
        // operator's own token is stashed, so "Exit support session" is one click.
        this.auth.startImpersonation(session, name);
      },
      error: err => this.failed(err)
    });
  }
}
