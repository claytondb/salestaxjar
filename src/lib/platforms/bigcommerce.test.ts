/**
 * BigCommerce Integration Tests
 */

import { describe, it, expect, vi } from 'vitest';

// Mock prisma before importing bigcommerce
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
  BigCommerceCredentials,
  BigCommerceOrder,
  BigCommerceAddress,
  BigCommerceOrderProduct,
  BigCommerceShippingAddress,
  BigCommerceStoreInfo,
} from './bigcommerce';

import { mapOrderToImport } from './bigcommerce';

// =============================================================================
// Type Tests
// =============================================================================

describe('BigCommerceCredentials type', () => {
  it('should define required credential fields', () => {
    const credentials: BigCommerceCredentials = {
      storeHash: 'abc123xyz',
      accessToken: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9...',
    };
    
    expect(credentials.storeHash).toBe('abc123xyz');
    expect(credentials.accessToken).toContain('eyJ');
  });

  it('should require both storeHash and accessToken', () => {
    // This is a compile-time check - verifying structure
    const credentials: BigCommerceCredentials = {
      storeHash: 'store-hash',
      accessToken: 'access-token',
    };
    
    expect(credentials.storeHash).toBeTruthy();
    expect(credentials.accessToken).toBeTruthy();
  });
});

describe('BigCommerceAddress type', () => {
  it('should define all address fields', () => {
    const address: BigCommerceAddress = {
      first_name: 'John',
      last_name: 'Doe',
      company: 'Acme Inc',
      street_1: '123 Main Street',
      street_2: 'Suite 456',
      city: 'Los Angeles',
      state: 'California',
      zip: '90210',
      country: 'United States',
      country_iso2: 'US',
      phone: '555-123-4567',
      email: 'john@example.com',
    };
    
    expect(address.first_name).toBe('John');
    expect(address.state).toBe('California');
    expect(address.country_iso2).toBe('US');
    expect(address.zip).toBe('90210');
  });

  it('should handle empty optional fields', () => {
    const address: BigCommerceAddress = {
      first_name: 'Jane',
      last_name: 'Smith',
      company: '',
      street_1: '456 Oak Ave',
      street_2: '',
      city: 'Chicago',
      state: 'Illinois',
      zip: '60601',
      country: 'United States',
      country_iso2: 'US',
      phone: '',
      email: 'jane@example.com',
    };
    
    expect(address.company).toBe('');
    expect(address.street_2).toBe('');
  });
});

describe('BigCommerceOrderProduct type', () => {
  it('should define product fields', () => {
    const product: BigCommerceOrderProduct = {
      id: 1001,
      order_id: 5001,
      product_id: 2001,
      name: 'Premium Widget',
      sku: 'WIDGET-PRO-001',
      quantity: 3,
      price_inc_tax: '32.99',
      price_ex_tax: '29.99',
      total_inc_tax: '98.97',
      total_ex_tax: '89.97',
    };
    
    expect(product.name).toBe('Premium Widget');
    expect(product.quantity).toBe(3);
    expect(parseFloat(product.price_ex_tax)).toBe(29.99);
  });

  it('should handle price calculations', () => {
    const product: BigCommerceOrderProduct = {
      id: 1,
      order_id: 100,
      product_id: 50,
      name: 'Test Product',
      sku: 'TEST-001',
      quantity: 2,
      price_inc_tax: '54.49',
      price_ex_tax: '49.99',
      total_inc_tax: '108.98',
      total_ex_tax: '99.98',
    };
    
    // Verify total is price * quantity
    const expectedTotal = parseFloat(product.price_ex_tax) * product.quantity;
    expect(parseFloat(product.total_ex_tax)).toBeCloseTo(expectedTotal, 2);
  });
});

