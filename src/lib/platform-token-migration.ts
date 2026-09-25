/**
 * One-time (and safe to repeat) job: encrypt any store-connection credentials
 * that were saved before encryption at rest existed.
 *
 * Runs inside the deployed app (from the daily cron), so it always uses the
 * production key — no secrets ever need to leave Vercel.
 */

import { prisma } from './prisma';
import { TOKEN_PREFIX } from './token-crypto';

export async function encryptLegacyPlatformTokens(limit = 200): Promise<{ checked: number; encrypted: number; errors: number }> {
  // The where clause runs against raw database values, so this finds rows whose
  // accessToken or refreshToken is still plaintext.
  const legacy = await prisma.platformConnection.findMany({
    where: {
      OR: [
        { NOT: { accessToken: { startsWith: TOKEN_PREFIX } } },
        {
          AND: [
            { refreshToken: { not: null } },
            { refreshToken: { not: '' } },
            { NOT: { refreshToken: { startsWith: TOKEN_PREFIX } } },
          ],
        },
      ],
    },
    select: { id: true, accessToken: true, refreshToken: true },
    take: limit,
  });

  let encrypted = 0;
  let errors = 0;
  for (const conn of legacy) {
    try {
      // Values come back decrypted/plaintext; the query extension encrypts them on update.
      await prisma.platformConnection.update({
        where: { id: conn.id },
        data: { accessToken: conn.accessToken, refreshToken: conn.refreshToken },
      });
      encrypted++;
    } catch (error) {
      errors++;
      console.error(`[token-migration] Could not encrypt connection ${conn.id}:`, error);
    }
  }

  return { checked: legacy.length, encrypted, errors };
}
