import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AppShellComponent } from '../../shared/app-shell.component';
import { IconComponent } from '../../shared/icons';
import {
  EmptyStateComponent, ModalComponent, PagerComponent, PillComponent, SkeletonRowsComponent, OverflowMenuComponent
} from '../../shared/ui';
import { ApiService } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { ServerList } from '../../core/server-list';
import {
  ChallanPurpose, Client, InvoiceItem, SalesDocument, SalesDocumentKind, SalesDocumentSummary
} from '../../core/models';
import { downloadBlob, fmtINR, fmtDate, STATES, stateName, today } from '../../core/format';

/**
 * The three kinds, and what each screen is actually for.
 *
 * They are tabs rather than three routes because a user thinks of them as "the
 * paperwork before the invoice", and because the table, the form and every
 * action are the same — only which columns matter differs.
 */
const KINDS: Array<{
  value: SalesDocumentKind;
  label: string;
  plural: string;
  blurb: string;
  /** The verb on the convert button — what the user thinks they are doing. */
  convertLabel: string;
}> = [
  {
    value: 'quotation',
    label: 'Quotation',
    plural: 'Quotations',
    blurb: 'An offer with a price and an expiry. Nothing is owed until you invoice it.',
    convertLabel: 'Accept & invoice'
  },
  {
    value: 'proforma',
    label: 'Proforma Invoice',
    plural: 'Proforma Invoices',
    blurb: 'A request for advance payment. Not a tax invoice — no GST is payable on it.',
    convertLabel: 'Raise tax invoice'
  },
  {
    value: 'delivery-challan',
    label: 'Delivery Challan',
    plural: 'Delivery Challans',
    blurb: 'Goods moving without a tax invoice (job work, approval). Stock moves when you invoice.',
    convertLabel: 'Invoice these goods'
  }
];

const CHALLAN_PURPOSES: Array<{ value: ChallanPurpose; label: string }> = [
  { value: 'job-work', label: 'Job work' },
  { value: 'approval', label: 'Sent on approval' },
  { value: 'supply-on-approval', label: 'Supply on approval' },
  { value: 'liquid-gas', label: 'Liquid gas (quantity unknown at dispatch)' },
  { value: 'semi-knocked-down', label: 'Semi/completely knocked-down supply' },
  { value: 'exhibition', label: 'Exhibition or fair' },
  { value: 'other', label: 'Other' }
];

/**
 * Quotations, proforma invoices and delivery challans (2.2 #11, #12, #13).
 *
 * The product's core loop used to begin at the invoice, which is one step too
 * late: most sales begin with a quote, many customers pay against a proforma
 * before an invoice can legally be raised, and goods frequently move on a
 * challan before anything is billed. All three existed only as things a tenant
 * did in Word and then re-typed here.
 *
 * The screen is built around the one fact that matters about all of them:
 * **none is a tax invoice.** So the totals are labelled as indicative, nothing
 * shows a balance due, and the primary action is always the conversion — which
 * is the moment a real, numbered, GST-reportable document comes into existence.
 * A converted document goes read-only and says what it became.
 */
