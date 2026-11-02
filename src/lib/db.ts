import { PrismaClient } from "@prisma/client";
import { PrismaClient as PostgresPrismaClient } from "@/generated/prisma-postgres";
import { config } from "./env";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const client =
  config.databaseProvider === "postgres"
    ? (new PostgresPrismaClient({
        datasources: { db: { url: config.databaseUrl } },
      }) as unknown as PrismaClient)
    : new PrismaClient();

export const prisma = globalForPrisma.prisma ?? client;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
