import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppShellComponent } from '../../shared/app-shell.component';
import { IconComponent } from '../../shared/icons';
import { EmptyStateComponent, SkeletonRowsComponent } from '../../shared/ui';
import { ApiService } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { ArAgeing, Client, CollectionMetrics, CustomerStatement, SalesBreakdown } from '../../core/models';
import { downloadBlob, fmtINR, fmtDate } from '../../core/format';

type Tab = 'ageing' | 'statement' | 'collections' | 'sales';

/**
 * Receivables (2.4 #28, #29, #31, #33).
 *
 * The product could tell a tenant *how much* was outstanding and nothing else — not how
 * old it was, not who owed it, not how long money typically takes to arrive. Those are
 * the three questions a business actually asks about its receivables, and one "pending
 * amount" figure answers none of them.
 *
 * Every number here was computable from data that already existed. It was simply never
 * asked for.
 */
@Component({
  selector: 'app-receivables',
  standalone: true,
  imports: [CommonModule, FormsModule, AppShellComponent, IconComponent, EmptyStateComponent, SkeletonRowsComponent],
  template: `
    <app-shell title="Receivables" subtitle="Who owes you what, how old it is, and how long it takes to arrive">
      @if (tab() === 'ageing') {
        <button actions class="btn secondary" type="button" [disabled]="downloading()" (click)="downloadAgeing()">
          @if (downloading()) { <span class="spinner"></span> } <app-icon name="download" [size]="14" /> Excel
        </button>
      }
      @if (tab() === 'statement' && selectedClient()) {
        <button actions class="btn secondary" type="button" [disabled]="downloading()" (click)="downloadStatement()">
          @if (downloading()) { <span class="spinner"></span> } <app-icon name="download" [size]="14" /> Excel
        </button>
      }

      <div class="toolbar">
        <div class="tabs">
          <button type="button" [class.active]="tab() === 'ageing'" (click)="tab.set('ageing')">Ageing</button>
          <button type="button" [class.active]="tab() === 'statement'" (click)="onStatementTab()">Customer statement</button>
          <button type="button" [class.active]="tab() === 'collections'" (click)="onCollectionsTab()">Collections</button>
          <button type="button" [class.active]="tab() === 'sales'" (click)="onSalesTab()">Sales analysis</button>
        </div>
      </div>

      @if (loading()) { <div class="card flush"><app-skeleton-rows [count]="6" /></div> }

      @if (tab() === 'ageing' && ageing(); as r) {
        <section class="grid grid-5" style="margin-bottom:20px">
          @for (bucket of r.buckets; track bucket.key) {
            <div class="card metric" [class.danger]="bucket.key === 'd90_plus'" [class.warning]="bucket.key === 'd61_90'">
              <div class="accent"></div>
              <div class="metric-row"><span class="label">{{ bucket.label }}</span></div>
              <div class="value">{{ fmtINR(bucket.amount, true) }}</div>
              <div class="sub">{{ share(bucket.amount, r.total) }}% of outstanding</div>
            </div>
          }
        </section>

        <div class="card flush">
          <div class="card-head">
            <div>
              <div class="card-title">By customer</div>
              <div class="card-sub">
                Sorted by the worst overdue invoice, because this report is read to decide who to
                chase — total outstanding alone puts a big, current customer above a small, ancient one
              </div>
            </div>
            <span class="pill">{{ fmtINR(r.total, true) }} outstanding</span>
          </div>
          @if (r.clients.length) {
            <div class="table-wrap">
              <table class="table stack-mobile">
                <thead>
                  <tr>
                    <th>Customer</th><th class="num">Not due</th><th class="num">1–30</th><th class="num">31–60</th>
                    <th class="num">61–90</th><th class="num">90+</th><th class="num">Total</th><th>Oldest</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  @for (c of r.clients; track c.name) {
                    <tr>
                      <td data-label="Customer">
                        <div class="strong">{{ c.name }}</div>
                        <div class="muted" style="font-size:11px">{{ c.email || c.phone || '' }} · {{ c.invoices }} open</div>
                      </td>
                      <td class="num muted" data-label="Not due">{{ c.buckets['current'] ? fmtINR(c.buckets['current']) : '—' }}</td>
                      <td class="num" data-label="1-30">{{ c.buckets['d1_30'] ? fmtINR(c.buckets['d1_30']) : '—' }}</td>
                      <td class="num" data-label="31-60">{{ c.buckets['d31_60'] ? fmtINR(c.buckets['d31_60']) : '—' }}</td>
                      <td class="num" data-label="61-90">{{ c.buckets['d61_90'] ? fmtINR(c.buckets['d61_90']) : '—' }}</td>
                      <td class="num strong" style="color:var(--red)" data-label="90+">{{ c.buckets['d90_plus'] ? fmtINR(c.buckets['d90_plus']) : '—' }}</td>
                      <td class="num strong" data-label="Total">{{ fmtINR(c.total) }}</td>
                      <td class="muted" data-label="Oldest">
                        {{ c.oldestDue ? fmtDate(c.oldestDue) : '—' }}
                        @if (c.maxDaysPastDue > 0) { <div style="font-size:11px;color:var(--red)">{{ c.maxDaysPastDue }} days overdue</div> }
                      </td>
                      <td data-label="">
                        @if (c.clientId) {
                          <button class="btn ghost sm" type="button" (click)="openStatement(c.clientId!, c.name)">Statement</button>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <app-empty-state icon="✓" title="Nothing outstanding" message="Every issued invoice has been settled." />
          }
        </div>
      }

      @if (tab() === 'statement') {
        <div class="card" style="margin-bottom:16px">
          <div class="grid grid-3">
            <div class="field">
              <label>Customer</label>
              <select [ngModel]="selectedClient()" (ngModelChange)="onClientChange($event)">
                <option value="">Select a customer</option>
                @for (c of clients(); track c._id) { <option [value]="c._id">{{ c.companyName }}</option> }
              </select>
            </div>
            <div class="field"><label>From</label><input type="date" [(ngModel)]="from" (change)="loadStatement()"></div>
            <div class="field"><label>To</label><input type="date" [(ngModel)]="to" (change)="loadStatement()"></div>
          </div>
        </div>

        @if (statement(); as s) {
          <section class="grid grid-4" style="margin-bottom:20px">
            <div class="stat-block"><div class="sb-label">Opening balance</div><div class="sb-value">{{ fmtINR(s.openingBalance, true) }}</div></div>
            <div class="stat-block"><div class="sb-label">Invoiced</div><div class="sb-value">{{ fmtINR(s.totals.invoiced, true) }}</div></div>
            <div class="stat-block"><div class="sb-label">Received</div><div class="sb-value">{{ fmtINR(s.totals.received, true) }}</div></div>
            <div class="stat-block"><div class="sb-label">Closing balance</div><div class="sb-value">{{ fmtINR(s.closingBalance, true) }}</div></div>
          </section>

          <div class="card flush">
            <div class="card-head">
              <div>
                <div class="card-title">{{ s.client.name }}</div>
                <div class="card-sub">{{ s.period.from || 'From the beginning' }} to {{ s.period.to }}</div>
              </div>
            </div>
            <div class="table-wrap">
              <table class="table stack-mobile">
                <thead><tr><th>Date</th><th>Reference</th><th>Description</th><th class="num">Debit</th><th class="num">Credit</th><th class="num">Balance</th></tr></thead>
                <tbody>
                  <tr>
                    <td class="muted" data-label="Date">{{ s.period.from ? fmtDate(s.period.from) : '—' }}</td>
                    <td data-label="Reference"></td>
                    <td class="strong" data-label="Description">Opening balance</td>
                    <td class="num" data-label="Debit"></td>
                    <td class="num" data-label="Credit"></td>
                    <td class="num strong" data-label="Balance">{{ fmtINR(s.openingBalance) }}</td>
                  </tr>
                  @for (line of s.lines; track $index) {
                    <tr>
                      <td class="muted" data-label="Date">{{ fmtDate(line.date) }}</td>
                      <td class="num" data-label="Reference">{{ line.reference }}</td>
                      <td data-label="Description">{{ line.description }}</td>
                      <td class="num" data-label="Debit">{{ line.debit ? fmtINR(line.debit) : '' }}</td>
                      <td class="num" style="color:var(--green)" data-label="Credit">{{ line.credit ? fmtINR(line.credit) : '' }}</td>
                      <td class="num strong" data-label="Balance">{{ fmtINR(line.balance) }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        } @else if (!loading() && selectedClient()) {
          <div class="card flush"><app-empty-state icon="◫" title="Nothing in this period" message="No invoices or payments for this customer in the selected range." /></div>
        }
      }

      @if (tab() === 'collections' && collections(); as m) {
        <section class="grid grid-4" style="margin-bottom:20px">
          <div class="card metric indigo">
            <div class="accent"></div>
            <div class="metric-row"><span class="label">DSO</span><span class="m-icon"><app-icon name="clock" [size]="15" /></span></div>
            <div class="value">{{ m.dso === null ? '—' : m.dso }}</div>
            <!-- Computed the standard way rather than by averaging invoice-to-payment
                 gaps: the average ignores invoices that were never paid at all, which is
                 exactly where a collections problem hides. -->
            <div class="sub">Days sales outstanding, last {{ m.period.days }} days</div>
          </div>
          <div class="card metric success">
            <div class="accent"></div>
            <div class="metric-row"><span class="label">Collection rate</span><span class="m-icon"><app-icon name="checkCircle" [size]="15" /></span></div>
            <div class="value">{{ m.collectionEfficiency === null ? '—' : m.collectionEfficiency + '%' }}</div>
            <div class="sub">{{ fmtINR(m.received, true) }} of {{ fmtINR(m.invoiced, true) }} billed</div>
          </div>
          <div class="card metric warning">
            <div class="accent"></div>
            <div class="metric-row"><span class="label">Average days to pay</span><span class="m-icon"><app-icon name="creditCard" [size]="15" /></span></div>
            <div class="value">{{ m.averageDaysToPay === null ? '—' : m.averageDaysToPay }}</div>
            <div class="sub">Across {{ m.settledInvoices }} settled invoices</div>
          </div>
          <div class="card metric danger">
            <div class="accent"></div>
            <div class="metric-row"><span class="label">Outstanding</span><span class="m-icon"><app-icon name="alertTriangle" [size]="15" /></span></div>
            <div class="value">{{ fmtINR(m.outstanding, true) }}</div>
            <div class="sub">All open invoices</div>
          </div>
        </section>

        <div class="card">
          <div class="card-title">How customers pay</div>
          <div class="card-sub" style="margin-bottom:16px">By value, over the last {{ m.period.days }} days</div>
          @if (m.paymentMix.length) {
            <div style="display:grid;gap:14px">
              @for (row of m.paymentMix; track row.method) {
                <div>
                  <div style="display:flex;justify-content:space-between;margin-bottom:5px">
                    <span style="font-weight:600;font-size:12.5px;text-transform:capitalize">{{ row.method }} <span class="muted">({{ row.count }})</span></span>
                    <span style="font-weight:700;font-size:12.5px;color:var(--brand)">{{ fmtINR(row.amount, true) }} · {{ row.share }}%</span>
                  </div>
                  <div class="hbar" [style.width.%]="row.share"></div>
                </div>
              }
            </div>
          } @else {
            <app-empty-state icon="◫" title="No payments yet" message="Recorded payments will break down by method here." />
          }
        </div>
      }

      @if (tab() === 'sales' && sales(); as s) {
        <section class="grid grid-2">
          <div class="card flush">
            <div class="card-head"><div><div class="card-title">Top items</div><div class="card-sub">By gross value invoiced</div></div></div>
            @if (s.byItem.length) {
              <div class="table-wrap">
                <table class="table">
                  <thead><tr><th>Item</th><th>HSN</th><th class="num">Qty</th><th class="num">Value</th></tr></thead>
                  <tbody>
                    @for (row of s.byItem.slice(0, 25); track row.description) {
                      <tr>
                        <td>{{ row.description }}</td>
                        <td class="mono muted" style="font-size:11px">{{ row.hsn || '—' }}</td>
                        <td class="num">{{ row.quantity }}</td>
                        <td class="num strong">{{ fmtINR(row.value) }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            } @else {
              <app-empty-state icon="◫" title="No sales yet" message="Issued invoices break down by item here." />
            }
          </div>

          <div class="card flush">
            <div class="card-head"><div><div class="card-title">Top customers</div><div class="card-sub">By invoiced value</div></div></div>
            @if (s.byClient.length) {
              <div class="table-wrap">
                <table class="table">
                  <thead><tr><th>Customer</th><th class="num">Invoices</th><th class="num">Value</th></tr></thead>
                  <tbody>
                    @for (row of s.byClient; track row.name) {
                      <tr>
                        <td>{{ row.name }}</td>
                        <td class="num">{{ row.invoices }}</td>
                        <td class="num strong">{{ fmtINR(row.value) }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            } @else {
              <app-empty-state icon="◫" title="No sales yet" message="Issued invoices break down by customer here." />
            }
          </div>
        </section>
      }
    </app-shell>
  `
})
export class ReceivablesComponent implements OnInit {
  tab = signal<Tab>('ageing');
  loading = signal(true);
  downloading = signal(false);

