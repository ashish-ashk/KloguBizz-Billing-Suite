import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppShellComponent } from '../../shared/app-shell.component';
import { IconComponent } from '../../shared/icons';
import {
  EmptyStateComponent, ModalComponent, PagerComponent, PillComponent, SkeletonRowsComponent, OverflowMenuComponent
} from '../../shared/ui';
import { ApiService } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { ServerList } from '../../core/server-list';
import { InvoiceItem, ItcCategory, Purchase, Vendor } from '../../core/models';
import { downloadBlob, fmtINR, fmtDate, isValidGSTIN, STATES, stateName, today } from '../../core/format';

type Tab = 'purchases' | 'vendors';

const ITC_CATEGORIES: Array<{ value: ItcCategory; label: string; hint: string }> = [
  { value: 'inputs', label: 'Inputs', hint: 'Goods consumed in the business' },
  { value: 'capital-goods', label: 'Capital goods', hint: 'Reported on its own line in GSTR-3B' },
  { value: 'input-services', label: 'Input services', hint: 'Also its own line in the return' },
  { value: 'ineligible', label: 'Ineligible', hint: 'Tax paid, no credit arises' },
  { value: 'blocked', label: 'Blocked — s.17(5)', hint: 'Motor cars, club fees, personal use' }
];

/**
 * Purchases and vendors — the inward ledger.
 *
 * The half of a GST product that did not exist. Without purchases there is no input tax
 * credit, so the only figure the app could produce was output tax, which is not a
 * liability. This page is what makes GSTR-3B computable.
 *
 * The ITC category is a required decision rather than a default, because "can I claim
 * this" genuinely has more than two answers and the return asks for them separately —
 * and because a blocked credit that is silently claimed is the error an audit finds.
 */
