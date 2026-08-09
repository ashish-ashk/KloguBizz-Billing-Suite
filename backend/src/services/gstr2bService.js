const { Purchase } = require('../models/Purchase');
const { Vendor } = require('../models/Vendor');
const { roundMoney } = require('./gstService');

/**
 * Reconciling purchases against GSTR-2B (2.1 #7).
 *
 * ── Why this needs no GSP, unlike e-way bills ─────────────────────────
 *
 * The plan filed this alongside e-way bills as "needs a live GSP connection".
 * It does not, and that is worth stating plainly: **GSTR-2B is downloadable as
 * JSON from the GST portal by anyone with the login**, which every registered
 * business has. A GSP connection would remove one manual download; it is not
 * what stands between this feature and existing. So this ships whole rather than
 * as a seam.
 *
 * ── Why it is the most valuable report in the product ─────────────────
 *
 * Input tax credit is only claimable if the *supplier* actually filed the
 * invoice. Claim credit on a bill a supplier never reported and it is reversed —
 * with interest, and typically a year later when the department reconciles. The
 * business has already spent the money and has no leverage left over a supplier
 * who has stopped answering.
 *
 * The number that matters is therefore **credit claimed on invoices that do not
 * appear in 2B**. Everything else here is in service of computing it accurately.
 *
 * ── The four outcomes ─────────────────────────────────────────────────
 *
 *   **Matched** — in the books and in 2B, values agree. Nothing to do.
 *   **Mismatched** — both have it, the figures differ. Usually a typo on one
 *     side; occasionally the supplier filed a different amount than they billed.
 *   **Missing in 2B** — recorded and claimed, supplier has not filed. *This is
 *     the money at risk.*
 *   **Missing in books** — the supplier filed it and we have no record. Either
 *     an unrecorded purchase (credit being left unclaimed) or a bill issued
 *     against our GSTIN that we never received, which is worth knowing about.
 */

/** Values within this much are treated as agreeing — a rupee of rounding
 *  difference between two systems is not a discrepancy worth a person's time. */
const TOLERANCE = 1;

/**
 * Normalises an invoice number for comparison.
 *
 * Suppliers type these inconsistently and the portal preserves whatever they
 * typed: `INV-001`, `inv 001` and `INV/001` are one invoice to a human and three
 * strings to a computer. Case, spaces and separators are stripped — deliberately
 * aggressive, because a false *mismatch* sends someone chasing a supplier over
 * nothing, while a false match is caught immediately by the value comparison
 * that follows it.
 */
