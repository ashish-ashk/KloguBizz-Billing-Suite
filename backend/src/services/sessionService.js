const crypto = require('crypto');
const { Session } = require('../models/Session');
const { User } = require('../models/User');
const { httpError } = require('../utils/httpError');

/** How long a login chain stays valid without a fresh sign-in, no matter how
 *  often it is refreshed. */
const REFRESH_TOKEN_TTL_DAYS = 30;
/** How long the access token minted alongside a refresh token lives. Short,
 *  because it is what `protect` trusts on every request with no DB lookup —
 *  the refresh round trip is where revocation actually takes effect. */
const ACCESS_TOKEN_TTL = '15m';
const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function newRefreshToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function deviceInfo(req) {
  return {
    userAgent: req?.headers?.['user-agent'] ? String(req.headers['user-agent']).slice(0, 300) : undefined,
    ip: req?.ip
  };
}

/**
 * Starts a new login chain: a fresh family, a fresh refresh token, a fresh
 * 30-day cap. Called only where the frontend actually stores a session
 * (login, invite acceptance, MFA verification, switch-org) — `register` does
 * not call this, matching that it never auto-authenticates.
 *
 * `orgId` is passed explicitly rather than read off `user.orgId` — since
 * memberships (#53, #54) a user's org is a property of *this* session, not of
 * the identity, and the caller has already resolved which membership the
 * token is for.
 */
async function createSession({ user, req, orgId }) {
  const refreshToken = newRefreshToken();
  const family = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 86400000);
  const { userAgent, ip } = deviceInfo(req);
  const session = await Session.create({
    userId: user._id,
    orgId: orgId ?? null,
    family,
    refreshTokenHash: hashToken(refreshToken),
    userAgent,
    ip,
    expiresAt
  });
  return { refreshToken, session };
}

/**
 * Verifies a refresh token and, if it checks out, rotates it: the presented
 * token is revoked and a new one is issued in the same family with the same
 * absolute expiry.
 *
 * A token that resolves to an *already revoked* row is reuse — the previous
 * holder already rotated past it, so whoever is presenting it now is not the
 * legitimate chain. The whole family is revoked and every access token for
 * this user is killed via `sessionVersion`, on the assumption that a stolen
 * refresh token may already have been used to mint one.
 */
async function rotateSession({ refreshToken, req }) {
  const hash = hashToken(refreshToken);
  const session = await Session.findOne({ refreshTokenHash: hash });
  if (!session) throw httpError(401, 'Your session could not be renewed. Please sign in again.', 'REFRESH_INVALID');

  if (session.revokedAt) {
    await Session.updateMany(
      { userId: session.userId, family: session.family, revokedAt: null },
      { revokedAt: new Date(), revokedReason: 'reuse_detected' }
    );
    await User.updateOne({ _id: session.userId }, { $inc: { sessionVersion: 1 } });
    throw httpError(401, 'This session was used from somewhere unexpected and has been ended for your safety. Please sign in again.', 'REFRESH_REUSE_DETECTED');
  }

  if (session.expiresAt < new Date()) {
    throw httpError(401, 'Your session has expired. Please sign in again.', 'REFRESH_EXPIRED');
  }

  const user = await User.findById(session.userId);
  if (!user || user.status !== 'active') {
    throw httpError(401, 'Invalid or inactive user', 'REFRESH_INVALID');
  }

  const refreshTokenNext = newRefreshToken();
  const { userAgent, ip } = deviceInfo(req);
  const next = await Session.create({
    userId: session.userId,
    orgId: session.orgId,
    family: session.family,
    refreshTokenHash: hashToken(refreshTokenNext),
    userAgent,
    ip,
    // The cap is inherited, not extended — rotating never buys more than the
    // original 30 days from sign-in.
    expiresAt: session.expiresAt
  });
  session.revokedAt = new Date();
  session.revokedReason = 'rotated';
  session.replacedBy = next._id;
  await session.save();

  return { user, session: next, refreshToken: refreshTokenNext };
}

/** Revokes one refresh token outright (user-initiated sign-out). Idempotent —
 *  signing out twice, or signing out after the token already expired, is not
 *  an error. */
async function revokeByToken(refreshToken, reason = 'logout') {
  if (!refreshToken) return;
  await Session.updateOne(
    { refreshTokenHash: hashToken(refreshToken), revokedAt: null },
    { revokedAt: new Date(), revokedReason: reason }
  );
}

/** Revokes every live session for a user — the refresh-token half of every
 *  existing `sessionVersion` bump. Without this, a "force logout" or a
 *  disabled account could simply call `/auth/refresh` and mint a fresh access
 *  token carrying the new `sessionVersion`, undoing the revocation. */
async function revokeAllForUser(userId, reason = 'admin_revoked') {
  return Session.updateMany({ userId, revokedAt: null }, { revokedAt: new Date(), revokedReason: reason });
}

async function revokeAllForOrg(orgId, reason = 'admin_revoked') {
  return Session.updateMany({ orgId, revokedAt: null }, { revokedAt: new Date(), revokedReason: reason });
}

/** Active sessions for a user's device-list UI, most recently used first. */
async function listActiveSessions(userId) {
  return Session.find({ userId, revokedAt: null, expiresAt: { $gt: new Date() } })
    .select('userAgent ip lastSeenAt createdAt expiresAt')
    .sort({ lastSeenAt: -1 })
    .lean();
}

/** Revokes one session by id, only if it belongs to the caller. */
async function revokeOwnSession(userId, sessionId, reason = 'user_revoked') {
  const result = await Session.updateOne(
    { _id: sessionId, userId, revokedAt: null },
    { revokedAt: new Date(), revokedReason: reason }
  );
  if (!result.matchedCount) throw httpError(404, 'Session not found');
}

module.exports = {
  createSession, rotateSession, revokeByToken,
  revokeAllForUser, revokeAllForOrg, listActiveSessions, revokeOwnSession,
  hashToken, ACCESS_TOKEN_TTL, ACCESS_TOKEN_TTL_SECONDS, REFRESH_TOKEN_TTL_DAYS
};
