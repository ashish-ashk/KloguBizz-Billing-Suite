const crypto = require('crypto');

/**
 * Single-use, expiring tokens for invite links and password resets.
 *
 * Only the SHA-256 hash is stored. A token in the database is a credential —
 * anyone who could read the collection (a backup, a log, a compromised
 * read-only account) could otherwise take over any pending invite or trigger
 * any reset. The plaintext exists only long enough to be put in the emailed
 * URL. This is the same reason password hashes are stored rather than
 * passwords, and it's why the previous `inviteToken: String` plaintext field
 * has been replaced.
 *
 * SHA-256 rather than bcrypt is deliberate: these are 32 bytes of CSPRNG
 * output, not a low-entropy human secret, so there is nothing for a slow hash
 * to protect against — and a fast hash means the token can be looked up by
 * hash in a single indexed query instead of being compared row by row.
 */

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // a week to accept an invite
const RESET_TTL_MS = 60 * 60 * 1000;           // an hour to use a reset link

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

/** Returns the plaintext token for the URL and the hash to persist. */
function createToken() {
  const token = crypto.randomBytes(32).toString('base64url');
  return { token, hash: hashToken(token) };
}

function expiryFromNow(ttlMs) {
  return new Date(Date.now() + ttlMs);
}

/**
 * Compares a supplied token against a stored hash in constant time, so a
 * near-miss can't be distinguished from a wild guess by response timing.
 */
function tokenMatches(token, storedHash) {
  if (!token || !storedHash) return false;
  const supplied = Buffer.from(hashToken(token), 'utf8');
  const stored = Buffer.from(String(storedHash), 'utf8');
  if (supplied.length !== stored.length) return false;
  return crypto.timingSafeEqual(supplied, stored);
}

module.exports = { createToken, hashToken, tokenMatches, expiryFromNow, INVITE_TTL_MS, RESET_TTL_MS };
