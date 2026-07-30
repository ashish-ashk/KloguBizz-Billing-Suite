const { Organisation } = require('../models/Organisation');
const { Subscription } = require('../models/Subscription');
const { Plan } = require('../models/Plan');
const { User } = require('../models/User');
const { Invoice } = require('../models/Invoice');
const { Payment } = require('../models/Payment');
const { CreditNote } = require('../models/CreditNote');
const { UsageEvent } = require('../models/UsageEvent');
const { MetricsDaily } = require('../models/MetricsDaily');
const { EVENT, FEATURES, dayKey } = require('./usageEventService');
const { logger } = require('../utils/logger');

/**
 * Everything the platform console counts.
 *
 * Two rules run through this file, and both are about not lying with a number:
 *
 *  1. **A rate and a total are different things.** MRR is a rate and can only be
 *     snapshotted; GMV is a sum and can be recomputed for any window. They are
 *     never mixed, and neither is ever labelled just "revenue".
 *  2. **A figure the data cannot support is not estimated.** There is no
 *     `convertedAt` on an organisation, so there is no trial-conversion *rate*
 *     here — there are the counts that do exist. Guessing one from
 *     `status === 'active'` would produce a number that looks authoritative and
 *     is wrong for every tenant created before Phase 4.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date) {
  const copy = new Date(date);
  copy.setUTCHours(0, 0, 0, 0);
  return copy;
}

function daysAgo(days) {
  return new Date(Date.now() - days * DAY_MS);
}

// ── Platform revenue ─────────────────────────────

/**
 * The monthly-equivalent price of one subscription.
 *
 * A yearly plan is a twelfth of its yearly price, not its yearly price — the
 * distinction is the whole point of MRR, and getting it wrong inflates the figure
 * twelvefold for every annual customer.
 */
function monthlyPriceFor(plan, billingCycle) {
  if (!plan) return 0;
  if (billingCycle === 'yearly') {
    const yearly = Number(plan.yearlyPrice) || 0;
    return yearly / 12;
  }
  return Number(plan.monthlyPrice) || 0;
}

// A subscription counts towards MRR while the customer is contractually on the
// plan. 'past_due' is included deliberately: the money is still owed and the
// account still has access, so removing it from MRR would report a collections
// problem as churn. 'trial' and 'pending' are excluded — nothing has been billed.
const MRR_STATUSES = ['active', 'past_due'];

/**
 * MRR, ARR, ARPA and the split by plan, from live subscription state.
 *
 * Computed rather than stored, because it has to be right *now* — the daily
 * snapshot in `MetricsDaily` exists to draw the trend line, not to answer "what is
 * MRR today".
 */
async function computeRecurringRevenue() {
  const [subscriptions, plans] = await Promise.all([
    Subscription.find({ status: { $in: MRR_STATUSES } }).select('orgId planCode billingCycle status').lean(),
    Plan.find().lean()
  ]);
  const planMap = new Map(plans.map(plan => [plan.code, plan]));

  const byPlan = new Map();
  // One organisation may have more than one subscription row over its life (a
  // plan change writes a new one). Only the newest per org can be current, and
  // MRR_STATUSES can in principle match two, so collapse by org first —
  // otherwise a tenant that changed plan is counted twice.
  const perOrg = new Map();
  for (const subscription of subscriptions) {
    perOrg.set(String(subscription.orgId), subscription);
  }

  let mrr = 0;
  let payingOrgs = 0;
  for (const subscription of perOrg.values()) {
    const plan = planMap.get(subscription.planCode);
    const monthly = monthlyPriceFor(plan, subscription.billingCycle);
    const entry = byPlan.get(subscription.planCode) || {
      planCode: subscription.planCode,
      planName: plan?.name || subscription.planCode,
      orgs: 0,
      mrr: 0
    };
    entry.orgs += 1;
    entry.mrr += monthly;
    byPlan.set(subscription.planCode, entry);
    mrr += monthly;
    // A free plan is a real subscription but not revenue; counting it in ARPA
    // would drag the average towards zero and make the figure meaningless.
    if (monthly > 0) payingOrgs += 1;
  }

  return {
    mrr: Math.round(mrr),
    arr: Math.round(mrr * 12),
    payingOrgs,
    /** Average revenue per *paying* account. Null rather than 0 when there are
     *  none, so the console shows '—' instead of a confident ₹0. */
    arpa: payingOrgs ? Math.round(mrr / payingOrgs) : null,
    byPlan: [...byPlan.values()]
      .map(entry => ({ ...entry, mrr: Math.round(entry.mrr) }))
      .sort((a, b) => b.mrr - a.mrr)
  };
}

