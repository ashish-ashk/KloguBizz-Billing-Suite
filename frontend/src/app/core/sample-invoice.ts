import { InvoiceDocClient, InvoiceDocData } from '../shared/invoice-document.component';

/**
 * The sample document used by every template preview.
 *
 * Shared so the tenant's Invoice Templates page and the super admin's platform
 * default page preview identical content — comparing designs is only meaningful
 * when the data underneath is the same.
 *
 * Deliberately exercises the figures that are easy to get wrong: a discounted
 * line, a cess-bearing line, and a total that needs a round-off adjustment. A
 * template that mishandles any of them shows it here rather than on a real
 * customer's invoice.
 */
export const SAMPLE_INVOICE: InvoiceDocData = {
  invoiceNumber: 'KLG-2026-001',
  date: new Date(2026, 6, 1).toISOString(),
  dueDate: new Date(2026, 6, 16).toISOString(),
  items: [
    { desc: 'Web Development Services', hsn: '998314', qty: 1, rate: 45000, gstRate: 18 },
    { desc: 'UI/UX Design', hsn: '998314', qty: 1, rate: 15000, gstRate: 18, discountPercent: 10 }
  ],
  totals: {
    grossSubtotal: 60000,
    discountTotal: 1500,
    subtotal: 58500,
    cgst: 5265,
    sgst: 5265,
    igst: 0,
    cess: 0,
    roundOff: 0,
    total: 69030,
    isIGST: false,
    isUT: false
  },
  notes: 'Thank you for your business!',
  paymentTerms: 'Net 15',
  bankDetails: { bank: 'HDFC Bank', account: '50100123456789', ifsc: 'HDFC0001234' }
};

export const SAMPLE_CLIENT: InvoiceDocClient = {
  companyName: 'Acme Traders Pvt Ltd',
  address: 'BKC, Mumbai, Maharashtra 400051',
  // A real GSTIN with a valid checksum, so the sample would pass the same
  // validation a live client record does.
  gstin: '27AAPFU0939F1ZV',
  stateCode: '27'
};
