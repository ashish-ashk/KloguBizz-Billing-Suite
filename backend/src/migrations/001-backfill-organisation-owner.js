/**
 * Assigns `Organisation.ownerId` for organisations created before the field
 * existed.
 *
 * Ported from `seed/backfillOwnerId.js`, which was an ad-hoc script with no
 * record of whether it had run. The logic is unchanged: the owner is the
 * earliest-created active admin in the org, matching what self-serve
 * registration does for a new tenant. Organisations that already have an owner
 * are left alone, so this is safe to re-run.
 *
 * An organisation with no active admin is skipped rather than guessed at —
 * ownership gates the password-confirmed transfer flow, and assigning it to a
 * disabled or invited account would be worse than leaving it unset (the code
 * treats a missing `ownerId` as "the requesting admin is the implicit owner",
 * which is a working fallback).
 */
module.exports = {
  description: 'Backfill Organisation.ownerId from the earliest active admin',

  async up(db) {
    const orgs = await db.collection('organisations')
      .find({ $or: [{ ownerId: { $exists: false } }, { ownerId: null }] })
      .project({ _id: 1, name: 1 })
      .toArray();

    let updated = 0;
    const skipped = [];

    for (const org of orgs) {
      const owner = await db.collection('users')
        .find({ orgId: org._id, role: 'admin', status: 'active' })
        .sort({ createdAt: 1 })
        .limit(1)
        .next();

      if (!owner) {
        skipped.push(org.name);
        continue;
      }
      await db.collection('organisations').updateOne({ _id: org._id }, { $set: { ownerId: owner._id } });
      updated += 1;
    }

    return { candidates: orgs.length, updated, skipped };
  }
};
