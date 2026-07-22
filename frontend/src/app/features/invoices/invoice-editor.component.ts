import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AppShellComponent } from '../../shared/app-shell.component';
import { IconComponent } from '../../shared/icons';
import { AvatarComponent, SkeletonRowsComponent } from '../../shared/ui';
import { ItemPickerComponent } from '../../shared/item-picker.component';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { Client, Invoice, InvoiceItem, Item } from '../../core/models';
import { fmtINR, fmtDate, today, addDays, numberToWords, stateName } from '../../core/format';

@Component({
  selector: 'app-invoice-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AppShellComponent, IconComponent, AvatarComponent, SkeletonRowsComponent, ItemPickerComponent],
  template: `
    <app-shell [title]="isEdit() ? 'Edit ' + (invoiceNumber || 'Invoice') : 'New Invoice'"
      [subtitle]="isEdit() ? 'Update details and line items' : 'GST is calculated automatically from state codes'">
      @if (isEdit()) {
        <a actions class="btn secondary" [routerLink]="['/invoices', invoiceId(), 'print']"><app-icon name="printer" [size]="14" /> Preview / Print</a>
      }
      <button actions class="btn ghost" type="button" [disabled]="saving()" (click)="save('draft')">Save Draft</button>
      <button actions class="btn primary" type="button" [disabled]="saving()" (click)="save('pending')">
        @if (saving()) { <span class="spinner"></span> } {{ isEdit() ? 'Save Changes' : 'Save Invoice' }}
      </button>

      <a routerLink="/invoices" class="no-print" style="display:inline-block;color:var(--muted);font-size:12.5px;margin:-12px 0 16px;">← Back to invoices</a>

      @if (loading()) {
        <div class="card flush"><app-skeleton-rows [count]="5" /></div>
      } @else {
        <div class="grid grid-main">
          <!-- LEFT: form -->
          <div style="display:grid;gap:16px;">
            <section class="card">
              <div class="card-title" style="margin-bottom:14px;">Invoice Details</div>
              <div class="grid grid-3">
                <div class="field">
                  <label>Invoice Number</label>
                  <input [(ngModel)]="invoiceNumber" [readOnly]="true" [placeholder]="isEdit() ? '' : 'Auto-generated on save'" />
                </div>
                <div class="field">
                  <label>Invoice Date</label>
                  <input type="date" [(ngModel)]="date" />
                </div>
                <div class="field">
                  <label>Due Date</label>
                  <input type="date" [(ngModel)]="dueDate" />
                </div>
              </div>
            </section>

            <section class="card">
              <div class="card-title" style="margin-bottom:14px;">Bill To</div>
              <div class="field">
                <label>Client</label>
                <select [(ngModel)]="clientId" (ngModelChange)="clientError.set('')" [class.invalid]="!!clientError()">
                  <option value="" disabled>Select a client…</option>
                  @for (c of clients(); track c._id) {
                    <option [value]="c._id">{{ c.companyName }}</option>
                  }
                </select>
                @if (clientError()) { <span class="error">{{ clientError() }}</span> }
              </div>
              @if (selectedClient(); as c) {
                <div class="info-box" style="margin-top:12px;display:flex;gap:12px;align-items:flex-start;">
                  <app-avatar [name]="c.companyName" [size]="36" />
                  <div style="line-height:1.6;">
                    <div style="font-weight:700;font-size:13px;color:var(--text);">{{ c.companyName }}</div>
                    @if (c.address) { <div>{{ c.address }}</div> }
                    <div>GSTIN: <span class="mono">{{ c.gstin || '—' }}</span> · {{ stateName(c.stateCode) }} ({{ c.stateCode }})</div>
                  </div>
                </div>
                @if (isIGST()) {
                  <div class="info-box warn" style="margin-top:10px;display:flex;gap:8px;align-items:center;">
                    <app-icon name="alertTriangle" [size]="14" /> Inter-state supply — IGST applicable
                  </div>
                }
              }
            </section>

            <section class="card">
              <div class="card-head" style="margin-bottom:10px;">
                <div class="card-title">Line Items</div>
                <button class="btn secondary sm" type="button" (click)="addItem()">+ Add item</button>
              </div>
              <div class="table-wrap">
                <table class="table line-items-table" style="min-width:640px;">
                  <thead>
                    <tr><th style="min-width:200px;">Description</th><th>HSN/SAC</th><th>Qty</th><th>Rate (₹)</th><th>GST %</th><th style="text-align:right;">Amount</th><th></th></tr>
                  </thead>
                  <tbody>
                    @for (item of items; track $index; let i = $index) {
                      <tr>
                        <td data-label="Description"><app-item-picker [items]="catalogItems()" [(value)]="item.desc" (picked)="applyItem(i, $event)" /></td>
                        <td data-label="HSN/SAC"><input class="input mono li-w-hsn" [(ngModel)]="item.hsn" placeholder="9983xx" /></td>
                        <td data-label="Qty"><input class="input li-w-qty" type="number" min="0" [(ngModel)]="item.qty" /></td>
                        <td data-label="Rate (₹)"><input class="input li-w-rate" type="number" min="0" [(ngModel)]="item.rate" /></td>
                        <td data-label="GST %">
                          <select class="input li-w-gst" [(ngModel)]="item.gstRate">
                            @for (r of gstRates; track r) { <option [ngValue]="r">{{ r }}%</option> }
                          </select>
                        </td>
                        <td data-label="Amount" style="text-align:right;font-weight:600;">{{ fmtINR(lineAmount(item)) }}</td>
                        <td data-label="" style="text-align:right;">
                          @if (items.length > 1) {
                            <button class="btn danger sm" type="button" (click)="removeItem(i)">✕</button>
                          }
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
              @if (itemsError()) { <div class="field" style="margin-top:8px;"><span class="error">{{ itemsError() }}</span></div> }
            </section>

            <section class="card">
              <div class="card-title" style="margin-bottom:14px;">Additional Details</div>
              <div class="grid grid-2">
                <div class="field">
                  <label>Payment Terms</label>
                  <select [(ngModel)]="paymentTerms">
                    @for (t of terms; track t) { <option [value]="t">{{ t }}</option> }
                  </select>
                </div>
                <div class="field">
                  <label>Status</label>
                  <select [(ngModel)]="status">
                    <option value="draft">Draft</option>
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
              </div>
              <div class="field" style="margin-top:12px;">
                <label>Notes / Terms</label>
                <textarea rows="3" [(ngModel)]="notes" placeholder="Thank you for your business!"></textarea>
              </div>
            </section>
          </div>

          <!-- RIGHT: summary sidebar -->
          <div style="display:grid;gap:16px;align-content:start;">
            <section class="card">
              <div class="card-title" style="margin-bottom:14px;">Invoice Summary</div>
              <div style="display:grid;gap:9px;font-size:13px;">
                <div style="display:flex;justify-content:space-between;"><span class="muted" style="color:var(--muted)">Subtotal</span><span style="font-weight:600;">{{ fmtINR(subtotal()) }}</span></div>
                @if (isIGST()) {
                  <div style="display:flex;justify-content:space-between;"><span style="color:var(--muted)">IGST</span><span style="font-weight:600;">{{ fmtINR(totalTax()) }}</span></div>
                } @else {
                  <div style="display:flex;justify-content:space-between;"><span style="color:var(--muted)">CGST</span><span style="font-weight:600;">{{ fmtINR(totalTax() / 2) }}</span></div>
                  <div style="display:flex;justify-content:space-between;"><span style="color:var(--muted)">SGST</span><span style="font-weight:600;">{{ fmtINR(totalTax() / 2) }}</span></div>
                }
                <div style="display:flex;justify-content:space-between;border-top:2px solid var(--border);padding-top:10px;margin-top:4px;">
                  <span style="font-weight:700;">Total</span>
                  <span style="font-weight:800;font-size:16px;color:var(--brand);">{{ fmtINR(grandTotal()) }}</span>
                </div>
              </div>
              <div class="info-box" style="margin-top:14px;">
                <strong>In words:</strong> {{ numberToWords(grandTotal()) }}
              </div>
            </section>

            <section class="card">
              <div class="card-title" style="margin-bottom:14px;">Bank Details</div>
              <div class="form">
                <div class="field"><label>Bank Name</label><input [(ngModel)]="bank.bank" placeholder="HDFC Bank" /></div>
                <div class="field"><label>Account Number</label><input class="mono" [(ngModel)]="bank.account" placeholder="50100XXXXXXXXX" /></div>
                <div class="field"><label>IFSC Code</label><input class="mono" [(ngModel)]="bank.ifsc" placeholder="HDFC0001234" /></div>
              </div>
            </section>

            @if (selectedClient()) {
              @if (isIGST()) {
                <div class="info-box warn">
                  <strong><app-icon name="alertTriangle" [size]="13" style="vertical-align:-2px;" /> IGST Applied</strong><br />
                  Inter-state: {{ stateName(orgStateCode) }} → {{ stateName(selectedClient()!.stateCode) }}
                </div>
              } @else {
                <div class="info-box ok">
                  <strong><app-icon name="check" [size]="13" style="vertical-align:-2px;" /> CGST + SGST Applied</strong><br />
                  Intra-state supply: {{ stateName(orgStateCode) }}
                </div>
              }
            }
          </div>
        </div>
      }
    </app-shell>
  `,
  styles: [`
    .li-w-hsn { width: 88px; }
    .li-w-qty { width: 64px; }
    .li-w-rate { width: 104px; }
    .li-w-gst { width: 76px; }

    /* This grid is an editable form, not a read-only list — it deliberately
       does not use the app-wide .stack-mobile card convention (that's for
       display-only cells; here every cell is an input/select). Instead each
       row becomes its own card with full-width fields, since editing one
       field at a time on a phone already shifts the viewport per keyboard
       focus change — a horizontally-scrolling grid on top of that loses the
       user's place in the list. */
    @media (max-width: 640px) {
      .line-items-table { min-width: 0 !important; }
      .line-items-table thead { display: none; }
      .line-items-table, .line-items-table tbody, .line-items-table tr, .line-items-table td { display: block; width: 100%; }
      .line-items-table tr { border: 1px solid var(--border); border-radius: 10px; margin-bottom: 12px; padding: 12px; }
      .line-items-table td { padding: 6px 0; border: none; }
      .line-items-table td[data-label]:not([data-label=""])::before {
        content: attr(data-label); display: block; font-size: 10.5px; color: var(--muted);
        font-weight: 600; text-transform: uppercase; letter-spacing: .4px; margin-bottom: 4px;
      }
      .line-items-table .li-w-hsn, .line-items-table .li-w-qty,
      .line-items-table .li-w-rate, .line-items-table .li-w-gst { width: 100% !important; }
      .line-items-table td[data-label="Amount"] {
        display: flex; justify-content: space-between; align-items: baseline;
        border-top: 1px dashed var(--border); margin-top: 4px; padding-top: 10px; font-size: 15px;
      }
      .line-items-table td[data-label="Amount"]::before { margin-bottom: 0; }
      .line-items-table td[data-label=""] { text-align: right; padding-top: 4px; }
    }
  `]
})
export class InvoiceEditorComponent implements OnInit {
  readonly gstRates = [0, 5, 12, 18, 28];
  readonly terms = ['Net 15', 'Net 30', 'Net 45', 'Due on receipt', 'Advance'];

