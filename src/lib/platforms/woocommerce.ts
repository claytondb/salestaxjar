/**
 * WooCommerce Integration
 * 
 * WooCommerce uses REST API with Consumer Key/Secret authentication.
 * Unlike OAuth platforms, credentials are stored per-store in our database.
 */

import { prisma } from '../prisma';
import { assertPublicStoreUrl } from './url-guard';

// =============================================================================
// Types
// =============================================================================

export interface WooCommerceCredentials {
  storeUrl: string;
  consumerKey: string;
  consumerSecret: string;
}

export interface WooCommerceOrder {
  id: number;
  number: string;
  status: string;
  date_created: string;
  total: string;
  total_tax: string;
  shipping_total: string;
  currency: string;
  billing: {
    email: string;
    state: string;
    city: string;
    postcode: string;
    country: string;
  };
  shipping: {
    state: string;
    city: string;
    postcode: string;
    country: string;
  };
  line_items: Array<{
    id: number;
    name: string;
    quantity: number;
    subtotal: string;
    total: string;
    total_tax: string;
    sku: string;
  }>;
  tax_lines: Array<{
    id: number;
    rate_code: string;
    rate_id: number;
    label: string;
    compound: boolean;
    tax_total: string;
    shipping_tax_total: string;
  }>;
}

export interface WooCommerceStoreInfo {
  name: string;
  description: string;
  url: string;
  wc_version: string;
  currency: string;
  currency_symbol: string;
}

// =============================================================================
// API Helpers
// =============================================================================

/**
 * Normalize store URL to consistent format
 */
export function normalizeStoreUrl(url: string): string {
  let normalized = url.trim().toLowerCase();

  // Force https. Upgrade insecure http:// and add the scheme when missing so
  // credentials are never sent in cleartext.
  if (normalized.startsWith('http://')) {
    normalized = 'https://' + normalized.slice('http://'.length);
  } else if (!normalized.startsWith('https://')) {
    normalized = 'https://' + normalized;
  }

  // Remove trailing slash
  normalized = normalized.replace(/\/+$/, '');

  // SSRF guard: reject localhost, *.local, and private/loopback/link-local
  // targets before this URL is ever used to build a fetch request.
  assertPublicStoreUrl(normalized);

  return normalized;
}

/**
 * Build WooCommerce API URL (non-credential query params only).
 *
 * Credentials are intentionally NOT placed in the query string — they are sent
 * via an HTTP Basic Authorization header (see buildAuthHeader) so the live
 * consumer secret never leaks into access logs, Sentry breadcrumbs, or referrers.
 */
function buildApiUrl(
  storeUrl: string,
  endpoint: string,
  params: Record<string, string> = {}
): string {
  const baseUrl = `${normalizeStoreUrl(storeUrl)}/wp-json/wc/v3/${endpoint}`;
  const url = new URL(baseUrl);

  // Add non-credential params (per_page, after, before, status, page, ...)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return url.toString();
}

/**
 * Build an HTTP Basic auth header from WooCommerce consumer credentials.
 * WooCommerce supports Basic auth over HTTPS, which keeps the key/secret out
 * of the URL. Runtime is Node (no `runtime = 'edge'` in the API routes), so
 * Buffer is available.
 */
function buildAuthHeader(consumerKey: string, consumerSecret: string): string {
  const token = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
  return `Basic ${token}`;
}

/**
 * Make authenticated request to WooCommerce API
 */
async function wooRequest<T>(
  storeUrl: string,
  endpoint: string,
  consumerKey: string,
  consumerSecret: string,
  params: Record<string, string> = {}
): Promise<T> {
  const url = buildApiUrl(storeUrl, endpoint, params);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Sails/1.0',
      'Authorization': buildAuthHeader(consumerKey, consumerSecret),
    },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `WooCommerce API error: ${response.status}`;
    
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.message || errorJson.error || errorMessage;
    } catch {
      // Use status text if not JSON
    }
    
    throw new Error(errorMessage);
  }
  
  return response.json();
}

// =============================================================================
// Public Functions
// =============================================================================

/**
 * Validate WooCommerce credentials by fetching store info
 */
