import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { EMPTY, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthUser, FeatureFlags, ImpersonationContext, ImpersonationSession, Organisation, TenantNotice } from './models';
import { CacheService } from './cache.service';
import { ToastService } from './toast.service';

interface AuthResponse {
  token: string;
  user: AuthUser;
  organisation: Organisation | null;
}

/** How long a session refresh stays fresh — see `refreshSession`. */
const SESSION_REFRESH_INTERVAL_MS = 60 * 1000;

/**
 * `GET /auth/me`. Carries three things the client cannot work out for itself: the
 * resolved feature flags, any banner an operator has addressed to this tenant, and
 * — if this is a support session — the fact that it is one.
 */
interface SessionResponse {
  user: AuthUser;
  organisation: Organisation | null;
  flags: FeatureFlags;
  notices: TenantNotice[];
  impersonation: ImpersonationContext | null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenKey = 'klogubizz_token';
  private readonly userKey = 'klogubizz_user';
  private readonly orgKey = 'klogubizz_org';
  /**
   * Where the operator's own session is parked while they view a tenant.
   *
   * Impersonation replaces the active token, so without somewhere to put the
   * original the only way back to the console would be to sign in again — which
   * would make the feature annoying enough not to be used.
   */
  private readonly stashKey = 'klogubizz_operator_session';
  private readonly impersonationKey = 'klogubizz_impersonation';

  readonly user = signal<AuthUser | null>(this.readJson<AuthUser>(this.userKey));
  readonly organisation = signal<Organisation | null>(this.readJson<Organisation>(this.orgKey));
  /** Effective feature flags, resolved server-side over the platform defaults. */
  readonly flags = signal<FeatureFlags>({});
  /** Operator-authored banners: this tenant's own, plus any platform-wide notice. */
  readonly notices = signal<TenantNotice[]>([]);
  /**
   * Set while a superadmin is viewing a tenant's account. Read from localStorage on
   * construction so the banner is present on the very first paint after a reload —
   * a support session that *looks* like an ordinary one for half a second is
   * exactly the moment someone types something they shouldn't.
   */
  readonly impersonation = signal<ImpersonationContext | null>(this.readJson<ImpersonationContext>(this.impersonationKey));
  readonly isImpersonating = computed(() => !!this.impersonation());
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

  /** When the session was last reconciled with the server. */
  private lastSessionRefresh = 0;

