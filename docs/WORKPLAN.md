# Work plan — the twelve items

Ordered so that anything another item depends on comes first. Each is checked
against the code before it is called done, and the notes below are findings, not
guesses.

**Two of these are not what they appear to be**, and it changes the order:

- **Plan entitlements do not exist at all.** `Plan.features` is marketing prose
  that gates nothing — `planVersionService` says so in as many words: "every real
  feature gate goes through `featureFlagService`, which reads
  `Organisation.featureFlags` and deliberately does not consult the plan." So
  "unlock the benefits of the plan" is not a fix; it is a new mechanism, and it is
  the largest item here.
- **Payment → plan → invoice is already wired.** The charge webhook sets
  `org.plan` and issues a `PlatformInvoice`. What it has never had is an
  end-to-end check, so item 1 is verification with fixes where it breaks, not a
  build.

| # | Item | State before starting | Size |
|---|---|---|---|
| 1 | Payment starts the plan, and the tenant gets an invoice | **DONE** — verified end to end; see below | Verify |
| 2 | Plan benefits listed honestly, dummy copy removed | **DONE** — see below | Rewrite |
| 3 | Plan entitlements: in-plan unlocked, out-of-plan hidden **and** refused | **DONE** — see below | Build |
| 4 | Signature appears on the invoice | `pdfService` already renders it — so this is a configuration or upload path problem | Diagnose |
| 5 | "Notes / Terms" → "Notes / Terms & Conditions" in the footer | Label change, plus the payment-terms line | Small |
| 6 | Invoice template: line header and section CSS, theme colour follows the selected theme | Templates exist; the accent is not wired to the tenant theme | Medium |
| 7 | Document series per tenant | Prefixes and per-FY counters already exist for invoices, credit notes and quotations — there is no UI to set them, and not every document type is covered | Medium |
| 8 | Client bulk upload from CSV | Only *items* has bulk upload. Clients have none | Build |
| 9 | Mobile / PWA: nothing hidden behind anything else | Unknown until measured on a real viewport | Audit + fix |
| 10 | Dashboard and charts fit the mobile screen, compact scrolling | Same | Audit + fix |
| 11 | Sales deck for promotion and branding | Does not exist | Build |
| 12 | User guide: plain language, screenshots, numbered steps | Existing docs are engineering prose, wrong audience | Build |

## 1. Payment starts the plan, and the tenant gets an invoice — DONE

The wiring was already right, and now there is a test that says so. One verified
charge has to do three things at once, and each has failed independently before,
so each is asserted separately:

- **The plan starts.** `Organisation.plan` moves and the subscription goes active.
- **The ceiling moves with it.** A plan that changes the name on the banner and
  not the user or invoice limit is the failure worth guarding: the customer paid
  for headroom, and the only thing they would notice is the one thing that did not
  change.
- **The customer ends up with a tax invoice they can retrieve** — not merely one
  that exists in the database. A registered supplier must issue one, and this
  system used to take the money and issue nothing.

Plus the two directions that must *not* happen: a retried webhook issues no second
invoice (two tax invoices for one payment is worse than none — both carry
consecutive numbers from a legally-consecutive series), and a failed charge starts
no plan but does start the dunning clock.

**A test-suite bug found on the way, twice.** `parkInvoiceCounter()` set the
platform invoice counter to a flat 5000, which is correct exactly once — the
second caller re-issues 5001, hits the unique index on `invoiceNumber`, and
`issueForChargeSafely` swallows the error by design. The next test then saw no
invoice and no reason why. It now parks above every number already issued. Worth
recording because the swallowing is deliberate and right — a webhook must not fail
a charge that already succeeded — which makes anything downstream of it
diagnosable only by looking.

## 2. Plan benefits listed honestly — DONE

The four plans advertised **Client Portal, API Access, Dedicated Manager, SLA
99.9%, an on-premise option and 24/7 phone support**. None exist. They never
mentioned GST returns, GSTR-2B reconciliation, inventory, warehouses, FIFO
valuation, profit and loss, batch and expiry tracking, recurring invoices,
payment links or credit notes — all of which do. A customer who bought Business
for the API had a fair complaint.

