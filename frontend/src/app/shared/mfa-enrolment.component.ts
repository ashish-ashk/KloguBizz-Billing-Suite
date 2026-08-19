import { Component, computed, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from './icons';
import { ModalComponent } from './ui';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { ToastService } from '../core/toast.service';
import { MfaSetup } from '../core/models';

/**
 * Two-factor authentication enrolment, shared by the tenant security page and the
 * platform console's profile page.
 *
 * It exists as one component because it was previously in one place only, and the
 * other place still said **"Not available yet"** — text written in Phase 4, before
 * MFA existed, and never updated when Phase 5 shipped it. The result was a dead
 * end: `requireSuperadminMfa` blocks the whole console with
 * `MFA_ENROLMENT_REQUIRED`, the operator goes to the only page in their console
 * that mentions 2FA, and is told the feature is not built. A second copy of this
 * UI would eventually drift the same way, so there is one.
 *
 * Enrolment shows the setup key and a tappable `otpauth://` link rather than a QR
 * code. That is a deliberate choice, not a shortcut: generating a QR needs either
 * a dependency on the auth path or a hand-written encoder, and an encoder whose
 * output cannot be verified to decode is the worst of the three — a subtly wrong
 * QR produces an authenticator whose codes the server will never accept, and the
 * user has no way to tell that from "my code is wrong". The key and the link both
 * provably work.
 */
@Component({
  selector: 'app-mfa-enrolment',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, ModalComponent],
  template: `
    <section class="card">
      <div class="card-head">
        <div>
          <div class="card-title">Two-factor authentication</div>
          <div class="card-sub">A six-digit code from your phone, on top of your password</div>
        </div>
        @if (enabled()) { <span class="pill success">On</span> } @else { <span class="pill">Off</span> }
      </div>

      @if (enabled()) {
        <div class="info-box ok" style="margin-top:12px;display:flex;gap:8px;align-items:flex-start">
          <app-icon name="lock" [size]="15" style="flex-shrink:0;margin-top:1px" />
          <span>This account asks for a code from your authenticator app at every sign-in.</span>
        </div>
        @if (backupCodesLeft() !== null && backupCodesLeft()! <= 2) {
          <!-- Running out is otherwise silent: codes are consumed on use, and
               nobody counts them until the day they need one. -->
          <div class="info-box warn" style="margin-top:10px;display:flex;gap:8px;align-items:flex-start">
            <app-icon name="alertTriangle" [size]="15" style="flex-shrink:0;margin-top:1px" />
            <span>
              @if (backupCodesLeft() === 0) {
                <strong>No recovery codes left.</strong> If you lose your phone you will be locked
                out of this account. Generate a new set now.
              } @else {
                <strong>{{ backupCodesLeft() }} recovery code{{ backupCodesLeft() === 1 ? '' : 's' }} left.</strong>
                Generate a new set before you run out.
              }
            </span>
          </div>
        }
        <div class="actions" style="justify-content:flex-end;margin-top:12px">
          <button class="btn secondary sm" type="button" (click)="openRegenerate()">New recovery codes</button>
          @if (!required()) {
            <button class="btn danger sm" type="button" (click)="showDisable.set(true)">Turn off</button>
          }
        </div>
        @if (required()) {
          <p style="margin:10px 0 0;font-size:12px;color:var(--muted);line-height:1.6">
            Two-factor authentication is mandatory on platform accounts, so it cannot be turned off.
          </p>
        }
      } @else {
        @if (required()) {
          <!-- The operator is here *because* they were blocked, so lead with why
               rather than with a generic pitch. -->
          <div class="info-box warn" style="margin-top:12px;display:flex;gap:8px;align-items:flex-start">
            <app-icon name="alertTriangle" [size]="15" style="flex-shrink:0;margin-top:1px" />
            <span>
              <strong>Required on platform accounts.</strong> The rest of the console stays locked
              until this is set up — a platform account can reach every tenant's data, so a password
              alone is not enough.
            </span>
          </div>
        } @else {
          <p style="margin:12px 0 0;font-size:13px;line-height:1.7;color:var(--text-mid)">
            A password alone is one secret that can be phished, reused or leaked. A second
            factor means a stolen password is not enough on its own.
          </p>
        }
        <div class="actions" style="justify-content:flex-end;margin-top:12px">
          <button class="btn primary sm" type="button" [disabled]="busy()" (click)="startSetup()">
            @if (busy()) { <span class="spinner"></span> } Set up
          </button>
        </div>
      }
    </section>

    <!-- Enrolment -->
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
          <!-- On a phone this opens the authenticator directly, which is the same
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

    <!-- Regenerate -->
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

    <!-- Disable -->
    <app-modal [open]="showDisable()" title="Turn off two-factor authentication" (close)="showDisable.set(false)">
      <p style="margin:0 0 12px">
        This account will be protected by its password alone. Confirm with both your password
        and a current code — a stolen password should not be enough to remove this.
      </p>
      <div class="field"><label>Password</label><input type="password" [(ngModel)]="password"></div>
      <div class="field"><label>Six-digit code (or a recovery code)</label><input class="mono" [(ngModel)]="code"></div>
      <div class="modal-foot">
        <button class="btn ghost" type="button" (click)="showDisable.set(false)">Cancel</button>
        <button class="btn danger solid" type="button" [disabled]="busy() || !password || !code" (click)="disable()">Turn off</button>
      </div>
    </app-modal>
  `
})
export class MfaEnrolmentComponent {
  /**
   * Whether MFA cannot be turned off for this account.
   *
   * True for a platform account, where the server enforces it — offering a
   * "Turn off" button that the API will refuse is worse than not offering it.
   */
  required = input(false);

