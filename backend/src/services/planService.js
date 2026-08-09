const { Organisation } = require('../models/Organisation');
const { Plan } = require('../models/Plan');
const { Membership } = require('../models/Membership');
const { Subscription } = require('../models/Subscription');
const { effectivePlanFor } = require('./planVersionService');
const { Invoice } = require('../models/Invoice');
const { httpError } = require('../utils/httpError');

/**
 * The plan this organisation is actually held to (3.3 #9).
 *
 * Not simply `Plan.findOne({ code: org.plan })` any more. That resolved every
 * limit against the live row, so lowering `invoiceLimit` from 200 to 100 put
 * every existing subscriber over quota mid-month, and the first they heard of it
 * was an invoice being refused. The subscription pins the limits it was sold on;
 * `effectivePlanFor` prefers those and falls back to the live plan for anything
 * created before versioning — which is the old behaviour exactly, so nothing
 * changes retroactively.
 */
async function getPlanForOrg(orgId) {
  const org = await Organisation.findById(orgId);
  if (!org) throw httpError(404, 'Organisation not found');
  const [livePlan, subscription] = await Promise.all([
    Plan.findOne({ code: org.plan }).lean(),
    // The org's plan code is authoritative for *which* plan; the subscription
    // for *which version of it*. They can disagree when an operator moves a
    // tenant between plans by hand, and then the pin no longer applies.
    Subscription.findOne({ orgId, status: { $in: ['trial', 'pending', 'active', 'past_due'] } })
      .select('planCode planVersion pricing limits billingCycle').lean()
  ]);
  const pinnedApplies = subscription && subscription.planCode === org.plan;
  const plan = effectivePlanFor(pinnedApplies ? subscription : null, livePlan);
  return { org, plan, livePlan, subscription };
}

/**
 * The limit actually in force for one resource.
 *
 * A per-organisation override wins over the plan. The alternative, before this
 * existed, was to invent a bespoke plan for every tenant who needed one extra seat
 * — which then appears in the public pricing table and in MRR-by-plan — or to
 * upgrade them to a tier they didn't ask for. A `null` override means "no override",
 * not "unlimited"; unlimited is expressed by the plan itself having no limit.
 */
function effectiveLimit(planLimit, override) {
  const value = Number(override);
  if (Number.isFinite(value) && value > 0) return value;
  return planLimit ?? null;
}

// Usage counters shown on the subscription page and used for quota checks.
async function getUsage(orgId) {
  const { org, plan } = await getPlanForOrg(orgId);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  // Seats are counted by membership, not by `User.orgId` (#53, #54) — an
  // identity can belong to more than one organisation, so its seat has to be
  // charged to whichever org actually granted it, via Membership, not to
  // whatever org it happened to be created in.
  const [users, invoicesThisMonth] = await Promise.all([
    Membership.countDocuments({ orgId, status: { $ne: 'disabled' } }),
    Invoice.countDocuments({ orgId, createdAt: { $gte: monthStart } })
  ]);
  const overrides = org.limitOverrides || {};
  const userLimit = effectiveLimit(plan?.userLimit, overrides.userLimit);
  const invoiceLimit = effectiveLimit(plan?.invoiceLimit, overrides.invoiceLimit);
  return {
    plan: org.plan,
    planName: plan?.name || org.plan,
    users,
    userLimit,
    invoicesThisMonth,
    invoiceLimit,
    /** Surfaced so the tenant's subscription page can explain why their ceiling
     *  differs from the published plan, rather than looking like a bug. */
    limitOverrides: {
      userLimit: overrides.userLimit ?? null,
      invoiceLimit: overrides.invoiceLimit ?? null
    },
    /** Which version of the plan this tenant is on, and whether they are held to
     *  it rather than to the published one — the same "why does my ceiling
     *  differ" question the overrides answer, from the other direction. */
    planVersion: plan?.planVersion ?? null,
    grandfathered: plan?.pinned === true && plan.planVersion !== plan.currentVersion
  };
}

async function assertInvoiceQuota(orgId) {
  const usage = await getUsage(orgId);
  if (usage.invoiceLimit && usage.invoicesThisMonth >= usage.invoiceLimit) {
    throw httpError(403, `Monthly invoice limit reached (${usage.invoiceLimit} on ${usage.planName} plan). Upgrade to create more invoices.`);
  }
}

async function assertUserQuota(orgId) {
  const usage = await getUsage(orgId);
  if (usage.userLimit && usage.users >= usage.userLimit) {
    throw httpError(403, `User limit reached (${usage.userLimit} on ${usage.planName} plan). Upgrade to invite more users.`);
  }
}

module.exports = { getUsage, assertInvoiceQuota, assertUserQuota, effectiveLimit };
