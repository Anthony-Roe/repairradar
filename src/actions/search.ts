"use server";

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function fetchSearchResults({ tenantId, query }: { tenantId: string; query: string }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.tenantId !== tenantId) {
    throw new Error("Unauthorized");
  }

  if (query.length < 3) return [];

  const [assets, workOrders, incidents, maintenanceSchedules, parts] = await Promise.all([
    prisma.asset.findMany({
      where: {
        tenantId,
        deletedAt: null,
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { serialNumber: { contains: query, mode: "insensitive" } },
          { location: { contains: query, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, status: true, serialNumber: true },
      take: 5,
    }),
    prisma.workOrder.findMany({
      where: {
        tenantId,
        deletedAt: null,
        description: { contains: query, mode: "insensitive" },
      },
      select: { id: true, description: true, status: true, priority: true },
      take: 5,
    }),
    prisma.incident.findMany({
      where: {
        tenantId,
        deletedAt: null,
        description: { contains: query, mode: "insensitive" },
      },
      select: { id: true, description: true, status: true, priority: true },
      take: 5,
    }),
    prisma.maintenanceSchedule.findMany({
      where: {
        tenantId,
        deletedAt: null,
        description: { contains: query, mode: "insensitive" },
      },
      select: { id: true, description: true, status: true, priority: true },
      take: 5,
    }),
    prisma.part.findMany({
      where: {
        tenantId,
        deletedAt: null,
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { partNumber: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, description: true, partNumber: true },
      take: 5,
    }),
  ]);

  const results = [
    ...assets.map((a) => ({
      id: a.id,
      type: "Asset" as const,
      title: a.name,
      description: a.serialNumber || null,
      status: a.status,
    })),
    ...workOrders.map((w) => ({
      id: w.id,
      type: "WorkOrder" as const,
      title: `Work Order #${w.id.slice(0, 8)}`,
      description: w.description,
      status: w.status,
      priority: w.priority,
    })),
    ...incidents.map((i) => ({
      id: i.id,
      type: "Incident" as const,
      title: `Incident #${i.id.slice(0, 8)}`,
      description: i.description,
      status: i.status,
      priority: i.priority,
    })),
    ...maintenanceSchedules.map((m) => ({
      id: m.id,
      type: "MaintenanceSchedule" as const,
      title: `Maintenance #${m.id.slice(0, 8)}`,
      description: m.description,
      status: m.status,
      priority: m.priority,
    })),
    ...parts.map((p) => ({
      id: p.id,
      type: "Part" as const,
      title: p.name,
      description: p.partNumber || p.description || null,
    })),
  ];

  return results;
}