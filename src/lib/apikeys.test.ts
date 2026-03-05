/**
 * API Keys Unit Tests
 * Tests for API key generation, hashing, and validation
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import crypto from 'crypto';

// Mock prisma before importing apikeys
vi.mock('./prisma', () => ({
  prisma: {
    apiKey: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { hashApiKey, generateApiKey, validateApiKey, listApiKeys, revokeApiKey, deleteApiKey } from './apikeys';
import { prisma } from './prisma';

describe('API Keys', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // hashApiKey tests (pure function, no mocking needed)
  // ==========================================================================
  
  describe('hashApiKey', () => {
    test('returns consistent hash for same input', () => {
      const key = 'stax_testkey123456789012345678';
      const hash1 = hashApiKey(key);
      const hash2 = hashApiKey(key);
      
      expect(hash1).toBe(hash2);
    });
    
    test('returns different hashes for different inputs', () => {
      const key1 = 'stax_key1aaaaaaaaaaaaaaaaaaaa';
      const key2 = 'stax_key2bbbbbbbbbbbbbbbbbbbb';
      
      expect(hashApiKey(key1)).not.toBe(hashApiKey(key2));
    });
    
    test('returns 64-character hex string (SHA-256)', () => {
      const key = 'stax_anykeyvaluehere12345';
      const hash = hashApiKey(key);
      
      expect(hash).toHaveLength(64);
      expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
    });
    
    test('hash matches expected SHA-256 output', () => {
      const key = 'stax_test';
      const expectedHash = crypto.createHash('sha256').update(key).digest('hex');
      
      expect(hashApiKey(key)).toBe(expectedHash);
    });
    
    test('handles empty string', () => {
      const hash = hashApiKey('');
      expect(hash).toHaveLength(64);
    });
    
    test('handles unicode characters', () => {
      const key = 'stax_test🔑émoji';
      const hash = hashApiKey(key);
      
      expect(hash).toHaveLength(64);
      expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
    });
    
    test('handles very long keys', () => {
      const key = 'stax_' + 'a'.repeat(10000);
      const hash = hashApiKey(key);
      
      expect(hash).toHaveLength(64);
    });
  });

  // ==========================================================================
  // generateApiKey tests
  // ==========================================================================
  
  describe('generateApiKey', () => {
    test('generates key with stax_ prefix', async () => {
      vi.mocked(prisma.apiKey.create).mockResolvedValueOnce({
        id: 'key-123',
        userId: 'user-1',
        name: 'Test Key',
        keyHash: 'hash',
        keyPrefix: 'stax_abc1234',
        permissions: 'calculate',
        rateLimit: 1000,
        isActive: true,
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastUsedAt: null,
        expiresAt: null,
      });
      
      const result = await generateApiKey('user-1', 'Test Key');
      
      expect(result.key).toMatch(/^stax_/);
    });
    
    test('generates unique keys on each call', async () => {
      vi.mocked(prisma.apiKey.create)
        .mockResolvedValueOnce({
          id: 'key-1',
          userId: 'user-1',
          name: 'Key 1',
          keyHash: 'hash1',
          keyPrefix: 'stax_abc1111',
          permissions: 'calculate',
          rateLimit: 1000,
          isActive: true,
          usageCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastUsedAt: null,
          expiresAt: null,
        })
        .mockResolvedValueOnce({
          id: 'key-2',
          userId: 'user-1',
          name: 'Key 2',
          keyHash: 'hash2',
          keyPrefix: 'stax_abc2222',
          permissions: 'calculate',
          rateLimit: 1000,
          isActive: true,
          usageCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastUsedAt: null,
          expiresAt: null,
        });
      
      const result1 = await generateApiKey('user-1', 'Key 1');
      const result2 = await generateApiKey('user-1', 'Key 2');
      
      expect(result1.key).not.toBe(result2.key);
    });
    
    test('keyPrefix is first 12 characters of key', async () => {
      (vi.mocked(prisma.apiKey.create) as any).mockImplementation(async (args: any) => ({
        id: 'key-123',
        userId: args.data.userId,
        name: args.data.name,
        keyHash: args.data.keyHash,
        keyPrefix: args.data.keyPrefix,
        permissions: args.data.permissions || 'calculate',
        rateLimit: args.data.rateLimit || 1000,
        isActive: true,
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastUsedAt: null,
        expiresAt: args.data.expiresAt || null,
      }));
      
      const result = await generateApiKey('user-1', 'Test Key');
      
      expect(result.keyPrefix).toBe(result.key.substring(0, 12));
      expect(result.keyPrefix).toMatch(/^stax_/);
    });
    
    test('saves hashed key to database, not plain key', async () => {
      (vi.mocked(prisma.apiKey.create) as any).mockImplementation(async (args: any) => ({
        id: 'key-123',
        userId: args.data.userId,
        name: args.data.name,
        keyHash: args.data.keyHash,
        keyPrefix: args.data.keyPrefix,
        permissions: args.data.permissions || 'calculate',
        rateLimit: args.data.rateLimit || 1000,
        isActive: true,
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastUsedAt: null,
        expiresAt: null,
      }));
      
      const result = await generateApiKey('user-1', 'Test Key');
      
      expect(prisma.apiKey.create).toHaveBeenCalledOnce();
      const createCall = vi.mocked(prisma.apiKey.create).mock.calls[0][0];
      
      // Verify hash is stored, not plain key
      expect(createCall.data.keyHash).not.toBe(result.key);
      expect(createCall.data.keyHash).toBe(hashApiKey(result.key));
    });
    
    test('uses default permissions when not specified', async () => {
      (vi.mocked(prisma.apiKey.create) as any).mockImplementation(async (args: any) => ({
        id: 'key-123',
        userId: args.data.userId,
        name: args.data.name,
        keyHash: args.data.keyHash,
        keyPrefix: args.data.keyPrefix,
        permissions: args.data.permissions || 'calculate',
        rateLimit: args.data.rateLimit || 1000,
        isActive: true,
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastUsedAt: null,
        expiresAt: null,
      }));
      
      await generateApiKey('user-1', 'Test Key');
      
      const createCall = vi.mocked(prisma.apiKey.create).mock.calls[0][0];
      expect(createCall.data.permissions).toBe('calculate');
    });
    
    test('uses default rate limit when not specified', async () => {
      (vi.mocked(prisma.apiKey.create) as any).mockImplementation(async (args: any) => ({
        id: 'key-123',
        userId: args.data.userId,
        name: args.data.name,
        keyHash: args.data.keyHash,
        keyPrefix: args.data.keyPrefix,
        permissions: args.data.permissions || 'calculate',
        rateLimit: args.data.rateLimit || 1000,
        isActive: true,
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastUsedAt: null,
        expiresAt: null,
      }));
      
      await generateApiKey('user-1', 'Test Key');
      
      const createCall = vi.mocked(prisma.apiKey.create).mock.calls[0][0];
      expect(createCall.data.rateLimit).toBe(1000);
    });
    
    test('accepts custom permissions', async () => {
      (vi.mocked(prisma.apiKey.create) as any).mockImplementation(async (args: any) => ({
        id: 'key-123',
        userId: args.data.userId,
        name: args.data.name,
        keyHash: args.data.keyHash,
        keyPrefix: args.data.keyPrefix,
        permissions: args.data.permissions || 'calculate',
        rateLimit: args.data.rateLimit || 1000,
        isActive: true,
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastUsedAt: null,
        expiresAt: null,
      }));
      
      await generateApiKey('user-1', 'Test Key', { permissions: 'full' });
      
      const createCall = vi.mocked(prisma.apiKey.create).mock.calls[0][0];
      expect(createCall.data.permissions).toBe('full');
    });
    
    test('accepts custom rate limit', async () => {
      (vi.mocked(prisma.apiKey.create) as any).mockImplementation(async (args: any) => ({
        id: 'key-123',
        userId: args.data.userId,
        name: args.data.name,
        keyHash: args.data.keyHash,
        keyPrefix: args.data.keyPrefix,
        permissions: args.data.permissions || 'calculate',
        rateLimit: args.data.rateLimit || 1000,
        isActive: true,
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastUsedAt: null,
        expiresAt: null,
      }));
      
      await generateApiKey('user-1', 'Test Key', { rateLimit: 5000 });
      
      const createCall = vi.mocked(prisma.apiKey.create).mock.calls[0][0];
      expect(createCall.data.rateLimit).toBe(5000);
    });
    
    test('accepts expiration date', async () => {
      const expiresAt = new Date('2030-01-01');
      
      (vi.mocked(prisma.apiKey.create) as any).mockImplementation(async (args: any) => ({
        id: 'key-123',
        userId: args.data.userId,
        name: args.data.name,
        keyHash: args.data.keyHash,
        keyPrefix: args.data.keyPrefix,
        permissions: args.data.permissions || 'calculate',
        rateLimit: args.data.rateLimit || 1000,
        isActive: true,
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastUsedAt: null,
        expiresAt: args.data.expiresAt || null,
      }));
      
      await generateApiKey('user-1', 'Test Key', { expiresAt });
      
      const createCall = vi.mocked(prisma.apiKey.create).mock.calls[0][0];
      expect(createCall.data.expiresAt).toBe(expiresAt);
    });
  });

  // ==========================================================================
  // validateApiKey tests
  // ==========================================================================
  
  describe('validateApiKey', () => {
    test('rejects key without stax_ prefix', async () => {
      const result = await validateApiKey('invalid_key_format');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid API key format');
    });
    
    test('rejects key with wrong prefix', async () => {
      const result = await validateApiKey('api_wrongprefix123');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid API key format');
    });
    
    test('rejects key not found in database', async () => {
      vi.mocked(prisma.apiKey.findUnique).mockResolvedValueOnce(null);
      
      const result = await validateApiKey('stax_notfoundkey12345678');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid API key');
    });
    
    test('rejects inactive key', async () => {
      vi.mocked(prisma.apiKey.findUnique).mockResolvedValueOnce({
        id: 'key-123',
        userId: 'user-1',
        name: 'Test Key',
        keyHash: hashApiKey('stax_inactivekey123456789'),
        keyPrefix: 'stax_inactiv',
        permissions: 'calculate',
        rateLimit: 1000,
        isActive: false,
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastUsedAt: null,
        expiresAt: null,
      });
      
      const result = await validateApiKey('stax_inactivekey123456789');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('API key is inactive');
    });
    
    test('rejects expired key', async () => {
      const pastDate = new Date('2020-01-01');
      
      vi.mocked(prisma.apiKey.findUnique).mockResolvedValueOnce({
        id: 'key-123',
        userId: 'user-1',
        name: 'Test Key',
        keyHash: hashApiKey('stax_expiredkey1234567890'),
        keyPrefix: 'stax_expire',
        permissions: 'calculate',
        rateLimit: 1000,
        isActive: true,
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastUsedAt: null,
        expiresAt: pastDate,
      });
      
      const result = await validateApiKey('stax_expiredkey1234567890');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('API key has expired');
    });
    
    test('accepts valid active key', async () => {
      vi.mocked(prisma.apiKey.findUnique).mockResolvedValueOnce({
        id: 'key-123',
        userId: 'user-1',
        name: 'Test Key',
        keyHash: hashApiKey('stax_validkey123456789012'),
        keyPrefix: 'stax_validk',
        permissions: 'calculate',
        rateLimit: 1000,
        isActive: true,
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastUsedAt: null,
        expiresAt: null,
      });
      
      // Mock the update call (usage stats)
      vi.mocked(prisma.apiKey.update).mockResolvedValueOnce({} as any);
      
      const result = await validateApiKey('stax_validkey123456789012');
      
      expect(result.valid).toBe(true);
      expect(result.userId).toBe('user-1');
      expect(result.keyId).toBe('key-123');
      expect(result.permissions).toBe('calculate');
    });
    
    test('accepts key with future expiration', async () => {
      const futureDate = new Date('2030-12-31');
      
      vi.mocked(prisma.apiKey.findUnique).mockResolvedValueOnce({
        id: 'key-123',
        userId: 'user-1',
        name: 'Test Key',
        keyHash: hashApiKey('stax_futurekey12345678901'),
        keyPrefix: 'stax_future',
        permissions: 'full',
        rateLimit: 5000,
        isActive: true,
        usageCount: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastUsedAt: null,
        expiresAt: futureDate,
      });
      
      vi.mocked(prisma.apiKey.update).mockResolvedValueOnce({} as any);
      
      const result = await validateApiKey('stax_futurekey12345678901');
      
      expect(result.valid).toBe(true);
      expect(result.permissions).toBe('full');
    });
    
    test('looks up key by hash, not plain text', async () => {
      const testKey = 'stax_testkeyforhashing123';
      const expectedHash = hashApiKey(testKey);
      
      vi.mocked(prisma.apiKey.findUnique).mockResolvedValueOnce(null);
      
      await validateApiKey(testKey);
      
      expect(prisma.apiKey.findUnique).toHaveBeenCalledWith({
        where: { keyHash: expectedHash },
      });
    });
  });

  // ==========================================================================
  // listApiKeys tests
  // ==========================================================================
  
  describe('listApiKeys', () => {
    test('returns empty array for user with no keys', async () => {
      vi.mocked(prisma.apiKey.findMany).mockResolvedValueOnce([]);
      
      const result = await listApiKeys('user-1');
      
      expect(result).toEqual([]);
    });
    
    test('returns keys for user', async () => {
      (vi.mocked(prisma.apiKey.findMany) as any).mockResolvedValueOnce([
        {
          id: 'key-1',
          name: 'Production Key',
          keyPrefix: 'stax_prod12',
          permissions: 'full',
          lastUsedAt: new Date('2024-01-15'),
          usageCount: 100,
          isActive: true,
          expiresAt: null,
          createdAt: new Date('2024-01-01'),
        },
        {
          id: 'key-2',
          name: 'Test Key',
          keyPrefix: 'stax_test12',
          permissions: 'calculate',
          lastUsedAt: null,
          usageCount: 0,
          isActive: true,
          expiresAt: null,
          createdAt: new Date('2024-01-10'),
        },
      ]);
      
      const result = await listApiKeys('user-1');
      
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Production Key');
      expect(result[1].name).toBe('Test Key');
    });
    
    test('does not return keyHash (security)', async () => {
      (vi.mocked(prisma.apiKey.findMany) as any).mockResolvedValueOnce([
        {
          id: 'key-1',
          name: 'Test Key',
          keyPrefix: 'stax_test12',
          permissions: 'calculate',
          lastUsedAt: null,
          usageCount: 0,
          isActive: true,
          expiresAt: null,
          createdAt: new Date(),
        },
      ]);
      
      const result = await listApiKeys('user-1');
      
      // Verify the select clause doesn't include keyHash
      expect(prisma.apiKey.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.not.objectContaining({ keyHash: true }),
        })
      );
    });
    
    test('orders by createdAt descending', async () => {
      vi.mocked(prisma.apiKey.findMany).mockResolvedValueOnce([]);
      
      await listApiKeys('user-1');
      
      expect(prisma.apiKey.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        })
      );
    });
  });

  // ==========================================================================
  // revokeApiKey tests
  // ==========================================================================
  
  describe('revokeApiKey', () => {
    test('returns true when key successfully revoked', async () => {
      vi.mocked(prisma.apiKey.updateMany).mockResolvedValueOnce({ count: 1 });
      
      const result = await revokeApiKey('user-1', 'key-123');
      
      expect(result).toBe(true);
    });
    
    test('returns false when key not found', async () => {
      vi.mocked(prisma.apiKey.updateMany).mockResolvedValueOnce({ count: 0 });
      
      const result = await revokeApiKey('user-1', 'nonexistent-key');
      
      expect(result).toBe(false);
    });
    
    test('sets isActive to false', async () => {
      vi.mocked(prisma.apiKey.updateMany).mockResolvedValueOnce({ count: 1 });
      
      await revokeApiKey('user-1', 'key-123');
      
      expect(prisma.apiKey.updateMany).toHaveBeenCalledWith({
        where: { id: 'key-123', userId: 'user-1' },
        data: { isActive: false },
      });
    });
    
    test('requires matching userId (prevents cross-user revocation)', async () => {
      vi.mocked(prisma.apiKey.updateMany).mockResolvedValueOnce({ count: 1 });
      
      await revokeApiKey('user-1', 'key-123');
      
      expect(prisma.apiKey.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'user-1' }),
        })
      );
    });
  });

  // ==========================================================================
  // deleteApiKey tests
  // ==========================================================================
  
  describe('deleteApiKey', () => {
    test('returns true when key successfully deleted', async () => {
      vi.mocked(prisma.apiKey.deleteMany).mockResolvedValueOnce({ count: 1 });
      
      const result = await deleteApiKey('user-1', 'key-123');
      
      expect(result).toBe(true);
    });
    
    test('returns false when key not found', async () => {
      vi.mocked(prisma.apiKey.deleteMany).mockResolvedValueOnce({ count: 0 });
      
      const result = await deleteApiKey('user-1', 'nonexistent-key');
      
      expect(result).toBe(false);
    });
    
    test('requires matching userId (prevents cross-user deletion)', async () => {
      vi.mocked(prisma.apiKey.deleteMany).mockResolvedValueOnce({ count: 1 });
      
      await deleteApiKey('user-1', 'key-123');
      
      expect(prisma.apiKey.deleteMany).toHaveBeenCalledWith({
        where: { id: 'key-123', userId: 'user-1' },
      });
    });
  });
});
