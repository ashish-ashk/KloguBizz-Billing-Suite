# Launch readiness

Everything between "the code is good" and "real customers are paying for this".

The improvement plan covers the product. This covers the things no amount of code
quality substitutes for: configuration that must be right the first time, one-way
doors, and the four integrations that have **never been run against a real
provider** because there are no credentials in this environment.

Ordered by consequence, not by effort. The first section can lose customer data;
the last is housekeeping.

---

## 1. Before the first deploy — one-way doors

These are irreversible or expensive to undo. Get them right before a single real
customer exists.

### Set `MFA_ENCRYPTION_KEY` explicitly, and never rotate `JWT_SECRET` afterwards

The single most dangerous configuration detail in the system.

`utils/secretBox.js` derives its encryption key from `MFA_ENCRYPTION_KEY`, and
**falls back to `JWT_SECRET` when it is not set**. That fallback is convenient
and it is a trap: `JWT_SECRET` is the kind of value people rotate — after a
suspected leak, on a schedule, when an ex-employee leaves — and rotating it while
it is doubling as the encryption key makes **every enrolled MFA secret and every
tenant's stored payment-gateway credentials permanently undecryptable**.

Not "sessions end". Not "re-enter your password". Every tenant with two-factor
authentication is locked out of their own account, and every tenant collecting
card payments stops collecting, at once, with no way back except re-enrolling
each of them by hand.

```
MFA_ENCRYPTION_KEY=<32+ random bytes, generated once, stored in a password manager>
```

Set it now, before anyone enrols. Once secrets are encrypted with it, this value
can never change either — but at least it is then a value nobody has a reason to
rotate.

### Run the migrations, in order, before the first request

```
cd backend && npm run migrate
npm run migrate:status   # confirm every version is applied
```

Eleven migrations, applied in filename order, recorded in a `migrations`
collection so a re-run is a no-op. Three are **deployment-blocking** rather than
tidying:

| Migration | Why it blocks |
|---|---|
| `006-introduce-memberships` | `protect` resolves a `Membership` on **every request**. Without it, no user has one, and every authenticated request fails with `MEMBERSHIP_REVOKED`. The application does not work at all |
| `010-pin-plan-versions` | Pins each live subscription to the plan version it was sold on. The code falls back gracefully without it — but "falls back" is not "is grandfathered", and the first price change would silently reprice everyone |
| `011-seed-stock-locations` | Gives every tenant one warehouse and puts their existing stock in it. Without it, cost layers carry no location while consumption filters on one, so **the first sale after deploying reports a cost of goods sold of zero** and drives stock negative against a location that owns nothing. Silent, immediate, and wrong in the flattering direction |

The other eight are safe to run late but there is no reason to.

### Check for data that would fail a unique index

Mongoose builds indexes on connect (`autoIndex` defaults on and is not
disabled here). A unique index whose data already violates it **fails to build**,
silently, and the constraint you believe is protecting you is not there.

The newest one is the risk: `Item` has a partial unique index on
`{orgId, barcode}`. If any tenant has two items sharing a barcode, that index
never builds.

```js
// Against the production database, before deploying:
db.items.aggregate([
  { $match: { barcode: { $type: 'string', $gt: '' }, deletedAt: null } },
  { $group: { _id: { orgId: '$orgId', barcode: '$barcode' }, n: { $sum: 1 } } },
  { $match: { n: { $gt: 1 } } }
])
```

Empty result: deploy. Anything else: fix the duplicates first.

After deploying, confirm the index actually exists rather than assuming:

```js
db.items.getIndexes().filter(i => i.unique)
```

### Turn off `autoIndex` once the database is large

Not now — at launch the collections are empty and index builds are instant. But
once there is real data, an index build on connect blocks the deploy and can lock
the collection. The fix is to set `autoIndex: false` in
`src/config/database.js` and build indexes deliberately with `syncIndexes()` as a
migration. **Do not do this before you have checked the previous item** — with
`autoIndex` off, a missing index is silent rather than merely slow.

### Set the platform's billing identity before charging anyone

The platform now issues its own tax invoices — legally required, since you are a registered
supplier charging Indian customers. It issues **nothing** until this is configured, and the
failure is silent from the customer's side: they pay, and no document arrives.

Set the `platformBilling` global setting with your legal name, GSTIN, PAN, address and state
code. `/superadmin/platform-invoices` reports `canIssue: false` and names what is missing
until you do.

Two things not to touch afterwards: the **invoice prefix**, because changing it mid-year
breaks the consecutiveness of a legally-consecutive series; and the
`platformInvoiceCounter` setting, which is deliberately separate so that saving the identity
cannot reset it.

### Set a real superadmin password before seeding