@Component({
  selector: 'app-sales-documents',
  standalone: true,
  imports: [
    CommonModule, FormsModule, AppShellComponent, IconComponent,
    EmptyStateComponent, ModalComponent, PagerComponent, PillComponent,
    SkeletonRowsComponent, OverflowMenuComponent
  ],
  template: `
    <app-shell [title]="activeKind().plural" [subtitle]="activeKind().blurb">
      <button actions class="btn secondary" type="button" [disabled]="exporting()" (click)="exportCsv()">
        @if (exporting()) { <span class="spinner"></span> } <app-icon name="download" [size]="14" /> Export
      </button>
      <button actions class="btn primary" type="button" (click)="openCreate()">
        <app-icon name="plus" [size]="14" /> New {{ activeKind().label }}
      </button>

      <!-- The global .tabs styles in styles.css already handle button.active. -->
      <div class="tabs" style="margin-bottom:18px;">
        @for (k of kinds; track k.value) {
          <button type="button" [class.active]="kind() === k.value" (click)="switchKind(k.value)">
            {{ k.plural }}
          </button>
        }
      </div>

      <!-- Pipeline figures. Every rate is null rather than 0 when nothing has
           been decided yet — a 0% win rate reads as "we lose everything". -->
      @if (summary(); as s) {
        <div class="grid grid-4" style="margin-bottom:18px;">
          <div class="stat-block">
            <div class="sb-label">Open</div>
            <div class="sb-value">{{ s.openCount }}</div>
          </div>
          <div class="stat-block">
            <div class="sb-label">Value in play</div>
            <div class="sb-value">{{ fmtINR(s.openValue) }}</div>
          </div>
          @if (kind() === 'delivery-challan') {
            <div class="stat-block">
              <div class="sb-label">Awaiting an invoice</div>
              <div class="sb-value" [style.color]="s.awaitingInvoice ? 'var(--amber)' : null">{{ s.awaitingInvoice ?? 0 }}</div>
            </div>
          } @else {
            <div class="stat-block">
              <div class="sb-label">Won</div>
              <div class="sb-value">{{ s.byStatus['converted']?.count ?? 0 }}</div>
            </div>
          }
          <div class="stat-block">
            <div class="sb-label">Conversion rate</div>
            <!-- Null until something is actually decided. -->
            <div class="sb-value">{{ s.conversionRate === null ? '—' : s.conversionRate + '%' }}</div>
          </div>
        </div>
      }

      <div class="card">
        <div class="card-head" style="gap:10px;flex-wrap:wrap;">
          <input class="input" style="max-width:260px;" placeholder="Search number or buyer…"
            [ngModel]="list.search()" (ngModelChange)="list.onSearch($event)" />
          <select class="input" style="max-width:180px;" [ngModel]="statusFilter()" (ngModelChange)="setStatus($event)">
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
            <option value="expired">Expired</option>
            <option value="converted">Converted</option>
          </select>
        </div>

        @if (list.loading()) {
          <app-skeleton-rows [count]="5" />
        } @else if (list.failed()) {
          <!-- Distinct from the empty state on purpose: "nothing here" and "we
               could not load it" need different actions from the user. -->
          <app-empty-state icon="⚠" title="Could not load"
            message="Something went wrong fetching these documents." />
          <div class="actions" style="justify-content:center;padding-bottom:14px;">
            <button class="btn secondary sm" type="button" (click)="list.refresh()">Try again</button>
          </div>
        } @else if (!list.rows().length) {
          <app-empty-state icon="◳"
            [title]="'No ' + activeKind().plural.toLowerCase() + ' yet'"
            [message]="activeKind().blurb" />
        } @else {
          <div class="table-wrap">
            <table class="table stack-mobile">
              <thead>
                <tr>
                  <th>Number</th>
                  <th>Buyer</th>
                  <th>Date</th>
                  @if (kind() === 'quotation') { <th>Valid until</th> }
                  @if (kind() === 'delivery-challan') { <th>Purpose</th> }
                  <th class="num">Total</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (doc of list.rows(); track doc._id) {
                  <tr>
                    <td data-label="Number" class="mono">{{ doc.documentNumber }}</td>
                    <td data-label="Buyer">{{ buyerName(doc) }}</td>
                    <td data-label="Date">{{ fmtDate(doc.date) }}</td>
                    @if (kind() === 'quotation') {
                      <td data-label="Valid until" [style.color]="doc.isExpired ? 'var(--red)' : null">
                        {{ doc.validUntil ? fmtDate(doc.validUntil) : '—' }}
                      </td>
                    }
                    @if (kind() === 'delivery-challan') {
                      <td data-label="Purpose">{{ purposeLabel(doc.challanPurpose) }}</td>
                    }
                    <td data-label="Total" class="num">{{ fmtINR(doc.totals.total || 0) }}</td>
                    <td data-label="Status">
                      <!-- The derived status, so a lapsed quotation reads as
                           expired the instant it lapses. -->
                      <app-pill [status]="doc.effectiveStatus" />
                      @if (doc.isConverted) {
                        <div style="font-size:11px;color:var(--muted);margin-top:3px;">
                          → {{ doc.convertedToInvoiceNumber }}
                        </div>
                      }
                    </td>
                    <td data-label="" class="row-actions">
                      <app-overflow-menu>
                        <button type="button" (click)="downloadPdf(doc)">Download PDF</button>
                        @if (doc.isEditable) {
                          <button type="button" (click)="openEdit(doc)">Edit</button>
                        }
                        @if (doc.status === 'draft') {
                          <button type="button" (click)="setStatusOn(doc, 'sent')">Mark as sent</button>
                        }
                        @if (doc.status === 'sent' && kind() === 'quotation') {
                          <button type="button" (click)="setStatusOn(doc, 'accepted')">Mark accepted</button>
                          <button type="button" (click)="setStatusOn(doc, 'rejected')">Mark rejected</button>
                        }
                        @if (!doc.isConverted) {
                          <button type="button" (click)="askConvert(doc)">{{ activeKind().convertLabel }}</button>
                          <button type="button" class="danger" (click)="remove(doc)">Delete</button>
                        }
                      </app-overflow-menu>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <app-pager [page]="list.page()" [pageSize]="list.pageSize()" [total]="list.total()"
            (pageChange)="list.onPage($event)" (pageSizeChange)="list.onPageSize($event)" />
        }
      </div>

      <!-- Create / edit -->
      <app-modal [open]="showForm()" [title]="formTitle()" [width]="760" (close)="closeForm()">
        <div class="grid grid-2" style="gap:12px;">
          <div class="field">
            <label>Buyer</label>
            <select [(ngModel)]="form.clientId">
              <option value="">Walk-in / not on file</option>
              @for (c of clients(); track c._id) {
                <option [value]="c._id">{{ c.companyName }}</option>
              }
            </select>
          </div>
          @if (!form.clientId) {
            <div class="field">
              <label>Buyer name</label>
              <input [(ngModel)]="form.billToName" placeholder="Who is this for?">
            </div>
            <div class="field">
              <label>Buyer state</label>
              <select [(ngModel)]="form.billToStateCode">
                @for (s of states; track s.code) { <option [value]="s.code">{{ s.name }}</option> }
              </select>
            </div>
          }
          <div class="field">
            <label>Date</label>
            <input type="date" [(ngModel)]="form.date">
          </div>
          @if (kind() === 'quotation') {
            <div class="field">
              <label>Valid until</label>
              <input type="date" [(ngModel)]="form.validUntil">
            </div>
          }
          @if (kind() === 'delivery-challan') {
            <div class="field">
              <label>Purpose</label>
              <select [(ngModel)]="form.challanPurpose">
                @for (p of challanPurposes; track p.value) { <option [value]="p.value">{{ p.label }}</option> }
              </select>
            </div>
            <div class="field">
              <label>Vehicle number</label>
              <input [(ngModel)]="form.vehicleNumber" placeholder="MH 12 AB 1234">
            </div>
          }
        </div>

        <div class="form-section-title" style="margin-top:14px;">Line items</div>
        @for (item of form.items; track $index) {
          <div class="line-grid">
            <div class="field"><label>Description</label><input [(ngModel)]="item.desc"></div>
            <div class="field"><label>HSN/SAC</label><input class="mono" [(ngModel)]="item.hsn"></div>
            <div class="field"><label>Qty</label><input type="number" min="0" [(ngModel)]="item.qty"></div>
            <div class="field"><label>Rate</label><input type="number" min="0" [(ngModel)]="item.rate"></div>
            <div class="field">
              <label>GST %</label>
              <select [(ngModel)]="item.gstRate">
                @for (r of gstRates; track r) { <option [value]="r">{{ r }}%</option> }
              </select>
            </div>
            <button class="btn ghost sm" type="button" [disabled]="form.items.length === 1" (click)="removeLine($index)">
              <app-icon name="trash" [size]="13" />
            </button>
          </div>
        }
        <button class="btn secondary sm" type="button" style="margin-top:6px;" (click)="addLine()">
          <app-icon name="plus" [size]="13" /> Add line
        </button>

        <div class="field" style="margin-top:12px;">
          <label>Notes</label>
          <input [(ngModel)]="form.notes" placeholder="Anything the customer should see">
        </div>

        <div class="info-box" style="margin-top:12px;display:flex;gap:8px;align-items:flex-start;">
          <app-icon name="alertTriangle" [size]="14" style="flex-shrink:0;margin-top:1px" />
          <span>
            Tax is calculated exactly as it will be on the invoice, so the figure you quote is the
            figure you bill. This document is <strong>not</strong> a tax invoice — no GST is payable
            until you convert it.
          </span>
        </div>

        <div class="modal-foot">
          <button class="btn ghost" type="button" (click)="closeForm()">Cancel</button>
          <button class="btn primary" type="button" [disabled]="saving() || !canSave()" (click)="save()">
            @if (saving()) { <span class="spinner"></span> } {{ editingId ? 'Save changes' : 'Create' }}
          </button>
        </div>
      </app-modal>

      <!-- Convert confirmation -->
      <app-modal [open]="!!convertTarget()" title="Raise a tax invoice" [width]="520" (close)="convertTarget.set(null)">
        @if (convertTarget(); as doc) {
          <p style="margin:0 0 12px;line-height:1.7;">
            This creates a real, numbered tax invoice from <strong>{{ doc.documentNumber }}</strong>
            for <strong>{{ fmtINR(doc.totals.total || 0) }}</strong>.
          </p>
          <div class="info-box warn" style="display:flex;gap:8px;align-items:flex-start;">
            <app-icon name="alertTriangle" [size]="14" style="flex-shrink:0;margin-top:1px" />
            <span>
              The invoice is reportable in your GST return and cannot be deleted — only reversed by a
              credit note. {{ doc.kindLabel }} {{ doc.documentNumber }} becomes read-only, and this
              uses one of your monthly invoices.
              @if (kind() === 'delivery-challan') { Stock is deducted at this point, not when the challan was raised. }
            </span>
          </div>
          <div class="grid grid-2" style="gap:12px;margin-top:12px;">
            <div class="field"><label>Invoice date</label><input type="date" [(ngModel)]="convertDate"></div>
            <div class="field"><label>Due date</label><input type="date" [(ngModel)]="convertDueDate"></div>
          </div>
          <div class="modal-foot">
            <button class="btn ghost" type="button" (click)="convertTarget.set(null)">Cancel</button>
            <button class="btn primary" type="button" [disabled]="saving()" (click)="doConvert()">
              @if (saving()) { <span class="spinner"></span> } Create invoice
            </button>
          </div>
        }
      </app-modal>
    </app-shell>
  `,
  styles: [`
    .tabs { display:flex; gap:6px; border-bottom:1px solid var(--border); }
    .tab {
      border:0; background:transparent; padding:9px 14px; cursor:pointer;
      font-size:13px; font-weight:600; color:var(--muted);
      border-bottom:2px solid transparent; transition:color .15s var(--ease), border-color .15s var(--ease);
    }
    .tab:hover { color:var(--text); }
    .tab.active { color:var(--brand); border-bottom-color:var(--brand); }
    .line-grid {
      display:grid; gap:8px; align-items:end; margin-bottom:8px;
      grid-template-columns: 2fr 1fr 0.7fr 1fr 0.9fr auto;
    }
    @media (max-width: 720px) {
      .line-grid {
        grid-template-columns: 1fr 1fr;
        border:1px solid var(--border); border-radius:10px; padding:10px; margin-bottom:10px;
      }
    }
  `]
})
export class SalesDocumentsComponent implements OnInit, OnDestroy {
  kind = signal<SalesDocumentKind>('quotation');
  statusFilter = signal('');
  saving = signal(false);
  exporting = signal(false);
  showForm = signal(false);
  convertTarget = signal<SalesDocument | null>(null);
  summary = signal<SalesDocumentSummary | null>(null);
  clients = signal<Client[]>([]);