describe('BigCommerceOrder type', () => {
  const sampleBillingAddress: BigCommerceAddress = {
    first_name: 'John',
    last_name: 'Buyer',
    company: '',
    street_1: '123 Purchase Lane',
    street_2: '',
    city: 'Austin',
    state: 'Texas',
    zip: '78701',
    country: 'United States',
    country_iso2: 'US',
    phone: '512-555-0100',
    email: 'buyer@example.com',
  };

  it('should define all order fields', () => {
    const order: BigCommerceOrder = {
      id: 10001,
      customer_id: 500,
      date_created: '2024-03-15T10:30:00+00:00',
      date_modified: '2024-03-15T11:00:00+00:00',
      date_shipped: '2024-03-16T14:00:00+00:00',
      status_id: 10,
      status: 'Completed',
      subtotal_ex_tax: '99.99',
      subtotal_inc_tax: '108.24',
      subtotal_tax: '8.25',
      base_shipping_cost: '9.99',
      shipping_cost_ex_tax: '9.99',
      shipping_cost_inc_tax: '10.81',
      shipping_cost_tax: '0.82',
      total_ex_tax: '109.98',
      total_inc_tax: '119.05',
      total_tax: '9.07',
      items_total: 2,
      items_shipped: 2,
      payment_method: 'Credit Card',
      payment_status: 'captured',
      refunded_amount: '0.00',
      currency_code: 'USD',
      billing_address: sampleBillingAddress,
    };
    
    expect(order.id).toBe(10001);
    expect(order.status_id).toBe(10);
    expect(order.status).toBe('Completed');
    expect(order.currency_code).toBe('USD');
  });

  it('should handle tax calculations', () => {
    const order: BigCommerceOrder = {
      id: 10002,
      customer_id: 501,
      date_created: '2024-03-16T09:00:00+00:00',
      date_modified: '2024-03-16T09:00:00+00:00',
      date_shipped: '',
      status_id: 11,
      status: 'Awaiting Fulfillment',
      subtotal_ex_tax: '149.99',
      subtotal_inc_tax: '162.36',
      subtotal_tax: '12.37',
      base_shipping_cost: '12.99',
      shipping_cost_ex_tax: '12.99',
      shipping_cost_inc_tax: '14.06',
      shipping_cost_tax: '1.07',
      total_ex_tax: '162.98',
      total_inc_tax: '176.42',
      total_tax: '13.44',
      items_total: 3,
      items_shipped: 0,
      payment_method: 'PayPal',
      payment_status: 'captured',
      refunded_amount: '0.00',
      currency_code: 'USD',
      billing_address: sampleBillingAddress,
    };
    
    // Verify tax sum equals total tax
    const subtotalTax = parseFloat(order.subtotal_tax);
    const shippingTax = parseFloat(order.shipping_cost_tax);
    const totalTax = parseFloat(order.total_tax);
    
    expect(subtotalTax + shippingTax).toBeCloseTo(totalTax, 2);
  });

  it('should handle optional products and shipping_addresses resources', () => {
    const order: BigCommerceOrder = {
      id: 10003,
      customer_id: 502,
      date_created: '2024-03-17T08:00:00+00:00',
      date_modified: '2024-03-17T08:00:00+00:00',
      date_shipped: '',
      status_id: 1,
      status: 'Pending',
      subtotal_ex_tax: '25.00',
      subtotal_inc_tax: '27.06',
      subtotal_tax: '2.06',
      base_shipping_cost: '5.00',
      shipping_cost_ex_tax: '5.00',
      shipping_cost_inc_tax: '5.41',
      shipping_cost_tax: '0.41',
      total_ex_tax: '30.00',
      total_inc_tax: '32.47',
      total_tax: '2.47',
      items_total: 1,
      items_shipped: 0,
      payment_method: 'Credit Card',
      payment_status: 'pending',
      refunded_amount: '0.00',
      currency_code: 'USD',
      billing_address: sampleBillingAddress,
      products: {
        url: 'https://api.bigcommerce.com/stores/abc123/v2/orders/10003/products',
        resource: '/orders/10003/products',
      },
      shipping_addresses: {
        url: 'https://api.bigcommerce.com/stores/abc123/v2/orders/10003/shipping_addresses',
        resource: '/orders/10003/shipping_addresses',
      },
    };
    
    expect(order.products?.url).toContain('/orders/10003/products');
    expect(order.shipping_addresses?.resource).toBe('/orders/10003/shipping_addresses');
  });
});

