/**
 * Tests for POST /api/platforms/bigcommerce/sync
 *
 * Covers:
 *   - Auth guard (401)
 *   - Tier gate (403)
 *   - Free user order import block (403)
 *   - Order limit exceeded (403)
 *   - Zod validation: missing/empty platformId
 *   - No credentials in DB (404)
 *   - No connection in DB (404)
 *   - Successful sync with usage stats (200)
 *   - Truncated sync (200 with truncated flag)
 *   - Near-limit / at-limit warnings
 *   - fetchOrderShippingAddresses called for address enrichment
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

vi.mock('@/lib/platforms/bigcommerce', () => ({
  getCredentials: vi.fn(),
  fetchAllOrders: vi.fn(),
  fetchOrderShippingAddresses: vi.fn(),
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
import { getCredentials, fetchAllOrders, fetchOrderShippingAddresses, mapOrderToImport } from '@/lib/platforms/bigcommerce';
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
  return new NextRequest('http://localhost:3000/api/platforms/bigcommerce/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', host: 'localhost:3000' },
    body: JSON.stringify(body),
  });
}

const validBody = {
  platformId: 'abc123',
  daysBack: 30,
};

// ─── Mock fixtures ────────────────────────────────────────────────────────────

const proUser = {
  id: 'user-1',
  email: 'user@example.com',
  name: 'Test User',
  emailVerified: true,
  createdAt: new Date(),
  subscription: { plan: 'pro', status: 'active' },
};

const freeUser = {
  ...proUser,
  id: 'user-free',
  subscription: { plan: 'free', status: null },
};

const mockConnection = {
  id: 'conn-1',
  userId: 'user-1',
  platform: 'bigcommerce',
  platformId: 'abc123',
};

const mockOrders = [
  { id: 101, status: 'Completed', total_inc_tax: '49.99' },
  { id: 102, status: 'Awaiting Fulfillment', total_inc_tax: '29.99' },
];

const mockShippingAddresses = {
  101: [{ state: 'CA', zip: '90210', country_iso2: 'US' }],
  102: [{ state: 'TX', zip: '75001', country_iso2: 'US' }],
};

const mockMappedOrder = { orderId: '101', shippingState: 'CA', totalAmount: 4999 };

const normalUsageStatus = {
  currentCount: 20,
  limit: 5000,
  remaining: 4980,
  percentUsed: 0,
  atLimit: false,
  nearLimit: false,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/platforms/bigcommerce/sync', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(proUser as never);
    vi.mocked(userCanConnectPlatform).mockReturnValue({ allowed: true, userPlan: 'pro', requiredPlan: 'starter' } as never);
    vi.mocked(canImportOrders).mockResolvedValue({ allowed: true } as never);
    vi.mocked(getCredentials).mockResolvedValue({ storeHash: 'abc123', accessToken: 'tok_abc' } as never);
    vi.mocked(prisma.platformConnection.findUnique).mockResolvedValue(mockConnection as never);
    vi.mocked(updateSyncStatus).mockResolvedValue(undefined as never);
    vi.mocked(fetchAllOrders).mockResolvedValue(mockOrders as never);
    vi.mocked(fetchOrderShippingAddresses).mockResolvedValue(mockShippingAddresses as never);
    vi.mocked(mapOrderToImport).mockReturnValue(mockMappedOrder as never);
    vi.mocked(getImportableOrderCount).mockResolvedValue({ truncated: false, canImport: 5000 } as never);
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

  it('calls userCanConnectPlatform with bigcommerce', async () => {
    await POST(postRequest(validBody));
    expect(userCanConnectPlatform).toHaveBeenCalledWith(proUser, 'bigcommerce');
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
    expect(updateSyncStatus).toHaveBeenCalledWith('user-1', 'bigcommerce', 'abc123', 'syncing');
    expect(updateSyncStatus).toHaveBeenCalledWith('user-1', 'bigcommerce', 'abc123', 'success');
  });

  it('fetches shipping addresses for orders', async () => {
    await POST(postRequest(validBody));
    expect(fetchOrderShippingAddresses).toHaveBeenCalled();
  });

  it('includes totalOrders and processed counts', async () => {
    const res = await POST(postRequest(validBody));
    const body = await res.json();
    expect(body.totalOrders).toBe(2);
    expect(body.processed).toBe(2);
  });

  it('includes statesFound in response', async () => {
    vi.mocked(mapOrderToImport).mockReturnValue({ orderId: '101', shippingState: 'NY', totalAmount: 4999 } as never);
    const res = await POST(postRequest(validBody));
    const body = await res.json();
    expect(body.statesFound).toBeInstanceOf(Array);
  });

  // ── Truncation ────────────────────────────────────────────────────────────

  it('truncates and sets truncated flag when import limit reached', async () => {
    const manyOrders = Array.from({ length: 10 }, (_, i) => ({ id: i + 1, status: 'Completed', total_inc_tax: '10.00' }));
    vi.mocked(fetchAllOrders).mockResolvedValue(manyOrders as never);
    vi.mocked(fetchOrderShippingAddresses).mockResolvedValue({} as never);
    vi.mocked(getImportableOrderCount).mockResolvedValue({ truncated: true, canImport: 5 } as never);
    vi.mocked(saveImportedOrders).mockResolvedValue({ imported: 5, errors: 0 } as never);
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.truncated).toBe(true);
    expect(body.skipped).toBe(5);
  });

  // ── Usage warnings ────────────────────────────────────────────────────────

  it('includes near_limit warning', async () => {
    vi.mocked(getUserUsageStatus).mockResolvedValue({ ...normalUsageStatus, percentUsed: 90, nearLimit: true } as never);
    const res = await POST(postRequest(validBody));
    const body = await res.json();
    expect(body.warning).toBe('near_limit');
  });

  it('includes limit_reached warning when at limit', async () => {
    vi.mocked(getUserUsageStatus).mockResolvedValue({ ...normalUsageStatus, atLimit: true, nearLimit: false } as never);
    const res = await POST(postRequest(validBody));
    const body = await res.json();
    expect(body.warning).toBe('limit_reached');
  });

  // ── Sync error handling ───────────────────────────────────────────────────

  it('sets sync status to error and returns 500 when fetchAllOrders throws', async () => {
    vi.mocked(fetchAllOrders).mockRejectedValue(new Error('BigCommerce API error'));
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Sync failed');
    expect(updateSyncStatus).toHaveBeenCalledWith('user-1', 'bigcommerce', 'abc123', 'error', 'BigCommerce API error');
  });

  it('returns 500 when saveImportedOrders throws', async () => {
    vi.mocked(saveImportedOrders).mockRejectedValue(new Error('DB write failed'));
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.details).toBe('DB write failed');
  });

  // ── Default daysBack ──────────────────────────────────────────────────────

  it('accepts request without daysBack (uses default)', async () => {
    const res = await POST(postRequest({ platformId: 'abc123' }));
    expect(res.status).toBe(200);
  });
});
