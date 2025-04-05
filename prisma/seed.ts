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
  // Step 1: Create Tenants
  const tenants = await prisma.tenant.createMany({
    data: [
      {
        name: 'Corporate Headquarters',
        subdomain: 'corporate',
      },
      {
        name: 'North Region',
        subdomain: 'north',
      },
      {
        name: 'South Region',
        subdomain: 'south',
      }
    ],
    skipDuplicates: true,
  });

  console.log(`Created ${tenants.count} tenants`);

  // Step 2: Create Users
  const corporateTenant = await prisma.tenant.findFirst({
    where: { subdomain: 'corporate' },
  });

  if (!corporateTenant) {
    throw new Error('Corporate tenant not found');
  }

  const adminPassword = await hashPassword('Admin@123');
  const adminUser = await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@company.com',
      employeeId: 'ADMIN001',
      tenantId: corporateTenant.id,
      password: adminPassword,
      role: 'ADMIN',
      firstName: 'Admin',
      lastName: 'User'
    } as User
  });

  console.log(`Created admin user with ID: ${adminUser.id}`);

  // Step 3: Create other entities
  const regions = await prisma.tenant.findMany({
    where: { subdomain: { in: ['north', 'south'] } },
  });

  for (const region of regions) {
    const role = region.subdomain === 'north' ? 'MANAGER' : 'TECHNICIAN';
    const password = await hashPassword(`${role}@123`);
    
    const user = await prisma.user.create({
      data: {
        name: `${role} ${region.name}`,
        email: `${role.toLowerCase()}@${region.subdomain}.company.com`,
        employeeId: `${role.slice(0, 3)}${faker.string.numeric(3)}`,
        tenantId: region.id,
        password: password,
        role,
        firstName: role,
        lastName: region.name.split(' ')[0]
      } as User
    });
    console.log(`Created ${role} user for ${region.subdomain}: ${user.id}`);
  }

  // Step 4: Create other entities (assets, work orders, etc.)
  // Add your specific entity creation logic here

  console.log('Database seeded successfully!');
}

seed()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });