const mongoose = require('mongoose');

/**
 * An action that needs a second person to agree to it (3.4 #12).
 *
 * Platform roles already stop the wrong people doing dangerous things. This is
 * for the things that are dangerous even when the *right* person does them:
 * deleting a tenant erases a business's entire records, and the difference
 * between a legitimate deletion and a catastrophic one is a single mis-click on
 * a list of similar-looking names. No amount of role design prevents that,
 * because the person clicking has exactly the permission required.
 *
 * ── How it works, and why this shape ──────────────────────────────────
 *
 * The guarded request is refused with `202 APPROVAL_PENDING` and recorded here.
 * A second operator approves it. The **original requester then retries the same
 * request**, carrying the approval id, and it goes through.
 *
 * The alternative — having the approver's click execute the action — is more
 * convenient and worse. It puts the approver in the position of triggering
 * something they did not compose, which is precisely the confusion that makes
 * rubber-stamping easy; and it means the system replays a stored request body
 * later, in a context where the state it was composed against may have moved.
 * Making the requester come back keeps intent and execution with the same
 * person, and keeps the approver's job to the one thing they are there for:
 * saying yes or no.
 *
 * ── What the approval is bound to ─────────────────────────────────────
 *
 * `bodyHash` and `path` together, so an approval authorises *exactly* what was
 * shown. Without it the flow has an obvious hole: request "delete tenant A", get
 * it approved, then use the approval to delete tenant B. The approver saw one
 * thing and consented to another.
 *
 * Single-use and short-lived for the same reason. An approval from three weeks
 * ago is not consent to today's deletion — circumstances change, and a standing
 * authorisation is not what anybody agreed to give.
 */
const approvalRequestSchema = new mongoose.Schema({
  /** The capability the request needs. Recorded so the console can group and
   *  so an approval for one kind of action cannot be spent on another. */
  capability: { type: String, required: true, index: true },

  /**
   * What this actually does, in a sentence, for the approver to read.
   *
   * Composed by the guarded route rather than derived from the path, because
   * "DELETE /superadmin/organisations/6a77…" is not something anyone can
   * meaningfully consent to, and "Permanently delete Acme Trading and all its
   * invoices, clients and users" is.
   */
  action: { type: String, required: true },

  method: { type: String, required: true },
  path: { type: String, required: true },

  /**
   * A hash of the request body, not the body itself.
   *
   * Bodies of privileged requests can carry things that should not sit in a
   * second collection with a different retention policy. The hash is enough for
   * the only job it has — proving the retried request is the one that was
   * approved — and `preview` carries the handful of fields worth showing.
   */
  bodyHash: { type: String, required: true },
  preview: { type: mongoose.Schema.Types.Mixed, default: null },

  requestedBy: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: String,
    email: String
  },
  /** Why the requester says this is needed. Required by the route: an
   *  unexplained request to delete a customer is not one anybody can judge. */
  reason: { type: String, required: true },

  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'used', 'expired', 'cancelled'],
    default: 'pending',
    index: true
  },

  decidedBy: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: String,
    email: String
  },
  decidedAt: Date,
  decisionNote: String,

  /** When the approval stops being usable. Set on approval, not on request:
   *  the clock that matters runs from consent, not from asking. */
  expiresAt: Date,
  usedAt: Date
}, { timestamps: true });

approvalRequestSchema.index({ status: 1, createdAt: -1 });
approvalRequestSchema.index({ 'requestedBy.userId': 1, createdAt: -1 });

/**
 * Ninety days, then gone.
 *
 * Long enough to answer "who approved that deletion in March", short enough that
 * this does not quietly become a second, weaker copy of the audit log. The audit
 * log is the durable record; this collection is the workflow.
 */
approvalRequestSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

module.exports = { ApprovalRequest: mongoose.model('ApprovalRequest', approvalRequestSchema) };
