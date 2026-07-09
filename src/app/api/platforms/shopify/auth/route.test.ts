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
  // Real-ish implementations: normalize appends .myshopify.com when no dot present,
  // and validation matches the *.myshopify.com format enforced by the route.
  normalizeShopDomain: vi.fn((shop: string) => {
    let d = shop.replace(/^https?:\/\//, '').replace(/\/$/, '').trim().toLowerCase();
    if (!d.includes('.')) d = `${d}.myshopify.com`;
    return d;
  }),
  isValidShopDomain: vi.fn((shop: string) => /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop)),
}));

vi.mock('@/lib/plans', () => ({
  userCanConnectPlatform: vi.fn(),
  tierGateError: vi.fn(),
  checkPlatformLimit: vi.fn(),
  platformLimitError: vi.fn(),
}));

vi.mock('@/lib/platforms', () => ({
  getUserConnections: vi.fn(),
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
import {
  getAuthorizationUrl,
  isShopifyConfigured,
  normalizeShopDomain,
  isValidShopDomain,
} from '@/lib/platforms/shopify';
import { userCanConnectPlatform, tierGateError, checkPlatformLimit } from '@/lib/plans';
import { getUserConnections } from '@/lib/platforms';

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
      requiredPlan: 'free',
    } as never);
    vi.mocked(getUserConnections).mockResolvedValue([] as never);
    vi.mocked(checkPlatformLimit).mockReturnValue({ allowed: true, limit: 2, currentCount: 0, upgradeNeeded: null } as never);
    vi.mocked(isShopifyConfigured).mockReturnValue(true);
    // Re-establish default implementations wiped by resetAllMocks
    vi.mocked(normalizeShopDomain).mockImplementation((shop: string) => {
      let d = shop.replace(/^https?:\/\//, '').replace(/\/$/, '').trim().toLowerCase();
      if (!d.includes('.')) d = `${d}.myshopify.com`;
      return d;
    });
    vi.mocked(isValidShopDomain).mockImplementation((shop: string) =>
      /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop)
    );
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

  it('calls getAuthorizationUrl with the normalized shop and state', async () => {
    await GET(getRequest({ shop: 'testshop' }));

    // Bare handle is normalized to the full myshopify.com domain before use
    expect(getAuthorizationUrl).toHaveBeenCalledWith('testshop.myshopify.com', 'test-uuid-1234');
  });

  it('rejects an invalid (non-myshopify) shop domain with 400', async () => {
    const res = await GET(getRequest({ shop: 'evil.com' }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('Invalid shop domain');
    expect(getAuthorizationUrl).not.toHaveBeenCalled();
  });

  it('stores oauth state cookie with user id and normalized shop', async () => {
    await GET(getRequest({ shop: 'mystore' }));

    expect(mockCookieSet).toHaveBeenCalledWith(
      'shopify_oauth_state',
      JSON.stringify({
        state: 'test-uuid-1234',
        userId: starterUser.id,
        shop: 'mystore.myshopify.com',
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
