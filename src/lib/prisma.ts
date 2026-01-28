import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Create Prisma client with PostgreSQL adapter (required for Prisma 7+)
const createPrismaClient = () => {
  const connectionString = process.env.DATABASE_URL;
  
  // If no database URL is configured, create a client without adapter for build time
  if (!connectionString) {
    console.warn('⚠️ DATABASE_URL not configured - using default Prisma client');
    return new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  }
  
  // Create pg pool for runtime
  const pool = new Pool({ connectionString });
  
  // Create Prisma adapter
  const adapter = new PrismaPg(pool);
  
  // Create Prisma client with adapter
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
};

// Global singleton pattern for development hot-reloading
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
