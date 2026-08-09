import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ModalComponent, SkeletonRowsComponent, EmptyStateComponent } from '../../shared/ui';
import { IconComponent } from '../../shared/icons';
import { ApiService } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { AdminCoupon, AdminCredit } from '../../core/models';
import { fmtDate, fmtINR } from '../../core/format';

const BLANK: AdminCoupon = {
  code: '',
  description: '',
  discountType: 'percent',
  discountValue: 10,
  duration: 'once',
  durationCycles: null,
  appliesToPlans: [],
  appliesToCycles: [],
  maxRedemptions: null,
  oncePerOrg: true,
  providerOfferId: null,
  active: true,
  redemptionCount: 0
};

@Component({
  selector: 'app-super-coupons',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent, SkeletonRowsComponent, EmptyStateComponent, IconComponent],
  template: `
    <div class="page-head">
      <div>
        <h1>Discounts &amp; Credits</h1>
        <p>Codes you hand out, and money you owe back</p>
      </div>
      <button class="btn primary" type="button" (click)="openNew()">
        <app-icon name="plus" [size]="14" /> New code
      </button>
    </div>

    @if (loading()) {
      <div class="card"><app-skeleton-rows [count]="4" /></div>
    } @else {
      @if (providerNote()) {
        <!--
          The single thing about coupons that can cost a customer money without
          anyone noticing, said once and plainly rather than left to be inferred
          from a field name.
        -->
        <div class="info-box" style="margin-bottom:18px;line-height:1.6">{{ providerNote() }}</div>
      }

      <div class="card flush" style="margin-bottom:22px">
        <div class="card-head">
          <div>
            <div class="card-title">Discount codes</div>
            <div class="card-sub">{{ coupons().length }} defined</div>
          </div>
        </div>
        @if (coupons().length) {
          <div class="table-wrap">
            <table class="table stack-mobile">
              <thead>
                <tr>
                  <th>Code</th><th>Discount</th><th>Lasts</th><th>Used</th>
                  <th>At checkout</th><th></th>
                </tr>
              </thead>
              <tbody>
                @for (c of coupons(); track c._id) {
                  <tr [style.opacity]="c.active ? 1 : 0.55">
                    <td class="strong" data-label="Code">
                      {{ c.code }}
                      @if (!c.active) { <span class="pill">Retired</span> }
                      <div class="muted" style="font-size:11.5px">{{ c.description }}</div>
                    </td>
                    <td data-label="Discount" data-priority="high">
                      {{ c.discountType === 'percent' ? c.discountValue + '%' : fmtINR(c.discountValue, true) }}
                    </td>
                    <td data-label="Lasts">{{ durationLabel(c) }}</td>
                    <td class="num" data-label="Used">
                      {{ c.redemptionCount || 0 }}{{ c.maxRedemptions ? ' / ' + c.maxRedemptions : '' }}
                    </td>
                    <td data-label="At checkout" data-priority="high">
                      @if (c.usableAtCheckout) {
                        <span class="pill success">Usable</span>
                      } @else {
                        <!-- Refused rather than applied, so a customer is never
                             charged more than they were shown. -->
                        <span class="pill warn" title="No Razorpay offer id — this code is refused on paid plans">Needs offer id</span>
                      }
                    </td>
                    <td data-label="">
                      <div class="actions">
                        <button class="btn ghost sm" type="button" (click)="openEdit(c)">Edit</button>
                        <button class="btn ghost sm" type="button" (click)="openRedemptions(c)">Uses</button>
                        @if (c.active) {
                          <button class="btn ghost sm danger" type="button" (click)="retire(c)">Retire</button>
                        }
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <app-empty-state icon="%" title="No discount codes" message="Create one to run a launch offer or a negotiated discount." />
        }
      </div>

      <div class="card flush">
        <div class="card-head">
          <div>
            <div class="card-title">Credits owed</div>
            <div class="card-sub">{{ fmtINR(creditTotal(), true) }} outstanding across {{ credits().length }} tenants</div>
          </div>
        </div>
        <!--
          Not applied automatically, on purpose: what the card is charged is set
          at the provider, so a credit that reduced our tax invoice would produce
          a document that disagrees with the customer's bank statement.
        -->
        @if (credits().length) {
          <div class="table-wrap">
            <table class="table stack-mobile">
              <thead><tr><th>Tenant</th><th>Amount</th><th>Why</th><th>Raised</th><th></th></tr></thead>
              <tbody>
                @for (c of credits(); track c._id) {
                  <tr>
                    <td class="strong" data-label="Tenant">{{ c.orgName }}</td>
                    <td class="num" data-label="Amount" data-priority="high">{{ fmtINR(c.amount, true) }}</td>
                    <td data-label="Why">{{ c.note || c.reason }}</td>
                    <td class="muted" data-label="Raised">{{ fmtDate(c.createdAt) }}</td>
                    <td data-label="">
                      <button class="btn ghost sm" type="button" (click)="openSettle(c)">Record settlement</button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <app-empty-state icon="✓" title="Nothing owed" message="Mid-cycle upgrades raise a credit for the days already paid for." />
        }
      </div>
    }

    <!-- Create / edit -->
    <app-modal [open]="editOpen()" [title]="draft()._id ? 'Edit ' + draft().code : 'New discount code'" [width]="560" (close)="editOpen.set(false)">
      <div class="grid grid-2">
        <label class="field">
          <span>Code</span>
          <input type="text" [(ngModel)]="draft().code" [disabled]="!!draft()._id" placeholder="LAUNCH50" />
        </label>
        <label class="field">
          <span>Description</span>
          <input type="text" [(ngModel)]="draft().description" placeholder="Launch offer" />
        </label>
        <label class="field">
          <span>Type</span>
          <select [(ngModel)]="draft().discountType">
            <option value="percent">Percentage off</option>
            <option value="amount">Fixed amount off</option>
          </select>
        </label>
        <label class="field">
          <span>{{ draft().discountType === 'percent' ? 'Percent' : 'Amount (₹)' }}</span>
          <input type="number" [(ngModel)]="draft().discountValue" min="0" />
        </label>
        <label class="field">
          <span>Lasts for</span>
          <select [(ngModel)]="draft().duration">
            <option value="once">The first payment</option>
            <option value="cycles">A number of payments</option>
            <option value="forever">As long as they subscribe</option>
          </select>
        </label>
        @if (draft().duration === 'cycles') {
          <label class="field">
            <span>How many payments</span>
            <input type="number" [(ngModel)]="draft().durationCycles" min="1" />
          </label>
        }
        <label class="field">
          <span>Maximum redemptions</span>
          <input type="number" [(ngModel)]="draft().maxRedemptions" min="1" placeholder="Unlimited" />
        </label>
        <label class="field">
          <span>Razorpay offer id</span>
          <input type="text" [(ngModel)]="draft().providerOfferId" placeholder="offer_..." />
        </label>
      </div>
      <!--
        Stated at the point of entry rather than only in the list: without an
        offer, the gateway collects the full price while the customer is shown the
        discounted one, so the code is refused at checkout instead.
      -->
      <div class="info-box" style="margin-top:4px;line-height:1.6">
        Without a Razorpay offer id this code cannot discount a card payment — it is refused at
        checkout rather than applied, so nobody is charged more than they were shown.
      </div>
      <div class="modal-foot">
        <button class="btn ghost" type="button" (click)="editOpen.set(false)">Cancel</button>
        <button class="btn primary" type="button" [disabled]="saving()" (click)="save()">
          @if (saving()) { <span class="spinner"></span> }
          Save
        </button>
      </div>
    </app-modal>

    <!-- Redemptions -->
    <app-modal [open]="!!usesFor()" [title]="(usesFor()?.code || '') + ' — who used it'" [width]="620" (close)="usesFor.set(null)">
      <div class="info-box" style="margin-bottom:12px">{{ fmtINR(given(), true) }} given away across {{ uses().length }} redemptions.</div>
      @if (uses().length) {
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Tenant</th><th>When</th><th>List</th><th>Paid</th></tr></thead>
            <tbody>
              @for (r of uses(); track r._id) {
                <tr>
                  <td class="strong">{{ r.orgName }}</td>
                  <td class="muted">{{ fmtDate(r.appliedAt) }}</td>
                  <td class="num">{{ fmtINR(r.originalPrice, true) }}</td>
                  <td class="num">{{ fmtINR(r.finalPrice, true) }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <app-empty-state icon="⬡" title="Not used yet" message="Nobody has redeemed this code." />
      }
    </app-modal>

    <!-- Settle a credit -->
    <app-modal [open]="!!settling()" title="Record how this credit was settled" [width]="440" (close)="settling.set(null)">
      @if (settling(); as c) {
        <div class="info-box" style="margin-bottom:14px">
          {{ fmtINR(c.amount, true) }} owed to <strong>{{ c.orgName }}</strong>.
          Do the refund or adjustment first, then record it here.
        </div>
        <label class="field">
          <span>How</span>
          <select [(ngModel)]="settleMethod">
            <option value="refund">Refunded through the gateway</option>
            <option value="next-invoice">Discounted on the next renewal</option>
            <option value="write-off">Written off</option>
          </select>
        </label>
        <label class="field">
          <span>Reference</span>
          <input type="text" [(ngModel)]="settleReference" placeholder="rfnd_… or a note anyone can follow" />
        </label>
        <div class="modal-foot">
          <button class="btn ghost" type="button" (click)="settling.set(null)">Cancel</button>
          <button class="btn primary" type="button" [disabled]="saving()" (click)="confirmSettle()">
            @if (saving()) { <span class="spinner"></span> }
            Record
          </button>
        </div>
      }
    </app-modal>
  `
})
export class SuperCouponsComponent implements OnInit {
  loading = signal(true);
  saving = signal(false);
  coupons = signal<AdminCoupon[]>([]);
  credits = signal<AdminCredit[]>([]);
  providerNote = signal('');