  list = new ServerList<SalesDocument>(params =>
    this.api.salesDocuments({ ...params, kind: this.kind(), status: this.statusFilter() || undefined })
  );

  editingId: string | null = null;
  form = this.blankForm();
  convertDate = today();
  convertDueDate = '';

  kinds = KINDS;
  challanPurposes = CHALLAN_PURPOSES;
  states = STATES;
  gstRates = [0, 0.25, 3, 5, 12, 18, 28];
  fmtINR = fmtINR;
  fmtDate = fmtDate;
  stateName = stateName;

  activeKind = computed(() => KINDS.find(k => k.value === this.kind()) || KINDS[0]);
  formTitle = computed(() => `${this.editingId ? 'Edit' : 'New'} ${this.activeKind().label}`);

  constructor(private api: ApiService, private toast: ToastService, private router: Router) {}

  ngOnInit() {
    this.list.refresh();
    this.loadSummary();
    // The buyer picker needs the list up front: an empty picker is
    // indistinguishable from having no clients.
    this.api.clients({ limit: 200 }).subscribe({
      next: page => this.clients.set(page.data),
      error: () => {}
    });
  }

  ngOnDestroy() { this.list.dispose(); }

  switchKind(kind: SalesDocumentKind) {
    if (kind === this.kind()) return;
    this.kind.set(kind);
    this.statusFilter.set('');
    // `setFilter` resets to page one and reloads — switching tabs while on page
    // 3 of quotations must not land on page 3 of challans.
    this.list.setFilter('status', undefined);
    this.loadSummary();
  }

