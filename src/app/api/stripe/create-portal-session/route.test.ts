/**
 * Tests for /api/stripe/create-portal-session route
 *
 * Tests Stripe customer portal session creation including authentication,
 * customer lookup, portal session creation, and error handling.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies before importing route
vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('@/lib/stripe', () => ({
  createPortalSession: vi.fn(),
  isStripeConfigured: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    subscription: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/ratelimit', () => ({
  checkApiRateLimit: vi.fn(),
  rateLimitHeaders: vi.fn(() => ({})),
}));

import { POST } from './route';
import { getCurrentUser } from '@/lib/auth';
import { createPortalSession, isStripeConfigured } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { checkApiRateLimit } from '@/lib/ratelimit';

// =============================================================================
// Helpers
// =============================================================================

function createRequest(host = 'localhost:3000'): NextRequest {
  return new NextRequest('http://localhost:3000/api/stripe/create-portal-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', host },
  });
}

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  emailVerified: true,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  subscription: null,
};

const mockSubscription = {
  id: 'sub-db-1',
  userId: 'user-123',
  plan: 'starter',
  stripeCustomerId: 'cus_abc123',
  stripeSubscriptionId: 'sub_stripe_abc123',
  stripePriceId: 'price_starter_monthly',
  status: 'active',
  cancelAtPeriodEnd: false,
  currentPeriodStart: new Date('2026-03-12'),
  currentPeriodEnd: new Date('2026-04-12'),
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date(),
};

// =============================================================================
// Tests
// =============================================================================

describe('POST /api/stripe/create-portal-session', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isStripeConfigured).mockReturnValue(true);
    vi.mocked(checkApiRateLimit).mockResolvedValue({ success: true, limit: 100, remaining: 99, reset: Date.now() + 60000 });
  });

  // ---------------------------------------------------------------------------
  // Authentication
  // ---------------------------------------------------------------------------

  describe('authentication', () => {
    it('returns 401 when not authenticated', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(null);

      const res = await POST(createRequest());
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe('Not authenticated');
    });

    it('returns 429 when rate limited', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
      vi.mocked(checkApiRateLimit).mockResolvedValue({ success: false, limit: 100, remaining: 0, reset: Date.now() + 60000 });

      const res = await POST(createRequest());
      const data = await res.json();

      expect(res.status).toBe(429);
      expect(data.error).toBe('Too many requests');
    });
  });

  // ---------------------------------------------------------------------------
  // Stripe configuration
  // ---------------------------------------------------------------------------

  describe('stripe configuration', () => {
    it('returns 503 when Stripe is not configured', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
      vi.mocked(isStripeConfigured).mockReturnValue(false);

      const res = await POST(createRequest());
      const data = await res.json();

      expect(res.status).toBe(503);
      expect(data.error).toBe('Payment system not configured');
      expect(data.demo).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Customer lookup
  // ---------------------------------------------------------------------------

  describe('customer lookup', () => {
    it('returns 400 when no subscription found', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(null);

      const res = await POST(createRequest());
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('No subscription found');
    });

    it('returns 400 when subscription has no Stripe customer ID', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        ...mockSubscription,
        stripeCustomerId: null as unknown as string,
      });

      const res = await POST(createRequest());
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('No subscription found');
    });
  });

  // ---------------------------------------------------------------------------
  // Portal session creation
  // ---------------------------------------------------------------------------

  describe('portal session creation', () => {
    it('creates portal session and returns URL', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(mockSubscription);
      vi.mocked(createPortalSession).mockResolvedValue({ url: 'https://billing.stripe.com/session/abc123' });

      const res = await POST(createRequest());
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.url).toBe('https://billing.stripe.com/session/abc123');
    });

    it('calls createPortalSession with customer ID and return URL', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(mockSubscription);
      vi.mocked(createPortalSession).mockResolvedValue({ url: 'https://billing.stripe.com/session/abc123' });

      await POST(createRequest('app.sails.tax'));

      expect(createPortalSession).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: 'cus_abc123',
          returnUrl: expect.stringContaining('/settings?tab=billing'),
        })
      );
    });

    it('uses correct host in return URL', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(mockSubscription);
      vi.mocked(createPortalSession).mockResolvedValue({ url: 'https://billing.stripe.com/session/abc' });

      await POST(createRequest('app.sails.tax'));

      const callArgs = vi.mocked(createPortalSession).mock.calls[0][0];
      expect(callArgs.returnUrl).toContain('app.sails.tax');
    });

    it('returns 500 when portal session creation fails', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(mockSubscription);
      vi.mocked(createPortalSession).mockResolvedValue({ error: 'Stripe portal error' });

      const res = await POST(createRequest());
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe('Stripe portal error');
    });
  });

  // ---------------------------------------------------------------------------
  // Error handling
  // ---------------------------------------------------------------------------

  describe('error handling', () => {
    it('returns 500 on unexpected errors', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
      vi.mocked(prisma.subscription.findUnique).mockRejectedValue(new Error('DB error'));

      const res = await POST(createRequest());
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe('Failed to create portal session');
    });
  });
});
