/**
 * Gives every tenant one stock location, and puts all their existing stock in it
 * (2.5 #42).
 *
 * This is what makes locations a safe change rather than a risky one, and it is
 * the same trick migration 006 used for memberships: **create the thing the new
 * code expects, for everyone, before the new code runs.** After this, every
 * tenant has exactly one location holding exactly the stock they had, and every
 * balance, layer and ledger row answers identically to how it did before.
 *
 * Without it, cost layers would carry no `locationId` while consumption filters
 * on one — so the first sale after deploying would find no layers, report a cost
 * of goods sold of zero, and drive the item's stock negative against a location
 * that owns nothing. Silent, immediate, and wrong in the flattering direction.
 *
 * ── What it deliberately does not do ──────────────────────────────────
 *
 * It does not try to guess where anything actually was. There is no information
 * anywhere in the system about physical locations before this feature existed,
 * so one warehouse holding everything is the only truthful reconstruction. A
 * tenant with two godowns moves stock between them afterwards, with a transfer,
 * which leaves a record of the correction.
 *
 * Idempotent: a tenant that already has a default location is left alone, and
 * only rows with no `locationId` are stamped, so a re-run after a partial
 * failure resumes rather than reassigning anything.
 */
module.exports = {
  description: 'Create a default stock location per organisation and assign existing stock to it',

  async up(db) {
    const organisations = db.collection('organisations');
    const locations = db.collection('stocklocations');
    const layers = db.collection('stocklayers');
    const movements = db.collection('stockmovements');

    const report = {
      organisationsScanned: 0,
      locationsCreated: 0,
      layersAssigned: 0,
      movementsAssigned: 0
    };

    const orgs = await organisations.find({}, { projection: { name: 1, stateCode: 1 } }).toArray();
    report.organisationsScanned = orgs.length;

    for (const org of orgs) {
      let location = await locations.findOne({ orgId: org._id, isDefault: true });

      if (!location) {
        const now = new Date();
        const inserted = await locations.insertOne({
          orgId: org._id,
          /**
           * A generic name rather than the business's own.
           *
           * "Main Warehouse" is obviously a default somebody should rename;
           * naming it after the company reads as a deliberate choice and gets
           * left alone, which is worse for a tenant who actually has two.
           */
          name: 'Main Warehouse',
          code: 'MAIN',
          address: '',
          stateCode: org.stateCode || '',
          isDefault: true,
          status: 'active',
          note: 'Created automatically when stock locations were introduced.',
          createdAt: now,
          updatedAt: now
        });
        location = { _id: inserted.insertedId };
        report.locationsCreated += 1;
      }

      /**
       * Only rows that have no location yet.
       *
       * A filter of `{ orgId }` alone would reassign stock somebody had already
       * moved, on a re-run — turning a resumable migration into a destructive
       * one.
       */
      const layerResult = await layers.updateMany(
        { orgId: org._id, locationId: { $in: [null, undefined] } },
        { $set: { locationId: location._id } }
      );
      report.layersAssigned += layerResult.modifiedCount || 0;

      const movementResult = await movements.updateMany(
        { orgId: org._id, locationId: { $in: [null, undefined] } },
        { $set: { locationId: location._id } }
      );
      report.movementsAssigned += movementResult.modifiedCount || 0;
    }

    return report;
  }
};
