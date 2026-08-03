const mongoose = require('mongoose');

/**
 * A refresh-token registry (#50, #51).
 *
 * `sessionVersion` on `User` is a counter, not a registry — it can invalidate
 * every session at once but cannot name a single one, so there was nowhere to
 * build a device list or to detect a stolen refresh token being replayed.
 *
 * Only the SHA-256 hash of the refresh token is stored, same reasoning as
 * services/tokenService.js: these are 32 bytes of CSPRNG output, so a fast hash
 * is enough and it means the token can be looked up in one indexed query.
 *
 * `family` groups the chain of tokens produced by rotating a single login.
 * Rotation revokes the old row and inserts a new one in the same family rather
 * than mutating in place, so a *previously revoked* token being presented again
 * is distinguishable from an unknown one — that is the reuse signal. When it
 * fires, the whole family is revoked because a stolen token might already have
 * been used to mint a still-valid access token.
 */
const sessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', index: true },
  family: { type: String, required: true, index: true },
  refreshTokenHash: { type: String, required: true },
  userAgent: String,
  ip: String,
  lastSeenAt: { type: Date, default: Date.now },
  // The absolute cap on this login chain's lifetime, carried forward unchanged
  // across every rotation within the family — a device that keeps refreshing
  // still has to re-authenticate after this, rather than staying signed in
  // forever on a sliding window.
  expiresAt: { type: Date, required: true },
  revokedAt: Date,
  revokedReason: { type: String, enum: ['rotated', 'logout', 'reuse_detected', 'admin_revoked', 'user_revoked', 'password_changed'] },
  replacedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Session' }
}, { timestamps: true });

sessionSchema.index({ refreshTokenHash: 1 }, { unique: true });
sessionSchema.index({ userId: 1, revokedAt: 1 });
// Auto-purged 30 days after the session's own cap lapses — long enough to
// investigate a reuse incident, not a permanent audit record (AuditLog is that).
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = { Session: mongoose.model('Session', sessionSchema) };
