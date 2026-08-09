import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AppShellComponent } from '../../shared/app-shell.component';
import { EmptyStateComponent, ModalComponent, PagerComponent, PillComponent, SkeletonRowsComponent } from '../../shared/ui';
import { ApiService } from '../../core/api.service';
import { ServerList } from '../../core/server-list';
import { ToastService } from '../../core/toast.service';
import { Item, ItemBulkUploadResult } from '../../core/models';
import { UNITS, fmtINR, downloadBlob } from '../../core/format';

interface ItemForm {
  itemCode: string;
  name: string;
  description: string;
  type: 'goods' | 'service';
  hsn: string;
  category: string;
  unit: string;
  gstRate: number;
  cessRate: number;
  sellingPrice: number;
  mrp: number | null;
  purchasePrice: number | null;
  taxInclusive: boolean;
  stockQty: number;
  reorderLevel: number | null;
  barcode: string;
  trackBatches: boolean;
  status: 'active' | 'inactive';
}

@Component({
  selector: 'app-items',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink, AppShellComponent, ModalComponent,
    EmptyStateComponent, SkeletonRowsComponent, PillComponent, PagerComponent
  ],
  template: `
    <app-shell title="Items" [subtitle]="subtitle()">
      <button actions class="btn secondary" type="button" (click)="openBulkUpload()">⇪ Bulk Upload</button>
      <button actions class="btn primary" type="button" (click)="openAdd()">+ Add Item</button>

      <div class="toolbar">
        <div class="search-box">
          <span class="search-icon">⌕</span>
          <input class="input" type="text" placeholder="Search name, code, HSN/SAC or category"
            [ngModel]="list.search()" (ngModelChange)="list.onSearch($event)">
        </div>
      </div>

      <div class="card flush">
        @if (list.loading()) {
          <app-skeleton-rows [count]="5" />
        } @else if (list.failed()) {
          <app-empty-state icon="⚠" title="Could not load items"
            message="Something went wrong fetching this page." />
        } @else if (list.total() === 0 && !list.search()) {
          <app-empty-state icon="◫" title="No items yet" message="Add your first item so it can be searched onto invoices." />
        } @else if (list.rows().length === 0) {
          <app-empty-state icon="⌕" title="No matching items" message="Try a different search term." />
        } @else {
          <div class="table-wrap">
            <table class="table stack-mobile">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Type</th>
                  <th>HSN/SAC</th>
                  <th>Unit</th>
                  <th style="text-align:right;">Rate</th>
                  <th>GST%</th>
                  <th style="text-align:right;">Stock</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (it of list.rows(); track it._id) {
                  <tr>
                    <td data-label="Item">
                      <div class="strong">{{ it.name }}</div>
                      <div class="muted" style="font-size:11.5px">{{ it.itemCode || '—' }}</div>
                    </td>
                    <td data-label="Type">{{ it.type === 'service' ? 'Service' : 'Goods' }}</td>
                    <td data-label="HSN/SAC">
                      @if (it.hsn) { <span class="mono">{{ it.hsn }}</span> }
                      @else { <span class="muted">—</span> }
                    </td>
                    <td data-label="Unit">{{ it.unit }}</td>
                    <td data-label="Rate" style="text-align:right;">{{ fmtINR(it.sellingPrice) }}</td>
                    <td data-label="GST%">{{ it.gstRate }}%</td>
                    <td data-label="Stock" data-priority="high" style="text-align:right;">{{ it.stockQty ?? 0 }}</td>
                    <td data-label="Status" data-priority="high"><app-pill [status]="it.status || 'active'" /></td>
                    <td data-label="">
                      <div class="actions">
                        <button class="btn ghost sm" type="button" (click)="openEdit(it)">Edit</button>
                        <button class="btn danger sm" type="button" (click)="deleteTarget.set(it)">Delete</button>
                      </div>
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

      <!-- Add / Edit modal -->
      <app-modal [open]="modalOpen()" [title]="editing() ? 'Edit Item' : 'Add Item'" [width]="620" (close)="modalOpen.set(false)">
        <form class="form" (ngSubmit)="save()">
          <div class="form-section">
            <div class="form-section-title">Basic Info</div>
            <div class="grid grid-2">
              <div class="field">
                <label>Item Name *</label>
                <input name="name" [(ngModel)]="form.name" placeholder="A4 Copier Paper (500 sheets)"
                  [class.invalid]="submitted() && !form.name.trim()">
                @if (submitted() && !form.name.trim()) { <span class="error">Item name is required.</span> }
              </div>
              <div class="field">
                <label>Item Code / SKU</label>
                <input name="itemCode" class="mono" [(ngModel)]="form.itemCode" placeholder="PAP-A4-500">
              </div>
            </div>
            <div class="field">
              <label>Description</label>
              <input name="description" [(ngModel)]="form.description" placeholder="Optional longer description">
            </div>
          </div>

          <div class="form-section">
            <div class="form-section-title">Classification &amp; Tax</div>
            <div class="grid grid-3">
              <div class="field">
                <label>Type</label>
                <select name="type" [(ngModel)]="form.type">
                  <option value="goods">Goods</option>
                  <option value="service">Service</option>
                </select>
              </div>
              <div class="field">
                <label>{{ form.type === 'service' ? 'SAC Code' : 'HSN Code' }}</label>
                <input name="hsn" class="mono" [(ngModel)]="form.hsn" placeholder="998314">
              </div>
              <div class="field">
                <label>Category</label>
                <input name="category" [(ngModel)]="form.category" placeholder="Stationery">
              </div>
            </div>
            <div class="grid grid-3">
              <div class="field">
                <label>Unit</label>
                <select name="unit" [(ngModel)]="form.unit">
                  @for (u of units; track u) { <option [value]="u">{{ u }}</option> }
                </select>
              </div>
              <div class="field">
                <label>GST Rate</label>
                <select name="gstRate" [(ngModel)]="form.gstRate">
                  @for (r of gstRates; track r) { <option [ngValue]="r">{{ r }}%</option> }
                </select>
              </div>
              <div class="field">
                <label>Cess %</label>
                <input name="cessRate" type="number" min="0" step="0.01" [(ngModel)]="form.cessRate">
              </div>
            </div>
          </div>

          <div class="form-section">
            <div class="form-section-title">Pricing</div>
            <div class="grid grid-3">
              <div class="field">
                <label>Selling Price *</label>
                <input name="sellingPrice" type="number" min="0" step="0.01" [(ngModel)]="form.sellingPrice"
                  [class.invalid]="submitted() && !(form.sellingPrice > 0)">
                @if (submitted() && !(form.sellingPrice > 0)) { <span class="error">Enter a selling price greater than 0.</span> }
              </div>
              <div class="field">
                <label>MRP</label>
                <input name="mrp" type="number" min="0" step="0.01" [(ngModel)]="form.mrp">
              </div>
              <div class="field">
                <label>Purchase Price</label>
                <input name="purchasePrice" type="number" min="0" step="0.01" [(ngModel)]="form.purchasePrice">
              </div>
            </div>
            <label class="checkbox">
              <input type="checkbox" name="taxInclusive" [(ngModel)]="form.taxInclusive">
              Selling price is inclusive of GST
            </label>
          </div>

          <div class="form-section">
            <div class="form-section-title">Inventory &amp; Status</div>
            <div class="grid grid-3">
              <div class="field">
                <label>{{ editing() ? 'Stock in hand' : 'Opening stock' }}</label>
                @if (editing()) {
                  <!--
                    Read-only once the item exists. Stock is a ledger balance now:
                    every change is a row with a reason behind it, and a hand-edit
                    here is exactly what made the old number impossible to explain.
                    The server refuses it outright (STOCK_NOT_EDITABLE).
                  -->
                  <input [value]="editing()!.stockQty ?? 0" disabled>
                } @else {
                  <input name="stockQty" type="number" min="0" step="1" [(ngModel)]="form.stockQty">
                }
              </div>
              <div class="field">
                <label>Reorder Level</label>
                <input name="reorderLevel" type="number" min="0" step="1" [(ngModel)]="form.reorderLevel">
              </div>
              <div class="field">
                <label>Barcode</label>
                <input name="barcode" class="mono" [(ngModel)]="form.barcode" placeholder="Optional">
              </div>
            </div>
            @if (editing()) {
              <p style="margin:2px 0 0;font-size:12px;color:var(--muted);line-height:1.6">
                To change the stock in hand, post an adjustment from
                <a routerLink="/inventory" style="color:var(--brand);font-weight:600">Inventory</a> —
                it records who changed it, by how much and why.
              </p>
            } @else {
              <p style="margin:2px 0 0;font-size:12px;color:var(--muted);line-height:1.6">
                Recorded as an opening balance in the stock ledger, valued at the purchase price above.
              </p>
            }
            <label class="checkbox" style="margin-top:10px">
              <input type="checkbox" name="trackBatches" [(ngModel)]="form.trackBatches">
              Track batch numbers and expiry dates for this item
            </label>
            <div class="field" style="max-width:200px;">
              <label>Status</label>
              <select name="status" [(ngModel)]="form.status">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div class="modal-foot">
            <button class="btn ghost" type="button" (click)="modalOpen.set(false)">Cancel</button>
            <button class="btn primary" type="submit" [disabled]="saving()">
              {{ saving() ? 'Saving…' : (editing() ? 'Save Changes' : 'Add Item') }}
            </button>
          </div>
        </form>
      </app-modal>

      <!-- Bulk upload modal -->
      <app-modal [open]="bulkModalOpen()" title="Bulk Upload Items" [width]="640" (close)="closeBulkModal()">
        <div class="bulk-upload">
          <ol class="bulk-steps">
            <li>
              <div>Download the template and fill in one row per item. Keep the header row as provided — required fields are marked with <strong>*</strong>.</div>
              <button class="btn secondary sm" type="button" [disabled]="downloadingTemplate()" (click)="downloadTemplate()">
                {{ downloadingTemplate() ? 'Preparing…' : '⬇ Download Excel Template' }}
              </button>
            </li>
            <li>
              <div>Choose the filled-in <span class="mono">.xlsx</span> file and upload it. Each row is validated on its own — valid rows are added to your catalog, and any row with an error is listed below so you can fix and re-upload just that one.</div>
              <div class="file-picker">
                <input #fileInput type="file" accept=".xlsx" style="display:none" (change)="onFileSelected($event)">
                <button class="btn secondary sm" type="button" (click)="fileInput.click()">Choose File</button>
                <span class="muted file-name" style="font-size:12.5px;">{{ selectedFile()?.name || 'No file chosen' }}</span>
              </div>
            </li>
          </ol>

          @if (uploadError()) {
            <div class="info-box danger">{{ uploadError() }}</div>
          }

          @if (uploadResult(); as result) {
            <div class="info-box" [class.ok]="result.failed.length === 0" [class.warn]="result.failed.length > 0 && result.created > 0" [class.danger]="result.created === 0 && result.failed.length > 0">
              <strong>{{ result.created }}</strong> of {{ result.totalRows }} item(s) added to your catalog.
              @if (result.failed.length > 0) {
                {{ result.failed.length }} row(s) had errors — see below.
              }
            </div>
            @if (result.failed.length > 0) {
              <div class="table-wrap upload-errors">
                <table class="table stack-mobile">
                  <thead><tr><th>Row</th><th>Item</th><th>Errors</th></tr></thead>
                  <tbody>
                    @for (f of result.failed; track f.row) {
                      <tr>
                        <td data-label="Row">{{ f.row }}</td>
                        <td data-label="Item">{{ f.name || f.itemCode || '—' }}</td>
                        <td data-label="Errors">
                          <ul class="err-list">
                            @for (e of f.errors; track e) { <li>{{ e }}</li> }
                          </ul>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          }

          <div class="modal-foot">
            <button class="btn ghost" type="button" (click)="closeBulkModal()">Close</button>
            <button class="btn primary" type="button" [disabled]="!selectedFile() || uploading()" (click)="uploadFile()">
              {{ uploading() ? 'Uploading…' : 'Upload & Add Items' }}
            </button>
          </div>
        </div>
      </app-modal>

      <!-- Delete confirm modal -->
      <app-modal [open]="!!deleteTarget()" title="Delete Item" [width]="420" (close)="deleteTarget.set(null)">
        <p style="margin:0 0 8px;font-size:13.5px">
          Delete <strong>{{ deleteTarget()?.name }}</strong>?
        </p>
        <p style="margin:0;font-size:12.5px;color:var(--muted)">
          Invoices already raised using this item keep their own copy of the description, rate and tax — only this catalog entry is removed.
        </p>
        <div class="modal-foot">
          <button class="btn ghost" type="button" (click)="deleteTarget.set(null)">Cancel</button>
          <button class="btn danger solid" type="button" [disabled]="deleting()" (click)="confirmDelete()">
            {{ deleting() ? 'Deleting…' : 'Delete Item' }}
          </button>
        </div>
      </app-modal>
    </app-shell>
  `
})
export class ItemsComponent implements OnInit, OnDestroy {
  /** Server-paginated and server-searched — the catalogue is no longer downloaded
   *  in full just so the browser can filter it. */
  list = new ServerList<Item>(params => this.api.items(params));