`services/planCapabilities.js` is now the single catalogue. Two things come out of
it: the **keys** a gate will read (item 3) and the **copy** a card prints, so the
card cannot advertise something the plan does not include. Twenty-two
capabilities, each naming where it is enforced — the same discipline
`featureFlagService` uses, because a capability an operator believes in but which
does nothing is worse than an absent one.

Starter 6, Growth 14, Business 22, Enterprise 22 plus the ceiling. Tiers are
cumulative and a test asserts it: a more expensive plan silently losing something
the cheaper one had would be the worst kind of pricing bug.

**What is deliberately still absent: e-invoicing and e-way bills.** Everything
around them is real — eligibility, validation, payload, validity window — and the
provider call is a stub that throws 501, so nothing can be filed. A test asserts
they stay off the list until the adapter exists.

Migration 012 rewrote the four shipped plans in place. **Prices and limits were
not touched** — those are the terms a customer agreed to, and a migration is the
wrong place to change what somebody pays. A plan code that is not one of the four
is left exactly as somebody wrote it and reported instead, because guessing at a
bespoke plan's list is worse than leaving it.

Applied to both live databases; the console now shows the capability keys
read-only beside the editable copy, with the copy labelled as display-only.

## 3. Plan entitlements — DONE

`services/entitlementService.js` resolves what a tenant may do, and
`requireCapability` refuses it **on the server**. A hidden button with a live
endpoint behind it is not a plan limit; it is a plan limit anybody can skip with
`curl`, and the customers most likely to try are the ones reading the pricing page
closely.

Four decisions worth stating, because each one is a place this could have been
quietly wrong:

**Reads of a tenant's own records stay open.** Purchases, expenses, credit notes,
recurring definitions and payment links gate *writes* only. A tenant who
downgrades still owns their own books, and a purchase register is an
input-tax-credit record they may be legally required to produce — hiding it behind
a pricing tier would be taking away their data rather than a feature. Derived
reports and tools (P&L, GSTR-2B, CMP-08, ageing, valuation, warehouses, exports)
*are* the feature, so those are gated outright.

**A trial gets the tier it is being sold**, not the cheapest plan. Giving a trial
only Starter means nobody can evaluate what they would pay for, and the first
thing they meet is a locked door rather than the product.

**Core survives everything.** An unknown plan code, an empty capability array, a
plan deleted out from under a tenant — all still resolve to invoicing, clients,
payments, reminders and GST returns. Losing the ability to bill because of a
pricing change nobody told them about is not a recoverable inconvenience for a
business.

**Branding is refused, not stripped.** `PUT /organisations/current` also carries
the GSTIN and address, so the gate sits on the fields rather than the route — and
it returns 403 instead of silently discarding an uploaded logo, which would leave
somebody staring at a save that appeared to work and changed nothing.

Per-tenant `capabilityOverrides` grant or revoke one capability against the plan,
in both directions, so a bespoke deal does not require inventing a plan.

**Two corrections to my own work.** `multiUser` was on the capability list until
the user *limit* was checked: Starter already permits three users and
`assertUserQuota` already enforces the ceiling, so selling "more than one user" as
a Growth feature would have been the same untruth item 2 removed. And the route
guard let deep links straight through on a cold load — `can()` is optimistic on an
empty list, which is right for a menu and wrong for a guard. Found by driving it:
the nav hid correctly and `/profit-loss` opened anyway. Capabilities are persisted
now, and the guard waits for the session when it has none.

## Order, and why

**1 → 2 → 3** first, because they are one thread: nothing can be honestly gated
until the benefit list says what the product actually does, and nothing about
plans matters if payment does not start one.

**4 and 5** next: both are small, both are on the document a customer receives.

**6, 7, 8** are self-contained features.

**9 and 10** come after the UI work above, so the mobile audit measures the final
screens rather than ones about to change.

**11 and 12** last, because they describe the product and should describe it as it
ends up, not as it was mid-way.

## Rules for this batch

- **Gating is enforced on the server, not just hidden in the UI.** A hidden
  button with a live endpoint behind it is not a plan limit; it is a plan limit
  anybody can skip with `curl`.
- **No benefit is advertised that the code does not do.** The existing lists are
  the exact failure this rule exists to prevent.
- **Every claim of "done" is checked by driving the real app**, because every
  finding in this project so far that mattered came from that and not from tests.
