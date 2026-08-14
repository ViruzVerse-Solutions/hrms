// Prisma database client wrapper
// Falls back gracefully if @prisma/client is initializing
let prismaInstance: any = null;

try {
  const { PrismaClient } = require('@prisma/client');
  const globalForPrisma = globalThis as unknown as { prisma: any };
  prismaInstance = globalForPrisma.prisma || new PrismaClient();
  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prismaInstance;
} catch (e) {
  // Graceful fallback during initial setup
  prismaInstance = null;
}

export const prisma = prismaInstance;
