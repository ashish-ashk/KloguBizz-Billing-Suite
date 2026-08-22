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
  },
  /**
   * The three pre-invoice documents (2.2 #11–#13).
   *
   * Each gets its own counter for the same reason a credit note does: a shared
   * sequence would interleave quotations with tax invoices and leave visible
   * gaps in the invoice series, which is exactly what an auditor reads as a
   * missing document. None of these is a tax invoice, so GST does not *require*
   * a series per type here — but a tenant who numbers a quotation the same as
   * an invoice has a filing problem of their own making, and the cost of
   * separate counters is one field each.
   */
  quotation: {
    sequenceField: 'quotationSequence',
    fyField: 'quotationSequenceFY',
    defaultPrefix: 'QT',
    prefixFrom: org => org.brandingConfig?.quotationPrefix
  },
  proforma: {
    sequenceField: 'proformaSequence',
    fyField: 'proformaSequenceFY',
    defaultPrefix: 'PI',
    prefixFrom: org => org.brandingConfig?.proformaPrefix
  },
  deliveryChallan: {
    sequenceField: 'deliveryChallanSequence',
    fyField: 'deliveryChallanSequenceFY',
    defaultPrefix: 'DC',
    prefixFrom: org => org.brandingConfig?.deliveryChallanPrefix
  }
};

/** Maps a `SalesDocument.kind` to its series name. Kept here so the model's
 *  vocabulary and the counter's cannot drift apart. */
const SERIES_FOR_KIND = {
  quotation: 'quotation',
  proforma: 'proforma',
  'delivery-challan': 'deliveryChallan'
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

/**
 * The series, described for a screen.
 *
 * Derived from `SERIES` rather than retyped, so a new document type cannot appear
 * in the numbering settings without its counter, or vice versa. Labels are the
 * words a tenant uses, not the internal keys.
 */
const SERIES_INFO = [
  { key: 'invoice', label: 'invoice', prefixField: 'invoicePrefix' },
  { key: 'creditNote', label: 'credit note', prefixField: 'creditNotePrefix' },
  { key: 'quotation', label: 'quotation', prefixField: 'quotationPrefix' },
  { key: 'proforma', label: 'proforma invoice', prefixField: 'proformaPrefix' },
  { key: 'deliveryChallan', label: 'delivery challan', prefixField: 'deliveryChallanPrefix' }
].map(entry => ({
  ...entry,
  sequenceField: SERIES[entry.key].sequenceField,
  fyField: SERIES[entry.key].fyField,
  defaultPrefix: SERIES[entry.key].defaultPrefix
}));

/**
 * What the next number *would* be, without taking it.
 *
 * A preview must not consume a number: showing somebody what their next invoice
 * will be numbered would otherwise burn that number and leave a gap, which is the
 * one thing a consecutive series must not have.
 */
function previewDocumentNumber(org, seriesName) {
  const series = SERIES[seriesName];
  if (!series) throw new Error(`Unknown document series: ${seriesName}`);
  const fy = currentFYLabel(new Date());
  const issued = org[series.fyField] === fy ? (org[series.sequenceField] || 0) : 0;
  return formatDocumentNumber(org, series, fy, issued + 1);
}

/** Kept as the invoice-specific entry point used throughout the codebase. */
async function nextInvoiceNumber(orgId) {
  return nextDocumentNumber(orgId, 'invoice');
}

async function nextCreditNoteNumber(orgId) {
  return nextDocumentNumber(orgId, 'creditNote');
}

/** Next number for a `SalesDocument` of the given kind (2.2 #11–#13). */
async function nextSalesDocumentNumber(orgId, kind) {
  const series = SERIES_FOR_KIND[kind];
  if (!series) throw new Error(`Unknown sales-document kind: ${kind}`);
  return nextDocumentNumber(orgId, series);
}

module.exports = {
  nextInvoiceNumber,
  nextCreditNoteNumber,
  nextSalesDocumentNumber,
  nextDocumentNumber,
  currentFYLabel,
  formatDocumentNumber,
  resolvePadding,
  SERIES,
  SERIES_FOR_KIND,
  SERIES_INFO,
  previewDocumentNumber
};
