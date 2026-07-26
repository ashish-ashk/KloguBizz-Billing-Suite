const { Organisation } = require('../models/Organisation');

// Indian financial year: 1 Apr – 31 Mar. Labelled by its starting calendar
// year (e.g. '2026' for FY2026-27), which is also what shows up in the
// invoice number itself — so numbers read as a clean per-FY sequence
// ("KLG-2026-001" onward, then reset the moment April rolls around) rather
// than a calendar year that changes mid-FY out of sync with the count.
function currentFYLabel(date) {
  const y = date.getFullYear();
  const m = date.getMonth(); // 0 = Jan
  return String(m >= 3 ? y : y - 1);
}

/**
 * Atomically returns the next invoice number for an org, formatted
 * `PREFIX-FYSTARTYEAR-NNN`. Single aggregation-pipeline update — the
 * increment-vs-reset decision happens inside MongoDB itself, so there's no
 * read-then-write window for a concurrent request to race through:
 *   - Same FY as last time (the common case): sequence + 1.
 *   - Never tagged with a FY before (an org that existed before this field
 *     was added): tag it with the current FY and increment the count it
 *     already has, rather than resetting to 1 — an org with real invoice
 *     history must not have its counter zeroed out, or the next few numbers
 *     it issues would collide with ones it already gave out.
 *   - Tagged with a *past* FY: a genuine rollover, safe to reset to 1.
 */
async function nextInvoiceNumber(orgId) {
  const fy = currentFYLabel(new Date());
  const org = await Organisation.findOneAndUpdate(
    { _id: orgId },
    [
      {
        $set: {
          invoiceSequence: {
            $cond: [
              { $eq: ['$invoiceSequenceFY', fy] },
              { $add: [{ $ifNull: ['$invoiceSequence', 0] }, 1] },
              {
                $cond: [
                  { $eq: [{ $ifNull: ['$invoiceSequenceFY', null] }, null] },
                  { $add: [{ $ifNull: ['$invoiceSequence', 0] }, 1] },
                  1
                ]
              }
            ]
          },
          invoiceSequenceFY: fy
        }
      }
    ],
    { new: true }
  );
  if (!org) throw new Error('Organisation not found');
  const prefix = org.brandingConfig?.invoicePrefix || 'KLG';
  return `${prefix}-${fy}-${String(org.invoiceSequence).padStart(3, '0')}`;
}

module.exports = { nextInvoiceNumber, currentFYLabel };
