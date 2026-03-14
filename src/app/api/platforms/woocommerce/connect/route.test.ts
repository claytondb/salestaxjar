/**
 * Tests for POST /api/platforms/woocommerce/connect
 *
 * Covers:
 *   - Auth guard (401)
 *   - Tier gate (403 for free users)
 *   - Zod validation: missing/bad storeUrl, consumerKey, consumerSecret
 *   - Invalid credentials (validation returns valid:false)
 *   - Save connection failure (DB error)
 *   - Successful connection (200 with store info)
 *   - storeUrl normalization (https:// added, trailing slash removed)
 *   - Internal server error (unexpected throw)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Mocks ─────────────────────────────────────────────────────────────────

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('@/lib/platforms/woocommerce', () => ({
  validateCredentials: vi.fn(),
  saveConnection: vi.fn(),
  normalizeStoreUrl: vi.fn((url: string) => {
    // Simplified normalizer for tests
    const u = url.startsWith('http') ? url : `https://${url}`;
    return u.replace(/\/$/, '');
  }),
}));

vi.mock('@/lib/plans', () => ({
  userCanConnectPlatform: vi.fn(),
  tierGateError: vi.fn(),
}));

import { POST } from './route';
import { getCurrentUser } from '@/lib/auth';
import { validateCredentials, saveConnection, normalizeStoreUrl } from '@/lib/platforms/woocommerce';
import { userCanConnectPlatform, tierGateError } from '@/lib/plans';

// ─── Helpers ────────────────────────────────────────────────────────────────

function postRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/platforms/woocommerce/connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', host: 'localhost:3000' },
    body: JSON.stringify(body),
  });
}

const validBody = {
  storeUrl: 'https://myshop.com',
  consumerKey: 'ck_abc123',
  consumerSecret: 'cs_xyz789',
};

// ─── Mock user fixtures ───────────────────────────────────────────────────────

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

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/platforms/woocommerce/connect', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(starterUser as never);
    vi.mocked(userCanConnectPlatform).mockReturnValue({ allowed: true, userPlan: 'starter', requiredPlan: 'starter' } as never);
    vi.mocked(validateCredentials).mockResolvedValue({
      valid: true,
      storeInfo: { name: 'My Shop', wc_version: '8.0.0', currency: 'USD' },
    } as never);
    vi.mocked(saveConnection).mockResolvedValue({ success: true, connectionId: 'conn-1' } as never);
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

  it('returns 403 for free plan user', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(freeUser as never);
    vi.mocked(userCanConnectPlatform).mockReturnValue({ allowed: false, userPlan: 'free', requiredPlan: 'starter' } as never);
    vi.mocked(tierGateError).mockReturnValue({ error: 'Upgrade required', code: 'TIER_GATE' } as never);
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('Upgrade');
  });

  it('calls userCanConnectPlatform with woocommerce platform', async () => {
    await POST(postRequest(validBody));
    expect(userCanConnectPlatform).toHaveBeenCalledWith(starterUser, 'woocommerce');
  });

  // ── Validation ────────────────────────────────────────────────────────────

  it('returns 400 when storeUrl is missing', async () => {
    const { storeUrl: _s, ...bodyNoUrl } = validBody;
    const res = await POST(postRequest(bodyNoUrl));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid request');
  });

  it('returns 400 when consumerKey is missing', async () => {
    const { consumerKey: _k, ...bodyNoKey } = validBody;
    const res = await POST(postRequest(bodyNoKey));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid request');
  });

  it('returns 400 when consumerSecret is missing', async () => {
    const { consumerSecret: _s, ...bodyNoSecret } = validBody;
    const res = await POST(postRequest(bodyNoSecret));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid request');
  });

  it('returns 400 when consumerKey does not start with ck_', async () => {
    const res = await POST(postRequest({ ...validBody, consumerKey: 'bad_key_123' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid request');
  });

  it('returns 400 when consumerSecret does not start with cs_', async () => {
    const res = await POST(postRequest({ ...validBody, consumerSecret: 'bad_secret' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid request');
  });

  it('returns 400 when storeUrl is empty string', async () => {
    const res = await POST(postRequest({ ...validBody, storeUrl: '' }));
    expect(res.status).toBe(400);
  });

  it('includes validation details in 400 response', async () => {
    const res = await POST(postRequest({ ...validBody, consumerKey: 'bad' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.details).toBeDefined();
  });

  // ── Credential validation ─────────────────────────────────────────────────

  it('calls validateCredentials with normalised URL', async () => {
    await POST(postRequest({ ...validBody, storeUrl: 'myshop.com/' }));
    expect(normalizeStoreUrl).toHaveBeenCalledWith('myshop.com/');
    expect(validateCredentials).toHaveBeenCalledWith(
      expect.objectContaining({ storeUrl: 'https://myshop.com' }),
    );
  });

  it('returns 400 when validateCredentials returns valid:false', async () => {
    vi.mocked(validateCredentials).mockResolvedValue({
      valid: false,
      error: 'Connection refused',
    } as never);
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid credentials');
    expect(body.details).toBe('Connection refused');
    expect(body.hint).toBeDefined();
  });

  // ── Save connection ───────────────────────────────────────────────────────

  it('calls saveConnection with correct args', async () => {
    await POST(postRequest(validBody));
    expect(saveConnection).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ consumerKey: 'ck_abc123', consumerSecret: 'cs_xyz789' }),
      'My Shop',
    );
  });

  it('uses normalised URL as store name fallback when storeInfo.name missing', async () => {
    vi.mocked(validateCredentials).mockResolvedValue({
      valid: true,
      storeInfo: null,
    } as never);
    await POST(postRequest(validBody));
    expect(saveConnection).toHaveBeenCalledWith(
      'user-1',
      expect.any(Object),
      expect.stringContaining('myshop.com'), // normalised URL used as name fallback
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

  it('returns 200 with connection details on success', async () => {
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.connectionId).toBe('conn-1');
    expect(body.store.name).toBe('My Shop');
    expect(body.store.wcVersion).toBe('8.0.0');
    expect(body.store.currency).toBe('USD');
  });

  it('returns normalised storeUrl in response', async () => {
    const res = await POST(postRequest({ ...validBody, storeUrl: 'myshop.com' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.store.url).toBe('https://myshop.com');
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
});
