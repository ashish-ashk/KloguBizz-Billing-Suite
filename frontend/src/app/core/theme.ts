/**
 * Theming engine: given a small "seed" (a handful of brand colors + a
 * light/dark mode), derives the full set of CSS custom properties the rest
 * of the app already styles against (see styles.css). This lets both the
 * 15 built-in presets and a fully custom tenant palette reskin the whole
 * app consistently, without hand-authoring every shade.
 */

export interface ThemeSeed {
  id: string;
  name: string;
  mode: 'light' | 'dark';
  /** Primary brand color — buttons, links, active nav, accents. */
  primary: string;
  /** Darker brand shade — gradients, sidebar, hover states. */
  secondary: string;
  /** Lighter brand shade — highlights, secondary gradients. */
  accent: string;
  /** Optional explicit page background (used for dark themes). */
  background?: string;
}

export interface CustomTheme {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  mode: 'light' | 'dark';
}

export type TenantRole = 'admin' | 'accountant' | 'viewer';

/** One role's saved theme choice — either a preset id or a full custom palette. */
export interface RoleThemeConfig {
  presetId?: string;
  custom?: CustomTheme | null;
}

/** The organisation's theme, one slot per role. Set entirely by the tenant admin. */
export interface OrgThemeConfig {
  admin?: RoleThemeConfig;
  accountant?: RoleThemeConfig;
  viewer?: RoleThemeConfig;
}

export const TENANT_ROLES: TenantRole[] = ['admin', 'accountant', 'viewer'];

// ── Color math (RGB-space mixing — simple and dependable) ──────────────

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = (hex || '#4f46e5').replace('#', '');
  const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
  const num = parseInt(full, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return '#' + [clamp(r), clamp(g), clamp(b)].map(n => n.toString(16).padStart(2, '0')).join('');
}

/** Mixes hex1 and hex2; weight 0 = hex1, 1 = hex2. */
export function mix(hex1: string, hex2: string, weight: number): string {
  const a = hexToRgb(hex1);
  const b = hexToRgb(hex2);
  return rgbToHex(
    a.r + (b.r - a.r) * weight,
    a.g + (b.g - a.g) * weight,
    a.b + (b.b - a.b) * weight
  );
}

export function tint(hex: string, amount: number): string { return mix(hex, '#ffffff', amount); }
export function shade(hex: string, amount: number): string { return mix(hex, '#000000', amount); }

export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const lin = (c: number) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function isLight(hex: string): boolean { return relativeLuminance(hex) > 0.4; }

// ── Semantic status colors (paid/pending/overdue etc.) ──────────────────
// These stay meaning-stable across themes; only their contrast profile
// shifts between light and dark surfaces.

const LIGHT_STATUS: Record<string, string> = {
  '--green': '#059669', '--green-bg': '#d1fae5', '--green-border': '#6ee7b7',
  '--amber': '#b45309', '--amber-bg': '#fef3c7', '--amber-border': '#fcd34d',
  '--red': '#dc2626', '--red-bg': '#fee2e2', '--red-border': '#fca5a5',
  '--blue': '#2563eb', '--blue-bg': '#dbeafe', '--blue-border': '#93c5fd',
  '--purple': '#7c3aed', '--purple-bg': '#ede9fe',
  '--slate': '#475569', '--slate-bg': '#f1f5f9'
};

const DARK_STATUS: Record<string, string> = {
  '--green': '#34d399', '--green-bg': 'rgba(16,185,129,0.16)', '--green-border': 'rgba(52,211,153,0.4)',
  '--amber': '#fbbf24', '--amber-bg': 'rgba(245,158,11,0.16)', '--amber-border': 'rgba(251,191,36,0.4)',
  '--red': '#f87171', '--red-bg': 'rgba(239,68,68,0.16)', '--red-border': 'rgba(248,113,113,0.4)',
  '--blue': '#60a5fa', '--blue-bg': 'rgba(59,130,246,0.16)', '--blue-border': 'rgba(96,165,250,0.4)',
  '--purple': '#c084fc', '--purple-bg': 'rgba(168,85,247,0.16)',
  '--slate': '#94a3b8', '--slate-bg': 'rgba(148,163,184,0.14)'
};

/** Derives the full CSS variable set from a seed (preset or custom). */
export function buildPalette(seed: ThemeSeed): Record<string, string> {
  const dark = seed.mode === 'dark';
  const bg = seed.background || (dark ? '#111827' : tint(seed.primary, 0.965));
  const card = dark ? mix(bg, '#ffffff', 0.055) : '#ffffff';
  const text = dark ? '#f1f5f9' : shade(seed.primary, 0.75);
  const textMid = dark ? tint(seed.primary, 0.3) : shade(seed.primary, 0.35);

  return {
    '--brand': seed.primary,
    '--brand-light': seed.accent,
    '--brand-dark': seed.secondary,
    '--brand-pale': dark ? mix(seed.primary, bg, 0.8) : tint(seed.primary, 0.93),
    '--brand-mid': dark ? mix(seed.primary, bg, 0.5) : tint(seed.primary, 0.75),
    '--border': dark ? 'rgba(255,255,255,0.12)' : tint(seed.primary, 0.88),
    '--border-hard': dark ? 'rgba(255,255,255,0.22)' : tint(seed.primary, 0.68),
    '--text': text,
    '--text-mid': textMid,
    '--muted': dark ? '#94a3b8' : '#6b7280',
    '--faint': dark ? '#64748b' : '#9ca3af',
    '--bg': bg,
    '--card': card,
    '--surface-alt': dark ? mix(card, '#ffffff', 0.035) : tint(seed.primary, 0.97),
    '--sidebar-from': dark ? shade(seed.secondary, 0.25) : seed.secondary,
    '--sidebar-to': dark ? shade(seed.secondary, 0.5) : shade(seed.secondary, 0.15),
    ...(dark ? DARK_STATUS : LIGHT_STATUS)
  };
}

