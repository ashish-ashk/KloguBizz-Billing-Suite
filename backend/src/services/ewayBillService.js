const { env } = require('../config/env');
const { roundMoney } = require('./gstService');
const { isValidGstin } = require('../validators/common');

/**
 * E-way bills (2.1 #6).
 *
 * A movement of goods above a threshold cannot legally travel without one, and
 * an interception without a valid bill is a penalty and a detained vehicle. The
 * document itself is not hard; **deciding whether one is needed, and refusing to
 * generate a wrong one, is where all the judgement is**.
 *
 * ── Why this ships without a provider ─────────────────────────────────
 *
 * Exactly as e-invoicing did. Generating a bill needs a live GSP connection and
 * credentials this environment does not have, so `callEwbApi` is a stub with a
 * precise contract rather than a guess at one vendor's API — every GSP has its
 * own auth dance and its own error envelope, and a mock would only prove the
 * mock works.
 *
 * What is *not* deferred is the part that carries the risk: eligibility, the
 * validation, the payload, and the validity window. That is the majority of the
 * work, it is fully testable without credentials, and it is where a mistake
 * costs a detained lorry rather than an API error.
 */

/**
 * The value above which a movement needs a bill.
 *
 * ₹50,000 is the inter-state figure in rule 138, and it is measured on the
 * **consignment value including tax** — not the taxable value, which is the
 * mistake that puts a ₹49,000 + GST consignment on the road without a bill.
 *
 * Intra-state thresholds are set by each state and genuinely differ (some are
 * ₹1,00,000, some have no threshold for particular goods). Rather than encode a
 * table that would be wrong within a year, the threshold is configurable per
 * organisation and this is the default — with the divergence stated, so nobody
 * assumes the number is authoritative for their state.
 */
const DEFAULT_THRESHOLD = 50000;

/** Transport modes, in the numbering the API uses. */
const TRANSPORT_MODES = { road: 1, rail: 2, air: 3, ship: 4 };

/** Rule 138 reasons for transportation. */
const SUPPLY_SUB_TYPES = [
  'supply', 'export', 'job-work', 'skd-ckd', 'recipient-not-known',
  'for-own-use', 'exhibition-or-fairs', 'line-sales', 'others'
];

/**
 * Whether a line is a service rather than goods.
 *
 * Decided from the **HSN/SAC code**, because that is the only signal an invoice
 * line actually carries — there is no `isService` flag on `Invoice.items`, and
 * the first version of this checked for one that does not exist, so the services
 * rule silently never fired.
 *
 * The rule itself is real and checkable: service accounting codes are the 99xx
 * chapter (`998311` consulting, `996812` courier), and nothing that physically
 * moves has one. A line with no code at all is treated as goods — the
 * conservative direction, since suggesting an e-way bill for something that does
 * not need one costs a moment, and omitting one for goods that do costs a
 * detained vehicle.
 */
function isServiceLine(item) {
  return String(item?.hsn || '').startsWith('99');
}

/** A commercial vehicle number, in any of the formats RTOs actually issue. */
const VEHICLE_PATTERN = /^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}$/;

/**
 * Whether this document needs an e-way bill at all.
 *
 * Returns a reason either way, because "no bill needed" is an answer a user acts
 * on and a bare `false` is not.
 */
function assessRequirement({ invoice, org, threshold = DEFAULT_THRESHOLD }) {
  if (!invoice) return { required: false, reason: 'No document.' };

  if (invoice.status === 'draft') {
    return { required: false, reason: 'A draft has not been issued, so nothing is moving yet.' };
  }
  if (invoice.status === 'cancelled') {
    return { required: false, reason: 'This invoice has been cancelled.' };
  }

  /**
   * Services do not move.
   *
   * An e-way bill covers the *movement of goods*. A consulting invoice for
   * ₹5,00,000 needs none, and generating one would be a false declaration of a
   * consignment that does not exist.
   */
  const items = invoice.items || [];
  const hasGoods = items.some(item => !isServiceLine(item));
  if (!hasGoods && items.length) {
    return { required: false, reason: 'This invoice is for services, and an e-way bill covers the movement of goods.' };
  }

  const value = roundMoney(invoice.totals?.total || 0);
  if (value < threshold) {
    return {
      required: false,
      reason: `The consignment value of ₹${value.toLocaleString('en-IN')} is below the ₹${threshold.toLocaleString('en-IN')} threshold.`,
      value,
      threshold
    };
  }

  return {
    required: true,
    reason: `The consignment value of ₹${value.toLocaleString('en-IN')} is at or above the ₹${threshold.toLocaleString('en-IN')} threshold.`,
    value,
    threshold,
    /**
     * Stated rather than assumed.
     *
     * The threshold differs by state for intra-state movement, and this figure
     * is the inter-state one. Telling the user which rule was applied lets them
     * catch a wrong default; hiding it means they find out at a checkpoint.
     */
    note: invoice.totals?.isIGST
      ? 'Inter-state movement: the ₹50,000 threshold in rule 138 applies.'
      : 'Intra-state movement: your state may set a different threshold. Check the figure configured for your organisation.',
    orgState: org?.stateCode
  };
}

