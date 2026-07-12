import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AppShellComponent } from '../../shared/app-shell.component';
import { AvatarComponent, EmptyStateComponent, ModalComponent, PillComponent, SkeletonRowsComponent } from '../../shared/ui';
import { ApiService } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { Invoice } from '../../core/models';
import { fmtINR, fmtDate, downloadBlob } from '../../core/format';

type StatusFilter = 'all' | 'paid' | 'pending' | 'overdue' | 'draft';

@Component({
  selector: 'app-invoices',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AppShellComponent, PillComponent, AvatarComponent, EmptyStateComponent, ModalComponent, SkeletonRowsComponent],
  template: `
    <app-shell title="Invoices" [subtitle]="invoices().length + ' total invoices'">
      <button actions class="btn ghost" type="button" [disabled]="exporting()" (click)="exportCsv()">
        @if (exporting()) { <span class="spinner"></span> } ⬇ Export CSV
      </button>
      <a actions class="btn secondary" routerLink="/bill-generator">⊞ Bill Generator</a>
      <a actions class="btn primary" routerLink="/invoices/new">+ New Invoice</a>

      <div class="toolbar">
        <div class="tabs">
          @for (f of filters; track f.key) {
            <button type="button" [class.active]="filter() === f.key" (click)="filter.set(f.key)">
              {{ f.label }} ({{ countFor(f.key) }})
            </button>
          }
        </div>
        <div class="search-box">
          <span class="search-icon">⌕</span>
          <input class="input" type="search" placeholder="Search invoice or client…"
            [ngModel]="query()" (ngModelChange)="query.set($event)" />
        </div>
      </div>

      <section class="card flush">
        @if (loading()) {
          <app-skeleton-rows [count]="6" />
        } @else if (filtered().length) {
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th>Invoice #</th><th>Client</th><th>Date</th><th>Due Date</th>
                  <th>Subtotal</th><th>GST</th><th>Total</th><th>Status</th><th style="text-align:right">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (inv of filtered(); track inv._id) {
                  <tr [class.row-danger]="inv.status === 'overdue'">
                    <td class="num">{{ inv.invoiceNumber }}</td>
                    <td>
                      <div style="display:flex;align-items:center;gap:10px;">
                        <app-avatar [name]="clientName(inv)" [size]="28" />
                        <div>
                          <div style="font-weight:600;">{{ clientName(inv) }}</div>
                          <div class="muted mono" style="font-size:11px;">{{ clientGstin(inv) }}</div>
                        </div>
                      </div>
                    </td>
                    <td class="muted">{{ fmtDate(inv.date) }}</td>
                    <td [style.color]="inv.status === 'overdue' ? 'var(--red)' : ''"
                        [style.fontWeight]="inv.status === 'overdue' ? '700' : ''">{{ fmtDate(inv.dueDate) }}</td>
                    <td class="muted">{{ fmtINR(inv.totals.subtotal) }}</td>
                    <td class="muted">{{ fmtINR(gstAmount(inv)) }}</td>
                    <td class="strong">{{ fmtINR(inv.totals.total) }}</td>
                    <td><app-pill [status]="inv.status" /></td>
                    <td>
                      <div class="actions">
                        <a class="btn ghost sm" [routerLink]="['/invoices', inv._id, 'edit']">Edit</a>
                        @if (inv.status !== 'paid') {
                          <button class="btn success sm" type="button" (click)="markPaid(inv)">✓ Paid</button>
                        }
                        <button class="btn ghost sm" type="button" title="Download PDF" [disabled]="downloadingId() === inv._id" (click)="downloadPdf(inv)">
                          @if (downloadingId() === inv._id) { <span class="spinner"></span> } @else { ⬇ }
                        </button>
                        <button class="btn ghost sm" type="button" title="Duplicate" (click)="duplicate(inv)">⧉</button>
                        <button class="btn danger sm" type="button" (click)="confirmDelete.set(inv)">✕</button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
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

  fmtINR = fmtINR;
  fmtDate = fmtDate;

  constructor(private api: ApiService, private toast: ToastService) {}

  ngOnInit() { this.load(); }

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
    return typeof inv.clientId === 'string' ? '—' : inv.clientId?.companyName || '—';
  }

  clientGstin(inv: Invoice): string {
    return typeof inv.clientId === 'string' ? '' : inv.clientId?.gstin || '';
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
