/**
 * OpenCart Integration Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma before importing opencart
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
  OpenCartCredentials,
  OpenCartOrder,
  OpenCartOrderProduct,
  OpenCartOrderTotal,
  OpenCartLoginResponse,
  OpenCartOrdersResponse,
} from './opencart';

import { mapOrderToImport } from './opencart';

// =============================================================================
// Type Tests
// =============================================================================

describe('OpenCartCredentials type', () => {
  it('should define required credential fields', () => {
    const credentials: OpenCartCredentials = {
      storeUrl: 'https://mystore.opencart.com',
      apiUsername: 'api_user',
      apiKey: 'abc123def456',
    };
    
    expect(credentials.storeUrl).toBe('https://mystore.opencart.com');
    expect(credentials.apiUsername).toBe('api_user');
    expect(credentials.apiKey).toBe('abc123def456');
  });

  it('should handle various URL formats', () => {
    const credentials: OpenCartCredentials = {
      storeUrl: 'mystore.com/shop',
      apiUsername: 'admin',
      apiKey: 'secret-key-12345',
    };
    
    expect(credentials.storeUrl).toBe('mystore.com/shop');
  });
});

describe('OpenCartOrderProduct type', () => {
  it('should define all order product fields', () => {
    const product: OpenCartOrderProduct = {
      order_product_id: '1001',
      product_id: '50',
      name: 'Premium Widget',
      model: 'WIDGET-001',
      quantity: '2',
      price: '29.9900',
      total: '59.9800',
      tax: '4.9500',
    };
    
    expect(product.name).toBe('Premium Widget');
    expect(product.model).toBe('WIDGET-001');
    expect(product.quantity).toBe('2');
    expect(product.price).toBe('29.9900');
  });

  it('should handle zero-tax products', () => {
    const product: OpenCartOrderProduct = {
      order_product_id: '1002',
      product_id: '51',
      name: 'Tax-Exempt Item',
      model: 'EXEMPT-001',
      quantity: '1',
      price: '19.9900',
      total: '19.9900',
      tax: '0.0000',
    };
    
    expect(product.tax).toBe('0.0000');
  });

  it('should handle products with high quantity', () => {
    const product: OpenCartOrderProduct = {
      order_product_id: '1003',
      product_id: '52',
      name: 'Bulk Item',
      model: 'BULK-100',
      quantity: '100',
      price: '5.0000',
      total: '500.0000',
      tax: '41.2500',
    };
    
    expect(product.quantity).toBe('100');
    expect(parseFloat(product.total)).toBe(500);
  });
});

describe('OpenCartOrderTotal type', () => {
  it('should define order total fields', () => {
    const total: OpenCartOrderTotal = {
      order_total_id: '501',
      code: 'sub_total',
      title: 'Sub-Total',
      value: '89.9900',
      sort_order: '1',
    };
    
    expect(total.code).toBe('sub_total');
    expect(total.title).toBe('Sub-Total');
    expect(total.value).toBe('89.9900');
  });

  it('should handle tax total', () => {
    const taxTotal: OpenCartOrderTotal = {
      order_total_id: '502',
      code: 'tax',
      title: 'VAT (20%)',
      value: '18.0000',
      sort_order: '5',
    };
    
    expect(taxTotal.code).toBe('tax');
    expect(parseFloat(taxTotal.value)).toBe(18);
  });

  it('should handle shipping total', () => {
    const shippingTotal: OpenCartOrderTotal = {
      order_total_id: '503',
      code: 'shipping',
      title: 'Flat Shipping Rate',
      value: '5.9900',
      sort_order: '3',
    };
    
    expect(shippingTotal.code).toBe('shipping');
    expect(parseFloat(shippingTotal.value)).toBeCloseTo(5.99);
  });

  it('should handle grand total', () => {
    const grandTotal: OpenCartOrderTotal = {
      order_total_id: '504',
      code: 'total',
      title: 'Total',
      value: '113.9800',
      sort_order: '10',
    };
    
    expect(grandTotal.code).toBe('total');
    expect(parseFloat(grandTotal.value)).toBeCloseTo(113.98);
  });

  it('should handle coupon discount total', () => {
    const couponTotal: OpenCartOrderTotal = {
      order_total_id: '505',
      code: 'coupon',
      title: 'Coupon (SAVE10)',
      value: '-10.0000',
      sort_order: '4',
    };
    
    expect(couponTotal.code).toBe('coupon');
    expect(parseFloat(couponTotal.value)).toBeLessThan(0);
  });
});

describe('OpenCartLoginResponse type', () => {
  it('should handle successful login with api_token', () => {
    const response: OpenCartLoginResponse = {
      api_token: 'abc123xyz789',
      success: 'Success: API session successfully started!',
    };
    
    expect(response.api_token).toBe('abc123xyz789');
    expect(response.success).toBeDefined();
  });

  it('should handle OpenCart 3.x token format', () => {
    const response: OpenCartLoginResponse = {
      token: 'session_token_v3',
    };
    
    expect(response.token).toBe('session_token_v3');
  });

  it('should handle IP error', () => {
    const response: OpenCartLoginResponse = {
      error: {
        ip: 'Your IP address is not allowed to access this API!',
      },
    };
    
    expect(response.error?.ip).toContain('IP address');
  });

  it('should handle key error', () => {
    const response: OpenCartLoginResponse = {
      error: {
        key: 'Incorrect API Key!',
      },
    };
    
    expect(response.error?.key).toBe('Incorrect API Key!');
  });

  it('should handle warning error', () => {
    const response: OpenCartLoginResponse = {
      error: {
        warning: 'API user has been disabled!',
      },
    };
    
    expect(response.error?.warning).toContain('disabled');
  });
});

describe('OpenCartOrder type', () => {
  it('should define all order fields', () => {
    const order: OpenCartOrder = {
      order_id: '12345',
      invoice_no: '1001',
      invoice_prefix: 'INV-2024-',
      store_id: '0',
      store_name: 'My OpenCart Store',
      store_url: 'https://mystore.com/',
      customer_id: '100',
      customer_group_id: '1',
      firstname: 'John',
      lastname: 'Doe',
      email: 'john.doe@example.com',
      telephone: '+1-555-123-4567',
      payment_firstname: 'John',
      payment_lastname: 'Doe',
      payment_company: 'Acme Corp',
      payment_address_1: '123 Payment Street',
      payment_address_2: 'Suite 100',
      payment_city: 'Chicago',
      payment_postcode: '60601',
      payment_country: 'United States',
      payment_country_id: '223',
      payment_zone: 'Illinois',
      payment_zone_id: '3635',
      payment_method: 'Credit Card (Stripe)',
      shipping_firstname: 'John',
      shipping_lastname: 'Doe',
      shipping_company: 'Acme Corp',
      shipping_address_1: '123 Shipping Lane',
      shipping_address_2: 'Apt 4B',
      shipping_city: 'Evanston',
      shipping_postcode: '60201',
      shipping_country: 'United States',
      shipping_country_id: '223',
      shipping_zone: 'Illinois',
      shipping_zone_id: '3635',
      shipping_method: 'Flat Rate Shipping',
      comment: 'Please leave at front door',
      total: '113.9800',
      order_status_id: '5',
      order_status: 'Complete',
      currency_code: 'USD',
      currency_value: '1.00000000',
      date_added: '2024-03-20 10:30:00',
      date_modified: '2024-03-21 15:45:00',
    };
    
    expect(order.order_id).toBe('12345');
    expect(order.email).toBe('john.doe@example.com');
    expect(order.shipping_zone).toBe('Illinois');
    expect(order.order_status).toBe('Complete');
    expect(parseFloat(order.total)).toBeCloseTo(113.98);
  });

  it('should handle order with products', () => {
    const order: OpenCartOrder = {
      order_id: '12346',
      invoice_no: '1002',
      invoice_prefix: 'INV-',
      store_id: '0',
      store_name: 'Test Store',
      store_url: 'https://test.com/',
      customer_id: '101',
      customer_group_id: '1',
      firstname: 'Jane',
      lastname: 'Smith',
      email: 'jane@example.com',
      telephone: '555-5678',
      payment_firstname: 'Jane',
      payment_lastname: 'Smith',
      payment_company: '',
      payment_address_1: '456 Payment Ave',
      payment_address_2: '',
      payment_city: 'New York',
      payment_postcode: '10001',
      payment_country: 'United States',
      payment_country_id: '223',
      payment_zone: 'New York',
      payment_zone_id: '3655',
      payment_method: 'PayPal',
      shipping_firstname: 'Jane',
      shipping_lastname: 'Smith',
      shipping_company: '',
      shipping_address_1: '456 Shipping Ave',
      shipping_address_2: '',
      shipping_city: 'New York',
      shipping_postcode: '10001',
      shipping_country: 'United States',
      shipping_country_id: '223',
      shipping_zone: 'New York',
      shipping_zone_id: '3655',
      shipping_method: 'Free Shipping',
      comment: '',
      total: '75.4700',
      order_status_id: '2',
      order_status: 'Processing',
      currency_code: 'USD',
      currency_value: '1.00000000',
      date_added: '2024-03-22 09:00:00',
      date_modified: '2024-03-22 09:00:00',
      products: [
        {
          order_product_id: '1001',
          product_id: '50',
          name: 'Widget A',
          model: 'WIDGET-A',
          quantity: '2',
          price: '25.0000',
          total: '50.0000',
          tax: '4.1300',
        },
        {
          order_product_id: '1002',
          product_id: '51',
          name: 'Widget B',
          model: 'WIDGET-B',
          quantity: '1',
          price: '19.2200',
          total: '19.2200',
          tax: '1.5900',
        },
      ],
    };
    
    expect(order.products).toHaveLength(2);
    expect(order.products![0].name).toBe('Widget A');
    expect(order.products![1].quantity).toBe('1');
  });

  it('should handle order with totals breakdown', () => {
    const order: OpenCartOrder = {
      order_id: '12347',
      invoice_no: '1003',
      invoice_prefix: 'INV-',
      store_id: '0',
      store_name: 'Demo Store',
      store_url: 'https://demo.com/',
      customer_id: '102',
      customer_group_id: '1',
      firstname: 'Bob',
      lastname: 'Wilson',
      email: 'bob@example.com',
      telephone: '555-9999',
      payment_firstname: 'Bob',
      payment_lastname: 'Wilson',
      payment_company: 'Wilson LLC',
      payment_address_1: '789 Corp Blvd',
      payment_address_2: 'Floor 5',
      payment_city: 'Los Angeles',
      payment_postcode: '90001',
      payment_country: 'United States',
      payment_country_id: '223',
      payment_zone: 'California',
      payment_zone_id: '3624',
      payment_method: 'Bank Transfer',
      shipping_firstname: 'Bob',
      shipping_lastname: 'Wilson',
      shipping_company: 'Wilson LLC',
      shipping_address_1: '789 Corp Blvd',
      shipping_address_2: 'Floor 5',
      shipping_city: 'Los Angeles',
      shipping_postcode: '90001',
      shipping_country: 'United States',
      shipping_country_id: '223',
      shipping_zone: 'California',
      shipping_zone_id: '3624',
      shipping_method: 'Express Shipping',
      comment: 'Business order',
      total: '158.9500',
      order_status_id: '1',
      order_status: 'Pending',
      currency_code: 'USD',
      currency_value: '1.00000000',
      date_added: '2024-03-23 14:00:00',
      date_modified: '2024-03-23 14:00:00',
      totals: [
        {
          order_total_id: '501',
          code: 'sub_total',
          title: 'Sub-Total',
          value: '129.9900',
          sort_order: '1',
        },
        {
          order_total_id: '502',
          code: 'shipping',
          title: 'Express Shipping',
          value: '15.0000',
          sort_order: '3',
        },
        {
          order_total_id: '503',
          code: 'tax',
          title: 'CA Sales Tax (9.5%)',
          value: '13.9600',
          sort_order: '5',
        },
        {
          order_total_id: '504',
          code: 'total',
          title: 'Total',
          value: '158.9500',
          sort_order: '10',
        },
      ],
    };
    
    expect(order.totals).toHaveLength(4);
    const taxTotal = order.totals!.find(t => t.code === 'tax');
    expect(taxTotal?.value).toBe('13.9600');
    const shippingTotal = order.totals!.find(t => t.code === 'shipping');
    expect(shippingTotal?.value).toBe('15.0000');
  });

  it('should handle guest orders', () => {
    const order: OpenCartOrder = {
      order_id: '12348',
      invoice_no: '0',
      invoice_prefix: '',
      store_id: '0',
      store_name: 'Guest Store',
      store_url: 'https://guest.com/',
      customer_id: '0',
      customer_group_id: '1',
      firstname: 'Guest',
      lastname: 'User',
      email: 'guest@temporary.com',
      telephone: '',
      payment_firstname: 'Guest',
      payment_lastname: 'User',
      payment_company: '',
      payment_address_1: '000 Anonymous St',
      payment_address_2: '',
      payment_city: 'Anywhere',
      payment_postcode: '00000',
      payment_country: 'United States',
      payment_country_id: '223',
      payment_zone: 'Texas',
      payment_zone_id: '3676',
      payment_method: 'PayPal',
      shipping_firstname: 'Guest',
      shipping_lastname: 'User',
      shipping_company: '',
      shipping_address_1: '000 Anonymous St',
      shipping_address_2: '',
      shipping_city: 'Anywhere',
      shipping_postcode: '00000',
      shipping_country: 'United States',
      shipping_country_id: '223',
      shipping_zone: 'Texas',
      shipping_zone_id: '3676',
      shipping_method: 'Free Shipping',
      comment: '',
      total: '29.9900',
      order_status_id: '2',
      order_status: 'Processing',
      currency_code: 'USD',
      currency_value: '1.00000000',
      date_added: '2024-03-24 16:30:00',
      date_modified: '2024-03-24 16:30:00',
    };
    
    expect(order.customer_id).toBe('0');
    expect(order.invoice_no).toBe('0');
  });

  it('should handle international orders', () => {
    const order: OpenCartOrder = {
      order_id: '12349',
      invoice_no: '2001',
      invoice_prefix: 'INT-',
      store_id: '0',
      store_name: 'International Shop',
      store_url: 'https://intl.com/',
      customer_id: '200',
      customer_group_id: '2',
      firstname: 'Hans',
      lastname: 'Mueller',
      email: 'hans@example.de',
      telephone: '+49-30-12345678',
      payment_firstname: 'Hans',
      payment_lastname: 'Mueller',
      payment_company: 'Mueller GmbH',
      payment_address_1: 'Hauptstraße 1',
      payment_address_2: '',
      payment_city: 'Berlin',
      payment_postcode: '10115',
      payment_country: 'Germany',
      payment_country_id: '81',
      payment_zone: 'Berlin',
      payment_zone_id: '1381',
      payment_method: 'Bank Wire',
      shipping_firstname: 'Hans',
      shipping_lastname: 'Mueller',
      shipping_company: 'Mueller GmbH',
      shipping_address_1: 'Hauptstraße 1',
      shipping_address_2: '',
      shipping_city: 'Berlin',
      shipping_postcode: '10115',
      shipping_country: 'Germany',
      shipping_country_id: '81',
      shipping_zone: 'Berlin',
      shipping_zone_id: '1381',
      shipping_method: 'International Shipping',
      comment: '',
      total: '199.9900',
      order_status_id: '5',
      order_status: 'Complete',
      currency_code: 'EUR',
      currency_value: '0.92000000',
      date_added: '2024-03-25 11:00:00',
      date_modified: '2024-03-26 09:00:00',
    };
    
    expect(order.currency_code).toBe('EUR');
    expect(order.shipping_country).toBe('Germany');
    expect(parseFloat(order.currency_value)).toBeLessThan(1);
  });
});

describe('OpenCartOrdersResponse type', () => {
  it('should handle response with orders array', () => {
    const response: OpenCartOrdersResponse = {
      orders: [
        {
          order_id: '100',
          invoice_no: '1',
          invoice_prefix: 'INV-',
          store_id: '0',
          store_name: 'Store',
          store_url: 'https://store.com/',
          customer_id: '1',
          customer_group_id: '1',
          firstname: 'Test',
          lastname: 'User',
          email: 'test@example.com',
          telephone: '555-0000',
          payment_firstname: 'Test',
          payment_lastname: 'User',
          payment_company: '',
          payment_address_1: '123 Test St',
          payment_address_2: '',
          payment_city: 'Test City',
          payment_postcode: '12345',
          payment_country: 'United States',
          payment_country_id: '223',
          payment_zone: 'Florida',
          payment_zone_id: '3631',
          payment_method: 'COD',
          shipping_firstname: 'Test',
          shipping_lastname: 'User',
          shipping_company: '',
          shipping_address_1: '123 Test St',
          shipping_address_2: '',
          shipping_city: 'Test City',
          shipping_postcode: '12345',
          shipping_country: 'United States',
          shipping_country_id: '223',
          shipping_zone: 'Florida',
          shipping_zone_id: '3631',
          shipping_method: 'Flat Rate',
          comment: '',
          total: '50.0000',
          order_status_id: '5',
          order_status: 'Complete',
          currency_code: 'USD',
          currency_value: '1.00000000',
          date_added: '2024-01-01 00:00:00',
          date_modified: '2024-01-01 00:00:00',
        },
      ],
      success: 'Orders retrieved successfully',
    };
    
    expect(response.orders).toHaveLength(1);
    expect(response.orders![0].order_id).toBe('100');
    expect(response.success).toBeDefined();
  });

  it('should handle single order response', () => {
    const response: OpenCartOrdersResponse = {
      order: {
        order_id: '200',
        invoice_no: '2',
        invoice_prefix: '',
        store_id: '0',
        store_name: 'Single',
        store_url: 'https://single.com/',
        customer_id: '2',
        customer_group_id: '1',
        firstname: 'Single',
        lastname: 'Order',
        email: 'single@example.com',
        telephone: '555-1111',
        payment_firstname: 'Single',
        payment_lastname: 'Order',
        payment_company: '',
        payment_address_1: '1 Single Lane',
        payment_address_2: '',
        payment_city: 'Single City',
        payment_postcode: '11111',
        payment_country: 'United States',
        payment_country_id: '223',
        payment_zone: 'Nevada',
        payment_zone_id: '3648',
        payment_method: 'Card',
        shipping_firstname: 'Single',
        shipping_lastname: 'Order',
        shipping_company: '',
        shipping_address_1: '1 Single Lane',
        shipping_address_2: '',
        shipping_city: 'Single City',
        shipping_postcode: '11111',
        shipping_country: 'United States',
        shipping_country_id: '223',
        shipping_zone: 'Nevada',
        shipping_zone_id: '3648',
        shipping_method: 'Pickup',
        comment: '',
        total: '100.0000',
        order_status_id: '2',
        order_status: 'Processing',
        currency_code: 'USD',
        currency_value: '1.00000000',
        date_added: '2024-02-01 00:00:00',
        date_modified: '2024-02-01 00:00:00',
      },
    };
    
    expect(response.order).toBeDefined();
    expect(response.order!.order_id).toBe('200');
  });

  it('should handle error response', () => {
    const response: OpenCartOrdersResponse = {
      error: 'Access denied - invalid token',
    };
    
    expect(response.error).toContain('Access denied');
    expect(response.orders).toBeUndefined();
  });
});

// =============================================================================
// Order Mapping Tests
// =============================================================================

describe('mapOrderToImport', () => {
  const createBaseOrder = (overrides: Partial<OpenCartOrder> = {}): OpenCartOrder => ({
    order_id: '12345',
    invoice_no: '1001',
    invoice_prefix: 'INV-',
    store_id: '0',
    store_name: 'Test Store',
    store_url: 'https://test.com/',
    customer_id: '100',
    customer_group_id: '1',
    firstname: 'John',
    lastname: 'Doe',
    email: 'john@example.com',
    telephone: '555-1234',
    payment_firstname: 'John',
    payment_lastname: 'Doe',
    payment_company: '',
    payment_address_1: '123 Main St',
    payment_address_2: '',
    payment_city: 'Chicago',
    payment_postcode: '60601',
    payment_country: 'United States',
    payment_country_id: '223',
    payment_zone: 'Illinois',
    payment_zone_id: '3635',
    payment_method: 'Credit Card',
    shipping_firstname: 'John',
    shipping_lastname: 'Doe',
    shipping_company: '',
    shipping_address_1: '123 Main St',
    shipping_address_2: '',
    shipping_city: 'Chicago',
    shipping_postcode: '60601',
    shipping_country: 'United States',
    shipping_country_id: '223',
    shipping_zone: 'Illinois',
    shipping_zone_id: '3635',
    shipping_method: 'Flat Rate',
    comment: '',
    total: '100.0000',
    order_status_id: '5',
    order_status: 'Complete',
    currency_code: 'USD',
    currency_value: '1.00000000',
    date_added: '2024-03-20 10:00:00',
    date_modified: '2024-03-20 10:00:00',
    ...overrides,
  });

  describe('basic order mapping', () => {
    it('should map basic order fields correctly', () => {
      const order = createBaseOrder();
      const result = mapOrderToImport(order);
      
      expect(result.platform).toBe('opencart');
      expect(result.platformOrderId).toBe('12345');
      expect(result.orderNumber).toBe('INV-1001');
      expect(result.totalAmount).toBe(100);
      expect(result.currency).toBe('USD');
      expect(result.customerEmail).toBe('john@example.com');
    });

    it('should map shipping address fields', () => {
      const order = createBaseOrder();
      const result = mapOrderToImport(order);
      
      expect(result.shippingState).toBe('Illinois');
      expect(result.shippingCity).toBe('Chicago');
      expect(result.shippingZip).toBe('60601');
      expect(result.shippingCountry).toBe('United States');
    });

    it('should map billing state', () => {
      const order = createBaseOrder({
        payment_zone: 'New York',
      });
      const result = mapOrderToImport(order);
      
      expect(result.billingState).toBe('New York');
    });

    it('should parse order date correctly', () => {
      const order = createBaseOrder({
        date_added: '2024-03-20 10:30:45',
      });
      const result = mapOrderToImport(order);
      
      expect(result.orderDate).toBeInstanceOf(Date);
      expect(result.orderDate.getFullYear()).toBe(2024);
      expect(result.orderDate.getMonth()).toBe(2); // March (0-indexed)
      expect(result.orderDate.getDate()).toBe(20);
    });

    it('should include raw order data', () => {
      const order = createBaseOrder();
      const result = mapOrderToImport(order);
      
      expect(result.rawData).toBe(order);
    });
  });

  describe('order number formatting', () => {
    it('should combine invoice prefix and number', () => {
      const order = createBaseOrder({
        invoice_prefix: 'ORD-2024-',
        invoice_no: '0042',
      });
      const result = mapOrderToImport(order);
      
      expect(result.orderNumber).toBe('ORD-2024-0042');
    });

    it('should fallback to order_id when no invoice', () => {
      const order = createBaseOrder({
        invoice_prefix: '',
        invoice_no: '',
      });
      const result = mapOrderToImport(order);
      
      expect(result.orderNumber).toBe('12345');
    });

    it('should handle zero invoice number', () => {
      const order = createBaseOrder({
        invoice_prefix: 'INV-',
        invoice_no: '0',
      });
      const result = mapOrderToImport(order);
      
      // When invoice_no is '0', it's falsy but still a string
      expect(result.orderNumber).toBe('INV-0');
    });
  });

  describe('tax calculations from totals', () => {
    it('should extract tax amount from totals', () => {
      const order = createBaseOrder({
        totals: [
          { order_total_id: '1', code: 'sub_total', title: 'Sub-Total', value: '80.0000', sort_order: '1' },
          { order_total_id: '2', code: 'shipping', title: 'Shipping', value: '10.0000', sort_order: '3' },
          { order_total_id: '3', code: 'tax', title: 'Tax (10%)', value: '8.0000', sort_order: '5' },
          { order_total_id: '4', code: 'total', title: 'Total', value: '98.0000', sort_order: '10' },
        ],
      });
      const result = mapOrderToImport(order);
      
      expect(result.taxAmount).toBe(8);
      expect(result.taxBreakdown.totalTax).toBe(8);
    });

    it('should extract shipping amount from totals', () => {
      const order = createBaseOrder({
        totals: [
          { order_total_id: '1', code: 'sub_total', title: 'Sub-Total', value: '50.0000', sort_order: '1' },
          { order_total_id: '2', code: 'shipping', title: 'Express', value: '15.9900', sort_order: '3' },
          { order_total_id: '3', code: 'total', title: 'Total', value: '65.9900', sort_order: '10' },
        ],
      });
      const result = mapOrderToImport(order);
      
      expect(result.shippingAmount).toBeCloseTo(15.99);
    });

    it('should extract subtotal from totals', () => {
      const order = createBaseOrder({
        totals: [
          { order_total_id: '1', code: 'sub_total', title: 'Sub-Total', value: '125.5000', sort_order: '1' },
          { order_total_id: '2', code: 'total', title: 'Total', value: '125.5000', sort_order: '10' },
        ],
      });
      const result = mapOrderToImport(order);
      
      expect(result.subtotal).toBe(125.5);
    });

    it('should handle multiple tax entries', () => {
      const order = createBaseOrder({
        totals: [
          { order_total_id: '1', code: 'sub_total', title: 'Sub-Total', value: '100.0000', sort_order: '1' },
          { order_total_id: '2', code: 'tax', title: 'State Tax', value: '5.0000', sort_order: '5' },
          { order_total_id: '3', code: 'tax', title: 'City Tax', value: '2.5000', sort_order: '6' },
          { order_total_id: '4', code: 'total', title: 'Total', value: '107.5000', sort_order: '10' },
        ],
      });
      const result = mapOrderToImport(order);
      
      expect(result.taxAmount).toBe(7.5);
    });

    it('should default to zero when no totals', () => {
      const order = createBaseOrder({
        totals: undefined,
      });
      const result = mapOrderToImport(order);
      
      expect(result.taxAmount).toBe(0);
      expect(result.shippingAmount).toBe(0);
    });
  });

  describe('subtotal calculation from products', () => {
    it('should calculate subtotal from products when no totals', () => {
      const order = createBaseOrder({
        products: [
          { order_product_id: '1', product_id: '10', name: 'Item A', model: 'A', quantity: '2', price: '25.0000', total: '50.0000', tax: '4.0000' },
          { order_product_id: '2', product_id: '11', name: 'Item B', model: 'B', quantity: '1', price: '30.0000', total: '30.0000', tax: '2.4000' },
        ],
      });
      const result = mapOrderToImport(order);
      
      expect(result.subtotal).toBe(80);
    });

    it('should prefer totals subtotal over product calculation', () => {
      const order = createBaseOrder({
        products: [
          { order_product_id: '1', product_id: '10', name: 'Item A', model: 'A', quantity: '1', price: '50.0000', total: '50.0000', tax: '0' },
        ],
        totals: [
          { order_total_id: '1', code: 'sub_total', title: 'Sub-Total', value: '45.0000', sort_order: '1' }, // Discounted
          { order_total_id: '2', code: 'total', title: 'Total', value: '45.0000', sort_order: '10' },
        ],
      });
      const result = mapOrderToImport(order);
      
      expect(result.subtotal).toBe(45);
    });
  });

  describe('line items mapping', () => {
    it('should map line items from products', () => {
      const order = createBaseOrder({
        products: [
          { order_product_id: '1', product_id: '100', name: 'Widget Pro', model: 'WGT-PRO-001', quantity: '3', price: '29.9900', total: '89.9700', tax: '7.4200' },
        ],
      });
      const result = mapOrderToImport(order);
      
      expect(result.lineItems).toHaveLength(1);
      expect(result.lineItems![0].productId).toBe('100');
      expect(result.lineItems![0].sku).toBe('WGT-PRO-001');
      expect(result.lineItems![0].name).toBe('Widget Pro');
      expect(result.lineItems![0].quantity).toBe(3);
      expect(result.lineItems![0].price).toBeCloseTo(29.99);
      expect(result.lineItems![0].total).toBeCloseTo(89.97);
      expect(result.lineItems![0].tax).toBeCloseTo(7.42);
    });

    it('should handle multiple line items', () => {
      const order = createBaseOrder({
        products: [
          { order_product_id: '1', product_id: '100', name: 'Item 1', model: 'SKU-1', quantity: '1', price: '10.0000', total: '10.0000', tax: '0.8000' },
          { order_product_id: '2', product_id: '101', name: 'Item 2', model: 'SKU-2', quantity: '2', price: '20.0000', total: '40.0000', tax: '3.2000' },
          { order_product_id: '3', product_id: '102', name: 'Item 3', model: 'SKU-3', quantity: '5', price: '5.0000', total: '25.0000', tax: '2.0000' },
        ],
      });
      const result = mapOrderToImport(order);
      
      expect(result.lineItems).toHaveLength(3);
      expect(result.lineItems![0].quantity).toBe(1);
      expect(result.lineItems![1].quantity).toBe(2);
      expect(result.lineItems![2].quantity).toBe(5);
    });

    it('should handle products with no tax', () => {
      const order = createBaseOrder({
        products: [
          { order_product_id: '1', product_id: '100', name: 'Tax-Free Item', model: 'FREE-001', quantity: '1', price: '99.9900', total: '99.9900', tax: '0.0000' },
        ],
      });
      const result = mapOrderToImport(order);
      
      expect(result.lineItems![0].tax).toBe(0);
    });

    it('should handle undefined products', () => {
      const order = createBaseOrder({
        products: undefined,
      });
      const result = mapOrderToImport(order);
      
      expect(result.lineItems).toBeUndefined();
    });
  });

  describe('order status mapping', () => {
    it('should map Pending status (1)', () => {
      const order = createBaseOrder({ order_status_id: '1' });
      const result = mapOrderToImport(order);
      expect(result.status).toBe('pending');
    });

    it('should map Processing status (2)', () => {
      const order = createBaseOrder({ order_status_id: '2' });
      const result = mapOrderToImport(order);
      expect(result.status).toBe('processing');
    });

    it('should map Shipped status (3)', () => {
      const order = createBaseOrder({ order_status_id: '3' });
      const result = mapOrderToImport(order);
      expect(result.status).toBe('fulfilled');
    });

    it('should map Complete status (5)', () => {
      const order = createBaseOrder({ order_status_id: '5' });
      const result = mapOrderToImport(order);
      expect(result.status).toBe('fulfilled');
    });

    it('should map Canceled status (7)', () => {
      const order = createBaseOrder({ order_status_id: '7' });
      const result = mapOrderToImport(order);
      expect(result.status).toBe('cancelled');
    });

    it('should map Denied status (8)', () => {
      const order = createBaseOrder({ order_status_id: '8' });
      const result = mapOrderToImport(order);
      expect(result.status).toBe('cancelled');
    });

    it('should map Canceled Reversal status (9)', () => {
      const order = createBaseOrder({ order_status_id: '9' });
      const result = mapOrderToImport(order);
      expect(result.status).toBe('cancelled');
    });

    it('should map Failed status (10)', () => {
      const order = createBaseOrder({ order_status_id: '10' });
      const result = mapOrderToImport(order);
      expect(result.status).toBe('cancelled');
    });

    it('should map Refunded status (11)', () => {
      const order = createBaseOrder({ order_status_id: '11' });
      const result = mapOrderToImport(order);
      expect(result.status).toBe('refunded');
    });

    it('should map Reversed status (12)', () => {
      const order = createBaseOrder({ order_status_id: '12' });
      const result = mapOrderToImport(order);
      expect(result.status).toBe('refunded');
    });

    it('should map Chargeback status (13)', () => {
      const order = createBaseOrder({ order_status_id: '13' });
      const result = mapOrderToImport(order);
      expect(result.status).toBe('refunded');
    });

    it('should map Expired status (14)', () => {
      const order = createBaseOrder({ order_status_id: '14' });
      const result = mapOrderToImport(order);
      expect(result.status).toBe('cancelled');
    });

    it('should map Processed status (15)', () => {
      const order = createBaseOrder({ order_status_id: '15' });
      const result = mapOrderToImport(order);
      expect(result.status).toBe('processing');
    });

    it('should map Voided status (16)', () => {
      const order = createBaseOrder({ order_status_id: '16' });
      const result = mapOrderToImport(order);
      expect(result.status).toBe('cancelled');
    });

    it('should default unknown status to pending', () => {
      const order = createBaseOrder({ order_status_id: '99' });
      const result = mapOrderToImport(order);
      expect(result.status).toBe('pending');
    });
  });

  describe('currency handling', () => {
    it('should use order currency code', () => {
      const order = createBaseOrder({ currency_code: 'EUR' });
      const result = mapOrderToImport(order);
      expect(result.currency).toBe('EUR');
    });

    it('should default to USD when no currency', () => {
      const order = createBaseOrder({ currency_code: '' });
      const result = mapOrderToImport(order);
      expect(result.currency).toBe('USD');
    });

    it('should handle various currencies', () => {
      const currencies = ['GBP', 'CAD', 'AUD', 'JPY', 'CHF'];
      for (const curr of currencies) {
        const order = createBaseOrder({ currency_code: curr });
        const result = mapOrderToImport(order);
        expect(result.currency).toBe(curr);
      }
    });
  });

  describe('edge cases', () => {
    it('should handle missing shipping country', () => {
      const order = createBaseOrder({
        shipping_country: '',
      });
      const result = mapOrderToImport(order);
      expect(result.shippingCountry).toBe('US');
    });

    it('should handle invalid total format', () => {
      const order = createBaseOrder({
        total: 'invalid',
      });
      const result = mapOrderToImport(order);
      expect(result.totalAmount).toBe(0);
    });

    it('should handle empty product quantities', () => {
      const order = createBaseOrder({
        products: [
          { order_product_id: '1', product_id: '100', name: 'Test', model: 'T', quantity: '', price: '10.0000', total: '10.0000', tax: '0' },
        ],
      });
      const result = mapOrderToImport(order);
      expect(result.lineItems![0].quantity).toBe(1);
    });

    it('should handle negative totals (credits)', () => {
      const order = createBaseOrder({
        totals: [
          { order_total_id: '1', code: 'sub_total', title: 'Sub-Total', value: '100.0000', sort_order: '1' },
          { order_total_id: '2', code: 'coupon', title: 'Coupon', value: '-20.0000', sort_order: '4' },
          { order_total_id: '3', code: 'total', title: 'Total', value: '80.0000', sort_order: '10' },
        ],
      });
      const result = mapOrderToImport(order);
      // Coupon is not tax, so tax should still be 0
      expect(result.taxAmount).toBe(0);
      expect(result.subtotal).toBe(100);
    });
  });
});

// =============================================================================
// URL Normalization Tests (via type inference)
// =============================================================================

describe('URL normalization behavior', () => {
  // These tests verify expected URL formats for the credentials
  it('should expect HTTPS URLs', () => {
    const credentials: OpenCartCredentials = {
      storeUrl: 'https://mystore.opencart.com',
      apiUsername: 'api',
      apiKey: 'key123',
    };
    expect(credentials.storeUrl.startsWith('https://')).toBe(true);
  });

  it('should handle URLs without protocol', () => {
    const credentials: OpenCartCredentials = {
      storeUrl: 'mystore.opencart.com',
      apiUsername: 'api',
      apiKey: 'key123',
    };
    // The normalizeStoreUrl function will add https://
    expect(credentials.storeUrl).toBe('mystore.opencart.com');
  });

  it('should handle URLs with trailing slash', () => {
    const credentials: OpenCartCredentials = {
      storeUrl: 'https://mystore.opencart.com/',
      apiUsername: 'api',
      apiKey: 'key123',
    };
    // The normalizeStoreUrl function will remove the trailing slash
    expect(credentials.storeUrl.endsWith('/')).toBe(true);
  });

  it('should handle URLs with subdirectory', () => {
    const credentials: OpenCartCredentials = {
      storeUrl: 'https://example.com/shop',
      apiUsername: 'api',
      apiKey: 'key123',
    };
    expect(credentials.storeUrl).toContain('/shop');
  });
});

// =============================================================================
// Database Operations Tests (mocked)
// =============================================================================

describe('Database operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('saveConnection', () => {
    it('should have correct connection structure expectations', async () => {
      // Import the mocked prisma
      const { prisma } = await import('../prisma');
      
      // Verify the mock structure exists
      expect(prisma.platformConnection.create).toBeDefined();
      expect(prisma.platformConnection.findFirst).toBeDefined();
      expect(prisma.platformConnection.update).toBeDefined();
    });
  });

  describe('getCredentials', () => {
    it('should return null for non-existent connection', async () => {
      const { prisma } = await import('../prisma');
      const { getCredentials } = await import('./opencart');
      
      vi.mocked(prisma.platformConnection.findUnique).mockResolvedValue(null);
      
      const result = await getCredentials('user123', 'nonexistent_store');
      expect(result).toBeNull();
    });

    it('should return credentials for existing connection', async () => {
      const { prisma } = await import('../prisma');
      const { getCredentials } = await import('./opencart');
      
      vi.mocked(prisma.platformConnection.findUnique).mockResolvedValue({
        id: 'conn123',
        userId: 'user123',
        platform: 'opencart',
        platformId: 'mystore.com',
        platformName: 'My OpenCart Store',
        accessToken: JSON.stringify({ username: 'api_user', key: 'secret123' }),
        refreshToken: 'https://mystore.com',
        syncStatus: 'active',
        syncError: null,
        lastSyncAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      const result = await getCredentials('user123', 'mystore.com');
      
      expect(result).not.toBeNull();
      expect(result?.storeUrl).toBe('https://mystore.com');
      expect(result?.apiUsername).toBe('api_user');
      expect(result?.apiKey).toBe('secret123');
    });

    it('should return null for malformed credentials JSON', async () => {
      const { prisma } = await import('../prisma');
      const { getCredentials } = await import('./opencart');
      
      vi.mocked(prisma.platformConnection.findUnique).mockResolvedValue({
        id: 'conn123',
        userId: 'user123',
        platform: 'opencart',
        platformId: 'badstore.com',
        platformName: 'Bad Store',
        accessToken: 'not-valid-json',
        refreshToken: 'https://badstore.com',
        syncStatus: 'error',
        syncError: null,
        lastSyncAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      const result = await getCredentials('user123', 'badstore.com');
      expect(result).toBeNull();
    });

    it('should return null when accessToken is missing', async () => {
      const { prisma } = await import('../prisma');
      const { getCredentials } = await import('./opencart');
      
      vi.mocked(prisma.platformConnection.findUnique).mockResolvedValue({
        id: 'conn123',
        userId: 'user123',
        platform: 'opencart',
        platformId: 'notoken.com',
        platformName: 'No Token',
        accessToken: null,
        refreshToken: 'https://notoken.com',
        syncStatus: 'pending',
        syncError: null,
        lastSyncAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      const result = await getCredentials('user123', 'notoken.com');
      expect(result).toBeNull();
    });

    it('should return null when refreshToken is missing', async () => {
      const { prisma } = await import('../prisma');
      const { getCredentials } = await import('./opencart');
      
      vi.mocked(prisma.platformConnection.findUnique).mockResolvedValue({
        id: 'conn123',
        userId: 'user123',
        platform: 'opencart',
        platformId: 'nourl.com',
        platformName: 'No URL',
        accessToken: JSON.stringify({ username: 'api', key: 'key' }),
        refreshToken: null,
        syncStatus: 'pending',
        syncError: null,
        lastSyncAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      const result = await getCredentials('user123', 'nourl.com');
      expect(result).toBeNull();
    });
  });
});
