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
| 1 | Payment starts the plan, and the tenant gets an invoice | Wired, never verified end to end | Verify |
| 2 | Plan benefits listed honestly, dummy copy removed | Advertises Client Portal, API Access, SLA 99.9%, on-premise — none exist. Omits GST returns, e-way bills, inventory, P&L, dunning, which do | Rewrite |
| 3 | Plan entitlements: in-plan unlocked, out-of-plan hidden **and** refused | Does not exist. `Plan.features` gates nothing | Build |
| 4 | Signature appears on the invoice | `pdfService` already renders it — so this is a configuration or upload path problem | Diagnose |
| 5 | "Notes / Terms" → "Notes / Terms & Conditions" in the footer | Label change, plus the payment-terms line | Small |
| 6 | Invoice template: line header and section CSS, theme colour follows the selected theme | Templates exist; the accent is not wired to the tenant theme | Medium |
| 7 | Document series per tenant | Prefixes and per-FY counters already exist for invoices, credit notes and quotations — there is no UI to set them, and not every document type is covered | Medium |
| 8 | Client bulk upload from CSV | Only *items* has bulk upload. Clients have none | Build |
| 9 | Mobile / PWA: nothing hidden behind anything else | Unknown until measured on a real viewport | Audit + fix |
| 10 | Dashboard and charts fit the mobile screen, compact scrolling | Same | Audit + fix |
| 11 | Sales deck for promotion and branding | Does not exist | Build |
| 12 | User guide: plain language, screenshots, numbered steps | Existing docs are engineering prose, wrong audience | Build |

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
