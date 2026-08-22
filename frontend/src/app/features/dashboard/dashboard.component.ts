import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AppShellComponent } from '../../shared/app-shell.component';
import { IconComponent } from '../../shared/icons';
import { AvatarComponent, EmptyStateComponent, PillComponent, SkeletonRowsComponent } from '../../shared/ui';
import { BarChartComponent, BarChartPoint } from '../../shared/bar-chart.component';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { Invoice, InvoiceStats } from '../../core/models';
import { fmtINR, fmtINRCompact, fmtDate, monthLabel } from '../../core/format';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, AppShellComponent, IconComponent, PillComponent, AvatarComponent, EmptyStateComponent, SkeletonRowsComponent, BarChartComponent],
  template: `
    <app-shell title="Dashboard" subtitle="Here's your billing overview for today">
      <a actions class="btn primary" routerLink="/invoices/new">+ New Invoice</a>

      @if (missingBusinessDetails().length) {
        <!--
          On the dashboard, not only on the page that fixes it — a tenant who
          never opens Business Profile never learns that their invoices are not
          valid tax invoices. Admin only, because only an admin can act on it,
          and a warning shown to somebody who cannot fix it is just noise.
        -->
        <div class="info-box danger" style="margin-bottom:18px;line-height:1.6">
          <strong>Your invoices are going out without {{ missingBusinessDetails().join(' and ') }}.</strong>
          A tax invoice has to carry your business's name, address and GSTIN, or your customer
          cannot claim input tax credit against it.
          <a routerLink="/business" style="color:inherit;font-weight:700;text-decoration:underline;">Add them now</a> —
          it takes a minute.
        </div>
      }

      @if (loading()) {
        <div class="card flush"><app-skeleton-rows [count]="6" /></div>
      }
      @if (stats(); as s) {
        <!-- Metrics -->
        <section class="grid grid-4" style="margin-bottom:20px;">
          <div class="card metric indigo hoverable">
            <div class="accent"></div>
            <div class="metric-row"><span class="label">Total Revenue</span><span class="m-icon"><app-icon name="rupee" [size]="15" /></span></div>
            <div class="value" [title]="fmtINR(s.totalRevenue, true)">{{ fmtINRCompact(s.totalRevenue) }}</div>
            <div class="sub" style="color:var(--green)">{{ s.counts.paid }} paid invoices</div>
          </div>
          <div class="card metric warning hoverable">
            <div class="accent"></div>
            <div class="metric-row"><span class="label">Pending</span><span class="m-icon"><app-icon name="clock" [size]="15" /></span></div>
            <div class="value" [title]="fmtINR(s.pendingAmount, true)">{{ fmtINRCompact(s.pendingAmount) }}</div>
            <div class="sub" style="color:var(--amber)">{{ s.counts.pending }} awaiting payment</div>
          </div>
          <div class="card metric danger hoverable">
            <div class="accent"></div>
            <div class="metric-row"><span class="label">Overdue</span><span class="m-icon"><app-icon name="alertTriangle" [size]="15" /></span></div>
            <div class="value" [title]="fmtINR(s.overdueAmount, true)">{{ fmtINRCompact(s.overdueAmount) }}</div>
            <div class="sub" style="color:var(--red)">{{ s.counts.overdue }} require attention</div>
          </div>
          <div class="card metric purple hoverable">
            <div class="accent"></div>
            <div class="metric-row"><span class="label">Total Invoices</span><span class="m-icon"><app-icon name="invoice" [size]="15" /></span></div>
            <div class="value">{{ s.counts.total }}</div>
            <div class="sub">{{ s.counts.paid }} paid · {{ s.counts.pending }} pending · {{ s.counts.draft }} draft</div>
          </div>
        </section>

        <!-- Charts -->
        <section class="grid grid-wide" style="margin-bottom:20px;">
          <div class="card">
            <div class="card-title">Monthly Revenue</div>
            <div class="card-sub" style="margin-bottom:18px;">Collections over the last {{ s.monthlyRevenue.length }} months</div>
            <app-bar-chart [data]="revenueChartData(s)" [formatValue]="fmtINR"
              emptyIcon="▤" emptyTitle="No revenue yet" emptyMessage="Paid invoices will chart here month by month." />
          </div>
          <div class="card">
            <div class="card-title">Top Clients</div>
            <div class="card-sub" style="margin-bottom:18px;">By collected revenue</div>
            @if (s.topClients.length) {
              <div style="display:grid;gap:14px;">
                @for (c of s.topClients; track c.name) {
                  <div>
                    <div style="display:flex;justify-content:space-between;margin-bottom:5px;">
                      <span style="font-weight:600;font-size:12.5px;">{{ c.name }}</span>
                      <span style="font-weight:700;font-size:12.5px;color:var(--brand);">{{ fmtINR(c.revenue, true) }}</span>
                    </div>
                    <div class="hbar" [style.width.%]="hbarWidth(c.revenue)"></div>
                  </div>
                }
              </div>
            } @else {
              <app-empty-state icon="◫" title="No client revenue yet" message="Top paying clients appear here." />
            }
          </div>
        </section>

        <!-- Recent invoices -->
        <section class="card flush">
          <div class="card-head">
            <div>
              <div class="card-title">Recent Invoices</div>
              <div class="card-sub">Latest billing activity</div>
            </div>
            <a class="btn ghost sm" routerLink="/invoices">View all →</a>
          </div>
          @if (recent().length) {
            <div class="table-wrap">
              <table class="table stack-mobile">
                <thead>
                  <tr><th>Invoice #</th><th>Client</th><th>Date</th><th>Due Date</th><th>Amount</th><th>Status</th><th></th></tr>
                </thead>
                <tbody>
                  @for (inv of recent(); track inv._id) {
                    <tr>
                      <td class="num" data-label="Invoice #">{{ inv.invoiceNumber }}</td>
                      <td data-label="Client">
                        <div style="display:flex;align-items:center;gap:10px;">
                          <app-avatar [name]="clientName(inv)" [size]="28" />
                          <span style="font-weight:600;">{{ clientName(inv) }}</span>
                        </div>
                      </td>
                      <!--
                        Both dates are marked low priority, which hides them on a
                        phone only. This card is a glance at the latest activity
                        and "View all" sits at the top of it; the full invoice
                        list shows every column at every width.
                      -->
                      <td class="muted" data-label="Date" data-priority="low">{{ fmtDate(inv.date) }}</td>
                      <td class="muted" data-label="Due Date" data-priority="low">{{ fmtDate(inv.dueDate) }}</td>
                      <td class="strong" data-label="Amount" data-priority="high">{{ fmtINR(inv.totals.total) }}</td>
                      <td data-label="Status" data-priority="high"><app-pill [status]="inv.status" /></td>
                      <td class="actions" data-label=""><a class="btn ghost sm" [routerLink]="['/invoices', inv._id, 'edit']">Edit</a></td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <app-empty-state icon="◧" title="No invoices yet" message="Create your first invoice to get started." />
          }
        </section>
      }
    </app-shell>
  `
})
export class DashboardComponent implements OnInit {
  /**
   * The seller details a tax invoice legally has to carry, and does not until
   * somebody fills them in. Empty for everyone who already has them, so it costs
   * nothing to the tenants it does not apply to.
   */
  missingBusinessDetails = computed(() => {
    if (this.auth.user()?.role !== 'admin') return [];
    const org = this.auth.organisation();
    if (!org) return [];
    const missing: string[] = [];
    if (!org.gstin) missing.push('a GSTIN');
    if (!(org.address || '').trim()) missing.push('an address');
    return missing;
  });

