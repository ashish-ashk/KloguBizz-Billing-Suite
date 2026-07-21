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
  inviteToken: String,
  lastLoginAt: Date,
  termsAcceptedAt: Date,
  termsVersion: String,
  // Bumped on every login (and password change) to invalidate JWTs issued
  // before the bump — enforces a single active session per user.
  sessionVersion: { type: Number, default: 0 }
}, { timestamps: true });

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ orgId: 1, role: 1 });

module.exports = { User: mongoose.model('User', userSchema) };
