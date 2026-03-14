import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Extend with Accelerate if URL is provided
export const getPrismaClient = () => {
  const accelerateUrl = process.env.DATABASE_URL;
  if (accelerateUrl && accelerateUrl.includes('accelerate')) {
    return prisma.$extends(withAccelerate());
  }
  return prisma;
};