  /** Emitted after enrolment succeeds, so a host page blocked by
   *  `MFA_ENROLMENT_REQUIRED` can reload whatever it could not fetch before. */
  enrolled = output<void>();

  busy = signal(false);
  setup = signal<MfaSetup | null>(null);
  backupCodes = signal<string[] | null>(null);
  showDisable = signal(false);
  showRegenerate = signal(false);

  code = '';
  password = '';

  /**
   * Read from the session rather than a dedicated endpoint: `/auth/me` already
   * returns the user, and a second request for one boolean would be a request per
   * page load for information already in hand.
   */
  enabled = computed(() => Boolean(this.auth.user()?.mfa?.enabled));

  /**
   * How many recovery codes are left.
   *
   * Surfaced because running out is silent otherwise: each one is consumed on
   * use, and a user with none left who then loses their phone has no way back in
   * that does not involve an operator with shell access.
   */
  backupCodesLeft = computed(() => this.auth.user()?.mfa?.backupCodesRemaining ?? null);

  constructor(private api: ApiService, private auth: AuthService, private toast: ToastService) {}

  startSetup() {
    this.busy.set(true);
    this.code = '';
    this.api.mfaSetup().subscribe({
      next: setup => { this.busy.set(false); this.setup.set(setup); },
      error: err => { this.busy.set(false); this.toast.httpError(err); }
    });
  }

  cancelSetup() {
    // The staged secret is deliberately left on the server: nothing about sign-in
    // has changed while `enabled` is false, and starting again simply replaces it.
    this.setup.set(null);
    this.code = '';
  }

  confirmSetup() {
    this.busy.set(true);
    this.api.mfaEnable(this.code.trim()).subscribe({
      next: res => {
        this.busy.set(false);
        this.setup.set(null);
        this.code = '';
        this.backupCodes.set(res.backupCodes);
        this.toast.success(res.message);
        // Forced, because the enabled state is read from the session and the page
        // must reflect it immediately.
        this.auth.refreshSession(true).subscribe({
          next: () => this.enrolled.emit(),
          error: () => this.enrolled.emit()
        });
      },
      error: err => { this.busy.set(false); this.toast.httpError(err); }
    });
  }

  openRegenerate() {
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
        this.toast.info(res.message);
        // Forced, for the same reason enrolment forces it: the on/off state is
        // read from the session, so a cached one would leave the page claiming
        // the factor is still on.
        this.auth.refreshSession(true).subscribe({ error: () => {} });
      },
      error: err => { this.busy.set(false); this.toast.httpError(err); }
    });
  }

  copySecret(secret: string) {
    navigator.clipboard?.writeText(secret).then(
      () => this.toast.success('Setup key copied'),
      () => this.toast.info('Copy it manually — the clipboard was not available')
    );
  }

  copyCodes() {
    const codes = (this.backupCodes() || []).join('\n');
    navigator.clipboard?.writeText(codes).then(
      () => this.toast.success('Recovery codes copied'),
      () => this.toast.info('Copy them manually — the clipboard was not available')
    );
  }
}
