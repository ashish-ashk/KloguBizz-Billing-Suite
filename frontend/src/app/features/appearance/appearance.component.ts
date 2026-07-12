import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AppShellComponent } from '../../shared/app-shell.component';
import { AuthService } from '../../core/auth.service';
import { ThemeService } from '../../core/theme.service';
import { ToastService } from '../../core/toast.service';
import {
  CustomTheme, PRESET_THEMES, RoleThemeConfig, TENANT_ROLES, TenantRole,
  getPreset, resolvePalette
} from '../../core/theme';

type BuilderMode = 'preset' | 'custom';

const DEFAULT_CUSTOM: CustomTheme = {
  primary: '#4f46e5', secondary: '#312e81', accent: '#818cf8',
  background: '#ffffff', text: '#1e1b4b', mode: 'light'
};

const DEFAULT_ROLE_CONFIG: RoleThemeConfig = { presetId: 'indigo', custom: null };

const ROLE_META: Record<TenantRole, { label: string; description: string }> = {
  admin: { label: 'Admin', description: 'Full access to every module' },
  accountant: { label: 'Accountant', description: 'Invoicing, payments and reports' },
  viewer: { label: 'Viewer', description: 'Read-only access' }
};

@Component({
  selector: 'app-appearance',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AppShellComponent],
  template: `
    <app-shell title="Appearance" subtitle="Customize how Klogu Bizz looks for each role in your organization">
      <button actions class="btn ghost" type="button" [disabled]="!dirty()" (click)="discard()">Discard Changes</button>
      <button actions class="btn primary" type="button" [disabled]="!dirty() || saving()" (click)="save()">
        @if (saving()) { <span class="spinner"></span> } Save Theme
      </button>

      <div class="info-box" style="margin-bottom:20px;">
        🎨 Every role can have its own look. Changes preview instantly — on <strong>your</strong> screen and in the
        preview panel — as you click around. Nothing is applied for that role's users until you hit <strong>Save Theme</strong>.
      </div>

      <section class="card" style="margin-bottom:20px;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;">
          <div class="tabs">
            @for (role of roles; track role) {
              <button type="button" [class.active]="selectedRole() === role" (click)="selectRole(role)">
                {{ roleMeta[role].label }}
                @if (!isDefaultRoleConfig(role)) {
                  <span style="display:inline-block;width:5px;height:5px;border-radius:50%;background:var(--brand);margin-left:5px;vertical-align:middle;"></span>
                }
              </button>
            }
          </div>

          @if (isBusinessPlan()) {
            <button class="btn secondary sm" type="button" (click)="toggleDarkForRole()">
              {{ previewIsDark() ? '☀ Switch to Light' : '🌙 Switch to Dark' }} for {{ roleMeta[selectedRole()].label }}
            </button>
          } @else {
            <a routerLink="/subscription" class="info-box warn" style="margin:0;text-decoration:none;">
              🔒 Dark mode toggle is a Business plan feature — <strong>Upgrade to unlock</strong>
            </a>
          }
        </div>
        <div class="card-sub" style="margin-top:10px;">
          Editing the theme {{ roleMeta[selectedRole()].label }} users see — {{ roleMeta[selectedRole()].description }}
        </div>
      </section>

      <div class="appearance-layout">
        <!-- ── Left: theme controls ─────────────────── -->
        <div style="display:grid;gap:20px;">
          <section class="card">
            <div class="card-head">
              <div>
                <div class="card-title">Preset Themes</div>
                <div class="card-sub">15 curated palettes — click one to preview it instantly</div>
              </div>
              <button class="btn ghost sm" type="button" (click)="selectPreset('indigo')">Reset to Default</button>
            </div>
            <div class="grid grid-3" style="gap:12px;">
              @for (t of presets; track t.id) {
                <button type="button" class="theme-card" [class.selected]="mode() === 'preset' && selectedPreset() === t.id"
                  (click)="selectPreset(t.id)">
                  @if (savedByRole()[selectedRole()].presetId === t.id && !savedByRole()[selectedRole()].custom) {
                    <span class="theme-current-badge">Current</span>
                  }
                  <span class="theme-swatches">
                    <span [style.background]="t.secondary"></span>
                    <span [style.background]="t.primary"></span>
                    <span [style.background]="t.accent"></span>
                  </span>
                  <span class="theme-card-info">
                    <span class="theme-card-name">{{ t.name }}</span>
                    <span class="pill" [class]="t.mode === 'dark' ? 'draft' : 'active'">{{ t.mode === 'dark' ? '🌙 Dark' : '☀ Light' }}</span>
                  </span>
                </button>
              }
            </div>
          </section>

          <section class="card">
            <div class="card-head">
              <div>
                <div class="card-title">Custom Theme</div>
                <div class="card-sub">Build your own palette — editing any field switches the live app to your custom colors</div>
              </div>
              @if (mode() === 'custom') { <span class="pill active">✓ Currently Active</span> }
            </div>
            <div class="grid grid-2" style="gap:14px;">
              <div class="field">
                <label>Primary Color</label>
                <div class="color-field">
                  <input type="color" [ngModel]="custom().primary" (ngModelChange)="setCustom('primary', $event)" />
                  <input class="mono" [ngModel]="custom().primary" (ngModelChange)="setCustom('primary', $event)" />
                </div>
                <span class="hint">Buttons, links, active nav</span>
              </div>
              <div class="field">
                <label>Secondary Color</label>
                <div class="color-field">
                  <input type="color" [ngModel]="custom().secondary" (ngModelChange)="setCustom('secondary', $event)" />
                  <input class="mono" [ngModel]="custom().secondary" (ngModelChange)="setCustom('secondary', $event)" />
                </div>
                <span class="hint">Sidebar &amp; gradients</span>
              </div>
              <div class="field">
                <label>Accent Color</label>
                <div class="color-field">
                  <input type="color" [ngModel]="custom().accent" (ngModelChange)="setCustom('accent', $event)" />
                  <input class="mono" [ngModel]="custom().accent" (ngModelChange)="setCustom('accent', $event)" />
                </div>
                <span class="hint">Highlights &amp; charts</span>
              </div>
              <div class="field">
                <label>Mode</label>
                <div class="tabs" style="width:fit-content;">
                  <button type="button" [class.active]="custom().mode === 'light'" (click)="setCustom('mode', 'light')">☀ Light</button>
                  <button type="button" [class.active]="custom().mode === 'dark'" (click)="setCustom('mode', 'dark')">🌙 Dark</button>
                </div>
              </div>
              @if (custom().mode === 'dark') {
                <div class="field">
                  <label>Background Color</label>
                  <div class="color-field">
                    <input type="color" [ngModel]="custom().background" (ngModelChange)="setCustom('background', $event)" />
                    <input class="mono" [ngModel]="custom().background" (ngModelChange)="setCustom('background', $event)" />
                  </div>
                </div>
                <div class="field">
                  <label>Text Color</label>
                  <div class="color-field">
                    <input type="color" [ngModel]="custom().text" (ngModelChange)="setCustom('text', $event)" />
                    <input class="mono" [ngModel]="custom().text" (ngModelChange)="setCustom('text', $event)" />
                  </div>
                </div>
              }
            </div>
          </section>
        </div>

        <!-- ── Right: single unified live preview ───── -->
        <div style="position:sticky;top:20px;">
          <div class="card-sub" style="margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;">
            <span>Live Preview — {{ roleMeta[selectedRole()].label }}'s screen</span>
            <span class="pill">{{ mode() === 'custom' ? 'Custom' : selectedPresetName() }}</span>
          </div>
          <div class="preview-frame" style="padding:0;overflow:hidden;">
            <div style="display:flex;min-height:400px;">
              <!-- mini sidebar -->
              <div style="width:118px;flex-shrink:0;padding:14px 9px;"
                [style.background]="'linear-gradient(180deg,' + previewVars()['--sidebar-from'] + ',' + previewVars()['--sidebar-to'] + ')'">
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:16px;">
                  <div style="width:20px;height:20px;border-radius:6px;display:grid;place-items:center;font-size:10px;font-weight:800;color:#fff;flex-shrink:0;"
                    [style.background]="'linear-gradient(135deg,' + previewVars()['--brand-light'] + ',' + previewVars()['--brand'] + ')'">K</div>
                  <span style="color:#fff;font-size:9.5px;font-weight:800;">Klogu Bizz</span>
                </div>
                @for (item of previewNav; track item; let first = $first) {
                  <div style="padding:6px 8px;border-radius:6px;font-size:9px;margin-bottom:3px;font-weight:600;"
                    [style.background]="first ? 'linear-gradient(135deg,rgba(99,102,241,.35),rgba(79,70,229,.2))' : 'transparent'"
                    [style.color]="first ? '#c7d2fe' : 'rgba(200,200,255,.65)'">{{ item }}</div>
                }
              </div>
              <!-- mini main -->
              <div style="flex:1;min-width:0;" [style.background]="previewVars()['--bg']">
                <div style="height:28px;display:flex;align-items:center;justify-content:flex-end;padding:0 12px;gap:7px;"
                  [style.background]="previewVars()['--card']" [style.borderBottom]="'1px solid ' + previewVars()['--border']">
                  <div style="width:18px;height:18px;border-radius:50%;display:grid;place-items:center;font-size:8.5px;"
                    [style.background]="previewVars()['--brand-pale']">🌙</div>
                  <div style="width:18px;height:18px;border-radius:50%;" [style.background]="previewVars()['--brand-mid']"></div>
                </div>
                <div style="padding:12px;">
                  <div style="display:inline-flex;gap:2px;padding:2px;border-radius:6px;margin-bottom:10px;" [style.background]="previewVars()['--brand-pale']">
                    <span style="padding:3px 9px;border-radius:5px;font-size:9px;font-weight:700;" [style.background]="previewVars()['--card']" [style.color]="previewVars()['--brand']">All</span>
                    <span style="padding:3px 9px;font-size:9px;font-weight:600;" [style.color]="previewVars()['--muted']">Paid</span>
                    <span style="padding:3px 9px;font-size:9px;font-weight:600;" [style.color]="previewVars()['--muted']">Overdue</span>
                  </div>
                  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
                    <div style="border-radius:8px;padding:8px 10px;" [style.background]="previewVars()['--card']" [style.border]="'1px solid ' + previewVars()['--border']">
                      <div style="font-size:8px;text-transform:uppercase;font-weight:700;letter-spacing:.4px;" [style.color]="previewVars()['--muted']">Revenue</div>
                      <div style="font-size:13px;font-weight:800;margin-top:3px;" [style.color]="previewVars()['--text']">₹6,30,120</div>
                    </div>
                    <div style="border-radius:8px;padding:8px 10px;" [style.background]="previewVars()['--card']" [style.border]="'1px solid ' + previewVars()['--border']">
                      <div style="font-size:8px;text-transform:uppercase;font-weight:700;letter-spacing:.4px;" [style.color]="previewVars()['--muted']">Pending</div>
                      <div style="font-size:13px;font-weight:800;margin-top:3px;" [style.color]="previewVars()['--amber']">₹1,06,200</div>
                    </div>
                  </div>
                  <div style="border-radius:8px;overflow:hidden;" [style.border]="'1px solid ' + previewVars()['--border']">
                    <div style="display:flex;padding:6px 10px;font-size:7.5px;font-weight:700;text-transform:uppercase;letter-spacing:.3px;"
                      [style.background]="previewVars()['--surface-alt']" [style.color]="previewVars()['--faint']">
                      <span style="flex:1;">Invoice</span><span style="flex:1.4;">Client</span><span style="width:48px;text-align:right;">Status</span>
                    </div>
                    @for (row of previewRows; track row.name) {
                      <div style="display:flex;align-items:center;padding:6px 10px;font-size:9px;"
                        [style.background]="previewVars()['--card']" [style.borderTop]="'1px solid ' + previewVars()['--border']">
                        <span style="flex:1;font-weight:700;" [style.color]="previewVars()['--brand']">{{ row.num }}</span>
                        <span style="flex:1.4;" [style.color]="previewVars()['--text']">{{ row.name }}</span>
                        <span style="width:48px;text-align:right;">
                          <span style="padding:1.5px 6px;border-radius:10px;font-size:7.5px;font-weight:700;"
                            [style.background]="row.status === 'paid' ? previewVars()['--green-bg'] : previewVars()['--amber-bg']"
                            [style.color]="row.status === 'paid' ? previewVars()['--green'] : previewVars()['--amber']">{{ row.status }}</span>
                        </span>
                      </div>
                    }
                  </div>
                  <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;">
                    <span style="padding:5px 12px;border-radius:6px;font-size:9px;font-weight:700;color:#fff;"
                      [style.background]="'linear-gradient(135deg,' + previewVars()['--brand-light'] + ',' + previewVars()['--brand'] + ')'">Primary</span>
                    <span style="padding:5px 12px;border-radius:6px;font-size:9px;font-weight:700;"
                      [style.background]="previewVars()['--card']" [style.color]="previewVars()['--brand']" [style.border]="'1px solid ' + previewVars()['--border-hard']">Secondary</span>
                    <span style="padding:5px 12px;border-radius:6px;font-size:9px;font-weight:700;"
                      [style.color]="previewVars()['--red']" [style.background]="previewVars()['--red-bg']">Danger</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </app-shell>
  `
})
export class AppearanceComponent implements OnInit, OnDestroy {
  presets = PRESET_THEMES;
  roles = TENANT_ROLES;
  roleMeta = ROLE_META;
  previewNav = ['Dashboard', 'Invoices', 'Payments', 'Reports'];
  previewRows = [
    { num: 'KLG-001', name: 'Acme Corp', status: 'paid' },
    { num: 'KLG-002', name: 'Reliance Tech', status: 'pending' }
  ];

