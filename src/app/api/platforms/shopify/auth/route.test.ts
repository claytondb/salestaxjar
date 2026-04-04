/**
 * Tests for GET /api/platforms/shopify/auth
 *
 * Covers:
 *   - Auth guard (401 when not logged in)
 *   - Tier gate (403 for free users who can't connect Shopify)
 *   - Shopify not configured (503)
 *   - Missing shop parameter (400)
 *   - Happy path: sets cookie, redirects to Shopify OAuth URL
 *   - Internal server error (unexpected throw)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('@/lib/platforms/shopify', () => ({
  getAuthorizationUrl: vi.fn(),
  isShopifyConfigured: vi.fn(),
}));

vi.mock('@/lib/plans', () => ({
  userCanConnectPlatform: vi.fn(),
  tierGateError: vi.fn(),
}));

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid-1234'),
}));

// Mock Next.js cookies
const mockCookieSet = vi.fn();
vi.mock('next/headers', () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      set: mockCookieSet,
      get: vi.fn(),
      delete: vi.fn(),
    })
  ),
}));

import { GET } from './route';
import { getCurrentUser } from '@/lib/auth';
import { getAuthorizationUrl, isShopifyConfigured } from '@/lib/platforms/shopify';
import { userCanConnectPlatform, tierGateError } from '@/lib/plans';

// ─── Helpers ────────────────────────────────────────────────────────────────

function getRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:3000/api/platforms/shopify/auth');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString(), {
    method: 'GET',
    headers: { host: 'localhost:3000' },
  });
}

// ─── Mock User Fixtures ──────────────────────────────────────────────────────

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

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('GET /api/platforms/shopify/auth', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(starterUser as never);
    vi.mocked(userCanConnectPlatform).mockReturnValue({
      allowed: true,
      userPlan: 'starter',
      requiredPlan: 'starter',
    } as never);
    vi.mocked(isShopifyConfigured).mockReturnValue(true);
    vi.mocked(getAuthorizationUrl).mockReturnValue(
      'https://mystore.myshopify.com/admin/oauth/authorize?client_id=test&scope=read_orders&redirect_uri=https://sails.tax/api/platforms/shopify/callback&state=test-uuid-1234'
    );
  });

  it('returns 401 when user is not authenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const res = await GET(getRequest({ shop: 'mystore' }));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 403 when user cannot connect Shopify (tier gate)', async () => {
    vi.mocked(userCanConnectPlatform).mockReturnValue({
      allowed: false,
      userPlan: 'free',
      requiredPlan: 'starter',
    } as never);
    vi.mocked(tierGateError).mockReturnValue({
      error: 'upgrade_required',
      message: 'Shopify requires Starter plan',
      currentPlan: 'free',
      requiredPlan: 'starter',
      feature: 'platform_shopify',
    } as never);
    vi.mocked(getCurrentUser).mockResolvedValue(freeUser as never);

    const res = await GET(getRequest({ shop: 'mystore' }));
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe('upgrade_required');
  });

  it('returns 503 when Shopify is not configured', async () => {
    vi.mocked(isShopifyConfigured).mockReturnValue(false);

    const res = await GET(getRequest({ shop: 'mystore' }));
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.error).toBe('Shopify integration is not configured');
  });

  it('returns 400 when shop parameter is missing', async () => {
    const res = await GET(getRequest());
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('Missing shop parameter');
  });

  it('redirects to Shopify OAuth URL on success', async () => {
    const shopifyAuthUrl =
      'https://mystore.myshopify.com/admin/oauth/authorize?client_id=test&scope=read_orders&redirect_uri=https://sails.tax/api/platforms/shopify/callback&state=test-uuid-1234';
    vi.mocked(getAuthorizationUrl).mockReturnValue(shopifyAuthUrl);

    const res = await GET(getRequest({ shop: 'mystore' }));

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe(shopifyAuthUrl);
  });

  it('calls getAuthorizationUrl with correct shop and state', async () => {
    await GET(getRequest({ shop: 'testshop' }));

    expect(getAuthorizationUrl).toHaveBeenCalledWith('testshop', 'test-uuid-1234');
  });

  it('stores oauth state cookie with user id and shop', async () => {
    await GET(getRequest({ shop: 'mystore' }));

    expect(mockCookieSet).toHaveBeenCalledWith(
      'shopify_oauth_state',
      JSON.stringify({
        state: 'test-uuid-1234',
        userId: starterUser.id,
        shop: 'mystore',
      }),
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 600,
        path: '/',
      })
    );
  });

  it('handles shop with .myshopify.com suffix', async () => {
    await GET(getRequest({ shop: 'mystore.myshopify.com' }));

    expect(getAuthorizationUrl).toHaveBeenCalledWith('mystore.myshopify.com', 'test-uuid-1234');
  });

  it('calls userCanConnectPlatform with platform=shopify', async () => {
    await GET(getRequest({ shop: 'mystore' }));

    expect(userCanConnectPlatform).toHaveBeenCalledWith(
      expect.objectContaining({ id: starterUser.id }),
      'shopify'
    );
  });

  it('returns 500 on unexpected error', async () => {
    vi.mocked(isShopifyConfigured).mockImplementation(() => {
      throw new Error('Unexpected failure');
    });

    const res = await GET(getRequest({ shop: 'mystore' }));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe('Internal server error');
  });
});
