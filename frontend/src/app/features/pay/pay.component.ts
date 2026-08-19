import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { RazorpayCheckoutService } from '../../core/razorpay-checkout.service';
import { environment } from '../../../environments/environment';
import { IconComponent } from '../../shared/icons';
import { fmtINR, fmtDate } from '../../core/format';

/** What `GET /pay/:token` returns — a hand-built allowlist server-side, so this
 *  interface is the complete set of what a payer can ever see. */
interface PayPage {
  reference: string;
  status: 'active' | 'paid';
  expiresAt: string;
  business: { name: string; logoAssetUrl: string; supportEmail: string };
  invoice: {
    number: string; date: string; dueDate: string;
    total: number; amountDue: number; currency: string; billedTo: string;
  };
  gateway: { enabled: boolean; provider: string; keyId: string };
}

interface OrderResponse {
  orderId: string;
  amount: number;
  amountPaise: number;
  currency: string;
  keyId: string;
  reference: string;
  business: string;
  invoiceNumber: string;
}

/** Razorpay's checkout object, as this page uses it. */
interface RazorpayCheckout {
  open(): void;
  on(event: string, handler: (response: unknown) => void): void;
}
type RazorpayConstructor = new (options: Record<string, unknown>) => RazorpayCheckout;


/**
 * The hosted pay page (2.3 #21, #23).
 *
 * The one screen in this product built for someone who is **not** a customer of
 * ours. They arrived from an email, they have no account, and they will judge
 * whether this is safe to type a card into in about two seconds. So it is
 * deliberately plain and says exactly three things without being asked: who is
 * asking for money, how much, and for which invoice.
 *
 * It also does not use `AppShellComponent`, `ApiService` or `AuthService` at all —
 * those carry a session, a cache and a sidebar full of a *tenant's* navigation,
 * none of which belongs on an unauthenticated page. `HttpClient` is used
 * directly, which also means the auth interceptor's 401 handling cannot bounce a
 * payer to a login screen they have no business seeing.
 */
