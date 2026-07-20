/** Shared formatting helpers used across the app. */

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
const inrRound = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

export function fmtINR(n: number | null | undefined, round = false): string {
  return (round ? inrRound : inr).format(n || 0);
}

/** Abbreviated Indian currency (₹8.4 L, ₹1.5 Cr) for headline metric tiles,
 * where a full grouped figure (₹14,56,79,011) would overflow a narrow card. */
export function fmtINRCompact(n: number | null | undefined): string {
  const v = n || 0;
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  const scaled = (divisor: number) => (abs / divisor).toFixed(1).replace(/\.0$/, '');
  if (abs >= 1_00_00_000) return `${sign}₹${scaled(1_00_00_000)} Cr`;
  if (abs >= 1_00_000) return `${sign}₹${scaled(1_00_000)} L`;
  return fmtINR(v, true);
}

export function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(days: number, from?: string | Date): string {
  const base = from ? new Date(from).getTime() : Date.now();
  return new Date(base + days * 86400000).toISOString().slice(0, 10);
}

export function daysBetween(a: string | Date, b: string | Date = new Date()): number {
  return Math.floor((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

export function initials(name: string): string {
  return (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');
}

const AVATAR_COLORS = [
  { bg: '#eef2ff', color: '#4f46e5' },
  { bg: '#fdf2f8', color: '#9d174d' },
  { bg: '#ecfdf5', color: '#065f46' },
  { bg: '#fff7ed', color: '#9a3412' },
  { bg: '#ede9fe', color: '#5b21b6' },
  { bg: '#dbeafe', color: '#1d4ed8' }
];

export function avatarColor(name: string): { bg: string; color: string } {
  let h = 0;
  for (const c of name || '') h += c.charCodeAt(0);
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

/** Amount in words following the Indian numbering system (lakh, crore). */
export function numberToWords(amount: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve',
    'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const n = Math.floor(Math.abs(amount));
  if (n === 0) return 'Zero Rupees Only';
  const inWords = (num: number): string => {
    if (num === 0) return '';
    if (num < 20) return ones[num] + ' ';
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '') + ' ';
    if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred ' + inWords(num % 100);
    if (num < 100000) return inWords(Math.floor(num / 1000)) + 'Thousand ' + inWords(num % 1000);
    if (num < 10000000) return inWords(Math.floor(num / 100000)) + 'Lakh ' + inWords(num % 100000);
    return inWords(Math.floor(num / 10000000)) + 'Crore ' + inWords(num % 10000000);
  };
  const paise = Math.round((Math.abs(amount) - n) * 100);
  return inWords(n).trim() + ' Rupees' + (paise ? ' and ' + inWords(paise).trim() + ' Paise' : '') + ' Only';
}

/** GST state codes (all Indian states and union territories). */
export const STATES: Array<{ name: string; code: string }> = [
  { name: 'Jammu & Kashmir', code: '01' }, { name: 'Himachal Pradesh', code: '02' },
  { name: 'Punjab', code: '03' }, { name: 'Chandigarh', code: '04' },
  { name: 'Uttarakhand', code: '05' }, { name: 'Haryana', code: '06' },
  { name: 'Delhi', code: '07' }, { name: 'Rajasthan', code: '08' },
  { name: 'Uttar Pradesh', code: '09' }, { name: 'Bihar', code: '10' },
  { name: 'Sikkim', code: '11' }, { name: 'Arunachal Pradesh', code: '12' },
  { name: 'Nagaland', code: '13' }, { name: 'Manipur', code: '14' },
  { name: 'Mizoram', code: '15' }, { name: 'Tripura', code: '16' },
  { name: 'Meghalaya', code: '17' }, { name: 'Assam', code: '18' },
  { name: 'West Bengal', code: '19' }, { name: 'Jharkhand', code: '20' },
  { name: 'Odisha', code: '21' }, { name: 'Chhattisgarh', code: '22' },
  { name: 'Madhya Pradesh', code: '23' }, { name: 'Gujarat', code: '24' },
  { name: 'Daman & Diu', code: '25' }, { name: 'Dadra & Nagar Haveli', code: '26' },
  { name: 'Maharashtra', code: '27' }, { name: 'Andhra Pradesh (old)', code: '28' },
  { name: 'Karnataka', code: '29' }, { name: 'Goa', code: '30' },
  { name: 'Lakshadweep', code: '31' }, { name: 'Kerala', code: '32' },
  { name: 'Tamil Nadu', code: '33' }, { name: 'Puducherry', code: '34' },
  { name: 'Andaman & Nicobar', code: '35' }, { name: 'Telangana', code: '36' },
  { name: 'Andhra Pradesh', code: '37' }, { name: 'Ladakh', code: '38' }
];

export function stateName(code: string): string {
  return STATES.find(s => s.code === code)?.name || code;
}

/** Common units of measurement, shared by the item catalog and bill/invoice line items. */
export const UNITS = ['Nos', 'Kg', 'Gm', 'Ltr', 'Ml', 'Box', 'Pcs', 'Dozen', 'Set', 'Mtr', 'Sqft', 'Hrs', 'Bag', 'Pair'];

const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export function isValidGSTIN(gstin: string): boolean {
  return GSTIN_RE.test((gstin || '').toUpperCase());
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '');
}

export function monthLabel(yyyyMm: string): string {
  const [y, m] = yyyyMm.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short' });
}

/** Triggers a browser download for a blob response (PDF/CSV exports). */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
