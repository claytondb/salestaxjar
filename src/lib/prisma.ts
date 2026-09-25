import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig } from '@neondatabase/serverless';
import {
  WRITE_OPERATIONS,
  encryptConnectionWriteArgs,
  decryptConnectionResult,
} from './token-crypto';

// Enable WebSocket for fetch-based environments (Edge, serverless)
neonConfig.fetchConnectionCache = true;

// Create Prisma client with Neon serverless adapter
const createBaseClient = () => {
  const connectionString = process.env.DATABASE_URL;

  // If no database URL is configured, create a client without adapter for build time
  if (!connectionString) {
    console.warn('⚠️ DATABASE_URL not configured - using default Prisma client');
    return new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  }

  // Create Prisma adapter for Neon
  const adapter = new PrismaNeon({ connectionString });

  // Create Prisma client with adapter
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
};

/**
 * Store-connection credentials (PlatformConnection.accessToken/refreshToken)
 * are encrypted on every write and decrypted on every read, in one place.
 * See token-crypto.ts.
 */
const createPrismaClient = () =>
  createBaseClient().$extends({
    name: 'encrypt-platform-credentials',
    query: {
      platformConnection: {
        async $allOperations({ operation, args, query }) {
          const nextArgs = WRITE_OPERATIONS.has(operation)
            ? encryptConnectionWriteArgs(args)
            : args;
          const result = await query(nextArgs);
          return decryptConnectionResult(result);
        },
      },
    },
  });

type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>;

// Global singleton pattern for development hot-reloading
const globalForPrisma = globalThis as unknown as {
  prisma: ExtendedPrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
