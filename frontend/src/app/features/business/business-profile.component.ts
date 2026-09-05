import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppShellComponent } from '../../shared/app-shell.component';
import { ApiService } from '../../core/api.service';
import { EInvoiceSettings, Organisation } from '../../core/models';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { STATES, isValidGSTIN, stateName } from '../../core/format';

/**
 * The business's own details — the *seller* side of every invoice it issues.
 *
 * ── Why this page exists ──────────────────────────────────────────────
 *
 * It did not. Registration collects a name and a state code, the API has
 * accepted `gstin`, `pan`, `address`, `phone` and `state` on
 * `PUT /organisations/current` from the beginning, the PDF prints all of them,
 * and **no screen anywhere let a tenant fill any of them in**.
 *
 * So every business that signed up issued invoices carrying their company name
 * and nothing else. Under GST a tax invoice must state the supplier's name,
 * address and GSTIN; without them the document is not a valid tax invoice, and
 * the buyer's input tax credit against it is refused. That is not a cosmetic
 * gap — it lands on the customer, months later, and then on the tenant when the
 * customer asks why.
 *
 * The same shape as the document-numbering gap: a field stored, printed, and
 * unsettable. The controller's own comment says the GSTIN and address are
 * something "every tenant must be able to edit whatever they pay" — the gate is
 * on the branding fields, not on these. The API was right; the UI was missing.
 */
