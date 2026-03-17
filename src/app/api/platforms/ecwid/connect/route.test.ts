/**
 * Tests for POST /api/platforms/ecwid/connect
 *
 * Covers:
 *   - Auth guard (401)
 *   - Tier gate (403)
 *   - Validation: missing/empty storeId, apiToken
 *   - Whitespace trimming for storeId and apiToken
 *   - Invalid credentials (validation returns valid:false)
 *   - Save connection failure (DB error)
 *   - Successful connection (200 with store info)
 *   - storeName fallback chain: provided → storeInfo.settings → storeInfo.account → default
 *   - Internal server error (unexpected throw)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Mocks ─────────────────────────────────────────────────────────────────

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('@/lib/platforms/ecwid', () => ({
  validateCredentials: vi.fn(),
  saveConnection: vi.fn(),
}));

vi.mock('@/lib/plans', () => ({
  userCanConnectPlatform: vi.fn(),
  tierGateError: vi.fn(),
}));

import { POST } from './route';
import { getCurrentUser } from '@/lib/auth';
import { validateCredentials, saveConnection } from '@/lib/platforms/ecwid';
import { userCanConnectPlatform, tierGateError } from '@/lib/plans';

// ─── Helpers ────────────────────────────────────────────────────────────────

function postRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/platforms/ecwid/connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', host: 'localhost:3000' },
    body: JSON.stringify(body),
  });
}

const validBody = {
  storeId: '12345678',
  apiToken: 'secret_tok_ecwidabc123',
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

describe('POST /api/platforms/ecwid/connect', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(proUser as never);
    vi.mocked(userCanConnectPlatform).mockReturnValue({ allowed: true, userPlan: 'pro', requiredPlan: 'pro' } as never);
    vi.mocked(validateCredentials).mockResolvedValue({
      valid: true,
      storeInfo: {
        generalInfo: { storeId: 12345678 },
        settings: { storeName: 'My Ecwid Store' },
        account: { accountName: 'John Doe' },
      },
    } as never);
    vi.mocked(saveConnection).mockResolvedValue({ success: true, connectionId: 'conn-ecwid-1' } as never);
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

  it('calls userCanConnectPlatform with ecwid platform', async () => {
    await POST(postRequest(validBody));
    expect(userCanConnectPlatform).toHaveBeenCalledWith(proUser, 'ecwid');
  });

  // ── Validation ────────────────────────────────────────────────────────────

  it('returns 400 when storeId is missing', async () => {
    const { storeId: _s, ...bodyNoId } = validBody;
    const res = await POST(postRequest(bodyNoId));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Store ID/i);
  });

  it('returns 400 when apiToken is missing', async () => {
    const { apiToken: _t, ...bodyNoToken } = validBody;
    const res = await POST(postRequest(bodyNoToken));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/API Token/i);
  });

  it('returns 400 when storeId is empty string', async () => {
    const res = await POST(postRequest({ ...validBody, storeId: '' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when storeId is whitespace only', async () => {
    const res = await POST(postRequest({ ...validBody, storeId: '   ' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when apiToken is empty string', async () => {
    const res = await POST(postRequest({ ...validBody, apiToken: '' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when apiToken is whitespace only', async () => {
    const res = await POST(postRequest({ ...validBody, apiToken: '   ' }));
    expect(res.status).toBe(400);
  });

  // ── Trimming ──────────────────────────────────────────────────────────────

  it('trims whitespace from storeId before calling validateCredentials', async () => {
    await POST(postRequest({ ...validBody, storeId: '  12345678  ' }));
    expect(validateCredentials).toHaveBeenCalledWith(
      expect.objectContaining({ storeId: '12345678' }),
    );
  });

  it('trims whitespace from apiToken before calling validateCredentials', async () => {
    await POST(postRequest({ ...validBody, apiToken: '  secret_tok_ecwidabc123  ' }));
    expect(validateCredentials).toHaveBeenCalledWith(
      expect.objectContaining({ apiToken: 'secret_tok_ecwidabc123' }),
    );
  });

  // ── Credential validation ─────────────────────────────────────────────────

  it('calls validateCredentials with trimmed storeId and apiToken', async () => {
    await POST(postRequest(validBody));
    expect(validateCredentials).toHaveBeenCalledWith({ storeId: '12345678', apiToken: 'secret_tok_ecwidabc123' });
  });

  it('returns 400 when validateCredentials returns valid:false', async () => {
    vi.mocked(validateCredentials).mockResolvedValue({
      valid: false,
      error: 'Invalid token',
    } as never);
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid credentials');
    expect(body.details).toBe('Invalid token');
    expect(body.hint).toBeDefined();
  });

  it('hint mentions Ecwid Admin', async () => {
    vi.mocked(validateCredentials).mockResolvedValue({ valid: false, error: 'err' } as never);
    const res = await POST(postRequest(validBody));
    const body = await res.json();
    expect(body.hint).toMatch(/Ecwid Admin/i);
  });

  // ── storeName fallback chain ──────────────────────────────────────────────

  it('uses provided storeName when all storeInfo fields present', async () => {
    await POST(postRequest({ ...validBody, storeName: 'My Custom Name' }));
    expect(saveConnection).toHaveBeenCalledWith('user-1', expect.any(Object), 'My Custom Name');
  });

  it('falls back to storeInfo.settings.storeName when storeName not provided', async () => {
    await POST(postRequest(validBody));
    expect(saveConnection).toHaveBeenCalledWith('user-1', expect.any(Object), 'My Ecwid Store');
  });

  it('falls back to storeInfo.account.accountName when storeName not in settings', async () => {
    vi.mocked(validateCredentials).mockResolvedValue({
      valid: true,
      storeInfo: {
        generalInfo: { storeId: 12345678 },
        settings: {},
        account: { accountName: 'John Doe' },
      },
    } as never);
    await POST(postRequest(validBody));
    expect(saveConnection).toHaveBeenCalledWith('user-1', expect.any(Object), 'John Doe');
  });

  it('falls back to "Ecwid Store" when all name sources missing', async () => {
    vi.mocked(validateCredentials).mockResolvedValue({
      valid: true,
      storeInfo: { generalInfo: {}, settings: {}, account: {} },
    } as never);
    await POST(postRequest(validBody));
    expect(saveConnection).toHaveBeenCalledWith('user-1', expect.any(Object), 'Ecwid Store');
  });

  // ── Save connection ───────────────────────────────────────────────────────

  it('returns 500 when saveConnection fails', async () => {
    vi.mocked(saveConnection).mockResolvedValue({ success: false, error: 'DB write failed' } as never);
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Failed to save connection');
  });

  // ── Happy path ────────────────────────────────────────────────────────────

  it('returns 200 with store info on success', async () => {
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.connectionId).toBe('conn-ecwid-1');
    expect(body.store.name).toBe('My Ecwid Store');
    expect(body.store.storeId).toBe(12345678);
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
  });

  it('returns 500 when saveConnection throws', async () => {
    vi.mocked(saveConnection).mockRejectedValue(new Error('Unexpected DB failure'));
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(500);
  });
});
