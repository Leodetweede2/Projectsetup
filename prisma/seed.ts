import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { ALL_PERMISSIONS, PERMISSIONS } from "../src/lib/rbac/permissions";

// Prefer the direct (non-pooled) connection for one-off scripts like seeding.
// With Supabase this is the session connection (port 5432), which is more
// reliable for migrations/seeding than the transaction pooler. Falls back to
// DATABASE_URL for local development.
const prisma = new PrismaClient({
  datasourceUrl: process.env.DIRECT_URL || process.env.DATABASE_URL,
});

async function main() {
  // ---- Roles ------------------------------------------------------------
  const adminRole = await prisma.role.upsert({
    where: { name: "ADMIN" },
    update: { permissions: ALL_PERMISSIONS, isSystem: true },
    create: {
      name: "ADMIN",
      description: "Full access to everything.",
      permissions: ALL_PERMISSIONS,
      isSystem: true,
    },
  });

  await prisma.role.upsert({
    where: { name: "MANAGER" },
    update: {},
    create: {
      name: "MANAGER",
      description: "Can view users and the audit log.",
      permissions: [PERMISSIONS.USERS_READ, PERMISSIONS.AUDIT_READ],
      isSystem: true,
    },
  });

  await prisma.role.upsert({
    where: { name: "USER" },
    update: {},
    create: {
      name: "USER",
      description: "Standard member with no administrative access.",
      permissions: [],
      isSystem: true,
    },
  });

  // ---- Initial admin user ----------------------------------------------
  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@example.com").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? "admin12345";
  const name = process.env.SEED_ADMIN_NAME ?? "Administrator";

  // Never create the weak default admin in production.
  if (process.env.NODE_ENV === "production" && (!process.env.SEED_ADMIN_PASSWORD || password === "admin12345")) {
    throw new Error(
      "Refusing to seed in production without a strong SEED_ADMIN_PASSWORD. Set it (and SEED_ADMIN_EMAIL) as secrets, e.g. `fly secrets set SEED_ADMIN_EMAIL=you@example.com SEED_ADMIN_PASSWORD=<strong>`, then redeploy.",
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name,
      passwordHash,
      isActive: true,
      emailVerified: new Date(),
      roles: { connect: { id: adminRole.id } },
    },
  });

  console.log(`Seeded roles (ADMIN, MANAGER, USER) and admin user: ${email}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
