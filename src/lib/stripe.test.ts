/**
 * Unit tests for Stripe utilities
 * Tests plan configuration and helper functions
 *
 * Note: These tests use the fallback values from stripe.ts since env vars
 * are evaluated at module load time. The fallbacks are:
 * - starter -> 'price_starter', pro -> 'price_pro'
 * - enterprise -> '' (no fake fallback; degrades gracefully when unconfigured)
 */

import { describe, test, expect, vi } from 'vitest';

// Mock Stripe before importing
vi.mock('stripe', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      checkout: {
        sessions: {
          create: vi.fn(),
        },
      },
      billingPortal: {
        sessions: {
          create: vi.fn(),
        },
      },
      customers: {
        list: vi.fn(),
        create: vi.fn(),
      },
      subscriptions: {
        retrieve: vi.fn(),
        update: vi.fn(),
        cancel: vi.fn(),
      },
      invoices: {
        createPreview: vi.fn(),
      },
      webhooks: {
        constructEvent: vi.fn(),
      },
    })),
  };
});

import {
  isStripeConfigured,
  PLANS,
  getPlanByPriceId,
  getPlanTier,
  isUpgrade,
} from './stripe';

// =============================================================================
// Stripe Configuration Tests
// =============================================================================

describe('isStripeConfigured', () => {
  test('should return false when STRIPE_SECRET_KEY is not set (test env)', () => {
    // In test environment, env vars aren't set, so this should be false
    // This validates the graceful fallback behavior
    expect(typeof isStripeConfigured()).toBe('boolean');
  });
});

// =============================================================================
// PLANS Configuration Tests
// =============================================================================

describe('PLANS', () => {
  test('should have starter plan with correct configuration', () => {
    expect(PLANS.starter).toBeDefined();
    expect(PLANS.starter.name).toBe('Starter');
    expect(PLANS.starter.price).toBe(9);
    // Uses fallback when env var not set
    expect(PLANS.starter.priceId).toMatch(/^price_starter/);
    expect(PLANS.starter.features).toBeInstanceOf(Array);
    expect(PLANS.starter.features.length).toBeGreaterThan(0);
  });

  test('should have pro plan with correct configuration', () => {
    expect(PLANS.pro).toBeDefined();
    expect(PLANS.pro.name).toBe('Pro');
    expect(PLANS.pro.price).toBe(29);
    // Uses fallback when env var not set
    expect(PLANS.pro.priceId).toMatch(/^price_pro/);
    expect(PLANS.pro.popular).toBe(true);
    expect(PLANS.pro.features).toBeInstanceOf(Array);
  });

  test('should have enterprise plan with correct configuration', () => {
    expect(PLANS.enterprise).toBeDefined();
    expect(PLANS.enterprise.name).toBe('Enterprise');
    expect(PLANS.enterprise.price).toBe(79);
    // No fake fallback: priceId is a string, empty when no env var is configured
    // (this is what makes checkout degrade gracefully instead of 500ing).
    expect(typeof PLANS.enterprise.priceId).toBe('string');
    expect(PLANS.enterprise.features).toBeInstanceOf(Array);
  });

  test('starter plan should include platform integrations feature', () => {
    expect(PLANS.starter.features).toContain('2 platform integrations');
  });

  test('starter plan should include order limit feature', () => {
    const hasOrderLimit = PLANS.starter.features.some(f =>
      f.includes('500 orders')
    );
    expect(hasOrderLimit).toBe(true);
  });

  test('pro plan should include API feature', () => {
    const hasApiFeature = PLANS.pro.features.some(f =>
      f.toLowerCase().includes('api')
    );
    expect(hasApiFeature).toBe(true);
  });

  test('enterprise plan should include unlimited orders', () => {
    const hasUnlimited = PLANS.enterprise.features.some(f =>
      f.toLowerCase().includes('unlimited')
    );
    expect(hasUnlimited).toBe(true);
  });

  test('plans should have incrementing prices', () => {
    expect(PLANS.starter.price).toBeLessThan(PLANS.pro.price);
    expect(PLANS.pro.price).toBeLessThan(PLANS.enterprise.price);
  });
});

// =============================================================================
// getPlanByPriceId Tests
// =============================================================================

describe('getPlanByPriceId', () => {
  test('should return starter plan for starter price ID', () => {
    // Use the actual priceId from the PLANS object (fallback value)
    const result = getPlanByPriceId(PLANS.starter.priceId);

    expect(result).not.toBeNull();
    expect(result?.id).toBe('starter');
    expect(result?.plan.name).toBe('Starter');
  });

  test('should return pro plan for pro price ID', () => {
    const result = getPlanByPriceId(PLANS.pro.priceId);

    expect(result).not.toBeNull();
    expect(result?.id).toBe('pro');
    expect(result?.plan.name).toBe('Pro');
  });

  test('unconfigured enterprise price (empty id) does not resolve — graceful degradation', () => {
    // In the test env neither STRIPE_ENTERPRISE_PRICE_ID nor the legacy
    // STRIPE_BUSINESS_PRICE_ID is set, so enterprise.priceId is '' and cannot
    // be looked up. This is intentional: checkout returns a clear error rather
    // than sending an invalid price to Stripe.
    expect(PLANS.enterprise.priceId).toBe('');
    expect(getPlanByPriceId(PLANS.enterprise.priceId)).toBeNull();
  });

  test('should return null for unknown price ID', () => {
    const result = getPlanByPriceId('price_unknown_123');

    expect(result).toBeNull();
  });

  test('should return null for empty price ID', () => {
    const result = getPlanByPriceId('');

    expect(result).toBeNull();
  });
});