  clients = signal<Client[]>([]);
  catalogItems = signal<Item[]>([]);
  loading = signal(true);
  saving = signal(false);
  invoiceId = signal<string | null>(null);
  isEdit = signal(false);
  clientError = signal('');
  itemsError = signal('');

  invoiceNumber = '';
  clientId = '';
  date = today();
  dueDate = addDays(15);
  status: Invoice['status'] = 'pending';
  paymentTerms = 'Net 15';
  notes = 'Thank you for your business!';
  items: InvoiceItem[] = [this.blankItem()];
  bank: { bank: string; account: string; ifsc: string } = { bank: '', account: '', ifsc: '' };

  fmtINR = fmtINR;
  fmtDate = fmtDate;
  numberToWords = numberToWords;
  stateName = stateName;

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private toast: ToastService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  get orgStateCode(): string {
    return this.auth.organisation()?.stateCode || '27';
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    this.invoiceId.set(id);
    this.isEdit.set(!!id);

    this.api.clients().subscribe({
      next: clients => {
        this.clients.set(clients);
        if (id) {
          this.loadInvoice(id);
        } else {
          this.loading.set(false);
        }
      },
      error: err => { this.loading.set(false); this.toast.httpError(err, 'Could not load clients.'); }
    });

    this.api.items().subscribe({ next: list => this.catalogItems.set(list), error: () => {} });
  }

