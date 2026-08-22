const { Organisation } = require('../models/Organisation');
const { asyncHandler } = require('../utils/asyncHandler');
const { httpError } = require('../utils/httpError');
const { logAudit } = require('../services/auditService');
const { SERIES_INFO, currentFYLabel, previewDocumentNumber } = require('../services/invoiceNumberService');

/**
 * Document numbering, per tenant.
 *
 * Every one of the five series already had a prefix and a financial-year counter
 * on `Organisation`, and **no screen anywhere let a tenant set any of them**. So
 * every business on the platform issued invoices numbered `KLG-2026-001` — the
 * platform's own initials on their tax documents, sent to their customers.
 *
 * ── Why the next number goes forward only ─────────────────────────────
 *
 * A tenant moving from another system genuinely needs to continue their existing
 * series: if they were on `AST-2026-0246` last week, restarting at 1 gives them
 * two documents with the same number across the two systems.
 *
 * Lowering it is refused. A tax invoice series must be consecutive within a
 * financial year, and re-issuing a number already used means two different
 * invoices carrying it — which has to be explained to an assessing officer and
 * cannot be fixed afterwards. Raising it leaves a gap, which is a question with
 * an answer ("we migrated"); a duplicate is a question without one.
 *
 * The counter is otherwise **not tenant-writable** — it is on the deliberate
 * exclusion list from the privilege-escalation work — so this is the one narrow
 * door, it only opens one way, and every use is audited.
 */

/** Prefixes are printed on tax documents, so the shape is constrained. */
const PREFIX_PATTERN = /^[A-Za-z0-9][A-Za-z0-9/-]{0,9}$/;

const getSeries = asyncHandler(async (req, res) => {
  const org = await Organisation.findById(req.orgId).lean();
  if (!org) throw httpError(404, 'Organisation not found');

  const fy = currentFYLabel(new Date());
  res.json({
    financialYear: fy,
    /**
     * Said out loud, because "why did my numbering restart" is otherwise a
     * support ticket every April.
     */
    note: `Numbering restarts at 1 each Indian financial year (April to March). The current year is labelled ${fy}.`,
    series: SERIES_INFO.map(info => ({
      key: info.key,
      label: info.label,
      prefix: org.brandingConfig?.[info.prefixField] || info.defaultPrefix,
      prefixField: info.prefixField,
      issuedThisYear: org[info.fyField] === fy ? (org[info.sequenceField] || 0) : 0,
      nextNumber: previewDocumentNumber(org, info.key)
    }))
  });
});

const updateSeries = asyncHandler(async (req, res) => {
  const org = await Organisation.findById(req.orgId);
  if (!org) throw httpError(404, 'Organisation not found');

  const fy = currentFYLabel(new Date());
  const changes = [];
  const branding = org.brandingConfig || {};

  for (const info of SERIES_INFO) {
    const incoming = req.body?.[info.key];
    if (!incoming) continue;

    if (incoming.prefix !== undefined) {
      const prefix = String(incoming.prefix).trim().toUpperCase();
      if (!PREFIX_PATTERN.test(prefix)) {
        throw httpError(
          400,
          `"${incoming.prefix}" is not a usable prefix for ${info.label}. Use up to ten letters, digits, hyphens or slashes — it is printed on a tax document.`,
          'BAD_PREFIX'
        );
      }
      if (prefix !== (branding[info.prefixField] || info.defaultPrefix)) {
        changes.push(`${info.key} prefix -> ${prefix}`);
      }
      branding[info.prefixField] = prefix;
    }

    if (incoming.nextNumber !== undefined && incoming.nextNumber !== null && incoming.nextNumber !== '') {
      const next = Number(incoming.nextNumber);
      if (!Number.isInteger(next) || next < 1) {
        throw httpError(400, `The next ${info.label} number must be a whole number of 1 or more.`, 'BAD_SEQUENCE');
      }

      // Counted within *this* financial year. A counter left over from a previous
      // year has already been superseded, so it is not a floor.
      const issued = org[info.fyField] === fy ? (org[info.sequenceField] || 0) : 0;
      const wouldBe = next - 1;

      if (wouldBe < issued) {
        throw httpError(
          409,
          `You have already issued ${info.label} number ${issued} this year, so the next one cannot be ${next}. `
          + 'Re-using a number would leave two documents carrying it, which cannot be undone. Numbering can be moved forward, not back.',
          'SEQUENCE_WOULD_REUSE'
        );
      }

      if (wouldBe !== issued) {
        org[info.sequenceField] = wouldBe;
        org[info.fyField] = fy;
        changes.push(`${info.key} next number -> ${next}`);
      }
    }
  }

  if (!changes.length) {
    return res.json({ ok: true, message: 'Nothing to change.', changes: [] });
  }

  org.brandingConfig = branding;
  await org.save();

  /**
   * Audited in every case, and the counter changes especially.
   *
   * Moving a numbering series is the kind of change that is invisible afterwards
   * and impossible to reconstruct — the only evidence is a gap somebody has to
   * explain, and the trail is what turns that into "we migrated on this date".
   */
  logAudit({
    req,
    action: 'org.document_series_updated',
    entity: 'organisation',
    entityId: org._id,
    meta: { changes }
  });

  const fresh = await Organisation.findById(req.orgId).lean();
  res.json({
    ok: true,
    changes,
    message: `Updated ${changes.length} numbering setting${changes.length === 1 ? '' : 's'}.`,
    series: SERIES_INFO.map(info => ({
      key: info.key,
      label: info.label,
      prefix: fresh.brandingConfig?.[info.prefixField] || info.defaultPrefix,
      issuedThisYear: fresh[info.fyField] === fy ? (fresh[info.sequenceField] || 0) : 0,
      nextNumber: previewDocumentNumber(fresh, info.key)
    }))
  });
});

module.exports = { getSeries, updateSeries };
