import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AppShellComponent } from '../../shared/app-shell.component';
import { IconComponent } from '../../shared/icons';
import { AvatarComponent, EmptyStateComponent, ModalComponent, PagerComponent, PillComponent, SkeletonRowsComponent } from '../../shared/ui';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { Client, Invoice, Payment } from '../../core/models';
import { daysBetween, downloadBlob, fmtDate, fmtINR } from '../../core/format';

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
          <div class="sub">{{ pendingInvoices().length }} open invoice{{ pendingInvoices().length === 1 ? '' : 's' }}</div>
        </div>
        <div class="card metric danger">
          <div class="accent"></div>
          <div class="metric-row">
            <span class="label">Overdue Amount</span>
            <span class="m-icon"><app-icon name="alertTriangle" [size]="15" /></span>
          </div>
          <div class="value" style="color:var(--red)">{{ fmtINR(overdueAmount()) }}</div>
          <div class="sub">{{ overdueInvoices().length }} invoice{{ overdueInvoices().length === 1 ? '' : 's' }} past due</div>
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
            <input class="input" type="search" placeholder="Search invoice or client…"
              [ngModel]="trackerQuery()" (ngModelChange)="onTrackerSearch($event)">
          </div>
        </div>
        <div class="card flush">
          @if (loading()) {
            <app-skeleton-rows [count]="5" />
          } @else if (dueInvoices().length === 0) {
            <app-empty-state icon="✓" title="All invoices are paid" message="No pending, partial or overdue invoices right now." />
          } @else if (filteredDue().length === 0) {
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
                    <th>Status</th>
                    <th>Days Due</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  @for (inv of pagedDue(); track inv._id) {
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
                      <td class="strong" data-label="Amount" data-priority="high">{{ fmtINR(inv.totals.total) }}</td>
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
            <app-pager [page]="trackerPage()" [pageSize]="trackerPageSize()" [total]="filteredDue().length"
              (pageChange)="trackerPage.set($event)" (pageSizeChange)="onTrackerPageSize($event)" />
          }
        </div>
      }

      <!-- History -->
      @if (tab() === 'history') {
        <div class="toolbar">
          <div class="search-box">
            <span class="search-icon">⌕</span>
            <input class="input" type="search" placeholder="Search invoice, client, method or reference…"
              [ngModel]="historyQuery()" (ngModelChange)="onHistorySearch($event)">
          </div>
        </div>
        <div class="card flush">
          @if (loading()) {
            <app-skeleton-rows [count]="5" />
          } @else if (payments().length === 0) {
            <app-empty-state icon="◈" title="No payments recorded yet" message="Payments you record will show up here." />
          } @else if (filteredPayments().length === 0) {
            <app-empty-state icon="⌕" title="No matching payments" message="Try a different search term." />
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
                  </tr>
                </thead>
                <tbody>
                  @for (p of pagedPayments(); track p._id) {
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
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <app-pager [page]="historyPage()" [pageSize]="historyPageSize()" [total]="filteredPayments().length"
              (pageChange)="historyPage.set($event)" (pageSizeChange)="onHistoryPageSize($event)" />
          }
        </div>
      }

      <!-- Reminders -->
      @if (tab() === 'reminders') {
        @if (loading()) {
          <div class="card flush"><app-skeleton-rows [count]="4" /></div>
        } @else if (dueInvoices().length === 0) {
          <div class="card flush">
            <app-empty-state icon="📧" title="No pending invoices requiring reminders" message="You are all caught up." />
          </div>
        } @else {
          <div style="display:flex;justify-content:flex-end;margin-bottom:14px">
            <button class="btn secondary sm" type="button" [disabled]="remindingAll()" (click)="confirmRemindAll.set(true)">
              @if (remindingAll()) { <span class="spinner"></span> } <app-icon name="mail" [size]="13" /> Remind All ({{ dueInvoices().length }})
            </button>
          </div>
          <div class="grid grid-2">
            @for (inv of dueInvoices(); track inv._id) {
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
          </div>
          <form class="form" (ngSubmit)="savePayment()">
            <div class="field">
              <label>Amount Received (₹)</label>
              <input name="amount" type="number" min="0" step="0.01" [(ngModel)]="payAmount">
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
              <button class="btn primary" type="submit" [disabled]="savingPay() || !payAmount || payAmount <= 0">
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
      <!-- Remind All confirm modal -->
      <app-modal [open]="confirmRemindAll()" title="Remind All" (close)="confirmRemindAll.set(false)">
        <p style="margin:0;color:var(--muted);line-height:1.6">
          Sends a reminder email to every client with a pending, partial or overdue invoice
          (<strong style="color:var(--text)">{{ dueInvoices().length }}</strong> invoice{{ dueInvoices().length === 1 ? '' : 's' }}).
          Invoices without a client email on file are skipped.
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
export class PaymentsComponent implements OnInit {
  loading = signal(true);
  invoices = signal<Invoice[]>([]);
  payments = signal<Payment[]>([]);
  tab = signal<PayTab>('tracker');

  // Record Payment modal
  payInvoice = signal<Invoice | null>(null);
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

  dueInvoices = computed(() =>
    this.invoices()
      .filter(i => i.status === 'pending' || i.status === 'partial' || i.status === 'overdue')
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
  );
  pendingInvoices = computed(() => this.invoices().filter(i => i.status === 'pending' || i.status === 'partial'));
  overdueInvoices = computed(() => this.invoices().filter(i => i.status === 'overdue'));

  totalCollected = computed(() =>
    this.payments().filter(p => p.status === 'success').reduce((s, p) => s + (p.amount || 0), 0)
  );
  successCount = computed(() => this.payments().filter(p => p.status === 'success').length);
  pendingAmount = computed(() => this.pendingInvoices().reduce((s, i) => s + (i.totals?.total || 0), 0));
  overdueAmount = computed(() => this.overdueInvoices().reduce((s, i) => s + (i.totals?.total || 0), 0));

  avgCollectionDays = computed<number | null>(() => {
    const paid = this.invoices().filter(i => i.status === 'paid' && !!i.paidDate);
    if (paid.length === 0) return null;
    const sum = paid.reduce((s, i) => s + daysBetween(i.date, i.paidDate as string), 0);
    return Math.round(sum / paid.length);
  });

  sortedPayments = computed(() =>
    [...this.payments()].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  );

  // ── Tracker search/pagination ─────────────────
  trackerQuery = signal('');
  trackerPage = signal(1);
  trackerPageSize = signal(10);

  filteredDue = computed(() => {
    const q = this.trackerQuery().trim().toLowerCase();
    if (!q) return this.dueInvoices();
    return this.dueInvoices().filter(inv =>
      `${inv.invoiceNumber} ${this.clientName(inv.clientId)}`.toLowerCase().includes(q)
    );
  });

  pagedDue = computed(() => {
    const start = (this.trackerPage() - 1) * this.trackerPageSize();
    return this.filteredDue().slice(start, start + this.trackerPageSize());
  });

  // ── History search/pagination ─────────────────
  historyQuery = signal('');
  historyPage = signal(1);
  historyPageSize = signal(10);

  filteredPayments = computed(() => {
    const q = this.historyQuery().trim().toLowerCase();
    if (!q) return this.sortedPayments();
    return this.sortedPayments().filter(p =>
      `${this.invoiceNo(p)} ${this.clientName(p.clientId)} ${p.method} ${p.reference || ''}`.toLowerCase().includes(q)
    );
  });

  pagedPayments = computed(() => {
    const start = (this.historyPage() - 1) * this.historyPageSize();
    return this.filteredPayments().slice(start, start + this.historyPageSize());
  });

  constructor(private api: ApiService, private toast: ToastService, private auth: AuthService) {}

  onTrackerSearch(v: string) { this.trackerQuery.set(v); this.trackerPage.set(1); }
  onTrackerPageSize(v: number) { this.trackerPageSize.set(v); this.trackerPage.set(1); }
  onHistorySearch(v: string) { this.historyQuery.set(v); this.historyPage.set(1); }
  onHistoryPageSize(v: number) { this.historyPageSize.set(v); this.historyPage.set(1); }

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    forkJoin({ payments: this.api.payments(), invoices: this.api.invoices() }).subscribe({
      next: res => {
        this.payments.set(res.payments);
        this.invoices.set(res.invoices);
        this.loading.set(false);
      },
      error: err => { this.loading.set(false); this.toast.httpError(err); }
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

  private invoiceIdOf(p: Payment): string {
    return typeof p.invoiceId === 'object' && p.invoiceId ? p.invoiceId._id : p.invoiceId;
  }

  overdueDays(inv: Invoice): number {
    return daysBetween(inv.dueDate);
  }

  remainingFor(inv: Invoice): number {
    const paid = this.payments()
      .filter(p => p.status === 'success' && this.invoiceIdOf(p) === inv._id)
      .reduce((s, p) => s + (p.amount || 0), 0);
    return Math.max(0, Math.round(((inv.totals?.total || 0) - paid) * 100) / 100);
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
        this.toast.success(`${res.sent} reminder${res.sent === 1 ? '' : 's'} sent${res.skipped ? `, ${res.skipped} skipped (no email on file)` : ''}`);
      },
      error: err => { this.remindingAll.set(false); this.toast.httpError(err); }
    });
  }

  exportCsv() {
    this.exporting.set(true);
    this.api.exportPaymentsCsv().subscribe({
      next: blob => { this.exporting.set(false); downloadBlob(blob, 'payments.csv'); },
      error: err => { this.exporting.set(false); this.toast.httpError(err); }
    });
  }
}
