import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/icons';
import { EmptyStateComponent, PagerComponent, SkeletonRowsComponent } from '../../shared/ui';
import { ApiService } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { ServerList } from '../../core/server-list';
import { AuditEntry, SecurityAlerts } from '../../core/models';
import { fmtDate, downloadBlob } from '../../core/format';

type Tab = 'audit' | 'logins' | 'alerts';

/**
 * The audit and security console (Part 3.4).
 *
 * The backend side of the audit log was rebuilt in Phase 3 — filterable,
 * paginated, indexed, append-only, CSV-exportable — but nothing in the frontend
 * ever called it, so from the console's point of view the trail still did not
 * exist. This is that surface, plus the two things Phase 4's origin capture made
 * possible: login history (who signed in, from where, and who failed) and
 * derived suspicious-activity alerts.
 */
@Component({
  selector: 'app-super-audit',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, IconComponent, EmptyStateComponent, SkeletonRowsComponent, PagerComponent],
  template: `
    <div class="page-head">
      <div>
        <h1>Audit &amp; Security</h1>
        <p>Every recorded change, who made it, and from where</p>
      </div>
      <div class="page-actions">
        @if (tab() === 'audit') {
          <button class="btn secondary" type="button" [disabled]="exporting()" (click)="exportCsv()">
            @if (exporting()) { <span class="spinner"></span> } <app-icon name="download" [size]="13" /> Export CSV
          </button>
        }
      </div>
    </div>

    <div class="toolbar">
      <div class="tabs">
        <button type="button" [class.active]="tab() === 'audit'" (click)="tab.set('audit')">Audit log</button>
        <button type="button" [class.active]="tab() === 'logins'" (click)="onLoginsTab()">Login history</button>
        <button type="button" [class.active]="tab() === 'alerts'" (click)="onAlertsTab()">Alerts</button>
      </div>
    </div>

    @if (tab() === 'audit') {
      <div class="card" style="margin-bottom:16px">
        <div class="grid grid-4">
          <div class="field">
            <label>Action starts with</label>
            <input [ngModel]="audit.filters()['action']" (ngModelChange)="audit.setFilter('action', $event)" placeholder="invoice.">
          </div>
          <div class="field">
            <label>Entity</label>
            <select [ngModel]="audit.filters()['entity']" (ngModelChange)="audit.setFilter('entity', $event)">
              <option value="">Any</option>
              @for (e of entities; track e) { <option [value]="e">{{ e }}</option> }
            </select>
          </div>
          <div class="field">
            <label>From</label>
            <input type="date" [ngModel]="audit.filters()['from']" (ngModelChange)="audit.setFilter('from', $event)">
          </div>
          <div class="field">
            <label>To</label>
            <input type="date" [ngModel]="audit.filters()['to']" (ngModelChange)="audit.setFilter('to', $event)">
          </div>
        </div>
        @if (orgFilter()) {
          <div class="info-box" style="display:flex;gap:8px;align-items:center;justify-content:space-between">
            <span>Filtered to one organisation.</span>
            <button class="btn ghost sm" type="button" (click)="clearOrgFilter()">Show all tenants</button>
          </div>
        }
      </div>

      <div class="card flush">
        @if (audit.loading()) {
          <app-skeleton-rows [count]="6" />
        } @else if (!audit.rows().length) {
          <app-empty-state icon="◷" title="Nothing matches" message="Try a wider date range or a shorter action prefix." />
        } @else {
          <div class="table-wrap">
            <table class="table stack-mobile">
              <thead>
                <tr><th>When</th><th>Action</th><th>Actor</th><th>Entity</th><th>Origin</th><th>Details</th></tr>
              </thead>
              <tbody>
                @for (e of audit.rows(); track e._id) {
                  <tr>
                    <td class="muted" data-label="When" style="white-space:nowrap">{{ fmtDate(e.createdAt) }}</td>
                    <td class="mono" data-label="Action" style="font-size:11px">{{ e.action }}</td>
                    <td data-label="Actor">
                      {{ e.actorName || '—' }}
                      @if (field(e, 'impersonatorName'); as by) {
                        <!-- Both identities. An impersonated action must never be
                             indistinguishable from one the customer performed. -->
                        <div><span class="pill danger">impersonated by {{ by }}</span></div>
                      }
                    </td>
                    <td data-label="Entity">
                      {{ e.entity || '—' }}
                      @if (e.orgId) {
                        <a class="muted" style="font-size:11px;display:block" [routerLink]="['/super-admin/organisations', e.orgId]">open tenant →</a>
                      }
                    </td>
                    <td class="mono muted" data-label="Origin" style="font-size:11px">{{ field(e, 'ip') || '—' }}</td>
                    <td class="muted" data-label="Details" style="font-size:11px;max-width:280px;word-break:break-word">{{ summarise(e) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <app-pager [page]="audit.page()" [pageSize]="audit.pageSize()" [total]="audit.total()"
            (pageChange)="audit.onPage($event)" (pageSizeChange)="audit.onPageSize($event)" />
        }
      </div>
    }

    @if (tab() === 'logins') {
      <div class="card" style="margin-bottom:16px">
        <div class="grid grid-3">
          <div class="field">
            <label>Outcome</label>
            <select [ngModel]="logins.filters()['outcome']" (ngModelChange)="logins.setFilter('outcome', $event)">
              <option value="">All</option>
              <option value="success">Successful</option>
              <option value="failure">Failed</option>
            </select>
          </div>
          <div class="field">
            <label>IP address</label>
            <input class="mono" [ngModel]="logins.filters()['ip']" (ngModelChange)="logins.setFilter('ip', $event)" placeholder="203.0.113.9">
          </div>
        </div>
      </div>

      <div class="card flush">
        @if (logins.loading()) {
          <app-skeleton-rows [count]="6" />
        } @else if (!logins.rows().length) {
          <app-empty-state icon="◷" title="No sign-ins recorded"
            message="Login history starts from the point the trail began recording the origin of a request." />
        } @else {
          <div class="table-wrap">
            <table class="table stack-mobile">
              <thead><tr><th>When</th><th>Outcome</th><th>Account</th><th>IP</th><th>Device</th></tr></thead>
              <tbody>
                @for (e of logins.rows(); track e._id) {
                  <tr>
                    <td class="muted" data-label="When" style="white-space:nowrap">{{ fmtDate(e.createdAt) }}</td>
                    <td data-label="Outcome">
                      <span class="pill" [class.danger]="e.action === 'auth.login_failed'">
                        {{ e.action === 'auth.login_failed' ? 'Failed' : 'Success' }}
                      </span>
                    </td>
                    <td data-label="Account">
                      <div class="strong">{{ e.actorName || '—' }}</div>
                      <div class="muted" style="font-size:11px">{{ field(e, 'meta.email') || '' }}</div>
                    </td>
                    <td class="mono" data-label="IP" style="font-size:11px">{{ field(e, 'ip') || '—' }}</td>
                    <td class="muted" data-label="Device" style="font-size:11px;max-width:260px;word-break:break-word">{{ field(e, 'userAgent') || '—' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <app-pager [page]="logins.page()" [pageSize]="logins.pageSize()" [total]="logins.total()"
            (pageChange)="logins.onPage($event)" (pageSizeChange)="logins.onPageSize($event)" />
        }
      </div>
    }

    @if (tab() === 'alerts') {
      <div class="toolbar">
        <div class="tabs">
          @for (w of windows; track w) {
            <button type="button" [class.active]="hours() === w" (click)="onHours(w)">Last {{ w }}h</button>
          }
        </div>
      </div>

      @if (alerts(); as a) {
        <div class="card-sub" style="margin-bottom:14px">
          <!-- The rules are shown, not just their findings. An alert whose threshold
               the operator cannot see is one they learn to ignore. -->
          Thresholds: {{ a.thresholds.failedLoginsPerIp }}+ failed sign-ins per IP ·
          {{ a.thresholds.deletesPerActor }}+ deletions per actor ·
          {{ a.thresholds.exportsPerOrg }}+ exports per tenant, within {{ a.windowHours }}h.
        </div>

        <section class="grid grid-2" style="margin-bottom:20px">
          <div class="card flush">
            <div class="card-head"><div><div class="card-title">Possible brute force</div><div class="card-sub">Repeated failed sign-ins from one address</div></div></div>
            @if (a.bruteForce.length) {
              <div class="table-wrap">
                <table class="table">
                  <thead><tr><th>IP</th><th class="num">Attempts</th><th class="num">Accounts</th><th>Last</th></tr></thead>
                  <tbody>
                    @for (b of a.bruteForce; track b.ip) {
                      <tr>
                        <td class="mono" style="font-size:11px">{{ b.ip }}</td>
                        <td class="num strong">{{ b.attempts }}</td>
                        <td class="num">{{ b.accountCount }}</td>
                        <td class="muted">{{ fmtDate(b.last) }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            } @else {
              <app-empty-state icon="✓" title="Nothing unusual" message="No address has failed repeatedly in this window." />
            }
          </div>

          <div class="card flush">
            <div class="card-head"><div><div class="card-title">Bulk deletions</div><div class="card-sub">One actor removing a lot at once</div></div></div>
            @if (a.massDeletes.length) {
              <div class="table-wrap">
                <table class="table">
                  <thead><tr><th>Actor</th><th class="num">Deletions</th><th>Last</th></tr></thead>
                  <tbody>
                    @for (m of a.massDeletes; track m.actorId) {
                      <tr>
                        <td>{{ m.actorName || m.actorId || '—' }}</td>
                        <td class="num strong">{{ m.count }}</td>
                        <td class="muted">{{ fmtDate(m.last) }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            } @else {
              <app-empty-state icon="✓" title="Nothing unusual" message="No unusual deletion volume in this window." />
            }
          </div>
        </section>

        <section class="grid grid-2" style="margin-bottom:20px">
          <div class="card flush">
            <div class="card-head"><div><div class="card-title">Heavy exporting</div><div class="card-sub">A tenant pulling data out repeatedly</div></div></div>
            @if (a.massExports.length) {
              <div class="table-wrap">
                <table class="table">
                  <thead><tr><th>Tenant</th><th class="num">Exports</th><th>Last</th><th></th></tr></thead>
                  <tbody>
                    @for (m of a.massExports; track m.orgId) {
                      <tr>
                        <td>{{ m.orgName || m.orgId }}</td>
                        <td class="num strong">{{ m.count }}</td>
                        <td class="muted">{{ fmtDate(m.last) }}</td>
                        <td><a class="btn ghost sm" [routerLink]="['/super-admin/organisations', m.orgId]">Open</a></td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            } @else {
              <app-empty-state icon="✓" title="Nothing unusual" message="No tenant is exporting heavily." />
            }
          </div>

          <div class="card flush">
            <div class="card-head">
              <div>
                <div class="card-title">Off-hours platform actions</div>
                <div class="card-sub">Console activity before 07:00 or after 22:00 IST</div>
              </div>
            </div>
            @if (a.offHoursPlatformActions.length) {
              <div class="table-wrap">
                <table class="table">
                  <thead><tr><th>When</th><th>Action</th><th>Actor</th></tr></thead>
                  <tbody>
                    @for (o of a.offHoursPlatformActions; track o._id) {
                      <tr>
                        <td class="muted" style="white-space:nowrap">{{ fmtDate(o.createdAt) }} · {{ o.hour }}:00</td>
                        <td class="mono" style="font-size:11px">{{ o.action }}</td>
                        <td>{{ o.actorName || '—' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            } @else {
              <app-empty-state icon="✓" title="Nothing unusual" message="No platform action outside working hours." />
            }
          </div>
        </section>

        <section class="card flush">
          <div class="card-head">
            <div>
              <div class="card-title">Support sessions</div>
              <div class="card-sub">Every time a platform account viewed a tenant's data as them</div>
            </div>
          </div>
          @if (a.impersonations.length) {
            <div class="table-wrap">
              <table class="table stack-mobile">
                <thead><tr><th>When</th><th>Operator</th><th>Tenant</th><th>Mode</th><th>Reason</th></tr></thead>
                <tbody>
                  @for (i of a.impersonations; track i._id) {
                    <tr>
                      <td class="muted" data-label="When" style="white-space:nowrap">{{ fmtDate(i.createdAt) }}</td>
                      <td data-label="Operator">{{ i.actorName || '—' }}</td>
                      <td data-label="Tenant">
                        {{ field(i, 'meta.orgName') || '—' }}
                        <div class="muted" style="font-size:11px">{{ field(i, 'meta.targetEmail') || '' }}</div>
                      </td>
                      <td data-label="Mode">
                        <span class="pill" [class.danger]="field(i, 'meta.readOnly') === false">
                          {{ field(i, 'meta.readOnly') === false ? 'Read-write' : 'Read-only' }}
                        </span>
                      </td>
                      <td class="muted" data-label="Reason" style="font-size:11px;max-width:280px;word-break:break-word">{{ field(i, 'meta.reason') || '—' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <app-empty-state icon="◷" title="No support sessions" message="Nobody has viewed a tenant's account in this window." />
          }
        </section>
      } @else {
        <div class="card flush"><app-skeleton-rows [count]="5" /></div>
      }
    }
  `
})
export class SuperAuditComponent implements OnInit, OnDestroy {
  tab = signal<Tab>('audit');
  exporting = signal(false);
  hours = signal(24);
  alerts = signal<SecurityAlerts | null>(null);
  orgFilter = signal('');

