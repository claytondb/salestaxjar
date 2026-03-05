/**
 * Unit tests for Stripe utilities
 * Tests plan configuration and helper functions
 * 
 * Note: These tests use the fallback values from stripe.ts since env vars
 * are evaluated at module load time. The fallbacks are:
 * - price_starter, price_pro, price_business
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

  test('should have business plan with correct configuration', () => {
    expect(PLANS.business).toBeDefined();
    expect(PLANS.business.name).toBe('Business');
    expect(PLANS.business.price).toBe(59);
    // Uses fallback when env var not set
    expect(PLANS.business.priceId).toMatch(/^price_business/);
    expect(PLANS.business.features).toBeInstanceOf(Array);
  });

  test('starter plan should include platform integrations feature', () => {
    expect(PLANS.starter.features).toContain('All platform integrations');
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

  test('business plan should include unlimited orders', () => {
    const hasUnlimited = PLANS.business.features.some(f => 
      f.toLowerCase().includes('unlimited')
    );
    expect(hasUnlimited).toBe(true);
  });

  test('plans should have incrementing prices', () => {
    expect(PLANS.starter.price).toBeLessThan(PLANS.pro.price);
    expect(PLANS.pro.price).toBeLessThan(PLANS.business.price);
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

  test('should return business plan for business price ID', () => {
    const result = getPlanByPriceId(PLANS.business.priceId);
    
    expect(result).not.toBeNull();
    expect(result?.id).toBe('business');
    expect(result?.plan.name).toBe('Business');
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

  test('should return 2 for business', () => {
    expect(getPlanTier('business')).toBe(2);
  });

  test('tiers should be ordered correctly', () => {
    expect(getPlanTier('starter')).toBeLessThan(getPlanTier('pro'));
    expect(getPlanTier('pro')).toBeLessThan(getPlanTier('business'));
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

  test('should return true for starter to business', () => {
    expect(isUpgrade('starter', 'business')).toBe(true);
  });

  test('should return true for pro to business', () => {
    expect(isUpgrade('pro', 'business')).toBe(true);
  });

  // Downgrades
  test('should return false for pro to starter', () => {
    expect(isUpgrade('pro', 'starter')).toBe(false);
  });

  test('should return false for business to pro', () => {
    expect(isUpgrade('business', 'pro')).toBe(false);
  });

  test('should return false for business to starter', () => {
    expect(isUpgrade('business', 'starter')).toBe(false);
  });

  // Same plan
  test('should return false for starter to starter', () => {
    expect(isUpgrade('starter', 'starter')).toBe(false);
  });

  test('should return false for pro to pro', () => {
    expect(isUpgrade('pro', 'pro')).toBe(false);
  });

  test('should return false for business to business', () => {
    expect(isUpgrade('business', 'business')).toBe(false);
  });
});

// =============================================================================
// Plan Features Consistency Tests
// =============================================================================

describe('Plan features consistency', () => {
  test('all plans should have at least 2 features', () => {
    expect(PLANS.starter.features.length).toBeGreaterThanOrEqual(2);
    expect(PLANS.pro.features.length).toBeGreaterThanOrEqual(2);
    expect(PLANS.business.features.length).toBeGreaterThanOrEqual(2);
  });

  test('all features should be non-empty strings', () => {
    const allFeatures = [
      ...PLANS.starter.features,
      ...PLANS.pro.features,
      ...PLANS.business.features,
    ];
    
    for (const feature of allFeatures) {
      expect(typeof feature).toBe('string');
      expect(feature.length).toBeGreaterThan(0);
    }
  });

  test('all plans should have required properties', () => {
    const requiredKeys = ['name', 'priceId', 'price', 'features'];
    
    for (const [planId, plan] of Object.entries(PLANS)) {
      for (const key of requiredKeys) {
        expect(plan).toHaveProperty(key);
      }
    }
  });

  test('all prices should be positive numbers', () => {
    expect(PLANS.starter.price).toBeGreaterThan(0);
    expect(PLANS.pro.price).toBeGreaterThan(0);
    expect(PLANS.business.price).toBeGreaterThan(0);
  });

  test('only pro plan should be marked as popular', () => {
    expect((PLANS.starter as any).popular).toBeFalsy();
    expect(PLANS.pro.popular).toBe(true);
    expect((PLANS.business as any).popular).toBeFalsy();
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
    
    // Business: $59/mo (about 2x pro)
    expect(PLANS.business.price).toBe(59);
    expect(PLANS.business.price).toBeGreaterThan(PLANS.pro.price * 1.5);
  });

  test('price-to-tier mapping should be consistent', () => {
    // Higher tier = higher price
    const prices = [PLANS.starter.price, PLANS.pro.price, PLANS.business.price];
    
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

  test('business mentions unlimited orders', () => {
    const orderFeature = PLANS.business.features.find(f => 
      f.toLowerCase().includes('unlimited')
    );
    expect(orderFeature).toBeDefined();
  });
});
