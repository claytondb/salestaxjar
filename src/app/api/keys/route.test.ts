/**
 * Tests for /api/keys route
 *
 * Tests API key management: listing keys (Pro tier gated) and
 * creating new keys (Pro tier gated). Covers auth, tier enforcement,
 * validation, and error handling.
 * Uses mocks for database and authentication.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies before importing route
vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('@/lib/apikeys', () => ({
  generateApiKey: vi.fn(),
  listApiKeys: vi.fn(),
}));

vi.mock('@/lib/plans', () => ({
  userCanAccess: vi.fn(),
  tierGateError: vi.fn(),
}));

import { GET, POST } from './route';
import { getCurrentUser } from '@/lib/auth';
import { generateApiKey, listApiKeys } from '@/lib/apikeys';
import { userCanAccess, tierGateError } from '@/lib/plans';

// =============================================================================
// Helpers
// =============================================================================

function postRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/keys', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', host: 'localhost:3000' },
    body: JSON.stringify(body),
  });
}

// =============================================================================
// Mock Data
// =============================================================================

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  emailVerified: true,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  subscription: {
    stripeSubscriptionId: 'sub_123',
    plan: 'pro',
    status: 'active',
    currentPeriodEnd: new Date('2026-04-01T00:00:00Z'),
    cancelAtPeriodEnd: false,
  },
};

const mockFreeUser = {
  ...mockUser,
  subscription: null,
};

const mockApiKey1 = {
  id: 'key-123',
  userId: 'user-123',
  name: 'My API Key',
  keyPrefix: 'sk_live_abc123',
  keyHash: 'hashed-key',
  permissions: 'calculate',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  lastUsedAt: null,
  revokedAt: null,
};

const mockApiKey2 = {
  id: 'key-456',
  userId: 'user-123',
  name: 'Second Key',
  keyPrefix: 'sk_live_def456',
  keyHash: 'hashed-key-2',
  permissions: 'full',
  createdAt: new Date('2026-02-01T00:00:00Z'),
  lastUsedAt: new Date('2026-03-01T00:00:00Z'),
  revokedAt: null,
};

const mockCreateKeyResult = {
  key: 'sk_live_abc123_full_secret_key',
  keyId: 'key-789',
  keyPrefix: 'sk_live_abc123',
};

const mockTierGateError = {
  error: 'API keys require Pro plan',
  requiredPlan: 'pro',
  currentPlan: 'free',
  feature: 'api_keys',
};

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
  vi.mocked(userCanAccess).mockReturnValue({ allowed: true, userPlan: 'pro', requiredPlan: 'pro' });
  vi.mocked(tierGateError).mockReturnValue(mockTierGateError);
  vi.mocked(listApiKeys).mockResolvedValue([mockApiKey1, mockApiKey2]);
  vi.mocked(generateApiKey).mockResolvedValue(mockCreateKeyResult);
});

// =============================================================================
// GET Tests - Authentication
// =============================================================================

describe('GET /api/keys - authentication', () => {
  it('should return 401 when not authenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('should return 200 for Pro user', async () => {
    const response = await GET();
    expect(response.status).toBe(200);
  });
});

// =============================================================================
// GET Tests - Tier Gate
// =============================================================================

describe('GET /api/keys - tier gate', () => {
  it('should return 403 for free tier user', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(mockFreeUser);
    vi.mocked(userCanAccess).mockReturnValue({ allowed: false, userPlan: 'free', requiredPlan: 'pro' });
    const response = await GET();
    expect(response.status).toBe(403);
  });

  it('should return tier gate error details for free user', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(mockFreeUser);
    vi.mocked(userCanAccess).mockReturnValue({ allowed: false, userPlan: 'free', requiredPlan: 'pro' });
    const response = await GET();
    const body = await response.json();
    expect(body).toEqual(mockTierGateError);
  });

  it('should check api_keys feature specifically', async () => {
    await GET();
    expect(userCanAccess).toHaveBeenCalledWith(mockUser, 'api_keys');
  });
});

// =============================================================================
// GET Tests - Response Format
// =============================================================================

describe('GET /api/keys - response format', () => {
  it('should return keys array', async () => {
    const response = await GET();
    const body = await response.json();
    expect(body.keys).toBeDefined();
    expect(Array.isArray(body.keys)).toBe(true);
  });

  it('should return all keys for user', async () => {
    const response = await GET();
    const body = await response.json();
    expect(body.keys).toHaveLength(2);
  });

  it('should return empty array when user has no keys', async () => {
    vi.mocked(listApiKeys).mockResolvedValue([]);
    const response = await GET();
    const body = await response.json();
    expect(body.keys).toEqual([]);
  });

  it('should call listApiKeys with correct user id', async () => {
    await GET();
    expect(listApiKeys).toHaveBeenCalledWith('user-123');
  });
});

// =============================================================================
// GET Tests - Error Handling
// =============================================================================

describe('GET /api/keys - error handling', () => {
  it('should return 500 on listApiKeys error', async () => {
    vi.mocked(listApiKeys).mockRejectedValue(new Error('DB error'));
    const response = await GET();
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Internal server error');
  });
});

// =============================================================================
// POST Tests - Authentication
// =============================================================================

describe('POST /api/keys - authentication', () => {
  it('should return 401 when not authenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const response = await POST(postRequest({ name: 'My Key' }));
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });
});

// =============================================================================
// POST Tests - Tier Gate
// =============================================================================

describe('POST /api/keys - tier gate', () => {
  it('should return 403 for free tier user', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(mockFreeUser);
    vi.mocked(userCanAccess).mockReturnValue({ allowed: false, userPlan: 'free', requiredPlan: 'pro' });
    const response = await POST(postRequest({ name: 'My Key' }));
    expect(response.status).toBe(403);
  });

  it('should check api_keys feature specifically', async () => {
    await POST(postRequest({ name: 'My Key' }));
    expect(userCanAccess).toHaveBeenCalledWith(mockUser, 'api_keys');
  });
});

// =============================================================================
// POST Tests - Validation
// =============================================================================

describe('POST /api/keys - validation', () => {
  it('should return 400 when name is missing', async () => {
    const response = await POST(postRequest({ permissions: 'calculate' }));
    expect(response.status).toBe(400);
  });

  it('should return 400 when name is empty string', async () => {
    const response = await POST(postRequest({ name: '' }));
    expect(response.status).toBe(400);
  });

  it('should return 400 when name is too long (>100 chars)', async () => {
    const response = await POST(postRequest({ name: 'a'.repeat(101) }));
    expect(response.status).toBe(400);
  });

  it('should accept valid name', async () => {
    const response = await POST(postRequest({ name: 'My API Key' }));
    expect(response.status).toBe(200);
  });

  it('should return 400 for invalid permissions value', async () => {
    const response = await POST(postRequest({ name: 'My Key', permissions: 'admin' }));
    expect(response.status).toBe(400);
  });

  it('should accept calculate permissions', async () => {
    const response = await POST(postRequest({ name: 'My Key', permissions: 'calculate' }));
    expect(response.status).toBe(200);
  });

  it('should accept sync permissions', async () => {
    const response = await POST(postRequest({ name: 'My Key', permissions: 'sync' }));
    expect(response.status).toBe(200);
  });

  it('should accept full permissions', async () => {
    const response = await POST(postRequest({ name: 'My Key', permissions: 'full' }));
    expect(response.status).toBe(200);
  });

  it('should accept name up to 100 characters', async () => {
    const response = await POST(postRequest({ name: 'a'.repeat(100) }));
    expect(response.status).toBe(200);
  });
});

// =============================================================================
// POST Tests - Key Creation
// =============================================================================

describe('POST /api/keys - key creation', () => {
  it('should return success with key on creation', async () => {
    const response = await POST(postRequest({ name: 'My Key' }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
  });

  it('should return the full key (one-time only)', async () => {
    const response = await POST(postRequest({ name: 'My Key' }));
    const body = await response.json();
    expect(body.key).toBe('sk_live_abc123_full_secret_key');
  });

  it('should return keyId', async () => {
    const response = await POST(postRequest({ name: 'My Key' }));
    const body = await response.json();
    expect(body.keyId).toBe('key-789');
  });

  it('should return keyPrefix', async () => {
    const response = await POST(postRequest({ name: 'My Key' }));
    const body = await response.json();
    expect(body.keyPrefix).toBe('sk_live_abc123');
  });

  it('should return a message to save the key securely', async () => {
    const response = await POST(postRequest({ name: 'My Key' }));
    const body = await response.json();
    expect(body.message).toContain('Save');
  });

  it('should pass name and permissions to generateApiKey', async () => {
    await POST(postRequest({ name: 'My Key', permissions: 'full' }));
    expect(generateApiKey).toHaveBeenCalledWith(
      'user-123',
      'My Key',
      { permissions: 'full' }
    );
  });

  it('should default to calculate permissions when not specified', async () => {
    await POST(postRequest({ name: 'My Key' }));
    expect(generateApiKey).toHaveBeenCalledWith(
      'user-123',
      'My Key',
      { permissions: 'calculate' }
    );
  });
});

// =============================================================================
// POST Tests - Error Handling
// =============================================================================

describe('POST /api/keys - error handling', () => {
  it('should return 500 on generateApiKey error', async () => {
    vi.mocked(generateApiKey).mockRejectedValue(new Error('DB error'));
    const response = await POST(postRequest({ name: 'My Key' }));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Internal server error');
  });
});
