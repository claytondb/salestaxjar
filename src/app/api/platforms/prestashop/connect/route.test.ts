/**
 * Tests for POST /api/platforms/prestashop/connect
 *
 * Covers:
 *   - Auth guard (401)
 *   - Tier gate (403)
 *   - Validation: missing/empty storeUrl, apiKey
 *   - Whitespace trimming
 *   - Invalid credentials (validation returns valid:false)
 *   - Save connection failure
 *   - Successful connection (200 with store info)
 *   - storeName fallback: provided → storeInfo.shop_name → default
 *   - Internal server error
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Mocks ─────────────────────────────────────────────────────────────────

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('@/lib/platforms/prestashop', () => ({
  validateCredentials: vi.fn(),
  saveConnection: vi.fn(),
}));

vi.mock('@/lib/plans', () => ({
  userCanConnectPlatform: vi.fn(),
  tierGateError: vi.fn(),
}));

import { POST } from './route';
import { getCurrentUser } from '@/lib/auth';
import { validateCredentials, saveConnection } from '@/lib/platforms/prestashop';
import { userCanConnectPlatform, tierGateError } from '@/lib/plans';

// ─── Helpers ────────────────────────────────────────────────────────────────

function postRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/platforms/prestashop/connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', host: 'localhost:3000' },
    body: JSON.stringify(body),
  });
}

const validBody = {
  storeUrl: 'https://myprestashopstore.com',
  apiKey: 'PS_API_KEY_ABC123',
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

describe('POST /api/platforms/prestashop/connect', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(proUser as never);
    vi.mocked(userCanConnectPlatform).mockReturnValue({ allowed: true, userPlan: 'pro', requiredPlan: 'pro' } as never);
    vi.mocked(validateCredentials).mockResolvedValue({
      valid: true,
      storeInfo: { shop_name: 'My PrestaShop' },
    } as never);
    vi.mocked(saveConnection).mockResolvedValue({ success: true, connectionId: 'conn-ps-1' } as never);
  });

  // ── Auth ──────────────────────────────────────────────────────────────────

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('does not call validateCredentials when no user', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    await POST(postRequest(validBody));
    expect(validateCredentials).not.toHaveBeenCalled();
  });

  // ── Tier gate ─────────────────────────────────────────────────────────────

  it('returns 403 for free plan user', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(freeUser as never);
    vi.mocked(userCanConnectPlatform).mockReturnValue({ allowed: false, userPlan: 'free', requiredPlan: 'pro' } as never);
    vi.mocked(tierGateError).mockReturnValue({ error: 'Upgrade required', code: 'TIER_GATE' } as never);
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(403);
  });

  it('calls userCanConnectPlatform with prestashop platform', async () => {
    await POST(postRequest(validBody));
    expect(userCanConnectPlatform).toHaveBeenCalledWith(proUser, 'prestashop');
  });

  it('does not call validateCredentials when tier gate blocks', async () => {
    vi.mocked(userCanConnectPlatform).mockReturnValue({ allowed: false, userPlan: 'free', requiredPlan: 'pro' } as never);
    vi.mocked(tierGateError).mockReturnValue({ error: 'Upgrade required' } as never);
    await POST(postRequest(validBody));
    expect(validateCredentials).not.toHaveBeenCalled();
  });

  // ── Validation ────────────────────────────────────────────────────────────

  it('returns 400 when storeUrl is missing', async () => {
    const { storeUrl: _s, ...body } = validBody;
    const res = await POST(postRequest(body));
    expect(res.status).toBe(400);
    const b = await res.json();
    expect(b.error).toMatch(/Store URL/i);
  });

  it('returns 400 when apiKey is missing', async () => {
    const { apiKey: _k, ...body } = validBody;
    const res = await POST(postRequest(body));
    expect(res.status).toBe(400);
    const b = await res.json();
    expect(b.error).toMatch(/API Key/i);
  });

  it('returns 400 when storeUrl is empty string', async () => {
    const res = await POST(postRequest({ ...validBody, storeUrl: '' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when storeUrl is whitespace only', async () => {
    const res = await POST(postRequest({ ...validBody, storeUrl: '   ' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when apiKey is empty string', async () => {
    const res = await POST(postRequest({ ...validBody, apiKey: '' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when apiKey is whitespace only', async () => {
    const res = await POST(postRequest({ ...validBody, apiKey: '   ' }));
    expect(res.status).toBe(400);
  });

  // ── Trimming ──────────────────────────────────────────────────────────────

  it('trims whitespace from storeUrl', async () => {
    await POST(postRequest({ ...validBody, storeUrl: '  https://myprestashopstore.com  ' }));
    expect(validateCredentials).toHaveBeenCalledWith(
      expect.objectContaining({ storeUrl: 'https://myprestashopstore.com' }),
    );
  });

  it('trims whitespace from apiKey', async () => {
    await POST(postRequest({ ...validBody, apiKey: '  PS_API_KEY_ABC123  ' }));
    expect(validateCredentials).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: 'PS_API_KEY_ABC123' }),
    );
  });

  // ── Credential validation ─────────────────────────────────────────────────

  it('calls validateCredentials with storeUrl and apiKey', async () => {
    await POST(postRequest(validBody));
    expect(validateCredentials).toHaveBeenCalledWith({
      storeUrl: 'https://myprestashopstore.com',
      apiKey: 'PS_API_KEY_ABC123',
    });
  });

  it('returns 400 when validateCredentials returns valid:false', async () => {
    vi.mocked(validateCredentials).mockResolvedValue({ valid: false, error: 'Key not authorized' } as never);
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid credentials');
    expect(body.details).toBe('Key not authorized');
    expect(body.hint).toBeDefined();
  });

  it('hint mentions PrestaShop admin Webservice', async () => {
    vi.mocked(validateCredentials).mockResolvedValue({ valid: false, error: 'err' } as never);
    const res = await POST(postRequest(validBody));
    const body = await res.json();
    expect(body.hint).toMatch(/Webservice/i);
  });

  // ── storeName fallback chain ──────────────────────────────────────────────

  it('uses provided storeName when storeInfo.shop_name also present', async () => {
    await POST(postRequest({ ...validBody, storeName: 'Custom Label' }));
    expect(saveConnection).toHaveBeenCalledWith('user-1', expect.any(Object), 'Custom Label');
  });

  it('falls back to storeInfo.shop_name when storeName not provided', async () => {
    await POST(postRequest(validBody));
    expect(saveConnection).toHaveBeenCalledWith('user-1', expect.any(Object), 'My PrestaShop');
  });

  it('falls back to undefined when storeInfo missing and no storeName provided', async () => {
    vi.mocked(validateCredentials).mockResolvedValue({ valid: true, storeInfo: null } as never);
    await POST(postRequest(validBody));
    expect(saveConnection).toHaveBeenCalledWith('user-1', expect.any(Object), undefined);
  });

  // ── Save connection ───────────────────────────────────────────────────────

  it('calls saveConnection with trimmed credentials', async () => {
    await POST(postRequest(validBody));
    expect(saveConnection).toHaveBeenCalledWith(
      'user-1',
      { storeUrl: 'https://myprestashopstore.com', apiKey: 'PS_API_KEY_ABC123' },
      'My PrestaShop',
    );
  });

  it('returns 500 when saveConnection fails', async () => {
    vi.mocked(saveConnection).mockResolvedValue({ success: false, error: 'Timeout' } as never);
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Failed to save connection');
  });

  // ── Happy path ────────────────────────────────────────────────────────────

  it('returns 200 with connectionId and store name on success', async () => {
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.connectionId).toBe('conn-ps-1');
    expect(body.store.name).toBe('My PrestaShop');
  });

  it('returns 200 with fallback store name', async () => {
    vi.mocked(validateCredentials).mockResolvedValue({ valid: true, storeInfo: null } as never);
    const res = await POST(postRequest({ ...validBody, storeName: 'Fallback Name' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.store.name).toBe('Fallback Name');
  });

  // ── Unexpected errors ─────────────────────────────────────────────────────

  it('returns 500 when validateCredentials throws', async () => {
    vi.mocked(validateCredentials).mockRejectedValue(new Error('ECONNREFUSED'));
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Internal server error');
  });

  it('returns 500 when getCurrentUser throws', async () => {
    vi.mocked(getCurrentUser).mockRejectedValue(new Error('Session error'));
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(500);
  });

  it('returns 500 when saveConnection throws', async () => {
    vi.mocked(saveConnection).mockRejectedValue(new Error('DB failure'));
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(500);
  });
});
