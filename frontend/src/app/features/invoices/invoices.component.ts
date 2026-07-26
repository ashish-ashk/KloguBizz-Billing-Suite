import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AppShellComponent } from '../../shared/app-shell.component';
import { IconComponent } from '../../shared/icons';
import { AvatarComponent, EmptyStateComponent, ModalComponent, OverflowMenuComponent, PagerComponent, PillComponent, SkeletonRowsComponent } from '../../shared/ui';
import { ApiService } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { CreditNoteReason, CreditSummary, Invoice } from '../../core/models';
import { AuthService } from '../../core/auth.service';
import { fmtINR, fmtDate, downloadBlob } from '../../core/format';

type StatusFilter = 'all' | 'paid' | 'pending' | 'overdue' | 'draft' | 'cancelled';

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
                    <td class="strong" data-label="Total" data-priority="high">
                      {{ fmtINR(inv.totals.total) }}
                      <!-- A part-paid invoice reads as misleading without this:
                           the total alone says nothing about what is still owed. -->
                      @if ((inv.amountPaid || 0) > 0 && (inv.balanceDue || 0) > 0) {
                        <div class="muted" style="font-size:11px;font-weight:500">{{ fmtINR(inv.balanceDue || 0) }} due</div>
                      }
                      @if ((inv.amountCredited || 0) > 0) {
                        <div style="font-size:11px;font-weight:600;color:var(--amber)">{{ fmtINR(inv.amountCredited || 0) }} credited</div>
                      }
                    </td>
                    <td data-label="Status" data-priority="high"><app-pill [status]="inv.status" /></td>
                    <td data-label="">
                      <div class="actions">
                        <a class="btn ghost sm" [routerLink]="inv.clientId ? ['/invoices', inv._id, 'edit'] : ['/bill-generator', inv._id, 'edit']">
                          {{ inv.status === 'draft' ? 'Edit' : 'View' }}
                        </a>
                        @if (inv.status !== 'paid' && inv.status !== 'cancelled') {
                          <button class="btn success sm" type="button" (click)="markPaid(inv)"><app-icon name="check" [size]="13" /> Paid</button>
                        }
                        <app-overflow-menu>
                          <button class="btn ghost sm" type="button" [disabled]="downloadingId() === inv._id" (click)="downloadPdf(inv)">
                            @if (downloadingId() === inv._id) { <span class="spinner"></span> } @else { <app-icon name="download" [size]="13" /> } Download PDF
                          </button>
                          <button class="btn ghost sm" type="button" (click)="duplicate(inv)"><app-icon name="copy" [size]="13" /> Duplicate</button>
                          <!-- An issued invoice cannot be deleted: it is a document the
                               customer holds and the GST return has counted. The correct
                               reversals are a credit note (money already changed hands or
                               goods came back) or a cancellation (raised in error, nothing
                               collected). Only drafts can be deleted. -->
                          @if (inv.status === 'draft') {
                            <button class="btn danger sm" type="button" (click)="confirmDelete.set(inv)"><app-icon name="trash" [size]="13" /> Delete</button>
                          } @else if (inv.status !== 'cancelled') {
                            @if (isAdmin()) {
                              <button class="btn ghost sm" type="button" (click)="openCredit(inv)"><app-icon name="rupee" [size]="13" /> Issue credit note</button>
                              <button class="btn danger sm" type="button" (click)="confirmCancel.set(inv)"><app-icon name="alertTriangle" [size]="13" /> Cancel invoice</button>
                            }
                          }
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

      <!-- Issue credit note -->
      <app-modal [open]="!!creditTarget()" title="Issue Credit Note" [width]="520" (close)="closeCredit()">
        @if (creditTarget(); as inv) {
          <p style="margin:0 0 14px;color:var(--muted);line-height:1.6;font-size:13px;">
            A credit note reverses part or all of invoice
            <strong class="mono" style="color:var(--text)">{{ inv.invoiceNumber }}</strong>.
            The invoice itself stays on record, as GST requires, and the credit note gets its
            own number in a separate series.
          </p>

          @if (creditSummary(); as summary) {
            <div class="info-box" style="margin-bottom:16px;font-size:12.5px;line-height:1.8;">
              Invoice total: <strong>{{ fmtINR(summary.invoiceTotal) }}</strong><br />
              @if (summary.credited > 0) {
                Already credited: <strong>{{ fmtINR(summary.credited) }}</strong><br />
              }
              Still creditable: <strong style="color:var(--brand)">{{ fmtINR(summary.creditable) }}</strong>
            </div>
          } @else {
            <div class="info-box" style="margin-bottom:16px;display:flex;gap:8px;align-items:center;">
              <span class="spinner"></span> Checking how much can be credited…
            </div>
          }

          <div class="form">
            <div class="field">
              <label>Reason</label>
              <select [(ngModel)]="creditReason">
                @for (r of creditReasons; track r.key) { <option [value]="r.key">{{ r.label }}</option> }
              </select>
            </div>
            <div class="field">
              <label>Note (optional)</label>
              <textarea rows="2" [(ngModel)]="creditNote" placeholder="Anything worth recording about this reversal"></textarea>
            </div>
            <div class="info-box" style="font-size:12px;">
              This issues a <strong>full</strong> credit note for {{ fmtINR(creditSummary()?.creditable || 0) }}.
              For a partial credit, issue it against the specific returned lines from the
              invoice itself.
            </div>
          </div>

          <div class="modal-foot">
            <button class="btn ghost" type="button" (click)="closeCredit()">Cancel</button>
            <button class="btn primary" type="button"
              [disabled]="busy() || !creditSummary() || (creditSummary()?.creditable || 0) <= 0"
              (click)="doCredit()">
              @if (busy()) { <span class="spinner"></span> }
              Issue Credit Note
            </button>
          </div>
        }
      </app-modal>

      <!-- Cancel invoice -->
      <app-modal [open]="!!confirmCancel()" title="Cancel Invoice" [width]="480" (close)="confirmCancel.set(null)">
        @if (confirmCancel(); as inv) {
          <p style="margin:0 0 14px;color:var(--muted);line-height:1.6;">
            Invoice <strong class="mono" style="color:var(--text)">{{ inv.invoiceNumber }}</strong>
            will be marked cancelled. It stays on record and keeps its number — GST does not
            permit gaps in the series — but it stops counting as money owed and will no longer
            be chased.
          </p>
          <p style="margin:0 0 14px;color:var(--muted);line-height:1.6;font-size:12.5px;">
            Use this for an invoice raised in error. If the customer has paid, or goods were
            returned, issue a credit note instead.
          </p>
          <div class="field">
            <label>Reason (optional)</label>
            <input [(ngModel)]="cancelReason" placeholder="e.g. raised against the wrong client" />
          </div>
          <div class="modal-foot">
            <button class="btn ghost" type="button" (click)="confirmCancel.set(null)">Keep Invoice</button>
            <button class="btn danger solid" type="button" [disabled]="busy()" (click)="doCancel()">Cancel Invoice</button>
          </div>
        }
      </app-modal>

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
    { key: 'draft', label: 'Draft' },
    // Cancelled invoices are retained (GST forbids gaps in the number series),
    // so they need somewhere to be found.
    { key: 'cancelled', label: 'Cancelled' }
  ];

  invoices = signal<Invoice[]>([]);
  loading = signal(true);
  busy = signal(false);
  exporting = signal(false);
  downloadingId = signal<string | null>(null);
  filter = signal<StatusFilter>('all');
  query = signal('');
  confirmDelete = signal<Invoice | null>(null);
  confirmCancel = signal<Invoice | null>(null);
  cancelReason = '';

  /** Invoice a credit note is being raised against. */
  creditTarget = signal<Invoice | null>(null);
  /** Server-computed ceiling, fetched when the modal opens — the API enforces
   *  it too, but showing it first stops the user guessing. */
  creditSummary = signal<CreditSummary | null>(null);
  creditReason: CreditNoteReason = 'sales-return';
  creditNote = '';

  readonly creditReasons: Array<{ key: CreditNoteReason; label: string }> = [
    { key: 'sales-return', label: 'Goods returned by the customer' },
    { key: 'post-sale-discount', label: 'Discount agreed after the sale' },
    { key: 'correction', label: 'Correcting an overcharge' },
    { key: 'deficiency-in-service', label: 'Deficiency in service' },
    { key: 'order-cancelled', label: 'Order cancelled' },
    { key: 'other', label: 'Other' }
  ];

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

  constructor(private api: ApiService, private toast: ToastService, private auth: AuthService) {}

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

  /** Reversing a charge is an admin decision — the API enforces this too. */
  isAdmin(): boolean {
    return this.auth.user()?.role === 'admin';
  }

  // ── Credit note ────────────────────────────────
  openCredit(inv: Invoice) {
    this.creditTarget.set(inv);
    this.creditSummary.set(null);
    this.creditReason = 'sales-return';
    this.creditNote = '';
    this.api.creditSummary(inv._id).subscribe({
      next: summary => this.creditSummary.set(summary),
      error: err => { this.closeCredit(); this.toast.httpError(err, 'Could not check this invoice.'); }
    });
  }

  closeCredit() {
    this.creditTarget.set(null);
    this.creditSummary.set(null);
  }

  doCredit() {
    const inv = this.creditTarget();
    if (!inv || this.busy()) return;
    this.busy.set(true);
    this.api.createCreditNote({
      invoiceId: inv._id,
      reason: this.creditReason,
      reasonNote: this.creditNote.trim() || undefined
    }).subscribe({
      next: result => {
        this.busy.set(false);
        this.closeCredit();
        this.toast.success(`Credit note ${result.creditNote.creditNoteNumber} issued for ${fmtINR(result.creditNote.totals.total)}`);
        this.load();
      },
      error: err => { this.busy.set(false); this.toast.httpError(err); }
    });
  }

  // ── Cancel ─────────────────────────────────────
  doCancel() {
    const inv = this.confirmCancel();
    if (!inv || this.busy()) return;
    this.busy.set(true);
    this.api.cancelInvoice(inv._id, this.cancelReason.trim() || undefined).subscribe({
      next: () => {
        this.busy.set(false);
        this.confirmCancel.set(null);
        this.cancelReason = '';
        this.toast.info(`Invoice ${inv.invoiceNumber} cancelled`);
        this.load();
      },
      error: err => { this.busy.set(false); this.toast.httpError(err); }
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
