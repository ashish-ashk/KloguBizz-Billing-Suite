// Ten business-authentic invoice/bill layouts. Each is a real combination of
// typography, header treatment, table style and divider — not just a color
// swap — so picking a template genuinely changes how the document reads.
// Mirrored in frontend/src/app/core/invoice-templates.ts for the on-screen
// print view and the tenant template picker.
const INVOICE_TEMPLATES = [
  {
    id: 'classic-corporate',
    name: 'Classic Corporate',
    description: 'Formal serif layout with a bordered header band — the traditional look accountants expect.',
    font: 'Times-Roman', fontBold: 'Times-Bold',
    headerStyle: 'band', titleAlign: 'right', tableStyle: 'bordered', dividerStyle: 'double', paperTone: 'white'
  },
  {
    id: 'modern-minimal',
    name: 'Modern Minimal',
    description: 'Clean sans-serif with generous white space and no visual clutter.',
    font: 'Helvetica', fontBold: 'Helvetica-Bold',
    headerStyle: 'plain', titleAlign: 'left', tableStyle: 'minimal', dividerStyle: 'solid', paperTone: 'white'
  },
  {
    id: 'bold-header',
    name: 'Bold Header',
    description: 'Full-width color band up top with a large title — impossible to miss in an inbox.',
    font: 'Helvetica', fontBold: 'Helvetica-Bold',
    headerStyle: 'bandLarge', titleAlign: 'center', tableStyle: 'zebra', dividerStyle: 'none', paperTone: 'white'
  },
  {
    id: 'elegant-serif',
    name: 'Elegant Serif',
    description: 'Warm cream paper tone with italic accents and a boxed table — boutique and refined.',
    font: 'Times-Roman', fontBold: 'Times-Bold',
    headerStyle: 'centered', titleAlign: 'center', tableStyle: 'boxed', dividerStyle: 'dotted', paperTone: 'cream'
  },
  {
    id: 'two-column-compact',
    name: 'Two-Column Compact',
    description: 'Dense, information-first layout that fits many line items without feeling cramped.',
    font: 'Helvetica', fontBold: 'Helvetica-Bold',
    headerStyle: 'split', titleAlign: 'left', tableStyle: 'minimal', dividerStyle: 'solid', paperTone: 'white', compact: true
  },
  {
    id: 'tech-startup',
    name: 'Tech Startup',
    description: 'A bold color bar down the side and confident type — built for product-led companies.',
    font: 'Helvetica-Bold', fontBold: 'Helvetica-Bold',
    headerStyle: 'sidebar', titleAlign: 'left', tableStyle: 'zebra', dividerStyle: 'none', paperTone: 'white'
  },
  {
    id: 'gradient-accent',
    name: 'Gradient Accent',
    description: 'Layered two-tone header band for a modern, design-forward first impression.',
    font: 'Helvetica', fontBold: 'Helvetica-Bold',
    headerStyle: 'gradient', titleAlign: 'center', tableStyle: 'bordered', dividerStyle: 'solid', paperTone: 'white'
  },
  {
    id: 'professional-blue',
    name: 'Professional Blue',
    description: 'Boxed sections and a steady grid — the reassuring look of an enterprise invoice.',
    font: 'Helvetica', fontBold: 'Helvetica-Bold',
    headerStyle: 'boxed', titleAlign: 'right', tableStyle: 'boxed', dividerStyle: 'solid', paperTone: 'white'
  },
  {
    id: 'creative-bold',
    name: 'Creative Bold',
    description: 'An angled color block and confident negative space for agencies and studios.',
    font: 'Helvetica-Bold', fontBold: 'Helvetica-Bold',
    headerStyle: 'diagonal', titleAlign: 'right', tableStyle: 'zebra', dividerStyle: 'none', paperTone: 'white'
  },
  {
    id: 'simple-receipt',
    name: 'Simple Receipt',
    description: 'Monospace, centered, narrow — reads like a point-of-sale receipt.',
    font: 'Courier', fontBold: 'Courier-Bold',
    headerStyle: 'centered', titleAlign: 'center', tableStyle: 'minimal', dividerStyle: 'dotted', paperTone: 'white', narrow: true
  }
];

function getTemplate(id) {
  return INVOICE_TEMPLATES.find(t => t.id === id) || INVOICE_TEMPLATES[0];
}

const BOLD_VARIANTS = {
  'Helvetica': 'Helvetica-Bold',
  'Helvetica-Bold': 'Helvetica-Bold',
  'Times-Roman': 'Times-Bold',
  'Times-Bold': 'Times-Bold',
  'Courier': 'Courier-Bold',
  'Courier-Bold': 'Courier-Bold'
};

// Mirrors frontend/src/app/core/invoice-templates.ts's resolveInvoiceTemplate —
// substitutes the tenant's own custom build when invoiceTemplateId is 'custom'.
function resolveTemplate(brandingConfig) {
  if (brandingConfig?.invoiceTemplateId === 'custom' && brandingConfig?.customInvoiceTemplate) {
    const c = brandingConfig.customInvoiceTemplate;
    const font = c.font || 'Helvetica';
    return {
      id: 'custom',
      name: 'Custom Template',
      font,
      fontBold: BOLD_VARIANTS[font] || 'Helvetica-Bold',
      headerStyle: c.headerStyle || 'plain',
      titleAlign: c.titleAlign || 'right',
      tableStyle: c.tableStyle || 'bordered',
      dividerStyle: c.dividerStyle || 'solid',
      paperTone: c.paperTone || 'white',
      compact: !!c.compact,
      narrow: !!c.narrow
    };
  }
  return getTemplate(brandingConfig?.invoiceTemplateId);
}

module.exports = { INVOICE_TEMPLATES, getTemplate, resolveTemplate };