  modalOpen = signal(false);
  editing = signal<Item | null>(null);
  saving = signal(false);
  submitted = signal(false);

  deleteTarget = signal<Item | null>(null);
  deleting = signal(false);

  bulkModalOpen = signal(false);
  downloadingTemplate = signal(false);
  selectedFile = signal<File | null>(null);
  uploading = signal(false);
  uploadError = signal('');
  uploadResult = signal<ItemBulkUploadResult | null>(null);

  form: ItemForm = this.blankForm();

  units = UNITS;
  gstRates = [0, 5, 12, 18, 28];
  fmtINR = fmtINR;

  constructor(private api: ApiService, private toast: ToastService) {}

  subtitle() {
    const total = this.list.total();
    if (this.list.search()) return `${total} matching ${total === 1 ? 'item' : 'items'}`;
    return `${total} ${total === 1 ? 'item' : 'items'} in your catalog`;
  }

  ngOnInit() { this.list.load(); }
  ngOnDestroy() { this.list.dispose(); }

  load() { this.list.refresh(); }

  private blankForm(): ItemForm {
    return {
      itemCode: '', name: '', description: '', type: 'goods', hsn: '', category: '',
      unit: 'Nos', gstRate: 18, cessRate: 0, sellingPrice: 0, mrp: null, purchasePrice: null,
      taxInclusive: false, stockQty: 0, reorderLevel: null, barcode: '',
      trackBatches: false, status: 'active'
    };
  }

