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
      <select actions class="input" style="max-width:190px;" [value]="fy()" (change)="changeFy($event)">
        @for (y of fyOptions; track y) { <option [value]="y">FY{{ y }}-{{ (y + 1) % 100 | number: '2.0-0' }}</option> }
      </select>
      <button actions class="btn ghost" type="button" [disabled]="exporting()" (click)="exportCsv()">
        @if (exporting()) { <span class="spinner"></span> } <app-icon name="download" [size]="14" /> Export CSV
      </button>

      @if (loading()) {
        <div class="card flush"><app-skeleton-rows [count]="6" /></div>
      }
      @if (summary(); as s) {
        @if (s.totals.invoiceCount === 0) {
          <div class="card flush">
            <app-empty-state icon="◧" [title]="'No issued invoices in ' + s.period.label"
              message="Draft invoices are excluded. Pick another financial year, or create and send an invoice to see reports here." />
          </div>
        } @else {
          <section class="grid grid-3" style="margin-bottom:20px;">
            <div class="card metric indigo">
              <div class="accent"></div>
              <div class="metric-row"><span class="label">Taxable Value</span><span class="m-icon"><app-icon name="rupee" [size]="15" /></span></div>
              <div class="value">{{ fmtINR(s.totals.taxable, true) }}</div>
              <div class="sub">
                {{ s.period.label }} · {{ s.totals.invoiceCount }} issued invoice{{ s.totals.invoiceCount === 1 ? '' : 's' }}
                @if (s.totals.discount > 0) { <br />After {{ fmtINR(s.totals.discount, true) }} discount }
              </div>
            </div>
            <div class="card metric purple">
              <div class="accent"></div>
              <div class="metric-row"><span class="label">Tax Collected</span><span class="m-icon"><app-icon name="percent" [size]="15" /></span></div>
              <div class="value" style="color:var(--purple);">{{ fmtINR(s.totals.tax, true) }}</div>
              <div class="sub">CGST + SGST/UTGST + IGST@if (s.totals.cess > 0) { + cess } combined</div>
            </div>
            <div class="card metric success">
              <div class="accent"></div>
              <div class="metric-row"><span class="label">Total Billed</span><span class="m-icon"><app-icon name="invoice" [size]="15" /></span></div>
              <div class="value" style="color:var(--green);">{{ fmtINR(s.totals.total, true) }}</div>
              <div class="sub">What was invoiced, including round-off</div>
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
              <table class="table stack-mobile">
                <thead>
                  <tr><th>Month</th><th>Invoices</th><th>Discount</th><th>Taxable Value</th><th>CGST</th><th>SGST/UTGST</th><th>IGST</th><th>Cess</th><th>Total</th></tr>
                </thead>
                <tbody>
                  @for (m of s.byMonth; track m.month) {
                    <tr>
                      <td class="strong" data-label="Month">{{ monthLabel(m.month) }} {{ m.month.slice(0, 4) }}</td>
                      <td class="muted" data-label="Invoices">{{ m.invoiceCount }}</td>
                      <td class="muted" data-label="Discount">{{ m.discount > 0 ? fmtINR(m.discount) : '—' }}</td>
                      <td data-label="Taxable Value">{{ fmtINR(m.taxable) }}</td>
                      <td class="muted" data-label="CGST">{{ fmtINR(m.cgst) }}</td>
                      <td class="muted" data-label="SGST/UTGST">{{ fmtINR(m.sgst) }}</td>
                      <td class="muted" data-label="IGST">{{ fmtINR(m.igst) }}</td>
                      <td class="muted" data-label="Cess">{{ m.cess > 0 ? fmtINR(m.cess) : '—' }}</td>
                      <td class="num" data-label="Total">{{ fmtINR(m.total) }}</td>
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
              <table class="table stack-mobile">
                <thead><tr><th>Rate</th><th>Taxable Value</th><th>Tax Collected</th><th>Cess</th></tr></thead>
                <tbody>
                  @for (r of s.byRate; track r.rate) {
                    <tr>
                      <td data-label="Rate"><span class="pill">{{ r.rate }}%</span></td>
                      <td data-label="Taxable Value">{{ fmtINR(r.taxable) }}</td>
                      <td class="strong" data-label="Tax Collected">{{ fmtINR(r.tax) }}</td>
                      <td class="muted" data-label="Cess">{{ r.cess > 0 ? fmtINR(r.cess) : '—' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </section>

          <!-- HSN/SAC summary: a required table in GSTR-1, and previously
               missing from the product entirely. -->
          <section class="card flush" style="margin-top:20px;">
            <div class="card-head">
              <div>
                <div class="card-title">HSN / SAC Summary</div>
                <div class="card-sub">Required for GSTR-1 — group your supplies by HSN or SAC code</div>
              </div>
            </div>
            @if (s.byHsn.length === 0) {
              <app-empty-state icon="▦" title="No HSN data" message="Add HSN/SAC codes to your line items to build this table." />
            } @else {
              <div class="table-wrap">
                <table class="table stack-mobile">
                  <thead><tr><th>HSN/SAC</th><th>Description</th><th>Qty</th><th>Taxable Value</th><th>Tax</th><th>Cess</th></tr></thead>
                  <tbody>
                    @for (h of s.byHsn; track h.hsn) {
                      <tr>
                        <td class="mono strong" data-label="HSN/SAC">{{ h.hsn }}</td>
                        <td class="muted" data-label="Description">{{ h.description || '—' }}</td>
                        <td class="muted" data-label="Qty">{{ h.qty }}</td>
                        <td data-label="Taxable Value">{{ fmtINR(h.taxable) }}</td>
                        <td class="strong" data-label="Tax">{{ fmtINR(h.tax) }}</td>
                        <td class="muted" data-label="Cess">{{ h.cess > 0 ? fmtINR(h.cess) : '—' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
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

  /** Indian financial year start (Apr-Mar), which is how GST returns are framed. */
  fy = signal(ReportsComponent.currentFyStart());
  /** The current FY and the four before it — enough for any live filing need. */
  readonly fyOptions = Array.from({ length: 5 }, (_, i) => ReportsComponent.currentFyStart() - i);

  fmtINR = fmtINR;
  monthLabel = monthLabel;

  private static currentFyStart(): number {
    const now = new Date();
    return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  }

  constructor(private api: ApiService, private toast: ToastService) {}

  ngOnInit() { this.load(); }

  changeFy(event: Event) {
    this.fy.set(Number((event.target as HTMLSelectElement).value));
    this.load();
  }

  private load() {
    this.loading.set(true);
    this.api.gstSummary(this.fy()).subscribe({
      next: s => { this.summary.set(s); this.loading.set(false); },
      error: err => { this.loading.set(false); this.toast.httpError(err, 'Could not load reports.'); }
    });
  }

  taxableChartData(s: GstSummary): BarChartPoint[] {
    return s.byMonth.map(m => ({ label: `${this.monthLabel(m.month)} ${m.month.slice(0, 4)}`, value: m.taxable }));
  }

  exportCsv() {
    this.exporting.set(true);
    const fy = this.fy();
    this.api.exportGstSummaryCsv(fy).subscribe({
      next: blob => { this.exporting.set(false); downloadBlob(blob, `gst-summary-FY${fy}.csv`); },
      error: err => { this.exporting.set(false); this.toast.httpError(err); }
    });
  }
}
