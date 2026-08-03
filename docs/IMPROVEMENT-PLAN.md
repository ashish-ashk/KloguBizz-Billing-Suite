# KloguBizz — Improvement Plan

A full audit of the current codebase: bugs to fix, features to add, super-admin
monitoring & control to build, and what it takes to feel premium.

Every item marked **[verified]** was confirmed by reading the actual code, not inferred.
Severity: **P0** = broken/unsafe now · **P1** = important gap · **P2** = quality/polish.

---

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

### 5. Recurring invoices (2.2 #14)

**How:** `RecurringInvoice {template, frequency, nextRunAt, endsAt}` plus a job in
`maintenanceService` that generates and optionally sends. The scheduler pattern and the
send path both exist now. The real work is the dedup discipline `ReminderLog` already
demonstrates: never generate twice for the same period, even if the job runs twice.

### 6. Payment links, hosted pay page, customer portal (2.3 #21, #23)

**Why not yet:** Razorpay is wired only for *our* subscriptions, never for
tenant → customer collection. That needs per-tenant gateway credentials (Razorpay Route,
or per-tenant keys), which is a commercial decision as much as a technical one.

**How:** store per-tenant credentials encrypted — `utils/totp.js`'s AES-256-GCM helper is
the pattern to copy. Add a public `/pay/:token` route with a signed, expiring token, and
reconcile through a webhook that calls the existing `createPayment` path so settlement
logic stays in exactly one place.

### 7. Inventory depth (2.5 #40–#44)

**How:** the Phase 6a ledger is the foundation. Valuation (FIFO / weighted average) is a
pass over `StockMovement` once `unitCost` is added to the row. Batch/expiry and warehouses
each add a dimension to a movement — do **warehouses last**, because they change every
balance query from "per item" to "per item per location". Barcode scanning is a frontend
capability on `Item.barcode`, which exists and is still unused.

### 8. P&L and expense reporting (2.4 #32)

**How:** purchases exist now, so this is finally computable. It needs an expense-category
master and a chart-of-accounts-lite: revenue from invoices, costs from purchases, grouped
by period.

## Tier 3 — platform and billing (Part 3.3, 3.5, 3.4)

### 9. Plan versioning

**Why it matters:** `upsertPlan` overwrites in place, so changing a price silently
reprices every existing subscriber with no grandfathering.

**How:** `PlanVersion` rows, and pin `Subscription.planVersionId` at signup. The pricing
page reads the latest version; an existing subscriber keeps theirs.

### 10. Dunning, coupons, refunds/proration, our own GST invoices

**How:** dunning is a `maintenanceService` job over `Subscription.failedPaymentCount` with
an escalating email sequence and auto-suspend at N days past due — the suspension
machinery already exists and is enforced. The platform's own GST invoice is genuinely just
an `Invoice` with us as the supplier; the honest version reuses the whole GST engine rather
than growing a second one.

### 11. Job/queue console, and deliverability replay (3.5)

**Why not yet:** there is no queue. Everything asynchronous is `setInterval` plus
fire-and-forget.

**How:** two options, and the cheap one is right first. Either add a `JobRun` collection so
the existing sweeps become *observable* (no new infrastructure, covers most of the value —
"did the reminder sweep run, what did it do, did it fail"), or add BullMQ + Redis if
retries and a dead-letter queue are genuinely needed. Do the first; only do the second when
a real failure demands it.

### 12. Two-person approval and break-glass elevation (3.4)

**How:** an `ApprovalRequest` collection, a `requireApproval(capability)` middleware that
returns `202 APPROVAL_PENDING` and records the intent, and a console screen for the second
approver. Break-glass is the same mechanism with a TTL on the grant.

## Tier 4 — engineering hygiene

### 13. Frontend tests (#59's frontend half)

**Why not yet:** no test runner is configured at all, so this is a tooling task before it is
a test-writing one.

**How:** `ng add @angular/build:karma`, or Vitest with `@analogjs/vitest-angular`. Start
where a bug is expensive and the code is pure logic: `core/server-list.ts` (the
stale-response guard), `core/invoice-templates.ts` (`resolveTemplate` and the legacy id
map), `core/format.ts` (`numberToWords`, GSTIN validation). Then one Playwright smoke test:
register → invoice → PDF.

### 14. OpenAPI (#63)

**How:** do **not** hand-write it — it will drift within a week. The zod schemas in
`validators/schemas.js` are already the source of truth: add `zod-to-json-schema` and
generate the spec from the route table, so an endpoint with no schema is visibly missing
from the docs rather than silently undocumented.

### 15. E-way bill (2.1 #6) and GSTR-2A/2B reconciliation (2.1 #7)

**Why not yet:** both need a live GSP connection.

**How:** they land behind the same adapter seam as e-invoicing
(`eInvoiceService#callIrp`). Write the payload builder and the validator first — that is
the majority of the work and is fully testable without credentials, exactly as
e-invoicing demonstrated.

### 16. Multi-GSTIN / branches (2.1 #9), composition & QRMP (2.1 #10)

**Why not yet:** one org = one GSTIN is assumed by the invoice counter, both returns and
the tax engine.

**How:** this is really "memberships for GSTINs" — a `Branch` sub-entity owning its own
GSTIN, invoice series and returns. Sequence it **after** memberships, because they are the
same shape of problem and solving one teaches the other.

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
