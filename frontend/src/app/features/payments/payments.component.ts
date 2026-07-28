import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppShellComponent } from '../../shared/app-shell.component';
import { IconComponent } from '../../shared/icons';
import { AvatarComponent, EmptyStateComponent, ModalComponent, PagerComponent, PillComponent, SkeletonRowsComponent } from '../../shared/ui';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { Client, Invoice, InvoiceStats, Payment } from '../../core/models';
import { daysBetween, downloadBlob, fmtDate, fmtINR } from '../../core/format';
import { ServerList } from '../../core/server-list';

type PayTab = 'tracker' | 'history' | 'reminders';

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [CommonModule, FormsModule, AppShellComponent, IconComponent, ModalComponent, PillComponent, AvatarComponent, EmptyStateComponent, SkeletonRowsComponent, PagerComponent],
  template: `
    <app-shell title="Payments" subtitle="Track collections, reminders and history">
      <button actions class="btn ghost" type="button" [disabled]="exporting()" (click)="exportCsv()">
        @if (exporting()) { <span class="spinner"></span> } <app-icon name="download" [size]="13" /> Export CSV
      </button>

      <!-- Metrics -->
      <div class="grid grid-4" style="margin-bottom:20px">
        <div class="card metric success">
          <div class="accent"></div>
          <div class="metric-row">
            <span class="label">Total Collected</span>
            <span class="m-icon"><app-icon name="rupee" [size]="15" /></span>
          </div>
          <div class="value" style="color:var(--green)">{{ fmtINR(totalCollected()) }}</div>
          <div class="sub">{{ successCount() }} successful payment{{ successCount() === 1 ? '' : 's' }}</div>
        </div>
        <div class="card metric warning">
          <div class="accent"></div>
          <div class="metric-row">
            <span class="label">Pending Amount</span>
            <span class="m-icon"><app-icon name="clock" [size]="15" /></span>
          </div>
          <div class="value">{{ fmtINR(pendingAmount()) }}</div>
          <div class="sub">{{ openCount() }} open invoice{{ openCount() === 1 ? '' : 's' }}</div>
        </div>
        <div class="card metric danger">
          <div class="accent"></div>
          <div class="metric-row">
            <span class="label">Overdue Amount</span>
            <span class="m-icon"><app-icon name="alertTriangle" [size]="15" /></span>
          </div>
          <div class="value" style="color:var(--red)">{{ fmtINR(overdueAmount()) }}</div>
          <div class="sub">{{ overdueCount() }} invoice{{ overdueCount() === 1 ? '' : 's' }} past due</div>
        </div>
        <div class="card metric indigo">
          <div class="accent"></div>
          <div class="metric-row">
            <span class="label">Avg. Collection</span>
            <span class="m-icon"><app-icon name="clock" [size]="15" /></span>
          </div>
          <div class="value" style="color:var(--brand)">
            {{ avgCollectionDays() === null ? '—' : avgCollectionDays() + ' days' }}
          </div>
          <div class="sub">Invoice date to payment date</div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs" style="margin-bottom:16px">
        <button type="button" [class.active]="tab() === 'tracker'" (click)="tab.set('tracker')">Payment Tracker</button>
        <button type="button" [class.active]="tab() === 'history'" (click)="tab.set('history')">Payment History</button>
        <button type="button" [class.active]="tab() === 'reminders'" (click)="tab.set('reminders')">Reminders</button>
      </div>

      <!-- Tracker -->
      @if (tab() === 'tracker') {
        <div class="toolbar">
          <div class="search-box">
            <span class="search-icon">⌕</span>
            <input class="input" type="search" placeholder="Search invoice number or buyer…"
              [ngModel]="due.search()" (ngModelChange)="due.onSearch($event)">
          </div>
        </div>
        <div class="card flush">
          @if (due.loading()) {
            <app-skeleton-rows [count]="5" />
          } @else if (due.total() === 0 && !due.search()) {
            <app-empty-state icon="✓" title="All invoices are paid" message="No pending, partial or overdue invoices right now." />
          } @else if (due.rows().length === 0) {
            <app-empty-state icon="⌕" title="No matching invoices" message="Try a different search term." />
          } @else {
            <div class="table-wrap">
              <table class="table stack-mobile">
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Client</th>
                    <th>Invoice Date</th>
                    <th>Due Date</th>
                    <th>Amount</th>
                    <th>Balance Due</th>
                    <th>Status</th>
                    <th>Days Due</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  @for (inv of due.rows(); track inv._id) {
                    <tr [class.row-danger]="inv.status === 'overdue'">
                      <td class="num" data-label="Invoice #">{{ inv.invoiceNumber }}</td>
                      <td data-label="Client">
                        <div style="display:flex;align-items:center;gap:10px">
                          <app-avatar [name]="clientName(inv.clientId)" [size]="30" />
                          <div>
                            <div class="strong">{{ clientName(inv.clientId) }}</div>
                            <div class="muted" style="font-size:11.5px">{{ clientEmail(inv.clientId) || '—' }}</div>
                          </div>
                        </div>
                      </td>
                      <td data-label="Invoice Date">{{ fmtDate(inv.date) }}</td>
                      <td data-label="Due Date">{{ fmtDate(inv.dueDate) }}</td>
                      <td data-label="Amount">{{ fmtINR(inv.totals.total) }}</td>
                      <!-- What is actually still owed. The tracker used to show the
                           full invoice value even on a part-paid invoice. -->
                      <td class="strong" data-label="Balance Due" data-priority="high">
                        {{ fmtINR(remainingFor(inv)) }}
                        @if ((inv.amountPaid || 0) > 0) {
                          <div class="muted" style="font-size:11px;font-weight:500">{{ fmtINR(inv.amountPaid || 0) }} received</div>
                        }
                      </td>
                      <td data-label="Status" data-priority="high"><app-pill [status]="inv.status" /></td>
                      <td data-label="Days Due">
                        @if (overdueDays(inv) > 0) {
                          <span style="color:var(--red);font-weight:700">+{{ overdueDays(inv) }}d overdue</span>
                        } @else if (overdueDays(inv) === 0) {
                          <span style="color:var(--amber);font-weight:600">Due today</span>
                        } @else {
                          <span style="color:var(--green)">{{ -overdueDays(inv) }} days left</span>
                        }
                      </td>
                      <td data-label="">
                        <div class="actions">
                          <button class="btn primary sm" type="button" (click)="openPay(inv)">Record Payment</button>
                          <button class="btn ghost sm" type="button" (click)="openRemind(inv)"><app-icon name="mail" [size]="13" /> Remind</button>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <app-pager [page]="due.page()" [pageSize]="due.pageSize()" [total]="due.total()"
              (pageChange)="due.onPage($event)" (pageSizeChange)="due.onPageSize($event)" />
          }
        </div>
      }

      <!-- History -->
      @if (tab() === 'history') {
        <div class="toolbar">
          <!-- A method filter rather than a free-text search: payment history is
               filtered in the database now, and method is the axis that is both
               indexed and actually useful here. Finding a specific payment is done
               from its invoice. -->
          <select class="input" style="max-width:200px"
            [ngModel]="history.filters()['method'] || ''"
            (ngModelChange)="history.setFilter('method', $event)">
            <option value="">All payment methods</option>
            @for (m of methods; track m) { <option [value]="m">{{ m }}</option> }
          </select>
        </div>
        <div class="card flush">
          @if (history.loading()) {
            <app-skeleton-rows [count]="5" />
          } @else if (history.total() === 0 && !history.filters()['method']) {
            <app-empty-state icon="◈" title="No payments recorded yet" message="Payments you record will show up here." />
          } @else if (history.rows().length === 0) {
            <app-empty-state icon="⌕" title="No matching payments" message="Try a different filter." />
          } @else {
            <div class="table-wrap">
              <table class="table stack-mobile">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Invoice #</th>
                    <th>Client</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Reference</th>
                    <th>Status</th>
                    <th>Note</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  @for (p of history.rows(); track p._id) {
                    <tr>
                      <td data-label="Date">{{ fmtDate(p.date) }}</td>
                      <td class="num" data-label="Invoice #">{{ invoiceNo(p) }}</td>
                      <td data-label="Client">{{ clientName(p.clientId) }}</td>
                      <td class="strong" data-label="Amount" data-priority="high" style="color:var(--green)">{{ fmtINR(p.amount) }}</td>
                      <td data-label="Method"><span class="pill">{{ p.method }}</span></td>
                      <td data-label="Reference">
                        @if (p.reference) { <span class="mono">{{ p.reference }}</span> }
                        @else { <span class="muted">—</span> }
                      </td>
                      <td data-label="Status" data-priority="high"><app-pill [status]="p.status" /></td>
                      <td class="muted" data-label="Note">{{ p.note || '—' }}</td>
                      <td data-label="">
                        @if (p.status === 'success' && isAdmin()) {
                          <button class="btn ghost sm" type="button" (click)="voidTarget.set(p)">Void</button>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <app-pager [page]="history.page()" [pageSize]="history.pageSize()" [total]="history.total()"
              (pageChange)="history.onPage($event)" (pageSizeChange)="history.onPageSize($event)" />
          }
        </div>
      }

      <!-- Reminders -->
      @if (tab() === 'reminders') {
        @if (due.loading()) {
          <div class="card flush"><app-skeleton-rows [count]="4" /></div>
        } @else if (due.total() === 0) {
          <div class="card flush">
            <app-empty-state icon="📧" title="No pending invoices requiring reminders" message="You are all caught up." />
          </div>
        } @else {
          <div style="display:flex;justify-content:flex-end;margin-bottom:14px">
            <button class="btn secondary sm" type="button" [disabled]="remindingAll()" (click)="confirmRemindAll.set(true)">
              @if (remindingAll()) { <span class="spinner"></span> } <app-icon name="mail" [size]="13" /> Remind All ({{ due.total() }})
            </button>
          </div>
          <div class="grid grid-2">
            @for (inv of due.rows(); track inv._id) {
              <div class="card">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
                  <app-avatar [name]="clientName(inv.clientId)" [size]="36" />
                  <div style="flex:1;min-width:0">
                    <div style="font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ clientName(inv.clientId) }}</div>
                    <div style="font-size:11.5px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                      {{ clientEmail(inv.clientId) || 'No email on file' }}
                    </div>
                  </div>
                  <app-pill [status]="inv.status" />
                </div>
                <div class="grid grid-2" style="gap:10px;margin-bottom:16px">
                  <div class="stat-block">
                    <div class="sb-label">Invoice #</div>
                    <div class="sb-value mono" style="color:var(--brand)">{{ inv.invoiceNumber }}</div>
                  </div>
                  <div class="stat-block">
                    <div class="sb-label">Amount Due</div>
                    <div class="sb-value">{{ fmtINR(remainingFor(inv)) }}</div>
                  </div>
                  <div class="stat-block">
                    <div class="sb-label">Due Date</div>
                    <div class="sb-value">{{ fmtDate(inv.dueDate) }}</div>
                  </div>
                  <div class="stat-block">
                    <div class="sb-label">Days</div>
                    @if (overdueDays(inv) > 0) {
                      <div class="sb-value" style="color:var(--red)">+{{ overdueDays(inv) }}d overdue</div>
                    } @else if (overdueDays(inv) === 0) {
                      <div class="sb-value" style="color:var(--amber)">Due today</div>
                    } @else {
                      <div class="sb-value" style="color:var(--green)">{{ -overdueDays(inv) }}d left</div>
                    }
                  </div>
                </div>
                <div style="display:flex;gap:8px">
                  <button class="btn primary sm" type="button" style="flex:1" (click)="openRemind(inv)"><app-icon name="mail" [size]="13" /> Send Reminder</button>
                  <button class="btn success sm" type="button" (click)="openPay(inv)">Record Payment</button>
                </div>
              </div>
            }
          </div>
        }
      }

      <!-- Record Payment modal -->
      <app-modal [open]="!!payInvoice()" title="Record Payment" [width]="440" (close)="payInvoice.set(null)">
        @if (payInvoice(); as inv) {
          <div class="info-box" style="margin-bottom:16px">
            <strong>{{ clientName(inv.clientId) }}</strong><br>
            <span class="mono">{{ inv.invoiceNumber }}</span> · Due {{ fmtDate(inv.dueDate) }} · {{ fmtINR(inv.totals.total) }}
            @if ((inv.amountPaid || 0) > 0) {
              <br><span style="color:var(--green)">{{ fmtINR(inv.amountPaid || 0) }} already received</span>
              · <strong>{{ fmtINR(remainingFor(inv)) }} still due</strong>
            }
          </div>
          <form class="form" (ngSubmit)="savePayment()">
            <div class="field">
              <label>Amount Received (₹)</label>
              <!-- Capped at the outstanding balance: the API rejects an
                   over-payment, so stop it here rather than round-tripping. -->
              <input name="amount" type="number" min="0" step="0.01" [max]="remainingFor(inv)" [(ngModel)]="payAmount">
              @if (payAmount && payAmount > remainingFor(inv)) {
                <span class="error">Cannot exceed the {{ fmtINR(remainingFor(inv)) }} still due on this invoice.</span>
              }
            </div>
            <div class="field">
              <label>Payment Method</label>
              <select name="method" [(ngModel)]="payMethod">
                @for (m of methods; track m) { <option [value]="m">{{ m }}</option> }
              </select>
            </div>
            <div class="field">
              <label>Transaction Reference</label>
              <input name="reference" [(ngModel)]="payReference" placeholder="UTR / transaction ID (optional)">
            </div>
            <div class="field">
              <label>Note</label>
              <textarea name="note" rows="2" [(ngModel)]="payNote" placeholder="Optional note"></textarea>
            </div>
            <div class="modal-foot">
              <button class="btn ghost" type="button" (click)="payInvoice.set(null)">Cancel</button>
              <button class="btn primary" type="submit" [disabled]="savingPay() || !payAmount || payAmount <= 0 || payAmount > remainingFor(inv)">
                {{ savingPay() ? 'Saving…' : 'Record Payment' }}
              </button>
            </div>
          </form>
        }
      </app-modal>

      <!-- Reminder preview modal -->
      <app-modal [open]="!!remindInvoice()" title="Send Payment Reminder" [width]="520" (close)="remindInvoice.set(null)">
        @if (remindInvoice(); as inv) {
          <div class="card">
            <div style="font-size:12px;color:var(--muted);margin-bottom:4px">
              <strong>To:</strong> {{ clientEmail(inv.clientId) || '— no email on file —' }}
            </div>
            <div style="font-size:12px;color:var(--muted);margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid var(--border)">
              <strong>Subject:</strong> Payment reminder — Invoice {{ inv.invoiceNumber }}
            </div>
            <div style="font-family:Georgia,'Times New Roman',serif;font-size:13.5px;line-height:1.7;color:var(--text)">
              Dear {{ clientName(inv.clientId) }},<br><br>
              This is a friendly reminder that invoice <strong>{{ inv.invoiceNumber }}</strong> for
              <strong>{{ fmtINR(inv.totals.total) }}</strong>
              @if (overdueDays(inv) > 0) {
                was due on <strong>{{ fmtDate(inv.dueDate) }}</strong> and is now {{ overdueDays(inv) }} day(s) overdue.
              } @else {
                is due on <strong>{{ fmtDate(inv.dueDate) }}</strong>.
              }
              <br><br>
              We would appreciate payment at your earliest convenience.<br><br>
              Warm regards,<br>{{ orgName() }}
            </div>
          </div>
          <div class="modal-foot">
            <button class="btn ghost" type="button" (click)="remindInvoice.set(null)">Cancel</button>
            <button class="btn primary" type="button" [disabled]="sendingReminder()" (click)="sendReminder()">
              {{ sendingReminder() ? 'Sending…' : 'Send Reminder' }}
            </button>
          </div>
        }
      </app-modal>
      <!-- Void payment confirm modal. Voids rather than deletes: the record
           stays in the audit trail while the invoice balance reopens. -->
      <app-modal [open]="!!voidTarget()" title="Void this payment?" [width]="460" (close)="voidTarget.set(null)">
        @if (voidTarget(); as p) {
          <p style="margin:0 0 14px;color:var(--muted);line-height:1.6">
            This reverses <strong style="color:var(--text)">{{ fmtINR(p.amount) }}</strong> recorded against
            <strong style="color:var(--text)">{{ invoiceNo(p) }}</strong>. The payment stays in your history marked
            as voided, and the invoice goes back to showing the amount as due.
          </p>
          <div class="field">
            <label>Reason (optional)</label>
            <input [(ngModel)]="voidReason" placeholder="e.g. entered twice">
          </div>
          <div class="modal-foot">
            <button class="btn ghost" type="button" (click)="voidTarget.set(null)">Cancel</button>
            <button class="btn danger" type="button" [disabled]="voiding()" (click)="confirmVoid()">
              {{ voiding() ? 'Voiding…' : 'Void Payment' }}
            </button>
          </div>
        }
      </app-modal>

      <!-- Remind All confirm modal -->
      <app-modal [open]="confirmRemindAll()" title="Remind All" (close)="confirmRemindAll.set(false)">
        <p style="margin:0;color:var(--muted);line-height:1.6">
          Chases every client with a pending, partial or overdue invoice
          (<strong style="color:var(--text)">{{ due.total() }}</strong> invoice{{ due.total() === 1 ? '' : 's' }}).
          Invoices with no email on file are skipped, and anyone already reminded at
          this stage will not be emailed twice. This runs in the background, so you
          can carry on working.
        </p>
        <div class="modal-foot">
          <button class="btn ghost" type="button" (click)="confirmRemindAll.set(false)">Cancel</button>
          <button class="btn primary" type="button" [disabled]="remindingAll()" (click)="remindAll()">
            {{ remindingAll() ? 'Sending…' : 'Send Reminders' }}
          </button>
        </div>
      </app-modal>
    </app-shell>
  `
})
export class PaymentsComponent implements OnInit, OnDestroy {
  /**
   * Two independently-paged lists plus one stats call, replacing what used to be
   * "fetch every payment and every invoice, then derive everything in the
   * browser".
   *
   * `due` is the open-invoice tracker: the status filter is applied server-side,
   * and because the API derives 'overdue' from the due date, an invoice that fell
   * due an hour ago is included without waiting for a background sweep.
   */
  due = new ServerList<Invoice>(params => this.api.invoices(params));
  history = new ServerList<Payment>(params => this.api.payments(params));
  /** Organisation-wide collection figures. These are sums over *all* invoices and
   *  payments, so they can only come from the server once the lists are paged. */
  stats = signal<InvoiceStats | null>(null);
  tab = signal<PayTab>('tracker');

