/**
 * Magento / Adobe Commerce Integration Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock prisma before importing magento
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

// Import types and functions
import type {
  MagentoCredentials,
  MagentoOrder,
  MagentoAddress,
  MagentoOrderItem,
  MagentoPayment,
  MagentoOrdersResponse,
  MagentoStoreConfig,
  MagentoExtensionAttributes,
} from './magento';

import { mapOrderToImport, validateCredentials, saveConnection, getCredentials, fetchOrders } from './magento';
import { prisma } from '../prisma';

// =============================================================================
// Type Tests
// =============================================================================

describe('MagentoCredentials type', () => {
  it('should define required credential fields', () => {
    const credentials: MagentoCredentials = {
      storeUrl: 'https://mystore.com',
      accessToken: 'abc123xyz',
    };
    
    expect(credentials.storeUrl).toBe('https://mystore.com');
    expect(credentials.accessToken).toBe('abc123xyz');
  });

  it('should require both storeUrl and accessToken', () => {
    const credentials: MagentoCredentials = {
      storeUrl: 'https://store.example.com',
      accessToken: 'my-access-token',
    };
    
    expect(credentials.storeUrl).toBeTruthy();
    expect(credentials.accessToken).toBeTruthy();
  });
});

describe('MagentoAddress type', () => {
  it('should define all address fields', () => {
    const address: MagentoAddress = {
      address_type: 'billing',
      city: 'Los Angeles',
      country_id: 'US',
      email: 'john@example.com',
      firstname: 'John',
      lastname: 'Doe',
      postcode: '90210',
      region: 'California',
      region_code: 'CA',
      region_id: 12,
      street: ['123 Main Street', 'Suite 456'],
      telephone: '555-123-4567',
    };
    
    expect(address.city).toBe('Los Angeles');
    expect(address.region_code).toBe('CA');
    expect(address.country_id).toBe('US');
    expect(address.street).toHaveLength(2);
  });

  it('should handle shipping address type', () => {
    const address: MagentoAddress = {
      address_type: 'shipping',
      city: 'New York',
      country_id: 'US',
      email: 'jane@example.com',
      firstname: 'Jane',
      lastname: 'Smith',
      postcode: '10001',
      region: 'New York',
      region_code: 'NY',
      region_id: 33,
      street: ['456 Park Avenue'],
      telephone: '555-987-6543',
    };
    
    expect(address.address_type).toBe('shipping');
    expect(address.region_code).toBe('NY');
  });
});

describe('MagentoOrderItem type', () => {
  it('should define all order item fields', () => {
    const item: MagentoOrderItem = {
      item_id: 1001,
      order_id: 100,
      sku: 'WIDGET-001',
      name: 'Premium Widget',
      qty_ordered: 2,
      price: 49.99,
      base_price: 49.99,
      row_total: 99.98,
      base_row_total: 99.98,
      tax_amount: 8.25,
      base_tax_amount: 8.25,
      tax_percent: 8.25,
      discount_amount: 0,
      product_type: 'simple',
    };
    
    expect(item.sku).toBe('WIDGET-001');
    expect(item.qty_ordered).toBe(2);
    expect(item.row_total).toBe(99.98);
    expect(item.tax_percent).toBe(8.25);
  });

  it('should handle virtual products', () => {
    const item: MagentoOrderItem = {
      item_id: 1002,
      order_id: 100,
      sku: 'DOWNLOAD-001',
      name: 'Digital Download',
      qty_ordered: 1,
      price: 19.99,
      base_price: 19.99,
      row_total: 19.99,
      base_row_total: 19.99,
      tax_amount: 0,
      base_tax_amount: 0,
      tax_percent: 0,
      discount_amount: 0,
      product_type: 'virtual',
    };
    
    expect(item.product_type).toBe('virtual');
    expect(item.tax_amount).toBe(0);
  });
});

describe('MagentoPayment type', () => {
  it('should define payment fields', () => {
    const payment: MagentoPayment = {
      account_status: 'active',
      method: 'paypal_express',
      amount_ordered: 108.23,
      base_amount_ordered: 108.23,
    };
    
    expect(payment.method).toBe('paypal_express');
    expect(payment.amount_ordered).toBe(108.23);
  });
});

describe('MagentoStoreConfig type', () => {
  it('should define store configuration fields', () => {
    const config: MagentoStoreConfig = {
      id: 1,
      code: 'default',
      website_id: 1,
      name: 'Main Website Store',
      default_display_currency_code: 'USD',
      timezone: 'America/Los_Angeles',
      base_url: 'https://mystore.com/',
      base_currency_code: 'USD',
    };
    
    expect(config.code).toBe('default');
    expect(config.timezone).toBe('America/Los_Angeles');
    expect(config.base_currency_code).toBe('USD');
  });
});

describe('MagentoOrder type', () => {
  it('should define all order fields', () => {
    const order: MagentoOrder = {
      entity_id: 100,
      increment_id: '100000001',
      created_at: '2026-03-07T10:00:00-06:00',
      updated_at: '2026-03-07T10:05:00-06:00',
      status: 'processing',
      state: 'processing',
      store_id: 1,
      store_name: 'Main Store',
      customer_id: 42,
      customer_email: 'customer@example.com',
      customer_firstname: 'John',
      customer_lastname: 'Doe',
      base_currency_code: 'USD',
      order_currency_code: 'USD',
      subtotal: 99.98,
      base_subtotal: 99.98,
      subtotal_incl_tax: 108.23,
      tax_amount: 8.25,
      base_tax_amount: 8.25,
      shipping_amount: 10.00,
      base_shipping_amount: 10.00,
      shipping_tax_amount: 0.83,
      base_shipping_tax_amount: 0.83,
      discount_amount: 0,
      base_discount_amount: 0,
      grand_total: 118.23,
      base_grand_total: 118.23,
      total_qty_ordered: 2,
      total_item_count: 2,
      billing_address: {
        address_type: 'billing',
        city: 'Los Angeles',
        country_id: 'US',
        email: 'customer@example.com',
        firstname: 'John',
        lastname: 'Doe',
        postcode: '90210',
        region: 'California',
        region_code: 'CA',
        region_id: 12,
        street: ['123 Main St'],
        telephone: '555-1234',
      },
      payment: {
        account_status: 'active',
        method: 'checkmo',
        amount_ordered: 118.23,
        base_amount_ordered: 118.23,
      },
      items: [],
    };
    
    expect(order.entity_id).toBe(100);
    expect(order.increment_id).toBe('100000001');
    expect(order.status).toBe('processing');
    expect(order.grand_total).toBe(118.23);
  });
});

// =============================================================================
// Order Mapping Tests
// =============================================================================

describe('mapOrderToImport', () => {
  const createMockOrder = (overrides?: Partial<MagentoOrder>): MagentoOrder => ({
    entity_id: 100,
    increment_id: '100000001',
    created_at: '2026-03-07T10:00:00-06:00',
    updated_at: '2026-03-07T10:05:00-06:00',
    status: 'complete',
    state: 'complete',
    store_id: 1,
    store_name: 'Main Store',
    customer_id: 42,
    customer_email: 'customer@example.com',
    customer_firstname: 'John',
    customer_lastname: 'Doe',
    base_currency_code: 'USD',
    order_currency_code: 'USD',
    subtotal: 99.98,
    base_subtotal: 99.98,
    subtotal_incl_tax: 108.23,
    tax_amount: 8.25,
    base_tax_amount: 8.25,
    shipping_amount: 10.00,
    base_shipping_amount: 10.00,
    shipping_tax_amount: 0.83,
    base_shipping_tax_amount: 0.83,
    discount_amount: 0,
    base_discount_amount: 0,
    grand_total: 118.23,
    base_grand_total: 118.23,
    total_qty_ordered: 2,
    total_item_count: 1,
    billing_address: {
      address_type: 'billing',
      city: 'Los Angeles',
      country_id: 'US',
      email: 'customer@example.com',
      firstname: 'John',
      lastname: 'Doe',
      postcode: '90210',
      region: 'California',
      region_code: 'CA',
      region_id: 12,
      street: ['123 Main St'],
      telephone: '555-1234',
    },
    payment: {
      account_status: 'active',
      method: 'checkmo',
      amount_ordered: 118.23,
      base_amount_ordered: 118.23,
    },
    items: [
      {
        item_id: 1001,
        order_id: 100,
        sku: 'WIDGET-001',
        name: 'Premium Widget',
        qty_ordered: 2,
        price: 49.99,
        base_price: 49.99,
        row_total: 99.98,
        base_row_total: 99.98,
        tax_amount: 8.25,
        base_tax_amount: 8.25,
        tax_percent: 8.25,
        discount_amount: 0,
        product_type: 'simple',
      },
    ],
    ...overrides,
  });

  it('should map basic order fields correctly', () => {
    const order = createMockOrder();
    const mapped = mapOrderToImport(order);
    
    expect(mapped.platform).toBe('magento');
    expect(mapped.platformOrderId).toBe('100');
    expect(mapped.orderNumber).toBe('100000001');
    expect(mapped.orderDate).toBeInstanceOf(Date);
    expect(mapped.subtotal).toBe(99.98);
    expect(mapped.shippingAmount).toBe(10.00);
    expect(mapped.taxAmount).toBe(8.25);
    expect(mapped.totalAmount).toBe(118.23);
    expect(mapped.currency).toBe('USD');
  });

  it('should map customer email', () => {
    const order = createMockOrder({ customer_email: 'test@example.com' });
    const mapped = mapOrderToImport(order);
    
    expect(mapped.customerEmail).toBe('test@example.com');
  });

  it('should use billing address when no shipping address is available', () => {
    const order = createMockOrder();
    // Remove extension_attributes to ensure no shipping address
    delete order.extension_attributes;
    const mapped = mapOrderToImport(order);
    
    expect(mapped.shippingState).toBe('CA');
    expect(mapped.shippingCity).toBe('Los Angeles');
    expect(mapped.shippingZip).toBe('90210');
    expect(mapped.shippingCountry).toBe('US');
  });

  it('should prefer shipping address from extension_attributes', () => {
    const order = createMockOrder({
      extension_attributes: {
        shipping_assignments: [
          {
            shipping: {
              address: {
                address_type: 'shipping',
                city: 'San Francisco',
                country_id: 'US',
                email: 'customer@example.com',
                firstname: 'John',
                lastname: 'Doe',
                postcode: '94102',
                region: 'California',
                region_code: 'CA',
                region_id: 12,
                street: ['456 Market St'],
                telephone: '555-5678',
              },
              method: 'flatrate_flatrate',
            },
            items: [],
          },
        ],
      },
    });
    const mapped = mapOrderToImport(order);
    
    expect(mapped.shippingCity).toBe('San Francisco');
    expect(mapped.shippingZip).toBe('94102');
  });

  it('should map order status correctly - complete', () => {
    const order = createMockOrder({ status: 'complete' });
    const mapped = mapOrderToImport(order);
    
    expect(mapped.status).toBe('fulfilled');
  });

  it('should map order status correctly - processing', () => {
    const order = createMockOrder({ status: 'processing' });
    const mapped = mapOrderToImport(order);
    
    expect(mapped.status).toBe('processing');
  });

  it('should map order status correctly - pending', () => {
    const order = createMockOrder({ status: 'pending' });
    const mapped = mapOrderToImport(order);
    
    expect(mapped.status).toBe('pending');
  });

  it('should map order status correctly - canceled', () => {
    const order = createMockOrder({ status: 'canceled' });
    const mapped = mapOrderToImport(order);
    
    expect(mapped.status).toBe('cancelled');
  });

  it('should map order status correctly - closed', () => {
    const order = createMockOrder({ status: 'closed' });
    const mapped = mapOrderToImport(order);
    
    expect(mapped.status).toBe('fulfilled');
  });

  it('should map order status correctly - holded', () => {
    const order = createMockOrder({ status: 'holded' });
    const mapped = mapOrderToImport(order);
    
    expect(mapped.status).toBe('pending');
  });

  it('should map order status correctly - fraud', () => {
    const order = createMockOrder({ status: 'fraud' });
    const mapped = mapOrderToImport(order);
    
    expect(mapped.status).toBe('cancelled');
  });

  it('should handle unknown status gracefully', () => {
    const order = createMockOrder({ status: 'unknown_status' });
    const mapped = mapOrderToImport(order);
    
    expect(mapped.status).toBe('pending');
  });

  it('should map line items correctly', () => {
    const order = createMockOrder({
      items: [
        {
          item_id: 1001,
          order_id: 100,
          sku: 'WIDGET-001',
          name: 'Premium Widget',
          qty_ordered: 2,
          price: 49.99,
          base_price: 49.99,
          row_total: 99.98,
          base_row_total: 99.98,
          tax_amount: 8.25,
          base_tax_amount: 8.25,
          tax_percent: 8.25,
          discount_amount: 0,
          product_type: 'simple',
        },
        {
          item_id: 1002,
          order_id: 100,
          sku: 'GADGET-002',
          name: 'Basic Gadget',
          qty_ordered: 1,
          price: 29.99,
          base_price: 29.99,
          row_total: 29.99,
          base_row_total: 29.99,
          tax_amount: 2.47,
          base_tax_amount: 2.47,
          tax_percent: 8.25,
          discount_amount: 5.00,
          product_type: 'simple',
        },
      ],
    });
    const mapped = mapOrderToImport(order);
    
    expect(mapped.lineItems).toHaveLength(2);
    expect(mapped.lineItems?.[0].sku).toBe('WIDGET-001');
    expect(mapped.lineItems?.[0].quantity).toBe(2);
    expect(mapped.lineItems?.[0].price).toBe(49.99);
    expect(mapped.lineItems?.[0].taxAmount).toBe(8.25);
    expect(mapped.lineItems?.[1].sku).toBe('GADGET-002');
  });

  it('should map tax breakdown correctly', () => {
    const order = createMockOrder({
      tax_amount: 10.50,
      shipping_tax_amount: 1.50,
    });
    const mapped = mapOrderToImport(order);
    
    expect(mapped.taxBreakdown.subtotalTax).toBe(9.00);
    expect(mapped.taxBreakdown.shippingTax).toBe(1.50);
    expect(mapped.taxBreakdown.totalTax).toBe(10.50);
  });

  it('should handle orders with no shipping tax', () => {
    const order = createMockOrder({
      tax_amount: 8.25,
      shipping_tax_amount: 0,
    });
    const mapped = mapOrderToImport(order);
    
    expect(mapped.taxBreakdown.subtotalTax).toBe(8.25);
    expect(mapped.taxBreakdown.shippingTax).toBe(0);
  });

  it('should include raw order data', () => {
    const order = createMockOrder();
    const mapped = mapOrderToImport(order);
    
    expect(mapped.rawData).toEqual(order);
  });

  it('should handle guest orders (null customer_id)', () => {
    const order = createMockOrder({ customer_id: null });
    const mapped = mapOrderToImport(order);
    
    expect(mapped.customerEmail).toBe('customer@example.com');
  });

  it('should handle different currencies', () => {
    const order = createMockOrder({ order_currency_code: 'EUR' });
    const mapped = mapOrderToImport(order);
    
    expect(mapped.currency).toBe('EUR');
  });

  it('should handle missing currency gracefully', () => {
    const order = createMockOrder();
    // @ts-ignore - testing edge case
    order.order_currency_code = undefined;
    const mapped = mapOrderToImport(order);
    
    expect(mapped.currency).toBe('USD');
  });

  it('should use region name when region_code is not available', () => {
    const order = createMockOrder({
      billing_address: {
        address_type: 'billing',
        city: 'Toronto',
        country_id: 'CA',
        email: 'customer@example.com',
        firstname: 'John',
        lastname: 'Doe',
        postcode: 'M5V 2H1',
        region: 'Ontario',
        region_code: '', // Empty region code
        region_id: 0,
        street: ['123 King St'],
        telephone: '555-1234',
      },
    });
    delete order.extension_attributes;
    const mapped = mapOrderToImport(order);
    
    expect(mapped.shippingState).toBe('Ontario');
  });
});

// =============================================================================
// Credential Validation Tests (with mocked fetch)
// =============================================================================

describe('validateCredentials', () => {
  const originalFetch = global.fetch;
  
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should return valid=true for correct credentials', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => [{
        id: 1,
        code: 'default',
        website_id: 1,
        name: 'Main Store',
        default_display_currency_code: 'USD',
        timezone: 'America/Los_Angeles',
        base_url: 'https://mystore.com/',
        base_currency_code: 'USD',
      }],
    });
    
    const result = await validateCredentials({
      storeUrl: 'https://mystore.com',
      accessToken: 'valid-token',
    });
    
    expect(result.valid).toBe(true);
    expect(result.storeInfo).toBeDefined();
    expect(result.storeInfo?.name).toBe('Main Store');
  });

  it('should return valid=false for invalid token (401)', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => '{"message": "Consumer is not authorized"}',
    });
    
    const result = await validateCredentials({
      storeUrl: 'https://mystore.com',
      accessToken: 'invalid-token',
    });
    
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid access token');
  });

  it('should return valid=false for permission denied (403)', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: async () => '{"message": "Access denied"}',
    });
    
    const result = await validateCredentials({
      storeUrl: 'https://mystore.com',
      accessToken: 'valid-but-no-permissions',
    });
    
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Access denied');
  });

  it('should return valid=false for invalid store URL (404)', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: async () => '{"message": "Requested store is not found"}',
    });
    
    const result = await validateCredentials({
      storeUrl: 'https://nonexistent.com',
      accessToken: 'some-token',
    });
    
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Store not found');
  });

  it('should handle network errors', async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));
    
    const result = await validateCredentials({
      storeUrl: 'https://mystore.com',
      accessToken: 'valid-token',
    });
    
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Network error');
  });
});

// =============================================================================
// Database Operations Tests
// =============================================================================

describe('saveConnection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create new connection when none exists', async () => {
    (prisma.platformConnection.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
    (prisma.platformConnection.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: 'conn-123',
      userId: 'user-456',
      platform: 'magento',
      platformId: 'mystore.com',
      platformName: 'My Magento Store',
      accessToken: 'token',
      refreshToken: 'https://mystore.com',
      syncStatus: 'pending',
    });
    
    const result = await saveConnection(
      'user-456',
      { storeUrl: 'https://mystore.com', accessToken: 'token' },
      'My Magento Store'
    );
    
    expect(result.success).toBe(true);
    expect(result.connectionId).toBe('conn-123');
  });

  it('should update existing connection', async () => {
    (prisma.platformConnection.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: 'existing-conn',
      userId: 'user-456',
      platform: 'magento',
    });
    (prisma.platformConnection.update as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: 'existing-conn',
    });
    
    const result = await saveConnection(
      'user-456',
      { storeUrl: 'https://mystore.com', accessToken: 'new-token' }
    );
    
    expect(result.success).toBe(true);
    expect(result.connectionId).toBe('existing-conn');
    expect(prisma.platformConnection.update).toHaveBeenCalled();
  });

  it('should normalize store URL by removing trailing slash', async () => {
    (prisma.platformConnection.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
    (prisma.platformConnection.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: 'conn-123',
    });
    
    await saveConnection(
      'user-456',
      { storeUrl: 'https://mystore.com/', accessToken: 'token' }
    );
    
    expect(prisma.platformConnection.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          refreshToken: 'https://mystore.com',
        }),
      })
    );
  });

  it('should add https if protocol missing', async () => {
    (prisma.platformConnection.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
    (prisma.platformConnection.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: 'conn-123',
    });
    
    await saveConnection(
      'user-456',
      { storeUrl: 'mystore.com', accessToken: 'token' }
    );
    
    expect(prisma.platformConnection.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          refreshToken: 'https://mystore.com',
        }),
      })
    );
  });

  it('should handle database errors', async () => {
    (prisma.platformConnection.findFirst as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('Database connection failed')
    );
    
    const result = await saveConnection(
      'user-456',
      { storeUrl: 'https://mystore.com', accessToken: 'token' }
    );
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Database connection failed');
  });
});

describe('getCredentials', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return credentials when connection exists', async () => {
    (prisma.platformConnection.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: 'conn-123',
      userId: 'user-456',
      platform: 'magento',
      platformId: 'mystore.com',
      accessToken: 'token-123',
      refreshToken: 'https://mystore.com',
    });
    
    const result = await getCredentials('user-456', 'mystore.com');
    
    expect(result).toEqual({
      storeUrl: 'https://mystore.com',
      accessToken: 'token-123',
    });
  });

  it('should return null when connection does not exist', async () => {
    (prisma.platformConnection.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
    
    const result = await getCredentials('user-456', 'nonexistent.com');
    
    expect(result).toBeNull();
  });

  it('should return null when accessToken is missing', async () => {
    (prisma.platformConnection.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: 'conn-123',
      userId: 'user-456',
      platform: 'magento',
      platformId: 'mystore.com',
      accessToken: null,
      refreshToken: 'https://mystore.com',
    });
    
    const result = await getCredentials('user-456', 'mystore.com');
    
    expect(result).toBeNull();
  });

  it('should return null when refreshToken (store URL) is missing', async () => {
    (prisma.platformConnection.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: 'conn-123',
      userId: 'user-456',
      platform: 'magento',
      platformId: 'mystore.com',
      accessToken: 'token',
      refreshToken: null,
    });
    
    const result = await getCredentials('user-456', 'mystore.com');
    
    expect(result).toBeNull();
  });
});

// =============================================================================
// Order Fetching Tests (with mocked fetch)
// =============================================================================

describe('fetchOrders', () => {
  const originalFetch = global.fetch;
  
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should fetch orders successfully', async () => {
    const mockOrders: MagentoOrder[] = [
      {
        entity_id: 100,
        increment_id: '100000001',
        created_at: '2026-03-07T10:00:00-06:00',
        updated_at: '2026-03-07T10:05:00-06:00',
        status: 'complete',
        state: 'complete',
        store_id: 1,
        store_name: 'Main Store',
        customer_id: 42,
        customer_email: 'customer@example.com',
        customer_firstname: 'John',
        customer_lastname: 'Doe',
        base_currency_code: 'USD',
        order_currency_code: 'USD',
        subtotal: 99.98,
        base_subtotal: 99.98,
        subtotal_incl_tax: 108.23,
        tax_amount: 8.25,
        base_tax_amount: 8.25,
        shipping_amount: 10.00,
        base_shipping_amount: 10.00,
        shipping_tax_amount: 0.83,
        base_shipping_tax_amount: 0.83,
        discount_amount: 0,
        base_discount_amount: 0,
        grand_total: 118.23,
        base_grand_total: 118.23,
        total_qty_ordered: 2,
        total_item_count: 1,
        billing_address: {
          address_type: 'billing',
          city: 'Los Angeles',
          country_id: 'US',
          email: 'customer@example.com',
          firstname: 'John',
          lastname: 'Doe',
          postcode: '90210',
          region: 'California',
          region_code: 'CA',
          region_id: 12,
          street: ['123 Main St'],
          telephone: '555-1234',
        },
        payment: {
          account_status: 'active',
          method: 'checkmo',
          amount_ordered: 118.23,
          base_amount_ordered: 118.23,
        },
        items: [],
      },
    ];
    
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: mockOrders,
        search_criteria: {},
        total_count: 1,
      }),
    });
    
    const orders = await fetchOrders({
      storeUrl: 'https://mystore.com',
      accessToken: 'valid-token',
    });
    
    expect(orders).toHaveLength(1);
    expect(orders[0].entity_id).toBe(100);
  });

  it('should handle date filters', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [], search_criteria: {}, total_count: 0 }),
    });
    
    await fetchOrders(
      { storeUrl: 'https://mystore.com', accessToken: 'token' },
      { createdAtFrom: '2026-03-01', createdAtTo: '2026-03-07' }
    );
    
    expect(global.fetch).toHaveBeenCalled();
    const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(fetchCall).toContain('created_at');
  });

  it('should handle status filter', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [], search_criteria: {}, total_count: 0 }),
    });
    
    await fetchOrders(
      { storeUrl: 'https://mystore.com', accessToken: 'token' },
      { status: 'processing' }
    );
    
    expect(global.fetch).toHaveBeenCalled();
    const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(fetchCall).toContain('status');
  });

  it('should handle empty response', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [], search_criteria: {}, total_count: 0 }),
    });
    
    const orders = await fetchOrders({
      storeUrl: 'https://mystore.com',
      accessToken: 'valid-token',
    });
    
    expect(orders).toHaveLength(0);
  });

  it('should throw on API error', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    });
    
    await expect(fetchOrders({
      storeUrl: 'https://mystore.com',
      accessToken: 'valid-token',
    })).rejects.toThrow();
  });
});

// =============================================================================
// URL Normalization Tests
// =============================================================================

describe('URL normalization (via saveConnection)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.platformConnection.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.platformConnection.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'test' });
  });

  it('should handle URL with trailing slash', async () => {
    await saveConnection('user', { storeUrl: 'https://store.com/', accessToken: 't' });
    
    expect(prisma.platformConnection.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          refreshToken: 'https://store.com',
        }),
      })
    );
  });

  it('should handle URL without protocol', async () => {
    await saveConnection('user', { storeUrl: 'store.com', accessToken: 't' });
    
    expect(prisma.platformConnection.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          refreshToken: 'https://store.com',
        }),
      })
    );
  });

  it('should preserve http protocol', async () => {
    await saveConnection('user', { storeUrl: 'http://local.store.com', accessToken: 't' });
    
    expect(prisma.platformConnection.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          refreshToken: 'http://local.store.com',
        }),
      })
    );
  });

  it('should handle URL with whitespace', async () => {
    await saveConnection('user', { storeUrl: '  https://store.com  ', accessToken: 't' });
    
    expect(prisma.platformConnection.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          refreshToken: 'https://store.com',
        }),
      })
    );
  });
});
