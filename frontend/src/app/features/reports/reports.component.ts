import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppShellComponent } from '../../shared/app-shell.component';
import { IconComponent } from '../../shared/icons';
import { EmptyStateComponent, SkeletonRowsComponent } from '../../shared/ui';
import { BarChartComponent, BarChartPoint } from '../../shared/bar-chart.component';
import { ApiService } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { GstSummary } from '../../core/models';
import { downloadBlob, fmtINR, monthLabel } from '../../core/format';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, AppShellComponent, IconComponent, EmptyStateComponent, SkeletonRowsComponent, BarChartComponent],
  template: `
    <app-shell title="Reports" subtitle="GST filing summary and revenue insights, straight from your issued invoices">
      <button actions class="btn ghost" type="button" [disabled]="exporting()" (click)="exportCsv()">
        @if (exporting()) { <span class="spinner"></span> } <app-icon name="download" [size]="14" /> Export Monthly CSV
      </button>

      @if (loading()) {
        <div class="card flush"><app-skeleton-rows [count]="6" /></div>
      }
      @if (summary(); as s) {
        @if (s.totals.invoiceCount === 0) {
          <div class="card flush">
            <app-empty-state icon="◧" title="No issued invoices yet" message="Draft invoices are excluded — create and send your first invoice to see reports here." />
          </div>
        } @else {
          <section class="grid grid-3" style="margin-bottom:20px;">
            <div class="card metric brand">
              <div class="accent"></div>
              <div class="metric-row"><span class="label">Taxable Value</span><span class="m-icon"><app-icon name="rupee" [size]="15" /></span></div>
              <div class="value">{{ fmtINR(s.totals.taxable, true) }}</div>
              <div class="sub">Across {{ s.totals.invoiceCount }} issued invoice{{ s.totals.invoiceCount === 1 ? '' : 's' }}</div>
            </div>
            <div class="card metric purple">
              <div class="accent"></div>
              <div class="metric-row"><span class="label">Tax Collected</span><span class="m-icon"><app-icon name="percent" [size]="15" /></span></div>
              <div class="value" style="color:var(--purple);">{{ fmtINR(s.totals.tax, true) }}</div>
              <div class="sub">CGST + SGST + IGST combined</div>
            </div>
            <div class="card metric success">
              <div class="accent"></div>
              <div class="metric-row"><span class="label">Total Billed</span><span class="m-icon"><app-icon name="invoice" [size]="15" /></span></div>
              <div class="value" style="color:var(--green);">{{ fmtINR(s.totals.taxable + s.totals.tax, true) }}</div>
              <div class="sub">Taxable value + tax</div>
            </div>
          </section>

          <section class="card" style="margin-bottom:20px;">
            <div class="card-title">Taxable Value by Month</div>
            <div class="card-sub" style="margin-bottom:18px;">Trend across issued invoices</div>
            <app-bar-chart [data]="taxableChartData(s)" [formatValue]="fmtINR"
              emptyIcon="▤" emptyTitle="No trend yet" emptyMessage="Taxable value will chart here month by month." />
          </section>

          <section class="card flush" style="margin-bottom:20px;">
            <div class="card-head">
              <div>
                <div class="card-title">GST Summary by Month</div>
                <div class="card-sub">For GSTR filing — draft invoices excluded</div>
              </div>
            </div>
            <div class="table-wrap">
              <table class="table">
                <thead>
                  <tr><th>Month</th><th>Invoices</th><th>Taxable Value</th><th>CGST</th><th>SGST</th><th>IGST</th><th>Total</th></tr>
                </thead>
                <tbody>
                  @for (m of s.byMonth; track m.month) {
                    <tr>
                      <td class="strong">{{ monthLabel(m.month) }} {{ m.month.slice(0, 4) }}</td>
                      <td class="muted">{{ m.invoiceCount }}</td>
                      <td>{{ fmtINR(m.taxable) }}</td>
                      <td class="muted">{{ fmtINR(m.cgst) }}</td>
                      <td class="muted">{{ fmtINR(m.sgst) }}</td>
                      <td class="muted">{{ fmtINR(m.igst) }}</td>
                      <td class="num">{{ fmtINR(m.total) }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </section>

          <section class="card flush">
            <div class="card-head">
              <div>
                <div class="card-title">GST Rate Breakdown</div>
                <div class="card-sub">Taxable value and tax collected per GST slab</div>
              </div>
            </div>
            <div class="table-wrap">
              <table class="table">
                <thead><tr><th>Rate</th><th>Taxable Value</th><th>Tax Collected</th></tr></thead>
                <tbody>
                  @for (r of s.byRate; track r.rate) {
                    <tr>
                      <td><span class="pill">{{ r.rate }}%</span></td>
                      <td>{{ fmtINR(r.taxable) }}</td>
                      <td class="strong">{{ fmtINR(r.tax) }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </section>
        }
      }
    </app-shell>
  `
})
export class ReportsComponent implements OnInit {
  loading = signal(true);
  exporting = signal(false);
  summary = signal<GstSummary | null>(null);

  fmtINR = fmtINR;
  monthLabel = monthLabel;

  constructor(private api: ApiService, private toast: ToastService) {}

  ngOnInit() {
    this.api.gstSummary().subscribe({
      next: s => { this.summary.set(s); this.loading.set(false); },
      error: err => { this.loading.set(false); this.toast.httpError(err, 'Could not load reports.'); }
    });
  }

  taxableChartData(s: GstSummary): BarChartPoint[] {
    return s.byMonth.map(m => ({ label: `${this.monthLabel(m.month)} ${m.month.slice(0, 4)}`, value: m.taxable }));
  }

  exportCsv() {
    this.exporting.set(true);
    this.api.exportGstSummaryCsv().subscribe({
      next: blob => { this.exporting.set(false); downloadBlob(blob, 'gst-summary.csv'); },
      error: err => { this.exporting.set(false); this.toast.httpError(err); }
    });
  }
}