  // Record Payment modal
  payInvoice = signal<Invoice | null>(null);
  voidTarget = signal<Payment | null>(null);
  voiding = signal(false);
  voidReason = '';
  savingPay = signal(false);
  payAmount: number | null = null;
  payMethod = 'Bank Transfer';
  payReference = '';
  payNote = '';

  // Reminder modal
  remindInvoice = signal<Invoice | null>(null);
  sendingReminder = signal(false);
  confirmRemindAll = signal(false);
  remindingAll = signal(false);
  exporting = signal(false);

  methods = ['Bank Transfer', 'UPI', 'NEFT', 'RTGS', 'Razorpay', 'Cheque', 'Cash'];

  fmtINR = fmtINR;
  fmtDate = fmtDate;

  // Every figure below is organisation-wide, so it comes from the stats
  // endpoint's aggregation rather than from a reduction over a downloaded array.
  totalCollected = computed(() => this.stats()?.totalRevenue ?? 0);
  successCount = computed(() => this.history.total());
  // Outstanding money is the sum of unpaid *balances*, not of invoice totals —
  // the latter overstates it by everything already received against part-paid
  // invoices.
  pendingAmount = computed(() => this.stats()?.pendingAmount ?? 0);
  overdueAmount = computed(() => this.stats()?.overdueAmount ?? 0);
  openCount = computed(() => this.stats()?.counts.pending ?? 0);
  overdueCount = computed(() => this.stats()?.counts.overdue ?? 0);
  avgCollectionDays = computed<number | null>(() => this.stats()?.avgCollectionDays ?? null);

