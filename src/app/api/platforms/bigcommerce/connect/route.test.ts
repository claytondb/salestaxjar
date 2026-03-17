/**
 * Tests for POST /api/platforms/bigcommerce/connect
 *
 * Covers:
 *   - Auth guard (401)
 *   - Tier gate (403 for free/starter users)
 *   - Zod validation: missing/empty storeHash, accessToken
 *   - storeHash cleaning (strips stores/xxx/v3 prefix)
 *   - Invalid credentials (validation returns valid:false)
 *   - Save connection failure (DB error)
 *   - Successful connection (200 with store info)
 *   - Optional storeName fallback
 *   - Internal server error (unexpected throw)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Mocks ─────────────────────────────────────────────────────────────────

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('@/lib/platforms/bigcommerce', () => ({
  validateCredentials: vi.fn(),
  saveConnection: vi.fn(),
}));

vi.mock('@/lib/plans', () => ({
  userCanConnectPlatform: vi.fn(),
  tierGateError: vi.fn(),
}));

import { POST } from './route';
import { getCurrentUser } from '@/lib/auth';
import { validateCredentials, saveConnection } from '@/lib/platforms/bigcommerce';
import { userCanConnectPlatform, tierGateError } from '@/lib/plans';

// ─── Helpers ────────────────────────────────────────────────────────────────

function postRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/platforms/bigcommerce/connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', host: 'localhost:3000' },
    body: JSON.stringify(body),
  });
}

const validBody = {
  storeHash: 'abc123',
  accessToken: 'tok_abc123xyz',
};

// ─── Mock user fixtures ───────────────────────────────────────────────────────

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

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/platforms/bigcommerce/connect', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(proUser as never);
    vi.mocked(userCanConnectPlatform).mockReturnValue({ allowed: true, userPlan: 'pro', requiredPlan: 'pro' } as never);
    vi.mocked(validateCredentials).mockResolvedValue({
      valid: true,
      storeInfo: { name: 'My BC Store', domain: 'mybcstore.mybigcommerce.com', plan_name: 'Standard' },
    } as never);
    vi.mocked(saveConnection).mockResolvedValue({ success: true, connectionId: 'conn-bc-1' } as never);
  });

  // ── Auth ──────────────────────────────────────────────────────────────────

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 401 even with valid payload when no user session', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(401);
    // validateCredentials should not be called
    expect(validateCredentials).not.toHaveBeenCalled();
  });

  // ── Tier gate ─────────────────────────────────────────────────────────────

  it('returns 403 for free plan user', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(freeUser as never);
    vi.mocked(userCanConnectPlatform).mockReturnValue({ allowed: false, userPlan: 'free', requiredPlan: 'pro' } as never);
    vi.mocked(tierGateError).mockReturnValue({ error: 'Upgrade required', code: 'TIER_GATE' } as never);
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('Upgrade');
  });

  it('calls userCanConnectPlatform with bigcommerce platform', async () => {
    await POST(postRequest(validBody));
    expect(userCanConnectPlatform).toHaveBeenCalledWith(proUser, 'bigcommerce');
  });

  it('does not call validateCredentials when tier gate blocks', async () => {
    vi.mocked(userCanConnectPlatform).mockReturnValue({ allowed: false, userPlan: 'free', requiredPlan: 'pro' } as never);
    vi.mocked(tierGateError).mockReturnValue({ error: 'Upgrade required' } as never);
    await POST(postRequest(validBody));
    expect(validateCredentials).not.toHaveBeenCalled();
  });

  // ── Validation ────────────────────────────────────────────────────────────

  it('returns 400 when storeHash is missing', async () => {
    const { storeHash: _h, ...bodyNoHash } = validBody;
    const res = await POST(postRequest(bodyNoHash));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid request');
  });

  it('returns 400 when accessToken is missing', async () => {
    const { accessToken: _t, ...bodyNoToken } = validBody;
    const res = await POST(postRequest(bodyNoToken));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid request');
  });

  it('returns 400 when storeHash is empty string', async () => {
    const res = await POST(postRequest({ ...validBody, storeHash: '' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.details).toBeDefined();
  });

  it('returns 400 when accessToken is empty string', async () => {
    const res = await POST(postRequest({ ...validBody, accessToken: '' }));
    expect(res.status).toBe(400);
  });

  it('includes validation details in 400 response', async () => {
    const res = await POST(postRequest({ storeHash: '' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.details).toBeDefined();
  });

  // ── storeHash cleaning ────────────────────────────────────────────────────

  it('strips stores/ prefix from storeHash', async () => {
    const res = await POST(postRequest({ ...validBody, storeHash: 'stores/abc123/v3' }));
    expect(res.status).toBe(200);
    expect(validateCredentials).toHaveBeenCalledWith(
      expect.objectContaining({ storeHash: 'abc123' }),
    );
  });

  it('passes clean storeHash when no prefix present', async () => {
    await POST(postRequest(validBody));
    expect(validateCredentials).toHaveBeenCalledWith(
      expect.objectContaining({ storeHash: 'abc123' }),
    );
  });

  it('strips trailing path segments from pasted API URL', async () => {
    await POST(postRequest({ ...validBody, storeHash: 'stores/xyz789/v2' }));
    expect(validateCredentials).toHaveBeenCalledWith(
      expect.objectContaining({ storeHash: 'xyz789' }),
    );
  });

  // ── Credential validation ─────────────────────────────────────────────────

  it('calls validateCredentials with storeHash and accessToken', async () => {
    await POST(postRequest(validBody));
    expect(validateCredentials).toHaveBeenCalledWith({ storeHash: 'abc123', accessToken: 'tok_abc123xyz' });
  });

  it('returns 400 when validateCredentials returns valid:false', async () => {
    vi.mocked(validateCredentials).mockResolvedValue({
      valid: false,
      error: 'Invalid access token',
    } as never);
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid credentials');
    expect(body.details).toBe('Invalid access token');
    expect(body.hint).toBeDefined();
  });

  it('includes helpful hint in invalid credentials error', async () => {
    vi.mocked(validateCredentials).mockResolvedValue({ valid: false, error: 'Forbidden' } as never);
    const res = await POST(postRequest(validBody));
    const body = await res.json();
    expect(body.hint).toContain('Store Hash');
  });

  // ── Save connection ───────────────────────────────────────────────────────

  it('calls saveConnection with correct args', async () => {
    await POST(postRequest(validBody));
    expect(saveConnection).toHaveBeenCalledWith(
      'user-1',
      { storeHash: 'abc123', accessToken: 'tok_abc123xyz' },
      'My BC Store',
    );
  });

  it('uses provided storeName when storeInfo.name is not available', async () => {
    vi.mocked(validateCredentials).mockResolvedValue({ valid: true, storeInfo: null } as never);
    await POST(postRequest({ ...validBody, storeName: 'Custom Name' }));
    expect(saveConnection).toHaveBeenCalledWith(
      'user-1',
      expect.any(Object),
      'Custom Name',
    );
  });

  it('falls back to undefined when no storeName and storeInfo missing', async () => {
    vi.mocked(validateCredentials).mockResolvedValue({ valid: true, storeInfo: null } as never);
    await POST(postRequest(validBody));
    expect(saveConnection).toHaveBeenCalledWith(
      'user-1',
      expect.any(Object),
      undefined,
    );
  });

  it('returns 500 when saveConnection fails', async () => {
    vi.mocked(saveConnection).mockResolvedValue({ success: false, error: 'DB write failed' } as never);
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Failed to save connection');
    expect(body.details).toBe('DB write failed');
  });

  // ── Happy path ────────────────────────────────────────────────────────────

  it('returns 200 with store info on success', async () => {
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.connectionId).toBe('conn-bc-1');
    expect(body.store.name).toBe('My BC Store');
    expect(body.store.domain).toBe('mybcstore.mybigcommerce.com');
    expect(body.store.plan).toBe('Standard');
  });

  it('includes optional storeName in request body without error', async () => {
    const res = await POST(postRequest({ ...validBody, storeName: 'My Custom Store' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  // ── Unexpected errors ─────────────────────────────────────────────────────

  it('returns 500 when validateCredentials throws', async () => {
    vi.mocked(validateCredentials).mockRejectedValue(new Error('Network timeout'));
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Internal server error');
  });

  it('returns 500 when getCurrentUser throws', async () => {
    vi.mocked(getCurrentUser).mockRejectedValue(new Error('Session error'));
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Internal server error');
  });

  it('returns 500 when saveConnection throws', async () => {
    vi.mocked(saveConnection).mockRejectedValue(new Error('Connection refused'));
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Internal server error');
  });
});
