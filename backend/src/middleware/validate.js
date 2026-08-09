const { httpError } = require('../utils/httpError');

/**
 * Route-level request validation.
 *
 * `zod` was already a dependency but was never imported anywhere, so every
 * controller trusted whatever shape arrived. That mattered most for money:
 * `items: [{ qty: "abc" }]` coerced to NaN and a NaN total was persisted,
 * which then broke the PDF, the CSV export and the GST report with no clue
 * where the bad data came from.
 *
 * The parsed (and coerced) result replaces req.body, so controllers work with
 * validated numbers and dates rather than raw strings.
 */
function validate(schema, source = 'body') {
  const middleware = (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      // Flatten to `field: message` pairs — the frontend shows the first one,
      // and the whole set is useful in logs.
      const details = result.error.issues.map(issue => ({
        field: issue.path.join('.') || source,
        message: issue.message
      }));
      const summary = details.length === 1
        ? `${details[0].field}: ${details[0].message}`
        : `${details.length} fields are invalid`;
      const error = httpError(400, summary, 'VALIDATION_ERROR');
      error.details = details;
      return next(error);
    }
    req[source] = result.data;
    next();
  };

  /**
   * The schema is tagged onto the middleware itself (#63).
   *
   * This is what makes the API documentation generated rather than written. The
   * spec builder walks Express's own router stack, finds the middleware carrying
   * a schema, and converts it — so the docs describe what the server actually
   * enforces, and cannot drift from it, because there is only one definition.
   *
   * The corollary is the more valuable half: a route with no schema shows up in
   * the generated spec as **undocumented**, by name. A hand-written document
   * cannot tell you what it is missing.
   */
  middleware.zodSchema = schema;
  middleware.zodSource = source;
  return middleware;
}

/**
 * Marks a route whose body is validated by something other than a zod schema.
 *
 * There is exactly one today: `PUT /superadmin/settings/:key`, whose shape
 * depends on the *path parameter* — `assertValidSetting` dispatches to a
 * per-setting schema, and no single zod object can express "the body is whatever
 * this key says it is".
 *
 * Rather than leave it sitting in the generated document's gap list, where it
 * would read as an unvalidated route forever and train people to ignore that
 * list, it is tagged with the reason. The document then says what is true: this
 * is validated, by a different mechanism, and here is which one.
 */
function validatedElsewhere(by) {
  const middleware = (req, res, next) => next();
  middleware.validatedElsewhere = by;
  return middleware;
}

module.exports = { validate, validatedElsewhere };
