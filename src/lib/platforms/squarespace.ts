/**
 * Squarespace Commerce API Integration
 * 
 * Squarespace uses API keys for authentication (Bearer token).
 * Users generate keys in: Settings → Advanced → Developer API Keys
 * Requires Commerce Advanced plan for Orders API access.
 */

import { prisma } from '../prisma';

// =============================================================================
// Types
// =============================================================================

export interface SquarespaceCredentials {
  apiKey: string;
  siteId?: string; // Optional - we can fetch this from the API
}

export interface SquarespaceAddress {
  firstName: string;
  lastName: string;
  address1: string;
  address2: string | null;
  city: string;
  state: string;
  countryCode: string;
  postalCode: string;
  phone: string | null;
}

export interface SquarespaceMoneyAmount {
  value: string;
  currency: string;
}

export interface SquarespaceLineItem {
  id: string;
  variantId: string | null;
  sku: string | null;
  productId: string;
  productName: string;
  quantity: number;
  unitPricePaid: SquarespaceMoneyAmount;
  variantOptions: Array<{ value: string; optionName: string }>;
  lineItemType: string;
}

export interface SquarespaceOrder {
  id: string;
  orderNumber: string;
  createdOn: string;
  modifiedOn: string;
  channel: string;
  testmode: boolean;
  customerEmail: string;
  billingAddress: SquarespaceAddress;
  shippingAddress: SquarespaceAddress;
  fulfillmentStatus: 'PENDING' | 'FULFILLED' | 'CANCELED';
  lineItems: SquarespaceLineItem[];
  shippingLines: Array<{
    method: string;
    amount: SquarespaceMoneyAmount;
  }>;
  discountLines: Array<{
    name: string;
    amount: SquarespaceMoneyAmount;
    promoCode: string | null;
  }>;
  subtotal: SquarespaceMoneyAmount;
  shippingTotal: SquarespaceMoneyAmount;
  discountTotal: SquarespaceMoneyAmount;
  taxTotal: SquarespaceMoneyAmount;
  refundedTotal: SquarespaceMoneyAmount;
  grandTotal: SquarespaceMoneyAmount;
  priceTaxInterpretation: 'EXCLUSIVE' | 'INCLUSIVE';
}

export interface SquarespaceOrdersResponse {
  result: SquarespaceOrder[];
  pagination: {
    hasNextPage: boolean;
    nextPageCursor: string | null;
    nextPageUrl: string | null;
  };
}

export interface SquarespaceWebsiteInfo {
  id: string;
  identifier: string;
  websiteTitle: string;
  language: string;
  timeZone: string;
  siteUrl: string;
}

// =============================================================================
// Constants
// =============================================================================

const API_BASE_URL = 'https://api.squarespace.com/1.0';

// =============================================================================
// API Helpers
// =============================================================================

/**
 * Make authenticated request to Squarespace API
 */
