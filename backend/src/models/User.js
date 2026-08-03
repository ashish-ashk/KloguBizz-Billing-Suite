const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  /**
   * `orgId`/`role` are superseded by `Membership` (#53, #54) and kept only as
   * the org a brand-new identity was created in — read by nothing at request
   * time once a Membership row exists (`protect` resolves the active org's
   * role from `Membership`, not from these). Migration 006 backfills one
   * Membership per existing user from exactly these two fields. A platform
   * account (`role: 'superadmin'`) never has a Membership and keeps using
   * `role` directly — it isn't a tenant identity.
   */
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', index: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: {
    type: String,
    enum: ['superadmin', 'admin', 'accountant', 'viewer'],
    default: 'viewer'
  },
  /** Which organisation to sign into by default when more than one active
   *  Membership exists — the most recently used one, so a login lands where
   *  the person was last working rather than an arbitrary membership. */
  lastActiveOrgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation' },
  status: { type: String, enum: ['active', 'invited', 'disabled'], default: 'active' },
  /**
   * Which part of the platform console a superadmin may use.
   *
   * `requireRole('superadmin')` was all-or-nothing: every platform account could
   * delete any tenant, reprice every plan and impersonate any user. That is the
   * wrong shape once more than one person does support, and it is the wrong shape
   * for an auditor who needs to read the log and nothing else.
   *
   * Ignored entirely for tenant users. `undefined` on an account that predates
   * this field resolves to 'owner' (see middleware/platformRoleMiddleware.js), so
   * an existing superadmin does not lose access the moment this ships.
   */
  platformRole: {
    type: String,
    enum: ['owner', 'billing', 'support', 'auditor'],
    default: 'owner'
  },
  // Only the SHA-256 hash of the invite/reset token is stored — the plaintext
  // lives solely in the emailed URL. See services/tokenService.js. The old
  // plaintext `inviteToken` field is gone; any invite issued before this change
  // simply stops working, which is correct because the accept flow it pointed
  // at never existed.
  inviteTokenHash: String,
  inviteTokenExpires: Date,
  invitedAt: Date,
  resetTokenHash: String,
  resetTokenExpires: Date,
  lastLoginAt: Date,
  termsAcceptedAt: Date,
  termsVersion: String,

  /**
   * Email verification (#52).
   *
   * Registration accepted any address and never checked it, so a typo'd address was
   * an account that could never receive a reset link, and a deliberately false one
   * was free to use. `emailVerifiedAt` is set at registration when no mail provider
   * is configured — there is no way to verify an address without one, and blocking
   * every local install on an email that cannot be sent would be worse than not
   * having the feature. See env.emailVerificationEnforced.
   */
  emailVerifiedAt: Date,
  emailVerifyTokenHash: String,
  emailVerifyTokenExpires: Date,
  /** The address a change was requested to, pending its own verification. */
  pendingEmail: String,

  /**
   * Two-factor authentication (#7).
   *
   * The secret is AES-256-GCM encrypted at rest (see utils/totp.js) because a stored
   * TOTP secret is a second password — anyone who can read this collection could
   * otherwise mint valid codes forever, and MFA would have bought nothing.
   *
   * `lastUsedCounter` is the replay guard: a code is valid for a 30-second step, so
   * without recording which step was consumed the same six digits work twice for
   * anyone who saw them.
   */
  mfa: {
    enabled: { type: Boolean, default: false },
    secret: String,
    lastUsedCounter: Number,
    enrolledAt: Date,
    /** SHA-256 hashes of single-use recovery codes. A lost phone must not be a
     *  permanently locked account whose only route back is support disabling the
     *  control on request. */
    backupCodes: { type: [String], default: [] },
    backupCodesGeneratedAt: Date
  },
  // Bumped on every login (and password change) to invalidate JWTs issued
  // before the bump — enforces a single active session per user.
  sessionVersion: { type: Number, default: 0 },
  // Brute-force protection. The global rate limiter is per-IP and generous
  // enough to allow hundreds of guesses; these two track the *account* so a
  // distributed attempt against one password is still stopped.
  failedLoginAttempts: { type: Number, default: 0 },
  lockedUntil: Date,
  lastFailedLoginAt: Date
}, { timestamps: true });

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ orgId: 1, role: 1 });
// Token redemption looks a user up by hash; sparse so the many users with no
// pending token don't all collide on null.
userSchema.index({ inviteTokenHash: 1 }, { sparse: true });
userSchema.index({ resetTokenHash: 1 }, { sparse: true });
userSchema.index({ emailVerifyTokenHash: 1 }, { sparse: true });

module.exports = { User: mongoose.model('User', userSchema) };