// ── Daily rollup ─────────────────────────────────

/**
 * Computes (or recomputes) one day's row.
 *
 * Idempotent: the same day rolled up twice produces the same row, which is what
 * makes a missed night recoverable by simply running it again.
 *
 * `snapshot` controls the fields that can only be observed, never reconstructed
 * (status mix, MRR). It defaults to true only for a day that has just ended —
 * see the comment on those fields in models/MetricsDaily.js.
 */
async function rollupDay(date = daysAgo(1), { snapshot } = {}) {
  const dayStart = startOfDay(date);
  const dayEnd = new Date(dayStart.getTime() + DAY_MS);
  const key = dayKey(dayStart);
  const createdOnDay = { $gte: dayStart, $lt: dayEnd };
  // Anything more than two days old is being backfilled, and today's status mix
  // says nothing about it.
  const takeSnapshot = snapshot ?? (Date.now() - dayEnd.getTime() < 2 * DAY_MS);

  const [
    signups,
    orgsTotal,
    invoiceAgg,
    paymentAgg,
    creditNotes,
    eventAgg,
    activeOrgs,
    activeUsers
  ] = await Promise.all([
    Organisation.countDocuments({ createdAt: createdOnDay }),
    Organisation.countDocuments({ createdAt: { $lt: dayEnd } }),
    Invoice.aggregate([
      { $match: { createdAt: createdOnDay } },
      { $group: { _id: null, count: { $sum: 1 }, value: { $sum: '$totals.total' } } }
    ]),
    Payment.aggregate([
      { $match: { createdAt: createdOnDay, status: 'success' } },
      { $group: { _id: null, count: { $sum: 1 }, value: { $sum: '$amount' } } }
    ]),
    CreditNote.countDocuments({ createdAt: createdOnDay }),
    UsageEvent.aggregate([
      { $match: { day: key } },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]),
    // `$addToSet` inside a $group would build the whole set in memory; counting
    // the distinct keys via a two-stage group keeps it bounded.
    UsageEvent.aggregate([
      { $match: { day: key, orgId: { $ne: null } } },
      { $group: { _id: '$orgId' } },
      { $count: 'count' }
    ]),
    UsageEvent.aggregate([
      { $match: { day: key, userId: { $ne: null } } },
      { $group: { _id: '$userId' } },
      { $count: 'count' }
    ])
  ]);

  const eventCounts = Object.fromEntries(eventAgg.map(row => [row._id, row.count]));
  const row = {
    date: key,
    signups,
    orgsTotal,
    activeOrgs: activeOrgs[0]?.count || 0,
    activeUsers: activeUsers[0]?.count || 0,
    logins: eventCounts[EVENT.login] || 0,
    invoicesCreated: invoiceAgg[0]?.count || 0,
    invoiceValue: Math.round(invoiceAgg[0]?.value || 0),
    paymentsRecorded: paymentAgg[0]?.count || 0,
    paymentValue: Math.round(paymentAgg[0]?.value || 0),
    creditNotesIssued: creditNotes,
    pdfRenders: eventCounts[EVENT.invoicePdf] || 0,
    exports: eventCounts[EVENT.exportCsv] || 0,
    emailsSent: eventCounts[EVENT.invoiceEmailed] || 0,
    computedAt: new Date()
  };

  if (takeSnapshot) {
    const [statusAgg, revenue] = await Promise.all([
      Organisation.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      computeRecurringRevenue()
    ]);
    const statusCounts = Object.fromEntries(statusAgg.map(entry => [entry._id, entry.count]));
    row.orgsActive = statusCounts.active || 0;
    row.orgsTrial = statusCounts.trial || 0;
    row.orgsSuspended = statusCounts.suspended || 0;
    row.orgsCancelled = statusCounts.cancelled || 0;
    row.mrr = revenue.mrr;
    row.payingOrgs = revenue.payingOrgs;
  }

  await MetricsDaily.findOneAndUpdate({ date: key }, { $set: row }, { upsert: true, new: true });
  return row;
}

