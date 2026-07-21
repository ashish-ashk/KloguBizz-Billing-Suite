import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthUser, Organisation } from './models';

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

  constructor(private http: HttpClient, private router: Router) {}

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

  logout() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    localStorage.removeItem(this.orgKey);
    this.user.set(null);
    this.organisation.set(null);
    this.router.navigateByUrl('/login');
  }

  private store(res: AuthResponse) {
    localStorage.setItem(this.tokenKey, res.token);
    localStorage.setItem(this.userKey, JSON.stringify(res.user));
    if (res.organisation) localStorage.setItem(this.orgKey, JSON.stringify(res.organisation));
    this.user.set(res.user);
    this.organisation.set(res.organisation);
  }

  private readJson<T>(key: string): T | null {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : null;
  }
}
