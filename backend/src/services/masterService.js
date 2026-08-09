const { Master } = require('../models/Settings');
const { httpError } = require('../utils/httpError');

/**
 * Makes the super admin's Masters page actually mean something.
 *
 * The page has always let the platform owner edit GST rate slabs, units and
 * payment methods, but nothing read those records:
 *   - `Item.gstRate` was a hardcoded Mongoose enum `[0,5,12,18,28]`, so adding
 *     a 3% slab (real: gold and jewellery) in Masters had no effect whatsoever,
 *     and the API rejected the very value the admin had just configured.
 *   - `Item.unit` and `Payment.method` were free strings with hardcoded
 *     defaults, so the configured lists were suggestions at best.
 * The whole page was configured-but-unwired.
 *
 * Values are cached briefly because they are read on every item and payment
 * write but change perhaps a few times a year — the alternative is a Mongo
 * round-trip per line item.
 */

const CACHE_TTL_MS = 60 * 1000;
const cache = new Map(); // type -> { values: Set, labels: string[], at: number }

async function loadMaster(type) {
  const cached = cache.get(type);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached;

  const docs = await Master.find({ type, active: { $ne: false } }).sort({ sortOrder: 1 }).lean();
  const entry = {
    // `rate` for numeric masters (GST slabs), `code` or `label` for the rest.
    values: new Set(docs.map(doc => (type === 'gstRate' ? Number(doc.rate) : (doc.code || doc.label)))
      .filter(value => value !== undefined && value !== null && value !== '')),
    labels: docs.map(doc => (type === 'gstRate' ? `${doc.rate}%` : (doc.code || doc.label))),
    at: Date.now()
  };
  cache.set(type, entry);
  return entry;
}

/** Called after a masters save so the next request sees the new list. */
function invalidateMasterCache(type) {
  if (type) cache.delete(type);
  else cache.clear();
}

/**
 * Validates a value against a master list.
 *
 * Deliberately permissive when the list is empty: a deployment that has never
 * seeded masters must keep working rather than rejecting every write. That
 * makes this a guard against typos and stale client-side enums, not a security
 * boundary.
 */
async function assertValidMaster(type, value, fieldLabel) {
  if (value === undefined || value === null || value === '') return;
  const { values, labels } = await loadMaster(type);
  if (values.size === 0) return;

  const candidate = type === 'gstRate' ? Number(value) : String(value);
  if (values.has(candidate)) return;

  throw httpError(
    400,
    `${fieldLabel} "${value}" is not one of the configured options (${labels.join(', ')}).`,
    'INVALID_MASTER_VALUE'
  );
}

/** GST rate slabs currently configured, for the frontend to render as options. */
async function listMasterValues(type) {
  const { labels } = await loadMaster(type);
  return labels;
}

/**
 * The same list, but as `{ value, label }` pairs.
 *
 * `listMasterValues` returns `code || label` — the thing `assertValidMaster`
 * checks against — which is fine where the two are the same word ("Nos", "UPI")
 * and wrong where they are not. Expense categories deliberately have short
 * machine codes and readable names, and rendering the code in a dropdown both
 * looks broken and produces real damage: a user picking "salaries" files against
 * a different string than one who typed "Salaries & wages" before the list was
 * configured, and the P&L grows two lines for the same thing. That happened.
 *
 * So a caller that renders a dropdown uses this, submits `value`, and shows
 * `label`.
 */
async function listMasterOptions(type) {
  const docs = await Master.find({ type, active: { $ne: false } }).sort({ sortOrder: 1 }).lean();
  return docs
    .map(doc => ({
      value: type === 'gstRate' ? Number(doc.rate) : (doc.code || doc.label),
      label: doc.label || doc.code || '',
      description: doc.description || ''
    }))
    .filter(option => option.value !== undefined && option.value !== null && option.value !== '');
}

/** Maps stored values back to their human labels, for display in a report. */
async function labelsByValue(type) {
  const options = await listMasterOptions(type);
  return new Map(options.map(option => [String(option.value), option.label]));
}

module.exports = { assertValidMaster, invalidateMasterCache, listMasterValues, listMasterOptions, labelsByValue };