  loading = signal(true);
  stats = signal<InvoiceStats | null>(null);
  recent = signal<Invoice[]>([]);
  fmtINR = fmtINR;
  fmtINRCompact = fmtINRCompact;
  fmtDate = fmtDate;
  monthLabel = monthLabel;

  constructor(private api: ApiService, private auth: AuthService, private toast: ToastService) {}

  ngOnInit() {
    // Six rows are asked for, and six rows arrive. This used to fetch the org's
    // *entire* invoice history — every document, every line item, every populated
    // client — and then `.slice(0, 6)` it in the browser.
    forkJoin({
      stats: this.api.invoiceStats(),
      invoices: this.api.invoices({ limit: 6, sort: '-createdAt' })
    }).subscribe({
      next: ({ stats, invoices }) => {
        this.stats.set(stats);
        this.recent.set(invoices.data);
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.toast.httpError(err, 'Could not load the dashboard.');
      }
    });
  }

  private maxClient(): number {
    return Math.max(...(this.stats()?.topClients.map(c => c.revenue) || [0]), 1);
  }

  hbarWidth(v: number): number { return Math.max(4, Math.round((v / this.maxClient()) * 100)); }

  revenueChartData(s: InvoiceStats): BarChartPoint[] {
    return s.monthlyRevenue.map(m => ({ label: this.monthLabel(m.month), value: m.revenue }));
  }

  clientName(inv: Invoice): string {
    return typeof inv.clientId === 'string' ? '—' : inv.clientId?.companyName || '—';
  }
}
