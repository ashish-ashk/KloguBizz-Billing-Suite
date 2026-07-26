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
  },
  {
    id: 'agency-spine',
    name: 'Agency Spine',
    description: 'Design-studio bold — a full-height color spine down the page edge, uppercase type, tinted rows.',
    font: 'Helvetica-Bold', fontBold: 'Helvetica-Bold',
    headerStyle: 'sidebarStripe', titleAlign: 'left', tableStyle: 'zebra', dividerStyle: 'none', paperTone: 'white', accentTint: true
  },
  {
    id: 'friendly-banner',
    name: 'Friendly Banner',
    description: 'Approachable SaaS-billing look — a full-width color banner across the top holding your brand and the invoice title.',
    font: 'Helvetica', fontBold: 'Helvetica-Bold',
    headerStyle: 'bannerBlock', titleAlign: 'left', tableStyle: 'boxed', dividerStyle: 'solid', paperTone: 'white'
  },
  {
    id: 'clean-ledger',
    name: 'Clean Ledger',
    description: 'Crisp accounting-software style — plain header, a bold color rule underneath, nothing else competing for attention.',
    font: 'Helvetica', fontBold: 'Helvetica-Bold',
    headerStyle: 'underlineAccent', titleAlign: 'right', tableStyle: 'minimal', dividerStyle: 'none', paperTone: 'white'
  },
  {
    id: 'statutory-watermark',
    name: 'Statutory Watermark',
    description: 'Formal and legal-adjacent — a faint diagonal INVOICE watermark behind a fully gridded ledger table.',
    font: 'Times-Roman', fontBold: 'Times-Bold',
    headerStyle: 'watermarkGhost', titleAlign: 'center', tableStyle: 'ledger', dividerStyle: 'double', paperTone: 'white'
  },
  {
    id: 'enterprise-grid',
    name: 'Enterprise Grid',
    description: 'ERP-style hard-bordered masthead — company block and a gridded invoice-meta table side by side.',
    font: 'Helvetica', fontBold: 'Helvetica-Bold',
    headerStyle: 'mastheadGrid', titleAlign: 'left', tableStyle: 'bordered', dividerStyle: 'solid', paperTone: 'graypaper'
  },
  {
    id: 'boutique-badge',
    name: 'Boutique Badge',
    description: 'Storefront-friendly — a centered circular logo badge, centered company name, a soft boxed table.',
    font: 'Times-Roman', fontBold: 'Times-Bold',
    headerStyle: 'badgeCentered', titleAlign: 'center', tableStyle: 'boxed', dividerStyle: 'dotted', paperTone: 'cream'
  },
  {
    id: 'split-corporate',
    name: 'Split Corporate',
    description: 'Confident two-tone header — a solid color block holds the invoice title and dates opposite your company details.',
    font: 'Helvetica-Bold', fontBold: 'Helvetica-Bold',
    headerStyle: 'twoToneSplit', titleAlign: 'right', tableStyle: 'bordered', dividerStyle: 'double', paperTone: 'white'
  },
  {
    id: 'govt-contractor',
    name: 'Government Contractor',
    description: 'Tender and PSU-billing style — a rotated dashed verification stamp opposite plain letterhead details.',
    font: 'Times-Roman', fontBold: 'Times-Bold',
    headerStyle: 'stampSeal', titleAlign: 'left', tableStyle: 'bordered', dividerStyle: 'solid', paperTone: 'white'
  },
  {
    id: 'spreadsheet-export',
    name: 'Spreadsheet Export',
    description: 'Reads like an accounting-software export — a fully bordered header grid, cell by cell.',
    font: 'Helvetica', fontBold: 'Helvetica-Bold',
    headerStyle: 'spreadsheetGrid', titleAlign: 'left', tableStyle: 'ledger', dividerStyle: 'none', paperTone: 'white'
  },
  {
    id: 'marketplace-order',
    name: 'Marketplace Order',
    description: 'E-commerce order-invoice style — a big centered wordmark over a 4-column order/date/due/payment strip.',
    font: 'Helvetica-Bold', fontBold: 'Helvetica-Bold',
    headerStyle: 'wideLogoBar', titleAlign: 'center', tableStyle: 'minimal', dividerStyle: 'solid', paperTone: 'white'
  },
  {
    id: 'consulting-rule',
    name: 'Consulting Rule',
    description: 'Quiet two-column header split by a single vertical rule — no boxes, no color fills, just clean alignment.',
    font: 'Helvetica', fontBold: 'Helvetica-Bold',
    headerStyle: 'columnRule', titleAlign: 'right', tableStyle: 'minimal', dividerStyle: 'solid', paperTone: 'white'
  },
  {
    id: 'gst-einvoice-qr',
    name: 'GST e-Invoice QR',
    description: 'Digital-ready statutory look — a corner QR motif alongside the tax invoice details, gridded ledger table.',
    font: 'Helvetica', fontBold: 'Helvetica-Bold',
    headerStyle: 'qrCorner', titleAlign: 'right', tableStyle: 'bordered', dividerStyle: 'double', paperTone: 'white'
  },
  {
    id: 'carbon-billbook',
    name: 'Carbon Bill Book',
    description: 'Small-shop bill-book feel — a boxed "Bill No." stub and tear-line dividers, monospace throughout.',
    font: 'Courier', fontBold: 'Courier-Bold',
    headerStyle: 'carbonBillBook', titleAlign: 'left', tableStyle: 'minimal', dividerStyle: 'perforated', paperTone: 'cream', compact: true
  },
  {
    id: 'fintech-pills',
    name: 'Fintech Pills',
    description: 'Modern payments-app look — invoice number, date and due date as rounded status pills under a plain wordmark.',
    font: 'Helvetica', fontBold: 'Helvetica-Bold',
    headerStyle: 'fintechPills', titleAlign: 'left', tableStyle: 'minimal', dividerStyle: 'none', paperTone: 'white'
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
  'letterheadLedger', 'receiptCentered', 'ribbonCard', 'framedCentered',
  'sidebarStripe', 'bannerBlock', 'underlineAccent', 'watermarkGhost',
  'mastheadGrid', 'badgeCentered', 'twoToneSplit',
  'stampSeal', 'spreadsheetGrid', 'wideLogoBar', 'columnRule', 'qrCorner', 'carbonBillBook', 'fintechPills'
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
