# KloguBizz Database

Local development uses MongoDB in Docker.

```powershell
docker compose up -d
```

Connection string:

```text
mongodb://localhost:27017/klogubizz
```

Seed data is managed by the backend:

```powershell
cd ..\backend
npm run seed
```

## Collections

- `organisations`: tenant companies using KloguBizz.
- `users`: all platform logins, including Super Admin and tenant users.
- `clients`: customer contacts for each organisation.
- `invoices`: GST invoices with server-calculated totals.
- `payments`: payment records linked to invoices.
- `subscriptions`: active/trial/cancelled subscription state per organisation.
- `plans`: Starter, Growth, Business, and Enterprise plan definitions.
- `reminders`: global reminder rules for invoice email follow-ups.
- `invoiceTemplates`: global invoice template choices.
- `auditLogs`: platform and tenant activity history.

## Tenant Isolation

Every tenant-owned document includes `orgId`. Backend middleware derives `orgId`
from the authenticated user and applies it to list, create, update, and delete
operations.

## Production

Use MongoDB Atlas for production. The same collections and indexes apply; update
`backend/.env` with the Atlas `MONGO_URI`.
