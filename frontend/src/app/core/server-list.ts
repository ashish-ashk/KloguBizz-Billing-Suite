import { signal } from '@angular/core';
import { Observable } from 'rxjs';
import { ListParams, Page } from './models';

/**
 * State for a server-paginated list.
 *
 * Every list page used to fetch the whole collection and then filter, sort and
 * slice it in the browser — `filtered()` over a `signal<T[]>` holding everything,
 * `paged()` slicing that. It looked like pagination but the entire table was
 * already in memory; the page size only controlled how much of it was painted.
 *
 * The paging, searching and sorting now happen in the database. This class holds
 * the query state and the current window, and the component supplies one fetch
 * function. What it buys beyond less duplication:
 *
 *  - **Debounced search.** Typing "acme" is one request, not four.
 *  - **Out-of-order protection.** A slow request for "ac" must not overwrite the
 *    result of the later "acme" it was beaten by. Each request carries a sequence
 *    number and a stale response is discarded.
 *  - **A page that can't strand the user.** Deleting the last row of the last
 *    page steps back rather than showing an empty table with no way forward.
 */

const SEARCH_DEBOUNCE_MS = 300;

export class ServerList<T> {
  readonly rows = signal<T[]>([]);
  readonly total = signal(0);
  readonly pages = signal(1);
  readonly loading = signal(true);
  /** Set when the last fetch failed, so the page can offer a retry rather than
   *  showing an empty state that implies "no data". */
  readonly failed = signal(false);

  readonly page = signal(1);
  readonly pageSize = signal(25);
  readonly search = signal('');
  readonly sort = signal('');
  /** Endpoint-specific filters (status, clientId, method...). */
  readonly filters = signal<ListParams>({});

  /** Guards against an earlier request resolving after a later one. */
  private sequence = 0;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private fetch: (params: ListParams) => Observable<Page<T>>) {}

  /** The query as the server will receive it. */
  params(): ListParams {
    const params: ListParams = {
      ...this.filters(),
      page: this.page(),
      limit: this.pageSize()
    };
    if (this.search().trim()) params.q = this.search().trim();
    if (this.sort()) params.sort = this.sort();
    return params;
  }

  load(): void {
    const seq = ++this.sequence;
    this.loading.set(true);
    this.failed.set(false);
    this.fetch(this.params()).subscribe({
      next: result => {
        // A response from a superseded request is dropped: it describes a query
        // the user has already moved on from.
        if (seq !== this.sequence) return;
        this.rows.set(result.data ?? []);
        this.total.set(result.total ?? 0);
        this.pages.set(result.pages ?? 1);
        this.loading.set(false);

        // Landing past the end (a filter narrowed the set, or rows were deleted)
        // would otherwise show an empty table with the pager pointing nowhere.
        if (result.page > 1 && (result.data ?? []).length === 0 && result.total > 0) {
          this.page.set(Math.min(result.page - 1, result.pages || 1));
          this.load();
        }
      },
      error: () => {
        if (seq !== this.sequence) return;
        this.loading.set(false);
        this.failed.set(true);
      }
    });
  }

  /** Any change that alters *which* rows match starts again from page one. */
  private reloadFromFirstPage(): void {
    this.page.set(1);
    this.load();
  }

  onSearch(term: string): void {
    this.search.set(term);
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      this.reloadFromFirstPage();
    }, SEARCH_DEBOUNCE_MS);
  }

  onPage(page: number): void {
    this.page.set(page);
    this.load();
  }

  onPageSize(size: number): void {
    this.pageSize.set(size);
    this.reloadFromFirstPage();
  }

  onSort(sort: string): void {
    this.sort.set(sort);
    this.reloadFromFirstPage();
  }

  setFilter(key: string, value: string | number | boolean | undefined): void {
    const next = { ...this.filters() };
    if (value === undefined || value === '') delete next[key];
    else next[key] = value;
    this.filters.set(next);
    this.reloadFromFirstPage();
  }

  /**
   * Reloads after a mutation, keeping the user where they are — except when the
   * page they are on has just been emptied, which `load()` corrects.
   */
  refresh(): void {
    this.load();
  }

  /** Cancels a pending debounced search; call from `ngOnDestroy`. */
  dispose(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = null;
    // Invalidates any response still in flight.
    this.sequence += 1;
  }
}
