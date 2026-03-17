/**
 * Tests for POST /api/platforms/magento/connect
 *
 * Covers:
 *   - Auth guard (401)
 *   - Tier gate (403)
 *   - Validation: missing/empty storeUrl, accessToken
 *   - Whitespace trimming for storeUrl and accessToken
 *   - Invalid credentials (validation returns valid:false)
 *   - Save connection failure (DB error)
 *   - Successful connection (200 with store info)
 *   - storeName fallback: provided → storeInfo.name → default
 *   - Internal server error (unexpected throw)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Mocks ─────────────────────────────────────────────────────────────────

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('@/lib/platforms/magento', () => ({
  validateCredentials: vi.fn(),
  saveConnection: vi.fn(),
}));

vi.mock('@/lib/plans', () => ({
  userCanConnectPlatform: vi.fn(),
  tierGateError: vi.fn(),
}));

import { POST } from './route';
import { getCurrentUser } from '@/lib/auth';
import { validateCredentials, saveConnection } from '@/lib/platforms/magento';
import { userCanConnectPlatform, tierGateError } from '@/lib/plans';

// ─── Helpers ────────────────────────────────────────────────────────────────

function postRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/platforms/magento/connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', host: 'localhost:3000' },
    body: JSON.stringify(body),
  });
}

const validBody = {
  storeUrl: 'https://mymagentostore.com',
  accessToken: 'mag_tok_abc123xyz',
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

describe('POST /api/platforms/magento/connect', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(proUser as never);
    vi.mocked(userCanConnectPlatform).mockReturnValue({ allowed: true, userPlan: 'pro', requiredPlan: 'pro' } as never);
    vi.mocked(validateCredentials).mockResolvedValue({
      valid: true,
      storeInfo: { name: 'My Magento Store', code: 'default', base_currency_code: 'USD' },
    } as never);
    vi.mocked(saveConnection).mockResolvedValue({ success: true, connectionId: 'conn-mag-1' } as never);
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
    const body = await res.json();
    expect(body.error).toContain('Upgrade');
  });

  it('calls userCanConnectPlatform with magento platform', async () => {
    await POST(postRequest(validBody));
    expect(userCanConnectPlatform).toHaveBeenCalledWith(proUser, 'magento');
  });

  // ── Validation ────────────────────────────────────────────────────────────

  it('returns 400 when storeUrl is missing', async () => {
    const { storeUrl: _s, ...bodyNoUrl } = validBody;
    const res = await POST(postRequest(bodyNoUrl));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Store URL/i);
  });

  it('returns 400 when accessToken is missing', async () => {
    const { accessToken: _t, ...bodyNoToken } = validBody;
    const res = await POST(postRequest(bodyNoToken));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Access Token/i);
  });

  it('returns 400 when storeUrl is empty string', async () => {
    const res = await POST(postRequest({ ...validBody, storeUrl: '' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when storeUrl is whitespace only', async () => {
    const res = await POST(postRequest({ ...validBody, storeUrl: '   ' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when accessToken is empty string', async () => {
    const res = await POST(postRequest({ ...validBody, accessToken: '' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when accessToken is whitespace only', async () => {
    const res = await POST(postRequest({ ...validBody, accessToken: '   ' }));
    expect(res.status).toBe(400);
  });

  // ── Trimming ──────────────────────────────────────────────────────────────

  it('trims whitespace from storeUrl before calling validateCredentials', async () => {
    await POST(postRequest({ ...validBody, storeUrl: '  https://mymagentostore.com  ' }));
    expect(validateCredentials).toHaveBeenCalledWith(
      expect.objectContaining({ storeUrl: 'https://mymagentostore.com' }),
    );
  });

  it('trims whitespace from accessToken', async () => {
    await POST(postRequest({ ...validBody, accessToken: '  mag_tok_abc123xyz  ' }));
    expect(validateCredentials).toHaveBeenCalledWith(
      expect.objectContaining({ accessToken: 'mag_tok_abc123xyz' }),
    );
  });

  // ── Credential validation ─────────────────────────────────────────────────

  it('calls validateCredentials with storeUrl and accessToken', async () => {
    await POST(postRequest(validBody));
    expect(validateCredentials).toHaveBeenCalledWith({
      storeUrl: 'https://mymagentostore.com',
      accessToken: 'mag_tok_abc123xyz',
    });
  });

  it('returns 400 when validateCredentials returns valid:false', async () => {
    vi.mocked(validateCredentials).mockResolvedValue({
      valid: false,
      error: 'Authentication failed',
    } as never);
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid credentials');
    expect(body.details).toBe('Authentication failed');
    expect(body.hint).toBeDefined();
  });

  it('hint mentions Magento admin integrations', async () => {
    vi.mocked(validateCredentials).mockResolvedValue({ valid: false, error: 'err' } as never);
    const res = await POST(postRequest(validBody));
    const body = await res.json();
    expect(body.hint).toMatch(/Integrations/i);
  });

  // ── storeName fallback chain ──────────────────────────────────────────────

  it('uses provided storeName when storeInfo.name also present', async () => {
    await POST(postRequest({ ...validBody, storeName: 'Custom Label' }));
    expect(saveConnection).toHaveBeenCalledWith('user-1', expect.any(Object), 'Custom Label');
  });

  it('falls back to storeInfo.name when storeName not provided', async () => {
    await POST(postRequest(validBody));
    expect(saveConnection).toHaveBeenCalledWith('user-1', expect.any(Object), 'My Magento Store');
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
      { storeUrl: 'https://mymagentostore.com', accessToken: 'mag_tok_abc123xyz' },
      'My Magento Store',
    );
  });

  it('returns 500 when saveConnection fails', async () => {
    vi.mocked(saveConnection).mockResolvedValue({ success: false, error: 'DB constraint violation' } as never);
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Failed to save connection');
    expect(body.details).toBe('DB constraint violation');
  });

  // ── Happy path ────────────────────────────────────────────────────────────

  it('returns 200 with store info on success', async () => {
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.connectionId).toBe('conn-mag-1');
    expect(body.store.name).toBe('My Magento Store');
    expect(body.store.code).toBe('default');
    expect(body.store.currency).toBe('USD');
  });

  it('returns 200 even when storeInfo fields are sparse', async () => {
    vi.mocked(validateCredentials).mockResolvedValue({
      valid: true,
      storeInfo: { name: 'Minimal Store' },
    } as never);
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.store.name).toBe('Minimal Store');
    expect(body.store.code).toBeUndefined();
  });

  // ── Unexpected errors ─────────────────────────────────────────────────────

  it('returns 500 when validateCredentials throws', async () => {
    vi.mocked(validateCredentials).mockRejectedValue(new Error('Connection refused'));
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Internal server error');
  });

  it('returns 500 when getCurrentUser throws', async () => {
    vi.mocked(getCurrentUser).mockRejectedValue(new Error('Session store error'));
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(500);
  });

  it('returns 500 when saveConnection throws', async () => {
    vi.mocked(saveConnection).mockRejectedValue(new Error('DB crash'));
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(500);
  });
});
