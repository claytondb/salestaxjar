/**
 * Ecwid Integration Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma before importing ecwid
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
  EcwidCredentials,
  EcwidOrder,
  EcwidOrderItem,
  EcwidShippingPerson,
  EcwidShippingOption,
  EcwidTaxOnShipping,
  EcwidOrdersResponse,
  EcwidStoreProfile,
} from './ecwid';

import { mapOrderToImport } from './ecwid';

// =============================================================================
// Type Tests
// =============================================================================

describe('EcwidCredentials type', () => {
  it('should define required credential fields', () => {
    const credentials: EcwidCredentials = {
      storeId: '12345678',
      apiToken: 'secret_xxxxxxxxxxxxxxxxxxxx',
    };
    
    expect(credentials.storeId).toBe('12345678');
    expect(credentials.apiToken).toContain('secret_');
  });
});

describe('EcwidOrderItem type', () => {
  it('should define all order item fields', () => {
    const item: EcwidOrderItem = {
      id: 1001,
      productId: 5001,
      price: 29.99,
      priceWithoutTax: 27.76,
      sku: 'WIDGET-001',
      quantity: 2,
      name: 'Premium Widget',
      tax: 4.46,
      shipping: 0,
      weight: 0.5,
      isShippingRequired: true,
    };
    
    expect(item.name).toBe('Premium Widget');
    expect(item.quantity).toBe(2);
    expect(item.priceWithoutTax).toBe(27.76);
    expect(item.tax).toBe(4.46);
  });

  it('should handle digital products', () => {
    const digitalItem: EcwidOrderItem = {
      id: 1002,
      productId: 5002,
      price: 9.99,
      priceWithoutTax: 9.99,
      sku: 'EBOOK-001',
      quantity: 1,
      name: 'Digital Guidebook',
      tax: 0,
      shipping: 0,
      weight: 0,
      isShippingRequired: false,
    };
    
    expect(digitalItem.isShippingRequired).toBe(false);
    expect(digitalItem.weight).toBe(0);
  });
});

describe('EcwidShippingPerson type', () => {
  it('should define shipping person fields', () => {
    const person: EcwidShippingPerson = {
      name: 'John Doe',
      firstName: 'John',
      lastName: 'Doe',
      companyName: 'Acme Corp',
      street: '123 Main Street, Apt 4B',
      city: 'San Francisco',
      countryCode: 'US',
      countryName: 'United States',
      postalCode: '94102',
      stateOrProvinceCode: 'CA',
      stateOrProvinceName: 'California',
      phone: '415-555-0100',
    };
    
    expect(person.firstName).toBe('John');
    expect(person.stateOrProvinceCode).toBe('CA');
    expect(person.countryCode).toBe('US');
  });

  it('should allow optional fields', () => {
    const minimalPerson: EcwidShippingPerson = {
      city: 'New York',
      stateOrProvinceCode: 'NY',
      countryCode: 'US',
    };
    
    expect(minimalPerson.name).toBeUndefined();
    expect(minimalPerson.companyName).toBeUndefined();
  });
});

describe('EcwidShippingOption type', () => {
  it('should define shipping option fields', () => {
    const option: EcwidShippingOption = {
      shippingMethodId: 'usps-priority',
      shippingMethodName: 'USPS Priority Mail',
      shippingRate: 8.99,
      shippingRateWithoutTax: 8.32,
      isPickup: false,
      fulfillmentType: 'shipping',
    };
    
    expect(option.shippingMethodName).toBe('USPS Priority Mail');
    expect(option.shippingRate).toBe(8.99);
    expect(option.isPickup).toBe(false);
  });

  it('should handle store pickup', () => {
    const pickup: EcwidShippingOption = {
      shippingMethodId: 'local-pickup',
      shippingMethodName: 'Store Pickup',
      shippingRate: 0,
      shippingRateWithoutTax: 0,
      isPickup: true,
      fulfillmentType: 'pickup',
    };
    
    expect(pickup.isPickup).toBe(true);
    expect(pickup.shippingRate).toBe(0);
  });
});

describe('EcwidTaxOnShipping type', () => {
  it('should define tax on shipping fields', () => {
    const tax: EcwidTaxOnShipping = {
      name: 'CA State Tax',
      value: 0.0825,
      total: 0.74,
    };
    
    expect(tax.name).toBe('CA State Tax');
    expect(tax.value).toBe(0.0825);
    expect(tax.total).toBe(0.74);
  });
});

describe('EcwidOrder type', () => {
  const sampleShippingPerson: EcwidShippingPerson = {
    firstName: 'Jane',
    lastName: 'Smith',
    street: '456 Oak Avenue',
    city: 'Los Angeles',
    countryCode: 'US',
    countryName: 'United States',
    postalCode: '90001',
    stateOrProvinceCode: 'CA',
    stateOrProvinceName: 'California',
    phone: '213-555-0200',
  };

  it('should define all order fields', () => {
    const order: EcwidOrder = {
      id: 'ABC123',
      internalId: 10001,
      orderNumber: 1001,
      vendorOrderNumber: 'ORD-2024-001',
      email: 'customer@example.com',
      paymentStatus: 'PAID',
      fulfillmentStatus: 'SHIPPED',
      subtotal: 89.99,
      subtotalWithoutTax: 83.32,
      total: 98.98,
      totalWithoutTax: 91.65,
      tax: 7.33,
      couponDiscount: 0,
      discount: 0,
      refundedAmount: 0,
      createDate: '2024-03-20T10:30:00.000Z',
      updateDate: '2024-03-21T15:45:00.000Z',
      createTimestamp: 1710930600,
      updateTimestamp: 1711035900,
      items: [],
      shippingPerson: sampleShippingPerson,
      pricesIncludeTax: false,
    };
    
    expect(order.id).toBe('ABC123');
    expect(order.orderNumber).toBe(1001);
    expect(order.paymentStatus).toBe('PAID');
    expect(order.fulfillmentStatus).toBe('SHIPPED');
    expect(order.tax).toBe(7.33);
  });

  it('should handle orders with items', () => {
    const order: EcwidOrder = {
      id: 'DEF456',
      internalId: 10002,
      orderNumber: 1002,
      vendorOrderNumber: '',
      email: 'buyer@example.com',
      paymentStatus: 'PAID',
      fulfillmentStatus: 'AWAITING_PROCESSING',
      subtotal: 59.98,
      subtotalWithoutTax: 55.54,
      total: 69.47,
      totalWithoutTax: 64.33,
      tax: 5.14,
      couponDiscount: 0,
      discount: 0,
      refundedAmount: 0,
      createDate: '2024-03-22T09:00:00.000Z',
      updateDate: '2024-03-22T09:00:00.000Z',
      createTimestamp: 1711094400,
      updateTimestamp: 1711094400,
      items: [
        {
          id: 1,
          productId: 101,
          price: 29.99,
          priceWithoutTax: 27.77,
          sku: 'ITEM-A',
          quantity: 2,
          name: 'Item A',
          tax: 4.44,
          shipping: 0,
          weight: 1.0,
          isShippingRequired: true,
        },
      ],
      shippingPerson: sampleShippingPerson,
      pricesIncludeTax: false,
    };
    
    expect(order.items).toHaveLength(1);
    expect(order.items[0].name).toBe('Item A');
    expect(order.items[0].quantity).toBe(2);
  });

  it('should handle tax-inclusive pricing', () => {
    const order: EcwidOrder = {
      id: 'GHI789',
      internalId: 10003,
      orderNumber: 1003,
      vendorOrderNumber: 'EUR-001',
      email: 'eu@example.com',
      paymentStatus: 'PAID',
      fulfillmentStatus: 'DELIVERED',
      subtotal: 119.99,
      subtotalWithoutTax: 100.83,
      total: 129.99,
      totalWithoutTax: 109.24,
      tax: 20.75,
      couponDiscount: 0,
      discount: 0,
      refundedAmount: 0,
      createDate: '2024-03-23T14:00:00.000Z',
      updateDate: '2024-03-24T10:00:00.000Z',
      createTimestamp: 1711198800,
      updateTimestamp: 1711270800,
      items: [],
      pricesIncludeTax: true,
    };
    
    expect(order.pricesIncludeTax).toBe(true);
    expect(order.subtotal).toBeGreaterThan(order.subtotalWithoutTax);
  });

  it('should handle shipping taxes', () => {
    const order: EcwidOrder = {
      id: 'JKL012',
      internalId: 10004,
      orderNumber: 1004,
      vendorOrderNumber: '',
      email: 'taxed@example.com',
      paymentStatus: 'PAID',
      fulfillmentStatus: 'SHIPPED',
      subtotal: 50.00,
      subtotalWithoutTax: 46.30,
      total: 62.00,
      totalWithoutTax: 57.41,
      tax: 4.59,
      couponDiscount: 0,
      discount: 0,
      refundedAmount: 0,
      createDate: '2024-03-24T11:00:00.000Z',
      updateDate: '2024-03-24T16:00:00.000Z',
      createTimestamp: 1711274400,
      updateTimestamp: 1711292400,
      items: [],
      shippingPerson: sampleShippingPerson,
      shippingOption: {
        shippingMethodName: 'Standard Shipping',
        shippingRate: 12.00,
        shippingRateWithoutTax: 11.11,
      },
      taxesOnShipping: [
        { name: 'State Tax', value: 0.08, total: 0.89 },
      ],
      pricesIncludeTax: false,
    };
    
    expect(order.taxesOnShipping).toHaveLength(1);
    expect(order.taxesOnShipping![0].total).toBe(0.89);
    expect(order.shippingOption?.shippingRate).toBe(12.00);
  });
});

describe('EcwidOrdersResponse type', () => {
  it('should define paginated response fields', () => {
    const response: EcwidOrdersResponse = {
      total: 150,
      count: 25,
      offset: 0,
      limit: 25,
      items: [],
    };
    
    expect(response.total).toBe(150);
    expect(response.count).toBe(25);
    expect(response.limit).toBe(25);
  });
});

describe('EcwidStoreProfile type', () => {
  it('should define store profile fields', () => {
    const profile: EcwidStoreProfile = {
      generalInfo: {
        storeId: 12345678,
        storeUrl: 'https://mystore.ecwid.com',
        starterSite: {
          ecwidSubdomain: 'mystore',
        },
      },
      account: {
        accountName: 'My Store Account',
        accountEmail: 'owner@mystore.com',
      },
      settings: {
        storeName: 'My Awesome Store',
        currency: 'USD',
      },
    };
    
    expect(profile.generalInfo?.storeId).toBe(12345678);
    expect(profile.settings?.storeName).toBe('My Awesome Store');
    expect(profile.settings?.currency).toBe('USD');
  });
});

// =============================================================================
// mapOrderToImport Tests
// =============================================================================

describe('mapOrderToImport', () => {
  const sampleShippingPerson: EcwidShippingPerson = {
    firstName: 'Test',
    lastName: 'Customer',
    street: '789 Test Lane',
    city: 'Austin',
    countryCode: 'US',
    countryName: 'United States',
    postalCode: '78701',
    stateOrProvinceCode: 'TX',
    stateOrProvinceName: 'Texas',
  };

  const sampleOrder: EcwidOrder = {
    id: 'TEST001',
    internalId: 20001,
    orderNumber: 2001,
    vendorOrderNumber: 'VEND-2024-001',
    email: 'test@example.com',
    paymentStatus: 'PAID',
    fulfillmentStatus: 'AWAITING_PROCESSING',
    subtotal: 79.99,
    subtotalWithoutTax: 74.06,
    total: 94.97,
    totalWithoutTax: 87.95,
    tax: 7.02,
    couponDiscount: 0,
    discount: 0,
    refundedAmount: 0,
    createDate: '2024-03-25T08:00:00.000Z',
    updateDate: '2024-03-25T08:00:00.000Z',
    createTimestamp: 1711350000,
    updateTimestamp: 1711350000,
    items: [
      {
        id: 1,
        productId: 101,
        price: 39.99,
        priceWithoutTax: 37.03,
        sku: 'PROD-001',
        quantity: 2,
        name: 'Test Product',
        tax: 5.92,
        shipping: 0,
        weight: 0.5,
        isShippingRequired: true,
      },
    ],
    shippingPerson: sampleShippingPerson,
    shippingOption: {
      shippingMethodName: 'Standard',
      shippingRate: 14.98,
      shippingRateWithoutTax: 13.87,
    },
    taxesOnShipping: [
      { name: 'TX Tax', value: 0.08, total: 1.10 },
    ],
    pricesIncludeTax: false,
  };

  it('should map basic order fields correctly', () => {
    const mapped = mapOrderToImport(sampleOrder);
    
    expect(mapped.platform).toBe('ecwid');
    expect(mapped.platformOrderId).toBe('TEST001');
    expect(mapped.orderNumber).toBe('VEND-2024-001');
    expect(mapped.customerEmail).toBe('test@example.com');
  });

  it('should use vendorOrderNumber when available', () => {
    const mapped = mapOrderToImport(sampleOrder);
    expect(mapped.orderNumber).toBe('VEND-2024-001');
  });

  it('should fallback to orderNumber when vendorOrderNumber is empty', () => {
    const orderWithoutVendor: EcwidOrder = {
      ...sampleOrder,
      vendorOrderNumber: '',
    };
    
    const mapped = mapOrderToImport(orderWithoutVendor);
    expect(mapped.orderNumber).toBe('2001');
  });

  it('should convert amounts correctly', () => {
    const mapped = mapOrderToImport(sampleOrder);
    
    expect(mapped.subtotal).toBe(74.06);
    expect(mapped.taxAmount).toBe(7.02);
    expect(mapped.totalAmount).toBe(94.97);
  });

  it('should extract shipping amount without tax', () => {
    const mapped = mapOrderToImport(sampleOrder);
    expect(mapped.shippingAmount).toBe(13.87);
  });

  it('should fallback to shippingRate when shippingRateWithoutTax is missing', () => {
    const orderWithTaxInclusiveShipping: EcwidOrder = {
      ...sampleOrder,
      shippingOption: {
        shippingMethodName: 'Express',
        shippingRate: 19.99,
      },
    };
    
    const mapped = mapOrderToImport(orderWithTaxInclusiveShipping);
    expect(mapped.shippingAmount).toBe(19.99);
  });

  it('should parse order date from createDate', () => {
    const mapped = mapOrderToImport(sampleOrder);
    
    expect(mapped.orderDate).toBeInstanceOf(Date);
    expect(mapped.orderDate.getFullYear()).toBe(2024);
    expect(mapped.orderDate.getMonth()).toBe(2); // March
    expect(mapped.orderDate.getDate()).toBe(25);
  });

  it('should fallback to createTimestamp when createDate is missing', () => {
    const orderWithTimestamp: EcwidOrder = {
      ...sampleOrder,
      createDate: '',
    };
    
    const mapped = mapOrderToImport(orderWithTimestamp);
    expect(mapped.orderDate).toBeInstanceOf(Date);
    // Timestamp 1711350000 = March 25, 2024
    expect(mapped.orderDate.getFullYear()).toBe(2024);
  });

  it('should map shipping address correctly', () => {
    const mapped = mapOrderToImport(sampleOrder);
    
    expect(mapped.shippingState).toBe('TX');
    expect(mapped.shippingCity).toBe('Austin');
    expect(mapped.shippingZip).toBe('78701');
    expect(mapped.shippingCountry).toBe('US');
  });

  it('should use billingPerson when shippingPerson is missing', () => {
    const orderWithBillingOnly: EcwidOrder = {
      ...sampleOrder,
      shippingPerson: undefined,
      billingPerson: {
        firstName: 'Bill',
        lastName: 'Payer',
        city: 'Houston',
        stateOrProvinceCode: 'TX',
        postalCode: '77001',
        countryCode: 'US',
      },
    };
    
    const mapped = mapOrderToImport(orderWithBillingOnly);
    
    expect(mapped.shippingCity).toBe('Houston');
    expect(mapped.shippingZip).toBe('77001');
  });

  it('should calculate tax breakdown correctly', () => {
    const mapped = mapOrderToImport(sampleOrder);
    
    expect(mapped.taxBreakdown.shippingTax).toBe(1.10);
    expect(mapped.taxBreakdown.productTax).toBeCloseTo(5.92, 2);
    expect(mapped.taxBreakdown.totalTax).toBe(7.02);
  });

  it('should handle orders without shipping tax', () => {
    const orderNoShippingTax: EcwidOrder = {
      ...sampleOrder,
      taxesOnShipping: undefined,
      tax: 5.92,
    };
    
    const mapped = mapOrderToImport(orderNoShippingTax);
    
    expect(mapped.taxBreakdown.shippingTax).toBe(0);
    expect(mapped.taxBreakdown.productTax).toBe(5.92);
  });

  it('should map line items correctly', () => {
    const mapped = mapOrderToImport(sampleOrder);
    
    expect(mapped.lineItems).toHaveLength(1);
    expect(mapped.lineItems[0].productId).toBe('101');
    expect(mapped.lineItems[0].sku).toBe('PROD-001');
    expect(mapped.lineItems[0].name).toBe('Test Product');
    expect(mapped.lineItems[0].quantity).toBe(2);
    expect(mapped.lineItems[0].price).toBe(37.03);
    expect(mapped.lineItems[0].tax).toBe(5.92);
  });

  it('should include raw order data', () => {
    const mapped = mapOrderToImport(sampleOrder);
    
    expect(mapped.rawData).toBe(sampleOrder);
    expect(mapped.rawData.id).toBe('TEST001');
  });

  // Status mapping tests
  describe('order status mapping', () => {
    const statusTests: Array<{
      paymentStatus: string;
      fulfillmentStatus: string;
      expected: string;
      description: string;
    }> = [
      { paymentStatus: 'PAID', fulfillmentStatus: 'SHIPPED', expected: 'fulfilled', description: 'shipped order' },
      { paymentStatus: 'PAID', fulfillmentStatus: 'DELIVERED', expected: 'fulfilled', description: 'delivered order' },
      { paymentStatus: 'PAID', fulfillmentStatus: 'READY_FOR_PICKUP', expected: 'fulfilled', description: 'ready for pickup' },
      { paymentStatus: 'PAID', fulfillmentStatus: 'OUT_FOR_DELIVERY', expected: 'fulfilled', description: 'out for delivery' },
      { paymentStatus: 'PAID', fulfillmentStatus: 'RETURNED', expected: 'refunded', description: 'returned order' },
      { paymentStatus: 'PAID', fulfillmentStatus: 'WILL_NOT_DELIVER', expected: 'cancelled', description: 'will not deliver' },
      { paymentStatus: 'AWAITING_PAYMENT', fulfillmentStatus: 'AWAITING_PROCESSING', expected: 'pending', description: 'awaiting payment' },
      { paymentStatus: 'CANCELLED', fulfillmentStatus: 'AWAITING_PROCESSING', expected: 'cancelled', description: 'cancelled payment' },
      { paymentStatus: 'REFUNDED', fulfillmentStatus: 'AWAITING_PROCESSING', expected: 'refunded', description: 'refunded payment' },
      { paymentStatus: 'PARTIALLY_REFUNDED', fulfillmentStatus: 'SHIPPED', expected: 'fulfilled', description: 'partially refunded but shipped' },
      { paymentStatus: 'PAID', fulfillmentStatus: 'AWAITING_PROCESSING', expected: 'processing', description: 'paid awaiting processing' },
      { paymentStatus: 'INCOMPLETE', fulfillmentStatus: 'AWAITING_PROCESSING', expected: 'pending', description: 'incomplete order' },
    ];

    statusTests.forEach(({ paymentStatus, fulfillmentStatus, expected, description }) => {
      it(`should map ${description} to "${expected}"`, () => {
        const order: EcwidOrder = {
          ...sampleOrder,
          paymentStatus,
          fulfillmentStatus,
        };
        
        const mapped = mapOrderToImport(order);
        expect(mapped.status).toBe(expected);
      });
    });

    it('should prioritize fulfillment status over payment status', () => {
      const order: EcwidOrder = {
        ...sampleOrder,
        paymentStatus: 'PAID',
        fulfillmentStatus: 'RETURNED',
      };
      
      const mapped = mapOrderToImport(order);
      expect(mapped.status).toBe('refunded');
    });
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('Ecwid edge cases', () => {
  const minimalOrder: EcwidOrder = {
    id: 'MIN001',
    internalId: 30001,
    orderNumber: 3001,
    vendorOrderNumber: '',
    email: '',
    paymentStatus: 'PAID',
    fulfillmentStatus: 'AWAITING_PROCESSING',
    subtotal: 0,
    subtotalWithoutTax: 0,
    total: 0,
    totalWithoutTax: 0,
    tax: 0,
    couponDiscount: 0,
    discount: 0,
    refundedAmount: 0,
    createDate: '2024-03-26T00:00:00.000Z',
    updateDate: '2024-03-26T00:00:00.000Z',
    createTimestamp: 1711411200,
    updateTimestamp: 1711411200,
    items: [],
    pricesIncludeTax: false,
  };

  it('should handle order with no items', () => {
    const mapped = mapOrderToImport(minimalOrder);
    
    expect(mapped.lineItems).toEqual([]);
    expect(mapped.subtotal).toBe(0);
    expect(mapped.totalAmount).toBe(0);
  });

  it('should handle order with no shipping info', () => {
    const mapped = mapOrderToImport(minimalOrder);
    
    expect(mapped.shippingState).toBeUndefined();
    expect(mapped.shippingCity).toBeUndefined();
    expect(mapped.shippingCountry).toBe('US');
  });

  it('should handle order with coupon discount', () => {
    const discountedOrder: EcwidOrder = {
      ...minimalOrder,
      subtotal: 100.00,
      subtotalWithoutTax: 92.59,
      total: 90.00,
      totalWithoutTax: 83.33,
      tax: 6.67,
      couponDiscount: 10.00,
      discount: 10.00,
    };
    
    const mapped = mapOrderToImport(discountedOrder);
    
    expect(mapped.totalAmount).toBe(90.00);
    expect(discountedOrder.couponDiscount).toBe(10.00);
  });

  it('should handle partially refunded order', () => {
    const partiallyRefunded: EcwidOrder = {
      ...minimalOrder,
      id: 'PARTIAL001',
      total: 100.00,
      refundedAmount: 25.00,
      paymentStatus: 'PARTIALLY_REFUNDED',
      fulfillmentStatus: 'SHIPPED',
    };
    
    const mapped = mapOrderToImport(partiallyRefunded);
    
    expect(mapped.totalAmount).toBe(100.00);
    expect(partiallyRefunded.refundedAmount).toBe(25.00);
    expect(mapped.status).toBe('fulfilled'); // Fulfillment takes priority
  });

  it('should handle international orders', () => {
    const internationalOrder: EcwidOrder = {
      ...minimalOrder,
      id: 'INTL001',
      shippingPerson: {
        firstName: 'Hans',
        lastName: 'Mueller',
        street: 'Hauptstraße 42',
        city: 'Berlin',
        countryCode: 'DE',
        countryName: 'Germany',
        postalCode: '10115',
        stateOrProvinceName: 'Berlin',
      },
      total: 79.99,
    };
    
    const mapped = mapOrderToImport(internationalOrder);
    
    expect(mapped.shippingCity).toBe('Berlin');
    expect(mapped.shippingCountry).toBe('DE');
    expect(mapped.shippingState).toBe('Berlin');
  });

  it('should handle multiple shipping taxes', () => {
    const multiTaxOrder: EcwidOrder = {
      ...minimalOrder,
      id: 'MULTITAX001',
      tax: 12.50,
      shippingOption: {
        shippingMethodName: 'Express',
        shippingRate: 25.00,
        shippingRateWithoutTax: 23.15,
      },
      taxesOnShipping: [
        { name: 'State Tax', value: 0.06, total: 1.39 },
        { name: 'County Tax', value: 0.02, total: 0.46 },
      ],
    };
    
    const mapped = mapOrderToImport(multiTaxOrder);
    
    expect(mapped.taxBreakdown.shippingTax).toBeCloseTo(1.85, 2);
    expect(mapped.taxBreakdown.productTax).toBeCloseTo(10.65, 2);
  });

  it('should handle high-value orders', () => {
    const highValueOrder: EcwidOrder = {
      ...minimalOrder,
      id: 'HIGH001',
      subtotal: 9999.99,
      subtotalWithoutTax: 9259.25,
      total: 10824.99,
      totalWithoutTax: 10023.14,
      tax: 801.85,
      items: [
        {
          id: 1,
          productId: 1001,
          price: 9999.99,
          priceWithoutTax: 9259.25,
          sku: 'LUXURY-001',
          quantity: 1,
          name: 'Luxury Item',
          tax: 740.74,
          shipping: 0,
          weight: 2.0,
          isShippingRequired: true,
        },
      ],
    };
    
    const mapped = mapOrderToImport(highValueOrder);
    
    expect(mapped.subtotal).toBe(9259.25);
    expect(mapped.taxAmount).toBe(801.85);
    expect(mapped.totalAmount).toBe(10824.99);
  });

  it('should handle order with customer ID', () => {
    const orderWithCustomer: EcwidOrder = {
      ...minimalOrder,
      customerId: 50001,
      customerGroup: 'VIP',
      email: 'vip@example.com',
    };
    
    expect(orderWithCustomer.customerId).toBe(50001);
    expect(orderWithCustomer.customerGroup).toBe('VIP');
    
    const mapped = mapOrderToImport(orderWithCustomer);
    expect(mapped.customerEmail).toBe('vip@example.com');
  });
});