  selectedRole = signal<TenantRole>('admin');
  mode = signal<BuilderMode>('preset');
  selectedPreset = signal('indigo');
  custom = signal<CustomTheme>({ ...DEFAULT_CUSTOM });
  savedByRole = signal<Record<TenantRole, RoleThemeConfig>>({
    admin: { ...DEFAULT_ROLE_CONFIG },
    accountant: { ...DEFAULT_ROLE_CONFIG },
    viewer: { ...DEFAULT_ROLE_CONFIG }
  });
  saving = signal(false);

  currentConfig = computed<RoleThemeConfig>(() =>
    this.mode() === 'custom'
      ? { presetId: this.selectedPreset(), custom: this.custom() }
      : { presetId: this.selectedPreset(), custom: null }
  );

  // Single source of truth for the preview panel: resolves whichever mode
  // (preset or custom) is currently active, exactly like ThemeService does
  // for the real app chrome — so the two never disagree.
  previewVars = computed(() => resolvePalette(this.currentConfig()));

  selectedPresetName = computed(() => getPreset(this.selectedPreset()).name);

  previewIsDark = computed(() =>
    this.mode() === 'custom' ? this.custom().mode === 'dark' : getPreset(this.selectedPreset()).mode === 'dark'
  );

  dirty = computed(() =>
    JSON.stringify(this.currentConfig()) !== JSON.stringify(this.savedByRole()[this.selectedRole()])
  );

