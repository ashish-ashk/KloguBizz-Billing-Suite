import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AppShellComponent } from '../../shared/app-shell.component';
import { IconComponent } from '../../shared/icons';
import { SkeletonRowsComponent } from '../../shared/ui';
import { ItemPickerComponent } from '../../shared/item-picker.component';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { Client, InvoiceItem, Item } from '../../core/models';
import { STATES, UNITS, addDays, fmtINR, numberToWords, stateName, today } from '../../core/format';

type BillMode = 'b2b-reg' | 'b2b-unreg' | 'b2c';

interface BillRow {
  desc: string;
  hsn: string;
  unit: string;
  qty: number;
  rate: number;
  gstRate: number;
}

@Component({
  selector: 'app-bill-generator',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AppShellComponent, IconComponent, SkeletonRowsComponent, ItemPickerComponent],
  template: `
    <app-shell [title]="isEdit() ? 'Edit Bill' : 'Bill Generator'"
      [subtitle]="isEdit() ? 'Update this bill’s items, buyer and totals' : 'Create GST-compliant bills for B2B and B2C'">
      @if (isEdit()) {
        <a actions class="btn ghost" [routerLink]="['/invoices', invoiceId(), 'print']"><app-icon name="printer" [size]="14" /> Preview</a>
      }
      <button actions class="btn primary" type="button" [disabled]="!canSave() || saving()" (click)="save()">
        {{ saving() ? 'Saving…' : (isEdit() ? 'Update Invoice' : 'Save as Invoice') }}
      </button>

      @if (loading()) {
        <div class="card flush"><app-skeleton-rows [count]="5" /></div>
      } @else {
      <!-- Mode selector -->
      <div class="grid grid-3" style="margin-bottom:20px">
        @for (m of modes; track m.key) {
          <button type="button" class="card hoverable" style="text-align:left;cursor:pointer;padding:14px 18px" [disabled]="isEdit()"
            [style.opacity]="isEdit() && mode() !== m.key ? 0.5 : 1"
            [style.borderColor]="mode() === m.key ? 'var(--brand)' : ''"
            [style.background]="mode() === m.key ? 'var(--brand-pale)' : ''"
            (click)="!isEdit() && mode.set(m.key)">
            <div style="font-weight:700;font-family:var(--font-display);font-size:13.5px"
              [style.color]="mode() === m.key ? 'var(--brand)' : 'var(--text)'">{{ m.label }}</div>
            <div class="card-sub">{{ m.sub }}</div>
          </button>
        }
      </div>

      <div style="display:grid;grid-template-columns:1.6fr 1fr;gap:20px;align-items:start">

        <!-- ── Left column ─────────────────────── -->
        <div style="display:grid;gap:16px">

          <!-- Bill details -->
          <div class="card">
            <div class="card-head"><div class="card-title">Bill Details</div></div>
            <div class="grid grid-3">
              <div class="field">
                <label>Bill Number</label>
                <input readonly placeholder="Auto-generated on save" [value]="invoiceNumber()">
              </div>
              <div class="field">
                <label>Bill Date</label>
                <input type="date" [(ngModel)]="billDate">
              </div>
              <div class="field">
                <label>Due Date</label>
                <input type="date" [(ngModel)]="dueDate">
              </div>
            </div>
          </div>

          <!-- Buyer -->
          <div class="card">
            <div class="card-head">
              <div>
                <div class="card-title">Buyer</div>
                <div class="card-sub">
                  {{ mode() === 'b2b-reg' ? 'Pick a registered client from your list' : (mode() === 'b2b-unreg' ? 'Business buyer without a GSTIN' : 'Retail consumer details') }}
                </div>
              </div>
            </div>
            @if (mode() === 'b2b-reg') {
              <div class="form">
                <div class="field">
                  <label>Client</label>
                  <select [(ngModel)]="clientId">
                    <option value="">— Select a client —</option>
                    @for (c of clients(); track c._id) {
                      <option [value]="c._id">{{ c.companyName }}</option>
                    }
                  </select>
                </div>
                @if (selectedClient(); as sc) {
                  <div class="info-box">
                    <strong>{{ sc.companyName }}</strong><br>
                    @if (sc.gstin) { GSTIN: <span class="mono">{{ sc.gstin }}</span><br> }
                    @if (sc.address) { {{ sc.address }}<br> }
                    {{ stateName(sc.stateCode) }} ({{ sc.stateCode }})
                  </div>
                  @if (isIGST()) {
                    <div class="info-box warn" style="display:flex;gap:8px;align-items:center;">
                      <app-icon name="alertTriangle" [size]="14" /> Inter-state supply — IGST will be applied
                    </div>
                  }
                }
              </div>
            } @else {
              <div class="form">
                <div class="grid grid-2">
                  <div class="field">
                    <label>Name *</label>
                    <input [(ngModel)]="buyerName" placeholder="Buyer name">
                  </div>
                  @if (mode() === 'b2b-unreg') {
                    <div class="field">
                      <label>Phone</label>
                      <input [(ngModel)]="buyerPhone" placeholder="98765 43210">
                    </div>
                  } @else {
                    <div class="field">
                      <label>Email</label>
                      <input [(ngModel)]="buyerEmail" placeholder="buyer@example.com">
                    </div>
                  }
                </div>
                <div class="field">
                  <label>Address</label>
                  <input [(ngModel)]="buyerAddress" placeholder="Street, city, PIN">
                </div>
                <div class="grid grid-2">
                  <div class="field">
                    <label>State</label>
                    <select [(ngModel)]="buyerStateCode">
                      <option value="">— Select state —</option>
                      @for (s of states; track s.code) {
                        <option [value]="s.code">{{ s.name }} ({{ s.code }})</option>
                      }
                    </select>
                  </div>
                  @if (mode() === 'b2b-unreg') {
                    <div class="field">
                      <label>Email</label>
                      <input [(ngModel)]="buyerEmail" placeholder="buyer@example.com">
                    </div>
                  }
                </div>
              </div>
            }
          </div>

          <!-- Items -->
          <div class="card flush">
            <div class="card-head">
              <div class="card-title">Items</div>
              <button class="btn secondary sm" type="button" (click)="addRow()">+ Add row</button>
            </div>
            <div style="padding:14px 16px;overflow-x:auto">
              <div style="min-width:760px">
                <div style="display:grid;grid-template-columns:2.2fr .8fr .7fr .55fr .85fr .7fr .95fr 30px;gap:8px;margin-bottom:6px">
                  @for (h of itemHeads; track $index) {
                    <span style="font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:var(--faint)">{{ h }}</span>
                  }
                </div>
                @for (r of rows; track $index; let i = $index) {
                  <div style="display:grid;grid-template-columns:2.2fr .8fr .7fr .55fr .85fr .7fr .95fr 30px;gap:8px;margin-bottom:8px;align-items:center">
                    <app-item-picker [items]="catalogItems()" [(value)]="r.desc" (picked)="applyItem(i, $event)" placeholder="Item or service description" />
                    <input class="input" [(ngModel)]="r.hsn" placeholder="HSN">
                    <select class="input" [(ngModel)]="r.unit">
                      @for (u of units; track u) { <option [value]="u">{{ u }}</option> }
                    </select>
                    <input class="input" type="number" min="1" [(ngModel)]="r.qty">
                    <input class="input" type="number" min="0" step="0.01" [(ngModel)]="r.rate">
                    <select class="input" [(ngModel)]="r.gstRate">
                      @for (g of gstRates; track g) { <option [ngValue]="g">{{ g }}%</option> }
                    </select>
                    <div style="font-size:12.5px;font-weight:600;text-align:right">{{ fmtINR(rowTaxable(r)) }}</div>
                    @if (rows.length > 1) {
                      <button class="btn ghost sm" type="button" style="padding:4px 8px" (click)="removeRow(i)" aria-label="Remove row">✕</button>
                    } @else { <span></span> }
                  </div>
                }
              </div>
            </div>
          </div>

          <!-- Additional -->
          <div class="card">
            <div class="card-head"><div class="card-title">Additional</div></div>
            <div class="form">
              <div class="grid grid-2">
                <div class="field">
                  <label>Discount %</label>
                  <input type="number" min="0" max="100" [(ngModel)]="discount">
                  <span class="hint">Discount is applied to item rates when saving.</span>
                </div>
              </div>
              <div class="field">
                <label>Notes</label>
                <textarea rows="2" [(ngModel)]="notes" placeholder="Terms, remarks…"></textarea>
              </div>
            </div>
          </div>
        </div>

        <!-- ── Right column ────────────────────── -->
        <div style="display:grid;gap:16px;position:sticky;top:20px">

          <!-- Bill summary -->
          <div class="card">
            <div class="card-head"><div class="card-title">Bill Summary</div></div>
            <div style="display:grid;gap:9px;font-size:13px">
              <div style="display:flex;justify-content:space-between">
                <span style="color:var(--muted)">Subtotal</span>
                <span style="font-weight:600">{{ fmtINR(subtotal()) }}</span>
              </div>
              @if (discountAmount() > 0) {
                <div style="display:flex;justify-content:space-between;color:var(--red)">
                  <span>Discount ({{ discount }}%)</span>
                  <span>−{{ fmtINR(discountAmount()) }}</span>
                </div>
              }
              @if (isIGST()) {
                <div style="display:flex;justify-content:space-between">
                  <span style="color:var(--muted)">IGST</span>
                  <span style="font-weight:600">{{ fmtINR(totalTax()) }}</span>
                </div>
              } @else {
                <div style="display:flex;justify-content:space-between">
                  <span style="color:var(--muted)">CGST</span>
                  <span style="font-weight:600">{{ fmtINR(halfTax()) }}</span>
                </div>
                <div style="display:flex;justify-content:space-between">
                  <span style="color:var(--muted)">SGST</span>
                  <span style="font-weight:600">{{ fmtINR(halfTax()) }}</span>
                </div>
              }
              <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--border);padding-top:10px;margin-top:2px">
                <span style="font-weight:700">Total</span>
                <span style="font-weight:800;font-size:16px;color:var(--brand)">{{ fmtINR(total()) }}</span>
              </div>
              <div class="info-box" style="font-size:11.5px">
                <strong>In words:</strong> {{ numberToWords(total()) }}
              </div>
            </div>
          </div>

          <!-- GST breakdown -->
          <div class="card flush">
            <div class="card-head"><div class="card-title">GST Breakdown</div></div>
            @if (taxRows().length === 0) {
              <div style="padding:16px 20px;color:var(--muted);font-size:12.5px">Add items to see the tax breakdown.</div>
            } @else {
              <div class="table-wrap">
                <table class="table stack-mobile">
                  <thead>
                    <tr><th>Rate</th><th>Taxable</th><th>Tax</th></tr>
                  </thead>
                  <tbody>
                    @for (t of taxRows(); track t.rate) {
                      <tr>
                        <td class="num" data-label="Rate">{{ t.rate }}%</td>
                        <td data-label="Taxable">{{ fmtINR(t.taxable) }}</td>
                        <td class="strong" data-label="Tax">{{ fmtINR(t.tax) }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>

          <!-- GST type -->
          @if (isIGST()) {
            <div class="info-box warn" style="display:flex;gap:8px;align-items:center;">
              <app-icon name="alertTriangle" [size]="14" /> <strong>IGST Applied</strong> — Inter-state: {{ orgStateName() }} → {{ buyerStateName() }}
            </div>
          } @else {
            <div class="info-box ok" style="display:flex;gap:8px;align-items:center;">
              <app-icon name="check" [size]="14" /> <strong>CGST + SGST Applied</strong> — Intra-state supply
            </div>
          }
        </div>
      </div>
      }
    </app-shell>
  `
})
export class BillGeneratorComponent implements OnInit {
  clients = signal<Client[]>([]);
  mode = signal<BillMode>('b2b-reg');
  saving = signal(false);
  loading = signal(false);
  invoiceId = signal<string | null>(null);
  invoiceNumber = signal('');
  isEdit(): boolean { return !!this.invoiceId(); }

