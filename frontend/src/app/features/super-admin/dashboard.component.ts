import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/icons';
import { EmptyStateComponent, SkeletonRowsComponent } from '../../shared/ui';
import { BarChartComponent, BarChartPoint } from '../../shared/bar-chart.component';
import { ApiService } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { AttentionLists, FeatureAdoption, MetricsSeries, PlatformSummary, SystemHealth } from '../../core/models';
import { fmtINR, fmtINRCompact, fmtDate } from '../../core/format';

type ChartMetric = 'signups' | 'invoicesCreated' | 'activeUsers' | 'invoiceValue' | 'mrr';

const CHART_METRICS: Array<{ key: ChartMetric; label: string; money: boolean }> = [
  { key: 'signups', label: 'Signups', money: false },
  { key: 'invoicesCreated', label: 'Invoices created', money: false },
  { key: 'activeUsers', label: 'Active users', money: false },
  { key: 'invoiceValue', label: 'Invoice value', money: true },
  { key: 'mrr', label: 'MRR', money: true }
];

/**
 * The platform observability dashboard (Part 3.1).
 *
 * The console had no dashboard at all: `/super-admin` redirected to the
 * organisation list, and the only platform-wide figures anywhere were eight scalar
 * counts rendered above that table — one of which, "Platform Revenue", was actually
 * the sum of every tenant's collections from their own customers.
 *
 * Everything here reads from the event-capture and rollup layer added in this phase
 * (`UsageEvent` → `MetricsDaily`). Before it there was no data to draw a single one
 * of these charts from; `User.lastLoginAt` was the entire usage signal in the
 * product.
 */
