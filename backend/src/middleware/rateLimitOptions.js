const { env } = require('../config/env');

/**
 * Disables IP rate limiting under `NODE_ENV=test`.
 *
 * The integration suite registers and signs in as dozens of tenants from one
 * address, which is exactly the pattern the limiters exist to stop. Gating on
 * the test environment specifically — rather than loosening the limits — keeps
 * development and production behaviour untouched.
 *
 * Per-account lockout in authController is NOT skipped, so the tests still
 * exercise the real brute-force protection.
 */
function skipRateLimitInTests() {
  return env.NODE_ENV === 'test';
}

module.exports = { skipRateLimitInTests };
