import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppShellComponent } from '../../shared/app-shell.component';
import { IconComponent } from '../../shared/icons';
import { ModalComponent } from '../../shared/ui';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { DataRightsStatus, DeviceSession, MfaSetup } from '../../core/models';
import { downloadBlob, fmtDate } from '../../core/format';

/**
 * Account security and data rights.
 *
 * Three previously-missing things on one page, because they are the three questions a
 * cautious customer asks and they were all unanswerable: how do I make this account
 * harder to break into (#7), is my email address confirmed (#52), and can I get my data
 * out or have it deleted (#62).
 *
 * Enrolment shows the setup key and a tappable `otpauth://` link rather than a QR code.
 *
 * That is a deliberate choice, not a shortcut. Generating a QR needs either a dependency
 * on the auth path or a hand-written encoder, and an encoder I cannot verify decodes
 * correctly is the worst option of the three: a subtly wrong QR produces an
 * authenticator that generates codes this server will never accept, and the user has no
 * way to tell that from "my code is wrong". The two paths here both provably work — the
 * link opens the authenticator directly on a phone, and every TOTP app accepts the key
 * typed in by hand.
 */
@Component({
  selector: 'app-account-security',
  standalone: true,
  imports: [CommonModule, FormsModule, AppShellComponent, IconComponent, ModalComponent],
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

          <!-- MFA (#7) -->
          <section class="card">
            <div class="card-head">
              <div>
                <div class="card-title">Two-factor authentication</div>
                <div class="card-sub">A six-digit code from your phone, on top of your password</div>
              </div>
              @if (mfaEnabled()) { <span class="pill success">On</span> } @else { <span class="pill">Off</span> }
            </div>

            @if (mfaEnabled()) {
              <div class="info-box ok" style="margin-top:12px;display:flex;gap:8px;align-items:flex-start">
                <app-icon name="lock" [size]="15" style="flex-shrink:0;margin-top:1px" />
                <span>Your account asks for a code from your authenticator app at every sign-in.</span>
              </div>
              <div class="actions" style="justify-content:flex-end;margin-top:12px">
                <button class="btn secondary sm" type="button" (click)="openBackupCodes()">New recovery codes</button>
                <button class="btn danger sm" type="button" (click)="showDisable.set(true)">Turn off</button>
              </div>
            } @else {
              <p style="margin:12px 0 0;font-size:13px;line-height:1.7;color:var(--text-mid)">
                A password alone is one secret that can be phished, reused or leaked. A second
                factor means a stolen password is not enough on its own.
              </p>
              <div class="actions" style="justify-content:flex-end;margin-top:12px">
                <button class="btn primary sm" type="button" [disabled]="busy()" (click)="startSetup()">
                  @if (busy()) { <span class="spinner"></span> } Set up
                </button>
              </div>
            }
          </section>
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

      <!-- MFA enrolment -->
      <app-modal [open]="!!setup()" title="Set up two-factor authentication" [width]="520" (close)="cancelSetup()">
        @if (setup(); as s) {
          <p style="margin:0 0 14px">
            Add this to Google Authenticator, Authy, 1Password or any TOTP app.
          </p>
          <div class="stat-block" style="margin-bottom:10px">
            <div class="sb-label">Setup key — type this into your app</div>
            <div class="sb-value mono" style="word-break:break-all;font-size:15px;letter-spacing:1px">{{ s.secret }}</div>
          </div>
          <div class="actions" style="justify-content:flex-start;margin-bottom:14px">
            <button class="btn secondary sm" type="button" (click)="copySecret(s.secret)">
              <app-icon name="copy" [size]="13" /> Copy key
            </button>
            <!-- On a phone this opens the authenticator app directly, which is the same
                 outcome as scanning a QR and needs no image at all. -->
            <a class="btn secondary sm" [href]="s.uri">Open in authenticator app</a>
          </div>
          <div class="card-sub" style="margin-bottom:14px">
            Six digits, refreshing every {{ s.period }} seconds.
          </div>
          <div class="field">
            <label>Enter the six-digit code your app shows</label>
            <input class="mono" inputmode="numeric" maxlength="6" [(ngModel)]="code" placeholder="000000">
          </div>
          <div class="modal-foot">
            <button class="btn ghost" type="button" (click)="cancelSetup()">Cancel</button>
            <button class="btn primary" type="button" [disabled]="busy() || code.length < 6" (click)="confirmSetup()">
              @if (busy()) { <span class="spinner"></span> } Turn on
            </button>
          </div>
        }
      </app-modal>

      <!-- Recovery codes -->
      <app-modal [open]="!!backupCodes()" title="Recovery codes" [width]="480" (close)="backupCodes.set(null)">
        <div class="info-box warn" style="margin-bottom:14px;display:flex;gap:8px;align-items:flex-start">
          <app-icon name="alertTriangle" [size]="15" style="flex-shrink:0;margin-top:1px" />
          <span>
            Save these somewhere safe. They are shown <strong>once</strong> — we store only
            hashes, so we cannot show them again. Each works a single time, and they are the
            only way in if you lose your phone.
          </span>
        </div>
        <div class="grid grid-2" style="gap:8px">
          @for (backup of backupCodes(); track backup) {
            <div class="stat-block"><div class="sb-value mono">{{ backup }}</div></div>
          }
        </div>
        <div class="modal-foot">
          <button class="btn secondary" type="button" (click)="copyCodes()">Copy all</button>
          <button class="btn primary" type="button" (click)="backupCodes.set(null)">I have saved them</button>
        </div>
      </app-modal>

      <!-- Regenerate codes -->
      <app-modal [open]="showRegenerate()" title="New recovery codes" (close)="showRegenerate.set(false)">
        <p style="margin:0 0 12px">Your existing recovery codes will stop working. Confirm with a code from your app.</p>
        <div class="field">
          <label>Six-digit code</label>
          <input class="mono" inputmode="numeric" maxlength="6" [(ngModel)]="code" placeholder="000000">
        </div>
        <div class="modal-foot">
          <button class="btn ghost" type="button" (click)="showRegenerate.set(false)">Cancel</button>
          <button class="btn primary" type="button" [disabled]="busy() || code.length < 6" (click)="regenerate()">Generate</button>
        </div>
      </app-modal>

      <!-- Disable MFA -->
      <app-modal [open]="showDisable()" title="Turn off two-factor authentication" (close)="showDisable.set(false)">
        <p style="margin:0 0 12px">
          Your account will be protected by its password alone. Confirm with both your password
          and a current code — a stolen password should not be enough to remove this.
        </p>
        <div class="field"><label>Password</label><input type="password" [(ngModel)]="password"></div>
        <div class="field"><label>Six-digit code (or a recovery code)</label><input class="mono" [(ngModel)]="code"></div>
        <div class="modal-foot">
          <button class="btn ghost" type="button" (click)="showDisable.set(false)">Cancel</button>
          <button class="btn danger solid" type="button" [disabled]="busy() || !password || !code" (click)="disable()">Turn off</button>
        </div>
      </app-modal>

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
  setup = signal<MfaSetup | null>(null);
  backupCodes = signal<string[] | null>(null);
  showDisable = signal(false);
  showRegenerate = signal(false);
  showDelete = signal(false);
  verifyUrl = signal('');

  /**
   * MFA state is read from the session rather than a dedicated endpoint.
   *
   * `/auth/me` already returns the user, and adding a second request for one boolean
   * would be a request per page load for information already in hand.
   */
  mfaEnabled = signal(false);
  verified = signal(true);

  // ── Active sessions (#50, #51) ──
  sessions = signal<DeviceSession[]>([]);
  revoking = signal<string | null>(null);

  code = '';
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
    this.mfaEnabled.set(Boolean((user?.['mfa'] as { enabled?: boolean } | undefined)?.enabled));
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

  // ── MFA ──────────────────────────────────────

  startSetup() {
    this.busy.set(true);
    this.code = '';
    this.api.mfaSetup().subscribe({
      next: setup => { this.busy.set(false); this.setup.set(setup); },
      error: err => { this.busy.set(false); this.toast.httpError(err); }
    });
  }

  cancelSetup() {
    // The staged secret is left on the server deliberately: nothing about sign-in has
    // changed while `enabled` is false, and starting again simply replaces it.
    this.setup.set(null);
    this.code = '';
  }

  copySecret(secret: string) {
    navigator.clipboard?.writeText(secret).then(
      () => this.toast.success('Setup key copied'),
      () => this.toast.info('Copy it manually — the clipboard was not available')
    );
  }

  confirmSetup() {
    this.busy.set(true);
    this.api.mfaEnable(this.code.trim()).subscribe({
      next: res => {
        this.busy.set(false);
        this.setup.set(null);
        this.code = '';
        this.mfaEnabled.set(true);
        this.backupCodes.set(res.backupCodes);
        this.toast.success(res.message);
        this.auth.refreshSession(true).subscribe({ error: () => {} });
      },
      error: err => { this.busy.set(false); this.toast.httpError(err); }
    });
  }

  openBackupCodes() {
    this.code = '';
    this.showRegenerate.set(true);
  }

  regenerate() {
    this.busy.set(true);
    this.api.mfaRegenerateBackupCodes(this.code.trim()).subscribe({
      next: res => {
        this.busy.set(false);
        this.showRegenerate.set(false);
        this.code = '';
        this.backupCodes.set(res.backupCodes);
      },
      error: err => { this.busy.set(false); this.toast.httpError(err); }
    });
  }

  disable() {
    this.busy.set(true);
    this.api.mfaDisable({ password: this.password, code: this.code.trim() }).subscribe({
      next: res => {
        this.busy.set(false);
        this.showDisable.set(false);
        this.password = '';
        this.code = '';
        this.mfaEnabled.set(false);
        this.toast.info(res.message);
        this.auth.refreshSession(true).subscribe({ error: () => {} });
      },
      error: err => { this.busy.set(false); this.toast.httpError(err); }
    });
  }

  copyCodes() {
    const codes = (this.backupCodes() || []).join('\n');
    navigator.clipboard?.writeText(codes).then(
      () => this.toast.success('Recovery codes copied'),
      () => this.toast.info('Copy them manually — the clipboard was not available')
    );
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
