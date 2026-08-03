const mongoose = require('mongoose');

/**
 * Links one identity (`User`) to one organisation, with a role scoped to that
 * link (#53, #54).
 *
 * Before this, `User.email` was globally unique and `User.orgId`/`User.role`
 * were fixed at creation — so one person genuinely could not belong to two
 * organisations, which is an entire customer segment (an accountant or
 * bookkeeper serving several businesses) the product simply could not serve.
 *
 * `User` keeps identity: name, password, MFA, session state. This is where
 * "which organisations, and with what role in each" lives instead. A person
 * still has exactly one email and one password — logging in resolves to one
 * `User` — but that `User` can hold any number of active memberships, and the
 * JWT names which one a given session is *for* (see authController.signToken).
 *
 * `{userId, orgId}` is the uniqueness boundary now, not `User.email` alone:
 * the same person can be invited into a second organisation without being
 * refused as "already registered" — see userController.inviteUser, which
 * links to the existing identity instead of creating a second one.
 */
const membershipSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },
  role: {
    type: String,
    enum: ['admin', 'accountant', 'viewer'],
    default: 'viewer'
  },
  // 'invited' only ever applies to a brand-new identity created solely by this
  // invite (see issueInvite) — an already-active user added to a further
  // organisation is linked as 'active' immediately, with nothing to accept.
  status: { type: String, enum: ['active', 'invited', 'disabled'], default: 'active' }
}, { timestamps: true });

membershipSchema.index({ userId: 1, orgId: 1 }, { unique: true });
membershipSchema.index({ orgId: 1, status: 1 });

module.exports = { Membership: mongoose.model('Membership', membershipSchema) };
