/**
 * BigCommerce API Integration
 * 
 * BigCommerce uses store-level API credentials:
 * - Store Hash: Identifies the store (found in API URL)
 * - Access Token: For authentication (X-Auth-Token header)
 * 
 * Users generate these in: Control Panel → Settings → API → Store-level API accounts
 */

import { prisma } from '../prisma';

// =============================================================================
// Types
// =============================================================================

export interface BigCommerceCredentials {
  storeHash: string;
  accessToken: string;
}

export interface BigCommerceAddress {
  first_name: string;
  last_name: string;
  company: string;
  street_1: string;
  street_2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  country_iso2: string;
  phone: string;
  email: string;
}

export interface BigCommerceOrderProduct {
  id: number;
  order_id: number;
  product_id: number;
  name: string;
  sku: string;
  quantity: number;
  price_inc_tax: string;
  price_ex_tax: string;
  total_inc_tax: string;
  total_ex_tax: string;
}

export interface BigCommerceOrder {
  id: number;
  customer_id: number;
  date_created: string;
  date_modified: string;
  date_shipped: string;
  status_id: number;
  status: string;
  subtotal_ex_tax: string;
  subtotal_inc_tax: string;
  subtotal_tax: string;
  base_shipping_cost: string;
  shipping_cost_ex_tax: string;
  shipping_cost_inc_tax: string;
  shipping_cost_tax: string;
  total_ex_tax: string;
  total_inc_tax: string;
  total_tax: string;
  items_total: number;
  items_shipped: number;
  payment_method: string;
  payment_status: string;
  refunded_amount: string;
  currency_code: string;
  billing_address: BigCommerceAddress;
  products?: {
    url: string;
    resource: string;
  };
  shipping_addresses?: {
    url: string;
    resource: string;
  };
}

export interface BigCommerceShippingAddress extends BigCommerceAddress {
  id: number;
  order_id: number;
  items_total: number;
  items_shipped: number;
  base_cost: string;
  cost_ex_tax: string;
  cost_inc_tax: string;
  cost_tax: string;
  shipping_method: string;
}

export interface BigCommerceStoreInfo {
  id: string;
  domain: string;
  name: string;
  plan_name: string;
  plan_level: string;
  status: string;
  currency: string;
}

// =============================================================================
// Constants
// =============================================================================

const API_BASE_URL = 'https://api.bigcommerce.com/stores';

// =============================================================================
// API Helpers
// =============================================================================

/**
 * Make authenticated request to BigCommerce API
 */
async function bigCommerceRequest<T>(
  storeHash: string,
  endpoint: string,
  accessToken: string,
  params: Record<string, string> = {}
): Promise<T> {
  const url = new URL(`${API_BASE_URL}/${storeHash}${endpoint}`);
  
  // Add query params
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }
  
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'X-Auth-Token': accessToken,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `BigCommerce API error: ${response.status}`;
    
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.title || errorJson.message || errorMessage;
      
      if (response.status === 401) {
        errorMessage = 'Invalid credentials. Please check your Store Hash and Access Token.';
      } else if (response.status === 403) {
        errorMessage = 'Access denied. Make sure your API account has Orders read permission.';
      }
    } catch {
      if (response.status === 401) {
        errorMessage = 'Invalid credentials. Please check your Store Hash and Access Token.';
      }
    }
    
    throw new Error(errorMessage);
  }
  
  return response.json();
}

// =============================================================================
// Public Functions
// =============================================================================

/**
 * Validate BigCommerce credentials by fetching store info
 */
export async function validateCredentials(
  credentials: BigCommerceCredentials
): Promise<{ valid: boolean; storeInfo?: BigCommerceStoreInfo; error?: string }> {
  try {
    // Fetch store info using V2 API
    const storeInfo = await bigCommerceRequest<BigCommerceStoreInfo>(
      credentials.storeHash,
      '/v2/store',
      credentials.accessToken
    );
    
    return {
      valid: true,
      storeInfo,
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Failed to validate credentials',
    };
  }
}

/**
 * Save BigCommerce connection to database
 */
