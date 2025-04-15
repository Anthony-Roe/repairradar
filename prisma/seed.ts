import { PrismaClient, User } from '@prisma/client';
import { hashPassword } from '../src/lib/auth-utils';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

// Type-safe model definitions based on your schema
type SeedData = {
  Tenant: {
    name: string;
    subdomain: string;
    parentId?: string;
  }[];
  User: {
    name?: string;
    email?: string;
    employeeId: string;
    tenantId: string;
    password: string;
    role: 'ADMIN' | 'MANAGER' | 'TECHNICIAN' | 'USER';
    firstName?: string;
    lastName?: string;
  }[];
  // Add other models as needed
};

async function seed() {
  const user = await prisma.user.update({
    where: { id: "8460c80d-63d6-4702-bd14-e5a58031a716" },
    data: {
      password: await hashPassword("test")
    },
  });
}

seed()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });