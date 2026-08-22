const ExcelJS = require('exceljs');
const { httpError } = require('../utils/httpError');
const { isValidGstin } = require('../validators/common');
const { stateName, stateCodeFromName, stateCodeFromGstin, STATE_NAMES } = require('../utils/states');

/**
 * Bulk client import, from CSV.
 *
 * CSV rather than the .xlsx the item importer uses, because of where a customer
 * list actually comes from: an export out of Tally or Zoho, a contacts export, or
 * the spreadsheet the business has kept for years. All of those are CSV, and a
 * tenant moving in has one of them in their hand.
 *
 * .xlsx is accepted too — somebody who opens the CSV template in Excel and
 * presses Save produces one, and refusing that file teaches them nothing except
 * that the feature is broken.
 *
 * ── What this file is mostly about ────────────────────────────────────────
 *
 * Not the field list. The field list is short. It is about the fact that "CSV" is
 * not one format, and every one of the differences below has an obvious wrong
 * answer that loses a tenant's data or refuses a correct file:
 *
 *   - Excel writes a UTF-8 byte-order mark, which makes the first header read as
 *     `﻿Company Name` and match nothing. This is the single commonest cause
 *     of "your import doesn't work".
 *   - Addresses contain commas. Always. So quoted fields are not an edge case
 *     here, they are the normal case, and `split(',')` silently shifts every
 *     column after the address by one.
 *   - A quoted field can contain a newline (a two-line address) — so the file
 *     cannot be split into rows before it is parsed into fields.
 *   - Excel in some locales writes semicolons, and anything pasted from a table
 *     is tab-separated.
 *   - Line endings may be CRLF, LF or (from old Mac exports) CR.
 */

const MAX_ROWS = 2000;
const SHEET_NAME = 'Clients';

const COLUMNS = [
  { key: 'companyName', header: 'Customer Name *', required: true },
  { key: 'gstin', header: 'GSTIN' },
  { key: 'stateCode', header: 'State' },
  { key: 'email', header: 'Email' },
  { key: 'phone', header: 'Phone' },
  { key: 'address', header: 'Address' },
  { key: 'status', header: 'Status (Active/Inactive)' }
];

/**
 * Headers we also answer to, so an export from somewhere else often imports
 * without being edited first. Only unambiguous synonyms — nothing that could
 * mean two different columns.
 */
const HEADER_ALIASES = {
  'customer name': 'companyName',
  'client name': 'companyName',
  'company name': 'companyName',
  'company': 'companyName',
  'name': 'companyName',
  'party name': 'companyName',
  'gstin/uin': 'gstin',
  'gst no': 'gstin',
  'gst number': 'gstin',
  'gstin number': 'gstin',
  'state name': 'stateCode',
  'state/ut': 'stateCode',
  'state code': 'stateCode',
  'place of supply': 'stateCode',
  'email address': 'email',
  'e-mail': 'email',
  'mobile': 'phone',
  'phone number': 'phone',
  'contact': 'phone',
  'contact number': 'phone',
  'billing address': 'address',
  'address line 1': 'address',
  'status': 'status'
};

const EXAMPLE_ROW = {
  companyName: 'Acme Traders Pvt Ltd',
  gstin: '27AAPFU0939F1ZV',
  stateCode: 'Maharashtra',
  email: 'accounts@acmetraders.example',
  phone: '9876543210',
  address: 'Unit 4, BKC, Mumbai 400051',
  status: 'Active'
};

// ── The template ─────────────────────────────────────────────────────────

