"use server";

import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function createIncident(data: Prisma.IncidentUncheckedCreateInput) {
  return prisma.incident.create({ data });
}

export async function updateIncident(id: string, data: Prisma.IncidentUncheckedUpdateInput) {
  return prisma.incident.update({
    where: { id },
    data,
  });
}

export async function deleteIncident(id: string) {
  return prisma.incident.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

export async function getIncident(id: string) {
  return prisma.incident.findUnique({
    where: { id },
    include: { asset: true, reportedBy: true },
  });
}

export async function getIncidents({
  tenantId,
  skip = 0,
  take = 10,
}: {
  tenantId: string;
  skip?: number;
  take?: number;
}) {
  const [incidents, total] = await Promise.all([
    prisma.incident.findMany({
      where: { tenantId, deletedAt: null },
      include: { asset: true, reportedBy: true },
      skip,
      take,
    }),
    prisma.incident.count({ where: { tenantId, deletedAt: null } }),
  ]);
  return { incidents, total };
}