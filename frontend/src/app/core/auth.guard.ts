import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.token) return true;
  return router.createUrlTree(['/login']);
};

export const superAdminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.token && auth.isSuperAdmin()) return true;
  return router.createUrlTree(['/dashboard']);
};

/** Tenant-admin-only routes (e.g. Appearance) — accountants/viewers get bounced home. */
export const tenantAdminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.token && auth.user()?.role === 'admin') return true;
  return router.createUrlTree(['/dashboard']);
};
