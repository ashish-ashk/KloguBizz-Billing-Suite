import { beforeEach, describe, expect, it } from 'vitest';
import { RazorpayCheckoutService, RazorpayCheckout } from './razorpay-checkout.service';

/**
 * The loader behind both payment paths — a customer paying a tenant's invoice,
 * and a tenant paying us for a subscription.
 *
 * Worth pinning on its own because its failure modes are the ones a payment
 * screen cannot recover from: two script tags racing each other, or a promise
 * that stays failed so the button never works again for the rest of the session.
 *
 * The DOM is stubbed through the class's own seam rather than by adding jsdom.
 * `vitest.config.ts` runs in node deliberately, and what is under test here is
 * the caching, not the script tag.
 */
class TestableCheckout extends RazorpayCheckoutService {
  injections = 0;
  loaded = false;
  private pending: ((ok: boolean) => void)[] = [];

  protected override constructorRef() {
    return this.loaded
      ? ((() => ({ open: () => {}, on: () => {} }) as RazorpayCheckout) as never)
      : null;
  }

  protected override injectScript(): Promise<boolean> {
    this.injections += 1;
    return new Promise<boolean>(resolve => this.pending.push(resolve));
  }

  /** Completes the in-flight load, as `onload`/`onerror` would. */
  settle(ok: boolean) {
    this.loaded = ok;
    this.pending.forEach(resolve => resolve(ok));
    this.pending = [];
  }
}

describe('RazorpayCheckoutService', () => {
  let service: TestableCheckout;

  beforeEach(() => {
    service = new TestableCheckout();
  });

  it('loads once, however many times it is asked', async () => {
    const first = service.load();
    const second = service.load();

    /**
     * Two clicks on Pay must not inject two copies of a third-party payment
     * script — the second redefines the global mid-checkout.
     */
    expect(service.injections).toBe(1);

    service.settle(true);
    expect(await first).toBe(true);
    expect(await second).toBe(true);
  });

  it('resolves false on a failure, and allows a retry', async () => {
    const first = service.load();
    service.settle(false);

    /**
     * Resolved false rather than rejected: an unhandled rejection inside a click
     * handler is a blank screen, and the caller has a real message to show.
     */
    expect(await first).toBe(false);

    // And the failure is not sticky — a flaky connection must not disable
    // payment for the rest of the session.
    const retry = service.load();
    expect(service.injections).toBe(2);
    service.settle(true);
    expect(await retry).toBe(true);
  });

  it('skips the injection entirely once the script is present', async () => {
    service.settle(true);
    expect(await service.load()).toBe(true);
    expect(service.injections).toBe(0);
  });

  it('returns null rather than throwing when opened before it has loaded', () => {
    /**
     * The caller checks `load()` first; this is the belt to those braces. The
     * alternative is a TypeError inside a click handler and a button that
     * silently does nothing — which is precisely the bug this change fixes on
     * the subscription page.
     */
    expect(service.open({})).toBeNull();
  });
});
