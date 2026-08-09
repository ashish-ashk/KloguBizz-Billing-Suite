import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AppShellComponent } from '../../shared/app-shell.component';
import { IconComponent } from '../../shared/icons';
import { EmptyStateComponent, ModalComponent, PagerComponent, SkeletonRowsComponent } from '../../shared/ui';
import { ApiService } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { ServerList } from '../../core/server-list';
import {
  ExpiringStockReport, Item, LowStockReport, StockLayerRow, StockMovement, StockValuationReport
} from '../../core/models';
import { fmtDate, fmtINR } from '../../core/format';

type Tab = 'valuation' | 'ledger' | 'low' | 'expiring';

const REASON_LABELS: Record<string, string> = {
  sale: 'Sold',
  'sale-reversed': 'Invoice cancelled',
  purchase: 'Purchased',
  'purchase-reversed': 'Purchase deleted',
  opening: 'Opening balance',
  adjustment: 'Adjustment',
  damage: 'Damage / write-off',
  return: 'Customer return'
};

/**
 * Inventory — the stock ledger, what it is worth, and what needs attention.
 *
 * This page exists because **none of it was reachable**. The ledger, the
 * low-stock report and the adjustment endpoint had all been built, tested and
 * wired into `ApiService`, and not one component called them: the entire
 * inventory feature was server-side only, and the app showed a stock number in a
 * table with no way to see why it was what it was. Valuation, cost layers and
 * expiring batches then landed behind the same closed door.
 *
 * Four tabs, because they answer four different questions a person actually
 * arrives with:
 *
 *   - **Valuation** — what is my stock worth, and does it reconcile?
 *   - **Ledger** — why is this number what it is?
 *   - **Low stock** — what do I need to reorder?
 *   - **Expiring** — what am I about to lose?
 *
 * The catalogue itself stays on `/items`: adding and pricing a product is a
 * different job from watching its stock, and merging them produced a page where
 * neither was easy to find.
 */
