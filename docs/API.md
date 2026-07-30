# KloguBizz API

Base URL:

```text
http://localhost:5000/api/v1
```

## Auth

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/change-password` — `{ currentPassword, newPassword }`, any authenticated user (including super admin)

Auth responses include:

```json
{
  "token": "jwt",
  "user": {
    "id": "user id",
    "name": "Admin",
    "email": "admin@example.com",
    "role": "admin",
    "status": "active"
  },
  "organisation": {
    "_id": "org id",
    "name": "Company"
  }
}
```

## Public API (no auth)

- `GET /public/branding` — platform display branding (app name, tagline, colors, logo) for the login/register screens,
  set by the super admin from the platform Branding page.

## Tenant API

- `GET /organisations/current`
- `PUT /organisations/current` (admin) — accepts any organisation field, including `themeConfig` (see Appearance/Theming below)
  and `brandingConfig` (see Invoice Templates & Logo below)
- `GET /clients`
- `POST /clients` (admin, accountant)
- `PUT /clients/:id` (admin, accountant)
- `DELETE /clients/:id` (admin)
- `GET /items`
- `POST /items` (admin, accountant)
- `PUT /items/:id` (admin, accountant)
- `DELETE /items/:id` (admin)
- `GET /items/bulk-upload/template` (admin, accountant) — downloads a `.xlsx` template (an "Items" sheet with dropdowns/validation for Type, Unit, GST Rate, Tax Inclusive and Status, plus a "Read Me" sheet) for bulk item import
- `POST /items/bulk-upload` (admin, accountant) — `multipart/form-data` with a `file` field (`.xlsx`, max 5MB). Each row is validated independently; valid rows are inserted, invalid rows are reported back with the reason. Returns `{ totalRows, created, failed: [{ row, itemCode?, name?, errors: string[] }] }` (200 even on partial failure — a row-level `failed` entry is not a request error)
- `GET /invoices` — optional `?status=` and `?q=` (search by invoice number) filters; auto-marks overdue pending invoices past their due date
- `GET /invoices/stats` — dashboard metrics: revenue/pending/overdue totals, 12-month revenue trend, top clients
- `GET /invoices/export.csv` — CSV download of the invoice list (respects `?status=`)
- `POST /invoices` (admin, accountant) — blocked once the plan's monthly invoice limit is reached
- `POST /invoices/remind-all` (admin, accountant) — emails every pending/partial/overdue invoice with a client email on file; returns `{ sent, skipped, total }`
- `GET /invoices/:id`
- `PUT /invoices/:id` (admin, accountant) — also used by the Bill Generator's edit mode (`/bill-generator/:id/edit`)
- `POST /invoices/:id/duplicate` (admin, accountant) — clones an invoice as a new draft with a fresh invoice number
- `POST /invoices/:id/mark-paid` (admin, accountant)
- `POST /invoices/:id/remind` (admin, accountant) — sends a single reminder email
- `GET /invoices/:id/pdf` — streams a generated PDF (`application/pdf`) of the invoice
- `DELETE /invoices/:id` (admin)
- `GET /payments`
- `GET /payments/export.csv`
- `POST /payments` (admin, accountant) — auto-updates the invoice status (`partial`/`paid`) based on total payments received
- `GET /reports/gst-summary` — taxable value & tax collected grouped by month and by GST rate slab, for GST filing
- `GET /reports/gst-summary/export.csv`
- `GET /users`
- `POST /users/invite` (admin) — blocked once the plan's user limit is reached
- `PUT /users/:id` (admin)
- `DELETE /users/:id` (admin) — soft-disable
- `GET /subscriptions/plans`
- `GET /subscriptions/current` — returns `{ subscription, usage }` where `usage` includes seat/invoice quota consumption
- `POST /subscriptions/start` (admin)
- `POST /subscriptions/cancel` (admin)

### Appearance / Theming

Tenant admins customize the UI **per role** from the **Appearance** page (`/appearance`, admin-only) — admin,
accountant and viewer users can each see a different theme. Every signed-in user is themed according to their own
role; the theme is stored on the organisation and applied client-side by deriving a full CSS variable palette from
a small seed (see `frontend/src/app/core/theme.ts`).

```json
PUT /organisations/current
{
  "themeConfig": {
    "admin": { "presetId": "indigo", "custom": null },
    "accountant": { "presetId": "emerald", "custom": null },
    "viewer": { "presetId": "slate-steel", "custom": null }
  }
}
```

Each role's slot can instead hold a fully custom palette:

```json
{
  "themeConfig": {
    "admin": {
      "presetId": "indigo",
      "custom": {
        "primary": "#4f46e5",
        "secondary": "#312e81",
        "accent": "#818cf8",
        "background": "#ffffff",
        "text": "#1e1b4b",
        "mode": "light"
      }
    }
  }
}
```

15 built-in presets (12 light, 3 dark) ship in `PRESET_THEMES` — see `frontend/src/app/core/theme.ts` for the full list and ids.

**Personal dark mode toggle (Business/Enterprise plans only):** any signed-in user (regardless of role) gets a
"🌙 Dark Mode" toggle in the sidebar that flips their own screen between light and dark — same hues as whatever
their role's theme is, just re-derived for the opposite mode. This is a personal, client-side preference (stored per
user in `localStorage`, not written back to the organisation) and only appears when `organisation.plan` is
`business` or `enterprise`. The Appearance page has an equivalent per-role "Switch to Dark/Light" button so the
admin can set a role's *default* mode for everyone on that role.

### Invoice Templates & Logo

Tenant admins pick and customize their invoice/bill look from **Invoice Templates** (`/invoice-templates`, admin-only) —
10 built-in layouts (see `INVOICE_TEMPLATES` in `frontend/src/app/core/invoice-templates.ts` and the mirrored
`backend/src/services/invoiceTemplates.js`), each a real combination of font, header treatment, table style and
divider — not just a color swap. This is stored on `organisation.brandingConfig` and used by both the on-screen
print view and the downloaded PDF, so they always match:

```json
PUT /organisations/current
{
  "brandingConfig": {
    "logoUrl": "data:image/png;base64,...",
    "primaryColor": "#4f46e5",
    "invoicePrefix": "KLG",
    "invoiceTemplateId": "bold-header",
    "invoiceContent": {
      "showLogo": true,
      "showSignature": true,
      "showBankDetails": true,
      "showAmountInWords": true,
      "showGstBreakdown": true
    }
  }
}
```

The uploaded logo also replaces the "K" mark in the sidebar for everyone in that organisation.

**Custom Template.** Alongside the 10 presets, a tenant can build its own layout from scratch by setting
`invoiceTemplateId` to the reserved id `"custom"` and filling in `customInvoiceTemplate` — the same knobs a
built-in template has (font, header style, title alignment, table style, divider style, paper tone, plus
`compact`/`narrow` flags), picked one at a time from the Invoice Templates page's "Custom Template" section:

```json
{
  "brandingConfig": {
    "invoiceTemplateId": "custom",
    "customInvoiceTemplate": {
      "font": "Courier",
      "headerStyle": "sidebar",
      "titleAlign": "left",
      "tableStyle": "zebra",
      "dividerStyle": "dotted",
      "paperTone": "cream",
      "compact": true,
      "narrow": false
    }
  }
}
```

`resolveTemplate()` in `backend/src/services/invoiceTemplates.js` (mirrored by `resolveInvoiceTemplate()` in
`frontend/src/app/core/invoice-templates.ts`) substitutes this custom build whenever `invoiceTemplateId` is
`"custom"`, so the PDF and the on-screen preview stay in lockstep exactly like the built-in presets do.

## GST classification (Phase 5)

Invoices and credit notes carry four fields that decide the tax head and the GSTR-1
table they land in. All four default to the previous behaviour, so an existing
invoice computes exactly as it did before.

- `placeOfSupply` — the state whose tax applies. **Not** necessarily the buyer's
  registered state; they differ whenever goods go somewhere other than the billing
  address, and for most services. Falls back to the buyer's state when unset.
- `taxTreatment` — `taxable` (default) · `exempt` · `nil-rated` · `non-gst` ·
  `zero-rated`. These are five legally distinct things that appear in different
  tables of the return; `gstRate: 0` used to be the only way to express any of them.
- `supplyType` — `regular` (default) · `export-with-payment` ·
  `export-without-payment` · `sez-with-payment` · `sez-without-payment` ·
  `deemed-export`.
- `reverseCharge` — the recipient pays the tax directly, so the supplier reports the
  taxable value and collects nothing.
- `exportDetails` — `{countryCode, portCode, shippingBillNumber, shippingBillDate,
  currency, conversionRate, lutNumber}`, required by GSTR-1's EXP table.

Three rules `services/gstService.js#resolveTaxContext` applies, each of which the
obvious implementation gets wrong:

