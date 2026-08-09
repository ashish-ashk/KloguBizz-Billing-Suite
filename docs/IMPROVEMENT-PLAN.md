# KloguBizz — Improvement Plan

A full audit of the current codebase: bugs to fix, features to add, super-admin
monitoring & control to build, and what it takes to feel premium.

Every item marked **[verified]** was confirmed by reading the actual code, not inferred.
Severity: **P0** = broken/unsafe now · **P1** = important gap · **P2** = quality/polish.

---

## STATUS — the backlog is finished (2026-08-09)

**All sixteen Tier 1–4 items in this plan are done**, plus the inventory and
compliance work that came out of them. 469 backend tests, 18 frontend unit tests,
one end-to-end smoke test, a clean production build, and a generated
`docs/openapi.json` covering 201 paths.

Three things are deliberately **not** built, each with its reasoning written down
where the item is, rather than quietly dropped:

| Not built | Where the reasoning is | Who it blocks |
|---|---|---|
| **Multi-GSTIN / branches** (2.1 #9) | §16 — including the `Branch` design and the migration that would make it safe | A customer registered in more than one state. Also blocks warehouses in other states |
| **Depreciation** (2.4 #32) | §8 — excluded from the P&L *on the report itself*, rather than silently either way | A customer who wants capital assets in their profit figure |
| **Part 4 polish** (28 of 30 items) | The closing section — ordered by return per unit of work, accessibility first | Nobody today; accessibility has a legal dimension in some markets |

**What stands between this and paying customers is configuration, not code.**
`docs/LAUNCH-READINESS.md` is the list, ordered by consequence. The four things
that matter most, in order:

1. Set `MFA_ENCRYPTION_KEY` **before anyone enrols**. It falls back to
   `JWT_SECRET`, and rotating that later makes every MFA secret and every stored
   gateway credential permanently undecryptable.
2. Run `npm run migrate`. Three of the eleven migrations are deployment-blocking;
   without `011` the first sale after deploying reports a cost of goods sold of
   zero.
3. Make **one real Razorpay payment** and **one real failure** in test mode. It is
   the only integration that takes money, and none of the four have ever run
   against a live provider.
4. Set the platform's `platformBilling` identity, or every customer pays and
   receives no tax invoice.

## STATUS — Phase 1 shipped (2026-07-27)

**Done: items #1–#9, #12 (partial), #17, #19 (partial), #20–#28, #33 (guard), #35,
#38, #40 (stats/report only), #43, #46, #55, #56, plus #14–#16.**
Verified by 38 automated tests (14 unit + 24 integration against a real MongoDB),
a clean production `ng build`, and 6 regenerated PDFs whose totals-panel geometry
was measured directly rather than eyeballed.

| Area | What changed |
|---|---|
| Privilege escalation | `utils/pickFields.js` + per-controller allowlists; `role:'superadmin'` unassignable from a tenant route; `plan`/`status`/`ownerId`/`invoiceSequence` no longer tenant-writable; global `orgId`/`_id`/`__v` body strip in `server.js` |
| Secrets & transport | `assertSecureConfig()` refuses to boot production on a committed default; CORS is an allowlist; `/ready` reports DB state; SIGTERM drain; Mongo retry/backoff |
| Webhooks | raw body captured via `express.json`'s `verify` hook; signature mandatory and `timingSafeEqual`-compared; real event handling for charged/halted/cancelled; `WebhookEvent` collection for idempotent retries |
| Brute force | per-IP credential limiter + per-account lockout (`failedLoginAttempts`/`lockedUntil`) with a rolling window |
| Validation | `middleware/validate.js` + `validators/schemas.js` (zod, finally imported) on auth/invoice/payment/client/item/user/org/subscription routes; server-side GSTIN **checksum** |
| GST engine | rewritten `gstService`: line + invoice discounts, tax-inclusive back-calculation, cess, per-line rounding, whole-rupee round-off, UTGST, NaN rejection. New exported `calculateLine` is the single source used by the PDF, the on-screen document and the report |
| Settlement | persisted `amountPaid`/`balanceDue`; one `recalculateSettlement()` owns status transitions; `markPaid` settles only the balance; over-payment refused; `POST /payments/:id/void` reverses without deleting |
| Dashboard & reports | revenue from actual payments, outstanding from balances, all via aggregation pipelines; GST report is FY-scoped, discount-aware, and gained an HSN/SAC summary |
| Compliance guards | issued invoices can no longer be deleted (drafts only); a client with invoices can't be deleted |
| Billing | paid plans no longer activate without a confirmed payment; cancel is at period end and reaches Razorpay; Duplicate consumes quota |

**Deliberately deferred from Phase 1:** MFA (#7, needs a TOTP dependency + UI),
credit/debit notes (#33 proper), full list pagination (#40), the reminder scheduler
(#13), invites and password reset (#10, #11). These are Phase 2 in the ordering below.

---

## STATUS — Phase 2 shipped (2026-07-27)

**Done: items #10, #11, #12, #13, #18, #19, #33, #34, plus the delivery-visibility
half of #58 and the discount-aware side of #44.**
Verified by **78 automated tests** (14 unit + 64 integration against a real MongoDB)
and a clean production `ng build`.

| Area | What changed |
|---|---|
| Team invites (#10) | Was a dead end — the email linked to `/accept-invite?token=…`, but no such route and no redeem endpoint existed, so **every invited teammate was permanently locked out**. Added `GET /auth/invite/:token` + `POST /auth/accept-invite` (auto-signs-in), a real `/accept-invite` page, resend (invalidates the old link) and withdraw (frees the seat *and* the globally-unique email). Tokens are now **SHA-256 hashed with a 7-day expiry** — the old `inviteToken` plaintext field is gone |
| Password reset (#11) | Did not exist at all. Added `POST /auth/forgot-password` (uniform response — no account enumeration) + `POST /auth/reset-password`, `/forgot-password` and `/reset-password` pages, a "Forgot your password?" link, 1-hour single-use hashed tokens. A reset **kills every open session** and **clears a brute-force lockout**, so a locked-out owner can recover |
| Suspension (#12) | `Organisation.status` was stored, counted, and read by nothing — a suspended tenant kept invoicing. `protect` now enforces it: **writes refused, reads and exports still allowed** (it's their business data), auth/subscription routes stay open so they can resolve it. Super admin exempt. Tenant-facing banner, synced mid-session via the interceptor |
| Reminders (#13) | `runReminderSweep` was a 3-line stub nothing called, so the whole super-admin Reminders page was decorative. Now a real hourly sweep that **uses the configured subject/template** (`{{invoiceNumber}}`-style placeholders, finally substituted), picks the latest applicable stage, dedups per invoice per stage via a new `ReminderLog`, chases the **balance** rather than the face value, skips suspended tenants and cancelled invoices, and logs every attempt including skips and failures. `remind-all` moved off the request path (**202 + background**) — it used to send serially in-request and time out |
| Credit notes (#33) | Did not exist; Phase 1 had blocked deleting issued invoices with nothing to replace it. New `CreditNote` model with its **own consecutive number series** (GST requires one per document type), priced by the same GST engine from the same place of supply so an IGST invoice is credited in IGST. Full or partial, cumulative ceiling enforced, GSTR-1 CDNR reason codes, CSV export. Credits reduce `balanceDue` like a payment; a fully credited invoice closes as **cancelled, not paid** |
| Invoice immutability (#34) | An issued invoice could be silently repriced — even a fully paid one. Now locked: items/discount/buyer changes are refused with `INVOICE_LOCKED`, status can't be set directly (`STATUS_DERIVED`), notes and terms stay editable. New `cancelInvoice` for an invoice raised in error with nothing collected; the document and its number are retained, and it drops out of reminders, outstanding figures and the GST return |
| Masters (#19) | The page was decorative: `Item.gstRate` was a hardcoded `enum: [0,5,12,18,28]`, so adding the real 3% gold slab did nothing and the API rejected the value the admin had just configured. Enum dropped; `gstRate`, `unit` and `Payment.method` now validate against the `Master` collection via a cached `masterService`, invalidated on save. Stays permissive when nothing is seeded |
| Platform template default (#18) | The super-admin gallery wrote to a separate `InvoiceTemplate` collection nothing ever rendered — two unrelated concepts sharing one name. Page rebuilt on the **real 22-template registry** with live preview; the choice is stored as the `defaultInvoiceTemplate` setting and applied by `resolveTemplate` whenever a tenant hasn't picked one. Dead model, route, controller, seed rows and frontend type removed. A test renders two PDFs to prove the default actually changes the output |
| Email (part of #58) | Plain-text, unstyled, no CTA, and delivery was invisible. Now branded HTML with a button, and `sendEmail` returns an outcome instead of throwing — recorded per attempt in `ReminderLog` |

**Still open, in the doc's own ordering:** MFA (#7), list pagination (#40),
aggregation for remaining list endpoints, structured logging/error tracking (#57),
CI and lint (#60), then Phase 4's super-admin console and Phase 5's GSTR-1 export,
purchases/ITC and e-invoicing.

---

## STATUS — Phase 3 shipped (2026-07-28)

**Done: items #36, #39, #40, #42, #43, #45 (delivery half), #46, #47, #48, #49,
#57, #60, #61, #64, #65, #66, #67.**
Verified by **101 automated tests** (14 unit + 87 integration against a real
MongoDB, including a new 23-test `scale.test.js`), a clean `eslint` run on both
packages, clean production *and* development `ng build`s, and the migration runner
exercised end-to-end against a live database (apply → resume-after-failure →
idempotent re-run).

| Area | What changed |
|---|---|
| Pagination (#40) | Every list endpoint returned its **entire collection** — invoices, payments, clients, items, credit notes and the super-admin org list. New `utils/pagination.js`; all of them now return `{data,page,limit,total,pages,hasMore}` with a **200-row ceiling** so `?limit=1000000` can't reintroduce the unbounded read. Server-side `?q=` search (regex-escaped — `?q=(` used to be a 500 and `?q=.*` a full scan) and a `?sort=` allowlist restricted to indexed columns. Frontend rewritten to match: new `core/server-list.ts` (debounced search, out-of-order response protection, no stranding on an emptied last page) replaced the `filtered()`/`paged()` computeds that had downloaded everything and sliced it in the browser |
| Overdue without a write-on-read (#43) | `sweepOverdue` ran a collection-wide `updateMany` at the top of every list, stats and export request — a dashboard refresh was a write. Moved to a **global** hourly job (`services/maintenanceService.js`, one write for all tenants). Accuracy was kept, not traded: the list filter and the stats aggregation now **derive** overdue from `dueDate`, so the figures are right the instant an invoice falls due. Caught by a test: a *missing* field is not `null` in an aggregation (`$ne:['$dueDate',null]` is `true` when absent, and `$lt` is too), so the guard is `$type` — a null check would have reported every invoice with no due date as overdue |
| Bounded memory (#42, #44) | The GST report, both CSV exports and the platform-wide reminder sweep all materialised their full result set. Now cursor-streamed. Exports write straight to the response with back-pressure, so a large export starts immediately instead of building the whole file in memory and timing out. The report's per-line maths deliberately stays in JS: it shares `calculateLine` with the invoice itself, and a `$expr` reimplementation would be a second copy of the tax rules that could disagree with the customer's copy |
| Base64 logos (#45) | Up to **1.2MB of base64** rode along in every `/auth/me` and `/organisations/current` response — on every page load and route change — and in `/public/branding` on every unauthenticated login-page hit. Now served from `/assets/...` as content-addressed, `immutable`, ETag'd resources the browser fetches **once**; the JSON drops to a URL. `updateOrganisation` had to become a **merge** (dot paths) for this to be safe: the client no longer holds the bytes, so a whole-object write would have blanked the logo on any unrelated save — there is a test for exactly that |
| Destructive masters save (#47) | `saveMasters` was `deleteMany` + `insertMany` with nothing between them: a crash in that window wiped **every GST rate and HSN code platform-wide**, unrecoverably. Now a diff-based `bulkWrite` — rows matched on `type`+`code`, updated in place (ids survive; they used to rotate on every save), and deletions ordered **last** so an interruption leaves stale rows rather than none. Transactional where the deployment supports it (`utils/transaction.js` probes for a replica set, so the same code is atomic on Atlas and documented best-effort on a standalone) |
| Org-delete cascade (#36) | Missed `Item`, `CreditNote` and `ReminderLog` — a deleted tenant left its entire catalogue and every credit note it ever issued orphaned forever. Now one registered list of tenant-scoped collections, in a transaction, with a type-the-name confirmation. `AuditLog` is deliberately **excluded**: it is the record of what was done, including the deletion |
| Audit console (#39) | Was unfiltered, unpaginated and capped at 200 rows — unreadable past the first 200 events. Now filterable by org, actor, action (prefix), entity and date range, paginated, CSV-exportable, indexed for each of those, **append-only enforced at the model** (so a future generic `PUT` can't quietly make it mutable), with a configurable TTL and a `requestId` tying each entry to the request that produced it |
| Observability (#57) | `console.log` only: no levels, no timestamps, no correlation. New dependency-free `utils/logger.js` (JSON lines in production, readable locally, credential/base64 redaction, pluggable error reporter) plus request ids echoed in every response and in every error body. `trust proxy` set — without it the per-IP rate limiter saw one address for all traffic. 5xx no longer leak internal messages to the client in production; `CastError`/`ValidationError` return 400 instead of 500 |
| Tooling (#60, #61, #65, #49) | ESLint + Prettier on both packages (`require-atomic-updates` was tried and **removed** — 10 false positives, 0 real, and a linter people ignore is worse than none), GitHub Actions CI with a real MongoDB service and a guard that **fails when the integration tests skip** (a silent skip is indistinguishable from a pass), grouped Dependabot, a versioned migration runner with a lock and three real migrations replacing the ad-hoc `backfillOwnerId.js`, and `environment.development.ts` via `fileReplacements` so the localhost footgun is gone |
| Polish (#66, #67, #64, #46, #48) | Invoice-number padding configurable and never truncating; PDF pagination derived from the page box with "Page N of M" and continued markers (the hardcoded `y > 700` was wrong for the 85pt-margin receipt templates, which now take 3 pages instead of 6); global settings validated per key with a zod schema (a bad `branding` payload used to break the login page platform-wide, silently); audit indexes added; frontend `CacheService` with TTL, request dedup, prefix invalidation on every mutation and a hard clear on logout |

**Deliberately not done, and why:**
- **#45's object-storage half.** S3/R2 plus a resize pipeline needs credentials this
  deployment doesn't have. The base64 still sits in Mongo; what was fixed is the
  part costing every request. The asset endpoints are the seam to move behind a CDN.
- **#37 soft delete / recycle bin, #41's remaining aggregations, #53 memberships.**
  Untouched — larger schema changes, not scale fixes.
- **Users list left unpaginated.** Seats are capped by the plan, so it is bounded by
  construction. Paginating it would be churn for no gain.

**Still open, in the doc's own ordering:** MFA (#7), soft delete (#37),
email delivery logging (#58's bounce/suppression half), memberships and the
org-switcher (#53–#54), then Phase 4's super-admin console and Phase 5's GSTR-1
export, purchases/ITC and e-invoicing.

---

## STATUS — Phase 4 shipped (2026-07-30)

**Done: the whole of Part 3.1 (platform observability), most of Part 3.2 (tenant
lifecycle control) and the bulk of Part 3.4 (security & compliance console), plus
#64's feature-flag half and the operational parts of 3.5 that the data supports.**
Verified by **138 automated tests** (14 unit + 124 integration against a real
MongoDB, including a new 37-test `platformConsole.test.js`), a clean `eslint` run on
both packages, clean production *and* development `ng build`s, and migration 004
exercised end-to-end against a live database (apply → idempotent re-run, with
assertions on each backfill's semantics).

Part 3 opened by noting that **no event data was captured anywhere** and that
`User.lastLoginAt` was the only usage signal in the product. That was the real
blocker: none of these screens could be built, only mocked. So the phase starts
there.

| Area | What changed |
|---|---|
| Event capture (the prerequisite) | New `UsageEvent` (raw, TTL'd, fire-and-forget) → `MetricsDaily` (one permanent global row per day, idempotent upsert). Instrumented at 13 points across auth, invoices, bills, payments, credit notes, clients, items, bulk upload, reports and exports. DAU/WAU/MAU come from a **per-user daily heartbeat deduplicated in memory**, not an event per request — the same information for a fraction of the writes. `Organisation.lastActiveAt` is maintained alongside it so the org list, the at-risk list and the drill-down never have to aggregate events to answer "when were they last seen" |
| Observability dashboard (3.1) | New `/super-admin/dashboard`, now the console's landing page. MRR/ARR/ARPA/paying accounts, revenue by plan, GMV, signups (24h/7d/30d), activation rate and time-to-first-invoice, trial funnel, DAU/WAU/MAU + stickiness, document volume, a switchable daily trend chart, a feature-adoption matrix, and system health. **The "Platform Revenue" tile was a lie**: it summed every tenant payment — our customers' revenue, not ours — and is now correctly split into `mrr` and `gmv` |
| Honest metrics | Two traps closed by construction. A yearly plan contributes **a twelfth** of its price to MRR, not its price (a twelvefold overstatement per annual customer). And MRR and the status mix are **rates that can only be observed** — nothing records when a status changed — so a backfilled day stores `null` rather than stamping today's figures on last month, and the charts skip nulls instead of plotting them as zero. There is deliberately **no trial-conversion rate**: without a `convertedAt` it could only be guessed, and a guessed number that looks authoritative is worse than an absent one |
| Tenant drill-down (3.2) | New `/super-admin/organisations/:id`. There was no per-tenant view at all — a table row and a modal repeating eight fields from it — so debugging a customer meant a Mongo shell. Now: profile, owner, users, subscription history, usage against every limit, document counts, invoiced/collected/outstanding, first-invoice lag, a transparent 0–100 health score, their invoices (paginated, read-only), an audit timeline and a usage stream. Opening it writes `superadmin.tenant_viewed` — the **data-access log**, so a tenant can be told who looked |
| Impersonation (3.2) | "The single most valuable support capability", and the only way to do it before was to ask the customer for their password. 30-minute signed token, **read-only by default**, mandatory reason, loud fixed banner with a live countdown, one-click exit that restores the operator's own session. What makes it safe: the customer's own sessions are never revoked; a platform account can never be a target; `/auth/change-password` and ownership transfer are refused even read-write; suspension still applies; every audit entry carries **both identities**; every write is additionally logged as `impersonation.write`; and an impersonated request deliberately does **not** count as tenant activity, so the at-risk list isn't skewed by support looking at the accounts it worries about |
| Tenant lifecycle actions (3.2) | Suspend/cancel now **require a reason and show it to the tenant** — Phase 2 made suspension enforceable but anonymous, which converts every suspension into a support ticket. Plus: per-org seat/invoice **limit overrides** honoured by the real quota check (no more inventing a plan tier for one customer), grant/extend/end trial (extending adds to the current end date, not to today), per-tenant in-app notices and a platform-wide broadcast (expiry enforced server-side, so a lapsed banner disappears even in an open tab), internal support CRM fields the tenant never receives, force-logout per user or per org, password reset in both `link` and `temporary` modes (both revoke every session — a reset that doesn't isn't one), and unlock for a brute-force lockout |
| Feature flags (#64's other half) | Per-org overrides resolved over platform defaults. Deliberately **not** another wall of decorative switches: every flag carries `enforcedBy` naming where it bites, the two that gate nothing yet (`einvoicing`, `apiAccess`) are rendered as "not built yet" rather than as toggles, and the three live ones are enforced server-side (`requireFlag` on bulk upload and credit notes; `darkMode` finally frees a personal preference from its plan gate, which is Part 4 #22). A non-boolean or unknown key is dropped rather than stored as truthy dead state |
| Granular platform roles (3.4) | `requireRole('superadmin')` was one bit: every platform account could delete any tenant, reprice every plan and sign in as any customer. Split into **owner / billing / support / auditor**, enforced per route by capability. The auditor role's whole point is that it has *no* write capability, which a test asserts route by route. An account with no `platformRole` stored resolves to `owner`, so introducing the model locks nobody out, and self-demotion and demoting the last owner are both refused |
| Audit & security console (3.4) | Phase 3 rebuilt the audit *backend* and nothing in the frontend ever called it, so the trail still didn't exist from the console's side. New `/super-admin/audit`: filters, pagination, CSV, plus **login history** and **derived suspicious-activity alerts** (brute force per IP, bulk deletion per actor, heavy export per tenant, off-hours platform actions in IST, and every support session) — returned *with the thresholds that produced them*, because an alert whose rule you can't see is one you learn to ignore. Made possible by the trail now recording `ip`, `userAgent` and `impersonatorId`: it knew who and what, never from where |
| Audit attribution bug found in testing | A platform action was filed under the *actor's* org — and a superadmin has none — so **every console action against a tenant was recorded with no organisation**, and therefore appeared in neither that tenant's timeline nor the per-org audit filter. The record of what support did to a customer was unreachable from the customer. `logAudit` now takes the subject org explicitly |
| Session context | The app cached the organisation at login and **never called `/auth/me` at all**, so a suspension, a flag change or a message addressed to a tenant stayed invisible for the rest of the session (the interceptor's 403 handler papered over suspension only, and only after a write had already failed). The shell now reconciles on load, throttled to once a minute so it doesn't become a request per navigation |
| Operational visibility (3.5, partial) | `GET /superadmin/system/health`: database state, size, replica-set/transaction support, collection counts, and per-instance request rate, 5xx rate and p50/p95/p99 by route from a new bounded in-process recorder. The scope is **stated in the response** ("this instance only, since boot") because that is the honest limit without an APM. Also surfaces whether email and Razorpay are configured at all — the first question when "reminders aren't arriving" |
| Decorative UI removed | The super-admin Profile page had a 2FA switch bound to a local boolean with no backend: it turned green and protected nothing. Replaced with what is true (MFA is #7, still open), and the page now manages platform accounts instead of duplicating the audit log |

**Deliberately not done, and why:**
- **MFA for superadmin and the `/super-admin` IP allowlist (#7).** Needs a TOTP
  dependency and an enrolment flow; it is its own piece of work, and shipping a
  half-enrolment is worse than the honest "not available yet" now on the page.
- **Two-person approval and break-glass elevation.** These need an approval-request
  workflow (a second collection, notifications, an expiry job) rather than a guard.
  The capability split plus a full trail is the useful 80% of the same goal.
- **Active-session list per user.** There is no session collection — `sessionVersion`
  is a counter, not a registry — so a device list would need #50/#51's refresh-token
  work first. Force-logout, which is the actionable half, is here.
- **Most of Part 3.3 (plan versioning, coupons, dunning, the platform's own GST
  invoices, Razorpay reconciliation).** Billing depth, not console work; plan
  versioning in particular is a schema change that needs per-subscription pinning.
- **The job/queue console and the email deliverability dashboard (3.5).** Both need
  infrastructure that does not exist: there is no queue, and bounce data needs
  SendGrid event-webhook ingestion (#58's other half).
- **Cohort retention, MRR waterfall, NRR/GRR.** Each needs a history of *transitions*
  that starts accumulating from today. The capture layer is what was missing; these
  become computable once there is a few months of it, and inventing them from
  current-state data now would produce confident nonsense.

**Still open, in the doc's own ordering:** MFA (#7), soft delete (#37), email
delivery logging (#58), memberships and the org-switcher (#53–#54), Part 3.3's
billing depth, then Phase 5's GSTR-1 export, purchases/ITC and e-invoicing.

---

## STATUS — Phase 5 shipped, plus the long-deferred items (2026-07-30)

**Phase 5 (compliance depth): items #29, #30, #31, and Part 2.1's #2 (GSTR-1),
#3 (GSTR-3B), #4 (e-invoicing seam), #5 (purchases/vendors/ITC) and #8.
Previously deferred and now done: #7 (MFA + superadmin IP allowlist), #37 (soft
delete / recycle bin), #52 (email verification), #58 (email delivery logging,
bounces and suppression), #62 (tenant export + self-service erasure).**

Verified by **175 automated tests** (14 unit + 161 integration against a real
MongoDB, including a new 37-test `compliance.test.js`), clean `eslint` on both
packages, clean production *and* development `ng build`s, migration 005 exercised
end-to-end against a live database, and a real `node server.js` boot in both
development and production mode.

| Area | What changed |
|---|---|
| Classification (#29–#31) | `gstRate: 0` was the only way to express "no tax", which collapsed five legally distinct things into one and made correct GSTR-1 classification impossible. New `placeOfSupply`, `taxTreatment`, `supplyType`, `reverseCharge` and `exportDetails` on both invoices and credit notes, resolved by one new `gstService.resolveTaxContext` so the document, the PDF and both returns cannot disagree. Three rules that a naive version gets wrong, each with a test: an **export is inter-state by definition** (an SEZ unit in your own state is still IGST, which `from !== to` gets wrong); a **LUT export charges nothing** while still reporting its taxable value; and a **reverse-charge invoice collects no tax** because the recipient pays it directly — collecting it would tax the same supply twice. Defaults reproduce the previous behaviour exactly, so no existing invoice computes differently |
| GSTR-1 (2.1 #2, #8) | The old report was a month × rate summary that did not group by HSN and had no notion of sections. New `gstReturnService.buildGstr1` produces **B2B, B2CL, B2CS, CDNR, CDNUR, EXP, NIL, HSN and DOC_ISSUE**, downloadable as the GSTN offline-utility JSON or as one CSV per section. The hard part is not the arithmetic, it is that two invoices with identical totals belong in different tables — so the tests cover the threshold cases: a nil-rated invoice to a registered buyer appears under NIL and **not** also under B2B (which would double-count turnover), and a cancelled invoice leaves the outward tables but is still counted in the document series, because a series with an unexplained gap is a red flag in a return |
| Purchases and ITC (2.1 #5) | The gap that made this "sales-only": no supplier model, no purchase document, therefore no input tax credit, therefore no net liability. New `Vendor` and `Purchase`, priced by the same GST engine, with an explicit ITC category (inputs / capital goods / input services / ineligible / blocked) because "can I claim this" has more than two answers and GSTR-3B asks for them separately. `{orgId, vendorId, billNumber}` is unique: the document number belongs to the *supplier*, so nothing else stops the same bill being entered twice — and entering it twice claims the same credit twice |
| GSTR-3B (2.1 #3) | Uncomputable before purchases existed, because it is a subtraction. Outward liability less ITC, **per tax head** — credit under one head cannot be set off against another arbitrarily, so a surplus is reported as carry-forward rather than quietly reducing another head's cash. Reverse charge deliberately appears on **both** sides (3.1(d) liability and 4(A)(3) credit): netting them to zero is right on the total and wrong on both lines, and the return is filed line by line |
| E-invoicing (2.1 #4) | The `gst-einvoice-qr` template draws a *decorative, non-scannable* QR, which is worse than nothing on a legal document. Now: `eInvoice` state on the invoice, a validator that applies the rules the IRP would reject on (missing HSN, invalid buyer GSTIN, no place of supply), a builder that produces the real NIC schema-1.1 payload, the 24-hour IRN cancellation window with the right advice when it has passed, and a worklist of documents that need an IRN and lack one. The network call is a **documented refusal**, not a mock: with no provider credentials it returns `501 IRP_NOT_CONFIGURED` **with the validated payload attached** so it can be uploaded to the portal by hand. A fake success stamping a made-up IRN would be indistinguishable from compliance until an audit |
| MFA (#7) | Deferred four times with the note "needs a TOTP dependency", which was wrong: TOTP is HMAC-SHA1 over a counter and Node has HMAC-SHA1. New dependency-free `utils/totp.js`, **verified against all four RFC 6238 SHA-1 test vectors**. Secrets are AES-256-GCM encrypted at rest (a readable TOTP secret is a second password anyone with the database can use forever); enrolment is *staged* until a live code proves the app works, so a misconfigured authenticator cannot lock anyone out; the consumed counter is recorded, so the same six digits cannot be replayed inside their 30-second window; single-use recovery codes exist because a lost phone must not be a permanent lockout whose only remedy is support disabling the control. Login issues **no token at all** until the second factor is presented — there is no window in which a half-authenticated session exists and no route that has to remember to check a flag. Plus a CIDR-aware IP allowlist on `/superadmin`, and mandatory enrolment for platform accounts that deliberately still permits the enrolment routes, so "mandatory" is not a lockout |
| Soft delete (#37) | Clients, items and draft invoices were gone instantly with no undo. `deletedAt` plus a shared `utils/softDelete.js` whose whole point is that the *reads* cannot forget: `scopeFilter` is the tenant filter and the exclusion together, and a deleted row that still appeared in a report would be worse than a hard delete because the numbers would be wrong invisibly. A deleted draft **keeps its invoice number** (releasing it would let a restore collide with a number the counter has since issued), an issued invoice is still not deletable at all, and the bin is purged after 30 days so it does not become permanent hidden storage |
| Email delivery (#58) | `sendEmail` returned `{skipped:true}` and logged a line, so a deployment that was sending and one that was not looked identical and nothing recorded which. New `EmailLog` records **every** outcome including `skipped` and `suppressed`; a `Suppression` list stops mail to bounced and complained addresses, because continuing to send is what destroys a sending domain's reputation for every tenant; a signature-checked SendGrid event webhook ingests delivery, bounces and complaints. A **soft** bounce deliberately does not suppress — permanently cutting off a customer whose mailbox was briefly full is the obvious wrong answer. Surfaced as a deliverability console with per-flow and per-tenant failure rates |
| Email verification (#52) | Registration accepted anything, so one typo produced an account that could never receive a reset link. Enforced only when a mail provider is actually configured — requiring a verification that cannot be sent would make every local install and every test fail for an unrelated reason — and enforcement blocks *writes* while leaving reads and exports open, the same trade-off suspension makes |
| Data rights (#62) | No export beyond per-list CSV and no self-service deletion. A complete machine-readable export, **streamed with back-pressure** (a full export is the largest response the API produces, and the version that builds a string first works in testing and times out for the customer who most needs it), with credentials and MFA secrets excluded. Deletion is owner-only, password-confirmed, type-the-name, and takes effect after a 30-day grace window during which the export keeps working — an erasure request made in anger is otherwise unrecoverable, and Indian tax records are usually required to be retained for years |
| Two bugs found while building | (1) The ITC register's `$match` used the org id as a **string**: Mongoose casts that for `find` but not inside an aggregation, so the whole register silently returned nothing — and an empty ITC report reads as "no credit available", a wrong answer that looks like a correct one. (2) A deliberate 5xx (`501 IRP_NOT_CONFIGURED`, `503 WEBHOOK_NOT_CONFIGURED`) was logged as an unhandled fault with a stack trace *and*, in production, had its actionable message replaced by "something went wrong on our side" — making a configuration problem undiagnosable for the person who could fix it. `errorMiddleware` now distinguishes a 5xx we raised on purpose from one we did not |

**Deliberately not done, and why:**
- **Refresh tokens and a device/session list (#50, #51).** These change session
  semantics for every user of the product — token lifetime, rotation, revocation —
  and need a `Session` collection that `sessionVersion` (a counter, not a registry)
  cannot stand in for. Force-logout, the actionable half, already exists.
- **Memberships and the org-switcher (#53, #54).** Email is globally unique on
  `User`, so one person genuinely cannot belong to two organisations — and fixing
  that means changing the identity model every other feature is built on, plus
  migrating every existing account. It is its own phase, not a line item.
- **E-way bills (2.1 #6) and GSTR-2A/2B reconciliation (#7).** Both need a live
  GSP connection; the e-invoice seam is where that integration lands, and building
  two more unreachable adapters first would be speculative.
- **OpenAPI (#63) and frontend tests (#59's frontend half).** Real gaps, but neither
  is compliance depth: the frontend has no test runner configured at all, so that is
  a tooling task rather than a test-writing one.
- **A QR code on the MFA enrolment screen.** Deliberate: it would need either a
  dependency on the auth path or a hand-written encoder I cannot verify decodes, and
  a subtly wrong QR produces an authenticator whose codes the server will never
  accept — indistinguishable, to the user, from "my code is wrong". The setup key
  and the `otpauth://` link both provably work.

**Still open, in the doc's own ordering:** refresh tokens and session list (#50–#51),
memberships and the org-switcher (#53–#54), OpenAPI (#63), Part 3.3's billing depth
(plan versioning, coupons, dunning, the platform's own GST invoices), the queue and
deliverability consoles' remaining halves in 3.5, e-way bills and GSTR-2A/2B, then
Phase 6's premium polish.

---

## STATUS — Phase 6a: the fields that lied (2026-07-30)

**Done: Part 2.3 #19, #24, #25, #26 · Part 2.4 #28, #29, #31, #33, #34 ·
Part 2.5 #37, #38, #39 · Part 2.6 #50.**

Verified by **195 automated tests** (14 unit + 181 integration, including a new
20-test `operations.test.js`), clean `eslint` on both packages, clean production and
development `ng build`s, and the invoice PDF re-rendered and inspected by
instrumenting pdfkit's own `text()`/`image()` calls rather than trusting the byte size.

The theme of this tranche is **schema that promised behaviour it did not have**, which
is worse than an absent feature because it gets trusted:

| Area | What changed |
|---|---|
| Stock is no longer a dead field (2.5 #37–#39) | `Item.stockQty` and `reorderLevel` existed from the first version and **nothing ever wrote to them** — the Inventory page showed a stock column that only moved when somebody edited it by hand. New `StockMovement` ledger (append-only, signed quantities, balance-after on each row) plus `stockService`: issuing an invoice takes stock out, cancelling puts it back, a credit note returns **only what it credits**, a purchase brings it in. Three deliberate refusals: a **draft** moves nothing, a **service** is never tracked, and a line that matches no catalogue item moves **nothing rather than guessing** — silently decrementing the wrong product is a balance that is wrong in a way nobody can trace. `stockQty` is now a cached balance the ledger can always rebuild, moved with `$inc` so two concurrent sales cannot lose one another. Manual adjustments require a note, which is exactly what the old hand-edited number never had. Low-stock alerts only consider items that actually have a reorder level — a missing level means "untracked", not zero, or every service sits in the alert list forever |
| Receivables (2.4 #28, #29, #33) | The product could say *how much* was outstanding and nothing else — not how old it was, not who owed it, not how long money takes to arrive. Added AR ageing (0-30/31-60/61-90/90+, per customer, sorted by the **worst** invoice rather than the largest total, because the report is read to decide who to chase), a statement of account with a running balance and a real **opening balance** (omitting it is the classic statement bug: the closing figure is only right if the period starts at the beginning of the relationship), and DSO / collection efficiency / payment-method mix. DSO is computed the standard way rather than by averaging invoice-to-payment gaps — the average silently ignores the invoices that were never paid at all, which is precisely where a collections problem hides. Every figure is `null` rather than `0` when there is no data, because a DSO of zero reads as "we collect instantly" |
| Excel export (2.4 #34) | `exceljs` had been a dependency since the beginning and was used for exactly one thing: the blank bulk-upload template. Every export was CSV, which loses number formatting and cannot hold more than one table — so an ageing report became two files whose relationship was lost on download. New `excelService` streams real workbooks with `WorkbookWriter` (not `new Workbook()`, which holds every row in memory until the end), typed cells so dates sort and numbers sum, and multiple sheets. A test asserts the output is a `PK` zip container, because a CSV renamed `.xlsx` simply fails to open |
| Emailing the invoice (2.3 #19) | There was **no send-invoice action at all** — only overdue reminders, plain text with nothing attached. So the loop the entire application exists to serve, "raise an invoice and give it to the customer", ended at a download the tenant then emailed themselves. Now `POST /invoices/:id/send` attaches the **same** `renderInvoicePdf` output the download produces (rendering a second, simpler version for email is how the customer's copy comes to differ from ours), sets `replyTo` to the tenant's own address so a customer's reply is not swallowed by our transactional sender, refuses on a draft, and reports what *actually* happened rather than a blanket success |
| Three decorative toggles made real (2.3 #24–#26) | `showBankDetails` rendered an **empty block** for almost every invoice ever produced, because `bankDetails` lived only on the document and had to be retyped each time. `showSignature` drew a signature line with nothing above it. And there was no default terms text anywhere. New org-level `brandingConfig.invoiceDefaults` (bank, UPI id, signature image, signatory name, terms, default note), with per-invoice fields still winning. Mirrored byte-for-byte between `pdfService.js` and `invoice-document.component.ts` per the house convention, and the bank panel is now sized to the rows that have a value rather than a fixed box that clipped the UPI line |
| The tenant's own audit trail (2.6 #50) | `AuditLog` has recorded `orgId` since Phase 1 and was exposed **only** on the superadmin route, so an owner could not see who on their own team changed what — the first question anyone asks after a mistake. New `/reports/activity`, admin-only, tenant-scoped, with the platform's internal ids stripped. Support access is shown in plain words rather than hidden: if somebody at KloguBizz acted inside the account, the customer sees it, which is the visible half of Part 3.4's data-access log and what makes impersonation defensible rather than merely audited internally |
| Two bugs the tests found | (1) **The aggregation-cast trap recurred.** `stockService.recomputeBalance` passed string ids into a `$match`, which Mongoose casts for `find` but not inside a pipeline — so the repair path would have *zeroed* the balance it was asked to rebuild. Same class as the ITC register bug in Phase 5; now documented in both places. (2) **The duplicate-purchase guard depended on index state.** It relied solely on the unique index, which does not exist while Mongoose is still building it — and does not exist at all when `autoIndex` is off, the usual production setting. A guard against claiming the same input credit twice cannot be conditional on that, so there is now an explicit pre-check with the index kept as the race backstop |

**Deliberately not done in this tranche:** a UPI **QR code** on the invoice. Same
reasoning as the MFA QR: an encoder whose output I cannot verify scans is a payment
instruction that might silently not work, which is worse than printing the UPI id as
text that can be typed or copied.

---

## PART 1 — BUGS & FIXES

### 1.1 Security · privilege escalation (P0)

| # | Issue | Where | Fix |
|---|---|---|---|
| 1 | **A tenant admin can make anyone a platform superadmin.** `updateUser` spreads `req.body` straight into `findOneAndUpdate`, and `User.role`'s enum *includes* `'superadmin'`. `requireRole('superadmin')` only reads `req.user.role`, so `PUT /users/:id {"role":"superadmin"}` grants full platform control. The same call can set `orgId` (move a user into another tenant), `passwordHash`, `status`, `sessionVersion`, `inviteToken`. **[verified]** | `userController.js:74` | Field allowlist (`name`, `role`, `status`), and reject `role === 'superadmin'` from any tenant route |
| 2 | **A tenant admin can self-upgrade to any plan for free.** `updateOrganisation` spreads `req.body` into the org. `PUT /organisations/current {"plan":"enterprise","status":"active"}` bypasses billing entirely. The same call can set `ownerId` (bypassing the password-confirmed `transferOwnership` flow) and reset `invoiceSequence`. **[verified]** | `organisationController.js:15` | Allowlist to profile/branding/theme fields only; `plan`/`status`/`ownerId`/`invoiceSequence*` are server-controlled |
| 3 | **Cross-tenant data injection via `orgId` in the body.** `updateClient`, `updateItem`, `updateInvoice`, `createPayment` all spread `req.body`; the *filter* is org-scoped but the *update* can then set `orgId` to another tenant's id, moving the record across the isolation boundary. **[verified]** | client/item/invoice/payment controllers | Global `delete body.orgId` (same precedent as the existing `delete body.invoiceNumber`) |
| 4 | **Production boots with a git-committed JWT secret.** `env.js` falls back to `'local_dev_access_secret_change_me_now'` when `JWT_SECRET` is unset. If the env var is ever missing on Render, anyone reading this repo can forge a superadmin token. Same for `RAZORPAY_WEBHOOK_SECRET` and the `SuperAdmin@123` default. **[verified]** | `config/env.js` | Hard-fail on boot when `NODE_ENV === 'production'` and any secret is missing or equals the default |
| 5 | **Razorpay webhook signature check is bypassable.** `if (signature && !verify(...))` — omit the `x-razorpay-signature` header entirely and the check is skipped. Separately, `JSON.stringify(req.body)` is not the raw body Razorpay signed (key order/whitespace differ), so even a *correct* signature fails — and the global `express.json()` has already consumed the raw body. **[verified]** | `razorpayWebhookController.js:6-11`, `server.js:14` | Require the header; mount `express.raw({type:'application/json'})` on that route *before* the global JSON parser |
| 6 | **No brute-force protection on login.** The only limiter is global (300 req / 15 min / IP across all routes) — that permits ~300 password guesses per window. No per-account throttle, no failed-attempt counter, no lockout, no CAPTCHA. **[verified]** | `server.js:37`, `authRoutes.js` | Strict per-route + per-account limiter, `failedLoginAttempts`/`lockedUntil` on `User` |
| 7 | **No MFA anywhere** — including the superadmin account, which is a single email+password with a known default and no IP allowlist. | — | TOTP 2FA for superadmin (mandatory) and tenant admins (premium feature) |
| 8 | **No request validation layer.** `zod` is in `dependencies` and **never imported once**. Every controller trusts the shape of `req.body`. `items:[{qty:"abc"}]` → `Number("abc")` → `NaN` → an invoice is persisted with `NaN` totals, which then breaks the PDF, the CSV and the GST report. **[verified]** | all controllers | Zod schema per route + a numeric-coercion guard in `gstService` |
| 9 | **CORS is a single origin string.** `cors({origin: env.FRONTEND_URL})` — a `www.` variant, a custom domain, or the installed PWA on another host all break. **[verified]** | `server.js:11` | Allowlist array |

### 1.2 Broken features (P0)

| # | Issue | Where | Fix |
|---|---|---|---|
| 10 | **The entire team-invite flow is dead.** `inviteUser` creates a user with `status:'invited'`, generates an `inviteToken`, and emails a link to `/accept-invite?token=…`. There is **no backend endpoint to redeem that token** and **no `/accept-invite` route in `app.routes.ts`** — the link hits the `**` wildcard and redirects to `/dashboard`. The invited person can never set a password, and `protect` rejects any non-`active` user. Every invited teammate is permanently locked out. **[verified]** | `userController.js:47`, `app.routes.ts` | Add `GET/POST /auth/accept-invite`, the frontend route, token expiry, and resend/revoke |
| 11 | **No password reset at all.** No forgot-password endpoint, no route, no email, no token field. A tenant who forgets their password has no recovery path — and the superadmin has no "reset this user's password" action either, so support cannot help. **[verified]** | — | Full reset flow + a superadmin-side force-reset |
| 12 | **Suspending an organisation does nothing.** `Organisation.status` accepts `'suspended'` and the super-admin UI sets it, but **no middleware anywhere reads it** — `protect` only checks `user.status`. A suspended tenant keeps invoicing normally. **[verified]** | `authMiddleware.js` | Block/downgrade requests when `org.status` is `suspended`/`cancelled`, with a clear tenant-facing banner |
| 13 | **Scheduled reminders never run.** `reminderService.runReminderSweep()` is a literal stub returning `{scanned:0,sent:0,note:'placeholder'}` and **nothing calls it**. The super-admin "Reminders & Receipts" page (offset days, enable toggle, subject, body template) is pure UI — no cron exists, and `sendReminderEmail` hardcodes its own copy, ignoring the configured subject/template entirely. **[verified]** | `reminderService.js`, `emailService.js` | Real scheduler + render the configured templates + a `ReminderLog` |
| 14 | **Subscriptions activate without payment.** `startSubscription` calls Razorpay `subscriptions.create` and *immediately* sets `status:'active'` and `Organisation.plan = planCode` with no payment confirmation. `POST /subscriptions/start {"planCode":"enterprise"}` = free enterprise. No Checkout handoff, no `payment_captured` gate. **[verified]** | `subscriptionController.js:22-38` | Activate only on a verified webhook; keep the plan pending until then |
| 15 | **Cancelling doesn't cancel.** `cancelSubscription` sets `endDate = now` (killing access instantly instead of at period end) and **never calls Razorpay**, so the customer's recurring mandate keeps charging them. **[verified]** | `subscriptionController.js:40` | Cancel at provider + `cancelAtPeriodEnd` semantics |
| 16 | **The webhook handler does nothing.** It verifies (see #5) and returns `{received:true}`. No `subscription.charged`, `subscription.halted`, `payment.failed` handling — so a subscription never moves to `past_due` or `cancelled` from the provider side, and the local state silently drifts from Razorpay forever. **[verified]** | `razorpayWebhookController.js` | Event handlers + idempotency keys + a reconciliation job |
| 17 | **Invoice quota is bypassable via Duplicate.** `assertInvoiceQuota` guards `createInvoice` but **not** `duplicateInvoice`. **[verified]** | `invoiceController.js:154` | Add the quota check |
| 18 | **The super-admin invoice-template gallery is disconnected from reality.** `Settings.js`'s `InvoiceTemplate` model (`layout`, `accentColor`, `isDefault`) is a completely separate system from the 22 real templates in `invoiceTemplates.js` that tenants actually render. Nothing the superadmin sets there affects any invoice. Two unrelated concepts share one name. **[verified]** | `Settings.js`, `templates.component.ts` | Either wire it to the real template registry as the platform default, or delete it |
| 19 | **The Masters page is decorative.** `Item.gstRate` is a hardcoded enum `[0,5,12,18,28]` in the model, so adding a 3% slab (real: gold) in Masters does nothing. `lineItemSchema.gstRate` has no enum at all. `Item.unit` and `Payment.method` are free strings with hardcoded defaults, ignoring the `unit`/`paymentMethod` masters. **[verified]** | `Item.js`, `Invoice.js`, `Payment.js` | Validate against `Master` at write time; drop the hardcoded enums |

### 1.3 Money & GST correctness (P0/P1)

| # | Issue | Where | Fix |
|---|---|---|---|
| 20 | **Discounts are silently baked into line rates.** The Bill Generator's own comment says it: *"Backend computes totals from items and ignores discount, so the discount is folded into each item's rate before sending."* `lineItemSchema` and `totalsSchema` have no discount field. Result: the customer's invoice shows mysteriously reduced rates with no discount line, the gross value is lost forever, and the GST taxable value is post-discount with no record of the original — which a GST invoice is required to show separately. **[verified]** | `bill-generator.component.ts:556`, `Invoice.js` | `discount` at line + invoice level, persisted, rendered, and reported |
| 21 | **Tax-inclusive pricing overcharges.** `Item.taxInclusive` exists on the item master, but nothing on the invoice line honours it — pick a tax-inclusive item and GST is added *on top of* a price that already contains it. **[verified]** | `gstService.js`, `Invoice.js` | Back-calculate tax when the line is inclusive |
| 22 | **Cess is never charged.** `Item.cessRate` exists; `lineItemSchema` has no cess field and `calculateInvoiceTotals` ignores it. Cess goods (tobacco, autos, aerated drinks) are under-taxed. **[verified]** | `gstService.js` | Add cess to the line, totals, PDF and reports |
| 23 | **Dashboard revenue is wrong the moment anyone pays partially.** `invoiceStats` counts revenue only from `status:'paid'`, so a ₹1L invoice with ₹90k received contributes **₹0**; and `pendingAmount` counts the *full* total for partials instead of the outstanding balance. There is no `amountPaid`/`balanceDue` field on `Invoice` at all — it's recomputed by aggregating `Payment` inside `createPayment` and then thrown away. **[verified]** | `invoiceController.js:64`, `Invoice.js` | Persist `amountPaid`/`balanceDue`; report on received amounts, not invoice status |
| 24 | **`markPaid` double-counts collections.** It force-writes `status:'paid'` and creates a Payment for the **full invoice total** even when partial payments already exist. Mark a part-paid invoice as paid and recorded payments now exceed the invoice value, overstating collection stats and the payments CSV. **[verified]** | `invoiceController.js:170` | Settle only the outstanding balance; refuse if already fully paid |
| 25 | **No over-payment guard.** `createPayment` accepts ₹10,00,000 against a ₹1,000 invoice. **[verified]** | `paymentController.js:14` | Validate `amount <= balanceDue`, or handle advances explicitly |
| 26 | **Payments cannot be edited, deleted or reversed,** and an invoice cannot be un-marked-paid. A typo'd amount is permanent. `Payment.status` has `'failed'`/`'pending'` in its enum but nothing ever sets them — while a caller can freely POST `status:'failed'`, which then shows in the list and CSV. **[verified]** | `paymentRoutes.js` | Edit/void routes with an audit trail; restrict `status` |
| 27 | **No round-off line.** GST invoices conventionally carry a ±₹0.50 adjustment so the payable total is a whole rupee. | `gstService.js` | Add `roundOff` to totals |
| 28 | **UTGST is never modelled.** `isIGST` is decided purely by `fromState !== toState`; for Union Territory supplies the split must be CGST+UTGST, not CGST+SGST. **[verified]** | `gstService.js` | Add UT handling |
| 29 | **No place-of-supply field** distinct from the client's registered state, so bill-to ≠ ship-to scenarios compute the wrong tax head. | `Invoice.js` | Explicit `placeOfSupply` |
| 30 | **Exempt / nil-rated / non-GST / zero-rated all collapse to `gstRate: 0`,** which makes correct GSTR-1 classification impossible. | `Invoice.js` | A `taxTreatment` field |
| 31 | **No reverse charge (RCM) flag**, no export/SEZ/LUT handling, no TDS/TCS, no advance receipts. | — | Add as document-level flags |
| 32 | **Rounding happens per-invoice, not per-line,** which can drift by a rupee or two against a customer's own calculation on long invoices. | `gstService.js` | Round each line, then sum |

### 1.4 Compliance & data integrity (P0/P1)

| # | Issue | Where | Fix |
|---|---|---|---|
| 33 | **Issued invoices are hard-deleted.** `deleteInvoice` does `findOneAndDelete`, which under GST is not permitted — an issued invoice must be reversed by a **credit note**, not erased. It also punches a permanent gap in the invoice number sequence and destroys the audit trail. There are no credit notes or debit notes in the system at all. **This is the single biggest compliance gap.** **[verified]** | `invoiceController.js:196` | Block delete once status ≠ `draft`; add Credit Note / Debit Note documents |
| 34 | **A paid invoice can be silently rewritten.** `updateInvoice` allows changing items and totals on an already-paid document, with no versioning and no diff in the audit log (it records only `{invoiceNumber}`). There's no `cancelled`/`void` status either. **[verified]** | `invoiceController.js:117` | Lock issued invoices; record field-level diffs; add `void` |
| 35 | **Deleting a client leaves dangling references.** `deleteClient` hard-deletes a client that invoices reference by ObjectId — `populate('clientId')` then yields `null` and the invoice list, CSV and PDF render a blank buyer. No referential-integrity check. **[verified]** | `clientController.js:24` | Refuse deletion when invoices exist; soft-delete/archive instead |
| 36 | **The org-delete cascade misses `Item` and `AuditLog`,** so orphaned documents pointing at a deleted org accumulate forever. The cascade is also non-transactional — a mid-way failure leaves half a tenant behind. **[verified]** | `superadminController.js:106` | Complete the cascade, run it in a transaction, and soft-delete with a 30-day restore window |
| 37 | **No soft delete or recycle bin anywhere** — clients, items and invoices are gone instantly with no undo. | — | `deletedAt` + a restore UI |
| 38 | **Client-side-only GSTIN validation.** `isValidGSTIN` lives in `format.ts`; the API accepts any string. **[verified]** | `clientController.js` | Server-side checksum validation, plus optional GSTN lookup to auto-fill legal name/address |
| 39 | **`AuditLog` has no retention policy and no immutability guarantee,** and coverage is patchy: client create/update/delete, item changes, `updateUser`, `removeUser` and tenant `updateOrganisation` log **nothing**. **[verified]** | `auditService.js`, controllers | Cover every mutation; append-only; TTL/archive |

### 1.5 Scale & performance (P1)

| # | Issue | Where | Fix |
|---|---|---|---|
| 40 | **No pagination anywhere.** `listInvoices`, `listPayments`, `listClients`, `listItems` and the super-admin `listOrganisations` all return the entire collection. **[verified]** | all list controllers | `?page`/`?limit` + cursor pagination, server-side sort/filter |
| 41 | **`invoiceStats` loads every invoice in the org into Node memory** and reduces in JavaScript — including a `.populate()` per invoice. Slow at a few thousand, an OOM at tens of thousands. **[verified]** | `invoiceController.js:64` | One aggregation pipeline |
| 42 | **`reportController.buildSummary` loads every non-draft invoice into memory** for the same reason, and has **no date filtering at all** — it re-aggregates all history on every page view. **[verified]** | `reportController.js:10` | Aggregation + required date range |
| 43 | **A write on every read.** `sweepOverdue` runs an `updateMany` across the collection on every list, stats and CSV call. It also only moves `pending → overdue`, so a partially-paid late invoice **never shows as overdue**. **[verified]** | `invoiceController.js:47` | Move to a scheduled job (or compute overdue at read time); include `partial` |
| 44 | **`remindAll` sends emails serially inside the HTTP request.** 500 overdue invoices with live SendGrid = a request that blocks for minutes and times out on Render. No queue, no batching, no dedup ("already reminded today"), no send log — so nothing stops emailing the same customer daily. **[verified]** | `invoiceController.js:238` | Background queue + per-invoice send log + throttle |
| 45 | **Logos are base64 data-URIs stored inside Mongo documents** (500KB and 700KB caps) and are re-sent on **every** `/auth/me` and `/organisations/current` call. Platform branding does the same on every unauthenticated login-page hit. No CDN, no caching, no resizing. **[verified]** | `Organisation.js`, `publicController.js` | Object storage (S3/R2) + URL + image pipeline |
| 46 | **Missing indexes on hot paths:** `Invoice.dueDate` (hit by `sweepOverdue` on every read), `Invoice.createdAt` (the quota count), `Payment.{invoiceId,status}` (the exact shape of the aggregate in `createPayment`), `AuditLog.{action}`/`{actorId}`. **[verified]** | models | Add them |
| 47 | **`saveMasters` is a destructive non-atomic `deleteMany` + `insertMany`.** A crash between the two wipes every GST rate / HSN code platform-wide with no recovery, and each save rotates every `_id`. **[verified]** | `superadminController.js:151` | Diff-based upsert in a transaction |
| 48 | **Every frontend component refetches on navigation.** No HTTP cache, no shared signal store, no request dedup. **[verified]** | frontend `core/` | A signals-based store with cache + invalidation |
| 49 | **`chart.js` is a dependency that is never used** — the dashboard uses a hand-rolled `bar-chart.component`. **[verified]** | `frontend/package.json` | Remove it, or use it |

### 1.6 Sessions & auth UX (P1)

| # | Issue | Where | Fix |
|---|---|---|---|
| 50 | **One device only, silently.** `sessionVersion` is bumped on **every login**, so signing in on a phone kills the desktop session with no warning. Documented as intentional, but it is user-hostile for a paid product. **[verified]** | `authController.js:77` | A device/session list with explicit revoke, instead of forced eviction |
| 51 | **12-hour hard logout with no refresh token.** `JWT_REFRESH_SECRET` exists in `env.js` and is **never used anywhere**, so users are booted mid-work every 12h — and the new proactive `scheduleExpiry()` makes it an abrupt one. **[verified]** | `env.js`, `authController.js` | Short access token + rotating refresh token + silent renewal |
| 52 | **No email verification on registration.** **[verified]** | `authController.js:29` | Verify before activation |
| 53 | **A user's email is globally unique across all tenants,** so one person cannot belong to two organisations — a real problem for accountants serving multiple businesses, and it means a disabled user's email can never be re-invited. **[verified]** | `User.js:39` | Membership model: `{userId, orgId, role}` join, unique per org |
| 54 | **No org-switcher** for users who belong to more than one organisation (blocked by #53). | — | Add once memberships exist |

### 1.7 Operations & engineering hygiene (P1/P2)

| # | Issue | Where | Fix |
|---|---|---|---|
| 55 | **`/health` lies.** It returns `OK` without checking Mongo, so Render's health check keeps a database-less instance in rotation serving 500s. **[verified]** | `server.js:39` | Check `mongoose.connection.readyState`; split liveness vs readiness |
| 56 | **No DB reconnect handling, no retry, no graceful shutdown.** `connectDatabase` awaits a single `mongoose.connect` with no event handlers; there is no `SIGTERM` handler, so every Render restart drops in-flight requests. **[verified]** | `config/database.js`, `server.js` | Retry with backoff, connection event logging, graceful drain |
| 57 | **No structured logging, no request IDs, no error tracking, no metrics, no APM.** `console.log`/`console.error` only. **[verified]** | — | pino + request-id middleware + Sentry + uptime alerting |
| 58 | **Email delivery is invisible.** `sendEmail` returns `{skipped:true}` silently when no key is set, and there is no delivery record either way — you cannot tell whether any reminder ever arrived. No bounce/complaint handling, no suppression list. **[verified]** | `emailService.js` | An `EmailLog` + SendGrid event webhook ingestion |
| 59 | **Effectively no tests.** Backend: one file (`gstService.test.js`). Frontend: **zero** `.spec.ts` files. No integration tests, and critically **no tenant-isolation tests** — the most important invariant in the whole product. **[verified]** | — | Route/controller tests, isolation test suite, Playwright E2E |
| 60 | **No CI/CD, no linting, no formatting, no dependency scanning.** No `.github/`, no ESLint or Prettier config in either package. **[verified]** | — | GitHub Actions (build + test + lint), ESLint/Prettier, Dependabot, `npm audit` gate |
| 61 | **No migration tooling.** Schema changes are ad-hoc one-off scripts (`seed/backfillOwnerId.js`). **[verified]** | — | A versioned migration runner |
| 62 | **No backup/restore procedure, no per-tenant data export, no self-service account deletion** (DPDP/GDPR portability and erasure). | — | Documented backup + restore drills + export/erase workflows |
| 63 | **No API documentation beyond a hand-written `docs/API.md`** — no OpenAPI spec, no Postman collection, no public API or API keys at all. **[verified]** | `docs/` | OpenAPI + generated docs |
| 64 | **`saveSetting` accepts any JSON as a value with zero validation** — one bad payload silently breaks the login page's branding for everyone. **[verified]** | `superadminController.js:196` | Per-key schema validation + change history |
| 65 | **`environment.ts` ships pointing at the deployed backend with the localhost line commented out** — a footgun that has to be manually flipped and flipped back for every local test. **[verified]** | `frontend/src/environments/` | Proper `environment.development.ts` file replacement |
| 66 | **Invoice number padding is hardcoded to 3 digits** (`padStart(3,'0')`), so the 1000th invoice of a financial year breaks the visual format. **[verified]** | `invoiceNumberService.js:56` | Configurable padding, prefix, suffix and per-series numbering |
| 67 | **PDF pagination thresholds are hardcoded magic numbers** (`if (y > 700)`, `y > 640`) rather than derived from the page box, and there are no page numbers or "continued" markers on multi-page invoices. **[verified]** | `pdfService.js:604` | Derive from `doc.page.height - margin`; add `Page N of M` |

---

## PART 2 — MISSING FEATURES (tenant product)

### 2.1 GST compliance — the biggest gaps (P0)

1. **Credit notes & debit notes** — legally required; currently impossible (see #33).
2. **GSTR-1 export** — section-wise (B2B, B2CL, B2CS, CDNR, EXP, HSN summary, document series) as the GSTN offline-utility JSON or its prescribed Excel. Today's report is a month × rate summary that doesn't even group by HSN.
3. **GSTR-3B summary** — cannot be computed at all without purchases (see #5 below).
4. **E-invoicing (IRN + signed QR)** — mandatory above ₹5 cr turnover. The `gst-einvoice-qr` template draws a *decorative, non-scannable* QR motif. Needs an IRP/GSP integration and `irn`/`ackNo`/`ackDate` on the invoice.
5. **Purchases / expenses / vendors** — there is no supplier model and no purchase invoice, therefore **no input tax credit**, therefore no net GST liability. A GST product without ITC is sales-only.
6. **E-way bill** generation for goods movement above ₹50k.
7. **GSTR-2A/2B reconciliation** against purchase records.
8. **HSN-wise summary report** (required in GSTR-1).
9. **Multi-GSTIN / branch support** — one org = one GSTIN today, so a business registered in two states needs two accounts and two invoice series.
10. **Composition scheme** and QRMP filing modes.

### 2.2 Document types (P1)

11. **Quotations / estimates** with accept → convert to invoice.
12. **Proforma invoices** (the `invoiceTitleLabel` override is a workaround, not a document type).
13. **Delivery challans** and **sales orders**.
14. **Recurring / subscription invoices** for the tenant's own customers, with auto-generate and auto-send.
15. **Purchase orders**.
16. **Receipts / payment vouchers** as first-class printable documents.
17. **Multi-copy invoice sets** — "Original for Recipient / Duplicate for Transporter / Triplicate for Supplier". A `copyLabel` flag exists per template but nothing renders the set.
18. **Multi-currency + export invoices** (INR conversion, LUT declaration, shipping bill details).

### 2.3 Getting paid (P1)

19. **Email the invoice to the customer** — there is no "send invoice" action at all today, only reminders, and reminders are **plain text with no PDF attached**.
20. **Branded HTML email templates** with the org logo, invoice summary and a pay button.
21. **A payment link / hosted public "pay this invoice" page** — Razorpay is wired only for the SaaS subscription, never for tenant → customer collection.
22. **UPI ID + payment QR on the invoice.**
23. **A customer portal** — let clients view, download and pay their invoices and see their statement.
24. **Org-level bank details master.** `bankDetails` lives only on `Invoice` and must be retyped every time, so the `showBankDetails` toggle renders an empty block for most invoices.
25. **Signature image upload.** `invoiceContent.showSignature` turns on a signature block that has nothing to put in it.
26. **Terms & conditions master** with per-invoice override.
27. **Auto-reconciliation** from bank statement import or a payment-gateway feed.

### 2.4 Reporting & analytics (P1)

28. **AR ageing report** with 0-30 / 31-60 / 61-90 / 90+ buckets and customer-wise outstanding.
29. **Customer statement of account** (PDF + email).
30. **Any date-range filter** — the GST report currently has none at all; add FY/quarter/month presets and comparison periods everywhere.
31. **Sales by item / by category / by client, with trends.**
32. **P&L and expense reports** (needs purchases).
33. **Payment-method mix, DSO, collection efficiency, credit limits per client.**
34. **Excel (.xlsx) export** — `exceljs` is already a dependency but is only used for the item-import template.
35. **Scheduled report emails** (weekly/monthly digest to the owner and their CA).
36. **A real dashboard** — segmented by period, with drill-through from every tile, targets vs actuals, and cash-flow forecasting.

### 2.5 Inventory (P1)

37. **Stock is a dead field.** `Item.stockQty` and `reorderLevel` exist; nothing decrements stock on invoicing.
38. **Stock ledger** with movement history and opening balances.
39. **Low-stock alerts** and reorder suggestions.
40. **Stock valuation** (FIFO/weighted average) and a stock summary report.
41. **Batch / serial / expiry tracking** for pharma and FMCG.
42. **Warehouses / multiple locations**, stock transfers, adjustments.
43. **Barcode scanning** — `Item.barcode` exists and is unused.
44. **Price lists** per customer or per tier; bulk price revision.

### 2.6 Workflow & collaboration (P2)

45. **Approval workflows** — draft → approved → issued, with an approver role.
46. **Granular permissions** instead of three fixed roles; the Users page shows a permission matrix that isn't actually enforced per-permission.
47. **Notes, tasks and follow-up reminders** per client/invoice.
48. **File attachments** on invoices and clients (no storage layer exists at all).
49. **Comment threads / activity feed** per document.
50. **A tenant-facing audit log.** `AuditLog` already records `orgId` but is only exposed on the *superadmin* route — a tenant admin cannot see who changed what in their own organisation.

### 2.7 Integrations (P2)

51. **Tally / Zoho Books / QuickBooks export**, and a public REST API with per-tenant API keys.
52. **Outbound webhooks** (invoice created, payment received) with signing.
53. **WhatsApp Business** invoice + reminder delivery — in India this matters more than email.
54. **SMS reminders**, Google Contacts / CSV client import, Zapier/Make connector, accountant/CA read-only access.

---

## PART 3 — SUPER ADMIN: MONITORING & CONTROL

Today the entire super-admin surface is: eight scalar counts (`overview`), an org list
with per-org user/invoice counts, global masters, a disconnected template gallery, a
non-functional reminder config, a plan editor, platform branding, a password change,
and an **unfiltered, unpaginated** audit log capped at 200 rows. There is no
per-tenant drill-down, no user management, no impersonation, no metrics over time, and
**no event data captured anywhere** to build metrics from — `User.lastLoginAt` is the
only usage signal that exists.

Everything below is new work. The prerequisite for most of Part 3.1 is a
`UsageEvent`/`ActivityLog` collection plus a nightly rollup into a `MetricsDaily`
collection — without that, none of these charts can be drawn.

### 3.1 Platform observability dashboard

**Revenue**
- MRR, ARR, ARPA, LTV; revenue by plan and by billing cycle; MoM growth
- Expansion / contraction / churned MRR (the standard MRR waterfall)
- Net revenue retention and gross revenue retention
- Failed-payment value at risk, and collections vs invoiced
- Revenue forecast from current subscriptions

**Growth & funnel**
- Signups per day / week / month, with source attribution
- Activation rate: signup → first invoice, and time-to-first-invoice distribution
- Trial funnel: started / converted / expired, conversion rate, days-to-convert
- **Trials expiring in the next 7 days** — as an actionable list, not a number
- Churn: logo churn, revenue churn, voluntary vs involuntary, churn reasons
- Cohort retention heatmap by signup month

**Engagement**
- DAU / WAU / MAU platform-wide and per tenant; stickiness (DAU÷MAU)
- Per-tenant last-active timestamp, session count, and a **health score** (usage trend + payment status + support load)
- **At-risk tenant list**: paying but inactive for 14+ days
- Feature adoption matrix — what % of tenants use Bill Generator, Items, bulk upload, Reports, each invoice template, appearance themes
- Power-user vs dormant segmentation

**Volume**
- Invoices created per day, total document volume, GMV flowing through the platform
- PDF renders, CSV/Excel exports, emails sent, storage consumed per tenant
- API calls per tenant (once an API exists)

**Live / real-time**
- Currently-online users, requests per minute, error rate
- p50 / p95 / p99 latency by route, slowest endpoints, slowest Mongo queries
- Background job queue depth and failure rate

### 3.2 Tenant lifecycle control

**Per-org detail view** (a drill-down that does not exist today)
- Full profile, GSTIN, address, owner contact, plan, subscription state, payment history
- Usage vs every plan limit, storage used, document counts, last activity
- Timeline of everything that has happened to this tenant
- Their users, their invoices, their payments — viewable for support

**Actions**
- **Suspend / unsuspend with a reason** — and actually enforce it (see fix #12), with a clear tenant-facing banner explaining why
- **Soft-delete with a 30-day grace period and restore**, replacing today's irreversible cascade
- **Impersonate / "view as tenant"** — the single most valuable support capability; needs a loud persistent banner, a time limit, an optional read-only mode, and full audit capture. Today the only way to debug a tenant issue is to ask for their password.
- **Reset a tenant user's password** / force reset on next login / unlock a locked account
- **Manage tenant users** — list, disable, change role, resend invite, revoke invite. None of this exists.
- **Force-logout** a user or an entire org (revoke all sessions)
- **Transfer org ownership** from the platform side
- **Per-org plan override / custom limits** — extra seats or invoices without inventing a new plan
- **Grant / extend / end a trial**, set an explicit expiry
- **Per-org feature flags** — toggle e-invoicing, template access, API access, dark mode
- **Per-org rate limits and quota overrides**
- **Message a tenant** — in-app banner + email, to one org or broadcast to all
- **Full tenant data export** (JSON/zip) and import; merge duplicate orgs
- **Support CRM fields** — account manager, tags, risk flags, internal notes, linked tickets

### 3.3 Billing & revenue control

- **Plan versioning.** `upsertPlan` overwrites in place today, so changing a price silently reprices every existing subscriber with no grandfathering. Needs versioned plans and per-subscription pinning.
- **Coupons, promo codes, referral tracking**; percentage/fixed/duration-limited
- **SaaS invoices for the platform's own sales** — a paid Indian SaaS must issue its own GST invoice to each tenant. No such document exists.
- **Dunning** — retry schedule, escalating email sequence, grace period, auto-suspend at N days past due
- **Refunds, credit notes and proration** on plan changes
- **Razorpay reconciliation view** — a drift detector comparing local subscription state against the provider's
- **Deferred-revenue / revenue-recognition report**
- **The platform's own GST liability report**
- **Manual charge / manual credit** against a tenant account
- Payment-method health per tenant (card expiring, mandate revoked)

### 3.4 Security & compliance console

- **Audit log, properly** — filter by org, actor, action, entity and date range; paginate; export CSV; enforce append-only immutability; set a retention/archive policy. Today: no filters, no pagination, `limit ≤ 200`, and a `PUT` route pattern that a future refactor could easily make mutable.
- **Login history** — successes and failures, per account and per IP, with device and geo
- **Active session list per user**, with force-revoke
- **Suspicious-activity alerts** — brute force, impossible travel, mass export, mass delete, off-hours superadmin action
- **Granular superadmin roles.** `requireRole('superadmin')` is all-or-nothing today. Split into owner / billing / support / read-only auditor.
- **Two-person approval for destructive operations** — delete org, change pricing, bulk actions
- **Break-glass elevation** with automatic expiry
- **MFA mandatory for superadmin**, plus an IP allowlist on `/super-admin`
- **A data-access log** — record every time a superadmin views tenant data, and surface it to the tenant
- **DPDP / GDPR tooling** — consent records, data-subject request workflow (export/erase), retention config, sub-processor register
- **Terms-acceptance console.** `User.termsAcceptedAt`/`termsVersion` are already recorded but never surfaced; add a view of who accepted which version and a "force re-accept on new version" flow.

### 3.5 Operational control

- **System health page** — Mongo connection state, replica lag, collection sizes, index usage and unused indexes, slow-query log, disk and memory
- **Job / queue console** — reminder sweeps, PDF renders, email sends, exports; with retry, cancel and a dead-letter queue. **No queue exists at all today.**
- **Feature-flag console** — global, per-plan, per-org, and percentage rollout
- **Maintenance mode** with a scheduled window and a tenant-facing notice
- **Email deliverability dashboard** — sent / delivered / bounced / spam / opened, per template and per tenant; ingest SendGrid event webhooks; manage the suppression list; replay a failed send
- **Error explorer** — recent 5xx grouped by org and route, with stack traces and affected-tenant counts
- **Rate-limit & abuse console** — per-IP and per-tenant blocklist, current limiter state
- **Global settings editor with schema validation and change history** (see fix #64)
- **Announcement / changelog publisher** with an in-app "what's new"
- **Backup status, one-click point-in-time restore, and a restore-drill log**
- **API key management + per-tenant usage metering**
- **Webhook & integration console** with delivery logs and replay
- **Cache / CDN purge and search-index rebuild**

### 3.6 Support tooling

- Per-org support conversation history; ticket system link-out
- **Reproduce tools** — render a tenant's invoice as they see it, re-render a PDF, replay a failed email, inspect their exact plan/flag state
- Onboarding checklist status per tenant, and a "stuck tenant" list
- NPS / in-app feedback collection with per-tenant history
- A canned-response library and a documented escalation path

---

## PART 4 — MAKING IT FEEL PREMIUM

### 4.1 Interaction

1. **A command palette that actually searches data** — server-side fuzzy search across invoices, clients and items with recents and inline actions. Today `quick-search` is a client-side list of nav links, and the API's `?q=` regexes `invoiceNumber` only.
2. **Global keyboard shortcuts** + a `?` cheat sheet; `Cmd+K`, `g i` / `g c` style navigation, `n` for new invoice.
3. **Bulk actions with multi-select** — bulk mark paid, remind, export, delete, change status.
4. **Saved views and filters**, column chooser, persisted sort, sticky table headers, virtualised long lists.
5. **Undo toasts on destructive actions** instead of confirm dialogs everywhere.
6. **Autosave drafts** with recovery after a crash or accidental navigation.
7. **Optimistic UI** on every mutation, with rollback on failure.
8. **Inline field validation** with helpful, specific messages — not a single toast at the end.
9. **Duplicate detection** — same client name/GSTIN, same invoice to the same client on the same day.
10. **Smart defaults & autofill** — pincode → state, IFSC → bank name, GSTIN → legal name and address, last-used payment terms per client, item price memory per client.
11. **Date-range picker with FY / quarter / month presets** on every list and report.
12. **Empty states with real CTAs**, a first-run onboarding tour, and a sample-data toggle for evaluation.
13. **Guided setup checklist** for a new org (add GSTIN → add bank → add logo → first invoice).

### 4.2 Craft

14. **Accessibility pass** — modal focus trap and restore, ARIA on the drawer/toasts/tables, visible focus rings, `prefers-reduced-motion`, screen-reader labels, and a contrast audit of all 15 themes × 12 accent swatches (a user-built custom palette can currently produce unreadable text).
15. **A motion system** — consistent easing and duration tokens, page transitions, list stagger, skeleton → content crossfade.
16. **Polished print & PDF** — page numbers, "continued" markers, orphan/widow control, a print stylesheet audit, PDF/A for archival, and optional DSC digital signing.
17. **Retina/branded PDF quality** — embedded fonts (Devanagari support for Hindi item names, which Helvetica cannot render at all today), vector logos.
18. **i18n** — Hindi first, then regional languages; the rupee-words and lakh/crore formatting are already in place.
19. **Offline-first**. The PWA has a service worker but no offline data layer — an invoice cannot be created offline. Add an IndexedDB queue with background sync and a clear pending/synced indicator.
20. **Native-feeling mobile** — bottom tab bar, swipe row actions, pull-to-refresh, share-sheet PDF export, camera barcode scan, haptics.
21. **Performance budget** — route-level preloading, `@defer` blocks, lazy images, bundle-size CI gate, Lighthouse targets.
22. **Dark mode should be free.** Gating a personal dark-mode preference behind Business/Enterprise reads as petty; gate something with real cost instead (e-invoicing, API access, extra seats).
23. **Consistent iconography and density** — one icon set, one spacing scale, a compact/comfortable density toggle.
24. **Loading / empty / error triad for every panel**, never a bare spinner or a blank card.

### 4.3 Trust

25. **A public status page** and in-app incident banners.
26. **Real security posture** — a published security page, penetration-test summary, SOC2/ISO roadmap, and a documented data-residency statement (Indian customers will ask).
27. **Transparent data ownership** — one-click full export, and self-service account deletion.
28. **A visible changelog** and public roadmap.
29. **In-product help** — contextual tooltips, a searchable help centre, and short embedded videos.
30. **Professional onboarding** — data migration assistance from Tally/Excel, and a white-glove option for larger tenants.

---

## Suggested order of work

**Phase 1 — Stop the bleeding (P0 security & money).** Fixes #1–#9 (field allowlists,
secrets, webhook, brute force, validation), #14–#16 (subscriptions activate without
payment), #20–#26 (discount, tax-inclusive, partial-payment revenue, `markPaid`
double-count).

**Phase 2 — Repair what's advertised but broken.** #10 invites, #11 password reset,
#12 suspension enforcement, #13 scheduled reminders, #18–#19 (super-admin template
gallery and Masters are decorative), #33–#34 credit notes and invoice immutability.

**Phase 3 — Make it scale.** ~~#40–#49 (pagination, aggregation, the write-on-every-read
sweep, the email loop, base64 logos, indexes), plus logging, error tracking, tests and CI
(#55–#61).~~ **Shipped 2026-07-28** — see the Phase 3 status section above. Remaining
from this band: #37 (soft delete), #45's object-storage half, #58's bounce handling.

**Phase 4 — Super-admin platform console.** ~~The event-capture layer and metrics rollup
first, then the tenant drill-down, impersonation, user management and audit console —
Part 3.1, 3.2 and 3.4 give the most support leverage per unit of work.~~
**Shipped 2026-07-30** — see the Phase 4 status section above. Remaining from this
band: MFA + the `/super-admin` IP allowlist (#7), two-person approval and break-glass,
the active-session registry (needs #50/#51), Part 3.3's billing depth, and the
queue/deliverability consoles in 3.5.

**Phase 5 — Compliance depth.** ~~GSTR-1 export, purchases + ITC, e-invoicing, e-way bill.
This is what moves the product from "invoice maker" to "GST software".~~
**Shipped 2026-07-30** — see the Phase 5 status section above, which also covers the
long-deferred #7, #37, #52, #58 and #62. Remaining from this band: e-way bills and
GSTR-2A/2B reconciliation, both of which need a live GSP connection that lands behind
the same seam as e-invoicing.

**Phase 6 — Premium polish.** Part 4, continuously.

---

---

## STATUS — CI/CD removed at the owner's request (2026-08-03)

Phase 3 shipped #60 as GitHub Actions CI plus grouped Dependabot. **Both have been
removed**, deliberately, on the owner's instruction: the pipeline and the eleven
Dependabot branches it kept spawning were more process than this project wants,
and the branch clutter was making the repository hard to work in.

What changed:

- `.github/` is gone — no workflow, no Dependabot config, no YAML to run.
- Every `dependabot/*` branch was deleted on origin. **`master` is now the only
  branch**, locally and remotely.
- Deploy is `git push`. Vercel rebuilds the frontend, Render rebuilds the backend,
  both from `master`. `docs/DEPLOY.md` is the whole runbook: env vars, when to run
  migrations, and how to verify a deploy actually worked.

**What was lost, stated plainly rather than glossed over.** CI was doing real
work: it ran the tests and the linter on every push and made a silent test-skip
impossible by providing a MongoDB service container. Nothing now *blocks* a push
that breaks the suite. That risk is accepted, and mitigated by replacing it with
one command per package rather than nothing:

```bash
cd backend  && npm run check     # eslint + 282 tests
cd frontend && npm run check     # eslint + a production build
```

The one trap `DEPLOY.md` calls out explicitly: **the backend tests skip themselves
when no MongoDB is reachable, and a skip looks exactly like a pass.** If the run
reports far fewer than 282 tests, nothing was verified. That was the exact failure
mode the CI guard existed to prevent, so it is now a documented human check.

Dependency scanning went with Dependabot. `npm audit` still exists and is worth
running occasionally; it is no longer run for you.

---

# WHAT IS ACTUALLY LEFT

Written after Phase 6a, as one honest inventory. Ordered by what a paying customer
notices first, not by section number. Every entry says **why it wasn't done** and **how
to do it** — "remaining work" with no route through it is just a list of regrets.

---

## STATUS — Tier 1 shipped (2026-08-03)

**Done: all three architectural items — #50/#51 refresh tokens and a session
registry, #53/#54 memberships and the org-switcher, and #45's object-storage and
resize half.**
Verified by **224 automated tests** (14 unit + 210 integration against a real
MongoDB, including a new 6-test `memberships.test.js` and 17-test `storage.test.js`),
clean `eslint` on both packages, clean production *and* development `ng build`s,
migrations 006 and 007 exercised end-to-end against a live database (apply →
idempotent re-run, with assertions on each backfill's semantics), a real PDF
rendered with its images pulled from object storage, and a real `node server.js`
boot.

| Area | What changed |
|---|---|
| Refresh tokens (#50, #51) | Access tokens dropped from **12h to 15 minutes**, with a 30-day rotating refresh token in a new `Session` registry. **The "one device only" behaviour is gone**: signing in on a phone no longer silently evicts the desktop — each login starts its own session family. Rotation **detects reuse**: replaying an already-rotated token revokes the whole family *and* bumps `sessionVersion`, on the assumption a stolen token may already have minted a live access token. Self-service device list on `/security`. The frontend refreshes silently ~60s before expiry, single-flight (`shareReplay`) because the proactive timer and the interceptor's 401 handler can both fire at once — and a second caller presenting an already-rotated token would look exactly like theft. **The invariant that makes this safe:** every existing `sessionVersion` bump (password reset/change, suspend, force-logout, role change) now *also* revokes refresh tokens — bumping the counter alone is theatre once a refresh token can mint a fresh access token carrying the new value |
| Memberships (#53, #54) | `User.email` was globally unique and `orgId`/`role` fixed at creation, so one person genuinely could not belong to two organisations — an accountant with their own KloguBizz account was flatly refused as "already registered". New `Membership {userId, orgId, role, status}` is now the authority; `User` keeps identity only. `protect` re-resolves the membership on **every** request, so a role change or removal takes effect within 15 minutes rather than at next login. Because the whole codebase already went through `req.orgId`/`tenantFilter(req)`, **20+ controllers needed no changes at all** — only the handful reading `user.orgId` directly. Inviting an already-active identity now **links instantly** with nothing to accept. `POST /auth/switch-org` re-issues a session for another membership; the switcher lives in the existing user dropdown |
| The org-delete near-miss | `User` was in the flat delete-by-`orgId` cascade list, so deleting Org A would have deleted an identity that still had an active membership in Org B — someone's access to a *different* business, destroyed by a tenant deletion. Now an explicit two-step: capture member ids, delete everything else, then remove only the identities with **zero** memberships left anywhere |
| Object storage (#45) | New `storageService` with three drivers. **`inline` is the default, deliberately**: this API runs on an ephemeral filesystem, so defaulting to local disk would lose every tenant's logo on redeploy — invisible until a customer noticed. `local` warns loudly in production; `s3` (also R2/B2/MinIO) hard-errors on missing credentials rather than failing at the moment a customer saves. Keys are content-addressed, so the existing immutable year-long cache policy stays correct by construction |
| Resize, on every upload (#45) | Independent of driver, which is where most of the benefit actually lands: a 2000×2000 PNG went **424KB → 1.5KB** in the migration test. Per-kind ceilings, EXIF orientation baked in and then stripped (pdfkit does not honour the flag, so a phone photo printed sideways — and stripping also drops GPS the customer never meant to publish on every invoice), alpha preserved, SVG passed through un-rasterised. `sharp` failing to load degrades to a documented passthrough rather than breaking every upload, and system health reports which mode is live |
| Half-migrated is a normal state | Every image now has both a storage key and the legacy inline field, and one reader (`resolveImage`) prefers the key and **falls back**. Deliberate: migration 007 cannot be atomic across thousands of documents, and an image must not be unreadable until a backfill finishes. It also covers an S3 blip — an older-but-present logo beats a blank one. Migration 007 is a **documented no-op** when no store is configured, because a migration that "moved" bytes onto an ephemeral disk while reporting success would destroy branding |
| A bug class found three more times | Once the API stops returning an image's bytes, any client that echoes the containing object back on an unrelated save erases it with the empty string the response carried. This is what `logoDirty` was invented for in Phase 3, and it recurred in the tenant signature, the platform branding page, *and* server-side in `invoiceDefaults` (whose sub-document was written whole because the merge only flattened one level). The rule, now written down: a write-only image field needs dirty-tracking on the client, a dot-path merge on the server, **and** the containing object serialised with the bytes blanked — all three, or the image silently disappears |

**Deliberately not verified:** the **S3 driver against a live bucket**. There are no
object-storage credentials in this environment, so what is tested is the seam it
plugs into (fully, via the local driver) and the SDK's own contract. A mocked S3
would only have proved the mock worked. Configure a bucket, then run
`npm run migrate` and check `/superadmin/system/health` reports `storage.driver: s3`.

---

## STATUS — the MFA sign-in path, which was missing (2026-08-05)

Reported from production, in two parts: the platform console said two-factor
authentication was **"Not available yet"** while the server was refusing every console
route until it was set up; and after enrolling, signing back in produced a spinner, then
a blank page and `SyntaxError: "undefined" is not valid JSON` in the console.

**This was a self-inflicted lockout, and worth writing down as a class of mistake.** The
enrolment dead end was fixed first (a stale Phase-4 placeholder that outlived the feature
by two phases — see `shared/mfa-enrolment.component.ts`), and that fix was verified end
to end: enrolment worked. What was never checked was the path enrolment *makes
mandatory*. Turning 2FA on was the first action in the product's history that made the
sign-in page reachable-but-unusable, and the button that did it shipped without anyone
walking through the consequence. **Enabling a gate and testing the gate are different
tests.** A feature that changes a *later* step needs that later step exercised, not just
the step you built.

Three defects, chained:

| Defect | Why it happened | Fix |
|---|---|---|
| No second-factor step existed on the login page | The backend has always been right — `/auth/login` returns `{mfaRequired, mfaToken}` and **no token**, so no half-authenticated session can exist (that property has a test, and it passed throughout). Nothing in the frontend ever called `/auth/mfa/verify`. The endpoint was reachable, tested, and unused | A step-two form on `login.component.ts`, accepting a six-digit code **or a recovery code**, with "I lost my phone" and "Start over". The presence of `mfaToken()` *is* the step flag — no separate boolean to fall out of sync |
| `login()` stored the challenge as if it were a session | `.pipe(tap(res => this.store(res)))` fired on both response shapes. `localStorage.setItem(key, undefined)` stores the literal string `"undefined"` | `LoginResponse` is now a distinct type from `AuthResponse`; `store()` **refuses** a payload with no token rather than trusting its callers |
| A corrupt localStorage value bricked the app permanently | `readJson` called `JSON.parse` unguarded during bootstrap, so `"undefined"` threw before anything rendered — white screen, and a reload could not fix it because the bad value was still there. **This is the defect that turned a failed login into an unusable application**, and it would have done the same for any corrupt value from any cause | `readJson` treats `"undefined"`/`"null"` as absent, and **deletes** anything unparseable so the next load is clean. It self-heals anyone already stuck |

**Verified against a real server**, not just typechecked: a new test covers the
**platform-account** path specifically — the one that broke — because a superadmin has no
membership and no organisation and so takes a different `resolveSession` branch from every
other MFA test. It asserts the *shape* the client actually reads (`user.role`, `user.id`,
`refreshToken`), since a missing field there is what produced the blank page, and finishes
by reaching `/superadmin/me` to prove the MFA gate is satisfied rather than bypassed.
**306 backend tests pass**, clean `eslint` on both packages, clean production `ng build`.

**Unresolved, and stated rather than buried:** one full-suite run showed a single failure
that five subsequent consecutive runs did not reproduce, and the run's output no longer
identified which test it was. It is a timing flake somewhere in the suite, not a
regression from this change (the runs bracket it), but it is real and it is unidentified.

---

## STATUS — sessions: one wrong status code, and a missing feature (2026-08-06)

Reported: *"even if I'm actively using the application, after 15 minutes the tokens expire,
it gives an error toast, no data loads at all, and I'm not even redirected to the login
page."* Plus a clear statement of what should happen instead: sign out after fifteen
minutes **without interaction**, not fifteen minutes after signing in.

Two separate things, and the first turned out to be a one-line defect with an
outsized blast radius.

### The root cause: `jwt.verify` throwing into a 500

`protect` called `jwt.verify(token, env.JWT_SECRET)` unguarded. That call throws on the
single most routine event in the system — an access token reaching its fifteen-minute
expiry — and the error handler had no case for it, so the API answered
**`500 {"message":"jwt expired"}`**.

Every mechanism built to survive an expired token keys off **401**: the client's silent
refresh, its one automatic retry, and the forced sign-out when neither works. A 500 matches
none of them. So the token expired, the server called it an internal error, and the client
— correctly, for a 500 — did nothing except show the failure. No refresh. No retry. No
redirect. The user sat on a page that would never load again, and reloading did not help
because the same expired token was still in storage.

The happy path hid it: the proactive renewal timer normally fires a minute *before*
expiry, so the 401 branch is rarely exercised. It is exercised exactly when something
already went slightly wrong — a suspended laptop whose timer never fired, a page reloaded
after the token lapsed, a tab throttled in the background. Which is to say: the recovery
path was broken precisely in the situations it existed for.

Fixed at the source, with the two cases kept apart because they call for different
responses — `TOKEN_EXPIRED` (routine, renew and retry) and `TOKEN_INVALID` (malformed or
wrongly signed, nothing to renew). Neither now leaks `jwt malformed` to a user.

**Verified in a real browser, not just typechecked** — the whole point was a
client/server interaction, so a driver signed in against a live API and:

| Scenario | Result |
|---|---|
| Active use across **two full token lifetimes** (temporarily 90s) | 6 silent rotations, all 200, never signed out, no toast, no console error |
| **Waking with an already-expired token** and a good refresh token | 3 requests 401 → **one** refresh → all three retried and rendered. User sees nothing |
| A token the server refuses, **no refresh token** (the state the MFA bug left) | Signs out, redirects to `/login`, one clear message |

That third row is what the report described, and before this change it reproduced exactly:
stuck on the page, no data, no way back.

### Three client defects found on the way

- **The unrecoverable 401 never logged out.** `refreshAccessToken()` resolves `false`
  *without* signing out when there is simply no refresh token to present — and the
  interceptor's `forceLogout` sat below an `if` that had already returned. Every
  unrecoverable 401 now reaches it, including a retry that 401s a second time.
- **One event, four identical toasts.** A page load fires several requests in parallel and
  an expired token 401s all of them. `forceLogout` is now idempotent, and a request whose
  session has just ended completes silently instead of letting each component also report
  its own failure — a stack of contradictory messages reads like a crash, not a session
  ending.
- **`scheduleExpiry` could recurse.** With a token lifetime shorter than the 60-second
  renewal margin, the delay is negative on every pass — including the one triggered from
  inside a successful refresh — producing a tight loop against `/auth/refresh`. Not
  reachable at 15 minutes; reachable the day someone shortens the token. Now floored, and
  never run synchronously.

### The feature: an actual idle timeout

The product had, by accident, the **inverse** of what it wanted — active users cut off,
and a laptop left open on a customer's invoice signed in forever. `core/idle.service.ts`
separates the two concerns: token lifetime is invisible and renews indefinitely while you
work; **inactivity** is what ends a session, after 15 minutes, with a one-minute warning
first (an unsaved invoice vanishing with no warning is its own bug).

Four decisions worth recording:

- **It polls wall-clock timestamps instead of arming a `setTimeout` for the deadline.** A
  fifteen-minute timer does not survive a laptop suspend; a machine closed at 5pm would
  reopen still signed in. A timestamp comparison sees fifteen *hours* on the next tick.
- **Activity is shared across tabs** via `localStorage`, or the background tab reaches its
  own deadline and signs the account out from under the tab being typed into.
- **Listeners run outside Angular's zone.** `pointermove` inside the zone means change
  detection across the whole app, hundreds of times a minute.
- **Once the countdown is visible, passive movement stops counting.** A nudged cursor is
  not someone at the desk, so only a key, click or tap rescues the session. This was found
  by driving the real page: moving the mouse *towards* "Stay signed in" is a `pointermove`,
  so counting it tore the dialog away mid-click — and the mouse-up landed on whatever was
  underneath it.

**Verified in the browser** with the limits temporarily shortened: 36 seconds of continuous
activity against a 20-second limit never warned; going idle warned on schedule, signed out,
redirected, and cleared the token; a bare mousemove did not rescue it; "Stay signed in"
did. **307 backend tests pass** (a new one pins the status code — that regression must not
return), clean `eslint` on both packages, clean production build.

---

## Tier 1 — architectural, and blocking other things

### 1. Refresh tokens + a session registry (#50, #51) — ✅ **DONE (2026-08-03)**

**Why it was deferred:** this changes session semantics for every user at once, and
`sessionVersion` is a counter, not a registry — there is nowhere to record "this device,
last seen here", so a device list cannot be built on it. `JWT_REFRESH_SECRET` had been in
`env.js` since the beginning and was still read by nothing.

**What shipped:** a `Session` model (`{userId, orgId, family, refreshTokenHash, userAgent,
ip, lastSeenAt, expiresAt, revokedAt, revokedReason, replacedBy}`). A 15-minute access
token plus a 30-day rotating refresh token; `POST /auth/refresh` swaps one for the next and
**detects reuse** — a replayed token revokes the whole family *and* bumps `sessionVersion`.
`sessionVersion` is kept as the "revoke everything" lever, and every place that bumps it now
revokes refresh tokens too. `GET`/`DELETE /auth/sessions` give the user their own device
list. Frontend: silent refresh ~60s before expiry, and the interceptor retries a 401'd
request once through it instead of bouncing to `/login`.

**The predicted trap was real:** two callers refreshing at once. Fixed with a single-flight
`shareReplay(1)` guard — without it the second caller presents a token the first already
rotated away, which the reuse detector correctly reads as theft and revokes the whole
family over nothing. Also: **impersonation tokens decline the refresh entirely** (they are
minted by a separate path with no session row, so the only refresh token in storage is the
*operator's* — refreshing would silently swap the tab back to their identity while the UI
still rendered the tenant).

### 2. Memberships + org-switcher (#53, #54) — ✅ **DONE (2026-08-03)**

**Why it was deferred:** `User.email` is globally unique, so one person genuinely could not
belong to two organisations. Fixing it changes the identity model every other feature sits
on, and requires migrating every existing account.

**What shipped:** `Membership {userId, orgId, role, status}`, unique on `{userId, orgId}`.
`User` keeps identity (name, password, MFA, session state); role and status moved to the
membership. `protect` resolves `req.orgId` **and** overrides `req.user.role` from the
membership named by the token's `orgId` claim, re-checked every request.
`POST /auth/switch-org` re-issues a session for another membership; the switcher is in the
topbar user dropdown. Migration 006 backfills one membership per existing user from their
old `orgId`+`role`.

**What made it tractable:** the fan-out went almost entirely through `req.orgId` and
`tenantFilter(req)` already, so **20+ controllers needed zero changes**. Only code reading
`user.orgId`/`User.role` off a fetched document had to move — auth, the four
superadmin tenant-user routes, impersonation's target resolution, seat counting, the team
export, and the org-delete cascade.

**Watch for, if extending this:** the flat `/superadmin/users/:id/...` routes are now
ambiguous (one identity, several orgs) and take an explicit `targetOrgId` — **not** `orgId`,
because `server.js` strips a literal `orgId` from every request body unconditionally as a
cross-tenant-injection guard. Any future endpoint that legitimately names a different org in
its body needs the same workaround, or the value vanishes before validation sees it.

### 3. Object storage for images (#45's other half) — ✅ **DONE (2026-08-03)**

**Why it was deferred:** needs S3/R2 credentials this deployment does not have.

**What shipped:** `storageService` with `inline` | `local` | `s3` drivers behind the
existing `/assets/...` seam, the content-addressed URL contract unchanged, plus a
`sharp` resize step. **The default is `inline`, not `local`** — the original plan said
local-disk-then-S3, but this API runs on Render's ephemeral filesystem, where that
default would silently lose every uploaded logo on redeploy. Inline base64 is inelegant;
it is not lossy. `assertSecureConfig` errors on `s3` without credentials and warns loudly
on `local` in production, naming the consequence.

**The resize is the part that pays off immediately**, and it runs on every upload
regardless of driver — a 4MB phone photo becomes a few tens of KB *inside the document*
even with no bucket. Migration 007 moves existing bytes out and resizes them on the way,
and is a documented no-op when no store is configured.

**Still open here:** the S3 driver has never run against a live bucket. Set the env vars,
run `npm run migrate`, and confirm `/superadmin/system/health` shows `storage.driver: s3`.

## Tier 2 — features customers ask for

### 4. Quotations → invoice (2.2 #11), proforma (#12), delivery challans (#13) — ✅ **DONE (2026-08-03)**

**Why it was deferred:** each is a new document type with its own number series and
lifecycle.

**What shipped:** one `SalesDocument` model with a `kind` discriminator, not three
models — the plan suggested "one model per type", but structurally they are identical
(buyer, priced lines, GST totals, a lifecycle ending in an invoice) and differ only in
legal meaning and a little metadata. Three models would have meant three controllers and
three places to forget when the tax engine changes. `invoiceNumberService` did not need
generalising into a new service either: `nextDocumentNumber` was already series-driven, so
three entries in its `SERIES` table were enough — `QT-`, `PI-`, `DC-`, each with its own
FY-reset counter so a quotation can never consume an invoice number.

Lifecycle is `draft → sent → accepted|rejected|expired → converted`, `convertToInvoice`
links both ways, and `renderInvoicePdf` is reused with `invoiceTitleLabel` per kind — the
renderer was indeed document-agnostic, as predicted.

**The invariant the whole thing is built around: none of these is a tax invoice.** So
they never reach a GST return, carry no settlement state, and move no stock. Each has a
test:

- **Not in GSTR-1.** A quotation there would declare turnover never supplied; a proforma
  would double-count the eventual invoice.
- **A delivery challan moves no stock.** It is the one that arguably could — goods
  physically leave — but ownership does not transfer, and a return of unsold approval
  goods would need a compensating movement nobody records. Stock moves when the *invoice*
  is raised, which is when ownership actually changes.
- **Conversion happens exactly once.** The document is *claimed* with a conditional
  update (`status: { $ne: 'converted' }`) before any invoice is created, so five
  concurrent requests produce one invoice and four 409s. Two clicks producing two real
  tax invoices for one order would not be undoable — only reversible by credit note.
- **Conversion consumes the invoice quota**, which is the hole Duplicate had (#17). A
  refused conversion releases its claim, so a tenant at their limit is not left with a
  document permanently locked as converted with nothing to show for it.

Expiry follows the overdue-invoice precedent (#43): **derived at read time** so a
quotation that lapsed at midnight reads as expired immediately, with an hourly sweep only
so the stored status eventually agrees. An accepted or rejected quotation is never
relabelled as expired — it has been *decided*, and the conversion-rate figure is computed
from exactly those two.

**The aggregation-cast trap recurred for the third time.** `tenantFilter` returns `orgId`
as a string; Mongoose casts it for `find` but not inside a pipeline, so the pipeline
matched nothing and the pipeline-value summary silently read as "this tenant has no
quotations" — a wrong answer that looks like a correct one. Same class as the ITC register
(Phase 5) and `stockService.recomputeBalance` (Phase 6a). Cast explicitly in every
`$match`.

**Also fixed:** a pre-existing flaky test (`a tenant can read its own audit trail`) that
polled until the audit page was non-empty and then asserted on a *specific* entry —
registration writes entries first, so it passed on an idle machine and failed under the
heavier parallel load this work added. It now polls for the entry it actually asserts on.

### 5. Recurring invoices (2.2 #14) — ✅ **DONE (2026-08-03)**

**What shipped:** `RecurringInvoice` (template + schedule) and `RecurringInvoiceRun`
(one row per attempted period), a pure `recurrenceService` for the date arithmetic, a
`recurringInvoiceService` sweep wired into `maintenanceService`'s hourly job, a full CRUD
surface at `/api/v1/recurring-invoices`, and a page at `/recurring`.

**The plan was right that the dedup discipline is the real work**, and it needed to be
stronger than `ReminderLog`'s: a duplicate reminder is an annoyance, a duplicate tax
invoice has to be undone with a credit note. So `{recurringId, periodKey}` is a **hard
unique index**, and the claim row is inserted *before* the invoice is created — two
instances race on that insert rather than on invoice creation, and losing is the normal
expected outcome, not an error. `periodKey` comes from the **scheduled** date, never from
"now", at the granularity of the frequency (`2026-08` monthly, `2026-W32` weekly), which
is what makes a late or repeated sweep compute the same key. Four tests cover it: two
sweeps, four concurrent sweeps, "run now" then a sweep, and a corrected date landing back
in the same period — every one produces exactly one invoice.

**Decisions worth knowing, each of which could reasonably have gone the other way:**

- **Catch-up is one period per sweep**, advancing `nextRunAt` by exactly one period rather
  than jumping to "now plus one". A week of downtime on a daily schedule therefore catches
  up over seven hourly sweeps, each invoice dated to its own period. Jumping forward would
  silently skip six invoices, and a tenant would only find out by reconciling revenue.
- **A schedule more than 60 periods behind pauses itself** instead of catching up. That is
  not a backlog anyone wants invoiced — it is an imported start date or a clock problem —
  and it is a deliberate refusal rather than a silent skip forward, because skipping
  forward discards periods a tenant may genuinely have wanted.
- **The plan's invoice quota is enforced in the sweep.** A background job that ignored it
  would be a way to exceed a capped plan without touching the UI, which is exactly the
  hole Duplicate had (#17). A quota failure records itself and retries; after five
  consecutive failures the schedule pauses with the reason kept, because a quota resets
  monthly but failing forever needs a human.
- **`autoSend` defaults off, and is refused outright on a draft-generating schedule.** An
  invoice sent unreviewed cannot be taken back, and the first time a template has a wrong
  rate the tenant should learn it from us, not from their customer. `generateAsDraft`
  takes no invoice number and moves no stock, which makes it the safe way to adopt the
  feature at all.
- **Resuming a paused schedule rebases forward.** A schedule paused for three months would
  otherwise resume three periods behind and start generating back-dated invoices, which is
  the opposite of what "resume" means.
- **Month-end is clamped, with an anchor day.** 31 Jan + 1 month is 28 Feb, and the *next*
  step returns to 31 Mar rather than sticking at the 28th — otherwise a month-end retainer
  silently walks itself three days earlier every February.

**A vacuous test was found and fixed while doing this.** The GST-boundary test added with
the sales documents (#4) asserted on `report.b2b`, but the real shape is
`report.sections.b2b` — so `(report.b2b || []).length === 0` was passing whatever the
return contained. Both that test and the new one now assert against `report.sections.*`
*and* prove the positive case (a converted/generated invoice **does** appear), so the test
can no longer pass by the return simply being broken.

### 6. Payment links and the hosted pay page (2.3 #21, #23) — ✅ **DONE (2026-08-03)**

**Why it was deferred:** Razorpay was wired only for *our* subscriptions, never for
tenant → customer collection. That needs per-tenant gateway credentials, which is a
commercial decision as much as a technical one.

**The commercial decision, made explicitly:** **per-tenant keys**, not Razorpay Route.
Funds go straight from the customer to the tenant's own merchant account and never touch
a platform account — which is both simpler and avoids us becoming a payment aggregator, a
regulated activity in India. Route is the better *experience* (one onboarding, we could
take a cut) and a far larger commitment: it makes us the merchant of record with its own
compliance burden. The seam is a `provider` field, so Route can be added later without
touching the link flow.

**What shipped:** `PaymentLink`, a `tenantGatewayService` (kept deliberately separate from
the platform's `razorpayService` — different secrets, different party, and sharing one
module means one bug can charge the wrong one), a `paymentLinkService` that owns creation
and settlement, an unauthenticated `/api/v1/pay/:token` trio, a tenant webhook at
`/webhooks/tenant-gateway`, and a hosted pay page at `/pay/:token`.

The plan said to copy `utils/totp.js`'s AES-256-GCM helper. It was **extracted** into
`utils/secretBox.js` instead, with a `namespace` parameter — the `'mfa'` namespace
reproduces the original key derivation *exactly*, verified by a test that decrypts a value
encrypted by the old inline code, because changing it would have invalidated every
enrolled authenticator on the next deploy. The namespace also domain-separates the keys,
so an exposed gateway credential cannot decrypt an MFA secret.

**The four things this feature had to get right, each with a test:**

- **Signature verification.** Without it, anyone who can POST to the confirm endpoint can
  mark any invoice paid. Verified with a real HMAC against a known key, and a valid
  signature for a *different* order is refused (`ORDER_MISMATCH`) so one cannot be
  replayed against another invoice.
- **Idempotent settlement.** The browser callback and the webhook both report the same
  charge and they race. `providerPaymentId` is uniquely indexed and claimed *before* the
  `Payment` row is written, so three concurrent settlements record money once.
- **The amount never comes from the payer.** There is no field for it. It is read from
  `invoice.balanceDue` when the order is created, re-checked against what the gateway says
  it captured, and capped at the balance — an over-capture cannot inflate collections.
- **The public allowlist.** `/pay/:token` is the only place in the product an anonymous
  caller reaches tenant data, so `publicView` is a hand-built allowlist rather than a
  filtered document: the risk is not what was removed today but what a field added next
  month would silently expose. A test asserts a second customer's name is unreachable.

**Also deliberate:** a link expires (a link that works forever is a standing charge
against card details long after the invoice was settled some other way); a suspended
tenant cannot keep collecting through a link issued before the suspension; an invoice paid
by bank transfer while the page was open *reconciles* rather than charging; and the
gateway's own instrument (`upi`, `card`) is recorded without validating it against the
tenant's `paymentMethod` masters — that validation exists to stop a user typing free text,
and rejecting a real payment because "upi" is not in a dropdown would lose money that has
already moved.

**Not verified:** the actual network calls to Razorpay. There are no credentials in this
environment, and a mocked gateway would only prove the mock works. Everything this
codebase owns — signature maths, idempotency, the allowlist, the settlement path — is
tested. Before going live: connect a real test-mode key pair, make one payment end to end,
and confirm the webhook arrives (Razorpay's dashboard shows delivery attempts).

### 7. Inventory depth (2.5 #40-#44) - **MOSTLY DONE (2026-08-07)**

**Done: valuation (#41), batch and expiry (#42), barcodes (#44), and the UI for all of
it. Warehouses (#42) came last, deliberately - see 7a.**

The plan said valuation would be "a pass over `StockMovement` once `unitCost` is added to
the row". That was wrong in a way worth recording: `StockMovement` is **append-only** by
design - a ledger that can be edited is a second opinion - and depleting a cost layer is
an update by definition. Costs live in a separate `StockLayer` collection, which also
turned out to be what batch and expiry needed, since a batch is a property of a
consignment rather than of a product.

**One mechanism, both methods.** A layer is one receipt at one cost. FIFO consumes the
oldest; weighted average merges receipts into a single blended layer so consumption takes
from that one. Both are permitted under AS-2 and Ind AS 2; LIFO is not, which is why it is
not offered. Per-tenant setting, because consistency of method is an accounting
requirement rather than a preference.

**The decision that carries the most weight:** an outbound movement records *exactly which
layers it drew on and how much of each*. Without it, reversal has only two options -
invent a layer at today's cost, silently rewriting the profit of a period that may already
have been reported, or guess. Both produce a valuation that looks entirely reasonable and
is wrong. With it, a cancelled invoice returns goods to the layers they left at the cost
they left at, and a partial credit note restores its share proportionally.

**Tax is excluded from cost.** GST on a purchase is an input tax credit, not part of what
the goods cost; capitalising it would overstate inventory by the tax rate and overstate
cost of goods sold by the same amount when it sells. The netting-down goes through
`gstService.calculateLine` - the same function the bill's own totals use - rather than a
second implementation that would drift and leave the inventory value disagreeing with the
bill it came from by a few percent.

**Three latent bugs surfaced on the way**, all the same species as the one the ledger was
originally built to fix - a field that looked maintained and was not:

| Found | Why it mattered |
|---|---|
| Deleting a purchase left its goods on the shelf **forever** | `purchase-reversed` had been in the reason enum since the ledger was written and was never once emitted. Every deleted bill inflated the balance permanently, with nothing in the ledger to explain it. Only the unsold remainder comes back now; anything already invoiced is named in the response rather than quietly under-reversed |
| The repair path **destroyed data** | Opening stock arrived as a bare `stockQty` with no ledger row, so "rebuild from the ledger" threw it away - every item with an opening balance came back short by its whole starting quantity. A test asserted the wrong answer. Opening stock is a costed movement now, and editing `stockQty` afterwards is refused with a pointer to the adjustment endpoint |
| A positive manual adjustment created **free units** | They would have sold at a cost of zero, reporting as pure profit, and the item's quantity and value would have drifted apart for good |

**Barcodes** are unique per tenant via a partial index (present, non-empty, not deleted) -
and refused explicitly in the controller as well, because Mongoose builds indexes in the
background and `autoIndex` is off in production, so the constraint does not exist when it
is most needed. That is the same lesson the purchase duplicate-bill guard learned, and it
was re-learned here the hard way: the first version relied on the index alone and a test
caught a duplicate being accepted. Scanner support needs no camera and no library - a
hardware scanner types the code and presses Enter.

**The UI, which is the half that made any of it real.** The stock ledger, the low-stock
report and the adjustment endpoint had all been built, tested and wired into `ApiService`
in an earlier phase - and **not one component called them**. The entire inventory feature
was server-side only. New `/inventory` page with four tabs, because they answer four
different questions someone actually arrives with: what is my stock worth and does it
reconcile; why is this number what it is; what do I need to reorder; what am I about to
lose. The catalogue stays on `/items`.

**Verified in a real browser** against a live API with seeded data, not just typechecked:
FIFO showing a 150-unit sale at Rs 47,000 / Rs 313.33 each (100 at Rs 300 plus 50 at
Rs 340), the ledger naming every movement with its reason and actor, the expiry tab
showing the short-dated batch and hiding the long-dated one, cost layers, barcode scan and
its not-found path, a posted adjustment, and - the regression that mattered - the items
page still saving now that `stockQty` is no longer accepted on update. **323 backend tests
pass**, clean lint on both packages, clean production build.

**Migration 008** seeds opening layers from the newest matching purchase line, then the
catalogue price, then zero - and *names* the items it could not cost rather than hiding
them. Verified end to end including an idempotent re-run.

### 7a. Warehouses (2.5 #42) - **DONE (2026-08-09)**

**Built last, and the reasoning held all the way through:** locations turn every balance
question from "per item" into "per item per location", and give every cost layer and every
ledger row another dimension. Building them before valuation would have meant designing the
layer model twice. The seam the plan predicted was exactly right - `StockLayer` and
`StockMovement` each take a `locationId`, consumption filters on it, and a transfer is a
paired movement out and in.

**The feature is one filter.** Consumption scoped to a location is what warehouses *are*.
Without it, an invoice raised against the Mumbai godown draws down Delhi's oldest layer and
reports Delhi's cost - the books balance in total while both locations' physical counts
drift from the system, and nothing anywhere says so. It is the kind of wrong that survives
every check anyone thinks to run, because every total is still right.

**A transfer must not change what the inventory is worth**, and that is the part with a
trap in it. Nothing was bought or sold and no profit has moved - the goods are simply
somewhere else. The naive implementation takes stock out here and receives it there at
today's cost, so a business could change its reported profit by driving a van between its
own godowns. The cost travels with the goods instead: the outbound half consumes real
layers and reports exactly what it drew, and the inbound half recreates those layers at
exactly those costs.

**And `receivedAt` is carried across, which is the subtler half of the same problem.**
Stamping the arriving layers with today's date puts them at the back of the destination's
FIFO queue. Transfer stock out and back and the oldest goods in the business have become
the newest - the next sale reports the wrong cost of goods sold, and first-expiry-first-out
silently reverses for anyone relying on it. There is a test that does exactly that round
trip.

Decisions that each close one specific way of getting this wrong:

- **A migration gives every existing tenant one warehouse holding everything**, and
  registration gives every new one the same. This is what makes the change safe rather than
  risky, and it is the trick migration 006 used for memberships. Without it the first sale
  after deploying would find no layers, report a cost of goods sold of zero and drive stock
  negative against a location that owns nothing.
- **A transfer is refused rather than short-drawn**, unlike a sale. Selling goods before the
  purchase bill is entered is the most common thing that happens in a real shop; moving
  goods you do not have is not a thing that happens at all, and allowing it would create
  value out of nothing at the destination. A multi-line transfer checks everything before
  moving anything, so it happens or it does not.
- **The weighted-average blend is per location.** Two warehouses that bought the same goods
  at different prices hold genuinely different value, and merging them makes each one's
  valuation wrong in opposite directions while the total stays right.
- **`transfer-out` and `transfer-in` are their own ledger reasons**, not a pair of
  adjustments. Nothing was wrong and nothing changed in total, and filing it as an
  adjustment would make every transfer look like a stock discrepancy in the one report
  people read to find stock discrepancies. Each row names the other end.
- **A warehouse holding stock cannot be archived**, and the default never can. Otherwise the
  goods become unreachable: nothing can be sold or transferred out of an archived location,
  so the quantity stays on the books, keeps counting towards the valuation, and cannot be
  touched.
- **The invoice stores which warehouse it shipped from**, so a cancellation or a credit note
  months later returns the goods there rather than to whatever the default has become.

**The boundary, stated rather than fudged: a warehouse is a place within one GST
registration, not a branch.** Storing goods in another state needs a separate registration
there, and moving stock to it is a supply between distinct persons - a tax invoice, an entry
in GSTR-1, and IGST. Treating that as an internal transfer would understate output tax,
which surfaces as a demand years later rather than as an error today. That is the
multi-GSTIN work deferred in 2.1 #9, so a location in another state is **refused with an
explanation** rather than accepted and mis-taxed.

**A regression I introduced and then had to undo.** Resolving the warehouse before applying
a document's stock put a *throwing* call one line above the `.catch()` blocks that exist so
a ledger problem can never invalidate a tax document already issued - so a bad `locationId`
would have returned a 500 for an invoice that had already been created and numbered. There
are now two resolvers: the throwing one runs **before** a document exists, where refusing is
right, and a non-throwing one runs after, where it never is.

**Two more things fixed because the ledger and the browser each caught one.** The transfer
originally wrote one row and patched the back-link into the other - which the ledger's own
append-only guard refused, correctly, and which would have failed every transfer. Both ids
are now minted up front so neither posted row is ever mutated. And the new form's inputs
had labels that were not programmatically associated with them, found by trying to drive
them; they carry `for`/`id` now.

### 8. P&L and expense reporting (2.4 #32) - **DONE (2026-08-07)**

**The plan's premise was wrong.** It said "purchases exist now, so this is finally
computable". Purchases were never the missing piece — **cost of goods sold** was, and that
did not exist until cost layers shipped in #7. The obvious implementation, "revenue from
invoices minus costs from purchases", is not merely imprecise; it is wrong in a way that
looks entirely reasonable until someone acts on it.

**Buying stock is not an expense.** It converts cash into goods on a shelf. Nothing has
been consumed and no profit has moved. The cost becomes an expense when the goods *sell*,
matched against the revenue they earned. Count the purchase instead and two errors partly
hide each other: a month spent stocking up shows a loss the business did not make, and the
month it sells that stock shows a profit far larger than it earned. Count *both* the
purchase and the cost of goods sold, and every inventory item is charged twice.

So there are two cost sources and nothing appears in both. COGS comes from the stock
ledger — what actually left the shelf, at what the layers say it cost. Operating expenses
are costs that never became stock. **And the split is not a judgement the user has to
make**: a purchase line either created a cost layer or it did not, and layers record which
purchase they came from, so the inventory portion of every bill is a fact already on file.
A single bill covering rods and the freight to deliver them is split automatically.

**A second cost document, because `Purchase` cannot hold most spending.** It requires a
vendor and a bill number, uniquely indexed so the same input tax credit cannot be claimed
twice — correct for what it models, and it makes salaries impossible to record. Salaries
are the largest expense most businesses have, and a profit figure that omits them is wrong
in the flattering direction. The rule dividing the two is one line: **a `Purchase` may
carry input tax credit; an `Expense` never does.** That keeps the GST returns reading from
one place and means `Expense` needs no tax fields at all.

**What is excluded, and shown to be excluded, on the report itself:**

| Excluded | Why |
|---|---|
| Purchases that became stock | Not consumed yet. Appears later as COGS |
| Capital goods | An asset used for years. The expense is depreciation, which needs an asset register this product does not have — so it is left out *and said to be*, rather than silently either way |
| GST charged to customers | Collected on the government's behalf and owed to it. Never revenue |
| Money not yet received | Accrual: an invoice is revenue when issued. Receivables answers the cash question |

Input tax that *cannot* be claimed goes the other way — section 17(5) blocked items are
money genuinely gone, so they get their own expense line rather than being quietly dropped.
Credit notes reduce revenue, which **no other invoice-side report does**: the GST summary
deliberately does not net them because a return reports them in their own table, but a P&L
that ignores them overstates revenue by every discount and return ever given.

**Two bugs found by driving the real page:**

- **A dropdown with nothing in it.** `assertValidMaster` is deliberately permissive when a
  master list is empty, so the API accepts any category — but the UI offered a `<select>`
  with no options and the form simply could not be submitted, with nothing on screen
  saying why. It now falls back to free text, matching the server's actual contract rather
  than being stricter than the API. Same species as the "Not available yet" MFA dead end.
- **Machine codes rendered as labels.** `listMasterValues` returns `code || label` — fine
  where they are the same word ("Nos", "UPI"), wrong for expense categories, which
  deliberately have short codes and readable names. The dropdown offered `bank-charges`,
  and a statement grew `salaries` beside `Salaries & wages` as two lines for the same
  thing. New `listMasterOptions` returns `{value, label}` pairs; the statement resolves
  codes back to names.

**Migration 009** seeds fifteen standard Indian SMB expense heads, salaries first. Without
it the permissive-when-empty rule would let a tenant's own accounts grow "Rent", "rent" and
"Office Rent" within a month. Idempotent, and an operator's decision to reorder or
deactivate a category survives a re-run — verified.

**337 backend tests pass**, including one for each way the double-count could creep back
in. Verified in a real browser end to end: the statement, the excluded-items explanation,
recording an expense and watching the profit figure move.

**Still missing, stated rather than buried:** depreciation (needs an asset register), and
a purchase-side debit note — there is no mirror of `CreditNote` for goods returned to a
supplier, so those cannot be netted off costs.

## Tier 3 — platform and billing (Part 3.3, 3.5, 3.4)

### 9. Plan versioning - **DONE (2026-08-07)**

**The problem was bigger than the plan described.** It said `upsertPlan` "silently reprices
every existing subscriber". True, and not the half of it: **no price was stored anywhere**.
`Subscription` held only `planCode`, so every price, limit and revenue figure was resolved
by joining to the live `Plan` row at read time. Editing that row therefore reached
*backwards*:

| Editing a price also changed | Why that matters |
|---|---|
| The amount shown against charges **already taken** | A customer's own billing history stopped matching their bank statement. That is not a rounding problem; it is the product telling them something false about money |
| **Historical MRR and ARPA** | Recomputed as today's price times the subscriber count, for every past month. A revenue chart that changes shape when somebody edits a price is not a revenue chart |
| Every existing subscriber's **quota** | Lowering `invoiceLimit` from 200 to 100 put them over mid-month, and the first they heard was an invoice being refused |

Three parts. An immutable `PlanVersion` row written **before** the live row changes, so
nothing is lost — previously the audit entry logged only the plan's *name*, so not even the
previous price was recoverable. A snapshot of prices and limits copied onto the
subscription at signup, which is what makes past figures stable. And resolution that
prefers the snapshot, falling back to the live plan where there is none.

**That fallback is what makes it safe to deploy.** Every subscription created before this
has no snapshot, resolves to the live plan, and behaves exactly as it did. The change is
inert until a plan is next edited.

**Grandfathering is the default, and repricing is a deliberate opt-in**, because the two
mistakes are not symmetrical: a price rise that quietly reaches existing customers costs
their trust and cannot be taken back, while forgetting to reprice is visible and fixable.
The console reports how many people each choice affected — it used to say only "Growth plan
saved", which is true and useless when the operator cannot tell whether they just repriced
two hundred customers or none.

**Design decisions worth recording:**

- **No `effectiveTo` on a version.** It is exactly derivable — a version ends when the next
  begins — and storing it would mean *updating* a row the file calls immutable. A snapshot
  with a mutable field is not a snapshot, and the guard would have needed an exception the
  next change would widen.
- **Reordering is not a price change.** `sortOrder` and `active` are how a plan is
  presented, not what it costs; versioning a drag-to-reorder would bury the changes that
  matter among rows that say nothing.
- **A no-op save mints nothing.** The console's save button makes an unchanged save
  trivially easy, and a history of identical rows answers no question.
- **Nullish, not truthy, throughout.** A free plan's price is `0`, and `||` would fall
  through to the live plan's price for every one of them.

**The honest limit, stated in the code and in the console:** this governs what the product
**displays, enforces and reports** — not what the gateway collects. `razorpayService` passes
`plan_id: planCode` and the real amount lives in a Razorpay plan object this codebase never
reads or writes, so an existing mandate keeps charging what Razorpay was told when it was
created. `PlanVersion.versionedProviderPlanId` is the seam for closing that; doing it means
creating a Razorpay plan per version and migrating mandates, which is a provider-side
project.

**Migration 010** creates version 1 of every plan and pins every live subscription to it —
trials and pending checkouts included, since they will become paying customers on the terms
they were shown. Cancelled subscriptions are left alone, and subscriptions whose plan no
longer exists are **counted, not invented**: there is no honest way for a migration to
decide what they should be charged. Verified end to end including an idempotent re-run.

**346 backend tests pass**, including the one the codebase never had: that a price survives
a plan edit.

### 10. Dunning, platform GST invoices, coupons and proration - **ALL DONE (2026-08-09)**

Shipped in three passes, in that order, and the order was the point: a failed payment
nobody chases is silent revenue loss happening *now*; a customer billed with no tax
invoice is a compliance failure on our side; coupons are a growth lever. Each section
below is what actually shipped.

#### Dunning

`failedPaymentCount` has been incremented by the Razorpay webhook since billing shipped
and **nothing has ever read it**. A customer whose card expires stops paying, keeps full
access, and is never told. The revenue leaks silently.

**Escalation is measured in days late, not in failed attempts.** Three failures could be
three gateway retries in an hour or three months apart, and "we tried your card three
times" is not a thing to say to a customer — "your payment has been failing for a week"
is. So a new `pastDueSince` is stamped once, on the first failure, and never moved by a
later one: re-stamping on every retry would leave an account failing daily sitting
permanently at "one day overdue", never escalating at all.

Four steps at days 1, 3, 7 and 14, then read-only at 21. The messages lead with what
happened and what to do, because the overwhelmingly common cause is an expired card that
takes two minutes to fix.

**The rule that shapes the rest: never suspend an account whose owner was never actually
told.** Email suppression is silent by design — one bounce and every later send to that
address is a no-op — so an account can pass through the entire sequence with nobody having
received a word of it. Suspending them then punishes somebody for a message they did not
get. The final step is gated on `dunningDelivered`, and accounts that reach the deadline
with nothing delivered are **named for a human to chase** rather than cut off. That is
deliberately the expensive choice: it leaves unpaid accounts running, and it is still
right.

A useful consequence falls out of it: a deployment with **no mail provider configured never
auto-suspends anyone**, because no send ever counts as delivered.

**Two bugs fixed on the way:**

- **A successful charge silently un-suspended accounts suspended for other reasons.** The
  webhook set `org.status = 'active'` unconditionally, so a tenant suspended for fraud,
  abuse or a legal hold who then paid an invoice was reinstated — undoing a human decision
  that money was never the point of. A new `suspendedForNonPayment` marker means only the
  mechanism that applied a suspension can lift it.
- **Suspension logic lived inside an HTTP controller**, reachable only with a `req.user`.
  Extracted to `tenantStatusService` so the sweep suspends exactly the way an operator
  does. The alternative — a second implementation in the job — is how you get an automatic
  suspension that forgets to cut live sessions and a tenant who keeps writing for another
  fifteen minutes.

Recovery resets the whole dunning state including the stage, so a customer who lapses again
in six months gets the gentle first notice rather than the final warning they last saw.
Starting a returning customer at "final notice" is how a recovered account becomes a lost
one. Registered in the job registry (#11), so a dunning sweep that stops running is
visible — the most expensive kind of silent failure there is.

**370 backend tests pass.**

#### Investigation notes kept from before the platform invoices shipped

They are why it is a separate model:
  - **There is no platform `Organisation`.** Superadmins have `orgId: null` by design.
    Creating a synthetic one pollutes tenant counts, MRR, ARPA and the at-risk lists,
    every one of which counts `Organisation` documents.
  - **Invoice numbering counters are fields on an `Organisation`** (`invoiceSequence`,
    `invoiceSequenceFY`), so a platform series has no home.
  - **`Payment.invoiceId` is required**, so settlement cannot be recorded without a real
    `Invoice` row.
  - **Nothing identifies the platform as a supplier** — no GSTIN, PAN, address or state
    code anywhere. `GlobalSetting` has an allow-list of keys and would need a new one.
  A separate `PlatformInvoice` model reusing `gstService.calculateInvoiceTotals` — which is
  pure and takes the supplier's state code as an argument — is the honest shape. The tax
  engine is genuinely reusable; the document model is not.

#### The platform's own tax invoices - DONE (2026-08-07)

**This system billed its customers and issued them nothing.** Razorpay took the money,
`Subscription` recorded that it had, and the customer received no document to claim input
tax credit against. A compliance failure on our side and unclaimable money on theirs.

Built as `PlatformInvoice`, for the reasons above — and one more found while building it:
`tenantFilter(req)` scopes every invoice read by `orgId`, so a platform invoice living in
`Invoice` would either be invisible or would surface in a tenant's own invoice list, GST
returns and revenue reports **as something they sold**. Charging a customer ₹999 and having
it appear in their GSTR-1 as their own sale is a filing error we would have created for
them.

Four decisions that decide whether the document is actually usable:

- **The tax head follows the customer's state, not ours.** For a service to a registered
  person the place of supply is the recipient's location, so a Karnataka customer of a
  Maharashtra platform gets IGST and a Maharashtra customer gets CGST + SGST. Backwards, and
  the customer cannot claim the credit because the head on our invoice will not match what
  their return expects.
- **The price is inclusive of GST**, because it is: the plan page shows ₹999 and Razorpay
  charges ₹999. Treating it as exclusive would invoice ₹1,179 and disagree with the
  customer's card statement by exactly the tax — the one number they will check.
- **The amount comes from the subscription's snapshot** (#9), so a grandfathered customer is
  invoiced what they agreed to rather than today's published price.
- **An incomplete billing identity blocks the invoice, not the payment.** This runs from the
  payment webhook, and throwing there would make Razorpay retry a charge that already
  succeeded — turning a configuration gap into a payment problem. The console reports the
  gap instead.

**A real bug, found by a test doing exactly what the console does.** The invoice counter
started on the `platformBilling` setting beside the GSTIN and address. The console saves a
setting by replacing `value` wholesale — so **saving the billing identity from a form
without the counter reset it to zero**, and the next invoice reused a number already sent to
a customer. A duplicate in a legally-consecutive tax invoice series has to be explained to
an assessing officer. The counter now lives under its own key that no form writes, and the
unique index on `invoiceNumber` is what surfaced it.

Idempotent on the provider payment id, because Razorpay retries webhooks deliberately and
often, and two tax invoices for one payment is worse than none — both carry consecutive
numbers, and cancelling one leaves a gap.

**Still needed before charging anyone:** set the `platformBilling` setting. Until it has a
legal name, GSTIN, address and state code, no invoice is issued and the console says so.

### 11. Job/queue observability (3.5) - **DONE (2026-08-07)**

**The cheap option was the right one, and the plan was right to say so.** Retries and a
dead-letter queue are real capabilities that would matter *if* jobs were failing in ways a
retry fixes - and nobody could know whether they were, because nothing recorded it. Buying
Redis to solve a problem you cannot yet see is how you end up operating a queue to run five
cron sweeps.

**The failure mode that mattered is silence.** Every sweep was a `setInterval` with a
try/catch that logged and moved on, which left three questions unanswerable: did the
reminder sweep run today, did it fail, and - the one that matters - **has it stopped
running altogether?** A crashed timer, an unhandled rejection that killed the interval, a
deploy that never called the start function: all of them look exactly like "no work to do".

So the health list is built from a **registry of jobs**, not from what has run. A job that
has never run once still appears, as `never` - a history-driven list would omit precisely
the case the feature exists for. The two non-obvious states are the important ones:

| State | Means |
|---|---|
| `never` | Registered and has not run once. The deploy-forgot-to-start case |
| `late` | Last success older than three intervals. Covers "failing repeatedly" and "the timer died" - from outside, the same problem: the work is not getting done |
| `stuck` | A `running` row past its staleness window. `running` is written *before* the work starts, so a killed process leaves one - and a stuck row and a missing row say different things |

**Three decisions worth recording:**

- **Recording a job can never fail the job.** Every write is wrapped so a database blip
  loses the record, not the work. Monitoring that takes down what it monitors converts a
  question you could not answer into an outage you did not have.
- **The wrapper does not re-throw.** Every existing caller already treats a sweep failure as
  something to log and continue from; changing that under the guise of adding observability
  would be a behaviour change in disguise.
- **Each sub-sweep is its own job.** The maintenance tick does five things that fail
  independently, and one "maintenance failed" row answers none of the useful questions.
  This fixed a real bug in passing: the five sub-sweeps shared one `try` block, so a throw
  in the recurring sweep **silently skipped the payment-link expiry and the recycle-bin
  purge for that whole tick**.

Results are **summarised, not stored whole** - counts and small scalars, one level of
nesting flattened so `runRecurringSweep`'s `{recurring: {generated}}` survives. A 30-day
TTL index expires the rows rather than a purge job, avoiding the circularity of needing a
background job to clean up the record of background jobs.

Surfaced on the console's existing **System health** panel rather than a screen of its own:
a job that has quietly stopped is invisible by definition, so the fact has to appear
somewhere people already go. A dedicated page nobody opens is the same as no page.

**357 backend tests pass.** Also fixed a second flaky test of the same species as the one
noted earlier - asserting on a fire-and-forget email-log write without waiting for it,
which passes on an idle machine and fails under load.

**When to revisit:** if the job history starts showing repeated failures of the same job
that a retry would have fixed. That is the evidence BullMQ needs, and it did not exist
before this.

### 12. Two-person approval and break-glass elevation (3.4) - **DONE (2026-08-07)**

**Roles stop the wrong people doing dangerous things. This is for the things that are
dangerous when the *right* person does them.** Deleting a tenant erases a business's entire
records, and the difference between a legitimate deletion and a catastrophic one is a
mis-click on a list of similar-looking names. No role design prevents that, because the
person clicking has exactly the permission required.

**The requester retries; the approver does not execute.** The alternative — the approver's
click carrying out the action — is more convenient and worse. It puts them in the position
of triggering something they did not compose, which is precisely what makes rubber-stamping
easy, and it means replaying a stored request body later against state that may have moved.
Keeping intent and execution with the same person leaves the approver's job as the one
thing they are there for: yes or no.

**202, not 403.** 403 says "you may not", which is wrong — they may, once somebody agrees —
and a client seeing 403 has no reason to show anything but an error. 202 says "recorded,
not yet done", and carries the id to come back with.

**Every refusal in `consumeApproval` closes a specific hole:**

| Refusal | The hole |
|---|---|
| Different path or body hash | Request "delete tenant A", get it approved, use it on tenant B. The approver saw one thing and consented to another |
| Already used | An approval is consent to one action, not a standing licence |
| Expired (1 hour) | Consent was given, but not to today's version of the world |
| Same person | Checked at decision time *and* at use time — this is the entire property, and it should not rest on one line in one place |
| Approver lacks the capability | Otherwise a read-only auditor could authorise a deletion they are specifically not trusted to perform, and the second signature carries no more weight than a bystander's |

A **precondition** runs before anything is recorded, so a request that would fail on its own
merits — a mismatched confirmation name — never reaches a human. An approval queue people
learn to skim is one that has stopped working.

#### Coupons and proration (#10c) - DONE (2026-08-09)

**The plan left one question open and it had to be answered before any of this: credit the
unused remainder, or charge the difference from the next cycle?**

The answer is **neither, uniformly** - because upgrades and downgrades are not symmetrical,
and treating them as one case is where this normally goes wrong.

- **An upgrade takes effect immediately, and the unused remainder is credited.** The
  customer wants the bigger plan *now*; that is why they are upgrading. Making them wait
  until the period ends is refusing money that is being offered. The days they already
  bought are theirs, so charging for those days twice is charging twice.
- **A downgrade takes effect at the end of the period, and no money moves.** They paid
  through that date and they keep what they paid for. Refunding a downgrade also creates an
  obvious loop - upgrade, downgrade, repeat - and no SMB SaaS does it.

Each direction resolves in the customer's favour on the thing they actually care about, and
neither leaves the product holding money it did not earn.

**The live bug found on the way, which was worth more than the feature.** A plan change
created a new provider subscription and **left the old mandate running**. Razorpay charged
both, every month, indefinitely, and nothing in the system knew. Two things made it worse:

- `resolveSubscription` falls back to the newest local subscription when an event carries no
  id, and it included cancelled ones - so a `payment.failed` on the abandoned mandate marked
  the **live** subscription past due and started dunning a customer who had paid.
- Cancelling the old mandate makes Razorpay report that cancellation back, and the ordinary
  handler drops the tenant to `starter` - **the upgrade cancelling itself, seconds after it
  succeeded**. Guarded twice: by `supersededBy`, and by refusing to revoke a plan while a
  newer subscription is active.

The predecessor is retired **when the replacement is paid for**, never at checkout:
cancelling first would leave a customer whose payment then failed with no subscription at
all.

**The gate that decides whether coupons are safe at all.** What the card is charged is set
by a Razorpay plan object this codebase never reads or writes. For plan versioning (#9) that
limit is survivable, because versioning governs what the product *displays and enforces*.
For a coupon it is not: showing "₹499/month with LAUNCH50" while the gateway collects ₹999
is not a display bug, it is **₹500 a month taken from someone who did not agree to it** -
and our own tax invoice would then disagree with their card statement by exactly the
discount, which is the same class of error as pricing tax exclusively when the gateway
charges inclusive.

So a coupon carries a `providerOfferId`, and without one it is **refused at checkout on a
paid plan** - by name, with the fix in the message - rather than accepted and quietly
ignored. Free plans and local development collect nothing, so they apply directly. The
console marks every coupon that is in that state, because an operator who has created six
launch codes and can use none of them should find out there rather than from the first
customer who tries.

**Credits are owed, not applied**, for the same reason and it is worth stating plainly. The
obvious implementation is a balance that reduces the next tax invoice, and it is wrong here:
a credit that reduces our invoice but not the charge produces a document that disagrees with
the customer's bank statement, which is worse than no document. So a credit is recorded,
shown to the customer *and* the operator, and settled by recording **how** - a gateway
refund, a discount on the next renewal, or a deliberate write-off. Slower than automating
it, and honest; the alternative is a promise the code cannot keep. `settlement.reference` is
where the refund id goes once refunds have been run against a real Razorpay account, which
- see `docs/LAUNCH-READINESS.md` - has never happened.

Smaller decisions that each close a specific way of getting it wrong:

- **The discounted price goes into `pricing`**, not the list price with a discount beside it.
  `pricing` is what the billing page, the tax invoice and MRR all read.
- **The redemption cap is claimed atomically**, with the cap in the filter. For a launch code
  posted publicly, simultaneous checkouts are the normal case, not a race worth ignoring.
- **Direction is measured against what this customer pays**, not the list price, so a
  grandfathered customer on ₹499 moving to a ₹999 plan is upgrading even if the plan they are
  leaving now lists at ₹1,499. And it is measured **per month**, so monthly-to-yearly is not
  read as a tenfold upgrade.
- **Proration refuses to guess.** No paid-up period on record means no credit, not an
  invented one - a guessed denominator produces a number that cannot be defended when the
  customer asks how it was worked out. `currentPeriodStart` was added for this; `startDate`
  is not a substitute, because after six charges it is six months before the period the
  customer is actually in.
- **A rate typed into a coupon is clamped, not refused.** A ₹1,000 code on a ₹999 plan makes
  it free. A negative charge is not a discount.
- **A code is retired, never deleted.** "Who used this, and what did we give away" is exactly
  the question asked when a code turns out to have been shared publicly.
- **Scheduled downgrades are a registered job** (#11), because a downgrade that never lands
  leaves a customer on a plan they stopped paying for - silent, and expensive in the opposite
  direction to dunning's failure.

**454 backend tests pass.**

#### Break-glass

**Self-service, deliberately.** The case it serves is the one two-person approval cannot: it
is 3am, a customer is broken, and the person who would approve is asleep. Requiring a second
person defeats the entire purpose.

**What makes that safe is not prevention — it is visibility and expiry.** A grant lasts
minutes (60 max), demands a reason long enough to be reviewable, is itself a loudly audited
event, and **records every request it was used for**, so "you took emergency access, what
did you do with it?" has an answer that does not require cross-referencing timestamps in a
log. The security model is explicitly *after the fact*: an operator who abuses this is
caught, not blocked, which is the right trade when the alternative is an outage nobody can
fix. Written down so nobody later mistakes the absence of a second approver for an
oversight.

**It cannot grant `platform.admin`** — the capability that grants capabilities. Allowing it
would turn a fifteen-minute emergency into a permanent promotion and make every other
control here decoration.

**And it is not a bypass of the second signature.** Elevation clears the *role* check and
leaves the approval requirement standing: an emergency is a reason to let somebody act, not
a reason to remove the second pair of eyes.

**Two bugs found while wiring it:**

- **`approvalId` in the request body changed the body hash**, so the body-carried form of
  the approval could never match and only the header worked. It is metadata *about* the
  authorisation, not part of what is authorised, and is now stripped before hashing.
- **The confirmation-name check ran after the approval gate**, so a mistyped name would
  have been sent to a second operator to approve before being refused.

**387 backend tests pass**, including three existing suites updated to go through the new
flow — a test that deletes a tenant directly is now testing a path that does not exist.

## Tier 4 — engineering hygiene

### 13. Frontend tests (#59's frontend half) - **DONE (2026-08-07)**

**Vitest for logic, one Playwright test for the app, and deliberately nothing in between.**

The plan suggested Karma or Vitest. Vitest, and the reason is what actually needs testing.
Karma runs a real browser, which is right for component tests — and components are not where
this codebase's expensive bugs live. The ones that have cost time are in **pure logic**: a
stale-response guard, a template id map, currency and GSTIN formatting. None of that needs a
browser, and a suite that needs one is a suite slow enough to stop being run.

**18 unit tests**, on the two modules where a fault is invisible and everywhere at once:

- **`ServerList`** — every paginated list in the app runs through it. The stale-response
  guard is the case that works perfectly on a fast connection and fails only for users on a
  slow one: two requests in flight, the older one answers last, and the table shows results
  for a query the user has already moved on from — with no error and no clue. Also covers a
  *late failure* blanking a good page, backing off a page that emptied, and not recursing
  when the last page is legitimately empty.
- **`format`** — `numberToWords` prints on a tax invoice. It is a legal element of an Indian
  invoice, and its edges (the lakh/crore grouping, the teens, paise rounding, a negative on
  a credit note) are exactly where an off-by-one hides for years because nobody re-reads a
  function that worked once on a round number.

**And one end-to-end test, which is where the real failures were.** Every serious frontend
bug this session was a *whole page* failure that a component test structurally cannot see:
a login step that did not exist, a dropdown with no options that could not be submitted, a
dialog that dismissed itself when the mouse moved toward its button, a form that silently
sent a field the server had started refusing. Each component was individually fine; the app
was broken.

So `e2e/smoke.spec.ts` drives the path the business runs on — sign up, add a customer, raise
an invoice, download the PDF — through the UI as a person would, including reaching the PDF
through the row's overflow menu rather than shortcutting to the endpoint. It asserts on the
**money**: 2 × ₹5,000 at 18% is ₹10,000 + ₹1,800 = ₹11,800, computed server-side from two
state codes. Seeing that arithmetic on screen is proof the tax engine — the actual product —
ran end to end. It also fails on any uncaught page error, which is what the white-screen bug
would have tripped.

**Verified by running it**, not by writing it: 14 seconds, green. It found two mistakes in
its own assertions on the way (the invoice list shows totals, not line descriptions; the PDF
lives in an overflow menu) — which is the point of running a test before trusting it.

**One test, not a suite.** A broad end-to-end suite is slow, flaky for reasons unrelated to
the code, and muted within a month — at which point it is worse than nothing, because its
green tick is trusted and means nothing.

**Not wired into `npm run check`** — it needs a running API and database, and a gate that
fails on a laptop with nothing started is a gate people learn to skip. `npm run check` now
runs lint + unit tests + production build; `npm run test:e2e` is the separate command.

### 14. OpenAPI (#63) - **DONE (2026-08-07)**

**Generated from Express's own router stack**, reading the zod schemas off the `validate()`
middleware. There is one definition of a request's shape, the server enforces it, and the
document describes it — they cannot disagree because they are the same object. A
hand-written spec is correct on the day it is written and actively harmful within a week:
an integrator trusts it, builds against a field that no longer exists, and the failure
surfaces in their code rather than ours.

**The half that matters more is what it cannot describe.** Every body-taking route with no
schema is listed by method and path under `x-undocumented`. That is a coverage metric for
request validation nobody has to remember to compute — and unlike a hand-written document,
which is silent about its own gaps, this one names them.

Current state: **180 paths, 46 generated request schemas, 56 endpoints accepting a body
with no schema.** Split by method, because the raw number overstates the problem and an
overstated number gets ignored: 44 are action-style POSTs (`/restore`, `/cancel`) that
legitimately take no body, and **12 are PUT/PATCH routes that almost certainly do** — every
one of them in the superadmin console, including `PUT /superadmin/plans/{code}`, which wrote
whatever arrived straight through. The document found those by existing.

The spec is served at `/api/v1/openapi.json` (public — an API description behind
authentication cannot be read by the person deciding whether to integrate) and **committed**
to `docs/openapi.json`. Committing a generated artefact is deliberate: it makes an API
change visible in a diff. Adding a field to a zod schema shows up in the same commit, and a
route that quietly stops validating its body shows up as a new line in `x-undocumented`. A
spec that exists only at runtime cannot be reviewed.

**Three bugs found by generating it, each one a thing the document would have got wrong:**

- **Every authenticated route was documented as public.** Authentication was inferred from
  `Function.name`, and `protect` is wrapped by `asyncHandler`, so what Express holds is
  anonymous. Now tagged explicitly (`protect.isAuthGuard`) — the worst possible thing for a
  spec to be wrong about, and it was wrong by default.
- **Router-level middleware was invisible.** Almost every router here applies `protect` once
  via `router.use(...)` rather than per route, so a per-route-only reading found no guards at
  all. The walker inherits router-level layers down to the routes beneath them, in
  declaration order — getting that backwards would document unguarded routes as guarded.
- **`/api/v1/invoices/` and `/api/v1/invoices`** appeared as two entries for one endpoint,
  which reads as an API with a duplicate rather than a generator with a rough edge.

**393 backend tests pass.** The tests guard the *generation*, not the content — asserting
that particular endpoints exist would be a hand-written spec with extra steps, which is
exactly what this replaces.

#### And then the gaps it found were closed

Finding twelve unvalidated routes and leaving them would have wasted the finding. All
twelve now carry a schema, and the spec reports **zero** unvalidated PUT/PATCH routes.

The worst of them was `PUT /superadmin/reminders/:id`, which passed `req.body` straight into
`findByIdAndUpdate` — every field on the model writable by any caller who guessed its name.
`PUT /superadmin/plans/:code` was next: it now carries plan-versioning logic, and an
unfiltered body could set `currentVersion` and desynchronise a plan from its own price
history.

`PUT /superadmin/settings/:key` is the one exception, and it is marked rather than fixed or
hidden. Its body shape depends on the *path parameter* — `assertValidSetting` dispatches to
a per-setting schema — and no single zod object can express "the body is whatever this key
says it is". It is tagged `validatedElsewhere` with the reason, so the document says what is
true instead of leaving a permanent entry in the gap list that would train people to ignore
it.

**Two mistakes made writing those schemas, both instructive:**

- The masters endpoint takes a **bare array**; the first schema wrapped it in
  `{ items: [...] }`, which reads better and is not what the client sends.
- The feature-flags schema required booleans — stricter, apparently better, and wrong.
  `sanitiseFlagOverrides` already drops non-booleans *by design*, with a test asserting that
  a request containing junk succeeds with the junk removed, and the console posts the whole
  catalogue back. The strict version would have rejected an ordinary save.

  The general lesson: **a validator added after the fact must describe what the endpoint
  already accepts.** Tightening a contract is a separate change with its own consequences,
  not something to slip in under "add validation".

### 15. E-way bill (2.1 #6) and GSTR-2B reconciliation (2.1 #7) - **DONE (2026-08-07)**

**The plan's premise was half right.** It filed both as "needs a live GSP connection". The
e-way bill does. **GSTR-2B does not** — it is downloadable as JSON from the GST portal by
anyone with the login, which every registered business has. A GSP would remove one manual
download; it is not what stood between that feature and existing. So it shipped whole
rather than as a seam.

#### E-way bill

Behind the same provider boundary as e-invoicing: `callEwbApi` is a stub with a precise
contract, deliberately not faked, because every GSP has its own auth dance and error
envelope and a mock only proves the mock works. Everything *around* it is real, which is
the majority of the work and all of the risk.

**The judgement is where the value is**, and each rule is one a mistake is expensive:

- **The threshold is measured on the value including tax**, not the taxable value. That
  single distinction is what puts a ₹45,000 + GST consignment on the road with no bill —
  and it is exactly the band where it happens most.
- **Services never need one**, decided from the SAC code. The first version checked an
  `isService` flag that **does not exist on invoice line items**, so the rule silently
  never fired and a ₹5,00,000 consulting invoice would have been told to raise a bill for a
  consignment that does not exist. Now read from the HSN: the 99xx chapter is services, and
  a line with no code is treated as goods — the conservative direction, since a spurious
  suggestion costs a moment and a missing bill costs a detained vehicle.
- **Validity is a day per 200 km, minimum one.** A 5 km delivery computes to zero days, and
  a bill valid for no time at all is worse than none.
- **A malformed vehicle number is caught on the screen**, where it costs thirty seconds,
  rather than at a checkpoint. Spaces and dashes are accepted because that is how people
  type them.
- **An unregistered buyer is declared `URP`**, the portal's own placeholder — a blank GSTIN
  is rejected.
- The payload uses **NIC's field names**, not this codebase's. A helpfully-renamed field is
  one nobody can find in the portal's documentation while debugging a rejection.

The intra-state threshold genuinely differs by state, so the default is stated as the
inter-state figure and flagged as such rather than presented as authoritative.

#### GSTR-2B reconciliation

**The most valuable report in the product**, and the reason is money that disappears
quietly: input tax credit is only claimable if the *supplier* actually filed the invoice.
Claim credit on a bill they never reported and it is reversed — with interest, typically a
year later, by which time the money is spent and the supplier has stopped answering.

Four outcomes, and the summary figure is **credit claimed on invoices that are not in 2B**.
Everything else serves computing it accurately:

| Outcome | Meaning |
|---|---|
| Matched | In the books, in 2B, figures agree |
| Mismatched | Both have it, the figures differ — or the portal flags the credit unavailable, which is *not* a match however present the invoice is |
| Missing in 2B | Recorded and claimed, supplier has not filed. **The money at risk** |
| Missing in books | Supplier filed it, we have no record. Unclaimed credit, or a bill issued against our GSTIN we never received |

Details that decide whether the report is usable: invoice numbers are **normalised
aggressively** (`INV-001`, `inv 001` and `INV/001` are one invoice to a human), because a
false mismatch sends someone chasing a supplier over nothing while a false match is caught
immediately by the value comparison. A purchase with **no supplier GSTIN** is reported as
our own gap, not as "the supplier has not filed" — it cannot appear in 2B at all, and
blaming them would send someone to chase a supplier who has done nothing wrong. And the
parser accepts the download in **whichever shape it arrives**, because the portal has
reorganised it more than once and a tenant with last year's export should get their
reconciliation rather than an error about a key they have never heard of.

**410 backend tests pass.**

### 16. Composition scheme and QRMP - **DONE (2026-08-07)**. Multi-GSTIN / branches - **deliberately not started**

**Split, because they are not the same size of problem and one of them is a live
correctness bug.**

#### Composition scheme (2.1 #10) — done

The whole product assumed **regular registration**: that the tenant charges GST, collects
it, and files monthly. For a composition dealer every one of those is wrong, and wrongly in
the dangerous direction. A composition taxable person is **prohibited from collecting tax on
supplies** — so an invoice charging 18% is not a formatting problem, it is tax collected
without authority, and the customer cannot claim it, so it is money taken from them for
nothing.

- **Rates are zeroed in the tax engine**, not at the call site, so no caller can forget. A
  rate typed by mistake is discarded rather than refused: a composition dealer entering 18%
  has made a mistake, and rejecting the invoice would block them from billing over a field
  they should never have been shown.
- **Rule 49's declaration is attached automatically** — "composition taxable person, not
  eligible to collect tax on supplies" — in the same field every other zero-tax reason
  prints from, so every template carries it without one being missed.
- **Inter-state supply is refused before the document exists**, because the consequence is
  not a wrong invoice: it is losing eligibility for the scheme retrospectively, discovered
  at assessment and undoable by editing nothing.
- **CMP-08** is built, and it is a genuinely different return — not GSTR-1 with the tax
  removed. It asks what the turnover was and what is owed at the flat rate, paid from the
  dealer's own margin.

The reverse-charge line in CMP-08 needed care and is the detail most likely to have been got
wrong: a composition dealer pays no tax on their own supplies but **still owes it on inward
supplies under reverse charge**, at the ordinary rate and unclaimable. It cannot be read off
a stored field — on a reverse-charge purchase `totals.cgst` is correctly zero because the
supplier collects nothing, and the amount is normally derived into `itc.*`, but only when
the credit is *eligible*, which a composition dealer's never is. Both stored figures read
zero for exactly the tenant this report exists for, so the liability is recomputed.

**Defaults reproduce the previous behaviour exactly**, so nothing changed for existing
tenants — asserted by a test.

#### QRMP (2.1 #10) — done

Quarterly return periods, numbered by the Indian financial year (Q1 is April–June), keyed
to the quarter's last month as the portal does. Available under ₹5 crore turnover and chosen
by a great many businesses because it is four filings a year instead of twelve — and without
it a quarterly filer assembles their own return from three monthly exports and hopes they
added up. GSTR-1 and GSTR-3B both accept `?quarter=YYYY-Q1`.

#### Multi-GSTIN / branches (2.1 #9) — not started, and here is the design

**Deliberately not begun rather than half-built.** One org = one GSTIN is assumed by the
invoice counter, both returns, the tax engine, e-invoicing and e-way bills. A partial
implementation touching invoice numbering and tax calculation is the class of change that
breaks GST filing for existing single-GSTIN tenants — and a filing regression costs a
customer a penalty, not an apology.

The plan's instinct was right: **this is "memberships for GSTINs"**. The shape, now that
memberships have been built and the lesson is available:

1. A **`Branch`** owning `{orgId, name, gstin, stateCode, address, invoicePrefix, sequence,
   sequenceFY, isDefault, status}`. The counter fields move here from `Organisation`, which
   is what makes a per-GSTIN series possible at all.
2. A **migration creating one default branch per organisation** from its existing GSTIN,
   state and counter — so every existing tenant has exactly one and behaves identically.
   This is what makes the change safe, and is the same trick migration 006 used for
   memberships.
3. **`Invoice.branchId`**, optional, defaulting to the org's default branch. Absent means
   "the default", exactly as a missing `planVersion` means "the live plan" (#9).
4. `nextDocumentNumber` takes a branch instead of an org.
5. `totalsFor` reads the **branch's** state code as `fromStateCode`, not the org's.
6. GSTR-1/3B/CMP-08 take a `branchId`, because a return is filed **per GSTIN** — filing one
   combined return across two registrations is a wrong filing, not an inconvenience.

Sequenced after composition deliberately: composition is a correctness bug affecting
customers who could sign up today, and branches is an architecture change affecting
customers who would have to be turned away either way.

## Part 4 (premium polish) — the honest position

Twenty-eight of the thirty items are untouched, and that was the right call: they are
polish on a product whose compliance and correctness gaps were the actual problem. Two got
absorbed along the way — #22 (dark mode is now feature-flagged rather than plan-gated) and
#16's page numbers and continued markers (Phase 3).

If picking Part 4 up, this order returns the most per unit of work:

1. **#14 accessibility.** The lint output already names ~225 real findings — focus traps,
   ARIA on the drawer and toasts, contrast across 15 themes × 12 accent swatches. It is
   also the only item on this list with a legal dimension.
2. **#24 the loading/empty/error triad** and **#8 inline validation.** The app currently
   surfaces most failures as one toast at the end of a submit.
3. **#1 a command palette over real data.** `quick-search` is still a client-side list of
   nav links; the server-side search it would need now exists on every list endpoint.
4. **#3 bulk actions**, **#5 undo toasts** (the soft-delete restore endpoints make undo
   nearly free now), **#11 date-range presets**.
5. **#19 offline-first last.** It needs an IndexedDB queue with conflict resolution, which
   is a project rather than a task.