export function paletteFromCustom(custom: CustomTheme): Record<string, string> {
  const palette = buildPalette({
    id: 'custom', name: 'Custom', mode: custom.mode,
    primary: custom.primary, secondary: custom.secondary, accent: custom.accent,
    background: custom.background
  });
  if (custom.text) palette['--text'] = custom.text;
  return palette;
}

// ── 15 curated preset themes ─────────────────────────────────────────

export const PRESET_THEMES: ThemeSeed[] = [
  { id: 'indigo', name: 'Indigo', mode: 'light', primary: '#4f46e5', secondary: '#312e81', accent: '#818cf8' },
  { id: 'emerald', name: 'Emerald', mode: 'light', primary: '#059669', secondary: '#064e3b', accent: '#34d399' },
  { id: 'amber-sunset', name: 'Amber Sunset', mode: 'light', primary: '#d97706', secondary: '#7c2d12', accent: '#fbbf24' },
  { id: 'ruby-rose', name: 'Ruby Rose', mode: 'light', primary: '#e11d48', secondary: '#881337', accent: '#fb7185' },
  { id: 'ocean-cyan', name: 'Ocean Cyan', mode: 'light', primary: '#0891b2', secondary: '#164e63', accent: '#22d3ee' },
  { id: 'violet', name: 'Violet', mode: 'light', primary: '#7c3aed', secondary: '#4c1d95', accent: '#a78bfa' },
  { id: 'sky-blue', name: 'Sky Blue', mode: 'light', primary: '#2563eb', secondary: '#1e3a8a', accent: '#60a5fa' },
  { id: 'teal', name: 'Teal', mode: 'light', primary: '#0d9488', secondary: '#134e4a', accent: '#2dd4bf' },
  { id: 'coral', name: 'Coral', mode: 'light', primary: '#f97316', secondary: '#7c2d12', accent: '#fdba74' },
  { id: 'plum', name: 'Plum', mode: 'light', primary: '#a21caf', secondary: '#581c87', accent: '#e879f9' },
  { id: 'forest', name: 'Forest', mode: 'light', primary: '#16a34a', secondary: '#14532d', accent: '#4ade80' },
  { id: 'slate-steel', name: 'Slate Steel', mode: 'light', primary: '#475569', secondary: '#1e293b', accent: '#94a3b8' },
  { id: 'midnight-indigo', name: 'Midnight Indigo', mode: 'dark', primary: '#818cf8', secondary: '#1e1b4b', accent: '#a5b4fc', background: '#0f0e1f' },
  { id: 'deep-ocean', name: 'Deep Ocean', mode: 'dark', primary: '#22d3ee', secondary: '#0c2a35', accent: '#67e8f9', background: '#0a1a22' },
  { id: 'graphite-amber', name: 'Graphite Amber', mode: 'dark', primary: '#f59e0b', secondary: '#292018', accent: '#fbbf24', background: '#18181b' }
];

export function getPreset(id: string): ThemeSeed {
  return PRESET_THEMES.find(t => t.id === id) || PRESET_THEMES[0];
}

/** The seed a role's theme resolves to, before any dark-mode override. */
function seedFor(config: RoleThemeConfig | null | undefined): ThemeSeed {
  if (config?.custom) {
    const c = config.custom;
    return { id: 'custom', name: 'Custom', mode: c.mode, primary: c.primary, secondary: c.secondary, accent: c.accent, background: c.background };
  }
  return getPreset(config?.presetId || 'indigo');
}

export function baseMode(config: RoleThemeConfig | null | undefined): 'light' | 'dark' {
  return seedFor(config).mode;
}

/**
 * Resolves a role's saved theme config into the CSS variable map to apply.
 * `darkOverride`, when set, forces the result into light or dark regardless
 * of the seed's own mode — same hues, freshly derived background/text — so
 * any preset or custom theme can be flipped without admin re-picking colors.
 */
export function resolvePalette(config: RoleThemeConfig | null | undefined, darkOverride?: boolean): Record<string, string> {
  const seed = seedFor(config);
  const explicitText = config?.custom?.text;
  if (darkOverride === undefined || darkOverride === (seed.mode === 'dark')) {
    const palette = buildPalette(seed);
    if (explicitText) palette['--text'] = explicitText;
    return palette;
  }
  // Mode is being flipped: drop the seed's own background (it belonged to
  // the other mode) so buildPalette derives a fresh, contrast-correct one.
  return buildPalette({ ...seed, mode: darkOverride ? 'dark' : 'light', background: undefined });
}
