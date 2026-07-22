// Business-authentic invoice/bill layouts. Each is a real combination of
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
  },

  // 15 additional layouts, each inspired by a common market/industry
  // convention (not a copy of any specific vendor's proprietary design).
  // Mirrors frontend/src/app/core/invoice-templates.ts byte-for-byte.
  {
    id: 'minimal-whitespace', name: 'Whitespace',
    description: 'Minimalist and modern — generous margins, quiet type, nothing but the essentials.',
    font: 'Helvetica', fontBold: 'Helvetica-Bold',
    headerStyle: 'plain', titleAlign: 'right', tableStyle: 'minimal', dividerStyle: 'none', paperTone: 'white'
  },
  {
    id: 'statutory-classic', name: 'Statutory Classic',
    description: 'Classic corporate register look — framing rules and a bordered ledger table.',
    font: 'Times-Roman', fontBold: 'Times-Bold',
    headerStyle: 'letterhead', titleAlign: 'left', tableStyle: 'bordered', dividerStyle: 'solid', paperTone: 'graypaper'
  },
  {
    id: 'studio-block', name: 'Studio Block',
    description: 'Creative agency energy — a bold two-tone header and confident zebra rows.',
    font: 'Helvetica-Bold', fontBold: 'Helvetica-Bold',
    headerStyle: 'gradient', titleAlign: 'left', tableStyle: 'zebra', dividerStyle: 'none', paperTone: 'white'
  },
  {
    id: 'till-receipt', name: 'Till Receipt',
    description: 'Retail point-of-sale style — monospace, centered, with a perforated tear line.',
    font: 'Courier', fontBold: 'Courier-Bold',
    headerStyle: 'centered', titleAlign: 'center', tableStyle: 'minimal', dividerStyle: 'perforated', paperTone: 'white', narrow: true, compact: true
  },
  {
    id: 'advisory-brief', name: 'Advisory Brief',
    description: 'Consulting and professional services — a quiet sidebar accent, minimal table.',
    font: 'Times-Roman', fontBold: 'Times-Bold',
    headerStyle: 'sidebar', titleAlign: 'right', tableStyle: 'minimal', dividerStyle: 'solid', paperTone: 'graypaper'
  },
  {
    id: 'gst-formal-register', name: 'GST Register',
    description: 'Government/GST-formal — a framed letterhead and full ledger rulings.',
    font: 'Times-Roman', fontBold: 'Times-Bold',
    headerStyle: 'letterhead', titleAlign: 'center', tableStyle: 'ledger', dividerStyle: 'double', paperTone: 'white'
  },
  {
    id: 'product-invoice-tech', name: 'Product Invoice',
    description: 'SaaS/tech style — a small corner ribbon and clean minimal table.',
    font: 'Helvetica', fontBold: 'Helvetica-Bold',
    headerStyle: 'ribbon', titleAlign: 'right', tableStyle: 'minimal', dividerStyle: 'solid', paperTone: 'white'
  },
  {
    id: 'site-work-order', name: 'Site Work Order',
    description: 'Construction and trades — a bordered docket header and ruled ledger table.',
    font: 'Helvetica-Bold', fontBold: 'Helvetica-Bold',
    headerStyle: 'stub', titleAlign: 'left', tableStyle: 'ledger', dividerStyle: 'solid', paperTone: 'white'
  },
  {
    id: 'solo-studio-freelancer', name: 'Solo Studio',
    description: 'Warm and approachable — friendly centered header for independent freelancers.',
    font: 'Helvetica', fontBold: 'Helvetica-Bold',
    headerStyle: 'centered', titleAlign: 'center', tableStyle: 'zebra', dividerStyle: 'dotted', paperTone: 'cream'
  },
  {
    id: 'order-confirmation', name: 'Order Confirmation',
    description: 'E-commerce order-slip style — compact ribbon header, zebra line items.',
    font: 'Helvetica', fontBold: 'Helvetica-Bold',
    headerStyle: 'ribbon', titleAlign: 'left', tableStyle: 'zebra', dividerStyle: 'none', paperTone: 'white', compact: true
  },
  {
    id: 'guest-folio-hospitality', name: 'Guest Folio',
    description: 'Hospitality guest-folio style — a large centered band and boxed charges table.',
    font: 'Times-Roman', fontBold: 'Times-Bold',
    headerStyle: 'bandLarge', titleAlign: 'center', tableStyle: 'boxed', dividerStyle: 'dotted', paperTone: 'cream'
  },
  {
    id: 'clinic-statement', name: 'Clinic Statement',
    description: 'Medical/clinic statement — a calm split header and bordered charges table.',
    font: 'Helvetica', fontBold: 'Helvetica-Bold',
    headerStyle: 'split', titleAlign: 'left', tableStyle: 'bordered', dividerStyle: 'solid', paperTone: 'graypaper'
  },
  {
    id: 'property-statement', name: 'Property Statement',
    description: 'Real estate statement — boxed panels and a double rule for a formal finish.',
    font: 'Times-Roman', fontBold: 'Times-Bold',
    headerStyle: 'boxed', titleAlign: 'right', tableStyle: 'bordered', dividerStyle: 'double', paperTone: 'cream'
  },
  {
    id: 'shipment-manifest', name: 'Shipment Manifest',
    description: 'Import-export/logistics manifest — a docket header and ruled ledger table.',
    font: 'Courier', fontBold: 'Courier-Bold',
    headerStyle: 'stub', titleAlign: 'left', tableStyle: 'ledger', dividerStyle: 'solid', paperTone: 'graypaper', compact: true
  },
  {
    id: 'boutique-label', name: 'Boutique Label',
    description: 'Boutique retail-brand feel — an angled accent block on warm cream paper.',
    font: 'Times-Roman', fontBold: 'Times-Bold',
    headerStyle: 'diagonal', titleAlign: 'left', tableStyle: 'boxed', dividerStyle: 'dotted', paperTone: 'cream'
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
