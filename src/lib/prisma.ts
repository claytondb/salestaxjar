import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig, Pool } from '@neondatabase/serverless';

// Enable WebSocket for fetch-based environments (Edge, serverless)
neonConfig.fetchConnectionCache = true;

// Create Prisma client with Neon serverless adapter
const createPrismaClient = () => {
  const connectionString = process.env.DATABASE_URL;
  
  // If no database URL is configured, create a client without adapter for build time
  if (!connectionString) {
    console.warn('⚠️ DATABASE_URL not configured - using default Prisma client');
    return new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  }
  
  // Create Neon pool with connection string
  const neonPool = new Pool({ connectionString });
  
  // Create Prisma adapter for Neon - pass the pool config, not the pool instance
  const adapter = new PrismaNeon({ connectionString });
  
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