`npm run seed` refuses to run with the documented default, which is the correct
behaviour — but set `SUPER_ADMIN_PASSWORD` and `SUPER_ADMIN_EMAIL` deliberately,
and then **enrol MFA on that account immediately**. It is mandatory on platform
accounts and the console is blocked until it is done.

---

## 2. Configuration the server will refuse to start without

`src/config/env.js` hard-fails in production on an insecure configuration, which
means most of this is enforced rather than remembered. What follows is the
reasoning, so the errors make sense when you hit them.

| Variable | Consequence if wrong |
|---|---|
| `MONGO_URI` | **Hard error.** Would otherwise try a local database that does not exist |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | **Hard error** on the dev defaults. A known signing key is the ability to mint a token for any account |
| `RAZORPAY_WEBHOOK_SECRET` | **Hard error** if Razorpay is configured and this is the default. A forged `subscription.charged` upgrades an account for free |
| `FRONTEND_URL` | Warning. CORS allows only `localhost:4200` without it, so the deployed frontend cannot call the API. Accepts a comma-separated list |
| `STORAGE_DRIVER` | Warning, and the one worth reading twice — see below |
| `SENDGRID_API_KEY` | Warning. Every email is *skipped*, not queued. Invites, reminders and dunning silently do nothing |

### `STORAGE_DRIVER` deserves its own paragraph

The default is `inline` — images stored as base64 inside MongoDB. That works and
is safe; it inflates documents.

`local` on Render is the dangerous one, and it fails **silently**: the filesystem
is ephemeral, so every uploaded logo and signature is lost on the next deploy and
nobody finds out until a customer notices their invoices lost their branding.

For a real launch, use `s3` (or R2/B2/MinIO — the driver speaks the S3 API) and
set `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`. **This path has never
been run against a live bucket** — there are no credentials in this environment.
What is tested is the seam it plugs into, fully, via the local driver. Before
trusting it: configure the bucket, run `npm run migrate`, upload a logo, and check
`/superadmin/system/health` reports `storage.driver: s3`.

---

## 3. The four integrations nobody has ever run for real

Each is written against its published contract and tested up to the boundary. A
mock on the other side would only have proved the mock works. **Each needs one
real transaction before you rely on it.**

### Razorpay — the one that must not wait

Everything else can be fixed after launch. This one takes money.

