const { Plan } = require('../models/Plan');
const { Organisation } = require('../models/Organisation');
const { httpError } = require('../utils/httpError');
const { CAPABILITIES, capabilitiesFor, CORE_KEYS } = require('./planCapabilities');

/**
 * What this tenant is actually allowed to do.
 *
 * ── Why this is separate from featureFlagService ──────────────────────
 *
 * They answer different questions and both answers are needed.
 *
 * A **capability** is what the customer *bought*. It comes from the plan, and the
 * honest default for anything not in the plan is "upgrade to get this".
 *
 * A **flag** is an operator switch for one tenant — turn something off because it
 * is misbehaving, or because of an abuse report. It is not a commercial statement.
 *
 * Resolution is therefore: the plan decides what exists, an explicit per-tenant
 * override can add or remove one, and a flag can only ever take away. Nothing a
 * customer paid for is silently removed by a default, and nothing they did not pay
 * for is silently granted.
 *
 * ── The trial decision, stated rather than buried ─────────────────────
 *
 * A trial resolves to `TRIAL_TIER`, not to the cheapest plan. Giving a trial only
 * Starter means nobody can evaluate the features they would be paying for, which
 * defeats the trial — and the first thing they would discover is a locked door
 * rather than the product. When the trial ends, `Organisation.plan` is what it
 * always was and the tenant lands on whatever they actually bought.
 */

/** What a trial can use. Deliberately generous: a trial exists to be evaluated. */
const TRIAL_TIER = 'business';

/**
 * The capability set for one organisation.
 *
 * Takes the org document rather than an id where the caller already has one —
 * this is resolved on every gated request, and re-reading the same document per
 * route would be a query per click.
 */
async function resolveCapabilities(org) {
  if (!org) return new Set(CORE_KEYS);

  /**
   * A trial is evaluated on the tier it is meant to sell, not on the floor.
   * `status` rather than `plan`, because a trialling tenant's `plan` is whatever
   * they will fall back to and is usually the cheapest thing there is.
   */
  const effectivePlanCode = org.status === 'trial' ? TRIAL_TIER : org.plan;

  /**
   * The plan's stored list wins over the catalogue, because an operator may have
   * composed a bespoke plan. Falling back to the catalogue matters for any plan
   * saved before capabilities existed: an empty array would read as "this plan
   * includes nothing", which would lock a paying customer out of everything.
   */
  const plan = await Plan.findOne({ code: effectivePlanCode }).select('capabilities').lean();
  const granted = new Set(
    plan?.capabilities?.length ? plan.capabilities : capabilitiesFor(effectivePlanCode)
  );

  // Core is always present. A tenant must be able to invoice whatever else has
  // gone wrong with their plan record — losing the ability to bill is not a
  // recoverable inconvenience for a business.
  CORE_KEYS.forEach(key => granted.add(key));

  /**
   * Explicit per-tenant overrides, in both directions.
   *
   * `true` grants something outside the plan — a bespoke deal, or a feature let
   * through while a customer decides. `false` revokes. Stored explicitly rather
   * than as "present means on", for the same reason `featureFlags` is: otherwise
   * there is no way to express "off for this tenant even though the plan has it".
   */
  const overrides = toPlainObject(org.capabilityOverrides);
  for (const [key, value] of Object.entries(overrides)) {
    if (value === true) granted.add(key);
    if (value === false) granted.delete(key);
  }

  return granted;
}

/** Mongoose Maps and plain objects both arrive here depending on `.lean()`. */
function toPlainObject(value) {
  if (!value) return {};
  if (value instanceof Map) return Object.fromEntries(value);
  return typeof value.toObject === 'function' ? value.toObject() : value;
}

/**
 * Route guard.
 *
 * **Enforced on the server, not hidden in the UI.** A hidden button with a live
 * endpoint behind it is not a plan limit; it is a plan limit anybody can skip
 * with `curl`, and the customers most likely to try are the ones who read the
 * pricing page carefully.
 *
 * The refusal names the capability and says upgrading is the route to it, because
 * "forbidden" on a feature somebody can legitimately buy is a dead end. It does
 * **not** name a specific plan: which tier includes what is a commercial decision
 * that changes, and a hardcoded "upgrade to Business" would go stale in the one
 * place a customer is reading closely.
 */
function requireCapability(key) {
  const definition = CAPABILITIES.find(capability => capability.key === key);

  return async function guard(req, res, next) {
    try {
      // A platform account is not a tenant and has no plan; it is already
      // constrained by its platform role.
      if (!req.orgId) return next();

      const org = await Organisation.findById(req.orgId)
        .select('plan status capabilityOverrides').lean();
      const granted = await resolveCapabilities(org);
      if (granted.has(key)) return next();

      return next(httpError(
        403,
        `${definition?.label || key} is not included in your current plan. Upgrade from the Subscription page to use it.`,
        'PLAN_UPGRADE_REQUIRED'
      ));
    } catch (error) {
      return next(error);
    }
  };
}

/**
 * The same guard, but only for writes.
 *
 * ── The distinction, because it matters on a downgrade ────────────────
 *
 * There are two kinds of thing behind these gates.
 *
 * **Records the tenant created** — purchase bills, expenses, credit notes,
 * recurring definitions, payment links. Reading those stays open whatever the
 * plan says. A tenant who downgrades still owns their own books, and a purchase
 * register is an input-tax-credit record they may be legally required to
 * produce; hiding it behind a pricing tier would be taking away their data, not
 * a feature. So creating and editing needs the capability and reading does not.
 *
 * **Derived reports and tools** — profit and loss, GSTR-2B reconciliation,
 * CMP-08, ageing, valuation, warehouses, exports. There the report *is* the
 * feature, and `requireCapability` gates it outright.
 *
 * `GET` and `HEAD` only. A `POST` that happens to read — a reconcile, a preview —
 * is still a use of the feature.
 */
function requireCapabilityForWrites(key) {
  const guard = requireCapability(key);
  return function methodScoped(req, res, next) {
    if (req.method === 'GET' || req.method === 'HEAD') return next();
    return guard(req, res, next);
  };
}

/** The list a client needs to decide what to render. Sorted, so it is diffable. */
async function capabilityListFor(org) {
  return [...(await resolveCapabilities(org))].sort();
}

module.exports = {
  TRIAL_TIER,
  resolveCapabilities,
  capabilityListFor,
  requireCapability,
  requireCapabilityForWrites
};
