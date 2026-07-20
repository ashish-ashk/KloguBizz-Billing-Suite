import {
  AuthService
} from "./chunk-6FSA7WVR.js";
import {
  ApiService
} from "./chunk-36HDS2M4.js";
import {
  __spreadProps,
  __spreadValues,
  effect,
  inject,
  tap,
  ɵɵdefineInjectable
} from "./chunk-6VNHH65J.js";

// src/app/core/theme.ts
var TENANT_ROLES = ["admin", "accountant", "viewer"];
function hexToRgb(hex) {
  const clean = (hex || "#4f46e5").replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const num = parseInt(full, 16);
  return { r: num >> 16 & 255, g: num >> 8 & 255, b: num & 255 };
}
function rgbToHex(r, g, b) {
  const clamp = (n) => Math.max(0, Math.min(255, Math.round(n)));
  return "#" + [clamp(r), clamp(g), clamp(b)].map((n) => n.toString(16).padStart(2, "0")).join("");
}
function mix(hex1, hex2, weight) {
  const a = hexToRgb(hex1);
  const b = hexToRgb(hex2);
  return rgbToHex(a.r + (b.r - a.r) * weight, a.g + (b.g - a.g) * weight, a.b + (b.b - a.b) * weight);
}
function tint(hex, amount) {
  return mix(hex, "#ffffff", amount);
}
function shade(hex, amount) {
  return mix(hex, "#000000", amount);
}
var LIGHT_STATUS = {
  "--green": "#059669",
  "--green-bg": "#d1fae5",
  "--green-border": "#6ee7b7",
  "--amber": "#b45309",
  "--amber-bg": "#fef3c7",
  "--amber-border": "#fcd34d",
  "--red": "#dc2626",
  "--red-bg": "#fee2e2",
  "--red-border": "#fca5a5",
  "--blue": "#2563eb",
  "--blue-bg": "#dbeafe",
  "--blue-border": "#93c5fd",
  "--purple": "#7c3aed",
  "--purple-bg": "#ede9fe",
  "--slate": "#475569",
  "--slate-bg": "#f1f5f9"
};
var DARK_STATUS = {
  "--green": "#34d399",
  "--green-bg": "rgba(16,185,129,0.16)",
  "--green-border": "rgba(52,211,153,0.4)",
  "--amber": "#fbbf24",
  "--amber-bg": "rgba(245,158,11,0.16)",
  "--amber-border": "rgba(251,191,36,0.4)",
  "--red": "#f87171",
  "--red-bg": "rgba(239,68,68,0.16)",
  "--red-border": "rgba(248,113,113,0.4)",
  "--blue": "#60a5fa",
  "--blue-bg": "rgba(59,130,246,0.16)",
  "--blue-border": "rgba(96,165,250,0.4)",
  "--purple": "#c084fc",
  "--purple-bg": "rgba(168,85,247,0.16)",
  "--slate": "#94a3b8",
  "--slate-bg": "rgba(148,163,184,0.14)"
};
function buildPalette(seed) {
  const dark = seed.mode === "dark";
  const bg = seed.background || (dark ? "#111827" : tint(seed.primary, 0.965));
  const card = dark ? mix(bg, "#ffffff", 0.055) : "#ffffff";
  const text = dark ? "#f1f5f9" : shade(seed.primary, 0.75);
  const textMid = dark ? tint(seed.primary, 0.3) : shade(seed.primary, 0.35);
  return __spreadValues({
    "--brand": seed.primary,
    "--brand-light": seed.accent,
    "--brand-dark": seed.secondary,
    "--brand-pale": dark ? mix(seed.primary, bg, 0.8) : tint(seed.primary, 0.93),
    "--brand-mid": dark ? mix(seed.primary, bg, 0.5) : tint(seed.primary, 0.75),
    // A more visibly-tinted surface than --brand-pale — used for large fills
    // (the sidebar background) where a 93%-white tint reads as plain white.
    "--sidebar-bg": dark ? mix(seed.primary, bg, 0.5) : tint(seed.primary, 0.7),
    "--border": dark ? "rgba(255,255,255,0.12)" : tint(seed.primary, 0.88),
    "--border-hard": dark ? "rgba(255,255,255,0.22)" : tint(seed.primary, 0.68),
    "--text": text,
    "--text-mid": textMid,
    "--muted": dark ? "#94a3b8" : "#6b7280",
    "--faint": dark ? "#64748b" : "#9ca3af",
    "--bg": bg,
    "--card": card,
    "--surface-alt": dark ? mix(card, "#ffffff", 0.035) : tint(seed.primary, 0.97),
    "--sidebar-from": dark ? shade(seed.secondary, 0.25) : seed.secondary,
    "--sidebar-to": dark ? shade(seed.secondary, 0.5) : shade(seed.secondary, 0.15)
  }, dark ? DARK_STATUS : LIGHT_STATUS);
}
var PRESET_THEMES = [
  { id: "indigo", name: "Indigo", mode: "light", primary: "#4f46e5", secondary: "#312e81", accent: "#818cf8" },
  { id: "emerald", name: "Emerald", mode: "light", primary: "#059669", secondary: "#064e3b", accent: "#34d399" },
  { id: "amber-sunset", name: "Amber Sunset", mode: "light", primary: "#d97706", secondary: "#7c2d12", accent: "#fbbf24" },
  { id: "ruby-rose", name: "Ruby Rose", mode: "light", primary: "#e11d48", secondary: "#881337", accent: "#fb7185" },
  { id: "ocean-cyan", name: "Ocean Cyan", mode: "light", primary: "#0891b2", secondary: "#164e63", accent: "#22d3ee" },
  { id: "violet", name: "Violet", mode: "light", primary: "#7c3aed", secondary: "#4c1d95", accent: "#a78bfa" },
  { id: "sky-blue", name: "Sky Blue", mode: "light", primary: "#2563eb", secondary: "#1e3a8a", accent: "#60a5fa" },
  { id: "teal", name: "Teal", mode: "light", primary: "#0d9488", secondary: "#134e4a", accent: "#2dd4bf" },
  { id: "coral", name: "Coral", mode: "light", primary: "#f97316", secondary: "#7c2d12", accent: "#fdba74" },
  { id: "plum", name: "Plum", mode: "light", primary: "#a21caf", secondary: "#581c87", accent: "#e879f9" },
  { id: "forest", name: "Forest", mode: "light", primary: "#16a34a", secondary: "#14532d", accent: "#4ade80" },
  { id: "slate-steel", name: "Slate Steel", mode: "light", primary: "#475569", secondary: "#1e293b", accent: "#94a3b8" },
  { id: "midnight-indigo", name: "Midnight Indigo", mode: "dark", primary: "#818cf8", secondary: "#1e1b4b", accent: "#a5b4fc", background: "#0f0e1f" },
  { id: "deep-ocean", name: "Deep Ocean", mode: "dark", primary: "#22d3ee", secondary: "#0c2a35", accent: "#67e8f9", background: "#0a1a22" },
  { id: "graphite-amber", name: "Graphite Amber", mode: "dark", primary: "#f59e0b", secondary: "#292018", accent: "#fbbf24", background: "#18181b" }
];
function getPreset(id) {
  return PRESET_THEMES.find((t) => t.id === id) || PRESET_THEMES[0];
}
function seedFor(config) {
  if (config?.custom) {
    const c = config.custom;
    return { id: "custom", name: "Custom", mode: c.mode, primary: c.primary, secondary: c.secondary, accent: c.accent, background: c.background };
  }
  return getPreset(config?.presetId || "indigo");
}
function baseMode(config) {
  return seedFor(config).mode;
}
function resolvePalette(config, darkOverride) {
  const seed = seedFor(config);
  const explicitText = config?.custom?.text;
  if (darkOverride === void 0 || darkOverride === (seed.mode === "dark")) {
    const palette = buildPalette(seed);
    if (explicitText)
      palette["--text"] = explicitText;
    return palette;
  }
  return buildPalette(__spreadProps(__spreadValues({}, seed), { mode: darkOverride ? "dark" : "light", background: void 0 }));
}

// src/app/core/theme.service.ts
var DARK_TOGGLE_PLANS = ["business", "enterprise"];
var ThemeService = class _ThemeService {
  auth = inject(AuthService);
  api = inject(ApiService);
  constructor() {
    effect(() => {
      this.auth.user();
      this.auth.organisation();
      this.applyForUser();
    });
  }
  /** Business/Enterprise plans unlock the personal light/dark quick-toggle. */
  canToggleDarkMode() {
    return DARK_TOGGLE_PLANS.includes(this.auth.organisation()?.plan || "");
  }
  roleConfig(role) {
    if (!role)
      return null;
    const config = this.auth.organisation()?.themeConfig;
    return config && config[role] || null;
  }
  darkKey() {
    return `klogubizz_dark_${this.auth.user()?.id || "anon"}`;
  }
  /** Whether the signed-in user is currently seeing the dark variant. */
  isDarkActive() {
    const role = this.auth.user()?.role;
    const roleDefault = baseMode(this.roleConfig(role)) === "dark";
    if (!this.canToggleDarkMode())
      return roleDefault;
    const stored = localStorage.getItem(this.darkKey());
    return stored === null ? roleDefault : stored === "1";
  }
  /** Flips the signed-in user's personal light/dark preference (this browser only). */
  toggleDarkMode() {
    if (!this.canToggleDarkMode())
      return;
    localStorage.setItem(this.darkKey(), this.isDarkActive() ? "0" : "1");
    this.applyForUser();
  }
  /** Applies the theme assigned to the signed-in user's own role. */
  applyForUser() {
    const role = this.auth.user()?.role;
    const config = this.roleConfig(role);
    const dark = this.canToggleDarkMode() ? this.isDarkActive() : void 0;
    this.apply(resolvePalette(config, dark));
  }
  /** Writes a resolved palette to :root as CSS custom properties. */
  apply(vars) {
    const root = document.documentElement.style;
    Object.entries(vars).forEach(([key, value]) => root.setProperty(key, value));
  }
  /** Live-preview a role's config without persisting it (Appearance page). */
  preview(config, darkOverride) {
    this.apply(resolvePalette(config, darkOverride));
  }
  /** Reverts an unsaved preview back to the signed-in user's real theme. */
  revertPreview() {
    this.applyForUser();
  }
  /** Persists one role's theme for the whole organisation and re-applies. */
  save(role, config) {
    const current = this.auth.organisation()?.themeConfig || {};
    const themeConfig = __spreadProps(__spreadValues({}, current), { [role]: config });
    return this.api.updateOrganisation({ themeConfig }).pipe(tap((org) => this.auth.setOrganisation(org)));
  }
  static \u0275fac = function ThemeService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _ThemeService)();
  };
  static \u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _ThemeService, factory: _ThemeService.\u0275fac, providedIn: "root" });
};

export {
  TENANT_ROLES,
  PRESET_THEMES,
  getPreset,
  resolvePalette,
  ThemeService
};
//# sourceMappingURL=chunk-FOTQGH3M.js.map