async function squarespaceRequest<T>(
  endpoint: string,
  apiKey: string,
  params: Record<string, string> = {}
): Promise<T> {
  const url = new URL(`${API_BASE_URL}${endpoint}`);
  
  // Add query params
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }
  
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'User-Agent': 'Sails/1.0 (Sales Tax Compliance)',
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Squarespace API error: ${response.status}`;
    
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.message || errorJson.error || errorMessage;
      
      // Handle specific error types
      if (errorJson.type === 'INVALID_REQUEST_ERROR') {
        errorMessage = `Invalid request: ${errorJson.subtype || errorJson.message}`;
      } else if (response.status === 401) {
        errorMessage = 'Invalid API key. Please check your key and try again.';
      } else if (response.status === 403) {
        errorMessage = 'Access denied. Make sure your API key has Orders API Read permission.';
      }
    } catch {
      // Use status text if not JSON
      if (response.status === 401) {
        errorMessage = 'Invalid API key. Please check your key and try again.';
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
 * Validate Squarespace API key by fetching website info
 */
export async function validateCredentials(
  apiKey: string
): Promise<{ valid: boolean; websiteInfo?: SquarespaceWebsiteInfo; error?: string }> {
  try {
    // Fetch website info to validate key
    // The /commerce/orders endpoint requires Orders API permission
    // We'll try to fetch orders with a very narrow date range to validate
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const response = await squarespaceRequest<SquarespaceOrdersResponse>(
      '/commerce/orders',
      apiKey,
      {
        modifiedAfter: yesterday.toISOString(),
        modifiedBefore: now.toISOString(),
      }
    );
    
    // If we got here, the key is valid and has Orders API access
    return {
      valid: true,
      websiteInfo: {
        id: 'unknown', // Squarespace doesn't expose site ID directly
        identifier: 'squarespace-store',
        websiteTitle: 'Squarespace Store',
        language: 'en',
        timeZone: 'UTC',
        siteUrl: 'https://squarespace.com',
      },
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Failed to validate API key',
    };
  }
}

/**
 * Save Squarespace connection to database
 */
export async function saveConnection(
  userId: string,
  apiKey: string,
  storeName?: string
): Promise<{ success: boolean; connectionId?: string; error?: string }> {
  try {
    // Generate a unique ID for this connection based on the API key
    // (We don't have access to site ID directly)
    const keyHash = Buffer.from(apiKey.slice(-8)).toString('base64').slice(0, 12);
    const platformId = `squarespace-${keyHash}`;
    
    // Check if connection already exists
    const existing = await prisma.platformConnection.findFirst({
      where: {
        userId,
        platform: 'squarespace',
      },
    });
    
    if (existing) {
      // Update existing connection
      const updated = await prisma.platformConnection.update({
        where: { id: existing.id },
        data: {
          platformId,
          platformName: storeName || 'Squarespace Store',
          accessToken: apiKey,
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
        platform: 'squarespace',
        platformId,
        platformName: storeName || 'Squarespace Store',
        accessToken: apiKey,
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
 * Get Squarespace API key from database
 */
export async function getCredentials(
  userId: string,
  platformId: string
): Promise<string | null> {
  const connection = await prisma.platformConnection.findUnique({
    where: {
      userId_platform_platformId: {
        userId,
        platform: 'squarespace',
        platformId,
      },
    },
  });
  
  return connection?.accessToken || null;
}

/**
 * Fetch orders from Squarespace
 */
export async function fetchOrders(
  apiKey: string,
  options: {
    modifiedAfter?: string; // ISO date string
    modifiedBefore?: string;
    fulfillmentStatus?: 'PENDING' | 'FULFILLED' | 'CANCELED';
    cursor?: string;
  } = {}
): Promise<SquarespaceOrdersResponse> {
  const params: Record<string, string> = {};
  
  if (options.cursor) {
    // Cursor cannot be used with other params
    params.cursor = options.cursor;
  } else {
    if (options.modifiedAfter) {
      params.modifiedAfter = options.modifiedAfter;
    }
    if (options.modifiedBefore) {
      params.modifiedBefore = options.modifiedBefore;
    }
  }
  
  if (options.fulfillmentStatus) {
    params.fulfillmentStatus = options.fulfillmentStatus;
  }
  
  return squarespaceRequest<SquarespaceOrdersResponse>(
    '/commerce/orders',
    apiKey,
    params
  );
}

/**
 * Fetch all orders with pagination
 */
export async function fetchAllOrders(
  apiKey: string,
  options: {
    modifiedAfter?: string;
    modifiedBefore?: string;
    maxPages?: number;
  } = {}
): Promise<SquarespaceOrder[]> {
  const allOrders: SquarespaceOrder[] = [];
  let cursor: string | undefined;
  let pageCount = 0;
  const maxPages = options.maxPages || 10; // Safety limit
  
  // First request uses date range
  let response = await fetchOrders(apiKey, {
    modifiedAfter: options.modifiedAfter,
    modifiedBefore: options.modifiedBefore,
  });
  
  allOrders.push(...response.result);
  pageCount++;
  
  // Subsequent requests use cursor
  while (response.pagination.hasNextPage && response.pagination.nextPageCursor && pageCount < maxPages) {
    cursor = response.pagination.nextPageCursor;
    response = await fetchOrders(apiKey, { cursor });
    allOrders.push(...response.result);
    pageCount++;
  }
  
  return allOrders;
}

/**
 * Map Squarespace order to our ImportedOrder format
 */
export function mapOrderToImport(order: SquarespaceOrder) {
  const shipping = order.shippingAddress || order.billingAddress;
  
  // Calculate subtotal from line items if needed
  const subtotal = parseFloat(order.subtotal.value);
  const shippingAmount = parseFloat(order.shippingTotal.value);
  const taxAmount = parseFloat(order.taxTotal.value);
  const totalAmount = parseFloat(order.grandTotal.value);
  
  return {
    platform: 'squarespace',
    platformOrderId: order.id,
    orderNumber: order.orderNumber,
    orderDate: new Date(order.createdOn),
    subtotal,
    shippingAmount,
    taxAmount,
    totalAmount,
    currency: order.grandTotal.currency,
    status: mapFulfillmentStatus(order.fulfillmentStatus),
    customerEmail: order.customerEmail,
    shippingState: shipping.state,
    shippingCity: shipping.city,
    shippingZip: shipping.postalCode,
    shippingCountry: shipping.countryCode || 'US',
    billingState: order.billingAddress?.state,
    lineItems: order.lineItems.map(item => ({
      id: item.id,
      name: item.productName,
      quantity: item.quantity,
      unitPrice: parseFloat(item.unitPricePaid.value),
      total: parseFloat(item.unitPricePaid.value) * item.quantity,
      sku: item.sku,
      type: item.lineItemType,
      variantOptions: item.variantOptions,
    })),
    taxBreakdown: {
      taxTotal: taxAmount,
      priceTaxInterpretation: order.priceTaxInterpretation,
    },
    rawData: order,
  };
}

/**
 * Map Squarespace fulfillment status to our standard status
 */
function mapFulfillmentStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'PENDING': 'pending',
    'FULFILLED': 'fulfilled',
    'CANCELED': 'cancelled',
  };
  return statusMap[status] || 'pending';
}
