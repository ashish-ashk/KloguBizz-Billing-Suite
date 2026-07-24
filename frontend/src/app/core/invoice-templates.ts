/**
 * Business-authentic invoice/bill layouts — 8 genuinely distinct, coordinated
 * designs (header layout + typography + color role + table style + divider +
 * paper tone chosen together as a system, not independent knobs recombined),
 * mirrored from backend/src/services/invoiceTemplates.js so the on-screen
 * print/preview view and the tenant template picker match what the downloaded
 * PDF shows.
 */

export type HeaderStyle = 'minimalPlain' | 'formalFramed' | 'diagonalBold' | 'splitCompact' | 'letterheadLedger' | 'receiptCentered' | 'ribbonCard' | 'framedCentered';
export type TableStyle = 'bordered' | 'zebra' | 'minimal' | 'boxed' | 'ledger';
export type DividerStyle = 'solid' | 'double' | 'dotted' | 'none' | 'perforated';
export type PaperTone = 'white' | 'cream' | 'graypaper';

export interface InvoiceTemplate {
  id: string;
  name: string;
  description: string;
  font: string;
  headerStyle: HeaderStyle;
  titleAlign: 'left' | 'right' | 'center';
  tableStyle: TableStyle;
  dividerStyle: DividerStyle;
  paperTone: PaperTone;
  compact?: boolean;
  narrow?: boolean;
  /** Zebra rows tinted with the org's accent color instead of flat gray (Creative Studio). */
  accentTint?: boolean;
  /** Bill-to/supply-details rendered as small rounded soft-background cards, plus a compact meta info card under the header (SaaS Product). */
  infoCard?: boolean;
  /** A framed/bordered header treatment (GST Ledger Register, Boutique Warm). */
  pageFrame?: boolean;
  /** Small "Original for Recipient" corner tag (GST Ledger Register only). */
  copyLabel?: boolean;
}

export const FONT_STACKS: Record<string, string> = {
  'Times-Roman': '"Times New Roman", Times, serif',
  'Times-Bold': '"Times New Roman", Times, serif',
  'Helvetica': 'Arial, Helvetica, sans-serif',
  'Helvetica-Bold': 'Arial, Helvetica, sans-serif',
  'Courier': '"Courier New", Courier, monospace',
  'Courier-Bold': '"Courier New", Courier, monospace'
};

export const PAPER_TONE_COLORS: Record<PaperTone, string> = {
  white: '#ffffff', cream: '#fdfaf3', graypaper: '#f7f7f5'
};

export const INVOICE_TEMPLATES: InvoiceTemplate[] = [
  { id: 'modern-minimal', name: 'Modern Minimal', description: 'Quiet, whitespace-led — no color band, a small understated title, generous margins.', font: 'Helvetica', headerStyle: 'minimalPlain', titleAlign: 'right', tableStyle: 'minimal', dividerStyle: 'solid', paperTone: 'white' },
  { id: 'corporate-formal', name: 'Corporate Formal', description: 'Institutional and accounting-firm formal — a framed letterhead, tracked caps, a bordered ledger table.', font: 'Times-Roman', headerStyle: 'formalFramed', titleAlign: 'right', tableStyle: 'bordered', dividerStyle: 'double', paperTone: 'white' },
  { id: 'creative-studio', name: 'Creative Studio', description: 'Agency-bold — a large angled color block, oversized type and accent-tinted rows.', font: 'Helvetica-Bold', headerStyle: 'diagonalBold', titleAlign: 'right', tableStyle: 'zebra', dividerStyle: 'none', paperTone: 'white', accentTint: true },
  { id: 'freelancer-compact', name: 'Freelancer Compact', description: 'Dense and unfussy — a single-line header and tight rows, built for many line items on one page.', font: 'Helvetica', headerStyle: 'splitCompact', titleAlign: 'left', tableStyle: 'minimal', dividerStyle: 'dotted', paperTone: 'white', compact: true },
  { id: 'gst-ledger-register', name: 'GST Ledger Register', description: 'Indian statutory register style — a full ruled letterhead, "Original for Recipient" tag and a fully gridded ledger table.', font: 'Times-Roman', headerStyle: 'letterheadLedger', titleAlign: 'center', tableStyle: 'ledger', dividerStyle: 'double', paperTone: 'white', pageFrame: true, copyLabel: true },
  { id: 'pos-receipt', name: 'POS Receipt', description: 'Reads like a printed till receipt — monospace, centered, narrow, tear-line dividers.', font: 'Courier', headerStyle: 'receiptCentered', titleAlign: 'center', tableStyle: 'minimal', dividerStyle: 'perforated', paperTone: 'white', narrow: true, compact: true },
  { id: 'saas-product', name: 'SaaS Product', description: 'Digital-billing style — a corner ribbon and a compact info-card for invoice metadata.', font: 'Helvetica', headerStyle: 'ribbonCard', titleAlign: 'right', tableStyle: 'minimal', dividerStyle: 'solid', paperTone: 'white', infoCard: true },
  { id: 'boutique-warm', name: 'Boutique Warm', description: 'Warm and boutique — a soft rounded frame, italic accents, cream paper.', font: 'Times-Roman', headerStyle: 'framedCentered', titleAlign: 'center', tableStyle: 'boxed', dividerStyle: 'dotted', paperTone: 'cream', pageFrame: true }
];

