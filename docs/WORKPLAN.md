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
| 9 | Mobile / PWA: nothing hidden behind anything else | **DONE** — measured, three real defects, all fixed | Audit + fix |
| 10 | Dashboard and charts fit the mobile screen, compact scrolling | **DONE** — see below | Audit + fix |
| 11 | Sales deck for promotion and branding | **DONE** — `docs/sales-deck.html` | Build |
| 12 | User guide: plain language, screenshots, numbered steps | **DONE** — `docs/user-guide.html` | Build |

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

## 9. Mobile / PWA: nothing hidden behind anything else — DONE

Measured rather than eyeballed. A script walks all twenty-one tenant screens at
390 x 844 with real data on them, at every scroll position down each page, and
reports two things reading CSS cannot tell you: anything wider than the viewport
that is not inside something scrollable, and — for every visible button, link and
input — whether `elementFromPoint` at its centre returns the control or something
sitting on top of it.

The first run flagged all twenty-one screens for the same thing, and getting the
audit to say something useful took two exclusions: a control scrolled under a
`sticky` or `fixed` bar is not hidden, it is scrolled, and a control outside its
own scrollable container needs scrolling to. Without those the audit called
everything broken and told you nothing.

### Three real defects

**The closed nav drawer was still fully operable.** It is moved off-canvas with
`transform: translateX(-100%)` — which moves a thing out of sight without taking
it out of the page. Measured: **seven of the first eight Tab presses** landed on
nav links at x=-208, twenty-one focusable elements in a menu nobody can see, all
of them still announced by a screen reader. Now `visibility: hidden` when closed,
which removes it from both the tab order and the accessibility tree. It is safe
to animate because visibility interpolates as a step at the *end* of a
transition, so the drawer stays visible for the whole slide either way. Now 0 of
8.

**With a dialog open, thirteen of the next fourteen Tab presses left it** for the
page behind — including the per-row Delete buttons on the customer list. The page
was covered, dimmed and scroll-locked, and entirely operable by keyboard: a
switch-access user could delete a customer they could not see. Focus also never
moved into the dialog, so a screen reader user got no signal anything had opened.
The shared `ModalComponent` now carries `role="dialog"`, `aria-modal`, and
`aria-labelledby` pointing at its own heading; moves focus to the first useful
control (not the close button — otherwise every dialog opens with "dismiss this"
selected and Enter throws away what the user came to do); cycles Tab within the
panel; returns focus where it came from on close; and closes on Escape. Only the
innermost dialog responds, so a confirm stacked over a form closes the confirm
and leaves the form standing. Now 0 of 16.

Deliberately **not** `inert` on the rest of the document: that means reaching
outside the component, and a modal that failed to clean up — an error mid-close,
a route change — would leave the whole app inert and unusable. Cycling within the
panel cannot break the app.

**Anything scrolled to landed under the topbar.** Tapping "Upgrade Plan" put the
plans section at the top of the viewport, with its first 56px — the heading —
beneath the sticky bar. Fixed with `scroll-padding-top` on the scroll root rather
than on that one section, so every anchor and every future `scrollIntoView` gets
it without having to remember. 56px hidden → 12px clear.

### The PWA half

`index.html` sets `viewport-fit=cover`, and the stylesheet handled the top and
left insets — but not the **bottom**. On an installed iPhone the page is drawn
under the home indicator too, and that band is not empty: it holds the drawer's
Sign Out button, the last row of any list, and the sticky Save/Cancel footer of
every dialog. Added for `.page`, `.sidebar-foot`, `.modal-foot` and the toast
region, each as `max()` against the existing value so a device with no indicator
gets exactly the spacing it had before.

Chromium does not emulate `env(safe-area-inset-*)`, so this is verified from both
ends rather than directly: at inset 0 the computed padding is unchanged (22px and
15px, as before), and with the inset applied the Sign Out button moves from 15px
above the screen edge to 49px, clearing the 34px band. The plumbing on a real
iPhone is reasoned, not measured, and that is worth knowing.

The right inset is deliberately left alone — it only appears in landscape, the
manifest asks for portrait, and covering it would mean a rule here overriding the
horizontal padding that `.page` and `.topbar` own.

### Not verified

