/**
 * Prepares existing data for Phase 5's GST classification and for email verification.
 *
 * Two backfills, both of which exist because the *absence* of a field is not neutral
 * once something starts reading it:
 *
 *  1. `Invoice.placeOfSupply`, from the buyer's registered state. GSTR-1 sections every
 *     document by place of supply, and a missing value would put every historic invoice
 *     in an "unknown" bucket — which is not a smaller problem than a wrong one, because
 *     a return with an unclassifiable invoice cannot be filed at all. The buyer's state
 *     is exactly what the tax head was computed from before this field existed, so
 *     writing it changes no figure: it records the assumption that was already in force.
 *
 *  2. `User.emailVerifiedAt`, for everyone who registered before verification existed.
 *     Leaving it unset would mean that the moment a deployment configures a mail
 *     provider, every existing user is refused writes for an email they were never
 *     asked to confirm. Nobody's address became less trustworthy because a feature
 *     shipped, so they are marked verified as at their registration date.
 *
 * `taxTreatment`, `supplyType` and `reverseCharge` are deliberately **not** backfilled.
 * Their schema defaults ('taxable', 'regular', false) reproduce the old behaviour
 * exactly, and every reader treats a missing value as the default — so writing them
 * would be millions of no-op updates that claim to know something about historic
 * invoices that nobody recorded.
 */
module.exports = {
  description: 'Backfill Invoice.placeOfSupply from the buyer state, and mark pre-existing emails verified',

  async up(db) {
    const invoices = db.collection('invoices');
    const clients = db.collection('clients');
    const users = db.collection('users');

    // 1. Place of supply.
    //
    // Buyer states are loaded once into a map rather than looked up per invoice: a
    // per-invoice query would be one round trip per document, and this runs over the
    // whole history of every tenant.
    const clientStates = new Map();
    for await (const client of clients.find({}, { projection: { _id: 1, stateCode: 1 } })) {
      if (client.stateCode) clientStates.set(String(client._id), String(client.stateCode).padStart(2, '0'));
    }

    const operations = [];
    const cursor = invoices.find(
      {
        $or: [
          { placeOfSupply: { $exists: false } },
          { placeOfSupply: null },
          { placeOfSupply: '' }
        ]
      },
      { projection: { _id: 1, clientId: 1, 'billTo.stateCode': 1 } }
    );

    let unresolved = 0;
    for await (const invoice of cursor) {
      const state = invoice.clientId
        ? clientStates.get(String(invoice.clientId))
        : (invoice.billTo?.stateCode ? String(invoice.billTo.stateCode).padStart(2, '0') : null);

      if (!state) {
        // A clientless invoice with no buyer state, or a client that has since been
        // hard-deleted. Left unset rather than guessed: the reader falls back to the
        // buyer's state at read time, and inventing a place of supply on a tax document
        // is worse than leaving the field empty and visible.
        unresolved += 1;
        continue;
      }
      operations.push({
        updateOne: { filter: { _id: invoice._id }, update: { $set: { placeOfSupply: state } } }
      });
    }

    const BATCH = 500;
    let invoicesUpdated = 0;
    for (let i = 0; i < operations.length; i += BATCH) {
      const result = await invoices.bulkWrite(operations.slice(i, i + BATCH), { ordered: false });
      invoicesUpdated += result.modifiedCount ?? 0;
    }

    // 2. Email verification for pre-existing accounts.
    //
    // Dated to `createdAt` rather than now, so the record does not claim they confirmed
    // their address today. Invited-but-not-activated users are included: their address
    // was proven by the fact that they received and redeemed an invitation sent to it.
    const verifyOperations = [];
    const userCursor = users.find(
      { emailVerifiedAt: { $exists: false } },
      { projection: { _id: 1, createdAt: 1 } }
    );
    for await (const user of userCursor) {
      verifyOperations.push({
        updateOne: {
          filter: { _id: user._id },
          update: { $set: { emailVerifiedAt: user.createdAt || new Date() } }
        }
      });
    }

    let usersUpdated = 0;
    for (let i = 0; i < verifyOperations.length; i += BATCH) {
      const result = await users.bulkWrite(verifyOperations.slice(i, i + BATCH), { ordered: false });
      usersUpdated += result.modifiedCount ?? 0;
    }

    return { placeOfSupply: invoicesUpdated, unresolvedPlaceOfSupply: unresolved, emailVerified: usersUpdated };
  }
};
