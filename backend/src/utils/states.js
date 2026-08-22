/**
 * The GST state and union-territory codes.
 *
 * Extracted from `pdfService`, which was the only copy. A second copy was about
 * to be written for the client CSV import, and two copies of this table is a
 * divergence waiting to happen — the state name is printed on a tax invoice as
 * the place of supply, and the code decides whether that invoice carries IGST or
 * CGST + SGST.
 *
 * The codes are the ones GST actually uses, so the gaps and oddities are real
 * and deliberate: 28 is the old combined Andhra Pradesh, kept because invoices
 * issued before the 2014 split still carry it; 97 is "other territory" (offshore
 * and similar) and 99 is used for unregistered counterparties in some returns.
 */

const STATE_NAMES = {
  '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh', '05': 'Uttarakhand',
  '06': 'Haryana', '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh', '10': 'Bihar', '11': 'Sikkim',
  '12': 'Arunachal Pradesh', '13': 'Nagaland', '14': 'Manipur', '15': 'Mizoram', '16': 'Tripura',
  '17': 'Meghalaya', '18': 'Assam', '19': 'West Bengal', '20': 'Jharkhand', '21': 'Odisha', '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh', '24': 'Gujarat', '25': 'Daman & Diu', '26': 'Dadra & Nagar Haveli', '27': 'Maharashtra',
  '28': 'Andhra Pradesh (old)', '29': 'Karnataka', '30': 'Goa', '31': 'Lakshadweep', '32': 'Kerala',
  '33': 'Tamil Nadu', '34': 'Puducherry', '35': 'Andaman & Nicobar', '36': 'Telangana', '37': 'Andhra Pradesh',
  '38': 'Ladakh', '97': 'Other Territory', '99': 'Other Country'
};

const stateName = code => STATE_NAMES[code] || code || '—';

/**
 * Name → code, for a spreadsheet column where somebody typed the state rather
 * than its number. Nobody importing a customer list knows that Maharashtra is
 * 27, and refusing the file over it would send them to look up thirty-eight
 * codes by hand.
 *
 * Deliberately generous about how the name is written — "TAMILNADU", "Tamil
 * Nadu", "tamil-nadu" and "Jammu and Kashmir" are all the same place, and a
 * strict match would reject a correct answer on its punctuation.
 */
const NAME_TO_CODE = new Map();
const normaliseName = value => String(value || '')
  .toLowerCase()
  .replace(/&/g, 'and')
  .replace(/[^a-z]/g, '');

for (const [code, name] of Object.entries(STATE_NAMES)) {
  NAME_TO_CODE.set(normaliseName(name), code);
}
// The spellings people actually type, which the canonical names do not cover.
const ALIASES = {
  'orissa': '21',
  'pondicherry': '34',
  'uttaranchal': '05',
  'newdelhi': '07',
  'delhincr': '07',
  'jk': '01',
  'tn': '33',
  'ap': '37',
  'andhrapradeshnew': '37',
  'dadranagarhavelianddamananddiu': '26',
  'damananddiu': '25',
  'andamanandnicobarislands': '35'
};
for (const [alias, code] of Object.entries(ALIASES)) NAME_TO_CODE.set(alias, code);

function stateCodeFromName(value) {
  return NAME_TO_CODE.get(normaliseName(value)) || null;
}

/**
 * The first two characters of a GSTIN *are* the state code — that is how the
 * number is constructed. So a row that gives a GSTIN has already given the
 * state, and asking for it twice only creates a chance for the two to disagree.
 */
function stateCodeFromGstin(gstin) {
  const code = String(gstin || '').trim().slice(0, 2);
  return STATE_NAMES[code] ? code : null;
}

module.exports = { STATE_NAMES, stateName, stateCodeFromName, stateCodeFromGstin };
