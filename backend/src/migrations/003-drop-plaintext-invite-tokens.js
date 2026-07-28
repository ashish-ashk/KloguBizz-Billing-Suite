/**
 * Removes the legacy plaintext `inviteToken` field from users.
 *
 * Invitation tokens are now stored as a SHA-256 hash (`inviteTokenHash`) with an
 * expiry, so a leaked database dump cannot be used to accept invitations. The old
 * plaintext field is no longer written or read by any code — but it is still
 * *sitting in the collection* on every user invited before the change, which is
 * the whole thing the hashing was meant to prevent. Dead code stops being a
 * problem when you delete it; dead credentials do not.
 *
 * `$unset` on a field that does not exist is a no-op, so this is safe to re-run.
 */
module.exports = {
  description: 'Drop the legacy plaintext User.inviteToken field',

  async up(db) {
    const users = db.collection('users');
    const result = await users.updateMany(
      { inviteToken: { $exists: true } },
      { $unset: { inviteToken: '' } }
    );

    // The index on the old field goes too — it can only slow writes now.
    //
    // Two "nothing to do" cases have to be tolerated, and both are the norm
    // rather than the exception: `IndexNotFound` (27) on a database that was
    // created after the field was already hashed, and `NamespaceNotFound` (26) on
    // a brand-new database where the `users` collection does not exist yet. A
    // migration that throws on an empty database cannot be part of a deployment
    // that also provisions fresh environments.
    let indexDropped = false;
    try {
      await users.dropIndex('inviteToken_1');
      indexDropped = true;
    } catch (error) {
      const benign = error.code === 26
        || error.code === 27
        || /index not found|ns not found/i.test(error.message || '');
      if (!benign) throw error;
    }

    return { cleared: result.modifiedCount ?? 0, indexDropped };
  }
};
