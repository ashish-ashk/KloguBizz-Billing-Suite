// Minimal, dependency-free CSV writer. Handles quoting for commas, quotes and newlines.
function toCsv(rows, columns) {
  const escape = value => {
    const s = value === null || value === undefined ? '' : String(value);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = columns.map(c => escape(c.label)).join(',');
  const lines = rows.map(row => columns.map(c => escape(c.value(row))).join(','));
  return [header, ...lines].join('\r\n');
}

module.exports = { toCsv };