export async function validateCredentials(
  credentials: WooCommerceCredentials
): Promise<{ valid: boolean; storeInfo?: WooCommerceStoreInfo; error?: string }> {
  try {
    const storeInfo = await wooRequest<WooCommerceStoreInfo>(
      credentials.storeUrl,
      '', // Root endpoint returns store info
      credentials.consumerKey,
      credentials.consumerSecret
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
 * Save WooCommerce connection to database
 */
export async function saveConnection(
  userId: string,
  credentials: WooCommerceCredentials,
  storeName: string
): Promise<{ success: boolean; connectionId?: string; error?: string }> {
  try {
    const normalizedUrl = normalizeStoreUrl(credentials.storeUrl);
    
    // Check if connection already exists
    const existing = await prisma.platformConnection.findFirst({
      where: {
        userId,
        platform: 'woocommerce',
        platformId: normalizedUrl,
      },
    });
    
    if (existing) {
      // Update existing connection
      const updated = await prisma.platformConnection.update({
        where: { id: existing.id },
        data: {
          platformName: storeName,
          accessToken: credentials.consumerKey,
          refreshToken: credentials.consumerSecret, // Store secret in refreshToken field
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
        platform: 'woocommerce',
        platformId: normalizedUrl,
        platformName: storeName,
        accessToken: credentials.consumerKey,
        refreshToken: credentials.consumerSecret,
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
 * Get WooCommerce credentials from database
 */
export async function getCredentials(
  userId: string,
  platformId: string
): Promise<WooCommerceCredentials | null> {
  const connection = await prisma.platformConnection.findUnique({
    where: {
      userId_platform_platformId: {
        userId,
        platform: 'woocommerce',
        platformId,
      },
    },
  });
  
  if (!connection || !connection.accessToken || !connection.refreshToken) {
    return null;
  }
  
  return {
    storeUrl: connection.platformId,
    consumerKey: connection.accessToken,
    consumerSecret: connection.refreshToken,
  };
}

/**
 * Fetch orders from WooCommerce store
 */
export async function fetchOrders(
  credentials: WooCommerceCredentials,
  options: {
    after?: string; // ISO date string
    before?: string;
    status?: string[];
    page?: number;
    perPage?: number;
  } = {}
): Promise<WooCommerceOrder[]> {
  const params: Record<string, string> = {
    per_page: String(options.perPage || 100),
    page: String(options.page || 1),
    orderby: 'date',
    order: 'desc',
  };
  
  if (options.after) {
    params.after = options.after;
  }
  if (options.before) {
    params.before = options.before;
  }
  if (options.status && options.status.length > 0) {
    params.status = options.status.join(',');
  }
  
  return wooRequest<WooCommerceOrder[]>(
    credentials.storeUrl,
    'orders',
    credentials.consumerKey,
    credentials.consumerSecret,
    params
  );
}

/**
 * Fetch all orders with pagination
 */
export async function fetchAllOrders(
  credentials: WooCommerceCredentials,
  options: {
    after?: string;
    before?: string;
    status?: string[];
    maxPages?: number;
  } = {}
): Promise<WooCommerceOrder[]> {
  const allOrders: WooCommerceOrder[] = [];
  let page = 1;
  const maxPages = options.maxPages || 10; // Safety limit
  
  while (page <= maxPages) {
    const orders = await fetchOrders(credentials, {
      ...options,
      page,
      perPage: 100,
    });
    
    allOrders.push(...orders);
    
    if (orders.length < 100) {
      break; // No more pages
    }
    
    page++;
  }
  
  return allOrders;
}

/**
 * Map WooCommerce order to our ImportedOrder format
 */
export function mapOrderToImport(order: WooCommerceOrder, _storeUrl: string) {
  const shipping = order.shipping.state ? order.shipping : order.billing;
  
  return {
    platform: 'woocommerce',
    platformOrderId: String(order.id),
    orderNumber: order.number,
    orderDate: new Date(order.date_created),
    subtotal: parseFloat(order.total) - parseFloat(order.total_tax) - parseFloat(order.shipping_total),
    shippingAmount: parseFloat(order.shipping_total),
    taxAmount: parseFloat(order.total_tax),
    totalAmount: parseFloat(order.total),
    currency: order.currency,
    status: order.status,
    customerEmail: order.billing.email,
    shippingState: shipping.state,
    shippingCity: shipping.city,
    shippingZip: shipping.postcode,
    shippingCountry: shipping.country || 'US',
    billingState: order.billing.state,
    lineItems: order.line_items.map(item => ({
      name: item.name,
      quantity: item.quantity,
      subtotal: parseFloat(item.subtotal),
      total: parseFloat(item.total),
      tax: parseFloat(item.total_tax),
      sku: item.sku,
    })),
    taxBreakdown: order.tax_lines.map(tax => ({
      label: tax.label,
      rateCode: tax.rate_code,
      total: parseFloat(tax.tax_total),
      shippingTax: parseFloat(tax.shipping_tax_total),
    })),
    rawData: order,
  };
}
