"use server";

import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Vendor
export async function createVendor(data: Prisma.VendorUncheckedCreateInput) {
  return prisma.vendor.create({ data });
}

export async function updateVendor(id: string, data: Prisma.VendorUpdateInput) {
  return prisma.vendor.update({
    where: { id },
    data,
  });
}

export async function deleteVendor(id: string) {
  return prisma.vendor.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

export async function getVendor(id: string) {
  return prisma.vendor.findUnique({
    where: { id },
    include: { parts: true },
  });
}

export async function getVendorTenantId(tenantId: string) {
    return prisma.vendor.findFirst({
      where: { tenantId },
      include: { parts: true },
    });
  }

export async function getVendors({
  tenantId,
  skip = 0,
  take = 10,
}: {
  tenantId: string;
  skip?: number;
  take?: number;
}) {
  const [vendors, total] = await Promise.all([
    prisma.vendor.findMany({
      where: { tenantId, deletedAt: null },
      skip,
      take,
    }),
    prisma.vendor.count({ where: { tenantId, deletedAt: null } }),
  ]);
  return { vendors, total };
}

// PartVendor
export async function createPartVendor(data: Prisma.PartVendorCreateInput) {
  return prisma.partVendor.create({ data });
}

export async function deletePartVendor(partId: string, vendorId: string) {
  return prisma.partVendor.delete({
    where: { partId_vendorId: { partId, vendorId } },
  });
}