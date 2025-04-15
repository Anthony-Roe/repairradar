import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export {Prisma} from "@/prisma"

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    errorFormat: 'pretty',
    log: [{level:"query", emit: "event"}, {level: "error", emit:"stdout"}],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;