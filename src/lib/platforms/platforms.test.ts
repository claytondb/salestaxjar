/**
 * Tests for platforms/index.ts - Platform configuration and connection management
 * 
 * Tests the pure functions that don't require database access.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock prisma before importing
vi.mock('../prisma', () => ({
  prisma: {
    platformConnection: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      findFirst: vi.fn().mockResolvedValue(null),
      delete: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
    },
    importedOrder: {
      upsert: vi.fn().mockResolvedValue({}),
      aggregate: vi.fn().mockResolvedValue({
        _sum: { subtotal: 0, taxAmount: 0, totalAmount: 0 },
        _count: 0,
      }),
      findMany: vi.fn().mockResolvedValue([]),
    },
    salesSummary: {
      upsert: vi.fn().mockResolvedValue({}),
    },
  },
}));

import {
  getPlatformConfigurations,
  hasAnyPlatformConfigured,
  type PlatformConfig,
} from './index';

// =============================================================================
// getPlatformConfigurations
// =============================================================================

describe('getPlatformConfigurations', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return an array of platform configurations', () => {
    const configs = getPlatformConfigurations();
    expect(Array.isArray(configs)).toBe(true);
    expect(configs.length).toBeGreaterThan(0);
  });

  it('should include all supported platforms', () => {
    const configs = getPlatformConfigurations();
    const platformNames = configs.map(c => c.platform);
    
    expect(platformNames).toContain('shopify');
    expect(platformNames).toContain('woocommerce');
    expect(platformNames).toContain('bigcommerce');
    expect(platformNames).toContain('magento');
    expect(platformNames).toContain('prestashop');
    expect(platformNames).toContain('opencart');
    expect(platformNames).toContain('ecwid');
    expect(platformNames).toContain('squarespace');
  });

  it('should have required properties for each platform', () => {
    const configs = getPlatformConfigurations();
    
    configs.forEach((config: PlatformConfig) => {
      expect(config).toHaveProperty('platform');
      expect(config).toHaveProperty('name');
      expect(config).toHaveProperty('configured');
      expect(config).toHaveProperty('description');
      expect(config).toHaveProperty('features');
      
      expect(typeof config.platform).toBe('string');
      expect(typeof config.name).toBe('string');
      expect(typeof config.configured).toBe('boolean');
      expect(typeof config.description).toBe('string');
      expect(Array.isArray(config.features)).toBe(true);
    });
  });

  it('should have non-empty features array for each platform', () => {
    const configs = getPlatformConfigurations();
    
    configs.forEach((config: PlatformConfig) => {
      expect(config.features.length).toBeGreaterThan(0);
      config.features.forEach(feature => {
        expect(typeof feature).toBe('string');
        expect(feature.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Shopify configuration', () => {
    it('should have Shopify with correct properties', () => {
      const configs = getPlatformConfigurations();
      const shopify = configs.find(c => c.platform === 'shopify');
      
      expect(shopify).toBeDefined();
      expect(shopify!.name).toBe('Shopify');
      expect(shopify!.features).toContain('Order sync');
      expect(shopify!.setupUrl).toBeDefined();
    });

    it('should show Shopify as not configured without env vars', () => {
      delete process.env.SHOPIFY_API_KEY;
      delete process.env.SHOPIFY_API_SECRET;
      
      const configs = getPlatformConfigurations();
      const shopify = configs.find(c => c.platform === 'shopify');
      
      expect(shopify!.configured).toBe(false);
    });
  });

  describe('WooCommerce configuration', () => {
    it('should have WooCommerce with correct properties', () => {
      const configs = getPlatformConfigurations();
      const woo = configs.find(c => c.platform === 'woocommerce');
      
      expect(woo).toBeDefined();
      expect(woo!.name).toBe('WooCommerce');
      expect(woo!.features).toContain('Order sync');
      expect(woo!.features).toContain('WordPress plugin');
    });

    it('should show WooCommerce as always configured (uses per-store credentials)', () => {
      const configs = getPlatformConfigurations();
      const woo = configs.find(c => c.platform === 'woocommerce');
      
      expect(woo!.configured).toBe(true);
    });
  });

  describe('BigCommerce configuration', () => {
    it('should have BigCommerce with correct properties', () => {
      const configs = getPlatformConfigurations();
      const bc = configs.find(c => c.platform === 'bigcommerce');
      
      expect(bc).toBeDefined();
      expect(bc!.name).toBe('BigCommerce');
      expect(bc!.configured).toBe(true); // Uses per-store credentials
    });
  });

  describe('Magento configuration', () => {
    it('should have Magento with correct properties', () => {
      const configs = getPlatformConfigurations();
      const magento = configs.find(c => c.platform === 'magento');
      
      expect(magento).toBeDefined();
      expect(magento!.name).toBe('Magento / Adobe Commerce');
      expect(magento!.configured).toBe(true);
      expect(magento!.features).toContain('REST API');
    });
  });

  describe('PrestaShop configuration', () => {
    it('should have PrestaShop with correct properties', () => {
      const configs = getPlatformConfigurations();
      const presta = configs.find(c => c.platform === 'prestashop');
      
      expect(presta).toBeDefined();
      expect(presta!.name).toBe('PrestaShop');
      expect(presta!.configured).toBe(true);
      expect(presta!.features).toContain('Webservice API');
    });
  });

  describe('OpenCart configuration', () => {
    it('should have OpenCart with correct properties', () => {
      const configs = getPlatformConfigurations();
      const oc = configs.find(c => c.platform === 'opencart');
      
      expect(oc).toBeDefined();
      expect(oc!.name).toBe('OpenCart');
      expect(oc!.configured).toBe(true);
      expect(oc!.features).toContain('Session API');
    });
  });

  describe('Ecwid configuration', () => {
    it('should have Ecwid with correct properties', () => {
      const configs = getPlatformConfigurations();
      const ecwid = configs.find(c => c.platform === 'ecwid');
      
      expect(ecwid).toBeDefined();
      expect(ecwid!.name).toBe('Ecwid');
      expect(ecwid!.configured).toBe(true);
      expect(ecwid!.features).toContain('REST API');
    });
  });

  describe('Squarespace configuration', () => {
    it('should have Squarespace with correct properties', () => {
      const configs = getPlatformConfigurations();
      const ss = configs.find(c => c.platform === 'squarespace');
      
      expect(ss).toBeDefined();
      expect(ss!.name).toBe('Squarespace');
      expect(ss!.configured).toBe(true);
      expect(ss!.features).toContain('Commerce Advanced');
    });
  });
});

// =============================================================================
// hasAnyPlatformConfigured
// =============================================================================

describe('hasAnyPlatformConfigured', () => {
  it('should return true when at least one platform is configured', () => {
    // WooCommerce, BigCommerce, etc. are always considered "configured"
    // because they use per-store credentials stored in DB
    const result = hasAnyPlatformConfigured();
    expect(result).toBe(true);
  });
});

// =============================================================================
// Platform descriptions and features
// =============================================================================

describe('Platform descriptions', () => {
  it('should have meaningful descriptions for all platforms', () => {
    const configs = getPlatformConfigurations();
    
    configs.forEach((config: PlatformConfig) => {
      expect(config.description.length).toBeGreaterThan(20);
      // Description should mention the platform name or key functionality
      const descLower = config.description.toLowerCase();
      expect(
        descLower.includes(config.platform) || 
        descLower.includes('order') || 
        descLower.includes('tax') ||
        descLower.includes('connect') ||
        descLower.includes('store')
      ).toBe(true);
    });
  });
});

// =============================================================================
// No duplicates
// =============================================================================

describe('Platform uniqueness', () => {
  it('should not have duplicate platform identifiers', () => {
    const configs = getPlatformConfigurations();
    const platforms = configs.map(c => c.platform);
    const uniquePlatforms = [...new Set(platforms)];
    
    expect(platforms.length).toBe(uniquePlatforms.length);
  });

  it('should not have duplicate platform names', () => {
    const configs = getPlatformConfigurations();
    const names = configs.map(c => c.name);
    const uniqueNames = [...new Set(names)];
    
    expect(names.length).toBe(uniqueNames.length);
  });
});
