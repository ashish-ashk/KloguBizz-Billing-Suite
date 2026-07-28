// Minimal, dependency-free CSV writer. Handles quoting for commas, quotes and newlines.
function escapeCsv(value) {
  const s = value === null || value === undefined ? '' : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function headerRow(columns) {
  return columns.map(c => escapeCsv(c.label)).join(',');
}

function dataRow(row, columns) {
  return columns.map(c => escapeCsv(c.value(row))).join(',');
}

function toCsv(rows, columns) {
  return [headerRow(columns), ...rows.map(row => dataRow(row, columns))].join('\r\n');
}

/**
 * Streams a CSV straight to the response from a Mongo cursor.
 *
 * The exports used to `find()` the whole collection, build one giant string in
 * memory and send it — so a tenant with 50,000 invoices materialised every
 * document *and* the entire CSV text at once, twice the size of the data, before
 * a single byte reached the client. A cursor holds one batch at a time and the
 * response starts flowing immediately, which also stops the platform's request
 * timeout from killing a large export part-way.
 *
 * `res.write` back-pressure is respected: when the socket's buffer is full we
 * wait for 'drain' rather than queueing the whole file in the process's memory,
 * which would defeat the point.
 */
async function streamCsv(res, { filename, columns, cursor }) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  // The response length isn't known up front when streaming, and a proxy
  // buffering it would undo the streaming.
  res.setHeader('Cache-Control', 'no-store');

  const write = chunk => {
    if (res.write(chunk)) return null;
    return new Promise(resolve => { res.once('drain', resolve); });
  };

  await write(`${headerRow(columns)}\r\n`);
  for await (const doc of cursor) {
    const pending = write(`${dataRow(doc, columns)}\r\n`);
    if (pending) await pending;
  }
  res.end();
}

module.exports = { toCsv, streamCsv, escapeCsv };
