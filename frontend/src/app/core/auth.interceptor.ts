import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
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

  return next(authedReq).pipe(
    catchError((err: HttpErrorResponse) => {
      // A 401 on an ordinary request most often just means the access token
      // expired between the proactive renewal timer's last run and now (a
      // laptop woken from sleep, a timer that lost a race). One silent refresh
      // and replay is tried before treating this as a real session loss.
      if (err.status === 401 && canRefresh) {
        return auth.refreshAccessToken().pipe(
          switchMap(refreshed => {
            if (!refreshed) return throwError(() => err);
            const newToken = localStorage.getItem('klogubizz_token');
            return next(req.clone({ setHeaders: { Authorization: `Bearer ${newToken}` } }));
          })
        );
      }

      // Expired/invalid session with no way to recover it: clear credentials
      // (in-memory signals too, via AuthService.forceLogout — not just
      // localStorage) and return to login.
      if (err.status === 401 && !req.url.includes('/auth/login') && !req.url.includes('/auth/register')) {
        const message = err.error?.code === 'SESSION_REVOKED'
          ? 'You were signed out because your account signed in on another device.'
          : 'Your session has expired. Please sign in again.';
        auth.forceLogout(message);
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
