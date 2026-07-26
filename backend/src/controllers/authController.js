const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const { Organisation } = require('../models/Organisation');
const { User } = require('../models/User');
const { Subscription } = require('../models/Subscription');
const { asyncHandler } = require('../utils/asyncHandler');
const { httpError } = require('../utils/httpError');
const { logAudit } = require('../services/auditService');
const { CURRENT_TERMS_VERSION } = require('../config/legal');

function signToken(user) {
  return jwt.sign(
    { sub: user._id, role: user.role, orgId: user.orgId, sv: user.sessionVersion || 0 },
    env.JWT_SECRET,
    { expiresIn: '12h' }
  );
}

function authPayload(user, organisation) {
  return {
    token: signToken(user),
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status
    },
    organisation
  };
}

const register = asyncHandler(async (req, res) => {
  const { name, email, password, orgName, stateCode = '27', acceptTerms } = req.body;
  if (!name || !email || !password || !orgName) {
    throw httpError(400, 'name, email, password, and orgName are required');
  }
  if (acceptTerms !== true) {
    throw httpError(400, 'You must accept the Terms & Conditions and SLA to create an account');
  }
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) throw httpError(409, 'Email already registered');

  const organisation = await Organisation.create({
    name: orgName,
    adminEmail: email,
    stateCode,
    status: 'trial'
  });
  const user = await User.create({
    orgId: organisation._id,
    name,
    email,
    passwordHash: await bcrypt.hash(password, 12),
    role: 'admin',
    status: 'active',
    termsAcceptedAt: new Date(),
    termsVersion: CURRENT_TERMS_VERSION
  });

  // The registering user is the org's canonical owner from day one.
  organisation.ownerId = user._id;
  await organisation.save();
  await Subscription.create({ orgId: organisation._id, planCode: 'starter', status: 'trial' });

  logAudit({ req: { orgId: organisation._id, user }, action: 'user.terms_accepted', entity: 'user', entityId: user._id, meta: { termsVersion: CURRENT_TERMS_VERSION } });

  res.status(201).json(authPayload(user, organisation));
});

// Account lockout thresholds. The global per-IP rate limiter still allows
// hundreds of attempts per window and does nothing against a distributed
// attempt, so the account itself has to keep score.
const MAX_FAILED_ATTEMPTS = 8;
const LOCKOUT_MINUTES = 15;
// Failures older than this stop counting, so an honest user who mistyped their
// password last week doesn't start today one attempt from a lockout.
const ATTEMPT_WINDOW_MINUTES = 60;

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: String(email || '').toLowerCase() });
  // Deliberately the same message and code path for an unknown address as for
  // a wrong password, so this endpoint can't be used to enumerate accounts.
  if (!user) throw httpError(401, 'Invalid email or password');

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const minutes = Math.max(1, Math.ceil((user.lockedUntil - Date.now()) / 60000));
    throw httpError(
      429,
      `Too many failed sign-in attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
      'ACCOUNT_LOCKED'
    );
  }

  const ok = await bcrypt.compare(password || '', user.passwordHash);
  if (!ok) {
    // Stale failures are discarded rather than accumulated forever.
    const windowStart = Date.now() - ATTEMPT_WINDOW_MINUTES * 60000;
    const recent = user.lastFailedLoginAt && user.lastFailedLoginAt.getTime() > windowStart;
    user.failedLoginAttempts = (recent ? user.failedLoginAttempts || 0 : 0) + 1;
    user.lastFailedLoginAt = new Date();
    if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
      user.lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60000);
      user.failedLoginAttempts = 0;
    }
    await user.save();
    logAudit({ req: { user }, action: 'auth.login_failed', entity: 'user', entityId: user._id, meta: { email: user.email, locked: Boolean(user.lockedUntil && user.lockedUntil > new Date()) } });
    throw httpError(401, 'Invalid email or password');
  }

  user.failedLoginAttempts = 0;
  user.lockedUntil = undefined;
  user.lastFailedLoginAt = undefined;
  user.lastLoginAt = new Date();
  // Invalidate any tokens issued to this user before now — one active
  // session per user; signing in elsewhere logs out other devices.
  user.sessionVersion = (user.sessionVersion || 0) + 1;
  await user.save();
  const organisation = user.orgId ? await Organisation.findById(user.orgId) : null;
  logAudit({ req: { orgId: user.orgId, user }, action: 'auth.login', entity: 'user', entityId: user._id });
  res.json(authPayload(user, organisation));
});

const me = asyncHandler(async (req, res) => {
  const organisation = req.user.orgId ? await Organisation.findById(req.user.orgId) : null;
  res.json({ user: req.user, organisation });
});

module.exports = { register, login, me, signToken };
