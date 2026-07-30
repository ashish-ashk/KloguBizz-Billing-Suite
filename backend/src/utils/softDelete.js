/**
 * Soft delete and the recycle bin (#37).
 *
 * Clients, items and draft invoices were hard-deleted with no undo: one mis-click
 * and a customer record with a decade of history was gone. The workaround people
 * actually use for this — never deleting anything and letting the list fill with
 * junk — is worse, because it makes the list useless *and* still loses nothing.
 *
 * The contract is deliberately small, because the risk in a soft delete is not the
 * delete, it is every query that forgets about it:
 *
 *  - `notDeleted(req)` is the tenant filter **plus** the deleted-rows exclusion, and
 *    is what every list, lookup and count should use. A row that was deleted but is
 *    still returned by a report is worse than a hard delete, because the numbers are
 *    now wrong in a way nobody can see.
 *  - `withDeleted(req, query)` opts back in, for the recycle bin only.
 *  - Deleted rows are purged after `GRACE_DAYS` by the maintenance scheduler, so the
 *    bin does not become permanent storage.
 *
 * **`deletedAt: null` vs missing.** Every model here declares `default: null`, so a
 * new row has the field. But rows written before the field existed do *not*, and in
 * MongoDB a missing field is not equal to null for every operator — the filter is
 * therefore `{ deletedAt: null }`, which matches both a stored null and an absent
 * field, rather than `{ deletedAt: { $exists: false } }`, which would hide every
 * pre-existing row from every list. This is the same trap Phase 3 hit with
 * `dueDate` in an aggregation, in its query-language form.
 */

const { tenantFilter } = require('../middleware/tenantMiddleware');

/** How long a deleted row is recoverable before it is purged for real. */
const GRACE_DAYS = Number(process.env.SOFT_DELETE_GRACE_DAYS ?? 30);

/** Tenant-scoped filter that excludes deleted rows. The default for every read. */
function notDeleted(req, extra = {}) {
  return { ...tenantFilter(req), deletedAt: null, ...extra };
}

/** Tenant-scoped filter for deleted rows only — the recycle bin. */
function onlyDeleted(req, extra = {}) {
  return { ...tenantFilter(req), deletedAt: { $ne: null }, ...extra };
}

/**
 * Honours `?includeDeleted=1` on a list endpoint.
 *
 * Opt-in rather than opt-out: a caller that forgets the parameter gets the safe
 * answer, which is the one without deleted rows in it.
 */
function scopeFilter(req, extra = {}) {
  const scope = String(req.query?.deleted ?? '').toLowerCase();
  if (scope === 'only' || scope === '1' || scope === 'true') return onlyDeleted(req, extra);
  if (scope === 'all') return { ...tenantFilter(req), ...extra };
  return notDeleted(req, extra);
}

/** The `$set` that marks a row deleted, stamped with who did it. */
function deletionPatch(req) {
  return { deletedAt: new Date(), deletedBy: req.user?.name || req.user?.email || '' };
}

/** The `$set` that brings it back. */
const RESTORE_PATCH = { deletedAt: null, deletedBy: '' };

/** The cutoff before which a deleted row is past its grace period. */
function purgeCutoff() {
  return new Date(Date.now() - GRACE_DAYS * 86400000);
}

module.exports = {
  GRACE_DAYS,
  notDeleted,
  onlyDeleted,
  scopeFilter,
  deletionPatch,
  RESTORE_PATCH,
  purgeCutoff
};
