"use server";

import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// WorkOrder
export async function createWorkOrder(data: Prisma.WorkOrderUncheckedCreateInput) {
  return prisma.workOrder.create({ data });
}

export async function updateWorkOrder(id: string, data: Prisma.WorkOrderUncheckedUpdateInput) {
  return prisma.workOrder.update({
    where: { id },
    data,
  });
}

export async function deleteWorkOrder(id: string) {
  await prisma.workOrderAssets.deleteMany({ where: { workOrderId: id } });
  await prisma.workOrderParts.deleteMany({ where: { workOrderId: id } });
  return prisma.workOrder.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

export async function getWorkOrder(id: string) {
  return prisma.workOrder.findUnique({
    where: { id },
    include: {
      maintenance: true,
      assets: { include: { asset: true } },
      parts: { include: { part: true } },
      labor: true,
      logs: true,
      assignments: true,
    },
  });
}

export async function getWorkOrders({
  tenantId,
  skip = 0,
  take = 10,
}: {
  tenantId: string;
  skip?: number;
  take?: number;
}) {
  const [workOrders, total] = await Promise.all([
    prisma.workOrder.findMany({
      where: { tenantId, deletedAt: null },
      include: { assets: { include: { asset: true } }, maintenance: true },
      skip,
      take,
    }),
    prisma.workOrder.count({ where: { tenantId, deletedAt: null } }),
  ]);
  return { workOrders, total };
}

// WorkOrderAssignment
export async function createWorkOrderAssignment(data: Prisma.WorkOrderAssignmentCreateInput) {
  return prisma.workOrderAssignment.create({ data });
}

export async function deleteWorkOrderAssignment(workOrderId: string, userId: string) {
  return prisma.workOrderAssignment.delete({
    where: { workOrderId_userId: { workOrderId, userId } },
  });
}

// WorkOrderAssets
export async function createWorkOrderAsset(data: Prisma.WorkOrderAssetsCreateInput) {
  return prisma.workOrderAssets.create({ data });
}

export async function deleteWorkOrderAsset(workOrderId: string, assetId: string) {
  return prisma.workOrderAssets.delete({
    where: { workOrderId_assetId: { workOrderId, assetId } },
  });
}

// WorkOrderParts
export async function createWorkOrderPart(data: Prisma.WorkOrderPartsCreateInput) {
  return prisma.workOrderParts.create({ data });
}

export async function deleteWorkOrderPart(workOrderId: string, partId: string) {
  return prisma.workOrderParts.delete({
    where: { workOrderId_partId: { workOrderId, partId } },
  });
}

// WorkOrderLabor
export async function createWorkOrderLabor(data: Prisma.WorkOrderLaborCreateInput) {
  return prisma.workOrderLabor.create({ data });
}

export async function updateWorkOrderLabor(id: string, data: Prisma.WorkOrderLaborUpdateInput) {
  return prisma.workOrderLabor.update({
    where: { id },
    data,
  });
}

// WorkOrderLog
export async function createWorkOrderLog(data: Prisma.WorkOrderLogCreateInput) {
  return prisma.workOrderLog.create({ data });
}