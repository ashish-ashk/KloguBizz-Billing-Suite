import { Injectable } from '@angular/core';

/** The subset of Razorpay's checkout object this app uses. */
export interface RazorpayCheckout {
  open(): void;
  on(event: string, handler: (response: unknown) => void): void;
}

type RazorpayConstructor = new (options: Record<string, unknown>) => RazorpayCheckout;

const CHECKOUT_SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js';

/**
 * Loads Razorpay's checkout script on demand, once.
 *
 * Not in `index.html`: every visitor would download a payment script they will
 * never use, and a third-party script on every page of a billing product is a
 * larger surface than it needs to be.
 *
 * Shared by the two places that take money — a customer paying a tenant's
 * invoice, and a tenant paying us for a subscription. It was inlined in the
 * first when the second did not exist; a second copy would be the kind that
 * drifts, and a payment path that behaves differently in two places depending on
 * which copy was fixed is the worst version of that.
 */
@Injectable({ providedIn: 'root' })
export class RazorpayCheckoutService {
  /**
   * In flight or resolved, so two clicks cannot append two script tags.
   *
   * Resolves `false` rather than rejecting: the caller has a real message to
   * show, and an unhandled rejection in a payment flow is a blank screen.
   */
  private loading: Promise<boolean> | null = null;

  load(): Promise<boolean> {
    if (this.constructorRef()) return Promise.resolve(true);
    if (this.loading) return this.loading;

    this.loading = this.injectScript().then(ok => {
      // Cleared on failure so a later attempt can retry, rather than being stuck
      // with a permanently failed promise — a flaky connection should not
      // disable payment for the rest of the session.
      if (!ok) this.loading = null;
      return ok;
    });
    return this.loading;
  }

  /** Constructs a checkout. Call only after `load()` has resolved true. */
  open(options: Record<string, unknown>): RazorpayCheckout | null {
    const ctor = this.constructorRef();
    if (!ctor) return null;
    return new ctor(options);
  }

  /**
   * The two places this class touches the DOM, kept as overridable methods.
   *
   * `vitest.config.ts` runs in node deliberately — the reasoning there is that
   * the bugs worth unit-testing in this codebase are pure logic, and anything
   * browser-shaped belongs in the Playwright run. The logic worth pinning here
   * *is* pure — load exactly once, allow a retry after a failure — and it only
   * incidentally involves a script tag. Naming the seam keeps both true without
   * adding jsdom to every run.
   */
  protected constructorRef(): RazorpayConstructor | null {
    return (globalThis as unknown as { Razorpay?: RazorpayConstructor }).Razorpay || null;
  }

  protected injectScript(): Promise<boolean> {
    return new Promise<boolean>(resolve => {
      const script = document.createElement('script');
      script.src = CHECKOUT_SCRIPT;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });
  }
}
