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
  return (req, res, next) => {
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
}

module.exports = { validate };
