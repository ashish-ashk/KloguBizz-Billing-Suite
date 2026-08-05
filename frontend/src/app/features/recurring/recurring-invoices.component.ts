import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AppShellComponent } from '../../shared/app-shell.component';
import { IconComponent } from '../../shared/icons';
import {
  EmptyStateComponent, ModalComponent, PagerComponent, PillComponent, SkeletonRowsComponent, OverflowMenuComponent
} from '../../shared/ui';
import { ApiService } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { ServerList } from '../../core/server-list';
import {
  Client, InvoiceItem, RecurrenceFrequency, RecurringInvoice, RecurringInvoiceRun
} from '../../core/models';
import { fmtINR, fmtDate, today } from '../../core/format';

const FREQUENCIES: Array<{ value: RecurrenceFrequency; label: string }> = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
  // Present and labelled honestly rather than hidden: it is genuinely useful for
  // checking a schedule works without waiting a month.
  { value: 'daily', label: 'Daily (mostly for testing a schedule)' }
];

/**
 * Recurring invoices (2.2 #14).
 *
 * Retainers, AMCs and rent are the same invoice every month, and re-typing one
 * is both tedious and the likeliest thing in the product to be forgotten — an
 * invoice nobody raised is revenue nobody collects.
 *
 * The screen is built around two things the tenant needs to trust:
 *
 *  - **What will happen next, and when.** The next three dates are shown, not
 *    just a frequency word, because "every quarter" plus a start date is not
 *    something anyone can reliably picture.
 *  - **What already happened, including the failures.** A schedule that stopped
 *    invoicing because the plan's quota ran out has to say so on the row. That
 *    is what the "behind" badge and the run history are for.
 *
 * `generateAsDraft` is offered prominently because it is the safe way to adopt
 * this: the typing is done, the decision to issue stays with a human, and a
 * wrong rate in a template is caught before a customer sees it.
 */
