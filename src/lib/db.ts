import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient as SqlitePrismaClient } from "@/generated/prisma-sqlite/client";
import { PrismaClient as PostgresPrismaClient } from "@/generated/prisma-postgres/client";
import { config } from "./env";

const globalForPrisma = globalThis as unknown as { prisma?: SqlitePrismaClient };

const client =
  config.databaseProvider === "postgres"
    ? (new PostgresPrismaClient({
        adapter: new PrismaPg({ connectionString: config.databaseUrl }),
      }) as unknown as SqlitePrismaClient)
    : new SqlitePrismaClient({
        adapter: new PrismaBetterSqlite3({ url: config.databaseUrl }),
      });

export const prisma = globalForPrisma.prisma ?? client;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