@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink, AppShellComponent, IconComponent,
    ModalComponent, EmptyStateComponent, SkeletonRowsComponent, PagerComponent
  ],
  template: `
    <app-shell title="Inventory" [subtitle]="subtitle()">
      <button actions class="btn secondary" type="button" (click)="openScan()">
        <app-icon name="search" [size]="14" /> Scan barcode
      </button>
      <button actions class="btn primary" type="button" (click)="openAdjust()">
        <app-icon name="plus" [size]="14" /> Adjust stock
      </button>

      <div class="tabs" style="margin-bottom:16px">
        @for (t of tabs; track t.key) {
          <button type="button" class="tab" [class.active]="tab() === t.key" (click)="setTab(t.key)">
            {{ t.label }}
            @if (t.key === 'low' && lowCount()) { <span class="pill danger" style="margin-left:6px">{{ lowCount() }}</span> }
            @if (t.key === 'expiring' && expiringCount()) { <span class="pill warn" style="margin-left:6px">{{ expiringCount() }}</span> }
          </button>
        }
      </div>

      <!-- ── Valuation ───────────────────────────── -->
      @if (tab() === 'valuation') {
        @if (loadingValuation()) {
          <app-skeleton-rows [count]="5" />
        } @else {
          @if (valuation(); as v) {
          <div class="grid grid-4" style="margin-bottom:16px">
            <div class="stat-block">
              <div class="sb-label">Stock at cost</div>
              <div class="sb-value">{{ fmtINR(v.totals.value) }}</div>
            </div>
            <div class="stat-block">
              <div class="sb-label">At selling price</div>
              <div class="sb-value">{{ fmtINR(v.totals.retailValue) }}</div>
            </div>
            <div class="stat-block">
              <div class="sb-label">Margin on the shelf</div>
              <div class="sb-value">{{ fmtINR(v.totals.unrealisedMargin) }}</div>
            </div>
            <div class="stat-block">
              <div class="sb-label">Method</div>
              <div class="sb-value">{{ v.method === 'fifo' ? 'FIFO' : 'Weighted average' }}</div>
            </div>
          </div>

          <div class="info-box" style="margin-bottom:14px;display:flex;gap:8px;align-items:flex-start">
            <app-icon name="alertTriangle" [size]="15" style="flex-shrink:0;margin-top:1px" />
            <span>
              Stock is valued at what it <strong>cost</strong>, not at what you hope to sell it for.
              Accounting standards carry inventory at the lower of cost and what it will fetch, so
              the margin above is not yet earned — it is what you stand to make when the goods sell.
            </span>
          </div>

          @if (v.unreconciled) {
            <div class="info-box warn" style="margin-bottom:14px;display:flex;gap:8px;align-items:flex-start">
              <app-icon name="alertTriangle" [size]="15" style="flex-shrink:0;margin-top:1px" />
              <span>
                <strong>{{ v.unreconciled }} item{{ v.unreconciled === 1 ? '' : 's' }} do not reconcile.</strong>
                The counted quantity and the costed quantity disagree, which means something moved
                stock without moving its cost. Open the item's layers below and rebuild it.
              </span>
            </div>
          }

          @if (!v.items.length) {
            <app-empty-state icon="◳" title="Nothing in stock yet"
              subtitle="Record a purchase, or give an item an opening balance, and its value appears here." />
          } @else {
            <div class="table-wrap">
              <table class="table stack-mobile">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th style="text-align:right">In hand</th>
                    <th style="text-align:right">Avg cost</th>
                    <th style="text-align:right">Value</th>
                    <th style="text-align:right">At selling price</th>
                    <th>Layers</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of v.items; track row.itemId) {
                    <tr>
                      <td data-label="Item">
                        <div class="strong">{{ row.name }}</div>
                        @if (row.itemCode) { <div class="muted" style="font-size:11px">{{ row.itemCode }}</div> }
                      </td>
                      <td data-label="In hand" style="text-align:right">
                        {{ row.quantity }} {{ row.unit }}
                        @if (!row.reconciled) {
                          <div class="muted" style="font-size:11px;color:var(--red)">
                            ledger says {{ row.ledgerQuantity }}
                          </div>
                        }
                      </td>
                      <td data-label="Avg cost" style="text-align:right">{{ fmtINR(row.averageCost) }}</td>
                      <td data-label="Value" style="text-align:right" class="strong">{{ fmtINR(row.value) }}</td>
                      <td data-label="At selling price" style="text-align:right" class="muted">{{ fmtINR(row.retailValue) }}</td>
                      <td data-label="Layers">{{ row.layers }}</td>
                      <td style="text-align:right">
                        <button class="btn ghost sm" type="button" (click)="openLayers(row.itemId, row.name)">Layers</button>
                        @if (!row.reconciled) {
                          <button class="btn secondary sm" type="button" [disabled]="busy()"
                            (click)="rebuild(row.itemId)">Rebuild</button>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
          }
        }
      }

      <!-- ── Ledger ──────────────────────────────── -->
      @if (tab() === 'ledger') {
        <div class="toolbar">
          <div class="search-box">
            <span class="search-icon"><app-icon name="search" [size]="13" /></span>
            <input placeholder="Search by item…" [ngModel]="ledger.search()" (ngModelChange)="ledger.onSearch($event)">
          </div>
          <select style="max-width:200px" [ngModel]="reasonFilter()" (ngModelChange)="filterReason($event)">
            <option value="">Every kind of movement</option>
            @for (r of reasons; track r) { <option [value]="r">{{ label(r) }}</option> }
          </select>
        </div>

        @if (ledger.loading()) {
          <app-skeleton-rows [count]="6" />
        } @else if (!ledger.rows().length) {
          <app-empty-state icon="◳" title="No movements yet"
            subtitle="Every sale, purchase, return and correction appears here — with who did it and why." />
        } @else {
          <div class="table-wrap">
            <table class="table stack-mobile">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Item</th>
                  <th>What happened</th>
                  <th style="text-align:right">Change</th>
                  <th style="text-align:right">Balance</th>
                  <th style="text-align:right">Cost</th>
                  <th>Reference</th>
                </tr>
              </thead>
              <tbody>
                @for (m of ledger.rows(); track m._id) {
                  <tr>
                    <td data-label="When" class="muted">{{ fmtDate(m.createdAt) }}</td>
                    <td data-label="Item"><div class="strong">{{ m.itemName }}</div></td>
                    <td data-label="What happened">
                      {{ label(m.reason) }}
                      @if (m.note) { <div class="muted" style="font-size:11px">{{ m.note }}</div> }
                      @if (m.actorName) { <div class="muted" style="font-size:11px">by {{ m.actorName }}</div> }
                    </td>
                    <td data-label="Change" style="text-align:right"
                      [style.color]="m.quantity < 0 ? 'var(--red)' : 'var(--green)'">
                      {{ m.quantity > 0 ? '+' : '' }}{{ m.quantity }}
                    </td>
                    <td data-label="Balance" style="text-align:right">{{ m.balanceAfter ?? '—' }}</td>
                    <td data-label="Cost" style="text-align:right">
                      @if (m.value !== null && m.value !== undefined) {
                        {{ fmtINR(absolute(m.value)) }}
                        <div class="muted" style="font-size:11px">{{ fmtINR(m.unitCost || 0) }} each</div>
                      } @else { <span class="muted">—</span> }
                    </td>
                    <td data-label="Reference" class="mono" style="font-size:11px">
                      {{ m.documentNumber || '—' }}
                      @if (m.batchNumber) { <div class="muted">batch {{ m.batchNumber }}</div> }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <app-pager [page]="ledger.page()" [pageSize]="ledger.pageSize()" [total]="ledger.total()"
            (pageChange)="ledger.onPage($event)" (pageSizeChange)="ledger.onPageSize($event)" />
        }
      }

      <!-- ── Low stock ───────────────────────────── -->
      @if (tab() === 'low') {
        @if (loadingLow()) {
          <app-skeleton-rows [count]="4" />
        } @else {
          @if (low(); as report) {
          @if (!report.items.length) {
            <app-empty-state icon="✓" title="Nothing needs reordering"
              subtitle="Items only appear here once they have a reorder level set — a blank level means the item is not tracked, which is not the same as zero." />
          } @else {
            <div class="table-wrap">
              <table class="table stack-mobile">
                <thead>
                  <tr><th>Item</th><th style="text-align:right">In hand</th><th style="text-align:right">Reorder at</th><th style="text-align:right">Short by</th><th></th></tr>
                </thead>
                <tbody>
                  @for (row of report.items; track row._id) {
                    <tr>
                      <td data-label="Item">
                        <div class="strong">{{ row.name }}</div>
                        @if (row.category) { <div class="muted" style="font-size:11px">{{ row.category }}</div> }
                      </td>
                      <td data-label="In hand" style="text-align:right">{{ row.stockQty }} {{ row.unit }}</td>
                      <td data-label="Reorder at" style="text-align:right" class="muted">{{ row.reorderLevel }}</td>
                      <td data-label="Short by" class="strong" style="text-align:right;color:var(--red)">{{ row.shortfall }}</td>
                      <td style="text-align:right">
                        <button class="btn ghost sm" type="button" (click)="openAdjust(row._id, row.name)">Adjust</button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
          }
        }
      }

      <!-- ── Expiring ────────────────────────────── -->
      @if (tab() === 'expiring') {
        <div class="toolbar">
          <label style="font-size:13px;color:var(--muted)">Expiring within</label>
          <select style="max-width:160px" [ngModel]="expiryDays()" (ngModelChange)="setExpiryDays($event)">
            <option [ngValue]="7">7 days</option>
            <option [ngValue]="30">30 days</option>
            <option [ngValue]="90">90 days</option>
            <option [ngValue]="180">6 months</option>
          </select>
        </div>
        @if (loadingExpiring()) {
          <app-skeleton-rows [count]="4" />
        } @else {
          @if (expiring(); as report) {
          @if (!report.batches.length) {
            <app-empty-state icon="✓" title="Nothing expiring"
              subtitle="Batches appear here once a purchase records an expiry date against them." />
          } @else {
            <div class="table-wrap">
              <table class="table stack-mobile">
                <thead>
                  <tr><th>Item</th><th>Batch</th><th>Expires</th><th style="text-align:right">Quantity</th><th style="text-align:right">Value at risk</th><th>From</th></tr>
                </thead>
                <tbody>
                  @for (b of report.batches; track b.layerId) {
                    <tr>
                      <td data-label="Item"><div class="strong">{{ b.name }}</div></td>
                      <td data-label="Batch" class="mono">{{ b.batchNumber || '—' }}</td>
                      <td data-label="Expires">
                        {{ fmtDate(b.expiryDate) }}
                        @if (b.expired) {
                          <span class="pill danger" style="margin-left:6px">Expired</span>
                        } @else {
                          <div class="muted" style="font-size:11px">{{ b.daysLeft }} day{{ b.daysLeft === 1 ? '' : 's' }} left</div>
                        }
                      </td>
                      <td data-label="Quantity" style="text-align:right">{{ b.quantity }} {{ b.unit }}</td>
                      <td data-label="Value at risk" style="text-align:right" class="strong">{{ fmtINR(b.value) }}</td>
                      <td data-label="From" class="mono" style="font-size:11px">{{ b.sourceNumber || '—' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
          }
        }
      }

      <!-- ── Adjust ──────────────────────────────── -->
      <app-modal [open]="adjustOpen()" title="Adjust stock" [width]="520" (close)="adjustOpen.set(false)">
        <p style="margin:0 0 14px;font-size:13px;line-height:1.7;color:var(--text-mid)">
          Corrections are posted to the ledger with a reason attached, never as a silent edit —
          a balance that changed for no recorded reason cannot be reconciled later.
        </p>
        <div class="field">
          <label>Item</label>
          @if (adjustItemName()) {
            <input [value]="adjustItemName()" disabled>
          } @else {
            <select [(ngModel)]="adjustItemId">
              <option value="">Choose an item…</option>
              @for (it of stockedItems(); track it._id) {
                <option [value]="it._id">{{ it.name }} ({{ it.stockQty ?? 0 }} {{ it.unit }})</option>
              }
            </select>
          }
        </div>
        <div class="grid grid-2">
          <div class="field">
            <label>Change</label>
            <input type="number" step="1" [(ngModel)]="adjustQty"
              (ngModelChange)="onQuantityChange($event)" placeholder="e.g. -3">
            <div class="muted" style="font-size:11px;margin-top:4px">Negative to reduce, positive to add.</div>
          </div>
          <div class="field">
            <label>Reason</label>
            <select [(ngModel)]="adjustReason">
              <option value="adjustment">Correction after a recount</option>
              <option value="damage">Damaged or written off</option>
              <option value="opening">Opening balance</option>
            </select>
          </div>
        </div>
        @if (addingStock()) {
          <div class="field">
            <label>What did these cost, each? (optional)</label>
            <input type="number" min="0" step="0.01" [(ngModel)]="adjustCost" placeholder="Last cost paid">
            <div class="muted" style="font-size:11px;margin-top:4px">
              Left blank, the last cost paid is used. Stock added with no cost behind it would
              sell as pure profit.
            </div>
          </div>
        }
        <div class="field">
          <label>Why? (required)</label>
          <input [(ngModel)]="adjustNote" placeholder="e.g. Three bent in transit">
        </div>
        <div class="modal-foot">
          <button class="btn ghost" type="button" (click)="adjustOpen.set(false)">Cancel</button>
          <button class="btn primary" type="button"
            [disabled]="busy() || !adjustItemId || !adjustQty || !adjustNote.trim()"
            (click)="submitAdjust()">
            @if (busy()) { <span class="spinner"></span> } Post adjustment
          </button>
        </div>
      </app-modal>

      <!-- ── Cost layers ─────────────────────────── -->
      <app-modal [open]="layersOpen()" [title]="'Cost layers — ' + layersItemName()" [width]="640" (close)="layersOpen.set(false)">
        <p style="margin:0 0 14px;font-size:13px;line-height:1.7;color:var(--text-mid)">
          Each row is one receipt of goods at one cost. Sales draw them down
          {{ valuation()?.method === 'fifo' ? 'oldest first' : 'from the blended balance' }},
          which is where the cost on every sale comes from.
        </p>
        @if (layers().length) {
          <div class="table-wrap">
            <table class="table">
              <thead><tr><th>Received</th><th>From</th><th style="text-align:right">Cost each</th><th style="text-align:right">Left</th><th style="text-align:right">Value</th></tr></thead>
              <tbody>
                @for (l of layers(); track l._id) {
                  <tr [style.opacity]="l.remaining > 0 ? 1 : 0.5">
                    <td>
                      {{ fmtDate(l.receivedAt) }}
                      @if (l.batchNumber) { <div class="muted" style="font-size:11px">batch {{ l.batchNumber }}</div> }
                      @if (l.expiryDate) { <div class="muted" style="font-size:11px">expires {{ fmtDate(l.expiryDate) }}</div> }
                    </td>
                    <td class="mono" style="font-size:11px">{{ l.sourceNumber || l.sourceType }}</td>
                    <td style="text-align:right">{{ fmtINR(l.unitCost) }}</td>
                    <td style="text-align:right">{{ l.remaining }} of {{ l.quantity }}</td>
                    <td style="text-align:right" class="strong">{{ fmtINR(l.value) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <div class="card-sub">No cost layers — this item has never been received.</div>
        }
        <div class="modal-foot">
          <button class="btn primary" type="button" (click)="layersOpen.set(false)">Close</button>
        </div>
      </app-modal>

      <!-- ── Barcode ─────────────────────────────── -->
      <app-modal [open]="scanOpen()" title="Scan or type a barcode" [width]="480" (close)="scanOpen.set(false)">
        <div class="field">
          <label>Barcode</label>
          <!--
            A hardware scanner types the code and presses Enter, so submitting on
            Enter *is* the scanning integration — no camera, no library, and it
            works with every USB and Bluetooth scanner sold.
          -->
          <input class="mono" [(ngModel)]="scanCode" placeholder="Scan now, or type the number"
            (keyup.enter)="scan()" #scanInput>
        </div>
        @if (scanError()) { <div class="info-box danger">{{ scanError() }}</div> }
        @if (scanResult(); as found) {
          <div class="stat-block" style="margin-top:10px">
            <div class="sb-label">{{ found.itemCode || 'Item' }}</div>
            <div class="sb-value">{{ found.name }}</div>
            <div class="muted" style="font-size:12px;margin-top:6px">
              {{ found.stockQty ?? 0 }} {{ found.unit }} in hand · {{ fmtINR(found.sellingPrice) }} each
            </div>
          </div>
        }
        <div class="modal-foot">
          <button class="btn ghost" type="button" (click)="scanOpen.set(false)">Close</button>
          <button class="btn primary" type="button" [disabled]="!scanCode.trim()" (click)="scan()">Look up</button>
        </div>
      </app-modal>
    </app-shell>
  `
})
export class InventoryComponent implements OnInit {
  readonly tabs: Array<{ key: Tab; label: string }> = [
    { key: 'valuation', label: 'Stock & value' },
    { key: 'ledger', label: 'Ledger' },
    { key: 'low', label: 'Low stock' },
    { key: 'expiring', label: 'Expiring' }
  ];
  readonly reasons = Object.keys(REASON_LABELS);