  constructor(private auth: AuthService, private themeService: ThemeService, private toast: ToastService) {}

  isBusinessPlan(): boolean {
    return ['business', 'enterprise'].includes(this.auth.organisation()?.plan || '');
  }

  isDefaultRoleConfig(role: TenantRole): boolean {
    const c = this.savedByRole()[role];
    return (!c || (c.presetId === 'indigo' && !c.custom));
  }

  ngOnInit() {
    const orgConfig = this.auth.organisation()?.themeConfig || {};
    const byRole = {} as Record<TenantRole, RoleThemeConfig>;
    for (const role of this.roles) {
      byRole[role] = (orgConfig as any)[role] || { ...DEFAULT_ROLE_CONFIG };
    }
    this.savedByRole.set(byRole);
    this.loadRoleIntoBuilder('admin');
  }

  ngOnDestroy() {
    // Leaving without saving shouldn't leave the app mid-preview.
    if (this.dirty()) this.themeService.revertPreview();
  }

  private loadRoleIntoBuilder(role: TenantRole) {
    const config = this.savedByRole()[role];
    if (config.custom) {
      this.mode.set('custom');
      this.custom.set({ ...config.custom });
    } else {
      this.mode.set('preset');
      this.selectedPreset.set(config.presetId || 'indigo');
    }
  }

