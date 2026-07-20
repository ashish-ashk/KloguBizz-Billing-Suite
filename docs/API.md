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

- `GET /superadmin/overview` — platform-wide counts + revenue
- `GET /superadmin/organisations` — decorated with per-org user/invoice counts and admin contact
- `POST /superadmin/organisations` — creates a tenant + admin user, returns a one-time temp password
- `PUT /superadmin/organisations/:id`
- `DELETE /superadmin/organisations/:id` — cascades: deletes all users/clients/invoices/payments/subscriptions for that org
- `GET /superadmin/plans`
- `POST /superadmin/plans`
- `PUT /superadmin/plans/:code`
- `GET /superadmin/masters` — GST rates, HSN codes, payment methods, units, plus reminders/templates
- `PUT /superadmin/masters/:type` — bulk-replaces all masters of one type (`gstRate`, `hsn`, `paymentMethod`, `unit`)
- `PUT /superadmin/reminders/:id`
- `PUT /superadmin/templates/:id`
- `GET /superadmin/settings` — global key/value settings (branding, email, template config, receipts)
- `PUT /superadmin/settings/:key`
- `GET /superadmin/audit-logs?limit=50`

## Webhooks

- `POST /webhooks/razorpay`