  setStatus(status: string) {
    this.statusFilter.set(status);
    this.list.setFilter('status', status || undefined);
  }

  private loadSummary() {
    this.api.salesDocumentSummary(this.kind()).subscribe({
      next: s => this.summary.set(s),
      error: () => this.summary.set(null)
    });
  }

  buyerName(doc: SalesDocument): string {
    const client = doc.clientId;
    if (client && typeof client === 'object') return client.companyName;
    return doc.billTo?.name || '—';
  }

  purposeLabel(purpose?: ChallanPurpose): string {
    return CHALLAN_PURPOSES.find(p => p.value === purpose)?.label || '—';
  }

  // ── Form ─────────────────────────────────────

  private blankForm() {
    return {
      clientId: '',
      billToName: '',
      billToStateCode: '27',
      date: today(),
      validUntil: '',
      challanPurpose: 'job-work' as ChallanPurpose,
      vehicleNumber: '',
      notes: '',
      items: [{ desc: '', hsn: '', qty: 1, rate: 0, gstRate: 18 }] as InvoiceItem[]
    };
  }

  openCreate() {
    this.editingId = null;
    this.form = this.blankForm();
    this.showForm.set(true);
  }

  openEdit(doc: SalesDocument) {
    this.editingId = doc._id;
    const client = doc.clientId;
    this.form = {
      clientId: client ? (typeof client === 'object' ? client._id : client) : '',
      billToName: doc.billTo?.name || '',
      billToStateCode: doc.billTo?.stateCode || '27',
      date: (doc.date || '').slice(0, 10),
      validUntil: (doc.validUntil || '').slice(0, 10),
      challanPurpose: doc.challanPurpose || 'job-work',
      vehicleNumber: doc.transport?.vehicleNumber || '',
      notes: doc.notes || '',
      items: doc.items.map(item => ({ ...item }))
    };
    this.showForm.set(true);
  }

