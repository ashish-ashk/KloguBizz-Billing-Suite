import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppShellComponent } from '../../shared/app-shell.component';
import { IconComponent } from '../../shared/icons';
import { ModalComponent } from '../../shared/ui';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { MfaEnrolmentComponent } from '../../shared/mfa-enrolment.component';
import { DataRightsStatus, DeviceSession } from '../../core/models';
import { downloadBlob, fmtDate } from '../../core/format';

/**
 * Account security and data rights.
 *
 * Three previously-missing things on one page, because they are the three questions a
 * cautious customer asks and they were all unanswerable: how do I make this account
 * harder to break into (#7), is my email address confirmed (#52), and can I get my data
 * out or have it deleted (#62).
 *
 * The MFA enrolment UI has moved to `shared/mfa-enrolment.component.ts` so the
 * platform console can use the same one — see that file for why (the console's
 * copy had gone stale enough to claim the feature did not exist).
 */
@Component({
  selector: 'app-account-security',
  standalone: true,
  imports: [
    CommonModule, FormsModule, AppShellComponent, IconComponent, ModalComponent,
    MfaEnrolmentComponent
  ],
  template: `
    <app-shell title="Security &amp; Privacy" subtitle="Two-factor authentication, your email address, and your data">
      <div class="grid grid-2" style="align-items:start">
        <div style="display:grid;gap:16px">
          <!-- Email verification (#52) -->
          <section class="card">
            <div class="card-title">Email address</div>
            <div class="card-sub" style="margin-bottom:14px">{{ auth.user()?.email }}</div>
            @if (verified()) {
              <div class="info-box ok" style="display:flex;gap:8px;align-items:flex-start">
                <app-icon name="checkCircle" [size]="15" style="flex-shrink:0;margin-top:1px" />
                <span>Confirmed. Password resets and invoice emails will reach you.</span>
              </div>
            } @else {
              <div class="info-box warn" style="display:flex;gap:8px;align-items:flex-start">
                <app-icon name="alertTriangle" [size]="15" style="flex-shrink:0;margin-top:1px" />
                <span>
                  Not confirmed yet. Until it is, a password reset cannot reach you —
                  a mistyped address is an account with no recovery path.
                </span>
              </div>
              <div class="actions" style="justify-content:flex-end;margin-top:12px">
                <button class="btn secondary sm" type="button" [disabled]="busy()" (click)="resendVerification()">
                  @if (busy()) { <span class="spinner"></span> } Send a new link
                </button>
              </div>
              @if (verifyUrl()) {
                <div class="stat-block" style="margin-top:10px">
                  <div class="sb-label">Verification link (no email provider configured)</div>
                  <div class="sb-value mono" style="word-break:break-all;font-size:11px">{{ verifyUrl() }}</div>
                </div>
              }
            }
          </section>

          <!--
            The enrolment UI lives in a shared component so the platform console
            can use exactly the same one. It previously existed only here, and the
            console page said "Not available yet" long after MFA had shipped —
            which made the console a dead end for an operator the server was
            actively blocking. One copy cannot drift like that.
          -->
          <app-mfa-enrolment />
        </div>

        <!-- Data rights (#62) -->
        <section class="card">
          <div class="card-title">Your data</div>
          <div class="card-sub" style="margin-bottom:14px">
            Take a complete copy at any time, or close the account for good
          </div>

          @if (rights(); as r) {
            <div class="grid grid-2" style="gap:10px;margin-bottom:14px">
              @for (entry of recordEntries(r); track entry[0]) {
                <div class="stat-block">
                  <div class="sb-label">{{ entry[0] }}</div>
                  <div class="sb-value">{{ entry[1] }}</div>
                </div>
              }
            </div>

            <div class="actions" style="justify-content:flex-end">
              <button class="btn secondary" type="button" [disabled]="busy()" (click)="exportData()">
                @if (busy()) { <span class="spinner"></span> } <app-icon name="download" [size]="14" /> Export everything
              </button>
            </div>

            @if (r.deletion.requested) {
              <div class="info-box danger" style="margin-top:14px;display:flex;gap:8px;align-items:flex-start">
                <app-icon name="alertTriangle" [size]="15" style="flex-shrink:0;margin-top:1px" />
                <span>
                  <strong>Deletion scheduled for {{ fmtDate(r.deletion.scheduledFor) }}.</strong><br />
                  Requested by {{ r.deletion.requestedBy }}. Until then you can still sign in,
                  export your records, and cancel this.
                </span>
              </div>
              <div class="actions" style="justify-content:flex-end;margin-top:12px">
                <button class="btn success" type="button" [disabled]="busy()" (click)="cancelDeletion()">Cancel deletion</button>
              </div>
            } @else if (r.isOwner) {
              <div class="form-section-title" style="margin-top:20px">Close this account</div>
              <p style="margin:0 0 12px;font-size:12.5px;line-height:1.7;color:var(--text-mid)">
                Everything — invoices, clients, purchases, users — is permanently deleted after a
                {{ r.deletion.graceDays }}-day grace period. Export first: a business is usually
                required to retain tax records for years, and this is not reversible once the
                window closes.
              </p>
              <div class="actions" style="justify-content:flex-end">
                <button class="btn danger" type="button" (click)="showDelete.set(true)">Delete account…</button>
              </div>
            } @else {
              <div class="card-sub" style="margin-top:16px">
                Only the account owner can delete the organisation.
              </div>
            }
          }
        </section>
      </div>

      <!-- Active sessions (#50, #51) -->
      <section class="card" style="margin-top:16px">
        <div class="card-title">Active sessions</div>
        <div class="card-sub" style="margin-bottom:14px">
          Every device currently signed in to your account. Sessions expire on their own after
          {{ 30 }} days, or end them here right away.
        </div>
        @if (sessions().length) {
          <div style="display:grid;gap:8px">
            @for (s of sessions(); track s.id) {
              <div class="stat-block" style="display:flex;align-items:center;justify-content:space-between;gap:12px">
                <div>
                  <div class="sb-value" style="font-size:13px">{{ s.userAgent || 'Unknown device' }}</div>
                  <div class="sb-label">
                    {{ s.ip || 'Unknown location' }} · last active {{ fmtDate(s.lastSeenAt) }}
                  </div>
                </div>
                <button class="btn secondary sm" type="button" [disabled]="revoking() === s.id" (click)="endSession(s)">
                  @if (revoking() === s.id) { <span class="spinner"></span> } Sign out
                </button>
              </div>
            }
          </div>
        } @else {
          <div class="card-sub">No other active sessions.</div>
        }
      </section>


      <!-- Account deletion -->
      <app-modal [open]="showDelete()" title="Delete this account" [width]="520" (close)="showDelete.set(false)">
        @if (rights(); as r) {
          <div class="info-box danger" style="margin-bottom:14px;display:flex;gap:8px;align-items:flex-start">
            <app-icon name="alertTriangle" [size]="15" style="flex-shrink:0;margin-top:1px" />
            <span>
              After {{ r.deletion.graceDays }} days, every invoice, client, purchase and user
              account is permanently erased. Export your records first.
            </span>
          </div>
          <div class="field">
            <label>Type <strong>{{ r.organisation }}</strong> to confirm</label>
            <input [(ngModel)]="confirmName" [placeholder]="r.organisation" autocomplete="off">
          </div>
          <div class="field"><label>Your password</label><input type="password" [(ngModel)]="password"></div>
          <div class="field"><label>Reason (optional)</label><input [(ngModel)]="reason" placeholder="Closing the business"></div>
          <div class="modal-foot">
            <button class="btn ghost" type="button" (click)="showDelete.set(false)">Cancel</button>
            <button class="btn danger solid" type="button"
              [disabled]="busy() || confirmName.trim() !== r.organisation || !password"
              (click)="requestDeletion()">Schedule deletion</button>
          </div>
        }
      </app-modal>
    </app-shell>
  `
})
export class AccountSecurityComponent implements OnInit {
  busy = signal(false);
  rights = signal<DataRightsStatus | null>(null);
  showDelete = signal(false);
  verifyUrl = signal('');

