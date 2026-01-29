/**
 * API Key Management
 * 
 * API keys for external integrations (WooCommerce, BigCommerce, etc.)
 * Keys are prefixed with "stax_" and hashed with SHA-256 for storage.
 */

import { prisma } from './prisma';
import crypto from 'crypto';

const API_KEY_PREFIX = 'stax_';

/**
 * Generate a new API key
 * Returns the full key (only shown once) and saves hash to database
 */
export async function generateApiKey(
  userId: string,
  name: string,
  options: {
    permissions?: string;
    rateLimit?: number;
    expiresAt?: Date;
  } = {}
): Promise<{ key: string; keyId: string; keyPrefix: string }> {
  // Generate random key: stax_[32 random chars]
  const randomPart = crypto.randomBytes(24).toString('base64url');
  const fullKey = `${API_KEY_PREFIX}${randomPart}`;
  
  // Hash the key for storage
  const keyHash = hashApiKey(fullKey);
  const keyPrefix = fullKey.substring(0, 12); // "stax_abc1234"
  
  // Save to database
  const apiKey = await prisma.apiKey.create({
    data: {
      userId,
      name,
      keyHash,
      keyPrefix,
      permissions: options.permissions || 'calculate',
      rateLimit: options.rateLimit || 1000,
      expiresAt: options.expiresAt,
    },
  });
  
  return {
    key: fullKey,
    keyId: apiKey.id,
    keyPrefix,
  };
}

/**
 * Hash an API key with SHA-256
 */
export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Validate an API key and return the associated data
 */
export async function validateApiKey(key: string): Promise<{
  valid: boolean;
  userId?: string;
  keyId?: string;
  permissions?: string;
  error?: string;
}> {
  // Check prefix
  if (!key.startsWith(API_KEY_PREFIX)) {
    return { valid: false, error: 'Invalid API key format' };
  }
  
  // Hash and lookup
  const keyHash = hashApiKey(key);
  
  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
  });
  
  if (!apiKey) {
    return { valid: false, error: 'Invalid API key' };
  }
  
  // Check if active
  if (!apiKey.isActive) {
    return { valid: false, error: 'API key is inactive' };
  }
  
  // Check expiration
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return { valid: false, error: 'API key has expired' };
  }
  
  // Update usage stats (non-blocking)
  prisma.apiKey.update({
    where: { id: apiKey.id },
    data: {
      lastUsedAt: new Date(),
      usageCount: { increment: 1 },
    },
  }).catch(() => {
    // Ignore errors - don't fail the request for stats
  });
  
  return {
    valid: true,
    userId: apiKey.userId,
    keyId: apiKey.id,
    permissions: apiKey.permissions,
  };
}

/**
 * List API keys for a user (returns prefix only, not full key)
 */
export async function listApiKeys(userId: string) {
  return prisma.apiKey.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      permissions: true,
      lastUsedAt: true,
      usageCount: true,
      isActive: true,
      expiresAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Revoke (deactivate) an API key
 */
export async function revokeApiKey(userId: string, keyId: string): Promise<boolean> {
  const result = await prisma.apiKey.updateMany({
    where: { id: keyId, userId },
    data: { isActive: false },
  });
  
  return result.count > 0;
}

/**
 * Delete an API key
 */
export async function deleteApiKey(userId: string, keyId: string): Promise<boolean> {
  const result = await prisma.apiKey.deleteMany({
    where: { id: keyId, userId },
  });
  
  return result.count > 0;
}
