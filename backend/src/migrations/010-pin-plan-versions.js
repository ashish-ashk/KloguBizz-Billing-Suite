/**
 * Records what every existing subscriber is actually on, before the next price
 * change moves it (3.3 #9).
 *
 * Until now a subscription stored only `planCode`, and every price and limit was
 * resolved by joining to the live `Plan` at read time. That works — right up to
 * the first edit, at which point it reaches backwards and changes what past
 * charges are shown as, what historical MRR was, and what quota every existing
 * customer is held to.
 *
 * The code handles a missing snapshot by falling back to the live plan, so
 * nothing breaks without this migration. But "falls back gracefully" is not the
 * same as "is grandfathered": an unpinned subscription is still repriced by the
 * next edit, which is the whole problem. This closes that window by writing down
 * today's terms while they are still today's.
 *
 * Two steps, both idempotent:
 *
 *   1. **Version 1 for every plan**, from its current values. There is no
 *      earlier history to recover — the old `upsertPlan` overwrote in place and
 *      logged only the plan's name, so previous prices are genuinely gone. This
 *      does not pretend otherwise; it establishes a baseline from here.
 *   2. **Pin every live subscription** to that version, copying the prices and
 *      limits it is currently being held to. Cancelled and ended subscriptions
 *      are left alone: they are history, nothing will reprice them, and writing
 *      to them would only make the diff harder to read.
 */

module.exports = {
  description: 'Create version 1 of every plan and pin live subscriptions to it',

  async up(db) {
    const plans = db.collection('plans');
    const versions = db.collection('planversions');
    const subscriptions = db.collection('subscriptions');

    const report = { plans: 0, versionsCreated: 0, subscriptionsPinned: 0, skipped: 0 };
    // Trials and pending checkouts count: they will become paying customers on
    // the terms they were shown, not on whatever the price is by then.
    const LIVE = ['trial', 'pending', 'active', 'past_due'];

    for await (const plan of plans.find({})) {
      report.plans += 1;

      let version = await versions.findOne({ planCode: plan.code }, { sort: { version: -1 } });
      if (!version) {
        const doc = {
          planCode: plan.code,
          version: 1,
          name: plan.name,
          monthlyPrice: plan.monthlyPrice,
          yearlyPrice: plan.yearlyPrice,
          userLimit: plan.userLimit,
          invoiceLimit: plan.invoiceLimit,
          features: plan.features || [],
          // The plan's own creation time, not now: this version has been in
          // force since the plan existed, and dating it today would imply a
          // change that never happened.
          effectiveFrom: plan.createdAt || new Date(),
          changedBy: 'migration 010',
          changeNote: 'Baseline recorded when plan versioning was introduced. Earlier prices were '
            + 'overwritten in place and are not recoverable.',
          versionedProviderPlanId: '',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        await versions.insertOne(doc);
        version = doc;
        report.versionsCreated += 1;
      }

      await plans.updateOne({ _id: plan._id }, { $set: { currentVersion: version.version } });

      const result = await subscriptions.updateMany(
        {
          planCode: plan.code,
          status: { $in: LIVE },
          // Only the unpinned. A subscription that already carries a version was
          // written by the running code and is more current than this.
          $or: [{ planVersion: null }, { planVersion: { $exists: false } }]
        },
        {
          $set: {
            planVersion: version.version,
            pricing: {
              monthlyPrice: plan.monthlyPrice ?? null,
              yearlyPrice: plan.yearlyPrice ?? null
            },
            limits: {
              userLimit: plan.userLimit ?? null,
              invoiceLimit: plan.invoiceLimit ?? null
            }
          }
        }
      );
      report.subscriptionsPinned += result.modifiedCount || 0;
    }

    /**
     * Subscriptions whose plan code matches no plan.
     *
     * Counted rather than fixed. It means a plan was deleted or renamed out from
     * under a live subscriber, and there is no honest way for a migration to
     * decide what they should be charged — inventing a price would be worse than
     * leaving it visible. They keep resolving to nothing, exactly as before, and
     * this number is the prompt to go and look.
     */
    const codes = await plans.distinct('code');
    report.orphanedSubscriptions = await subscriptions.countDocuments({
      status: { $in: LIVE },
      planCode: { $nin: codes }
    });

    return report;
  }
};
