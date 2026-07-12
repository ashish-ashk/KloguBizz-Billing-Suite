const PDFDocument = require('pdfkit');
const { resolveTemplate } = require('./invoiceTemplates');

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

function drawDivider(doc, style, x1, x2, y, color) {
  if (style === 'none') return;
  if (style === 'double') {
    doc.moveTo(x1, y).lineTo(x2, y).lineWidth(1.5).strokeColor(color).stroke();
    doc.moveTo(x1, y + 3).lineTo(x2, y + 3).lineWidth(0.75).strokeColor(color).stroke();
  } else if (style === 'dotted') {
    doc.save().dash(2, { space: 2 }).moveTo(x1, y).lineTo(x2, y).lineWidth(1).strokeColor(color).stroke().undash().restore();
  } else {
    doc.moveTo(x1, y).lineTo(x2, y).lineWidth(2).strokeColor(color).stroke();
  }
}

/** Renders the header block; returns the y position content should resume at. */
function drawHeader(doc, { template, org, invoice, brand, left, right, width, font, fontBold, logo }) {
  const orgName = org?.name || 'Your Business';
  const align = template.titleAlign;
  let y = 46;

  const drawLogoAt = (x, yPos, h) => {
    if (logo) { try { doc.image(logo, x, yPos, { height: h }); } catch { /* corrupt image data, skip */ } }
  };

  if (template.headerStyle === 'band' || template.headerStyle === 'bandLarge') {
    const bandH = template.headerStyle === 'bandLarge' ? 100 : 78;
    doc.rect(0, 0, doc.page.width, bandH).fill(brand);
    if (logo) drawLogoAt(left, 18, bandH - 36);
    const textX = logo ? left + bandH - 20 : left;
    doc.fillColor('#fff').font(fontBold).fontSize(template.headerStyle === 'bandLarge' ? 15 : 13).text(orgName, textX, 22, { width: width - (textX - left) });
    doc.font(font).fontSize(9).fillColor('rgba(255,255,255,0.85)');
    if (org?.address) doc.text(org.address, textX, 40, { width: width - (textX - left) });
    doc.font(fontBold).fontSize(template.headerStyle === 'bandLarge' ? 24 : 18).fillColor('#fff')
      .text('TAX INVOICE', left, bandH - 30, { width, align: align === 'left' ? 'left' : align });
    y = bandH + 24;
    doc.fillColor(DARK).font(font).fontSize(9);
    doc.text(`Invoice #: ${invoice.invoiceNumber}`, left, y, { width, align: 'right' });
    doc.fillColor(RED).text(`Due: ${fmtDate(invoice.dueDate)}`, left, y + 12, { width, align: 'right' });
    return y + 34;
  }

  if (template.headerStyle === 'sidebar') {
    doc.rect(0, 0, 14, doc.page.height).fill(brand);
    if (logo) drawLogoAt(left, y, 30);
    const textX = logo ? left + 40 : left;
    doc.fillColor(DARK).font(fontBold).fontSize(17).text(orgName, textX, y, { width });
    doc.font(font).fontSize(9).fillColor(MUTED);
    if (org?.address) doc.text(org.address, textX, y + 20, { width: width * 0.6 });
    doc.font(fontBold).fontSize(20).fillColor(brand).text('INVOICE', left, y, { width, align: 'right' });
    doc.font(font).fontSize(9).fillColor(DARK).text(invoice.invoiceNumber, left, y + 22, { width, align: 'right' });
    doc.fillColor(RED).text(`Due: ${fmtDate(invoice.dueDate)}`, left, y + 34, { width, align: 'right' });
    return y + 60;
  }

  if (template.headerStyle === 'gradient') {
    doc.rect(0, 0, doc.page.width, 82).fill(brand);
    doc.opacity(0.28).rect(doc.page.width * 0.35, 0, doc.page.width * 0.65, 82).fill('#000000').opacity(1);
    if (logo) drawLogoAt(left, 14, 34);
    doc.fillColor('#fff').font(fontBold).fontSize(20).text('TAX INVOICE', left, 18, { width, align: 'center' });
    doc.font(font).fontSize(10).text(`${orgName}  ·  ${invoice.invoiceNumber}`, left, 46, { width, align: 'center' });
    doc.font(font).fontSize(9).text(`Due ${fmtDate(invoice.dueDate)}`, left, 62, { width, align: 'center' });
    return 104;
  }

  if (template.headerStyle === 'diagonal') {
    doc.moveTo(doc.page.width * 0.55, 0).lineTo(doc.page.width, 0).lineTo(doc.page.width, 120).lineTo(doc.page.width * 0.68, 120).closePath().fill(brand);
    if (logo) drawLogoAt(left, y, 30);
    const textX = logo ? left + 40 : left;
    doc.fillColor(DARK).font(fontBold).fontSize(16).text(orgName, textX, y, { width: width * 0.5 });
    doc.font(font).fontSize(9).fillColor(MUTED);
    if (org?.address) doc.text(org.address, textX, y + 20, { width: width * 0.45 });
    doc.fillColor('#fff').font(fontBold).fontSize(16).text('INVOICE', doc.page.width * 0.7, 20, { width: doc.page.width * 0.25, align: align });
    doc.font(font).fontSize(9).text(invoice.invoiceNumber, doc.page.width * 0.7, 42, { width: doc.page.width * 0.25, align });
    doc.fillColor('rgba(255,255,255,0.9)').text(`Due ${fmtDate(invoice.dueDate)}`, doc.page.width * 0.7, 56, { width: doc.page.width * 0.25, align });
    return 130;
  }

  if (template.headerStyle === 'split' || template.headerStyle === 'boxed') {
    const boxed = template.headerStyle === 'boxed';
    const colW = width / 2 - 8;
    if (boxed) { doc.rect(left, y, colW, 76).strokeColor(brand).lineWidth(1).stroke(); doc.rect(left + colW + 16, y, colW, 76).strokeColor(brand).lineWidth(1).stroke(); }
    if (logo) drawLogoAt(left + 8, y + 8, 24);
    const textX = logo ? left + 38 : left + 8;
    doc.fillColor(DARK).font(fontBold).fontSize(13).text(orgName, textX, y + 8, { width: colW - (textX - left) });
    doc.font(font).fontSize(8.5).fillColor(MUTED);
    let iy = y + 24;
    if (org?.address) { doc.text(org.address, textX, iy, { width: colW - 16 }); iy += 22; }
    if (org?.gstin) doc.text(`GSTIN: ${org.gstin}`, textX, iy, { width: colW - 16 });
    const rx = left + colW + 24;
    doc.fillColor(brand).font(fontBold).fontSize(15).text('TAX INVOICE', rx, y + 8, { width: colW - 16, align: 'right' });
    doc.fillColor(DARK).font(font).fontSize(9).text(invoice.invoiceNumber, rx, y + 30, { width: colW - 16, align: 'right' });
    doc.fillColor(MUTED).text(`Date: ${fmtDate(invoice.date)}`, rx, y + 44, { width: colW - 16, align: 'right' });
    doc.fillColor(RED).text(`Due: ${fmtDate(invoice.dueDate)}`, rx, y + 58, { width: colW - 16, align: 'right' });
    return y + 92;
  }

  if (template.headerStyle === 'centered') {
    if (logo) drawLogoAt(left + width / 2 - 20, y, 34);
    const ty = logo ? y + 40 : y;
    doc.fillColor(DARK).font(fontBold).fontSize(16).text(orgName, left, ty, { width, align: 'center' });
    doc.font(font).fontSize(9).fillColor(MUTED);
    if (org?.address) doc.text(org.address, left, ty + 18, { width, align: 'center' });
    doc.font(fontBold).fontSize(18).fillColor(brand).text('TAX INVOICE', left, ty + 34, { width, align: 'center' });
    doc.font(font).fontSize(9).fillColor(DARK).text(`${invoice.invoiceNumber}  ·  ${fmtDate(invoice.date)}  ·  Due ${fmtDate(invoice.dueDate)}`, left, ty + 54, { width, align: 'center' });
    return ty + 76;
  }

  // 'plain' — simple two-column header, the default look.
  if (logo) drawLogoAt(left, y, 32);
  const textX = logo ? left + 42 : left;
  doc.fillColor(DARK).font(fontBold).fontSize(18).text(orgName, textX, y, { width: width * 0.55 });
  doc.font(font).fontSize(9).fillColor(MUTED);
  let iy = y + 22;
  if (org?.address) { doc.text(org.address, textX, iy, { width: width * 0.5 }); iy += 13; }
  const gstPan = [org?.gstin && `GSTIN: ${org.gstin}`, org?.pan && `PAN: ${org.pan}`].filter(Boolean).join('   ');
  if (gstPan) doc.text(gstPan, textX, iy, { width: width * 0.5 });

  doc.fillColor(brand).font(fontBold).fontSize(20).text('TAX INVOICE', left, y, { width, align: align === 'left' ? 'right' : align });
  doc.fillColor(DARK).font(font).fontSize(11).text(invoice.invoiceNumber, left, y + 26, { width, align: 'right' });
  doc.fillColor(MUTED).fontSize(9).text(`Date: ${fmtDate(invoice.date)}`, left, y + 42, { width, align: 'right' });
  doc.fillColor(RED).text(`Due: ${fmtDate(invoice.dueDate)}`, left, y + 54, { width, align: 'right' });
  return y + 78;
}

