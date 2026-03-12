/**
 * Tests for /api/stripe/create-checkout-session route
 *
 * Tests Stripe checkout session creation including authentication,
 * plan validation, customer lookup/creation, and error handling.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies before importing route
vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('@/lib/stripe', () => ({
  createCheckoutSession: vi.fn(),
  getOrCreateCustomer: vi.fn(),
  isStripeConfigured: vi.fn(),
  PLANS: {
    starter: { id: 'starter', name: 'Starter', priceId: 'price_starter_monthly', price: 9 },
    growth: { id: 'growth', name: 'Growth', priceId: 'price_growth_monthly', price: 29 },
    pro: { id: 'pro', name: 'Pro', priceId: 'price_pro_monthly', price: 79 },
  },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    subscription: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

vi.mock('@/lib/ratelimit', () => ({
  checkApiRateLimit: vi.fn(),
  rateLimitHeaders: vi.fn(() => ({})),
}));

import { POST } from './route';
import { getCurrentUser } from '@/lib/auth';
import { createCheckoutSession, getOrCreateCustomer, isStripeConfigured } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { checkApiRateLimit } from '@/lib/ratelimit';

// =============================================================================
// Helpers
// =============================================================================

function createRequest(body: Record<string, unknown>, host = 'localhost:3000'): NextRequest {
  return new NextRequest('http://localhost:3000/api/stripe/create-checkout-session', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      'host': host,
    },
  });
}

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
};

const mockSubscription = {
  userId: 'user-123',
  stripeCustomerId: 'cus_existing123',
  plan: 'free',
  status: 'active',
};

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  vi.clearAllMocks();

  vi.mocked(getCurrentUser).mockResolvedValue(mockUser as never);
  vi.mocked(isStripeConfigured).mockReturnValue(true);
  vi.mocked(checkApiRateLimit).mockResolvedValue({
    success: true,
    limit: 30,
    remaining: 29,
    reset: Date.now() + 60000,
  });
  vi.mocked(prisma.subscription.findUnique).mockResolvedValue(mockSubscription as never);
  vi.mocked(createCheckoutSession).mockResolvedValue({
    sessionId: 'cs_test_abc123',
    url: 'https://checkout.stripe.com/pay/cs_test_abc123',
  });
});

// =============================================================================
// Successful Checkout Tests
// =============================================================================

describe('POST /api/stripe/create-checkout-session - success', () => {
  it('should return sessionId and url for valid plan', async () => {
    const request = createRequest({ planId: 'starter' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.sessionId).toBe('cs_test_abc123');
    expect(data.url).toContain('checkout.stripe.com');
  });

  it('should use existing customer ID from subscription', async () => {
    const request = createRequest({ planId: 'starter' });
    await POST(request);

    expect(createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: 'cus_existing123',
        priceId: 'price_starter_monthly',
      })
    );
  });

  it('should pass userId and email to checkout session', async () => {
    const request = createRequest({ planId: 'growth' });
    await POST(request);

    expect(createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-123',
        email: 'test@example.com',
        priceId: 'price_growth_monthly',
      })
    );
  });

  it('should include correct redirect URLs', async () => {
    const request = createRequest({ planId: 'starter' });
    await POST(request);

    expect(createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        successUrl: expect.stringContaining('/settings?tab=billing&success=true'),
        cancelUrl: expect.stringContaining('/settings?tab=billing&canceled=true'),
      })
    );
  });

  it('should accept all valid plan IDs', async () => {
    for (const planId of ['starter', 'growth', 'pro']) {
      const request = createRequest({ planId });
      const response = await POST(request);
      expect(response.status).toBe(200);
    }
  });
});

// =============================================================================
// Customer Creation Tests
// =============================================================================

describe('POST /api/stripe/create-checkout-session - new customer', () => {
  it('should create new customer when none exists', async () => {
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue(null);
    vi.mocked(getOrCreateCustomer).mockResolvedValue({
      customerId: 'cus_new456',
    });
    vi.mocked(prisma.subscription.upsert).mockResolvedValue({} as never);

    const request = createRequest({ planId: 'starter' });
    const response = await POST(request);

    expect(getOrCreateCustomer).toHaveBeenCalledWith({
      email: 'test@example.com',
      name: 'Test User',
      userId: 'user-123',
    });
    expect(response.status).toBe(200);
  });

  it('should save new customer ID to subscription', async () => {
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue(null);
    vi.mocked(getOrCreateCustomer).mockResolvedValue({
      customerId: 'cus_new456',
    });
    vi.mocked(prisma.subscription.upsert).mockResolvedValue({} as never);

    const request = createRequest({ planId: 'starter' });
    await POST(request);

    expect(prisma.subscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-123' },
      })
    );
  });

  it('should return 500 when customer creation fails', async () => {
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue(null);
    vi.mocked(getOrCreateCustomer).mockResolvedValue({
      error: 'Stripe API error',
    });

    const request = createRequest({ planId: 'starter' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Stripe API error');
  });

  it('should skip customer creation when subscription exists without customerId', async () => {
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
      ...mockSubscription,
      stripeCustomerId: null,
    } as never);
    vi.mocked(getOrCreateCustomer).mockResolvedValue({
      customerId: 'cus_created789',
    });
    vi.mocked(prisma.subscription.upsert).mockResolvedValue({} as never);

    const request = createRequest({ planId: 'starter' });
    const response = await POST(request);

    expect(getOrCreateCustomer).toHaveBeenCalled();
    expect(response.status).toBe(200);
  });
});

// =============================================================================
// Authentication Tests
// =============================================================================

describe('POST /api/stripe/create-checkout-session - authentication', () => {
  it('should return 401 when not authenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const request = createRequest({ planId: 'starter' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toContain('Not authenticated');
  });

  it('should not create checkout session when not authenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const request = createRequest({ planId: 'starter' });
    await POST(request);

    expect(createCheckoutSession).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Plan Validation Tests
// =============================================================================

describe('POST /api/stripe/create-checkout-session - plan validation', () => {
  it('should return 400 for invalid plan ID', async () => {
    const request = createRequest({ planId: 'enterprise' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid plan');
  });

  it('should return 400 when planId is missing', async () => {
    const request = createRequest({});
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid plan');
  });

  it('should not call createCheckoutSession for invalid plan', async () => {
    const request = createRequest({ planId: 'fake-plan' });
    await POST(request);

    expect(createCheckoutSession).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Rate Limiting Tests
// =============================================================================

describe('POST /api/stripe/create-checkout-session - rate limiting', () => {
  it('should return 429 when rate limited', async () => {
    vi.mocked(checkApiRateLimit).mockResolvedValue({
      success: false,
      limit: 30,
      remaining: 0,
      reset: Date.now() + 60000,
    });

    const request = createRequest({ planId: 'starter' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toContain('Too many requests');
  });

  it('should not proceed when rate limited', async () => {
    vi.mocked(checkApiRateLimit).mockResolvedValue({
      success: false,
      limit: 30,
      remaining: 0,
      reset: Date.now() + 60000,
    });

    const request = createRequest({ planId: 'starter' });
    await POST(request);

    expect(createCheckoutSession).not.toHaveBeenCalled();
  });

  it('should rate limit by user id', async () => {
    const request = createRequest({ planId: 'starter' });
    await POST(request);

    expect(checkApiRateLimit).toHaveBeenCalledWith('user-123');
  });
});

// =============================================================================
// Stripe Not Configured Tests
// =============================================================================

describe('POST /api/stripe/create-checkout-session - Stripe not configured', () => {
  it('should return 503 when Stripe is not configured', async () => {
    vi.mocked(isStripeConfigured).mockReturnValue(false);

    const request = createRequest({ planId: 'starter' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.error).toContain('Payment system not configured');
  });

  it('should indicate demo mode when Stripe is not configured', async () => {
    vi.mocked(isStripeConfigured).mockReturnValue(false);

    const request = createRequest({ planId: 'starter' });
    const response = await POST(request);
    const data = await response.json();

    expect(data.demo).toBe(true);
  });

  it('should not call createCheckoutSession when Stripe not configured', async () => {
    vi.mocked(isStripeConfigured).mockReturnValue(false);

    const request = createRequest({ planId: 'starter' });
    await POST(request);

    expect(createCheckoutSession).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Checkout Session Creation Error Tests
// =============================================================================

describe('POST /api/stripe/create-checkout-session - checkout errors', () => {
  it('should return 500 when checkout session creation fails', async () => {
    vi.mocked(createCheckoutSession).mockResolvedValue({
      error: 'No such price: price_starter_monthly',
    });

    const request = createRequest({ planId: 'starter' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('No such price: price_starter_monthly');
  });

  it('should return 500 on unexpected error', async () => {
    vi.mocked(createCheckoutSession).mockRejectedValue(new Error('Network timeout'));

    const request = createRequest({ planId: 'starter' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('Failed to create checkout session');
  });

  it('should handle invalid JSON body', async () => {
    const request = new NextRequest('http://localhost:3000/api/stripe/create-checkout-session', {
      method: 'POST',
      body: 'not-json',
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);

    expect(response.status).toBe(500);
  });
});
