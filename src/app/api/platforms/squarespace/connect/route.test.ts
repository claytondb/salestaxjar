/**
 * Tests for POST /api/platforms/squarespace/connect
 *
 * Covers:
 *   - Auth guard (401)
 *   - Tier gate (403)
 *   - Zod validation: missing/empty apiKey
 *   - Invalid API key (validation returns valid:false)
 *   - Save connection failure
 *   - Successful connection (200 with store info)
 *   - storeName fallback: provided → storeInfo.websiteTitle → default
 *   - validateCredentials called with just the apiKey string
 *   - Internal server error
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Mocks ─────────────────────────────────────────────────────────────────

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('@/lib/platforms/squarespace', () => ({
  validateCredentials: vi.fn(),
  saveConnection: vi.fn(),
}));

vi.mock('@/lib/plans', () => ({
  userCanConnectPlatform: vi.fn(),
  tierGateError: vi.fn(),
}));

import { POST } from './route';
import { getCurrentUser } from '@/lib/auth';
import { validateCredentials, saveConnection } from '@/lib/platforms/squarespace';
import { userCanConnectPlatform, tierGateError } from '@/lib/plans';

// ─── Helpers ────────────────────────────────────────────────────────────────

function postRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/platforms/squarespace/connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', host: 'localhost:3000' },
    body: JSON.stringify(body),
  });
}

const validBody = {
  apiKey: 'sqsp_api_key_abc123xyz',
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

describe('POST /api/platforms/squarespace/connect', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(proUser as never);
    vi.mocked(userCanConnectPlatform).mockReturnValue({ allowed: true, userPlan: 'pro', requiredPlan: 'pro' } as never);
    vi.mocked(validateCredentials).mockResolvedValue({
      valid: true,
      websiteInfo: { websiteTitle: 'My Squarespace Site' },
    } as never);
    vi.mocked(saveConnection).mockResolvedValue({ success: true, connectionId: 'conn-sqsp-1' } as never);
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

  it('calls userCanConnectPlatform with squarespace platform', async () => {
    await POST(postRequest(validBody));
    expect(userCanConnectPlatform).toHaveBeenCalledWith(proUser, 'squarespace');
  });

  it('does not call validateCredentials when tier gate blocks', async () => {
    vi.mocked(userCanConnectPlatform).mockReturnValue({ allowed: false, userPlan: 'free', requiredPlan: 'pro' } as never);
    vi.mocked(tierGateError).mockReturnValue({ error: 'Upgrade required' } as never);
    await POST(postRequest(validBody));
    expect(validateCredentials).not.toHaveBeenCalled();
  });

  // ── Validation ────────────────────────────────────────────────────────────

  it('returns 400 when apiKey is missing', async () => {
    const res = await POST(postRequest({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid request');
  });

  it('returns 400 when apiKey is empty string', async () => {
    const res = await POST(postRequest({ apiKey: '' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.details).toBeDefined();
  });

  it('includes validation details in 400 response', async () => {
    const res = await POST(postRequest({ apiKey: '' }));
    const body = await res.json();
    expect(body.details).toBeDefined();
  });

  // ── Credential validation ─────────────────────────────────────────────────

  it('calls validateCredentials with just the apiKey string', async () => {
    await POST(postRequest(validBody));
    expect(validateCredentials).toHaveBeenCalledWith('sqsp_api_key_abc123xyz');
  });

  it('returns 400 when validateCredentials returns valid:false', async () => {
    vi.mocked(validateCredentials).mockResolvedValue({ valid: false, error: 'Key revoked' } as never);
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid API key');
    expect(body.details).toBe('Key revoked');
    expect(body.hint).toBeDefined();
  });

  it('hint mentions Orders API Read permission', async () => {
    vi.mocked(validateCredentials).mockResolvedValue({ valid: false, error: 'err' } as never);
    const res = await POST(postRequest(validBody));
    const body = await res.json();
    expect(body.hint).toMatch(/Orders API/i);
  });

  it('hint mentions Commerce Advanced plan requirement', async () => {
    vi.mocked(validateCredentials).mockResolvedValue({ valid: false, error: 'err' } as never);
    const res = await POST(postRequest(validBody));
    const body = await res.json();
    expect(body.hint).toMatch(/Commerce Advanced/i);
  });

  // ── storeName fallback chain ──────────────────────────────────────────────

  it('uses provided storeName when websiteInfo.websiteTitle also present', async () => {
    await POST(postRequest({ ...validBody, storeName: 'Custom Label' }));
    expect(saveConnection).toHaveBeenCalledWith('user-1', 'sqsp_api_key_abc123xyz', 'Custom Label');
  });

  it('falls back to websiteInfo.websiteTitle when storeName not provided', async () => {
    await POST(postRequest(validBody));
    expect(saveConnection).toHaveBeenCalledWith('user-1', 'sqsp_api_key_abc123xyz', 'My Squarespace Site');
  });

  it('falls back to undefined when websiteInfo missing and no storeName', async () => {
    vi.mocked(validateCredentials).mockResolvedValue({ valid: true, websiteInfo: null } as never);
    await POST(postRequest(validBody));
    expect(saveConnection).toHaveBeenCalledWith('user-1', 'sqsp_api_key_abc123xyz', undefined);
  });

  it('falls back to undefined when websiteInfo.websiteTitle missing', async () => {
    vi.mocked(validateCredentials).mockResolvedValue({ valid: true, websiteInfo: {} } as never);
    await POST(postRequest(validBody));
    expect(saveConnection).toHaveBeenCalledWith('user-1', 'sqsp_api_key_abc123xyz', undefined);
  });

  // ── Save connection ───────────────────────────────────────────────────────

  it('passes raw apiKey (not an object) to saveConnection', async () => {
    await POST(postRequest(validBody));
    // Squarespace saveConnection signature: (userId, apiKey: string, storeName?)
    const calls = vi.mocked(saveConnection).mock.calls;
    expect(typeof calls[0][1]).toBe('string');
  });

  it('returns 500 when saveConnection fails', async () => {
    vi.mocked(saveConnection).mockResolvedValue({ success: false, error: 'Unique constraint' } as never);
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
    expect(body.connectionId).toBe('conn-sqsp-1');
  });

  it('returns store.name as "Squarespace Store" fallback in response', async () => {
    vi.mocked(validateCredentials).mockResolvedValue({ valid: true, websiteInfo: null } as never);
    vi.mocked(saveConnection).mockResolvedValue({ success: true, connectionId: 'conn-sqsp-2' } as never);
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(200);
    const body = await res.json();
    // The response store.name comes from the route handler fallback
    expect(body.store.name).toBe('Squarespace Store');
  });

  it('includes optional storeName without error', async () => {
    const res = await POST(postRequest({ ...validBody, storeName: 'My Custom Store' }));
    expect(res.status).toBe(200);
  });

  // ── Unexpected errors ─────────────────────────────────────────────────────

  it('returns 500 when validateCredentials throws', async () => {
    vi.mocked(validateCredentials).mockRejectedValue(new Error('ECONNRESET'));
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
    vi.mocked(saveConnection).mockRejectedValue(new Error('Unexpected DB crash'));
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(500);
  });
});
