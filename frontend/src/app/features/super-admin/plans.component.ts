import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ModalComponent, SkeletonRowsComponent } from '../../shared/ui';
import { IconComponent } from '../../shared/icons';
import { ApiService } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { OrgSummary, Plan, PlanVersion } from '../../core/models';
import { fmtDate, fmtINR } from '../../core/format';

interface EditablePlan extends Plan {
  featuresText: string;
  /** Recorded against the version so "why did this go up" is answerable later. */
  changeNote?: string;
  /** Opt-in to moving existing subscribers. Grandfathering is the default. */
  applyToExisting?: boolean;
}

@Component({
  selector: 'app-super-plans',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent, SkeletonRowsComponent, IconComponent],
  template: `
    <div class="page-head">
      <div>
        <h1>Subscription Plans</h1>
        <p>Pricing and limits for every tier</p>
      </div>

      <app-modal [open]="!!historyPlan()" [title]="historyPlan() + ' — price history'" [width]="640" (close)="historyPlan.set('')">
        @if (history().length) {
          <div class="table-wrap">
            <table class="table">
              <thead><tr><th>Version</th><th>From</th><th>Monthly</th><th>Yearly</th><th>Limits</th><th>Changed by</th></tr></thead>
              <tbody>
                @for (v of history(); track v.version) {
                  <tr>
                    <td class="strong">v{{ v.version }}</td>
                    <td class="muted">{{ fmtDate(v.effectiveFrom) }}</td>
                    <td>{{ fmtINR(v.monthlyPrice || 0) }}</td>
                    <td>{{ fmtINR(v.yearlyPrice || 0) }}</td>
                    <td class="muted">{{ v.userLimit }} users · {{ v.invoiceLimit }} invoices</td>
                    <td class="muted">
                      {{ v.changedBy || '—' }}
                      @if (v.changeNote) { <div style="font-size:11px">{{ v.changeNote }}</div> }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <div class="card-sub">No versions recorded yet.</div>
        }
        <div class="modal-foot">
          <button class="btn primary" type="button" (click)="historyPlan.set('')">Close</button>
        </div>
      </app-modal>
    </div>

    @if (loading()) {
      <div class="card flush"><app-skeleton-rows [count]="5" /></div>
    } @else {
      @if (providerNote()) {
        <!--
          Said once and plainly. A plan with no Razorpay plan id looks perfectly
          healthy here and fails at the moment a customer presses pay, and the
          operator's only clue would otherwise be a support ticket.
        -->
        <div class="info-box" style="margin-bottom:16px;line-height:1.6">{{ providerNote() }}</div>
      }
      <div class="grid grid-2" style="margin-bottom:16px;">
        @for (p of plans(); track p.code) {
          <section class="card">
            <div class="card-head">
              <div style="display:flex;align-items:center;gap:10px;">
                <div style="width:36px;height:36px;border-radius:9px;background:var(--brand-pale);display:grid;place-items:center;color:var(--brand);"><app-icon name="creditCard" [size]="16" /></div>
                <div>
                  <div class="card-title">{{ p.name }}</div>
                  <div class="card-sub mono">{{ p.code }}</div>
                </div>
              </div>
              <label class="switch"><input type="checkbox" [(ngModel)]="p.active" /><span class="track"></span></label>
            </div>
            <div class="grid grid-2" style="gap:12px;">
              <div class="field"><label>Monthly Price ₹</label><input type="number" [(ngModel)]="p.monthlyPrice" /></div>
              <div class="field"><label>Yearly Price ₹</label><input type="number" [(ngModel)]="p.yearlyPrice" /></div>
              <div class="field"><label>Max Users</label><input type="number" [(ngModel)]="p.userLimit" /></div>
              <div class="field"><label>Max Invoices / month</label><input type="number" [(ngModel)]="p.invoiceLimit" /></div>
            </div>
            <!--
              The Razorpay plan ids (3.3 #10).
              Provider-generated, so they cannot be derived from the code — and
              monthly and yearly are two separate plans there, because a Razorpay
              plan carries a fixed period and amount.
            -->
            @if (billingConfigured()) {
              <div class="grid grid-2" style="gap:12px;margin-top:12px;">
                <div class="field">
                  <label>Razorpay plan id — monthly</label>
                  <input class="mono" [(ngModel)]="p.providerPlanIds!.monthly" placeholder="plan_..." />
                  @if (p.monthlyPrice && !p.providerPlanIds?.monthly) {
                    <span class="err">Priced at {{ fmtINR(p.monthlyPrice) }} but not sellable — checkout will be refused.</span>
                  }
                </div>
                <div class="field">
                  <label>Razorpay plan id — yearly</label>
                  <input class="mono" [(ngModel)]="p.providerPlanIds!.yearly" placeholder="plan_..." />
                  @if (p.yearlyPrice && !p.providerPlanIds?.yearly) {
                    <span class="err">Priced at {{ fmtINR(p.yearlyPrice) }} but not sellable — checkout will be refused.</span>
                  }
                </div>
              </div>
            }
            <div class="field" style="margin-top:12px;">
              <label>Features (one per line)</label>
              <textarea rows="4" [(ngModel)]="p.featuresText"></textarea>
            </div>
            <div class="field" style="margin-top:12px;">
              <label>Why is this changing? (recorded against the version)</label>
              <input [(ngModel)]="p.changeNote" placeholder="e.g. Annual price review" />
            </div>
            <!--
              Grandfathering is the default and the destructive option is a
              deliberate opt-in, because the two mistakes are not symmetrical: a
              price rise that quietly reaches existing customers costs their
              trust and cannot be taken back, while forgetting to reprice is
              visible and fixable.
            -->
            <label class="checkbox" style="margin-top:8px">
              <input type="checkbox" [(ngModel)]="p.applyToExisting" />
              Also move existing subscribers to this price and these limits
            </label>
            @if (p.applyToExisting) {
              <div class="info-box warn" style="margin-top:8px;font-size:12px;line-height:1.6">
                Existing subscribers will be held to the new limits immediately, and their billing
                history will show the new price. <strong>This does not change what the payment
                gateway actually charges them</strong> — an existing mandate keeps collecting what
                Razorpay was told when it was created.
              </div>
            }
            <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:12px;">
              <button class="btn ghost sm" type="button" (click)="openHistory(p)">Price history</button>
              <button class="btn primary sm" type="button" [disabled]="saving()" (click)="savePlan(p)">Save Plan</button>
            </div>
          </section>
        }
      </div>

      <div class="grid grid-2">
        <section class="card">
          <div class="card-title" style="margin-bottom:4px;">Organization Plan Override</div>
          <div class="card-sub" style="margin-bottom:16px;">Assign a plan to a specific organization</div>
          <div class="form">
            <div class="field">
              <label>Organization</label>
              <select [(ngModel)]="overrideOrgId">
                <option value="" disabled>Select organization…</option>
                @for (o of orgs(); track o._id) { <option [value]="o._id">{{ o.name }}</option> }
              </select>
            </div>
            <div class="field">
              <label>Assign Plan</label>
              <select [(ngModel)]="overridePlan">
                @for (p of plans(); track p.code) { <option [value]="p.code">{{ p.name }}</option> }
              </select>
            </div>
            <div><button class="btn primary sm" type="button" (click)="applyOverride()">Apply Override</button></div>
          </div>
        </section>

        <section class="card">
          <div class="card-title" style="margin-bottom:4px;">Trial Organizations</div>
          <div class="card-sub" style="margin-bottom:16px;">Tenants that have not activated a paid plan yet</div>
          @if (trialOrgs().length) {
            <div style="display:grid;gap:10px;">
              @for (o of trialOrgs(); track o._id) {
                <div style="display:flex;align-items:center;gap:12px;border:1px solid var(--amber-border);background:var(--amber-bg);border-radius:10px;padding:10px 14px;">
                  <div style="flex:1;">
                    <div style="font-weight:700;font-size:13px;">{{ o.name }}</div>
                    <div style="font-size:11.5px;color:var(--muted);">{{ o.plan }} · joined {{ fmtDate(o.createdAt) }}</div>
                  </div>
                  <button class="btn success sm" type="button" (click)="activate(o)">Activate</button>
                </div>
              }
            </div>
          } @else {
            <div class="info-box ok" style="display:flex;gap:8px;align-items:flex-start">
              <app-icon name="checkCircle" [size]="15" style="flex-shrink:0;margin-top:1px" />
              <span>No organizations on trial</span>
            </div>
          }
        </section>
      </div>
    }
  `
})
export class SuperPlansComponent implements OnInit {
  loading = signal(true);
  saving = signal(false);
  fmtINR = fmtINR;
  historyPlan = signal('');
  history = signal<PlanVersion[]>([]);
  plans = signal<EditablePlan[]>([]);
  /** Whether every active plan can actually be sold, and why not (3.3 #10). */
  providerNote = signal('');
  billingConfigured = signal(false);
  orgs = signal<OrgSummary[]>([]);
  trialOrgs = signal<OrgSummary[]>([]);
  overrideOrgId = '';
  overridePlan = 'starter';
  fmtDate = fmtDate;

