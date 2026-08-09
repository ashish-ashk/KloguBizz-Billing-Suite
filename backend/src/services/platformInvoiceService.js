const { PlatformInvoice } = require('../models/PlatformInvoice');
const { Organisation } = require('../models/Organisation');
const { GlobalSetting } = require('../models/Settings');
const { calculateInvoiceTotals } = require('./gstService');
const { logger } = require('../utils/logger');

/**
 * Issuing the platform's own tax invoices (3.3 #10).
 *
 * See `models/PlatformInvoice.js` for why this is a separate document rather
 * than an `Invoice` with us as the supplier.
 */

/** The financial year a date falls in, labelled by its starting year — April to
 *  March, which is what every Indian numbering series resets on. */
function financialYearOf(date) {
  const d = new Date(date);
  return d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
}

/**
 * The platform's own supplier identity.
 *
 * Held as a `GlobalSetting` because there is no platform `Organisation` to hang
 * it on, and inventing one would corrupt every tenant metric — see the model.
 */
async function getBillingIdentity() {
  const setting = await GlobalSetting.findOne({ key: 'platformBilling' }).lean();
  return setting?.value || null;
}

/**
 * Whether we are able to issue a compliant invoice at all.
 *
 * Checked before every issue and reported on the console, because the failure is
 * otherwise invisible until an accountant asks a customer for a document that
 * was never produced. A tax invoice missing the supplier's GSTIN is not a
 * slightly worse invoice; it is not a tax invoice.
 */
function assessIdentity(identity) {
  const missing = [];
  if (!identity) return { ready: false, missing: ['the whole platformBilling setting'] };
  if (!identity.legalName) missing.push('legal name');
  if (!identity.gstin) missing.push('GSTIN');
  if (!identity.address) missing.push('address');
  if (!identity.stateCode) missing.push('state code');
  return { ready: missing.length === 0, missing };
}

/**
 * The counter lives under its own key, away from the editable identity.
 *
 * It started on the `platformBilling` document beside the GSTIN and address, and
 * that was a genuine bug rather than untidiness: the console saves settings by
 * replacing `value` wholesale, so **saving the billing identity from a form that
 * does not include the counter resets it to zero** — and the next invoice reuses
 * a number already sent to a customer. A duplicate in a legally-consecutive tax
 * invoice series has to be explained to an assessing officer.
 *
 * A separate key that no form writes makes that impossible rather than merely
 * unlikely. Found by a test whose setup did exactly what the console does; the
 * unique index on `invoiceNumber` is what surfaced it.
 */
const COUNTER_KEY = 'platformInvoiceCounter';

/**
 * Allocates the next number in the platform's series.
 *
 * A single atomic `findOneAndUpdate`, mirroring
 * `invoiceNumberService.nextDocumentNumber`: the increment-versus-FY-reset
 * decision happens inside MongoDB, so there is no read-then-write window for two
 * concurrent charges to take the same number.
 *
 * **Consecutiveness is a legal requirement, not a preference.** A tax invoice
 * series must run unbroken within a financial year, and a duplicate or a gap has
 * to be explained to an assessing officer.
 */
async function nextInvoiceNumber(date = new Date()) {
  const fy = financialYearOf(date);
  const identity = await getBillingIdentity();

  const updated = await GlobalSetting.findOneAndUpdate(
    { key: COUNTER_KEY },
    [{
      $set: {
        'value.sequenceFY': String(fy),
        'value.sequence': {
          $cond: [
            { $eq: [{ $ifNull: ['$value.sequenceFY', null] }, String(fy)] },
            // Same year: carry on.
            { $add: [{ $ifNull: ['$value.sequence', 0] }, 1] },
            {
              $cond: [
                { $eq: [{ $ifNull: ['$value.sequenceFY', null] }, null] },
                /**
                 * Never tagged with a year before.
                 *
                 * Increment whatever count is there rather than resetting to 1 —
                 * a platform that has already issued invoices must not have its
                 * counter zeroed, or the next few numbers would collide with
                 * ones already sent to customers.
                 */
                { $add: [{ $ifNull: ['$value.sequence', 0] }, 1] },
                // A genuinely past year: a real rollover.
                1
              ]
            }
          ]
        }
      }
    }],
    { new: true, upsert: true }
  ).lean();

  const sequence = updated?.value?.sequence || 1;
  const prefix = identity?.invoicePrefix || 'KB';
  return `${prefix}-${fy}-${String(sequence).padStart(4, '0')}`;
}

/**
 * Issues one invoice for one charge.
 *
 * Idempotent on `providerPaymentId`: the unique index refuses a second write for
 * the same charge, and a duplicate is returned rather than raised as an error.
 * Razorpay retries webhooks deliberately and often, and two tax invoices for one
 * payment is worse than none — both carry consecutive numbers from a legally
 * consecutive series, and cancelling one leaves a gap to explain.
 */