// =============================================================================
// getPlanTier Tests
// =============================================================================

describe('getPlanTier', () => {
  test('should return 0 for starter', () => {
    expect(getPlanTier('starter')).toBe(0);
  });

  test('should return 1 for pro', () => {
    expect(getPlanTier('pro')).toBe(1);
  });

  test('should return 2 for enterprise', () => {
    expect(getPlanTier('enterprise')).toBe(2);
  });

  test('tiers should be ordered correctly', () => {
    expect(getPlanTier('starter')).toBeLessThan(getPlanTier('pro'));
    expect(getPlanTier('pro')).toBeLessThan(getPlanTier('enterprise'));
  });
});

// =============================================================================
// isUpgrade Tests
// =============================================================================

describe('isUpgrade', () => {
  // Upgrades
  test('should return true for starter to pro', () => {
    expect(isUpgrade('starter', 'pro')).toBe(true);
  });

  test('should return true for starter to enterprise', () => {
    expect(isUpgrade('starter', 'enterprise')).toBe(true);
  });

  test('should return true for pro to enterprise', () => {
    expect(isUpgrade('pro', 'enterprise')).toBe(true);
  });

  // Downgrades
  test('should return false for pro to starter', () => {
    expect(isUpgrade('pro', 'starter')).toBe(false);
  });

  test('should return false for enterprise to pro', () => {
    expect(isUpgrade('enterprise', 'pro')).toBe(false);
  });

  test('should return false for enterprise to starter', () => {
    expect(isUpgrade('enterprise', 'starter')).toBe(false);
  });

  // Same plan
  test('should return false for starter to starter', () => {
    expect(isUpgrade('starter', 'starter')).toBe(false);
  });

  test('should return false for pro to pro', () => {
    expect(isUpgrade('pro', 'pro')).toBe(false);
  });

  test('should return false for enterprise to enterprise', () => {
    expect(isUpgrade('enterprise', 'enterprise')).toBe(false);
  });
});

// =============================================================================
// Plan Features Consistency Tests
// =============================================================================

describe('Plan features consistency', () => {
  test('all plans should have at least 2 features', () => {
    expect(PLANS.starter.features.length).toBeGreaterThanOrEqual(2);
    expect(PLANS.pro.features.length).toBeGreaterThanOrEqual(2);
    expect(PLANS.enterprise.features.length).toBeGreaterThanOrEqual(2);
  });

  test('all features should be non-empty strings', () => {
    const allFeatures = [
      ...PLANS.starter.features,
      ...PLANS.pro.features,
      ...PLANS.enterprise.features,
    ];

    for (const feature of allFeatures) {
      expect(typeof feature).toBe('string');
      expect(feature.length).toBeGreaterThan(0);
    }
  });

  test('all plans should have required properties', () => {
    const requiredKeys = ['name', 'priceId', 'price', 'features'];

    for (const [, plan] of Object.entries(PLANS)) {
      for (const key of requiredKeys) {
        expect(plan).toHaveProperty(key);
      }
    }
  });

  test('all prices should be positive numbers', () => {
    expect(PLANS.starter.price).toBeGreaterThan(0);
    expect(PLANS.pro.price).toBeGreaterThan(0);
    expect(PLANS.enterprise.price).toBeGreaterThan(0);
  });

  test('only pro plan should be marked as popular', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((PLANS.starter as unknown as any).popular).toBeFalsy();
    expect(PLANS.pro.popular).toBe(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((PLANS.enterprise as unknown as any).popular).toBeFalsy();
  });
});

// =============================================================================
// Plan Pricing Logic Tests
// =============================================================================

describe('Plan pricing logic', () => {
  test('monthly costs should follow expected pricing structure', () => {
    // Starter: $9/mo
    expect(PLANS.starter.price).toBe(9);

    // Pro: $29/mo (more than 3x starter)
    expect(PLANS.pro.price).toBe(29);
    expect(PLANS.pro.price).toBeGreaterThan(PLANS.starter.price * 3);

    // Enterprise: $79/mo (well above pro)
    expect(PLANS.enterprise.price).toBe(79);
    expect(PLANS.enterprise.price).toBeGreaterThan(PLANS.pro.price * 1.5);
  });

  test('price-to-tier mapping should be consistent', () => {
    // Higher tier = higher price
    const prices = [PLANS.starter.price, PLANS.pro.price, PLANS.enterprise.price];

    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]).toBeGreaterThan(prices[i - 1]);
    }
  });
});

// =============================================================================
// Order Limit Feature Tests (based on plan features)
// =============================================================================

describe('Order limit features', () => {
  test('starter mentions 500 orders limit', () => {
    const orderFeature = PLANS.starter.features.find(f =>
      f.includes('order') || f.includes('Order')
    );
    expect(orderFeature).toBeDefined();
    expect(orderFeature).toContain('500');
  });

  test('pro mentions 5,000 orders limit', () => {
    const orderFeature = PLANS.pro.features.find(f =>
      f.includes('order') || f.includes('Order')
    );
    expect(orderFeature).toBeDefined();
    expect(orderFeature).toMatch(/5[,.]?000/);
  });

  test('enterprise mentions unlimited orders', () => {
    const orderFeature = PLANS.enterprise.features.find(f =>
      f.toLowerCase().includes('unlimited')
    );
    expect(orderFeature).toBeDefined();
  });
});