1. **An export or SEZ supply is inter-state by definition.** An SEZ unit in the
   supplier's own state still attracts IGST, which a plain `from !== to` comparison
   reports as CGST+SGST.
2. **Zero-rated *without* payment charges nothing** (LUT), while *with* payment
   charges IGST that is refunded later. Getting this backwards either overcharges the
   customer or understates the liability.
3. **Reverse charge collects no tax** but still reports the taxable value. Collecting
   it would tax the same supply twice.

The resolved classification is stored in `totals` (`taxTreatment`, `supplyType`,
`reverseCharge`, `zeroRated`, `taxCharged`, `taxNote`) so the document, the PDF and
both returns can never disagree — and so a zero-tax invoice can explain itself
instead of looking like a bug.

Changing any of these on an **issued** invoice is refused with `409 INVOICE_LOCKED`:
they change the tax charged, so they are not presentational.

## Purchases, vendors and ITC (Phase 5)

The inward half of the ledger. Without it there is no input tax credit, so the only
figure the product could produce was output tax — which is one side of a subtraction.

- `GET /purchases/vendors` · `POST /purchases/vendors` ·
  `PUT /purchases/vendors/:id` · `DELETE /purchases/vendors/:id` (archives) ·
  `POST /purchases/vendors/:id/restore`
  — `gstin` is optional, because an unregistered supplier is exactly the case that
  attracts reverse charge.
- `GET /purchases` — paginated; filters `status`, `vendorId`, `itc=eligible|ineligible`,
  `from`, `to`, `q` (bill number), `deleted=only`
- `POST /purchases` — `{vendorId, billNumber, billDate, items, itcCategory, reverseCharge, …}`.
  `billNumber` is the **supplier's** number; `{orgId, vendorId, billNumber}` is unique,
  so a second attempt is `409 DUPLICATE_PURCHASE` — entering a bill twice claims the
  same input credit twice.
- `PUT /purchases/:id` · `POST /purchases/:id/pay` · `DELETE /purchases/:id` ·
  `POST /purchases/:id/restore`
- `GET /purchases/itc-register?from=&to=` — claimable credit by category, plus the tax
  paid that is **not** claimable (a real cost that a claimable-only figure reports as
  zero)
- `GET /purchases/export.csv`

`itcCategory` is `inputs` · `capital-goods` · `input-services` · `ineligible` ·
`blocked` (section 17(5)). Not a boolean, because GSTR-3B reports capital goods and
input services on their own lines, and a blocked credit still has to stay on the
books as an expense.

## GST returns (Phase 5)

Period selection: `?month=YYYY-MM`, or `?from=&to=`. Defaults to the **last complete
month** — the one a person sitting down to file is filing.

- `GET /reports/gstr1` — the full section-wise return: `b2b`, `b2cl`, `b2cs`, `cdnr`,
  `cdnur`, `exp`, `nil`, `hsn`, `docIssued`, plus a summary that nets credit notes
- `GET /reports/gstr1/export.json` — the GSTN offline-utility file. Refused with
  `400 GSTIN_REQUIRED` when the filer's own GSTIN is unset, because the file is keyed
  by it and would otherwise fail validation at upload for an invisible reason
- `GET /reports/gstr1/export.csv` — every section in one file
- `GET /reports/gstr3b` — outward liability less ITC, **per tax head**, with
  carry-forward rather than cross-head set-off

Sectioning rules: B2B is any buyer with a GSTIN (SEZ and deemed exports included, via
`inv_typ`); B2CL is unregistered + inter-state + above `GST_B2CL_THRESHOLD`
(₹2,50,000); B2CS is everything else, aggregated by place of supply and rate; nil,
exempt and non-GST supplies are reported **only** under `nil` (reporting them in B2B
as well would double-count turnover); a cancelled invoice leaves the outward tables
but is still counted in `docIssued`, because an unexplained gap in a series is a red
flag in a return.

## E-invoicing (Phase 5)

Behind the `einvoicing` feature flag, which the platform console grants per tenant,
and `Organisation.eInvoicing.enabled` — turnover thresholds are measured on the
previous year's aggregate across all of a business's GSTINs, which this product
cannot see.

- `GET /reports/e-invoice/worklist` — documents that need an IRN and lack one. B2C
  invoices are excluded, so the list is not permanently non-empty
- `GET /reports/e-invoice/:id/check` — what the IRP would reject and why, before any
  network call, plus the built NIC schema-1.1 payload when the document is valid
- `POST /reports/e-invoice/:id/generate` — admin only
- `POST /reports/e-invoice/:id/cancel` — enforces the **24-hour** IRN cancellation
  window locally, and advises a credit note once it has passed

**With no provider configured**, generation returns `501 IRP_NOT_CONFIGURED` with the
validated payload attached, so it can be uploaded to the government portal by hand.
That refusal is deliberate: a mocked success stamping a made-up IRN on an invoice
would be indistinguishable from compliance until an audit. The provider adapter is
one function — `services/eInvoiceService.js#callIrp` — and needs `IRP_BASE_URL`,
`IRP_USERNAME`, `IRP_PASSWORD` and `IRP_CLIENT_ID`.

## Two-factor authentication (#7)

TOTP (RFC 6238), implemented on `node:crypto` with no added dependency — see
`utils/totp.js`, which is verified against all four of the RFC's SHA-1 test vectors.

- `POST /auth/mfa/setup` — **stages** a secret and returns it plus an `otpauth://`
  URI. Nothing about sign-in changes yet: a secret that switched MFA on immediately
  would lock out anyone whose authenticator was misconfigured
- `POST /auth/mfa/enable` — `{code}`. Confirms with a live code and returns the
  recovery codes **once** (only hashes are stored)
- `POST /auth/mfa/disable` — `{password, code}`. Both, because a stolen password must
  not be enough to remove the control that exists because passwords get stolen
- `POST /auth/mfa/backup-codes` — `{code}`; invalidates the previous set
- `POST /auth/mfa/verify` — `{mfaToken, code}`; completes a challenged sign-in

`POST /auth/login` returns `{mfaRequired: true, mfaToken}` and **no session token**
when a second factor is due. That is the point: there is no window in which a token
exists for a half-authenticated user, and no route that has to remember to check a
"needs MFA" flag. A consumed TOTP counter is recorded, so the same six digits cannot
be replayed inside their 30-second step. Failures count towards the same account
lockout a wrong password does.

Secrets are AES-256-GCM encrypted at rest (`MFA_ENCRYPTION_KEY`, falling back to a
key derived from `JWT_SECRET` — rotating `JWT_SECRET` therefore invalidates every
enrolled authenticator).

`REQUIRE_SUPERADMIN_MFA` (default: on in production) makes enrolment mandatory for
platform accounts while still permitting the enrolment routes, so it is a requirement
rather than a lockout. `SUPERADMIN_IP_ALLOWLIST` accepts comma-separated addresses or
IPv4 CIDR blocks; empty means no restriction.

## Email verification (#52)

- `POST /auth/verify-email` — `{token}`; unauthenticated, because the link is
  frequently opened on a different device from the one that registered
- `POST /auth/resend-verification` — authenticated

Enforced only when a mail provider is configured (`EMAIL_VERIFICATION_ENFORCED`,
defaulting to `Boolean(SENDGRID_API_KEY)`): requiring a verification that cannot be
sent would make a local install unusable. When enforced, an unverified account can
read and export but not write (`403 EMAIL_UNVERIFIED`).

## Recycle bin (#37)

`DELETE` on a client, item, vendor, purchase or **draft** invoice now sets `deletedAt`
instead of removing the row, and `POST /<resource>/:id/restore` brings it back. List
endpoints accept `?deleted=only` for the bin and `?deleted=all`. Purged for real after
`SOFT_DELETE_GRACE_DAYS` (30) by the maintenance job.

An issued invoice is still not deletable at all — under GST it is reversed by a credit
note, and hiding it would be the same compliance problem in a nicer wrapper. A deleted
draft **keeps its invoice number**, so a restore cannot collide with a number the
atomic counter has since handed out.

## Email delivery (#58)

Every attempt is written to `EmailLog`, including the outcomes that were previously
silent (`skipped` when no provider is configured, `suppressed` when the address is on
the list). `sent` and `delivered` are deliberately different statuses: the gap between
them is where every real delivery problem lives.