1. Connect **test-mode** keys.
2. Make one real end-to-end payment: start a subscription, pay, confirm the
   webhook arrives (Razorpay's dashboard shows delivery attempts and responses).
3. Confirm `Organisation.plan` moved and `Subscription.status` is `active`.
4. Force a **failed** payment (Razorpay test cards include one). Confirm the
   subscription goes `past_due` and `pastDueSince` is stamped — the whole dunning
   sequence hangs off that field.
5. Only then swap to live keys, and re-do step 2 with a real card and a refund.

**Known gap, by design:** what the gateway actually charges is set by a Razorpay
plan object this codebase never reads or writes (`razorpayService` passes
`plan_id: planCode`). Local plan versioning governs what the product *displays,
enforces and reports* — not what the card is charged. Create matching Razorpay
plans, and keep the prices in step by hand until
`PlanVersion.versionedProviderPlanId` is wired up.

**The same gap decides whether coupons work, and there it fails closed.** A
discount applied only in our own records would show the customer ₹499 while the
card is charged ₹999 — every month, silently — and our tax invoice would then
disagree with their statement by exactly the discount. So a coupon requires a
`providerOfferId`, and **without one it is refused at checkout** rather than
applied. Before running any launch offer:

1. Create the offer in the Razorpay dashboard.
2. Record its id against the coupon at **Discounts & Credits** in the console.
3. Confirm the list says **Usable** rather than **Needs offer id**.

`/superadmin/coupons` names every coupon still in that state, and says so at the
top of the page rather than leaving it to be inferred from a field.

**Proration credits are recorded, not refunded automatically**, for the same
reason: nothing here can reduce what the gateway collects. A mid-cycle upgrade
raises a credit for the days already paid for; it appears on the console **and**
on the customer's own subscription page, and a person has to do the refund and
record how. Watch that list from the first week — an unsettled credit is money a
customer is owed and has already been told about.

### SendGrid

Without `SENDGRID_API_KEY` every send is recorded as `skipped` and nothing leaves.
Verify the sender domain (SPF/DKIM) before the first invite — mail from an
unverified domain lands in spam, and the first impression of a billing product is
an email nobody received.

Also configure the events webhook with `SENDGRID_WEBHOOK_SECRET`, so bounces
suppress the address. Without it, a dead address is retried forever and the
sending reputation degrades for every tenant.

**Dunning depends on this.** A deployment with no mail provider never
auto-suspends anyone, because no send ever counts as delivered — deliberate, and
it means unpaid accounts run indefinitely until mail works.

### E-invoicing (IRP) and e-way bills

Both are stubs with precise contracts: `eInvoiceService#callIrp` and
`ewayBillService#callEwbApi`. They throw `501` with a message naming the variables
to set and the function to implement.

**A bug found while writing this section, now fixed:** `EWB_BASE_URL`,
`EWB_USERNAME` and `EWB_PASSWORD` were read by the service but never declared in
`config/env.js`, so setting them had no effect and the console reported "not
configured" to a deployment that was. There is a test against it now. Everything around them — eligibility, the
validation, the payload, the validity window — is real and tested.

E-invoicing is mandatory above a turnover threshold; e-way bills are mandatory
above a consignment value. **Neither is optional for a customer who crosses the
line**, so know which of your customers do before you sell to them.

---

## 4. Backups and the things that cannot be undone

### Take a backup, and restore it once

An untested backup is a hope. On Atlas, enable continuous backups and then
**actually restore a snapshot into a scratch cluster** and point a local server at
it. The first restore is where you discover the thing that does not work.

### Know what is irreversible

| Action | Recovery |
|---|---|
| Tenant deletion | **None.** Everything the tenant owned is gone. Requires two-person approval (3.4 #12) for exactly this reason |
| Recycle-bin purge | Soft-deleted records are erased after 30 days by the hourly sweep |
| `JWT_SECRET` rotation without `MFA_ENCRYPTION_KEY` set | See §1. Nothing short of re-enrolling every user |

Everything else — suspension, cancellation, plan changes, invoice cancellation —
is reversible or leaves an audit trail.

---

## 5. First week of operation

### Watch the job health panel

Every background sweep is registered and reported on the console's **System
health** panel (3.5 #11). The states to act on:

- **`never`** — the scheduler did not start. Reminders, recurring invoices,
  overdue marking, dunning and scheduled plan downgrades are all not happening.
- **`late`** — the work is not getting done, whether from repeated failure or a
  dead timer. From outside those are the same problem.

A billing job that silently stops is the most expensive kind of failure: nobody is
chased, nobody is suspended, and the revenue leaks with no signal.

### Watch the GSTR-2B reconciliation

Run it for the first full month as soon as 2B is available. `itcAtRisk` is credit
claimed on invoices suppliers never filed — it will be reversed with interest
about a year later, and the earlier a supplier is chased the likelier they fix it.

### Watch the stock valuation for unreconciled items

The valuation report flags items whose ledger balance and costed quantity
disagree. That means something moved stock without moving its cost, which is
invisible in every other view.

---

## 6. Still open — decide whether each blocks you

Not defects. Deliberate gaps, with the reasoning recorded in the improvement plan.

| Gap | Blocks launch if… |
|---|---|
| ~~Warehouses~~ | **Built.** Every tenant gets one by migration; a customer with two moves stock between them with a transfer. Warehouses in *other states* still need multi-GSTIN below |
| ~~Coupons, proration~~ | **Built.** But a coupon needs a matching **Razorpay offer id** before it can discount a card payment — without one it is refused at checkout rather than applied. See §3 |
| ~~The platform's own GST invoices~~ | **Built.** But it issues nothing until the `platformBilling` setting has a legal name, GSTIN, address and state code — see §1 |
| **Multi-GSTIN / branches** (2.1 #9) | A customer operates in more than one state under one business |
| ~~Composition scheme, QRMP~~ | **Built.** A composition dealer's invoices carry no tax and the rule 49 declaration; CMP-08 and quarterly GSTR-1/3B are available |
| **Depreciation** (2.4 #32) | A customer wants a P&L that accounts for capital assets |
| **Purchase debit notes** | A customer returns goods to suppliers often enough for it to move their numbers |
| **Accessibility** (Part 4 #14) | ~225 known lint findings. Has a legal dimension in some markets |

---

## 7. The pre-launch command

```
cd backend  && npm run check   # lint + 470 tests
cd frontend && npm run check   # lint + 18 unit tests + production build
cd frontend && npm run test:e2e   # against a running stack
```

**The backend check has a trap worth knowing about.** Its integration tests skip
themselves when no MongoDB is reachable, printing a warning and exiting zero — so
`npm run check` can pass without having tested anything. That behaviour is right
for a laptop with no database running and wrong for a release gate.

Before a release, confirm the count rather than the exit code:

```
cd backend && npm test 2>&1 | grep -E "^# (pass|skipped)"
# expect ~470 passing and 0 skipped
```

A run reporting hundreds of skips is a run that proved nothing.

**Run it once at a time.** The suites share fixed test database names, so two
concurrent `npm test` runs drop each other's data and produce a scattering of
failures that look like real regressions and are not.

The frontend's check needs no services at all — its unit tests are pure logic and
the build is offline. The end-to-end test is separate because it does need a live
API and database; run it against staging before a release.
