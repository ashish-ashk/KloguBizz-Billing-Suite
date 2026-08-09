import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppShellComponent } from '../../shared/app-shell.component';
import { IconComponent } from '../../shared/icons';
import { EmptyStateComponent, ModalComponent, PagerComponent, SkeletonRowsComponent } from '../../shared/ui';
import { ApiService } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { ServerList } from '../../core/server-list';
import { Expense, MasterOption, ProfitLossReport } from '../../core/models';
import { downloadBlob, fmtDate, fmtINR } from '../../core/format';

type Tab = 'statement' | 'expenses';

/**
 * Profit & loss, and the costs that feed it (2.4 #32).
 *
 * The statement is laid out the way a P&L is read — a single column of lines
 * working down to a figure — rather than as a dashboard of cards. Cards are good
 * at "here are four numbers"; a P&L is an argument, and each line only means
 * something in the context of the one above it.
 *
 * The two things this page has to communicate beyond the arithmetic:
 *
 *   **Buying stock is not an expense.** It is the single most common
 *   misunderstanding about this report, and someone who expects their purchases
 *   to appear will conclude the software is broken. The excluded section says so
 *   plainly, with the amount, rather than leaving them to work it out.
 *
 *   **Revenue is not the money that came in.** GST is collected on the
 *   government's behalf, and an unpaid invoice is still revenue under accrual
 *   accounting. Both are stated where the number is, not in a help page.
 */
