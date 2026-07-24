import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AppShellComponent } from '../../shared/app-shell.component';
import { IconComponent } from '../../shared/icons';
import { AvatarComponent, EmptyStateComponent, ModalComponent, OverflowMenuComponent, PagerComponent, PillComponent, SkeletonRowsComponent } from '../../shared/ui';
import { ApiService } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { Invoice } from '../../core/models';
import { fmtINR, fmtDate, downloadBlob } from '../../core/format';

type StatusFilter = 'all' | 'paid' | 'pending' | 'overdue' | 'draft';

@Component({
  selector: 'app-invoices',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AppShellComponent, IconComponent, PillComponent, AvatarComponent, EmptyStateComponent, ModalComponent, SkeletonRowsComponent, PagerComponent, OverflowMenuComponent],
  template: `
    <app-shell title="Invoices" [subtitle]="invoices().length + ' total invoices'">
      <button actions class="btn ghost" type="button" [disabled]="exporting()" (click)="exportCsv()">
        @if (exporting()) { <span class="spinner"></span> } <app-icon name="download" [size]="14" /> Export CSV
      </button>
      <a actions class="btn secondary" routerLink="/bill-generator"><app-icon name="calculator" [size]="14" /> Bill Generator</a>
      <a actions class="btn primary" routerLink="/invoices/new">+ New Invoice</a>

      <div class="toolbar">
        <div class="tabs">
          @for (f of filters; track f.key) {
            <button type="button" [class.active]="filter() === f.key" (click)="onFilter(f.key)">
              {{ f.label }} ({{ countFor(f.key) }})
            </button>
          }
        </div>
        <div class="search-box">
          <span class="search-icon">⌕</span>
          <input class="input" type="search" placeholder="Search invoice or client…"
            [ngModel]="query()" (ngModelChange)="onSearch($event)" />
        </div>
      </div>

      <section class="card flush">
        @if (loading()) {
          <app-skeleton-rows [count]="6" />
        } @else if (filtered().length) {
          <div class="table-wrap">
            <table class="table stack-mobile">
              <thead>
                <tr>
                  <th>Invoice #</th><th>Client</th><th>Date</th><th>Due Date</th>
                  <th>Subtotal</th><th>GST</th><th>Total</th><th>Status</th><th style="text-align:right">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (inv of paged(); track inv._id) {
                  <tr [class.row-danger]="inv.status === 'overdue'">
                    <td class="num" data-label="Invoice #">{{ inv.invoiceNumber }}</td>
                    <td data-label="Client">
                      <div style="display:flex;align-items:center;gap:10px;">
                        <app-avatar [name]="clientName(inv)" [size]="28" />
                        <div>
                          <div class="strong" style="display:flex;align-items:center;gap:6px;">
                            {{ clientName(inv) }}
                            @if (!inv.clientId) { <span class="pill" style="font-size:9.5px;padding:1px 7px;">Bill</span> }
                          </div>
                          <div class="muted mono" style="font-size:11px;">{{ clientGstin(inv) }}</div>
                        </div>
                      </div>
                    </td>
                    <td class="muted" data-label="Date">{{ fmtDate(inv.date) }}</td>
                    <td data-label="Due Date" [style.color]="inv.status === 'overdue' ? 'var(--red)' : ''"
                        [style.fontWeight]="inv.status === 'overdue' ? '700' : ''">{{ fmtDate(inv.dueDate) }}</td>
                    <td class="muted" data-label="Subtotal">{{ fmtINR(inv.totals.subtotal) }}</td>
                    <td class="muted" data-label="GST">{{ fmtINR(gstAmount(inv)) }}</td>
                    <td class="strong" data-label="Total" data-priority="high">{{ fmtINR(inv.totals.total) }}</td>
                    <td data-label="Status" data-priority="high"><app-pill [status]="inv.status" /></td>
                    <td data-label="">
                      <div class="actions">
                        <a class="btn ghost sm" [routerLink]="inv.clientId ? ['/invoices', inv._id, 'edit'] : ['/bill-generator', inv._id, 'edit']">Edit</a>
                        @if (inv.status !== 'paid') {
                          <button class="btn success sm" type="button" (click)="markPaid(inv)"><app-icon name="check" [size]="13" /> Paid</button>
                        }
                        <app-overflow-menu>
                          <button class="btn ghost sm" type="button" [disabled]="downloadingId() === inv._id" (click)="downloadPdf(inv)">
                            @if (downloadingId() === inv._id) { <span class="spinner"></span> } @else { <app-icon name="download" [size]="13" /> } Download PDF
                          </button>
                          <button class="btn ghost sm" type="button" (click)="duplicate(inv)"><app-icon name="copy" [size]="13" /> Duplicate</button>
                          <button class="btn danger sm" type="button" (click)="confirmDelete.set(inv)"><app-icon name="trash" [size]="13" /> Delete</button>
                        </app-overflow-menu>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <app-pager [page]="page()" [pageSize]="pageSize()" [total]="filtered().length"
            (pageChange)="page.set($event)" (pageSizeChange)="onPageSize($event)" />
        } @else {
          <app-empty-state icon="◧" title="No invoices found"
            [message]="query() ? 'Try a different search or filter.' : 'Create your first invoice to get started.'" />
        }
      </section>

      <app-modal [open]="!!confirmDelete()" title="Delete Invoice" (close)="confirmDelete.set(null)">
        <p style="margin:0;color:var(--muted);line-height:1.6;">
          Invoice <strong class="mono" style="color:var(--text)">{{ confirmDelete()?.invoiceNumber }}</strong>
          will be permanently deleted. This action cannot be undone.
        </p>
        <div class="modal-foot">
          <button class="btn ghost" type="button" (click)="confirmDelete.set(null)">Cancel</button>
          <button class="btn danger solid" type="button" [disabled]="busy()" (click)="doDelete()">Delete Invoice</button>
        </div>
      </app-modal>
    </app-shell>
  `
})
export class InvoicesComponent implements OnInit {
  readonly filters: Array<{ key: StatusFilter; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'paid', label: 'Paid' },
    { key: 'pending', label: 'Pending' },
    { key: 'overdue', label: 'Overdue' },
    { key: 'draft', label: 'Draft' }
  ];

  invoices = signal<Invoice[]>([]);
  loading = signal(true);
  busy = signal(false);
  exporting = signal(false);
  downloadingId = signal<string | null>(null);
  filter = signal<StatusFilter>('all');
  query = signal('');
  confirmDelete = signal<Invoice | null>(null);

  filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    return this.invoices().filter(inv => {
      const statusOk = this.filter() === 'all'
        || inv.status === this.filter()
        || (this.filter() === 'pending' && inv.status === 'partial');
      const text = `${inv.invoiceNumber} ${this.clientName(inv)}`.toLowerCase();
      return statusOk && (!q || text.includes(q));
    });
  });

  page = signal(1);
  pageSize = signal(10);

  paged = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.filtered().slice(start, start + this.pageSize());
  });

  fmtINR = fmtINR;
  fmtDate = fmtDate;

  constructor(private api: ApiService, private toast: ToastService) {}

  ngOnInit() { this.load(); }

  onSearch(v: string) { this.query.set(v); this.page.set(1); }
  onFilter(key: StatusFilter) { this.filter.set(key); this.page.set(1); }
  onPageSize(v: number) { this.pageSize.set(v); this.page.set(1); }

  load() {
    this.api.invoices().subscribe({
      next: list => { this.invoices.set(list); this.loading.set(false); },
      error: err => { this.loading.set(false); this.toast.httpError(err, 'Could not load invoices.'); }
    });
  }

  countFor(key: StatusFilter): number {
    if (key === 'all') return this.invoices().length;
    return this.invoices().filter(i => i.status === key || (key === 'pending' && i.status === 'partial')).length;
  }

  clientName(inv: Invoice): string {
    if (inv.clientId && typeof inv.clientId !== 'string') return inv.clientId.companyName || '—';
    return inv.billTo?.name || '—';
  }

  clientGstin(inv: Invoice): string {
    if (inv.clientId && typeof inv.clientId !== 'string') return inv.clientId.gstin || '';
    return inv.billTo?.gstin || '';
  }

  gstAmount(inv: Invoice): number {
    return inv.totals.isIGST ? inv.totals.igst : inv.totals.cgst + inv.totals.sgst;
  }

  markPaid(inv: Invoice) {
    this.api.markPaid(inv._id).subscribe({
      next: () => { this.toast.success(`${inv.invoiceNumber} marked as paid`); this.load(); },
      error: err => this.toast.httpError(err)
    });
  }

  exportCsv() {
    this.exporting.set(true);
    this.api.exportInvoicesCsv().subscribe({
      next: blob => { this.exporting.set(false); downloadBlob(blob, 'invoices.csv'); },
      error: err => { this.exporting.set(false); this.toast.httpError(err); }
    });
  }

  downloadPdf(inv: Invoice) {
    this.downloadingId.set(inv._id);
    this.api.downloadInvoicePdf(inv._id).subscribe({
      next: blob => { this.downloadingId.set(null); downloadBlob(blob, `${inv.invoiceNumber}.pdf`); },
      error: err => { this.downloadingId.set(null); this.toast.httpError(err, 'Could not generate the PDF.'); }
    });
  }

  duplicate(inv: Invoice) {
    this.api.duplicateInvoice(inv._id).subscribe({
      next: copy => { this.toast.success(`Duplicated as ${copy.invoiceNumber} (draft)`); this.load(); },
      error: err => this.toast.httpError(err)
    });
  }

  doDelete() {
    const inv = this.confirmDelete();
    if (!inv) return;
    this.busy.set(true);
    this.api.deleteInvoice(inv._id).subscribe({
      next: () => {
        this.busy.set(false);
        this.confirmDelete.set(null);
        this.toast.info('Invoice deleted');
        this.load();
      },
      error: err => { this.busy.set(false); this.toast.httpError(err); }
    });
  }
}