The **super-admin console** was not measured. Its account has 2FA enabled and
resetting it would invalidate the authenticator in use; creating a throwaway
superadmin was blocked. The reasoning that carries over is that the one global
change (`min-width: 0` on grid children, below) can only ever *permit* shrinking,
so it cannot introduce horizontal overflow — but it is not measured, and the
tenant app is.

## 10. The dashboard and charts on a phone — DONE

Started at **2767px — 3.3 phone screens** of scrolling, and one bug that only
appears on a tenant who has been using the product.

**Four full-width KPI tiles filled 452px** before a single figure that is not a
headline number. They are short and numeric and read perfectly well at half
width. Now two-up, 226px. Written as `.grid:has(> .metric)` so it applies
wherever metric tiles are used rather than page by page, and so a browser without
`:has()` keeps the existing single-column rule rather than getting something
broken.

**Recent Invoices was 1528px** — 1.8 phone screens for six invoices — because the
shared stacked-table pattern gives every column its own labelled line, including
both dates. Added a `data-priority="low"` opt-in that hides a column on phones
only, and marked the two dates with it on the dashboard. That card is a glance at
the latest activity with "View all" at the top of it; the full invoice list still
shows every column at every width.

What was **not** changed: each stacked row still spends 55px of its 180px on the
action row. That size is a deliberate touch-target decision, with a comment in
the stylesheet saying so. Reclaiming it would trade away exactly what item 9 was
about.

### The bug that needed a year of data

With twelve months of collections instead of one, the revenue chart wanted 638px
on a 390px screen and **the whole page scrolled sideways by 300px**.

The cause is a default worth knowing: a grid item's `min-width` is `auto`, which
means "at least as wide as my content", so `1fr` quietly resolves to
`minmax(auto, 1fr)` and the track grows to fit its widest child. The card became
676px, the "1fr" column computed to 676px, and the chart's own `overflow-x: auto`
never engaged — because nothing had ever told it that it could not have the width
it asked for. `.grid > * { min-width: 0 }` makes the track win: the card is 362px
and the chart scrolls inside it, 324px of window onto 638px of bars.

This is why the spec seeds a **year** before measuring. The same audit against a
one-month-old tenant reported all twenty-one screens as fine. An empty page does
not overflow, and a clean result on one is worth nothing.

2767px → 2232px, and no sideways scroll anywhere.

### Verified

`e2e/mobile.spec.ts` — the second end-to-end spec in the project, and the config
comment now says why it earns a place: it asserts rather than reports, it is
deterministic because it measures geometry rather than timing, and every bug it
caught was one where each component was fine and the *page* was not. Twenty-one
screens clean, drawer clean, and the desktop layout separately confirmed
unchanged — four metric columns, the 1.5fr/1fr split intact, both dates visible.

## 11. Sales deck — DONE

`docs/sales-deck.html`. A single self-contained page, no build step, no external
assets beyond Google Fonts — open it in a browser, present it by scrolling, or
print it to PDF.

**Every number on it was read out of the running product**: the twenty-one
capabilities come from `planCapabilities.js`, the four prices, user limits and
invoice limits from the `plans` collection, the fourteen-day trial from
`authController`, and the trial's Business-tier capability from
`entitlementService`. The sample invoice's arithmetic is correct and **both
GSTINs pass the checksum the product itself enforces** — the first draft's buyer
GSTIN did not, which would have been a poor advertisement for a deck whose
argument is that the software catches exactly that.

There is a spread headed **"What it does not do yet"**, naming e-invoicing and
e-way bills as not live. That is the same rule as item 2: the pricing page used
to advertise six things that did not exist. A deck is a pricing page with better
typography, and the place to say this is before somebody pays, not during their
first month-end.

### The design

Grounded in the subject rather than a template. The hero is a **typeset tax
invoice** — not a screenshot — because that is the most characteristic object in
this world and it is what the product produces; three pins on it name the state
code, the numbering series and the HSN code, which are the three things that are
easy to get wrong and expensive when you do. Indigo is the app's own brand
colour rather than an invented one, with a teal counterweight that reads as
"reconciled". Instrument Serif for the pitch, Public Sans for reading, and IBM
Plex Mono for GSTINs, HSN codes and invoice numbers — the mono is meaningful
here, because those are fixed-width identifiers.

Rendered and checked in light and dark, at 1440px and at 390px: no sideways
scroll at either width, and the display face loads rather than falling back.

**Two contact details are deliberately placeholders**, marked with an amber
dashed underline and called out in the colophon, so they cannot be shipped
unnoticed. They were not filled in because a sales contact is a decision about
what address the business wants public.