describe('BigCommerceShippingAddress type', () => {
  it('should extend BigCommerceAddress with shipping-specific fields', () => {
    const shippingAddress: BigCommerceShippingAddress = {
      id: 1,
      order_id: 10001,
      first_name: 'Jane',
      last_name: 'Recipient',
      company: 'Home',
      street_1: '789 Delivery Dr',
      street_2: 'Apt 12B',
      city: 'Portland',
      state: 'Oregon',
      zip: '97201',
      country: 'United States',
      country_iso2: 'US',
      phone: '503-555-0200',
      email: 'jane@recipient.com',
      items_total: 2,
      items_shipped: 2,
      base_cost: '8.99',
      cost_ex_tax: '8.99',
      cost_inc_tax: '9.71',
      cost_tax: '0.72',
      shipping_method: 'USPS Priority Mail',
    };
    
    expect(shippingAddress.id).toBe(1);
    expect(shippingAddress.order_id).toBe(10001);
    expect(shippingAddress.shipping_method).toBe('USPS Priority Mail');
    expect(parseFloat(shippingAddress.cost_ex_tax)).toBe(8.99);
  });
});

describe('BigCommerceStoreInfo type', () => {
  it('should define store info fields', () => {
    const storeInfo: BigCommerceStoreInfo = {
      id: 'abc123xyz',
      domain: 'mystore.mybigcommerce.com',
      name: 'My Awesome Store',
      plan_name: 'Standard',
      plan_level: 'standard',
      status: 'active',
      currency: 'USD',
    };
    
    expect(storeInfo.id).toBe('abc123xyz');
    expect(storeInfo.name).toBe('My Awesome Store');
    expect(storeInfo.status).toBe('active');
    expect(storeInfo.currency).toBe('USD');
  });
});

// =============================================================================
// mapOrderToImport Tests
// =============================================================================

