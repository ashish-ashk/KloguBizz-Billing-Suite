const PDFDocument = require('pdfkit');
const { resolveTemplate, ITALIC_VARIANTS } = require('./invoiceTemplates');
const { calculateLine } = require('./gstService');

const DARK = '#1e1b4b';
const MUTED = '#6b7280';
const FAINT = '#9ca3af';
const RED = '#dc2626';
const PAPER_TONES = { white: '#ffffff', cream: '#fdfaf3', graypaper: '#f7f7f5' };

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
const fmt = n => inr.format(n || 0);
const fmtDate = d => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

const STATE_NAMES = {
  '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh', '05': 'Uttarakhand',
  '06': 'Haryana', '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh', '10': 'Bihar', '11': 'Sikkim',
  '12': 'Arunachal Pradesh', '13': 'Nagaland', '14': 'Manipur', '15': 'Mizoram', '16': 'Tripura',
  '17': 'Meghalaya', '18': 'Assam', '19': 'West Bengal', '20': 'Jharkhand', '21': 'Odisha', '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh', '24': 'Gujarat', '25': 'Daman & Diu', '26': 'Dadra & Nagar Haveli', '27': 'Maharashtra',
  '28': 'Andhra Pradesh (old)', '29': 'Karnataka', '30': 'Goa', '31': 'Lakshadweep', '32': 'Kerala',
  '33': 'Tamil Nadu', '34': 'Puducherry', '35': 'Andaman & Nicobar', '36': 'Telangana', '37': 'Andhra Pradesh',
  '38': 'Ladakh'
};
const stateName = code => STATE_NAMES[code] || code || '—';