@Component({
  selector: 'app-super-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, IconComponent, EmptyStateComponent, SkeletonRowsComponent, BarChartComponent],
  template: `
    <div class="page-head">
      <div>
        <h1>Platform Overview</h1>
        <p>Revenue, growth, engagement and volume across every tenant</p>
      </div>
      <div class="page-actions">
        <select [ngModel]="days()" (ngModelChange)="onDays($event)" style="max-width:150px">
          <option [value]="7">Last 7 days</option>
          <option [value]="30">Last 30 days</option>
          <option [value]="90">Last 90 days</option>
        </select>
        <button class="btn secondary" type="button" [disabled]="rebuilding()" (click)="rebuild()">
          @if (rebuilding()) { <span class="spinner"></span> } Rebuild metrics
        </button>
      </div>
    </div>

    @if (loading()) {
      <div class="card flush"><app-skeleton-rows [count]="6" /></div>
    }

    @if (summary(); as s) {
      <!-- Platform revenue. Kept visibly separate from GMV: they differ by orders
           of magnitude and conflating them is how the old overview came to report
           our customers' revenue as our own. -->
      <section class="grid grid-5" style="margin-bottom:20px">
        <div class="card metric indigo">
          <div class="accent"></div>
          <div class="metric-row"><span class="label">MRR</span><span class="m-icon"><app-icon name="rupee" [size]="15" /></span></div>
          <div class="value" [title]="fmtINR(s.revenue.mrr, true)">{{ fmtINRCompact(s.revenue.mrr) }}</div>
          <div class="sub">{{ s.revenue.payingOrgs }} paying {{ s.revenue.payingOrgs === 1 ? 'tenant' : 'tenants' }}</div>
        </div>
        <div class="card metric purple">
          <div class="accent"></div>
          <div class="metric-row"><span class="label">ARR</span><span class="m-icon"><app-icon name="chart" [size]="15" /></span></div>
          <div class="value" [title]="fmtINR(s.revenue.arr, true)">{{ fmtINRCompact(s.revenue.arr) }}</div>
          <div class="sub">MRR × 12</div>
        </div>
        <div class="card metric success">
          <div class="accent"></div>
          <div class="metric-row"><span class="label">ARPA</span><span class="m-icon"><app-icon name="users" [size]="15" /></span></div>
          <div class="value">{{ s.revenue.arpa === null ? '—' : fmtINRCompact(s.revenue.arpa) }}</div>
          <div class="sub">Per paying account</div>
        </div>
        <div class="card metric warning">
          <div class="accent"></div>
          <div class="metric-row"><span class="label">GMV</span><span class="m-icon"><app-icon name="creditCard" [size]="15" /></span></div>
          <div class="value" [title]="fmtINR(s.revenue.gmv, true)">{{ fmtINRCompact(s.revenue.gmv) }}</div>
          <!-- Spelled out, because this figure was previously labelled as ours. -->
          <div class="sub">Tenant collections, not our revenue</div>
        </div>
        <div class="card metric">
          <div class="accent"></div>
          <div class="metric-row"><span class="label">Tenants</span><span class="m-icon"><app-icon name="package" [size]="15" /></span></div>
          <div class="value">{{ s.growth.orgsTotal }}</div>
          <div class="sub">{{ s.growth.byStatus.active }} active · {{ s.growth.byStatus.trial }} trial · {{ s.growth.byStatus.suspended }} suspended</div>
        </div>
      </section>

      <section class="grid grid-4" style="margin-bottom:20px">
        <div class="card metric">
          <div class="accent"></div>
          <div class="metric-row"><span class="label">Signups</span><span class="m-icon"><app-icon name="plus" [size]="15" /></span></div>
          <div class="value">{{ s.growth.signups.last30d }}</div>
          <div class="sub">{{ s.growth.signups.last24h }} today · {{ s.growth.signups.last7d }} this week</div>
        </div>
        <div class="card metric success">
          <div class="accent"></div>
          <div class="metric-row"><span class="label">Activation</span><span class="m-icon"><app-icon name="checkCircle" [size]="15" /></span></div>
          <div class="value">{{ s.growth.activationRate }}%</div>
          <div class="sub">{{ s.growth.activatedOrgs }} of {{ s.growth.orgsTotal }} raised an invoice</div>
        </div>
        <div class="card metric warning">
          <div class="accent"></div>
          <div class="metric-row"><span class="label">Trials ending</span><span class="m-icon"><app-icon name="clock" [size]="15" /></span></div>
          <div class="value">{{ s.growth.trials.expiringIn7d }}</div>
          <div class="sub">{{ s.growth.trials.expired }} already lapsed</div>
        </div>
        <div class="card metric indigo">
          <div class="accent"></div>
          <div class="metric-row"><span class="label">DAU / WAU / MAU</span><span class="m-icon"><app-icon name="eye" [size]="15" /></span></div>
          <div class="value" style="font-size:20px">{{ s.engagement.dau }} / {{ s.engagement.wau }} / {{ s.engagement.mau }}</div>
          <div class="sub">Stickiness {{ s.engagement.stickiness }}% · {{ s.engagement.activeOrgs30d }} orgs active</div>
        </div>
      </section>

      <!-- Trend. One chart with a metric switcher rather than five charts: they
           are read one at a time, and five bar charts is a wall, not a dashboard. -->
      <section class="grid grid-wide" style="margin-bottom:20px">
        <div class="card">
          <div class="card-head">
            <div>
              <div class="card-title">{{ metricLabel() }}</div>
              <div class="card-sub">Daily, last {{ series()?.days || days() }} days</div>
            </div>
            <select [ngModel]="metric()" (ngModelChange)="metric.set($event)" style="max-width:180px">
              @for (m of chartMetrics; track m.key) { <option [value]="m.key">{{ m.label }}</option> }
            </select>
          </div>
          <app-bar-chart [data]="chartData()" [formatValue]="chartFormatter()"
            emptyIcon="▤" emptyTitle="No data yet"
            emptyMessage="Usage is captured from today onwards. Rebuild metrics to backfill from existing records." />
        </div>
        <div class="card">
          <div class="card-title">Revenue by plan</div>
          <div class="card-sub" style="margin-bottom:16px">Monthly recurring, per plan</div>
          @if (s.revenue.byPlan.length) {
            <div style="display:grid;gap:14px">
              @for (p of s.revenue.byPlan; track p.planCode) {
                <div>
                  <div style="display:flex;justify-content:space-between;margin-bottom:5px">
                    <span style="font-weight:600;font-size:12.5px">{{ p.planName }} <span class="muted">({{ p.orgs }})</span></span>
                    <span style="font-weight:700;font-size:12.5px;color:var(--brand)">{{ fmtINR(p.mrr, true) }}</span>
                  </div>
                  <div class="hbar" [style.width.%]="planBarWidth(p.mrr)"></div>
                </div>
              }
            </div>
          } @else {
            <app-empty-state icon="◫" title="No subscriptions yet" message="Plan revenue appears once a tenant is billed." />
          }
        </div>
      </section>

      <!-- Volume -->
      <section class="grid grid-4" style="margin-bottom:20px">
        <div class="stat-block">
          <div class="sb-label">Invoices (30d)</div>
          <div class="sb-value">{{ s.volume.invoices30d }}</div>
        </div>
        <div class="stat-block">
          <div class="sb-label">Invoice value (30d)</div>
          <div class="sb-value">{{ fmtINRCompact(s.volume.invoiceValue30d) }}</div>
        </div>
        <div class="stat-block">
          <div class="sb-label">Invoices (all time)</div>
          <div class="sb-value">{{ s.volume.invoicesTotal }}</div>
        </div>
        <div class="stat-block">
          <div class="sb-label">Credit notes</div>
          <div class="sb-value">{{ s.volume.creditNotesTotal }}</div>
        </div>
      </section>
    }

    <!-- The two lists worth acting on. Counts are for reporting; these are for
         doing something today, which is why they are tables of names. -->
    <section class="grid grid-2" style="margin-bottom:20px">
      <div class="card flush">
        <div class="card-head">
          <div>
            <div class="card-title">At risk</div>
            <div class="card-sub">Active or trialling, and quiet for 14+ days</div>
          </div>
        </div>
        @if (attention()?.atRisk?.length) {
          <div class="table-wrap">
            <table class="table stack-mobile">
              <thead><tr><th>Tenant</th><th>Plan</th><th>Last active</th><th></th></tr></thead>
              <tbody>
                @for (o of attention()!.atRisk; track o._id) {
                  <tr>
                    <td data-label="Tenant">
                      <div class="strong">{{ o.name }}</div>
                      <div class="muted" style="font-size:11px">{{ o.adminEmail }}</div>
                    </td>
                    <td data-label="Plan"><span class="pill">{{ o.plan }}</span></td>
                    <td data-label="Last active">
                      @if (o.inactiveDays === null) {
                        <span class="muted">Never signed in</span>
                      } @else {
                        {{ o.inactiveDays }} days ago
                      }
                    </td>
                    <td data-label=""><a class="btn ghost sm" [routerLink]="['/super-admin/organisations', o._id]">Open</a></td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else if (!loading()) {
          <app-empty-state icon="✓" title="Nothing at risk" message="Every paying tenant has been active recently." />
        }
      </div>

      <div class="card flush">
        <div class="card-head">
          <div>
            <div class="card-title">Trials ending soon</div>
            <div class="card-sub">Next 7 days</div>
          </div>
        </div>
        @if (attention()?.trialsExpiring?.length) {
          <div class="table-wrap">
            <table class="table stack-mobile">
              <thead><tr><th>Tenant</th><th>Ends</th><th>Last active</th><th></th></tr></thead>
              <tbody>
                @for (o of attention()!.trialsExpiring; track o._id) {
                  <tr>
                    <td data-label="Tenant">
                      <div class="strong">{{ o.name }}</div>
                      <div class="muted" style="font-size:11px">{{ o.adminEmail }}</div>
                    </td>
                    <td data-label="Ends">{{ fmtDate(o.trialEndsAt) }}</td>
                    <td class="muted" data-label="Last active">{{ o.lastActiveAt ? fmtDate(o.lastActiveAt) : 'Never' }}</td>
                    <td data-label=""><a class="btn ghost sm" [routerLink]="['/super-admin/organisations', o._id]">Open</a></td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else if (!loading()) {
          <app-empty-state icon="◷" title="No trials ending" message="Nothing lapses in the next 7 days." />
        }
      </div>
    </section>

    <!-- Feature adoption -->
    <section class="card" style="margin-bottom:20px">
      <div class="card-head">
        <div>
          <div class="card-title">Feature adoption</div>
          <div class="card-sub">Share of all {{ adoption()?.orgsTotal || 0 }} tenants that used each capability in the last {{ adoption()?.days || 30 }} days</div>
        </div>
      </div>
      @if (adoption(); as a) {
        <div class="grid grid-2" style="gap:14px 26px">
          @for (f of a.features; track f.key) {
            <div>
              <div style="display:flex;justify-content:space-between;margin-bottom:5px">
                <span style="font-weight:600;font-size:12.5px">{{ f.label }}</span>
                <span style="font-weight:700;font-size:12.5px;color:var(--brand)">{{ f.rate }}% <span class="muted" style="font-weight:500">({{ f.orgs }})</span></span>
              </div>
              <div class="hbar" [style.width.%]="f.rate"></div>
            </div>
          }
        </div>
      }
    </section>

    <!-- Operations: broadcast + system health -->
    <section class="grid grid-2">
      <div class="card">
        <div class="card-title">Platform announcement</div>
        <div class="card-sub" style="margin-bottom:14px">
          Shown as a banner to every tenant until it expires. Leave the message empty to clear it.
        </div>
        <div class="field">
          <label>Message</label>
          <textarea rows="3" [(ngModel)]="broadcastMessage" placeholder="Scheduled maintenance on Sunday 02:00–04:00 IST."></textarea>
        </div>
        <div class="grid grid-2">
          <div class="field">
            <label>Level</label>
            <select [(ngModel)]="broadcastLevel">
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="danger">Critical</option>
            </select>
          </div>
          <div class="field">
            <label>Expires</label>
            <input type="date" [(ngModel)]="broadcastExpires">
          </div>
        </div>
        <div class="actions" style="justify-content:flex-end">
          <button class="btn secondary" type="button" [disabled]="savingBroadcast()" (click)="clearBroadcast()">Clear</button>
          <button class="btn primary" type="button" [disabled]="savingBroadcast() || !broadcastMessage.trim()" (click)="saveBroadcast()">
            @if (savingBroadcast()) { <span class="spinner"></span> } Publish
          </button>
        </div>
      </div>

      <div class="card">
        <div class="card-head">
          <div>
            <div class="card-title">System health</div>
            <div class="card-sub">{{ health()?.requests?.scope || 'Live figures' }}</div>
          </div>
          <button class="btn ghost sm" type="button" (click)="loadHealth()">Refresh</button>
        </div>
        @if (health(); as h) {
          @if (h.jobs) {
            <!--
              Background jobs, on the page an operator already opens.

              A job that has quietly stopped is invisible by definition — a
              crashed timer looks exactly like "no work to do" — so the fact has
              to appear somewhere people go for other reasons. A dedicated screen
              nobody visits is the same as no screen.
            -->
            <div style="margin-bottom:14px">
              @if (h.jobs.unhealthy) {
                <div class="info-box danger" style="margin-bottom:10px;display:flex;gap:8px;align-items:flex-start">
                  <app-icon name="alertTriangle" [size]="15" style="flex-shrink:0;margin-top:1px" />
                  <span>
                    <strong>{{ h.jobs.unhealthy }} background job{{ h.jobs.unhealthy === 1 ? ' is' : 's are' }} not running as expected.</strong>
                    Reminders, recurring invoices and overdue marking all depend on these.
                  </span>
                </div>
              }
              <div style="display:grid;gap:6px">
                @for (job of h.jobs.jobs; track job.name) {
                  <div style="display:flex;align-items:center;gap:10px;font-size:12.5px">
                    <span class="pill" [class.success]="job.state === 'healthy'"
                      [class.danger]="job.state === 'never' || job.state === 'stuck' || job.state === 'late'"
                      [class.warn]="job.state === 'failing'">{{ jobStateLabel(job.state) }}</span>
                    <span class="strong" style="flex:1">{{ job.label }}</span>
                    <span class="muted">
                      @if (job.lastRunAt) { {{ fmtDate(job.lastRunAt) }} } @else { never run }
                    </span>
                  </div>
                  @if (job.lastError) {
                    <div class="muted" style="font-size:11px;margin:-2px 0 4px 66px;color:var(--red)">{{ job.lastError }}</div>
                  }
                }
              </div>
            </div>
          }
          <div class="grid grid-2" style="gap:10px">
            <div class="stat-block">
              <div class="sb-label">Database</div>
              <div class="sb-value">{{ h.database.state }}{{ h.database.replicaSet ? ' · ' + h.database.replicaSet : '' }}</div>
            </div>
            <div class="stat-block">
              <div class="sb-label">Transactions</div>
              <div class="sb-value">{{ h.database.transactionsSupported ? 'Supported' : 'Not available' }}</div>
            </div>
            <div class="stat-block">
              <div class="sb-label">Requests / min</div>
              <div class="sb-value">{{ h.requests.requestsPerMinute }}</div>
            </div>
            <div class="stat-block">
              <div class="sb-label">5xx rate</div>
              <div class="sb-value">{{ h.requests.errorRate }}%</div>
            </div>
            <div class="stat-block">
              <div class="sb-label">Latency p50 / p95</div>
              <div class="sb-value">{{ h.requests.latency.p50 }} / {{ h.requests.latency.p95 }} ms</div>
            </div>
            <div class="stat-block">
              <div class="sb-label">Data size</div>
              <div class="sb-value">{{ mb(h.database.dataSizeBytes) }}</div>
            </div>
          </div>
          @if (!h.process.emailConfigured || !h.process.billingConfigured) {
            <!-- The first question when "reminders aren't arriving" or "billing did
                 nothing" is whether the integration is configured at all. -->
            <div class="info-box warn" style="margin-top:12px;display:flex;gap:8px;align-items:flex-start">
              <app-icon name="alertTriangle" [size]="15" style="flex-shrink:0;margin-top:1px" />
              <span>
                @if (!h.process.emailConfigured) { No email provider is configured — reminders and invites are not delivered. }
                @if (!h.process.emailConfigured && !h.process.billingConfigured) { <br /> }
                @if (!h.process.billingConfigured) { Razorpay is not configured — paid plans cannot be charged. }
              </span>
            </div>
          }
          @if (h.requests.slowestRoutes.length) {
            <div class="card-title" style="margin:16px 0 8px;font-size:12px">Slowest routes (p95)</div>
            <div class="table-wrap">
              <table class="table">
                <thead><tr><th>Route</th><th class="num">p95</th><th class="num">Calls</th><th class="num">5xx</th></tr></thead>
                <tbody>
                  @for (r of h.requests.slowestRoutes.slice(0, 6); track r.route) {
                    <tr>
                      <td class="mono" style="font-size:11px">{{ r.route }}</td>
                      <td class="num">{{ r.p95 }} ms</td>
                      <td class="num">{{ r.count }}</td>
                      <td class="num">{{ r.errors }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        }
      </div>
    </section>
  `
})
export class SuperDashboardComponent implements OnInit {
  loading = signal(true);
  rebuilding = signal(false);
  savingBroadcast = signal(false);

