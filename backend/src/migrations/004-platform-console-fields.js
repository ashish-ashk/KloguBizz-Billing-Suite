/**
 * Prepares existing data for the Phase 4 platform console.
 *
 * Three backfills, each of which exists because a *missing* field and a field with
 * a value are not the same thing to a query:
 *
 *  1. `User.platformRole` on the platform accounts. The capability resolver treats
 *     an absent value as 'owner' precisely so nobody is locked out on deploy — but
 *     leaning on that forever means the "is there another owner left" guard in
 *     `setPlatformRole` has to keep carrying an `$exists: false` clause, and the
 *     console cannot show what an account's role *is*. Writing it makes the field
 *     the source of truth rather than the fallback.
 *
 *  2. `Organisation.trialEndsAt` for tenants created before it existed. Without it
 *     every such tenant is invisible to the "trials expiring this week" list —
 *     `trialEndsAt: { $lte: … }` never matches a missing field, so the list would
 *     silently show only organisations registered after this shipped, which reads
 *     as "no trials are expiring".
 *
 *  3. `Organisation.lastActiveAt`, seeded from the most recent login of any of the
 *     tenant's users. The at-risk list deliberately treats a missing value as "at
 *     risk", which is right for a tenant that genuinely never came back and wrong
 *     for every existing tenant on the day this deploys — the list would open with
 *     every customer in it and be ignored from then on. `User.lastLoginAt` is the
 *     one usage signal that did exist, so it is the honest starting point.
 *
 * Idempotent throughout: each step only writes documents that lack the field.
 */
module.exports = {
  description: 'Backfill platformRole, trialEndsAt and lastActiveAt for the platform console',

  async up(db) {
    const users = db.collection('users');
    const organisations = db.collection('organisations');

    // 1. Platform accounts become explicit owners.
    const platformRoles = await users.updateMany(
      { role: 'superadmin', platformRole: { $exists: false } },
      { $set: { platformRole: 'owner' } }
    );

    // 2. Trial end dates, 14 days from when the organisation was created — the
    // same window a new registration gets. A trial that ended long ago is left in
    // the past rather than pushed forward: the console should show the truth, and
    // an operator can extend it from the tenant page.
    const TRIAL_DAYS = 14;
    const trialOperations = [];
    const trialCursor = organisations.find(
      { trialEndsAt: { $exists: false } },
      { projection: { _id: 1, createdAt: 1 } }
    );
    for await (const org of trialCursor) {
      const created = org.createdAt ? new Date(org.createdAt) : new Date();
      trialOperations.push({
        updateOne: {
          filter: { _id: org._id },
          update: { $set: { trialEndsAt: new Date(created.getTime() + TRIAL_DAYS * 86400000) } }
        }
      });
    }

    // 3. Last-active, from the newest login among each tenant's users.
    const lastLogins = new Map();
    for (const row of await users.aggregate([
      { $match: { lastLoginAt: { $type: 'date' }, orgId: { $ne: null } } },
      { $group: { _id: '$orgId', last: { $max: '$lastLoginAt' } } }
    ]).toArray()) {
      lastLogins.set(String(row._id), row.last);
    }

    const activeOperations = [];
    const activeCursor = organisations.find(
      { lastActiveAt: { $exists: false } },
      { projection: { _id: 1 } }
    );
    for await (const org of activeCursor) {
      const last = lastLogins.get(String(org._id));
      // No login on record means nobody ever signed in. That tenant genuinely is
      // dormant, so leaving the field unset — which the at-risk list reads as "at
      // risk" — is the correct outcome, not a gap.
      if (!last) continue;
      activeOperations.push({
        updateOne: { filter: { _id: org._id }, update: { $set: { lastActiveAt: last } } }
      });
    }

    const applyAll = async (collection, operations) => {
      if (!operations.length) return 0;
      const BATCH = 500;
      let updated = 0;
      for (let i = 0; i < operations.length; i += BATCH) {
        const result = await collection.bulkWrite(operations.slice(i, i + BATCH), { ordered: false });
        updated += result.modifiedCount ?? 0;
      }
      return updated;
    };

    const trialsUpdated = await applyAll(organisations, trialOperations);
    const activeUpdated = await applyAll(organisations, activeOperations);

    return {
      platformRoles: platformRoles.modifiedCount ?? 0,
      trialEndsAt: trialsUpdated,
      lastActiveAt: activeUpdated
    };
  }
};