  selectRole(role: TenantRole) {
    this.selectedRole.set(role);
    this.loadRoleIntoBuilder(role);
    this.themeService.preview(this.currentConfig());
  }

  selectPreset(id: string) {
    this.mode.set('preset');
    this.selectedPreset.set(id);
    this.themeService.preview(this.currentConfig());
  }

  setCustom<K extends keyof CustomTheme>(key: K, value: CustomTheme[K]) {
    this.mode.set('custom');
    this.custom.update(c => ({ ...c, [key]: value }));
    this.themeService.preview(this.currentConfig());
  }

  /** One-click: convert whatever is currently selected into its dark/light equivalent. */
  toggleDarkForRole() {
    if (!this.isBusinessPlan()) return;
    const seed = this.mode() === 'custom' ? this.custom() : getPreset(this.selectedPreset());
    const nextMode: 'light' | 'dark' = seed.mode === 'dark' ? 'light' : 'dark';
    this.mode.set('custom');
    this.custom.set({
      primary: seed.primary,
      secondary: seed.secondary,
      accent: seed.accent,
      background: nextMode === 'dark' ? '#111827' : '#ffffff',
      text: nextMode === 'dark' ? '#f1f5f9' : '#1e1b4b',
      mode: nextMode
    });
    this.themeService.preview(this.currentConfig());
  }

  discard() {
    this.loadRoleIntoBuilder(this.selectedRole());
    this.themeService.revertPreview();
  }

  save() {
    const role = this.selectedRole();
    this.saving.set(true);
    this.themeService.save(role, this.currentConfig()).subscribe({
      next: () => {
        this.saving.set(false);
        this.savedByRole.update(map => ({ ...map, [role]: this.currentConfig() }));
        this.toast.success(`Theme saved for ${this.roleMeta[role].label}s`);
      },
      error: err => { this.saving.set(false); this.toast.httpError(err); }
    });
  }
}
