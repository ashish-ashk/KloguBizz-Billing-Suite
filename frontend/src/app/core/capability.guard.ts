import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';

/**
 * Keeps a bookmarked URL from landing on a page the plan does not include.
 *
 * The server already refuses every request behind those pages, so this is not
 * the control — it is what stops the *page* from rendering, firing four requests
 * that all 403, and leaving somebody looking at a screen of error toasts with no
 * idea what went wrong. A deep link to `/profit-loss` on a Starter plan is a
 * perfectly reasonable thing for a browser to do with a stale bookmark.
 *
 * Redirects to the Subscription page rather than to the dashboard, because that
 * is where the answer is: it lists every plan and what each includes. Silently
 * bouncing somebody to the dashboard would leave them thinking the link was
 * broken.
 *
 * Waits for the session before deciding. `AuthService.can()` is optimistic while
 * the capability list is empty, which is right for a menu — flashing "upgrade" at
 * a paying customer on a slow connection looks like a bug — and it means this
 * guard must not run before the list has arrived, or it would let everything
 * through on a cold load. `refreshSession` is already awaited by the auth guard
 * ahead of this one.
 */
export function requireCapability(key: string, featureName: string): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const toast = inject(ToastService);

    const decide = (): boolean | UrlTree => {
      if (auth.can(key)) return true;
      // Said out loud, because a redirect with no explanation reads as a bug.
      toast.info(`${featureName} is not included in your current plan.`);
      return router.createUrlTree(['/subscription']);
    };

    /**
     * With a list in hand, decide now. The list is persisted across reloads, so
     * this is the normal path even on a cold load.
     */
    if (auth.capabilities().length) return decide();

    /**
     * Nothing stored — a first load on this device, or a cleared browser. Wait
     * for the session rather than guessing.
     *
     * `can()` is deliberately optimistic on an empty list, which is right for a
     * menu (flashing "upgrade" at a paying customer on a slow connection looks
     * like a bug) and wrong here: it would let every locked page through on a
     * cold load. Found by driving it — the nav hid correctly and a deep link
     * sailed straight past.
     */
    return auth.refreshSession(true).pipe(
      map(() => decide()),
      // A failed refresh is not a licence to open a paid page, but it is also not
      // this guard's problem to report — the interceptor already handles an
      // unusable session.
      catchError(() => of(decide()))
    );
  };
}