@Component({
  selector: 'app-recurring-invoices',
  standalone: true,
  imports: [
    CommonModule, FormsModule, AppShellComponent, IconComponent,
    EmptyStateComponent, ModalComponent, PagerComponent, PillComponent,
    SkeletonRowsComponent, OverflowMenuComponent
  ],
  template: `
    <app-shell title="Recurring Invoices"
      subtitle="Raise the same invoice on a schedule — retainers, AMCs, rent, subscriptions">
      <button actions class="btn primary" type="button" (click)="openCreate()">
        <app-icon name="plus" [size]="14" /> New Schedule
      </button>

      @if (behindCount() > 0) {
        <!-- A schedule that has stopped invoicing is the failure mode that costs
             real money, so it is surfaced above the table rather than only on the
             row. -->
        <div class="info-box warn" style="margin-bottom:18px;display:flex;gap:10px;align-items:flex-start;">
          <app-icon name="alertTriangle" [size]="16" style="flex-shrink:0;margin-top:1px" />
          <div style="line-height:1.6;">
            <strong>{{ behindCount() }} schedule{{ behindCount() === 1 ? ' is' : 's are' }} behind.</strong>
            They should have invoiced by now. Open one to see why — the usual cause is the
            monthly invoice limit on your plan.
          </div>
        </div>
      }

      <div class="card">
        <div class="card-head" style="gap:10px;flex-wrap:wrap;">
          <input class="input" style="max-width:260px;" placeholder="Search schedules…"
            [ngModel]="list.search()" (ngModelChange)="list.onSearch($event)" />
          <select class="input" style="max-width:170px;" [ngModel]="statusFilter()" (ngModelChange)="setStatus($event)">
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        @if (list.loading()) {
          <app-skeleton-rows [count]="4" />
        } @else if (list.failed()) {
          <app-empty-state icon="⚠" title="Could not load"
            message="Something went wrong fetching your schedules." />
          <div class="actions" style="justify-content:center;padding-bottom:14px;">
            <button class="btn secondary sm" type="button" (click)="list.refresh()">Try again</button>
          </div>
        } @else if (!list.rows().length) {
          <app-empty-state icon="◷" title="No recurring invoices yet"
            message="Set one up for a retainer or an AMC and it will be raised for you every period." />
        } @else {
          <div class="table-wrap">
            <table class="table stack-mobile">
              <thead>
                <tr>
                  <th>Schedule</th>
                  <th>Customer</th>
                  <th>Every</th>
                  <th>Next</th>
                  <th class="num">Amount</th>
                  <th class="num">Raised</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (s of list.rows(); track s._id) {
                  <tr>
                    <td data-label="Schedule">
                      <div style="font-weight:600;">{{ s.title }}</div>
                      @if (s.generateAsDraft) {
                        <div style="font-size:11px;color:var(--muted);">Creates a draft</div>
                      } @else if (s.autoSend) {
                        <div style="font-size:11px;color:var(--muted);">Issues &amp; emails</div>
                      }
                    </td>
                    <td data-label="Customer">{{ customerName(s) }}</td>
                    <td data-label="Every">{{ s.scheduleLabel }}</td>
                    <td data-label="Next">
                      @if (s.status === 'active') {
                        <span [style.color]="s.isBehind ? 'var(--amber)' : null">{{ fmtDate(s.nextRunAt) }}</span>
                        @if (s.isBehind) {
                          <div style="font-size:11px;color:var(--amber);font-weight:600;">
                            {{ s.periodsBehind }} period{{ s.periodsBehind === 1 ? '' : 's' }} behind
                          </div>
                        }
                      } @else { — }
                    </td>
                    <td data-label="Amount" class="num">{{ fmtINR(amountOf(s)) }}</td>
                    <td data-label="Raised" class="num">
                      {{ s.occurrences }}@if (s.endAfterCount) { <span style="color:var(--muted);">/{{ s.endAfterCount }}</span> }
                    </td>
                    <td data-label="Status">
                      <app-pill [status]="s.status" />
                      @if (s.lastError) {
                        <div style="font-size:11px;color:var(--red);margin-top:3px;max-width:220px;">{{ s.lastError }}</div>
                      }
                    </td>
                    <td data-label="" class="row-actions">
                      <app-overflow-menu>
                        <button type="button" (click)="openHistory(s)">Run history</button>
                        @if (s.status === 'active' || s.status === 'paused') {
                          <button type="button" (click)="openEdit(s)">Edit</button>
                        }
                        @if (s.status === 'active') {
                          <button type="button" (click)="askRunNow(s)">Raise invoice now</button>
                          <button type="button" (click)="setStatus2(s, 'paused')">Pause</button>
                        }
                        @if (s.status === 'paused') {
                          <button type="button" (click)="setStatus2(s, 'active')">Resume</button>
                        }
                        @if (s.lastInvoiceId) {
                          <button type="button" (click)="openLastInvoice(s)">View last invoice</button>
                        }
                        <button type="button" class="danger" (click)="remove(s)">Delete</button>
                      </app-overflow-menu>
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

      <!-- Create / edit -->
      <app-modal [open]="showForm()" [title]="editingId ? 'Edit schedule' : 'New recurring invoice'" [width]="760" (close)="closeForm()">
        <div class="grid grid-2" style="gap:12px;">
          <div class="field">
            <label>What is this for?</label>
            <input [(ngModel)]="form.title" placeholder="Acme monthly retainer">
          </div>
          <div class="field">
            <label>Customer</label>
            <select [(ngModel)]="form.clientId">
              <option value="">Select a customer…</option>
              @for (c of clients(); track c._id) { <option [value]="c._id">{{ c.companyName }}</option> }
            </select>
          </div>
          <div class="field">
            <label>Every</label>
            <select [(ngModel)]="form.frequency">
              @for (f of frequencies; track f.value) { <option [value]="f.value">{{ f.label }}</option> }
            </select>
          </div>
          <div class="field">
            <label>Repeat every N periods</label>
            <input type="number" min="1" max="60" [(ngModel)]="form.interval">
          </div>
          <div class="field">
            <label>First invoice on</label>
            <input type="date" [(ngModel)]="form.startDate">
          </div>
          <div class="field">
            <label>Payment due after (days)</label>
            <input type="number" min="0" max="365" [(ngModel)]="form.dueInDays">
          </div>
          <div class="field">
            <label>Stop after N invoices (optional)</label>
            <input type="number" min="1" [(ngModel)]="form.endAfterCount" placeholder="Leave blank for open-ended">
          </div>
          <div class="field">
            <label>Or stop on (optional)</label>
            <input type="date" [(ngModel)]="form.endsOn">
          </div>
        </div>

        <div class="form-section-title" style="margin-top:14px;">What to invoice</div>
        @for (item of form.items; track $index) {
          <div class="line-grid">
            <div class="field"><label>Description</label><input [(ngModel)]="item.desc"></div>
            <div class="field"><label>HSN/SAC</label><input class="mono" [(ngModel)]="item.hsn"></div>
            <div class="field"><label>Qty</label><input type="number" min="0" [(ngModel)]="item.qty"></div>
            <div class="field"><label>Rate</label><input type="number" min="0" [(ngModel)]="item.rate"></div>
            <div class="field">
              <label>GST %</label>
              <select [(ngModel)]="item.gstRate">
                @for (r of gstRates; track r) { <option [value]="r">{{ r }}%</option> }
              </select>
            </div>
            <button class="btn ghost sm" type="button" [disabled]="form.items.length === 1" (click)="removeLine($index)">
              <app-icon name="trash" [size]="13" />
            </button>
          </div>
        }
        <button class="btn secondary sm" type="button" style="margin-top:6px;" (click)="addLine()">
          <app-icon name="plus" [size]="13" /> Add line
        </button>

        <div class="form-section-title" style="margin-top:16px;">How it should behave</div>
        <label class="check-row">
          <input type="checkbox" [(ngModel)]="form.generateAsDraft" (ngModelChange)="onDraftToggle()">
          <span>
            <strong>Create as a draft</strong> — nothing is issued or numbered until you review it.
            The safest way to start.
          </span>
        </label>
        <label class="check-row" [class.disabled]="form.generateAsDraft">
          <input type="checkbox" [(ngModel)]="form.autoSend" [disabled]="form.generateAsDraft">
          <span>
            <strong>Email it to the customer automatically</strong> — off by default, because an
            invoice sent unreviewed cannot be taken back.
            @if (form.generateAsDraft) { <em>Not available for drafts: there is nothing to send.</em> }
          </span>
        </label>

        <div class="field" style="margin-top:12px;">
          <label>Notes on every generated invoice</label>
          <input [(ngModel)]="form.notes">
        </div>

        <div class="modal-foot">
          <button class="btn ghost" type="button" (click)="closeForm()">Cancel</button>
          <button class="btn primary" type="button" [disabled]="saving() || !canSave()" (click)="save()">
            @if (saving()) { <span class="spinner"></span> } {{ editingId ? 'Save changes' : 'Create schedule' }}
          </button>
        </div>
      </app-modal>

      <!-- Run history -->
      <app-modal [open]="!!historyFor()" [title]="'Run history — ' + (historyFor()?.title || '')" [width]="640" (close)="historyFor.set(null)">
        @if (historyLoading()) {
          <app-skeleton-rows [count]="3" />
        } @else if (!runs().length) {
          <app-empty-state icon="◷" title="No runs yet"
            message="This schedule has not raised an invoice yet." />
        } @else {
          <div class="table-wrap">
            <table class="table">
              <thead><tr><th>Period</th><th>When</th><th>Result</th><th class="num">Amount</th></tr></thead>
              <tbody>
                @for (r of runs(); track r._id) {
                  <tr>
                    <td class="mono">{{ r.periodKey }}</td>
                    <td>{{ fmtDate(r.scheduledFor) }}</td>
                    <td>
                      <app-pill [status]="r.status === 'generated' ? 'paid' : (r.status === 'failed' ? 'overdue' : 'draft')" />
                      @if (r.invoiceNumber) { <span class="mono" style="margin-left:6px;font-size:11.5px;">{{ r.invoiceNumber }}</span> }
                      @if (r.reason) { <div style="font-size:11px;color:var(--red);">{{ r.reason }}</div> }
                      @if (r.trigger === 'manual') { <div style="font-size:11px;color:var(--muted);">Raised manually</div> }
                    </td>
                    <td class="num">{{ r.total ? fmtINR(r.total) : '—' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </app-modal>

      <!-- Run now confirmation -->
      <app-modal [open]="!!runTarget()" title="Raise this invoice now" [width]="500" (close)="runTarget.set(null)">
        @if (runTarget(); as s) {
          <p style="margin:0 0 12px;line-height:1.7;">
            Raises the invoice for <strong>{{ s.nextPeriodKey }}</strong> from
            <strong>{{ s.title }}</strong> immediately.
          </p>
          <div class="info-box" style="display:flex;gap:8px;align-items:flex-start;">
            <app-icon name="alertTriangle" [size]="14" style="flex-shrink:0;margin-top:1px" />
            <span>
              This is the same invoice the schedule would raise on its own, so doing it now means
              it will <strong>not</strong> be raised again for this period. The schedule then moves
              on to {{ fmtDate(s.nextRuns[1] || s.nextRunAt) }}.
            </span>
          </div>
          <div class="modal-foot">
            <button class="btn ghost" type="button" (click)="runTarget.set(null)">Cancel</button>
            <button class="btn primary" type="button" [disabled]="saving()" (click)="doRunNow()">
              @if (saving()) { <span class="spinner"></span> } Raise invoice
            </button>
          </div>
        }
      </app-modal>
    </app-shell>
  `,
  styles: [`
    .line-grid {
      display:grid; gap:8px; align-items:end; margin-bottom:8px;
      grid-template-columns: 2fr 1fr 0.7fr 1fr 0.9fr auto;
    }
    @media (max-width: 720px) {
      .line-grid {
        grid-template-columns: 1fr 1fr;
        border:1px solid var(--border); border-radius:10px; padding:10px; margin-bottom:10px;
      }
    }
    .check-row {
      display:flex; gap:9px; align-items:flex-start; padding:9px 0;
      font-size:13px; line-height:1.6; cursor:pointer;
    }
    .check-row input { margin-top:3px; flex-shrink:0; }
    .check-row.disabled { opacity:0.6; cursor:default; }
    .check-row em { color:var(--muted); font-style:normal; display:block; font-size:12px; }
  `]
})
export class RecurringInvoicesComponent implements OnInit, OnDestroy {
  statusFilter = signal('');
  saving = signal(false);
  showForm = signal(false);
  clients = signal<Client[]>([]);
  historyFor = signal<RecurringInvoice | null>(null);
  historyLoading = signal(false);
  runs = signal<RecurringInvoiceRun[]>([]);
  runTarget = signal<RecurringInvoice | null>(null);
  behindCount = signal(0);