  summary = signal<PlatformSummary | null>(null);
  series = signal<MetricsSeries | null>(null);
  attention = signal<AttentionLists | null>(null);
  adoption = signal<FeatureAdoption | null>(null);
  health = signal<SystemHealth | null>(null);

  /**
   * Plain words for the job states.
   *
   * `late` and `never` are the two that matter and neither is self-explanatory
   * as a bare enum: "late" means the work is not getting done, whether because
   * it is failing or because the timer died, and those are the same problem from
   * the outside.
   */
  jobStateLabel(state: string): string {
    return {
      healthy: 'OK',
      running: 'Running',
      failing: 'Failing',
      late: 'Not running',
      stuck: 'Stuck',
      never: 'Never ran'
    }[state] || state;
  }

  days = signal(30);
  metric = signal<ChartMetric>('signups');
  chartMetrics = CHART_METRICS;

  broadcastMessage = '';
  broadcastLevel = 'info';
  broadcastExpires = '';

  fmtINR = fmtINR;
  fmtINRCompact = fmtINRCompact;
  fmtDate = fmtDate;

  constructor(private api: ApiService, private toast: ToastService) {}

  ngOnInit() {
    this.load();
    this.loadHealth();
  }

  load() {
    this.loading.set(true);
    this.api.platformSummary().subscribe({
      next: s => { this.summary.set(s); this.loading.set(false); },
      error: err => { this.loading.set(false); this.toast.httpError(err); }
    });
    this.loadSeries();
    this.api.platformAttention().subscribe({ next: a => this.attention.set(a), error: () => {} });
    this.api.platformAdoption(30).subscribe({ next: a => this.adoption.set(a), error: () => {} });
  }