function normaliseInvoiceNumber(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function matchKey(gstin, invoiceNumber) {
  return `${String(gstin || '').toUpperCase()}::${normaliseInvoiceNumber(invoiceNumber)}`;
}

/**
 * Reads the portal's GSTR-2B JSON.
 *
 * Tolerant of the shape by design. The download has been reorganised more than
 * once (`data.docdata.b2b` in the current format, `docdata.b2b` and a bare `b2b`
 * in older ones), and a tenant with last year's export should get their
 * reconciliation rather than a parse error about a key they have never heard of.
 */
function parseGstr2b(document) {
  const root = document?.data?.docdata || document?.docdata || document?.data || document || {};
  const rows = [];

  const collect = (suppliers, kind) => {
    for (const supplier of suppliers || []) {
      const gstin = supplier.ctin || supplier.ctin_no || supplier.gstin;
      const name = supplier.trdnm || supplier.trade_name || '';
      const documents = supplier.inv || supplier.nt || supplier.doc || [];
      for (const doc of documents) {
        const igst = Number(doc.iamt ?? doc.igst ?? 0);
        const cgst = Number(doc.camt ?? doc.cgst ?? 0);
        const sgst = Number(doc.samt ?? doc.sgst ?? 0);
        const cess = Number(doc.csamt ?? doc.cess ?? 0);
        rows.push({
          kind,
          supplierGstin: gstin,
          supplierName: name,
          invoiceNumber: doc.inum || doc.ntnum || doc.num,
          date: parsePortalDate(doc.dt || doc.ntdt),
          invoiceValue: roundMoney(Number(doc.val ?? doc.value ?? 0)),
          taxableValue: roundMoney(Number(doc.txval ?? doc.taxable_value ?? 0)),
          tax: roundMoney(igst + cgst + sgst + cess),
          /**
           * Whether the portal says the credit is available.
           *
           * A supplier can file an invoice that still carries no claimable
           * credit — filed late, or flagged. Treating "present in 2B" as
           * "claimable" would report a business as safe when it is not.
           */
          itcAvailable: (doc.itcavl ?? 'Y') !== 'N',
          itcReason: doc.rsn || ''
        });
      }
    }
  };

  collect(root.b2b, 'invoice');
  // Credit notes reduce the credit and are part of the same reconciliation —
  // omitting them overstates what is claimable.
  collect(root.cdnr, 'credit-note');
  return rows;
}

/** The portal writes `dd-mm-yyyy`, which `new Date()` reads as nothing useful. */
function parsePortalDate(value) {
  if (!value) return null;
  const match = String(value).match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
  if (match) return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Compares the books against the portal.
 *
 * @param {string} orgId
 * @param {Array} portalRows  From `parseGstr2b`.
 * @param {object} period     `{ from, to }` — the return period being reconciled.
 */
async function reconcile(orgId, portalRows, { from, to }) {
  const purchases = await Purchase.find({
    orgId,
    deletedAt: null,
    status: { $ne: 'draft' },
    billDate: { $gte: from, $lte: to }
  }).lean();

  const vendors = await Vendor.find({ orgId }).select('_id name gstin').lean();
  const vendorById = new Map(vendors.map(v => [String(v._id), v]));

  const bookRows = purchases.map(purchase => {
    const vendor = vendorById.get(String(purchase.vendorId));
    return {
      purchaseId: purchase._id,
      supplierGstin: vendor?.gstin || '',
      supplierName: vendor?.name || '',
      invoiceNumber: purchase.billNumber,
      date: purchase.billDate,
      invoiceValue: roundMoney(purchase.totals?.total || 0),
      taxableValue: roundMoney(purchase.totals?.subtotal || 0),
      tax: roundMoney(
        (purchase.totals?.cgst || 0) + (purchase.totals?.sgst || 0)
        + (purchase.totals?.igst || 0) + (purchase.totals?.cess || 0)
      ),
      /** Whether we actually claimed credit on it — the only ones at risk. */
      itcClaimed: purchase.itc?.eligible !== false,
      itcAmount: roundMoney(
        (purchase.itc?.cgst || 0) + (purchase.itc?.sgst || 0)
        + (purchase.itc?.igst || 0) + (purchase.itc?.cess || 0)
      )
    };
  });

  const portalByKey = new Map();
  for (const row of portalRows) {
    // Last one wins on a duplicate key: an amended filing supersedes the
    // original, and the portal lists both.
    portalByKey.set(matchKey(row.supplierGstin, row.invoiceNumber), row);
  }

  const matched = [];
  const mismatched = [];
  const missingInPortal = [];
  const seen = new Set();

  for (const book of bookRows) {
    const key = matchKey(book.supplierGstin, book.invoiceNumber);
    const portal = portalByKey.get(key);

    if (!portal) {
      missingInPortal.push({
        ...book,
        /**
         * The reason a bare "not found" is not enough.
         *
         * A purchase from a supplier with no GSTIN on file cannot appear in 2B
         * at all, and reporting it as "supplier has not filed" would send
         * someone to chase a supplier who has done nothing wrong. The fix is on
         * our side.
         */
        reason: book.supplierGstin
          ? 'The supplier has not filed this invoice, so the credit is at risk.'
          : 'No GSTIN recorded for this supplier, so this purchase cannot be matched at all.'
      });
      continue;
    }

    seen.add(key);
    const valueGap = roundMoney(book.invoiceValue - portal.invoiceValue);
    const taxGap = roundMoney(book.tax - portal.tax);

    if (Math.abs(valueGap) <= TOLERANCE && Math.abs(taxGap) <= TOLERANCE && portal.itcAvailable) {
      matched.push({ ...book, portal });
    } else {
      mismatched.push({
        ...book,
        portal,
        valueGap,
        taxGap,
        reason: !portal.itcAvailable
          ? `The portal reports this credit as unavailable${portal.itcReason ? ` (${portal.itcReason})` : ''}.`
          : `Recorded as ₹${book.invoiceValue.toLocaleString('en-IN')}, filed as ₹${portal.invoiceValue.toLocaleString('en-IN')}.`
      });
    }
  }

  const missingInBooks = portalRows
    .filter(row => !seen.has(matchKey(row.supplierGstin, row.invoiceNumber)))
    .map(row => ({
      ...row,
      reason: 'The supplier filed this and there is no matching purchase recorded. '
        + 'Either it was never entered, or it was billed to your GSTIN in error.'
    }));

  const atRisk = roundMoney(
    missingInPortal.filter(row => row.itcClaimed).reduce((sum, row) => sum + row.itcAmount, 0)
    + mismatched.filter(row => !row.portal.itcAvailable).reduce((sum, row) => sum + row.itcAmount, 0)
  );

  const unclaimed = roundMoney(missingInBooks.reduce((sum, row) => sum + row.tax, 0));

  return {
    period: { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) },
    summary: {
      inBooks: bookRows.length,
      inPortal: portalRows.length,
      matched: matched.length,
      mismatched: mismatched.length,
      missingInPortal: missingInPortal.length,
      missingInBooks: missingInBooks.length,
      /**
       * The figure this whole report exists to produce.
       *
       * Credit claimed on invoices the supplier has not filed, or that the portal
       * flags as unavailable. It will be reversed with interest, usually about a
       * year later, by which time the money is spent and the supplier has stopped
       * answering.
       */
      itcAtRisk: atRisk,
      /** The other direction: credit sitting unclaimed because a purchase was
       *  never recorded. Smaller, but it is money already paid. */
      itcUnclaimed: unclaimed
    },
    matched,
    mismatched,
    missingInPortal,
    missingInBooks
  };
}

module.exports = { parseGstr2b, reconcile, normaliseInvoiceNumber, matchKey, TOLERANCE };