- `POST /webhooks/sendgrid/events` — ingests delivery, bounce, complaint and open
  events. Requires the `x-klogubizz-webhook-secret` header to match
  `SENDGRID_WEBHOOK_SECRET`; an open endpoint here is one anyone could use to stop a
  competitor's mail by posting a fabricated bounce. Returns `503
  WEBHOOK_NOT_CONFIGURED` when no secret is set
- `GET /superadmin/email/deliverability?days=30` — sent/delivered/bounced by flow and
  by tenant, plus whether the provider and the webhook are configured at all
- `GET /superadmin/email/suppressions` · `POST /superadmin/email/suppressions/release`

A **hard** bounce or a complaint suppresses the address; a **soft** bounce (a full
mailbox) does not, because permanently cutting off a customer whose inbox was briefly
full is the obvious wrong answer.

## Data portability and erasure (#62)

- `GET /organisations/current/data-rights` — record counts and any pending deletion
- `GET /organisations/current/export` — the whole tenant as one JSON document,
  streamed with back-pressure. Password hashes and MFA secrets are excluded: an export
  lands in a downloads folder
- `POST /organisations/current/delete-account` — `{confirmName, password, reason?}`.
  Owner only, password-confirmed, type-the-name. Schedules deletion after
  `SOFT_DELETE_GRACE_DAYS`; the account becomes read-only (`cancelled`) and the export
  keeps working throughout
- `POST /organisations/current/cancel-deletion`

The audit entry outlives the organisation — `AuditLog` is excluded from the cascade —
so there is a surviving record that the erasure was requested and by whom.

## Receivables, stock and activity (Phase 6a)

All of this was computable from data that already existed, or already recorded and simply
never exposed.

### Receivables (2.4 #28, #29, #31, #33)

- `GET /reports/ageing` — AR ageing in 0-30/31-60/61-90/90+ buckets, per customer.
  Bucketed from `dueDate` at read time, so the figures are right the instant an invoice
  falls due rather than waiting for the hourly sweep. Customers are sorted by their
  **worst** overdue invoice, not their largest balance — the report is read to decide who
  to chase
- `GET /reports/ageing/export.xlsx` — summary and per-customer detail as two sheets in one
  workbook
- `GET /reports/statement/:clientId?from=&to=` — invoices, credit notes and payments
  interleaved with a running balance, and a real **opening balance** for the period
- `GET /reports/statement/:clientId/export.xlsx`
- `GET /reports/collections?days=90` — DSO, collection efficiency, average days to pay and
  the payment-method mix. Each is `null` rather than `0` when there is no data, because a
  DSO of zero reads as "we collect instantly"
- `GET /reports/sales-breakdown?from=&to=` — by item and by customer
- `GET /reports/invoices/export.xlsx` — the invoice register, cursor-streamed

DSO is `outstanding ÷ invoiced × days`, not an average of invoice-to-payment gaps: the
average silently ignores invoices that were never paid at all, which is where a
collections problem actually hides. `averageDaysToPay` is reported alongside it, over
settled invoices only, because the two say different things.

### Stock (2.5 #37–#39)

`Item.stockQty` and `reorderLevel` existed from the first version and nothing ever wrote
to them. Every change is now an immutable `StockMovement` row, and `stockQty` is a cached
balance the ledger can rebuild.

- `GET /reports/stock/ledger` — paginated, filterable by `itemId`, `reason`, `q`
- `GET /reports/stock/low` — items at or below their reorder level. Only items that
  actually have a level set: a missing level means "untracked", not zero
- `POST /reports/stock/:id/adjust` — `{quantity, note, reason?}`; admin only. A **note is
  mandatory** — an unexplained adjustment is what made the old hand-edited number
  impossible to reconcile
- `POST /reports/stock/:id/recompute` — rebuilds the cached balance from the ledger; the
  repair path for a lost increment

Movements are signed (a sale is negative). Documents move stock automatically: issuing an
invoice takes it out, cancelling puts it back, a credit note returns **only the quantities
on the note**, a purchase brings it in. Three deliberate refusals: a **draft** moves
nothing, a **service** is never tracked, and a line matching no catalogue item moves
nothing rather than guessing — decrementing the wrong product is a balance that is wrong
in a way nobody can trace. The response reports `{moved, unmatched, lowStock}` so an
unmatched line is visible rather than assumed.

### Tenant activity log (2.6 #50)

- `GET /reports/activity` — admin only, tenant-scoped, filterable by `action` prefix,
  `entity` and date range

`AuditLog` has recorded `orgId` since Phase 1 and was exposed only to the platform, so an
owner could not see who on their own team changed what. Platform-internal ids are stripped;
support access appears as `bySupport: "KloguBizz support (name)"` — the visible half of the
data-access log, and what makes impersonation defensible rather than merely audited
internally.

## Sending an invoice (2.3 #19)

- `POST /invoices/:id/send` — `{to?, cc?, message?}`

Attaches the **same** `renderInvoicePdf` output the download produces, so the customer's
copy is byte-identical to the tenant's preview. `replyTo` is the organisation's own address
so a customer's reply is not swallowed by our transactional sender. Refused on a draft
(`409 INVOICE_DRAFT`) and when there is no address (`400 NO_RECIPIENT`). The response
reports what actually happened — with no provider configured nothing was sent, and it says
so rather than returning a blanket success.

## Organisation invoice defaults (2.3 #24–#26)

`brandingConfig.invoiceDefaults` on `PUT /organisations/current`:

```json
{
  "bankName": "", "accountName": "", "accountNumber": "", "ifsc": "", "branch": "",
  "upiId": "", "signatureUrl": "<data URI>", "signatoryName": "",
  "termsAndConditions": "", "defaultNotes": ""
}
```

These make three previously-decorative `invoiceContent` toggles real: `showBankDetails`
rendered an empty block because the details lived only on the invoice and had to be retyped
each time; `showSignature` drew a line with nothing above it; and there was no default
terms text anywhere. Per-invoice `bankDetails` still wins when set. Merged by dot path like
the rest of `brandingConfig`, so an unrelated save cannot blank them — and `signatureUrl`
is base64 image data, so send it only when it actually changed.

The UPI id is printed as **text, not a QR code**: a payment code whose scannability this
product cannot verify is a payment instruction that might silently not work.

## Super Admin API

Every route below requires `role: 'superadmin'` **and** a capability, resolved from
the account's `platformRole` (`owner` / `billing` / `support` / `auditor`). See
`backend/src/middleware/platformRoleMiddleware.js` for the mapping; an account with
no `platformRole` stored resolves to `owner`, so nothing changed for a platform
account that predates the field. A refusal is `403 { code: 'PLATFORM_CAPABILITY_REQUIRED' }`.

- `GET /superadmin/me` — this operator's `platformRole` and capability list, so the console can render only what it can use

### Tenants

- `GET /superadmin/overview` — platform counts, `mrr`/`arr`/`payingOrgs`, and `gmv`
  (`totalRevenue` is retained as an alias of `gmv` for older clients — it is *tenant*
  collections, not platform revenue)
- `GET /superadmin/organisations` — paginated, decorated with per-org user/invoice counts, owner and subscription
- `POST /superadmin/organisations` — creates a tenant + admin user, returns a one-time temp password
- `GET /superadmin/organisations/:id` — the full drill-down: users, subscription history, usage vs limits,
  document counts, money, activity and health score, resolved feature flags, and a recent timeline.
  **Audited** (`superadmin.tenant_viewed`) — reading a customer's records leaves a record
- `GET /superadmin/organisations/:id/users`
- `GET /superadmin/organisations/:id/invoices` — paginated, read-only, for support
- `GET /superadmin/organisations/:id/timeline` — paginated audit entries for this tenant
- `PUT /superadmin/organisations/:id`
- `DELETE /superadmin/organisations/:id` — cascade delete; `owner` only
- `POST /superadmin/organisations/:id/status` — `{ status, reason }`. A reason is **required** for
  `suspended`/`cancelled` and is shown to the tenant; sessions are revoked
- `PUT /superadmin/organisations/:id/limits` — `{ userLimit, invoiceLimit, note }`; `null` means "use the plan"
- `PUT /superadmin/organisations/:id/flags` — `{ flags: { … } }`; unknown keys and non-booleans are dropped
- `POST /superadmin/organisations/:id/trial` — `{ days }` (extends from the current end date), `{ endsAt }`, or `{ end: true }`
- `PUT /superadmin/organisations/:id/notice` — in-app banner for this tenant; empty message clears it
- `PUT /superadmin/organisations/:id/support` — internal account context; never returned to the tenant
- `POST /superadmin/organisations/:id/force-logout` — revokes every session in the org
- `POST /superadmin/organisations/:id/impersonate` — `{ userId?, readOnly = true, reason }`. Returns a
  30-minute token. A reason of 5+ characters is required. See below

### Tenant users (support actions)

- `PUT /superadmin/users/:id` — `{ role?, status? }`; refuses the org owner and any platform account
- `POST /superadmin/users/:id/reset-password` — `{ mode: 'link' | 'temporary' }`. Both revoke every session;
  `temporary` returns the password once, `link` never reveals one
- `POST /superadmin/users/:id/unlock` — clears a brute-force lockout
- `POST /superadmin/users/:id/force-logout`

### Metrics & operations

- `GET /superadmin/metrics/summary` — revenue (MRR/ARR/ARPA/GMV, by plan), growth, engagement, volume
- `GET /superadmin/metrics/series?days=30` — the daily rollup, with today computed live
- `GET /superadmin/metrics/attention` — at-risk tenants and trials expiring, as actionable lists
- `GET /superadmin/metrics/adoption?days=30` — per-feature tenant adoption, including features nobody used
- `POST /superadmin/metrics/rebuild` — `{ days }`; recomputes the rollup (idempotent)
- `GET /superadmin/system/health` — database state and size, collection counts, per-instance request
  latency/error rate, and whether email and billing are configured
- `PUT /superadmin/broadcast` — a banner for every tenant; empty message clears it

### Platform accounts

- `GET /superadmin/platform-users`
- `PUT /superadmin/platform-users/:id/role` — `owner` only. Refuses self-demotion and the last owner

### Configuration

- `GET /superadmin/plans` · `POST /superadmin/plans` · `PUT /superadmin/plans/:code`
- `GET /superadmin/masters` — GST rates, HSN codes, payment methods, units, plus reminders
- `PUT /superadmin/masters/:type` — diff-based save for one type (`gstRate`, `hsn`, `paymentMethod`, `unit`)
- `PUT /superadmin/reminders/:id`
- `GET /superadmin/settings` · `PUT /superadmin/settings/:key` — validated per key
  (`branding`, `email`, `receipt`, `templateConfig`, `defaultInvoiceTemplate`, `featureFlags`, `platformNotice`)

### Audit & security

- `GET /superadmin/audit-logs` — filter by `orgId`, `actorId`, `action` (prefix), `entity`, `from`, `to`; paginated
- `GET /superadmin/audit-logs/export.csv` — the whole filtered set, streamed
- `GET /superadmin/security/logins?outcome=success|failure&ip=` — login history, with origin IP and device
- `GET /superadmin/security/alerts?hours=24` — derived brute-force, bulk-deletion, heavy-export,
  off-hours-platform-action and support-session findings, returned **with the thresholds that produced them**

## Impersonation ("view as tenant")

`POST /superadmin/organisations/:id/impersonate` returns a token that looks like an
ordinary tenant token but carries a signed `imp` claim. What that claim buys:

- **30 minutes**, in the token's own `exp`.
- **The customer's sessions are untouched.** `sessionVersion` is read, never bumped —
  bumping it would sign the customer out the moment support looked at their account.
- **Read-only unless opted out.** A write in a read-only session is
  `403 { code: 'IMPERSONATION_READ_ONLY' }`.
- **Credential and ownership changes are always refused**, even read-write:
  `/auth/change-password` and `/organisations/current/transfer-ownership` return
  `403 { code: 'IMPERSONATION_FORBIDDEN' }`.
- **A platform account can never be the target.**
- **Suspension still applies.** A support session cannot write to a suspended tenant.
- **Attribution.** Every audit entry made during the session carries `impersonatorId`
  and `impersonatorName` alongside the acting user, and every mutating request is
  additionally recorded as `impersonation.write`.
- **Not counted as tenant activity**, so the at-risk list is not skewed by support
  looking at exactly the accounts it is worried about.

`GET /auth/me` reports `impersonation: { by, byName, readOnly, expiresAt }` — the token
deliberately looks ordinary, so the server is the only trustworthy source for
"am I in a support session".

## Session context

`GET /auth/me` returns, besides `user` and `organisation`:

- `flags` — effective feature flags for this tenant (per-org override → platform default → built-in)
- `notices` — live operator-authored banners (`scope: 'platform' | 'organisation'`), expiry filtered server-side
- `impersonation` — as above, or `null`

## Webhooks

- `POST /webhooks/razorpay`
