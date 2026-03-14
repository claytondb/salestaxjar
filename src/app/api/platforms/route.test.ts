/**
 * Tests for GET /api/platforms and DELETE /api/platforms
 *
 * Covers:
 *   GET  — auth guard, platform list with tier-gating, connection counts,
 *          userPlan field, totalConnections, empty state
 *   DELETE — auth guard, missing fields, successful disconnect, delete error
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Mocks ─────────────────────────────────────────────────────────────────

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('@/lib/platforms', () => ({
  getUserConnections: vi.fn(),
  getPlatformConfigurations: vi.fn(),
  deleteConnection: vi.fn(),
}));

vi.mock('@/lib/plans', () => ({
  resolveUserPlan: vi.fn(),
  canConnectPlatform: vi.fn(),
  getPlanDisplayName: vi.fn(),
}));

import { GET, DELETE } from './route';
import { getCurrentUser } from '@/lib/auth';
import { getUserConnections, getPlatformConfigurations, deleteConnection } from '@/lib/platforms';
import { resolveUserPlan, canConnectPlatform, getPlanDisplayName } from '@/lib/plans';

// ─── Helpers ────────────────────────────────────────────────────────────────

function deleteRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/platforms', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', host: 'localhost:3000' },
    body: JSON.stringify(body),
  });
}

// ─── Mock data ───────────────────────────────────────────────────────────────

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  emailVerified: true,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  subscription: { plan: 'starter', status: 'active' },
};

const mockConfigurations = [
  { platform: 'shopify', name: 'Shopify', enabled: true },
  { platform: 'woocommerce', name: 'WooCommerce', enabled: true },
];

const mockConnections = [
  {
    id: 'conn-1',
    platform: 'shopify',
    platformId: 'shop-123',
    platformName: 'My Shopify Store',
    lastSyncAt: new Date('2026-03-01T00:00:00Z'),
    syncStatus: 'success',
    syncError: null,
    connected: true,
  },
];

// ─── GET /api/platforms ───────────────────────────────────────────────────────

describe('GET /api/platforms', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(mockUser as never);
    vi.mocked(getUserConnections).mockResolvedValue(mockConnections as never);
    vi.mocked(getPlatformConfigurations).mockReturnValue(mockConfigurations as never);
    vi.mocked(resolveUserPlan).mockReturnValue('starter');
    vi.mocked(canConnectPlatform).mockReturnValue({ allowed: true, requiredPlan: 'starter' } as never);
    vi.mocked(getPlanDisplayName).mockReturnValue('Starter');
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 200 with platform list on success', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.platforms).toBeDefined();
    expect(Array.isArray(body.platforms)).toBe(true);
  });

  it('includes userPlan in response', async () => {
    const res = await GET();
    const body = await res.json();
    expect(body.userPlan).toBe('starter');
  });

  it('includes totalConnections count', async () => {
    const res = await GET();
    const body = await res.json();
    expect(body.totalConnections).toBe(1);
  });

  it('sets totalConnections to 0 when no connections', async () => {
    vi.mocked(getUserConnections).mockResolvedValue([]);
    const res = await GET();
    const body = await res.json();
    expect(body.totalConnections).toBe(0);
  });

  it('maps connections to their platforms', async () => {
    const res = await GET();
    const body = await res.json();
    const shopify = body.platforms.find((p: { platform: string }) => p.platform === 'shopify');
    expect(shopify).toBeDefined();
    expect(shopify.connectedCount).toBe(1);
    expect(shopify.connections).toHaveLength(1);
    expect(shopify.connections[0].platformId).toBe('shop-123');
  });

  it('sets connectedCount to 0 for unconnected platforms', async () => {
    const res = await GET();
    const body = await res.json();
    const woo = body.platforms.find((p: { platform: string }) => p.platform === 'woocommerce');
    expect(woo.connectedCount).toBe(0);
    expect(woo.connections).toHaveLength(0);
  });

  it('includes tier-gating fields on each platform', async () => {
    vi.mocked(canConnectPlatform).mockImplementation((_plan, platform) => ({
      allowed: platform === 'shopify',
      requiredPlan: 'starter' as const,
    }));
    const res = await GET();
    const body = await res.json();
    const shopify = body.platforms.find((p: { platform: string }) => p.platform === 'shopify');
    expect(shopify.allowed).toBe(true);
    expect(shopify.requiredPlan).toBe('starter');
    expect(shopify.requiredPlanName).toBe('Starter');
  });

  it('returns 500 when getUserConnections throws', async () => {
    vi.mocked(getUserConnections).mockRejectedValue(new Error('DB error'));
    const res = await GET();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Failed to fetch platforms');
  });

  it('returns 500 when getPlatformConfigurations throws', async () => {
    vi.mocked(getPlatformConfigurations).mockImplementation(() => {
      throw new Error('config error');
    });
    const res = await GET();
    expect(res.status).toBe(500);
  });

  it('handles empty configurations list', async () => {
    vi.mocked(getPlatformConfigurations).mockReturnValue([]);
    vi.mocked(getUserConnections).mockResolvedValue([]);
    const res = await GET();
    const body = await res.json();
    expect(body.platforms).toHaveLength(0);
    expect(body.totalConnections).toBe(0);
  });

  it('calls resolveUserPlan with user subscription', async () => {
    await GET();
    expect(resolveUserPlan).toHaveBeenCalledWith(mockUser.subscription);
  });

  it('calls getUserConnections with user id', async () => {
    await GET();
    expect(getUserConnections).toHaveBeenCalledWith('user-1');
  });
});

// ─── DELETE /api/platforms ────────────────────────────────────────────────────

describe('DELETE /api/platforms', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(mockUser as never);
    vi.mocked(deleteConnection).mockResolvedValue({ success: true });
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const req = deleteRequest({ platform: 'shopify', platformId: 'shop-123' });
    const res = await DELETE(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 400 when platform is missing', async () => {
    const req = deleteRequest({ platformId: 'shop-123' });
    const res = await DELETE(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Missing');
  });

  it('returns 400 when platformId is missing', async () => {
    const req = deleteRequest({ platform: 'shopify' });
    const res = await DELETE(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Missing');
  });

  it('returns 400 when both platform and platformId are missing', async () => {
    const req = deleteRequest({});
    const res = await DELETE(req);
    expect(res.status).toBe(400);
  });

  it('returns 200 and success:true on successful disconnect', async () => {
    const req = deleteRequest({ platform: 'shopify', platformId: 'shop-123' });
    const res = await DELETE(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('calls deleteConnection with correct args', async () => {
    const req = deleteRequest({ platform: 'shopify', platformId: 'shop-abc' });
    await DELETE(req);
    expect(deleteConnection).toHaveBeenCalledWith('user-1', 'shopify', 'shop-abc');
  });

  it('returns 400 when deleteConnection returns an error', async () => {
    vi.mocked(deleteConnection).mockResolvedValue({ success: false, error: 'Connection not found' });
    const req = deleteRequest({ platform: 'shopify', platformId: 'shop-123' });
    const res = await DELETE(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Connection not found');
  });

  it('returns 500 when deleteConnection throws', async () => {
    vi.mocked(deleteConnection).mockRejectedValue(new Error('DB crash'));
    const req = deleteRequest({ platform: 'shopify', platformId: 'shop-123' });
    const res = await DELETE(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Failed to disconnect platform');
  });

  it('handles woocommerce platform disconnect', async () => {
    const req = deleteRequest({ platform: 'woocommerce', platformId: 'woo-xyz' });
    const res = await DELETE(req);
    expect(res.status).toBe(200);
    expect(deleteConnection).toHaveBeenCalledWith('user-1', 'woocommerce', 'woo-xyz');
  });
});
