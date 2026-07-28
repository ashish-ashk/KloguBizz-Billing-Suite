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
import { BillTo, Client, InvoiceItem, Item } from '../../core/models';
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
  styles: [`
    .bg-item-head, .bg-item-row { display: grid; grid-template-columns: 2.2fr .8fr .7fr .55fr .85fr .7fr .95fr 30px; gap: 8px; }
    .bg-item-head { margin-bottom: 6px; }
    .bg-item-row { margin-bottom: 8px; align-items: center; }

    /* Same per-row card treatment as invoice-editor's line-items table — an
       editable grid, not a display-only list, so each row becomes its own
       card with full-width fields rather than a horizontally-scrolling grid. */
    @media (max-width: 640px) {
      .bg-items-wrap { overflow-x: visible; }
      .bg-items-grid { min-width: 0 !important; }
      .bg-item-head { display: none; }
      .bg-item-row {
        display: block; border: 1px solid var(--border); border-radius: 10px;
        padding: 12px; margin-bottom: 12px;
      }
      .bg-item-row > div { margin-bottom: 8px; }
      .bg-item-row > div:last-child { margin-bottom: 0; }
      .bg-item-row > div[data-label]:not([data-label=""])::before {
        content: attr(data-label); display: block; font-size: 10.5px; color: var(--muted);
        font-weight: 600; text-transform: uppercase; letter-spacing: .4px; margin-bottom: 4px;
      }
      .bg-item-row > div[data-label="Taxable"] {
        display: flex; justify-content: space-between; align-items: baseline;
        border-top: 1px dashed var(--border); padding-top: 10px; font-size: 15px;
      }
      .bg-item-row > div[data-label="Taxable"]::before { margin-bottom: 0; }
      .bg-item-row > div[data-label=""] { text-align: right; }
    }
  `],
  template: `
    <app-shell [title]="isEdit() ? 'Edit Bill' : 'Bill Generator'"
      [subtitle]="isEdit() ? 'Update this bill’s items, buyer and totals' : 'Create GST-compliant bills for B2B and B2C'">
      @if (isEdit()) {
        <a actions class="btn ghost" [routerLink]="['/invoices', invoiceId(), 'print']"><app-icon name="printer" [size]="14" /> Preview</a>
      }
      <button actions class="btn primary" type="button" [disabled]="!canSave() || saving()" (click)="save()">
        {{ saving() ? 'Saving…' : saveLabel() }}
      </button>

      @if (loading()) {
        <div class="card flush"><app-skeleton-rows [count]="5" /></div>
      } @else {
      <!-- Mode selector — switchable even while editing, so a walk-in bill
           can be "converted" into a client invoice (or back) by just picking
           a different buyer mode; save() sends whichever buyer shape is
           active and the backend clears the other. -->
      <div class="grid grid-3" style="margin-bottom:20px">
        @for (m of modes; track m.key) {
          <button type="button" class="card hoverable" style="text-align:left;cursor:pointer;padding:14px 18px"
            [style.borderColor]="mode() === m.key ? 'var(--brand)' : ''"
            [style.background]="mode() === m.key ? 'var(--brand-pale)' : ''"
            (click)="mode.set(m.key)">
            <div style="font-weight:700;font-family:var(--font-display);font-size:13.5px"
              [style.color]="mode() === m.key ? 'var(--brand)' : 'var(--text)'">{{ m.label }}</div>
            <div class="card-sub">{{ m.sub }}</div>
          </button>
        }
      </div>
      @if (isEdit()) {
        <div class="info-box" style="margin-bottom:16px;">
          Switching buyer type above and saving will convert this document accordingly — e.g. picking
          <strong>B2B — Registered</strong> turns a walk-in bill into a full client invoice, and vice versa.
        </div>
      }

      <div class="grid grid-wide" style="gap:20px;align-items:start">

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
            <div class="bg-items-wrap" style="padding:14px 16px;overflow-x:auto">
              <div class="bg-items-grid" style="min-width:760px">
                <div class="bg-item-head">
                  @for (h of itemHeads; track $index) {
                    <span style="font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:var(--faint)">{{ h }}</span>
                  }
                </div>
                @for (r of rows; track $index; let i = $index) {
                  <div class="bg-item-row">
                    <div data-label="Description"><app-item-picker [items]="catalogItems()" [(value)]="r.desc" (picked)="applyItem(i, $event)" placeholder="Item or service description" /></div>
                    <div data-label="HSN"><input class="input" [(ngModel)]="r.hsn" placeholder="HSN"></div>
                    <div data-label="Unit">
                      <select class="input" [(ngModel)]="r.unit">
                        @for (u of units; track u) { <option [value]="u">{{ u }}</option> }
                      </select>
                    </div>
                    <div data-label="Qty"><input class="input" type="number" min="1" [(ngModel)]="r.qty"></div>
                    <div data-label="Rate (₹)"><input class="input" type="number" min="0" step="0.01" [(ngModel)]="r.rate"></div>
                    <div data-label="GST %">
                      <select class="input" [(ngModel)]="r.gstRate">
                        @for (g of gstRates; track g) { <option [ngValue]="g">{{ g }}%</option> }
                      </select>
                    </div>
                    <div data-label="Taxable" style="font-size:12.5px;font-weight:600;text-align:right">{{ fmtINR(rowTaxable(r)) }}</div>
                    <div data-label="">
                      @if (rows.length > 1) {
                        <button class="btn ghost sm" type="button" style="padding:4px 8px" (click)="removeRow(i)" aria-label="Remove row">✕</button>
                      }
                    </div>
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
        <div class="sticky-preview-col" style="display:grid;gap:16px;position:sticky;top:20px">

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
                  <span style="color:var(--muted)">{{ stateTaxLabel() }}</span>
                  <span style="font-weight:600">{{ fmtINR(halfTax()) }}</span>
                </div>
              }
              @if (roundOff() !== 0) {
                <div style="display:flex;justify-content:space-between">
                  <span style="color:var(--muted)">Round Off</span>
                  <span style="font-weight:600">{{ roundOff() > 0 ? '+' : '−' }}{{ fmtINR(roundOff() < 0 ? -roundOff() : roundOff()) }}</span>
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
    // The pickers request a bounded page rather than the whole collection. 200 is
    // the API's ceiling; a tenant with more clients or items than that filters
    // with the search box on the Clients / Inventory pages, which query the
    // server. Previously both of these downloaded every record on every visit.
    this.api.clients({ limit: 200, sort: 'companyName' }).subscribe({
      next: page => {
        this.clients.set(page.data);
        if (id) this.loadForEdit(id);
      },
      error: err => this.toast.httpError(err)
    });
    this.api.items({ limit: 200, status: 'active', sort: 'name' }).subscribe({
      next: page => this.catalogItems.set(page.data),
      error: () => {}
    });
  }

  private loadForEdit(id: string) {
    this.loading.set(true);
    this.api.invoice(id).subscribe({
      next: inv => {
        this.loading.set(false);
        this.invoiceNumber.set(inv.invoiceNumber);
        this.billDate = inv.date?.slice(0, 10) || today();
        this.dueDate = inv.dueDate?.slice(0, 10) || addDays(15);
        if (inv.clientId) {
          this.mode.set('b2b-reg');
          this.clientId = typeof inv.clientId === 'string' ? inv.clientId : inv.clientId._id;
        } else {
          this.mode.set(inv.billTo?.type || 'b2c');
          this.buyerName = inv.billTo?.name || '';
          this.buyerPhone = inv.billTo?.phone || '';
          this.buyerAddress = inv.billTo?.address || '';
          this.buyerEmail = inv.billTo?.email || '';
          this.buyerStateCode = inv.billTo?.stateCode || '';
        }
        this.rows = inv.items.length
          ? inv.items.map(i => ({ desc: i.desc, hsn: i.hsn || '', unit: 'Nos', qty: i.qty, rate: i.rate, gstRate: i.gstRate }))
          : [this.blankRow()];
        // Restore the saved discount rather than zeroing it — the discount is
        // now a stored field, so dropping it here would silently reprice the
        // bill on every edit.
        this.discount = inv.discountPercent || 0;
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

  /**
   * Union Territories that levy UTGST rather than SGST. Delhi (07),
   * Puducherry (34) and Jammu & Kashmir (01) have their own legislatures and
   * levy SGST, so they are deliberately absent. Mirrors UT_STATE_CODES in the
   * backend's gstService.
   */
  private static readonly UT_CODES = new Set(['04', '26', '31', '35', '38', '97']);

  /** Label for the state share of an intra-state supply. */
  stateTaxLabel(): string {
    const buyer = String(this.buyerState() || '').padStart(2, '0');
    return !this.isIGST() && BillGeneratorComponent.UT_CODES.has(buyer) ? 'UTGST' : 'SGST';
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

  /** Pre-rounding payable amount. */
  private rawTotal(): number {
    return this.r2(this.subtotal() - this.discountAmount() + this.totalTax());
  }

  /**
   * The whole-rupee round-off the backend applies, mirrored here so the
   * preview shows the same total the saved bill will carry.
   */
  roundOff(): number {
    return this.r2(Math.round(this.rawTotal()) - this.rawTotal());
  }

  total(): number {
    return Math.round(this.rawTotal());
  }

  // ── Save as invoice / bill ────────────────────
  private validItems(): BillRow[] {
    return this.rows.filter(r => r.desc.trim() && (r.qty || 0) > 0 && (r.rate || 0) > 0);
  }

  saveLabel(): string {
    const noun = this.mode() === 'b2b-reg' ? 'Invoice' : 'Bill';
    return this.isEdit() ? `Update ${noun}` : `Save as ${noun}`;
  }

  canSave(): boolean {
    if (this.validItems().length === 0) return false;
    if (this.mode() === 'b2b-reg') return !!this.clientId;
    return !!this.buyerName.trim() && !!this.buyerStateCode;
  }

  save() {
    if (!this.canSave() || this.saving()) return;
    // The discount is sent as its own field. It used to be folded into each
    // item's rate, because the backend had nowhere to store it — which
    // destroyed the gross value, hid the discount from the customer's copy,
    // and left the GST report's taxable value with no record of the original
    // price. The rate now goes out exactly as it was typed.
    const items: InvoiceItem[] = this.validItems().map(r => ({
      desc: r.desc.trim(),
      hsn: r.hsn.trim(),
      qty: r.qty,
      rate: r.rate,
      gstRate: r.gstRate
    }));

    // clientId/billTo are mutually exclusive — always send both (one
    // populated, the other explicitly null) so switching buyer mode on an
    // existing bill/invoice actually converts it instead of leaving stale
    // data from whichever shape was previously saved.
    const isReg = this.mode() === 'b2b-reg';
    const billTo: BillTo | null = isReg ? null : {
      type: this.mode() as 'b2b-unreg' | 'b2c',
      name: this.buyerName.trim(),
      phone: this.buyerPhone.trim(),
      email: this.buyerEmail.trim(),
      address: this.buyerAddress.trim(),
      stateCode: this.buyerStateCode
    };

    const payload = {
      clientId: isReg ? this.clientId : null,
      billTo,
      date: this.billDate,
      dueDate: this.dueDate,
      items,
      discountPercent: Math.min(100, Math.max(0, this.discount || 0)),
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
          this.toast.success(isReg ? 'Invoice created' : 'Bill created');
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
