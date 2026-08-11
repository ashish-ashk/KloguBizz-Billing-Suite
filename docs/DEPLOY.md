# Deploying KloguBizz

One branch, one push. There is no CI, no pipeline and no YAML to run.

> **Deploying for the first time, or going live with paying customers?**
> Read [LAUNCH-READINESS.md](LAUNCH-READINESS.md) first. It covers the one-way
> doors — the encryption key that must be set before anyone enrols in 2FA, the
> two migrations without which the application does not work, and the four
> integrations that have never been run against a real provider.

```
git add -A
git commit -m "what changed"
git push
```

That is the whole deploy. Both hosts watch `master` and rebuild themselves:

| Part | Host | Builds from | Config |
|---|---|---|---|
| Frontend | Vercel | `frontend/` | `frontend/vercel.json` |
| Backend | Render | `backend/` | Render dashboard |

---

## Before you push: one command per package

CI used to run the tests and the linter on every push and block a merge if either
failed. It has been removed deliberately in favour of the simpler flow above —
which means **the check is now yours to run**, and it is one command:

```bash
cd backend  && npm run check     # eslint + 485 tests (needs MongoDB running)
cd frontend && npm run check     # eslint + a production build
```

`npm run check` is the whole quality gate. If both pass, the push is safe.

The backend tests need MongoDB on `127.0.0.1:27017`. **They skip themselves when
none is reachable, and a skip looks exactly like a pass** — so if you see far
fewer than 247 tests, MongoDB is not running and nothing was actually verified.
Start it (it runs as the `MongoDB` Windows service) and run it again.

---

## After a deploy that changes the database

Migrations are not automatic. When a release adds one, run it once against
production:

```bash
cd backend
npm run migrate:status    # what is pending
npm run migrate           # apply it
```

It is safe to run when nothing is pending — applied versions are recorded, so a
second run does nothing. There are currently 7 migrations; `007` is a no-op
unless object storage is configured (see below).

---

## Environment variables

Set these in the **Render dashboard**, not in a file. The API refuses to boot in
production on a missing or default secret rather than serving traffic it cannot
protect — so if the deploy fails to start, read the log: it names the variable.

**Required**

| Variable | Notes |
|---|---|
| `NODE_ENV` | `production` |
| `MONGO_URI` | Atlas connection string |
| `JWT_SECRET` | 32+ random characters. Rotating it signs everyone out **and invalidates every enrolled authenticator** (MFA secrets are encrypted with a key derived from it unless `MFA_ENCRYPTION_KEY` is set). |
| `FRONTEND_URL` | The Vercel URL. Comma-separate to allow more than one origin (apex + www). |

**Strongly recommended**

| Variable | Without it |
|---|---|
| `SENDGRID_API_KEY` | No invite, reset, reminder or invoice email is sent — and email verification is not enforced, because it cannot be. |
| `RAZORPAY_KEY_ID` / `_KEY_SECRET` | Paid plan changes are refused rather than activated for free. |
| `RAZORPAY_WEBHOOK_SECRET` | With Razorpay keys set, a default here is a **boot failure** — a forged webhook could grant a free enterprise plan. |
| `MFA_ENCRYPTION_KEY` | MFA still works, but its secrets are tied to `JWT_SECRET`, so rotating that breaks every authenticator. |
| `SENDGRID_WEBHOOK_SECRET` | Bounces and complaints are not ingested, so the suppression list never fills. |

**Image storage** — see `backend/src/services/storageService.js`.

`STORAGE_DRIVER` defaults to `inline`, which stores uploaded logos as base64
inside MongoDB. That is safe but inflates documents. For a real deployment set:

```
STORAGE_DRIVER=s3
S3_BUCKET=…
S3_ACCESS_KEY_ID=…
S3_SECRET_ACCESS_KEY=…
S3_REGION=auto                  # 'auto' for Cloudflare R2
S3_ENDPOINT=…                   # R2/B2/MinIO only; omit for real AWS S3
S3_FORCE_PATH_STYLE=true        # R2 and MinIO need this
```

Then run `npm run migrate` to move existing images out of the database, and check
`/api/v1/superadmin/system/health` reports `storage.driver: s3`.

**Do not set `STORAGE_DRIVER=local` on Render.** Its filesystem is ephemeral, so
every uploaded logo is lost on the next deploy — invisibly, until a customer
notices their invoices lost their branding. The config check warns about this at
boot.

---

## Verifying a deploy actually worked

```
GET  https://<api-host>/health     → 200, process is up
GET  https://<api-host>/ready      → 200 only when MongoDB is connected
```

`/ready` is the one that matters: it returns 503 when the database is
unreachable, so a load balancer takes the instance out instead of routing
traffic to something that 500s on every query.

Then, signed in as the platform owner, open **Super Admin → System Health**. It
reports the database, which storage driver is live, whether image resizing is
available, and whether email and Razorpay are configured at all — which is the
first question when "reminders aren't arriving".

---

## Seeding

`npm run seed` **erases every organisation, invoice, payment and client** and
inserts sample data. It refuses to run against a production database unless
`ALLOW_DESTRUCTIVE_SEED=true` is set, and refuses entirely while
`SUPER_ADMIN_PASSWORD` is still the documented default. Use it on a local
database only.
