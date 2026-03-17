/**
 * Tests for POST /api/platforms/woocommerce/sync
 *
 * Covers:
 *   - Auth guard (401)
 *   - Tier gate (403 for free users)
 *   - Free user order import block (403)
 *   - Order limit exceeded (403)
 *   - Zod validation: missing/empty platformId
 *   - No credentials in DB (404)
 *   - No connection in DB (404)
 *   - Successful sync with full usage stats (200)
 *   - Truncated sync when order limit applies (200 with truncated flag)
 *   - Near-limit warning in response
 *   - At-limit warning in response
 *   - Sync error updates status to 'error' and rethrows (500)
 *   - Internal server error (unexpected throw)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Mocks ─────────────────────────────────────────────────────────────────

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    platformConnection: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/platforms/woocommerce', () => ({
  getCredentials: vi.fn(),
  fetchAllOrders: vi.fn(),
  mapOrderToImport: vi.fn(),
}));

vi.mock('@/lib/platforms', () => ({
  saveImportedOrders: vi.fn(),
  updateSyncStatus: vi.fn(),
}));

vi.mock('@/lib/plans', () => ({
  userCanConnectPlatform: vi.fn(),
  tierGateError: vi.fn(),
}));

vi.mock('@/lib/usage', () => ({
  canImportOrders: vi.fn(),
  getImportableOrderCount: vi.fn(),
  freeUserImportError: vi.fn(),
  orderLimitExceededError: vi.fn(),
  getUserUsageStatus: vi.fn(),
}));

import { POST } from './route';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getCredentials, fetchAllOrders, mapOrderToImport } from '@/lib/platforms/woocommerce';
import { saveImportedOrders, updateSyncStatus } from '@/lib/platforms';
import { userCanConnectPlatform, tierGateError } from '@/lib/plans';
import {
  canImportOrders,
  getImportableOrderCount,
  freeUserImportError,
  orderLimitExceededError,
  getUserUsageStatus,
} from '@/lib/usage';

// ─── Helpers ────────────────────────────────────────────────────────────────

function postRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/platforms/woocommerce/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', host: 'localhost:3000' },
    body: JSON.stringify(body),
  });
}

const validBody = {
  platformId: 'https://myshop.com',
  daysBack: 30,
};

// ─── Mock fixtures ────────────────────────────────────────────────────────────

const starterUser = {
  id: 'user-1',
  email: 'user@example.com',
  name: 'Test User',
  emailVerified: true,
  createdAt: new Date(),
  subscription: { plan: 'starter', status: 'active' },
};

const freeUser = {
  ...starterUser,
  id: 'user-free',
  subscription: { plan: 'free', status: null },
};

const mockConnection = {
  id: 'conn-1',
  userId: 'user-1',
  platform: 'woocommerce',
  platformId: 'https://myshop.com',
};

const mockOrders = [
  { id: 1, status: 'completed', total: '49.99' },
  { id: 2, status: 'processing', total: '29.99' },
];

const mockMappedOrders = [
  { orderId: '1', shippingState: 'CA', totalAmount: 4999 },
  { orderId: '2', shippingState: 'TX', totalAmount: 2999 },
];

const normalUsageStatus = {
  currentCount: 10,
  limit: 500,
  remaining: 490,
  percentUsed: 2,
  atLimit: false,
  nearLimit: false,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/platforms/woocommerce/sync', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(starterUser as never);
    vi.mocked(userCanConnectPlatform).mockReturnValue({ allowed: true, userPlan: 'starter', requiredPlan: 'starter' } as never);
    vi.mocked(canImportOrders).mockResolvedValue({ allowed: true } as never);
    vi.mocked(getCredentials).mockResolvedValue({ storeUrl: 'https://myshop.com', consumerKey: 'ck_abc', consumerSecret: 'cs_xyz' } as never);
    vi.mocked(prisma.platformConnection.findUnique).mockResolvedValue(mockConnection as never);
    vi.mocked(updateSyncStatus).mockResolvedValue(undefined as never);
    vi.mocked(fetchAllOrders).mockResolvedValue(mockOrders as never);
    vi.mocked(mapOrderToImport).mockImplementation((_order, _platformId) => mockMappedOrders[0] as never);
    vi.mocked(getImportableOrderCount).mockResolvedValue({ truncated: false, canImport: 500 } as never);
    vi.mocked(saveImportedOrders).mockResolvedValue({ imported: 2, errors: 0 } as never);
    vi.mocked(getUserUsageStatus).mockResolvedValue(normalUsageStatus as never);
  });

  // ── Auth ──────────────────────────────────────────────────────────────────

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  // ── Tier gate ─────────────────────────────────────────────────────────────

  it('returns 403 when user cannot connect woocommerce', async () => {
    vi.mocked(userCanConnectPlatform).mockReturnValue({ allowed: false, userPlan: 'free', requiredPlan: 'starter' } as never);
    vi.mocked(tierGateError).mockReturnValue({ error: 'Upgrade required', code: 'TIER_GATE' } as never);
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('Upgrade');
  });

  it('calls userCanConnectPlatform with woocommerce', async () => {
    await POST(postRequest(validBody));
    expect(userCanConnectPlatform).toHaveBeenCalledWith(starterUser, 'woocommerce');
  });

  // ── Order limit gates ─────────────────────────────────────────────────────

  it('returns 403 free user import error when limit is 0', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(freeUser as never);
    vi.mocked(userCanConnectPlatform).mockReturnValue({ allowed: true, userPlan: 'free', requiredPlan: 'free' } as never);
    vi.mocked(canImportOrders).mockResolvedValue({ allowed: false, limit: 0 } as never);
    vi.mocked(freeUserImportError).mockReturnValue({ error: 'Free users cannot import', code: 'FREE_LIMIT' } as never);
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('Free');
  });

  it('returns 403 order limit exceeded when limit > 0 but at cap', async () => {
    vi.mocked(canImportOrders).mockResolvedValue({ allowed: false, limit: 500, currentCount: 500 } as never);
    vi.mocked(orderLimitExceededError).mockReturnValue({ error: 'Monthly order limit reached', code: 'ORDER_LIMIT' } as never);
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('limit');
  });

  // ── Validation ────────────────────────────────────────────────────────────

  it('returns 400 when platformId is missing', async () => {
    const { platformId: _p, ...noId } = validBody;
    const res = await POST(postRequest(noId));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid request');
  });

  it('returns 400 when platformId is empty string', async () => {
    const res = await POST(postRequest({ ...validBody, platformId: '' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid request');
  });

  it('includes validation details in 400 response', async () => {
    const res = await POST(postRequest({ platformId: '' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.details).toBeDefined();
  });

  // ── Not found paths ───────────────────────────────────────────────────────

  it('returns 404 when credentials not found', async () => {
    vi.mocked(getCredentials).mockResolvedValue(null);
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain('not found');
  });

  it('returns 404 when platform connection not in DB', async () => {
    vi.mocked(prisma.platformConnection.findUnique).mockResolvedValue(null);
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain('not found');
  });

  // ── Happy path ────────────────────────────────────────────────────────────

  it('returns 200 with sync results on success', async () => {
    vi.mocked(mapOrderToImport).mockImplementation((order, _) => mockMappedOrders[Number(order.id) - 1] as never);
    vi.mocked(getImportableOrderCount).mockResolvedValue({ truncated: false, canImport: 500 } as never);
    vi.mocked(saveImportedOrders).mockResolvedValue({ imported: 2, errors: 0 } as never);
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.imported).toBe(2);
    expect(body.errors).toBe(0);
    expect(body.usage).toBeDefined();
    expect(body.usage.current).toBe(10);
  });

  it('sets sync status to syncing then success', async () => {
    await POST(postRequest(validBody));
    expect(updateSyncStatus).toHaveBeenCalledWith('user-1', 'woocommerce', 'https://myshop.com', 'syncing');
    expect(updateSyncStatus).toHaveBeenCalledWith('user-1', 'woocommerce', 'https://myshop.com', 'success');
  });

  it('includes date range in response', async () => {
    const res = await POST(postRequest(validBody));
    const body = await res.json();
    expect(body.dateRange).toBeDefined();
    expect(body.dateRange.from).toBeDefined();
    expect(body.dateRange.to).toBeDefined();
  });

  it('includes statesFound in response', async () => {
    vi.mocked(mapOrderToImport).mockImplementation((_order, _) => ({ orderId: '1', shippingState: 'CA', totalAmount: 4999 }) as never);
    const res = await POST(postRequest(validBody));
    const body = await res.json();
    expect(body.statesFound).toBeInstanceOf(Array);
    expect(body.statesFound).toContain('CA');
  });

  // ── Truncation ────────────────────────────────────────────────────────────

  it('truncates orders when limit exceeded and sets truncated flag', async () => {
    const manyOrders = Array.from({ length: 10 }, (_, i) => ({ id: i + 1, status: 'completed', total: '10.00' }));
    vi.mocked(fetchAllOrders).mockResolvedValue(manyOrders as never);
    vi.mocked(getImportableOrderCount).mockResolvedValue({ truncated: true, canImport: 5 } as never);
    vi.mocked(mapOrderToImport).mockImplementation((_o) => ({ orderId: '1', shippingState: 'CA', totalAmount: 1000 }) as never);
    vi.mocked(saveImportedOrders).mockResolvedValue({ imported: 5, errors: 0 } as never);
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.truncated).toBe(true);
    expect(body.skipped).toBe(5);
    expect(body.message).toContain('skipped');
    // Should only process 5
    expect(saveImportedOrders).toHaveBeenCalledWith(
      'user-1',
      'conn-1',
      expect.arrayContaining([expect.any(Object)]),
    );
  });

  // ── Usage warnings ────────────────────────────────────────────────────────

  it('includes near_limit warning when near limit', async () => {
    vi.mocked(getUserUsageStatus).mockResolvedValue({
      ...normalUsageStatus,
      percentUsed: 85,
      nearLimit: true,
      atLimit: false,
    } as never);
    const res = await POST(postRequest(validBody));
    const body = await res.json();
    expect(body.warning).toBe('near_limit');
    expect(body.warningMessage).toBeDefined();
  });

  it('includes limit_reached warning when at limit', async () => {
    vi.mocked(getUserUsageStatus).mockResolvedValue({
      ...normalUsageStatus,
      percentUsed: 100,
      nearLimit: false,
      atLimit: true,
    } as never);
    const res = await POST(postRequest(validBody));
    const body = await res.json();
    expect(body.warning).toBe('limit_reached');
    expect(body.warningMessage).toBeDefined();
  });

  it('does not include warning when usage is normal', async () => {
    const res = await POST(postRequest(validBody));
    const body = await res.json();
    expect(body.warning).toBeUndefined();
  });

  // ── Sync error handling ───────────────────────────────────────────────────

  it('sets sync status to error and returns 500 when fetchAllOrders throws', async () => {
    vi.mocked(fetchAllOrders).mockRejectedValue(new Error('WooCommerce API down'));
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Sync failed');
    expect(updateSyncStatus).toHaveBeenCalledWith('user-1', 'woocommerce', 'https://myshop.com', 'error', 'WooCommerce API down');
  });

  it('returns 500 when getCurrentUser throws', async () => {
    vi.mocked(getCurrentUser).mockRejectedValue(new Error('Session error'));
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Sync failed');
  });

  it('includes error details in 500 response', async () => {
    vi.mocked(fetchAllOrders).mockRejectedValue(new Error('timeout'));
    const res = await POST(postRequest(validBody));
    const body = await res.json();
    expect(body.details).toBe('timeout');
  });

  // ── Default daysBack ──────────────────────────────────────────────────────

  it('accepts request without daysBack (uses default 30)', async () => {
    const res = await POST(postRequest({ platformId: 'https://myshop.com' }));
    expect(res.status).toBe(200);
  });
});