@Component({
  selector: 'app-business-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, AppShellComponent],
  template: `
    <app-shell title="Business Profile" subtitle="What appears as the seller on every invoice you issue">
      <button actions class="btn primary" type="button" [disabled]="saving() || !dirty()" (click)="save()">
        {{ saving() ? 'Saving…' : 'Save Changes' }}
      </button>

      @if (missingEssentials().length) {
        <!--
          Said plainly and at the top, because the consequence is invisible from
          inside the app: the invoice looks fine on screen and is not a valid tax
          invoice.
        -->
        <div class="info-box danger" style="margin-bottom:16px;line-height:1.6">
          <strong>Your invoices are going out without {{ missingEssentials().join(' and ') }}.</strong>
          A tax invoice has to carry your business's name, address and GSTIN. Without them your
          customer cannot claim input tax credit against it, and they will find out long after
          you have sent it.
        </div>
      }

      <div class="grid grid-2" style="align-items:start">
        <section class="card">
          <div class="card-title" style="margin-bottom:4px;">Business Identity</div>
          <div class="card-sub" style="margin-bottom:16px;">
            Printed at the top of every invoice, quotation and delivery challan.
          </div>

          <div class="field">
            <label for="bp-name">Registered business name</label>
            <input id="bp-name" [(ngModel)]="form.name" maxlength="120"
              placeholder="Aurora Industries Pvt Ltd" />
            <div class="hint">Exactly as it appears on your GST registration.</div>
          </div>

          <div class="field">
            <label for="bp-gstin">GSTIN</label>
            <input id="bp-gstin" class="mono" [ngModel]="form.gstin"
              (ngModelChange)="setGstin($event)" maxlength="15" placeholder="27AAPFU0939F1ZV" />
            @if (form.gstin && !gstinValid()) {
              <!--
                Checked as it is typed, not on save. A GSTIN is fifteen characters
                with a checksum, and finding out it was wrong after issuing forty
                invoices is the failure this is here to prevent.
              -->
              <div class="error">
                That is not a valid GSTIN. Check the length (15) and the last character.
              </div>
            } @else if (gstinValid()) {
              <div class="hint" style="color:var(--green)">
                Valid · {{ stateFromGstin() }} ({{ form.gstin.slice(0, 2) }})
              </div>
            } @else {
              <div class="hint">Leave blank only if your business is not registered under GST.</div>
            }
          </div>

          <div class="field">
            <label for="bp-pan">PAN</label>
            <input id="bp-pan" class="mono" [ngModel]="form.pan"
              (ngModelChange)="form.pan = ($event || '').toUpperCase(); touch()"
              maxlength="10" placeholder="AAPFU0939F" />
            <div class="hint">Optional. Characters 3 to 12 of your GSTIN are your PAN.</div>
          </div>
        </section>

        <section class="card">
          <div class="card-title" style="margin-bottom:4px;">Address and Contact</div>
          <div class="card-sub" style="margin-bottom:16px;">
            Your place of business, and how customers reach you about a bill.
          </div>

          <div class="field">
            <label for="bp-address">Address</label>
            <textarea id="bp-address" rows="3" [(ngModel)]="form.address" (ngModelChange)="touch()"
              maxlength="300" placeholder="Unit 4, Kalpataru Estate, Andheri East, Mumbai 400093"></textarea>
          </div>

          <div class="field">
            <label for="bp-state">State</label>
            <select id="bp-state" [ngModel]="form.stateCode" (ngModelChange)="setState($event)">
              @for (s of states; track s.code) {
                <option [value]="s.code">{{ s.name }} ({{ s.code }})</option>
              }
            </select>
            <div class="hint">
              <!--
                Stated because it is the single most consequential field on this
                page and its effect is entirely invisible until a return is filed.
              -->
              This decides whether each invoice charges CGST + SGST or IGST — a customer
              in your state is intra-state, anywhere else is inter-state.
            </div>
            @if (stateDisagrees()) {
              <div class="error">
                Your GSTIN starts with {{ form.gstin.slice(0, 2) }}, which is {{ stateFromGstin() }}.
                One of these two is wrong, and it changes the tax on every invoice you issue.
              </div>
            }
          </div>

          <div class="field" style="margin-bottom:0">
            <label for="bp-phone">Phone</label>
            <input id="bp-phone" [(ngModel)]="form.phone" (ngModelChange)="touch()"
              maxlength="20" placeholder="022 4800 5000" />
            <!--
              No billing-email field here on purpose: the organisation has no such
              field, and the API would accept the request and change nothing. An
              input that silently does nothing is worse than an absent one.
              Invoices are sent from your account's own address.
            -->
            <div class="hint">Printed under your address on the invoice.</div>
          </div>
        </section>
      </div>

      @if (einv(); as e) {
        <section class="card" style="margin-top:16px">
          <div class="card-title" style="margin-bottom:4px;">E-Invoicing (IRN &amp; signed QR)</div>
          <div class="card-sub" style="margin-bottom:16px;max-width:80ch">
            Reports your invoices to the government portal and puts the IRN and its signed QR
            on the document. Mandatory above a turnover threshold; optional below it.
          </div>

          @if (!e.platformConfigured) {
            <!--
              The operator's problem, not the tenant's, so it says so rather than
              showing a form that cannot work. Naming the settings is for whoever
              they forward this to.
            -->
            <div class="info-box warn" style="margin-bottom:14px;line-height:1.6">
              <strong>E-invoicing is not switched on for this server yet.</strong>
              Nothing you enter here can connect until it is. Missing:
              <span class="mono">{{ e.missingPlatformSettings.join(', ') }}</span>.
            </div>
          }

          <div class="grid grid-2" style="gap:14px;align-items:start">
            <div>
              <div class="field">
                <label for="ei-gstin">Portal GSTIN</label>
                <input id="ei-gstin" class="mono" [ngModel]="einvForm.gstin"
                  (ngModelChange)="einvForm.gstin = ($event || '').toUpperCase(); einvTouch()"
                  maxlength="15" placeholder="27AAPFU0939F1ZV" />
                <div class="hint">
                  The GSTIN your e-invoice portal account is registered under. Usually the same as above.
                </div>
              </div>

              <div class="field">
                <label for="ei-user">API username</label>
                <input id="ei-user" [ngModel]="einvForm.username"
                  (ngModelChange)="einvForm.username = $event; einvTouch()" maxlength="60" />
                <div class="hint">
                  Created by you on the e-invoice portal under <strong>API Registration</strong> —
                  not your portal login.
                </div>
              </div>

              <div class="field" style="margin-bottom:0">
                <label for="ei-pass">API password</label>
                <input id="ei-pass" type="password" [ngModel]="einvForm.password"
                  (ngModelChange)="einvForm.password = $event; einvTouch()" maxlength="200"
                  [placeholder]="e.credentials.hasPassword ? 'Stored — leave blank to keep it' : ''" />
                <div class="hint">
                  Encrypted before it is stored, and never shown again.
                  @if (e.credentials.hasPassword) { A password is already saved. }
                </div>
              </div>
            </div>

            <div>
              <div class="field">
                <label for="ei-env">Portal</label>
                <select id="ei-env" [ngModel]="einvForm.environment"
                  (ngModelChange)="einvForm.environment = $event; einvTouch()">
                  <option value="sandbox">Sandbox — for testing, nothing is filed</option>
                  <option value="production">Production — invoices are really reported</option>
                </select>
                <div class="hint">
                  <!--
                    Said plainly because the two look identical from in here and
                    only one of them files a real document.
                  -->
                  The sandbox issues real-looking IRNs that are filed nowhere. Switch to production
                  only once a test invoice has worked.
                </div>
              </div>

              <div class="field">
                <label for="ei-turnover">Declared turnover (₹)</label>
                <input id="ei-turnover" type="number" min="0" [ngModel]="einvForm.turnoverDeclared"
                  (ngModelChange)="einvForm.turnoverDeclared = $event; einvTouch()" />
                <div class="hint">
                  Last year's aggregate turnover across all your GSTINs. Recorded because
                  the threshold is a fact about your business that this software cannot work out.
                </div>
              </div>

              <label class="checkbox" style="justify-content:space-between;margin-top:4px">
                <span>Report invoices to the portal</span>
                <span class="switch">
                  <input type="checkbox" [ngModel]="einvForm.enabled"
                    (ngModelChange)="einvForm.enabled = $event; einvTouch()" />
                  <span class="track"></span>
                </span>
              </label>
            </div>
          </div>

          @if (e.credentials.verifiedAt) {
            <div class="info-box ok" style="margin-top:14px">
              Connected as <strong>{{ e.credentials.username }}</strong> on the
              {{ e.credentials.environment }} portal, last checked {{ e.credentials.verifiedAt | date:'d MMM y, HH:mm' }}.
            </div>
          } @else if (e.credentials.lastError) {
            <div class="info-box danger" style="margin-top:14px;line-height:1.6">
              <strong>The last connection attempt failed.</strong> {{ e.credentials.lastError }}
            </div>
          }

          <div class="actions" style="justify-content:flex-end;margin-top:14px;gap:10px">
            <button class="btn secondary" type="button"
              [disabled]="testingEinv() || einvDirty() || !einvCanTest()"
              (click)="testEinv()">
              {{ testingEinv() ? 'Connecting…' : 'Test connection' }}
            </button>
            <button class="btn primary" type="button" [disabled]="savingEinv() || !einvDirty()"
              (click)="saveEinv()">
              {{ savingEinv() ? 'Saving…' : 'Save e-invoicing settings' }}
            </button>
          </div>
          @if (einvDirty()) {
            <!-- Testing unsaved credentials would test the stored ones and mislead. -->
            <p class="muted" style="font-size:11.5px;text-align:right;margin:6px 0 0">
              Save first — the connection test uses the stored credentials.
            </p>
          }
        </section>
      }

      <p class="muted" style="font-size:12.5px;line-height:1.6;margin-top:14px;max-width:70ch">
        Your logo, signature, bank details and standing terms live on
        <strong>Invoice Templates</strong>, alongside the design they appear in.
      </p>
    </app-shell>
  `
})
export class BusinessProfileComponent implements OnInit {
  states = STATES;
  saving = signal(false);
  dirty = signal(false);