  list = new ServerList<RecurringInvoice>(params => this.api.recurringInvoices(params));

  editingId: string | null = null;
  form = this.blankForm();

  frequencies = FREQUENCIES;
  gstRates = [0, 0.25, 3, 5, 12, 18, 28];
  fmtINR = fmtINR;
  fmtDate = fmtDate;

  constructor(private api: ApiService, private toast: ToastService, private router: Router) {}

  ngOnInit() {
    this.list.refresh();
    this.api.clients({ limit: 200 }).subscribe({ next: page => this.clients.set(page.data), error: () => {} });
    this.refreshBehind();
  }

  ngOnDestroy() { this.list.dispose(); }

  /** How many schedules are overdue to run. Read from the dry-run preview rather
   *  than counted in the browser, so it is right even past the first page. */
  private refreshBehind() {
    this.api.recurringPreview().subscribe({
      next: preview => this.behindCount.set(preview.invoices.filter(i => i.periodsBehind > 1).length),
      error: () => this.behindCount.set(0)
    });
  }

  setStatus(status: string) {
    this.statusFilter.set(status);
    this.list.setFilter('status', status || undefined);
  }

  customerName(schedule: RecurringInvoice): string {
    const client = schedule.clientId;
    if (client && typeof client === 'object') return client.companyName;
    return schedule.billTo?.name || '—';
  }

