import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppShellComponent } from '../../shared/app-shell.component';
import { EmptyStateComponent, ModalComponent, PillComponent, SkeletonRowsComponent } from '../../shared/ui';
import { ApiService } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { Item } from '../../core/models';
import { UNITS, fmtINR } from '../../core/format';

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
  status: 'active' | 'inactive';
}

@Component({
  selector: 'app-items',
  standalone: true,
  imports: [CommonModule, FormsModule, AppShellComponent, ModalComponent, EmptyStateComponent, SkeletonRowsComponent, PillComponent],
  template: `
    <app-shell title="Items" [subtitle]="items().length + ' items in your catalog'">
      <button actions class="btn primary" type="button" (click)="openAdd()">+ Add Item</button>

      <div class="toolbar">
        <div class="search-box">
          <span class="search-icon">⌕</span>
          <input class="input" type="text" placeholder="Search name, code, HSN/SAC or category"
            [ngModel]="search()" (ngModelChange)="search.set($event)">
        </div>
      </div>

      <div class="card flush">
        @if (loading()) {
          <app-skeleton-rows [count]="5" />
        } @else if (items().length === 0) {
          <app-empty-state icon="◫" title="No items yet" message="Add your first item so it can be searched onto invoices." />
        } @else if (filtered().length === 0) {
          <app-empty-state icon="⌕" title="No matching items" message="Try a different search term." />
        } @else {
          <div class="table-wrap">
            <table class="table">
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
                @for (it of filtered(); track it._id) {
                  <tr>
                    <td>
                      <div class="strong">{{ it.name }}</div>
                      <div class="muted" style="font-size:11.5px">{{ it.itemCode || '—' }}</div>
                    </td>
                    <td>{{ it.type === 'service' ? 'Service' : 'Goods' }}</td>
                    <td>
                      @if (it.hsn) { <span class="mono">{{ it.hsn }}</span> }
                      @else { <span class="muted">—</span> }
                    </td>
                    <td>{{ it.unit }}</td>
                    <td style="text-align:right;">{{ fmtINR(it.sellingPrice) }}</td>
                    <td>{{ it.gstRate }}%</td>
                    <td style="text-align:right;">{{ it.stockQty ?? 0 }}</td>
                    <td><app-pill [status]="it.status || 'active'" /></td>
                    <td>
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
        }
      </div>

      <!-- Add / Edit modal -->
      <app-modal [open]="modalOpen()" [title]="editing() ? 'Edit Item' : 'Add Item'" [width]="620" (close)="modalOpen.set(false)">
        <form class="form" (ngSubmit)="save()">
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
          <div class="grid grid-3">
            <div class="field">
              <label>Stock Quantity</label>
              <input name="stockQty" type="number" min="0" step="1" [(ngModel)]="form.stockQty">
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
          <div class="grid grid-2">
            <div class="field" style="align-self:end;">
              <label style="display:flex;align-items:center;gap:8px;">
                <input type="checkbox" name="taxInclusive" [(ngModel)]="form.taxInclusive" style="width:auto;">
                Selling price is inclusive of GST
              </label>
            </div>
            <div class="field">
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
export class ItemsComponent implements OnInit {
  loading = signal(true);
  items = signal<Item[]>([]);
  search = signal('');

  modalOpen = signal(false);
  editing = signal<Item | null>(null);
  saving = signal(false);
  submitted = signal(false);

  deleteTarget = signal<Item | null>(null);
  deleting = signal(false);

  form: ItemForm = this.blankForm();

  units = UNITS;
  gstRates = [0, 5, 12, 18, 28];
  fmtINR = fmtINR;

  filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    if (!q) return this.items();
    return this.items().filter(it =>
      (it.name || '').toLowerCase().includes(q) ||
      (it.itemCode || '').toLowerCase().includes(q) ||
      (it.hsn || '').toLowerCase().includes(q) ||
      (it.category || '').toLowerCase().includes(q)
    );
  });

  constructor(private api: ApiService, private toast: ToastService) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.api.items().subscribe({
      next: list => { this.items.set(list); this.loading.set(false); },
      error: err => { this.loading.set(false); this.toast.httpError(err); }
    });
  }

  private blankForm(): ItemForm {
    return {
      itemCode: '', name: '', description: '', type: 'goods', hsn: '', category: '',
      unit: 'Nos', gstRate: 18, cessRate: 0, sellingPrice: 0, mrp: null, purchasePrice: null,
      taxInclusive: false, stockQty: 0, reorderLevel: null, barcode: '', status: 'active'
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
      stockQty: Number(this.form.stockQty) || 0,
      reorderLevel: this.form.reorderLevel != null ? Number(this.form.reorderLevel) : undefined,
      barcode: this.form.barcode.trim(),
      status: this.form.status
    };

    const editing = this.editing();
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
}