@Component({
  selector: 'app-profit-loss',
  standalone: true,
  imports: [
    CommonModule, FormsModule, AppShellComponent, IconComponent,
    ModalComponent, EmptyStateComponent, SkeletonRowsComponent, PagerComponent
  ],
  template: `
    <app-shell title="Profit &amp; Loss" [subtitle]="subtitle()">
      <select actions style="max-width:190px" [ngModel]="fy()" (ngModelChange)="setFy($event)">
        @for (year of years; track year) {
          <option [ngValue]="year">FY{{ year }}-{{ (year + 1) % 100 }}</option>
        }
      </select>
      <button actions class="btn secondary" type="button" [disabled]="!report()" (click)="exportExcel()">
        <app-icon name="download" [size]="14" /> Export
      </button>
      <button actions class="btn primary" type="button" (click)="openAdd()">
        <app-icon name="plus" [size]="14" /> Record expense
      </button>

      <div class="tabs" style="margin-bottom:16px">
        <button type="button" class="tab" [class.active]="tab() === 'statement'" (click)="tab.set('statement')">Statement</button>
        <button type="button" class="tab" [class.active]="tab() === 'expenses'" (click)="setTab('expenses')">Expenses</button>
      </div>

      @if (tab() === 'statement') {
        @if (loading()) {
          <app-skeleton-rows [count]="8" />
        } @else {
          @if (report(); as r) {
            <div class="grid grid-3" style="margin-bottom:16px">
              <div class="stat-block">
                <div class="sb-label">Net revenue</div>
                <div class="sb-value">{{ fmtINR(r.revenue.net) }}</div>
              </div>
              <div class="stat-block">
                <div class="sb-label">Gross profit</div>
                <div class="sb-value">
                  {{ fmtINR(r.grossProfit) }}
                  @if (r.grossMargin !== null) { <span class="muted" style="font-size:12px"> · {{ r.grossMargin }}%</span> }
                </div>
              </div>
              <div class="stat-block">
                <div class="sb-label">Net profit</div>
                <div class="sb-value" [style.color]="r.netProfit < 0 ? 'var(--red)' : 'var(--green)'">
                  {{ fmtINR(r.netProfit) }}
                  @if (r.netMargin !== null) { <span class="muted" style="font-size:12px"> · {{ r.netMargin }}%</span> }
                </div>
              </div>
            </div>

            <section class="card flush" style="margin-bottom:16px">
              <div class="table-wrap">
                <table class="table">
                  <tbody>
                    <tr>
                      <td>Revenue <span class="muted" style="font-size:11px">— taxable value of {{ r.revenue.invoices }} invoice{{ r.revenue.invoices === 1 ? '' : 's' }}</span></td>
                      <td style="text-align:right">{{ fmtINR(r.revenue.gross) }}</td>
                    </tr>
                    @if (r.revenue.creditNotes) {
                      <tr>
                        <td class="muted">Less: credit notes and returns</td>
                        <td style="text-align:right" class="muted">({{ fmtINR(r.revenue.creditNotes) }})</td>
                      </tr>
                    }
                    <tr style="border-top:1px solid var(--line)">
                      <td class="strong">Net revenue</td>
                      <td style="text-align:right" class="strong">{{ fmtINR(r.revenue.net) }}</td>
                    </tr>
                    <tr>
                      <td class="muted">Less: cost of goods sold</td>
                      <td style="text-align:right" class="muted">({{ fmtINR(r.costOfGoodsSold.total) }})</td>
                    </tr>
                    <tr style="border-top:1px solid var(--line)">
                      <td class="strong">Gross profit</td>
                      <td style="text-align:right" class="strong">{{ fmtINR(r.grossProfit) }}</td>
                    </tr>
                    @for (line of r.expenses; track line.category) {
                      <tr>
                        <td class="muted">
                          Less: {{ line.category }}
                          @if (line.count) { <span style="font-size:11px"> ({{ line.count }})</span> }
                        </td>
                        <td style="text-align:right" class="muted">({{ fmtINR(line.amount) }})</td>
                      </tr>
                    }
                    <tr style="border-top:2px solid var(--line)">
                      <td class="strong" style="font-size:15px">Net profit</td>
                      <td style="text-align:right" class="strong"
                        [style.color]="r.netProfit < 0 ? 'var(--red)' : 'var(--green)'"
                        style="text-align:right;font-size:15px">{{ fmtINR(r.netProfit) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section class="card">
              <div class="card-title" style="margin-bottom:6px">What is not on this statement</div>
              <div class="card-sub" style="margin-bottom:14px">
                These are the reasons your expenses here will not add up to your purchase register.
                Each one is deliberate.
              </div>
              <div style="display:grid;gap:12px">
                <div style="display:flex;gap:10px;align-items:flex-start">
                  <app-icon name="box" [size]="15" style="flex-shrink:0;margin-top:2px" />
                  <div>
                    <div class="strong">{{ fmtINR(r.excluded.inventoryPurchases) }} of stock bought</div>
                    <div class="muted" style="font-size:12.5px;line-height:1.6">
                      Buying stock turns cash into goods on a shelf — nothing has been consumed yet.
                      It becomes an expense when the goods sell, as cost of goods sold above.
                    </div>
                  </div>
                </div>
                @if (r.excluded.capitalGoods) {
                  <div style="display:flex;gap:10px;align-items:flex-start">
                    <app-icon name="package" [size]="15" style="flex-shrink:0;margin-top:2px" />
                    <div>
                      <div class="strong">{{ fmtINR(r.excluded.capitalGoods) }} of capital goods</div>
                      <div class="muted" style="font-size:12.5px;line-height:1.6">
                        Assets used over several years. The expense is depreciation, spread across
                        their life — which needs an asset register this report does not have yet.
                      </div>
                    </div>
                  </div>
                }
                <div style="display:flex;gap:10px;align-items:flex-start">
                  <app-icon name="percent" [size]="15" style="flex-shrink:0;margin-top:2px" />
                  <div>
                    <div class="strong">{{ fmtINR(r.revenue.taxCollected) }} of GST charged to customers</div>
                    <div class="muted" style="font-size:12.5px;line-height:1.6">
                      Collected on the government's behalf and owed to it, so it is never revenue.
                      Your invoices totalled more than the revenue line above by this amount.
                    </div>
                  </div>
                </div>
                <div style="display:flex;gap:10px;align-items:flex-start">
                  <app-icon name="clock" [size]="15" style="flex-shrink:0;margin-top:2px" />
                  <div>
                    <div class="strong">Money not yet received</div>
                    <div class="muted" style="font-size:12.5px;line-height:1.6">
                      An invoice counts as revenue when it is issued, not when it is paid. For what
                      is actually owed to you, see Receivables.
                    </div>
                  </div>
                </div>
              </div>
            </section>
          }
        }
      }

      @if (tab() === 'expenses') {
        @if (list.loading()) {
          <app-skeleton-rows [count]="6" />
        } @else if (!list.rows().length) {
          <app-empty-state icon="◧" title="No expenses recorded"
            subtitle="Salaries, rent, bank charges — anything you pay for that does not come with a GST bill from a vendor." />
        } @else {
          <div class="table-wrap">
            <table class="table stack-mobile">
              <thead>
                <tr><th>Date</th><th>Category</th><th>Description</th><th>Paid to</th><th style="text-align:right">Amount</th><th></th></tr>
              </thead>
              <tbody>
                @for (e of list.rows(); track e._id) {
                  <tr>
                    <td data-label="Date" class="muted">{{ fmtDate(e.date) }}</td>
                    <td data-label="Category"><span class="pill">{{ e.category }}</span></td>
                    <td data-label="Description">
                      <div class="strong">{{ e.description }}</div>
                      @if (e.reference) { <div class="muted" style="font-size:11px">{{ e.reference }}</div> }
                    </td>
                    <td data-label="Paid to" class="muted">{{ e.paidTo || '—' }}</td>
                    <td data-label="Amount" style="text-align:right" class="strong">{{ fmtINR(e.amount) }}</td>
                    <td style="text-align:right">
                      <button class="btn ghost sm" type="button" (click)="openEdit(e)">Edit</button>
                      <button class="btn ghost sm" type="button" (click)="remove(e)">Delete</button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <app-pager [page]="list.page()" [pageSize]="list.pageSize()" [total]="list.total()"
            (pageChange)="list.onPage($event)" (pageSizeChange)="list.onPageSize($event)" />
        }
      }

      <app-modal [open]="modalOpen()" [title]="editing() ? 'Edit expense' : 'Record an expense'" [width]="560" (close)="modalOpen.set(false)">
        <p style="margin:0 0 14px;font-size:13px;line-height:1.7;color:var(--text-mid)">
          For costs with no GST bill behind them — salaries, rent to an unregistered landlord,
          bank charges, petty cash. Anything that came with a supplier's tax invoice belongs in
          <strong>Purchases</strong> instead, so its input tax credit is claimed.
        </p>
        <div class="grid grid-2">
          <div class="field">
            <label>Date</label>
            <input type="date" [(ngModel)]="form.date">
          </div>
          <div class="field">
            <label>Category</label>
            @if (categories().length) {
              <select [(ngModel)]="form.category">
                <option value="">Choose a category…</option>
                @for (c of categories(); track c.value) { <option [value]="c.value">{{ c.label }}</option> }
              </select>
            } @else {
              <!--
                No chart of accounts configured, so this falls back to free text.

                A dropdown with nothing in it is a dead end: the form cannot be
                submitted and nothing on screen says why. The server is
                deliberately permissive when a master list is empty — an install
                that has never seeded masters has to keep working — so the UI
                matches that contract rather than being stricter than the API and
                blocking a write the server would have accepted.
              -->
              <input [(ngModel)]="form.category" placeholder="e.g. Rent">
              <div class="muted" style="font-size:11px;margin-top:4px">
                No expense categories are configured yet, so type one. Ask your administrator to
                set up the list and these become a dropdown.
              </div>
            }
          </div>
        </div>
        <div class="field">
          <label>Description</label>
          <input [(ngModel)]="form.description" placeholder="e.g. June payroll">
        </div>
        <div class="grid grid-2">
          <div class="field">
            <label>Amount</label>
            <input type="number" min="0" step="0.01" [(ngModel)]="form.amount">
          </div>
          <div class="field">
            <label>Paid to (optional)</label>
            <input [(ngModel)]="form.paidTo">
          </div>
        </div>
        <div class="field">
          <label>Reference (optional)</label>
          <input [(ngModel)]="form.reference" placeholder="Cheque number, UTR, receipt number">
        </div>
        <div class="modal-foot">
          <button class="btn ghost" type="button" (click)="modalOpen.set(false)">Cancel</button>
          <button class="btn primary" type="button" [disabled]="saving() || !canSave()" (click)="save()">
            @if (saving()) { <span class="spinner"></span> } {{ editing() ? 'Save changes' : 'Record expense' }}
          </button>
        </div>
      </app-modal>
    </app-shell>
  `
})
export class ProfitLossComponent implements OnInit {
  tab = signal<Tab>('statement');
  loading = signal(true);
  saving = signal(false);
  report = signal<ProfitLossReport | null>(null);
  categories = signal<MasterOption[]>([]);
  list!: ServerList<Expense>;

