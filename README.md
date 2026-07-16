# Reusable App Template

A batteries-included **Next.js starter** you can copy for new projects. It ships
with self-hosted authentication, user accounts, role-based access control (RBAC),
profile & settings, and an audit log — so every new project starts from a working,
secure baseline instead of from scratch.

## Features

- **Authentication** — email + password, hashed with bcrypt, database-backed
  sessions (opaque token in an httpOnly cookie; no JWT, revocable).
- **Registration + email verification** — new users verify via an emailed link
  before they can sign in.
- **Password reset** — time-limited, single-use reset links.
- **RBAC** — roles carry a set of permission keys; a central permission catalog
  and server-side guards protect every route and action.
- **Admin user management** — list/search, create, edit, assign roles,
  activate/deactivate.
- **Roles & permissions UI** — toggle the permissions granted by each role.
- **Profile & settings** — users edit their own profile and change their password.
- **Audit log** — security-relevant events (logins, role changes, user edits) are
  recorded and viewable by admins.

## Tech stack

- [Next.js](https://nextjs.org/) (App Router) + TypeScript
- [Prisma](https://www.prisma.io/) ORM + PostgreSQL
- Tailwind CSS with a small set of in-repo UI primitives
- Zod for validation, Nodemailer for email
- Vitest (unit) + Playwright (e2e)

## Quick start

Requirements: Node 18+, Docker (for Postgres) or an existing PostgreSQL instance.

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# .env.example is pre-filled with Supabase-style URLs for production reference.
# For LOCAL development, point both URLs at the docker-compose database and set a
# secret, i.e. in .env:
#   DATABASE_URL="postgresql://app:app@localhost:5432/app?schema=public"
#   DIRECT_URL="postgresql://app:app@localhost:5432/app?schema=public"
#   SESSION_SECRET="<any long random string>"

# 3. Start PostgreSQL (or point DATABASE_URL at your own)
docker compose up -d

# 4. Create the schema and seed roles + an admin user
npm run db:migrate
npm run db:seed

# 5. Run the app
npm run dev
```

Open http://localhost:3000 and sign in with the seeded admin credentials from
`.env` (`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`, default
`admin@example.com` / `admin12345`).

### Email in development

If no SMTP server is configured (blank `SMTP_HOST`), verification and password-reset
links are **printed to the server console** instead of being emailed, so the template
works with zero mail setup. Configure the `SMTP_*` / `MAIL_FROM` variables to send
real email.

## Scripts

| Script                | Purpose                                    |
| --------------------- | ------------------------------------------ |
| `npm run dev`         | Start the dev server                       |
| `npm run build`       | Production build (runs `prisma generate`)  |
| `npm run start`       | Start the production server                |
| `npm run typecheck`   | TypeScript check                           |
| `npm run lint`        | ESLint                                     |
| `npm run db:migrate`  | Create/apply a dev migration               |
| `npm run db:deploy`   | Apply migrations (production/CI)           |
| `npm run db:seed`     | Seed roles + admin user                    |
| `npm run db:release`  | Migrate then seed (used by Fly on deploy)  |
| `npm run db:studio`   | Open Prisma Studio                         |
| `npm run test`        | Run unit tests (Vitest)                    |
| `npm run test:e2e`    | Run end-to-end tests (Playwright)          |

Before running e2e tests for the first time, install the browser once:
`npx playwright install chromium`.

## Deploying to Fly.io + Supabase

This template is set up to be hosted on [Fly.io](https://fly.io) with
[Supabase](https://supabase.com) as the managed PostgreSQL database. The container
image (`Dockerfile`), `fly.toml`, automatic migrations, a health check, and a CI
deploy workflow are all included.

The Fly app has already been created via **Fly Launch** — it is named **`codesigning`**
(region `ams`), and `fly.toml` is configured to build from the `Dockerfile`. What
remains are the one-time actions below.

> **One-time actions checklist** (details in the numbered steps):
>
> 1. Create a Supabase project and copy its two connection strings.
> 2. `fly secrets set …` — database URLs, `SESSION_SECRET`, `APP_URL`, and the
>    `SEED_ADMIN_*` values.
> 3. `fly deploy` (or push to `main` once CI is enabled). Migrations **and** the
>    initial admin/roles seed run automatically as part of the deploy — you do
>    **not** need to seed manually.
> 4. *(Optional, for automatic deploys)* add a `FLY_API_TOKEN` GitHub secret.
>
> The database URLs, `APP_URL`, and `SEED_ADMIN_*` must point at Supabase / your
> real app — **not** `localhost`. Localhost values only belong in your local
> `.env` for development; they are never shipped to Fly (`.env` is git-ignored and
> excluded via `.dockerignore`).

### 1. Create the Supabase database and get the two connection strings

1. Go to [supabase.com](https://supabase.com), sign in, and click **New project**.
2. Fill in:
   - **Name** — anything (e.g. `codesigning`).
   - **Database Password** — click *Generate a password* and **save it somewhere
     safe**. This is the password that goes into both connection strings below. (If
     you lose it, you can set a new one later under **Project Settings → Database →
     Database password → Reset**.)
   - **Region** — pick the one closest to your Fly region (`ams` → *West EU
     (Ireland)* or *Central EU (Frankfurt)* is fine).
3. Click **Create new project** and wait ~2 minutes until it finishes provisioning.
4. Click the green **Connect** button in the top bar (or go to **Project Settings →
   Database**). Under **Connection string → ORMs** (or the "Connection pooling"
   section) you'll find the two strings you need. Both contain your project
   reference (`postgres.<ref>`) and the region host:

   - **Transaction pooler**, port **`6543`** → your **`DATABASE_URL`**.
     Add `?pgbouncer=true` at the end.
   - **Session pooler / Direct connection**, port **`5432`** → your **`DIRECT_URL`**.

   After substituting your saved password they look exactly like this:

   ```
   DATABASE_URL=postgresql://postgres.abcd1234wxyz:MyRealPassword@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true
   DIRECT_URL=postgresql://postgres.abcd1234wxyz:MyRealPassword@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
   ```

   > **Important:** replace the `[YOUR-PASSWORD]` placeholder (and any leftover
   > `localhost` URL) with your **real** Supabase password. A placeholder or
   > localhost URL here is the #1 reason seeding fails. The app uses the pooled
   > `DATABASE_URL` at runtime and the direct `DIRECT_URL` for migrations + seeding
   > (see `prisma/schema.prisma`).

### 2. Install flyctl and log in

Install the Fly CLI (only needed once per machine):

```bash
# macOS / Linux
curl -L https://fly.io/install.sh | sh
# Windows (PowerShell): iwr https://fly.io/install.ps1 -useb | iex

fly auth login          # opens a browser to log in
fly status              # confirms you can see the `codesigning` app
```

The app already exists (`codesigning`), so `fly launch` is **not** needed. Run all
`fly` commands from the project root so it picks up `app` and `primary_region` from
`fly.toml`. (To deploy under a different name instead, change `app` in `fly.toml`
and run `fly apps create <name>`.)

### 3. Set the secrets on Fly

These become environment variables inside the container at runtime and during the
release step (migrations + seeding). Replace every `<...>` with your real values —
paste the two Supabase strings from step 1, and choose a **strong**
`SEED_ADMIN_PASSWORD` (this becomes your first login):

```bash
fly secrets set \
  DATABASE_URL="postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true" \
  DIRECT_URL="postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres" \
  SESSION_SECRET="$(openssl rand -base64 32)" \
  APP_URL="https://codesigning.fly.dev" \
  SEED_ADMIN_EMAIL="you@yourdomain.com" \
  SEED_ADMIN_PASSWORD="<a-strong-password>" \
  SEED_ADMIN_NAME="Administrator"
```

What each one is for:

| Secret | Purpose |
| --- | --- |
| `DATABASE_URL` | Pooled connection the running app uses for queries (port 6543). |
| `DIRECT_URL` | Direct connection used for migrations + seeding (port 5432). |
| `SESSION_SECRET` | Signs/derives session values. The `openssl` command generates a random one for you. |
| `APP_URL` | Public URL, used to build links in verification/reset emails. Use your `*.fly.dev` domain (or a custom domain once you add one). |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` / `SEED_ADMIN_NAME` | The first admin account created by the seed. |

Optional — to send **real** verification/reset emails instead of logging them to the
server console, also set your SMTP details:

```bash
fly secrets set \
  SMTP_HOST="smtp.yourprovider.com" SMTP_PORT="587" SMTP_SECURE="false" \
  SMTP_USER="<smtp-user>" SMTP_PASSWORD="<smtp-pass>" \
  MAIL_FROM="No Reply <no-reply@yourdomain.com>"
```

Verify what's set with `fly secrets list` (it shows names + digests, never values).
Note: each `fly secrets set` triggers a new deploy automatically.

### 4. Deploy — migrations + seeding run automatically

```bash
fly deploy
```

During the deploy, the `release_command` in `fly.toml` runs `npm run db:release` in
a temporary machine (with your secrets available), which:

1. applies the database migrations (`prisma migrate deploy`), then
2. seeds the roles (ADMIN/MANAGER/USER) and the initial admin from `SEED_ADMIN_*`.

Both use the direct `DIRECT_URL` connection and are idempotent, so re-deploying is
safe. As a safety measure, seeding **refuses to run in production** unless a
non-default `SEED_ADMIN_PASSWORD` is set — so make sure step 3 is done first.

Watch/verify the deploy:

```bash
fly logs        # stream logs; look for the release step running db:release
fly status      # machine + health-check state (checks GET /api/health)
fly open        # open https://codesigning.fly.dev in your browser
```

When the deploy is green, open the app and **sign in with your `SEED_ADMIN_EMAIL` /
`SEED_ADMIN_PASSWORD`**. That's it — you do not need to seed manually.

**Re-seeding later (optional).** Seeding already runs on every deploy. If you change
`SEED_ADMIN_*` or want to force it without a code change, run it against the live
app:

```bash
fly ssh console -C "npm run db:seed"
```

### Automatic deploys (CI)

`.github/workflows/fly-deploy.yml` deploys on every push to `main`. Enable it by
creating a deploy token and adding it as a repository secret:

```bash
fly tokens create deploy    # copy the token
# GitHub → repo Settings → Secrets and variables → Actions → New secret
#   Name: FLY_API_TOKEN   Value: <the token>
```

After that, every push to `main` builds and deploys automatically (migrations run as
part of the deploy), so the hosted app always matches the committed code.

### Troubleshooting

**"Seeding a new database doesn't work" / "I still see `localhost` everywhere."**

- Prisma and Next.js automatically load `.env`. If your local `.env` still contains
  `localhost` / `127.0.0.1` URLs (the local-dev defaults), then running
  `npm run db:seed` **locally** talks to your local database, not Supabase. To seed
  Supabase from your machine, put the Supabase `DATABASE_URL` / `DIRECT_URL` in `.env`
  first (with the real password, not `[YOUR-PASSWORD]`). Easiest is to let the deploy
  seed for you (step 4) — the Fly container has no `.env` and uses your secrets.
- Make sure migrations have run before seeding. On Fly this is automatic
  (`db:release` = migrate then seed). If tables don't exist yet, seeding fails.
- Seeding uses `DIRECT_URL` (the session connection, port `5432`), not the
  transaction pooler — set both secrets.
- In production, seeding intentionally errors if `SEED_ADMIN_PASSWORD` is unset or
  left at the weak default; set a strong one as a secret.

**Verification / password-reset emails link to `localhost:3000`.**

- Set the `APP_URL` secret to `https://codesigning.fly.dev`. If it is unset, the app
  falls back to the incoming request's host, so make sure you are visiting the app via
  its real URL (not a localhost tunnel).

## Project structure

```
prisma/
  schema.prisma          # User, Role, Session, VerificationToken, AuditLog
  seed.ts                # seeds ADMIN/MANAGER/USER roles + admin user
src/
  app/
    (auth)/              # login, register, verify-email, forgot/reset-password
    (app)/               # authenticated area (layout requires a user)
      dashboard/
      profile/  settings/
      admin/users/  admin/roles/  admin/audit/
    api/auth/logout/     # POST route that clears the session
    api/health/          # health check for Fly.io
    403/                 # forbidden page
  components/ui/         # Button, Input, Card, Table, Alert, Badge, ...
  lib/
    db.ts                # Prisma client singleton
    validation.ts        # Zod schemas
    audit.ts             # logAudit() + action catalog
    mail.ts              # nodemailer + dev console fallback
    auth/                # password, tokens, session, guards, actions
    rbac/                # permissions catalog, hasPermission, <Can>
    user/  admin/        # profile/settings + admin server actions
  middleware.ts          # coarse cookie-based route gating
```

## How authentication & RBAC work

- **Sessions:** on login a random token is stored in an httpOnly cookie; only its
  SHA-256 hash is stored in the `Session` table. `getCurrentUser()` resolves the
  cookie to a user (memoized per request).
- **Guards** (`src/lib/auth/guards.ts`): `requireUser()` redirects anonymous users
  to `/login`; `requirePermission()` / `requireAnyPermission()` enforce access and
  redirect to `/403` when denied. Use these in every server component / server action.
- **Permissions** (`src/lib/rbac/permissions.ts`): plain `"resource:action"` keys.
  A user's effective permissions are the union of their roles' permission arrays.
- **UI gating:** `<Can user={user} permission={...}>` hides UI, but **always** back
  it with a server guard — client checks are cosmetic only.

### Adding a permission

1. Add a key to `PERMISSIONS` (and `PERMISSION_METADATA`) in
   `src/lib/rbac/permissions.ts`.
2. Grant it to roles in `prisma/seed.ts` or via the **Roles** admin UI.
3. Enforce it with `requirePermission(...)` in the relevant page/action.

## Reusing this template for a new project

1. Copy the repository (or use it as a GitHub template) and update `name` in
   `package.json` and the app title in `src/app/layout.tsx`.
2. Generate a fresh `SESSION_SECRET` and set real database + SMTP values in `.env`.
3. Replace the placeholder dashboard with your app, and add your own models,
   permissions, and pages — the auth/RBAC/audit plumbing stays as-is.

## Testing

- **Unit** (`tests/unit`): password hashing and RBAC helpers.
- **E2E** (`tests/e2e`): login, registration/verification gating, and the admin
  user/role flows. E2E requires a migrated + seeded database and starts the dev
  server automatically.

## Security notes

- Passwords are bcrypt-hashed; session and verification tokens are stored only as
  SHA-256 hashes.
- Password reset and email enumeration are mitigated (generic responses on
  forgot-password).
- Deactivating a user immediately revokes their sessions; changing a password
  signs out all other sessions.
- Set `SESSION_SECRET` to a long random value and always run behind HTTPS in
  production (the session cookie is marked `secure` when `NODE_ENV=production`).