// Old (pre-redesign) ids/headerStyles mapped to their nearest new archetype,
// so tenants who saved one of the 25 retired templates keep rendering a
// coherent look instead of silently falling back to index 0. Mirrors
// backend/src/services/invoiceTemplates.js's LEGACY_ID_MAP/LEGACY_HEADER_MAP.
const LEGACY_ID_MAP: Record<string, string> = {
  'classic-corporate': 'corporate-formal',
  'bold-header': 'creative-studio',
  'elegant-serif': 'boutique-warm',
  'two-column-compact': 'freelancer-compact',
  'tech-startup': 'saas-product',
  'gradient-accent': 'creative-studio',
  'professional-blue': 'corporate-formal',
  'creative-bold': 'creative-studio',
  'simple-receipt': 'pos-receipt',
  'minimal-whitespace': 'modern-minimal',
  'statutory-classic': 'gst-ledger-register',
  'studio-block': 'creative-studio',
  'till-receipt': 'pos-receipt',
  'advisory-brief': 'freelancer-compact',
  'gst-formal-register': 'gst-ledger-register',
  'product-invoice-tech': 'saas-product',
  'site-work-order': 'gst-ledger-register',
  'solo-studio-freelancer': 'boutique-warm',
  'order-confirmation': 'saas-product',
  'guest-folio-hospitality': 'boutique-warm',
  'clinic-statement': 'corporate-formal',
  'property-statement': 'corporate-formal',
  'shipment-manifest': 'gst-ledger-register',
  'boutique-label': 'boutique-warm'
};

const LEGACY_HEADER_MAP: Record<string, HeaderStyle> = {
  band: 'formalFramed', bandLarge: 'diagonalBold', plain: 'minimalPlain',
  split: 'splitCompact', sidebar: 'splitCompact', gradient: 'diagonalBold',
  boxed: 'formalFramed', diagonal: 'diagonalBold', ribbon: 'ribbonCard',
  letterhead: 'letterheadLedger', stub: 'ribbonCard'
};

const NEW_HEADER_STYLES = new Set<string>(['minimalPlain', 'formalFramed', 'diagonalBold', 'splitCompact', 'letterheadLedger', 'receiptCentered', 'ribbonCard', 'framedCentered']);

/** Migrates a possibly-old headerStyle value (saved on a tenant's custom template) to one of the 8 current values. */
function migrateHeaderStyle(headerStyle: string, narrow: boolean): HeaderStyle {
  if (headerStyle === 'centered') return narrow ? 'receiptCentered' : 'framedCentered';
  return LEGACY_HEADER_MAP[headerStyle] || 'minimalPlain';
}

export function getInvoiceTemplate(id: string | undefined): InvoiceTemplate {
  const mapped = (id && LEGACY_ID_MAP[id]) || id;
  return INVOICE_TEMPLATES.find(t => t.id === mapped) || INVOICE_TEMPLATES[0];
}

