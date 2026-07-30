/**
 * Invoice tax engine.
 *
 * Every money figure on an invoice is produced here and nowhere else, so the
 * stored totals, the PDF, the CSV export and the GST report can never disagree
 * with each other.
 *
 * What this handles that the previous version did not:
 *  - per-line and invoice-level discounts, kept as first-class figures rather
 *    than silently folded into the unit rate (which destroyed the gross value
 *    and hid the discount from the customer, who is entitled to see it)
 *  - tax-inclusive line rates, back-calculated instead of taxed a second time
 *  - GST compensation cess
 *  - per-line rounding, so the customer's own line-by-line arithmetic matches
 *  - a round-off adjustment to a whole rupee, the Indian billing convention
 *  - UTGST for Union Territories that don't levy SGST
 *  - explicit rejection of non-numeric input, instead of writing NaN totals to
 *    the database and discovering it later in a broken PDF
 */

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

/**
 * Coerces a user-supplied number, refusing anything that isn't finite.
 * Returning 0 for a NaN would quietly under-bill; throwing surfaces the bad
 * input as a 400 at the API boundary instead.
 */
function num(value, field, { fallback = 0 } = {}) {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    const error = new Error(`${field} must be a number (received ${JSON.stringify(value)})`);
    error.statusCode = 400;
    throw error;
  }
  return parsed;
}

function clampPercent(value, field) {
  return Math.min(100, Math.max(0, num(value, field)));
}

// Union Territories that levy UTGST rather than SGST. Delhi (07), Puducherry
// (34) and Jammu & Kashmir (01) have their own legislatures and levy SGST, so
// they are deliberately absent.
const UT_STATE_CODES = new Set(['04', '26', '31', '35', '38', '97']);

function normaliseStateCode(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim().padStart(2, '0');
}

/**
 * Prices a single line.
 *
 * Exported because the PDF renderer, the on-screen document and the GST report
 * all need the same per-line figures. They previously each recomputed
 * `qty * rate` in their own way, which is how the printed invoice, the stored
 * totals and the report managed to disagree about a discounted line.
 *
 * @param item                     { qty, rate, gstRate, cessRate, discountPercent, taxInclusive }
 * @param invoiceDiscountPercent   invoice-level discount, applied after the line's own
 * @param field                    label used in error messages
 */
function calculateLine(item = {}, invoiceDiscountPercent = 0, field = 'item') {
  const qty = num(item.qty, `${field}.qty`);
  const rawRate = num(item.rate, `${field}.rate`);
  const gstRate = clampPercent(item.gstRate ?? 18, `${field}.gstRate`);
  const cessRate = clampPercent(item.cessRate, `${field}.cessRate`);
  const lineDiscount = clampPercent(item.discountPercent, `${field}.discountPercent`);
  const invoiceDiscount = clampPercent(invoiceDiscountPercent, 'discountPercent');

  // A tax-inclusive rate already contains GST and cess, so strip them out to
  // reach the taxable rate. Taxing the inclusive figure as-is (what happened
  // before) overcharges the customer by the tax on the tax.
  const rate = item.taxInclusive
    ? roundMoney(rawRate / (1 + (gstRate + cessRate) / 100))
    : rawRate;

  const gross = roundMoney(qty * rate);
  const lineDiscountAmount = roundMoney(gross * lineDiscount / 100);
  const afterLineDiscount = roundMoney(gross - lineDiscountAmount);
  // The invoice-level discount is spread across lines in proportion to value,
  // so tax is charged on what the customer actually pays — which is what the
  // GST rules require when the discount is shown on the invoice.
  const invoiceDiscountAmount = roundMoney(afterLineDiscount * invoiceDiscount / 100);
  const taxable = roundMoney(afterLineDiscount - invoiceDiscountAmount);

  const tax = roundMoney(taxable * gstRate / 100);
  const cess = roundMoney(taxable * cessRate / 100);

  return {
    qty,
    // The taxable unit rate — differs from the entered rate on inclusive lines.
    rate,
    // What was typed in, for display on the document.
    enteredRate: rawRate,
    gstRate,
    cessRate,
    discountPercent: lineDiscount,
    gross,
    discount: roundMoney(lineDiscountAmount + invoiceDiscountAmount),
    taxable,
    tax,
    cess,
    total: roundMoney(taxable + tax + cess)
  };
}

