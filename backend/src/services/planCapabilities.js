/**
 * What each plan actually includes.
 *
 * ── Why this file exists ──────────────────────────────────────────────
 *
 * `Plan.features` was an array of marketing prose that gated nothing, and it
 * advertised **Client Portal, API Access, Dedicated Manager, SLA 99.9%, an
 * on-premise option and 24/7 phone support** — six things this product does not
 * have. Meanwhile it never mentioned GST returns, GSTR-2B reconciliation,
 * inventory, warehouses, FIFO valuation, profit and loss, batch and expiry
 * tracking, recurring invoices, payment links, credit notes or dunning, all of
 * which it does.
 *
 * That is worse than vague. A pricing page is a promise, and the previous one
 * both oversold a product that does not exist and undersold the one that does.
 *
 * ── Keys, not sentences ───────────────────────────────────────────────
 *
 * Each entry has a **key**, because the next step is enforcing these rather than
 * printing them, and a gate cannot be written against a sentence. `enforcedBy`
 * names where that happens — the same discipline `featureFlagService` uses, and
 * for the same reason: the console once had a page of switches wired to nothing,
 * and a capability an operator believes in but which does nothing is worse than
 * an absent one, because they will promise it to a customer.
 *
 * `core: true` marks a capability every plan has. Listed anyway, so the cheapest
 * plan's card says what it *can* do rather than only what it cannot.
 *
 * ── What is deliberately absent ───────────────────────────────────────
 *
 * E-invoicing (IRN) and e-way bills. Everything around them is real and tested —
 * eligibility, validation, the payload, the validity window — but the provider
 * call itself is a stub that throws 501, so nothing can actually be filed. They
 * go on this list the day the adapter is written and not a day sooner, which is
 * the whole rule this file exists to enforce.
 */
const CAPABILITIES = [
  // ── Core billing: on every plan, including the cheapest ──
  {
    key: 'invoicing',
    label: 'GST invoices, quotations and delivery challans',
    core: true,
    enforcedBy: 'invoiceRoutes, salesDocumentRoutes'
  },
  {
    key: 'clientsAndItems',
    label: 'Customer and product catalogue',
    core: true,
    enforcedBy: 'clientRoutes, itemRoutes'
  },
  {
    key: 'payments',
    label: 'Payment recording, receipts and part-payments',
    core: true,
    enforcedBy: 'paymentRoutes'
  },
  {
    key: 'reminders',
    label: 'Automatic payment reminders',
    core: true,
    enforcedBy: 'reminderService, maintenance sweep'
  },
  {
    key: 'gstReturns',
    label: 'GSTR-1 and GSTR-3B, with an HSN summary',
    core: true,
    enforcedBy: 'reportRoutes /gstr1, /gstr3b'
  },
  {
    key: 'billGenerator',
    label: 'Bill Generator for over-the-counter billing',
    core: true,
    enforcedBy: 'frontend bill-generator, invoiceRoutes'
  },

  // ── Growth: stock and buying ──
  {
    key: 'purchases',
    label: 'Purchase bills, vendors and input tax credit',
    enforcedBy: 'purchaseRoutes'
  },
  {
    key: 'inventory',
    label: 'Stock ledger, low-stock alerts, batch and expiry tracking',
    enforcedBy: 'reportRoutes /stock/*'
  },
  {
    key: 'stockValuation',
    label: 'Stock valuation on FIFO or weighted average, with cost of goods sold',
    enforcedBy: 'reportRoutes /stock/valuation'
  },
  {
    key: 'creditNotes',
    label: 'GST credit notes against an invoice',
    enforcedBy: 'creditNoteRoutes'
  },
  {
    key: 'recurringInvoices',
    label: 'Recurring invoices, generated automatically',
    enforcedBy: 'recurringInvoiceRoutes'
  },
  {
    key: 'paymentLinks',
    label: 'Online payment links your customers can pay from',
    enforcedBy: 'paymentLinkRoutes'
  },
  {
    key: 'customBranding',
    label: 'Your logo, letterhead, signature and invoice templates',
    enforcedBy: 'organisationRoutes branding, invoice templates'
  },
  {
    key: 'multiUser',
    label: 'More than one user, with roles',
    enforcedBy: 'userRoutes invite, plus the plan user limit'
  },

  // ── Business: accounting depth and the harder compliance ──
  {
    key: 'expenses',
    label: 'Operating expenses, by category',
    enforcedBy: 'expenseRoutes'
  },
  {
    key: 'profitLoss',
    label: 'Profit and loss, with real cost of goods sold',
    enforcedBy: 'reportRoutes profit-loss'
  },
  {
    key: 'warehouses',
    label: 'Multiple warehouses, and stock transfers between them',
    enforcedBy: 'reportRoutes /stock/locations, /stock/transfer'
  },
  {
    key: 'gstr2b',
    label: 'GSTR-2B reconciliation, showing input credit at risk',
    enforcedBy: 'reportRoutes /gstr-2b/reconcile'
  },
  {
    key: 'compositionAndQrmp',
    label: 'Composition scheme (CMP-08) and quarterly QRMP filing',
    enforcedBy: 'reportRoutes /gst/cmp-08, quarterly return periods'
  },
  {
    key: 'receivables',
    label: 'Receivables ageing, collection reports and customer statements',
    enforcedBy: 'reportRoutes /ageing, /collections'
  },
  {
    key: 'bulkUpload',
    label: 'Bulk upload of products and customers from a spreadsheet',
    enforcedBy: 'itemRoutes /bulk-upload, clientRoutes /bulk-upload'
  },
  {
    key: 'exports',
    label: 'Excel and CSV exports of invoices, ageing and returns',
    enforcedBy: 'reportRoutes export endpoints'
  }
];

