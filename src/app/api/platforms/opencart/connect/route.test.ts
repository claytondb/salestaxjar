/**
 * Tests for POST /api/platforms/opencart/connect
 *
 * Covers:
 *   - Auth guard (401)
 *   - Tier gate (403)
 *   - Validation: missing/empty storeUrl, apiUsername, apiKey
 *   - Whitespace trimming
 *   - Invalid credentials (validation returns valid:false)
 *   - Save connection failure
 *   - Successful connection (200 with store info)
 *   - storeName: provided → default
 *   - Internal server error
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Mocks ─────────────────────────────────────────────────────────────────

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('@/lib/platforms/opencart', () => ({
  validateCredentials: vi.fn(),
  saveConnection: vi.fn(),
}));

vi.mock('@/lib/plans', () => ({
  userCanConnectPlatform: vi.fn(),
  tierGateError: vi.fn(),
}));

import { POST } from './route';
import { getCurrentUser } from '@/lib/auth';
import { validateCredentials, saveConnection } from '@/lib/platforms/opencart';
import { userCanConnectPlatform, tierGateError } from '@/lib/plans';

// ─── Helpers ────────────────────────────────────────────────────────────────

function postRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/platforms/opencart/connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', host: 'localhost:3000' },
    body: JSON.stringify(body),
  });
}

const validBody = {
  storeUrl: 'https://myopencartstore.com',
  apiUsername: 'Default',
  apiKey: 'oc_api_key_xyz123',
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

describe('POST /api/platforms/opencart/connect', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(proUser as never);
    vi.mocked(userCanConnectPlatform).mockReturnValue({ allowed: true, userPlan: 'pro', requiredPlan: 'pro' } as never);
    vi.mocked(validateCredentials).mockResolvedValue({ valid: true } as never);
    vi.mocked(saveConnection).mockResolvedValue({ success: true, connectionId: 'conn-oc-1' } as never);
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

  it('calls userCanConnectPlatform with opencart platform', async () => {
    await POST(postRequest(validBody));
    expect(userCanConnectPlatform).toHaveBeenCalledWith(proUser, 'opencart');
  });

  // ── Validation ────────────────────────────────────────────────────────────

  it('returns 400 when storeUrl is missing', async () => {
    const { storeUrl: _s, ...body } = validBody;
    const res = await POST(postRequest(body));
    expect(res.status).toBe(400);
    const b = await res.json();
    expect(b.error).toMatch(/Store URL/i);
  });

  it('returns 400 when apiUsername is missing', async () => {
    const { apiUsername: _u, ...body } = validBody;
    const res = await POST(postRequest(body));
    expect(res.status).toBe(400);
    const b = await res.json();
    expect(b.error).toMatch(/API Username/i);
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

  it('returns 400 when apiUsername is empty string', async () => {
    const res = await POST(postRequest({ ...validBody, apiUsername: '' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when apiKey is empty string', async () => {
    const res = await POST(postRequest({ ...validBody, apiKey: '' }));
    expect(res.status).toBe(400);
  });

  // ── Trimming ──────────────────────────────────────────────────────────────

  it('trims storeUrl whitespace', async () => {
    await POST(postRequest({ ...validBody, storeUrl: '  https://myopencartstore.com  ' }));
    expect(validateCredentials).toHaveBeenCalledWith(
      expect.objectContaining({ storeUrl: 'https://myopencartstore.com' }),
    );
  });

  it('trims apiUsername whitespace', async () => {
    await POST(postRequest({ ...validBody, apiUsername: '  Default  ' }));
    expect(validateCredentials).toHaveBeenCalledWith(
      expect.objectContaining({ apiUsername: 'Default' }),
    );
  });

  it('trims apiKey whitespace', async () => {
    await POST(postRequest({ ...validBody, apiKey: '  oc_api_key_xyz123  ' }));
    expect(validateCredentials).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: 'oc_api_key_xyz123' }),
    );
  });

  // ── Credential validation ─────────────────────────────────────────────────

  it('calls validateCredentials with all three credentials', async () => {
    await POST(postRequest(validBody));
    expect(validateCredentials).toHaveBeenCalledWith({
      storeUrl: 'https://myopencartstore.com',
      apiUsername: 'Default',
      apiKey: 'oc_api_key_xyz123',
    });
  });

  it('returns 400 when validateCredentials returns valid:false', async () => {
    vi.mocked(validateCredentials).mockResolvedValue({ valid: false, error: 'Login failed' } as never);
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid credentials');
    expect(body.details).toBe('Login failed');
    expect(body.hint).toBeDefined();
  });

  it('hint mentions IP whitelist', async () => {
    vi.mocked(validateCredentials).mockResolvedValue({ valid: false, error: 'err' } as never);
    const res = await POST(postRequest(validBody));
    const body = await res.json();
    expect(body.hint).toMatch(/IP/i);
  });

  // ── Save connection ───────────────────────────────────────────────────────

  it('calls saveConnection with trimmed credentials and storeName', async () => {
    await POST(postRequest({ ...validBody, storeName: 'My OC Store' }));
    expect(saveConnection).toHaveBeenCalledWith(
      'user-1',
      { storeUrl: 'https://myopencartstore.com', apiUsername: 'Default', apiKey: 'oc_api_key_xyz123' },
      'My OC Store',
    );
  });

  it('passes undefined storeName when not provided', async () => {
    await POST(postRequest(validBody));
    expect(saveConnection).toHaveBeenCalledWith('user-1', expect.any(Object), undefined);
  });

  it('returns 500 when saveConnection fails', async () => {
    vi.mocked(saveConnection).mockResolvedValue({ success: false, error: 'Duplicate key' } as never);
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Failed to save connection');
  });

  // ── Happy path ────────────────────────────────────────────────────────────

  it('returns 200 with connectionId on success', async () => {
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.connectionId).toBe('conn-oc-1');
  });

  it('returns store.name as "OpenCart Store" when no storeName provided', async () => {
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.store.name).toBe('OpenCart Store');
  });

  it('returns store.name from provided storeName', async () => {
    const res = await POST(postRequest({ ...validBody, storeName: 'My Custom Store' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.store.name).toBe('My Custom Store');
  });

  // ── Unexpected errors ─────────────────────────────────────────────────────

  it('returns 500 when validateCredentials throws', async () => {
    vi.mocked(validateCredentials).mockRejectedValue(new Error('Timeout'));
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
    vi.mocked(saveConnection).mockRejectedValue(new Error('DB crash'));
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(500);
  });
});