  windows = [24, 72, 168];
  entities = ['organisation', 'user', 'invoice', 'payment', 'creditNote', 'client', 'item', 'plan', 'setting', 'master', 'metrics'];

  audit = new ServerList<AuditEntry>(params => this.api.superAuditLogs(params));
  logins = new ServerList<AuditEntry>(params => this.api.loginHistory(params));

  fmtDate = fmtDate;

  constructor(private api: ApiService, private toast: ToastService, private route: ActivatedRoute) {}

  ngOnInit() {
    // The tenant drill-down links here with `?orgId=`, so "full audit for this
    // customer" is one click rather than a filter the operator has to retype.
    const orgId = this.route.snapshot.queryParamMap.get('orgId');
    if (orgId) {
      this.orgFilter.set(orgId);
      this.audit.setFilter('orgId', orgId);
    } else {
      this.audit.refresh();
    }
  }

  ngOnDestroy() {
    this.audit.dispose();
    this.logins.dispose();
  }

  clearOrgFilter() {
    this.orgFilter.set('');
    this.audit.setFilter('orgId', undefined);
  }

  onLoginsTab() {
    this.tab.set('logins');
    if (!this.logins.rows().length) this.logins.refresh();
  }

  onAlertsTab() {
    this.tab.set('alerts');
    if (!this.alerts()) this.loadAlerts();
  }

