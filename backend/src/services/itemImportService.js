const ExcelJS = require('exceljs');
const { httpError } = require('../utils/httpError');

const SHEET_NAME = 'Items';
const MAX_ROWS = 2000;

const UNITS = ['Nos', 'Kg', 'Gm', 'Ltr', 'Ml', 'Box', 'Pcs', 'Dozen', 'Set', 'Mtr', 'Sqft', 'Hrs', 'Bag', 'Pair'];
const GST_RATES = [0, 5, 12, 18, 28];

// Column order defines both the template layout and how uploaded sheets are read back
// (matched by header text, so column order in the uploaded file doesn't actually matter).
const COLUMNS = [
  { key: 'itemCode', header: 'Item Code', width: 16 },
  { key: 'name', header: 'Item Name *', width: 28, required: true },
  { key: 'description', header: 'Description', width: 30 },
  { key: 'type', header: 'Type (Goods/Service)', width: 18 },
  { key: 'hsn', header: 'HSN/SAC Code', width: 14 },
  { key: 'category', header: 'Category', width: 16 },
  { key: 'unit', header: 'Unit', width: 10 },
  { key: 'gstRate', header: 'GST Rate (%)', width: 12 },
  { key: 'cessRate', header: 'Cess Rate (%)', width: 12 },
  { key: 'sellingPrice', header: 'Selling Price *', width: 14, required: true },
  { key: 'mrp', header: 'MRP', width: 12 },
  { key: 'purchasePrice', header: 'Purchase Price', width: 14 },
  { key: 'taxInclusive', header: 'Tax Inclusive (Yes/No)', width: 18 },
  { key: 'stockQty', header: 'Stock Quantity', width: 14 },
  { key: 'reorderLevel', header: 'Reorder Level', width: 14 },
  { key: 'barcode', header: 'Barcode', width: 16 },
  { key: 'status', header: 'Status (Active/Inactive)', width: 18 }
];

const EXAMPLE_ROW = {
  itemCode: 'PAP-A4-500', name: 'A4 Copier Paper (500 sheets)', description: 'Ream of 75 GSM A4 paper',
  type: 'Goods', hsn: '4802', category: 'Stationery', unit: 'Box', gstRate: 18, cessRate: 0,
  sellingPrice: 320, mrp: 350, purchasePrice: 260, taxInclusive: 'No', stockQty: 40,
  reorderLevel: 10, barcode: '', status: 'Active'
};