  editOpen = signal(false);
  draft = signal<AdminCoupon>({ ...BLANK });

  usesFor = signal<AdminCoupon | null>(null);
  uses = signal<Array<{ _id: string; orgName: string; appliedAt: string; originalPrice: number; finalPrice: number }>>([]);
  given = signal(0);

  settling = signal<AdminCredit | null>(null);
  settleMethod: 'refund' | 'next-invoice' | 'write-off' = 'refund';
  settleReference = '';

  fmtINR = fmtINR;
  fmtDate = fmtDate;

  constructor(private api: ApiService, private toast: ToastService) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    forkJoin({ coupons: this.api.adminCoupons(), credits: this.api.adminCredits() }).subscribe({
      next: res => {
        this.coupons.set(res.coupons.coupons);
        this.providerNote.set(res.coupons.providerNote);
        this.credits.set(res.credits.credits);
        this.loading.set(false);
      },
      error: err => { this.loading.set(false); this.toast.httpError(err); }
    });
  }

  creditTotal(): number {
    return this.credits().reduce((sum, c) => sum + (c.amount || 0), 0);
  }

  durationLabel(c: AdminCoupon): string {
    if (c.duration === 'forever') return 'Every payment';
    if (c.duration === 'cycles') return `${c.durationCycles || 1} payments`;
    return 'First payment';
  }

  openNew() {
    this.draft.set({ ...BLANK });
    this.editOpen.set(true);
  }

  openEdit(c: AdminCoupon) {
    this.draft.set({ ...c });
    this.editOpen.set(true);
  }

  save() {
    if (this.saving()) return;
    this.saving.set(true);
    const body = { ...this.draft(), code: (this.draft().code || '').trim().toUpperCase() };
    this.api.saveCoupon(body).subscribe({
      next: () => {
        this.saving.set(false);
        this.editOpen.set(false);
        this.toast.success(`${body.code} saved`);
        this.load();
      },
      // The server's message names the actual problem — a `cycles` discount with
      // no count, a percentage above 100, dates that end before they start.
      error: err => { this.saving.set(false); this.toast.httpError(err); }
    });
  }

  retire(c: AdminCoupon) {
    if (!c._id || this.saving()) return;
    this.saving.set(true);
    this.api.retireCoupon(c._id).subscribe({
      next: () => {
        this.saving.set(false);
        // Retired rather than deleted: the redemption history is the answer to
        // "who used this, and what did we give away".
        this.toast.info(`${c.code} will no longer be accepted. Existing subscribers keep their price.`);
        this.load();
      },
      error: err => { this.saving.set(false); this.toast.httpError(err); }
    });
  }

  openRedemptions(c: AdminCoupon) {
    if (!c._id) return;
    this.usesFor.set(c);
    this.uses.set([]);
    this.api.couponRedemptions(c._id).subscribe({
      next: res => { this.uses.set(res.redemptions); this.given.set(res.given); },
      error: err => this.toast.httpError(err)
    });
  }

  openSettle(c: AdminCredit) {
    this.settling.set(c);
    this.settleMethod = 'refund';
    this.settleReference = '';
  }

  confirmSettle() {
    const credit = this.settling();
    if (!credit || this.saving()) return;
    this.saving.set(true);
    this.api.settleCredit(credit._id, { method: this.settleMethod, reference: this.settleReference }).subscribe({
      next: () => {
        this.saving.set(false);
        this.settling.set(null);
        this.toast.success('Settlement recorded');
        this.load();
      },
      error: err => { this.saving.set(false); this.toast.httpError(err); }
    });
  }
}
