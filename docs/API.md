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