/** One field, escaped for CSV. Quoted only when it has to be, so the file stays readable. */
function csvCell(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * The blank template.
 *
 * Deliberately *not* an .xlsx with a Read Me sheet like the item template: the
 * whole point of CSV here is that it opens in anything, and a CSV cannot hold a
 * second sheet. So the guidance goes where it can be read instead — on the
 * upload screen, next to the button. The one thing the file carries is a filled
 * example row, which answers "what goes in the State column" faster than any
 * paragraph.
 *
 * The BOM is written on purpose. Without it Excel opens a UTF-8 CSV as the local
 * code page and mangles every non-ASCII character in a customer's name.
 */
function buildClientTemplateCsv() {
  const lines = [
    COLUMNS.map(c => csvCell(c.header)).join(','),
    COLUMNS.map(c => csvCell(EXAMPLE_ROW[c.key])).join(',')
  ];
  return `﻿${lines.join('\r\n')}\r\n`;
}

// ── Reading whatever arrived ─────────────────────────────────────────────

/**
 * A CSV parser that handles quoting, because the alternative silently corrupts
 * data rather than failing.
 *
 * Character by character rather than by regex, since the grammar is genuinely
 * stateful: whether a comma separates fields or is part of one depends on
 * whether we are inside quotes, and a doubled quote inside a quoted field is an
 * escaped quote rather than the end of it.
 */
function parseCsv(text, delimiter) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  const endField = () => { row.push(field); field = ''; };
  const endRow = () => { endField(); rows.push(row); row = []; };

  while (i < text.length) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i += 1; continue;
      }
      field += char; i += 1; continue;
    }

    if (char === '"' && field === '') { inQuotes = true; i += 1; continue; }
    if (char === delimiter) { endField(); i += 1; continue; }
    if (char === '\r') {
      // CRLF, or a lone CR from an old Mac export.
      endRow();
      i += text[i + 1] === '\n' ? 2 : 1;
      continue;
    }
    if (char === '\n') { endRow(); i += 1; continue; }

    field += char; i += 1;
  }

  // A file that does not end with a newline still has a last row.
  if (field !== '' || row.length) endRow();
  return rows;
}

/**
 * Which character separates the fields.
 *
 * Decided from the header line only, and by counting: the header has no free
 * text in it, so whichever candidate appears most there is the separator. Doing
 * this on the whole file would let commas inside addresses outvote the real
 * delimiter.
 */
function detectDelimiter(text) {
  const firstLine = text.split(/\r\n|\r|\n/, 1)[0] || '';
  const counts = [',', ';', '\t', '|'].map(d => [d, firstLine.split(d).length - 1]);
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0][1] > 0 ? counts[0][0] : ',';
}

function headerKey(text) {
  const cleaned = String(text || '')
    .replace(/^﻿/, '')
    .trim()
    .toLowerCase()
    .replace(/\*/g, '')
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const exact = COLUMNS.find(c => headerKeyOf(c.header) === cleaned);
  if (exact) return exact.key;
  return HEADER_ALIASES[cleaned] || null;
}

function headerKeyOf(header) {
  return header.trim().toLowerCase().replace(/\*/g, '').replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Rows of cell text out of a CSV buffer, keyed by our field names. */
function rawRowsFromCsv(buffer) {
  // The BOM is stripped here rather than inside the parser, so it can never
  // reach a header comparison.
  const text = buffer.toString('utf8').replace(/^﻿/, '');
  if (!text.trim()) throw httpError(400, 'That file is empty.');

  const grid = parseCsv(text, detectDelimiter(text));
  const headerRow = grid.shift() || [];
  return mapRows(headerRow, grid, 2);
}

/** The same, out of a spreadsheet — for the tenant who re-saved the template as .xlsx. */
async function rawRowsFromWorkbook(buffer) {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer);
  } catch {
    throw httpError(
      400,
      'Could not read that file. Please upload the CSV template, or a .csv/.xlsx file saved from it.',
      'UNREADABLE_FILE'
    );
  }
  const sheet = workbook.getWorksheet(SHEET_NAME) || workbook.worksheets[0];
  if (!sheet) throw httpError(400, 'That spreadsheet has no sheets in it.');

  const asText = cell => {
    const value = cell?.value;
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') {
      if (value.richText) return value.richText.map(t => t.text).join('');
      if (value.text) return String(value.text);
      if (value.result !== undefined) return String(value.result);
      if (value instanceof Date) return value.toISOString();
      return '';
    }
    return String(value);
  };

  const grid = [];
  let header = [];
  sheet.eachRow({ includeEmpty: false }, (row, number) => {
    const cells = [];
    // `row.cellCount` rather than `eachCell`, so an empty cell in the middle of a
    // row keeps its position instead of shifting every later column left.
    for (let c = 1; c <= Math.max(row.cellCount, COLUMNS.length); c += 1) cells.push(asText(row.getCell(c)));
    if (number === 1) header = cells;
    else grid.push(cells);
  });
  return mapRows(header, grid, 2);
}

/**
 * Header cells → field names, matched by *text* rather than position, so a file
 * with the columns in a different order (or with extra columns of its own,
 * which every real export has) still reads correctly.
 */
function mapRows(headerRow, grid, firstDataRowNumber) {
  const indexToKey = new Map();
  headerRow.forEach((cell, index) => {
    const key = headerKey(cell);
    // First occurrence wins: a file with both "Name" and "Customer Name" should
    // not have the second quietly overwrite the first.
    if (key && !Array.from(indexToKey.values()).includes(key)) indexToKey.set(index, key);
  });

  const found = Array.from(indexToKey.values());
  const missing = COLUMNS.filter(c => c.required && !found.includes(c.key));
  if (missing.length) {
    throw httpError(
      400,
      `This file has no ${missing.map(c => `"${c.header}"`).join(' or ')} column. `
      + `The columns found were: ${headerRow.filter(h => String(h).trim()).map(h => `"${String(h).trim()}"`).join(', ') || 'none'}. `
      + 'Download the template and keep its header row, or rename your own column to match.',
      'MISSING_COLUMNS'
    );
  }

  const rows = [];
  grid.forEach((cells, index) => {
    const raw = { __row: firstDataRowNumber + index };
    let any = false;
    for (const [column, key] of indexToKey) {
      const value = String(cells[column] ?? '').trim();
      raw[key] = value;
      if (value) any = true;
    }
    // Blank lines are skipped rather than reported as errors. A trailing newline
    // is not a mistake anybody needs telling about.
    if (!any) return;
    if (isUnmodifiedExampleRow(raw)) return;
    rows.push(raw);
  });
  return rows;
}

/** The example row, left in place, is skipped rather than imported as a customer. */
function isUnmodifiedExampleRow(raw) {
  return (raw.companyName || '').trim().toLowerCase() === EXAMPLE_ROW.companyName.toLowerCase()
    && (raw.gstin || '').trim().toUpperCase() === EXAMPLE_ROW.gstin;
}

// ── Validating one row ───────────────────────────────────────────────────

// Deliberately loose. This is a contact field, and the strictest correct email
// regex still rejects addresses that work; what matters is catching the ones
// that are plainly not addresses, because a reminder sent to one fails silently.
const EMAIL_SHAPE = /^[^\s@]+@[^\s@.]+\.[^\s@]{2,}$/;