  onHours(hours: number) {
    this.hours.set(hours);
    this.loadAlerts();
  }

  loadAlerts() {
    this.alerts.set(null);
    this.api.securityAlerts(this.hours()).subscribe({
      next: a => this.alerts.set(a),
      error: err => this.toast.httpError(err)
    });
  }

  /**
   * Reads a possibly-absent field, including a dotted path into `meta`.
   *
   * The audit entry's shape varies by action — `meta` is deliberately free-form —
   * so the template needs a tolerant reader rather than a typed accessor per field.
   */
  field(entry: AuditEntry, path: string): unknown {
    return path.split('.').reduce<unknown>((value, key) => {
      if (value && typeof value === 'object') return (value as Record<string, unknown>)[key];
      return undefined;
    }, entry as unknown);
  }

  /** A compact one-line rendering of `meta`, which has no fixed shape. */
  summarise(entry: AuditEntry): string {
    if (!entry.meta || typeof entry.meta !== 'object') return '';
    return Object.entries(entry.meta)
      .filter(([, value]) => value !== null && value !== undefined && value !== '')
      .map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`)
      .join(' · ')
      .slice(0, 220);
  }

  /** The whole filtered set, streamed server-side — not just the visible page. */
  exportCsv() {
    this.exporting.set(true);
    this.api.exportAuditLogsCsv(this.audit.params()).subscribe({
      next: blob => { this.exporting.set(false); downloadBlob(blob, 'audit-log.csv'); },
      error: err => { this.exporting.set(false); this.toast.httpError(err); }
    });
  }
}
