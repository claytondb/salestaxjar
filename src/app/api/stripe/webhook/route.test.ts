/**
 * Tests for /api/stripe/webhook route
 *
 * Tests Stripe webhook event handling including signature verification,
 * checkout completion, subscription lifecycle, and payment events.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies before importing route
vi.mock('@/lib/stripe', () => ({
  constructWebhookEvent: vi.fn(),
  getPlanByPriceId: vi.fn(),
  isStripeConfigured: vi.fn(),
  stripe: null,
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    subscription: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/email', () => ({
  sendPaymentFailedEmail: vi.fn(),
}));

import { POST } from './route';
import { constructWebhookEvent, getPlanByPriceId, isStripeConfigured } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { sendPaymentFailedEmail } from '@/lib/email';

// =============================================================================
// Helpers
// =============================================================================

function createWebhookRequest(body: string, signature: string | null = 'valid-sig'): NextRequest {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (signature) {
    headers['stripe-signature'] = signature;
  }
  return new NextRequest('http://localhost:3000/api/stripe/webhook', {
    method: 'POST',
    headers,
    body,
  });
}

function makeEvent(type: string, data: object, id = 'evt_test_123') {
  return { id, type, data: { object: data } };
}

// Minimal mock Stripe objects
const mockCheckoutSession = {
  id: 'cs_test_123',
  client_reference_id: 'user-123',
  metadata: { userId: 'user-123' },
  customer: 'cus_abc123',
  subscription: 'sub_stripe_abc123',
};

const mockSubscription = {
  id: 'sub_stripe_abc123',
  customer: 'cus_abc123',
  status: 'active',
  cancel_at_period_end: false,
  items: {
    data: [{ price: { id: 'price_starter_monthly' } }],
  },
};

const mockDbSubscription = {
  id: 'sub-db-1',
  userId: 'user-123',
  plan: 'starter',
  stripeCustomerId: 'cus_abc123',
  stripeSubscriptionId: 'sub_stripe_abc123',
  user: { id: 'user-123', email: 'test@example.com', name: 'Test User' },
};

const mockInvoice = {
  id: 'in_test_123',
  customer: 'cus_abc123',
  amount_due: 900,
};

// =============================================================================
// Tests
// =============================================================================

describe('POST /api/stripe/webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isStripeConfigured).mockReturnValue(true);
  });

  // ---------------------------------------------------------------------------
  // Stripe not configured
  // ---------------------------------------------------------------------------

  describe('stripe not configured', () => {
    it('returns 503 when Stripe is not configured', async () => {
      vi.mocked(isStripeConfigured).mockReturnValue(false);

      const res = await POST(createWebhookRequest('{}'));
      const data = await res.json();

      expect(res.status).toBe(503);
      expect(data.error).toBe('Stripe not configured');
    });
  });

  // ---------------------------------------------------------------------------
  // Signature verification
  // ---------------------------------------------------------------------------

  describe('signature verification', () => {
    it('returns 400 when stripe-signature header is missing', async () => {
      const res = await POST(createWebhookRequest('{}', null));
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('Missing signature');
    });

    it('returns 400 when signature verification fails', async () => {
      vi.mocked(constructWebhookEvent).mockReturnValue(null);

      const res = await POST(createWebhookRequest('{}', 'bad-sig'));
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('Invalid signature');
    });

    it('proceeds when signature is valid', async () => {
      vi.mocked(constructWebhookEvent).mockReturnValue(
        makeEvent('unknown.event', {}) as ReturnType<typeof constructWebhookEvent>
      );

      const res = await POST(createWebhookRequest('{}', 'valid-sig'));
      const data = await res.json();

      // Unknown event type is still accepted (returns 200 with received=true)
      expect(res.status).toBe(200);
      expect(data.received).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // checkout.session.completed
  // ---------------------------------------------------------------------------

  describe('checkout.session.completed', () => {
    it('handles checkout completion with no subscription (missing userId)', async () => {
      const sessionWithNoUser = { ...mockCheckoutSession, client_reference_id: null, metadata: {} };
      vi.mocked(constructWebhookEvent).mockReturnValue(
        makeEvent('checkout.session.completed', sessionWithNoUser) as ReturnType<typeof constructWebhookEvent>
      );

      const res = await POST(createWebhookRequest('{}'));
      const data = await res.json();

      // Still returns 200 — webhook errors shouldn't trigger retries for logic failures
      expect(res.status).toBe(200);
      expect(data.received).toBe(true);
      expect(prisma.subscription.upsert).not.toHaveBeenCalled();
    });

    it('handles checkout completion with no customer ID', async () => {
      const sessionWithNoCustomer = { ...mockCheckoutSession, customer: null };
      vi.mocked(constructWebhookEvent).mockReturnValue(
        makeEvent('checkout.session.completed', sessionWithNoCustomer) as ReturnType<typeof constructWebhookEvent>
      );

      const res = await POST(createWebhookRequest('{}'));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(prisma.subscription.upsert).not.toHaveBeenCalled();
    });

    it('upserts subscription on successful checkout (no Stripe sub lookup since stripe=null)', async () => {
      vi.mocked(constructWebhookEvent).mockReturnValue(
        makeEvent('checkout.session.completed', mockCheckoutSession) as ReturnType<typeof constructWebhookEvent>
      );
      vi.mocked(prisma.subscription.upsert).mockResolvedValue(mockDbSubscription as never);

      const res = await POST(createWebhookRequest('{}'));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.received).toBe(true);
      expect(prisma.subscription.upsert).toHaveBeenCalled();
    });

    it('creates subscription with correct user and customer IDs', async () => {
      vi.mocked(constructWebhookEvent).mockReturnValue(
        makeEvent('checkout.session.completed', mockCheckoutSession) as ReturnType<typeof constructWebhookEvent>
      );
      vi.mocked(prisma.subscription.upsert).mockResolvedValue(mockDbSubscription as never);

      await POST(createWebhookRequest('{}'));

      const call = vi.mocked(prisma.subscription.upsert).mock.calls[0][0];
      expect(call.where.userId).toBe('user-123');
      expect(call.create.stripeCustomerId).toBe('cus_abc123');
      expect(call.create.status).toBe('active');
    });
  });

  // ---------------------------------------------------------------------------
  // customer.subscription.updated
  // ---------------------------------------------------------------------------

  describe('customer.subscription.updated', () => {
    it('updates subscription record when subscription is updated', async () => {
      vi.mocked(constructWebhookEvent).mockReturnValue(
        makeEvent('customer.subscription.updated', mockSubscription) as ReturnType<typeof constructWebhookEvent>
      );
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(mockDbSubscription as never);
      vi.mocked(getPlanByPriceId).mockReturnValue({ id: 'starter', plan: { name: 'Starter', priceId: 'price_starter_monthly', price: 9, id: 'starter' } });
      vi.mocked(prisma.subscription.update).mockResolvedValue(mockDbSubscription as never);

      const res = await POST(createWebhookRequest('{}'));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.received).toBe(true);
      expect(prisma.subscription.update).toHaveBeenCalled();
    });

    it('does not update when no DB subscription found for customer', async () => {
      vi.mocked(constructWebhookEvent).mockReturnValue(
        makeEvent('customer.subscription.updated', mockSubscription) as ReturnType<typeof constructWebhookEvent>
      );
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(null);

      const res = await POST(createWebhookRequest('{}'));

      expect(res.status).toBe(200);
      expect(prisma.subscription.update).not.toHaveBeenCalled();
    });

    it('handles customer.subscription.created event too', async () => {
      vi.mocked(constructWebhookEvent).mockReturnValue(
        makeEvent('customer.subscription.created', mockSubscription) as ReturnType<typeof constructWebhookEvent>
      );
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(mockDbSubscription as never);
      vi.mocked(getPlanByPriceId).mockReturnValue({ id: 'starter', plan: { name: 'Starter', priceId: 'price_starter_monthly', price: 9, id: 'starter' } });
      vi.mocked(prisma.subscription.update).mockResolvedValue(mockDbSubscription as never);

      const res = await POST(createWebhookRequest('{}'));

      expect(res.status).toBe(200);
      expect(prisma.subscription.update).toHaveBeenCalled();
    });

    it('updates with plan info from price ID', async () => {
      vi.mocked(constructWebhookEvent).mockReturnValue(
        makeEvent('customer.subscription.updated', mockSubscription) as ReturnType<typeof constructWebhookEvent>
      );
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(mockDbSubscription as never);
      vi.mocked(getPlanByPriceId).mockReturnValue({ id: 'growth', plan: { name: 'Growth', priceId: 'price_growth_monthly', price: 29, id: 'growth' } });
      vi.mocked(prisma.subscription.update).mockResolvedValue(mockDbSubscription as never);

      await POST(createWebhookRequest('{}'));

      const call = vi.mocked(prisma.subscription.update).mock.calls[0][0];
      expect(call.data.plan).toBe('growth');
    });

    it('falls back to starter plan when price ID is unknown', async () => {
      vi.mocked(constructWebhookEvent).mockReturnValue(
        makeEvent('customer.subscription.updated', mockSubscription) as ReturnType<typeof constructWebhookEvent>
      );
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(mockDbSubscription as never);
      vi.mocked(getPlanByPriceId).mockReturnValue(null);
      vi.mocked(prisma.subscription.update).mockResolvedValue(mockDbSubscription as never);

      await POST(createWebhookRequest('{}'));

      const call = vi.mocked(prisma.subscription.update).mock.calls[0][0];
      expect(call.data.plan).toBe('starter');
    });
  });

  // ---------------------------------------------------------------------------
  // customer.subscription.deleted
  // ---------------------------------------------------------------------------

  describe('customer.subscription.deleted', () => {
    it('marks subscription as canceled when deleted', async () => {
      vi.mocked(constructWebhookEvent).mockReturnValue(
        makeEvent('customer.subscription.deleted', mockSubscription) as ReturnType<typeof constructWebhookEvent>
      );
      vi.mocked(prisma.subscription.updateMany).mockResolvedValue({ count: 1 });

      const res = await POST(createWebhookRequest('{}'));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.received).toBe(true);
      expect(prisma.subscription.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { stripeCustomerId: 'cus_abc123' },
          data: expect.objectContaining({ status: 'canceled' }),
        })
      );
    });

    it('clears Stripe subscription and price IDs on cancel', async () => {
      vi.mocked(constructWebhookEvent).mockReturnValue(
        makeEvent('customer.subscription.deleted', mockSubscription) as ReturnType<typeof constructWebhookEvent>
      );
      vi.mocked(prisma.subscription.updateMany).mockResolvedValue({ count: 1 });

      await POST(createWebhookRequest('{}'));

      const call = vi.mocked(prisma.subscription.updateMany).mock.calls[0][0];
      expect(call.data.stripeSubscriptionId).toBeNull();
      expect(call.data.stripePriceId).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // invoice.payment_succeeded
  // ---------------------------------------------------------------------------

  describe('invoice.payment_succeeded', () => {
    it('sets subscription status to active on payment success', async () => {
      vi.mocked(constructWebhookEvent).mockReturnValue(
        makeEvent('invoice.payment_succeeded', mockInvoice) as ReturnType<typeof constructWebhookEvent>
      );
      vi.mocked(prisma.subscription.updateMany).mockResolvedValue({ count: 1 });

      const res = await POST(createWebhookRequest('{}'));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(prisma.subscription.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { stripeCustomerId: 'cus_abc123' },
          data: { status: 'active' },
        })
      );
    });
  });

  // ---------------------------------------------------------------------------
  // invoice.payment_failed
  // ---------------------------------------------------------------------------

  describe('invoice.payment_failed', () => {
    it('sets subscription status to past_due on payment failure', async () => {
      vi.mocked(constructWebhookEvent).mockReturnValue(
        makeEvent('invoice.payment_failed', mockInvoice) as ReturnType<typeof constructWebhookEvent>
      );
      vi.mocked(prisma.subscription.updateMany).mockResolvedValue({ count: 1 });
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(null);

      const res = await POST(createWebhookRequest('{}'));

      expect(res.status).toBe(200);
      expect(prisma.subscription.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'past_due' },
        })
      );
    });

    it('sends payment failed email when user is found', async () => {
      vi.mocked(constructWebhookEvent).mockReturnValue(
        makeEvent('invoice.payment_failed', mockInvoice) as ReturnType<typeof constructWebhookEvent>
      );
      vi.mocked(prisma.subscription.updateMany).mockResolvedValue({ count: 1 });
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(mockDbSubscription as never);
      vi.mocked(sendPaymentFailedEmail).mockResolvedValue(undefined);

      await POST(createWebhookRequest('{}'));

      expect(sendPaymentFailedEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          name: 'Test User',
          userId: 'user-123',
        })
      );
    });

    it('does not send email when user not found in DB', async () => {
      vi.mocked(constructWebhookEvent).mockReturnValue(
        makeEvent('invoice.payment_failed', mockInvoice) as ReturnType<typeof constructWebhookEvent>
      );
      vi.mocked(prisma.subscription.updateMany).mockResolvedValue({ count: 1 });
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(null);

      await POST(createWebhookRequest('{}'));

      expect(sendPaymentFailedEmail).not.toHaveBeenCalled();
    });

    it('continues even if email sending fails', async () => {
      vi.mocked(constructWebhookEvent).mockReturnValue(
        makeEvent('invoice.payment_failed', mockInvoice) as ReturnType<typeof constructWebhookEvent>
      );
      vi.mocked(prisma.subscription.updateMany).mockResolvedValue({ count: 1 });
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(mockDbSubscription as never);
      vi.mocked(sendPaymentFailedEmail).mockRejectedValue(new Error('Email error'));

      // Should not throw
      const res = await POST(createWebhookRequest('{}'));
      expect(res.status).toBe(200);
    });
  });

  // ---------------------------------------------------------------------------
  // Unknown event types
  // ---------------------------------------------------------------------------

  describe('unknown event types', () => {
    it('returns 200 for unhandled event types', async () => {
      vi.mocked(constructWebhookEvent).mockReturnValue(
        makeEvent('payment_intent.created', {}) as ReturnType<typeof constructWebhookEvent>
      );

      const res = await POST(createWebhookRequest('{}'));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.received).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Error handling
  // ---------------------------------------------------------------------------

  describe('error handling', () => {
    it('returns 500 on unexpected DB errors', async () => {
      vi.mocked(constructWebhookEvent).mockReturnValue(
        makeEvent('customer.subscription.deleted', mockSubscription) as ReturnType<typeof constructWebhookEvent>
      );
      vi.mocked(prisma.subscription.updateMany).mockRejectedValue(new Error('DB error'));

      const res = await POST(createWebhookRequest('{}'));
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe('Webhook handler failed');
    });
  });
});