const CAPABILITY_KEYS = CAPABILITIES.map(capability => capability.key);
const CORE_KEYS = CAPABILITIES.filter(capability => capability.core).map(capability => capability.key);

/**
 * What each shipped plan includes.
 *
 * Cumulative on purpose — each tier is the one below it plus more, which is what
 * "Everything in Growth" means on the card and what a customer assumes anyway.
 * Written as the *additions* so the intent of each tier stays readable, and
 * flattened by `capabilitiesFor`.
 */
const PLAN_TIERS = [
  { code: 'starter', adds: [] },
  {
    code: 'growth',
    adds: [
      'purchases', 'inventory', 'stockValuation', 'creditNotes',
      'recurringInvoices', 'paymentLinks', 'customBranding', 'multiUser'
    ]
  },
  {
    code: 'business',
    adds: [
      'expenses', 'profitLoss', 'warehouses', 'gstr2b',
      'compositionAndQrmp', 'receivables', 'bulkUpload', 'exports'
    ]
  },
  // Everything. What actually differs at this tier is the ceiling, not the
  // feature list, and the card says so rather than inventing extras.
  { code: 'enterprise', adds: [] }
];

/**
 * The full capability list for a plan code.
 *
 * An unknown code gets the **core** set rather than nothing. A tenant whose plan
 * was renamed or deleted out from under them must keep being able to invoice:
 * losing the ability to bill because of a pricing change nobody told them about
 * is a far worse failure than a missing report.
 */
function capabilitiesFor(planCode) {
  const index = PLAN_TIERS.findIndex(tier => tier.code === planCode);
  if (index === -1) return [...CORE_KEYS];
  if (planCode === 'enterprise') return [...CAPABILITY_KEYS];

  const keys = new Set(CORE_KEYS);
  for (let i = 0; i <= index; i += 1) PLAN_TIERS[i].adds.forEach(key => keys.add(key));
  return [...keys];
}

/**
 * The display list for a plan card.
 *
 * Generated from the same catalogue a gate reads, so a card cannot advertise
 * something the plan does not have — which is the entire reason this file exists.
 * Tiers above the first lead with "Everything in <the one below>" rather than
 * repeating twenty lines.
 */
function featureCopyFor(planCode) {
  const index = PLAN_TIERS.findIndex(tier => tier.code === planCode);
  if (index <= 0) {
    return CAPABILITIES.filter(capability => capability.core).map(capability => capability.label);
  }

  const previous = PLAN_TIERS[index - 1];
  const previousName = previous.code.charAt(0).toUpperCase() + previous.code.slice(1);

  if (planCode === 'enterprise') {
    return [`Everything in ${previousName}`, 'Unlimited users and invoices'];
  }

  const added = PLAN_TIERS[index].adds
    .map(key => CAPABILITIES.find(capability => capability.key === key)?.label)
    .filter(Boolean);
  return [`Everything in ${previousName}`, ...added];
}

module.exports = { CAPABILITIES, CAPABILITY_KEYS, CORE_KEYS, PLAN_TIERS, capabilitiesFor, featureCopyFor };
