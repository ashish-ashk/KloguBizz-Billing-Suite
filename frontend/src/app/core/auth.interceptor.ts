import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = localStorage.getItem('klogubizz_token');
  const authedReq = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authedReq).pipe(
    catchError((err: HttpErrorResponse) => {
      // Expired/invalid session: clear credentials (in-memory signals too,
      // via AuthService.forceLogout — not just localStorage) and return to login.
      if (err.status === 401 && !req.url.includes('/auth/login') && !req.url.includes('/auth/register')) {
        const message = err.error?.code === 'SESSION_REVOKED'
          ? 'You were signed out because your account signed in on another device.'
          : 'Your session has expired. Please sign in again.';
        auth.forceLogout(message);
      }
      return throwError(() => err);
    })
  );
};
