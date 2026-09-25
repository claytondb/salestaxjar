/**
 * Encryption at rest for store-connection credentials.
 *
 * PlatformConnection.accessToken / refreshToken hold the keys Sails uses to
 * read a seller's orders (Shopify tokens, WooCommerce API keys, etc.). They are
 * encrypted with AES-256-GCM before they reach the database and decrypted when
 * read. This is wired in once, as a Prisma query extension (see prisma.ts), so
 * individual platform modules don't need to know about it.
 *
 * Format: enc:v1:<keyId>:<iv b64>:<ciphertext b64>:<auth tag b64>
 *
 * Keys (derived with HKDF-SHA256, so any secret length works):
 *   k1 — from PLATFORM_TOKEN_KEY (recommended; set it once and never change it)
 *   j1 — from JWT_SECRET (fallback so encryption works with no extra setup)
 * New values use k1 when PLATFORM_TOKEN_KEY is set, otherwise j1. Values
 * written with either key keep decrypting as long as that secret is unchanged.
 *
 * Values without the prefix are legacy plaintext: they are returned as-is and
 * re-encrypted by encryptLegacyPlatformTokens() (run from the daily job).
 */

import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'crypto';

export const TOKEN_PREFIX = 'enc:v1:';
const ALGORITHM = 'aes-256-gcm';
const HKDF_SALT = 'sails-platform-connection';
const HKDF_INFO = 'sails/platform-token/v1';

type KeyId = 'k1' | 'j1';

function deriveKey(secret: string): Buffer {
  return Buffer.from(hkdfSync('sha256', secret, HKDF_SALT, HKDF_INFO, 32));
}

function getKey(id: KeyId): Buffer | null {
  const secret = id === 'k1' ? process.env.PLATFORM_TOKEN_KEY : process.env.JWT_SECRET;
  if (!secret) return null;
  return deriveKey(secret);
}

function currentKeyId(): KeyId | null {
  if (process.env.PLATFORM_TOKEN_KEY) return 'k1';
  if (process.env.JWT_SECRET) return 'j1';
  return null;
}

export function isEncryptedToken(value: unknown): boolean {
  return typeof value === 'string' && value.startsWith(TOKEN_PREFIX);
}

let warnedNoKey = false;

/**
 * Encrypt a credential for storage. Idempotent: already-encrypted values are
 * returned unchanged. Empty values are returned unchanged.
 */
export function encryptToken<T extends string | null | undefined>(value: T): T {
  if (typeof value !== 'string' || value === '' || isEncryptedToken(value)) return value;

  const keyId = currentKeyId();
  if (!keyId) {
    // No secret configured (local dev without .env). Never block the app, but say so.
    if (!warnedNoKey) {
      console.warn('[token-crypto] No PLATFORM_TOKEN_KEY or JWT_SECRET set — store credentials will be saved unencrypted.');
      warnedNoKey = true;
    }
    return value;
  }

  const key = getKey(keyId)!;
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${TOKEN_PREFIX}${keyId}:${iv.toString('base64')}:${ciphertext.toString('base64')}:${tag.toString('base64')}` as T;
}

/**
 * Decrypt a stored credential. Legacy plaintext values pass through unchanged.
 * Throws if the value is encrypted but the key is missing or the data was
 * tampered with — callers surface that as a "please reconnect your store" error.
 */
export function decryptToken<T extends string | null | undefined>(value: T): T {
  if (!isEncryptedToken(value)) return value;

  const parts = (value as string).slice(TOKEN_PREFIX.length).split(':');
  if (parts.length !== 4) {
    throw new Error('Stored store credentials are malformed. Please reconnect this store.');
  }
  const [keyId, ivB64, ctB64, tagB64] = parts;
  if (keyId !== 'k1' && keyId !== 'j1') {
    throw new Error('Stored store credentials use an unknown key. Please reconnect this store.');
  }
  const key = getKey(keyId);
  if (!key) {
    throw new Error('The key needed to read stored store credentials is not configured. Please reconnect this store.');
  }

  try {
    const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(ctB64, 'base64')),
      decipher.final(),
    ]);
    return plaintext.toString('utf8') as T;
  } catch {
    throw new Error('Stored store credentials could not be decrypted. Please reconnect this store.');
  }
}

// ---------------------------------------------------------------------------
// Prisma helpers (pure, so they can be unit-tested without a database)
// ---------------------------------------------------------------------------

export const ENCRYPTED_CONNECTION_FIELDS = ['accessToken', 'refreshToken'] as const;

type AnyRecord = Record<string, unknown>;

function encryptFieldValue(value: unknown): unknown {
  if (typeof value === 'string') return encryptToken(value);
  // Prisma update operations can use { set: value }
  if (value && typeof value === 'object' && 'set' in (value as AnyRecord)) {
    const op = value as AnyRecord;
    if (typeof op.set === 'string') return { ...op, set: encryptToken(op.set) };
  }
  return value;
}

function encryptData(data: unknown): unknown {
  if (Array.isArray(data)) return data.map(encryptData);
  if (!data || typeof data !== 'object') return data;
  const copy: AnyRecord = { ...(data as AnyRecord) };
  for (const field of ENCRYPTED_CONNECTION_FIELDS) {
    if (field in copy) copy[field] = encryptFieldValue(copy[field]);
  }
  return copy;
}

/**
 * Return a copy of Prisma write args with credential fields encrypted.
 * Handles create/update/upsert/createMany/updateMany shapes.
 */
export function encryptConnectionWriteArgs<A>(args: A): A {
  if (!args || typeof args !== 'object') return args;
  const copy: AnyRecord = { ...(args as AnyRecord) };
  if ('data' in copy) copy.data = encryptData(copy.data);
  if ('create' in copy) copy.create = encryptData(copy.create);
  if ('update' in copy) copy.update = encryptData(copy.update);
  return copy as A;
}

/**
 * Return a copy of a Prisma result with credential fields decrypted.
 * Works for single records, arrays of records, null and non-record results.
 */
export function decryptConnectionResult<R>(result: R): R {
  if (Array.isArray(result)) return result.map((r) => decryptConnectionResult(r)) as R;
  if (!result || typeof result !== 'object') return result;
  const record = result as AnyRecord;
  const hasField = ENCRYPTED_CONNECTION_FIELDS.some((f) => typeof record[f] === 'string');
  if (!hasField) return result;
  const copy: AnyRecord = { ...record };
  for (const field of ENCRYPTED_CONNECTION_FIELDS) {
    if (typeof copy[field] === 'string') copy[field] = decryptToken(copy[field] as string);
  }
  return copy as R;
}

export const WRITE_OPERATIONS = new Set([
  'create',
  'createMany',
  'createManyAndReturn',
  'update',
  'updateMany',
  'updateManyAndReturn',
  'upsert',
]);