  private loadInvoice(id: string) {
    this.api.invoice(id).subscribe({
      next: inv => {
        this.invoiceNumber = inv.invoiceNumber;
        this.clientId = typeof inv.clientId === 'string' ? inv.clientId : inv.clientId._id;
        this.date = inv.date?.slice(0, 10) || today();
        this.dueDate = inv.dueDate?.slice(0, 10) || addDays(15);
        this.status = inv.status;
        this.paymentTerms = inv.paymentTerms || 'Net 15';
        this.notes = inv.notes || '';
        this.items = inv.items.length ? inv.items.map(i => ({ ...i })) : [this.blankItem()];
        this.bank = {
          bank: inv.bankDetails?.bank || '',
          account: inv.bankDetails?.account || '',
          ifsc: inv.bankDetails?.ifsc || ''
        };
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.toast.httpError(err, 'Invoice not found.');
        this.router.navigateByUrl('/invoices');
      }
    });
  }

  private blankItem(): InvoiceItem {
    return { desc: '', hsn: '998314', qty: 1, rate: 0, gstRate: 18 };
  }

  addItem() { this.items = [...this.items, this.blankItem()]; }
  removeItem(i: number) { this.items = this.items.filter((_, idx) => idx !== i); }

  applyItem(i: number, it: Item) {
    const row = this.items[i];
    row.hsn = it.hsn || row.hsn;
    row.rate = it.sellingPrice;
    row.gstRate = it.gstRate;
  }

