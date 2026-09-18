import { PrismaClient } from "@/generated/prisma/client";
import { createSqliteAdapter } from "@/lib/prisma-sqlite";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function makeClient() {
  const adapter = createSqliteAdapter();
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? makeClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
