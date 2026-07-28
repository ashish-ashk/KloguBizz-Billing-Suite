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

**Phase 4 — Super-admin platform console.** The event-capture layer and metrics rollup
first, then the tenant drill-down, impersonation, user management and audit console —
Part 3.1, 3.2 and 3.4 give the most support leverage per unit of work.

**Phase 5 — Compliance depth.** GSTR-1 export, purchases + ITC, e-invoicing, e-way bill.
This is what moves the product from "invoice maker" to "GST software".

**Phase 6 — Premium polish.** Part 4, continuously.