@Component({
  selector: 'app-purchases',
  standalone: true,
  imports: [
    CommonModule, FormsModule, AppShellComponent, IconComponent,
    EmptyStateComponent, ModalComponent, PagerComponent, PillComponent, SkeletonRowsComponent, OverflowMenuComponent
  ],
  template: `
    <app-shell title="Purchases" subtitle="Supplier bills and the input tax credit they carry">
      <button actions class="btn secondary" type="button" (click)="openVendor()">+ Vendor</button>
      <button actions class="btn primary" type="button" (click)="openPurchase()">+ Purchase</button>
      <button actions class="btn ghost" type="button" [disabled]="exporting()" (click)="exportCsv()">
        @if (exporting()) { <span class="spinner"></span> } <app-icon name="download" [size]="14" /> Export
      </button>

      <div class="toolbar">
        <div class="tabs">
          <button type="button" [class.active]="tab() === 'purchases'" (click)="tab.set('purchases')">Purchases ({{ purchases.total() }})</button>
          <button type="button" [class.active]="tab() === 'vendors'" (click)="onVendorsTab()">Vendors ({{ vendors.total() }})</button>
        </div>
        <div class="search-box">
          <span class="search-icon">⌕</span>
          @if (tab() === 'purchases') {
            <input class="input" placeholder="Search bill number" [ngModel]="purchases.search()" (ngModelChange)="purchases.onSearch($event)">
          } @else {
            <input class="input" placeholder="Search name or GSTIN" [ngModel]="vendors.search()" (ngModelChange)="vendors.onSearch($event)">
          }
        </div>
      </div>

      @if (tab() === 'purchases') {
        <div class="card flush">
          @if (purchases.loading()) {
            <app-skeleton-rows [count]="5" />
          } @else if (!purchases.rows().length) {
            <app-empty-state icon="◨" title="No purchases recorded"
              message="Record your supplier bills to claim input tax credit and compute your net GST liability." />
          } @else {
            <div class="table-wrap">
              <table class="table stack-mobile">
                <thead>
                  <tr><th>Bill</th><th>Vendor</th><th>Date</th><th class="num">Total</th><th class="num">ITC</th><th>Status</th><th style="text-align:right">Actions</th></tr>
                </thead>
                <tbody>
                  @for (p of purchases.rows(); track p._id) {
                    <tr>
                      <td class="num" data-label="Bill">
                        {{ p.billNumber }}
                        @if (p.reverseCharge) { <span class="pill warning" style="margin-left:6px">RCM</span> }
                      </td>
                      <td data-label="Vendor">
                        <div class="strong">{{ p.vendorSnapshot?.name || vendorName(p) }}</div>
                        <div class="muted mono" style="font-size:11px">{{ p.vendorSnapshot?.gstin || 'Unregistered' }}</div>
                      </td>
                      <td class="muted" data-label="Date">{{ fmtDate(p.billDate) }}</td>
                      <td class="num strong" data-label="Total">{{ fmtINR(p.totals.total) }}</td>
                      <td class="num" data-label="ITC">
                        @if (p.itc.eligible) {
                          {{ fmtINR(itcTotal(p)) }}
                        } @else {
                          <span class="muted" [title]="p.itc.note || ''">Not claimable</span>
                        }
                      </td>
                      <td data-label="Status"><app-pill [status]="p.status" /></td>
                      <td data-label="">
                        <div class="actions">
                          @if (p.balanceDue && p.balanceDue > 0) {
                            <button class="btn ghost sm" type="button" (click)="openPay(p)">Pay</button>
                          }
                          <button class="btn secondary sm" type="button" (click)="openPurchase(p)">Edit</button>
                          <app-overflow-menu>
                            <button class="btn danger sm" type="button" (click)="removePurchase(p)"><app-icon name="trash" [size]="13" /> Delete</button>
                          </app-overflow-menu>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <app-pager [page]="purchases.page()" [pageSize]="purchases.pageSize()" [total]="purchases.total()"
              (pageChange)="purchases.onPage($event)" (pageSizeChange)="purchases.onPageSize($event)" />
          }
        </div>
      }

      @if (tab() === 'vendors') {
        <div class="card flush">
          @if (vendors.loading()) {
            <app-skeleton-rows [count]="5" />
          } @else if (!vendors.rows().length) {
            <app-empty-state icon="◫" title="No vendors yet" message="Add your suppliers to start recording purchases." />
          } @else {
            <div class="table-wrap">
              <table class="table stack-mobile">
                <thead><tr><th>Vendor</th><th>GSTIN</th><th>State</th><th>Type</th><th style="text-align:right">Actions</th></tr></thead>
                <tbody>
                  @for (v of vendors.rows(); track v._id) {
                    <tr>
                      <td data-label="Vendor">
                        <div class="strong">{{ v.name }}</div>
                        <div class="muted" style="font-size:11px">{{ v.email || v.phone || '' }}</div>
                      </td>
                      <td class="mono" data-label="GSTIN" style="font-size:11px">{{ v.gstin || '—' }}</td>
                      <td data-label="State">{{ v.state || stateName(v.stateCode) }}</td>
                      <td data-label="Type"><span class="pill">{{ v.registrationType || 'regular' }}</span></td>
                      <td data-label="">
                        <div class="actions">
                          <button class="btn secondary sm" type="button" (click)="openVendor(v)">Edit</button>
                          <app-overflow-menu>
                            <button class="btn danger sm" type="button" (click)="removeVendor(v)"><app-icon name="trash" [size]="13" /> Archive</button>
                          </app-overflow-menu>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <app-pager [page]="vendors.page()" [pageSize]="vendors.pageSize()" [total]="vendors.total()"
              (pageChange)="vendors.onPage($event)" (pageSizeChange)="vendors.onPageSize($event)" />
          }
        </div>
      }

      <!-- Vendor form -->
      <app-modal [open]="showVendor()" [title]="vendorId ? 'Edit Vendor' : 'Add Vendor'" [width]="560" (close)="showVendor.set(false)">
        <div class="grid grid-2">
          <div class="field">
            <label>Name *</label>
            <input [(ngModel)]="vendorForm.name" placeholder="Supplier Pvt Ltd">
          </div>
          <div class="field">
            <label>GSTIN</label>
            <input class="mono" [(ngModel)]="vendorForm.gstin" placeholder="Leave blank if unregistered">
            @if (vendorForm.gstin && !isValidGSTIN(vendorForm.gstin)) { <div class="error">Check the GSTIN — the last character is a checksum</div> }
          </div>
        </div>
        <div class="grid grid-2">
          <div class="field">
            <label>State *</label>
            <select [(ngModel)]="vendorForm.stateCode">
              @for (s of states; track s.code) { <option [value]="s.code">{{ s.name }} ({{ s.code }})</option> }
            </select>
          </div>
          <div class="field">
            <label>Registration</label>
            <select [(ngModel)]="vendorForm.registrationType">
              <option value="regular">Regular</option>
              <option value="composition">Composition</option>
              <option value="unregistered">Unregistered</option>
              <option value="overseas">Overseas</option>
              <option value="sez">SEZ</option>
            </select>
          </div>
        </div>
        <div class="grid grid-2">
          <div class="field"><label>Email</label><input type="email" [(ngModel)]="vendorForm.email"></div>
          <div class="field"><label>Phone</label><input [(ngModel)]="vendorForm.phone"></div>
        </div>
        <div class="field"><label>Address</label><input [(ngModel)]="vendorForm.address"></div>
        <div class="modal-foot">
          <button class="btn ghost" type="button" (click)="showVendor.set(false)">Cancel</button>
          <button class="btn primary" type="button" [disabled]="saving() || !vendorForm.name.trim()" (click)="saveVendor()">
            @if (saving()) { <span class="spinner"></span> } Save Vendor
          </button>
        </div>
      </app-modal>

      <!-- Purchase form -->
      <app-modal [open]="showPurchase()" [title]="purchaseId ? 'Edit Purchase' : 'Record Purchase'" [width]="720" (close)="showPurchase.set(false)">
        <div class="form-section">
          <div class="form-section-title">The supplier's bill</div>
          <div class="grid grid-2">
            <div class="field">
              <label>Vendor *</label>
              <select [(ngModel)]="purchaseForm.vendorId">
                <option value="">Select a vendor</option>
                @for (v of vendors.rows(); track v._id) { <option [value]="v._id">{{ v.name }}</option> }
              </select>
            </div>
            <div class="field">
              <label>Their bill number *</label>
              <input [(ngModel)]="purchaseForm.billNumber" placeholder="INV/2026/0042">
              <!-- Says whose number it is, because the instinct is to expect ours. -->
              <div class="card-sub" style="margin-top:4px">As printed on their invoice — this is what GSTR-2B matches on</div>
            </div>
          </div>
          <div class="grid grid-2">
            <div class="field"><label>Bill date *</label><input type="date" [(ngModel)]="purchaseForm.billDate"></div>
            <div class="field"><label>Due date</label><input type="date" [(ngModel)]="purchaseForm.dueDate"></div>
          </div>
        </div>

        <div class="form-section">
          <div class="form-section-title">Line items</div>
          @for (item of purchaseForm.items; track $index) {
            <div class="grid" style="grid-template-columns:2fr 1fr 0.7fr 1fr 0.8fr auto;gap:8px;align-items:end;margin-bottom:8px">
              <div class="field" style="margin:0"><label>Description</label><input [(ngModel)]="item.desc"></div>
              <div class="field" style="margin:0"><label>HSN/SAC</label><input class="mono" [(ngModel)]="item.hsn"></div>
              <div class="field" style="margin:0"><label>Qty</label><input type="number" min="0" [(ngModel)]="item.qty"></div>
              <div class="field" style="margin:0"><label>Rate</label><input type="number" min="0" [(ngModel)]="item.rate"></div>
              <div class="field" style="margin:0">
                <label>GST %</label>
                <select [(ngModel)]="item.gstRate">
                  @for (rate of gstRates; track rate) { <option [value]="rate">{{ rate }}%</option> }
                </select>
              </div>
              <button class="btn ghost sm" type="button" [disabled]="purchaseForm.items.length === 1" (click)="removeLine($index)">
                <app-icon name="trash" [size]="13" />
              </button>
            </div>
          }
          <button class="btn secondary sm" type="button" (click)="addLine()">+ Add line</button>
        </div>

        <div class="form-section">
          <div class="form-section-title">GST treatment</div>
          <div class="grid grid-2">
            <div class="field">
              <label>Supply type</label>
              <select [(ngModel)]="purchaseForm.supplyType">
                <option value="regular">Regular</option>
                <option value="import-goods">Import of goods</option>
                <option value="import-services">Import of services</option>
                <option value="sez">From an SEZ</option>
                <option value="deemed-export">Deemed export</option>
              </select>
            </div>
            <div class="field">
              <label>Place of supply</label>
              <select [(ngModel)]="purchaseForm.placeOfSupply">
                <option value="">Our registered state</option>
                @for (s of states; track s.code) { <option [value]="s.code">{{ s.name }} ({{ s.code }})</option> }
              </select>
            </div>
          </div>
          <label style="display:flex;align-items:flex-start;gap:9px;cursor:pointer;margin-bottom:12px">
            <input type="checkbox" [(ngModel)]="purchaseForm.reverseCharge" style="margin-top:3px">
            <span>
              <span style="font-weight:600;font-size:12.5px">Reverse charge applies</span>
              <div class="muted" style="font-size:11px;line-height:1.5">
                The supplier charges no tax; you pay it directly and claim it back. Common for
                unregistered suppliers, freight and legal services.
              </div>
            </span>
          </label>
          <div class="grid grid-2">
            <div class="field">
              <label>Input tax credit</label>
              <select [(ngModel)]="purchaseForm.itcCategory">
                @for (c of itcCategories; track c.value) { <option [value]="c.value">{{ c.label }}</option> }
              </select>
              <div class="card-sub" style="margin-top:4px">{{ itcHint() }}</div>
            </div>
            <div class="field">
              <label>Note</label>
              <input [(ngModel)]="purchaseForm.itcNote" placeholder="Why the credit is limited, if it is">
            </div>
          </div>
        </div>

        <div class="modal-foot">
          <button class="btn ghost" type="button" (click)="showPurchase.set(false)">Cancel</button>
          <button class="btn primary" type="button" [disabled]="saving() || !canSavePurchase()" (click)="savePurchase()">
            @if (saving()) { <span class="spinner"></span> } Save Purchase
          </button>
        </div>
      </app-modal>

      <!-- Payment -->
      <app-modal [open]="!!payTarget()" title="Record Payment" (close)="payTarget.set(null)">
        @if (payTarget(); as p) {
          <p style="margin:0 0 12px">
            Paying <strong>{{ p.vendorSnapshot?.name }}</strong> against bill {{ p.billNumber }}.
            Outstanding: <strong>{{ fmtINR(p.balanceDue) }}</strong>.
          </p>
          <div class="field">
            <label>Amount</label>
            <input type="number" min="0" [(ngModel)]="payAmount">
          </div>
          <div class="modal-foot">
            <button class="btn ghost" type="button" (click)="payTarget.set(null)">Cancel</button>
            <button class="btn primary" type="button" [disabled]="saving() || !(payAmount > 0)" (click)="confirmPay()">Record</button>
          </div>
        }
      </app-modal>
    </app-shell>
  `
})
export class PurchasesComponent implements OnInit, OnDestroy {
  tab = signal<Tab>('purchases');
  saving = signal(false);
  exporting = signal(false);

