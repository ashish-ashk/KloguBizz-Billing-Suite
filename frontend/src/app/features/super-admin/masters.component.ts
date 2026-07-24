import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmptyStateComponent, SkeletonRowsComponent } from '../../shared/ui';
import { IconComponent } from '../../shared/icons';
import { ApiService } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { Master } from '../../core/models';
import { STATES } from '../../core/format';

type MasterTab = 'gstRate' | 'hsn' | 'paymentMethod' | 'unit' | 'states';

@Component({
  selector: 'app-super-masters',
  standalone: true,
  imports: [CommonModule, FormsModule, EmptyStateComponent, SkeletonRowsComponent, IconComponent],
  styles: [`
    /* An editable grid (inputs/selects per cell), not a display-only list —
       same per-row card treatment as invoice-editor's line-items table
       rather than the app-wide .stack-mobile convention. */
    @media (max-width: 640px) {
      .hsn-table thead { display: none; }
      .hsn-table, .hsn-table tbody, .hsn-table tr, .hsn-table td { display: block; width: 100%; }
      .hsn-table tr { border: 1px solid var(--border); border-radius: 10px; margin-bottom: 12px; padding: 12px; }
      .hsn-table tr:last-child { margin-bottom: 0; }
      .hsn-table td { padding: 6px 0; border: none; }
      .hsn-table td[data-label]:not([data-label=""])::before {
        content: attr(data-label); display: block; font-size: 10.5px; color: var(--muted);
        font-weight: 600; text-transform: uppercase; letter-spacing: .4px; margin-bottom: 4px;
      }
      .hsn-table td[data-label=""] { text-align: right; padding-top: 4px; }
    }
  `],
  template: `
    <div class="page-head">
      <div>
        <h1>Masters</h1>
        <p>Global reference data used across all organizations</p>
      </div>
    </div>

    <div class="toolbar">
      <div class="tabs">
        <button type="button" [class.active]="tab() === 'gstRate'" (click)="tab.set('gstRate')">GST Rates</button>
        <button type="button" [class.active]="tab() === 'hsn'" (click)="tab.set('hsn')">HSN/SAC Codes</button>
        <button type="button" [class.active]="tab() === 'paymentMethod'" (click)="tab.set('paymentMethod')">Payment Methods</button>
        <button type="button" [class.active]="tab() === 'unit'" (click)="tab.set('unit')">Units of Measure</button>
        <button type="button" [class.active]="tab() === 'states'" (click)="tab.set('states')">State Codes</button>
      </div>
    </div>

    @if (loading()) {
      <div class="card flush"><app-skeleton-rows [count]="5" /></div>
    } @else {
      @switch (tab()) {
        @case ('gstRate') {
          <section class="card">
            <div class="card-head">
              <div><div class="card-title">GST Rate Slabs</div><div class="card-sub">Rates offered in invoice line items</div></div>
              <button class="btn primary sm" type="button" [disabled]="saving()" (click)="save('gstRate', gstRates)">Save Changes</button>
            </div>
            <div style="display:grid;gap:10px;">
              @for (r of gstRates; track $index) {
                <div style="display:flex;align-items:center;gap:14px;">
                  <div style="width:50px;height:50px;border-radius:10px;background:var(--brand-pale);display:grid;place-items:center;font-weight:800;font-size:15px;color:var(--brand);flex-shrink:0;">{{ r.rate }}%</div>
                  <input class="input" style="flex:1;" [(ngModel)]="r.label" placeholder="Description" />
                  <label class="switch"><input type="checkbox" [(ngModel)]="r.active" /><span class="track"></span></label>
                </div>
              }
            </div>
          </section>
        }
        @case ('hsn') {
          <section class="card flush">
            <div class="card-head">
              <div><div class="card-title">HSN / SAC Codes</div><div class="card-sub">Service and goods classification codes</div></div>
              <button class="btn primary sm" type="button" [disabled]="saving()" (click)="save('hsn', hsnCodes)">Save Changes</button>
            </div>
            <div class="table-wrap">
              <table class="table hsn-table">
                <thead><tr><th>Code</th><th>Description</th><th>GST Rate</th><th>Active</th><th></th></tr></thead>
                <tbody>
                  @for (h of hsnCodes; track $index; let i = $index) {
                    <tr>
                      <td data-label="Code"><input class="input mono" style="width:110px;" [(ngModel)]="h.code" /></td>
                      <td data-label="Description"><input class="input" [(ngModel)]="h.description" /></td>
                      <td data-label="GST Rate">
                        <select class="input" style="width:90px;" [(ngModel)]="h.rate">
                          @for (r of gstRates; track r.rate) { <option [ngValue]="r.rate">{{ r.rate }}%</option> }
                        </select>
                      </td>
                      <td data-label="Active"><label class="switch"><input type="checkbox" [(ngModel)]="h.active" /><span class="track"></span></label></td>
                      <td data-label="" class="actions"><button class="btn danger sm" type="button" (click)="hsnCodes.splice(i, 1)">✕</button></td>
                    </tr>
                  }
                  <tr style="background:var(--brand-pale);">
                    <td data-label="Code"><input class="input mono" style="width:110px;" [(ngModel)]="newHsn.code" placeholder="9983xx" /></td>
                    <td data-label="Description"><input class="input" [(ngModel)]="newHsn.description" placeholder="Description" /></td>
                    <td data-label="GST Rate">
                      <select class="input" style="width:90px;" [(ngModel)]="newHsn.rate">
                        @for (r of gstRates; track r.rate) { <option [ngValue]="r.rate">{{ r.rate }}%</option> }
                      </select>
                    </td>
                    <td data-label="" colspan="2"><button class="btn secondary sm" type="button" (click)="addHsn()">+ Add</button></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        }
        @case ('paymentMethod') {
          <section class="card">
            <div class="card-head">
              <div><div class="card-title">Payment Methods</div><div class="card-sub">Click a method to enable or disable it platform-wide</div></div>
              <button class="btn primary sm" type="button" [disabled]="saving()" (click)="save('paymentMethod', paymentMethods)">Save Changes</button>
            </div>
            <div class="grid grid-4">
              @for (m of paymentMethods; track $index) {
                <button type="button" (click)="m.active = !m.active"
                  [style.border]="m.active ? '2px solid var(--brand)' : '2px solid var(--border)'"
                  [style.background]="m.active ? 'var(--brand-pale)' : 'var(--card)'"
                  style="border-radius:10px;padding:16px 14px;text-align:left;cursor:pointer;transition:all .15s;">
                  <div style="font-weight:700;font-size:13px;">{{ m.label }}</div>
                  <div style="font-size:11px;margin-top:4px;display:flex;align-items:center;gap:4px;" [style.color]="m.active ? 'var(--green)' : 'var(--faint)'">
                    <app-icon [name]="m.active ? 'check' : 'x'" [size]="12" /> {{ m.active ? 'Enabled' : 'Disabled' }}
                  </div>
                </button>
              }
            </div>
          </section>
        }
        @case ('unit') {
          <section class="card">
            <div class="card-head">
              <div><div class="card-title">Units of Measurement</div><div class="card-sub">Units available in bills and invoices</div></div>
              <button class="btn primary sm" type="button" [disabled]="saving()" (click)="save('unit', units)">Save Changes</button>
            </div>
            <div class="grid grid-4">
              @for (u of units; track $index) {
                <button type="button" (click)="u.active = !u.active"
                  [style.border]="u.active ? '2px solid var(--brand)' : '2px solid var(--border)'"
                  [style.background]="u.active ? 'var(--brand-pale)' : 'var(--card)'"
                  style="border-radius:10px;padding:16px 14px;text-align:center;cursor:pointer;transition:all .15s;">
                  <div style="font-weight:800;font-size:16px;" [style.color]="u.active ? 'var(--brand)' : 'var(--faint)'">{{ u.code }}</div>
                  <div style="font-size:11px;color:var(--muted);margin-top:3px;">{{ u.label }}</div>
                </button>
              }
            </div>
          </section>
        }
        @case ('states') {
          <section class="card">
            <div class="card-head">
              <div><div class="card-title">GST State Codes</div><div class="card-sub">All Indian states and union territories</div></div>
            </div>
            <div class="info-box" style="margin-bottom:16px;">State codes are defined by GST law and cannot be edited.</div>
            <div class="grid grid-4" style="gap:8px;">
              @for (s of states; track s.code) {
                <div style="display:flex;align-items:center;gap:10px;padding:9px 12px;border:1px solid var(--border);border-radius:8px;">
                  <span class="pill mono">{{ s.code }}</span>
                  <span style="font-size:12px;font-weight:600;">{{ s.name }}</span>
                </div>
              }
            </div>
          </section>
        }
      }
    }
  `
})
export class SuperMastersComponent implements OnInit {
  tab = signal<MasterTab>('gstRate');
  loading = signal(true);
  saving = signal(false);
  states = STATES;