  // Bill details
  billDate = today();
  dueDate = addDays(15);

  // Buyer (B2B registered)
  clientId = '';

  // Buyer (free-input modes)
  buyerName = '';
  buyerPhone = '';
  buyerAddress = '';
  buyerEmail = '';
  buyerStateCode = '';

  // Items and extras
  rows: BillRow[] = [this.blankRow()];
  discount = 0;
  notes = '';

  modes: Array<{ key: BillMode; label: string; sub: string }> = [
    { key: 'b2b-reg', label: 'B2B — Registered', sub: 'GSTIN buyer from your client list' },
    { key: 'b2b-unreg', label: 'B2B — Unregistered', sub: 'Business buyer without a GSTIN' },
    { key: 'b2c', label: 'B2C Consumer', sub: 'Retail sale to an individual' }
  ];
  units = UNITS;
  catalogItems = signal<Item[]>([]);
  gstRates = [0, 5, 12, 18, 28];
  itemHeads = ['Description *', 'HSN', 'Unit', 'Qty', 'Rate ₹', 'GST %', 'Taxable', ''];
  states = STATES;

  fmtINR = fmtINR;
  numberToWords = numberToWords;
  stateName = stateName;

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private toast: ToastService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    this.invoiceId.set(id);
    this.api.clients().subscribe({
      next: list => {
        this.clients.set(list);
        if (id) this.loadForEdit(id);
      },
      error: err => this.toast.httpError(err)
    });
    this.api.items().subscribe({ next: list => this.catalogItems.set(list), error: () => {} });
  }

  private loadForEdit(id: string) {
    this.loading.set(true);
    this.api.invoice(id).subscribe({
      next: inv => {
        this.loading.set(false);
        this.mode.set('b2b-reg');
        this.invoiceNumber.set(inv.invoiceNumber);
        this.billDate = inv.date?.slice(0, 10) || today();
        this.dueDate = inv.dueDate?.slice(0, 10) || addDays(15);
        this.clientId = typeof inv.clientId === 'string' ? inv.clientId : inv.clientId._id;
        this.rows = inv.items.length
          ? inv.items.map(i => ({ desc: i.desc, hsn: i.hsn || '', unit: 'Nos', qty: i.qty, rate: i.rate, gstRate: i.gstRate }))
          : [this.blankRow()];
        this.discount = 0;
        this.notes = inv.notes || '';
      },
      error: err => {
        this.loading.set(false);
        this.toast.httpError(err, 'Bill not found.');
        this.router.navigateByUrl('/invoices');
      }
    });
  }

  // ── Rows ─────────────────────────────────────
  private blankRow(): BillRow {
    return { desc: '', hsn: '', unit: 'Nos', qty: 1, rate: 0, gstRate: 18 };
  }

  addRow() { this.rows.push(this.blankRow()); }

  removeRow(i: number) {
    if (this.rows.length > 1) this.rows.splice(i, 1);
  }

  applyItem(i: number, it: Item) {
    const row = this.rows[i];
    row.hsn = it.hsn || row.hsn;
    row.unit = it.unit || row.unit;
    row.rate = it.sellingPrice;
    row.gstRate = it.gstRate;
  }

  // ── Buyer / GST type ─────────────────────────
  selectedClient(): Client | null {
    return this.clients().find(c => c._id === this.clientId) || null;
  }

  private orgState(): string {
    return this.auth.organisation()?.stateCode || '';
  }

  private buyerState(): string {
    return this.mode() === 'b2b-reg' ? (this.selectedClient()?.stateCode || '') : this.buyerStateCode;
  }

  isIGST(): boolean {
    const org = this.orgState();
    const buyer = this.buyerState();
    return !!org && !!buyer && org !== buyer;
  }

  orgStateName(): string {
    return this.orgState() ? stateName(this.orgState()) : '—';
  }

  buyerStateName(): string {
    return this.buyerState() ? stateName(this.buyerState()) : '—';
  }

  // ── Calculation ──────────────────────────────
  private r2(n: number): number {
    return Math.round(n * 100) / 100;
  }

  private discFactor(): number {
    const d = Math.min(100, Math.max(0, this.discount || 0));
    return 1 - d / 100;
  }

  rowTaxable(r: BillRow): number {
    return this.r2((r.qty || 0) * (r.rate || 0));
  }

  subtotal(): number {
    return this.r2(this.rows.reduce((s, r) => s + (r.qty || 0) * (r.rate || 0), 0));
  }

  discountAmount(): number {
    return this.r2(this.subtotal() * (1 - this.discFactor()));
  }

  taxRows(): Array<{ rate: number; taxable: number; tax: number }> {
    const f = this.discFactor();
    const map = new Map<number, { taxable: number; tax: number }>();
    for (const r of this.rows) {
      const base = (r.qty || 0) * (r.rate || 0) * f;
      if (base <= 0) continue;
      const entry = map.get(r.gstRate) || { taxable: 0, tax: 0 };
      entry.taxable += base;
      entry.tax += base * r.gstRate / 100;
      map.set(r.gstRate, entry);
    }
    return [...map.entries()]
      .map(([rate, e]) => ({ rate, taxable: this.r2(e.taxable), tax: this.r2(e.tax) }))
      .sort((a, b) => a.rate - b.rate);
  }

  totalTax(): number {
    const f = this.discFactor();
    return this.r2(this.rows.reduce((s, r) => s + (r.qty || 0) * (r.rate || 0) * f * (r.gstRate || 0) / 100, 0));
  }

  halfTax(): number {
    return this.r2(this.totalTax() / 2);
  }

  total(): number {
    return this.r2(this.subtotal() - this.discountAmount() + this.totalTax());
  }

  // ── Save as invoice ──────────────────────────
  private validItems(): BillRow[] {
    return this.rows.filter(r => r.desc.trim() && (r.qty || 0) > 0 && (r.rate || 0) > 0);
  }

  canSave(): boolean {
    return this.mode() === 'b2b-reg' && !!this.clientId && this.validItems().length > 0;
  }

  save() {
    if (!this.canSave() || this.saving()) return;
    const f = this.discFactor();
    const hasDiscount = (this.discount || 0) > 0;
    // Backend computes totals from items and ignores discount,
    // so the discount is folded into each item's rate before sending.
    const items: InvoiceItem[] = this.validItems().map(r => ({
      desc: r.desc.trim(),
      hsn: r.hsn.trim(),
      qty: r.qty,
      rate: hasDiscount ? this.r2(r.rate * f) : r.rate,
      gstRate: r.gstRate
    }));

    const payload = {
      clientId: this.clientId,
      date: this.billDate,
      dueDate: this.dueDate,
      items,
      notes: this.notes.trim(),
      paymentTerms: 'Net 15'
    };

    this.saving.set(true);
    const id = this.invoiceId();
    const request = id
      ? this.api.updateInvoice(id, payload)
      : this.api.createInvoice({ ...payload, status: 'pending' });

    request.subscribe({
      next: inv => {
        this.saving.set(false);
        if (id) {
          this.toast.success(`${inv.invoiceNumber} updated`);
          this.router.navigateByUrl('/invoices');
        } else {
          this.toast.success('Invoice created');
          this.resetForm();
        }
      },
      error: err => { this.saving.set(false); this.toast.httpError(err); }
    });
  }

  private resetForm() {
    this.billDate = today();
    this.dueDate = addDays(15);
    this.clientId = '';
    this.buyerName = '';
    this.buyerPhone = '';
    this.buyerAddress = '';
    this.buyerEmail = '';
    this.buyerStateCode = '';
    this.rows = [this.blankRow()];
    this.discount = 0;
    this.notes = '';
  }
}