  purchases = new ServerList<Purchase>(params => this.api.purchases(params));
  vendors = new ServerList<Vendor>(params => this.api.vendors(params));

  showVendor = signal(false);
  showPurchase = signal(false);
  payTarget = signal<Purchase | null>(null);
  payAmount = 0;

  vendorId = '';
  purchaseId = '';

  vendorForm = this.blankVendor();
  purchaseForm = this.blankPurchase();

  states = STATES;
  gstRates = [0, 0.25, 3, 5, 12, 18, 28];
  itcCategories = ITC_CATEGORIES;
  fmtINR = fmtINR;
  fmtDate = fmtDate;
  isValidGSTIN = isValidGSTIN;
  stateName = stateName;

  constructor(private api: ApiService, private toast: ToastService) {}

  ngOnInit() {
    this.purchases.refresh();
    // Vendors are loaded up front too: the purchase form needs the list to populate its
    // picker, and an empty picker on a fresh page is indistinguishable from having none.
    this.vendors.refresh();
  }

  ngOnDestroy() {
    this.purchases.dispose();
    this.vendors.dispose();
  }

  onVendorsTab() {
    this.tab.set('vendors');
    if (!this.vendors.rows().length) this.vendors.refresh();
  }

  vendorName(purchase: Purchase): string {
    const vendor = purchase.vendorId;
    return vendor && typeof vendor === 'object' ? vendor.name : '—';
  }

