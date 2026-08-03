/**
 * Backfills one `Membership` per existing user from their legacy
 * `User.orgId`/`User.role` (#53, #54).
 *
 * Before memberships existed, those two fields *were* the org and the role —
 * this migration is what makes them keep meaning the same thing from the
 * membership's side, so `protect` (which now resolves access via Membership,
 * not `User.orgId`) doesn't lock out every account that existed before this
 * shipped.
 *
 * Idempotent via a pre-check against the `{userId, orgId}` pair, with the
 * model's own unique index as the concurrent-case backstop — the same
 * pattern used elsewhere in this codebase (see stockService/purchase
 * duplicate-guard notes). Safe to re-run, including against a database where
 * some users already registered fresh (and so already have their own
 * membership) in the gap between this code deploying and the migration
 * actually running.
 *
 * Deliberately skipped: platform accounts (`role: 'superadmin'`, which never
 * carry an `orgId` and never get a membership — they aren't a tenant
 * identity) and any user with no `orgId` at all (a null orgId is not a valid
 * membership, and none should exist outside a corrupted record).
 */
module.exports = {
  description: 'Backfill one Membership per existing user from User.orgId/User.role',

  async up(db) {
    const users = db.collection('users');
    const memberships = db.collection('memberships');

    const cursor = users.find(
      { role: { $ne: 'superadmin' }, orgId: { $exists: true, $ne: null } },
      { projection: { _id: 1, orgId: 1, role: 1, status: 1 } }
    );

    const ROLES = ['admin', 'accountant', 'viewer'];
    const BATCH = 500;
    let operations = [];
    let created = 0;
    let alreadyPresent = 0;

    const flush = async () => {
      if (!operations.length) return;
      const result = await memberships.bulkWrite(operations, { ordered: false });
      created += result.insertedCount ?? 0;
      operations = [];
    };

    for await (const user of cursor) {
      const existing = await memberships.findOne({ userId: user._id, orgId: user.orgId }, { projection: { _id: 1 } });
      if (existing) { alreadyPresent += 1; continue; }

      const now = new Date();
      operations.push({
        insertOne: {
          document: {
            userId: user._id,
            orgId: user.orgId,
            role: ROLES.includes(user.role) ? user.role : 'viewer',
            // A brand-new invited user's only membership starts 'invited' too,
            // so accepting the invite (which activates both together) has
            // something to activate; every other status maps straight across.
            status: user.status === 'invited' ? 'invited' : (user.status === 'disabled' ? 'disabled' : 'active'),
            createdAt: now,
            updatedAt: now
          }
        }
      });
      if (operations.length >= BATCH) await flush();
    }
    await flush();

    return { membershipsCreated: created, alreadyPresent };
  }
};
