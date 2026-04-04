/**
 * Tests for GET /api/platforms/shopify/callback
 *
 * Covers:
 *   - Missing required params (code, shop, state) → redirect with error
 *   - No oauth state cookie → redirect with invalid_state error
 *   - Invalid cookie JSON → redirect with invalid_state error
 *   - State mismatch → redirect with state_mismatch error
 *   - Token exchange failure → redirect with token_exchange_failed error
 *   - Save connection failure → redirect with save_failed error
 *   - Success → redirect with shopify_connected success param
 *   - Internal server error → redirect with callback_failed error
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('@/lib/platforms/shopify', () => ({
  exchangeCodeForToken: vi.fn(),
  saveShopifyConnection: vi.fn(),
}));

const mockCookieGet = vi.fn();
const mockCookieDelete = vi.fn();
vi.mock('next/headers', () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      get: mockCookieGet,
      set: vi.fn(),
      delete: mockCookieDelete,
    })
  ),
}));

import { GET } from './route';
import { exchangeCodeForToken, saveShopifyConnection } from '@/lib/platforms/shopify';

// ─── Helpers ────────────────────────────────────────────────────────────────

const APP_URL = 'https://sails.tax';

function getRequest(params: Record<string, string>): NextRequest {
  const url = new URL('http://localhost:3000/api/platforms/shopify/callback');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString(), {
    method: 'GET',
    headers: { host: 'localhost:3000' },
  });
}

function validCookieState(overrides: Record<string, string> = {}) {
  return {
    value: JSON.stringify({
      state: 'csrf-state-abc',
      userId: 'user-123',
      shop: 'mystore.myshopify.com',
      ...overrides,
    }),
  };
}

const validParams = {
  code: 'auth-code-xyz',
  shop: 'mystore.myshopify.com',
  state: 'csrf-state-abc',
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('GET /api/platforms/shopify/callback', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockCookieGet.mockReturnValue(validCookieState());
    vi.mocked(exchangeCodeForToken).mockResolvedValue({
      accessToken: 'shpat_abc123',
      error: null,
    } as never);
    vi.mocked(saveShopifyConnection).mockResolvedValue({
      success: true,
      error: null,
    } as never);
  });

  // ── Missing params ───────────────────────────────────────────────────────

  it('redirects with missing_params error when code is absent', async () => {
    const { code: _code, ...noCode } = validParams;
    const res = await GET(getRequest(noCode));

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe(
      `${APP_URL}/settings?error=missing_params&tab=platforms`
    );
  });

  it('redirects with missing_params error when shop is absent', async () => {
    const { shop: _shop, ...noShop } = validParams;
    const res = await GET(getRequest(noShop));

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe(
      `${APP_URL}/settings?error=missing_params&tab=platforms`
    );
  });

  it('redirects with missing_params error when state is absent', async () => {
    const { state: _state, ...noState } = validParams;
    const res = await GET(getRequest(noState));

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe(
      `${APP_URL}/settings?error=missing_params&tab=platforms`
    );
  });

  // ── Cookie issues ────────────────────────────────────────────────────────

  it('redirects with invalid_state when no oauth cookie exists', async () => {
    mockCookieGet.mockReturnValue(undefined);

    const res = await GET(getRequest(validParams));

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe(
      `${APP_URL}/settings?error=invalid_state&tab=platforms`
    );
  });

  it('redirects with invalid_state when cookie JSON is malformed', async () => {
    mockCookieGet.mockReturnValue({ value: 'not-valid-json' });

    const res = await GET(getRequest(validParams));

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe(
      `${APP_URL}/settings?error=invalid_state&tab=platforms`
    );
  });

  // ── State mismatch ───────────────────────────────────────────────────────

  it('redirects with state_mismatch when states do not match', async () => {
    mockCookieGet.mockReturnValue(validCookieState({ state: 'different-state' }));

    const res = await GET(getRequest(validParams));

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe(
      `${APP_URL}/settings?error=state_mismatch&tab=platforms`
    );
  });

  // ── Token exchange ───────────────────────────────────────────────────────

  it('redirects with token_exchange_failed when token exchange returns error', async () => {
    vi.mocked(exchangeCodeForToken).mockResolvedValue({
      accessToken: null,
      error: 'invalid_grant',
    } as never);

    const res = await GET(getRequest(validParams));

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe(
      `${APP_URL}/settings?error=token_exchange_failed&tab=platforms`
    );
  });

  it('redirects with token_exchange_failed when accessToken is missing', async () => {
    vi.mocked(exchangeCodeForToken).mockResolvedValue({
      accessToken: null,
      error: null,
    } as never);

    const res = await GET(getRequest(validParams));

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe(
      `${APP_URL}/settings?error=token_exchange_failed&tab=platforms`
    );
  });

  // ── Save connection ──────────────────────────────────────────────────────

  it('redirects with save_failed when saving connection fails', async () => {
    vi.mocked(saveShopifyConnection).mockResolvedValue({
      success: false,
      error: 'DB write failed',
    } as never);

    const res = await GET(getRequest(validParams));

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe(
      `${APP_URL}/settings?error=save_failed&tab=platforms`
    );
  });

  // ── Success path ─────────────────────────────────────────────────────────

  it('redirects to success URL on happy path', async () => {
    const res = await GET(getRequest(validParams));

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe(
      `${APP_URL}/settings?success=shopify_connected&tab=platforms`
    );
  });

  it('calls exchangeCodeForToken with correct shop and code', async () => {
    await GET(getRequest(validParams));

    expect(exchangeCodeForToken).toHaveBeenCalledWith(
      'mystore.myshopify.com',
      'auth-code-xyz'
    );
  });

  it('calls saveShopifyConnection with correct userId, shop, and token', async () => {
    await GET(getRequest(validParams));

    expect(saveShopifyConnection).toHaveBeenCalledWith(
      'user-123',
      'mystore.myshopify.com',
      'shpat_abc123'
    );
  });

  it('deletes oauth state cookie after reading', async () => {
    await GET(getRequest(validParams));

    expect(mockCookieDelete).toHaveBeenCalledWith('shopify_oauth_state');
  });

  // ── Error fallback ───────────────────────────────────────────────────────

  it('redirects with callback_failed on unexpected exception', async () => {
    vi.mocked(exchangeCodeForToken).mockRejectedValue(new Error('Network failure'));

    const res = await GET(getRequest(validParams));

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe(
      `${APP_URL}/settings?error=callback_failed&tab=platforms`
    );
  });
});
