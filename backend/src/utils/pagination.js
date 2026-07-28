/**
 * Server-side pagination for list endpoints.
 *
 * Every list endpoint used to return its entire collection — `listInvoices`,
 * `listPayments`, `listClients`, `listItems` and the super-admin
 * `listOrganisations` all did a bare `find()` with no bound at all. That is fine
 * with the seed data and an OOM with a real book: a tenant with 50,000 invoices
 * would have every document, every embedded line item and every populated client
 * serialised into one JSON response on every page view.
 *
 * The response is always the same envelope, so a caller never has to guess
 * whether it got everything:
 *
 *   { data: [...], page, limit, total, pages, hasMore }
 *
 * `total` is what makes it honest — a client can always tell it is looking at a
 * window rather than the whole set, which a bare truncated array cannot express.
 */

const DEFAULT_LIMIT = 50;
// The ceiling exists so `?limit=1000000` cannot reintroduce the unbounded read
// this module was written to remove.
const MAX_LIMIT = 200;

/**
 * Reads `?page` / `?limit` off a query string, clamped to something a database
 * can serve. Anything unparseable falls back to the default rather than
 * erroring — a malformed page number is not worth failing a read over.
 */
function parsePageParams(query = {}, { defaultLimit = DEFAULT_LIMIT, maxLimit = MAX_LIMIT } = {}) {
  const rawPage = Number(query.page);
  const rawLimit = Number(query.limit);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;
  const limit = Number.isFinite(rawLimit) && rawLimit >= 1
    ? Math.min(Math.floor(rawLimit), maxLimit)
    : defaultLimit;
  return { page, limit, skip: (page - 1) * limit };
}

function buildEnvelope(data, { page, limit, total }) {
  const pages = limit > 0 ? Math.max(1, Math.ceil(total / limit)) : 1;
  return {
    data,
    page,
    limit,
    total,
    pages,
    hasMore: page < pages
  };
}

/**
 * Runs a bounded find plus its matching count and returns the envelope.
 *
 * `decorate` receives the freshly-built query so a caller can chain the
 * `.populate()` / `.select()` / `.sort()` / `.lean()` it needs; `skip` and
 * `limit` are applied afterwards so they can't be chained away by accident.
 * The count uses the same filter, so `total` always describes the same set the
 * page was drawn from.
 */
async function paginate(Model, filter, query, decorate = q => q) {
  const { page, limit, skip } = parsePageParams(query);
  const [data, total] = await Promise.all([
    decorate(Model.find(filter)).skip(skip).limit(limit),
    Model.countDocuments(filter)
  ]);
  return buildEnvelope(data, { page, limit, total });
}

/**
 * Escapes a user-supplied search term for use inside a `$regex`.
 *
 * Without this, a `q` of `(` is an invalid expression (a 500) and `.*` is a full
 * collection scan dressed up as a search. Both were reachable through the
 * existing `?q=` on the invoice list.
 */
function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Turns `?sort=field` / `?sort=-field` into a Mongoose sort object, but only for
 * fields the endpoint has explicitly allowed. An open sort parameter is an
 * invitation to sort by an unindexed field, which is a full in-memory sort on
 * the database.
 */
function parseSort(query = {}, allowed = [], fallback = { createdAt: -1 }) {
  const raw = typeof query.sort === 'string' ? query.sort.trim() : '';
  if (!raw) return fallback;
  const descending = raw.startsWith('-');
  const field = descending ? raw.slice(1) : raw;
  if (!allowed.includes(field)) return fallback;
  return { [field]: descending ? -1 : 1 };
}

module.exports = {
  DEFAULT_LIMIT,
  MAX_LIMIT,
  parsePageParams,
  buildEnvelope,
  paginate,
  escapeRegex,
  parseSort
};
