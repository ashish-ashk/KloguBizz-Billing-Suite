import { Injectable, NgZone, OnDestroy, signal } from '@angular/core';
import { AuthService } from './auth.service';

/**
 * Signs the user out after a period with no interaction, and **only** then.
 *
 * This exists because the two things were conflated. The access token lives 15
 * minutes and is silently renewed in the background, so "the token expired" was
 * never supposed to be visible to anyone. When that renewal failed, the effect
 * looked exactly like an idle timeout — the app stopped working about a quarter
 * of an hour in — which meant the product had, by accident, the *inverse* of the
 * behaviour it wanted: active users were cut off, and a laptop left open on a
 * customer's invoice stayed signed in indefinitely.
 *
 * So the two concerns are now separate and each is explicit:
 *
 *   - **Token lifetime** is invisible. `AuthService` renews ahead of expiry and
 *     the interceptor retries once on a 401. Working for eight hours straight
 *     never signs anyone out.
 *   - **Inactivity** is what ends a session, measured from the last real
 *     interaction, and it says so when it does.
 *
 * Three details that a naive version gets wrong:
 *
 * **It polls rather than scheduling a `setTimeout` for the deadline.** A timer
 * armed for fifteen minutes does not fire on time across a laptop suspend — the
 * browser throttles or defers it — so a machine closed at 5pm and reopened the
 * next morning would sit signed in until the timer eventually caught up.
 * Comparing wall-clock timestamps on a short interval is immune to that: on wake
 * the very next tick sees fifteen hours of idleness and ends the session.
 *
 * **Activity is shared across tabs**, through `localStorage`. Two tabs open on
 * the same account, one being typed into, is normal use; without sharing, the
 * background tab reaches its own deadline and signs the account out from under
 * the tab actually in use.
 *
 * **Listeners are registered outside Angular's zone.** `pointermove` fires
 * hundreds of times a minute, and inside the zone each one triggers change
 * detection across the whole application — an idle timer that makes the app
 * stutter is a worse bug than the one it fixes.
 */
@Injectable({ providedIn: 'root' })
export class IdleService implements OnDestroy {
  /** How long without interaction before the session ends. */
  private readonly IDLE_LIMIT_MS = 15 * 60_000;

  /**
   * How long before that to warn.
   *
   * Not decoration: an invoice half-typed and not yet saved is lost when the
   * session ends, and losing it with no warning at all is the kind of thing that
   * makes people distrust the whole product. A minute is enough to click.
   */
  private readonly WARN_BEFORE_MS = 60_000;

  /**
   * How often to compare the clock against the last interaction.
   *
   * Five seconds: fine enough that the warning countdown ticks smoothly, coarse
   * enough to be free.
   */
  private readonly TICK_MS = 5_000;

  /** Shared across tabs, so activity anywhere counts everywhere. */
  private readonly ACTIVITY_KEY = 'klogubizz_last_activity';

  /**
   * Interaction is split into two kinds, and the difference matters once the
   * warning is up.
   *
   * **Discrete** events are decisions — a key, a click, a tap. Nothing produces
   * one by accident.
   *
   * **Passive** events are not: a cursor nudged by a passing sleeve, a trackpad
   * brushed while reaching for a coffee, a scroll from a phone in a pocket. They
   * are good evidence of presence most of the time, so they count normally — but
   * once the countdown is visible they are ignored, for two reasons. It makes the
   * warning honest: if nobody is there to *press* anything, the sign-out happens,
   * which is the entire point of the feature. And it makes the dialog usable at
   * all — moving the mouse towards "Stay signed in" is itself a `pointermove`, so
   * counting it dismissed the dialog out from under the cursor before the click
   * landed. That is not hypothetical; it is what the first version did, and
   * driving the real page in a browser is how it was caught.
   *
   * Passive events also fire continuously and each `localStorage` write is
   * synchronous, so they are throttled (`THROTTLE_MS`); discrete ones record
   * immediately.
   */
  private readonly DISCRETE_EVENTS = ['pointerdown', 'keydown', 'touchstart'];
  private readonly PASSIVE_EVENTS = ['pointermove', 'scroll', 'wheel'];
  private readonly THROTTLE_MS = 5_000;

  /** Seconds left before sign-out, or `null` when not warning. Read by
   *  `IdleWarningComponent`; nothing else should need it. */
  readonly warningSeconds = signal<number | null>(null);

  /**
   * The limit in words, derived rather than written out.
   *
   * The sign-out message quotes the limit, and a hardcoded "15 minutes" beside a
   * configurable constant is a lie waiting to happen — it already told a tester
   * "15 minutes" while the limit was twenty seconds.
   */
  readonly limitLabel = (() => {
    const minutes = Math.round(this.IDLE_LIMIT_MS / 60_000);
    if (minutes >= 1) return `${minutes} minute${minutes === 1 ? '' : 's'}`;
    const seconds = Math.round(this.IDLE_LIMIT_MS / 1000);
    return `${seconds} second${seconds === 1 ? '' : 's'}`;
  })();