  constructor(private api: ApiService, private toast: ToastService, private auth: AuthService) {
    // The tracker only ever shows invoices with money outstanding, and the
    // soonest-due first — which is the order someone chasing payment works in.
    this.due.filters.set({ status: 'unpaid' });
    this.due.sort.set('dueDate');
    this.due.pageSize.set(10);
    this.history.pageSize.set(10);
  }

  ngOnInit() { this.load(); }

  ngOnDestroy() {
    this.due.dispose();
    this.history.dispose();
  }

  load() {
    this.due.load();
    this.history.load();
    this.api.invoiceStats().subscribe({
      next: stats => this.stats.set(stats),
      error: err => this.toast.httpError(err)
    });
  }

  // ── Helpers ──────────────────────────────────
  private clientOf(c: Client | string | null | undefined): Client | null {
    return c && typeof c === 'object' ? c : null;
  }

  clientName(c: Client | string | null | undefined): string {
    return this.clientOf(c)?.companyName || 'Unknown client';
  }

  clientEmail(c: Client | string | null | undefined): string {
    return this.clientOf(c)?.email || '';
  }

  invoiceNo(p: Payment): string {
    return typeof p.invoiceId === 'object' && p.invoiceId ? p.invoiceId.invoiceNumber : '—';
  }

  overdueDays(inv: Invoice): number {
    return daysBetween(inv.dueDate);
  }