/**
 * Fills any missing day in the trailing window, oldest first.
 *
 * Runs on a schedule *and* is safe to call on demand, which is what covers the
 * case the console actually hits: a deployment that was asleep for a week, whose
 * dashboard would otherwise show a gap that never fills.
 */
async function backfillMissingDays(days = 30) {
  const existing = new Set(
    (await MetricsDaily.find({ date: { $gte: dayKey(daysAgo(days)) } }).select('date').lean())
      .map(row => row.date)
  );
  const filled = [];
  // Yesterday backwards: today is still in progress and is computed live by
  // `platformSummary`, so writing a partial row for it would leave a permanently
  // wrong day if the process restarted before midnight.
  for (let offset = days; offset >= 1; offset -= 1) {
    const date = daysAgo(offset);
    const key = dayKey(startOfDay(date));
    if (existing.has(key)) continue;
    await rollupDay(date);
    filled.push(key);
  }
  return filled;
}

// ── Dashboard reads ──────────────────────────────

/** Distinct organisations and users active in a trailing window. */
async function activeCounts(days) {
  const since = daysAgo(days);
  const [orgs, users] = await Promise.all([
    UsageEvent.aggregate([
      { $match: { createdAt: { $gte: since }, orgId: { $ne: null } } },
      { $group: { _id: '$orgId' } },
      { $count: 'count' }
    ]),
    UsageEvent.aggregate([
      { $match: { createdAt: { $gte: since }, userId: { $ne: null } } },
      { $group: { _id: '$userId' } },
      { $count: 'count' }
    ])
  ]);
  return { orgs: orgs[0]?.count || 0, users: users[0]?.count || 0 };
}

/**
 * The console's headline numbers.
 *
 * Deliberately one endpoint rather than a dozen: the dashboard needs all of it at
 * once, and a screen that fires fifteen requests to draw one page is the pattern
 * Phase 3 removed from the tenant app.
 */
