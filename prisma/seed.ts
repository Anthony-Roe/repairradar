// prisma/seed.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const adminUser = await prisma.user.upsert({
    where: { email: "super@admin.com" },
    update: { password: "admin123", role: "SUPER_ADMIN" },
    create: { email: "super@admin.com", password: "admin123", role: "SUPER_ADMIN" },
  });

  const plygem = await prisma.tenants.upsert({
    where: { subdomain: "plygem" },
    update: {},
    create: {
      name: "Plygem",
      subdomain: "plygem",
      config: { create: { modules: { calls: true, assets: true, "work-orders": true } } },
    },
  });

  const acme = await prisma.tenants.upsert({
    where: { subdomain: "acme" },
    update: {},
    create: {
      name: "Acme Corp",
      subdomain: "acme",
      config: { create: { modules: { calls: true, assets: false, "work-orders": true } } },
    },
  });

  // Clear old data
  await prisma.workOrderNote.deleteMany({ where: { workOrder: { tenantId: { in: [plygem.id, acme.id] } } } });
  await prisma.workOrderAsset.deleteMany({ where: { workOrder: { tenantId: { in: [plygem.id, acme.id] } } } });
  await prisma.workOrder.deleteMany({ where: { tenantId: { in: [plygem.id, acme.id] } } });
  await prisma.call.deleteMany({ where: { tenantId: { in: [plygem.id, acme.id] } } });
  await prisma.asset.deleteMany({ where: { tenantId: { in: [plygem.id, acme.id] } } });

  // Create assets
  const plygemAsset1 = await prisma.asset.create({
    data: { name: "Window Unit", tenantId: plygem.id, location: "Warehouse" },
  });
  const plygemAsset2 = await prisma.asset.create({
    data: { name: "Door Frame", tenantId: plygem.id, location: "Storefront" },
  });
  const acmeAsset = await prisma.asset.create({
    data: { name: "Machine A", tenantId: acme.id, location: "Factory" },
  });

  // Create calls
  await prisma.call.create({
    data: {
      issue: "Broken Window",
      status: "OPEN",
      tenantId: plygem.id,
      assetId: plygemAsset1.id,
      reportedById: adminUser.id,
    },
  });

  // Create work orders with multiple assets and notes
  await prisma.workOrder.create({
    data: {
      description: "Fix Door",
      status: "PENDING",
      tenantId: plygem.id,
      priority: "MEDIUM",
      assets: { create: [{ assetId: plygemAsset2.id }] },
      notes: { create: [{ note: "Check hinges", createdById: adminUser.id }] },
    },
  });

  await prisma.workOrder.create({
    data: {
      description: "Repair Machine",
      status: "IN_PROGRESS",
      tenantId: acme.id,
      priority: "HIGH",
      assets: { create: [{ assetId: acmeAsset.id }] },
      assignedToId: adminUser.id,
    },
  });

  console.log("Seeding completed successfully!");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });