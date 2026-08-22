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
| 7 | Document series per tenant | **DONE** — the fields existed; nothing could set them. See below | Medium |
| 8 | Client bulk upload from CSV | **DONE** — see below | Build |
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

## 7. Document numbering, per tenant — DONE

**Every business on the platform was issuing invoices numbered `KLG-2026-001`** —
the platform's own initials, printed on their tax documents and sent to their
customers. All five prefixes and their per-financial-year counters already existed
on `Organisation`, with platform defaults, and **no screen anywhere let a tenant
change any of them**. A field that is stored, defaulted and never settable is not a
feature; it is the default in disguise.

There is now a **Document Numbering** card on Invoice Templates covering all five
series — invoice, credit note, quotation, proforma invoice, delivery challan — each
with its prefix, its next number, and a live preview of the number that will be
issued.

### Numbering moves forward, never back

The next-number field exists for one real case: a business moving from another
system that was on `AST-2026-0246` last week. Restarting them at 1 would put the
same number on two different documents across the two systems.

Lowering it is refused with a 409 that says why. A tax invoice series must be
consecutive within a financial year, and re-issuing a number already used cannot
be undone — it has to be explained to an assessing officer. Raising it leaves a
gap, and a gap is a question with an answer ("we migrated"); a duplicate is a
question without one. The page says this *before* anyone tries it, so the refusal
is not a surprise at the moment of saving.

The counter is otherwise not tenant-writable — it is on the deliberate exclusion
list from the privilege-escalation work — so this is the one narrow door, it opens
one way, and every change is audited as `org.document_series_updated` with the
before and after.

### Three things found while building it

**The preview document still said `KLG-`.** On the very screen where a tenant sets
their prefix, the large sample invoice beside it carried the shared sample's
hardcoded `KLG-2026-001`. It now follows the field as it is typed, like the small
preview under it.

**The labels named nothing.** Five of the ten new fields are called "Next number",
so a screen reader read five identical fields with no way to tell which series was
about to move. Every label now names its own field with `for`/`id`, and each pair
points at its preview with `aria-describedby`. Found because a browser drive
could not locate a field by its label — which is exactly the problem.

**Reading the next number must not consume one.** A preview that took a number
would leave a gap every time somebody opened the settings page — in the one series
that must not have gaps. `previewDocumentNumber` computes it without touching the
counter, and a test asserts two reads return the same number and that the number
shown is the one the next invoice actually gets.

### Verified

Seven backend tests: the prefix reaches the issued document; forward moves work
and carry on from there; a backward move is refused by code; a prefix that would
not read as a document number is refused *by document type name*, because "invalid
input" on a page with five prefix fields does not say which one; previews do not
consume; each document type keeps its own counter rather than sharing one (a shared
sequence would interleave quotations into the invoice series and leave gaps an
auditor reads as missing documents); and the whole screen is admin-only, since
numbering decides what is printed on everything the business issues.

Then driven in a real browser: set `ASTRA`, watched both previews follow the
typing, saved, reloaded to confirm it was stored rather than held in a signal,
raised an actual invoice through the API — `ASTRA-2026-001` — and tried to move
numbering back to 1, which was refused visibly on the page.

## 8. Importing a customer list from CSV — DONE

Items had a bulk upload; customers did not. So a business moving in typed their
customer list in by hand, one at a time — which for a few hundred customers is
the reason they never finish moving in.

CSV rather than the .xlsx the item importer uses, and that follows from where a
customer list actually comes from: an export out of Tally or Zoho, a contacts
export, or the spreadsheet the business has kept for years. All of those are CSV.
.xlsx is accepted as well, because somebody who opens the CSV template in Excel
and presses Save produces one, and refusing that file teaches them nothing except
that the feature is broken.

### Most of the work is that "CSV" is not one format

Every one of these has an obvious wrong answer that either loses a tenant's data
or refuses a correct file:

- **Excel writes a byte-order mark**, which makes the first header read as
  `﻿Customer Name` and match nothing. The single commonest cause of "your
  import doesn't work". The template is written *with* one, too — without it
  Excel opens a UTF-8 CSV in the local code page and mangles non-ASCII names.
- **Addresses contain commas.** Always. So quoted fields are not an edge case
  here, they are the normal case, and `split(',')` silently shifts every column
  after the address by one — which is worse than failing, because it succeeds.
- **A quoted field can hold a newline** (a two-line address), so the file cannot
  be cut into rows before it is parsed into fields.
- **Excel writes semicolons in some locales**, and anything pasted from a table is
  tab-separated. The delimiter is detected from the header line only — counting
  across the whole file would let commas inside addresses outvote the real one.
- **Line endings** may be CRLF, LF, or CR from an old Mac export.

Columns are matched by header *text*, not position, and a short list of synonyms
is accepted ("Party Name", "GSTIN/UIN", "Mobile", "Place of Supply"), so a real
export usually imports without being edited first. Extra columns of the file's
own are ignored rather than fatal.

### The state is the part that matters

The first two digits of a GSTIN **are** the state code — that is how the number is
built. So a row that gives a GSTIN has already given the state, and the State
column can be left blank. It is also accepted as a name (`Maharashtra`) or a
number (`27`), because nobody importing a customer list knows Maharashtra is 27,
and refusing the file over that would send them to look up thirty-eight codes by
hand.

When both are given **and they disagree**, the row is refused rather than
resolved. This is the most consequential error in the file: the state decides
whether every future invoice to that customer carries IGST or CGST + SGST.
Choosing one of two contradicting answers means either a wrong GSTIN on the
invoice or the wrong tax split on all of them, and both surface first as a GST
return that no longer reconciles.

GSTINs are checked by their **checksum**, not just their shape. A transposed pair
of characters passes a format test while belonging to nobody — and the
consequence lands on the customer, whose input tax credit is refused months
later.

### Duplicates, and what counts as one

Same name, different GSTINs → two records, because that is what a company with
branches in two states looks like and each needs its own place of supply.

Same name, no GSTIN on either → refused. That is one customer entered twice, and
creating both splits their invoices across two records, so the receivables report
shows neither balance correctly and a statement sent to them is wrong.

Existing customers are checked **including soft-deleted ones**, since a deleted
customer still holds its GSTIN and restoring it afterwards would leave the
history ambiguous.

### Row by row, never all-or-nothing

A file of five hundred customers with four bad rows imports four hundred and
ninety-six and hands back four rows to fix, each with the row number as it appears
in the spreadsheet and a sentence naming what is wrong with it. Refusing the whole
file over one malformed phone number is how an import feature ends up unused — the
tenant goes back to typing, which is what this was for.

Two smaller decisions written down in the code because they are not obvious:
a row claims its GSTIN even when it failed for some other reason (otherwise
whether the *second* row imports depends on whether the first had an unrelated
typo), and a missing state is not reported on a row whose GSTIN was already
rejected (fixing the GSTIN fixes both).

### Also done here

`STATE_NAMES` lived inside `pdfService` and was about to be copied. It is now
`utils/states.js`, used by both — two copies of that table is a divergence
waiting to happen, and it is printed on tax invoices as the place of supply.

### Verified

Thirteen backend tests, including a single file that arrives with a BOM,
semicolons, CRLF, a quoted embedded newline, reordered columns and an extra
column of its own — because in real files those arrive together, not one at a
time. Then driven in a browser: template downloaded, a three-row file with one
bad row uploaded, two customers added and the third listed with its row number
and reason, the list refreshing itself behind the modal. Then again at 390px,
checking the error table does not push the page sideways and leave the Close
button off-screen.

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
