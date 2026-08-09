/**
 * Seeds the chart of accounts the profit & loss groups expenses by (2.4 #32).
 *
 * `assertValidMaster` is deliberately permissive when a list is empty — a
 * deployment that has never seeded masters must keep working rather than
 * rejecting every write. That safety valve has a cost here: with no categories
 * configured, every expense would be accepted as typed, and a tenant's P&L would
 * grow "Rent", "rent" and "Office Rent" as three separate lines within a month.
 * By the time anyone noticed, the data would need cleaning by hand.
 *
 * So the list ships populated. The categories below are the standard heads an
 * Indian small business actually files against, ordered roughly by how often
 * they appear rather than alphabetically — the common ones should be the ones
 * you reach first in a dropdown.
 *
 * **Salaries are first on purpose.** They are the largest expense in most
 * businesses and the one this product could not represent at all until
 * `Expense` existed, because payroll has no vendor and no bill number.
 *
 * Idempotent by `{type, code}`: a re-run updates labels and leaves anything an
 * operator has since added or deactivated alone.
 */

const CATEGORIES = [
  { code: 'salaries', label: 'Salaries & wages', description: 'Payroll, bonuses, PF and ESI contributions' },
  { code: 'rent', label: 'Rent', description: 'Premises, warehouse and equipment rent' },
  { code: 'utilities', label: 'Utilities', description: 'Electricity, water, gas, internet and phone' },
  { code: 'freight', label: 'Freight & transport', description: 'Delivery, courier and shipping costs' },
  { code: 'professional-fees', label: 'Professional fees', description: 'Accountancy, legal, consulting and audit' },
  { code: 'repairs', label: 'Repairs & maintenance', description: 'Upkeep of premises, plant and equipment' },
  { code: 'marketing', label: 'Marketing & advertising', description: 'Advertising, promotion and events' },
  { code: 'travel', label: 'Travel & conveyance', description: 'Fares, fuel, lodging and local conveyance' },
  { code: 'office', label: 'Office & admin', description: 'Stationery, printing, postage and sundries' },
  { code: 'bank-charges', label: 'Bank charges & interest', description: 'Account fees, transaction charges and loan interest' },
  { code: 'insurance', label: 'Insurance', description: 'Premiums on premises, stock, vehicles and liability' },
  { code: 'software', label: 'Software & subscriptions', description: 'Licences, SaaS and hosting' },
  { code: 'taxes-fees', label: 'Taxes & statutory fees', description: 'Municipal taxes, licence and filing fees — not GST' },
  { code: 'commission', label: 'Commission', description: 'Sales commission and brokerage' },
  { code: 'other', label: 'Other expenses', description: 'Anything that does not fit a line above' }
];

module.exports = {
  description: 'Seed the expense-category master used by the profit & loss report',

  async up(db) {
    const masters = db.collection('masters');
    const report = { inserted: 0, updated: 0 };

    for (const [index, category] of CATEGORIES.entries()) {
      const existing = await masters.findOne({ type: 'expenseCategory', code: category.code });
      if (existing) {
        // Label and description only. `active` and `sortOrder` are left alone —
        // an operator who has reordered or switched one off meant it.
        await masters.updateOne(
          { _id: existing._id },
          { $set: { label: category.label, description: category.description, updatedAt: new Date() } }
        );
        report.updated += 1;
        continue;
      }
      await masters.insertOne({
        type: 'expenseCategory',
        code: category.code,
        label: category.label,
        description: category.description,
        active: true,
        sortOrder: index,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      report.inserted += 1;
    }

    return report;
  }
};