  constructor(
    private http: HttpClient,
    private router: Router,
    private toast: ToastService,
    private cache: CacheService
  ) {
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

  /** Unauthenticated peek at an invitation, so the accept screen can show who
   *  is being invited and to which organisation. */
  inviteDetails(token: string) {
    return this.http.get<{ name: string; email: string; role: string; orgName: string | null; expiresAt: string }>(
      `${environment.apiUrl}/auth/invite/${encodeURIComponent(token)}`
    );
  }

  /** Redeems an invitation and signs the new teammate straight in — unlike
   *  register, which deliberately bounces to /login. Someone who just chose a
   *  password has proved who they are, and a second login form here would be
   *  friction for no security gain. */
  acceptInvite(payload: { token: string; password: string; acceptTerms: boolean }) {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/accept-invite`, payload)
      .pipe(tap(res => this.store(res)));
  }

  /** Starts a password reset. Always succeeds, whether or not the address has
   *  an account — the API deliberately gives nothing away. */
  forgotPassword(email: string) {
    return this.http.post<{ ok: boolean; message: string; resetUrl?: string; localMode?: boolean }>(
      `${environment.apiUrl}/auth/forgot-password`, { email }
    );
  }

  /** Completes a reset. Does not auto-authenticate: every existing session is
   *  invalidated server-side, so the user signs in fresh with the new password. */
  resetPassword(payload: { token: string; password: string }) {
    return this.http.post<{ ok: boolean; message: string }>(`${environment.apiUrl}/auth/reset-password`, payload);
  }

  /**
   * Re-reads the session from the server.
   *
   * The app used to cache the organisation at login and never ask again, so
   * anything an operator changed mid-session — a suspension, a feature flag, a
   * banner addressed to this tenant — stayed invisible until the user signed out
   * and back in. (The interceptor's 403 handler papered over the suspension case
   * only, and only once a write had already failed.)
   *
   * Throttled, because the caller is `AppShellComponent`, which is constructed on
   * every navigation — an unthrottled refresh here would be one extra request per
   * route change, which is precisely the pattern Phase 3 spent its time removing.
   * Once a minute is far more often than an operator changes anything, and it is
   * still immediate on the first load of a session.
   */
  refreshSession(force = false) {
    if (!this.token) return EMPTY;
    if (!force && Date.now() - this.lastSessionRefresh < SESSION_REFRESH_INTERVAL_MS) return EMPTY;
    this.lastSessionRefresh = Date.now();

    return this.http.get<SessionResponse>(`${environment.apiUrl}/auth/me`).pipe(
      tap(res => {
        if (res.user) {
          localStorage.setItem(this.userKey, JSON.stringify(res.user));
          this.user.set(res.user);
        }
        if (res.organisation) this.setOrganisation(res.organisation);
        this.flags.set(res.flags || {});
        this.notices.set(res.notices || []);
        this.setImpersonation(res.impersonation ? { ...this.impersonation(), ...res.impersonation } : null);
      })
    );
  }

  /** Whether a named feature is on for this tenant. Unknown keys are off. */
  hasFeature(key: string): boolean {
    return this.flags()[key] === true;
  }

  // ── Impersonation ────────────────────────────

  private setImpersonation(context: ImpersonationContext | null) {
    if (context) localStorage.setItem(this.impersonationKey, JSON.stringify(context));
    else localStorage.removeItem(this.impersonationKey);
    this.impersonation.set(context);
  }

  /**
   * Switches this browser into a tenant's account.
   *
   * The operator's own session is stashed rather than discarded, so exiting is one
   * click and does not require re-authenticating. The response cache is cleared in
   * both directions — it holds the *other* identity's data, and serving a stale
   * platform response inside a tenant session (or vice versa) is the one bug this
   * feature must not have.
   */
  startImpersonation(session: ImpersonationSession, orgName?: string) {
    const current = this.token;
    if (current) {
      localStorage.setItem(this.stashKey, JSON.stringify({
        token: current,
        user: this.readJson<AuthUser>(this.userKey),
        organisation: this.readJson<Organisation>(this.orgKey)
      }));
    }
    this.cache.clear();
    this.store({ token: session.token, user: session.user, organisation: session.organisation });
    this.setImpersonation({ ...session.impersonation, orgName: orgName || session.organisation?.name });
    this.router.navigateByUrl('/dashboard');
  }

  /** Returns to the operator's own session. */
  endImpersonation() {
    const stashed = this.readJson<{ token: string; user: AuthUser | null; organisation: Organisation | null }>(this.stashKey);
    this.setImpersonation(null);
    localStorage.removeItem(this.stashKey);
    this.cache.clear();
    this.flags.set({});
    this.notices.set([]);

    if (!stashed?.token) {
      // The stash is gone (another tab signed out, or storage was cleared). There
      // is no session to return to, so the honest outcome is the login page rather
      // than leaving the operator inside a customer's account.
      this.forceLogout('Your platform session was not found. Please sign in again.');
      return;
    }
    this.store({ token: stashed.token, user: stashed.user as AuthUser, organisation: stashed.organisation });
    this.router.navigateByUrl('/super-admin/organisations');
  }

  /** Updates the cached organisation (e.g. after saving branding/theme changes). */
  setOrganisation(org: Organisation) {
    localStorage.setItem(this.orgKey, JSON.stringify(org));
    this.organisation.set(org);
  }

  /** Reconciles the cached organisation status when the server tells us it has
   *  changed mid-session — the org is cached at login, so a suspension applied
   *  afterwards would otherwise stay invisible to the UI. */
  markOrganisationStatus(status: string) {
    const org = this.organisation();
    if (!org || org.status === status) return;
    this.setOrganisation({ ...org, status });
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
    // The stashed operator session goes too. Leaving it behind would mean the next
    // person to use this browser could step back into a platform session that was
    // supposed to have ended.
    localStorage.removeItem(this.stashKey);
    localStorage.removeItem(this.impersonationKey);
    this.user.set(null);
    this.organisation.set(null);
    this.impersonation.set(null);
    this.flags.set({});
    this.notices.set([]);
    // Responses are cached in memory for a short TTL to stop every navigation
    // refetching everything. On sign-out that cache must go: on a shared machine
    // the next person to sign in would otherwise be served the previous
    // tenant's invoices from it.
    this.cache.clear();
  }

  private store(res: AuthResponse) {
    localStorage.setItem(this.tokenKey, res.token);
    localStorage.setItem(this.userKey, JSON.stringify(res.user));
    if (res.organisation) localStorage.setItem(this.orgKey, JSON.stringify(res.organisation));
    this.user.set(res.user);
    this.organisation.set(res.organisation);
    // A new identity invalidates the throttle: without this, switching into (or out
    // of) an impersonation session would keep showing the previous identity's flags
    // and notices for up to a minute.
    this.lastSessionRefresh = 0;
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