function renderInvoicePdf({ invoice, client, org }) {
  return new Promise((resolve, reject) => {
    const template = resolveTemplate(org?.brandingConfig);
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

    const brand = org?.brandingConfig?.primaryColor || '#4f46e5';
    const pageBg = PAPER_TONES[template.paperTone] || '#ffffff';
    if (pageBg !== '#ffffff') doc.rect(0, 0, doc.page.width, doc.page.height).fill(pageBg);

    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const width = right - left;

    let y = drawHeader(doc, { template, org, invoice, brand, left, right, width, font, fontBold, logo });
    drawDivider(doc, template.dividerStyle, left, right, y, brand);
    y += 14;

    // Bill to / supply details
    const panelBg = template.paperTone === 'cream' ? '#f6efe0' : '#f5f6ff';
    const boxed = template.tableStyle === 'boxed';
    if (boxed) doc.rect(left, y, width, 78).strokeColor(brand).lineWidth(1).stroke();
    else doc.rect(left, y, width, 78).fill(panelBg);
    doc.fillColor(FAINT).font(fontBold).fontSize(8).text('BILL TO', left + 14, y + 12);
    doc.fillColor(DARK).font(fontBold).fontSize(11).text(client?.companyName || '—', left + 14, y + 25, { width: width / 2 - 20 });
    doc.fillColor(MUTED).font(font).fontSize(9);
    let cy = y + 40;
    if (client?.address) { doc.text(client.address, left + 14, cy, { width: width / 2 - 30 }); cy += 22; }
    doc.text(`GSTIN: ${client?.gstin || '—'}  ·  ${stateName(client?.stateCode)} (${client?.stateCode || '—'})`, left + 14, cy, { width: width / 2 - 20 });

    const supplyX = left + width / 2 + 10;
    doc.fillColor(FAINT).font(fontBold).fontSize(8).text('SUPPLY DETAILS', supplyX, y + 12, { width: width / 2 - 24, align: 'right' });
    doc.fillColor(DARK).font(fontBold).fontSize(9)
      .text(invoice.totals.isIGST ? 'IGST (Inter-state)' : 'CGST + SGST (Intra-state)', supplyX, y + 25, { width: width / 2 - 24, align: 'right' });
    doc.fillColor(MUTED).font(font).fontSize(9);
    doc.text(`Place of supply: ${stateName(client?.stateCode)}`, supplyX, y + 40, { width: width / 2 - 24, align: 'right' });
    doc.text(`Terms: ${invoice.paymentTerms || 'Net 15'}`, supplyX, y + 54, { width: width / 2 - 24, align: 'right' });
    y += 94;

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
        doc.fillColor('#fff').font(fontBold).fontSize(8);
        cols.forEach((c, i) => doc.text(c.label, c.x + 5, y + 6, { width: c.w - 8, align: i >= 3 ? 'right' : 'left' }));
        y += 20;
      }
    };
    drawTableHeader();

    doc.font(font).fontSize(fontSize);
    invoice.items.forEach((item, i) => {
      if (y > 700) { doc.addPage(); y = 50; drawTableHeader(); doc.font(font).fontSize(fontSize); }
      if (template.tableStyle === 'zebra' && i % 2 === 1) doc.rect(left, y, width, rowH).fill('#fafbff');
      if (template.tableStyle === 'bordered' || template.tableStyle === 'boxed') doc.rect(left, y, width, rowH).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
      const qty = Number(item.qty) || 0, rate = Number(item.rate) || 0, gstRate = Number(item.gstRate) || 0;
      const lineAmt = qty * rate, tax = lineAmt * gstRate / 100, total = lineAmt + tax;
      const values = [String(i + 1), item.desc || '', item.hsn || '—', String(qty), fmt(rate), `${gstRate}%`, fmt(tax), fmt(total)];
      cols.forEach((c, idx) => {
        doc.fillColor(idx === 1 ? DARK : MUTED).font(idx === 1 ? fontBold : font)
          .text(values[idx], c.x + 5, y + (template.compact ? 4 : 5), { width: c.w - 8, align: idx >= 3 ? 'right' : 'left' });
      });
      y += rowH;
    });
    if (template.tableStyle !== 'minimal') doc.moveTo(left, y).lineTo(right, y).strokeColor('#e0e7ff').lineWidth(1).stroke();
    y += 16;
    if (y > 640) { doc.addPage(); y = 50; }

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
    doc.rect(sx, summaryTop, sw, 108).fill(panelBg);
    let ry = summaryTop + 14;
    doc.fillColor(MUTED).font(font).fontSize(10);
    doc.text('Subtotal', sx + 14, ry, { width: 110 });
    doc.fillColor(DARK).font(fontBold).text(fmt(invoice.totals.subtotal), sx + 14, ry, { width: sw - 28, align: 'right' });
    ry += 18;
    if (invoice.totals.isIGST) {
      doc.fillColor(MUTED).font(font).text('IGST', sx + 14, ry, { width: 110 });
      doc.fillColor(DARK).font(fontBold).text(fmt(invoice.totals.igst), sx + 14, ry, { width: sw - 28, align: 'right' });
      ry += 18;
    } else {
      doc.fillColor(MUTED).font(font).text('CGST', sx + 14, ry, { width: 110 });
      doc.fillColor(DARK).font(fontBold).text(fmt(invoice.totals.cgst), sx + 14, ry, { width: sw - 28, align: 'right' });
      ry += 18;
      doc.fillColor(MUTED).font(font).text('SGST', sx + 14, ry, { width: 110 });
      doc.fillColor(DARK).font(fontBold).text(fmt(invoice.totals.sgst), sx + 14, ry, { width: sw - 28, align: 'right' });
      ry += 18;
    }
    doc.moveTo(sx + 14, ry + 4).lineTo(sx + sw - 14, ry + 4).strokeColor(brand).lineWidth(1.5).stroke();
    ry += 14;
    doc.fillColor(DARK).font(fontBold).fontSize(11).text('Total', sx + 14, ry, { width: 110 });
    doc.fillColor(brand).fontSize(13).text(fmt(invoice.totals.total), sx + 14, ry - 1, { width: sw - 28, align: 'right' });

    if (showAmountInWords) {
      const wordsY = summaryTop + 118;
      doc.rect(sx, wordsY, sw, 40).fill('#eef2ff');
      doc.fillColor(brand).font(font).fontSize(8).text(`Amount in words: ${numberToWords(invoice.totals.total)}`, sx + 10, wordsY + 8, { width: sw - 20 });
    }

    // Footer
    const footY = 760;
    doc.fillColor(FAINT).font(font).fontSize(8).text('This is a computer generated invoice.', left, footY, { width: 250 });
    if (showSignature) {
      doc.moveTo(right - 145, footY).lineTo(right, footY).strokeColor(brand).lineWidth(1).stroke();
      doc.fillColor(brand).fontSize(8).text('Authorised Signatory', right - 145, footY + 4, { width: 145, align: 'center' });
      doc.fillColor(DARK).font(fontBold).text(org?.name || '', right - 145, footY + 16, { width: 145, align: 'center' });
    }

    doc.end();
  });
}

module.exports = { renderInvoicePdf };
