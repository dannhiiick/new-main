import { PrismaClient } from "@prisma/client";

// Singleton pattern: reuse in dev to avoid exhausting connections on hot reload
const globalForPrisma = globalThis as unknown as { _prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma._prisma ?? new PrismaClient({ log: ["error", "warn"] });

if (process.env["NODE_ENV"] !== "production") {
  globalForPrisma._prisma = prisma;
}
