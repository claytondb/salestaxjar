/**
 * Shopify Integration Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma before importing shopify
vi.mock('../prisma', () => ({
  prisma: {
    platformConnection: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

// Mock environment variables
const originalEnv = process.env;

beforeEach(() => {
  vi.resetModules();
  process.env = { ...originalEnv };
});

describe('isShopifyConfigured', () => {
  it('should return false when neither key is set', async () => {
    delete process.env.SHOPIFY_API_KEY;
    delete process.env.SHOPIFY_API_SECRET;
    
    const { isShopifyConfigured } = await import('./shopify');
    expect(isShopifyConfigured()).toBe(false);
  });

  it('should return false when only API key is set', async () => {
    process.env.SHOPIFY_API_KEY = 'test-key';
    delete process.env.SHOPIFY_API_SECRET;
    
    const { isShopifyConfigured } = await import('./shopify');
    expect(isShopifyConfigured()).toBe(false);
  });

  it('should return false when only API secret is set', async () => {
    delete process.env.SHOPIFY_API_KEY;
    process.env.SHOPIFY_API_SECRET = 'test-secret';
    
    const { isShopifyConfigured } = await import('./shopify');
    expect(isShopifyConfigured()).toBe(false);
  });

  it('should return true when both keys are set', async () => {
    process.env.SHOPIFY_API_KEY = 'test-key';
    process.env.SHOPIFY_API_SECRET = 'test-secret';
    
    const { isShopifyConfigured } = await import('./shopify');
    expect(isShopifyConfigured()).toBe(true);
  });
});

describe('getAuthorizationUrl', () => {
  beforeEach(() => {
    process.env.SHOPIFY_API_KEY = 'test-api-key';
    process.env.SHOPIFY_API_SECRET = 'test-secret';
    process.env.NEXT_PUBLIC_APP_URL = 'https://sails.tax';
  });

  it('should generate valid OAuth URL', async () => {
    const { getAuthorizationUrl } = await import('./shopify');
    const url = getAuthorizationUrl('mystore.myshopify.com', 'test-state');
    
    expect(url).toContain('https://mystore.myshopify.com/admin/oauth/authorize');
    expect(url).toContain('client_id=test-api-key');
    expect(url).toContain('state=test-state');
    expect(url).toContain('redirect_uri=');
    expect(url).toContain('scope=');
  });

  it('should include required scopes', async () => {
    const { getAuthorizationUrl } = await import('./shopify');
    const url = getAuthorizationUrl('mystore.myshopify.com', 'state');
    
    expect(url).toContain('read_orders');
    expect(url).toContain('read_products');
    expect(url).toContain('read_customers');
    expect(url).toContain('read_locations');
  });

  it('should normalize shop domain in URL', async () => {
    const { getAuthorizationUrl } = await import('./shopify');
    
    // Just store name without domain
    const url1 = getAuthorizationUrl('mystore', 'state');
    expect(url1).toContain('https://mystore.myshopify.com/admin/oauth/authorize');
    
    // With https prefix
    const url2 = getAuthorizationUrl('https://mystore.myshopify.com', 'state');
    expect(url2).toContain('https://mystore.myshopify.com/admin/oauth/authorize');
    
    // With trailing slash
    const url3 = getAuthorizationUrl('mystore.myshopify.com/', 'state');
    expect(url3).toContain('https://mystore.myshopify.com/admin/oauth/authorize');
  });

  it('should include callback redirect URI', async () => {
    const { getAuthorizationUrl } = await import('./shopify');
    const url = getAuthorizationUrl('mystore.myshopify.com', 'state');
    
    expect(url).toContain(encodeURIComponent('https://sails.tax/api/platforms/shopify/callback'));
  });
});

describe('ShopifyOrder type', () => {
  it('should define required fields', () => {
    // Type check at compile time - just verify the types exist
    const order: import('./shopify').ShopifyOrder = {
      id: 12345,
      name: '#1001',
      created_at: '2024-03-15T10:00:00Z',
      total_price: '99.99',
      subtotal_price: '89.99',
      total_tax: '8.00',
      currency: 'USD',
      financial_status: 'paid',
      fulfillment_status: 'fulfilled',
      line_items: [],
      tax_lines: [],
    };
    
    expect(order.id).toBe(12345);
    expect(order.name).toBe('#1001');
  });

  it('should allow optional shipping address', async () => {
    const order: import('./shopify').ShopifyOrder = {
      id: 12345,
      name: '#1001',
      created_at: '2024-03-15T10:00:00Z',
      total_price: '99.99',
      subtotal_price: '89.99',
      total_tax: '8.00',
      currency: 'USD',
      financial_status: 'paid',
      fulfillment_status: null,
      line_items: [],
      tax_lines: [],
      shipping_address: {
        address1: '123 Main St',
        city: 'Los Angeles',
        province: 'California',
        province_code: 'CA',
        zip: '90210',
        country: 'United States',
        country_code: 'US',
      },
    };
    
    expect(order.shipping_address?.province_code).toBe('CA');
  });
});

describe('ShopifyAddress type', () => {
  it('should define address fields', () => {
    const address: import('./shopify').ShopifyAddress = {
      address1: '123 Main St',
      city: 'Los Angeles',
      province: 'California',
      province_code: 'CA',
      zip: '90210',
      country: 'United States',
      country_code: 'US',
    };
    
    expect(address.province_code).toBe('CA');
    expect(address.country_code).toBe('US');
  });

  it('should allow optional address2', () => {
    const address: import('./shopify').ShopifyAddress = {
      address1: '123 Main St',
      address2: 'Suite 100',
      city: 'Los Angeles',
      province: 'California',
      province_code: 'CA',
      zip: '90210',
      country: 'United States',
      country_code: 'US',
    };
    
    expect(address.address2).toBe('Suite 100');
  });
});

describe('ShopifyLineItem type', () => {
  it('should define line item fields', () => {
    const item: import('./shopify').ShopifyLineItem = {
      id: 1,
      title: 'Widget Pro',
      quantity: 2,
      price: '49.99',
      taxable: true,
      tax_lines: [
        {
          title: 'State Tax',
          price: '4.00',
          rate: 0.08,
        },
      ],
    };
    
    expect(item.title).toBe('Widget Pro');
    expect(item.quantity).toBe(2);
    expect(item.taxable).toBe(true);
    expect(item.tax_lines).toHaveLength(1);
  });

  it('should allow optional sku', () => {
    const item: import('./shopify').ShopifyLineItem = {
      id: 1,
      title: 'Widget Pro',
      quantity: 1,
      price: '49.99',
      sku: 'WIDGET-001',
      taxable: true,
      tax_lines: [],
    };
    
    expect(item.sku).toBe('WIDGET-001');
  });
});

describe('ShopifyTaxLine type', () => {
  it('should define tax line fields', () => {
    const taxLine: import('./shopify').ShopifyTaxLine = {
      title: 'California State Tax',
      price: '8.25',
      rate: 0.0825,
    };
    
    expect(taxLine.title).toBe('California State Tax');
    expect(taxLine.price).toBe('8.25');
    expect(taxLine.rate).toBe(0.0825);
  });
});

describe('ShopifyLocation type', () => {
  it('should define location fields', () => {
    const location: import('./shopify').ShopifyLocation = {
      id: 1,
      name: 'Main Warehouse',
      address1: '123 Warehouse Lane',
      city: 'San Francisco',
      province: 'California',
      province_code: 'CA',
      zip: '94105',
      country: 'United States',
      country_code: 'US',
      active: true,
    };
    
    expect(location.name).toBe('Main Warehouse');
    expect(location.active).toBe(true);
  });

  it('should allow optional address2', () => {
    const location: import('./shopify').ShopifyLocation = {
      id: 1,
      name: 'Main Warehouse',
      address1: '123 Warehouse Lane',
      address2: 'Building A',
      city: 'San Francisco',
      province: 'California',
      province_code: 'CA',
      zip: '94105',
      country: 'United States',
      country_code: 'US',
      active: true,
    };
    
    expect(location.address2).toBe('Building A');
  });
});

describe('Shopify order data handling', () => {
  it('should handle price strings correctly', () => {
    const order: import('./shopify').ShopifyOrder = {
      id: 1001,
      name: '#1001',
      created_at: '2024-03-15T10:00:00Z',
      total_price: '129.99',
      subtotal_price: '119.99',
      total_tax: '10.00',
      currency: 'USD',
      financial_status: 'paid',
      fulfillment_status: 'fulfilled',
      line_items: [],
      tax_lines: [],
    };
    
    // Verify string to number conversion
    expect(parseFloat(order.total_price)).toBe(129.99);
    expect(parseFloat(order.subtotal_price)).toBe(119.99);
    expect(parseFloat(order.total_tax)).toBe(10.00);
  });

  it('should handle multiple tax lines', () => {
    const order: import('./shopify').ShopifyOrder = {
      id: 1001,
      name: '#1001',
      created_at: '2024-03-15T10:00:00Z',
      total_price: '129.99',
      subtotal_price: '119.99',
      total_tax: '10.00',
      currency: 'USD',
      financial_status: 'paid',
      fulfillment_status: null,
      line_items: [],
      tax_lines: [
        { title: 'State Tax', price: '8.00', rate: 0.0725 },
        { title: 'County Tax', price: '1.50', rate: 0.0125 },
        { title: 'City Tax', price: '0.50', rate: 0.005 },
      ],
    };
    
    expect(order.tax_lines).toHaveLength(3);
    
    const totalTax = order.tax_lines.reduce((sum, t) => sum + parseFloat(t.price), 0);
    expect(totalTax).toBe(10.00);
  });

  it('should handle different financial statuses', () => {
    const statuses = ['authorized', 'paid', 'partially_paid', 'pending', 'voided', 'refunded', 'partially_refunded'];
    
    statuses.forEach(status => {
      const order: import('./shopify').ShopifyOrder = {
        id: 1001,
        name: '#1001',
        created_at: '2024-03-15T10:00:00Z',
        total_price: '99.99',
        subtotal_price: '89.99',
        total_tax: '8.00',
        currency: 'USD',
        financial_status: status,
        fulfillment_status: null,
        line_items: [],
        tax_lines: [],
      };
      
      expect(order.financial_status).toBe(status);
    });
  });

  it('should handle different fulfillment statuses', () => {
    // null means unfulfilled
    const order1: import('./shopify').ShopifyOrder = {
      id: 1001,
      name: '#1001',
      created_at: '2024-03-15T10:00:00Z',
      total_price: '99.99',
      subtotal_price: '89.99',
      total_tax: '8.00',
      currency: 'USD',
      financial_status: 'paid',
      fulfillment_status: null,
      line_items: [],
      tax_lines: [],
    };
    expect(order1.fulfillment_status).toBeNull();
    
    // 'fulfilled' means complete
    const order2: import('./shopify').ShopifyOrder = {
      ...order1,
      fulfillment_status: 'fulfilled',
    };
    expect(order2.fulfillment_status).toBe('fulfilled');
  });

  it('should handle line items with taxes', () => {
    const item: import('./shopify').ShopifyLineItem = {
      id: 1,
      title: 'Premium Widget',
      quantity: 3,
      price: '39.99',
      sku: 'PREM-WDG-001',
      taxable: true,
      tax_lines: [
        { title: 'CA Tax', price: '3.20', rate: 0.08 },
      ],
    };
    
    const itemTotal = parseFloat(item.price) * item.quantity;
    expect(itemTotal).toBeCloseTo(119.97, 2);
    
    const itemTax = item.tax_lines.reduce((sum, t) => sum + parseFloat(t.price), 0);
    expect(itemTax).toBe(3.20);
  });
});
