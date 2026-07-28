/**
 * Backfills `amountPaid` and `balanceDue` on invoices raised before those fields
 * were persisted.
 *
 * Settlement state used to be recomputed by aggregating `Payment` inside
 * `createPayment` and then thrown away, so an invoice created before the fields
 * existed has neither. Every read path now calls `recalculateSettlement`, which
 * repairs a document the first time anyone touches it — but "the first time
 * anyone touches it" is not good enough for the figures the dashboard and the
 * ageing reports sum straight out of the collection. An untouched legacy invoice
 * would contribute nothing to the outstanding total.
 *
 * Computed the same way `recalculateSettlement` does: successful payments plus
 * issued credit notes, floored at zero. Invoices that already carry the fields
 * are not recomputed — the live code owns them from that point on, and this must
 * not overwrite a value it maintains.
 */
module.exports = {
  description: 'Backfill Invoice.amountPaid / balanceDue from payments and credit notes',

  async up(db) {
    const invoices = db.collection('invoices');
    const round = value => Math.round((Number(value) || 0) * 100) / 100;

    // Money received per invoice, and credits issued per invoice, in two grouped
    // reads rather than one query per invoice.
    const paidByInvoice = new Map();
    for (const row of await db.collection('payments').aggregate([
      { $match: { status: 'success' } },
      { $group: { _id: '$invoiceId', amount: { $sum: '$amount' } } }
    ]).toArray()) {
      paidByInvoice.set(String(row._id), row.amount);
    }

    const creditedByInvoice = new Map();
    for (const row of await db.collection('creditnotes').aggregate([
      { $match: { status: 'issued' } },
      { $group: { _id: '$invoiceId', amount: { $sum: '$totals.total' } } }
    ]).toArray()) {
      creditedByInvoice.set(String(row._id), row.amount);
    }

    const cursor = invoices.find(
      { $or: [{ balanceDue: { $exists: false } }, { amountPaid: { $exists: false } }] },
      { projection: { _id: 1, 'totals.total': 1, status: 1 } }
    );

    const operations = [];
    let scanned = 0;
    for await (const invoice of cursor) {
      scanned += 1;
      const key = String(invoice._id);
      const invoiceTotal = round(invoice.totals?.total);
      const amountCredited = round(creditedByInvoice.get(key));
      const amountPaid = round(paidByInvoice.get(key));
      const owed = round(Math.max(0, invoiceTotal - amountCredited));
      const balanceDue = round(Math.max(0, owed - amountPaid));

      operations.push({
        updateOne: {
          filter: { _id: invoice._id },
          update: {
            $set: {
              amountPaid,
              amountCredited,
              // A cancelled invoice owes nothing whatever the arithmetic says:
              // the charge has been reversed or voided before collection.
              balanceDue: invoice.status === 'cancelled' ? 0 : balanceDue
            }
          }
        }
      });
    }

    if (!operations.length) return { scanned: 0, updated: 0 };

    // Batched so a long history doesn't build one enormous bulk request.
    const BATCH = 500;
    let updated = 0;
    for (let i = 0; i < operations.length; i += BATCH) {
      const result = await invoices.bulkWrite(operations.slice(i, i + BATCH), { ordered: false });
      updated += result.modifiedCount ?? 0;
    }

    return { scanned, updated };
  }
};