async function platformSummary() {
  const now = new Date();
  const [
    revenue,
    statusAgg,
    orgsTotal,
    usersTotal,
    signups24h,
    signups7d,
    signups30d,
    invoiceAgg,
    gmvAgg,
    activatedOrgs,
    dau,
    wau,
    mau,
    trialExpiringSoon,
    trialExpired,
    documents
  ] = await Promise.all([
    computeRecurringRevenue(),
    Organisation.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Organisation.countDocuments(),
    User.countDocuments({ role: { $ne: 'superadmin' } }),
    Organisation.countDocuments({ createdAt: { $gte: daysAgo(1) } }),
    Organisation.countDocuments({ createdAt: { $gte: daysAgo(7) } }),
    Organisation.countDocuments({ createdAt: { $gte: daysAgo(30) } }),
    Invoice.aggregate([
      { $match: { createdAt: { $gte: daysAgo(30) } } },
      { $group: { _id: null, count: { $sum: 1 }, value: { $sum: '$totals.total' } } }
    ]),
    // GMV: money tenants actually collected through the product. This is the
    // figure the old `overview` endpoint reported as "Platform Revenue", which it
    // is not — it is our customers' revenue, not ours.
    Payment.aggregate([
      { $match: { status: 'success' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]),
    // Activation: a tenant that has raised at least one invoice. Two stages
    // rather than `distinct`, which is unbounded in the response size.
    Invoice.aggregate([{ $group: { _id: '$orgId' } }, { $count: 'count' }]),
    activeCounts(1),
    activeCounts(7),
    activeCounts(30),
    Organisation.countDocuments({ status: 'trial', trialEndsAt: { $gte: now, $lte: new Date(Date.now() + 7 * DAY_MS) } }),
    Organisation.countDocuments({ status: 'trial', trialEndsAt: { $lt: now } }),
    Promise.all([
      Invoice.countDocuments(),
      Payment.countDocuments(),
      CreditNote.countDocuments()
    ])
  ]);

  const statusCounts = Object.fromEntries(statusAgg.map(entry => [entry._id, entry.count]));
  const activated = activatedOrgs[0]?.count || 0;
  const [invoices, payments, creditNotes] = documents;

  return {
    revenue: {
      ...revenue,
      /** Everything tenants have collected through the platform. Named so it can
       *  never again be mistaken for the platform's own revenue. */
      gmv: Math.round(gmvAgg[0]?.total || 0)
    },
    growth: {
      orgsTotal,
      usersTotal,
      signups: { last24h: signups24h, last7d: signups7d, last30d: signups30d },
      /** Share of tenants that have raised at least one invoice. The single most
       *  useful onboarding number, and previously uncomputable. */
      activatedOrgs: activated,
      activationRate: orgsTotal ? Math.round((activated / orgsTotal) * 1000) / 10 : 0,
      byStatus: {
        active: statusCounts.active || 0,
        trial: statusCounts.trial || 0,
        suspended: statusCounts.suspended || 0,
        cancelled: statusCounts.cancelled || 0
      },
      trials: { expiringIn7d: trialExpiringSoon, expired: trialExpired }
    },
    engagement: {
      dau: dau.users,
      wau: wau.users,
      mau: mau.users,
      activeOrgs7d: wau.orgs,
      activeOrgs30d: mau.orgs,
      /** DAU÷MAU — how much of the monthly audience shows up on a given day. */
      stickiness: mau.users ? Math.round((dau.users / mau.users) * 1000) / 10 : 0
    },
    volume: {
      invoices30d: invoiceAgg[0]?.count || 0,
      invoiceValue30d: Math.round(invoiceAgg[0]?.value || 0),
      invoicesTotal: invoices,
      paymentsTotal: payments,
      creditNotesTotal: creditNotes
    }
  };
}

/**
 * The trend series behind the dashboard's charts.
 *
 * Reads the rollup, then appends today computed live — a chart whose last point is
 * always missing reads as "usage stopped", which is the opposite of what an
 * in-progress day means.
 */
async function dailySeries(days = 30) {
  const bounded = Math.min(Math.max(Number(days) || 30, 7), 180);
  const rows = await MetricsDaily.find({ date: { $gte: dayKey(daysAgo(bounded)) } })
    .sort({ date: 1 })
    .lean();
  const today = await rollupDay(new Date(), { snapshot: true });
  const withoutToday = rows.filter(row => row.date !== today.date);
  return { days: bounded, series: [...withoutToday, today] };
}

/**
 * Tenants worth a phone call: paying, and quiet.
 *
 * 14 days is the threshold in the plan, and it is the right shape of question —
 * a tenant who is being billed and has not opened the product for a fortnight is
 * the one who churns next month.
 */
async function atRiskTenants({ inactiveDays = 14, limit = 25 } = {}) {
  const cutoff = daysAgo(inactiveDays);
  const orgs = await Organisation.find({
    status: { $in: ['active', 'trial'] },
    // A tenant that has *never* been seen counts as at risk. `$lt` alone would
    // silently exclude them, because a missing field never matches a comparison —
    // and a brand-new tenant who never came back is precisely the interesting case.
    $or: [{ lastActiveAt: { $lt: cutoff } }, { lastActiveAt: { $exists: false } }, { lastActiveAt: null }]
  })
    .select('name adminEmail plan status lastActiveAt createdAt trialEndsAt support')
    .sort({ lastActiveAt: 1, createdAt: 1 })
    .limit(Math.min(Number(limit) || 25, 100))
    .lean();

  return orgs.map(org => ({
    ...org,
    inactiveDays: org.lastActiveAt
      ? Math.floor((Date.now() - new Date(org.lastActiveAt).getTime()) / DAY_MS)
      : null
  }));
}

/** Trials with an end date inside the window — an actionable list, not a count. */
async function trialsExpiring({ withinDays = 7, limit = 25 } = {}) {
  const now = new Date();
  return Organisation.find({
    status: 'trial',
    trialEndsAt: { $gte: now, $lte: new Date(Date.now() + Math.min(Number(withinDays) || 7, 90) * DAY_MS) }
  })
    .select('name adminEmail plan trialEndsAt createdAt lastActiveAt')
    .sort({ trialEndsAt: 1 })
    .limit(Math.min(Number(limit) || 25, 100))
    .lean();
}

/**
 * Feature adoption: what share of tenants has ever used each capability, in the
 * window.
 *
 * The denominator is every organisation, not every *active* one — the question is
 * "did we get anyone to use this", and excluding the tenants who never came back
 * would flatter the answer.
 */
async function featureAdoption({ days = 30 } = {}) {
  const window = Math.min(Math.max(Number(days) || 30, 1), 180);
  const [orgsTotal, usage] = await Promise.all([
    Organisation.countDocuments(),
    UsageEvent.aggregate([
      { $match: { createdAt: { $gte: daysAgo(window) }, type: { $in: FEATURES.map(f => f.key) }, orgId: { $ne: null } } },
      { $group: { _id: { type: '$type', orgId: '$orgId' } } },
      { $group: { _id: '$_id.type', orgs: { $sum: 1 } } }
    ])
  ]);
  const usageMap = Object.fromEntries(usage.map(row => [row._id, row.orgs]));

  return {
    days: window,
    orgsTotal,
    // Every known feature appears, including the ones nobody touched — a zero
    // that is missing from the response is indistinguishable from a feature that
    // was never instrumented.
    features: FEATURES.map(feature => ({
      key: feature.key,
      label: feature.label,
      orgs: usageMap[feature.key] || 0,
      rate: orgsTotal ? Math.round(((usageMap[feature.key] || 0) / orgsTotal) * 1000) / 10 : 0
    }))
  };
}

/**
 * A tenant health score in 0–100.
 *
 * Deliberately a crude weighted sum of three signals the plan names — usage
 * recency, payment standing and whether they ever got going — rather than
 * something that looks statistical. Its job is to sort a support queue, and a
 * transparent formula that an operator can argue with is more useful than an
 * opaque one they have to trust.
 */
function healthScore({ lastActiveAt, subscriptionStatus, invoiceCount, status }) {
  let score = 0;

  const idleDays = lastActiveAt ? (Date.now() - new Date(lastActiveAt).getTime()) / DAY_MS : Infinity;
  if (idleDays <= 1) score += 50;
  else if (idleDays <= 7) score += 40;
  else if (idleDays <= 14) score += 25;
  else if (idleDays <= 30) score += 10;

  if (subscriptionStatus === 'active') score += 30;
  else if (subscriptionStatus === 'trial') score += 15;
  else if (subscriptionStatus === 'past_due') score += 5;

  if (invoiceCount >= 25) score += 20;
  else if (invoiceCount >= 5) score += 14;
  else if (invoiceCount >= 1) score += 8;

  if (status === 'suspended' || status === 'cancelled') score = Math.min(score, 20);
  return Math.max(0, Math.min(100, score));
}

// ── Scheduler ────────────────────────────────────

// Hourly. The rollup only writes days that are missing, so an hourly tick is
// cheap and means a deployment restarted at 00:05 doesn't lose a day.
const ROLLUP_INTERVAL_MS = 60 * 60 * 1000;
let timer = null;
let running = false;

async function runRollupOnce() {
  if (running) return null;
  running = true;
  try {
    const filled = await backfillMissingDays(30);
    if (filled.length) logger.info('metrics rollup', { days: filled.length, from: filled[0], to: filled[filled.length - 1] });
    return filled;
  } catch (error) {
    logger.error('metrics rollup failed', { err: error });
    return null;
  } finally {
    running = false;
  }
}

function startMetricsScheduler() {
  if (timer) return timer;
  setTimeout(runRollupOnce, 30 * 1000).unref();
  timer = setInterval(runRollupOnce, ROLLUP_INTERVAL_MS);
  timer.unref();
  logger.info('metrics scheduler started', { intervalMs: ROLLUP_INTERVAL_MS });
  return timer;
}

function stopMetricsScheduler() {
  if (timer) clearInterval(timer);
  timer = null;
}

module.exports = {
  monthlyPriceFor,
  computeRecurringRevenue,
  rollupDay,
  backfillMissingDays,
  platformSummary,
  dailySeries,
  atRiskTenants,
  trialsExpiring,
  featureAdoption,
  healthScore,
  runRollupOnce,
  startMetricsScheduler,
  stopMetricsScheduler
};