  private lastActivity = Date.now();
  private lastWrite = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly onDiscrete = (e: Event) => this.record({ event: e });
  private readonly onPassive = (e: Event) => this.record({ passive: true, event: e });
  private readonly onWake = () => { if (!document.hidden) this.tick(); };

  constructor(private auth: AuthService, private zone: NgZone) {}

  /**
   * Starts watching. Called once from the app root.
   *
   * Idempotent, and safe to call while signed out — `tick` simply does nothing
   * until there is a session to end.
   */
  start() {
    if (this.timer) return;
    this.lastActivity = this.readSharedActivity();
    this.zone.runOutsideAngular(() => {
      for (const name of this.DISCRETE_EVENTS) {
        window.addEventListener(name, this.onDiscrete, { passive: true, capture: true });
      }
      for (const name of this.PASSIVE_EVENTS) {
        window.addEventListener(name, this.onPassive, { passive: true, capture: true });
      }
      // Returning to a backgrounded tab is the moment a suspended machine is most
      // likely to have blown past the limit, so check immediately rather than
      // waiting up to a full tick.
      document.addEventListener('visibilitychange', this.onWake);
      window.addEventListener('focus', this.onWake);
      this.timer = setInterval(() => this.tick(), this.TICK_MS);
    });
  }

  /**
   * Treats now as the last interaction — used by the warning's "Stay signed in"
   * button and after a fresh sign-in, so a new session does not inherit the
   * previous one's idle clock.
   */
  record(opts: { passive?: boolean; event?: Event } = {}) {
    const warning = this.warningSeconds() !== null;
    // Once the countdown is up, only a deliberate act rescues the session. See
    // DISCRETE_EVENTS/PASSIVE_EVENTS above for why.
    if (warning && opts.passive) return;
    /**
     * Interactions *inside* the warning dialog are left entirely to the dialog.
     *
     * These listeners are on `window` in the capture phase, so they see a
     * `pointerdown` before the button does. Dismissing there tore the overlay out
     * of the DOM between the press and the release: the click never completed on
     * the button, and the mouse-up landed on whatever was underneath — so
     * "Stay signed in" could activate a control on the page behind it. The
     * dialog's own handler calls `record()` on `click`, once the press has
     * finished.
     */
    if (opts.event && this.isInsideWarning(opts.event)) return;
    const now = Date.now();
    this.lastActivity = now;
    if (warning) this.zone.run(() => this.warningSeconds.set(null));
    // Throttled: this is a synchronous write and `pointermove` is not rare.
    if (now - this.lastWrite < this.THROTTLE_MS) return;
    this.lastWrite = now;
    try { localStorage.setItem(this.ACTIVITY_KEY, String(now)); } catch { /* private mode */ }
  }

  /** Called on sign-out so the next session starts with a clean clock. */
  reset() {
    this.warningSeconds.set(null);
    this.lastActivity = Date.now();
    this.lastWrite = 0;
    try { localStorage.removeItem(this.ACTIVITY_KEY); } catch { /* private mode */ }
  }

  /** Whether an event originated inside the warning dialog. Matched on the
   *  attribute rather than a class so restyling the dialog cannot quietly break
   *  the behaviour above. */
  private isInsideWarning(event: Event): boolean {
    const target = event.target;
    return target instanceof Element && !!target.closest('[data-idle-warning]');
  }

  private readSharedActivity(): number {
    try {
      const raw = Number(localStorage.getItem(this.ACTIVITY_KEY));
      // The newest of the two wins, so another tab's activity counts here and a
      // stale or absent value never *shortens* this tab's clock.
      return Number.isFinite(raw) && raw > 0 ? Math.max(raw, this.lastActivity) : this.lastActivity;
    } catch {
      return this.lastActivity;
    }
  }

  private tick() {
    // Nothing to end. Checked every tick rather than at start, because the
    // service outlives any single sign-in.
    if (!this.auth.token) {
      if (this.warningSeconds() !== null) this.zone.run(() => this.warningSeconds.set(null));
      return;
    }

    const idleFor = Date.now() - this.readSharedActivity();
    const remaining = this.IDLE_LIMIT_MS - idleFor;

    if (remaining <= 0) {
      // Back inside the zone: this navigates and updates signals.
      this.zone.run(() => {
        this.warningSeconds.set(null);
        this.reset();
        this.auth.forceLogout(`You were signed out after ${this.limitLabel} without activity.`);
      });
      return;
    }

    if (remaining <= this.WARN_BEFORE_MS) {
      const seconds = Math.ceil(remaining / 1000);
      if (this.warningSeconds() !== seconds) this.zone.run(() => this.warningSeconds.set(seconds));
    } else if (this.warningSeconds() !== null) {
      this.zone.run(() => this.warningSeconds.set(null));
    }
  }

  ngOnDestroy() {
    for (const name of this.DISCRETE_EVENTS) window.removeEventListener(name, this.onDiscrete, { capture: true });
    for (const name of this.PASSIVE_EVENTS) window.removeEventListener(name, this.onPassive, { capture: true });
    document.removeEventListener('visibilitychange', this.onWake);
    window.removeEventListener('focus', this.onWake);
    if (this.timer) clearInterval(this.timer);
  }
}
