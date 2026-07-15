import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { ALL_PERMISSIONS, PERMISSIONS } from "../src/lib/rbac/permissions";

const prisma = new PrismaClient();

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
