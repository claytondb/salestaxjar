/**
 * Tests for POST /api/platforms/squarespace/sync
 *
 * Covers:
 *   - Auth guard (401)
 *   - Tier gate (403)
 *   - Free user order import block (403)
 *   - Order limit exceeded (403)
 *   - Zod validation: missing/empty platformId
 *   - No credentials/api key in DB (404)
 *   - No connection in DB (404)
 *   - Successful sync (200 with usage stats)
 *   - testmode orders filtered out
 *   - CANCELED orders filtered out
 *   - Truncated sync (200 with truncated flag)
 *   - Near-limit / at-limit warnings
 *   - Sync error sets status to 'error' and returns 500
 *   - Internal server error (500)
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

vi.mock('@/lib/platforms/squarespace', () => ({
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
import { getCredentials, fetchAllOrders, mapOrderToImport } from '@/lib/platforms/squarespace';
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
  return new NextRequest('http://localhost:3000/api/platforms/squarespace/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', host: 'localhost:3000' },
    body: JSON.stringify(body),
  });
}

const validBody = {
  platformId: 'my-squarespace-store',
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
  platform: 'squarespace',
  platformId: 'my-squarespace-store',
};

const mockOrders = [
  { id: 'order-1', testmode: false, fulfillmentStatus: 'FULFILLED', channelName: 'website', grandTotal: { value: '49.99', currency: 'USD' } },
  { id: 'order-2', testmode: false, fulfillmentStatus: 'PENDING', channelName: 'website', grandTotal: { value: '29.99', currency: 'USD' } },
];

const mockMappedOrder = { orderId: 'order-1', shippingState: 'CA', totalAmount: 4999 };

const normalUsageStatus = {
  currentCount: 5,
  limit: 500,
  remaining: 495,
  percentUsed: 1,
  atLimit: false,
  nearLimit: false,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/platforms/squarespace/sync', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(starterUser as never);
    vi.mocked(userCanConnectPlatform).mockReturnValue({ allowed: true, userPlan: 'starter', requiredPlan: 'starter' } as never);
    vi.mocked(canImportOrders).mockResolvedValue({ allowed: true } as never);
    vi.mocked(getCredentials).mockResolvedValue('sq_api_key_abc123' as never);
    vi.mocked(prisma.platformConnection.findUnique).mockResolvedValue(mockConnection as never);
    vi.mocked(updateSyncStatus).mockResolvedValue(undefined as never);
    vi.mocked(fetchAllOrders).mockResolvedValue(mockOrders as never);
    vi.mocked(mapOrderToImport).mockReturnValue(mockMappedOrder as never);
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

  it('returns 403 when tier gate blocks', async () => {
    vi.mocked(userCanConnectPlatform).mockReturnValue({ allowed: false, userPlan: 'free', requiredPlan: 'starter' } as never);
    vi.mocked(tierGateError).mockReturnValue({ error: 'Upgrade required', code: 'TIER_GATE' } as never);
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(403);
  });

  it('calls userCanConnectPlatform with squarespace', async () => {
    await POST(postRequest(validBody));
    expect(userCanConnectPlatform).toHaveBeenCalledWith(starterUser, 'squarespace');
  });

  // ── Order limit gates ─────────────────────────────────────────────────────

  it('returns 403 when free user tries to import', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(freeUser as never);
    vi.mocked(userCanConnectPlatform).mockReturnValue({ allowed: true, userPlan: 'free', requiredPlan: 'free' } as never);
    vi.mocked(canImportOrders).mockResolvedValue({ allowed: false, limit: 0 } as never);
    vi.mocked(freeUserImportError).mockReturnValue({ error: 'Free users cannot import', code: 'FREE_LIMIT' } as never);
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('Free');
  });

  it('returns 403 when order limit exceeded', async () => {
    vi.mocked(canImportOrders).mockResolvedValue({ allowed: false, limit: 500, currentCount: 500 } as never);
    vi.mocked(orderLimitExceededError).mockReturnValue({ error: 'Order limit reached', code: 'ORDER_LIMIT' } as never);
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(403);
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
  });

  // ── Not found paths ───────────────────────────────────────────────────────

  it('returns 404 when api key (credentials) not found', async () => {
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

  // ── Order filtering ───────────────────────────────────────────────────────

  it('filters out testmode orders', async () => {
    const ordersWithTest = [
      ...mockOrders,
      { id: 'order-test', testmode: true, fulfillmentStatus: 'FULFILLED', grandTotal: { value: '5.00', currency: 'USD' } },
    ];
    vi.mocked(fetchAllOrders).mockResolvedValue(ordersWithTest as never);
    await POST(postRequest(validBody));
    // Only 2 valid orders should be passed to getImportableOrderCount
    expect(getImportableOrderCount).toHaveBeenCalledWith('user-1', starterUser.subscription, 2);
  });

  it('filters out CANCELED orders', async () => {
    const ordersWithCanceled = [
      ...mockOrders,
      { id: 'order-canceled', testmode: false, fulfillmentStatus: 'CANCELED', grandTotal: { value: '15.00', currency: 'USD' } },
    ];
    vi.mocked(fetchAllOrders).mockResolvedValue(ordersWithCanceled as never);
    await POST(postRequest(validBody));
    // Only 2 valid orders should be passed
    expect(getImportableOrderCount).toHaveBeenCalledWith('user-1', starterUser.subscription, 2);
  });

  // ── Happy path ────────────────────────────────────────────────────────────

  it('returns 200 with sync results', async () => {
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.imported).toBe(2);
    expect(body.errors).toBe(0);
    expect(body.usage).toBeDefined();
  });

  it('sets sync status to syncing then success', async () => {
    await POST(postRequest(validBody));
    expect(updateSyncStatus).toHaveBeenCalledWith('user-1', 'squarespace', 'my-squarespace-store', 'syncing');
    expect(updateSyncStatus).toHaveBeenCalledWith('user-1', 'squarespace', 'my-squarespace-store', 'success');
  });

  it('includes totalOrders, validOrders, and processed in response', async () => {
    const res = await POST(postRequest(validBody));
    const body = await res.json();
    expect(body.totalOrders).toBe(2);
    expect(body.validOrders).toBe(2);
    expect(body.processed).toBe(2);
  });

  it('includes date range in response', async () => {
    const res = await POST(postRequest(validBody));
    const body = await res.json();
    expect(body.dateRange).toBeDefined();
    expect(body.dateRange.from).toBeDefined();
    expect(body.dateRange.to).toBeDefined();
  });

  it('includes statesFound in response', async () => {
    const res = await POST(postRequest(validBody));
    const body = await res.json();
    expect(body.statesFound).toBeInstanceOf(Array);
  });

  // ── Truncation ────────────────────────────────────────────────────────────

  it('truncates orders and sets truncated flag', async () => {
    const manyOrders = Array.from({ length: 10 }, (_, i) => ({
      id: `order-${i}`,
      testmode: false,
      fulfillmentStatus: 'FULFILLED',
      grandTotal: { value: '10.00', currency: 'USD' },
    }));
    vi.mocked(fetchAllOrders).mockResolvedValue(manyOrders as never);
    vi.mocked(getImportableOrderCount).mockResolvedValue({ truncated: true, canImport: 5 } as never);
    vi.mocked(saveImportedOrders).mockResolvedValue({ imported: 5, errors: 0 } as never);
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.truncated).toBe(true);
    expect(body.skipped).toBe(5);
    expect(body.message).toContain('skipped');
  });

  // ── Usage warnings ────────────────────────────────────────────────────────

  it('includes near_limit warning when near limit', async () => {
    vi.mocked(getUserUsageStatus).mockResolvedValue({ ...normalUsageStatus, percentUsed: 88, nearLimit: true } as never);
    const res = await POST(postRequest(validBody));
    const body = await res.json();
    expect(body.warning).toBe('near_limit');
    expect(body.warningMessage).toContain('88%');
  });

  it('includes limit_reached warning when at limit', async () => {
    vi.mocked(getUserUsageStatus).mockResolvedValue({ ...normalUsageStatus, atLimit: true, nearLimit: false } as never);
    const res = await POST(postRequest(validBody));
    const body = await res.json();
    expect(body.warning).toBe('limit_reached');
  });

  it('does not include warning key when usage is normal', async () => {
    const res = await POST(postRequest(validBody));
    const body = await res.json();
    expect(body.warning).toBeUndefined();
  });

  // ── Sync error handling ───────────────────────────────────────────────────

  it('sets sync status to error and returns 500 when fetchAllOrders throws', async () => {
    vi.mocked(fetchAllOrders).mockRejectedValue(new Error('Squarespace API error'));
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Sync failed');
    expect(updateSyncStatus).toHaveBeenCalledWith('user-1', 'squarespace', 'my-squarespace-store', 'error', 'Squarespace API error');
  });

  it('includes error details in 500 response', async () => {
    vi.mocked(fetchAllOrders).mockRejectedValue(new Error('timeout'));
    const res = await POST(postRequest(validBody));
    const body = await res.json();
    expect(body.details).toBe('timeout');
  });

  it('returns 500 when saveImportedOrders throws', async () => {
    vi.mocked(saveImportedOrders).mockRejectedValue(new Error('DB error'));
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(500);
  });

  // ── Default daysBack ──────────────────────────────────────────────────────

  it('accepts request without daysBack (uses default)', async () => {
    const res = await POST(postRequest({ platformId: 'my-squarespace-store' }));
    expect(res.status).toBe(200);
  });
});