  constructor(private api: ApiService, private toast: ToastService) {}

  ngOnInit() { this.load(); }

  load() {
    // Trials are asked for by status rather than fetched-then-filtered: the org
    // list is paginated now, so filtering one page would quietly have shown
    // "trials on page one" instead of all of them.
    forkJoin({
      plans: this.api.superPlans(),
      orgs: this.api.superOrganisations({ limit: 200 }),
      trials: this.api.superOrganisations({ status: 'trial', limit: 200 })
    }).subscribe({
      next: ({ plans, orgs, trials }) => {
        this.providerNote.set(plans.providerNote);
        this.billingConfigured.set(plans.billingConfigured);
        this.plans.set(plans.plans.map(p => ({
          ...p,
          featuresText: (p.features || []).join('\n'),
          // Copied into a concrete object so the inputs bind to something that
          // always exists, rather than to an optional the template would have to
          // guard on every keystroke.
          providerPlanIds: { monthly: p.providerPlanIds?.monthly || '', yearly: p.providerPlanIds?.yearly || '' }
        })));
        this.orgs.set(orgs.data);
        this.trialOrgs.set(trials.data);
        this.loading.set(false);
      },
      error: err => { this.loading.set(false); this.toast.httpError(err); }
    });
  }

  savePlan(p: EditablePlan) {
    this.saving.set(true);
    const { featuresText, _id, changeNote, applyToExisting, ...rest } = p;
    this.api.superSavePlan(p.code, {
      ...rest,
      features: featuresText.split('\n').map(f => f.trim()).filter(Boolean),
      changeNote: (changeNote || '').trim() || undefined,
      applyToExisting: applyToExisting === true
    }).subscribe({
      next: result => {
        this.saving.set(false);
        p.changeNote = '';
        p.applyToExisting = false;
        /**
         * The toast says who this affected.
         *
         * It used to say only "Growth plan saved" — true, and useless: the
         * operator had no way to know whether they had just repriced two hundred
         * customers or none. That count is the entire substance of the
         * grandfathering decision, so it is reported back rather than inferred.
         */
        const moved = result.repriced || 0;
        const kept = result.grandfathered || 0;
        const stem = `${p.name} saved as v${result.version}`;
        if (moved) this.toast.success(`${stem} — ${moved} existing subscriber${moved === 1 ? '' : 's'} moved to the new terms`);
        else if (kept) this.toast.success(`${stem} — ${kept} existing subscriber${kept === 1 ? '' : 's'} kept their current terms`);
        else this.toast.success(stem);
        this.load();
      },
      error: err => { this.saving.set(false); this.toast.httpError(err); }
    });
  }

  openHistory(p: EditablePlan) {
    this.historyPlan.set(p.name);
    this.history.set([]);
    this.api.superPlanHistory(p.code).subscribe({
      next: res => this.history.set(res.versions),
      error: err => this.toast.httpError(err)
    });
  }

  applyOverride() {
    if (!this.overrideOrgId) { this.toast.error('Select an organization first.'); return; }
    this.api.superUpdateOrganisation(this.overrideOrgId, { plan: this.overridePlan }).subscribe({
      next: org => { this.toast.success(`${org.name} moved to ${this.overridePlan}`); this.load(); },
      error: err => this.toast.httpError(err)
    });
  }

  activate(o: OrgSummary) {
    this.api.superUpdateOrganisation(o._id, { status: 'active' }).subscribe({
      next: () => { this.toast.success(`${o.name} activated`); this.load(); },
      error: err => this.toast.httpError(err)
    });
  }
}
