/**
 * Ecwid API Integration
 * 
 * Ecwid uses a simple REST API with Bearer token authentication:
 * - Base URL: https://app.ecwid.com/api/v3/{storeId}
 * - Auth: Bearer token (Secret API token)
 * - Store ID: Found in Ecwid admin dashboard
 * 
 * API tokens are found in:
 * Ecwid Admin → Settings → API → Access tokens
 */

import { prisma } from '../prisma';

// =============================================================================
// Types
// =============================================================================

export interface EcwidCredentials {
  storeId: string;
  apiToken: string;
}

export interface EcwidOrderItem {
  id: number;
  productId: number;
  price: number;
  priceWithoutTax: number;
  sku: string;
  quantity: number;
  name: string;
  tax: number;
  shipping: number;
  weight: number;
  isShippingRequired: boolean;
}

export interface EcwidShippingPerson {
  name?: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  street?: string;
  city?: string;
  countryCode?: string;
  countryName?: string;
  postalCode?: string;
  stateOrProvinceCode?: string;
  stateOrProvinceName?: string;
  phone?: string;
}

export interface EcwidShippingOption {
  shippingMethodId?: string;
  shippingMethodName?: string;
  shippingRate?: number;
  shippingRateWithoutTax?: number;
  isPickup?: boolean;
  fulfillmentType?: string;
}

export interface EcwidTaxOnShipping {
  name: string;
  value: number;
  total: number;
}

export interface EcwidOrder {
  id: string;
  internalId: number;
  orderNumber: number;
  vendorOrderNumber: string;
  email: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  subtotal: number;
  subtotalWithoutTax: number;
  total: number;
  totalWithoutTax: number;
  tax: number;
  couponDiscount: number;
  discount: number;
  refundedAmount: number;
  createDate: string;
  updateDate: string;
  createTimestamp: number;
  updateTimestamp: number;
  items: EcwidOrderItem[];
  shippingPerson?: EcwidShippingPerson;
  billingPerson?: EcwidShippingPerson;
  shippingOption?: EcwidShippingOption;
  taxesOnShipping?: EcwidTaxOnShipping[];
  pricesIncludeTax: boolean;
  customerId?: number;
  customerGroup?: string;
}

export interface EcwidOrdersResponse {
  total: number;
  count: number;
  offset: number;
  limit: number;
  items: EcwidOrder[];
}

export interface EcwidStoreProfile {
  generalInfo?: {
    storeId: number;
    storeUrl?: string;
    starterSite?: {
      ecwidSubdomain?: string;
    };
  };
  account?: {
    accountName?: string;
    accountEmail?: string;
  };
  settings?: {
    storeName?: string;
    currency?: string;
  };
}

// =============================================================================
// Constants
// =============================================================================

const API_BASE_URL = 'https://app.ecwid.com/api/v3';

// =============================================================================
// API Helpers
// =============================================================================

/**
 * Make authenticated request to Ecwid API
 */
async function ecwidRequest<T>(
  storeId: string,
  endpoint: string,
  apiToken: string,
  params: Record<string, string | number> = {}
): Promise<T> {
  const url = new URL(`${API_BASE_URL}/${storeId}${endpoint}`);
  
  // Add query params
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  }
  
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Accept': 'application/json',
    },
  });
  
  if (!response.ok) {
    let errorMessage = `Ecwid API error: ${response.status}`;
    
    try {
      const errorData = await response.json();
      errorMessage = errorData.errorMessage || errorData.message || errorMessage;
    } catch {
      // Use default error message
    }
    
    if (response.status === 401 || response.status === 403) {
      errorMessage = 'Invalid API token. Please check your credentials.';
    } else if (response.status === 404) {
      errorMessage = 'Store not found. Please check your Store ID.';
    }
    
    throw new Error(errorMessage);
  }
  
  return response.json();
}

// =============================================================================
// Public Functions
// =============================================================================

/**
 * Validate Ecwid credentials by fetching store profile
 */
export async function validateCredentials(
  credentials: EcwidCredentials
): Promise<{ valid: boolean; storeInfo?: EcwidStoreProfile; error?: string }> {
  try {
    const storeProfile = await ecwidRequest<EcwidStoreProfile>(
      credentials.storeId,
      '/profile',
      credentials.apiToken
    );
    
    return {
      valid: true,
      storeInfo: storeProfile,
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Failed to validate credentials',
    };
  }
}

/**
 * Save Ecwid connection to database
 */
export async function saveConnection(
  userId: string,
  credentials: EcwidCredentials,
  storeName?: string
): Promise<{ success: boolean; connectionId?: string; error?: string }> {
  try {
    // Check if connection already exists
    const existing = await prisma.platformConnection.findFirst({
      where: {
        userId,
        platform: 'ecwid',
        platformId: credentials.storeId,
      },
    });
    
    if (existing) {
      // Update existing connection
      const updated = await prisma.platformConnection.update({
        where: { id: existing.id },
        data: {
          platformName: storeName || 'Ecwid Store',
          accessToken: credentials.apiToken,
          syncStatus: 'pending',
          syncError: null,
        },
      });
      
      return { success: true, connectionId: updated.id };
    }
    
    // Create new connection
    const connection = await prisma.platformConnection.create({
      data: {
        userId,
        platform: 'ecwid',
        platformId: credentials.storeId,
        platformName: storeName || 'Ecwid Store',
        accessToken: credentials.apiToken,
        syncStatus: 'pending',
      },
    });
    
    return { success: true, connectionId: connection.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save connection',
    };
  }
}

/**
 * Get Ecwid credentials from database
 */
