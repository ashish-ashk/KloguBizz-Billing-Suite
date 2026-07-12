const { Organisation } = require('../models/Organisation');
const { Plan } = require('../models/Plan');
const { User } = require('../models/User');
const { Invoice } = require('../models/Invoice');
const { httpError } = require('../utils/httpError');

async function getPlanForOrg(orgId) {
  const org = await Organisation.findById(orgId);
  if (!org) throw httpError(404, 'Organisation not found');
  const plan = await Plan.findOne({ code: org.plan });
  return { org, plan };
}

// Usage counters shown on the subscription page and used for quota checks.
async function getUsage(orgId) {
  const { org, plan } = await getPlanForOrg(orgId);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const [users, invoicesThisMonth] = await Promise.all([
    User.countDocuments({ orgId, status: { $ne: 'disabled' } }),
    Invoice.countDocuments({ orgId, createdAt: { $gte: monthStart } })
  ]);
  return {
    plan: org.plan,
    planName: plan?.name || org.plan,
    users,
    userLimit: plan?.userLimit ?? null,
    invoicesThisMonth,
    invoiceLimit: plan?.invoiceLimit ?? null
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

module.exports = { getUsage, assertInvoiceQuota, assertUserQuota };