@Component({
  selector: 'app-pay',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="pay-wrap">
      <div class="pay-card">
        @if (loading()) {
          <div class="pay-center">
            <span class="spinner"></span>
            <p class="pay-muted">Loading your payment request…</p>
          </div>
        } @else if (error()) {
          <div class="pay-center">
            <div class="pay-icon danger"><app-icon name="alertTriangle" [size]="26" /></div>
            <h1 class="pay-title">{{ errorTitle() }}</h1>
            <p class="pay-muted">{{ error() }}</p>
            @if (page()?.business?.supportEmail) {
              <a class="btn secondary" [href]="'mailto:' + page()!.business.supportEmail">Contact the sender</a>
            }
          </div>
        } @else if (paid()) {
          <div class="pay-center">
            <div class="pay-icon ok"><app-icon name="checkCircle" [size]="28" /></div>
            <h1 class="pay-title">Payment received</h1>
            <p class="pay-muted">
              Thank you. Invoice <strong>{{ page()!.invoice.number }}</strong> has been marked as paid.
            </p>
            <p class="pay-muted" style="font-size:12.5px;">
              You can close this page. Keep this reference for your records:
              <strong class="mono">{{ page()!.reference }}</strong>
            </p>
          </div>
        } @else if (page()) {
          <!-- Nested rather than an "as" binding on this @else if: Angular allows
               the "as" alias only on a primary @if block. -->
          @if (page(); as p) {
          <!-- Who is asking. First, and largest, because a payment request from an
               unrecognised name does not get paid. -->
          <div class="pay-head">
            @if (logoUrl()) {
              <img [src]="logoUrl()" [alt]="p.business.name" class="pay-logo" />
            }
            <div>
              <div class="pay-muted" style="font-size:12px;">Payment requested by</div>
              <div class="pay-business">{{ p.business.name }}</div>
            </div>
          </div>

          <!-- How much. The single thing the payer is deciding about. -->
          <div class="pay-amount-box">
            <div class="pay-muted" style="font-size:12.5px;">Amount due</div>
            <div class="pay-amount">{{ fmtINR(p.invoice.amountDue) }}</div>
            @if (p.invoice.amountDue !== p.invoice.total) {
              <div class="pay-muted" style="font-size:12px;">
                Invoice total {{ fmtINR(p.invoice.total) }} — part of it has already been paid
              </div>
            }
          </div>

          <!-- For what. -->
          <dl class="pay-rows">
            <div><dt>Invoice</dt><dd class="mono">{{ p.invoice.number }}</dd></div>
            <div><dt>Invoice date</dt><dd>{{ fmtDate(p.invoice.date) }}</dd></div>
            <div><dt>Due date</dt><dd>{{ fmtDate(p.invoice.dueDate) }}</dd></div>
            @if (p.invoice.billedTo) {
              <div><dt>Billed to</dt><dd>{{ p.invoice.billedTo }}</dd></div>
            }
          </dl>

          @if (!p.gateway.enabled) {
            <!-- A documented refusal rather than a dead button: the tenant has not
                 finished connecting a gateway, and the payer needs a route that
                 works today. -->
            <div class="pay-note warn">
              <app-icon name="alertTriangle" [size]="15" />
              <span>
                Online payment is not available for this business yet. Please pay using the bank
                details on your invoice, or contact
                {{ p.business.supportEmail || 'the sender' }}.
              </span>
            </div>
          } @else {
            <button class="btn primary pay-button" type="button" [disabled]="paying()" (click)="pay()">
              @if (paying()) { <span class="spinner"></span> }
              Pay {{ fmtINR(p.invoice.amountDue) }}
            </button>
            <p class="pay-muted pay-fineprint">
              You will be taken to {{ p.gateway.provider === 'razorpay' ? 'Razorpay' : p.gateway.provider }}'s
              secure checkout. Your card details are handled entirely by them and never reach
              {{ p.business.name }} or KloguBizz.
            </p>
          }

          <div class="pay-foot">
            Link expires {{ fmtDate(p.expiresAt) }} · Reference <span class="mono">{{ p.reference }}</span>
          </div>
          }
        }
      </div>
      <div class="pay-brand">Secured by KloguBizz</div>
    </div>
  `,
  styles: [`
    .pay-wrap {
      min-height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center;
      gap:14px; padding:24px 14px; background:#f4f4f7;
    }
    .pay-card {
      width:100%; max-width:440px; background:#fff; border-radius:16px; padding:28px 26px;
      box-shadow:0 4px 24px rgba(17,24,39,0.09);
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
      color:#111827;
    }
    .pay-center { text-align:center; display:grid; gap:12px; justify-items:center; padding:14px 0; }
    .pay-icon {
      width:56px; height:56px; border-radius:50%; display:flex; align-items:center; justify-content:center;
    }
    .pay-icon.ok { background:#dcfce7; color:#15803d; }
    .pay-icon.danger { background:#fee2e2; color:#b91c1c; }
    .pay-title { font-size:19px; font-weight:700; margin:0; }
    .pay-muted { color:#6b7280; font-size:13.5px; line-height:1.65; margin:0; }
    .pay-head { display:flex; align-items:center; gap:12px; padding-bottom:18px; border-bottom:1px solid #e5e7eb; }
    .pay-logo { max-height:40px; max-width:120px; object-fit:contain; }
    .pay-business { font-size:17px; font-weight:700; }
    .pay-amount-box { text-align:center; padding:22px 0 18px; }
    .pay-amount { font-size:34px; font-weight:800; letter-spacing:-0.5px; }
    .pay-rows { margin:0; padding:0 0 18px; display:grid; gap:9px; border-bottom:1px solid #e5e7eb; }
    .pay-rows > div { display:flex; justify-content:space-between; gap:12px; font-size:13.5px; }
    .pay-rows dt { color:#6b7280; margin:0; }
    .pay-rows dd { margin:0; font-weight:600; text-align:right; }
    .pay-button { width:100%; margin-top:18px; justify-content:center; font-size:15px; padding:13px; }
    .pay-fineprint { font-size:11.5px; margin-top:10px; text-align:center; }
    .pay-note {
      display:flex; gap:9px; align-items:flex-start; margin-top:18px; padding:12px;
      border-radius:10px; font-size:13px; line-height:1.6;
    }
    .pay-note.warn { background:#fef3c7; color:#92400e; }
    .pay-foot {
      margin-top:20px; padding-top:14px; border-top:1px solid #e5e7eb;
      font-size:11.5px; color:#9ca3af; text-align:center;
    }
    .pay-brand { font-size:11.5px; color:#9ca3af; }
    .mono { font-family:ui-monospace,SFMono-Regular,Menlo,monospace; }
  `]
})
export class PayComponent implements OnInit {
  loading = signal(true);
  paying = signal(false);
  paid = signal(false);
  error = signal('');
  errorTitle = signal('This link cannot be used');
  page = signal<PayPage | null>(null);

  fmtINR = fmtINR;
  fmtDate = fmtDate;

  private token = '';
  private api = environment.apiUrl;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private checkoutLoader: RazorpayCheckoutService
  ) {}

  ngOnInit() {
    this.token = this.route.snapshot.paramMap.get('token') || '';
    if (!this.token) {
      this.loading.set(false);
      this.error.set('This payment link is incomplete. Please use the link from your email.');
      return;
    }
    this.load();
  }

  logoUrl(): string {
    const path = this.page()?.business?.logoAssetUrl;
    if (!path) return '';
    return /^https?:\/\//i.test(path) ? path : `${this.api}${path}`;
  }

  private load() {
    this.http.get<PayPage>(`${this.api}/pay/${encodeURIComponent(this.token)}`).subscribe({
      next: page => {
        this.loading.set(false);
        this.page.set(page);
        if (page.status === 'paid' || page.invoice.amountDue <= 0) this.paid.set(true);
      },
      error: err => {
        this.loading.set(false);
        // The server distinguishes expired from invalid, because "ask for a new
        // one" is actionable where "invalid" is not.
        const code = err?.error?.code;
        this.errorTitle.set(code === 'LINK_EXPIRED' ? 'This link has expired' : 'This link cannot be used');
        this.error.set(err?.error?.message || 'This payment link is not valid. Please ask the sender for a new one.');
      }
    });
  }

  /**
   * Loading moved to `RazorpayCheckoutService` once the subscription page needed
   * it too — one copy, because a payment path that behaves differently in two
   * places depending on which copy was fixed is the worst kind of duplication.
   */
  private loadCheckout(): Promise<boolean> {
    return this.checkoutLoader.load();
  }

  async pay() {
    const page = this.page();
    if (!page) return;
    this.paying.set(true);
    this.error.set('');

    const ready = await this.loadCheckout();
    if (!ready) {
      this.paying.set(false);
      this.error.set('The secure checkout could not be loaded. Check your connection and try again.');
      return;
    }

    // The order is created server-side and priced from the invoice. Nothing about
    // the amount is sent from here — there is deliberately no field for it.
    this.http.post<OrderResponse>(`${this.api}/pay/${encodeURIComponent(this.token)}/order`, {}).subscribe({
      next: order => this.openCheckout(order, page),
      error: err => {
        this.paying.set(false);
        if (err?.error?.code === 'ALREADY_PAID') {
          this.paid.set(true);
          return;
        }
        this.error.set(err?.error?.message || 'The payment could not be started. Please try again.');
      }
    });
  }

  private openCheckout(order: OrderResponse, page: PayPage) {
    const w = window as unknown as { Razorpay: RazorpayConstructor };
    const checkout = new w.Razorpay({
      key: order.keyId,
      amount: order.amountPaise,
      currency: order.currency,
      name: order.business,
      description: `Invoice ${order.invoiceNumber}`,
      order_id: order.orderId,
      prefill: {},
      theme: { color: '#4f46e5' },
      handler: (response: Record<string, string>) => this.confirm(response),
      modal: {
        // Closing the window is not a failure — the customer simply decided not
        // to pay now, and telling them something went wrong would be a lie.
        ondismiss: () => this.paying.set(false)
      }
    });

    checkout.on('payment.failed', (response: unknown) => {
      this.paying.set(false);
      const reason = (response as { error?: { description?: string } })?.error?.description;
      this.error.set(reason || 'The payment did not go through. Nothing has been charged — please try again.');
      this.errorTitle.set('Payment not completed');
    });

    checkout.open();
    void page;
  }

  /**
   * Confirms the completed checkout with our server, which verifies the
   * signature before recording anything.
   *
   * A failure here is deliberately *not* reported as a failed payment: the money
   * may well have been taken, and the webhook will reconcile it. Telling the
   * customer it failed would invite a second payment.
   */
  private confirm(response: Record<string, string>) {
    this.http.post<{ ok: boolean; duplicate: boolean; message: string }>(
      `${this.api}/pay/${encodeURIComponent(this.token)}/confirm`,
      response
    ).subscribe({
      next: () => {
        this.paying.set(false);
        this.paid.set(true);
      },
      error: err => {
        this.paying.set(false);
        if (err?.error?.code === 'SIGNATURE_INVALID') {
          this.errorTitle.set('Payment could not be verified');
          this.error.set(err.error.message);
          return;
        }
        // Optimistic on purpose — see the note above.
        this.paid.set(true);
      }
    });
  }
}