  gstRates: Master[] = [];
  hsnCodes: Master[] = [];
  paymentMethods: Master[] = [];
  units: Master[] = [];
  newHsn: Partial<Master> = { code: '', description: '', rate: 18 };

  constructor(private api: ApiService, private toast: ToastService) {}

  ngOnInit() {
    this.api.superMasters().subscribe({
      next: res => {
        this.gstRates = res.masters.gstRate.map(m => ({ ...m }));
        this.hsnCodes = res.masters.hsn.map(m => ({ ...m }));
        this.paymentMethods = res.masters.paymentMethod.map(m => ({ ...m }));
        this.units = res.masters.unit.map(m => ({ ...m }));
        this.loading.set(false);
      },
      error: err => { this.loading.set(false); this.toast.httpError(err, 'Could not load masters.'); }
    });
  }

  addHsn() {
    if (!this.newHsn.code?.trim()) { this.toast.error('Enter an HSN/SAC code.'); return; }
    this.hsnCodes.push({ type: 'hsn', code: this.newHsn.code.trim(), description: this.newHsn.description || '', rate: this.newHsn.rate ?? 18, active: true });
    this.newHsn = { code: '', description: '', rate: 18 };
  }

  save(type: string, items: Master[]) {
    this.saving.set(true);
    this.api.superSaveMasters(type, items).subscribe({
      next: () => { this.saving.set(false); this.toast.success('Masters saved'); },
      error: err => { this.saving.set(false); this.toast.httpError(err); }
    });
  }
}
