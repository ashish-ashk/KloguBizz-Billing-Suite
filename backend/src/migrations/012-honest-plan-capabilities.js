const { CAPABILITY_KEYS, capabilitiesFor, featureCopyFor } = require('../services/planCapabilities');

/**
 * Replaces the advertised benefit list with what the product actually does, and
 * gives each plan its capability keys.
 *
 * ── What was wrong ────────────────────────────────────────────────────
 *
 * The shipped plans advertised **Client Portal, API Access, Dedicated Manager,
 * SLA 99.9%, an on-premise option and 24/7 phone support**. None of those exist.
 * They also never mentioned GST returns, GSTR-2B reconciliation, inventory,
 * warehouses, FIFO valuation, profit and loss, batch and expiry tracking,
 * recurring invoices, payment links or credit notes — all of which do.
 *
 * A pricing page is a promise. That one oversold a product that does not exist
 * and undersold the one that does, and a customer who bought Business for the
 * API would have had a fair complaint.
 *
 * ── What this changes, and what it deliberately does not ──────────────
 *
 * It rewrites `features` (the display copy) and sets `capabilities` (the keys a
 * gate reads) for the four shipped plan codes, from
 * `services/planCapabilities.js`.
 *
 * **Prices and limits are never touched.** They are the commercial terms a
 * customer agreed to, and a migration is the wrong place to change what somebody
 * pays. A plan whose price was adjusted in the console keeps that price.
 *
 * **A plan whose code is not one of the four is left completely alone** — it was
 * created by hand for a reason nobody recorded, and guessing at its feature list
 * would be worse than leaving it as somebody wrote it. It is counted in the
 * report instead, so it can be looked at.
 *
 * No plan versions are minted. `planVersionService.differs()` treats a feature
 * change as version-worthy, which is right when an operator edits a plan and
 * wrong here: nothing a subscriber is entitled to has changed, only the sentence
 * describing it. A version row per plan reading "features changed" would bury the
 * price changes those rows exist to record.
 */
module.exports = {
  description: 'Replace advertised plan features with real capabilities, and set capability keys',

  async up(db) {
    const plans = db.collection('plans');
    const report = { updated: 0, unknownCodes: [], capabilityCount: CAPABILITY_KEYS.length };

    const all = await plans.find({}, { projection: { code: 1, features: 1 } }).toArray();

    for (const plan of all) {
      const capabilities = capabilitiesFor(plan.code);
      const features = featureCopyFor(plan.code);

      /**
       * `capabilitiesFor` falls back to the core set for a code it does not
       * know, which is right at runtime — a tenant must keep being able to
       * invoice — and wrong here, because writing it would overwrite a bespoke
       * plan's list with a guess.
       */
      const known = ['starter', 'growth', 'business', 'enterprise'].includes(plan.code);
      if (!known) {
        report.unknownCodes.push(plan.code);
        continue;
      }

      await plans.updateOne({ _id: plan._id }, { $set: { features, capabilities } });
      report.updated += 1;
    }

    return report;
  }
};