function numberToWords(amount) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve',
    'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const n = Math.floor(Math.abs(amount));
  if (n === 0) return 'Zero Rupees Only';
  const inWords = num => {
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

function logoBuffer(logoUrl) {
  if (!logoUrl || !logoUrl.startsWith('data:image')) return null;
  try {
    const base64 = logoUrl.split(',')[1];
    return base64 ? Buffer.from(base64, 'base64') : null;
  } catch {
    return null;
  }
}

/** Hex (#rgb or #rrggbb) -> "r, g, b" for building rgba() fill strings pdfkit doesn't accept directly (it wants fillOpacity instead). */
function hexToRgbTriplet(hex) {
  const h = (hex || '#4f46e5').replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const n = parseInt(full, 16) || 0x4f46e5;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function drawDivider(doc, style, x1, x2, y, color) {
  if (style === 'none') return;
  if (style === 'double') {
    doc.moveTo(x1, y).lineTo(x2, y).lineWidth(1.5).strokeColor(color).stroke();
    doc.moveTo(x1, y + 3).lineTo(x2, y + 3).lineWidth(0.75).strokeColor(color).stroke();
  } else if (style === 'dotted') {
    doc.save().dash(2, { space: 2 }).moveTo(x1, y).lineTo(x2, y).lineWidth(1).strokeColor(color).stroke().undash().restore();
  } else if (style === 'perforated') {
    for (let x = x1; x <= x2; x += 8) {
      doc.circle(x, y, 1).fill(color);
    }
  } else {
    doc.moveTo(x1, y).lineTo(x2, y).lineWidth(2).strokeColor(color).stroke();
  }
}

/** Renders the header block; returns the y position content should resume at. */
function drawHeader(doc, { template, org, invoice, brand, left, right, width, font, fontBold, logo, titleLabel }) {
  const orgName = org?.name || 'Your Business';
  let y = 46;

  // Tenant-wide override of the title word ("Invoice"/"Tax Invoice") set on
  // the Invoice Templates page; falls back to each archetype's own default.
  const T = def => (titleLabel || def);

  const drawLogoAt = (x, yPos, h) => {
    if (logo) { try { doc.image(logo, x, yPos, { height: h }); } catch { /* corrupt image data, skip */ } }
  };

  if (template.headerStyle === 'minimalPlain') {
    if (logo) drawLogoAt(left, y, 26);
    const textX = logo ? left + 34 : left;
    doc.fillColor(DARK).font(fontBold).fontSize(15).text(orgName, textX, y, { width: width * 0.6 });
    doc.font(font).fontSize(8).fillColor(FAINT);
    const line2 = [org?.address, org?.gstin && `GSTIN: ${org.gstin}`].filter(Boolean).join('  ·  ');
    if (line2) doc.text(line2, textX, y + 18, { width: width * 0.55 });
    doc.fillColor(brand).font(fontBold).fontSize(14).text(T('Invoice'), left, y, { width, align: 'right' });
    doc.fillColor(MUTED).font(font).fontSize(8.5);
    doc.text(invoice.invoiceNumber, left, y + 18, { width, align: 'right' });
    doc.text(`${fmtDate(invoice.date)}  ·  Due ${fmtDate(invoice.dueDate)}`, left, y + 30, { width, align: 'right' });
    return y + 54;
  }

  if (template.headerStyle === 'formalFramed') {
    const boxH = 84;
    doc.rect(left, y, width, boxH).strokeColor(DARK).lineWidth(1).stroke();
    if (logo) drawLogoAt(left + 14, y + 12, 28);
    const textX = logo ? left + 52 : left + 14;
    doc.fillColor(DARK).font(fontBold).fontSize(13).text(orgName.toUpperCase(), textX, y + 14, { width: width * 0.5, characterSpacing: 0.5 });
    doc.font(font).fontSize(8).fillColor(MUTED);
    let iy = y + 32;
    if (org?.address) { doc.text(org.address, textX, iy, { width: width * 0.45 }); iy += 12; }
    if (org?.gstin) doc.text(`GSTIN: ${org.gstin}`, textX, iy, { width: width * 0.45 });
    doc.fillColor(brand).font(fontBold).fontSize(10).text(T('Tax Invoice').toUpperCase(), left, y + 14, { width: width - 14, align: 'right', characterSpacing: 1 });
    doc.fillColor(MUTED).font(font).fontSize(8.5);
    doc.text(`No. ${invoice.invoiceNumber}`, left, y + 32, { width: width - 14, align: 'right' });
    doc.text(`Date: ${fmtDate(invoice.date)}`, left, y + 45, { width: width - 14, align: 'right' });
    doc.fillColor(RED).text(`Due: ${fmtDate(invoice.dueDate)}`, left, y + 58, { width: width - 14, align: 'right' });
    return y + boxH + 16;
  }

  if (template.headerStyle === 'diagonalBold') {
    const blockW = width * 0.42;
    doc.moveTo(right - blockW, 0).lineTo(right, 0).lineTo(right, 110).lineTo(right - blockW * 0.55, 110).closePath().fill(brand);
    doc.fillColor('#fff').font(fontBold).fontSize(26).text(T('Invoice').toUpperCase(), right - blockW + 14, 30, { width: blockW - 28, align: 'right' });
    doc.fontSize(9).text(`Due ${fmtDate(invoice.dueDate)}`, right - blockW + 14, 64, { width: blockW - 28, align: 'right' });
    if (logo) drawLogoAt(left, y, 32);
    const textX = logo ? left + 42 : left;
    doc.fillColor(DARK).font(fontBold).fontSize(19).text(orgName, textX, y + 30, { width: width * 0.45 });
    doc.font(font).fontSize(9).fillColor(MUTED).text(invoice.invoiceNumber, textX, y + 54, { width: width * 0.4 });
    return 132;
  }

  if (template.headerStyle === 'splitCompact') {
    if (logo) drawLogoAt(left, y, 20);
    const textX = logo ? left + 28 : left;
    doc.fillColor(DARK).font(fontBold).fontSize(12).text(orgName, textX, y + 3, { width: width * 0.5 });
    doc.fillColor(brand).font(fontBold).fontSize(9).text(invoice.invoiceNumber, left, y, { width, align: 'right' });
    doc.fillColor(MUTED).font(font).fontSize(8.5).text(`Due ${fmtDate(invoice.dueDate)}`, left, y + 13, { width, align: 'right' });
    return y + 34;
  }

  if (template.headerStyle === 'letterheadLedger') {
    if (template.copyLabel) {
      doc.rect(right - 132, y - 8, 132, 16).strokeColor(FAINT).lineWidth(0.75).stroke();
      doc.fillColor(MUTED).font(font).fontSize(7).text('ORIGINAL FOR RECIPIENT', right - 132, y - 4, { width: 132, align: 'center', characterSpacing: 0.5 });
      y += 16;
    }
    doc.moveTo(left, y).lineTo(right, y).lineWidth(2).strokeColor(DARK).stroke();
    doc.moveTo(left, y + 3).lineTo(right, y + 3).lineWidth(0.75).strokeColor(DARK).stroke();
    let ty = y + 14;
    if (logo) { drawLogoAt(left + width / 2 - 20, ty, 30); ty += 36; }
    doc.fillColor(DARK).font(fontBold).fontSize(15).text(orgName, left, ty, { width, align: 'center' });
    ty += 18;
    if (org?.address) { doc.font(font).fontSize(9).fillColor(MUTED).text(org.address, left, ty, { width, align: 'center' }); ty += 14; }
    doc.font(fontBold).fontSize(9).fillColor(DARK).text(T('Tax Invoice').toUpperCase(), left, ty, { width, align: 'center', characterSpacing: 1 });
    ty += 13;
    doc.font(font).fontSize(9).fillColor(brand).text(`${invoice.invoiceNumber}  ·  Due ${fmtDate(invoice.dueDate)}`, left, ty, { width, align: 'center' });
    ty += 14;
    doc.moveTo(left, ty).lineTo(right, ty).lineWidth(2).strokeColor(DARK).stroke();
    doc.moveTo(left, ty + 3).lineTo(right, ty + 3).lineWidth(0.75).strokeColor(DARK).stroke();
    return ty + 16;
  }

  if (template.headerStyle === 'receiptCentered') {
    if (logo) drawLogoAt(left + width / 2 - 14, y, 28);
    const ty = logo ? y + 34 : y;
    doc.fillColor(DARK).font(fontBold).fontSize(12).text(orgName.toUpperCase(), left, ty, { width, align: 'center', characterSpacing: 0.5 });
    doc.font(font).fontSize(8).fillColor(MUTED);
    let iy = ty + 15;
    if (org?.address) { doc.text(org.address, left, iy, { width, align: 'center' }); iy += 11; }
    doc.font(fontBold).fontSize(9).fillColor(brand).text(T('Tax Invoice').toUpperCase(), left, iy, { width, align: 'center' });
    iy += 12;
    doc.font(font).fontSize(8).fillColor(MUTED).text(`${invoice.invoiceNumber}  ·  ${fmtDate(invoice.date)}`, left, iy, { width, align: 'center' });
    return iy + 18;
  }

  if (template.headerStyle === 'ribbonCard') {
    if (logo) drawLogoAt(left, y, 26);
    const textX = logo ? left + 34 : left;
    doc.fillColor(DARK).font(fontBold).fontSize(15).text(orgName, textX, y + 4, { width: width * 0.55 });
    const flagW = 76, flagH = 20;
    doc.moveTo(right - flagW, y).lineTo(right, y).lineTo(right, y + flagH).lineTo(right - flagW + 10, y + flagH).closePath().fill(brand);
    doc.fillColor('#fff').font(fontBold).fontSize(8.5).text(T('Invoice').toUpperCase(), right - flagW, y + 6, { width: flagW - 8, align: 'center' });
    y += 34;
    const cardY = y, cardH = 40, colW = width / 3;
    doc.rect(left, cardY, width, cardH).fill('#f5f6ff');
    const meta = [['INVOICE NO', invoice.invoiceNumber, DARK], ['DATE', fmtDate(invoice.date), DARK], ['DUE', fmtDate(invoice.dueDate), RED]];
    meta.forEach((m, i) => {
      const mx = left + 14 + i * colW;
      doc.fillColor(FAINT).font(fontBold).fontSize(7).text(m[0], mx, cardY + 9, { width: colW - 20 });
      doc.fillColor(m[2]).font(fontBold).fontSize(9).text(m[1], mx, cardY + 21, { width: colW - 20 });
    });
    return cardY + cardH + 16;
  }

  if (template.headerStyle === 'framedCentered') {
    const boxH = 96;
    doc.roundedRect(left, y, width, boxH, 10).strokeColor(brand).lineWidth(1).stroke();
    let ty = y + 14;
    if (logo) { drawLogoAt(left + width / 2 - 20, ty, 30); ty += 36; }
    doc.fillColor(DARK).font(fontBold).fontSize(15).text(orgName, left, ty, { width, align: 'center' });
    ty += 17;
    if (org?.address) { doc.font(font).fontSize(8.5).fillColor(MUTED).text(org.address, left, ty, { width, align: 'center' }); ty += 13; }
    doc.font(ITALIC_VARIANTS[font] || font).fontSize(13).fillColor(brand).text(T('Invoice'), left, ty, { width, align: 'center' });
    ty += 16;
    doc.font(font).fontSize(8.5).fillColor(DARK).text(`${invoice.invoiceNumber}  ·  Due ${fmtDate(invoice.dueDate)}`, left, ty, { width, align: 'center' });
    return y + boxH + 16;
  }

  if (template.headerStyle === 'sidebarStripe') {
    if (logo) drawLogoAt(left, y, 32);
    const textX = logo ? left + 42 : left;
    doc.fillColor(DARK).font(fontBold).fontSize(17).text(orgName.toUpperCase(), textX, y, { width: width * 0.55, characterSpacing: 0.3 });
    doc.font(font).fontSize(8).fillColor(FAINT);
    const line2 = [org?.address, org?.gstin && `GSTIN: ${org.gstin}`].filter(Boolean).join('  ·  ');
    if (line2) doc.text(line2, textX, y + 20, { width: width * 0.5 });
    doc.fillColor(brand).font(fontBold).fontSize(15).text(T('Invoice').toUpperCase(), left, y, { width, align: 'right' });
    doc.fillColor(MUTED).font(font).fontSize(8.5);
    doc.text(invoice.invoiceNumber, left, y + 20, { width, align: 'right' });
    doc.text(`${fmtDate(invoice.date)}  ·  Due ${fmtDate(invoice.dueDate)}`, left, y + 32, { width, align: 'right' });
    return y + 56;
  }

  if (template.headerStyle === 'bannerBlock') {
    const bandH = 56;
    doc.roundedRect(left, y - 6, width, bandH, 8).fill(brand);
    if (logo) drawLogoAt(left + 14, y + 8, 24);
    const textX = logo ? left + 52 : left + 14;
    doc.fillColor('#fff').font(fontBold).fontSize(15).text(orgName, textX, y + 10);
    doc.font(fontBold).fontSize(13).fillColor('#fff').text(T('Invoice'), left, y + 8, { width: width - 14, align: 'right' });
    doc.font(font).fontSize(8).fillColor('#ffffff').opacity(0.9)
      .text(`${invoice.invoiceNumber}  ·  Due ${fmtDate(invoice.dueDate)}`, left, y + 26, { width: width - 14, align: 'right' });
    doc.opacity(1);
    let iy = y + bandH + 8;
    if (org?.address || org?.gstin) {
      const line2 = [org?.address, org?.gstin && `GSTIN: ${org.gstin}`].filter(Boolean).join('  ·  ');
      doc.fillColor(MUTED).font(font).fontSize(8).text(line2, left, iy, { width });
      iy += 14;
    }
    return iy + 6;
  }

  if (template.headerStyle === 'underlineAccent') {
    if (logo) drawLogoAt(left, y, 26);
    const textX = logo ? left + 34 : left;
    doc.fillColor(DARK).font(fontBold).fontSize(15).text(orgName, textX, y, { width: width * 0.6 });
    doc.font(font).fontSize(8).fillColor(FAINT);
    const line2 = [org?.address, org?.gstin && `GSTIN: ${org.gstin}`].filter(Boolean).join('  ·  ');
    if (line2) doc.text(line2, textX, y + 18, { width: width * 0.55 });
    doc.fillColor(brand).font(fontBold).fontSize(14).text(T('Invoice').toUpperCase(), left, y, { width, align: 'right', characterSpacing: 0.5 });
    doc.fillColor(MUTED).font(font).fontSize(8.5);
    doc.text(invoice.invoiceNumber, left, y + 18, { width, align: 'right' });
    doc.text(`${fmtDate(invoice.date)}  ·  Due ${fmtDate(invoice.dueDate)}`, left, y + 30, { width, align: 'right' });
    const uy = y + 48;
    doc.moveTo(left, uy).lineTo(right, uy).lineWidth(3).strokeColor(brand).stroke();
    return uy + 14;
  }

  if (template.headerStyle === 'watermarkGhost') {
    if (logo) drawLogoAt(left + width / 2 - 14, y, 28);
    const ty = logo ? y + 34 : y;
    doc.fillColor(DARK).font(fontBold).fontSize(13).text(orgName, left, ty, { width, align: 'center' });
    let iy = ty + 16;
    if (org?.address) { doc.font(font).fontSize(8.5).fillColor(MUTED).text(org.address, left, iy, { width, align: 'center' }); iy += 12; }
    doc.font(fontBold).fontSize(9).fillColor(brand).text(T('Tax Invoice').toUpperCase(), left, iy, { width, align: 'center', characterSpacing: 1 });
    iy += 13;
    doc.font(font).fontSize(8.5).fillColor(MUTED).text(`${invoice.invoiceNumber}  ·  Due ${fmtDate(invoice.dueDate)}`, left, iy, { width, align: 'center' });
    return iy + 16;
  }

  if (template.headerStyle === 'mastheadGrid') {
    const boxH = 78, leftW = width * 0.58;
    doc.rect(left, y, width, boxH).strokeColor('#d1d5db').lineWidth(1).stroke();
    doc.moveTo(left + leftW, y).lineTo(left + leftW, y + boxH).strokeColor('#d1d5db').lineWidth(1).stroke();
    if (logo) drawLogoAt(left + 12, y + 10, 24);
    const textX = logo ? left + 46 : left + 12;
    doc.fillColor(DARK).font(fontBold).fontSize(12).text(orgName, textX, y + 12, { width: leftW - 24 });
    doc.font(font).fontSize(8).fillColor(MUTED);
    let iy2 = y + 30;
    if (org?.address) { doc.text(org.address, textX, iy2, { width: leftW - 24 }); iy2 += 12; }
    if (org?.gstin) doc.text(`GSTIN: ${org.gstin}`, textX, iy2, { width: leftW - 24 });
    const rowH = boxH / 3, rx = left + leftW;
    const rows = [[`${T('Invoice')} No`, invoice.invoiceNumber, DARK], ['Date', fmtDate(invoice.date), DARK], ['Due', fmtDate(invoice.dueDate), RED]];
    rows.forEach((r, i) => {
      const ry = y + i * rowH;
      if (i > 0) doc.moveTo(rx, ry).lineTo(right, ry).strokeColor('#d1d5db').lineWidth(0.5).stroke();
      doc.fillColor(FAINT).font(fontBold).fontSize(7).text(r[0].toUpperCase(), rx + 12, ry + 7, { width: width - leftW - 24 });
      doc.fillColor(r[2]).font(fontBold).fontSize(9).text(r[1], rx + 12, ry + 17, { width: width - leftW - 24 });
    });
    return y + boxH + 16;
  }

  if (template.headerStyle === 'badgeCentered') {
    const cx = left + width / 2;
    if (logo) {
      doc.save();
      doc.circle(cx, y + 14, 15).clip();
      try { doc.image(logo, cx - 15, y - 1, { width: 30, height: 30 }); } catch { /* corrupt image data, skip */ }
      doc.restore();
    } else {
      doc.circle(cx, y + 14, 15).fill(brand);
      const ini = (orgName || 'Y').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'Y';
      doc.fillColor('#fff').font(fontBold).fontSize(11).text(ini, cx - 15, y + 8, { width: 30, align: 'center' });
    }
    let iy = y + 36;
    doc.fillColor(DARK).font(fontBold).fontSize(13).text(orgName, left, iy, { width, align: 'center' });
    iy += 16;
    if (org?.address) { doc.font(font).fontSize(8).fillColor(MUTED).text(org.address, left, iy, { width, align: 'center' }); iy += 13; }
    doc.moveTo(cx - 30, iy).lineTo(cx + 30, iy).strokeColor(FAINT).lineWidth(0.75).stroke();
    iy += 10;
    doc.font(fontBold).fontSize(8.5).fillColor(brand).text(T('Invoice'), left, iy, { width, align: 'center' });
    doc.font(font).fontSize(8).fillColor(MUTED).text(`${invoice.invoiceNumber}  ·  Due ${fmtDate(invoice.dueDate)}`, left, iy + 12, { width, align: 'center' });
    return iy + 28;
  }

  if (template.headerStyle === 'twoToneSplit') {
    const blockW = width * 0.42;
    doc.rect(right - blockW, y - 6, blockW, 90).fill(brand);
    doc.fillColor('#fff').font(fontBold).fontSize(17).text(T('Invoice').toUpperCase(), right - blockW + 16, y + 8, { width: blockW - 30, align: 'right' });
    doc.font(font).fontSize(9).text(invoice.invoiceNumber, right - blockW + 16, y + 32, { width: blockW - 30, align: 'right' });
    doc.text(`${fmtDate(invoice.date)}  ·  Due ${fmtDate(invoice.dueDate)}`, right - blockW + 16, y + 46, { width: blockW - 30, align: 'right' });
    if (logo) drawLogoAt(left, y, 30);
    const textX = logo ? left + 40 : left;
    doc.fillColor(DARK).font(fontBold).fontSize(14).text(orgName, textX, y + 8, { width: width - blockW - 30 });
    doc.font(font).fontSize(8).fillColor(MUTED);
    let iy = y + 28;
    if (org?.address) { doc.text(org.address, textX, iy, { width: width - blockW - 30 }); iy += 12; }
    if (org?.gstin) doc.text(`GSTIN: ${org.gstin}`, textX, iy, { width: width - blockW - 30 });
    return y + 96;
  }

  if (template.headerStyle === 'stampSeal') {
    if (logo) drawLogoAt(left, y, 28);
    const textX = logo ? left + 38 : left;
    doc.fillColor(DARK).font(fontBold).fontSize(14).text(orgName, textX, y, { width: width * 0.55 });
    doc.font(font).fontSize(8).fillColor(MUTED);
    let iy = y + 18;
    if (org?.address) { doc.text(org.address, textX, iy, { width: width * 0.5 }); iy += 12; }
    if (org?.gstin) doc.text(`GSTIN: ${org.gstin}`, textX, iy, { width: width * 0.5 });
    const cx = right - 36, cy = y + 32;
    doc.save();
    doc.translate(cx, cy).rotate(-8);
    doc.dash(3, { space: 2 }).circle(0, 0, 32).lineWidth(1.5).strokeColor(brand).stroke().undash();
    doc.fillColor(brand).font(fontBold).fontSize(7).text(T('Invoice').toUpperCase(), -30, -10, { width: 60, align: 'center' });
    doc.fontSize(6).text('VERIFIED', -30, 2, { width: 60, align: 'center' });
    doc.restore();
    doc.fillColor(MUTED).font(font).fontSize(7.5).text(invoice.invoiceNumber, cx - 40, cy + 40, { width: 80, align: 'center' });
    return y + 88;
  }

  if (template.headerStyle === 'spreadsheetGrid') {
    const rowH = 22, colW = width / 2;
    const rows = [
      [orgName, T('Invoice')],
      [[org?.address, org?.gstin && `GSTIN: ${org.gstin}`].filter(Boolean).join('  ·  '), `No. ${invoice.invoiceNumber}`],
      ['', `${fmtDate(invoice.date)}  ·  Due ${fmtDate(invoice.dueDate)}`]
    ];
    rows.forEach((r, i) => {
      const ry = y + i * rowH;
      doc.rect(left, ry, colW, rowH).strokeColor('#d1d5db').lineWidth(0.5).stroke();
      doc.rect(left + colW, ry, width - colW, rowH).strokeColor('#d1d5db').lineWidth(0.5).stroke();
      const boldRow = i === 0;
      doc.fillColor(boldRow ? DARK : MUTED).font(boldRow ? fontBold : font).fontSize(boldRow ? 11 : 8.5)
        .text(r[0], left + 8, ry + (boldRow ? 6 : 7), { width: colW - 16 });
      doc.fillColor(boldRow ? brand : MUTED).font(boldRow ? fontBold : font).fontSize(boldRow ? 11 : 8.5)
        .text(r[1], left + colW + 8, ry + (boldRow ? 6 : 7), { width: width - colW - 16, align: 'right' });
    });
    return y + rows.length * rowH + 12;
  }

  if (template.headerStyle === 'wideLogoBar') {
    let ty = y;
    if (logo) { drawLogoAt(left + width / 2 - 26, ty, 34); ty += 42; }
    doc.fillColor(DARK).font(fontBold).fontSize(17).text(orgName, left, ty, { width, align: 'center' });
    ty += 26;
    doc.moveTo(left, ty).lineTo(right, ty).strokeColor(FAINT).lineWidth(0.75).stroke();
    ty += 12;
    const colW = width / 4;
    const meta = [
      [`${T('Invoice')} No`, invoice.invoiceNumber, DARK],
      ['Order Date', fmtDate(invoice.date), DARK],
      ['Due Date', fmtDate(invoice.dueDate), RED],
      ['Payment', invoice.totals.isIGST ? 'IGST' : 'CGST+SGST', brand]
    ];
    meta.forEach((m, i) => {
      const mx = left + i * colW;
      doc.fillColor(FAINT).font(fontBold).fontSize(7).text(m[0].toUpperCase(), mx, ty, { width: colW - 10 });
      doc.fillColor(m[2]).font(fontBold).fontSize(9).text(m[1], mx, ty + 12, { width: colW - 10 });
    });
    ty += 30;
    doc.moveTo(left, ty).lineTo(right, ty).strokeColor(FAINT).lineWidth(0.75).stroke();
    return ty + 14;
  }

  if (template.headerStyle === 'columnRule') {
    const half = width / 2;
    if (logo) drawLogoAt(left, y, 26);
    const textY = logo ? y + 32 : y;
    doc.fillColor(DARK).font(fontBold).fontSize(14).text(orgName, left, textY, { width: half - 20 });
    doc.font(font).fontSize(8).fillColor(MUTED);
    let iy = textY + 18;
    if (org?.address) { doc.text(org.address, left, iy, { width: half - 20 }); iy += 12; }
    if (org?.gstin) doc.text(`GSTIN: ${org.gstin}`, left, iy, { width: half - 20 });
    doc.moveTo(left + half, y).lineTo(left + half, y + 70).strokeColor('#d1d5db').lineWidth(1).stroke();
    doc.fillColor(brand).font(fontBold).fontSize(13).text(T('Invoice'), left + half + 20, y, { width: half - 20, align: 'right' });
    doc.fillColor(MUTED).font(font).fontSize(8.5);
    doc.text(invoice.invoiceNumber, left + half + 20, y + 18, { width: half - 20, align: 'right' });
    doc.text(fmtDate(invoice.date), left + half + 20, y + 30, { width: half - 20, align: 'right' });
    doc.text(`Due ${fmtDate(invoice.dueDate)}`, left + half + 20, y + 42, { width: half - 20, align: 'right' });
    return y + 78;
  }

  if (template.headerStyle === 'qrCorner') {
    if (logo) drawLogoAt(left, y, 26);
    const textX = logo ? left + 34 : left;
    doc.fillColor(DARK).font(fontBold).fontSize(15).text(orgName, textX, y, { width: width * 0.5 });
    doc.font(font).fontSize(8).fillColor(FAINT);
    const line2 = [org?.address, org?.gstin && `GSTIN: ${org.gstin}`].filter(Boolean).join('  ·  ');
    if (line2) doc.text(line2, textX, y + 18, { width: width * 0.45 });
    const qrSize = 36, qrX = right - qrSize, qrY = y;
    doc.rect(qrX, qrY, qrSize, qrSize).strokeColor(brand).lineWidth(1).stroke();
    const cell = qrSize / 6;
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        if ((r * 6 + c) * 7919 % 13 < 6) doc.rect(qrX + c * cell + 1, qrY + r * cell + 1, cell - 2, cell - 2).fill(DARK);
      }
    }
    doc.fillColor(brand).font(fontBold).fontSize(13).text(T('Tax Invoice'), left, y, { width: width - qrSize - 14, align: 'right' });
    doc.fillColor(MUTED).font(font).fontSize(8.5);
    doc.text(invoice.invoiceNumber, left, y + 18, { width: width - qrSize - 14, align: 'right' });
    doc.text(`Due ${fmtDate(invoice.dueDate)}`, left, y + 30, { width: width - qrSize - 14, align: 'right' });
    return y + qrSize + 14;
  }

  if (template.headerStyle === 'carbonBillBook') {
    doc.fillColor(DARK).font(fontBold).fontSize(14).text(orgName, left, y, { width: width * 0.6 });
    if (org?.address) doc.font(font).fontSize(8).fillColor(MUTED).text(org.address, left, y + 16, { width: width * 0.55 });
    const boxW = 110, boxX = right - boxW;
    doc.roundedRect(boxX, y - 4, boxW, 36, 4).strokeColor(brand).lineWidth(1.25).stroke();
    doc.fillColor(FAINT).font(fontBold).fontSize(7).text('BILL NO.', boxX, y + 2, { width: boxW, align: 'center' });
    doc.fillColor(brand).font(fontBold).fontSize(12).text(invoice.invoiceNumber, boxX, y + 12, { width: boxW, align: 'center' });
    const iy = y + 40;
    doc.fillColor(MUTED).font(font).fontSize(8).text(`Date: ${fmtDate(invoice.date)}    Due: ${fmtDate(invoice.dueDate)}`, left, iy, { width });
    return iy + 16;
  }

  if (template.headerStyle === 'fintechPills') {
    if (logo) drawLogoAt(left, y, 26);
    const textX = logo ? left + 34 : left;
    doc.fillColor(DARK).font(fontBold).fontSize(16).text(orgName, textX, y + 4, { width: width * 0.6 });
    const [pr, pg, pb] = hexToRgbTriplet(brand);
    const pillY = y + 30, pillH = 20;
    const pills = [
      [`${T('Invoice')} ${invoice.invoiceNumber}`, brand, `rgba(${pr}, ${pg}, ${pb}, 0.12)`],
      [fmtDate(invoice.date), MUTED, '#f3f4f6'],
      [`Due ${fmtDate(invoice.dueDate)}`, RED, '#f3f4f6']
    ];
    let px = left;
    doc.font(fontBold).fontSize(8.5);
    pills.forEach(p => {
      const pw = doc.widthOfString(p[0]) + 24;
      doc.roundedRect(px, pillY, pw, pillH, pillH / 2).fill(p[2]);
      doc.fillColor(p[1]).text(p[0], px + 12, pillY + 6, { width: pw - 24 });
      px += pw + 8;
    });
    return pillY + pillH + 14;
  }

  // Fallback — should not normally be reached since resolveTemplate always
  // yields one of the 15 headerStyle values above, kept only as a safety net.
  if (logo) drawLogoAt(left, y, 32);
  const textX = logo ? left + 42 : left;
  doc.fillColor(DARK).font(fontBold).fontSize(18).text(orgName, textX, y, { width: width * 0.55 });
  doc.fillColor(brand).font(fontBold).fontSize(20).text(T('Tax Invoice').toUpperCase(), left, y, { width, align: 'right' });
  doc.fillColor(DARK).font(font).fontSize(11).text(invoice.invoiceNumber, left, y + 26, { width, align: 'right' });
  doc.fillColor(RED).fontSize(9).text(`Due: ${fmtDate(invoice.dueDate)}`, left, y + 54, { width, align: 'right' });
  return y + 78;
}

