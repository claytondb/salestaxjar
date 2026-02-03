/**
 * OpenCart API Integration
 * 
 * OpenCart uses a session-based API:
 * - Login first to get api_token
 * - Use api_token as cookie (OCSESSID) for subsequent requests
 * - API key is generated in Admin → System → Users → API
 * 
 * Note: OpenCart's built-in API is primarily for checkout operations.
 * For order sync, users may need a REST API extension or we fetch via
 * the sale/order endpoints available in OpenCart 4.x.
 * 
 * IP whitelisting is required in OpenCart admin for API access.
 */

import { prisma } from '../prisma';

// =============================================================================
// Types
// =============================================================================

export interface OpenCartCredentials {
  storeUrl: string;
  apiUsername: string;
  apiKey: string;
}

export interface OpenCartLoginResponse {
  api_token?: string;
  token?: string; // OpenCart 3.x
  success?: string;
  error?: {
    ip?: string;
    key?: string;
    warning?: string;
  };
}

export interface OpenCartOrderProduct {
  order_product_id: string;
  product_id: string;
  name: string;
  model: string;
  quantity: string;
  price: string;
  total: string;
  tax: string;
}

export interface OpenCartOrderTotal {
  order_total_id: string;
  code: string;
  title: string;
  value: string;
  sort_order: string;
}

export interface OpenCartOrder {
  order_id: string;
  invoice_no: string;
  invoice_prefix: string;
  store_id: string;
  store_name: string;
  store_url: string;
  customer_id: string;
  customer_group_id: string;
  firstname: string;
  lastname: string;
  email: string;
  telephone: string;
  payment_firstname: string;
  payment_lastname: string;
  payment_company: string;
  payment_address_1: string;
  payment_address_2: string;
  payment_city: string;
  payment_postcode: string;
  payment_country: string;
  payment_country_id: string;
  payment_zone: string;
  payment_zone_id: string;
  payment_method: string;
  shipping_firstname: string;
  shipping_lastname: string;
  shipping_company: string;
  shipping_address_1: string;
  shipping_address_2: string;
  shipping_city: string;
  shipping_postcode: string;
  shipping_country: string;
  shipping_country_id: string;
  shipping_zone: string;
  shipping_zone_id: string;
  shipping_method: string;
  comment: string;
  total: string;
  order_status_id: string;
  order_status: string;
  currency_code: string;
  currency_value: string;
  date_added: string;
  date_modified: string;
  products?: OpenCartOrderProduct[];
  totals?: OpenCartOrderTotal[];
}

export interface OpenCartOrdersResponse {
  orders?: OpenCartOrder[];
  order?: OpenCartOrder;
  success?: string;
  error?: string;
}

// =============================================================================
// API Helpers
// =============================================================================

/**
 * Normalize store URL to ensure proper format
 */
function normalizeStoreUrl(url: string): string {
  let normalized = url.trim();
  
  // Remove trailing slash
  if (normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }
  
  // Ensure https
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = 'https://' + normalized;
  }
  
  return normalized;
}

/**
 * Login to OpenCart API and get session token
 */
async function openCartLogin(
  storeUrl: string,
  apiUsername: string,
  apiKey: string
): Promise<{ token: string | null; error?: string }> {
  const baseUrl = normalizeStoreUrl(storeUrl);
  
  // Try OpenCart 4.x endpoint first
  let loginUrl = `${baseUrl}/index.php?route=api/account/login`;
  
  const formData = new URLSearchParams();
  formData.append('username', apiUsername);
  formData.append('key', apiKey);
  
  let response = await fetch(loginUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });
  
  // If 404, try OpenCart 3.x endpoint
  if (response.status === 404) {
    loginUrl = `${baseUrl}/index.php?route=api/login`;
    response = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });
  }
  
  if (!response.ok) {
    return { token: null, error: `HTTP ${response.status}: Failed to connect to OpenCart API` };
  }
  
  const data: OpenCartLoginResponse = await response.json();
  
  // Check for errors
  if (data.error) {
    if (data.error.ip) {
      return { token: null, error: data.error.ip };
    }
    if (data.error.key) {
      return { token: null, error: data.error.key };
    }
    if (data.error.warning) {
      return { token: null, error: data.error.warning };
    }
    return { token: null, error: 'Authentication failed' };
  }
  
  // Get token (different field names in different versions)
  const token = data.api_token || data.token;
  
  if (!token) {
    return { token: null, error: 'No token received from API' };
  }
  
  return { token };
}