  /**
   * Read from the session rather than a dedicated endpoint: `/auth/me` already
   * returns the user, and a second request for one boolean would be a request per
   * page load for information already in hand. The MFA equivalent of this now
   * lives inside the shared enrolment component.
   */
  verified = signal(true);

  // ── Active sessions (#50, #51) ──
  sessions = signal<DeviceSession[]>([]);
  revoking = signal<string | null>(null);

  password = '';
  confirmName = '';
  reason = '';

  fmtDate = fmtDate;

  constructor(public auth: AuthService, private api: ApiService, private toast: ToastService) {}

  ngOnInit() {
    this.api.dataRights().subscribe({ next: r => this.rights.set(r), error: err => this.toast.httpError(err) });
    this.api.listSessions().subscribe({ next: s => this.sessions.set(s), error: () => {} });
    // Forced, because this page is specifically about the fields the session carries —
    // reading a minute-old cached answer here would show a stale verification state
    // immediately after the user acted on it.
    this.auth.refreshSession(true).subscribe({
      next: () => this.syncFromSession(),
      error: () => this.syncFromSession()
    });
    this.syncFromSession();
  }

  private syncFromSession() {
    const user = this.auth.user() as unknown as Record<string, unknown> | null;
    this.verified.set(Boolean(user?.['emailVerifiedAt']));
  }

