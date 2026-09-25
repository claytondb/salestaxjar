/**
 * One-time (and safe to repeat) job: encrypt any store-connection credentials
 * that were saved before encryption at rest existed.
 *
 * Runs inside the deployed app (from the daily cron), so it always uses the
 * production key — no secrets ever need to leave Vercel.
 */

import { prisma } from './prisma';
import { TOKEN_PREFIX, currentTokenKeyId } from './token-crypto';

/**
 * Encrypt plaintext credentials, and — once a dedicated PLATFORM_TOKEN_KEY is
 * configured — re-encrypt values that were written with the JWT_SECRET-derived
 * fallback key, so rotating JWT_SECRET later can't lock stores out.
 */
export async function encryptLegacyPlatformTokens(limit = 200): Promise<{ checked: number; encrypted: number; errors: number }> {
  const keyId = currentTokenKeyId();
  if (!keyId) {
    return { checked: 0, encrypted: 0, errors: 0 };
  }
  const wantedPrefix = `${TOKEN_PREFIX}${keyId}:`;

  // The where clause runs against raw database values, so this finds rows whose
  // accessToken or refreshToken isn't yet encrypted with the current key.
  const legacy = await prisma.platformConnection.findMany({
    where: {
      OR: [
        { NOT: { accessToken: { startsWith: wantedPrefix } } },
        {
          AND: [
            { refreshToken: { not: null } },
            { refreshToken: { not: '' } },
            { NOT: { refreshToken: { startsWith: wantedPrefix } } },
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
    // An empty accessToken means the stored value couldn't be decrypted
    // (see decryptConnectionResult) — leave it for the user to reconnect.
    if (!conn.accessToken) {
      errors++;
      continue;
    }
    try {
      // Values come back as plaintext; the query extension re-encrypts them
      // with the current key on update. Encrypted values must be decrypted
      // first, so strip any prefix we didn't manage to decrypt.
      await prisma.platformConnection.update({
        where: { id: conn.id },
        data: {
          accessToken: plaintextOrThrow(conn.accessToken),
          refreshToken: conn.refreshToken ? plaintextOrThrow(conn.refreshToken) : conn.refreshToken,
        },
      });
      encrypted++;
    } catch (error) {
      errors++;
      console.error(`[token-migration] Could not encrypt connection ${conn.id}:`, error);
    }
  }

  return { checked: legacy.length, encrypted, errors };
}

function plaintextOrThrow(value: string): string {
  if (value.startsWith(TOKEN_PREFIX)) {
    // Would only happen if the read path returned ciphertext; never re-save it.
    throw new Error('Refusing to re-save an undecrypted credential');
  }
  return value;
}
