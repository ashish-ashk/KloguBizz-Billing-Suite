const ExcelJS = require('exceljs');

/**
 * Excel export (2.4 #34).
 *
 * `exceljs` has been a dependency since the beginning and was used for exactly one
 * thing: generating the blank bulk-upload template. Meanwhile every export in the
 * product was CSV — which loses number formatting, cannot hold more than one table, and
 * is what an accountant then spends twenty minutes turning into a workbook by hand.
 *
 * Streamed with `WorkbookWriter`, not built in memory. That is the difference between an
 * export that works and one that works until a tenant has a real book: `new
 * ExcelJS.Workbook()` holds every row as a JS object graph and serialises at the end,
 * so a hundred thousand invoices is a hundred thousand live objects. The streaming
 * writer commits rows to the response as they are produced.
 *
 * Multiple sheets are the reason this exists at all. A GST return has nine sections and
 * an ageing report has a summary plus a per-customer table; as CSV those are separate
 * files whose relationship to each other is lost the moment they are downloaded.
 */

const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
const MONEY_FORMAT = '#,##0.00';
const DATE_FORMAT = 'dd-mmm-yyyy';

/**
 * Applies the column definitions and styles the header row.
 *
 * `numFmt` is set per column rather than per cell: Excel stores the format on the cell,
 * so setting it once per column is the difference between a file that opens instantly
 * and one that carries a style record for every value.
 */
function configureSheet(sheet, columns) {
  sheet.columns = columns.map(column => ({
    header: column.label,
    key: column.key || column.label,
    width: column.width || Math.max(12, Math.min(40, column.label.length + 6)),
    style: column.money
      ? { numFmt: MONEY_FORMAT }
      : (column.date ? { numFmt: DATE_FORMAT } : undefined)
  }));

  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  header.fill = HEADER_FILL;
  header.alignment = { vertical: 'middle' };
  header.height = 20;
  // Frozen, because the first thing anyone does with a long export is scroll.
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
}

/**
 * Coerces a value into something Excel stores as the right *type*.
 *
 * This is the whole advantage over CSV and it is easy to lose: a date written as a
 * string sorts alphabetically, and a number written as a string cannot be summed. A
 * null becomes an empty cell rather than the text "null".
 */
function cellValue(value, column) {
  if (value === null || value === undefined || value === '') return null;
  if (column.money) {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }
  if (column.date) {
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return value;
}

/**
 * Streams a workbook to the response.
 *
 * `sheets` is `[{ name, columns, rows }]`, where `rows` may be an array, an async
 * iterable or a Mongoose cursor — so a small summary sheet and a large streamed table
 * can sit in the same file without the caller choosing between them.
 */
async function streamWorkbook(res, { filename, sheets }) {
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
    stream: res,
    // Shared strings are disabled: they require holding every distinct string in memory
    // to deduplicate, which defeats streaming for a large export.
    useSharedStrings: false,
    useStyles: true
  });
  workbook.creator = 'KloguBizz';
  workbook.created = new Date();

  for (const definition of sheets) {
    const sheet = workbook.addWorksheet(definition.name);
    configureSheet(sheet, definition.columns);

    for await (const row of definition.rows) {
      sheet.addRow(definition.columns.map(column => cellValue(column.value(row), column))).commit();
    }

    if (definition.totals) {
      const totalRow = sheet.addRow(definition.columns.map(column =>
        (column.totalLabel ? column.totalLabel : cellValue(definition.totals[column.key], column))));
      totalRow.font = { bold: true };
      totalRow.commit();
    }
    sheet.commit();
  }

  await workbook.commit();
}

module.exports = { streamWorkbook, MONEY_FORMAT, DATE_FORMAT };
