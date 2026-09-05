const { capabilitiesFor, featureCopyFor } = require('../services/planCapabilities');

const KNOWN_CODES = ['starter', 'growth', 'business', 'enterprise'];
const NEW_CAPABILITY = 'eInvoicing';

/**
 * Keys that were written by migration 012 and have since left the catalogue.
 *
 * `multiUser` is the only one. It was removed deliberately — every plan permits
 * more than one user and `planService.assertUserQuota` enforces the ceiling, so
 * advertising "multi-user" as a paid capability was the same kind of untruth
 * that catalogue exists to remove. Nothing reads the key; it just sits in the
 * stored list looking like a capability.
 *
 * Listed explicitly rather than inferred as "anything not in the catalogue",
 * because that would let this migration silently discard a capability an
 * operator granted by hand from the console.
 */
const RETIRED_KEYS = ['multiUser'];

/**
 * Adds e-invoicing to the plans that now include it.
 *
 * ── Why a migration is needed at all ──────────────────────────────────
 *
 * `planCapabilities.js` is the catalogue, but it is not what a gate reads.
 * `entitlementService.resolveCapabilities` prefers the `capabilities` array
 * stored on the plan document, falling back to the catalogue only when the
 * stored list is empty — which is right, because an operator can grant a
 * capability to one plan from the console and that decision must outlive a
 * deploy.
 *
 * The consequence is that adding a key to the catalogue changes nothing for any
 * existing tenant. Migration 012 wrote the stored lists; without this one,
 * `eInvoicing` would exist in code, be gated on by every route, and be held by
 * nobody. That is exactly the failure mode this codebase keeps finding: a
 * feature that is switched on everywhere except where it is checked.
 *
 * ── What it does ──────────────────────────────────────────────────────
 *
 * Recomputes the capability list and the display copy from the catalogue for the
 * four shipped codes, which is the same thing 012 did and keeps the two in step
 * rather than appending one key and leaving the rest to drift.
 *
 * **Prices and limits are untouched.** They are commercial terms.
 *
 * **A plan with any other code is left alone**, and reported. It was made by
 * hand for a reason nobody wrote down, and adding a paid capability to it
 * silently would be giving away something somebody priced.
 *
 * **A plan whose stored list was edited away from the catalogue is also left
 * alone.** If an operator removed a capability from Growth deliberately, this
 * must not put it back — so the update only applies where the stored list still
 * matches what the catalogue said *before* e-invoicing existed.
 */
module.exports = {
  description: 'Grant the e-invoicing capability to the plans that include it',

  async up(db) {
    const plans = db.collection('plans');
    const report = { updated: [], skippedCustom: [], skippedEdited: [] };

    const all = await plans.find({}, { projection: { code: 1, capabilities: 1 } }).toArray();

    for (const plan of all) {
      if (!KNOWN_CODES.includes(plan.code)) {
        report.skippedCustom.push(plan.code);
        continue;
      }

      const target = capabilitiesFor(plan.code);
      const stored = plan.capabilities || [];

      // Already has it: a re-run, or a console grant. Nothing to do.
      if (stored.includes(NEW_CAPABILITY)) continue;

      /**
       * The stored list must be exactly the catalogue minus the new key. Any
       * other shape means somebody changed it on purpose, and a migration that
       * overwrites a deliberate decision is worse than one that does nothing.
       */
      const expectedBefore = target.filter(key => key !== NEW_CAPABILITY);
      // Retired keys do not count as an edit — see RETIRED_KEYS. Rewriting the
      // list also clears them, which is the tidy-up 012 could not do because
      // they were still in the catalogue when it ran.
      const meaningful = stored.filter(key => !RETIRED_KEYS.includes(key));
      const matchesCatalogue = meaningful.length === expectedBefore.length
        && expectedBefore.every(key => meaningful.includes(key));

      if (!matchesCatalogue) {
        report.skippedEdited.push(plan.code);
        continue;
      }
      const cleared = stored.filter(key => RETIRED_KEYS.includes(key));

      await plans.updateOne(
        { _id: plan._id },
        { $set: { capabilities: target, features: featureCopyFor(plan.code), updatedAt: new Date() } }
      );
      report.updated.push({
        code: plan.code,
        gained: target.includes(NEW_CAPABILITY) ? NEW_CAPABILITY : null,
        retiredKeysCleared: cleared
      });
    }

    return report;
  }
};