## Found while writing the guide: a business could not enter its own GSTIN

Writing item 12 meant walking a new tenant through setup, screen by screen. Step
two is "enter your GSTIN and address" — and **there was no screen to do it on**.

Registration collects a name, an email and a state code. `PUT
/organisations/current` has accepted `gstin`, `pan`, `address`, `phone` and
`state` from the beginning, the PDF prints all of them, and nothing in the app
ever set them. So every business on the platform issued invoices carrying their
company name and nothing else.

That is not cosmetic. Under GST a tax invoice must state the supplier's name,
address and GSTIN. Without them the document is not a valid tax invoice, the
buyer cannot claim input tax credit against it, and they find out months later —
then ask the tenant why. The `organisationController` comment even says the GSTIN
and address are something "every tenant must be able to edit whatever they pay".
The API was right. The screen was missing.

Same shape as item 7: a field stored, printed, and unsettable.

### What was added

A **Business Profile** page — name, GSTIN, PAN, address, state, phone — admin
only, since it is the business's legal identity on a tax document.

**The GSTIN is checked against the state.** The first two characters of a GSTIN
*are* the state code, so if they disagree with the state chosen, one of them is
wrong — and that decides whether every invoice charges CGST + SGST or IGST. Said
next to the field rather than discovered in a return.

**A warning on the dashboard, not only on the page that fixes it.** A tenant who
never opens Business Profile never learns that their invoices are not valid tax
invoices. Admin only: a warning shown to somebody who cannot act on it is noise.
It disappears the moment the details are filled in.

**No billing-email field**, though the first draft had one. The organisation has
no such field and the API does not accept it, so the input would have looked like
it worked and changed nothing — the exact silent failure this codebase keeps
removing.

### And the browser's GSTIN check did not match the server's

`format.ts` tested the **pattern only**; the API verifies the fifteenth
character, a weighted mod-36 checksum over the first fourteen. So `…F1ZZ` for
`…F1ZV` looked fine in the browser, showed nothing beside the field, and came
back as a failed save.

That is the worse half of the bug: the entire point of validating in the browser
is to say so while the field is still in front of the person, and a check that
passes what the server will refuse only delays the same rejection. The checksum
is now duplicated into `format.ts` — eleven lines, not worth a shared package —
with the server remaining the authority. It fixes the customer form and the CSV
import screen at the same time, since they use the same function. Six new unit
tests cover it, including a right-shaped wrong checksum.

Verified in a browser end to end: the warning appears with the details missing, a
bad GSTIN is refused inline, a GSTIN disagreeing with the state is called out,
the save survives a reload, and the GSTIN and address print on an invoice raised
afterwards.

## 12. User guide — DONE

`docs/user-guide.html`. Fifteen numbered steps in the order somebody actually
needs them: set up once (1–4), add customers and products (5–7), the daily loop
(8–12), GST time (13–14), and the phone (15).

**Sixteen screenshots of the real screens**, captured from a seeded demo tenant
by a Playwright script, not drawn. The instructions to regenerate them are at the
top of `docs/build-user-guide.js`, because a guide whose pictures no longer match
the product is worse than one with no pictures — the reader trusts them and then
cannot find the button.

Written the way it was asked for: short sentences, imperative, almost no theory.
Each step is a numbered list of things to press, then the picture. Where a
sentence of *why* genuinely prevents a costly mistake it gets a marked note
rather than a paragraph — three kinds, and only where they earn it: **Careful**
(skip your GSTIN and the bill is not a valid tax invoice), **Why it matters** (the
state decides CGST + SGST versus IGST), **Tip** (State accepts a name or a
number).

Self-contained: every image is a data URI, so the file works from disk, from an
attachment and from a link, with nothing to lose alongside it. The screenshots
are captured at the size the page displays them, which keeps the build to Node
with no image library — this repo has one toolchain and a document is not worth a
second one. The inputs are gitignored, since the built page already contains
them.

Checked in light and dark, at 1300px and at 390px: no sideways scroll, no broken
image, all fifteen contents links resolving.

### One bug in the guide itself

The numbered action lists rendered `<strong>` on its own line — "Pick your", then
"state" underneath. `display: grid` on the `<li>` makes **every element child** a
grid item, and inline emphasis is a child. The number is now positioned rather
than a grid column.

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
