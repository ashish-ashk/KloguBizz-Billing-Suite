import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthUser, Organisation } from './models';
import { ToastService } from './toast.service';

interface AuthResponse {
  token: string;
  user: AuthUser;
  organisation: Organisation | null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenKey = 'klogubizz_token';
  private readonly userKey = 'klogubizz_user';
  private readonly orgKey = 'klogubizz_org';

  readonly user = signal<AuthUser | null>(this.readJson<AuthUser>(this.userKey));
  readonly organisation = signal<Organisation | null>(this.readJson<Organisation>(this.orgKey));
  readonly isLoggedIn = computed(() => !!this.token);
  readonly isSuperAdmin = computed(() => this.user()?.role === 'superadmin');
  /** Whether the current user is the organisation's canonical owner (not just an 'admin'). */
  readonly isOwner = computed(() => {
    const org = this.organisation();
    const user = this.user();
    return !!org?.ownerId && !!user && String(org.ownerId) === String(user.id);
  });

  /** Timer that proactively logs out the moment the JWT's own `exp` claim is
   *  reached — without this, an idle tab (no outgoing API call to trip the
   *  interceptor's 401 handling below) would keep showing the app as if
   *  still signed in until the user next clicked something. */
  private expiryTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private http: HttpClient, private router: Router, private toast: ToastService) {
    this.scheduleExpiry();
  }

  get token(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  login(email: string, password: string) {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, { email, password })
      .pipe(tap(res => this.store(res)));
  }

  /** Creates the organisation + admin account. Does NOT auto-authenticate —
   *  the user is sent to /login to sign in explicitly after registering. */
  register(payload: { name: string; email: string; password: string; orgName: string; stateCode: string; acceptTerms: boolean }) {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/register`, payload);
  }

  /** Updates the cached organisation (e.g. after saving branding/theme changes). */
  setOrganisation(org: Organisation) {
    localStorage.setItem(this.orgKey, JSON.stringify(org));
    this.organisation.set(org);
  }

  /** User-initiated sign-out (the sidebar/topbar "Sign Out" buttons). */
  logout() {
    this.clearSession();
    this.router.navigateByUrl('/login');
  }

  /** Session ended without the user asking for it — expired/invalid JWT
   *  (either caught reactively by the auth interceptor on a 401, or
   *  detected proactively by the expiry timer below). Same cleanup as
   *  `logout()`, plus an explanatory toast since the user didn't click anything. */
  forceLogout(message?: string) {
    this.clearSession();
    this.router.navigateByUrl('/login');
    if (message) this.toast.info(message);
  }

  private clearSession() {
    if (this.expiryTimer) { clearTimeout(this.expiryTimer); this.expiryTimer = null; }
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    localStorage.removeItem(this.orgKey);
    this.user.set(null);
    this.organisation.set(null);
  }

  private store(res: AuthResponse) {
    localStorage.setItem(this.tokenKey, res.token);
    localStorage.setItem(this.userKey, JSON.stringify(res.user));
    if (res.organisation) localStorage.setItem(this.orgKey, JSON.stringify(res.organisation));
    this.user.set(res.user);
    this.organisation.set(res.organisation);
    this.scheduleExpiry();
  }

  private readJson<T>(key: string): T | null {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : null;
  }

  /** Reads the JWT's `exp` claim (seconds since epoch) without pulling in a
   *  full JWT library — decoding the base64url middle segment is enough. */
  private decodeExpiryMs(token: string): number | null {
    try {
      const payload = token.split('.')[1];
      const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      const exp = JSON.parse(json)?.exp;
      return typeof exp === 'number' ? exp * 1000 : null;
    } catch {
      return null;
    }
  }

  /** (Re)schedules the proactive expiry logout for whatever token is
   *  currently stored — called on service construction (covers a page
   *  reload/reopen with an already-issued token) and right after login. */
  private scheduleExpiry() {
    if (this.expiryTimer) { clearTimeout(this.expiryTimer); this.expiryTimer = null; }
    const token = this.token;
    if (!token) return;
    const expiryMs = this.decodeExpiryMs(token);
    if (!expiryMs) return;
    const delay = expiryMs - Date.now();
    const message = 'Your session has expired. Please sign in again.';
    if (delay <= 0) { this.forceLogout(message); return; }
    // setTimeout's delay param is a 32-bit signed int (~24.8 days max) —
    // the 12h token lifetime is comfortably inside that, but clamp defensively.
    this.expiryTimer = setTimeout(() => this.forceLogout(message), Math.min(delay, 2 ** 31 - 1));
  }
}
