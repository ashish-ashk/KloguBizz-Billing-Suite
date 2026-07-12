/**
 * Ten business-authentic invoice/bill layouts, mirrored from
 * backend/src/services/invoiceTemplates.js so the on-screen print/preview
 * view and the tenant template picker match what the downloaded PDF shows.
 */

export type HeaderStyle = 'band' | 'bandLarge' | 'plain' | 'centered' | 'split' | 'sidebar' | 'gradient' | 'boxed' | 'diagonal';
export type TableStyle = 'bordered' | 'zebra' | 'minimal' | 'boxed';
export type DividerStyle = 'solid' | 'double' | 'dotted' | 'none';
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
  { id: 'classic-corporate', name: 'Classic Corporate', description: 'Formal serif layout with a bordered header band — the traditional look accountants expect.', font: 'Times-Roman', headerStyle: 'band', titleAlign: 'right', tableStyle: 'bordered', dividerStyle: 'double', paperTone: 'white' },
  { id: 'modern-minimal', name: 'Modern Minimal', description: 'Clean sans-serif with generous white space and no visual clutter.', font: 'Helvetica', headerStyle: 'plain', titleAlign: 'left', tableStyle: 'minimal', dividerStyle: 'solid', paperTone: 'white' },
  { id: 'bold-header', name: 'Bold Header', description: 'Full-width color band up top with a large title — impossible to miss in an inbox.', font: 'Helvetica', headerStyle: 'bandLarge', titleAlign: 'center', tableStyle: 'zebra', dividerStyle: 'none', paperTone: 'white' },
  { id: 'elegant-serif', name: 'Elegant Serif', description: 'Warm cream paper tone with italic accents and a boxed table — boutique and refined.', font: 'Times-Roman', headerStyle: 'centered', titleAlign: 'center', tableStyle: 'boxed', dividerStyle: 'dotted', paperTone: 'cream' },
  { id: 'two-column-compact', name: 'Two-Column Compact', description: 'Dense, information-first layout that fits many line items without feeling cramped.', font: 'Helvetica', headerStyle: 'split', titleAlign: 'left', tableStyle: 'minimal', dividerStyle: 'solid', paperTone: 'white', compact: true },
  { id: 'tech-startup', name: 'Tech Startup', description: 'A bold color bar down the side and confident type — built for product-led companies.', font: 'Helvetica-Bold', headerStyle: 'sidebar', titleAlign: 'left', tableStyle: 'zebra', dividerStyle: 'none', paperTone: 'white' },
  { id: 'gradient-accent', name: 'Gradient Accent', description: 'Layered two-tone header band for a modern, design-forward first impression.', font: 'Helvetica', headerStyle: 'gradient', titleAlign: 'center', tableStyle: 'bordered', dividerStyle: 'solid', paperTone: 'white' },
  { id: 'professional-blue', name: 'Professional Blue', description: 'Boxed sections and a steady grid — the reassuring look of an enterprise invoice.', font: 'Helvetica', headerStyle: 'boxed', titleAlign: 'right', tableStyle: 'boxed', dividerStyle: 'solid', paperTone: 'white' },
  { id: 'creative-bold', name: 'Creative Bold', description: 'An angled color block and confident negative space for agencies and studios.', font: 'Helvetica-Bold', headerStyle: 'diagonal', titleAlign: 'right', tableStyle: 'zebra', dividerStyle: 'none', paperTone: 'white' },
  { id: 'simple-receipt', name: 'Simple Receipt', description: 'Monospace, centered, narrow — reads like a point-of-sale receipt.', font: 'Courier', headerStyle: 'centered', titleAlign: 'center', tableStyle: 'minimal', dividerStyle: 'dotted', paperTone: 'white', narrow: true }
];

export function getInvoiceTemplate(id: string | undefined): InvoiceTemplate {
  return INVOICE_TEMPLATES.find(t => t.id === id) || INVOICE_TEMPLATES[0];
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
}

export const DEFAULT_CUSTOM_INVOICE_TEMPLATE: CustomInvoiceTemplate = {
  font: 'Helvetica', headerStyle: 'plain', titleAlign: 'right',
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
  { value: 'plain', label: 'Plain — logo left, title right' },
  { value: 'band', label: 'Band — colored strip across the top' },
  { value: 'bandLarge', label: 'Large Band — big centered title' },
  { value: 'centered', label: 'Centered — everything center-aligned' },
  { value: 'split', label: 'Split — two even columns' },
  { value: 'sidebar', label: 'Sidebar — colored vertical bar' },
  { value: 'gradient', label: 'Gradient — layered two-tone band' },
  { value: 'boxed', label: 'Boxed — bordered info panels' },
  { value: 'diagonal', label: 'Diagonal — angled color block' }
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
  { value: 'boxed', label: 'Boxed — accent-colored header row' }
];

export const DIVIDER_STYLE_OPTIONS: Array<{ value: DividerStyle; label: string }> = [
  { value: 'solid', label: 'Solid line' },
  { value: 'double', label: 'Double line' },
  { value: 'dotted', label: 'Dotted line' },
  { value: 'none', label: 'None' }
];

export const PAPER_TONE_OPTIONS: Array<{ value: PaperTone; label: string }> = [
  { value: 'white', label: 'White' },
  { value: 'cream', label: 'Cream' },
  { value: 'graypaper', label: 'Soft Gray' }
];

/** Resolves a template id to its config, substituting the tenant's custom build when selected. */
export function resolveInvoiceTemplate(templateId: string | undefined, customTemplate: CustomInvoiceTemplate | null | undefined): InvoiceTemplate {
  if (templateId === CUSTOM_TEMPLATE_ID && customTemplate) {
    return { id: CUSTOM_TEMPLATE_ID, name: 'Custom Template', description: 'Your own template', ...customTemplate };
  }
  return getInvoiceTemplate(templateId);
}