  loadSeries() {
    this.api.platformSeries(this.days()).subscribe({ next: s => this.series.set(s), error: () => {} });
  }

  loadHealth() {
    this.api.systemHealth().subscribe({ next: h => this.health.set(h), error: err => this.toast.httpError(err) });
  }

  onDays(value: string | number) {
    this.days.set(Number(value));
    this.loadSeries();
  }

  metricLabel(): string {
    return CHART_METRICS.find(m => m.key === this.metric())?.label || '';
  }

  private isMoneyMetric(): boolean {
    return CHART_METRICS.find(m => m.key === this.metric())?.money === true;
  }

  chartFormatter = computed<(v: number) => string>(() =>
    this.isMoneyMetric() ? ((v: number) => fmtINR(v, true)) : ((v: number) => String(v)));

  /**
   * The selected metric as chart points.
   *
   * Days where the value is `null` are dropped rather than plotted as zero: the
   * snapshot metrics (MRR, status mix) are genuinely unknown for a backfilled day,
   * and a zero would read as "we had no revenue that day".
   */
  chartData = computed<BarChartPoint[]>(() => {
    const rows = this.series()?.series || [];
    const key = this.metric();
    return rows
      .filter(row => row[key] !== null && row[key] !== undefined)
      .map(row => ({ label: row.date.slice(5), value: Number(row[key]) || 0 }));
  });

