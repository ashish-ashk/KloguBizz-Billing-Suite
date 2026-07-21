// One-off migration: assigns Organisation.ownerId to organisations created
// before that field existed. Picks the earliest-created active admin user
// in the org. Safe to re-run — skips organisations that already have an owner.
const { connectDatabase } = require('../config/database');
const { Organisation } = require('../models/Organisation');
const { User } = require('../models/User');

async function backfillOwnerId() {
  await connectDatabase();
  const orgs = await Organisation.find({ ownerId: { $exists: false } });
  let updated = 0;

  for (const org of orgs) {
    const owner = await User.findOne({ orgId: org._id, role: 'admin', status: 'active' }).sort({ createdAt: 1 });
    if (!owner) {
      console.warn(`No active admin found for organisation ${org._id} (${org.name}) — skipped`);
      continue;
    }
    org.ownerId = owner._id;
    await org.save();
    updated += 1;
    console.log(`Set owner of "${org.name}" to ${owner.email}`);
  }

  console.log(`Done — ${updated}/${orgs.length} organisations updated.`);
  process.exit(0);
}

backfillOwnerId().catch(err => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
