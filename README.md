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