  closeForm() {
    this.showForm.set(false);
    this.editingId = null;
  }

  addLine() { this.form.items = [...this.form.items, { desc: '', hsn: '', qty: 1, rate: 0, gstRate: 18 }]; }
  removeLine(index: number) { this.form.items = this.form.items.filter((_, i) => i !== index); }

  canSave(): boolean {
    const hasBuyer = Boolean(this.form.clientId || this.form.billToName.trim());
    const hasLine = this.form.items.some(item => item.desc?.trim() && Number(item.qty) > 0);
    return hasBuyer && hasLine;
  }

  private payload() {
    const kind = this.kind();
    return {
      kind,
      clientId: this.form.clientId || undefined,
      billTo: this.form.clientId
        ? undefined
        : { name: this.form.billToName.trim(), stateCode: this.form.billToStateCode, type: 'b2c' as const },
      date: this.form.date || undefined,
      validUntil: kind === 'quotation' ? (this.form.validUntil || undefined) : undefined,
      challanPurpose: kind === 'delivery-challan' ? this.form.challanPurpose : undefined,
      transport: kind === 'delivery-challan' && this.form.vehicleNumber
        ? { vehicleNumber: this.form.vehicleNumber }
        : undefined,
      notes: this.form.notes || undefined,
      items: this.form.items
        .filter(item => item.desc?.trim())
        .map(item => ({ ...item, qty: Number(item.qty), rate: Number(item.rate), gstRate: Number(item.gstRate) }))
    };
  }