  planBarWidth(mrr: number): number {
    const max = Math.max(...(this.summary()?.revenue.byPlan || []).map(p => p.mrr), 1);
    return Math.max(4, Math.round((mrr / max) * 100));
  }

  mb(bytes?: number): string {
    if (!bytes) return '—';
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  rebuild() {
    this.rebuilding.set(true);
    this.api.rebuildMetrics(this.days()).subscribe({
      next: res => {
        this.rebuilding.set(false);
        this.toast.success(`Recomputed ${res.days} days of metrics`);
        this.load();
      },
      error: err => { this.rebuilding.set(false); this.toast.httpError(err); }
    });
  }

  saveBroadcast() {
    this.savingBroadcast.set(true);
    this.api.setBroadcast({
      message: this.broadcastMessage.trim(),
      level: this.broadcastLevel,
      expiresAt: this.broadcastExpires || null
    }).subscribe({
      next: () => { this.savingBroadcast.set(false); this.toast.success('Announcement published to every tenant'); },
      error: err => { this.savingBroadcast.set(false); this.toast.httpError(err); }
    });
  }

  clearBroadcast() {
    this.savingBroadcast.set(true);
    this.api.setBroadcast({ message: '' }).subscribe({
      next: () => {
        this.savingBroadcast.set(false);
        this.broadcastMessage = '';
        this.toast.info('Announcement cleared');
      },
      error: err => { this.savingBroadcast.set(false); this.toast.httpError(err); }
    });
  }
}
