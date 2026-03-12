/**
 * Tests for /api/stripe/update-subscription route
 *
 * Tests subscription plan changes including authentication, plan validation,
 * upgrade/downgrade logic, preview mode, and error handling.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies before importing route
vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('@/lib/stripe', () => ({
  updateSubscription: vi.fn(),
  previewSubscriptionChange: vi.fn(),
  isStripeConfigured: vi.fn(),
  isUpgrade: vi.fn(),
  PLANS: {
    free: { id: 'free', name: 'Free', priceId: null, price: 0 },
    starter: { id: 'starter', name: 'Starter', priceId: 'price_starter_monthly', price: 9 },
    growth: { id: 'growth', name: 'Growth', priceId: 'price_growth_monthly', price: 29 },
    pro: { id: 'pro', name: 'Pro', priceId: 'price_pro_monthly', price: 79 },
  },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    subscription: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('@/lib/ratelimit', () => ({
  checkApiRateLimit: vi.fn(),
  rateLimitHeaders: vi.fn(() => ({})),
}));

import { POST } from './route';
import { getCurrentUser } from '@/lib/auth';
import { updateSubscription, previewSubscriptionChange, isStripeConfigured, isUpgrade } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { checkApiRateLimit } from '@/lib/ratelimit';

// =============================================================================
// Helpers
// =============================================================================

function createRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/stripe/update-subscription', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', host: 'localhost:3000' },
    body: JSON.stringify(body),
  });
}

const mockUser = { id: 'user-123', email: 'test@example.com', name: 'Test User' };

const mockSubscription = {
  id: 'sub-db-1',
  userId: 'user-123',
  plan: 'starter',
  stripeCustomerId: 'cus_abc123',
  stripeSubscriptionId: 'sub_stripe_abc123',
  stripePriceId: 'price_starter_monthly',
  status: 'active',
  cancelAtPeriodEnd: false,
  currentPeriodEnd: new Date('2026-04-12'),
  updatedAt: new Date(),
};

// =============================================================================
// Tests
// =============================================================================

describe('POST /api/stripe/update-subscription', () => {
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

      const res = await POST(createRequest({ newPlanId: 'growth' }));
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe('Not authenticated');
    });

    it('returns 429 when rate limited', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
      vi.mocked(checkApiRateLimit).mockResolvedValue({ success: false, limit: 100, remaining: 0, reset: Date.now() + 60000 });

      const res = await POST(createRequest({ newPlanId: 'growth' }));
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

      const res = await POST(createRequest({ newPlanId: 'growth' }));
      const data = await res.json();

      expect(res.status).toBe(503);
      expect(data.error).toBe('Payment system not configured');
      expect(data.demo).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Plan validation
  // ---------------------------------------------------------------------------

  describe('plan validation', () => {
    it('returns 400 when newPlanId is missing', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

      const res = await POST(createRequest({}));
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('Invalid plan selected');
    });

    it('returns 400 when newPlanId is invalid', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

      const res = await POST(createRequest({ newPlanId: 'enterprise' }));
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('Invalid plan selected');
    });

    it('accepts valid plan IDs: starter, growth, pro', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(mockSubscription);
      vi.mocked(isUpgrade).mockReturnValue(true);
      vi.mocked(updateSubscription).mockResolvedValue({ success: true });
      vi.mocked(prisma.subscription.update).mockResolvedValue({ ...mockSubscription });

      for (const plan of ['starter', 'growth', 'pro']) {
        const res = await POST(createRequest({ newPlanId: plan }));
        expect(res.status).not.toBe(400);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // No active subscription
  // ---------------------------------------------------------------------------

  describe('no active subscription', () => {
    it('returns 400 when user has no subscription', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(null);

      const res = await POST(createRequest({ newPlanId: 'growth' }));
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('No active subscription');
    });

    it('returns 400 when subscription has no Stripe ID', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        ...mockSubscription,
        stripeSubscriptionId: null,
      });

      const res = await POST(createRequest({ newPlanId: 'growth' }));
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('No active subscription');
    });
  });

  // ---------------------------------------------------------------------------
  // Preview mode
  // ---------------------------------------------------------------------------

  describe('preview mode', () => {
    it('returns preview data when action=preview', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(mockSubscription);
      vi.mocked(isUpgrade).mockReturnValue(true);
      vi.mocked(previewSubscriptionChange).mockResolvedValue({
        prorationAmount: 1500,
        immediateCharge: 1500,
        nextBillingAmount: 2900,
      });

      const res = await POST(createRequest({ newPlanId: 'growth', action: 'preview' }));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.isUpgrade).toBe(true);
      expect(data.currentPlan).toBe('starter');
      expect(data.newPlan).toBe('growth');
      expect(data.prorationAmount).toBe(1500);
    });

    it('does NOT call updateSubscription in preview mode', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(mockSubscription);
      vi.mocked(isUpgrade).mockReturnValue(true);
      vi.mocked(previewSubscriptionChange).mockResolvedValue({ prorationAmount: 0, immediateCharge: 0, nextBillingAmount: 2900 });

      await POST(createRequest({ newPlanId: 'growth', action: 'preview' }));

      expect(updateSubscription).not.toHaveBeenCalled();
    });

    it('returns 500 when preview fails', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(mockSubscription);
      vi.mocked(isUpgrade).mockReturnValue(true);
      vi.mocked(previewSubscriptionChange).mockResolvedValue({ error: 'Preview failed' });

      const res = await POST(createRequest({ newPlanId: 'growth', action: 'preview' }));
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe('Preview failed');
    });
  });

  // ---------------------------------------------------------------------------
  // Upgrades
  // ---------------------------------------------------------------------------

  describe('upgrades', () => {
    it('upgrades subscription and updates DB', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(mockSubscription);
      vi.mocked(isUpgrade).mockReturnValue(true);
      vi.mocked(updateSubscription).mockResolvedValue({ success: true });
      vi.mocked(prisma.subscription.update).mockResolvedValue({ ...mockSubscription, plan: 'growth' });

      const res = await POST(createRequest({ newPlanId: 'growth' }));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.isUpgrade).toBe(true);
      expect(data.newPlan).toBe('growth');
    });

    it('includes upgrade success message', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(mockSubscription);
      vi.mocked(isUpgrade).mockReturnValue(true);
      vi.mocked(updateSubscription).mockResolvedValue({ success: true });
      vi.mocked(prisma.subscription.update).mockResolvedValue({ ...mockSubscription });

      const res = await POST(createRequest({ newPlanId: 'growth' }));
      const data = await res.json();

      expect(data.message).toContain('Upgraded');
    });

    it('calls updateSubscription with correct params for upgrade', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(mockSubscription);
      vi.mocked(isUpgrade).mockReturnValue(true);
      vi.mocked(updateSubscription).mockResolvedValue({ success: true });
      vi.mocked(prisma.subscription.update).mockResolvedValue({ ...mockSubscription });

      await POST(createRequest({ newPlanId: 'growth' }));

      expect(updateSubscription).toHaveBeenCalledWith(
        expect.objectContaining({
          subscriptionId: 'sub_stripe_abc123',
          newPriceId: 'price_growth_monthly',
          isUpgrade: true,
        })
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Downgrades
  // ---------------------------------------------------------------------------

  describe('downgrades', () => {
    it('downgrades subscription and updates DB', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        ...mockSubscription,
        plan: 'growth',
      });
      vi.mocked(isUpgrade).mockReturnValue(false);
      vi.mocked(updateSubscription).mockResolvedValue({ success: true });
      vi.mocked(prisma.subscription.update).mockResolvedValue({ ...mockSubscription, plan: 'starter' });

      const res = await POST(createRequest({ newPlanId: 'starter' }));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.isUpgrade).toBe(false);
    });

    it('includes downgrade scheduling message', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        ...mockSubscription,
        plan: 'growth',
      });
      vi.mocked(isUpgrade).mockReturnValue(false);
      vi.mocked(updateSubscription).mockResolvedValue({ success: true });
      vi.mocked(prisma.subscription.update).mockResolvedValue({ ...mockSubscription });

      const res = await POST(createRequest({ newPlanId: 'starter' }));
      const data = await res.json();

      expect(data.message).toContain('Downgrade');
    });
  });

  // ---------------------------------------------------------------------------
  // Error handling
  // ---------------------------------------------------------------------------

  describe('error handling', () => {
    it('returns 500 when Stripe update fails', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(mockSubscription);
      vi.mocked(isUpgrade).mockReturnValue(true);
      vi.mocked(updateSubscription).mockResolvedValue({ error: 'Stripe API error' });

      const res = await POST(createRequest({ newPlanId: 'growth' }));
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe('Stripe API error');
    });

    it('returns 500 on unexpected errors', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
      vi.mocked(prisma.subscription.findUnique).mockRejectedValue(new Error('DB error'));

      const res = await POST(createRequest({ newPlanId: 'growth' }));
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe('Failed to update subscription');
    });
  });
});
