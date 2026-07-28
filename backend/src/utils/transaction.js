const mongoose = require('mongoose');
const { logger } = require('./logger');

/**
 * Transactions, when the deployment can actually run them.
 *
 * MongoDB only supports multi-document transactions on a replica set or a
 * sharded cluster. Atlas (production) is always a replica set; the local
 * `docker-compose` / Windows-service MongoDB used for development is a
 * standalone, where `withTransaction` throws
 * "Transaction numbers are only allowed on a replica set member or mongos".
 *
 * Writing `session.withTransaction(...)` unconditionally would therefore make
 * every multi-collection operation fail on a developer's machine while passing
 * in production — the worst possible split. These helpers ask the server once
 * what it is and hand back a session only when one is usable, so the calling
 * code takes the atomic path in production and a documented best-effort path
 * locally.
 *
 * Callers must not treat the fallback as equivalent: an operation that needs
 * atomicity for correctness should be *ordered* so that an interruption leaves
 * a recoverable state (write the new rows before deleting the old ones), which
 * is what makes the non-transactional path acceptable at all.
 */

let supportsTransactions = null;

async function detectTransactionSupport() {
  if (supportsTransactions !== null) return supportsTransactions;
  try {
    const info = await mongoose.connection.db.admin().command({ hello: 1 });
    // `setName` = replica set member. `msg: 'isdbgrid'` = mongos (sharded).
    supportsTransactions = Boolean(info.setName) || info.msg === 'isdbgrid';
  } catch (error) {
    logger.debug('could not determine transaction support', { reason: error.message });
    supportsTransactions = false;
  }
  if (!supportsTransactions) {
    logger.warn('MongoDB is a standalone — multi-document writes will run without a transaction');
  }
  return supportsTransactions;
}

/** A session ready for `withTransaction`, or null when the server has no support. */
async function startSessionIfSupported() {
  if (mongoose.connection.readyState !== 1) return null;
  if (!(await detectTransactionSupport())) return null;
  return mongoose.startSession();
}

/**
 * Runs `work(session)` in a transaction where possible, and plainly
 * (`work(null)`) where not. Returns whatever `work` returns, plus whether it was
 * atomic, so a caller can log or report the difference honestly.
 */
async function withTransaction(work) {
  const session = await startSessionIfSupported();
  if (!session) return { result: await work(null), atomic: false };
  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return { result, atomic: true };
  } finally {
    await session.endSession();
  }
}

// Exposed for tests, which switch between database deployments.
function resetTransactionSupportCache() {
  supportsTransactions = null;
}

module.exports = { startSessionIfSupported, withTransaction, resetTransactionSupportCache };
