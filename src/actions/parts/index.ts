"use server";

import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Part
export async function createPart(data: Prisma.PartUncheckedCreateInput) {
  return prisma.part.create({ data });
}

export async function updatePart(id: string, data: Prisma.PartUpdateInput) {
  return prisma.part.update({
    where: { id },
    data,
  });
}

export async function deletePart(id: string) {
  return prisma.part.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

export async function getPart(id: string) {
  return prisma.part.findUnique({
    where: { id },
    include: { vendors: true },
  });
}

export async function getParts({
  tenantId,
  skip = 0,
  take = 10,
}: {
  tenantId: string;
  skip?: number;
  take?: number;
}) {
  const [parts, total] = await Promise.all([
    prisma.part.findMany({
      where: { tenantId, deletedAt: null },
      skip,
      take,
    }),
    prisma.part.count({ where: { tenantId, deletedAt: null } }),
  ]);
  return { parts, total };
}