  /**
   * E-invoicing, on this page because it is part of the business's identity to
   * the government rather than a billing preference. Null while it loads, and
   * left null when the API refuses — a tenant whose plan does not include
   * e-invoicing gets a 403 and should simply not see the card.
   */
  einv = signal<EInvoiceSettings | null>(null);
  savingEinv = signal(false);
  testingEinv = signal(false);
  einvDirty = signal(false);
  einvForm = {
    gstin: '', username: '', password: '', environment: 'sandbox',
    enabled: false, turnoverDeclared: null as number | null
  };

  form = {
    name: '', gstin: '', pan: '', address: '', state: '', stateCode: '27', phone: ''
  };

  private snapshot = signal(0);

  gstinValid = computed(() => {
    this.snapshot();
    return !!this.form.gstin && isValidGSTIN(this.form.gstin);
  });

  stateFromGstin = computed(() => {
    this.snapshot();
    return stateName(this.form.gstin.slice(0, 2));
  });

  /**
   * The two disagreeing is worth its own message. The first two characters of a
   * GSTIN *are* the state code, so if they differ from the state chosen here,
   * one of them is wrong — and which one decides the tax split on everything the
   * business issues from now on.
   */
  stateDisagrees = computed(() => {
    this.snapshot();
    return this.gstinValid() && this.form.gstin.slice(0, 2) !== this.form.stateCode;
  });

  missingEssentials = computed(() => {
    this.snapshot();
    const missing: string[] = [];
    if (!this.form.gstin) missing.push('a GSTIN');
    if (!this.form.address.trim()) missing.push('an address');
    return missing;
  });

  constructor(private api: ApiService, public auth: AuthService, private toast: ToastService) {}

