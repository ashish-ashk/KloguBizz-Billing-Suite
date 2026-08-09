import { describe, expect, it, vi } from 'vitest';
import { Subject, of, throwError } from 'rxjs';
import { ServerList } from './server-list';
import { ListParams, Page } from './models';

/**
 * `ServerList` is where the expensive frontend bugs live, and none of them need
 * a browser to find.
 *
 * Every paginated list in the app runs through it. A fault here does not break
 * one screen — it shows the wrong rows on all of them, and shows them
 * convincingly, which is worse than an error. The stale-response guard in
 * particular is the kind of thing that works perfectly on a fast connection and
 * fails only for the users on a slow one.
 */

function page<T>(rows: T[], overrides: Partial<Page<T>> = {}): Page<T> {
  return {
    data: rows,
    page: 1,
    limit: 25,
    total: rows.length,
    pages: 1,
    hasMore: false,
    ...overrides
  };
}

describe('ServerList', () => {
  it('drops a response that a newer request has superseded', () => {
    const first = new Subject<Page<string>>();
    const second = new Subject<Page<string>>();
    const responses = [first, second];
    const list = new ServerList<string>(() => responses.shift()!.asObservable());

    list.load();
    list.load();

    // The second request answers first, then the first one arrives late.
    second.next(page(['current']));
    first.next(page(['stale']));

    /**
     * The bug this prevents: two requests in flight, the slower one started
     * earlier, and its answer lands last — so the table ends up showing results
     * for a query the user has already moved on from, with no error and no clue
     * that anything is wrong. It is invisible on a fast connection and constant
     * on a slow one.
     */
    expect(list.rows()).toEqual(['current']);
  });

  it('drops a late failure too, so an old error cannot blank a good page', () => {
    const good = new Subject<Page<string>>();
    const responses: Array<() => any> = [
      () => throwError(() => new Error('slow request failed')),
      () => good.asObservable()
    ];
    const list = new ServerList<string>(() => responses.shift()!());

    list.load(); // errors immediately
    list.load();
    good.next(page(['loaded']));

    // A failure from a superseded request is as stale as a success from one.
    // Without the same guard, an old error would paint a working page as broken.
    expect(list.failed()).toBe(false);
    expect(list.rows()).toEqual(['loaded']);
  });

  it('steps back a page when the current one has emptied', () => {
    const responses = [
      page<string>([], { page: 3, total: 40, pages: 2 }),
      page(['a', 'b'], { page: 2, total: 40, pages: 2 })
    ];
    const list = new ServerList<string>(() => of(responses.shift()!));

    list.page.set(3);
    list.load();

    // A filter narrowed the set, or rows were deleted, and page 3 no longer
    // exists. Left alone this is an empty table with a pager pointing nowhere —
    // which reads as "no data" rather than "you are past the end".
    expect(list.page()).toBe(2);
    expect(list.rows()).toEqual(['a', 'b']);
  });

  it('does not loop when the last page is legitimately empty', () => {
    const fetch = vi.fn(() => of(page<string>([], { page: 1, total: 0, pages: 1 })));
    const list = new ServerList<string>(fetch);

    list.load();

    // `total: 0` means there is genuinely nothing, not that we overshot. Backing
    // up from page 1 of an empty collection would recurse.
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(list.page()).toBe(1);
  });

  it('returns to page one whenever the matching set changes', () => {
    const list = new ServerList<string>(() => of(page(['x'], { page: 1 })));
    list.page.set(4);
    list.onSort('-createdAt');
    // Staying on page 4 of a differently-sorted or differently-filtered set
    // shows a window into data the user never asked to skip past.
    expect(list.page()).toBe(1);

    list.page.set(6);
    list.setFilter('status', 'paid');
    expect(list.page()).toBe(1);
  });

  it('debounces typing rather than firing a request per keystroke', async () => {
    vi.useFakeTimers();
    const fetch = vi.fn(() => of(page(['x'])));
    const list = new ServerList<string>(fetch);
    fetch.mockClear();

    list.onSearch('a');
    list.onSearch('ac');
    list.onSearch('acm');
    list.onSearch('acme');
    expect(fetch).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);
    // One request for a word, not one per letter — and the last one wins.
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(list.search()).toBe('acme');
    vi.useRealTimers();
  });

  it('drops an empty filter instead of sending it', () => {
    const captured: ListParams[] = [];
    const list = new ServerList<string>(params => {
      captured.push(params);
      return of(page(['x']));
    });

    list.setFilter('status', 'paid');
    list.setFilter('status', undefined);

    // An empty filter is "no filter", not "match the empty string" — sending it
    // is how a list silently returns nothing.
    expect(captured.at(-1)).not.toHaveProperty('status');
  });
});