function validateRow(raw, { existingGstins, existingNames, seenGstins, seenNames }) {
  const errors = [];
  const doc = {};

  const companyName = (raw.companyName || '').trim().replace(/\s+/g, ' ');
  if (!companyName) errors.push('Customer Name is required.');
  else if (companyName.length < 2) errors.push('Customer Name must be at least 2 characters.');
  doc.companyName = companyName;

  // ── GSTIN ──
  const gstin = (raw.gstin || '').trim().toUpperCase().replace(/\s/g, '');
  if (gstin) {
    if (!isValidGstin(gstin)) {
      /**
       * The checksum is verified, not just the shape. A GSTIN is a legal
       * declaration on the invoice, and a transposed pair of characters passes a
       * format check while belonging to nobody — at which point the customer's
       * input tax credit is refused and they come back to the tenant, months
       * later, to find out why.
       */
      errors.push(`"${gstin}" is not a valid GSTIN — check the last character and the length (15).`);
    } else {
      doc.gstin = gstin;
    }
  }

  // ── State, which the GSTIN may already have told us ──
  const stateRaw = (raw.stateCode || '').trim();
  const fromGstin = doc.gstin ? stateCodeFromGstin(doc.gstin) : null;
  let code = null;

  if (stateRaw) {
    // A number, or a name — nobody importing a customer list knows Maharashtra is 27.
    code = /^\d{1,2}$/.test(stateRaw) ? stateRaw.padStart(2, '0') : stateCodeFromName(stateRaw);
    if (!code || !STATE_NAMES[code]) {
      errors.push(`"${stateRaw}" is not a state we recognise. Use the state name (e.g. Maharashtra) or its GST code (e.g. 27).`);
      code = null;
    }
  }

  if (fromGstin && code && fromGstin !== code) {
    /**
     * The two disagreeing is the most consequential error in this file, so it is
     * reported rather than silently resolved.
     *
     * The first two digits of a GSTIN *are* the state code. If the row says
     * Karnataka and the GSTIN says 27, one of them is wrong — and which one
     * decides whether every future invoice to this customer carries IGST or
     * CGST + SGST. Picking one for them would mean either a wrong GSTIN or the
     * wrong tax split on every invoice, and both surface first in a GST return
     * that no longer reconciles.
     */
    errors.push(
      `The state says ${stateName(code)} but the GSTIN starts with ${fromGstin}, which is ${stateName(fromGstin)}. `
      + 'One of the two is wrong, and this decides whether invoices to this customer are IGST or CGST + SGST.'
    );
  } else if (fromGstin && !code) {
    // Nothing to disagree with, and the GSTIN already carries the answer.
    code = fromGstin;
  }

  /**
   * Only asked for when nothing else has already failed on this row. If the
   * GSTIN was rejected, it was *going* to supply the state — so adding "and the
   * state is missing" describes a second problem that fixing the first one also
   * fixes, and sends the user looking for a state column they were right to
   * leave blank.
   */
  if (!code && !errors.length) {
    errors.push('State is required when there is no GSTIN — it decides whether invoices to this customer are IGST or CGST + SGST.');
  }
  if (code) {
    doc.stateCode = code;
    doc.state = stateName(code);
  }

  // ── Contact details ──
  const email = (raw.email || '').trim().toLowerCase();
  if (email) {
    if (!EMAIL_SHAPE.test(email)) errors.push(`"${raw.email}" does not look like an email address.`);
    else doc.email = email;
  }

  const phone = (raw.phone || '').trim();
  if (phone) {
    const digits = phone.replace(/[^\d]/g, '');
    // Ten digits for an Indian mobile or landline, up to twelve with a country
    // code. Formatting (spaces, +91, hyphens) is kept as typed — it is a contact
    // field, not a key.
    if (digits.length < 8 || digits.length > 15) {
      errors.push(`"${phone}" does not look like a phone number.`);
    } else {
      doc.phone = phone;
    }
  }

  const address = (raw.address || '').trim().replace(/[ \t]+/g, ' ');
  if (address) doc.address = address;

  const status = (raw.status || '').trim().toLowerCase();
  if (!status) doc.status = 'active';
  else if (['active', 'yes', 'y', 'enabled'].includes(status)) doc.status = 'active';
  else if (['inactive', 'no', 'n', 'disabled'].includes(status)) doc.status = 'inactive';
  else errors.push(`Status must be "Active" or "Inactive" (got "${raw.status}").`);

  /**
   * ── Duplicates ──
   *
   * A row claims its GSTIN and name even when it failed validation for some other
   * reason, so a later row carrying the same GSTIN is reported rather than
   * imported.
   *
   * The alternative — only letting *valid* rows claim — means whether the second
   * row imports depends on whether the first happened to have an unrelated typo
   * in its phone number. The same file, minus that typo, would produce a
   * different customer record. Two rows claiming one GSTIN is a question for
   * whoever made the file; the importer should not answer it by line order.
   */
  if (doc.gstin) {
    if (seenGstins.has(doc.gstin)) {
      errors.push(`GSTIN ${doc.gstin} also appears on row ${seenGstins.get(doc.gstin)} of this file.`);
    } else if (existingGstins.has(doc.gstin)) {
      errors.push(`You already have a customer with GSTIN ${doc.gstin} (${existingGstins.get(doc.gstin)}).`);
    } else {
      seenGstins.set(doc.gstin, raw.__row);
    }
  }

  /**
   * A name collision is only treated as a duplicate when *neither* side has a
   * GSTIN to tell them apart.
   *
   * Two records with the same name and different GSTINs are two branches of one
   * group, which is normal and legitimate. Two with the same name and no GSTIN
   * at all are the same customer twice — and creating them both splits their
   * invoices across two records, so the receivables report shows neither balance
   * correctly and a statement sent to them is wrong.
   */
  const nameKey = companyName.toLowerCase();
  if (companyName && !doc.gstin) {
    if (seenNames.has(nameKey)) {
      errors.push(`"${companyName}" also appears on row ${seenNames.get(nameKey)} of this file, and neither row has a GSTIN to tell them apart.`);
    } else if (existingNames.has(nameKey)) {
      errors.push(`You already have a customer called "${companyName}" with no GSTIN. Add a GSTIN to one of them if they are different businesses.`);
    } else {
      seenNames.set(nameKey, raw.__row);
    }
  }

  return { errors, doc };
}

