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
    update: {
      permissions: [PERMISSIONS.USERS_READ, PERMISSIONS.AUDIT_READ, PERMISSIONS.MAPS_READ],
    },
    create: {
      name: "MANAGER",
      description: "Can view users and the audit log, and use the floor-plan locator.",
      permissions: [PERMISSIONS.USERS_READ, PERMISSIONS.AUDIT_READ, PERMISSIONS.MAPS_READ],
      isSystem: true,
    },
  });

  await prisma.role.upsert({
    where: { name: "USER" },
    update: { permissions: [PERMISSIONS.MAPS_READ] },
    create: {
      name: "USER",
      description: "Standard member. Can search floor plans to locate PCs.",
      permissions: [PERMISSIONS.MAPS_READ],
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

  // ---- Demo floor plan (skipped in production) -------------------------
  if (process.env.NODE_ENV !== "production" || process.env.SEED_DEMO === "true") {
    await seedDemoFloorPlan();
    await seedDemoAssetList();
    console.log("Seeded demo floor plan (H1.001–H1.004) and a demo asset list.");
  }
}

async function seedDemoAssetList() {
  const norm = (s: string) => s.toUpperCase().replace(/[\s._-]/g, "");
  const columns = ["Ruimtenummer", "PC-naam", "Gebruiker", "Afdeling", "Type", "OS", "Laatste contact"]; // prettier-ignore
  const rows = [
    { Ruimtenummer: "H1.001", "PC-naam": "AMP-PC-0421", Gebruiker: "Balie 1", Afdeling: "Radiologie", Type: "Desktop", OS: "Windows 11", "Laatste contact": "2026-07-20" }, // prettier-ignore
    { Ruimtenummer: "H1.001", "PC-naam": "AMP-PC-0422", Gebruiker: "Balie 2", Afdeling: "Radiologie", Type: "Laptop", OS: "Windows 11", "Laatste contact": "2026-06-15" }, // prettier-ignore
    { Ruimtenummer: "H1.002", "PC-naam": "AMP-PC-0510", Gebruiker: "Dr. Jansen", Afdeling: "Cardiologie", Type: "Laptop", OS: "Windows 10", "Laatste contact": "2026-07-21" }, // prettier-ignore
    { Ruimtenummer: "H1.003", "PC-naam": "AMP-PC-0333", Gebruiker: "Servicedesk", Afdeling: "ICT", Type: "Desktop", OS: "Windows 11", "Laatste contact": "2026-01-10" }, // prettier-ignore
    // No matching pin on the demo plan — shows as "not on a map yet".
    { Ruimtenummer: "H1.099", "PC-naam": "AMP-PC-9999", Gebruiker: "Onbekend", Afdeling: "Radiologie", Type: "Desktop", OS: "Windows 10", "Laatste contact": "" }, // prettier-ignore
  ];

  await prisma.assetImport.deleteMany({ where: { id: "demo-import" } });
  await prisma.assetImport.create({
    data: {
      id: "demo-import",
      filename: "demo-assets.xlsx",
      roomNumberColumn: "Ruimtenummer",
      columns,
      rowCount: rows.length,
      records: {
        create: rows.map((r) => ({
          roomNumber: norm(r.Ruimtenummer),
          data: r,
          searchText: Object.values(r).join(" ").toLowerCase(),
        })),
      },
    },
  });
}

async function seedDemoFloorPlan() {
  const { readFile } = await import("fs/promises");
  const { join } = await import("path");
  const { putObject } = await import("../src/lib/storage");

  const imageKey = "floorplans/demo-floorplan.svg";
  const svg = await readFile(join(process.cwd(), "prisma/demo/floorplan.svg"));
  await putObject(imageKey, new Uint8Array(svg), "image/svg+xml");

  const plan = await prisma.floorPlan.upsert({
    where: { id: "demo-floorplan" },
    update: { imageKey, imageWidth: 1000, imageHeight: 700 },
    create: {
      id: "demo-floorplan",
      name: "Demo — Building H, Floor 1",
      building: "H",
      floor: "1",
      imageKey,
      imageWidth: 1000,
      imageHeight: 700,
    },
  });

  // Pin positions as fractions of the 1000x700 image (room centres).
  const rooms = [
    { id: "demo-room-1", number: "H1.001", name: "Room 001", department: "Radiologie", x: 0.15, y: 0.214 },
    { id: "demo-room-2", number: "H1.002", name: "Room 002", department: "Cardiologie", x: 0.68, y: 0.214 },
    { id: "demo-room-3", number: "H1.003", name: "Room 003", department: "Servicedesk", x: 0.15, y: 0.786 },
    { id: "demo-room-4", number: "H1.004", name: "Room 004", department: "Longafdeling", x: 0.68, y: 0.786 },
  ];
  for (const r of rooms) {
    await prisma.room.upsert({
      where: { id: r.id },
      update: { number: r.number, name: r.name, department: r.department, x: r.x, y: r.y, floorPlanId: plan.id },
      create: { ...r, floorPlanId: plan.id },
    });
  }
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
