// Business-authentic invoice/bill layouts — 8 genuinely distinct, coordinated
// designs (header layout + typography + color role + table style + divider +
// paper tone chosen together as a system, not independent knobs recombined).
// Mirrored in frontend/src/app/core/invoice-templates.ts for the on-screen
// print view and the tenant template picker.
const INVOICE_TEMPLATES = [
  {
    id: 'modern-minimal',
    name: 'Modern Minimal',
    description: 'Quiet, whitespace-led — no color band, a small understated title, generous margins.',
    font: 'Helvetica', fontBold: 'Helvetica-Bold',
    headerStyle: 'minimalPlain', titleAlign: 'right', tableStyle: 'minimal', dividerStyle: 'solid', paperTone: 'white'
  },
  {
    id: 'corporate-formal',
    name: 'Corporate Formal',
    description: 'Institutional and accounting-firm formal — a framed letterhead, tracked caps, a bordered ledger table.',
    font: 'Times-Roman', fontBold: 'Times-Bold',
    headerStyle: 'formalFramed', titleAlign: 'right', tableStyle: 'bordered', dividerStyle: 'double', paperTone: 'white'
  },
  {
    id: 'creative-studio',
    name: 'Creative Studio',
    description: 'Agency-bold — a large angled color block, oversized type and accent-tinted rows.',
    font: 'Helvetica-Bold', fontBold: 'Helvetica-Bold',
    headerStyle: 'diagonalBold', titleAlign: 'right', tableStyle: 'zebra', dividerStyle: 'none', paperTone: 'white', accentTint: true
  },
  {
    id: 'freelancer-compact',
    name: 'Freelancer Compact',
    description: 'Dense and unfussy — a single-line header and tight rows, built for many line items on one page.',
    font: 'Helvetica', fontBold: 'Helvetica-Bold',
    headerStyle: 'splitCompact', titleAlign: 'left', tableStyle: 'minimal', dividerStyle: 'dotted', paperTone: 'white', compact: true
  },
  {
    id: 'gst-ledger-register',
    name: 'GST Ledger Register',
    description: 'Indian statutory register style — a full ruled letterhead, "Original for Recipient" tag and a fully gridded ledger table.',
    font: 'Times-Roman', fontBold: 'Times-Bold',
    headerStyle: 'letterheadLedger', titleAlign: 'center', tableStyle: 'ledger', dividerStyle: 'double', paperTone: 'white', pageFrame: true, copyLabel: true
  },
  {
    id: 'pos-receipt',
    name: 'POS Receipt',
    description: 'Reads like a printed till receipt — monospace, centered, narrow, tear-line dividers.',
    font: 'Courier', fontBold: 'Courier-Bold',
    headerStyle: 'receiptCentered', titleAlign: 'center', tableStyle: 'minimal', dividerStyle: 'perforated', paperTone: 'white', narrow: true, compact: true
  },
  {
    id: 'saas-product',
    name: 'SaaS Product',
    description: 'Digital-billing style — a corner ribbon and a compact info-card for invoice metadata.',
    font: 'Helvetica', fontBold: 'Helvetica-Bold',
    headerStyle: 'ribbonCard', titleAlign: 'right', tableStyle: 'minimal', dividerStyle: 'solid', paperTone: 'white', infoCard: true
  },
  {
    id: 'boutique-warm',
    name: 'Boutique Warm',
    description: 'Warm and boutique — a soft rounded frame, italic accents, cream paper.',
    font: 'Times-Roman', fontBold: 'Times-Bold',
    headerStyle: 'framedCentered', titleAlign: 'center', tableStyle: 'boxed', dividerStyle: 'dotted', paperTone: 'cream', pageFrame: true
  }
];

// Old (pre-redesign) ids/headerStyles mapped to their nearest new archetype,
// so tenants who saved one of the 25 retired templates keep rendering a
// coherent look after deploy instead of silently falling back to index 0.
const LEGACY_ID_MAP = {
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

const LEGACY_HEADER_MAP = {
  band: 'formalFramed', bandLarge: 'diagonalBold', plain: 'minimalPlain',
  split: 'splitCompact', sidebar: 'splitCompact', gradient: 'diagonalBold',
  boxed: 'formalFramed', diagonal: 'diagonalBold', ribbon: 'ribbonCard',
  letterhead: 'letterheadLedger', stub: 'ribbonCard'
};

/** Migrates a possibly-old headerStyle value (saved on a tenant's custom template) to one of the 8 current values. */
function migrateHeaderStyle(headerStyle, narrow) {
  if (headerStyle === 'centered') return narrow ? 'receiptCentered' : 'framedCentered';
  return LEGACY_HEADER_MAP[headerStyle] || headerStyle;
}

function getTemplate(id) {
  const mapped = LEGACY_ID_MAP[id] || id;
  return INVOICE_TEMPLATES.find(t => t.id === mapped) || INVOICE_TEMPLATES[0];
}

const BOLD_VARIANTS = {
  'Helvetica': 'Helvetica-Bold',
  'Helvetica-Bold': 'Helvetica-Bold',
  'Times-Roman': 'Times-Bold',
  'Times-Bold': 'Times-Bold',
  'Courier': 'Courier-Bold',
  'Courier-Bold': 'Courier-Bold'
};

const ITALIC_VARIANTS = {
  'Helvetica': 'Helvetica-Oblique',
  'Helvetica-Bold': 'Helvetica-BoldOblique',
  'Times-Roman': 'Times-Italic',
  'Times-Bold': 'Times-BoldItalic',
  'Courier': 'Courier-Oblique',
  'Courier-Bold': 'Courier-BoldOblique'
};

const NEW_HEADER_STYLES = new Set([
  'minimalPlain', 'formalFramed', 'diagonalBold', 'splitCompact',
  'letterheadLedger', 'receiptCentered', 'ribbonCard', 'framedCentered'
]);

// Mirrors frontend/src/app/core/invoice-templates.ts's resolveInvoiceTemplate —
// substitutes the tenant's own custom build when invoiceTemplateId is 'custom'.
function resolveTemplate(brandingConfig) {
  if (brandingConfig?.invoiceTemplateId === 'custom' && brandingConfig?.customInvoiceTemplate) {
    const c = brandingConfig.customInvoiceTemplate;
    const font = c.font || 'Helvetica';
    const narrow = !!c.narrow;
    const headerStyle = NEW_HEADER_STYLES.has(c.headerStyle) ? c.headerStyle : migrateHeaderStyle(c.headerStyle || 'plain', narrow);
    return {
      id: 'custom',
      name: 'Custom Template',
      font,
      fontBold: BOLD_VARIANTS[font] || 'Helvetica-Bold',
      headerStyle,
      titleAlign: c.titleAlign || 'right',
      tableStyle: c.tableStyle || 'bordered',
      dividerStyle: c.dividerStyle || 'solid',
      paperTone: c.paperTone || 'white',
      compact: !!c.compact,
      narrow,
      accentTint: !!c.accentTint,
      infoCard: !!c.infoCard,
      pageFrame: !!c.pageFrame,
      copyLabel: !!c.copyLabel
    };
  }
  return getTemplate(brandingConfig?.invoiceTemplateId);
}

module.exports = { INVOICE_TEMPLATES, getTemplate, resolveTemplate, BOLD_VARIANTS, ITALIC_VARIANTS };
