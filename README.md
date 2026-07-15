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
# edit .env — at minimum set a strong SESSION_SECRET

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
> 3. `fly deploy` (or push to `main` once CI is enabled).
> 4. Seed the first admin: `fly ssh console -C "npm run db:seed"`.
> 5. *(Optional, for automatic deploys)* add a `FLY_API_TOKEN` GitHub secret.

### 1. Create the Supabase database

1. Create a project at [supabase.com](https://supabase.com).
2. In **Project Settings → Database → Connection string**, copy two URLs:
   - **Transaction pooler** (port `6543`) → this is your `DATABASE_URL`. Append
     `?pgbouncer=true`.
   - **Session / direct** (port `5432`) → this is your `DIRECT_URL`.

   They look like:

   ```
   DATABASE_URL=postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true
   DIRECT_URL=postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
   ```

   Prisma uses the pooled `DATABASE_URL` for app queries and the direct `DIRECT_URL`
   for migrations (see `prisma/schema.prisma`).

### 2. Install flyctl and log in

```bash
curl -L https://fly.io/install.sh | sh
fly auth login
```

The app already exists (`codesigning`), so `fly launch` is **not** needed. If you
want to deploy under a different app name, change `app` in `fly.toml` and create it
with `fly apps create <name>`.

### 3. Set secrets

Run from the project root (it reads the app name from `fly.toml`):

```bash
fly secrets set \
  DATABASE_URL="postgresql://postgres.<ref>:<pw>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true" \
  DIRECT_URL="postgresql://postgres.<ref>:<pw>@aws-0-<region>.pooler.supabase.com:5432/postgres" \
  SESSION_SECRET="$(openssl rand -base64 32)" \
  APP_URL="https://codesigning.fly.dev" \
  SEED_ADMIN_EMAIL="you@example.com" \
  SEED_ADMIN_PASSWORD="<a-strong-password>" \
  SEED_ADMIN_NAME="Administrator"
# Optionally add SMTP_* / MAIL_FROM to send real verification / reset emails.
```

### 4. Deploy

```bash
fly deploy
```

On every deploy, the `release_command` in `fly.toml` runs `prisma migrate deploy`
against `DIRECT_URL`, so the database schema is always up to date before the new
version takes traffic. Fly checks `/api/health` to confirm the app is healthy.

### 5. Seed the first admin (one time)

Migrations run automatically, but seeding the initial admin/roles is a one-time step
(so no weak default admin is ever created in production):

```bash
fly ssh console -C "npm run db:seed"
```

Then sign in at `https://codesigning.fly.dev` with the `SEED_ADMIN_*` credentials.

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
