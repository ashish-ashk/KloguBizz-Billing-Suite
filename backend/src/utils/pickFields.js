/**
 * Mass-assignment guard.
 *
 * Several controllers used to pass `req.body` straight into
 * `findOneAndUpdate`, which let a caller set any field the schema happened to
 * have — including `role: 'superadmin'` and `plan: 'enterprise'`. Every update
 * path now names the fields it accepts, and anything else in the body is
 * dropped rather than silently written.
 *
 * `undefined` values are omitted so a partial update (the frontend sends only
 * the fields a form touched) never blanks out an unrelated column.
 */
function pickFields(body, allowed) {
  const out = {};
  if (!body || typeof body !== 'object') return out;
  for (const key of allowed) {
    if (body[key] !== undefined) out[key] = body[key];
  }
  return out;
}

module.exports = { pickFields };
