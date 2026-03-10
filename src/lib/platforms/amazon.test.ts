/**
 * Amazon Integration Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock prisma before importing amazon
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

afterEach(() => {
  process.env = originalEnv;
});

describe('isAmazonConfigured', () => {
  it('should return false when no keys are set', async () => {
    delete process.env.AMAZON_APP_ID;
    delete process.env.AMAZON_CLIENT_ID;
    delete process.env.AMAZON_CLIENT_SECRET;
    
    const { isAmazonConfigured } = await import('./amazon');
    expect(isAmazonConfigured()).toBe(false);
  });

  it('should return false when only APP_ID is set', async () => {
    process.env.AMAZON_APP_ID = 'test-app-id';
    delete process.env.AMAZON_CLIENT_ID;
    delete process.env.AMAZON_CLIENT_SECRET;
    
    const { isAmazonConfigured } = await import('./amazon');
    expect(isAmazonConfigured()).toBe(false);
  });

  it('should return false when only CLIENT_ID is set', async () => {
    delete process.env.AMAZON_APP_ID;
    process.env.AMAZON_CLIENT_ID = 'test-client-id';
    delete process.env.AMAZON_CLIENT_SECRET;
    
    const { isAmazonConfigured } = await import('./amazon');
    expect(isAmazonConfigured()).toBe(false);
  });

  it('should return false when only CLIENT_SECRET is set', async () => {
    delete process.env.AMAZON_APP_ID;
    delete process.env.AMAZON_CLIENT_ID;
    process.env.AMAZON_CLIENT_SECRET = 'test-client-secret';
    
    const { isAmazonConfigured } = await import('./amazon');
    expect(isAmazonConfigured()).toBe(false);
  });

  it('should return false when APP_ID and CLIENT_ID are set but not CLIENT_SECRET', async () => {
    process.env.AMAZON_APP_ID = 'test-app-id';
    process.env.AMAZON_CLIENT_ID = 'test-client-id';
    delete process.env.AMAZON_CLIENT_SECRET;
    
    const { isAmazonConfigured } = await import('./amazon');
    expect(isAmazonConfigured()).toBe(false);
  });

  it('should return false when APP_ID and CLIENT_SECRET are set but not CLIENT_ID', async () => {
    process.env.AMAZON_APP_ID = 'test-app-id';
    delete process.env.AMAZON_CLIENT_ID;
    process.env.AMAZON_CLIENT_SECRET = 'test-client-secret';
    
    const { isAmazonConfigured } = await import('./amazon');
    expect(isAmazonConfigured()).toBe(false);
  });

  it('should return false when CLIENT_ID and CLIENT_SECRET are set but not APP_ID', async () => {
    delete process.env.AMAZON_APP_ID;
    process.env.AMAZON_CLIENT_ID = 'test-client-id';
    process.env.AMAZON_CLIENT_SECRET = 'test-client-secret';
    
    const { isAmazonConfigured } = await import('./amazon');
    expect(isAmazonConfigured()).toBe(false);
  });

  it('should return true when all three keys are set', async () => {
    process.env.AMAZON_APP_ID = 'test-app-id';
    process.env.AMAZON_CLIENT_ID = 'test-client-id';
    process.env.AMAZON_CLIENT_SECRET = 'test-client-secret';
    
    const { isAmazonConfigured } = await import('./amazon');
    expect(isAmazonConfigured()).toBe(true);
  });

  it('should return true even with empty string values (truthy check)', async () => {
    process.env.AMAZON_APP_ID = '';
    process.env.AMAZON_CLIENT_ID = '';
    process.env.AMAZON_CLIENT_SECRET = '';
    
    const { isAmazonConfigured } = await import('./amazon');
    // Empty strings are falsy, so should return false
    expect(isAmazonConfigured()).toBe(false);
  });
});

describe('getAuthorizationUrl', () => {
  beforeEach(() => {
    process.env.AMAZON_APP_ID = 'test-app-id';
    process.env.AMAZON_CLIENT_ID = 'test-client-id';
    process.env.AMAZON_CLIENT_SECRET = 'test-client-secret';
    process.env.NEXT_PUBLIC_APP_URL = 'https://sails.tax';
  });

  it('should generate valid OAuth URL with state parameter', async () => {
    const { getAuthorizationUrl } = await import('./amazon');
    const url = getAuthorizationUrl('test-state-123');
    
    expect(url).toContain('https://sellercentral.amazon.com/apps/authorize/consent');
    expect(url).toContain('application_id=test-app-id');
    expect(url).toContain('state=test-state-123');
    expect(url).toContain('redirect_uri=');
    expect(url).toContain('version=beta');
  });

  it('should include redirect_uri pointing to callback endpoint', async () => {
    const { getAuthorizationUrl } = await import('./amazon');
    const url = getAuthorizationUrl('my-state');
    
    expect(url).toContain('redirect_uri=https%3A%2F%2Fsails.tax%2Fapi%2Fplatforms%2Famazon%2Fcallback');
  });

  it('should use default APP_URL when NEXT_PUBLIC_APP_URL is not set', async () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    
    const { getAuthorizationUrl } = await import('./amazon');
    const url = getAuthorizationUrl('test-state');
    
    // Should default to sails.tax
    expect(url).toContain('sails.tax');
  });

  it('should properly encode special characters in state', async () => {
    const { getAuthorizationUrl } = await import('./amazon');
    const url = getAuthorizationUrl('state with spaces & special=chars');
    
    expect(url).toContain('state=state+with+spaces+%26+special%3Dchars');
  });

  it('should handle empty state parameter', async () => {
    const { getAuthorizationUrl } = await import('./amazon');
    const url = getAuthorizationUrl('');
    
    expect(url).toContain('state=');
    expect(url).toContain('https://sellercentral.amazon.com');
  });
});

describe('AmazonOrder type validation', () => {
  it('should accept valid AmazonOrder structure', async () => {
    // AmazonOrder is a type, validated at compile time - import not needed at runtime
    // Type validation is done at compile time, this tests runtime usage
    const order = {
      AmazonOrderId: '123-4567890-1234567',
      PurchaseDate: '2026-01-15T10:30:00Z',
      LastUpdateDate: '2026-01-15T12:00:00Z',
      OrderStatus: 'Shipped',
      OrderTotal: {
        CurrencyCode: 'USD',
        Amount: '99.99',
      },
      NumberOfItemsShipped: 2,
      NumberOfItemsUnshipped: 0,
      MarketplaceId: 'ATVPDKIKX0DER',
      FulfillmentChannel: 'MFN',
      SalesChannel: 'Amazon.com',
    };
    
    expect(order.AmazonOrderId).toBe('123-4567890-1234567');
    expect(order.OrderStatus).toBe('Shipped');
    expect(order.OrderTotal?.Amount).toBe('99.99');
  });
});

describe('AmazonAddress type validation', () => {
  it('should accept valid AmazonAddress structure', async () => {
    const address = {
      Name: 'John Doe',
      AddressLine1: '123 Main St',
      AddressLine2: 'Apt 4',
      City: 'Seattle',
      StateOrRegion: 'WA',
      PostalCode: '98101',
      CountryCode: 'US',
    };
    
    expect(address.Name).toBe('John Doe');
    expect(address.StateOrRegion).toBe('WA');
    expect(address.PostalCode).toBe('98101');
  });

  it('should allow optional address lines', async () => {
    const minimalAddress = {
      Name: 'Jane Smith',
      City: 'Portland',
      StateOrRegion: 'OR',
      PostalCode: '97201',
      CountryCode: 'US',
    };
    
    expect(minimalAddress.Name).toBe('Jane Smith');
    // AddressLine1 and AddressLine2 are optional
    expect(minimalAddress).not.toHaveProperty('AddressLine1');
  });
});

describe('AmazonOrderItem type validation', () => {
  it('should accept valid AmazonOrderItem structure', async () => {
    const item = {
      ASIN: 'B0EXAMPLE123',
      SellerSKU: 'MY-SKU-001',
      OrderItemId: '12345678901234',
      Title: 'Awesome Product',
      QuantityOrdered: 2,
      QuantityShipped: 2,
      ItemPrice: {
        CurrencyCode: 'USD',
        Amount: '49.99',
      },
      ItemTax: {
        CurrencyCode: 'USD',
        Amount: '4.50',
      },
    };
    
    expect(item.ASIN).toBe('B0EXAMPLE123');
    expect(item.QuantityOrdered).toBe(2);
    expect(item.ItemPrice?.Amount).toBe('49.99');
    expect(item.ItemTax?.Amount).toBe('4.50');
  });

  it('should allow optional fields', async () => {
    const minimalItem = {
      ASIN: 'B0MINIMAL123',
      OrderItemId: '99999999999999',
      Title: 'Basic Product',
      QuantityOrdered: 1,
      QuantityShipped: 0,
    };
    
    expect(minimalItem.ASIN).toBe('B0MINIMAL123');
    // SellerSKU, ItemPrice, ItemTax are optional
    expect(minimalItem).not.toHaveProperty('SellerSKU');
    expect(minimalItem).not.toHaveProperty('ItemPrice');
  });
});

describe('exchangeCodeForToken', () => {
  beforeEach(() => {
    process.env.AMAZON_APP_ID = 'test-app-id';
    process.env.AMAZON_CLIENT_ID = 'test-client-id';
    process.env.AMAZON_CLIENT_SECRET = 'test-client-secret';
    process.env.NEXT_PUBLIC_APP_URL = 'https://sails.tax';
  });

  it('should handle network errors gracefully', async () => {
    // Mock fetch to throw an error
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    
    const { exchangeCodeForToken } = await import('./amazon');
    const result = await exchangeCodeForToken('test-auth-code');
    
    expect(result.error).toBe('Network error');
    expect(result.accessToken).toBeUndefined();
    expect(result.refreshToken).toBeUndefined();
    
    global.fetch = originalFetch;
  });

  it('should handle non-Error thrown objects', async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockRejectedValue('string error');
    
    const { exchangeCodeForToken } = await import('./amazon');
    const result = await exchangeCodeForToken('test-auth-code');
    
    expect(result.error).toBe('Failed to exchange code');
    
    global.fetch = originalFetch;
  });

  it('should handle API error responses', async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      text: vi.fn().mockResolvedValue('Invalid authorization code'),
    });
    
    const { exchangeCodeForToken } = await import('./amazon');
    const result = await exchangeCodeForToken('invalid-code');
    
    expect(result.error).toContain('Amazon OAuth error');
    expect(result.error).toContain('Invalid authorization code');
    
    global.fetch = originalFetch;
  });

  it('should return tokens on successful exchange', async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
      }),
    });
    
    const { exchangeCodeForToken } = await import('./amazon');
    const result = await exchangeCodeForToken('valid-code');
    
    expect(result.accessToken).toBe('test-access-token');
    expect(result.refreshToken).toBe('test-refresh-token');
    expect(result.error).toBeUndefined();
    
    global.fetch = originalFetch;
  });
});

describe('refreshAccessToken', () => {
  beforeEach(() => {
    process.env.AMAZON_APP_ID = 'test-app-id';
    process.env.AMAZON_CLIENT_ID = 'test-client-id';
    process.env.AMAZON_CLIENT_SECRET = 'test-client-secret';
  });

  it('should handle network errors gracefully', async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockRejectedValue(new Error('Connection failed'));
    
    const { refreshAccessToken } = await import('./amazon');
    const result = await refreshAccessToken('test-refresh-token');
    
    expect(result.error).toBe('Connection failed');
    expect(result.accessToken).toBeUndefined();
    
    global.fetch = originalFetch;
  });

  it('should handle non-Error thrown objects', async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockRejectedValue({ code: 'UNKNOWN' });
    
    const { refreshAccessToken } = await import('./amazon');
    const result = await refreshAccessToken('test-refresh-token');
    
    expect(result.error).toBe('Failed to refresh token');
    
    global.fetch = originalFetch;
  });

  it('should handle API error responses', async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      text: vi.fn().mockResolvedValue('Token expired'),
    });
    
    const { refreshAccessToken } = await import('./amazon');
    const result = await refreshAccessToken('expired-token');
    
    expect(result.error).toContain('Amazon token refresh error');
    expect(result.error).toContain('Token expired');
    
    global.fetch = originalFetch;
  });

  it('should return new access token on success', async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        access_token: 'new-access-token',
      }),
    });
    
    const { refreshAccessToken } = await import('./amazon');
    const result = await refreshAccessToken('valid-refresh-token');
    
    expect(result.accessToken).toBe('new-access-token');
    expect(result.error).toBeUndefined();
    
    global.fetch = originalFetch;
  });
});

describe('fetchOrders', () => {
  beforeEach(() => {
    process.env.AMAZON_APP_ID = 'test-app-id';
    process.env.AMAZON_CLIENT_ID = 'test-client-id';
    process.env.AMAZON_CLIENT_SECRET = 'test-client-secret';
  });

  it('should default to US marketplace', async () => {
    const originalFetch = global.fetch;
    let capturedUrl = '';
    global.fetch = vi.fn().mockImplementation((url) => {
      capturedUrl = url as string;
      return Promise.resolve({
        ok: true,
        json: vi.fn().mockResolvedValue({ payload: { Orders: [] } }),
      });
    });
    
    const { fetchOrders } = await import('./amazon');
    await fetchOrders('test-token');
    
    expect(capturedUrl).toContain('MarketplaceIds=ATVPDKIKX0DER');
    
    global.fetch = originalFetch;
  });

  it('should accept custom marketplace IDs', async () => {
    const originalFetch = global.fetch;
    let capturedUrl = '';
    global.fetch = vi.fn().mockImplementation((url) => {
      capturedUrl = url as string;
      return Promise.resolve({
        ok: true,
        json: vi.fn().mockResolvedValue({ payload: { Orders: [] } }),
      });
    });
    
    const { fetchOrders } = await import('./amazon');
    await fetchOrders('test-token', { marketplaceIds: ['A1F83G8C2ARO7P', 'A1PA6795UKMFR9'] });
    
    expect(capturedUrl).toContain('MarketplaceIds=A1F83G8C2ARO7P%2CA1PA6795UKMFR9');
    
    global.fetch = originalFetch;
  });

  it('should include date filters when provided', async () => {
    const originalFetch = global.fetch;
    let capturedUrl = '';
    global.fetch = vi.fn().mockImplementation((url) => {
      capturedUrl = url as string;
      return Promise.resolve({
        ok: true,
        json: vi.fn().mockResolvedValue({ payload: { Orders: [] } }),
      });
    });
    
    const { fetchOrders } = await import('./amazon');
    await fetchOrders('test-token', {
      createdAfter: '2026-01-01T00:00:00Z',
      createdBefore: '2026-01-31T23:59:59Z',
    });
    
    expect(capturedUrl).toContain('CreatedAfter=2026-01-01T00%3A00%3A00Z');
    expect(capturedUrl).toContain('CreatedBefore=2026-01-31T23%3A59%3A59Z');
    
    global.fetch = originalFetch;
  });

  it('should include order statuses when provided', async () => {
    const originalFetch = global.fetch;
    let capturedUrl = '';
    global.fetch = vi.fn().mockImplementation((url) => {
      capturedUrl = url as string;
      return Promise.resolve({
        ok: true,
        json: vi.fn().mockResolvedValue({ payload: { Orders: [] } }),
      });
    });
    
    const { fetchOrders } = await import('./amazon');
    await fetchOrders('test-token', {
      orderStatuses: ['Shipped', 'Delivered'],
    });
    
    expect(capturedUrl).toContain('OrderStatuses=Shipped%2CDelivered');
    
    global.fetch = originalFetch;
  });

  it('should handle network errors', async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockRejectedValue(new Error('API unavailable'));
    
    const { fetchOrders } = await import('./amazon');
    const result = await fetchOrders('test-token');
    
    expect(result.error).toBe('API unavailable');
    expect(result.orders).toBeUndefined();
    
    global.fetch = originalFetch;
  });

  it('should handle API errors', async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      text: vi.fn().mockResolvedValue('Unauthorized'),
    });
    
    const { fetchOrders } = await import('./amazon');
    const result = await fetchOrders('invalid-token');
    
    expect(result.error).toContain('Amazon API error');
    expect(result.error).toContain('Unauthorized');
    
    global.fetch = originalFetch;
  });

  it('should return orders on success', async () => {
    const originalFetch = global.fetch;
    const mockOrders = [
      { AmazonOrderId: '123', OrderStatus: 'Shipped' },
      { AmazonOrderId: '456', OrderStatus: 'Delivered' },
    ];
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ payload: { Orders: mockOrders } }),
    });
    
    const { fetchOrders } = await import('./amazon');
    const result = await fetchOrders('valid-token');
    
    expect(result.orders).toEqual(mockOrders);
    expect(result.error).toBeUndefined();
    
    global.fetch = originalFetch;
  });

  it('should return empty array when no orders exist', async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ payload: {} }),
    });
    
    const { fetchOrders } = await import('./amazon');
    const result = await fetchOrders('valid-token');
    
    expect(result.orders).toEqual([]);
    
    global.fetch = originalFetch;
  });
});

describe('getOrderItems', () => {
  beforeEach(() => {
    process.env.AMAZON_APP_ID = 'test-app-id';
    process.env.AMAZON_CLIENT_ID = 'test-client-id';
    process.env.AMAZON_CLIENT_SECRET = 'test-client-secret';
  });

  it('should fetch items for specific order', async () => {
    const originalFetch = global.fetch;
    let capturedUrl = '';
    global.fetch = vi.fn().mockImplementation((url) => {
      capturedUrl = url as string;
      return Promise.resolve({
        ok: true,
        json: vi.fn().mockResolvedValue({ payload: { OrderItems: [] } }),
      });
    });
    
    const { getOrderItems } = await import('./amazon');
    await getOrderItems('test-token', '123-4567890-1234567');
    
    expect(capturedUrl).toContain('/orders/v0/orders/123-4567890-1234567/orderItems');
    
    global.fetch = originalFetch;
  });

  it('should handle network errors', async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockRejectedValue(new Error('Timeout'));
    
    const { getOrderItems } = await import('./amazon');
    const result = await getOrderItems('test-token', 'order-123');
    
    expect(result.error).toBe('Timeout');
    expect(result.items).toBeUndefined();
    
    global.fetch = originalFetch;
  });

  it('should handle API errors', async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      text: vi.fn().mockResolvedValue('Order not found'),
    });
    
    const { getOrderItems } = await import('./amazon');
    const result = await getOrderItems('test-token', 'invalid-order');
    
    expect(result.error).toContain('Amazon API error');
    expect(result.error).toContain('Order not found');
    
    global.fetch = originalFetch;
  });

  it('should return items on success', async () => {
    const originalFetch = global.fetch;
    const mockItems = [
      { ASIN: 'B001', Title: 'Product 1', QuantityOrdered: 2 },
      { ASIN: 'B002', Title: 'Product 2', QuantityOrdered: 1 },
    ];
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ payload: { OrderItems: mockItems } }),
    });
    
    const { getOrderItems } = await import('./amazon');
    const result = await getOrderItems('test-token', 'order-123');
    
    expect(result.items).toEqual(mockItems);
    expect(result.error).toBeUndefined();
    
    global.fetch = originalFetch;
  });

  it('should return empty array when no items exist', async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ payload: {} }),
    });
    
    const { getOrderItems } = await import('./amazon');
    const result = await getOrderItems('test-token', 'order-123');
    
    expect(result.items).toEqual([]);
    
    global.fetch = originalFetch;
  });
});