  tab = signal<Tab>('valuation');
  busy = signal(false);

  valuation = signal<StockValuationReport | null>(null);
  loadingValuation = signal(true);
  low = signal<LowStockReport | null>(null);
  loadingLow = signal(true);
  expiring = signal<ExpiringStockReport | null>(null);
  loadingExpiring = signal(false);
  expiryDays = signal(30);
  reasonFilter = signal('');

  items = signal<Item[]>([]);
  ledger!: ServerList<StockMovement>;

  adjustOpen = signal(false);
  adjustItemName = signal('');
  adjustItemId = '';
  adjustQty: number | null = null;
  /**
   * Whether this adjustment adds stock, which is when a cost is worth asking for.
   *
   * A signal rather than reading `adjustQty` in the template: `adjustQty` is a
   * plain `ngModel` field typed `number | null`, and the template's strict null
   * checks reject `adjustQty > 0` outright. Mirroring it here keeps the null
   * handling in one place instead of scattering `!` through the markup.
   */
  addingStock = signal(false);
  adjustCost: number | null = null;
  adjustReason = 'adjustment';
  adjustNote = '';

  layersOpen = signal(false);
  layersItemName = signal('');
  layers = signal<StockLayerRow[]>([]);

  scanOpen = signal(false);
  scanCode = '';
  scanResult = signal<Item | null>(null);
  scanError = signal('');

