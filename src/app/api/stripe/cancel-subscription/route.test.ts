/**
 * Tests for /api/stripe/cancel-subscription route
 *
 * Tests subscription cancellation including authentication, Stripe integration,
 * immediate vs. scheduled cancellation, and error handling.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies before importing route
vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('@/lib/stripe', () => ({
  cancelSubscription: vi.fn(),
  isStripeConfigured: vi.fn(),
  stripe: null,
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
import { cancelSubscription, isStripeConfigured } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { checkApiRateLimit } from '@/lib/ratelimit';

// =============================================================================
// Helpers
// =============================================================================

function createRequest(body: Record<string, unknown> = {}): NextRequest {
  return new NextRequest('http://localhost:3000/api/stripe/cancel-subscription', {
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

describe('POST /api/stripe/cancel-subscription', () => {
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
  // No subscription / free plan
  // ---------------------------------------------------------------------------

  describe('no subscription handling', () => {
    it('returns 400 when no subscription record exists', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(null);

      const res = await POST(createRequest());
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('No active subscription found');
    });

    it('returns 400 when user is already on free plan', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        ...mockSubscription,
        plan: 'free',
      });

      const res = await POST(createRequest());
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('No active subscription found');
    });

    it('resets to free plan locally when no Stripe subscription ID', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        ...mockSubscription,
        stripeSubscriptionId: null,
      });
      vi.mocked(prisma.subscription.update).mockResolvedValue({ ...mockSubscription, plan: 'free' });

      const res = await POST(createRequest());
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.cancelledImmediately).toBe(true);
      expect(prisma.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-123' },
          data: expect.objectContaining({ plan: 'free', cancelAtPeriodEnd: false }),
        })
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Immediate cancellation
  // ---------------------------------------------------------------------------

  describe('immediate cancellation', () => {
    it('cancels immediately when cancelImmediately=true', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(mockSubscription);
      vi.mocked(cancelSubscription).mockResolvedValue({ success: true });
      vi.mocked(prisma.subscription.update).mockResolvedValue({ ...mockSubscription, plan: 'free' });

      const res = await POST(createRequest({ cancelImmediately: true }));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.cancelledImmediately).toBe(true);
      expect(cancelSubscription).toHaveBeenCalledWith('sub_stripe_abc123', true);
    });

    it('sets plan to free on immediate cancellation', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(mockSubscription);
      vi.mocked(cancelSubscription).mockResolvedValue({ success: true });
      vi.mocked(prisma.subscription.update).mockResolvedValue({ ...mockSubscription });

      await POST(createRequest({ cancelImmediately: true }));

      expect(prisma.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            plan: 'free',
            stripeSubscriptionId: null,
            cancelAtPeriodEnd: false,
          }),
        })
      );
    });

    it('includes success message on immediate cancel', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(mockSubscription);
      vi.mocked(cancelSubscription).mockResolvedValue({ success: true });
      vi.mocked(prisma.subscription.update).mockResolvedValue({ ...mockSubscription });

      const res = await POST(createRequest({ cancelImmediately: true }));
      const data = await res.json();

      expect(data.message).toContain('cancelled');
      expect(data.message).toContain('Free plan');
    });
  });

  // ---------------------------------------------------------------------------
  // Scheduled cancellation (end of period)
  // ---------------------------------------------------------------------------

  describe('scheduled cancellation', () => {
    it('schedules cancellation at period end when cancelImmediately=false (default)', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(mockSubscription);
      vi.mocked(cancelSubscription).mockResolvedValue({ success: true });
      vi.mocked(prisma.subscription.update).mockResolvedValue({ ...mockSubscription });

      const res = await POST(createRequest({}));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.cancelledImmediately).toBe(false);
      expect(cancelSubscription).toHaveBeenCalledWith('sub_stripe_abc123', false);
    });

    it('sets cancelAtPeriodEnd=true on scheduled cancel', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(mockSubscription);
      vi.mocked(cancelSubscription).mockResolvedValue({ success: true });
      vi.mocked(prisma.subscription.update).mockResolvedValue({ ...mockSubscription });

      await POST(createRequest({ cancelImmediately: false }));

      expect(prisma.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ cancelAtPeriodEnd: true }),
        })
      );
    });

    it('includes billing period message on scheduled cancel', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(mockSubscription);
      vi.mocked(cancelSubscription).mockResolvedValue({ success: true });
      vi.mocked(prisma.subscription.update).mockResolvedValue({ ...mockSubscription });

      const res = await POST(createRequest({ cancelImmediately: false }));
      const data = await res.json();

      expect(data.message).toContain('billing period');
    });
  });

  // ---------------------------------------------------------------------------
  // Stripe errors
  // ---------------------------------------------------------------------------

  describe('stripe errors', () => {
    it('returns 500 when Stripe cancellation fails', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(mockSubscription);
      vi.mocked(cancelSubscription).mockResolvedValue({ success: false, error: 'Stripe error' });

      const res = await POST(createRequest({ cancelImmediately: true }));
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe('Stripe error');
    });

    it('returns 500 with default message when Stripe error has no message', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(mockSubscription);
      vi.mocked(cancelSubscription).mockResolvedValue({ success: false });

      const res = await POST(createRequest({ cancelImmediately: true }));
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBeTruthy();
    });

    it('handles unexpected errors gracefully', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
      vi.mocked(prisma.subscription.findUnique).mockRejectedValue(new Error('DB error'));

      const res = await POST(createRequest());
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe('Failed to cancel subscription');
    });
  });
});
