"use server";

import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// User
export async function createUser(data: Prisma.UserUncheckedCreateInput) {
  return prisma.user.create({ data });
}

export async function updateUser(id: string, data: Prisma.UserUpdateInput) {
  return prisma.user.update({
    where: { id },
    data,
  });
}

export async function deleteUser(id: string) {
  return prisma.user.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

export async function getUser(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: { tenant: true },
  });
}

export async function getUsers({
  tenantId,
  skip = 0,
  take = 10,
}: {
  tenantId: string;
  skip?: number;
  take?: number;
}) {
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where: { tenantId, deletedAt: null },
      include: { tenant: true },
      skip,
      take,
    }),
    prisma.user.count({ where: { tenantId, deletedAt: null } }),
  ]);
  return { users, total };
}

// Account
export async function createAccount(data: Prisma.AccountCreateInput) {
  return prisma.account.create({ data });
}

// Session
export async function createSession(data: Prisma.SessionCreateInput) {
  return prisma.session.create({ data });
}

export async function deleteSession(sessionToken: string) {
  return prisma.session.delete({
    where: { sessionToken },
  });
}

// VerificationToken
export async function createVerificationToken(data: Prisma.VerificationTokenCreateInput) {
  return prisma.verificationToken.create({ data });
}