  fmtINR = fmtINR;
  fmtDate = fmtDate;

  lowCount = computed(() => this.low()?.items.length || 0);
  expiringCount = computed(() => this.expiring()?.count || 0);

  subtitle = computed(() => {
    const v = this.valuation();
    if (!v) return 'Stock levels, what they cost, and what needs attention';
    return `${fmtINR(v.totals.value)} of stock across ${v.items.length} item${v.items.length === 1 ? '' : 's'}`;
  });

  /** Only things that can hold stock — offering a service in an adjustment
   *  dropdown invites a movement the server will refuse. */
  stockedItems = computed(() => this.items().filter(i => i.type !== 'service'));

  constructor(private api: ApiService, private toast: ToastService) {
    this.ledger = new ServerList<StockMovement>(params => this.api.stockLedger(params));
  }

  ngOnInit() {
    this.loadValuation();
    this.loadLow();
    // Loaded up front rather than on tab switch, because its count is shown on
    // the tab itself — a badge that only appears once you have already looked is
    // not a badge.
    this.loadExpiring();
    this.api.items({ pageSize: 200 }).subscribe({ next: res => this.items.set(res.data), error: () => {} });
  }

  setTab(tab: Tab) {
    this.tab.set(tab);
    if (tab === 'ledger' && !this.ledger.rows().length) this.ledger.refresh();
  }