  itcTotal(purchase: Purchase): number {
    const itc = purchase.itc || { cgst: 0, sgst: 0, igst: 0, cess: 0 };
    return (itc.cgst || 0) + (itc.sgst || 0) + (itc.igst || 0) + (itc.cess || 0);
  }

  itcHint(): string {
    return ITC_CATEGORIES.find(c => c.value === this.purchaseForm.itcCategory)?.hint || '';
  }

  private blankVendor() {
    return {
      name: '', gstin: '', email: '', phone: '', address: '',
      stateCode: '27', registrationType: 'regular' as Vendor['registrationType']
    };
  }

  private blankPurchase() {
    return {
      vendorId: '',
      billNumber: '',
      billDate: today(),
      dueDate: '',
      items: [{ desc: '', hsn: '', qty: 1, rate: 0, gstRate: 18 }] as InvoiceItem[],
      placeOfSupply: '',
      supplyType: 'regular',
      reverseCharge: false,
      itcCategory: 'inputs' as ItcCategory,
      itcNote: ''
    };
  }

  openVendor(vendor?: Vendor) {
    this.vendorId = vendor?._id || '';
    this.vendorForm = vendor
      ? {
        name: vendor.name,
        gstin: vendor.gstin || '',
        email: vendor.email || '',
        phone: vendor.phone || '',
        address: vendor.address || '',
        stateCode: vendor.stateCode,
        registrationType: vendor.registrationType || 'regular'
      }
      : this.blankVendor();
    this.showVendor.set(true);
  }

