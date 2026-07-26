const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', index: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: {
    type: String,
    enum: ['superadmin', 'admin', 'accountant', 'viewer'],
    default: 'viewer'
  },
  status: { type: String, enum: ['active', 'invited', 'disabled'], default: 'active' },
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

module.exports = { User: mongoose.model('User', userSchema) };