  ageing = signal<ArAgeing | null>(null);
  statement = signal<CustomerStatement | null>(null);
  collections = signal<CollectionMetrics | null>(null);
  sales = signal<SalesBreakdown | null>(null);
  clients = signal<Client[]>([]);
  selectedClient = signal('');
  selectedClientName = signal('');

  from = '';
  to = '';

  fmtINR = fmtINR;
  fmtDate = fmtDate;

  constructor(private api: ApiService, private toast: ToastService) {}

  ngOnInit() { this.loadAgeing(); }

  share(amount: number, total: number): number {
    return total > 0 ? Math.round((amount / total) * 1000) / 10 : 0;
  }

  loadAgeing() {
    this.loading.set(true);
    this.api.arAgeing().subscribe({
      next: r => { this.ageing.set(r); this.loading.set(false); },
      error: err => { this.loading.set(false); this.toast.httpError(err); }
    });
  }

  onStatementTab() {
    this.tab.set('statement');
    // The picker needs the list; a page size large enough that a typical tenant sees all
    // of their customers without paging inside a dropdown.
    if (!this.clients().length) {
      this.api.clients({ limit: 200, sort: 'companyName' }).subscribe({
        next: page => this.clients.set(page.data),
        error: () => {}
      });
    }
  }

  openStatement(clientId: string, name: string) {
    this.tab.set('statement');
    this.onStatementTab();
    this.selectedClient.set(clientId);
    this.selectedClientName.set(name);
    this.loadStatement();
  }