describe('mapOrderToImport', () => {
  const sampleBillingAddress: BigCommerceAddress = {
    first_name: 'Test',
    last_name: 'User',
    company: '',
    street_1: '100 Test St',
    street_2: '',
    city: 'Seattle',
    state: 'Washington',
    zip: '98101',
    country: 'United States',
    country_iso2: 'US',
    phone: '206-555-0000',
    email: 'test@example.com',
  };

  const sampleOrder: BigCommerceOrder = {
    id: 20001,
    customer_id: 600,
    date_created: '2024-03-20T15:30:00+00:00',
    date_modified: '2024-03-20T16:00:00+00:00',
    date_shipped: '',
    status_id: 11,
    status: 'Awaiting Fulfillment',
    subtotal_ex_tax: '79.99',
    subtotal_inc_tax: '86.71',
    subtotal_tax: '6.72',
    base_shipping_cost: '7.99',
    shipping_cost_ex_tax: '7.99',
    shipping_cost_inc_tax: '8.66',
    shipping_cost_tax: '0.67',
    total_ex_tax: '87.98',
    total_inc_tax: '95.37',
    total_tax: '7.39',
    items_total: 2,
    items_shipped: 0,
    payment_method: 'Credit Card',
    payment_status: 'captured',
    refunded_amount: '0.00',
    currency_code: 'USD',
    billing_address: sampleBillingAddress,
  };

  it('should map basic order fields correctly', () => {
    const mapped = mapOrderToImport(sampleOrder);
    
    expect(mapped.platform).toBe('bigcommerce');
    expect(mapped.platformOrderId).toBe('20001');
    expect(mapped.orderNumber).toBe('20001');
    expect(mapped.currency).toBe('USD');
  });

  it('should convert price strings to numbers', () => {
    const mapped = mapOrderToImport(sampleOrder);
    
    expect(mapped.subtotal).toBe(79.99);
    expect(mapped.shippingAmount).toBe(7.99);
    expect(mapped.taxAmount).toBe(7.39);
    expect(mapped.totalAmount).toBe(95.37);
  });

  it('should parse order date correctly', () => {
    const mapped = mapOrderToImport(sampleOrder);
    
    expect(mapped.orderDate).toBeInstanceOf(Date);
    expect(mapped.orderDate.getFullYear()).toBe(2024);
    expect(mapped.orderDate.getMonth()).toBe(2); // March (0-indexed)
    expect(mapped.orderDate.getDate()).toBe(20);
  });

  it('should use billing address when no shipping address provided', () => {
    const mapped = mapOrderToImport(sampleOrder);
    
    expect(mapped.shippingState).toBe('Washington');
    expect(mapped.shippingCity).toBe('Seattle');
    expect(mapped.shippingZip).toBe('98101');
    expect(mapped.shippingCountry).toBe('US');
    expect(mapped.customerEmail).toBe('test@example.com');
  });

  it('should use shipping address when provided', () => {
    const shippingAddress: BigCommerceShippingAddress = {
      id: 1,
      order_id: 20001,
      first_name: 'Ship',
      last_name: 'Here',
      company: '',
      street_1: '200 Ship St',
      street_2: '',
      city: 'Portland',
      state: 'Oregon',
      zip: '97201',
      country: 'United States',
      country_iso2: 'US',
      phone: '503-555-0100',
      email: 'ship@example.com',
      items_total: 2,
      items_shipped: 0,
      base_cost: '7.99',
      cost_ex_tax: '7.99',
      cost_inc_tax: '8.66',
      cost_tax: '0.67',
      shipping_method: 'Ground Shipping',
    };
    
    const mapped = mapOrderToImport(sampleOrder, shippingAddress);
    
    expect(mapped.shippingState).toBe('Oregon');
    expect(mapped.shippingCity).toBe('Portland');
    expect(mapped.shippingZip).toBe('97201');
    expect(mapped.shippingCountry).toBe('US');
    // Billing address is still from order
    expect(mapped.billingState).toBe('Washington');
  });

  it('should map tax breakdown correctly', () => {
    const mapped = mapOrderToImport(sampleOrder);
    
    expect(mapped.taxBreakdown.subtotalTax).toBe(6.72);
    expect(mapped.taxBreakdown.shippingTax).toBe(0.67);
    expect(mapped.taxBreakdown.totalTax).toBe(7.39);
  });

  it('should include raw order data', () => {
    const mapped = mapOrderToImport(sampleOrder);
    
    expect(mapped.rawData).toBe(sampleOrder);
    expect(mapped.rawData.id).toBe(20001);
  });

  it('should initialize empty line items array', () => {
    const mapped = mapOrderToImport(sampleOrder);
    
    expect(mapped.lineItems).toEqual([]);
  });

  it('should default to USD when currency not specified', () => {
    const orderWithoutCurrency: BigCommerceOrder = {
      ...sampleOrder,
      currency_code: '',
    };
    
    const mapped = mapOrderToImport(orderWithoutCurrency);
    expect(mapped.currency).toBe('USD');
  });

  it('should handle different currency codes', () => {
    const eurOrder: BigCommerceOrder = {
      ...sampleOrder,
      currency_code: 'EUR',
    };
    
    const mapped = mapOrderToImport(eurOrder);
    expect(mapped.currency).toBe('EUR');
  });

  // Status mapping tests
  describe('order status mapping', () => {
    const statusTests: Array<{ statusId: number; statusName: string; expected: string }> = [
      { statusId: 0, statusName: 'Incomplete', expected: 'pending' },
      { statusId: 1, statusName: 'Pending', expected: 'pending' },
      { statusId: 2, statusName: 'Shipped', expected: 'fulfilled' },
      { statusId: 3, statusName: 'Partially Shipped', expected: 'fulfilled' },
      { statusId: 4, statusName: 'Refunded', expected: 'refunded' },
      { statusId: 5, statusName: 'Cancelled', expected: 'cancelled' },
      { statusId: 6, statusName: 'Declined', expected: 'cancelled' },
      { statusId: 7, statusName: 'Awaiting Payment', expected: 'pending' },
      { statusId: 8, statusName: 'Awaiting Pickup', expected: 'pending' },
      { statusId: 9, statusName: 'Awaiting Shipment', expected: 'pending' },
      { statusId: 10, statusName: 'Completed', expected: 'fulfilled' },
      { statusId: 11, statusName: 'Awaiting Fulfillment', expected: 'pending' },
      { statusId: 12, statusName: 'Manual Verification Required', expected: 'pending' },
      { statusId: 13, statusName: 'Disputed', expected: 'pending' },
      { statusId: 14, statusName: 'Partially Refunded', expected: 'refunded' },
    ];

    statusTests.forEach(({ statusId, statusName, expected }) => {
      it(`should map status ${statusId} (${statusName}) to "${expected}"`, () => {
        const order: BigCommerceOrder = {
          ...sampleOrder,
          status_id: statusId,
          status: statusName,
        };
        
        const mapped = mapOrderToImport(order);
        expect(mapped.status).toBe(expected);
      });
    });

    it('should default unknown status to "pending"', () => {
      const order: BigCommerceOrder = {
        ...sampleOrder,
        status_id: 99, // Unknown status
        status: 'Unknown Status',
      };
      
      const mapped = mapOrderToImport(order);
      expect(mapped.status).toBe('pending');
    });
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('BigCommerce edge cases', () => {
  const minimalBillingAddress: BigCommerceAddress = {
    first_name: '',
    last_name: '',
    company: '',
    street_1: '',
    street_2: '',
    city: '',
    state: '',
    zip: '',
    country: '',
    country_iso2: '',
    phone: '',
    email: '',
  };

  it('should handle order with minimal address data', () => {
    const order: BigCommerceOrder = {
      id: 30001,
      customer_id: 0,
      date_created: '2024-03-21T00:00:00+00:00',
      date_modified: '2024-03-21T00:00:00+00:00',
      date_shipped: '',
      status_id: 1,
      status: 'Pending',
      subtotal_ex_tax: '10.00',
      subtotal_inc_tax: '10.00',
      subtotal_tax: '0.00',
      base_shipping_cost: '0.00',
      shipping_cost_ex_tax: '0.00',
      shipping_cost_inc_tax: '0.00',
      shipping_cost_tax: '0.00',
      total_ex_tax: '10.00',
      total_inc_tax: '10.00',
      total_tax: '0.00',
      items_total: 1,
      items_shipped: 0,
      payment_method: '',
      payment_status: '',
      refunded_amount: '0.00',
      currency_code: 'USD',
      billing_address: minimalBillingAddress,
    };
    
    const mapped = mapOrderToImport(order);
    
    expect(mapped.shippingState).toBe('');
    expect(mapped.customerEmail).toBe('');
    expect(mapped.shippingCountry).toBe('US'); // Falls back to 'US'
  });

  it('should handle zero-value order', () => {
    const freeOrder: BigCommerceOrder = {
      id: 30002,
      customer_id: 700,
      date_created: '2024-03-22T12:00:00+00:00',
      date_modified: '2024-03-22T12:00:00+00:00',
      date_shipped: '',
      status_id: 10,
      status: 'Completed',
      subtotal_ex_tax: '0.00',
      subtotal_inc_tax: '0.00',
      subtotal_tax: '0.00',
      base_shipping_cost: '0.00',
      shipping_cost_ex_tax: '0.00',
      shipping_cost_inc_tax: '0.00',
      shipping_cost_tax: '0.00',
      total_ex_tax: '0.00',
      total_inc_tax: '0.00',
      total_tax: '0.00',
      items_total: 0,
      items_shipped: 0,
      payment_method: 'Store Credit',
      payment_status: 'captured',
      refunded_amount: '0.00',
      currency_code: 'USD',
      billing_address: minimalBillingAddress,
    };
    
    const mapped = mapOrderToImport(freeOrder);
    
    expect(mapped.subtotal).toBe(0);
    expect(mapped.totalAmount).toBe(0);
    expect(mapped.taxAmount).toBe(0);
  });

  it('should handle refunded order with refund amount', () => {
    const order: BigCommerceOrder = {
      id: 30003,
      customer_id: 701,
      date_created: '2024-03-23T09:00:00+00:00',
      date_modified: '2024-03-24T14:00:00+00:00',
      date_shipped: '2024-03-23T15:00:00+00:00',
      status_id: 4,
      status: 'Refunded',
      subtotal_ex_tax: '50.00',
      subtotal_inc_tax: '54.13',
      subtotal_tax: '4.13',
      base_shipping_cost: '5.00',
      shipping_cost_ex_tax: '5.00',
      shipping_cost_inc_tax: '5.41',
      shipping_cost_tax: '0.41',
      total_ex_tax: '55.00',
      total_inc_tax: '59.54',
      total_tax: '4.54',
      items_total: 1,
      items_shipped: 1,
      payment_method: 'Credit Card',
      payment_status: 'refunded',
      refunded_amount: '59.54',
      currency_code: 'USD',
      billing_address: minimalBillingAddress,
    };
    
    const mapped = mapOrderToImport(order);
    
    expect(mapped.status).toBe('refunded');
    expect(parseFloat(order.refunded_amount)).toBe(59.54);
  });

  it('should handle Canadian orders', () => {
    const canadianAddress: BigCommerceAddress = {
      first_name: 'Maple',
      last_name: 'Customer',
      company: '',
      street_1: '100 Maple St',
      street_2: '',
      city: 'Toronto',
      state: 'Ontario',
      zip: 'M5V 2H1',
      country: 'Canada',
      country_iso2: 'CA',
      phone: '416-555-0000',
      email: 'maple@example.ca',
    };

    const order: BigCommerceOrder = {
      id: 30004,
      customer_id: 702,
      date_created: '2024-03-24T10:00:00+00:00',
      date_modified: '2024-03-24T10:00:00+00:00',
      date_shipped: '',
      status_id: 11,
      status: 'Awaiting Fulfillment',
      subtotal_ex_tax: '100.00',
      subtotal_inc_tax: '113.00',
      subtotal_tax: '13.00',
      base_shipping_cost: '15.00',
      shipping_cost_ex_tax: '15.00',
      shipping_cost_inc_tax: '16.95',
      shipping_cost_tax: '1.95',
      total_ex_tax: '115.00',
      total_inc_tax: '129.95',
      total_tax: '14.95',
      items_total: 2,
      items_shipped: 0,
      payment_method: 'Credit Card',
      payment_status: 'captured',
      refunded_amount: '0.00',
      currency_code: 'CAD',
      billing_address: canadianAddress,
    };
    
    const mapped = mapOrderToImport(order);
    
    expect(mapped.shippingState).toBe('Ontario');
    expect(mapped.shippingCountry).toBe('CA');
    expect(mapped.currency).toBe('CAD');
  });

  it('should handle high-value orders', () => {
    const order: BigCommerceOrder = {
      id: 30005,
      customer_id: 703,
      date_created: '2024-03-25T11:00:00+00:00',
      date_modified: '2024-03-25T11:00:00+00:00',
      date_shipped: '',
      status_id: 11,
      status: 'Awaiting Fulfillment',
      subtotal_ex_tax: '9999.99',
      subtotal_inc_tax: '10824.99',
      subtotal_tax: '825.00',
      base_shipping_cost: '0.00',
      shipping_cost_ex_tax: '0.00',
      shipping_cost_inc_tax: '0.00',
      shipping_cost_tax: '0.00',
      total_ex_tax: '9999.99',
      total_inc_tax: '10824.99',
      total_tax: '825.00',
      items_total: 1,
      items_shipped: 0,
      payment_method: 'Wire Transfer',
      payment_status: 'captured',
      refunded_amount: '0.00',
      currency_code: 'USD',
      billing_address: minimalBillingAddress,
    };
    
    const mapped = mapOrderToImport(order);
    
    expect(mapped.subtotal).toBe(9999.99);
    expect(mapped.totalAmount).toBe(10824.99);
    expect(mapped.taxAmount).toBe(825.00);
  });

  it('should handle orders with decimal precision issues', () => {
    const order: BigCommerceOrder = {
      id: 30006,
      customer_id: 704,
      date_created: '2024-03-26T12:00:00+00:00',
      date_modified: '2024-03-26T12:00:00+00:00',
      date_shipped: '',
      status_id: 10,
      status: 'Completed',
      subtotal_ex_tax: '33.33',
      subtotal_inc_tax: '36.08',
      subtotal_tax: '2.75',
      base_shipping_cost: '4.44',
      shipping_cost_ex_tax: '4.44',
      shipping_cost_inc_tax: '4.81',
      shipping_cost_tax: '0.37',
      total_ex_tax: '37.77',
      total_inc_tax: '40.89',
      total_tax: '3.12',
      items_total: 3,
      items_shipped: 3,
      payment_method: 'PayPal',
      payment_status: 'captured',
      refunded_amount: '0.00',
      currency_code: 'USD',
      billing_address: minimalBillingAddress,
    };
    
    const mapped = mapOrderToImport(order);
    
    // Verify precise handling of decimals
    expect(mapped.subtotal).toBeCloseTo(33.33, 2);
    expect(mapped.shippingAmount).toBeCloseTo(4.44, 2);
    expect(mapped.taxBreakdown.subtotalTax).toBeCloseTo(2.75, 2);
    expect(mapped.taxBreakdown.shippingTax).toBeCloseTo(0.37, 2);
  });
});