  modalOpen = signal(false);
  editing = signal<Expense | null>(null);
  form = this.blankForm();

  /** The current financial year and the four before it. Indian FY starts in
   *  April, so a date in January belongs to the year before. */
  readonly years: number[] = (() => {
    const now = new Date();
    const current = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    return [0, 1, 2, 3, 4].map(offset => current - offset);
  })();

  fy = signal(this.years[0]);

  fmtINR = fmtINR;
  fmtDate = fmtDate;

  subtitle = computed(() => {
    const r = this.report();
    if (!r) return 'What the business earned, and what it cost to earn it';
    const verb = r.netProfit < 0 ? 'lost' : 'made';
    return `${r.period.label || r.period.from} · ${verb} ${fmtINR(Math.abs(r.netProfit))} on ${fmtINR(r.revenue.net)} of revenue`;
  });

  constructor(private api: ApiService, private toast: ToastService) {
    this.list = new ServerList<Expense>(params => this.api.expenses(params));
  }

  ngOnInit() {
    this.load();
    this.api.expenseCategories().subscribe({
      next: res => this.categories.set(res.categories),
      error: () => {}
    });
  }

  setTab(tab: Tab) {
    this.tab.set(tab);
    if (tab === 'expenses' && !this.list.rows().length) this.list.refresh();
  }