export async function saveConnection(
  userId: string,
  credentials: BigCommerceCredentials,
  storeName?: string
): Promise<{ success: boolean; connectionId?: string; error?: string }> {
  try {
    // Check if connection already exists
    const existing = await prisma.platformConnection.findFirst({
      where: {
        userId,
        platform: 'bigcommerce',
        platformId: credentials.storeHash,
      },
    });
    
    if (existing) {
      // Update existing connection
      const updated = await prisma.platformConnection.update({
        where: { id: existing.id },
        data: {
          platformName: storeName || 'BigCommerce Store',
          accessToken: credentials.accessToken,
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
        platform: 'bigcommerce',
        platformId: credentials.storeHash,
        platformName: storeName || 'BigCommerce Store',
        accessToken: credentials.accessToken,
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
 * Get BigCommerce credentials from database
 */
export async function getCredentials(
  userId: string,
  storeHash: string
): Promise<BigCommerceCredentials | null> {
  const connection = await prisma.platformConnection.findUnique({
    where: {
      userId_platform_platformId: {
        userId,
        platform: 'bigcommerce',
        platformId: storeHash,
      },
    },
  });
  
  if (!connection || !connection.accessToken) {
    return null;
  }
  
  return {
    storeHash: connection.platformId,
    accessToken: connection.accessToken,
  };
}

/**
 * Fetch orders from BigCommerce
 */
export async function fetchOrders(
  credentials: BigCommerceCredentials,
  options: {
    minDateCreated?: string; // RFC 2822 or ISO 8601 date
    maxDateCreated?: string;
    statusId?: number;
    page?: number;
    limit?: number;
  } = {}
): Promise<BigCommerceOrder[]> {
  const params: Record<string, string> = {
    limit: String(options.limit || 50),
    page: String(options.page || 1),
    sort: 'date_created:desc',
  };
  
  if (options.minDateCreated) {
    params.min_date_created = options.minDateCreated;
  }
  if (options.maxDateCreated) {
    params.max_date_created = options.maxDateCreated;
  }
  if (options.statusId !== undefined) {
    params.status_id = String(options.statusId);
  }
  
  return bigCommerceRequest<BigCommerceOrder[]>(
    credentials.storeHash,
    '/v2/orders',
    credentials.accessToken,
    params
  );
}

/**
 * Fetch all orders with pagination
 */
export async function fetchAllOrders(
  credentials: BigCommerceCredentials,
  options: {
    minDateCreated?: string;
    maxDateCreated?: string;
    maxPages?: number;
  } = {}
): Promise<BigCommerceOrder[]> {
  const allOrders: BigCommerceOrder[] = [];
  let page = 1;
  const maxPages = options.maxPages || 10; // Safety limit
  
  while (page <= maxPages) {
    const orders = await fetchOrders(credentials, {
      ...options,
      page,
      limit: 50,
    });
    
    // BigCommerce returns empty array when no more orders
    if (!orders || orders.length === 0) {
      break;
    }
    
    allOrders.push(...orders);
    
    if (orders.length < 50) {
      break; // No more pages
    }
    
    page++;
  }
  
  return allOrders;
}

/**
 * Fetch shipping addresses for an order
 */
export async function fetchOrderShippingAddresses(
  credentials: BigCommerceCredentials,
  orderId: number
): Promise<BigCommerceShippingAddress[]> {
  return bigCommerceRequest<BigCommerceShippingAddress[]>(
    credentials.storeHash,
    `/v2/orders/${orderId}/shipping_addresses`,
    credentials.accessToken
  );
}

/**
 * Map BigCommerce order to our ImportedOrder format
 */
export function mapOrderToImport(
  order: BigCommerceOrder, 
  shippingAddress?: BigCommerceShippingAddress
) {
  // Use shipping address if available, otherwise billing
  const address = shippingAddress || order.billing_address;
  
  return {
    platform: 'bigcommerce',
    platformOrderId: String(order.id),
    orderNumber: String(order.id),
    orderDate: new Date(order.date_created),
    subtotal: parseFloat(order.subtotal_ex_tax),
    shippingAmount: parseFloat(order.shipping_cost_ex_tax),
    taxAmount: parseFloat(order.total_tax),
    totalAmount: parseFloat(order.total_inc_tax),
    currency: order.currency_code || 'USD',
    status: mapOrderStatus(order.status_id),
    customerEmail: order.billing_address?.email,
    shippingState: address?.state,
    shippingCity: address?.city,
    shippingZip: address?.zip,
    shippingCountry: address?.country_iso2 || 'US',
    billingState: order.billing_address?.state,
    lineItems: [], // Would need separate API call to fetch
    taxBreakdown: {
      subtotalTax: parseFloat(order.subtotal_tax),
      shippingTax: parseFloat(order.shipping_cost_tax),
      totalTax: parseFloat(order.total_tax),
    },
    rawData: order,
  };
}

/**
 * Map BigCommerce order status ID to our standard status
 */
function mapOrderStatus(statusId: number): string {
  // BigCommerce status IDs:
  // 0: Incomplete, 1: Pending, 2: Shipped, 3: Partially Shipped,
  // 4: Refunded, 5: Cancelled, 6: Declined, 7: Awaiting Payment,
  // 8: Awaiting Pickup, 9: Awaiting Shipment, 10: Completed,
  // 11: Awaiting Fulfillment, 12: Manual Verification Required,
  // 13: Disputed, 14: Partially Refunded
  const statusMap: Record<number, string> = {
    0: 'pending',
    1: 'pending',
    2: 'fulfilled',
    3: 'fulfilled',
    4: 'refunded',
    5: 'cancelled',
    6: 'cancelled',
    7: 'pending',
    8: 'pending',
    9: 'pending',
    10: 'fulfilled',
    11: 'pending',
    12: 'pending',
    13: 'pending',
    14: 'refunded',
  };
  return statusMap[statusId] || 'pending';
}