  save() {
    this.saving.set(true);
    const done = (message: string) => {
      this.saving.set(false);
      this.closeForm();
      this.list.refresh();
      this.loadSummary();
      this.toast.success(message);
    };
    const failed = (err: unknown) => { this.saving.set(false); this.toast.httpError(err); };

    if (this.editingId) {
      this.api.updateSalesDocument(this.editingId, this.payload() as Partial<SalesDocument>)
        .subscribe({ next: doc => done(`${doc.documentNumber} saved`), error: failed });
    } else {
      this.api.createSalesDocument(this.payload() as Parameters<ApiService['createSalesDocument']>[0])
        .subscribe({ next: doc => done(`${doc.documentNumber} created`), error: failed });
    }
  }

  // ── Lifecycle actions ────────────────────────

  setStatusOn(doc: SalesDocument, status: 'sent' | 'accepted' | 'rejected') {
    this.api.setSalesDocumentStatus(doc._id, status).subscribe({
      next: () => { this.list.refresh(); this.loadSummary(); this.toast.success(`${doc.documentNumber} marked ${status}`); },
      error: err => this.toast.httpError(err)
    });
  }

  askConvert(doc: SalesDocument) {
    this.convertDate = today();
    this.convertDueDate = '';
    this.convertTarget.set(doc);
  }

  doConvert() {
    const doc = this.convertTarget();
    if (!doc) return;
    this.saving.set(true);
    this.api.convertSalesDocument(doc._id, {
      date: this.convertDate || undefined,
      dueDate: this.convertDueDate || undefined
    }).subscribe({
      next: res => {
        this.saving.set(false);
        this.convertTarget.set(null);
        this.list.refresh();
        this.loadSummary();
        this.toast.success(`Invoice ${res.invoice.invoiceNumber} raised from ${doc.documentNumber}`);
        // Straight to the invoice: it is now the live document, and the thing the
        // user will want to send.
        this.router.navigateByUrl(`/invoices/${res.invoice._id}/print`);
      },
      error: err => { this.saving.set(false); this.toast.httpError(err); }
    });
  }

  remove(doc: SalesDocument) {
    this.api.deleteSalesDocument(doc._id).subscribe({
      next: () => {
        this.list.refresh();
        this.loadSummary();
        this.toast.info(`${doc.documentNumber} moved to the recycle bin`);
      },
      error: err => this.toast.httpError(err)
    });
  }

  downloadPdf(doc: SalesDocument) {
    this.api.downloadSalesDocumentPdf(doc._id).subscribe({
      next: blob => downloadBlob(blob, `${doc.documentNumber}.pdf`),
      error: err => this.toast.httpError(err)
    });
  }

  exportCsv() {
    this.exporting.set(true);
    this.api.exportSalesDocumentsCsv({ kind: this.kind() }).subscribe({
      next: blob => {
        this.exporting.set(false);
        downloadBlob(blob, `${this.kind()}s-${today()}.csv`);
      },
      error: err => { this.exporting.set(false); this.toast.httpError(err); }
    });
  }
}
