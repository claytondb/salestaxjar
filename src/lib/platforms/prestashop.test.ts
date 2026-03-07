/**
 * PrestaShop Integration Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock prisma before importing prestashop
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
  PrestaShopCredentials,
  PrestaShopOrder,
  PrestaShopAddress,
  PrestaShopOrderRow,
  PrestaShopCustomer,
  PrestaShopState,
  PrestaShopCountry,
  PrestaShopOrdersResponse,
  PrestaShopShopInfo,
} from './prestashop';

import { 
  validateCredentials, 
  saveConnection, 
  getCredentials, 
  fetchOrders,
  fetchAddress,
  fetchState,
  fetchCountry,
  fetchCustomer,
  mapOrderToImport,
} from './prestashop';
import { prisma } from '../prisma';

// =============================================================================
// Type Tests
// =============================================================================

describe('PrestaShopCredentials type', () => {
  it('should define required credential fields', () => {
    const credentials: PrestaShopCredentials = {
      storeUrl: 'https://mystore.com',
      apiKey: 'WEBSERVICE_KEY_12345',
    };
    
    expect(credentials.storeUrl).toBe('https://mystore.com');
    expect(credentials.apiKey).toBe('WEBSERVICE_KEY_12345');
  });

  it('should require both storeUrl and apiKey', () => {
    const credentials: PrestaShopCredentials = {
      storeUrl: 'https://store.example.com',
      apiKey: 'my-api-key',
    };
    
    expect(credentials.storeUrl).toBeTruthy();
    expect(credentials.apiKey).toBeTruthy();
  });
});

describe('PrestaShopAddress type', () => {
  it('should define all address fields', () => {
    const address: PrestaShopAddress = {
      id: '15',
      id_customer: '42',
      id_country: '21',
      id_state: '12',
      alias: 'My Address',
      company: 'Acme Inc',
      lastname: 'Doe',
      firstname: 'John',
      address1: '123 Main Street',
      address2: 'Suite 456',
      postcode: '90210',
      city: 'Los Angeles',
      phone: '555-123-4567',
      phone_mobile: '555-987-6543',
    };
    
    expect(address.id).toBe('15');
    expect(address.city).toBe('Los Angeles');
    expect(address.id_state).toBe('12');
    expect(address.id_country).toBe('21');
  });
});

describe('PrestaShopOrderRow type', () => {
  it('should define all order row fields', () => {
    const row: PrestaShopOrderRow = {
      id: '101',
      product_id: '25',
      product_attribute_id: '0',
      product_quantity: '2',
      product_name: 'Premium Widget',
      product_reference: 'WIDGET-001',
      product_ean13: '1234567890123',
      product_price: '99.98',
      unit_price_tax_incl: '54.49',
      unit_price_tax_excl: '49.99',
    };
    
    expect(row.product_name).toBe('Premium Widget');
    expect(row.product_quantity).toBe('2');
    expect(row.product_reference).toBe('WIDGET-001');
  });
});

describe('PrestaShopCustomer type', () => {
  it('should define customer fields', () => {
    const customer: PrestaShopCustomer = {
      id: '42',
      email: 'john@example.com',
      firstname: 'John',
      lastname: 'Doe',
    };
    
    expect(customer.email).toBe('john@example.com');
    expect(customer.firstname).toBe('John');
  });
});

describe('PrestaShopState type', () => {
  it('should define state fields', () => {
    const state: PrestaShopState = {
      id: '12',
      id_country: '21',
      iso_code: 'CA',
      name: 'California',
    };
    
    expect(state.iso_code).toBe('CA');
    expect(state.name).toBe('California');
  });
});

describe('PrestaShopCountry type', () => {
  it('should define country fields', () => {
    const country: PrestaShopCountry = {
      id: '21',
      iso_code: 'US',
      name: 'United States',
    };
    
    expect(country.iso_code).toBe('US');
    expect(country.name).toBe('United States');
  });
});

describe('PrestaShopOrder type', () => {
  it('should define all order fields', () => {
    const order: PrestaShopOrder = {
      id: '100',
      id_address_delivery: '15',
      id_address_invoice: '15',
      id_cart: '50',
      id_currency: '1',
      id_lang: '1',
      id_customer: '42',
      id_carrier: '2',
      current_state: '2',
      module: 'paypal',
      invoice_number: 'INV-001',
      invoice_date: '2026-03-07 10:00:00',
      delivery_number: '',
      delivery_date: '',
      valid: '1',
      date_add: '2026-03-07 10:00:00',
      date_upd: '2026-03-07 10:05:00',
      shipping_number: '',
      reference: 'XYZABC123',
      payment: 'PayPal',
      total_discounts: '0.00',
      total_discounts_tax_incl: '0.00',
      total_discounts_tax_excl: '0.00',
      total_paid: '118.23',
      total_paid_tax_incl: '118.23',
      total_paid_tax_excl: '109.98',
      total_paid_real: '118.23',
      total_products: '99.98',
      total_products_wt: '108.23',
      total_shipping: '10.00',
      total_shipping_tax_incl: '10.00',
      total_shipping_tax_excl: '9.17',
      carrier_tax_rate: '8.25',
      conversion_rate: '1.000000',
    };
    
    expect(order.id).toBe('100');
    expect(order.reference).toBe('XYZABC123');
    expect(order.current_state).toBe('2');
    expect(order.total_paid_tax_incl).toBe('118.23');
  });

  it('should handle order associations', () => {
    const order: PrestaShopOrder = {
      id: '100',
      id_address_delivery: '15',
      id_address_invoice: '15',
      id_cart: '50',
      id_currency: '1',
      id_lang: '1',
      id_customer: '42',
      id_carrier: '2',
      current_state: '2',
      module: 'paypal',
      invoice_number: '',
      invoice_date: '',
      delivery_number: '',
      delivery_date: '',
      valid: '1',
      date_add: '2026-03-07 10:00:00',
      date_upd: '2026-03-07 10:05:00',
      shipping_number: '',
      reference: 'XYZABC123',
      payment: 'PayPal',
      total_discounts: '0.00',
      total_discounts_tax_incl: '0.00',
      total_discounts_tax_excl: '0.00',
      total_paid: '118.23',
      total_paid_tax_incl: '118.23',
      total_paid_tax_excl: '109.98',
      total_paid_real: '118.23',
      total_products: '99.98',
      total_products_wt: '108.23',
      total_shipping: '10.00',
      total_shipping_tax_incl: '10.00',
      total_shipping_tax_excl: '9.17',
      carrier_tax_rate: '8.25',
      conversion_rate: '1.000000',
      associations: {
        order_rows: [
          {
            id: '101',
            product_id: '25',
            product_attribute_id: '0',
            product_quantity: '2',
            product_name: 'Widget',
            product_reference: 'WIDGET-001',
            product_ean13: '',
            product_price: '99.98',
            unit_price_tax_incl: '54.49',
            unit_price_tax_excl: '49.99',
          },
        ],
      },
    };
    
    expect(order.associations?.order_rows).toHaveLength(1);
    expect(order.associations?.order_rows?.[0].product_name).toBe('Widget');
  });
});

// =============================================================================
// Order Mapping Tests (with mocked API calls)
// =============================================================================

describe('mapOrderToImport', () => {
  const originalFetch = global.fetch;
  
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    global.fetch = originalFetch;
  });

  const createMockOrder = (overrides?: Partial<PrestaShopOrder>): PrestaShopOrder => ({
    id: '100',
    id_address_delivery: '15',
    id_address_invoice: '15',
    id_cart: '50',
    id_currency: '1',
    id_lang: '1',
    id_customer: '42',
    id_carrier: '2',
    current_state: '2',
    module: 'paypal',
    invoice_number: 'INV-001',
    invoice_date: '2026-03-07 10:00:00',
    delivery_number: '',
    delivery_date: '',
    valid: '1',
    date_add: '2026-03-07 10:00:00',
    date_upd: '2026-03-07 10:05:00',
    shipping_number: '',
    reference: 'XYZABC123',
    payment: 'PayPal',
    total_discounts: '0.00',
    total_discounts_tax_incl: '0.00',
    total_discounts_tax_excl: '0.00',
    total_paid: '118.23',
    total_paid_tax_incl: '118.23',
    total_paid_tax_excl: '109.98',
    total_paid_real: '118.23',
    total_products: '99.98',
    total_products_wt: '108.23',
    total_shipping: '10.00',
    total_shipping_tax_incl: '10.00',
    total_shipping_tax_excl: '9.17',
    carrier_tax_rate: '8.25',
    conversion_rate: '1.000000',
    ...overrides,
  });

  const mockFetchResponses = (responses: Record<string, unknown>) => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      for (const [pattern, response] of Object.entries(responses)) {
        if (url.includes(pattern)) {
          return Promise.resolve({
            ok: true,
            text: async () => JSON.stringify(response),
          });
        }
      }
      return Promise.resolve({
        ok: true,
        text: async () => '{}',
      });
    });
  };

  it('should map basic order fields correctly', async () => {
    mockFetchResponses({
      '/addresses/': { address: { city: 'Los Angeles', postcode: '90210', id_state: '12', id_country: '21' } },
      '/states/': { state: { iso_code: 'CA' } },
      '/countries/': { country: { iso_code: 'US' } },
      '/customers/': { customer: { email: 'test@example.com' } },
    });
    
    const order = createMockOrder();
    const credentials: PrestaShopCredentials = { storeUrl: 'https://mystore.com', apiKey: 'key' };
    const mapped = await mapOrderToImport(order, credentials);
    
    expect(mapped.platform).toBe('prestashop');
    expect(mapped.platformOrderId).toBe('100');
    expect(mapped.orderNumber).toBe('XYZABC123');
    expect(mapped.subtotal).toBe(99.98);
    expect(mapped.totalAmount).toBe(118.23);
  });

  it('should calculate tax correctly', async () => {
    mockFetchResponses({});
    
    const order = createMockOrder({
      total_paid_tax_incl: '118.23',
      total_paid_tax_excl: '109.98',
      total_shipping_tax_incl: '10.00',
      total_shipping_tax_excl: '9.17',
    });
    const credentials: PrestaShopCredentials = { storeUrl: 'https://mystore.com', apiKey: 'key' };
    const mapped = await mapOrderToImport(order, credentials);
    
    // Tax = 118.23 - 109.98 = 8.25
    expect(mapped.taxAmount).toBeCloseTo(8.25, 2);
    // Shipping tax = 10.00 - 9.17 = 0.83
    expect(mapped.taxBreakdown.shippingTax).toBeCloseTo(0.83, 2);
    // Product tax = 8.25 - 0.83 = 7.42
    expect(mapped.taxBreakdown.productTax).toBeCloseTo(7.42, 2);
  });

  it('should use order id when reference is empty', async () => {
    mockFetchResponses({});
    
    const order = createMockOrder({ reference: '' });
    const credentials: PrestaShopCredentials = { storeUrl: 'https://mystore.com', apiKey: 'key' };
    const mapped = await mapOrderToImport(order, credentials);
    
    expect(mapped.orderNumber).toBe('100');
  });

  it('should map order state 2 to processing', async () => {
    mockFetchResponses({});
    
    const order = createMockOrder({ current_state: '2' });
    const credentials: PrestaShopCredentials = { storeUrl: 'https://mystore.com', apiKey: 'key' };
    const mapped = await mapOrderToImport(order, credentials);
    
    expect(mapped.status).toBe('processing');
  });

  it('should map order state 4 to fulfilled', async () => {
    mockFetchResponses({});
    
    const order = createMockOrder({ current_state: '4' });
    const credentials: PrestaShopCredentials = { storeUrl: 'https://mystore.com', apiKey: 'key' };
    const mapped = await mapOrderToImport(order, credentials);
    
    expect(mapped.status).toBe('fulfilled');
  });

  it('should map order state 5 to fulfilled (delivered)', async () => {
    mockFetchResponses({});
    
    const order = createMockOrder({ current_state: '5' });
    const credentials: PrestaShopCredentials = { storeUrl: 'https://mystore.com', apiKey: 'key' };
    const mapped = await mapOrderToImport(order, credentials);
    
    expect(mapped.status).toBe('fulfilled');
  });

  it('should map order state 6 to cancelled', async () => {
    mockFetchResponses({});
    
    const order = createMockOrder({ current_state: '6' });
    const credentials: PrestaShopCredentials = { storeUrl: 'https://mystore.com', apiKey: 'key' };
    const mapped = await mapOrderToImport(order, credentials);
    
    expect(mapped.status).toBe('cancelled');
  });

  it('should map order state 7 to refunded', async () => {
    mockFetchResponses({});
    
    const order = createMockOrder({ current_state: '7' });
    const credentials: PrestaShopCredentials = { storeUrl: 'https://mystore.com', apiKey: 'key' };
    const mapped = await mapOrderToImport(order, credentials);
    
    expect(mapped.status).toBe('refunded');
  });

  it('should map order state 1 to pending', async () => {
    mockFetchResponses({});
    
    const order = createMockOrder({ current_state: '1' });
    const credentials: PrestaShopCredentials = { storeUrl: 'https://mystore.com', apiKey: 'key' };
    const mapped = await mapOrderToImport(order, credentials);
    
    expect(mapped.status).toBe('pending');
  });

  it('should map unknown state to pending', async () => {
    mockFetchResponses({});
    
    const order = createMockOrder({ current_state: '99' });
    const credentials: PrestaShopCredentials = { storeUrl: 'https://mystore.com', apiKey: 'key' };
    const mapped = await mapOrderToImport(order, credentials);
    
    expect(mapped.status).toBe('pending');
  });

  it('should map line items from associations', async () => {
    mockFetchResponses({});
    
    const order = createMockOrder({
      associations: {
        order_rows: [
          {
            id: '101',
            product_id: '25',
            product_attribute_id: '0',
            product_quantity: '2',
            product_name: 'Premium Widget',
            product_reference: 'WIDGET-001',
            product_ean13: '',
            product_price: '99.98',
            unit_price_tax_incl: '54.49',
            unit_price_tax_excl: '49.99',
          },
          {
            id: '102',
            product_id: '26',
            product_attribute_id: '0',
            product_quantity: '1',
            product_name: 'Basic Gadget',
            product_reference: 'GADGET-001',
            product_ean13: '',
            product_price: '29.99',
            unit_price_tax_incl: '32.46',
            unit_price_tax_excl: '29.99',
          },
        ],
      },
    });
    const credentials: PrestaShopCredentials = { storeUrl: 'https://mystore.com', apiKey: 'key' };
    const mapped = await mapOrderToImport(order, credentials);
    
    expect(mapped.lineItems).toHaveLength(2);
    expect(mapped.lineItems?.[0].name).toBe('Premium Widget');
    expect(mapped.lineItems?.[0].quantity).toBe(2);
    expect(mapped.lineItems?.[0].price).toBe(49.99);
    expect(mapped.lineItems?.[1].sku).toBe('GADGET-001');
  });

  it('should include raw order data', async () => {
    mockFetchResponses({});
    
    const order = createMockOrder();
    const credentials: PrestaShopCredentials = { storeUrl: 'https://mystore.com', apiKey: 'key' };
    const mapped = await mapOrderToImport(order, credentials);
    
    expect(mapped.rawData).toEqual(order);
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
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ orders: { resource: '/api/orders' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({
          configurations: [{ name: 'PS_SHOP_NAME', value: 'My PrestaShop Store' }],
        }),
      });
    
    const result = await validateCredentials({
      storeUrl: 'https://mystore.com',
      apiKey: 'valid-key',
    });
    
    expect(result.valid).toBe(true);
    expect(result.storeInfo?.shop_name).toBe('My PrestaShop Store');
  });

  it('should return valid=true even when config fetch fails', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({}),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: async () => 'Forbidden',
      });
    
    const result = await validateCredentials({
      storeUrl: 'https://mystore.com',
      apiKey: 'valid-key',
    });
    
    expect(result.valid).toBe(true);
    expect(result.storeInfo?.shop_name).toBe('PrestaShop Store');
  });

  it('should return valid=false for invalid API key (401)', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
    });
    
    const result = await validateCredentials({
      storeUrl: 'https://mystore.com',
      apiKey: 'invalid-key',
    });
    
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid API key');
  });

  it('should return valid=false for permission denied (403)', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: async () => 'Forbidden',
    });
    
    const result = await validateCredentials({
      storeUrl: 'https://mystore.com',
      apiKey: 'limited-key',
    });
    
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Access denied');
  });

  it('should return valid=false for webservice not found (404)', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: async () => 'Not Found',
    });
    
    const result = await validateCredentials({
      storeUrl: 'https://mystore.com',
      apiKey: 'key',
    });
    
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Webservice not found');
  });

  it('should handle network errors', async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));
    
    const result = await validateCredentials({
      storeUrl: 'https://mystore.com',
      apiKey: 'valid-key',
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
      platform: 'prestashop',
      platformId: 'mystore.com',
      platformName: 'My PrestaShop Store',
      accessToken: 'api-key',
      refreshToken: 'https://mystore.com',
      syncStatus: 'pending',
    });
    
    const result = await saveConnection(
      'user-456',
      { storeUrl: 'https://mystore.com', apiKey: 'api-key' },
      'My PrestaShop Store'
    );
    
    expect(result.success).toBe(true);
    expect(result.connectionId).toBe('conn-123');
  });

  it('should update existing connection', async () => {
    (prisma.platformConnection.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: 'existing-conn',
      userId: 'user-456',
      platform: 'prestashop',
    });
    (prisma.platformConnection.update as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: 'existing-conn',
    });
    
    const result = await saveConnection(
      'user-456',
      { storeUrl: 'https://mystore.com', apiKey: 'new-api-key' }
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
      { storeUrl: 'https://mystore.com/', apiKey: 'key' }
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
      { storeUrl: 'mystore.com', apiKey: 'key' }
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
      { storeUrl: 'https://mystore.com', apiKey: 'key' }
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
      platform: 'prestashop',
      platformId: 'mystore.com',
      accessToken: 'api-key-123',
      refreshToken: 'https://mystore.com',
    });
    
    const result = await getCredentials('user-456', 'mystore.com');
    
    expect(result).toEqual({
      storeUrl: 'https://mystore.com',
      apiKey: 'api-key-123',
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
      platform: 'prestashop',
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
      platform: 'prestashop',
      platformId: 'mystore.com',
      accessToken: 'key',
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
    const mockOrders: PrestaShopOrder[] = [
      {
        id: '100',
        id_address_delivery: '15',
        id_address_invoice: '15',
        id_cart: '50',
        id_currency: '1',
        id_lang: '1',
        id_customer: '42',
        id_carrier: '2',
        current_state: '2',
        module: 'paypal',
        invoice_number: '',
        invoice_date: '',
        delivery_number: '',
        delivery_date: '',
        valid: '1',
        date_add: '2026-03-07 10:00:00',
        date_upd: '2026-03-07 10:05:00',
        shipping_number: '',
        reference: 'ABC123',
        payment: 'PayPal',
        total_discounts: '0',
        total_discounts_tax_incl: '0',
        total_discounts_tax_excl: '0',
        total_paid: '118.23',
        total_paid_tax_incl: '118.23',
        total_paid_tax_excl: '109.98',
        total_paid_real: '118.23',
        total_products: '99.98',
        total_products_wt: '108.23',
        total_shipping: '10.00',
        total_shipping_tax_incl: '10.00',
        total_shipping_tax_excl: '9.17',
        carrier_tax_rate: '8.25',
        conversion_rate: '1.000000',
      },
    ];
    
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ orders: mockOrders }),
    });
    
    const orders = await fetchOrders({
      storeUrl: 'https://mystore.com',
      apiKey: 'valid-key',
    });
    
    expect(orders).toHaveLength(1);
    expect(orders[0].id).toBe('100');
  });

  it('should handle nested order response format', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({
        orders: {
          order: [{ id: '101', reference: 'XYZ123' }],
        },
      }),
    });
    
    const orders = await fetchOrders({
      storeUrl: 'https://mystore.com',
      apiKey: 'valid-key',
    });
    
    expect(orders).toHaveLength(1);
    expect(orders[0].id).toBe('101');
  });

  it('should handle empty response', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({}),
    });
    
    const orders = await fetchOrders({
      storeUrl: 'https://mystore.com',
      apiKey: 'valid-key',
    });
    
    expect(orders).toHaveLength(0);
  });

  it('should handle date filters', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ orders: [] }),
    });
    
    await fetchOrders(
      { storeUrl: 'https://mystore.com', apiKey: 'key' },
      { dateFrom: '2026-03-01', dateTo: '2026-03-07' }
    );
    
    expect(global.fetch).toHaveBeenCalled();
    const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(fetchCall).toContain('filter');
  });

  it('should throw on API error', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    });
    
    await expect(fetchOrders({
      storeUrl: 'https://mystore.com',
      apiKey: 'valid-key',
    })).rejects.toThrow();
  });
});

// =============================================================================
// Individual Entity Fetch Tests
// =============================================================================

describe('fetchAddress', () => {
  const originalFetch = global.fetch;
  
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should fetch address successfully', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({
        address: {
          id: '15',
          city: 'Los Angeles',
          postcode: '90210',
          id_state: '12',
          id_country: '21',
        },
      }),
    });
    
    const address = await fetchAddress(
      { storeUrl: 'https://mystore.com', apiKey: 'key' },
      '15'
    );
    
    expect(address).not.toBeNull();
    expect(address?.city).toBe('Los Angeles');
  });

  it('should return null on error', async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));
    
    const address = await fetchAddress(
      { storeUrl: 'https://mystore.com', apiKey: 'key' },
      '15'
    );
    
    expect(address).toBeNull();
  });
});

describe('fetchState', () => {
  const originalFetch = global.fetch;
  
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should fetch state successfully', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({
        state: { id: '12', iso_code: 'CA', name: 'California' },
      }),
    });
    
    const state = await fetchState(
      { storeUrl: 'https://mystore.com', apiKey: 'key' },
      '12'
    );
    
    expect(state).not.toBeNull();
    expect(state?.iso_code).toBe('CA');
  });

  it('should return null on error', async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));
    
    const state = await fetchState(
      { storeUrl: 'https://mystore.com', apiKey: 'key' },
      '12'
    );
    
    expect(state).toBeNull();
  });
});

describe('fetchCountry', () => {
  const originalFetch = global.fetch;
  
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should fetch country successfully', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({
        country: { id: '21', iso_code: 'US', name: 'United States' },
      }),
    });
    
    const country = await fetchCountry(
      { storeUrl: 'https://mystore.com', apiKey: 'key' },
      '21'
    );
    
    expect(country).not.toBeNull();
    expect(country?.iso_code).toBe('US');
  });

  it('should return null on error', async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));
    
    const country = await fetchCountry(
      { storeUrl: 'https://mystore.com', apiKey: 'key' },
      '21'
    );
    
    expect(country).toBeNull();
  });
});

describe('fetchCustomer', () => {
  const originalFetch = global.fetch;
  
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should fetch customer successfully', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({
        customer: { id: '42', email: 'john@example.com', firstname: 'John', lastname: 'Doe' },
      }),
    });
    
    const customer = await fetchCustomer(
      { storeUrl: 'https://mystore.com', apiKey: 'key' },
      '42'
    );
    
    expect(customer).not.toBeNull();
    expect(customer?.email).toBe('john@example.com');
  });

  it('should return null on error', async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));
    
    const customer = await fetchCustomer(
      { storeUrl: 'https://mystore.com', apiKey: 'key' },
      '42'
    );
    
    expect(customer).toBeNull();
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
    await saveConnection('user', { storeUrl: 'https://store.com/', apiKey: 'k' });
    
    expect(prisma.platformConnection.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          refreshToken: 'https://store.com',
        }),
      })
    );
  });

  it('should handle URL without protocol', async () => {
    await saveConnection('user', { storeUrl: 'store.com', apiKey: 'k' });
    
    expect(prisma.platformConnection.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          refreshToken: 'https://store.com',
        }),
      })
    );
  });

  it('should preserve http protocol', async () => {
    await saveConnection('user', { storeUrl: 'http://local.store.com', apiKey: 'k' });
    
    expect(prisma.platformConnection.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          refreshToken: 'http://local.store.com',
        }),
      })
    );
  });

  it('should handle URL with whitespace', async () => {
    await saveConnection('user', { storeUrl: '  https://store.com  ', apiKey: 'k' });
    
    expect(prisma.platformConnection.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          refreshToken: 'https://store.com',
        }),
      })
    );
  });
});