  ngOnInit() {
    const org = this.auth.organisation();
    if (org) this.fill(org);
    // Re-read from the server rather than trusting the cached session copy: this
    // page is the one place these fields are edited, so it must show what is
    // actually stored.
    this.loadEinv();
    this.api.organisation().subscribe({
      next: fresh => { this.fill(fresh); this.auth.setOrganisation(fresh); this.dirty.set(false); },
      error: () => { /* the cached copy is already on screen */ }
    });
  }

  private fill(org: Organisation) {
    this.form = {
      name: org.name || '',
      gstin: org.gstin || '',
      pan: org.pan || '',
      address: org.address || '',
      state: org.state || '',
      stateCode: org.stateCode || '27',
      phone: org.phone || ''
    };
    this.touch(false);
  }

  touch(dirty = true) {
    if (dirty) this.dirty.set(true);
    this.snapshot.update(n => n + 1);
  }

  setGstin(value: string) {
    this.form.gstin = (value || '').toUpperCase().replace(/\s/g, '');
    this.touch();
  }

  setState(code: string) {
    this.form.stateCode = code;
    // The name is stored alongside the code because the invoice prints the name;
    // keeping them in step here means no screen has to look it up later.
    this.form.state = stateName(code);
    this.touch();
  }

  einvTouch() { this.einvDirty.set(true); }

  /** Enough to attempt an authentication: both halves have to be present. */
  einvCanTest() {
    const e = this.einv();
    return Boolean(e?.platformConfigured && e.credentials.gstin && e.credentials.username && e.credentials.hasPassword);
  }

  private loadEinv() {
    this.api.eInvoiceSettings().subscribe({
      next: settings => {
        this.einv.set(settings);
        this.einvForm = {
          gstin: settings.credentials.gstin,
          username: settings.credentials.username,
          // Never populated from the server — it is not returned, and a
          // placeholder here would be sent back as a literal password.
          password: '',
          environment: settings.credentials.environment,
          enabled: settings.enabled,
          turnoverDeclared: settings.turnoverDeclared
        };
        this.einvDirty.set(false);
      },
      // A 403 means this plan does not include e-invoicing, and a 404 that the
      // feature is switched off. Neither is an error worth a toast: the card
      // simply does not appear.
      error: () => this.einv.set(null)
    });
  }

  saveEinv() {
    if (this.savingEinv()) return;
    this.savingEinv.set(true);
    const credentials: Record<string, unknown> = {
      gstin: this.einvForm.gstin,
      username: this.einvForm.username,
      environment: this.einvForm.environment
    };
    // Only when it was actually typed. An empty field means "keep the stored
    // one", which is the only sane reading when the form never receives it.
    if (this.einvForm.password) credentials['password'] = this.einvForm.password;

    this.api.saveEInvoiceSettings({
      credentials,
      enabled: this.einvForm.enabled,
      turnoverDeclared: this.einvForm.turnoverDeclared
    }).subscribe({
      next: settings => {
        this.savingEinv.set(false);
        this.einv.set(settings);
        this.einvForm.password = '';
        this.einvDirty.set(false);
        this.toast.success('E-invoicing settings saved.');
      },
      error: err => { this.savingEinv.set(false); this.toast.httpError(err); }
    });
  }

  testEinv() {
    if (this.testingEinv()) return;
    this.testingEinv.set(true);
    this.api.testEInvoiceConnection().subscribe({
      next: result => {
        this.testingEinv.set(false);
        this.toast.success(result.message);
        this.loadEinv();
      },
      error: err => {
        this.testingEinv.set(false);
        // The portal's own words — they name which credential it rejected.
        this.toast.httpError(err);
        this.loadEinv();
      }
    });
  }

  save() {
    if (this.saving()) return;
    if (this.form.gstin && !isValidGSTIN(this.form.gstin)) {
      this.toast.error('That GSTIN is not valid. Fix it or clear the field before saving.');
      return;
    }
    if (!this.form.name.trim()) {
      this.toast.error('Your business needs a name — it is printed on every invoice.');
      return;
    }

    this.saving.set(true);
    this.api.updateOrganisation({
      name: this.form.name.trim(),
      gstin: this.form.gstin,
      pan: this.form.pan,
      address: this.form.address.trim(),
      state: this.form.state || stateName(this.form.stateCode),
      stateCode: this.form.stateCode,
      phone: this.form.phone.trim()
    }).subscribe({
      next: org => {
        this.saving.set(false);
        this.auth.setOrganisation(org);
        this.fill(org);
        this.dirty.set(false);
        this.toast.success('Business profile saved. New invoices will carry these details.');
      },
      error: err => { this.saving.set(false); this.toast.httpError(err); }
    });
  }
}
