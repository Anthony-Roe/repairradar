// actions/dashboard.ts
"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { CallStatus } from "@/prisma";

export async function getDashboardData(tenantId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  try {
    // Validate tenant access
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true },
    });
    if (!tenant) {
      throw new Error("Tenant not found");
    }

    // Fetch dashboard data
    const [assets, workOrders, incidents, maintenanceSchedules, parts, trends] =
      await Promise.all([
        prisma.asset.aggregate({
          where: { tenantId },
          _count: { id: true },
        }),
        prisma.workOrder.findMany({
          where: { tenantId },
          select: {
            id: true,
            description: true,
            status: true,
            priority: true,
            createdAt: true,
          },
          take: 50,
        }),
        prisma.incident.findMany({
          where: { tenantId, status: CallStatus.OPEN && CallStatus.IN_PROGRESS && CallStatus.ON_HOLD },
          orderBy: { createdAt: "asc" },
        }),
        prisma.maintenanceSchedule.aggregate({
          where: { tenantId, nextRun: { gte: new Date() } },
          _count: { id: true },
        }),
        prisma.part.findMany({
          where: { tenantId, quantity: { lt: 10 } },
          select: { id: true, name: true, quantity: true },
        }),
        // Mock trends data (replace with real query if available)
        prisma.workOrder.groupBy({
          by: ["createdAt"],
          where: { tenantId },
          _count: { id: true },
          orderBy: { createdAt: "asc" },
          take: 30,
        }),
      ]);

    return {
      assets: { total: assets._count.id || 0 },
      workOrders,
      incidents: {
        total: incidents.length,
        unresolved: incidents.map(call => call.status !== CallStatus.CLOSED) || 0,
      },
      maintenanceSchedules: { upcoming: maintenanceSchedules._count.id },
      parts: { lowStock: parts },
      trends: trends.map((t) => ({
        date: t.createdAt.toISOString().split("T")[0],
        workOrders: t._count.id,
        incidents: 0, // Add incidents query if needed
      })),
    };
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    throw new Error("Failed to load dashboard data");
  }
}