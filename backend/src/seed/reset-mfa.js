const { connectDatabase } = require('../config/database');
const { User } = require('../models/User');
const { AuditLog } = require('../models/Settings');

/**
 * Clears the second factor on one account, from the command line.
 *
 * ── Why this has to exist ─────────────────────────────────────────────
 *
 * MFA secrets are encrypted with a key derived from `MFA_ENCRYPTION_KEY`,
 * falling back to `JWT_SECRET`. Setting the former on a deployment where people
 * enrolled under the fallback — or rotating the latter while it was doing double
 * duty — makes every enrolled secret undecryptable. Recovery codes survive
 * (they are hashed), but a user who did not keep them has no route back in, and
 * on a **platform owner** account that means nobody can reach the console to fix
 * it for them. The lockout is total and there is no in-app door.
 *
 * So the escape hatch is deliberately outside the application: it needs shell
 * access to the server and the database, which is a materially higher bar than
 * anything reachable over HTTP.
 *
 * ── What it deliberately does not do ──────────────────────────────────
 *
 * It does not sign anybody in, mint a token, or change a password. It removes
 * the second factor and nothing else, so the account still needs its password —
 * and the next sign-in on a platform account is met by the enrolment guard,
 * which requires setting MFA up again before the console opens.
 *
 * Every use is written to the audit log. An operation that quietly weakens an
 * account's authentication and leaves no trace is indistinguishable from an
 * attacker who reached the same shell.
 *
 *   node src/seed/reset-mfa.js someone@example.com
 */
async function resetMfa(email, { exit = true } = {}) {
  if (!email) {
    console.error('\nusage: node src/seed/reset-mfa.js <email>\n');
    if (exit) process.exit(1);
    return { ok: false, reason: 'no email given' };
  }

  await connectDatabase();
  const user = await User.findOne({ email: String(email).trim().toLowerCase() });
  if (!user) {
    console.error(`\nNo account found for ${email}.\n`);
    if (exit) process.exit(1);
    return { ok: false, reason: 'not found' };
  }

  const wasEnabled = Boolean(user.mfa?.enabled);
  const hadSecret = Boolean(user.mfa?.secret);

  user.mfa = { enabled: false, secret: undefined, lastUsedCounter: undefined, backupCodes: [] };

  /**
   * Every existing session is cut as well.
   *
   * Removing a second factor while sessions issued *under* it stay alive would
   * leave the account in a weaker state than either setting — and if this is
   * being run because of a suspected compromise rather than a lost key, the
   * sessions are the thing that matters most.
   */
  user.sessionVersion = (user.sessionVersion || 0) + 1;
  await user.save();

  await AuditLog.create({
    action: 'user.mfa_reset_by_operator',
    entity: 'user',
    entityId: user._id,
    actorName: 'command line',
    meta: { email: user.email, wasEnabled, hadSecret, via: 'src/seed/reset-mfa.js' }
  }).catch(() => {});

  console.log(`\n[reset-mfa] Two-factor authentication cleared for ${user.email}.`);
  console.log('  Their password is unchanged, and every existing session has been signed out.');
  console.log('  On a platform account the next sign-in will require enrolling again before the console opens.\n');

  if (exit) process.exit(0);
  return { ok: true, email: user.email, wasEnabled };
}

module.exports = { resetMfa };

/** Runs only when invoked directly — see the note in `seed.js` about what
 *  happens when a destructive script executes on `require`. */
if (require.main === module) {
  resetMfa(process.argv[2]).catch(error => {
    console.error(error);
    process.exit(1);
  });
}