/**
 * How a supply is classified for GST.
 *
 * `gstRate: 0` used to be the only way to express "no tax on this line", which
 * collapsed five legally distinct things into one and made correct GSTR-1
 * classification impossible: an exempt supply, a nil-rated supply, a non-GST
 * supply, a zero-rated export and a genuinely 0% taxable supply all appear in
 * different tables of the return, and only one of them counts towards the
 * turnover on which registration and e-invoicing thresholds are based.
 */
const TAX_TREATMENTS = ['taxable', 'exempt', 'nil-rated', 'non-gst', 'zero-rated'];

/**
 * The nature of the supply, which decides both the tax head and the GSTR-1 table.
 *
 * A zero-rated supply (export or SEZ) can be made two ways, and the difference is
 * not cosmetic: **with payment** of IGST, which is then refunded, or **without
 * payment** under a Letter of Undertaking. Charging IGST on a LUT export
 * overcharges the customer and misreports the return; not charging it on a
 * with-payment export understates the liability.
 */
const SUPPLY_TYPES = [
  'regular',
  'export-with-payment',
  'export-without-payment',
  'sez-with-payment',
  'sez-without-payment',
  'deemed-export'
];

const ZERO_RATED_SUPPLY_TYPES = new Set([
  'export-with-payment', 'export-without-payment',
  'sez-with-payment', 'sez-without-payment'
]);
const WITHOUT_PAYMENT_SUPPLY_TYPES = new Set(['export-without-payment', 'sez-without-payment']);

/**
 * Decides the tax head and whether tax is charged at all.
 *
 * One function so the invoice, the credit note, the PDF, the reports and both GST
 * returns cannot disagree about what kind of supply a document is. `reason` is
 * returned rather than inferred by callers because it is what the UI shows the
 * user to explain a zero-tax invoice — "why is there no GST on this?" is otherwise
 * indistinguishable from a bug.
 *
 * @param fromStateCode  supplier's state
 * @param toStateCode    the **place of supply** — not necessarily the buyer's
 *                       registered state (see #29)
 */
function resolveTaxContext(fromStateCode, toStateCode, {
  taxTreatment = 'taxable',
  supplyType = 'regular',
  reverseCharge = false
} = {}) {
  const from = normaliseStateCode(fromStateCode);
  const to = normaliseStateCode(toStateCode);
  const treatment = TAX_TREATMENTS.includes(taxTreatment) ? taxTreatment : 'taxable';
  const supply = SUPPLY_TYPES.includes(supplyType) ? supplyType : 'regular';
  const zeroRated = ZERO_RATED_SUPPLY_TYPES.has(supply) || treatment === 'zero-rated';

  // An export or SEZ supply is inter-state by definition, whatever the state codes
  // say — an SEZ unit in the supplier's own state is still a zero-rated supply
  // attracting IGST, which is the case a plain `from !== to` comparison gets wrong.
  const isIGST = zeroRated ? true : (Boolean(from && to) && from !== to);
  // The UT question only arises for an intra-territory supply; an inter-state
  // supply is IGST regardless of whether either end is a UT.
  const isUT = !isIGST && UT_STATE_CODES.has(to);

  let chargeTax = true;
  let reason = '';
  if (treatment === 'exempt' || treatment === 'nil-rated' || treatment === 'non-gst') {
    chargeTax = false;
    reason = `No GST charged — ${treatment} supply.`;
  } else if (WITHOUT_PAYMENT_SUPPLY_TYPES.has(supply)) {
    // Zero-rated without payment of tax, under a Letter of Undertaking.
    chargeTax = false;
    reason = 'Zero-rated supply under LUT — no IGST charged, to be claimed as a refund of input tax.';
  } else if (reverseCharge) {
    // Under reverse charge the *recipient* pays the tax directly to the
    // government, so the supplier must not collect it — while still reporting the
    // taxable value in GSTR-1. Charging it here would tax the same supply twice.
    chargeTax = false;
    reason = 'Tax payable by the recipient under reverse charge.';
  }

  return {
    isIGST,
    isUT,
    chargeTax,
    zeroRated,
    reverseCharge: Boolean(reverseCharge),
    taxTreatment: treatment,
    supplyType: supply,
    reason
  };
}