export async function getCredentials(
  userId: string,
  storeId: string
): Promise<EcwidCredentials | null> {
  const connection = await prisma.platformConnection.findUnique({
    where: {
      userId_platform_platformId: {
        userId,
        platform: 'ecwid',
        platformId: storeId,
      },
    },
  });
  
  if (!connection || !connection.accessToken) {
    return null;
  }
  
  return {
    storeId: connection.platformId,
    apiToken: connection.accessToken,
  };
}

/**
 * Fetch orders from Ecwid
 */
export async function fetchOrders(
  credentials: EcwidCredentials,
  options: {
    createdFrom?: string; // Date string or UNIX timestamp
    createdTo?: string;
    fulfillmentStatus?: string;
    paymentStatus?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<EcwidOrder[]> {
  const params: Record<string, string | number> = {
    limit: options.limit || 100,
    offset: options.offset || 0,
  };
  
  if (options.createdFrom) {
    params.createdFrom = options.createdFrom;
  }
  if (options.createdTo) {
    params.createdTo = options.createdTo;
  }
  if (options.fulfillmentStatus) {
    params.fulfillmentStatus = options.fulfillmentStatus;
  }
  if (options.paymentStatus) {
    params.paymentStatus = options.paymentStatus;
  }
  
  const response = await ecwidRequest<EcwidOrdersResponse>(
    credentials.storeId,
    '/orders',
    credentials.apiToken,
    params
  );
  
  return response.items || [];
}

/**
 * Fetch all orders with pagination
 */
export async function fetchAllOrders(
  credentials: EcwidCredentials,
  options: {
    createdFrom?: string;
    createdTo?: string;
    maxPages?: number;
  } = {}
): Promise<EcwidOrder[]> {
  const allOrders: EcwidOrder[] = [];
  let offset = 0;
  const limit = 100;
  const maxPages = options.maxPages || 10;
  let page = 0;
  
  while (page < maxPages) {
    const orders = await fetchOrders(credentials, {
      ...options,
      limit,
      offset,
    });
    
    if (!orders || orders.length === 0) {
      break;
    }
    
    allOrders.push(...orders);
    
    if (orders.length < limit) {
      break;
    }
    
    offset += limit;
    page++;
  }
  
  return allOrders;
}

/**
 * Fetch a single order by ID
 */
export async function fetchOrder(
  credentials: EcwidCredentials,
  orderId: string
): Promise<EcwidOrder | null> {
  try {
    return await ecwidRequest<EcwidOrder>(
      credentials.storeId,
      `/orders/${orderId}`,
      credentials.apiToken
    );
  } catch {
    return null;
  }
}

/**
 * Map Ecwid order to our ImportedOrder format
 */
export function mapOrderToImport(order: EcwidOrder) {
  const shippingPerson = order.shippingPerson || order.billingPerson;
  
  // Calculate shipping tax
  let shippingTax = 0;
  if (order.taxesOnShipping) {
    shippingTax = order.taxesOnShipping.reduce((sum, t) => sum + (t.total || 0), 0);
  }
  
  // Calculate product tax (total tax minus shipping tax)
  const productTax = (order.tax || 0) - shippingTax;
  
  return {
    platform: 'ecwid',
    platformOrderId: order.id,
    orderNumber: order.vendorOrderNumber || String(order.orderNumber),
    orderDate: new Date(order.createDate || order.createTimestamp * 1000),
    subtotal: order.subtotalWithoutTax || order.subtotal || 0,
    shippingAmount: order.shippingOption?.shippingRateWithoutTax || order.shippingOption?.shippingRate || 0,
    taxAmount: order.tax || 0,
    totalAmount: order.total || 0,
    currency: 'USD', // Would need to fetch from store profile
    status: mapOrderStatus(order.paymentStatus, order.fulfillmentStatus),
    customerEmail: order.email,
    shippingState: shippingPerson?.stateOrProvinceCode || shippingPerson?.stateOrProvinceName,
    shippingCity: shippingPerson?.city,
    shippingZip: shippingPerson?.postalCode,
    shippingCountry: shippingPerson?.countryCode || 'US',
    billingState: order.billingPerson?.stateOrProvinceCode || order.billingPerson?.stateOrProvinceName,
    lineItems: order.items?.map(item => ({
      productId: String(item.productId),
      sku: item.sku,
      name: item.name,
      quantity: item.quantity,
      price: item.priceWithoutTax || item.price,
      tax: item.tax || 0,
      total: (item.priceWithoutTax || item.price) * item.quantity,
    })),
    taxBreakdown: {
      productTax,
      shippingTax,
      totalTax: order.tax || 0,
    },
    rawData: order,
  };
}

/**
 * Map Ecwid order statuses to our standard status
 */
function mapOrderStatus(paymentStatus: string, fulfillmentStatus: string): string {
  // Check fulfillment first
  const fulfillmentMap: Record<string, string> = {
    'SHIPPED': 'fulfilled',
    'DELIVERED': 'fulfilled',
    'READY_FOR_PICKUP': 'fulfilled',
    'OUT_FOR_DELIVERY': 'fulfilled',
    'RETURNED': 'refunded',
    'WILL_NOT_DELIVER': 'cancelled',
  };
  
  if (fulfillmentMap[fulfillmentStatus]) {
    return fulfillmentMap[fulfillmentStatus];
  }
  
  // Check payment status
  const paymentMap: Record<string, string> = {
    'PAID': 'processing',
    'AWAITING_PAYMENT': 'pending',
    'CANCELLED': 'cancelled',
    'REFUNDED': 'refunded',
    'PARTIALLY_REFUNDED': 'refunded',
    'INCOMPLETE': 'pending',
  };
  
  return paymentMap[paymentStatus] || 'pending';
}
