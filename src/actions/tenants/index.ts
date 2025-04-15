"use server";

import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Tenant
export async function createTenant(data: Prisma.TenantCreateInput) {
  return prisma.tenant.create({ data });
}

export async function updateTenant(id: string, data: Prisma.TenantUncheckedUpdateInput) {
  return prisma.tenant.update({
    where: { id },
    data,
  });
}

export async function deleteTenant(id: string) {
  return prisma.tenant.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

export async function getTenant(id: string) {
  return prisma.tenant.findUnique({
    where: { id },
    include: { settings: true, parent: true, children: true },
  });
}

export async function getTenantByName(subdomain: string) {
    return prisma.tenant.findFirst({
      where: { subdomain },
      include: { settings: true, parent: true, children: true },
    });
  }

export async function getTenants({
  skip = 0,
  take = 10,
}: {
  skip?: number;
  take?: number;
}) {
  const [tenants, total] = await Promise.all([
    prisma.tenant.findMany({
      where: { deletedAt: null },
      include: { settings: true },
      skip,
      take,
    }),
    prisma.tenant.count({ where: { deletedAt: null } }),
  ]);
  return { tenants, total };
}

// TenantSettings
export async function createTenantSettings(data: Prisma.TenantSettingsCreateInput) {
  return prisma.tenantSettings.create({ data });
}

export async function updateTenantSettings(tenantId: string, data: Prisma.TenantSettingsUpdateInput) {
  return prisma.tenantSettings.update({
    where: { tenantId },
    data,
  });
}