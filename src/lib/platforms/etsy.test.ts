/**
 * Etsy Integration Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock prisma before importing etsy
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

// Mock crypto for PKCE
const mockGetRandomValues = vi.fn((array: Uint8Array) => {
  for (let i = 0; i < array.length; i++) {
    array[i] = Math.floor(Math.random() * 256);
  }
  return array;
});

Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: mockGetRandomValues,
  },
});

// Mock environment variables
const originalEnv = process.env;

beforeEach(() => {
  vi.resetModules();
  process.env = { ...originalEnv };
});

afterEach(() => {
  process.env = originalEnv;
});

describe('isEtsyConfigured', () => {
  it('should return false when no keys are set', async () => {
    delete process.env.ETSY_API_KEY;
    delete process.env.ETSY_API_SECRET;
    
    const { isEtsyConfigured } = await import('./etsy');
    expect(isEtsyConfigured()).toBe(false);
  });

  it('should return false when only API_KEY is set', async () => {
    process.env.ETSY_API_KEY = 'test-api-key';
    delete process.env.ETSY_API_SECRET;
    
    const { isEtsyConfigured } = await import('./etsy');
    expect(isEtsyConfigured()).toBe(false);
  });

  it('should return false when only API_SECRET is set', async () => {
    delete process.env.ETSY_API_KEY;
    process.env.ETSY_API_SECRET = 'test-api-secret';
    
    const { isEtsyConfigured } = await import('./etsy');
    expect(isEtsyConfigured()).toBe(false);
  });

  it('should return true when both keys are set', async () => {
    process.env.ETSY_API_KEY = 'test-api-key';
    process.env.ETSY_API_SECRET = 'test-api-secret';
    
    const { isEtsyConfigured } = await import('./etsy');
    expect(isEtsyConfigured()).toBe(true);
  });

  it('should return false with empty string values', async () => {
    process.env.ETSY_API_KEY = '';
    process.env.ETSY_API_SECRET = '';
    
    const { isEtsyConfigured } = await import('./etsy');
    expect(isEtsyConfigured()).toBe(false);
  });
});

describe('getAuthorizationUrl', () => {
  beforeEach(() => {
    process.env.ETSY_API_KEY = 'test-api-key';
    process.env.ETSY_API_SECRET = 'test-api-secret';
    process.env.NEXT_PUBLIC_APP_URL = 'https://sails.tax';
  });

  it('should generate valid OAuth URL with PKCE', async () => {
    const { getAuthorizationUrl } = await import('./etsy');
    const url = getAuthorizationUrl('test-state', 'test-challenge');
    
    expect(url).toContain('https://www.etsy.com/oauth/connect');
    expect(url).toContain('response_type=code');
    expect(url).toContain('client_id=test-api-key');
    expect(url).toContain('state=test-state');
    expect(url).toContain('code_challenge=test-challenge');
    expect(url).toContain('code_challenge_method=S256');
  });

  it('should include redirect_uri pointing to callback endpoint', async () => {
    const { getAuthorizationUrl } = await import('./etsy');
    const url = getAuthorizationUrl('state', 'challenge');
    
    expect(url).toContain('redirect_uri=https%3A%2F%2Fsails.tax%2Fapi%2Fplatforms%2Fetsy%2Fcallback');
  });

  it('should include required scopes', async () => {
    const { getAuthorizationUrl } = await import('./etsy');
    const url = getAuthorizationUrl('state', 'challenge');
    
    expect(url).toContain('scope=transactions_r');
    expect(url).toContain('shops_r');
    expect(url).toContain('listings_r');
  });

  it('should use default APP_URL when NEXT_PUBLIC_APP_URL is not set', async () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    
    const { getAuthorizationUrl } = await import('./etsy');
    const url = getAuthorizationUrl('test-state', 'challenge');
    
    expect(url).toContain('sails.tax');
  });

  it('should properly encode special characters in state', async () => {
    const { getAuthorizationUrl } = await import('./etsy');
    const url = getAuthorizationUrl('state with spaces & chars=val', 'challenge');
    
    expect(url).toContain('state=state+with+spaces+%26+chars%3Dval');
  });
});

describe('generatePKCE', () => {
  it('should generate verifier and challenge', async () => {
    const { generatePKCE } = await import('./etsy');
    const pkce = generatePKCE();
    
    expect(pkce).toHaveProperty('verifier');
    expect(pkce).toHaveProperty('challenge');
    expect(typeof pkce.verifier).toBe('string');
    expect(typeof pkce.challenge).toBe('string');
  });

  it('should generate verifier of appropriate length', async () => {
    const { generatePKCE } = await import('./etsy');
    const pkce = generatePKCE();
    
    // Base64URL encoding of 32 bytes should be ~43 chars
    expect(pkce.verifier.length).toBeGreaterThanOrEqual(40);
    expect(pkce.verifier.length).toBeLessThanOrEqual(50);
  });

  it('should generate URL-safe characters only', async () => {
    const { generatePKCE } = await import('./etsy');
    const pkce = generatePKCE();
    
    // Should only contain URL-safe base64 characters
    expect(pkce.verifier).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('should generate different values on each call', async () => {
    const { generatePKCE } = await import('./etsy');
    const pkce1 = generatePKCE();
    const pkce2 = generatePKCE();
    
    expect(pkce1.verifier).not.toBe(pkce2.verifier);
  });
});

describe('exchangeCodeForToken', () => {
  beforeEach(() => {
    process.env.ETSY_API_KEY = 'test-api-key';
    process.env.ETSY_API_SECRET = 'test-api-secret';
    process.env.NEXT_PUBLIC_APP_URL = 'https://sails.tax';
  });

  it('should handle network errors gracefully', async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    
    const { exchangeCodeForToken } = await import('./etsy');
    const result = await exchangeCodeForToken('test-code', 'test-verifier');
    
    expect(result.error).toBe('Network error');
    expect(result.accessToken).toBeUndefined();
    expect(result.refreshToken).toBeUndefined();
    expect(result.userId).toBeUndefined();
    
    global.fetch = originalFetch;
  });

  it('should handle non-Error thrown objects', async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockRejectedValue('string error');
    
    const { exchangeCodeForToken } = await import('./etsy');
    const result = await exchangeCodeForToken('test-code', 'verifier');
    
    expect(result.error).toBe('Failed to exchange code');
    
    global.fetch = originalFetch;
  });

  it('should handle API error responses', async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      text: vi.fn().mockResolvedValue('Invalid authorization code'),
    });
    
    const { exchangeCodeForToken } = await import('./etsy');
    const result = await exchangeCodeForToken('invalid-code', 'verifier');
    
    expect(result.error).toContain('Etsy OAuth error');
    expect(result.error).toContain('Invalid authorization code');
    
    global.fetch = originalFetch;
  });

  it('should return tokens and userId on success', async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        user_id: 12345,
      }),
    });
    
    const { exchangeCodeForToken } = await import('./etsy');
    const result = await exchangeCodeForToken('valid-code', 'verifier');
    
    expect(result.accessToken).toBe('test-access-token');
    expect(result.refreshToken).toBe('test-refresh-token');
    expect(result.userId).toBe(12345);
    expect(result.error).toBeUndefined();
    
    global.fetch = originalFetch;
  });

  it('should call correct Etsy OAuth endpoint', async () => {
    const originalFetch = global.fetch;
    let capturedUrl = '';
    global.fetch = vi.fn().mockImplementation((url) => {
      capturedUrl = url as string;
      return Promise.resolve({
        ok: true,
        json: vi.fn().mockResolvedValue({}),
      });
    });
    
    const { exchangeCodeForToken } = await import('./etsy');
    await exchangeCodeForToken('code', 'verifier');
    
    expect(capturedUrl).toContain('https://openapi.etsy.com/v3/public/oauth/token');
    
    global.fetch = originalFetch;
  });
});

describe('refreshAccessToken', () => {
  beforeEach(() => {
    process.env.ETSY_API_KEY = 'test-api-key';
    process.env.ETSY_API_SECRET = 'test-api-secret';
  });

  it('should handle network errors gracefully', async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockRejectedValue(new Error('Connection failed'));
    
    const { refreshAccessToken } = await import('./etsy');
    const result = await refreshAccessToken('test-refresh-token');
    
    expect(result.error).toBe('Connection failed');
    expect(result.accessToken).toBeUndefined();
    
    global.fetch = originalFetch;
  });

  it('should handle non-Error thrown objects', async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockRejectedValue({ code: 'UNKNOWN' });
    
    const { refreshAccessToken } = await import('./etsy');
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
    
    const { refreshAccessToken } = await import('./etsy');
    const result = await refreshAccessToken('expired-token');
    
    expect(result.error).toContain('Etsy token refresh error');
    expect(result.error).toContain('Token expired');
    
    global.fetch = originalFetch;
  });

  it('should return new tokens on success', async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
      }),
    });
    
    const { refreshAccessToken } = await import('./etsy');
    const result = await refreshAccessToken('valid-refresh-token');
    
    expect(result.accessToken).toBe('new-access-token');
    expect(result.newRefreshToken).toBe('new-refresh-token');
    expect(result.error).toBeUndefined();
    
    global.fetch = originalFetch;
  });
});

describe('fetchReceipts', () => {
  beforeEach(() => {
    process.env.ETSY_API_KEY = 'test-api-key';
    process.env.ETSY_API_SECRET = 'test-api-secret';
  });

  it('should fetch receipts for a shop', async () => {
    const originalFetch = global.fetch;
    let capturedUrl = '';
    global.fetch = vi.fn().mockImplementation((url) => {
      capturedUrl = url as string;
      return Promise.resolve({
        ok: true,
        json: vi.fn().mockResolvedValue({ results: [] }),
      });
    });
    
    const { fetchReceipts } = await import('./etsy');
    await fetchReceipts('test-token', 12345);
    
    expect(capturedUrl).toContain('/application/shops/12345/receipts');
    
    global.fetch = originalFetch;
  });

  it('should include date filters when provided', async () => {
    const originalFetch = global.fetch;
    let capturedUrl = '';
    global.fetch = vi.fn().mockImplementation((url) => {
      capturedUrl = url as string;
      return Promise.resolve({
        ok: true,
        json: vi.fn().mockResolvedValue({ results: [] }),
      });
    });
    
    const { fetchReceipts } = await import('./etsy');
    await fetchReceipts('test-token', 12345, {
      minCreated: 1704067200,
      maxCreated: 1706745600,
    });
    
    expect(capturedUrl).toContain('min_created=1704067200');
    expect(capturedUrl).toContain('max_created=1706745600');
    
    global.fetch = originalFetch;
  });

  it('should include pagination params', async () => {
    const originalFetch = global.fetch;
    let capturedUrl = '';
    global.fetch = vi.fn().mockImplementation((url) => {
      capturedUrl = url as string;
      return Promise.resolve({
        ok: true,
        json: vi.fn().mockResolvedValue({ results: [] }),
      });
    });
    
    const { fetchReceipts } = await import('./etsy');
    await fetchReceipts('test-token', 12345, {
      limit: 50,
      offset: 100,
    });
    
    expect(capturedUrl).toContain('limit=50');
    expect(capturedUrl).toContain('offset=100');
    
    global.fetch = originalFetch;
  });

  it('should default limit to 25', async () => {
    const originalFetch = global.fetch;
    let capturedUrl = '';
    global.fetch = vi.fn().mockImplementation((url) => {
      capturedUrl = url as string;
      return Promise.resolve({
        ok: true,
        json: vi.fn().mockResolvedValue({ results: [] }),
      });
    });
    
    const { fetchReceipts } = await import('./etsy');
    await fetchReceipts('test-token', 12345);
    
    expect(capturedUrl).toContain('limit=25');
    
    global.fetch = originalFetch;
  });

  it('should handle network errors', async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockRejectedValue(new Error('API unavailable'));
    
    const { fetchReceipts } = await import('./etsy');
    const result = await fetchReceipts('test-token', 12345);
    
    expect(result.error).toBe('API unavailable');
    expect(result.receipts).toBeUndefined();
    
    global.fetch = originalFetch;
  });

  it('should handle API errors', async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      text: vi.fn().mockResolvedValue('Unauthorized'),
    });
    
    const { fetchReceipts } = await import('./etsy');
    const result = await fetchReceipts('invalid-token', 12345);
    
    expect(result.error).toContain('Etsy API error');
    expect(result.error).toContain('Unauthorized');
    
    global.fetch = originalFetch;
  });

  it('should return receipts on success', async () => {
    const originalFetch = global.fetch;
    const mockReceipts = [
      { receipt_id: 123, name: 'Order 1' },
      { receipt_id: 456, name: 'Order 2' },
    ];
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ results: mockReceipts }),
    });
    
    const { fetchReceipts } = await import('./etsy');
    const result = await fetchReceipts('valid-token', 12345);
    
    expect(result.receipts).toEqual(mockReceipts);
    expect(result.error).toBeUndefined();
    
    global.fetch = originalFetch;
  });

  it('should return empty array when no receipts exist', async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({}),
    });
    
    const { fetchReceipts } = await import('./etsy');
    const result = await fetchReceipts('valid-token', 12345);
    
    expect(result.receipts).toEqual([]);
    
    global.fetch = originalFetch;
  });

  it('should include proper authorization headers', async () => {
    const originalFetch = global.fetch;
    let capturedOptions: RequestInit | undefined;
    global.fetch = vi.fn().mockImplementation((_url, options) => {
      capturedOptions = options;
      return Promise.resolve({
        ok: true,
        json: vi.fn().mockResolvedValue({ results: [] }),
      });
    });
    
    const { fetchReceipts } = await import('./etsy');
    await fetchReceipts('my-access-token', 12345);
    
    expect(capturedOptions?.headers).toHaveProperty('Authorization', 'Bearer my-access-token');
    expect(capturedOptions?.headers).toHaveProperty('x-api-key', 'test-api-key');
    
    global.fetch = originalFetch;
  });
});

describe('getReceiptTransactions', () => {
  beforeEach(() => {
    process.env.ETSY_API_KEY = 'test-api-key';
    process.env.ETSY_API_SECRET = 'test-api-secret';
  });

  it('should fetch transactions for a receipt', async () => {
    const originalFetch = global.fetch;
    let capturedUrl = '';
    global.fetch = vi.fn().mockImplementation((url) => {
      capturedUrl = url as string;
      return Promise.resolve({
        ok: true,
        json: vi.fn().mockResolvedValue({ results: [] }),
      });
    });
    
    const { getReceiptTransactions } = await import('./etsy');
    await getReceiptTransactions('test-token', 12345, 99999);
    
    expect(capturedUrl).toContain('/application/shops/12345/receipts/99999/transactions');
    
    global.fetch = originalFetch;
  });

  it('should handle network errors', async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockRejectedValue(new Error('Timeout'));
    
    const { getReceiptTransactions } = await import('./etsy');
    const result = await getReceiptTransactions('test-token', 12345, 99999);
    
    expect(result.error).toBe('Timeout');
    expect(result.transactions).toBeUndefined();
    
    global.fetch = originalFetch;
  });

  it('should handle API errors', async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      text: vi.fn().mockResolvedValue('Receipt not found'),
    });
    
    const { getReceiptTransactions } = await import('./etsy');
    const result = await getReceiptTransactions('test-token', 12345, 99999);
    
    expect(result.error).toContain('Etsy API error');
    expect(result.error).toContain('Receipt not found');
    
    global.fetch = originalFetch;
  });

  it('should return transactions on success', async () => {
    const originalFetch = global.fetch;
    const mockTransactions = [
      { transaction_id: 111, title: 'Product 1', quantity: 2 },
      { transaction_id: 222, title: 'Product 2', quantity: 1 },
    ];
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ results: mockTransactions }),
    });
    
    const { getReceiptTransactions } = await import('./etsy');
    const result = await getReceiptTransactions('test-token', 12345, 99999);
    
    expect(result.transactions).toEqual(mockTransactions);
    expect(result.error).toBeUndefined();
    
    global.fetch = originalFetch;
  });

  it('should return empty array when no transactions exist', async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({}),
    });
    
    const { getReceiptTransactions } = await import('./etsy');
    const result = await getReceiptTransactions('test-token', 12345, 99999);
    
    expect(result.transactions).toEqual([]);
    
    global.fetch = originalFetch;
  });
});

describe('EtsyShop type validation', () => {
  it('should accept valid EtsyShop structure', () => {
    const shop = {
      shop_id: 12345,
      shop_name: 'My Etsy Shop',
      user_id: 67890,
      currency_code: 'USD',
      url: 'https://www.etsy.com/shop/myshop',
      is_vacation: false,
      transaction_sold_count: 500,
    };
    
    expect(shop.shop_id).toBe(12345);
    expect(shop.shop_name).toBe('My Etsy Shop');
    expect(shop.currency_code).toBe('USD');
    expect(shop.is_vacation).toBe(false);
  });
});

describe('EtsyReceipt type validation', () => {
  it('should accept valid EtsyReceipt structure', () => {
    const receipt = {
      receipt_id: 123456789,
      receipt_type: 0,
      seller_user_id: 11111,
      seller_email: 'seller@example.com',
      buyer_user_id: 22222,
      buyer_email: 'buyer@example.com',
      name: 'John Doe',
      status: 'paid',
      payment_method: 'cc',
      subtotal: { amount: 2500, divisor: 100, currency_code: 'USD' },
      grandtotal: { amount: 3000, divisor: 100, currency_code: 'USD' },
      total_tax_cost: { amount: 250, divisor: 100, currency_code: 'USD' },
      total_shipping_cost: { amount: 500, divisor: 100, currency_code: 'USD' },
      discount_amt: { amount: 0, divisor: 100, currency_code: 'USD' },
      gift_wrap_price: { amount: 0, divisor: 100, currency_code: 'USD' },
      shipments: [],
      transactions: [],
      create_timestamp: 1704067200,
      update_timestamp: 1704153600,
      country_iso: 'US',
      formatted_address: '123 Main St, City, ST 12345',
      city: 'City',
      state: 'ST',
      zip: '12345',
    };
    
    expect(receipt.receipt_id).toBe(123456789);
    expect(receipt.grandtotal.amount).toBe(3000);
    expect(receipt.grandtotal.divisor).toBe(100);
    // Actual value: 3000 / 100 = $30.00
    expect(receipt.grandtotal.amount / receipt.grandtotal.divisor).toBe(30);
  });
});

describe('EtsyMoney type validation', () => {
  it('should properly represent monetary values', () => {
    const money = {
      amount: 1999,
      divisor: 100,
      currency_code: 'USD',
    };
    
    // $19.99
    expect(money.amount / money.divisor).toBe(19.99);
    expect(money.currency_code).toBe('USD');
  });

  it('should handle different divisors', () => {
    const jpyMoney = {
      amount: 1000,
      divisor: 1,
      currency_code: 'JPY',
    };
    
    // ¥1000 (JPY has no decimal places)
    expect(jpyMoney.amount / jpyMoney.divisor).toBe(1000);
  });
});

describe('EtsyTransaction type validation', () => {
  it('should accept valid EtsyTransaction structure', () => {
    const transaction = {
      transaction_id: 987654321,
      title: 'Handmade Widget',
      description: 'A beautiful handmade widget',
      seller_user_id: 11111,
      buyer_user_id: 22222,
      create_timestamp: 1704067200,
      paid_timestamp: 1704067300,
      shipped_timestamp: 1704153600,
      quantity: 2,
      listing_image_id: 12345,
      receipt_id: 123456789,
      is_digital: false,
      file_data: '',
      listing_id: 55555,
      sku: 'WIDGET-001',
      product_id: 66666,
      transaction_type: 'listing',
      price: { amount: 1000, divisor: 100, currency_code: 'USD' },
      shipping_cost: { amount: 500, divisor: 100, currency_code: 'USD' },
    };
    
    expect(transaction.transaction_id).toBe(987654321);
    expect(transaction.quantity).toBe(2);
    expect(transaction.price.amount / transaction.price.divisor).toBe(10);
    expect(transaction.is_digital).toBe(false);
  });

  it('should handle digital products', () => {
    const digitalTransaction = {
      transaction_id: 111222333,
      title: 'Digital Download',
      description: 'Instant download file',
      seller_user_id: 11111,
      buyer_user_id: 22222,
      create_timestamp: 1704067200,
      paid_timestamp: 1704067300,
      shipped_timestamp: 0, // Digital items don't ship
      quantity: 1,
      listing_image_id: 12345,
      receipt_id: 123456789,
      is_digital: true,
      file_data: 'some_file_reference',
      listing_id: 77777,
      sku: 'DIGITAL-001',
      product_id: 88888,
      transaction_type: 'listing',
      price: { amount: 500, divisor: 100, currency_code: 'USD' },
      shipping_cost: { amount: 0, divisor: 100, currency_code: 'USD' },
    };
    
    expect(digitalTransaction.is_digital).toBe(true);
    expect(digitalTransaction.shipping_cost.amount).toBe(0);
    expect(digitalTransaction.shipped_timestamp).toBe(0);
  });
});

describe('EtsyShipment type validation', () => {
  it('should accept valid EtsyShipment structure', () => {
    const shipment = {
      receipt_shipping_id: 444555666,
      shipment_notification_timestamp: 1704153600,
      carrier_name: 'USPS',
      tracking_code: '9400111899223334445566',
    };
    
    expect(shipment.carrier_name).toBe('USPS');
    expect(shipment.tracking_code).toBe('9400111899223334445566');
  });
});