/**
 * @param items          line items: { qty, rate, gstRate, cessRate, discountPercent, taxInclusive }
 * @param fromStateCode  the supplier's GST state code
 * @param toStateCode    the place of supply's GST state code
 * @param options.discountPercent  invoice-level discount, applied after line discounts
 * @param options.roundOff         round the payable total to a whole rupee (default true)
 * @param options.taxTreatment     taxable | exempt | nil-rated | non-gst | zero-rated
 * @param options.supplyType       regular, an export/SEZ variant, or deemed-export
 * @param options.reverseCharge    tax payable by the recipient, so not collected here
 */
function calculateInvoiceTotals(items, fromStateCode, toStateCode, options = {}) {
  const list = Array.isArray(items) ? items : [];
  const invoiceDiscount = clampPercent(options.discountPercent, 'discountPercent');
  const applyRoundOff = options.roundOff !== false;

  const context = resolveTaxContext(fromStateCode, toStateCode, options);
  const { isIGST, isUT, chargeTax } = context;

  let grossSubtotal = 0;
  let discountTotal = 0;
  let subtotal = 0;
  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  let cess = 0;

  list.forEach((item, index) => {
    const line = calculateLine(item, invoiceDiscount, `items[${index}]`);

    grossSubtotal = roundMoney(grossSubtotal + line.gross);
    discountTotal = roundMoney(discountTotal + line.discount);
    // The taxable value is recorded even when no tax is charged. An exempt or
    // reverse-charge supply still has a value that has to appear in the return —
    // dropping it would understate turnover, not just tax.
    subtotal = roundMoney(subtotal + line.taxable);

    if (!chargeTax) return;

    cess = roundMoney(cess + line.cess);
    if (isIGST) {
      igst = roundMoney(igst + line.tax);
    } else {
      // Halve per line and round, so the two halves always sum back to the
      // line's tax rather than drifting a paisa on odd amounts.
      const half = roundMoney(line.tax / 2);
      cgst = roundMoney(cgst + half);
      sgst = roundMoney(sgst + roundMoney(line.tax - half));
    }
  });

  const beforeRounding = roundMoney(subtotal + cgst + sgst + igst + cess);
  const total = applyRoundOff ? Math.round(beforeRounding) : beforeRounding;
  const roundOff = roundMoney(total - beforeRounding);

  return {
    grossSubtotal,
    discountTotal,
    subtotal,
    cgst,
    sgst,
    igst,
    cess,
    roundOff,
    total,
    isIGST,
    // Render layers use this to label the state share UTGST instead of SGST;
    // the amount itself lives in `sgst` either way.
    isUT,
    // Persisted so the document, the PDF and both returns can classify the supply
    // without re-deriving it — and so a zero-tax invoice can explain itself.
    taxTreatment: context.taxTreatment,
    supplyType: context.supplyType,
    reverseCharge: context.reverseCharge,
    zeroRated: context.zeroRated,
    taxCharged: chargeTax,
    taxNote: context.reason
  };
}

module.exports = {
  calculateInvoiceTotals,
  calculateLine,
  resolveTaxContext,
  roundMoney,
  UT_STATE_CODES,
  TAX_TREATMENTS,
  SUPPLY_TYPES,
  ZERO_RATED_SUPPLY_TYPES,
  WITHOUT_PAYMENT_SUPPLY_TYPES
};