  /**
   * Outstanding balance for an invoice.
   *
   * `balanceDue` is persisted by the backend and accounts for voided payments and
   * credit notes, so it is simply read. There used to be a fallback that summed
   * the loaded payment list for invoices predating the field — which is no longer
   * possible (the payment list is a page, not the whole set) and no longer needed:
   * every read path now runs `recalculateSettlement`, so a document that lacked
   * the field has been backfilled the first time anyone touched it.
   */
  remainingFor(inv: Invoice): number {
    return inv.balanceDue ?? Math.max(0, inv.totals?.total || 0);
  }

  orgName(): string {
    return this.auth.organisation()?.name || 'The Accounts Team';
  }

  // ── Record payment ───────────────────────────
  openPay(inv: Invoice) {
    this.payAmount = this.remainingFor(inv);
    this.payMethod = 'Bank Transfer';
    this.payReference = '';
    this.payNote = '';
    this.payInvoice.set(inv);
  }

  savePayment() {
    const inv = this.payInvoice();
    if (!inv || !this.payAmount || this.payAmount <= 0) return;
    this.savingPay.set(true);
    this.api.createPayment({
      invoiceId: inv._id,
      amount: this.payAmount,
      method: this.payMethod,
      reference: this.payReference.trim(),
      note: this.payNote.trim()
    }).subscribe({
      next: () => {
        this.savingPay.set(false);
        this.payInvoice.set(null);
        this.toast.success('Payment recorded');
        this.load();
      },
      error: err => { this.savingPay.set(false); this.toast.httpError(err); }
    });
  }

