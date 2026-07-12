import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SkeletonRowsComponent } from '../../shared/ui';
import { ApiService } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { Reminder } from '../../core/models';

@Component({
  selector: 'app-super-reminders',
  standalone: true,
  imports: [CommonModule, FormsModule, SkeletonRowsComponent],
  template: `
    <div class="page-head">
      <div>
        <h1>Reminders &amp; Receipts</h1>
        <p>Automated payment communication</p>
      </div>
    </div>

    @if (loading()) {
      <div class="card flush"><app-skeleton-rows [count]="5" /></div>
    } @else {
      <div class="grid grid-2" style="align-items:start;">
        <div style="display:grid;gap:16px;">
          <section class="card">
            <div class="card-title" style="margin-bottom:4px;">Payment Reminder Triggers</div>
            <div class="card-sub" style="margin-bottom:16px;">Emails sent automatically around invoice due dates</div>
            <div style="display:grid;gap:12px;">
              @for (r of reminders(); track r._id) {
                <div style="border:1px solid var(--border);border-radius:10px;padding:12px 14px;">
                  <div style="display:flex;align-items:center;gap:12px;">
                    <label class="switch">
                      <input type="checkbox" [ngModel]="r.enabled" (ngModelChange)="toggle(r, $event)" />
                      <span class="track"></span>
                    </label>
                    <div style="flex:1;">
                      <div style="font-weight:700;font-size:13px;">{{ r.name }}</div>
                      <div style="font-size:11.5px;color:var(--muted);">{{ triggerText(r) }}</div>
                    </div>
                    <button class="btn ghost sm" type="button" (click)="editing.set(editing() === r._id ? '' : r._id)">
                      {{ editing() === r._id ? 'Close' : 'Edit' }}
                    </button>
                  </div>
                  @if (editing() === r._id) {
                    <div class="form" style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border);">
                      <div class="field">
                        <label>Email Subject</label>
                        <input [(ngModel)]="r.subject" />
                        <span class="hint">{{ variablesHint }}</span>
                      </div>
                      <div class="field">
                        <label>Email Body</label>
                        <textarea rows="3" [(ngModel)]="r.template"></textarea>
                      </div>
                      <div><button class="btn primary sm" type="button" (click)="saveReminder(r)">Save</button></div>
                    </div>
                  }
                </div>
              }
            </div>
          </section>

          <section class="card">
            <div class="card-title" style="margin-bottom:14px;">Payment Receipt Settings</div>
            <div class="form">
              <label class="checkbox" style="justify-content:space-between;">
                <span>Auto-send receipt on payment</span>
                <span class="switch"><input type="checkbox" [(ngModel)]="receipt.autoSend" /><span class="track"></span></span>
              </label>
              <label class="checkbox" style="justify-content:space-between;">
                <span>Include invoice copy in receipt</span>
                <span class="switch"><input type="checkbox" [(ngModel)]="receipt.includeInvoiceCopy" /><span class="track"></span></span>
              </label>
              <div class="field"><label>Receipt Subject Line</label><input [(ngModel)]="receipt.subject" /></div>
              <div class="field"><label>Receipt Body Intro</label><textarea rows="2" [(ngModel)]="receipt.bodyIntro"></textarea></div>
              <div><button class="btn primary sm" type="button" [disabled]="saving()" (click)="saveSetting('receipt', receipt, 'Receipt settings saved')">Save Receipt Settings</button></div>
            </div>
          </section>
        </div>

        <div style="display:grid;gap:16px;">
          <section class="card">
            <div class="card-title" style="margin-bottom:14px;">Global Email Settings</div>
            <div class="form">
              <div class="field"><label>Sender Name</label><input [(ngModel)]="email.senderName" /></div>
              <div class="field"><label>Sender Email</label><input [(ngModel)]="email.senderEmail" /></div>
              <div class="field"><label>Reply-To Email</label><input [(ngModel)]="email.replyTo" /></div>
              <div class="field"><label>BCC (optional)</label><input [(ngModel)]="email.bcc" placeholder="admin@klogubizz.com" /></div>
              <div class="field"><label>Email Footer</label><textarea rows="2" [(ngModel)]="email.footer"></textarea></div>
              <div><button class="btn primary sm" type="button" [disabled]="saving()" (click)="saveSetting('email', email, 'Email settings saved')">Save Email Settings</button></div>
            </div>
          </section>

          <section class="card">
            <div class="card-title" style="margin-bottom:14px;">Test Email</div>
            <div class="form">
              <div class="field"><label>Send test to</label><input [(ngModel)]="testTo" placeholder="you@company.com" /></div>
              <div class="field">
                <label>Template to test</label>
                <select [(ngModel)]="testTemplate">
                  @for (r of reminders(); track r._id) { <option [value]="r.name">{{ r.name }}</option> }
                  <option value="receipt">Payment Receipt</option>
                </select>
              </div>
              <div><button class="btn secondary sm" type="button" (click)="sendTest()">Send Test Email</button></div>
            </div>
          </section>
        </div>
      </div>
    }
  `
})
export class SuperRemindersComponent implements OnInit {
  loading = signal(true);
  saving = signal(false);
  reminders = signal<Reminder[]>([]);
  editing = signal('');
  testTo = '';
  testTemplate = '';
  readonly variablesHint = 'Variables: {{invoice_id}} {{client_name}} {{amount}} {{due_date}}';

  receipt: any = { autoSend: true, includeInvoiceCopy: true, subject: '', bodyIntro: '' };
  email: any = { senderName: '', senderEmail: '', replyTo: '', bcc: '', footer: '' };

  constructor(private api: ApiService, private toast: ToastService) {}

  ngOnInit() {
    this.api.superMasters().subscribe({
      next: res => { this.reminders.set(res.reminders); this.loading.set(false); },
      error: err => { this.loading.set(false); this.toast.httpError(err); }
    });
    this.api.superSettings().subscribe({
      next: s => {
        if (s['receipt']) this.receipt = { ...this.receipt, ...s['receipt'] };
        if (s['email']) this.email = { ...this.email, ...s['email'] };
      }
    });
  }

  triggerText(r: Reminder): string {
    if (r.daysOffset === 0) return 'On due date';
    if (r.daysOffset < 0) return `${-r.daysOffset} day(s) before due date`;
    return `${r.daysOffset} day(s) after due date`;
  }

  toggle(r: Reminder, enabled: boolean) {
    this.api.superUpdateReminder(r._id, { enabled }).subscribe({
      next: () => this.toast.success(`${r.name} ${enabled ? 'enabled' : 'disabled'}`),
      error: err => this.toast.httpError(err)
    });
  }

  saveReminder(r: Reminder) {
    this.api.superUpdateReminder(r._id, { subject: r.subject, template: r.template }).subscribe({
      next: () => { this.editing.set(''); this.toast.success('Reminder template saved'); },
      error: err => this.toast.httpError(err)
    });
  }

  saveSetting(key: string, value: unknown, msg: string) {
    this.saving.set(true);
    this.api.superSaveSetting(key, value).subscribe({
      next: () => { this.saving.set(false); this.toast.success(msg); },
      error: err => { this.saving.set(false); this.toast.httpError(err); }
    });
  }

  sendTest() {
    if (!this.testTo.trim()) { this.toast.error('Enter a test recipient email.'); return; }
    this.toast.info('Test email queued (SendGrid is not configured in local mode)');
  }
}