  /** The template's own total, before tax — enough for the list to be scannable
   *  without recomputing GST in the browser, which would risk disagreeing with
   *  the server. */
  amountOf(schedule: RecurringInvoice): number {
    return (schedule.items || []).reduce((sum, item) => sum + (Number(item.qty) || 0) * (Number(item.rate) || 0), 0);
  }

  // ── Form ─────────────────────────────────────

  private blankForm() {
    return {
      title: '',
      clientId: '',
      frequency: 'monthly' as RecurrenceFrequency,
      interval: 1,
      startDate: today(),
      dueInDays: 15,
      endAfterCount: null as number | null,
      endsOn: '',
      generateAsDraft: false,
      autoSend: false,
      notes: '',
      items: [{ desc: '', hsn: '', qty: 1, rate: 0, gstRate: 18 }] as InvoiceItem[]
    };
  }

  openCreate() {
    this.editingId = null;
    this.form = this.blankForm();
    this.showForm.set(true);
  }

  openEdit(schedule: RecurringInvoice) {
    this.editingId = schedule._id;
    const client = schedule.clientId;
    this.form = {
      title: schedule.title,
      clientId: client ? (typeof client === 'object' ? client._id : client) : '',
      frequency: schedule.frequency,
      interval: schedule.interval || 1,
      startDate: (schedule.startDate || '').slice(0, 10),
      dueInDays: schedule.dueInDays ?? 15,
      endAfterCount: schedule.endAfterCount ?? null,
      endsOn: (schedule.endsOn || '').slice(0, 10),
      generateAsDraft: schedule.generateAsDraft,
      autoSend: schedule.autoSend,
      notes: schedule.notes || '',
      items: schedule.items.map(item => ({ ...item }))
    };
    this.showForm.set(true);
  }