/**
 * Everything that would make the GSP reject the bill, found before calling it.
 *
 * The same reasoning as `validateForIrp`: a missing HSN or a malformed vehicle
 * number should produce a sentence the user can act on, not a numeric error code
 * from a portal.
 */
function validateForEwb({ invoice, org, client, transport = {} }) {
  const errors = [];

  if (!isValidGstin(org?.gstin)) {
    errors.push('Your organisation needs a valid GSTIN before an e-way bill can be raised.');
  }
  if (!org?.address) errors.push('Your organisation needs an address — it is the place of dispatch.');
  if (!org?.stateCode) errors.push('Your organisation needs a state code.');

  const buyerGstin = client?.gstin || invoice?.billTo?.gstin;
  if (buyerGstin && !isValidGstin(buyerGstin)) {
    errors.push(`The buyer's GSTIN "${buyerGstin}" is not valid.`);
  }
  const deliveryState = invoice?.placeOfSupply || client?.stateCode || invoice?.billTo?.stateCode;
  if (!deliveryState) {
    errors.push('A place of supply is required — it is the destination the bill declares.');
  }

  /**
   * Every line needs an HSN.
   *
   * Not a formality: the portal rejects the bill without one, and the reason a
   * user gets back is a code. Checked per line so the message names the item
   * rather than saying "some line is missing something".
   */
  for (const [index, item] of (invoice?.items || []).entries()) {
    if (isServiceLine(item)) continue;
    if (!item.hsn) errors.push(`Line ${index + 1} ("${item.desc}") needs an HSN code.`);
    if (!(Number(item.qty) > 0)) errors.push(`Line ${index + 1} ("${item.desc}") needs a quantity.`);
  }

  // ── Part B ──
  const mode = String(transport.mode || 'road').toLowerCase();
  if (!TRANSPORT_MODES[mode]) {
    errors.push(`Transport mode must be one of: ${Object.keys(TRANSPORT_MODES).join(', ')}.`);
  }

  if (mode === 'road') {
    const vehicle = String(transport.vehicleNumber || '').toUpperCase().replace(/[\s-]/g, '');
    if (!vehicle) {
      errors.push('A vehicle number is required for movement by road.');
    } else if (!VEHICLE_PATTERN.test(vehicle)) {
      errors.push(`"${transport.vehicleNumber}" is not a valid vehicle number. Expected a format like MH12AB1234.`);
    }
  } else if (!transport.transportDocNumber) {
    // Rail, air and ship carry a document number instead of a vehicle.
    errors.push(`Movement by ${mode} needs a transport document number.`);
  }

  const distance = Number(transport.distanceKm);
  if (!Number.isFinite(distance) || distance <= 0) {
    errors.push('An approximate distance in kilometres is required — it determines how long the bill is valid.');
  } else if (distance > 4000) {
    errors.push('A distance over 4,000 km is not accepted; check the figure.');
  }

  if (transport.transporterGstin && !isValidGstin(transport.transporterGstin)) {
    errors.push(`The transporter's GSTIN "${transport.transporterGstin}" is not valid.`);
  }

  if (transport.supplySubType && !SUPPLY_SUB_TYPES.includes(transport.supplySubType)) {
    errors.push(`Reason for transportation must be one of: ${SUPPLY_SUB_TYPES.join(', ')}.`);
  }

  return { ok: errors.length === 0, errors };
}

/**
 * How long the bill is valid, from the distance.
 *
 * Rule 138(10): one day per 200 km for regular cargo, one day per 20 km for
 * over-dimensional cargo, and **a minimum of one day** — the part that is easy
 * to get wrong, because a 5 km delivery computes to zero days and a bill valid
 * for no time at all is worse than none.
 *
 * A "day" here is a period ending at midnight of the following day, which is why
 * this returns whole days rather than hours.
 */
function validityDays(distanceKm, { overDimensional = false } = {}) {
  const perDay = overDimensional ? 20 : 200;
  return Math.max(1, Math.ceil(Number(distanceKm) / perDay));
}

/**
 * Builds the payload.
 *
 * Field names follow the NIC e-way bill API rather than this codebase's
 * conventions, deliberately: the mapping has to be readable against the official
 * schema when somebody is debugging a rejection, and a helpfully-renamed field is
 * a field nobody can find in the portal's documentation.
 */
