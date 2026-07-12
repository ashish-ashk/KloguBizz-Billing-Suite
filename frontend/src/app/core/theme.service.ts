import { Injectable, effect, inject } from '@angular/core';
import { tap } from 'rxjs';
import { AuthService } from './auth.service';
import { ApiService } from './api.service';
import { RoleThemeConfig, TenantRole, baseMode, resolvePalette } from './theme';

const DARK_TOGGLE_PLANS = ['business', 'enterprise'];

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private auth = inject(AuthService);
  private api = inject(ApiService);

  constructor() {
    // Re-applies whenever the cached user/organisation changes: on login,
    // logout (falls back to default), role change, or after a theme save.
    effect(() => {
      this.auth.user();
      this.auth.organisation();
      this.applyForUser();
    });
  }

  /** Business/Enterprise plans unlock the personal light/dark quick-toggle. */
  canToggleDarkMode(): boolean {
    return DARK_TOGGLE_PLANS.includes(this.auth.organisation()?.plan || '');
  }

  private roleConfig(role: TenantRole | undefined): RoleThemeConfig | null {
    if (!role) return null;
    const config = this.auth.organisation()?.themeConfig;
    return (config && (config as any)[role]) || null;
  }

  private darkKey(): string {
    return `klogubizz_dark_${this.auth.user()?.id || 'anon'}`;
  }

  /** Whether the signed-in user is currently seeing the dark variant. */
  isDarkActive(): boolean {
    const role = this.auth.user()?.role as TenantRole | undefined;
    const roleDefault = baseMode(this.roleConfig(role)) === 'dark';
    if (!this.canToggleDarkMode()) return roleDefault;
    const stored = localStorage.getItem(this.darkKey());
    return stored === null ? roleDefault : stored === '1';
  }

  /** Flips the signed-in user's personal light/dark preference (this browser only). */
  toggleDarkMode() {
    if (!this.canToggleDarkMode()) return;
    localStorage.setItem(this.darkKey(), this.isDarkActive() ? '0' : '1');
    this.applyForUser();
  }

  /** Applies the theme assigned to the signed-in user's own role. */
  applyForUser() {
    const role = this.auth.user()?.role as TenantRole | undefined;
    const config = this.roleConfig(role);
    const dark = this.canToggleDarkMode() ? this.isDarkActive() : undefined;
    this.apply(resolvePalette(config, dark));
  }

  /** Writes a resolved palette to :root as CSS custom properties. */
  private apply(vars: Record<string, string>) {
    const root = document.documentElement.style;
    Object.entries(vars).forEach(([key, value]) => root.setProperty(key, value));
  }

  /** Live-preview a role's config without persisting it (Appearance page). */
  preview(config: RoleThemeConfig, darkOverride?: boolean) {
    this.apply(resolvePalette(config, darkOverride));
  }

  /** Reverts an unsaved preview back to the signed-in user's real theme. */
  revertPreview() {
    this.applyForUser();
  }

  /** Persists one role's theme for the whole organisation and re-applies. */
  save(role: TenantRole, config: RoleThemeConfig) {
    const current = this.auth.organisation()?.themeConfig || {};
    const themeConfig = { ...current, [role]: config };
    return this.api.updateOrganisation({ themeConfig }).pipe(
      tap(org => this.auth.setOrganisation(org))
    );
  }
}
