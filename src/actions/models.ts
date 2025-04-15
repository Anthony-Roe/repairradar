"use server";

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { AssetStatus, WorkOrderStatus, CallStatus, MaintenanceStatus, CallPriority } from "@prisma/client";

export async function updateAsset({
  id,
  tenantId,
  name,
  serialNumber,
  status,
}: {
  id: string;
  tenantId: string;
  name: string;
  serialNumber?: string | null;
  status: AssetStatus;
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.tenantId !== tenantId) throw new Error("Unauthorized");

  return prisma.asset.update({
    where: { id, tenantId },
    data: { name, serialNumber, status },
  });
}

export async function updateWorkOrder({
  id,
  tenantId,
  description,
  status,
  priority,
}: {
  id: string;
  tenantId: string;
  description: string;
  status: WorkOrderStatus;
  priority: CallPriority;
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.tenantId !== tenantId) throw new Error("Unauthorized");

  return prisma.workOrder.update({
    where: { id, tenantId },
    data: { description, status, priority },
  });
}

export async function updateIncident({
  id,
  tenantId,
  description,
  status,
  priority,
}: {
  id: string;
  tenantId: string;
  description: string;
  status: CallStatus;
  priority: CallPriority;
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.tenantId !== tenantId) throw new Error("Unauthorized");

  return prisma.incident.update({
    where: { id, tenantId },
    data: { description, status, priority },
  });
}

export async function updateMaintenanceSchedule({
  id,
  tenantId,
  description,
  status,
  priority,
}: {
  id: string;
  tenantId: string;
  description: string;
  status: MaintenanceStatus;
  priority: CallPriority;
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.tenantId !== tenantId) throw new Error("Unauthorized");

  return prisma.maintenanceSchedule.update({
    where: { id, tenantId },
    data: { description, status, priority },
  });
}

export async function updatePart({
  id,
  tenantId,
  name,
  description,
  partNumber,
  quantity,
}: {
  id: string;
  tenantId: string;
  name: string;
  description?: string | null;
  partNumber?: string | null;
  quantity: number;
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.tenantId !== tenantId) throw new Error("Unauthorized");

  return prisma.part.update({
    where: { id, tenantId },
    data: { name, description, partNumber, quantity },
  });
}