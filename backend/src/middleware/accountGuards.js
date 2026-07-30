const { env } = require('../config/env');
const { httpError } = require('../utils/httpError');

/**
 * Guards that gate an authenticated session on the state of the *account* rather than
 * on a role: MFA enrolment, email verification, and where a platform request came from.
 *
 * All three follow the same shape, and it is the shape that makes them usable rather
 * than merely strict: they never lock someone out of the route that fixes the problem.
 * A superadmin who has not enrolled in MFA can still reach the MFA setup endpoints; an
 * unverified user can still read, and can still request a new verification email. A
 * guard that blocks its own remedy is a support ticket, not a control.
 */

/** Requests always permitted, because they are how the user resolves the block. */
const ALWAYS_ALLOWED_PREFIXES = [
  '/api/v1/auth',
  '/api/v1/public',
  '/api/v1/assets'
];

function isAlwaysAllowed(req) {
  return ALWAYS_ALLOWED_PREFIXES.some(prefix => req.originalUrl.startsWith(prefix));
}

function isReadOnlyRequest(method) {
  return method === 'GET' || method === 'HEAD' || method === 'OPTIONS';
}

/**
 * Email verification (#52).
 *
 * Reads stay open and writes are refused — the same trade-off suspension makes, for
 * the same reason: the data is theirs, and withholding it punishes the wrong thing.
 * What an unverified account cannot do is create records that will need to be emailed
 * to someone.
 *
 * Only enforced when a mail provider is configured (see `env.emailVerificationEnforced`),
 * because requiring a verification that cannot be sent would make a local install
 * unusable.
 */
function requireVerifiedEmail(req, res, next) {
  if (!env.emailVerificationEnforced) return next();
  if (!req.user || req.user.emailVerifiedAt) return next();
  // A platform account is provisioned by the seed script, not by self-registration,
  // so there is no verification flow behind it to complete.
  if (req.user.role === 'superadmin') return next();
  if (isAlwaysAllowed(req) || isReadOnlyRequest(req.method)) return next();

  return next(httpError(
    403,
    'Please confirm your email address before saving changes. Check your inbox, or request a new link from your profile.',
    'EMAIL_UNVERIFIED'
  ));
}

/**
 * MFA enrolment for platform accounts (#7).
 *
 * "Mandatory MFA for superadmin" is easy to state and easy to implement wrongly: a
 * hard requirement checked at login locks the platform owner out of their own console
 * the moment it deploys, because there is no enrolled authenticator yet and no way to
 * reach the page that creates one.
 *
 * So enforcement lives here, after authentication, and deliberately allows the
 * enrolment routes through. The owner signs in, every console route refuses with
 * `MFA_ENROLMENT_REQUIRED`, the frontend sends them to set up MFA, and they proceed.
 * Mandatory, without being a lockout.
 */
const MFA_ENROLMENT_PREFIXES = [
  '/api/v1/auth/mfa',
  '/api/v1/auth/me',
  '/api/v1/auth/change-password'
];

function requireSuperadminMfa(req, res, next) {
  if (!env.requireSuperadminMfa) return next();
  if (!req.user || req.user.role !== 'superadmin') return next();
  if (req.user.mfa?.enabled) return next();
  if (MFA_ENROLMENT_PREFIXES.some(prefix => req.originalUrl.startsWith(prefix))) return next();
  if (isAlwaysAllowed(req) && !req.originalUrl.startsWith('/api/v1/auth/mfa')) return next();

  return next(httpError(
    403,
    'Two-factor authentication is required on platform accounts. Set it up to continue.',
    'MFA_ENROLMENT_REQUIRED'
  ));
}

/**
 * Matches an IP against an allowlist entry, which may be a plain address or a CIDR
 * block. IPv4 only — an IPv6 CIDR match is a different algorithm, and quietly
 * accepting an IPv6 address that was never actually checked would be worse than
 * refusing to support it, so an entry that cannot be parsed never matches.
 */
function ipv4ToInt(ip) {
  const parts = String(ip).split('.');
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    const octet = Number(part);
    if (!Number.isInteger(octet) || octet < 0 || octet > 255) return null;
    value = (value << 8) | octet;
  }
  return value >>> 0;
}

function ipMatches(ip, entry) {
  // Express reports IPv4-mapped IPv6 as ::ffff:1.2.3.4; the allowlist is written in
  // plain dotted-quad, so normalise before comparing.
  const address = String(ip || '').replace(/^::ffff:/, '');
  if (!entry.includes('/')) return address === entry;

  const [network, bitsRaw] = entry.split('/');
  const bits = Number(bitsRaw);
  if (!Number.isInteger(bits) || bits < 0 || bits > 32) return false;
  const addressInt = ipv4ToInt(address);
  const networkInt = ipv4ToInt(network);
  if (addressInt === null || networkInt === null) return false;
  // A /0 mask would be `-1 << 32`, which in JS shifts by 0 and matches nothing;
  // spelled out rather than relying on the shift.
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (addressInt & mask) === (networkInt & mask);
}

/**
 * IP allowlist for the platform console.
 *
 * Empty by default, because a wrong allowlist locks the owner out from wherever they
 * happen to be — so this is opt-in, and the refusal names the address that was
 * rejected so it can be added.
 *
 * Mounted on the superadmin router rather than globally: a tenant must never be
 * restricted by it, and mounting it once at the only place it applies means it cannot
 * drift.
 */
function superadminIpAllowlist(req, res, next) {
  const allowlist = env.SUPERADMIN_IP_ALLOWLIST;
  if (!allowlist.length) return next();
  if (allowlist.some(entry => ipMatches(req.ip, entry))) return next();

  return next(httpError(
    403,
    `The platform console is restricted by IP address, and ${String(req.ip).replace(/^::ffff:/, '')} is not on the allowlist.`,
    'IP_NOT_ALLOWED'
  ));
}

module.exports = {
  requireVerifiedEmail,
  requireSuperadminMfa,
  superadminIpAllowlist,
  ipMatches
};