async function buildItemTemplateWorkbook() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'KloguBizz';
  workbook.created = new Date();

  const readMe = workbook.addWorksheet('Read Me');
  readMe.columns = [{ width: 22 }, { width: 14 }, { width: 46 }];
  readMe.addRow(['KloguBizz — Bulk Item Upload', '', '']).font = { bold: true, size: 14 };
  readMe.addRow([]);
  readMe.addRow(['1. Fill in the "Items" sheet — one row per item. Do not rename or reorder the header row.']);
  readMe.addRow(['2. Fields marked * are required. Everything else is optional and will use a sensible default.']);
  readMe.addRow(['3. Delete or overwrite the pale example row before uploading — it is not imported as-is if left unchanged, but replacing it keeps your file tidy.']);
  readMe.addRow(['4. Save as .xlsx and upload it from the Items page → Bulk Upload.']);
  readMe.addRow(['5. Each row is validated independently — valid rows are added, invalid rows are listed back to you with the exact reason so you can fix and re-upload just those.']);
  readMe.addRow([]);
  readMe.addRow(['Column', 'Required', 'Notes']).font = { bold: true };
  const notes = {
    itemCode: 'Optional SKU/code. Must be unique — both within this file and against items already in your catalog.',
    name: 'Item or service name.',
    description: 'Optional longer description.',
    type: `One of: Goods, Service. Defaults to Goods.`,
    hsn: 'HSN code for goods, SAC code for services.',
    category: 'Free text, e.g. Stationery.',
    unit: `One of: ${UNITS.join(', ')}. Defaults to Nos.`,
    gstRate: `One of: ${GST_RATES.join(', ')}. Defaults to 18.`,
    cessRate: 'Number, defaults to 0.',
    sellingPrice: 'Number greater than 0.',
    mrp: 'Optional number.',
    purchasePrice: 'Optional number.',
    taxInclusive: 'Yes or No. Defaults to No.',
    stockQty: 'Whole number, defaults to 0.',
    reorderLevel: 'Optional whole number.',
    barcode: 'Optional free text.',
    status: 'Active or Inactive. Defaults to Active.'
  };
  COLUMNS.forEach(col => {
    readMe.addRow([col.header, col.required ? 'Yes' : 'No', notes[col.key] || '']);
  });
  readMe.getColumn(3).alignment = { wrapText: true, vertical: 'top' };

  const sheet = workbook.addWorksheet(SHEET_NAME, { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.columns = COLUMNS.map(col => ({ header: col.header, key: col.key, width: col.width }));

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
  headerRow.alignment = { vertical: 'middle' };
  headerRow.height = 20;

  const exampleRow = sheet.addRow(EXAMPLE_ROW);
  exampleRow.font = { italic: true, color: { argb: 'FF9CA3AF' } };
  exampleRow.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBEB' } }; });
  sheet.getCell(`A${exampleRow.number}`).note = 'Example row — replace with your own data or delete this row.';

  const lastDataRow = 500;
  const listValidation = (col, list) => {
    const colLetter = sheet.getColumn(col.key).letter;
    for (let r = 2; r <= lastDataRow; r += 1) {
      sheet.getCell(`${colLetter}${r}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`"${list.join(',')}"`],
        showErrorMessage: true,
        errorTitle: 'Invalid value',
        error: `Please pick one of: ${list.join(', ')}`
      };
    }
  };
  listValidation(COLUMNS.find(c => c.key === 'type'), ['Goods', 'Service']);
  listValidation(COLUMNS.find(c => c.key === 'unit'), UNITS);
  listValidation(COLUMNS.find(c => c.key === 'gstRate'), GST_RATES);
  listValidation(COLUMNS.find(c => c.key === 'taxInclusive'), ['Yes', 'No']);
  listValidation(COLUMNS.find(c => c.key === 'status'), ['Active', 'Inactive']);

  return workbook;
}

async function buildItemTemplateBuffer() {
  const workbook = await buildItemTemplateWorkbook();
  return workbook.xlsx.writeBuffer();
}

function cellText(row, colNumber) {
  const cell = row.getCell(colNumber);
  const value = cell?.value;
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    if (value.richText) return value.richText.map(t => t.text).join('');
    if (value.text) return String(value.text);
    if (value.result !== undefined) return String(value.result);
    if (value instanceof Date) return value.toISOString();
    return '';
  }
  return String(value).trim();
}

function isRowBlank(row, columnNumbers) {
  return columnNumbers.every(n => cellText(row, n) === '');
}

function toNumberOrUndefined(text) {
  if (text === '') return undefined;
  const n = Number(text);
  return Number.isFinite(n) ? n : NaN;
}

function toBooleanOrUndefined(text) {
  if (text === '') return undefined;
  const t = text.trim().toLowerCase();
  if (['yes', 'y', 'true', '1'].includes(t)) return true;
  if (['no', 'n', 'false', '0'].includes(t)) return false;
  return null; // invalid marker
}

/**
 * Reads the uploaded workbook and returns raw row data keyed by our field
 * names, matched against the header row by text (not by column position),
 * so re-ordered columns in a re-saved template still parse correctly.
 */
function readRawRows(workbook) {
  const sheet = workbook.getWorksheet(SHEET_NAME) || workbook.worksheets[0];
  if (!sheet) throw httpError(400, 'The uploaded file has no worksheets.');

  const headerRow = sheet.getRow(1);
  const headerToKey = new Map(COLUMNS.map(c => [c.header.trim().toLowerCase(), c.key]));
  const colIndexToKey = {};
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const key = headerToKey.get(cellText(headerRow, colNumber).toLowerCase());
    if (key) colIndexToKey[colNumber] = key;
  });

  const missing = COLUMNS.filter(c => c.required && !Object.values(colIndexToKey).includes(c.key));
  if (missing.length) {
    throw httpError(
      400,
      `This file doesn't match the expected template — missing required column(s): ${missing.map(c => c.header).join(', ')}. Please download the template again and fill it in without changing the header row.`
    );
  }

  const colNumbers = Object.keys(colIndexToKey).map(Number);
  const rows = [];
  const lastRow = sheet.actualRowCount || sheet.rowCount;
  for (let r = 2; r <= lastRow; r += 1) {
    const row = sheet.getRow(r);
    if (!row || row.number === undefined) continue;
    if (isRowBlank(row, colNumbers.length ? colNumbers : [1])) continue;
    const raw = { __row: r };
    colNumbers.forEach(colNumber => { raw[colIndexToKey[colNumber]] = cellText(row, colNumber); });
    if (isUnmodifiedExampleRow(raw)) continue;
    rows.push(raw);
  }
  return rows;
}

// The template ships with one filled-in example row so users see the expected
// format. Left untouched, it's silently skipped rather than imported as a real item.
function isUnmodifiedExampleRow(raw) {
  return (raw.itemCode || '').trim().toUpperCase() === EXAMPLE_ROW.itemCode.toUpperCase()
    && (raw.name || '').trim().toLowerCase() === EXAMPLE_ROW.name.toLowerCase();
}

/** Validates + normalizes one raw row. Returns { errors, data }. */
function validateRow(raw, { existingCodes, seenCodesInFile }) {
  const errors = [];
  const data = {};

  const name = (raw.name || '').trim();
  if (!name) errors.push('Item Name is required.');
  data.name = name;

  const sellingPrice = toNumberOrUndefined(raw.sellingPrice || '');
  if (sellingPrice === undefined || Number.isNaN(sellingPrice) || !(sellingPrice > 0)) {
    errors.push('Selling Price is required and must be a number greater than 0.');
  } else {
    data.sellingPrice = sellingPrice;
  }

  const typeRaw = (raw.type || '').trim().toLowerCase();
  if (!typeRaw) {
    data.type = 'goods';
  } else if (['goods', 'good'].includes(typeRaw)) {
    data.type = 'goods';
  } else if (['service', 'services'].includes(typeRaw)) {
    data.type = 'service';
  } else {
    errors.push(`Type must be "Goods" or "Service" (got "${raw.type}").`);
  }

  const unitRaw = (raw.unit || '').trim();
  if (!unitRaw) {
    data.unit = 'Nos';
  } else {
    const match = UNITS.find(u => u.toLowerCase() === unitRaw.toLowerCase());
    if (!match) errors.push(`Unit must be one of: ${UNITS.join(', ')} (got "${raw.unit}").`);
    else data.unit = match;
  }

  const gstRateRaw = raw.gstRate || '';
  if (!gstRateRaw.trim()) {
    data.gstRate = 18;
  } else {
    const n = toNumberOrUndefined(gstRateRaw);
    if (Number.isNaN(n) || !GST_RATES.includes(n)) errors.push(`GST Rate must be one of: ${GST_RATES.join(', ')} (got "${raw.gstRate}").`);
    else data.gstRate = n;
  }

  const cessRate = toNumberOrUndefined(raw.cessRate || '');
  if (cessRate === undefined) data.cessRate = 0;
  else if (Number.isNaN(cessRate) || cessRate < 0) errors.push('Cess Rate must be a number that is 0 or greater.');
  else data.cessRate = cessRate;

  const mrp = toNumberOrUndefined(raw.mrp || '');
  if (mrp !== undefined) {
    if (Number.isNaN(mrp) || mrp < 0) errors.push('MRP must be a number that is 0 or greater.');
    else data.mrp = mrp;
  }

  const purchasePrice = toNumberOrUndefined(raw.purchasePrice || '');
  if (purchasePrice !== undefined) {
    if (Number.isNaN(purchasePrice) || purchasePrice < 0) errors.push('Purchase Price must be a number that is 0 or greater.');
    else data.purchasePrice = purchasePrice;
  }

  const taxInclusive = toBooleanOrUndefined(raw.taxInclusive || '');
  if (taxInclusive === null) errors.push(`Tax Inclusive must be "Yes" or "No" (got "${raw.taxInclusive}").`);
  else data.taxInclusive = taxInclusive === undefined ? false : taxInclusive;

  const stockQty = toNumberOrUndefined(raw.stockQty || '');
  if (stockQty === undefined) data.stockQty = 0;
  else if (Number.isNaN(stockQty) || stockQty < 0) errors.push('Stock Quantity must be a whole number that is 0 or greater.');
  else data.stockQty = Math.trunc(stockQty);

  const reorderLevel = toNumberOrUndefined(raw.reorderLevel || '');
  if (reorderLevel !== undefined) {
    if (Number.isNaN(reorderLevel) || reorderLevel < 0) errors.push('Reorder Level must be a whole number that is 0 or greater.');
    else data.reorderLevel = Math.trunc(reorderLevel);
  }

  const statusRaw = (raw.status || '').trim().toLowerCase();
  if (!statusRaw) data.status = 'active';
  else if (statusRaw === 'active') data.status = 'active';
  else if (statusRaw === 'inactive') data.status = 'inactive';
  else errors.push(`Status must be "Active" or "Inactive" (got "${raw.status}").`);

  data.description = (raw.description || '').trim();
  data.hsn = (raw.hsn || '').trim();
  data.category = (raw.category || '').trim();
  data.barcode = (raw.barcode || '').trim();

  const itemCode = (raw.itemCode || '').trim().toUpperCase();
  if (itemCode) {
    if (seenCodesInFile.has(itemCode)) {
      errors.push(`Item Code "${itemCode}" is duplicated in this file (row ${seenCodesInFile.get(itemCode)}).`);
    } else if (existingCodes.has(itemCode)) {
      errors.push(`Item Code "${itemCode}" already exists in your catalog.`);
    } else {
      data.itemCode = itemCode;
      seenCodesInFile.set(itemCode, raw.__row);
    }
  }

  return { errors, data };
}

/**
 * Parses + validates an uploaded workbook buffer against an org's existing items.
 * Returns { totalRows, valid: [{row, doc}], failed: [{row, itemCode, name, errors}] }.
 * Does not touch the database — callers decide how to persist `valid`.
 */
async function parseItemWorkbook(buffer, { existingCodes }) {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer);
  } catch (err) {
    throw httpError(400, 'Could not read this file. Please upload a valid .xlsx file (the format used by the template).');
  }

  const rawRows = readRawRows(workbook);
  if (rawRows.length === 0) {
    throw httpError(400, 'No data rows were found. Fill in at least one row below the header on the "Items" sheet.');
  }
  if (rawRows.length > MAX_ROWS) {
    throw httpError(400, `This file has ${rawRows.length} rows. Please upload at most ${MAX_ROWS} items at a time — split larger catalogs into multiple files.`);
  }

  const seenCodesInFile = new Map();
  const valid = [];
  const failed = [];
  rawRows.forEach(raw => {
    const { errors, data } = validateRow(raw, { existingCodes, seenCodesInFile });
    if (errors.length) failed.push({ row: raw.__row, itemCode: raw.itemCode || undefined, name: raw.name || undefined, errors });
    else valid.push({ row: raw.__row, doc: data });
  });

  return { totalRows: rawRows.length, valid, failed };
}

module.exports = { buildItemTemplateBuffer, parseItemWorkbook, COLUMNS, UNITS, GST_RATES };