  label(reason: string) {
    return REASON_LABELS[reason] || reason;
  }

  /** Movement values are signed; the column shows magnitude and colours the sign. */
  absolute(value: number) {
    return Math.abs(value);
  }

  filterReason(reason: string) {
    this.reasonFilter.set(reason);
    this.ledger.setFilter('reason', reason || undefined);
  }

  setExpiryDays(days: number) {
    this.expiryDays.set(Number(days));
    this.loadExpiring();
  }

  private loadValuation() {
    this.loadingValuation.set(true);
    this.api.stockValuation().subscribe({
      next: report => { this.valuation.set(report); this.loadingValuation.set(false); },
      error: err => { this.loadingValuation.set(false); this.toast.httpError(err); }
    });
  }

  private loadLow() {
    this.loadingLow.set(true);
    this.api.lowStock().subscribe({
      next: report => { this.low.set(report); this.loadingLow.set(false); },
      error: () => this.loadingLow.set(false)
    });
  }

  private loadExpiring() {
    this.loadingExpiring.set(true);
    this.api.expiringStock(this.expiryDays()).subscribe({
      next: report => { this.expiring.set(report); this.loadingExpiring.set(false); },
      error: () => this.loadingExpiring.set(false)
    });
  }

  // ── Adjustment ───────────────────────────────

