# KloguBizz

KloguBizz is a MEAN-stack GST billing SaaS with a separate Angular frontend,
Express backend, and local MongoDB database setup.

## Features

**Tenant app** (admin / accountant / viewer roles)

- Dashboard — revenue, pending & overdue metrics, 12-month revenue chart, top clients
- Invoices — multi-line items, live CGST/SGST vs IGST calculation, filter tabs, search,
  mark paid, duplicate, delete with confirmation, print-ready TAX INVOICE view,
  real PDF download, CSV export
- Bill Generator — B2B registered / unregistered / B2C modes, per-rate GST breakdown,
  discount, save as invoice
- Payments — collection stats, payment tracker, history, email reminders (single or
  bulk "Remind All"), record full/partial payments (auto status update), CSV export
- Reports — GST filing summary by month and by rate slab, CSV export
- Clients — CRUD with GSTIN validation and GST state codes
- Users & Roles — invite/edit/remove team members, permission matrix, plan seat limits
- Subscription — plan cards with monthly/yearly billing, usage meters, upgrade/cancel
- **Appearance** (admin-only) — sets a theme **per role**: admin, accountant and
  viewer can each see a different look. 15 built-in presets (12 light, 3 dark) plus a
  fully custom color builder (primary/secondary/accent/background/text), with a full
  mini-app live preview (sidebar, topbar, cards, table, buttons) before saving. A
  persistent top bar ties it together with a dedicated 🌙/☀ toggle. **Business/
  Enterprise plans** additionally get a personal dark mode preference for every user,
  any role, on top of whatever theme their role was given.
- **Invoice Templates** (admin-only) — 10 authentic, business-real invoice/bill layouts
  (Classic Corporate, Modern Minimal, Bold Header, Elegant Serif, Two-Column Compact,
  Tech Startup, Gradient Accent, Professional Blue, Creative Bold, Simple Receipt) —
  each a genuine combination of font, header treatment, table style and divider, not
  just a color swap. Upload a company logo (shown in the sidebar and every invoice
  header) and toggle what appears on the document, with an instant live preview using
  a sample invoice. The chosen template renders identically in the on-screen preview
  and the downloaded PDF. A **Custom Template** builder sits alongside the 10 presets —
  pick your own font, header style, title alignment, table style, divider and paper
  tone to build a layout from scratch.

**Super Admin control panel** (`/super-admin`)

- Organizations — create/suspend/delete tenants with cascade, per-org counts
- Masters — GST rate slabs, HSN/SAC codes, payment methods, units, state codes
- Invoice Templates — platform-wide default template gallery, content toggles, format & accent color
- Reminders & Receipts — trigger schedule, email templates, global email settings
- Subscription Plans — pricing/limits editor, plan overrides, trial activation
- Branding — platform logo/favicon upload, brand colors with live preview (shown on the
  login/register screens via the public branding endpoint)
- Profile & Security — password change with strength meter, platform audit log

## Project Layout

```text
frontend/   Angular app for customers and Super Admin users
backend/    Node.js + Express API
database/   Local MongoDB Docker setup, indexes, seeds, and docs
```

## Local URLs

- Frontend: http://localhost:4200
- Backend API: http://localhost:5000/api/v1
- Backend health: http://localhost:5000/health
- MongoDB: mongodb://localhost:27017/klogubizz

## Quick Start

1. Start MongoDB:

```powershell
cd database
docker compose up -d
```

2. Install and seed backend:

```powershell
cd ..\backend
npm install
copy .env.example .env
npm run seed
npm run dev
```

3. Install and start frontend:

```powershell
cd ..\frontend
npm install
npm start
```

## Seed Login

- Super Admin: `superadmin@klogubizz.local` / `SuperAdmin@123`
- Tenant Admin: `admin@techsoft.local` / `Admin@123`

## Notes

- The frontend never connects to MongoDB directly.
- Tenant-owned collections include `orgId`.
- Invoice totals are calculated by the backend.
- Replace `.env` secrets before using this outside local development.
