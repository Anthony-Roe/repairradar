"use server";

import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Asset
export async function createAsset(data: Prisma.AssetUncheckedCreateInput) {
        return prisma.asset.create({ data });
}

export async function updateAsset(id: string, data: Prisma.AssetUncheckedUpdateInput) {
  return prisma.asset.update({
    where: { id },
    data,
  });
}

export async function deleteAsset(id: string) {
  return prisma.asset.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

export async function getAsset(id: string) {
  return prisma.asset.findUnique({
    where: { id },
    include: { assetType: true, assetMeters: { include: { meter: true } } },
  });
}

export async function getAssets({
  tenantId,
  skip = 0,
  take = 10,
}: {
  tenantId: string;
  skip?: number;
  take?: number;
}) {
  const [assets, total] = await Promise.all([
    prisma.asset.findMany({
      where: { tenantId, deletedAt: null },
      include: { assetType: true },
      skip,
      take,
    }),
    prisma.asset.count({ where: { tenantId, deletedAt: null } }),
  ]);
  return { assets, total };
}

// AssetCategory
export async function createAssetCategory(data: Prisma.AssetCategoryUncheckedCreateInput) {
  return prisma.assetCategory.create({ data });
}

export async function updateAssetCategory(id: string, data: Prisma.AssetCategoryUpdateInput) {
  return prisma.assetCategory.update({
    where: { id },
    data,
  });
}

export async function getAssetCategories(tenantId: string) {
  return prisma.assetCategory.findMany({
    where: { tenantId },
  });
}

// AssetType
export async function createAssetType(data: Prisma.AssetTypeUncheckedCreateInput) {
  return prisma.assetType.create({ data });
}

export async function updateAssetType(id: string, data: Prisma.AssetTypeUpdateInput) {
  return prisma.assetType.update({
    where: { id },
    data,
  });
}

export async function getAssetTypes(tenantId: string) {
  return prisma.assetType.findMany({
    where: { tenantId },
    include: { category: true },
  });
}

// AssetMeter
export async function createAssetMeter(data: Prisma.AssetMeterUncheckedCreateInput) {
  return prisma.assetMeter.create({ data });
}

export async function updateAssetMeter(id: string, data: Prisma.AssetMeterUpdateInput) {
  return prisma.assetMeter.update({
    where: { id },
    data,
  });
}

// MeterReading
export async function createMeterReading(data: Prisma.MeterReadingCreateInput) {
  return prisma.meterReading.create({ data });
}

export async function getMeterReadings(assetMeterId: string) {
  return prisma.meterReading.findMany({
    where: { assetMeterId },
    orderBy: { readingDate: "desc" },
  });
}