async function issueForCharge({ subscription, org, providerPaymentId, amount, date = new Date(), period = {} }) {
  if (providerPaymentId) {
    const existing = await PlatformInvoice.findOne({ providerPaymentId }).lean();
    if (existing) return { invoice: existing, alreadyIssued: true };
  }

  const identity = await getBillingIdentity();
  const readiness = assessIdentity(identity);
  if (!readiness.ready) {
    /**
     * Deliberately not thrown.
     *
     * This is called from the payment webhook, and failing there would make
     * Razorpay retry a charge that has already succeeded — turning a
     * configuration gap into a payment-processing problem. The money arrived and
     * the subscription is active either way; the missing document is a real
     * problem that a person has to fix, and the console reports it.
     */
    logger.error('platform invoice not issued — billing identity incomplete', { missing: readiness.missing });
    return { invoice: null, skipped: true, missing: readiness.missing };
  }

  /**
   * The amount comes from the subscription's own snapshot (3.3 #9).
   *
   * Not the live plan price. A customer grandfathered at ₹999 must be invoiced
   * ₹999, and an invoice quoting a price they never agreed to is both wrong and
   * unclaimable.
   */
  const charged = amount ?? (subscription.billingCycle === 'yearly'
    ? subscription.pricing?.yearlyPrice
    : subscription.pricing?.monthlyPrice);

  if (!(Number(charged) > 0)) {
    // A free plan generates no charge and therefore no tax invoice. Not an
    // error — there is genuinely nothing to document.
    return { invoice: null, skipped: true, reason: 'no amount was charged' };
  }

  const gstRate = Number(identity.gstRate ?? 18);
  const sac = identity.sac || '997331';

  /**
   * The price is treated as **inclusive of GST**.
   *
   * Because it is: the plan page shows ₹999 and Razorpay charges ₹999. Treating
   * it as exclusive would invoice ₹999 + ₹180 and disagree with the customer's
   * card statement by the tax — the one number they will check.
   */
  const items = [{
    desc: `${subscription.planName || subscription.planCode} subscription`,
    hsn: sac,
    qty: 1,
    rate: Number(charged),
    gstRate,
    taxInclusive: true
  }];

  /**
   * Place of supply is the customer's state.
   *
   * For a service to a registered person that is what the law says, and it is
   * what decides IGST versus CGST+SGST. Get it backwards and the customer cannot
   * claim the credit, because the tax head on our invoice will not match what
   * their return expects.
   */
  const placeOfSupply = org.stateCode || identity.stateCode;
  const totals = calculateInvoiceTotals(items, identity.stateCode, placeOfSupply, { roundOff: true });

  const invoiceNumber = await nextInvoiceNumber(date);

  try {
    const invoice = await PlatformInvoice.create({
      invoiceNumber,
      date,
      orgId: org._id,
      billTo: {
        name: org.name,
        gstin: org.gstin || '',
        address: org.address || '',
        stateCode: org.stateCode || '',
        email: org.adminEmail || ''
      },
      supplier: {
        name: identity.legalName,
        gstin: identity.gstin,
        pan: identity.pan || '',
        address: identity.address,
        stateCode: identity.stateCode
      },
      placeOfSupply,
      items: [{
        description: items[0].desc,
        sac,
        qty: 1,
        rate: totals.items?.[0]?.rate ?? Number(charged),
        gstRate
      }],
      totals: {
        subtotal: totals.subtotal,
        cgst: totals.cgst,
        sgst: totals.sgst,
        igst: totals.igst,
        cess: totals.cess,
        roundOff: totals.roundOff,
        total: totals.total,
        isIGST: totals.isIGST
      },
      planCode: subscription.planCode,
      planName: subscription.planName || subscription.planCode,
      billingCycle: subscription.billingCycle,
      periodStart: period.start || null,
      periodEnd: period.end || subscription.currentPeriodEnd || null,
      providerPaymentId: providerPaymentId || null,
      providerSubscriptionId: subscription.razorpaySubscriptionId
    });
    return { invoice: invoice.toObject(), alreadyIssued: false };
  } catch (error) {
    if (error?.code === 11000 && providerPaymentId) {
      // Two webhook deliveries raced past the read above. The index is the real
      // guard; this returns the winner rather than failing the retry.
      const existing = await PlatformInvoice.findOne({ providerPaymentId }).lean();
      if (existing) return { invoice: existing, alreadyIssued: true };
    }
    throw error;
  }
}

/**
 * Issues an invoice from a charge, without ever failing the caller.
 *
 * Called from the payment webhook. A document that could not be produced is a
 * problem for a person to fix; a webhook that returns non-200 is a problem
 * Razorpay solves by retrying a charge that already succeeded.
 */
async function issueForChargeSafely(args) {
  try {
    return await issueForCharge(args);
  } catch (error) {
    logger.error('platform invoice failed', { err: error, orgId: String(args?.org?._id) });
    return { invoice: null, failed: true };
  }
}

/** Every charge that produced no invoice — the console's list of things to fix. */
async function listMissing({ from, to }) {
  const orgs = await Organisation.find({ status: { $in: ['active', 'suspended'] } })
    .select('name').lean();
  const byId = new Map(orgs.map(o => [String(o._id), o]));
  const issued = await PlatformInvoice.find({ date: { $gte: from, $lte: to } })
    .select('orgId').lean();
  const covered = new Set(issued.map(i => String(i.orgId)));
  return [...byId.values()]
    .filter(org => !covered.has(String(org._id)))
    .map(org => ({ orgId: org._id, name: org.name }));
}

module.exports = {
  getBillingIdentity,
  assessIdentity,
  nextInvoiceNumber,
  issueForCharge,
  issueForChargeSafely,
  listMissing,
  financialYearOf
};