  /** Only an admin may reverse a recorded collection — the API enforces this too. */
  isAdmin(): boolean {
    return this.auth.user()?.role === 'admin';
  }

  confirmVoid() {
    const payment = this.voidTarget();
    if (!payment || this.voiding()) return;
    this.voiding.set(true);
    this.api.voidPayment(payment._id, this.voidReason.trim() || undefined).subscribe({
      next: () => {
        this.voiding.set(false);
        this.voidTarget.set(null);
        this.voidReason = '';
        this.toast.success('Payment voided');
        this.load();
      },
      error: err => { this.voiding.set(false); this.toast.httpError(err); }
    });
  }

  // ── Reminders ────────────────────────────────
  openRemind(inv: Invoice) {
    this.remindInvoice.set(inv);
  }

  sendReminder() {
    const inv = this.remindInvoice();
    if (!inv) return;
    this.sendingReminder.set(true);
    this.api.sendReminder(inv._id).subscribe({
      next: () => {
        this.sendingReminder.set(false);
        this.remindInvoice.set(null);
        this.toast.success('Reminder sent');
      },
      error: err => { this.sendingReminder.set(false); this.toast.httpError(err); }
    });
  }

  remindAll() {
    this.remindingAll.set(true);
    this.api.remindAll().subscribe({
      next: res => {
        this.remindingAll.set(false);
        this.confirmRemindAll.set(false);
        // The sweep now runs in the background, so there is no send count to
        // report yet — claiming "N sent" would be a guess. The per-invoice
        // outcome lands in the reminder log either way.
        this.toast.success(res.message);
      },
      error: err => { this.remindingAll.set(false); this.toast.httpError(err); }
    });
  }

  exportCsv() {
    this.exporting.set(true);
    this.api.exportPaymentsCsv(this.history.params()).subscribe({
      next: blob => { this.exporting.set(false); downloadBlob(blob, 'payments.csv'); },
      error: err => { this.exporting.set(false); this.toast.httpError(err); }
    });
  }
}
