/**
 * WooCommerce Integration Tests
 */

import { describe, it, expect, vi } from 'vitest';

// Mock prisma before importing woocommerce
vi.mock('../prisma', () => ({
  prisma: {
    platformConnection: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { 
  normalizeStoreUrl, 
  mapOrderToImport,
  type WooCommerceOrder 
} from './woocommerce';

describe('normalizeStoreUrl', () => {
  describe('protocol handling', () => {
    it('should add https:// if no protocol', () => {
      expect(normalizeStoreUrl('example.com')).toBe('https://example.com');
    });

    it('should keep https:// if already present', () => {
      expect(normalizeStoreUrl('https://example.com')).toBe('https://example.com');
    });

    it('should keep http:// if already present', () => {
      expect(normalizeStoreUrl('http://example.com')).toBe('http://example.com');
    });

    it('should handle uppercase protocols', () => {
      expect(normalizeStoreUrl('HTTPS://example.com')).toBe('https://example.com');
    });
  });

  describe('trailing slashes', () => {
    it('should remove single trailing slash', () => {
      expect(normalizeStoreUrl('https://example.com/')).toBe('https://example.com');
    });

    it('should remove multiple trailing slashes', () => {
      expect(normalizeStoreUrl('https://example.com///')).toBe('https://example.com');
    });

    it('should handle trailing slash without protocol', () => {
      expect(normalizeStoreUrl('example.com/')).toBe('https://example.com');
    });
  });

  describe('whitespace', () => {
    it('should trim leading whitespace', () => {
      expect(normalizeStoreUrl('  https://example.com')).toBe('https://example.com');
    });

    it('should trim trailing whitespace', () => {
      expect(normalizeStoreUrl('https://example.com  ')).toBe('https://example.com');
    });

    it('should trim both leading and trailing whitespace', () => {
      expect(normalizeStoreUrl('  example.com  ')).toBe('https://example.com');
    });
  });

  describe('case normalization', () => {
    it('should lowercase domain', () => {
      expect(normalizeStoreUrl('EXAMPLE.COM')).toBe('https://example.com');
    });

    it('should lowercase mixed case domain', () => {
      expect(normalizeStoreUrl('MyStore.Example.COM')).toBe('https://mystore.example.com');
    });
  });

  describe('subdomains and paths', () => {
    it('should handle subdomain', () => {
      expect(normalizeStoreUrl('shop.example.com')).toBe('https://shop.example.com');
    });

    it('should handle www subdomain', () => {
      expect(normalizeStoreUrl('www.example.com')).toBe('https://www.example.com');
    });

    it('should preserve path', () => {
      expect(normalizeStoreUrl('example.com/shop')).toBe('https://example.com/shop');
    });

    it('should preserve path with trailing slash removed', () => {
      expect(normalizeStoreUrl('example.com/shop/')).toBe('https://example.com/shop');
    });
  });

  describe('edge cases', () => {
    it('should handle complex URLs', () => {
      expect(normalizeStoreUrl('  https://WWW.MyStore.COM/shop/  ')).toBe('https://www.mystore.com/shop');
    });

    it('should handle port numbers', () => {
      expect(normalizeStoreUrl('localhost:8080')).toBe('https://localhost:8080');
    });

    it('should handle IP addresses', () => {
      expect(normalizeStoreUrl('192.168.1.100')).toBe('https://192.168.1.100');
    });
  });
});

describe('mapOrderToImport', () => {
  const mockOrder: WooCommerceOrder = {
    id: 12345,
    number: 'ORD-12345',
    status: 'completed',
    date_created: '2024-03-15T10:30:00',
    total: '129.99',
    total_tax: '10.40',
    shipping_total: '9.99',
    currency: 'USD',
    billing: {
      email: 'customer@example.com',
      state: 'CA',
      city: 'Los Angeles',
      postcode: '90210',
      country: 'US',
    },
    shipping: {
      state: 'CA',
      city: 'Los Angeles',
      postcode: '90210',
      country: 'US',
    },
    line_items: [
      {
        id: 1,
        name: 'Widget Pro',
        quantity: 2,
        subtotal: '89.98',
        total: '89.98',
        total_tax: '7.20',
        sku: 'WIDGET-PRO-001',
      },
      {
        id: 2,
        name: 'Gadget Basic',
        quantity: 1,
        subtotal: '19.62',
        total: '19.62',
        total_tax: '3.20',
        sku: 'GADGET-BASIC-002',
      },
    ],
    tax_lines: [
      {
        id: 1,
        rate_code: 'US-CA-STATE-TAX-1',
        rate_id: 1,
        label: 'CA State Tax',
        compound: false,
        tax_total: '8.00',
        shipping_tax_total: '0.80',
      },
      {
        id: 2,
        rate_code: 'US-CA-COUNTY-TAX-1',
        rate_id: 2,
        label: 'County Tax',
        compound: false,
        tax_total: '1.60',
        shipping_tax_total: '0.00',
      },
    ],
  };

  it('should map basic order fields', () => {
    const result = mapOrderToImport(mockOrder, 'https://example.com');

    expect(result.platform).toBe('woocommerce');
    expect(result.platformOrderId).toBe('12345');
    expect(result.orderNumber).toBe('ORD-12345');
    expect(result.status).toBe('completed');
    expect(result.currency).toBe('USD');
    expect(result.customerEmail).toBe('customer@example.com');
  });

  it('should parse date correctly', () => {
    const result = mapOrderToImport(mockOrder, 'https://example.com');

    expect(result.orderDate).toBeInstanceOf(Date);
    expect(result.orderDate.getFullYear()).toBe(2024);
    expect(result.orderDate.getMonth()).toBe(2); // March = 2 (0-indexed)
    expect(result.orderDate.getDate()).toBe(15);
  });

  it('should calculate amounts correctly', () => {
    const result = mapOrderToImport(mockOrder, 'https://example.com');

    // subtotal = total - total_tax - shipping_total = 129.99 - 10.40 - 9.99 = 109.60
    expect(result.subtotal).toBeCloseTo(109.60, 2);
    expect(result.shippingAmount).toBe(9.99);
    expect(result.taxAmount).toBe(10.40);
    expect(result.totalAmount).toBe(129.99);
  });

  it('should use shipping address when available', () => {
    const result = mapOrderToImport(mockOrder, 'https://example.com');

    expect(result.shippingState).toBe('CA');
    expect(result.shippingCity).toBe('Los Angeles');
    expect(result.shippingZip).toBe('90210');
    expect(result.shippingCountry).toBe('US');
  });

  it('should fall back to billing address when shipping state is empty', () => {
    const orderWithoutShippingState = {
      ...mockOrder,
      shipping: {
        state: '',
        city: '',
        postcode: '',
        country: '',
      },
    };

    const result = mapOrderToImport(orderWithoutShippingState, 'https://example.com');

    expect(result.shippingState).toBe('CA');
    expect(result.shippingCity).toBe('Los Angeles');
    expect(result.shippingZip).toBe('90210');
    expect(result.shippingCountry).toBe('US');
  });

  it('should map line items correctly', () => {
    const result = mapOrderToImport(mockOrder, 'https://example.com');

    expect(result.lineItems).toHaveLength(2);

    expect(result.lineItems[0]).toEqual({
      name: 'Widget Pro',
      quantity: 2,
      subtotal: 89.98,
      total: 89.98,
      tax: 7.20,
      sku: 'WIDGET-PRO-001',
    });

    expect(result.lineItems[1]).toEqual({
      name: 'Gadget Basic',
      quantity: 1,
      subtotal: 19.62,
      total: 19.62,
      tax: 3.20,
      sku: 'GADGET-BASIC-002',
    });
  });

  it('should map tax breakdown correctly', () => {
    const result = mapOrderToImport(mockOrder, 'https://example.com');

    expect(result.taxBreakdown).toHaveLength(2);

    expect(result.taxBreakdown[0]).toEqual({
      label: 'CA State Tax',
      rateCode: 'US-CA-STATE-TAX-1',
      total: 8.00,
      shippingTax: 0.80,
    });

    expect(result.taxBreakdown[1]).toEqual({
      label: 'County Tax',
      rateCode: 'US-CA-COUNTY-TAX-1',
      total: 1.60,
      shippingTax: 0.00,
    });
  });

  it('should include raw order data', () => {
    const result = mapOrderToImport(mockOrder, 'https://example.com');

    expect(result.rawData).toBe(mockOrder);
  });

  it('should handle order with no tax lines', () => {
    const orderNoTax = {
      ...mockOrder,
      total_tax: '0.00',
      tax_lines: [],
    };

    const result = mapOrderToImport(orderNoTax, 'https://example.com');

    expect(result.taxAmount).toBe(0);
    expect(result.taxBreakdown).toHaveLength(0);
  });

  it('should handle order with no line items', () => {
    const orderNoItems = {
      ...mockOrder,
      line_items: [],
    };

    const result = mapOrderToImport(orderNoItems, 'https://example.com');

    expect(result.lineItems).toHaveLength(0);
  });

  it('should default country to US when missing', () => {
    const orderNoCountry = {
      ...mockOrder,
      shipping: {
        state: 'NY',
        city: 'New York',
        postcode: '10001',
        country: '',
      },
    };

    const result = mapOrderToImport(orderNoCountry, 'https://example.com');

    expect(result.shippingCountry).toBe('US');
  });

  it('should handle different currencies', () => {
    const euroOrder = {
      ...mockOrder,
      currency: 'EUR',
    };

    const result = mapOrderToImport(euroOrder, 'https://example.com');

    expect(result.currency).toBe('EUR');
  });

  it('should handle different order statuses', () => {
    const statuses = ['pending', 'processing', 'on-hold', 'completed', 'cancelled', 'refunded', 'failed'];

    for (const status of statuses) {
      const order = { ...mockOrder, status };
      const result = mapOrderToImport(order, 'https://example.com');
      expect(result.status).toBe(status);
    }
  });

  it('should handle high-value orders', () => {
    const highValueOrder = {
      ...mockOrder,
      total: '9999999.99',
      total_tax: '800000.00',
      shipping_total: '500.00',
    };

    const result = mapOrderToImport(highValueOrder, 'https://example.com');

    expect(result.totalAmount).toBe(9999999.99);
    expect(result.taxAmount).toBe(800000.00);
    expect(result.shippingAmount).toBe(500.00);
  });

  it('should handle zero-value order', () => {
    const freeOrder = {
      ...mockOrder,
      total: '0.00',
      total_tax: '0.00',
      shipping_total: '0.00',
      line_items: [{
        id: 1,
        name: 'Free Sample',
        quantity: 1,
        subtotal: '0.00',
        total: '0.00',
        total_tax: '0.00',
        sku: 'FREE-001',
      }],
    };

    const result = mapOrderToImport(freeOrder, 'https://example.com');

    expect(result.totalAmount).toBe(0);
    expect(result.subtotal).toBe(0);
    expect(result.taxAmount).toBe(0);
  });

  it('should convert platformOrderId to string', () => {
    const result = mapOrderToImport(mockOrder, 'https://example.com');
    
    expect(typeof result.platformOrderId).toBe('string');
    expect(result.platformOrderId).toBe('12345');
  });

  it('should preserve billing state separately', () => {
    const orderDifferentBilling = {
      ...mockOrder,
      billing: {
        ...mockOrder.billing,
        state: 'NY',
        city: 'New York',
      },
      shipping: {
        ...mockOrder.shipping,
        state: 'CA',
        city: 'San Francisco',
      },
    };

    const result = mapOrderToImport(orderDifferentBilling, 'https://example.com');

    expect(result.billingState).toBe('NY');
    expect(result.shippingState).toBe('CA');
  });
});

describe('WooCommerceOrder type validation', () => {
  it('should accept valid order structure', () => {
    const order: WooCommerceOrder = {
      id: 1,
      number: '1',
      status: 'completed',
      date_created: '2024-01-01T00:00:00',
      total: '0.00',
      total_tax: '0.00',
      shipping_total: '0.00',
      currency: 'USD',
      billing: {
        email: '',
        state: '',
        city: '',
        postcode: '',
        country: '',
      },
      shipping: {
        state: '',
        city: '',
        postcode: '',
        country: '',
      },
      line_items: [],
      tax_lines: [],
    };

    expect(order).toBeDefined();
    expect(order.id).toBe(1);
  });
});
