const mongoose = require('mongoose');

/**
 * A capability an operator granted themselves, briefly, in an emergency
 * (3.4 #12).
 *
 * ── Why this is self-service, and why that is not a hole ──────────────
 *
 * Break-glass exists for the case two-person approval cannot serve: it is 3am,
 * something is broken for a customer, and the person who would normally approve
 * is asleep. Requiring a second person defeats the entire purpose — the whole
 * point is that the second person is unavailable. So an operator can grant
 * themselves a capability their role does not include.
 *
 * **What makes that safe is not prevention. It is visibility and expiry.**
 *
 *   - It **expires**, in minutes, not days. A standing self-grant is just a
 *     bigger role with extra steps.
 *   - It **requires a reason**, which is recorded and shown.
 *   - Every action taken under it is **tagged as break-glass in the audit
 *     trail**, so the trail says "did this under emergency elevation" rather
 *     than looking indistinguishable from ordinary work.
 *   - It is **loud**: taking one is itself an audited event, visible on the
 *     console, and something a reviewer is meant to ask about afterwards.
 *
 * The security model here is deliberately *after the fact*. An operator who
 * abuses this is caught, not blocked — which is the correct trade when the
 * alternative is an outage nobody can fix. It is written down so that nobody
 * later mistakes the absence of a second approver for an oversight.
 *
 * ── The one thing it cannot grant ─────────────────────────────────────
 *
 * `platform.admin` — the capability that hands out capabilities. Allowing it
 * would make break-glass a way to permanently promote yourself in fifteen
 * minutes, and every other control here would be decoration.
 */
const breakGlassGrantSchema = new mongoose.Schema({
  capability: { type: String, required: true },

  grantedTo: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: String,
    email: String
  },

  /** Required, free text, and shown wherever this grant appears. */
  reason: { type: String, required: true },

  grantedAt: { type: Date, required: true },
  /** Short by construction — see `MAX_MINUTES` in the service. */
  expiresAt: { type: Date, required: true, index: true },

  /** Ended early, by the holder or by someone else. */
  revokedAt: { type: Date, default: null },
  revokedBy: String,

  /**
   * What was actually done with it.
   *
   * The point of the whole mechanism: an elevation nobody can review is an
   * elevation nobody controls. Appended each time the grant is used to pass a
   * capability check, so the review question — "you took emergency access, what
   * did you do with it?" — has an answer that does not depend on cross-
   * referencing timestamps in a log.
   */
  usedFor: {
    type: [{
      _id: false,
      at: Date,
      method: String,
      path: String
    }],
    default: []
  }
}, { timestamps: true });

/** The hot query: "does this person have an active grant for this capability". */
breakGlassGrantSchema.index({ 'grantedTo.userId': 1, capability: 1, expiresAt: -1 });

/** A year. Long enough for any review cycle; this is a security record and
 *  keeping it is the point. */
breakGlassGrantSchema.index({ grantedAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

module.exports = { BreakGlassGrant: mongoose.model('BreakGlassGrant', breakGlassGrantSchema) };
