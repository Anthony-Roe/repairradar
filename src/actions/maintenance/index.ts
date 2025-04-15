"use server";

import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// MaintenanceSchedule
export async function createMaintenanceSchedule(data: Prisma.MaintenanceScheduleUncheckedCreateInput) {
  return prisma.maintenanceSchedule.create({ data });
}

export async function updateMaintenanceSchedule(id: string, data: Prisma.MaintenanceScheduleUncheckedUpdateInput) {
  return prisma.maintenanceSchedule.update({
    where: { id },
    data,
  });
}

export async function deleteMaintenanceSchedule(id: string) {
  return prisma.maintenanceSchedule.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

export async function getMaintenanceSchedule(id: string) {
  return prisma.maintenanceSchedule.findUnique({
    where: { id },
    include: { meter: true, assignments: true, assets: true },
  });
}

export async function getMaintenanceSchedules({
  tenantId,
  skip = 0,
  take = 10,
}: {
  tenantId: string;
  skip?: number;
  take?: number;
}) {
  const [schedules, total] = await Promise.all([
    prisma.maintenanceSchedule.findMany({
      where: { tenantId, deletedAt: null },
      include: { meter: true },
      skip,
      take,
    }),
    prisma.maintenanceSchedule.count({ where: { tenantId, deletedAt: null } }),
  ]);
  return { schedules, total };
}

// MaintenanceAssignment
export async function createMaintenanceAssignment(data: Prisma.MaintenanceAssignmentCreateInput) {
  return prisma.maintenanceAssignment.create({ data });
}

export async function deleteMaintenanceAssignment(maintenanceId: string, userId: string) {
  return prisma.maintenanceAssignment.delete({
    where: { maintenanceId_userId: { maintenanceId, userId } },
  });
}

// MaintenanceAssets
export async function createMaintenanceAsset(data: Prisma.MaintenanceAssetsCreateInput) {
  return prisma.maintenanceAssets.create({ data });
}

export async function deleteMaintenanceAsset(maintenanceId: string, assetId: string) {
  return prisma.maintenanceAssets.delete({
    where: { maintenanceId_assetId: { maintenanceId, assetId } },
  });
}

// Meter
export async function createMeter(data: Prisma.MeterCreateInput) {
  return prisma.meter.create({ data });
}

export async function updateMeter(id: string, data: Prisma.MeterUpdateInput) {
  return prisma.meter.update({
    where: { id },
    data,
  });
}

export async function getMeters(tenantId: string) {
  return prisma.meter.findMany({
    where: { tenantId },
  });
}