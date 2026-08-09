import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { AppShellComponent } from '../../shared/app-shell.component';
import { IconComponent } from '../../shared/icons';
import { ModalComponent, PillComponent, EmptyStateComponent, SkeletonRowsComponent } from '../../shared/ui';
import { ApiService } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { Plan, PlanUsage, Subscription } from '../../core/models';
import { fmtDate, fmtINR } from '../../core/format';

const STATUS_LABELS: Record<string, string> = {
  trial: 'Trial',
  active: 'Active',
  past_due: 'Past Due',
  cancelled: 'Cancelled'
};

const PRICE_COLORS: Record<string, string> = {
  starter: 'var(--blue)',
  growth: 'var(--brand)',
  business: 'var(--purple)',
  enterprise: 'var(--slate)'
};

@Component({
  selector: 'app-subscription',
  standalone: true,
  imports: [CommonModule, AppShellComponent, IconComponent, ModalComponent, PillComponent, EmptyStateComponent, SkeletonRowsComponent],
  template: `
    <app-shell title="Subscription" subtitle="Manage your plan and billing">
      @if (loading()) {
        <div class="card" style="margin-bottom:16px"><app-skeleton-rows [count]="3" /></div>
        <div class="card"><app-skeleton-rows [count]="4" /></div>
      } @else {
        @if (usage(); as u) {
          <!-- Current plan banner -->
          <div class="card" style="background:linear-gradient(135deg,var(--brand),var(--brand-dark));color:#fff;border:0;margin-bottom:26px">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap">
              <div>
                <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;font-weight:700;color:rgba(255,255,255,.7)">Current Plan</div>
                <div style="display:flex;align-items:center;gap:12px;margin-top:6px;flex-wrap:wrap">
                  <h2 style="margin:0;font-size:28px;font-weight:800;color:#fff">{{ u.planName || currentPlan()?.name || 'Free' }}</h2>
                  <span class="pill" style="background:rgba(255,255,255,.2);color:#fff">{{ statusLabel(sub()?.status || 'active') }}</span>
                </div>
                <div style="font-size:13px;color:rgba(255,255,255,.75);margin-top:8px">
                  Billing cycle: {{ cycleTitle(subCycle()) }}
                  @if (bannerPrice() !== null) {
                    <span> · {{ fmtINR(bannerPrice(), true) }}/{{ subCycle() === 'yearly' ? 'yr' : 'mo' }}</span>
                  }
                </div>
              </div>
              <div style="display:flex;gap:10px;flex-wrap:wrap">
                <button class="btn" type="button" style="background:transparent;border:1px solid rgba(255,255,255,.4);color:#fff"
                  (click)="cancelOpen.set(true)">Cancel Plan</button>
                <button class="btn" type="button" style="background:#fff;color:var(--brand)" (click)="scrollToPlans()">Upgrade Plan</button>
              </div>
            </div>

            <!-- Usage band -->
            <div class="grid grid-4" style="border-top:1px solid rgba(255,255,255,.15);padding-top:14px;margin-top:20px">
              <div>
                <div style="font-size:11px;text-transform:uppercase;letter-spacing:.6px;font-weight:600;color:rgba(255,255,255,.65)">Users</div>
                <div style="font-weight:700;font-size:15px;margin:4px 0 8px">
                  {{ u.users }} / {{ u.userLimit === null ? 'Unlimited' : u.userLimit }}
                </div>
                <div class="progress" style="background:rgba(255,255,255,.25)">
                  <div class="bar" style="background:#fff" [style.width.%]="userPct()"></div>
                </div>
              </div>
              <div>
                <div style="font-size:11px;text-transform:uppercase;letter-spacing:.6px;font-weight:600;color:rgba(255,255,255,.65)">Invoices This Month</div>
                <div style="font-weight:700;font-size:15px;margin:4px 0 8px">
                  {{ u.invoicesThisMonth }} / {{ u.invoiceLimit === null ? 'Unlimited' : u.invoiceLimit }}
                </div>
                <div class="progress" style="background:rgba(255,255,255,.25)">
                  <div class="bar" [style.background]="invoiceHot() ? 'var(--red-border)' : '#fff'" [style.width.%]="invoicePct()"></div>
                </div>
              </div>
              <div>
                <div style="font-size:11px;text-transform:uppercase;letter-spacing:.6px;font-weight:600;color:rgba(255,255,255,.65)">Billing Cycle</div>
                <div style="font-weight:700;font-size:15px;margin-top:4px">{{ cycleTitle(subCycle()) }}</div>
              </div>
              <div>
                <div style="font-size:11px;text-transform:uppercase;letter-spacing:.6px;font-weight:600;color:rgba(255,255,255,.65)">Support</div>
                <div style="font-weight:700;font-size:15px;margin-top:4px">{{ supportLevel() }}</div>
              </div>
            </div>
            @if (u.grandfathered) {
              <!--
                Said out loud, because otherwise the published price and limits on
                this very page disagree with the ones the customer is actually on,
                and the only reading available is that something is broken.
              -->
              <div style="margin-top:14px;font-size:12.5px;line-height:1.6;color:rgba(255,255,255,.8)">
                You are on the terms you signed up with, not the current published ones. Your price
                and limits stay as they are unless you change plan.
              </div>
            }
          </div>

          <!-- Billing toggle -->
          <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:20px">
            <h2 style="margin:0;font-size:17px;font-weight:800">Choose a Plan</h2>
            <div class="tabs">
              <button type="button" [class.active]="cycle() === 'monthly'" (click)="cycle.set('monthly')">Monthly</button>
              <button type="button" [class.active]="cycle() === 'yearly'" (click)="cycle.set('yearly')">Yearly</button>
            </div>
            @if (cycle() === 'yearly') {
              <span class="pill success">Save 17%</span>
            }
          </div>

          <!-- Plans grid -->
          <section id="plans-grid" class="grid grid-4" style="margin-bottom:26px">
            @for (plan of plans(); track plan.code) {
              <div class="card" style="position:relative;display:flex;flex-direction:column">
                @if (plan.code === u.plan) {
                  <span class="ribbon current">Current Plan</span>
                } @else if (plan.code === 'growth') {
                  <span class="ribbon brand">Most Popular</span>
                }
                <div style="font-family:var(--font-display);font-size:18px;font-weight:700">{{ plan.name }}</div>
                <div style="margin:8px 0 4px">
                  @if (isCustom(plan)) {
                    <span style="font-family:var(--font-display);font-size:28px;font-weight:800" [style.color]="priceColor(plan.code)">Custom</span>
                  } @else {
                    <span style="font-family:var(--font-display);font-size:28px;font-weight:800" [style.color]="priceColor(plan.code)">{{ fmtINR(priceFor(plan), true) }}</span>
                    <span style="font-size:13px;color:var(--muted)">/{{ cycle() === 'yearly' ? 'yr' : 'mo' }}</span>
                  }
                </div>
                <div style="font-size:12px;color:var(--muted);margin-bottom:12px">
                  Up to {{ plan.userLimit || 'Unlimited' }} users · {{ plan.invoiceLimit || 'Unlimited' }} invoices/mo
                </div>
                <div style="display:grid;gap:7px;margin-bottom:16px">
                  @for (f of plan.features; track f) {
                    <div style="display:flex;gap:8px;align-items:flex-start">
                      <app-icon name="check" [size]="14" [style.color]="priceColor(plan.code)" style="margin-top:1px" />
                      <span style="font-size:12px;color:var(--muted);line-height:1.5">{{ f }}</span>
                    </div>
                  }
                </div>
                @if (plan.code === u.plan) {
                  <button class="btn block" type="button" disabled
                    style="margin-top:auto;background:var(--brand-pale);color:var(--brand);opacity:1">Active Plan</button>
                } @else if (plan.code === 'enterprise') {
                  <button class="btn secondary block" type="button" style="margin-top:auto" (click)="contactSales()">Contact Sales</button>
                } @else {
                  <button class="btn primary block" type="button" style="margin-top:auto" (click)="openUpgrade(plan)">Switch to {{ plan.name }}</button>
                }
              </div>
            }
          </section>

          <!-- Billing history -->
          <div class="card flush">
            <div class="card-head">
              <div>
                <div class="card-title">Billing History</div>
                <div class="card-sub">Recent subscription charges</div>
              </div>
            </div>
            @if (sub(); as s) {
              <div class="table-wrap">
                <table class="table stack-mobile">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Description</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td data-label="Date">{{ fmtDate(s.createdAt || s.startDate) }}</td>
                      <td class="strong" data-label="Description">{{ historyPlanName() }} — {{ cycleTitle(s.billingCycle) }}</td>
                      <td class="num" data-label="Amount" data-priority="high">{{ historyAmount() === null ? '—' : fmtINR(historyAmount(), true) }}</td>
                      <td data-label="Status" data-priority="high"><app-pill [status]="s.status" [label]="statusLabel(s.status)" /></td>
                      <td data-label="">
                        <div class="actions">
                          <button class="btn ghost sm" type="button" (click)="downloadPdf()"><app-icon name="download" [size]="13" /> PDF</button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            } @else {
              <app-empty-state icon="⬡" title="No billing history yet" message="Charges will appear here once you subscribe to a plan." />
            }
          </div>
        } @else {
          <app-empty-state icon="⬡" title="Unable to load subscription" message="Please refresh the page to try again." />
        }
      }

      <!-- Upgrade modal -->
      <app-modal [open]="upgradeOpen()" [width]="420" [title]="'Switch to ' + (selPlan()?.name || '')" (close)="upgradeOpen.set(false)">
        @if (selPlan(); as p) {
          <div style="background:var(--brand-pale);border-radius:12px;padding:18px;text-align:center;margin-bottom:16px">
            <span style="font-family:var(--font-display);font-size:30px;font-weight:800" [style.color]="priceColor(p.code)">{{ fmtINR(priceFor(p), true) }}</span>
            <span style="font-size:13px;color:var(--muted)">/{{ cycle() === 'yearly' ? 'year' : 'month' }}</span>
            @if (cycle() === 'yearly' && savings(p) > 0) {
              <div style="font-size:12px;color:var(--green);font-weight:600;margin-top:6px">You save {{ fmtINR(savings(p), true) }} vs monthly</div>
            }
          </div>
          <div style="display:grid;gap:7px">
            @for (f of p.features; track f) {
              <div style="display:flex;gap:8px;align-items:flex-start">
                <app-icon name="check" [size]="14" style="color:var(--green);margin-top:1px" />
                <span style="font-size:12px;color:var(--muted);line-height:1.5">{{ f }}</span>
              </div>
            }
          </div>
          <div class="modal-foot">
            <button class="btn ghost" type="button" (click)="upgradeOpen.set(false)">Cancel</button>
            <button class="btn primary" type="button" [disabled]="saving()" (click)="confirmUpgrade()">
              @if (saving()) { <span class="spinner"></span> }
              Confirm Upgrade
            </button>
          </div>
        }
      </app-modal>

      <!-- Cancel modal -->
      <app-modal [open]="cancelOpen()" title="Cancel Subscription" [width]="420" (close)="cancelOpen.set(false)">
        <div class="info-box danger" style="display:flex;gap:8px;align-items:flex-start">
          <app-icon name="alertTriangle" [size]="15" style="flex-shrink:0;margin-top:1px" />
          <span>Are you sure? Your account will remain active until the end of the billing period. After that you'll lose access to paid features.</span>
        </div>
        <div class="modal-foot">
          <button class="btn ghost" type="button" (click)="cancelOpen.set(false)">Keep Plan</button>
          <button class="btn danger solid" type="button" [disabled]="saving()" (click)="confirmCancel()">
            @if (saving()) { <span class="spinner"></span> }
            Cancel Subscription
          </button>
        </div>
      </app-modal>
    </app-shell>
  `
})
export class SubscriptionComponent implements OnInit {
  loading = signal(true);
  saving = signal(false);
  plans = signal<Plan[]>([]);
  sub = signal<Subscription | null>(null);
  usage = signal<PlanUsage | null>(null);

  cycle = signal<'monthly' | 'yearly'>('monthly');
  upgradeOpen = signal(false);
  cancelOpen = signal(false);
  selPlan = signal<Plan | null>(null);

  fmtINR = fmtINR;
  fmtDate = fmtDate;

  currentPlan = computed(() => this.plans().find(p => p.code === this.usage()?.plan) || null);
  subCycle = computed<'monthly' | 'yearly'>(() => this.sub()?.billingCycle || 'monthly');
  bannerPrice = computed<number | null>(() => {
    const p = this.currentPlan();
    if (!p) return null;
    return this.subCycle() === 'yearly' ? p.yearlyPrice : p.monthlyPrice;
  });

  constructor(private api: ApiService, private toast: ToastService) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    forkJoin({ plans: this.api.plans(), current: this.api.subscription() }).subscribe({
      next: res => {
        this.plans.set(res.plans);
        this.sub.set(res.current.subscription);
        this.usage.set(res.current.usage);
        if (res.current.subscription?.billingCycle === 'yearly') this.cycle.set('yearly');
        this.loading.set(false);
      },
      error: err => { this.loading.set(false); this.toast.httpError(err); }
    });
  }

  // ── Usage helpers ──────────────────────────────
  userPct(): number {
    const u = this.usage();
    if (!u) return 0;
    if (u.userLimit === null || u.userLimit === undefined) return 8;
    return u.userLimit > 0 ? Math.min(100, Math.round((u.users / u.userLimit) * 100)) : 0;
  }

  invoicePct(): number {
    const u = this.usage();
    if (!u) return 0;
    if (u.invoiceLimit === null || u.invoiceLimit === undefined) return 8;
    return u.invoiceLimit > 0 ? Math.min(100, Math.round((u.invoicesThisMonth / u.invoiceLimit) * 100)) : 0;
  }

  invoiceHot(): boolean {
    const u = this.usage();
    return !!u && u.invoiceLimit !== null && u.invoiceLimit !== undefined && this.invoicePct() > 80;
  }

  supportLevel(): string {
    const plan = this.usage()?.plan || '';
    return ['growth', 'business', 'enterprise'].includes(plan) ? 'Priority' : 'Standard';
  }

  // ── Plan helpers ───────────────────────────────
  priceFor(plan: Plan): number | null {
    return this.cycle() === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
  }

  isCustom(plan: Plan): boolean {
    return plan.code === 'enterprise' || this.priceFor(plan) === null;
  }

  priceColor(code: string): string {
    return PRICE_COLORS[code] || 'var(--text)';
  }

  savings(plan: Plan): number {
    return (plan.monthlyPrice || 0) * 12 - (plan.yearlyPrice || 0);
  }

  statusLabel(status: string): string {
    return STATUS_LABELS[status] || status;
  }

  cycleTitle(cycle: string): string {
    return cycle === 'yearly' ? 'Yearly' : 'Monthly';
  }

  scrollToPlans() {
    document.getElementById('plans-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  contactSales() {
    this.toast.info('Our sales team will reach out to you shortly.');
  }

  // ── Upgrade ────────────────────────────────────
  openUpgrade(plan: Plan) {
    this.selPlan.set(plan);
    this.upgradeOpen.set(true);
  }

  confirmUpgrade() {
    const plan = this.selPlan();
    if (!plan || this.saving()) return;
    this.saving.set(true);
    this.api.startSubscription({ planCode: plan.code, billingCycle: this.cycle() }).subscribe({
      next: result => {
        this.saving.set(false);
        this.upgradeOpen.set(false);
        // The plan is only granted once payment is confirmed by the provider
        // webhook, so don't claim success for a checkout that is still pending —
        // the tenant would see "Plan updated" while remaining on their old plan.
        if (result?.pendingPayment) {
          this.toast.info(result.message || `Complete the payment to activate ${plan.name}. Your current plan stays active until then.`);
        } else {
          this.toast.success(result?.message || `Plan updated to ${plan.name}`);
        }
        this.load();
      },
      error: err => { this.saving.set(false); this.toast.httpError(err); }
    });
  }

  // ── Cancel ─────────────────────────────────────
  confirmCancel() {
    if (this.saving()) return;
    this.saving.set(true);
    this.api.cancelSubscription().subscribe({
      next: () => {
        this.saving.set(false);
        this.cancelOpen.set(false);
        this.toast.info('Subscription cancelled');
        this.load();
      },
      error: err => { this.saving.set(false); this.toast.httpError(err); }
    });
  }

  // ── Billing history ────────────────────────────
  historyPlanName(): string {
    const s = this.sub();
    if (!s) return '';
    return this.plans().find(p => p.code === s.planCode)?.name || this.usage()?.planName || s.planCode;
  }

  /**
   * What this customer was actually charged.
   *
   * Read from the subscription's own snapshot, falling back to the published
   * plan only for subscriptions that predate versioning (3.3 #9). It used to
   * read the live plan unconditionally, which meant a past charge was rendered
   * at *today's* price: raise Growth from ₹999 to ₹1,499 and every existing
   * Growth customer's receipt row retroactively read ₹1,499, so their own
   * billing history stopped matching their bank statement.
   *
   * Nullish coalescing rather than `||`, because a free plan's price is 0 and
   * `||` would fall through to the published price for every one of them.
   */
  historyAmount(): number | null {
    const s = this.sub();
    if (!s) return null;
    const snapshot = s.billingCycle === 'yearly' ? s.pricing?.yearlyPrice : s.pricing?.monthlyPrice;
    if (snapshot !== null && snapshot !== undefined) return snapshot;
    const plan = this.plans().find(p => p.code === s.planCode);
    if (!plan) return null;
    return s.billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
  }

  downloadPdf() {
    this.toast.info('Invoice PDF coming soon');
  }
}