// ── The whole file ───────────────────────────────────────────────────────

/**
 * Parses and validates an uploaded customer list. Touches no database — the
 * caller decides what to do with `valid`.
 *
 * Every row is judged on its own and the failures come back with their row
 * numbers and reasons, so a file of five hundred customers with four bad rows
 * imports four hundred and ninety-six and hands back a list of four to fix.
 * Refusing the whole file over one bad phone number is how an import feature
 * ends up unused.
 */
async function parseClientFile(buffer, { filename = '', existingGstins, existingNames }) {
  const looksLikeXlsx = /\.xlsx$/i.test(filename)
    // The ZIP magic number: an .xlsx is a zip archive. Checked as well as the
    // name, because a file renamed to .csv is still a spreadsheet.
    || (buffer.length > 1 && buffer[0] === 0x50 && buffer[1] === 0x4b);

  const rawRows = looksLikeXlsx ? await rawRowsFromWorkbook(buffer) : rawRowsFromCsv(buffer);

  if (!rawRows.length) {
    throw httpError(
      400,
      'That file has a header row but no customers in it. Add one row per customer below the header.',
      'NO_DATA_ROWS'
    );
  }
  if (rawRows.length > MAX_ROWS) {
    throw httpError(
      400,
      `That file has ${rawRows.length} rows. Please upload at most ${MAX_ROWS} customers at a time — split a longer list into more than one file.`,
      'TOO_MANY_ROWS'
    );
  }

  const seenGstins = new Map();
  const seenNames = new Map();
  const valid = [];
  const failed = [];

  rawRows.forEach(raw => {
    const { errors, doc } = validateRow(raw, { existingGstins, existingNames, seenGstins, seenNames });
    if (errors.length) {
      failed.push({
        row: raw.__row,
        companyName: raw.companyName || undefined,
        gstin: raw.gstin || undefined,
        errors
      });
    } else {
      valid.push({ row: raw.__row, doc });
    }
  });

  return { totalRows: rawRows.length, valid, failed };
}

module.exports = {
  buildClientTemplateCsv, parseClientFile, parseCsv, detectDelimiter, COLUMNS, MAX_ROWS
};
