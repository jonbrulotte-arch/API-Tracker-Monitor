import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

// Use libSQL adapter for SQLite in Prisma 7
function createClient() {
  const url = process.env.DATABASE_URL ?? "file:./dev.db";
  // Convert prisma file:// to libsql file:// format
  const libsqlUrl = url.startsWith("file:") ? url : `file:${url}`;
  const adapter = new PrismaLibSql({ url: libsqlUrl });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
export const db = globalForPrisma.prisma || createClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
