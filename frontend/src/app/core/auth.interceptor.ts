import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { ToastService } from './toast.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const toast = inject(ToastService);
  const token = localStorage.getItem('klogubizz_token');
  const authedReq = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authedReq).pipe(
    catchError((err: HttpErrorResponse) => {
      // Expired/invalid session: clear credentials and return to login.
      if (err.status === 401 && !req.url.includes('/auth/login') && !req.url.includes('/auth/register')) {
        if (err.error?.code === 'SESSION_REVOKED') {
          toast.info('You were signed out because your account signed in on another device.');
        }
        localStorage.removeItem('klogubizz_token');
        localStorage.removeItem('klogubizz_user');
        localStorage.removeItem('klogubizz_org');
        router.navigateByUrl('/login');
      }
      return throwError(() => err);
    })
  );
};
