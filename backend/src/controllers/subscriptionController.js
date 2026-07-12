const { Plan } = require('../models/Plan');
const { Subscription } = require('../models/Subscription');
const { Organisation } = require('../models/Organisation');
const { asyncHandler } = require('../utils/asyncHandler');
const { httpError } = require('../utils/httpError');
const { createSubscription } = require('../services/razorpayService');
const { getUsage } = require('../services/planService');
const { logAudit } = require('../services/auditService');

const listPlans = asyncHandler(async (req, res) => {
  res.json(await Plan.find({ active: true }).sort({ sortOrder: 1 }));
});

const currentSubscription = asyncHandler(async (req, res) => {
  const subscription = await Subscription.findOne({ orgId: req.orgId }).sort({ createdAt: -1 });
  const usage = await getUsage(req.orgId);
  res.json({ subscription, usage });
});

// Starting a subscription also handles plan switches: the newest
// subscription for the org wins and the org record mirrors the plan code.
const startSubscription = asyncHandler(async (req, res) => {
  const { planCode, billingCycle = 'monthly' } = req.body;
  const plan = await Plan.findOne({ code: planCode, active: true });
  if (!plan) throw httpError(400, 'Unknown plan');
  const result = await createSubscription({ planCode, orgId: req.orgId });
  const subscription = await Subscription.create({
    orgId: req.orgId,
    planCode,
    billingCycle,
    status: 'active',
    razorpaySubscriptionId: result.id
  });
  await Organisation.findByIdAndUpdate(req.orgId, { plan: planCode, status: 'active' });
  logAudit({ req, action: 'subscription.started', entity: 'subscription', entityId: subscription._id, meta: { planCode, billingCycle } });
  res.status(201).json({ subscription, provider: result });
});

const cancelSubscription = asyncHandler(async (req, res) => {
  const subscription = await Subscription.findOne({ orgId: req.orgId }).sort({ createdAt: -1 });
  if (!subscription) throw httpError(404, 'No active subscription');
  subscription.status = 'cancelled';
  subscription.endDate = new Date();
  await subscription.save();
  logAudit({ req, action: 'subscription.cancelled', entity: 'subscription', entityId: subscription._id, meta: { planCode: subscription.planCode } });
  res.json(subscription);
});

module.exports = { listPlans, currentSubscription, startSubscription, cancelSubscription };