function buildEwbPayload({ invoice, org, client, transport = {} }) {
  const buyerGstin = client?.gstin || invoice?.billTo?.gstin || 'URP';
  const buyerName = client?.companyName || invoice?.billTo?.name || 'Unregistered buyer';
  const deliveryState = invoice?.placeOfSupply || client?.stateCode || invoice?.billTo?.stateCode;
  const mode = String(transport.mode || 'road').toLowerCase();
  const distance = Number(transport.distanceKm) || 0;

  const itemList = (invoice.items || [])
    // Service lines are excluded from the consignment: an e-way bill declares
    // what is physically moving, and freight billed alongside goods is not cargo.
    .filter(item => !isServiceLine(item))
    .map(item => ({
      productName: item.desc,
      hsnCode: Number(item.hsn) || item.hsn,
      quantity: Number(item.qty),
      qtyUnit: item.unit || 'NOS',
      taxableAmount: roundMoney(Number(item.qty) * Number(item.rate)),
      sgstRate: invoice.totals?.isIGST ? 0 : Number(item.gstRate) / 2,
      cgstRate: invoice.totals?.isIGST ? 0 : Number(item.gstRate) / 2,
      igstRate: invoice.totals?.isIGST ? Number(item.gstRate) : 0,
      cessRate: Number(item.cessRate) || 0
    }));

  return {
    supplyType: 'O',
    subSupplyType: transport.supplySubType || 'supply',
    docType: 'INV',
    docNo: invoice.invoiceNumber,
    docDate: formatDate(invoice.date),

    fromGstin: org.gstin,
    fromTrdName: org.name,
    fromAddr1: org.address,
    fromPlace: org.city || org.state || '',
    fromStateCode: Number(org.stateCode),
    // Where the goods actually leave from, which is not always the registered
    // address — a warehouse dispatch declared from the head office is a
    // mismatch an officer can see on the road.
    actFromStateCode: Number(transport.dispatchStateCode || org.stateCode),

    toGstin: buyerGstin,
    toTrdName: buyerName,
    toAddr1: client?.address || invoice?.billTo?.address || '',
    toPlace: client?.city || client?.state || '',
    toStateCode: Number(deliveryState),
    actToStateCode: Number(transport.deliveryStateCode || deliveryState),

    totalValue: roundMoney(invoice.totals?.subtotal || 0),
    cgstValue: roundMoney(invoice.totals?.cgst || 0),
    sgstValue: roundMoney(invoice.totals?.sgst || 0),
    igstValue: roundMoney(invoice.totals?.igst || 0),
    cessValue: roundMoney(invoice.totals?.cess || 0),
    totInvValue: roundMoney(invoice.totals?.total || 0),

    transporterId: transport.transporterGstin || '',
    transporterName: transport.transporterName || '',
    transDocNo: transport.transportDocNumber || '',
    transDocDate: transport.transportDocDate ? formatDate(transport.transportDocDate) : '',
    transMode: TRANSPORT_MODES[mode],
    transDistance: String(Math.round(distance)),
    vehicleNo: String(transport.vehicleNumber || '').toUpperCase().replace(/[\s-]/g, ''),
    vehicleType: transport.overDimensional ? 'O' : 'R',

    itemList
  };
}

/** `dd/mm/yyyy`, which is what the portal expects and not what anything else here uses. */
function formatDate(value) {
  const date = new Date(value);
  const pad = n => String(n).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

function isEwbConfigured() {
  return Boolean(env.EWB_BASE_URL && env.EWB_USERNAME && env.EWB_PASSWORD);
}

/**
 * The provider boundary.
 *
 * The only function here that changes to go live, and deliberately not faked —
 * the same reasoning as `eInvoiceService#callIrp`.
 */
async function callEwbApi() {
  const error = new Error(
    'No e-way bill provider is configured. Set EWB_BASE_URL, EWB_USERNAME and EWB_PASSWORD, '
    + 'and implement the provider adapter in services/ewayBillService.js#callEwbApi.'
  );
  error.statusCode = 501;
  error.code = 'EWB_NOT_CONFIGURED';
  throw error;
}

/**
 * Validates, builds and submits.
 *
 * Fails on validation *before* touching the provider, so the common problems —
 * a missing HSN, a mistyped vehicle number — produce something the user can fix
 * rather than a portal error code.
 */
async function generateEwayBill({ invoice, org, client, transport, threshold }) {
  const requirement = assessRequirement({ invoice, org, threshold });
  if (!requirement.required) {
    const error = new Error(requirement.reason);
    error.statusCode = 400;
    error.code = 'EWB_NOT_REQUIRED';
    throw error;
  }

  const validation = validateForEwb({ invoice, org, client, transport });
  if (!validation.ok) {
    const error = new Error(validation.errors[0]);
    error.statusCode = 400;
    error.code = 'EWB_VALIDATION_FAILED';
    error.details = validation.errors;
    throw error;
  }

  const payload = buildEwbPayload({ invoice, org, client, transport });
  return callEwbApi(payload);
}

module.exports = {
  assessRequirement,
  isServiceLine,
  validateForEwb,
  validityDays,
  buildEwbPayload,
  generateEwayBill,
  isEwbConfigured,
  DEFAULT_THRESHOLD,
  TRANSPORT_MODES,
  SUPPLY_SUB_TYPES
};
