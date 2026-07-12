import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AppShellComponent } from '../../shared/app-shell.component';
import { AvatarComponent, EmptyStateComponent, PillComponent, SkeletonRowsComponent } from '../../shared/ui';
import { ApiService } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { Invoice, InvoiceStats } from '../../core/models';
import { fmtINR, fmtDate, monthLabel } from '../../core/format';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, AppShellComponent, PillComponent, AvatarComponent, EmptyStateComponent, SkeletonRowsComponent],
  template: `
    <app-shell title="Dashboard" subtitle="Here's your billing overview for today">
      <a actions class="btn primary" routerLink="/invoices/new">+ New Invoice</a>

      @if (loading()) {
        <div class="card flush"><app-skeleton-rows [count]="6" /></div>
      }
      @if (stats(); as s) {
        <!-- Metrics -->
        <section class="grid grid-4" style="margin-bottom:20px;">
          <div class="card metric hoverable">
            <div class="accent" style="background:linear-gradient(90deg,var(--brand),var(--brand-light));"></div>
            <div class="metric-row"><span class="label">Total Revenue</span><span class="m-icon">₹</span></div>
            <div class="value">{{ fmtINR(s.totalRevenue, true) }}</div>
            <div class="sub" style="color:var(--green)">{{ s.counts.paid }} paid invoices</div>
          </div>
          <div class="card metric hoverable">
            <div class="accent" style="background:var(--amber);"></div>
            <div class="metric-row"><span class="label">Pending</span><span class="m-icon">⏳</span></div>
            <div class="value">{{ fmtINR(s.pendingAmount, true) }}</div>
            <div class="sub" style="color:var(--amber)">{{ s.counts.pending }} awaiting payment</div>
          </div>
          <div class="card metric hoverable">
            <div class="accent" style="background:var(--red);"></div>
            <div class="metric-row"><span class="label">Overdue</span><span class="m-icon">⚠</span></div>
            <div class="value">{{ fmtINR(s.overdueAmount, true) }}</div>
            <div class="sub" style="color:var(--red)">{{ s.counts.overdue }} require attention</div>
          </div>
          <div class="card metric hoverable">
            <div class="accent" style="background:var(--purple);"></div>
            <div class="metric-row"><span class="label">Total Invoices</span><span class="m-icon">◧</span></div>
            <div class="value">{{ s.counts.total }}</div>
            <div class="sub">{{ s.counts.paid }} paid · {{ s.counts.pending }} pending · {{ s.counts.draft }} draft</div>
          </div>
        </section>

        <!-- Charts -->
        <section class="grid grid-wide" style="margin-bottom:20px;">
          <div class="card">
            <div class="card-title">Monthly Revenue</div>
            <div class="card-sub" style="margin-bottom:18px;">Collections over the last {{ s.monthlyRevenue.length }} months</div>
            @if (s.monthlyRevenue.length) {
              <div class="bar-chart">
                @for (m of s.monthlyRevenue; track m.month) {
                  <div class="bar-col">
                    <div class="bar" [style.height.%]="barHeight(m.revenue)" [title]="fmtINR(m.revenue)"></div>
                    <div class="bar-label">{{ monthLabel(m.month) }}</div>
                  </div>
                }
              </div>
            } @else {
              <app-empty-state icon="▤" title="No revenue yet" message="Paid invoices will chart here month by month." />
            }
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
              <table class="table">
                <thead>
                  <tr><th>Invoice #</th><th>Client</th><th>Date</th><th>Due Date</th><th>Amount</th><th>Status</th><th></th></tr>
                </thead>
                <tbody>
                  @for (inv of recent(); track inv._id) {
                    <tr>
                      <td class="num">{{ inv.invoiceNumber }}</td>
                      <td>
                        <div style="display:flex;align-items:center;gap:10px;">
                          <app-avatar [name]="clientName(inv)" [size]="28" />
                          <span style="font-weight:600;">{{ clientName(inv) }}</span>
                        </div>
                      </td>
                      <td class="muted">{{ fmtDate(inv.date) }}</td>
                      <td class="muted">{{ fmtDate(inv.dueDate) }}</td>
                      <td class="strong">{{ fmtINR(inv.totals.total) }}</td>
                      <td><app-pill [status]="inv.status" /></td>
                      <td class="actions"><a class="btn ghost sm" [routerLink]="['/invoices', inv._id, 'edit']">Edit</a></td>
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
  loading = signal(true);
  stats = signal<InvoiceStats | null>(null);
  recent = signal<Invoice[]>([]);
  fmtINR = fmtINR;
  fmtDate = fmtDate;
  monthLabel = monthLabel;

  constructor(private api: ApiService, private toast: ToastService) {}

  ngOnInit() {
    forkJoin({ stats: this.api.invoiceStats(), invoices: this.api.invoices() }).subscribe({
      next: ({ stats, invoices }) => {
        this.stats.set(stats);
        this.recent.set(invoices.slice(0, 6));
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.toast.httpError(err, 'Could not load the dashboard.');
      }
    });
  }

  private maxMonth(): number {
    return Math.max(...(this.stats()?.monthlyRevenue.map(m => m.revenue) || [0]), 1);
  }

  private maxClient(): number {
    return Math.max(...(this.stats()?.topClients.map(c => c.revenue) || [0]), 1);
  }

  barHeight(v: number): number { return Math.max(3, Math.round((v / this.maxMonth()) * 100)); }
  hbarWidth(v: number): number { return Math.max(4, Math.round((v / this.maxClient()) * 100)); }

  clientName(inv: Invoice): string {
    return typeof inv.clientId === 'string' ? '—' : inv.clientId?.companyName || '—';
  }
}