  openAdjust(itemId = '', itemName = '') {
    this.adjustItemId = itemId;
    this.adjustItemName.set(itemName);
    this.adjustQty = null;
    this.adjustCost = null;
    this.addingStock.set(false);
    this.adjustReason = 'adjustment';
    this.adjustNote = '';
    this.adjustOpen.set(true);
  }

  /** Templates cannot reach global functions, so the coercion lives here. */
  onQuantityChange(value: unknown) {
    this.addingStock.set(Number(value) > 0);
  }

  submitAdjust() {
    const quantity = Number(this.adjustQty);
    if (!this.adjustItemId || !quantity || !this.adjustNote.trim()) return;
    this.busy.set(true);
    this.api.adjustStock(this.adjustItemId, {
      quantity,
      note: this.adjustNote.trim(),
      reason: this.adjustReason,
      unitCost: quantity > 0 && this.adjustCost != null ? Number(this.adjustCost) : undefined
    }).subscribe({
      next: res => {
        this.busy.set(false);
        this.adjustOpen.set(false);
        this.toast.success(`Stock is now ${res.stockQty}`);
        this.refreshAll();
      },
      error: err => { this.busy.set(false); this.toast.httpError(err); }
    });
  }

  rebuild(itemId: string) {
    this.busy.set(true);
    this.api.recomputeStock(itemId).subscribe({
      next: res => {
        this.busy.set(false);
        this.toast.success(`Rebuilt from the ledger: ${res.stockQty} in hand, ${fmtINR(res.stockValue)}`);
        this.refreshAll();
      },
      error: err => { this.busy.set(false); this.toast.httpError(err); }
    });
  }

  private refreshAll() {
    this.loadValuation();
    this.loadLow();
    this.loadExpiring();
    this.ledger.refresh();
  }

  // ── Layers ───────────────────────────────────

  openLayers(itemId: string, name: string) {
    this.layersItemName.set(name);
    this.layers.set([]);
    this.layersOpen.set(true);
    this.api.stockLayers(itemId).subscribe({
      next: res => this.layers.set(res.layers),
      error: err => this.toast.httpError(err)
    });
  }

  // ── Barcode ──────────────────────────────────

  openScan() {
    this.scanCode = '';
    this.scanResult.set(null);
    this.scanError.set('');
    this.scanOpen.set(true);
  }

  scan() {
    const code = this.scanCode.trim();
    if (!code) return;
    this.scanError.set('');
    this.api.itemByBarcode(code).subscribe({
      next: item => { this.scanResult.set(item); this.scanCode = ''; },
      error: err => {
        this.scanResult.set(null);
        this.scanError.set(
          err?.error?.code === 'BARCODE_NOT_FOUND'
            ? 'No active item has that barcode. Add it from Items first.'
            : err?.error?.message || 'That lookup failed.'
        );
      }
    });
  }
}