  recordEntries(rights: DataRightsStatus): Array<[string, number]> {
    return Object.entries(rights.records) as Array<[string, number]>;
  }

  // ── Email verification ───────────────────────

  resendVerification() {
    this.busy.set(true);
    this.api.resendEmailVerification().subscribe({
      next: res => {
        this.busy.set(false);
        if (res.verifyUrl) this.verifyUrl.set(res.verifyUrl);
        this.toast.success(res.message);
      },
      error: err => { this.busy.set(false); this.toast.httpError(err); }
    });
  }

  // ── Active sessions ──────────────────────────

  endSession(s: DeviceSession) {
    this.revoking.set(s.id);
    this.api.revokeSession(s.id).subscribe({
      next: () => {
        this.revoking.set(null);
        this.sessions.update(list => list.filter(x => x.id !== s.id));
        this.toast.success('That device has been signed out.');
      },
      error: err => { this.revoking.set(null); this.toast.httpError(err); }
    });
  }

  // ── Data rights ──────────────────────────────

  exportData() {
    this.busy.set(true);
    this.api.exportTenantData().subscribe({
      next: blob => {
        this.busy.set(false);
        downloadBlob(blob, `klogubizz-export-${new Date().toISOString().slice(0, 10)}.json`);
        this.toast.success('Your complete records have been downloaded');
      },
      error: err => { this.busy.set(false); this.toast.httpError(err); }
    });
  }

  requestDeletion() {
    this.busy.set(true);
    this.api.requestAccountDeletion({
      confirmName: this.confirmName.trim(),
      password: this.password,
      reason: this.reason
    }).subscribe({
      next: res => {
        this.busy.set(false);
        this.showDelete.set(false);
        this.password = '';
        this.confirmName = '';
        this.toast.info(res.message);
        this.api.dataRights().subscribe({ next: r => this.rights.set(r), error: () => {} });
      },
      error: err => { this.busy.set(false); this.toast.httpError(err); }
    });
  }

  cancelDeletion() {
    this.busy.set(true);
    this.api.cancelAccountDeletion().subscribe({
      next: res => {
        this.busy.set(false);
        this.toast.success(res.message);
        this.api.dataRights().subscribe({ next: r => this.rights.set(r), error: () => {} });
        this.auth.refreshSession(true).subscribe({ error: () => {} });
      },
      error: err => { this.busy.set(false); this.toast.httpError(err); }
    });
  }
}
