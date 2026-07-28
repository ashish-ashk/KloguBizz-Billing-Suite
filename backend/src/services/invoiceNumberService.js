const { Organisation } = require('../models/Organisation');

// Indian financial year: 1 Apr – 31 Mar. Labelled by its starting calendar
// year (e.g. '2026' for FY2026-27), which is also what shows up in the
// document number itself — so numbers read as a clean per-FY sequence
// ("KLG-2026-001" onward, then reset the moment April rolls around) rather
// than a calendar year that changes mid-FY out of sync with the count.
function currentFYLabel(date) {
  const y = date.getFullYear();
  const m = date.getMonth(); // 0 = Jan
  return String(m >= 3 ? y : y - 1);
}

/**
 * Document series an organisation issues.
 *
 * Each series keeps its own counter, because GST requires a distinct,
 * consecutive numbering series per document type — a credit note must not share
 * a sequence with a tax invoice.
 */
const SERIES = {
  invoice: {
    sequenceField: 'invoiceSequence',
    fyField: 'invoiceSequenceFY',
    defaultPrefix: 'KLG',
    prefixFrom: org => org.brandingConfig?.invoicePrefix
  },
  creditNote: {
    sequenceField: 'creditNoteSequence',
    fyField: 'creditNoteSequenceFY',
    defaultPrefix: 'CN',
    prefixFrom: org => org.brandingConfig?.creditNotePrefix
  }
};

/**
 * Atomically returns the next number in a series, formatted
 * `PREFIX-FYSTARTYEAR-NNN`.
 *
 * A single aggregation-pipeline update, so the increment-vs-reset decision
 * happens inside MongoDB itself and there is no read-then-write window for a
 * concurrent request to race through:
 *   - Same FY as last time (the common case): sequence + 1.
 *   - Never tagged with a FY before (an org that existed before this field was
 *     added, or a series being used for the first time): tag it with the
 *     current FY and increment the count it already has, rather than resetting
 *     to 1 — an org with real history must not have its counter zeroed out, or
 *     the next few numbers it issues would collide with ones already given out.
 *   - Tagged with a *past* FY: a genuine rollover, safe to reset to 1.
 */
async function nextDocumentNumber(orgId, seriesName = 'invoice') {
  const series = SERIES[seriesName];
  if (!series) throw new Error(`Unknown document series: ${seriesName}`);

  const fy = currentFYLabel(new Date());
  const { sequenceField, fyField } = series;

  const org = await Organisation.findOneAndUpdate(
    { _id: orgId },
    [
      {
        $set: {
          [sequenceField]: {
            $cond: [
              { $eq: [`$${fyField}`, fy] },
              { $add: [{ $ifNull: [`$${sequenceField}`, 0] }, 1] },
              {
                $cond: [
                  { $eq: [{ $ifNull: [`$${fyField}`, null] }, null] },
                  { $add: [{ $ifNull: [`$${sequenceField}`, 0] }, 1] },
                  1
                ]
              }
            ]
          },
          [fyField]: fy
        }
      }
    ],
    { new: true }
  );
  if (!org) throw new Error('Organisation not found');

  return formatDocumentNumber(org, series, fy, org[sequenceField]);
}

/**
 * How many digits the counter is padded to.
 *
 * Was hardcoded to 3, so a tenant issuing their 1000th invoice of a financial
 * year jumped from `KLG-2026-999` to `KLG-2026-1000` — the format visibly
 * changes mid-series, which looks like a different numbering scheme to a customer
 * and to an auditor. It is now configurable, and the padding never *shrinks* a
 * number: once past the configured width the digits simply continue, because
 * truncating an invoice number would be far worse than an inconsistent width.
 */
const DEFAULT_PADDING = 3;
const MIN_PADDING = 1;
const MAX_PADDING = 10;

function resolvePadding(org) {
  const configured = Number(org.brandingConfig?.invoiceNumberPadding);
  if (!Number.isInteger(configured)) return DEFAULT_PADDING;
  return Math.min(Math.max(configured, MIN_PADDING), MAX_PADDING);
}

function formatDocumentNumber(org, series, fy, sequence) {
  const prefix = series.prefixFrom(org) || series.defaultPrefix;
  const suffix = org.brandingConfig?.invoiceNumberSuffix || '';
  const number = String(sequence).padStart(resolvePadding(org), '0');
  return `${prefix}-${fy}-${number}${suffix}`;
}

/** Kept as the invoice-specific entry point used throughout the codebase. */
async function nextInvoiceNumber(orgId) {
  return nextDocumentNumber(orgId, 'invoice');
}

async function nextCreditNoteNumber(orgId) {
  return nextDocumentNumber(orgId, 'creditNote');
}

module.exports = {
  nextInvoiceNumber,
  nextCreditNoteNumber,
  nextDocumentNumber,
  currentFYLabel,
  formatDocumentNumber,
  resolvePadding,
  SERIES
};
