/**
 * Shared across integration test files that need a working session as a role
 * other than the org owner — not testing the invite flow itself, just using it
 * as a fixture the way these files always have.
 *
 * `POST /users/invite` creates the account active immediately with a system-
 * generated temporary password (#65), gated by `mustChangePassword` until it's
 * actually changed — every other route refuses until then. So this has to
 * change it, not just log in once: a subsequent write or read as this user
 * would otherwise 403 for the password gate rather than for whatever the test
 * is actually checking, which would still pass the assertion by accident while
 * testing the wrong thing.
 */
async function activateInvitedUser(call, { ownerToken, name, email, role, password = 'Password@123' }) {
  const invite = await call('POST', '/users/invite', { token: ownerToken, body: { name, email, role } });
  if (invite.status !== 201) {
    throw new Error(`invite failed (${invite.status}): ${JSON.stringify(invite.body)}`);
  }
  const tempPassword = invite.body.tempPassword;

  const tempLogin = await call('POST', '/auth/login', { body: { email, password: tempPassword } });
  if (tempLogin.status !== 200) {
    throw new Error(`temp-password login failed (${tempLogin.status}): ${JSON.stringify(tempLogin.body)}`);
  }

  const changed = await call('POST', '/auth/change-password', {
    token: tempLogin.body.token,
    body: { currentPassword: tempPassword, newPassword: password, acceptTerms: true }
  });
  if (changed.status !== 200) {
    throw new Error(`change-password failed (${changed.status}): ${JSON.stringify(changed.body)}`);
  }

  // change-password bumps sessionVersion, which invalidates the token just
  // issued above — a fresh login is required, not optional cleanup.
  const login = await call('POST', '/auth/login', { body: { email, password } });
  if (login.status !== 200) {
    throw new Error(`post-change login failed (${login.status}): ${JSON.stringify(login.body)}`);
  }

  return { user: invite.body.user, token: login.body.token, organisation: login.body.organisation };
}

module.exports = { activateInvitedUser };