  selectedClient(): Client | null {
    return this.clients().find(c => c._id === this.clientId) || null;
  }

  isIGST(): boolean {
    const client = this.selectedClient();
    return !!client && client.stateCode !== this.orgStateCode;
  }

  lineAmount(item: InvoiceItem): number {
    return (Number(item.qty) || 0) * (Number(item.rate) || 0);
  }

  subtotal(): number {
    return this.items.reduce((s, i) => s + this.lineAmount(i), 0);
  }

  totalTax(): number {
    return this.items.reduce((s, i) => s + this.lineAmount(i) * (Number(i.gstRate) || 0) / 100, 0);
  }

  grandTotal(): number { return this.subtotal() + this.totalTax(); }

  save(intent: 'draft' | 'pending') {
    if (!this.clientId) { this.clientError.set('Select a client for this invoice.'); return; }
    const validItems = this.items.filter(i => i.desc.trim() && this.lineAmount(i) > 0);
    if (!validItems.length) { this.itemsError.set('Add at least one line item with a description and amount.'); return; }
    this.itemsError.set('');

    const payload: Partial<Invoice> = {
      clientId: this.clientId,
      date: this.date,
      dueDate: this.dueDate,
      status: this.isEdit() ? this.status : intent,
      paymentTerms: this.paymentTerms,
      notes: this.notes,
      items: validItems.map(i => ({ desc: i.desc.trim(), hsn: i.hsn, qty: Number(i.qty), rate: Number(i.rate), gstRate: Number(i.gstRate) })),
      bankDetails: { ...this.bank }
    };

    this.saving.set(true);
    const request = this.isEdit()
      ? this.api.updateInvoice(this.invoiceId()!, payload)
      : this.api.createInvoice(payload);

    request.subscribe({
      next: inv => {
        this.saving.set(false);
        this.toast.success(this.isEdit() ? `${inv.invoiceNumber} updated` : `${inv.invoiceNumber} created`);
        this.router.navigateByUrl('/invoices');
      },
      error: err => { this.saving.set(false); this.toast.httpError(err); }
    });
  }
}
