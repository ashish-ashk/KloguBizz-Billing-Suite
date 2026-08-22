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
| 4 | Signature appears on the invoice | **DONE** — it rendered, then got erased. See below | Diagnose |
| 5 | "Notes / Terms" → "Notes / Terms & Conditions" in the footer | **DONE** — and it was not just a label. See below | Small |
| 6 | Invoice template: line header and section CSS, theme colour follows the selected theme | **DONE** — see below | Medium |
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

## 4. Signature on the invoice — DONE

It was never a rendering problem. A freshly uploaded signature **does** reach the
page — proved by counting the images pdfkit actually embedded, which is the only
honest way to ask. What happened is that it got **erased by the next unrelated
save**.

`storeImage({ dataUri: '' })` returns `{ removed: true }` — a truthy result
meaning "delete this image", because clearing one is a real thing to want. And
the API *returned* `signatureUrl: ''` for a field it will not send bytes for. So
an empty string meant two opposite things, and any client that read an
organisation, changed the bank name and sent the object back erased the logo, the
letterhead and the signature — and got a 200 for it.

The app guarded against it with its own dirty flags, which is why it was not
visible in normal use and why the symptom looked intermittent. That guard is the
kind that survives until somebody adds a field, and the same trap sat waiting for
every other caller.

Two changes, both removing the ambiguity rather than documenting it:

- **The write-only fields are omitted from responses, not blanked.** There is
  nothing to echo. Deliberately sending `''` still removes an image.
- **Derived fields are stripped server-side.** A client echoing back
  `hasSignature` or `signatureAssetUrl` was storing them as if they were real, and
  `hasSignature` would then disagree with whether an image was actually there.

Two existing tests asserted `logoUrl === ''`. Their stated intent — "the base64
is not echoed back" — is what omission delivers, so they now assert absence.

## 5. Notes / Terms & Conditions, and payment terms in the footer — DONE

The rename was the small part. Behind it were two real problems.

**`termsAndConditions` was a dead field.** It existed on the organisation model,
the console had a textarea for it, and **nothing ever rendered it**. The invoice
editor pre-filled `notes` from *either* the default notes or the terms —
whichever happened to be set — so a tenant who filled in both only ever saw one,
and an invoice generated from a recurring schedule or a converted quotation showed
neither. Standing terms now print as their own block on every invoice, however the
document was created, which is what standing terms are for.

**Payment terms sat alone at the top**, in the supply-details panel, away from
everything else the customer is being asked to agree to. They now print with the
terms. Not in both places: repeating them is noise on a document people scan for
one number.

**And the notes block could not hold real terms.** It advanced a fixed 34pt
regardless of content, so anything longer than two lines was overprinted by
whatever came next — and the page-break reservation was a flat 170pt sized for the
totals panel, so a tall left column made pdfkit silently start a second page
mid-block. Both are measured now, and a test renders twelve clauses and asserts
the PDF still has exactly one page.

The heading reads `NOTES / TERMS & CONDITIONS` in the PDF and on screen, and the
editor label matches — the field carries both, and calling it "Notes" understated
what was in it.

**One self-inflicted detour worth recording:** the on-screen document broke to
build because an HTML comment I added contained backticks, inside a template
literal. TypeScript reported it as `styles: Expected 1 arguments, but got 3`
thirty lines further down.

## 6. Line header, section styling and the accent colour — DONE

Looked at a rendered invoice before changing anything, which is how three of these
were found.

**The line-item header was invisible as a header.** On the default template it was
bare text on white, so on a printed page it read as another body row — the eye had
nothing to anchor the columns to. It now sits on a faint wash of the document's own
accent, uppercase and letter-spaced.

**"GST %" wrapped onto two lines**, because nothing stopped it. `nowrap` on the
header cells fixes every column label at once.

**The row rule was `#e0e7ff`** — a hardcoded indigo tint. It looked deliberate
exactly while the accent happened to be the default indigo and clashed with every
other colour a tenant picked, on the document their customers receive. Both the
wash and the rule are now derived from the accent, in the PDF and on screen, by
the same arithmetic.

**Figures now use tabular numerals**, so the rupee columns line up digit for digit
instead of drifting by the width of a 1 against a 7.

### The accent and the app theme

Wired as an explicit **"Match my app theme"** button rather than automatically, and
the reason is on the button itself: the app theme is set **per role**, so linking
them would mean an accountant switching to a dark theme changes what customers
receive. One click when you want them to match; never a surprise. The card now
also says plainly that this colour is the one on the document.

Verified by rendering the same invoice with an indigo and then a teal accent: the
header wash, every rule, the totals, the title and the signature line all follow.

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
