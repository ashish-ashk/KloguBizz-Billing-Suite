import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { EMPTY, catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

// Requests where a 401 means "this credential really is bad", not "the access
// token just expired" — retrying these via a silent refresh would either be
// meaningless (login/register carry no token at all) or risk masking a
// genuine refresh-token failure behind another refresh attempt.
const NEVER_REFRESH_ON_401 = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/mfa/verify'];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = localStorage.getItem('klogubizz_token');
  const authedReq = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
  const canRefresh = !!token && !NEVER_REFRESH_ON_401.some(url => req.url.includes(url));

  /**
   * Expired/invalid session with no way to recover it: clear credentials
   * (in-memory signals too, via AuthService.forceLogout — not just localStorage)
   * and return to login.
   *
   * This is a function rather than a block further down because **every**
   * unrecoverable 401 has to reach it. It previously sat below an `if` that
   * returned early, so a 401 whose refresh attempt failed skipped it entirely:
   * the user stayed on the page, every request kept failing, and all they saw was
   * a generic error toast with no sign-in prompt and no data. The
   * `refreshAccessToken()` contract makes that easy to hit — it resolves `false`
   * *without* logging out whenever there is simply no refresh token to present.
   */
  const endSession = (err: HttpErrorResponse) => {
    if (req.url.includes('/auth/login') || req.url.includes('/auth/register')) return false;
    const message = err.error?.code === 'SESSION_REVOKED'
      ? 'You were signed out because your account signed in on another device.'
      : 'Your session has expired. Please sign in again.';
    auth.forceLogout(message);
    return true;
  };

  /**
   * Once the session has been ended, the failed request is completed silently
   * rather than rethrown.
   *
   * The alternative gives the user two messages for one event: this
   * interceptor's "your session has expired", and then whatever the calling
   * component says when its own error handler runs — usually a raw server
   * message or a bare "something went wrong". They contradict each other in tone
   * and the second one is noise: the page is already navigating to sign-in, and
   * there is nothing the component's error branch can usefully do.
   */
  const ended = (err: HttpErrorResponse) => (endSession(err) ? EMPTY : throwError(() => err));

  return next(authedReq).pipe(
    catchError((err: HttpErrorResponse) => {
      // A 401 on an ordinary request most often just means the access token
      // expired between the proactive renewal timer's last run and now (a
      // laptop woken from sleep, a timer that lost a race). One silent refresh
      // and replay is tried before treating this as a real session loss.
      if (err.status === 401 && canRefresh) {
        return auth.refreshAccessToken().pipe(
          switchMap(refreshed => {
            if (!refreshed) return ended(err);
            const newToken = localStorage.getItem('klogubizz_token');
            return next(req.clone({ setHeaders: { Authorization: `Bearer ${newToken}` } })).pipe(
              // The replay 401ing too means the brand-new access token was already
              // refused — the session is genuinely gone (revoked, membership
              // removed), not merely stale. Without this the retry swallows the
              // outcome and the user is left on a page that will never load.
              catchError((retryErr: HttpErrorResponse) =>
                (retryErr.status === 401 ? ended(retryErr) : throwError(() => retryErr)))
            );
          })
        );
      }

      if (err.status === 401) return ended(err);

      /**
       * A platform account that has not enrolled in MFA (#7).
       *
       * The server refuses every console route with this until enrolment, and
       * deliberately leaves the enrolment endpoints open — so the *only* thing
       * missing was sending the operator to the page that fixes it. Without this
       * they get a bare "two-factor is required" toast on whatever screen they
       * were on, with nothing to click.
       *
       * Navigation is guarded so a burst of refused requests on one page load
       * produces one redirect rather than fighting the router.
       */
      if (err.status === 403 && err.error?.code === 'MFA_ENROLMENT_REQUIRED') {
        auth.requireMfaEnrolment();
      }

      // The organisation was suspended or cancelled while this session was open.
      // The cached organisation still says 'active' (it was stored at login), so
      // sync it — otherwise the read-only banner never appears and the user just
      // sees writes fail for no visible reason.
      if (err.status === 403 && (err.error?.code === 'ORG_SUSPENDED' || err.error?.code === 'ORG_CANCELLED')) {
        auth.markOrganisationStatus(err.error.code === 'ORG_SUSPENDED' ? 'suspended' : 'cancelled');
      }

      return throwError(() => err);
    })
  );
};