/** The `id` reserved for a tenant's own from-scratch template (see CustomInvoiceTemplate). */
export const CUSTOM_TEMPLATE_ID = 'custom';

/** A tenant-built template — the same knobs a built-in template has, picked one at a time. */
export interface CustomInvoiceTemplate {
  font: string;
  headerStyle: HeaderStyle;
  titleAlign: 'left' | 'right' | 'center';
  tableStyle: TableStyle;
  dividerStyle: DividerStyle;
  paperTone: PaperTone;
  compact: boolean;
  narrow: boolean;
  accentTint?: boolean;
  infoCard?: boolean;
  pageFrame?: boolean;
  copyLabel?: boolean;
}

export const DEFAULT_CUSTOM_INVOICE_TEMPLATE: CustomInvoiceTemplate = {
  font: 'Helvetica', headerStyle: 'minimalPlain', titleAlign: 'right',
  tableStyle: 'bordered', dividerStyle: 'solid', paperTone: 'white',
  compact: false, narrow: false
};

export const FONT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'Helvetica', label: 'Sans-serif (Helvetica)' },
  { value: 'Helvetica-Bold', label: 'Sans-serif Bold (Helvetica)' },
  { value: 'Times-Roman', label: 'Serif (Times)' },
  { value: 'Courier', label: 'Monospace (Courier)' }
];

export const HEADER_STYLE_OPTIONS: Array<{ value: HeaderStyle; label: string }> = [
  { value: 'minimalPlain', label: 'Minimal — quiet, no color band' },
  { value: 'formalFramed', label: 'Formal Framed — bordered letterhead box' },
  { value: 'diagonalBold', label: 'Diagonal Bold — large angled color block' },
  { value: 'splitCompact', label: 'Split Compact — single-line dense header' },
  { value: 'letterheadLedger', label: 'Letterhead Ledger — double-ruled statutory frame' },
  { value: 'receiptCentered', label: 'Receipt Centered — narrow, centered receipt style' },
  { value: 'ribbonCard', label: 'Ribbon Card — corner ribbon + info card' },
  { value: 'framedCentered', label: 'Framed Centered — soft rounded frame' }
];

export const TITLE_ALIGN_OPTIONS: Array<{ value: 'left' | 'right' | 'center'; label: string }> = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' }
];

export const TABLE_STYLE_OPTIONS: Array<{ value: TableStyle; label: string }> = [
  { value: 'bordered', label: 'Bordered — grid lines around every cell' },
  { value: 'zebra', label: 'Zebra — alternating row shading' },
  { value: 'minimal', label: 'Minimal — no borders, just a header rule' },
  { value: 'boxed', label: 'Boxed — accent-colored header row' },
  { value: 'ledger', label: 'Ledger — vertical column rules, register style' }
];

export const DIVIDER_STYLE_OPTIONS: Array<{ value: DividerStyle; label: string }> = [
  { value: 'solid', label: 'Solid line' },
  { value: 'double', label: 'Double line' },
  { value: 'dotted', label: 'Dotted line' },
  { value: 'none', label: 'None' },
  { value: 'perforated', label: 'Perforated — tear-off dots' }
];

export const PAPER_TONE_OPTIONS: Array<{ value: PaperTone; label: string }> = [
  { value: 'white', label: 'White' },
  { value: 'cream', label: 'Cream' },
  { value: 'graypaper', label: 'Soft Gray' }
];

/** Resolves a template id to its config, substituting the tenant's custom build when selected. */
export function resolveInvoiceTemplate(templateId: string | undefined, customTemplate: CustomInvoiceTemplate | null | undefined): InvoiceTemplate {
  if (templateId === CUSTOM_TEMPLATE_ID && customTemplate) {
    const narrow = !!customTemplate.narrow;
    const headerStyle = NEW_HEADER_STYLES.has(customTemplate.headerStyle) ? customTemplate.headerStyle : migrateHeaderStyle(customTemplate.headerStyle || 'minimalPlain', narrow);
    return { id: CUSTOM_TEMPLATE_ID, name: 'Custom Template', description: 'Your own template', ...customTemplate, headerStyle, narrow };
  }
  return getInvoiceTemplate(templateId);
}
