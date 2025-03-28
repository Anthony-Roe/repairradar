import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.user.upsert({
    where: { email: "super@admin.com" },
    update: {},
    create: {
      email: "super@admin.com",
      password: "$2b$10$Kn3dPwsxa.qiZRMtrej5G.5bSG5QokzFATP2zT43PAKXsD9xW8Oeq",
      role: "SUPER_ADMIN",
    },
  });

  await prisma.tenants.upsert({
    where: { subdomain: "plygem" },
    update: {},
    create: {
      subdomain: "plygem",
      name: "Plymouth Gem",
      config: {
        create: {
          modules: {
            dashboard: true,
            assets: true,
            "work-orders": true,
          },
        },
      },
    },
  });

  console.log("Database seeded successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });