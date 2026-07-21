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

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: String(email).toLowerCase() });
  if (!user) throw httpError(401, 'Invalid email or password');
  const ok = await bcrypt.compare(password || '', user.passwordHash);
  if (!ok) throw httpError(401, 'Invalid email or password');
  user.lastLoginAt = new Date();
  // Invalidate any tokens issued to this user before now — one active
  // session per user; signing in elsewhere logs out other devices.
  user.sessionVersion = (user.sessionVersion || 0) + 1;
  await user.save();
  const organisation = user.orgId ? await Organisation.findById(user.orgId) : null;
  res.json(authPayload(user, organisation));
});

const me = asyncHandler(async (req, res) => {
  const organisation = req.user.orgId ? await Organisation.findById(req.user.orgId) : null;
  res.json({ user: req.user, organisation });
});

module.exports = { register, login, me, signToken };