/**
 * Make authenticated request to OpenCart API
 */
async function openCartRequest<T>(
  storeUrl: string,
  endpoint: string,
  token: string,
  params: Record<string, string> = {}
): Promise<T> {
  const baseUrl = normalizeStoreUrl(storeUrl);
  const url = new URL(`${baseUrl}/index.php`);
  
  url.searchParams.set('route', endpoint);
  
  // Add additional params
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }
  
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Cookie': `OCSESSID=${token}; api_token=${token}`,
    },
  });
  
  if (!response.ok) {
    throw new Error(`OpenCart API error: ${response.status}`);
  }
  
  return response.json();
}

// =============================================================================
// Public Functions
// =============================================================================

/**
 * Validate OpenCart credentials by attempting login
 */
export async function validateCredentials(
  credentials: OpenCartCredentials
): Promise<{ valid: boolean; token?: string; error?: string }> {
  try {
    const result = await openCartLogin(
      credentials.storeUrl,
      credentials.apiUsername,
      credentials.apiKey
    );
    
    if (result.token) {
      return { valid: true, token: result.token };
    }
    
    return { valid: false, error: result.error };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Failed to validate credentials',
    };
  }
}

/**
 * Save OpenCart connection to database
 */
export async function saveConnection(
  userId: string,
  credentials: OpenCartCredentials,
  storeName?: string
): Promise<{ success: boolean; connectionId?: string; error?: string }> {
  try {
    const normalizedUrl = normalizeStoreUrl(credentials.storeUrl);
    
    // Use the URL as the platform ID (unique identifier)
    const platformId = normalizedUrl.replace(/^https?:\/\//, '').replace(/\//g, '_');
    
    // Store credentials as JSON in accessToken field
    const credentialsJson = JSON.stringify({
      username: credentials.apiUsername,
      key: credentials.apiKey,
    });
    
    // Check if connection already exists
    const existing = await prisma.platformConnection.findFirst({
      where: {
        userId,
        platform: 'opencart',
        platformId,
      },
    });
    
    if (existing) {
      // Update existing connection
      const updated = await prisma.platformConnection.update({
        where: { id: existing.id },
        data: {
          platformName: storeName || 'OpenCart Store',
          accessToken: credentialsJson,
          refreshToken: normalizedUrl, // Store the URL
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
        platform: 'opencart',
        platformId,
        platformName: storeName || 'OpenCart Store',
        accessToken: credentialsJson,
        refreshToken: normalizedUrl,
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
 * Get OpenCart credentials from database
 */
export async function getCredentials(
  userId: string,
  platformId: string
): Promise<OpenCartCredentials | null> {
  const connection = await prisma.platformConnection.findUnique({
    where: {
      userId_platform_platformId: {
        userId,
        platform: 'opencart',
        platformId,
      },
    },
  });
  
  if (!connection || !connection.accessToken || !connection.refreshToken) {
    return null;
  }
  
  try {
    const credentials = JSON.parse(connection.accessToken);
    return {
      storeUrl: connection.refreshToken,
      apiUsername: credentials.username,
      apiKey: credentials.key,
    };
  } catch {
    return null;
  }
}

/**
 * Fetch a single order by ID
 * 
 * Note: This uses the sale/order endpoint available in OpenCart 4.x
 * For OpenCart 3.x, a custom extension may be needed
 */
export async function fetchOrder(
  credentials: OpenCartCredentials,
  orderId: string
): Promise<OpenCartOrder | null> {
  try {
    // Login first
    const loginResult = await openCartLogin(
      credentials.storeUrl,
      credentials.apiUsername,
      credentials.apiKey
    );
    
    if (!loginResult.token) {
      throw new Error(loginResult.error || 'Failed to login');
    }
    
    // Try to fetch order (OpenCart 4.x endpoint)
    const response = await openCartRequest<OpenCartOrdersResponse>(
      credentials.storeUrl,
      'api/sale/order.load',
      loginResult.token,
      { order_id: orderId }
    );
    
    return response.order || null;
  } catch {
    return null;
  }
}

/**
 * Fetch orders from OpenCart
 * 
 * Note: OpenCart's built-in API doesn't have a standard "list orders" endpoint.
 * This requires either:
 * 1. A REST API extension (like CartRover, OpenCart REST API)
 * 2. Custom endpoint in the store
 * 
 * This implementation attempts to use common extension endpoints.
 */
export async function fetchOrders(
  credentials: OpenCartCredentials,
  options: {
    dateFrom?: string;
    dateTo?: string;
    status?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<OpenCartOrder[]> {
  try {
    // Login first
    const loginResult = await openCartLogin(
      credentials.storeUrl,
      credentials.apiUsername,
      credentials.apiKey
    );
    
    if (!loginResult.token) {
      throw new Error(loginResult.error || 'Failed to login');
    }
    
    // Try common REST API extension endpoint
    const params: Record<string, string> = {};
    
    if (options.limit) {
      params.limit = String(options.limit);
    }
    if (options.offset) {
      params.offset = String(options.offset);
    }
    if (options.dateFrom) {
      params.date_from = options.dateFrom;
    }
    if (options.dateTo) {
      params.date_to = options.dateTo;
    }
    if (options.status) {
      params.status = options.status;
    }
    
    // Try multiple possible endpoints
    const endpoints = [
      'api/sale/orders',           // Some OpenCart 4.x setups
      'feed/rest_api/orders',      // Common REST API extension
      'feed/gss_api/orders',       // CartRover extension
      'api/orders',                // Generic
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await openCartRequest<OpenCartOrdersResponse>(
          credentials.storeUrl,
          endpoint,
          loginResult.token,
          params
        );
        
        if (response.orders && Array.isArray(response.orders)) {
          return response.orders;
        }
      } catch {
        // Try next endpoint
        continue;
      }
    }
    
    // If no endpoints work, return empty (user may need to install extension)
    return [];
  } catch {
    return [];
  }
}

/**
 * Map OpenCart order to our ImportedOrder format
 */
export function mapOrderToImport(order: OpenCartOrder) {
  // Calculate tax from totals
  let taxAmount = 0;
  let shippingAmount = 0;
  let subtotal = 0;
  
  if (order.totals) {
    for (const total of order.totals) {
      if (total.code === 'tax') {
        taxAmount += parseFloat(total.value) || 0;
      } else if (total.code === 'shipping') {
        shippingAmount = parseFloat(total.value) || 0;
      } else if (total.code === 'sub_total') {
        subtotal = parseFloat(total.value) || 0;
      }
    }
  }
  
  // If no subtotal in totals, calculate from products
  if (subtotal === 0 && order.products) {
    subtotal = order.products.reduce((sum, p) => sum + (parseFloat(p.total) || 0), 0);
  }
  
  return {
    platform: 'opencart',
    platformOrderId: order.order_id,
    orderNumber: order.invoice_prefix + order.invoice_no || order.order_id,
    orderDate: new Date(order.date_added),
    subtotal,
    shippingAmount,
    taxAmount,
    totalAmount: parseFloat(order.total) || 0,
    currency: order.currency_code || 'USD',
    status: mapOrderStatus(order.order_status_id),
    customerEmail: order.email,
    shippingState: order.shipping_zone,
    shippingCity: order.shipping_city,
    shippingZip: order.shipping_postcode,
    shippingCountry: order.shipping_country || 'US',
    billingState: order.payment_zone,
    lineItems: order.products?.map(item => ({
      productId: item.product_id,
      sku: item.model,
      name: item.name,
      quantity: parseInt(item.quantity) || 1,
      price: parseFloat(item.price) || 0,
      total: parseFloat(item.total) || 0,
      tax: parseFloat(item.tax) || 0,
    })),
    taxBreakdown: {
      totalTax: taxAmount,
    },
    rawData: order,
  };
}

/**
 * Map OpenCart order status ID to our standard status
 * Default OpenCart statuses:
 * 1: Pending, 2: Processing, 3: Shipped, 5: Complete,
 * 7: Canceled, 8: Denied, 9: Canceled Reversal, 10: Failed,
 * 11: Refunded, 12: Reversed, 13: Chargeback, 14: Expired,
 * 15: Processed, 16: Voided
 */
function mapOrderStatus(statusId: string): string {
  const statusMap: Record<string, string> = {
    '1': 'pending',
    '2': 'processing',
    '3': 'fulfilled',
    '5': 'fulfilled',
    '7': 'cancelled',
    '8': 'cancelled',
    '9': 'cancelled',
    '10': 'cancelled',
    '11': 'refunded',
    '12': 'refunded',
    '13': 'refunded',
    '14': 'cancelled',
    '15': 'processing',
    '16': 'cancelled',
  };
  return statusMap[statusId] || 'pending';
}