  setFy(year: number) {
    this.fy.set(Number(year));
    this.load();
  }

  private load() {
    this.loading.set(true);
    this.api.profitLoss({ fy: this.fy() }).subscribe({
      next: report => { this.report.set(report); this.loading.set(false); },
      error: err => { this.loading.set(false); this.toast.httpError(err); }
    });
  }

  exportExcel() {
    this.api.profitLossExcel({ fy: this.fy() }).subscribe({
      next: blob => downloadBlob(blob, `profit-loss-fy${this.fy()}.xlsx`),
      error: err => this.toast.httpError(err)
    });
  }

  // ── Expense entry ────────────────────────────

  private blankForm() {
    return {
      date: new Date().toISOString().slice(0, 10),
      category: '',
      description: '',
      amount: null as number | null,
      paidTo: '',
      reference: ''
    };
  }

  canSave() {
    return !!this.form.date && !!this.form.category && !!this.form.description.trim() && Number(this.form.amount) > 0;
  }

  openAdd() {
    this.editing.set(null);
    this.form = this.blankForm();
    this.modalOpen.set(true);
  }

  openEdit(expense: Expense) {
    this.editing.set(expense);
    this.form = {
      date: String(expense.date).slice(0, 10),
      category: expense.category,
      description: expense.description,
      amount: expense.amount,
      paidTo: expense.paidTo || '',
      reference: expense.reference || ''
    };
    this.modalOpen.set(true);
  }

  save() {
    if (!this.canSave()) return;
    const payload = {
      date: this.form.date,
      category: this.form.category,
      description: this.form.description.trim(),
      amount: Number(this.form.amount),
      paidTo: this.form.paidTo.trim(),
      reference: this.form.reference.trim()
    };
    const editing = this.editing();
    this.saving.set(true);
    const request = editing ? this.api.updateExpense(editing._id, payload) : this.api.createExpense(payload);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.modalOpen.set(false);
        this.toast.success(editing ? 'Expense updated' : 'Expense recorded');
        this.list.refresh();
        // The statement is the reason this page exists; a cost that does not
        // move the profit figure immediately looks like it was not saved.
        this.load();
      },
      error: err => { this.saving.set(false); this.toast.httpError(err); }
    });
  }

  remove(expense: Expense) {
    this.api.deleteExpense(expense._id).subscribe({
      next: () => {
        this.toast.info('Expense moved to the recycle bin.');
        this.list.refresh();
        this.load();
      },
      error: err => this.toast.httpError(err)
    });
  }
}
