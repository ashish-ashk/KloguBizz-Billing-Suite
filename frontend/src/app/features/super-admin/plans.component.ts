import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { SkeletonRowsComponent } from '../../shared/ui';
import { ApiService } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { OrgSummary, Plan } from '../../core/models';
import { fmtDate } from '../../core/format';

interface EditablePlan extends Plan {
  featuresText: string;
}

@Component({
  selector: 'app-super-plans',
  standalone: true,
  imports: [CommonModule, FormsModule, SkeletonRowsComponent],
  template: `
    <div class="page-head">
      <div>
        <h1>Subscription Plans</h1>
        <p>Pricing and limits for every tier</p>
      </div>
    </div>

    @if (loading()) {
      <div class="card flush"><app-skeleton-rows [count]="5" /></div>
    } @else {
      <div class="grid grid-2" style="margin-bottom:16px;">
        @for (p of plans(); track p.code) {
          <section class="card">
            <div class="card-head">
              <div style="display:flex;align-items:center;gap:10px;">
                <div style="width:36px;height:36px;border-radius:9px;background:var(--brand-pale);display:grid;place-items:center;font-size:15px;">💳</div>
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
            <div class="field" style="margin-top:12px;">
              <label>Features (one per line)</label>
              <textarea rows="4" [(ngModel)]="p.featuresText"></textarea>
            </div>
            <div style="display:flex;justify-content:flex-end;margin-top:12px;">
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
            <div class="info-box ok">✓ No organizations on trial</div>
          }
        </section>
      </div>
    }
  `
})
export class SuperPlansComponent implements OnInit {
  loading = signal(true);
  saving = signal(false);
  plans = signal<EditablePlan[]>([]);
  orgs = signal<OrgSummary[]>([]);
  trialOrgs = signal<OrgSummary[]>([]);
  overrideOrgId = '';
  overridePlan = 'starter';
  fmtDate = fmtDate;

  constructor(private api: ApiService, private toast: ToastService) {}

  ngOnInit() { this.load(); }

  load() {
    forkJoin({ plans: this.api.superPlans(), orgs: this.api.superOrganisations() }).subscribe({
      next: ({ plans, orgs }) => {
        this.plans.set(plans.map(p => ({ ...p, featuresText: (p.features || []).join('\n') })));
        this.orgs.set(orgs);
        this.trialOrgs.set(orgs.filter(o => o.status === 'trial'));
        this.loading.set(false);
      },
      error: err => { this.loading.set(false); this.toast.httpError(err); }
    });
  }

  savePlan(p: EditablePlan) {
    this.saving.set(true);
    const { featuresText, _id, ...rest } = p;
    this.api.superSavePlan(p.code, {
      ...rest,
      features: featuresText.split('\n').map(f => f.trim()).filter(Boolean)
    }).subscribe({
      next: () => { this.saving.set(false); this.toast.success(`${p.name} plan saved`); },
      error: err => { this.saving.set(false); this.toast.httpError(err); }
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
