import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { shareReplay, tap } from 'rxjs/operators';

/**
 * A small request cache with explicit invalidation.
 *
 * Every feature component refetched everything it needed in `ngOnInit`, with no
 * HTTP cache, no shared store and no request deduplication. Navigating
 * Invoices → Clients → Invoices issued the invoice list three times; opening the
 * Bill Generator refetched the entire client list and the entire item catalogue
 * even though the page you came from had just loaded both.
 *
 * Two problems, two mechanisms:
 *
 *  - **Duplicate concurrent requests.** Two components asking for the same key at
 *    the same time should produce one HTTP call. The in-flight observable is
 *    shared (`shareReplay`) until it settles.
 *  - **Needless refetches on navigation.** A result is reused for a short TTL.
 *    Deliberately short: this is a billing app, and stale money is worse than a
 *    redundant request. The TTL covers navigation, not the passage of time.
 *
 * What this is *not* is a write-through store. Mutations call `invalidate()` with
 * the affected prefix, and the next read goes to the server. That is far easier
 * to reason about than trying to patch cached collections in place, and it cannot
 * drift from what the database actually holds — which matters more here than
 * saving one request after a save.
 */

interface CacheEntry {
  /** Set while a request is in flight, so concurrent callers share it. */
  inFlight?: Observable<unknown>;
  value?: unknown;
  storedAt?: number;
}

/** Long enough to cover navigating away and back; short enough to stay honest. */
const DEFAULT_TTL_MS = 30_000;

@Injectable({ providedIn: 'root' })
export class CacheService {
  private entries = new Map<string, CacheEntry>();

  /**
   * Returns the cached value for `key`, or subscribes to `request` and caches
   * what comes back.
   *
   * `request` is a factory rather than an observable so that a cache hit never
   * constructs the request at all.
   */
  through<T>(key: string, request: () => Observable<T>, ttlMs = DEFAULT_TTL_MS): Observable<T> {
    const entry = this.entries.get(key);
    const now = Date.now();

    if (entry?.value !== undefined && entry.storedAt !== undefined && now - entry.storedAt < ttlMs) {
      return of(entry.value as T);
    }
    // A request is already on its way — join it instead of starting a second.
    if (entry?.inFlight) return entry.inFlight as Observable<T>;

    const shared = request().pipe(
      tap(value => {
        this.entries.set(key, { value, storedAt: Date.now() });
      }),
      // `refCount: false` keeps the replayed value available to a late
      // subscriber; without it, a component subscribing after the first one
      // completed would trigger a fresh request.
      shareReplay({ bufferSize: 1, refCount: false })
    );

    // Stored before subscribing so a synchronous second caller sees it.
    this.entries.set(key, { ...entry, inFlight: shared });

    // A failure must not be cached — and must not leave a poisoned in-flight
    // entry that every later caller replays the error from.
    shared.subscribe({
      error: () => this.entries.delete(key)
    });

    return shared;
  }

  /**
   * Drops every entry whose key starts with one of the given prefixes.
   *
   * Prefixes rather than exact keys because a list key encodes its query
   * (`invoices?page=2&status=overdue`), and recording a payment invalidates
   * *every* invoice page, not just the one currently on screen.
   */
  invalidate(...prefixes: string[]) {
    if (!prefixes.length) return;
    for (const key of [...this.entries.keys()]) {
      if (prefixes.some(prefix => key.startsWith(prefix))) this.entries.delete(key);
    }
  }

  /** Used on logout: the next user must never see the previous one's data. */
  clear() {
    this.entries.clear();
  }
}