  saveVendor() {
    this.saving.set(true);
    const payload = {
      ...this.vendorForm,
      name: this.vendorForm.name.trim(),
      gstin: this.vendorForm.gstin.trim().toUpperCase(),
      state: stateName(this.vendorForm.stateCode)
    };
    const request = this.vendorId
      ? this.api.updateVendor(this.vendorId, payload)
      : this.api.createVendor(payload);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.showVendor.set(false);
        this.toast.success(this.vendorId ? 'Vendor updated' : 'Vendor added');
        this.vendors.refresh();
      },
      error: err => { this.saving.set(false); this.toast.httpError(err); }
    });
  }

  removeVendor(vendor: Vendor) {
    this.saving.set(true);
    this.api.deleteVendor(vendor._id).subscribe({
      next: res => { this.saving.set(false); this.toast.info(res.message); this.vendors.refresh(); },
      error: err => { this.saving.set(false); this.toast.httpError(err); }
    });
  }

  openPurchase(purchase?: Purchase) {
    this.purchaseId = purchase?._id || '';
    if (purchase) {
      const vendor = purchase.vendorId;
      this.purchaseForm = {
        vendorId: vendor && typeof vendor === 'object' ? vendor._id : String(vendor || ''),
        billNumber: purchase.billNumber,
        billDate: String(purchase.billDate).slice(0, 10),
        dueDate: purchase.dueDate ? String(purchase.dueDate).slice(0, 10) : '',
        items: purchase.items.map(item => ({ ...item })),
        placeOfSupply: purchase.placeOfSupply || '',
        supplyType: purchase.supplyType || 'regular',
        reverseCharge: !!purchase.reverseCharge,
        itcCategory: purchase.itc?.category || 'inputs',
        itcNote: purchase.itc?.note || ''
      };
    } else {
      this.purchaseForm = this.blankPurchase();
    }
    this.showPurchase.set(true);
  }

  addLine() {
    this.purchaseForm.items.push({ desc: '', hsn: '', qty: 1, rate: 0, gstRate: 18 });
  }

  removeLine(index: number) {
    if (this.purchaseForm.items.length > 1) this.purchaseForm.items.splice(index, 1);
  }

  canSavePurchase(): boolean {
    const form = this.purchaseForm;
    return !!form.vendorId
      && !!form.billNumber.trim()
      && !!form.billDate
      && form.items.some(item => item.desc?.trim() && Number(item.rate) > 0);
  }

  savePurchase() {
    if (!this.canSavePurchase()) return;
    this.saving.set(true);
    const form = this.purchaseForm;
    const payload = {
      vendorId: form.vendorId,
      billNumber: form.billNumber.trim(),
      billDate: form.billDate,
      dueDate: form.dueDate || undefined,
      // Blank lines are dropped rather than rejected: a half-filled extra row is a
      // consequence of the "+ Add line" button, not a mistake worth an error toast.
      items: form.items
        .filter(item => item.desc?.trim() && Number(item.rate) > 0)
        .map(item => ({ ...item, qty: Number(item.qty), rate: Number(item.rate), gstRate: Number(item.gstRate) })),
      placeOfSupply: form.placeOfSupply || undefined,
      supplyType: form.supplyType,
      reverseCharge: form.reverseCharge,
      itcCategory: form.itcCategory,
      itcNote: form.itcNote
    };
    const request = this.purchaseId
      ? this.api.updatePurchase(this.purchaseId, payload)
      : this.api.createPurchase(payload);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.showPurchase.set(false);
        this.toast.success(this.purchaseId ? 'Purchase updated' : 'Purchase recorded');
        this.purchases.refresh();
      },
      error: err => { this.saving.set(false); this.toast.httpError(err); }
    });
  }

  removePurchase(purchase: Purchase) {
    this.saving.set(true);
    this.api.deletePurchase(purchase._id).subscribe({
      next: res => { this.saving.set(false); this.toast.info(res.message); this.purchases.refresh(); },
      error: err => { this.saving.set(false); this.toast.httpError(err); }
    });
  }

  openPay(purchase: Purchase) {
    this.payTarget.set(purchase);
    this.payAmount = purchase.balanceDue || 0;
  }

  confirmPay() {
    const purchase = this.payTarget();
    if (!purchase) return;
    this.saving.set(true);
    this.api.payPurchase(purchase._id, Number(this.payAmount)).subscribe({
      next: () => {
        this.saving.set(false);
        this.payTarget.set(null);
        this.toast.success('Payment recorded');
        this.purchases.refresh();
      },
      error: err => { this.saving.set(false); this.toast.httpError(err); }
    });
  }

  exportCsv() {
    this.exporting.set(true);
    this.api.exportPurchasesCsv().subscribe({
      next: blob => { this.exporting.set(false); downloadBlob(blob, 'purchases.csv'); },
      error: err => { this.exporting.set(false); this.toast.httpError(err); }
    });
  }
}
