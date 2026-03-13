/**
 * Tests for /api/keys/[id] route
 *
 * Tests API key management by ID: DELETE (hard-delete) and
 * PATCH (soft-revoke). Both are gated to Pro tier.
 * Covers auth, tier enforcement, not-found handling,
 * revoke action validation, and error handling.
 * Uses mocks for database and authentication.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies before importing route
vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('@/lib/apikeys', () => ({
  deleteApiKey: vi.fn(),
  revokeApiKey: vi.fn(),
}));

vi.mock('@/lib/plans', () => ({
  userCanAccess: vi.fn(),
  tierGateError: vi.fn(),
}));

import { DELETE, PATCH } from './route';
import { getCurrentUser } from '@/lib/auth';
import { deleteApiKey, revokeApiKey } from '@/lib/apikeys';
import { userCanAccess, tierGateError } from '@/lib/plans';

// =============================================================================
// Helpers
// =============================================================================

function makeDeleteRequest(id: string): [NextRequest, { params: Promise<{ id: string }> }] {
  const req = new NextRequest(`http://localhost:3000/api/keys/${id}`, {
    method: 'DELETE',
    headers: { host: 'localhost:3000' },
  });
  const ctx = { params: Promise.resolve({ id }) };
  return [req, ctx];
}

function makePatchRequest(id: string, body: unknown): [NextRequest, { params: Promise<{ id: string }> }] {
  const req = new NextRequest(`http://localhost:3000/api/keys/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', host: 'localhost:3000' },
    body: JSON.stringify(body),
  });
  const ctx = { params: Promise.resolve({ id }) };
  return [req, ctx];
}

// =============================================================================
// Mock Data
// =============================================================================

const mockProUser = {
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
  ...mockProUser,
  subscription: null,
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
  vi.mocked(getCurrentUser).mockResolvedValue(mockProUser);
  vi.mocked(userCanAccess).mockReturnValue({ allowed: true, userPlan: 'pro', requiredPlan: 'pro' });
  vi.mocked(tierGateError).mockReturnValue(mockTierGateError);
  vi.mocked(deleteApiKey).mockResolvedValue(true);
  vi.mocked(revokeApiKey).mockResolvedValue(true);
});

// =============================================================================
// DELETE Tests - Authentication
// =============================================================================

describe('DELETE /api/keys/[id] - authentication', () => {
  it('should return 401 when not authenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const [req, ctx] = makeDeleteRequest('key-123');
    const response = await DELETE(req, ctx);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('should return 200 for authenticated Pro user', async () => {
    const [req, ctx] = makeDeleteRequest('key-123');
    const response = await DELETE(req, ctx);
    expect(response.status).toBe(200);
  });
});

// =============================================================================
// DELETE Tests - Tier Gate
// =============================================================================

describe('DELETE /api/keys/[id] - tier gate', () => {
  it('should return 403 for free tier user', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(mockFreeUser);
    vi.mocked(userCanAccess).mockReturnValue({ allowed: false, userPlan: 'free', requiredPlan: 'pro' });
    const [req, ctx] = makeDeleteRequest('key-123');
    const response = await DELETE(req, ctx);
    expect(response.status).toBe(403);
  });

  it('should return tier gate error body for free user', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(mockFreeUser);
    vi.mocked(userCanAccess).mockReturnValue({ allowed: false, userPlan: 'free', requiredPlan: 'pro' });
    const [req, ctx] = makeDeleteRequest('key-123');
    const response = await DELETE(req, ctx);
    const body = await response.json();
    expect(body).toEqual(mockTierGateError);
  });

  it('should check api_keys feature specifically', async () => {
    const [req, ctx] = makeDeleteRequest('key-123');
    await DELETE(req, ctx);
    expect(userCanAccess).toHaveBeenCalledWith(mockProUser, 'api_keys');
  });
});

// =============================================================================
// DELETE Tests - Deletion
// =============================================================================

describe('DELETE /api/keys/[id] - deletion', () => {
  it('should return success: true when key is deleted', async () => {
    const [req, ctx] = makeDeleteRequest('key-123');
    const response = await DELETE(req, ctx);
    const body = await response.json();
    expect(body.success).toBe(true);
  });

  it('should call deleteApiKey with correct userId and keyId', async () => {
    const [req, ctx] = makeDeleteRequest('key-abc');
    await DELETE(req, ctx);
    expect(deleteApiKey).toHaveBeenCalledWith('user-123', 'key-abc');
  });

  it('should return 404 when key not found', async () => {
    vi.mocked(deleteApiKey).mockResolvedValue(false);
    const [req, ctx] = makeDeleteRequest('key-nonexistent');
    const response = await DELETE(req, ctx);
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toContain('not found');
  });
});

// =============================================================================
// DELETE Tests - Error Handling
// =============================================================================

describe('DELETE /api/keys/[id] - error handling', () => {
  it('should return 500 on deleteApiKey error', async () => {
    vi.mocked(deleteApiKey).mockRejectedValue(new Error('DB error'));
    const [req, ctx] = makeDeleteRequest('key-123');
    const response = await DELETE(req, ctx);
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Internal server error');
  });
});

// =============================================================================
// PATCH Tests - Authentication
// =============================================================================

describe('PATCH /api/keys/[id] - authentication', () => {
  it('should return 401 when not authenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const [req, ctx] = makePatchRequest('key-123', { action: 'revoke' });
    const response = await PATCH(req, ctx);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });
});

// =============================================================================
// PATCH Tests - Tier Gate
// =============================================================================

describe('PATCH /api/keys/[id] - tier gate', () => {
  it('should return 403 for free tier user', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(mockFreeUser);
    vi.mocked(userCanAccess).mockReturnValue({ allowed: false, userPlan: 'free', requiredPlan: 'pro' });
    const [req, ctx] = makePatchRequest('key-123', { action: 'revoke' });
    const response = await PATCH(req, ctx);
    expect(response.status).toBe(403);
  });

  it('should check api_keys feature specifically', async () => {
    const [req, ctx] = makePatchRequest('key-123', { action: 'revoke' });
    await PATCH(req, ctx);
    expect(userCanAccess).toHaveBeenCalledWith(mockProUser, 'api_keys');
  });
});

// =============================================================================
// PATCH Tests - Action Validation
// =============================================================================

describe('PATCH /api/keys/[id] - action validation', () => {
  it('should return 400 for unknown action', async () => {
    const [req, ctx] = makePatchRequest('key-123', { action: 'delete' });
    const response = await PATCH(req, ctx);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('Invalid action');
  });

  it('should return 400 when action is missing', async () => {
    const [req, ctx] = makePatchRequest('key-123', {});
    const response = await PATCH(req, ctx);
    expect(response.status).toBe(400);
  });

  it('should accept revoke action', async () => {
    const [req, ctx] = makePatchRequest('key-123', { action: 'revoke' });
    const response = await PATCH(req, ctx);
    expect(response.status).toBe(200);
  });
});

// =============================================================================
// PATCH Tests - Revoke
// =============================================================================

describe('PATCH /api/keys/[id] - revoke', () => {
  it('should return success: true when key is revoked', async () => {
    const [req, ctx] = makePatchRequest('key-123', { action: 'revoke' });
    const response = await PATCH(req, ctx);
    const body = await response.json();
    expect(body.success).toBe(true);
  });

  it('should return a message on successful revoke', async () => {
    const [req, ctx] = makePatchRequest('key-123', { action: 'revoke' });
    const response = await PATCH(req, ctx);
    const body = await response.json();
    expect(body.message).toContain('revoked');
  });

  it('should call revokeApiKey with correct userId and keyId', async () => {
    const [req, ctx] = makePatchRequest('key-abc', { action: 'revoke' });
    await PATCH(req, ctx);
    expect(revokeApiKey).toHaveBeenCalledWith('user-123', 'key-abc');
  });

  it('should return 404 when key not found', async () => {
    vi.mocked(revokeApiKey).mockResolvedValue(false);
    const [req, ctx] = makePatchRequest('key-nonexistent', { action: 'revoke' });
    const response = await PATCH(req, ctx);
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toContain('not found');
  });
});

// =============================================================================
// PATCH Tests - Error Handling
// =============================================================================

describe('PATCH /api/keys/[id] - error handling', () => {
  it('should return 500 on revokeApiKey error', async () => {
    vi.mocked(revokeApiKey).mockRejectedValue(new Error('DB error'));
    const [req, ctx] = makePatchRequest('key-123', { action: 'revoke' });
    const response = await PATCH(req, ctx);
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Internal server error');
  });
});