  onClientChange(clientId: string) {
    this.selectedClient.set(clientId);
    this.statement.set(null);
    if (clientId) this.loadStatement();
  }

  loadStatement() {
    const clientId = this.selectedClient();
    if (!clientId) return;
    this.loading.set(true);
    this.api.customerStatement(clientId, { from: this.from || undefined, to: this.to || undefined }).subscribe({
      next: s => { this.statement.set(s); this.loading.set(false); },
      error: err => { this.loading.set(false); this.toast.httpError(err); }
    });
  }

  onCollectionsTab() {
    this.tab.set('collections');
    if (this.collections()) return;
    this.loading.set(true);
    this.api.collectionMetrics(90).subscribe({
      next: m => { this.collections.set(m); this.loading.set(false); },
      error: err => { this.loading.set(false); this.toast.httpError(err); }
    });
  }

  onSalesTab() {
    this.tab.set('sales');
    if (this.sales()) return;
    this.loading.set(true);
    this.api.salesBreakdown({}).subscribe({
      next: s => { this.sales.set(s); this.loading.set(false); },
      error: err => { this.loading.set(false); this.toast.httpError(err); }
    });
  }

  downloadAgeing() {
    this.downloading.set(true);
    this.api.downloadAgeingExcel().subscribe({
      next: blob => { this.downloading.set(false); downloadBlob(blob, `ar-ageing-${new Date().toISOString().slice(0, 10)}.xlsx`); },
      error: err => { this.downloading.set(false); this.toast.httpError(err); }
    });
  }

  downloadStatement() {
    const clientId = this.selectedClient();
    if (!clientId) return;
    this.downloading.set(true);
    this.api.downloadStatementExcel(clientId, { from: this.from || undefined, to: this.to || undefined }).subscribe({
      next: blob => {
        this.downloading.set(false);
        downloadBlob(blob, `statement-${this.selectedClientName().replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.xlsx`);
      },
      error: err => { this.downloading.set(false); this.toast.httpError(err); }
    });
  }
}