  closeForm() {
    this.showForm.set(false);
    this.editingId = null;
  }

  /** Mirrors the server rule: there is nothing to email from a draft, so the two
   *  options are mutually exclusive rather than silently contradictory. */
  onDraftToggle() {
    if (this.form.generateAsDraft) this.form.autoSend = false;
  }

  addLine() { this.form.items = [...this.form.items, { desc: '', hsn: '', qty: 1, rate: 0, gstRate: 18 }]; }
  removeLine(index: number) { this.form.items = this.form.items.filter((_, i) => i !== index); }

  canSave(): boolean {
    return Boolean(this.form.title.trim())
      && Boolean(this.form.clientId)
      && this.form.items.some(item => item.desc?.trim() && Number(item.qty) > 0);
  }

  private payload() {
    return {
      title: this.form.title.trim(),
      clientId: this.form.clientId,
      frequency: this.form.frequency,
      interval: Number(this.form.interval) || 1,
      startDate: this.form.startDate || undefined,
      dueInDays: Number(this.form.dueInDays) || 0,
      endAfterCount: this.form.endAfterCount ? Number(this.form.endAfterCount) : undefined,
      endsOn: this.form.endsOn || undefined,
      generateAsDraft: this.form.generateAsDraft,
      autoSend: this.form.autoSend,
      notes: this.form.notes || undefined,
      items: this.form.items
        .filter(item => item.desc?.trim())
        .map(item => ({ ...item, qty: Number(item.qty), rate: Number(item.rate), gstRate: Number(item.gstRate) }))
    };
  }

  save() {
    this.saving.set(true);
    const done = (message: string) => {
      this.saving.set(false);
      this.closeForm();
      this.list.refresh();
      this.refreshBehind();
      this.toast.success(message);
    };
    const failed = (err: unknown) => { this.saving.set(false); this.toast.httpError(err); };

    if (this.editingId) {
      this.api.updateRecurringInvoice(this.editingId, this.payload() as Partial<RecurringInvoice>)
        .subscribe({ next: s => done(`${s.title} saved`), error: failed });
    } else {
      this.api.createRecurringInvoice(this.payload() as Parameters<ApiService['createRecurringInvoice']>[0])
        .subscribe({ next: s => done(`${s.title} will run ${s.scheduleLabel.toLowerCase()}`), error: failed });
    }
  }

  // ── Lifecycle ────────────────────────────────

  setStatus2(schedule: RecurringInvoice, status: 'active' | 'paused') {
    this.api.setRecurringStatus(schedule._id, status).subscribe({
      next: updated => {
        this.list.refresh();
        this.refreshBehind();
        this.toast.success(status === 'active'
          ? `${schedule.title} resumed — next invoice ${fmtDate(updated.nextRunAt)}`
          : `${schedule.title} paused`);
      },
      error: err => this.toast.httpError(err)
    });
  }

  askRunNow(schedule: RecurringInvoice) { this.runTarget.set(schedule); }

  doRunNow() {
    const schedule = this.runTarget();
    if (!schedule) return;
    this.saving.set(true);
    this.api.runRecurringNow(schedule._id).subscribe({
      next: res => {
        this.saving.set(false);
        this.runTarget.set(null);
        this.list.refresh();
        this.refreshBehind();
        this.toast.success(`Invoice ${res.invoice.invoiceNumber} raised`);
        this.router.navigateByUrl(`/invoices/${res.invoice._id}/print`);
      },
      error: err => { this.saving.set(false); this.toast.httpError(err); }
    });
  }

  openHistory(schedule: RecurringInvoice) {
    this.historyFor.set(schedule);
    this.historyLoading.set(true);
    this.runs.set([]);
    this.api.recurringRuns(schedule._id, { limit: 50 }).subscribe({
      next: page => { this.runs.set(page.data); this.historyLoading.set(false); },
      error: err => { this.historyLoading.set(false); this.toast.httpError(err); }
    });
  }

  openLastInvoice(schedule: RecurringInvoice) {
    if (schedule.lastInvoiceId) this.router.navigateByUrl(`/invoices/${schedule.lastInvoiceId}/print`);
  }

  remove(schedule: RecurringInvoice) {
    this.api.deleteRecurringInvoice(schedule._id).subscribe({
      next: () => {
        this.list.refresh();
        this.refreshBehind();
        this.toast.info(`${schedule.title} deleted — it will not raise any more invoices`);
      },
      error: err => this.toast.httpError(err)
    });
  }
}