/**
 * @param platformDefaults  the super admin's platform-wide defaults
 *                          ({ templateId }), applied when a tenant has never
 *                          picked a template of their own.
 */
function renderInvoicePdf({ invoice, client, org, platformDefaults }) {
  return new Promise((resolve, reject) => {
    const template = resolveTemplate(org?.brandingConfig, platformDefaults?.templateId);
    const content = org?.brandingConfig?.invoiceContent || {};
    const showLogo = content.showLogo !== false;
    const showSignature = content.showSignature !== false;
    const showBankDetails = content.showBankDetails !== false;
    const showAmountInWords = content.showAmountInWords !== false;
    const logo = showLogo ? logoBuffer(org?.brandingConfig?.logoUrl) : null;
    const font = template.font, fontBold = template.fontBold;
    const marginX = template.narrow ? 85 : 50;

    const doc = new PDFDocument({ size: 'A4', margin: marginX, bufferPages: true });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    /**
     * The page box, derived rather than guessed.
     *
     * Pagination used to be driven by bare magic numbers — `if (y > 700)` to break
     * a page, `y = 50` to restart, `const footY = 760` for the footer — none of
     * which referred to the actual page geometry. They happened to be about right
     * for A4 with a 50pt margin and silently wrong for anything else: the
     * `narrow` receipt templates use an 85pt margin, so their content ran closer
     * to the edge than intended, and any future page size would have broken every
     * threshold at once.
     *
     * Everything below is computed from `doc.page`, so the layout follows the
     * page rather than a set of constants that have to be kept in step with it.
     */
    const pageTop = doc.page.margins.top;
    const pageBottom = doc.page.height - doc.page.margins.bottom;
    // Room reserved at the foot of every page for the footer strip and the page
    // number that now sits there.
    const FOOTER_RESERVE = 42;
    // The lowest y a row may start at and still fit above the footer.
    const contentBottom = pageBottom - FOOTER_RESERVE;
    // The totals panel and signature block are tall; starting them too near the
    // bottom is what the old `y > 640` was groping at.
    const SUMMARY_BLOCK_HEIGHT = 170;

    const brand = org?.brandingConfig?.primaryColor || '#4f46e5';
    const titleLabel = org?.brandingConfig?.invoiceTitleLabel || '';
    const [br, bg, bb] = hexToRgbTriplet(brand);
    const pageBg = PAPER_TONES[template.paperTone] || '#ffffff';
    if (pageBg !== '#ffffff') doc.rect(0, 0, doc.page.width, doc.page.height).fill(pageBg);

    // Agency Spine: a full-height color bar down the left edge, drawn first
    // (page background layer) so it never sits over header/body text, which
    // all starts at doc.page.margins.left, well clear of this narrow strip.
    if (template.headerStyle === 'sidebarStripe') {
      doc.rect(0, 0, 10, doc.page.height).fill(brand);
    }
    // Statutory Watermark: a large faint rotated wordmark drawn before any
    // content, so the header/table/totals painted afterwards sit on top of it.
    // The text box is measured and centered exactly on the page center before
    // rotating around that same point, and lineBreak is disabled — sizing the
    // box any other way risks pdfkit wrapping/clipping the rotated text against
    // the page edge.
    if (template.headerStyle === 'watermarkGhost') {
      const word = (titleLabel || 'Invoice').toUpperCase();
      doc.save();
      doc.font(fontBold).fontSize(80);
      const tw = doc.widthOfString(word);
      const th = doc.currentLineHeight();
      const cx = doc.page.width / 2, cy = doc.page.height / 2;
      doc.rotate(-30, { origin: [cx, cy] });
      doc.fillColor('#94a3b8').opacity(0.14)
        .text(word, cx - tw / 2, cy - th / 2, { lineBreak: false });
      doc.opacity(1);
      doc.restore();
    }

    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const width = right - left;

    // A tenant-uploaded letterhead/banner image (Invoice Templates page)
    // replaces the coded header entirely, same as the on-screen preview —
    // it's expected to already carry the company's own branding, so drawing
    // the templated header (with its own logo placement) alongside it would
    // just duplicate that. Falls back to the normal drawHeader() on any
    // decode/dimension failure (corrupt data, zero-size image, etc.).
    let y;
    const headerImage = logoBuffer(org?.brandingConfig?.headerImageUrl);
    if (headerImage) {
      try {
        const img = doc.openImage(headerImage);
        // Fit within (width x maxH) preserving aspect ratio — a naive
        // width-only scale blows up a mistakenly-square/tall image (e.g. a
        // logo uploaded here instead of a wide banner) into a page-filling
        // block, since height would just follow width * aspect ratio unchecked.
        const maxH = 130;
        let drawW = width, drawH = width * (img.height / img.width);
        if (drawH > maxH) { drawW = maxH * (img.width / img.height); drawH = maxH; }
        const imgX = left + (width - drawW) / 2;
        doc.image(headerImage, imgX, 40, { width: drawW, height: drawH });
        y = 40 + drawH + 14;
      } catch {
        y = drawHeader(doc, { template, org, invoice, brand, left, right, width, font, fontBold, logo, titleLabel });
      }
    } else {
      y = drawHeader(doc, { template, org, invoice, brand, left, right, width, font, fontBold, logo, titleLabel });
    }
    drawDivider(doc, template.dividerStyle, left, right, y, brand);
    y += 14;

    // Bill to / supply details
    const panelBg = template.paperTone === 'cream' ? '#f6efe0' : '#f5f6ff';
    const boxed = template.tableStyle === 'boxed';
    if (template.infoCard) {
      const cardW = width / 2 - 8, cardH = 78;
      doc.roundedRect(left, y, cardW, cardH, 8).fill(panelBg);
      doc.roundedRect(left + cardW + 16, y, cardW, cardH, 8).fill(panelBg);
    } else if (boxed) {
      doc.rect(left, y, width, 78).strokeColor(brand).lineWidth(1).stroke();
    } else {
      doc.rect(left, y, width, 78).fill(panelBg);
    }
    const billPadX = template.infoCard ? 14 : 14;
    doc.fillColor(FAINT).font(fontBold).fontSize(8).text('BILL TO', left + billPadX, y + 12);
    doc.fillColor(DARK).font(fontBold).fontSize(11).text(client?.companyName || '—', left + billPadX, y + 25, { width: width / 2 - 20 });
    doc.fillColor(MUTED).font(font).fontSize(9);
    let cy = y + 40;
    if (client?.address) { doc.text(client.address, left + billPadX, cy, { width: width / 2 - 30 }); cy += 22; }
    doc.text(`GSTIN: ${client?.gstin || '—'}  ·  ${stateName(client?.stateCode)} (${client?.stateCode || '—'})`, left + billPadX, cy, { width: width / 2 - 20 });

    const supplyX = left + width / 2 + (template.infoCard ? 26 : 10);
    doc.fillColor(FAINT).font(fontBold).fontSize(8).text('SUPPLY DETAILS', supplyX, y + 12, { width: width / 2 - 24, align: 'right' });
    doc.fillColor(DARK).font(fontBold).fontSize(9)
      .text(invoice.totals.isIGST ? 'IGST (Inter-state)' : 'CGST + SGST (Intra-state)', supplyX, y + 25, { width: width / 2 - 24, align: 'right' });
    doc.fillColor(MUTED).font(font).fontSize(9);
    doc.text(`Place of supply: ${stateName(client?.stateCode)}`, supplyX, y + 40, { width: width / 2 - 24, align: 'right' });
    doc.text(`Terms: ${invoice.paymentTerms || 'Net 15'}`, supplyX, y + 54, { width: width / 2 - 24, align: 'right' });
    y += 94;

    if (template.narrow && template.compact) {
      // Receipt-style stacked rows: an 8-column table can't fit legibly in a
      // narrow receipt column, so each item gets a description line plus one
      // compact qty/rate/HSN/GST/total summary line underneath.
      doc.save().dash(1, { space: 2 }).moveTo(left, y).lineTo(right, y).lineWidth(1).strokeColor(FAINT).stroke().undash().restore();
      y += 8;
      doc.font(font).fontSize(8.5);
      invoice.items.forEach(item => {
        if (y + 30 > contentBottom) { doc.addPage(); y = pageTop; }
        // Same shared pricing as the table layout below.
        const line = calculateLine(item, invoice.discountPercent);
        const parts = [
          `${line.qty} × ${fmt(line.rate)}`,
          `HSN ${item.hsn || '—'}`,
          `GST ${line.gstRate}%${line.cessRate > 0 ? ` + cess ${line.cessRate}%` : ''}`
        ];
        if (line.discountPercent > 0) parts.push(`less ${line.discountPercent}%`);
        doc.fillColor(DARK).font(fontBold).fontSize(9).text(item.desc || '', left, y, { width });
        y += 12;
        doc.fillColor(MUTED).font(font).fontSize(8)
          .text(parts.join('  ·  '), left, y, { width: width - 70 });
        doc.fillColor(DARK).font(fontBold).fontSize(8.5).text(fmt(line.total), right - 70, y, { width: 70, align: 'right' });
        y += 18;
      });
      doc.save().dash(1, { space: 2 }).moveTo(left, y).lineTo(right, y).lineWidth(1).strokeColor(FAINT).stroke().undash().restore();
      y += 16;
    } else {
      // Line items table
      const cols = template.compact
        ? [{ label: '#', w: 20 }, { label: 'Description', w: 140 }, { label: 'HSN', w: 45 }, { label: 'Qty', w: 30 }, { label: 'Rate', w: 60 }, { label: 'GST%', w: 32 }, { label: 'Tax', w: 55 }, { label: 'Total', w: 61 }]
        : [{ label: '#', w: 25 }, { label: 'Description', w: 155 }, { label: 'HSN/SAC', w: 55 }, { label: 'Qty', w: 30 }, { label: 'Rate', w: 65 }, { label: 'GST%', w: 35 }, { label: 'Tax', w: 65 }, { label: 'Total', w: 65 }];
      let cx = left;
      cols.forEach(c => { c.x = cx; cx += c.w; });
      const rowH = template.compact ? 17 : 20;
      const fontSize = template.compact ? 8 : 9;

      const drawTableHeader = () => {
        if (template.tableStyle === 'minimal') {
          doc.font(fontBold).fontSize(8).fillColor(MUTED);
          cols.forEach((c, i) => doc.text(c.label, c.x + 4, y, { width: c.w - 8, align: i >= 3 ? 'right' : 'left' }));
          doc.moveTo(left, y + 14).lineTo(right, y + 14).strokeColor(FAINT).lineWidth(1).stroke();
          y += 20;
        } else {
          doc.rect(left, y, width, 20).fill(template.tableStyle === 'boxed' ? brand : DARK);
          doc.fillColor(template.accentTint ? brand : '#fff').font(fontBold).fontSize(8);
          cols.forEach((c, i) => doc.text(c.label, c.x + 5, y + 6, { width: c.w - 8, align: i >= 3 ? 'right' : 'left' }));
          if (template.tableStyle === 'ledger') {
            cols.forEach(c => doc.moveTo(c.x, y).lineTo(c.x, y + 20).strokeColor(FAINT).lineWidth(0.5).stroke());
            doc.moveTo(right, y).lineTo(right, y + 20).strokeColor(FAINT).lineWidth(0.5).stroke();
          }
          y += 20;
        }
      };
      drawTableHeader();

      doc.font(font).fontSize(fontSize);
      invoice.items.forEach((item, i) => {
        // A row must fit whole; `rowH` is part of the test so the last row on a
        // page is never clipped by the footer.
        if (y + rowH > contentBottom) {
          doc.addPage();
          y = pageTop;
          // The header is redrawn on the continuation page — a table of figures
          // with no column labels is unreadable.
          drawTableHeader();
          doc.font(font).fontSize(fontSize);
        }
        if (template.tableStyle === 'zebra' && i % 2 === 1) {
          if (template.accentTint) { doc.fillOpacity(0.06).rect(left, y, width, rowH).fill(`rgb(${br}, ${bg}, ${bb})`).fillOpacity(1); }
          else doc.rect(left, y, width, rowH).fill('#fafbff');
        }
        if (template.tableStyle === 'bordered' || template.tableStyle === 'boxed' || template.tableStyle === 'ledger') doc.rect(left, y, width, rowH).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
        if (template.tableStyle === 'ledger') {
          cols.forEach(c => doc.moveTo(c.x, y).lineTo(c.x, y + rowH).strokeColor('#e5e7eb').lineWidth(0.5).stroke());
          doc.moveTo(right, y).lineTo(right, y + rowH).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
        }
        // Priced by the shared engine, so the printed line agrees with the
        // stored totals — discounts, cess and tax-inclusive rates included.
        // This used to be a local `qty * rate`, which silently ignored all three.
        const line = calculateLine(item, invoice.discountPercent);
        const gstLabel = line.cessRate > 0 ? `${line.gstRate}%+${line.cessRate}%` : `${line.gstRate}%`;
        // A discounted line shows the discount inline, since there is no
        // dedicated column for it and the customer is entitled to see it.
        const rateLabel = line.discountPercent > 0
          ? `${fmt(line.rate)} −${line.discountPercent}%`
          : fmt(line.rate);
        const values = [
          String(i + 1), item.desc || '', item.hsn || '—', String(line.qty),
          rateLabel, gstLabel, fmt(line.tax + line.cess), fmt(line.total)
        ];
        cols.forEach((c, idx) => {
          doc.fillColor(idx === 1 ? DARK : MUTED).font(idx === 1 ? fontBold : font)
            .text(values[idx], c.x + 5, y + (template.compact ? 4 : 5), { width: c.w - 8, align: idx >= 3 ? 'right' : 'left' });
        });
        y += rowH;
      });
      if (template.tableStyle !== 'minimal') doc.moveTo(left, y).lineTo(right, y).strokeColor('#e0e7ff').lineWidth(1).stroke();
      y += 16;
    }
    // Keep the totals panel, amount-in-words strip and signature together: they
    // read as one block, and splitting them across a page break looks like an
    // error on a document someone is being asked to pay.
    if (y + SUMMARY_BLOCK_HEIGHT > contentBottom) { doc.addPage(); y = pageTop; }

    // Notes / bank details (left) + totals summary (right)
    const summaryTop = y;
    let leftY = summaryTop;
    if (invoice.notes) {
      doc.fillColor(FAINT).font(fontBold).fontSize(8).text('NOTES', left, leftY);
      leftY += 12;
      doc.fillColor(MUTED).font(font).fontSize(9).text(invoice.notes, left, leftY, { width: width / 2 - 20 });
      leftY += 34;
    }
    if (showBankDetails && (invoice.bankDetails?.bank || invoice.bankDetails?.account)) {
      doc.rect(left, leftY, width / 2 - 20, 66).fill(panelBg);
      doc.fillColor(FAINT).font(fontBold).fontSize(8).text('BANK DETAILS', left + 12, leftY + 10);
      doc.fillColor('#334155').font(font).fontSize(9);
      let by = leftY + 24;
      if (invoice.bankDetails?.bank) { doc.text(`Bank: ${invoice.bankDetails.bank}`, left + 12, by); by += 13; }
      if (invoice.bankDetails?.account) { doc.text(`A/c: ${invoice.bankDetails.account}`, left + 12, by); by += 13; }
      if (invoice.bankDetails?.ifsc) doc.text(`IFSC: ${invoice.bankDetails.ifsc}`, left + 12, by);
    }

    const sx = left + width / 2 + 10;
    const sw = width / 2 - 10;
    const t = invoice.totals || {};

    // Rows are assembled first so the panel can be sized to fit. It used to be
    // a hardcoded 108pt box holding a fixed three or four rows, which cannot
    // accommodate discount, cess, round-off and settlement lines — they only
    // appear when they carry a value, so a plain invoice looks exactly as it
    // did before.
    const rows = [];
    const hasDiscount = Number(t.discountTotal) > 0;
    if (hasDiscount) {
      rows.push({ label: 'Gross Amount', value: fmt(t.grossSubtotal ?? t.subtotal) });
      rows.push({ label: 'Discount', value: `−${fmt(t.discountTotal)}` });
    }
    rows.push({ label: hasDiscount ? 'Taxable Value' : 'Subtotal', value: fmt(t.subtotal) });
    if (t.isIGST) {
      rows.push({ label: 'IGST', value: fmt(t.igst) });
    } else {
      rows.push({ label: 'CGST', value: fmt(t.cgst) });
      // UTGST in the Union Territories that levy it; the amount is the same field.
      rows.push({ label: t.isUT ? 'UTGST' : 'SGST', value: fmt(t.sgst) });
    }
    if (Number(t.cess) > 0) rows.push({ label: 'Cess', value: fmt(t.cess) });
    if (Number(t.roundOff)) {
      const off = Number(t.roundOff);
      rows.push({ label: 'Round Off', value: `${off > 0 ? '+' : '−'}${fmt(Math.abs(off))}` });
    }

    // Settlement, shown only once something has been received, so the customer
    // can see what is still owed on a part-paid invoice.
    const amountPaid = Number(invoice.amountPaid) || 0;
    const settlementRows = amountPaid > 0
      ? [
        { label: 'Amount Paid', value: fmt(amountPaid) },
        { label: 'Balance Due', value: fmt(Number(invoice.balanceDue) || 0), strong: true }
      ]
      : [];

    const ROW_H = 18;
    const panelH = 14 + rows.length * ROW_H + 18 + 22 + settlementRows.length * ROW_H;
    doc.rect(sx, summaryTop, sw, panelH).fill(panelBg);

    let ry = summaryTop + 14;
    rows.forEach(row => {
      doc.fillColor(MUTED).font(font).fontSize(10).text(row.label, sx + 14, ry, { width: 110 });
      doc.fillColor(DARK).font(fontBold).fontSize(10).text(row.value, sx + 14, ry, { width: sw - 28, align: 'right' });
      ry += ROW_H;
    });

    doc.moveTo(sx + 14, ry + 4).lineTo(sx + sw - 14, ry + 4).strokeColor(brand).lineWidth(1.5).stroke();
    ry += 14;
    doc.fillColor(DARK).font(fontBold).fontSize(11).text('Total', sx + 14, ry, { width: 110 });
    doc.fillColor(brand).fontSize(13).text(fmt(t.total), sx + 14, ry - 1, { width: sw - 28, align: 'right' });
    ry += 22;

    settlementRows.forEach(row => {
      doc.fillColor(row.strong ? DARK : MUTED).font(row.strong ? fontBold : font).fontSize(10)
        .text(row.label, sx + 14, ry, { width: 110 });
      doc.fillColor(row.strong ? brand : DARK).font(fontBold).fontSize(10)
        .text(row.value, sx + 14, ry, { width: sw - 28, align: 'right' });
      ry += ROW_H;
    });

    if (showAmountInWords) {
      // Positioned below the panel's real height rather than a fixed offset,
      // so it can't overlap once extra rows are present.
      const wordsY = summaryTop + panelH + 10;
      doc.rect(sx, wordsY, sw, 40).fill('#eef2ff');
      doc.fillColor(brand).font(font).fontSize(8).text(`Amount in words: ${numberToWords(t.total)}`, sx + 10, wordsY + 8, { width: sw - 20 });
    }

    /**
     * Footer, positioned from the page box rather than a fixed 760.
     *
     * The offset has to clear the *whole* signature block, not just its first
     * line: the block writes at `footY`, `footY + 4` and `footY + 16`. pdfkit
     * silently inserts a new page whenever `text()` would cross the bottom margin,
     * so placing this even ten points lower turns every invoice into a two-page
     * invoice with a blank second page.
     */
    const FOOTER_BLOCK_HEIGHT = 32;
    const footY = pageBottom - FOOTER_BLOCK_HEIGHT;
    doc.fillColor(FAINT).font(font).fontSize(8).text('This is a computer generated invoice.', left, footY, { width: 250 });
    if (showSignature) {
      doc.moveTo(right - 145, footY).lineTo(right, footY).strokeColor(brand).lineWidth(1).stroke();
      const sigLabel = (template.id === 'corporate-formal' || template.id === 'gst-ledger-register') ? `For ${org?.name || ''}` : 'Authorised Signatory';
      doc.fillColor(brand).fontSize(8).text(sigLabel, right - 145, footY + 4, { width: 145, align: 'center' });
      doc.fillColor(DARK).font(fontBold).text(
        (template.id === 'corporate-formal' || template.id === 'gst-ledger-register') ? 'Authorised Signatory' : (org?.name || ''),
        right - 145, footY + 16, { width: 145, align: 'center' }
      );
    }

    /**
     * "Page N of M" and a continued marker on every page.
     *
     * Written last and in a second pass, because the total page count is not known
     * until the content has been laid out — which is what `bufferPages: true` on
     * the document is for. A multi-page invoice previously gave the recipient no
     * way to tell whether they were holding all of it.
     */
    const range = doc.bufferedPageRange();
    if (range.count > 1) {
      const stampY = pageBottom - 6;
      for (let i = 0; i < range.count; i += 1) {
        doc.switchToPage(range.start + i);

        /**
         * The margin is lifted for these writes.
         *
         * `text()` auto-inserts a page whenever the line would cross
         * `page.maxY()` (= height − bottom margin), and a page stamp belongs *in*
         * the bottom margin by definition. Left alone, each stamp would append a
         * blank page — and because the loop is over a range captured before the
         * writes, the blank pages then go unstamped while the count printed on
         * every page is already wrong.
         */
        const bottomMargin = doc.page.margins.bottom;
        doc.page.margins.bottom = 0;

        doc.fillColor(FAINT).font(font).fontSize(7.5)
          .text(`Page ${i + 1} of ${range.count}`, left, stampY, { width, align: 'center', lineBreak: false });
        // Every page but the last says so, so a missing page is obvious.
        if (i < range.count - 1) {
          doc.fillColor(FAINT).font(font).fontSize(7.5)
            .text('continued overleaf', left, stampY, { width, align: 'right', lineBreak: false });
        }
        // The invoice number repeats on continuation pages, so a detached sheet
        // can still be identified.
        if (i > 0) {
          doc.fillColor(FAINT).font(font).fontSize(7.5)
            .text(invoice.invoiceNumber || '', left, stampY, { width, align: 'left', lineBreak: false });
        }

        doc.page.margins.bottom = bottomMargin;
      }
      // Finish positioned on the last page rather than wherever the loop left off.
      doc.switchToPage(range.start + range.count - 1);
    }

    doc.end();
  });
}

module.exports = { renderInvoicePdf };
