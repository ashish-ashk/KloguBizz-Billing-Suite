# Development Workflow

## Daily Start

```powershell
cd C:\Users\Ashish\Desktop\KloguBizz\database
docker compose up -d

cd ..\backend
npm run dev

cd ..\frontend
npm start
```

## Useful Checks

```powershell
cd backend
npm test

cd ..\frontend
npm run build
```

## Deployment Targets

- Backend: Render
- Frontend: Vercel
- Database: MongoDB Atlas
- Email: SendGrid
- Payments: Razorpay

## Notes

- Invoice PDFs are generated with `pdfkit` (pure JS, no Chromium/native deps) — safe on
  Render's free tier, unlike headless-browser PDF renderers.
- CSV exports (invoices, payments, GST summary) use a small dependency-free CSV writer
  (`backend/src/services/csvService.js`).
- Tenant admins customize the whole app's look from `/appearance` — see
  `frontend/src/app/core/theme.ts` for the palette-derivation engine and the 15
  built-in presets.

## Domain Layout

- `app.yourdomain.com`: Angular frontend
- `api.yourdomain.com`: Express backend
- `yourdomain.com`: optional marketing site