  openAdd() {
    this.editing.set(null);
    this.form = this.blankForm();
    this.submitted.set(false);
    this.modalOpen.set(true);
  }

  openEdit(it: Item) {
    this.editing.set(it);
    this.form = {
      itemCode: it.itemCode || '',
      name: it.name || '',
      description: it.description || '',
      type: it.type || 'goods',
      hsn: it.hsn || '',
      category: it.category || '',
      unit: it.unit || 'Nos',
      gstRate: it.gstRate ?? 18,
      cessRate: it.cessRate ?? 0,
      sellingPrice: it.sellingPrice ?? 0,
      mrp: it.mrp ?? null,
      purchasePrice: it.purchasePrice ?? null,
      taxInclusive: !!it.taxInclusive,
      stockQty: it.stockQty ?? 0,
      reorderLevel: it.reorderLevel ?? null,
      barcode: it.barcode || '',
      trackBatches: !!it.trackBatches,
      status: it.status || 'active'
    };
    this.submitted.set(false);
    this.modalOpen.set(true);
  }

  save() {
    this.submitted.set(true);
    if (!this.form.name.trim() || !(this.form.sellingPrice > 0)) return;

    const payload: Partial<Item> = {
      itemCode: this.form.itemCode.trim(),
      name: this.form.name.trim(),
      description: this.form.description.trim(),
      type: this.form.type,
      hsn: this.form.hsn.trim(),
      category: this.form.category.trim(),
      unit: this.form.unit,
      gstRate: Number(this.form.gstRate),
      cessRate: Number(this.form.cessRate) || 0,
      sellingPrice: Number(this.form.sellingPrice),
      mrp: this.form.mrp != null ? Number(this.form.mrp) : undefined,
      purchasePrice: this.form.purchasePrice != null ? Number(this.form.purchasePrice) : undefined,
      taxInclusive: this.form.taxInclusive,
      reorderLevel: this.form.reorderLevel != null ? Number(this.form.reorderLevel) : undefined,
      barcode: this.form.barcode.trim(),
      trackBatches: this.form.trackBatches,
      status: this.form.status
    };

    const editing = this.editing();
    // Only ever sent on create, where it becomes an opening ledger row. Sending
    // it on an update is refused by the server, and rightly — there is no honest
    // movement to post for "somebody typed a different number".
    if (!editing) payload.stockQty = Number(this.form.stockQty) || 0;
    this.saving.set(true);
    const req = editing ? this.api.updateItem(editing._id, payload) : this.api.createItem(payload);
    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.modalOpen.set(false);
        this.toast.success(editing ? 'Item updated' : 'Item added');
        this.load();
      },
      error: err => { this.saving.set(false); this.toast.httpError(err); }
    });
  }

  confirmDelete() {
    const target = this.deleteTarget();
    if (!target) return;
    this.deleting.set(true);
    this.api.deleteItem(target._id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.deleteTarget.set(null);
        this.toast.success('Item deleted');
        this.load();
      },
      error: err => { this.deleting.set(false); this.toast.httpError(err); }
    });
  }

  openBulkUpload() {
    this.selectedFile.set(null);
    this.uploadError.set('');
    this.uploadResult.set(null);
    this.bulkModalOpen.set(true);
  }

  closeBulkModal() {
    this.bulkModalOpen.set(false);
  }

  downloadTemplate() {
    this.downloadingTemplate.set(true);
    this.api.downloadItemsTemplate().subscribe({
      next: blob => { this.downloadingTemplate.set(false); downloadBlob(blob, 'klogubizz-items-template.xlsx'); },
      error: err => { this.downloadingTemplate.set(false); this.toast.httpError(err, 'Could not download the template.'); }
    });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    this.uploadError.set('');
    this.uploadResult.set(null);
    if (file && !file.name.toLowerCase().endsWith('.xlsx')) {
      this.uploadError.set('Please choose a .xlsx file — the format used by the template.');
      this.selectedFile.set(null);
      input.value = '';
      return;
    }
    this.selectedFile.set(file);
  }

  uploadFile() {
    const file = this.selectedFile();
    if (!file) return;
    this.uploading.set(true);
    this.uploadError.set('');
    this.uploadResult.set(null);
    this.api.bulkUploadItems(file).subscribe({
      next: result => {
        this.uploading.set(false);
        this.uploadResult.set(result);
        this.selectedFile.set(null);
        if (result.created > 0) {
          const suffix = result.failed.length ? `, ${result.failed.length} row(s) skipped` : '';
          this.toast.success(`${result.created} item(s) added${suffix}.`);
          this.load();
        } else if (result.failed.length > 0) {
          this.toast.error('No items were added — fix the errors below and re-upload.');
        }
      },
      error: err => { this.uploading.set(false); this.uploadError.set((err?.error?.message) || 'Upload failed. Please try again.'); }
    });
  }
}
