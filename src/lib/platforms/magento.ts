/**
 * Magento / Adobe Commerce API Integration
 * 
 * Magento uses REST API with Bearer token authentication:
 * - Base URL: The store's URL (e.g., https://mystore.com)
 * - Access Token: Generated in Admin → System → Integrations
 * 
 * For Magento 2.4.4+, integration tokens require additional setup.
 * Users can also use Admin tokens for simpler authentication.
 */

import { prisma } from '../prisma';

// =============================================================================
// Types
// =============================================================================

export interface MagentoCredentials {
  storeUrl: string;
  accessToken: string;
}

export interface MagentoAddress {
  address_type: string;
  city: string;
  country_id: string;
  email: string;
  firstname: string;
  lastname: string;
  postcode: string;
  region: string;
  region_code: string;
  region_id: number;
  street: string[];
  telephone: string;
}

export interface MagentoOrderItem {
  item_id: number;
  order_id: number;
  sku: string;
  name: string;
  qty_ordered: number;
  price: number;
  base_price: number;
  row_total: number;
  base_row_total: number;
  tax_amount: number;
  base_tax_amount: number;
  tax_percent: number;
  discount_amount: number;
  product_type: string;
}

export interface MagentoPayment {
  account_status: string;
  method: string;
  amount_ordered: number;
  base_amount_ordered: number;
}

export interface MagentoExtensionAttributes {
  shipping_assignments?: Array<{
    shipping: {
      address: MagentoAddress;
      method: string;
    };
    items: MagentoOrderItem[];
  }>;
}

export interface MagentoOrder {
  entity_id: number;
  increment_id: string;
  created_at: string;
  updated_at: string;
  status: string;
  state: string;
  store_id: number;
  store_name: string;
  customer_id: number | null;
  customer_email: string;
  customer_firstname: string;
  customer_lastname: string;
  base_currency_code: string;
  order_currency_code: string;
  subtotal: number;
  base_subtotal: number;
  subtotal_incl_tax: number;
  tax_amount: number;
  base_tax_amount: number;
  shipping_amount: number;
  base_shipping_amount: number;
  shipping_tax_amount: number;
  base_shipping_tax_amount: number;
  discount_amount: number;
  base_discount_amount: number;
  grand_total: number;
  base_grand_total: number;
  total_qty_ordered: number;
  total_item_count: number;
  billing_address: MagentoAddress;
  payment: MagentoPayment;
  items: MagentoOrderItem[];
  extension_attributes?: MagentoExtensionAttributes;
}

export interface MagentoOrdersResponse {
  items: MagentoOrder[];
  search_criteria: {
    filter_groups: Array<{
      filters: Array<{
        field: string;
        value: string;
        condition_type: string;
      }>;
    }>;
    page_size: number;
    current_page: number;
  };
  total_count: number;
}

export interface MagentoStoreConfig {
  id: number;
  code: string;
  website_id: number;
  name: string;
  default_display_currency_code: string;
  timezone: string;
  base_url: string;
  base_currency_code: string;
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
 * Make authenticated request to Magento REST API
 */
async function magentoRequest<T>(
  storeUrl: string,
  endpoint: string,
  accessToken: string,
  options: {
    method?: string;
    body?: object;
    searchCriteria?: Record<string, string | number>;
  } = {}
): Promise<T> {
  const baseUrl = normalizeStoreUrl(storeUrl);
  const url = new URL(`${baseUrl}/rest/V1${endpoint}`);
  
  // Add search criteria as query params
  if (options.searchCriteria) {
    for (const [key, value] of Object.entries(options.searchCriteria)) {
      url.searchParams.set(key, String(value));
    }
  }
  
  const response = await fetch(url.toString(), {
    method: options.method || 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Magento API error: ${response.status}`;
    
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.message || errorMessage;
      
      // Handle common errors
      if (response.status === 401) {
        errorMessage = 'Invalid access token. Please check your credentials.';
      } else if (response.status === 403) {
        errorMessage = 'Access denied. Make sure your integration has Orders read permission.';
      } else if (response.status === 404) {
        errorMessage = 'Store not found. Please check your store URL.';
      }
    } catch {
      if (response.status === 401) {
        errorMessage = 'Invalid access token. Please check your credentials.';
      }
    }
    
    throw new Error(errorMessage);
  }
  
  return response.json();
}

/**
 * Build Magento search criteria query string
 */
function buildSearchCriteria(options: {
  filters?: Array<{
    field: string;
    value: string;
    conditionType?: string;
  }>;
  pageSize?: number;
  currentPage?: number;
  sortField?: string;
  sortDirection?: 'ASC' | 'DESC';
}): Record<string, string> {
  const params: Record<string, string> = {};
  
  // Add filters
  if (options.filters && options.filters.length > 0) {
    options.filters.forEach((filter, index) => {
      params[`searchCriteria[filter_groups][0][filters][${index}][field]`] = filter.field;
      params[`searchCriteria[filter_groups][0][filters][${index}][value]`] = filter.value;
      params[`searchCriteria[filter_groups][0][filters][${index}][condition_type]`] = filter.conditionType || 'eq';
    });
  }
  
  // Add pagination
  if (options.pageSize) {
    params['searchCriteria[pageSize]'] = String(options.pageSize);
  }
  if (options.currentPage) {
    params['searchCriteria[currentPage]'] = String(options.currentPage);
  }
  
  // Add sorting
  if (options.sortField) {
    params['searchCriteria[sortOrders][0][field]'] = options.sortField;
    params['searchCriteria[sortOrders][0][direction]'] = options.sortDirection || 'DESC';
  }
  
  return params;
}

// =============================================================================
// Public Functions
// =============================================================================

/**
 * Validate Magento credentials by fetching store config
 */
export async function validateCredentials(
  credentials: MagentoCredentials
): Promise<{ valid: boolean; storeInfo?: MagentoStoreConfig; error?: string }> {
  try {
    // Try to fetch store config
    const storeConfig = await magentoRequest<MagentoStoreConfig>(
      credentials.storeUrl,
      '/store/storeConfigs',
      credentials.accessToken
    );
    
    // If it's an array, take the first one
    const config = Array.isArray(storeConfig) ? storeConfig[0] : storeConfig;
    
    return {
      valid: true,
      storeInfo: config,
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Failed to validate credentials',
    };
  }
}

/**
 * Save Magento connection to database
 */
export async function saveConnection(
  userId: string,
  credentials: MagentoCredentials,
  storeName?: string
): Promise<{ success: boolean; connectionId?: string; error?: string }> {
  try {
    const normalizedUrl = normalizeStoreUrl(credentials.storeUrl);
    
    // Use the URL as the platform ID (unique identifier)
    const platformId = normalizedUrl.replace(/^https?:\/\//, '').replace(/\//g, '_');
    
    // Check if connection already exists
    const existing = await prisma.platformConnection.findFirst({
      where: {
        userId,
        platform: 'magento',
        platformId,
      },
    });
    
    if (existing) {
      // Update existing connection
      const updated = await prisma.platformConnection.update({
        where: { id: existing.id },
        data: {
          platformName: storeName || 'Magento Store',
          accessToken: credentials.accessToken,
          refreshToken: normalizedUrl, // Store the URL in refreshToken field
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
        platform: 'magento',
        platformId,
        platformName: storeName || 'Magento Store',
        accessToken: credentials.accessToken,
        refreshToken: normalizedUrl, // Store the URL in refreshToken field
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
 * Get Magento credentials from database
 */
export async function getCredentials(
  userId: string,
  platformId: string
): Promise<MagentoCredentials | null> {
  const connection = await prisma.platformConnection.findUnique({
    where: {
      userId_platform_platformId: {
        userId,
        platform: 'magento',
        platformId,
      },
    },
  });
  
  if (!connection || !connection.accessToken || !connection.refreshToken) {
    return null;
  }
  
  return {
    storeUrl: connection.refreshToken, // URL stored in refreshToken
    accessToken: connection.accessToken,
  };
}

/**
 * Fetch orders from Magento
 */
export async function fetchOrders(
  credentials: MagentoCredentials,
  options: {
    createdAtFrom?: string; // ISO date
    createdAtTo?: string;
    status?: string;
    page?: number;
    limit?: number;
  } = {}
): Promise<MagentoOrder[]> {
  const filters: Array<{ field: string; value: string; conditionType?: string }> = [];
  
  if (options.createdAtFrom) {
    filters.push({
      field: 'created_at',
      value: options.createdAtFrom,
      conditionType: 'gteq',
    });
  }
  if (options.createdAtTo) {
    filters.push({
      field: 'created_at',
      value: options.createdAtTo,
      conditionType: 'lteq',
    });
  }
  if (options.status) {
    filters.push({
      field: 'status',
      value: options.status,
      conditionType: 'eq',
    });
  }
  
  const searchParams = buildSearchCriteria({
    filters,
    pageSize: options.limit || 50,
    currentPage: options.page || 1,
    sortField: 'created_at',
    sortDirection: 'DESC',
  });
  
  const response = await magentoRequest<MagentoOrdersResponse>(
    credentials.storeUrl,
    '/orders',
    credentials.accessToken,
    { searchCriteria: searchParams }
  );
  
  return response.items || [];
}

/**
 * Fetch all orders with pagination
 */
export async function fetchAllOrders(
  credentials: MagentoCredentials,
  options: {
    createdAtFrom?: string;
    createdAtTo?: string;
    maxPages?: number;
  } = {}
): Promise<MagentoOrder[]> {
  const allOrders: MagentoOrder[] = [];
  let page = 1;
  const maxPages = options.maxPages || 10; // Safety limit
  const pageSize = 50;
  
  while (page <= maxPages) {
    const orders = await fetchOrders(credentials, {
      ...options,
      page,
      limit: pageSize,
    });
    
    if (!orders || orders.length === 0) {
      break;
    }
    
    allOrders.push(...orders);
    
    if (orders.length < pageSize) {
      break; // No more pages
    }
    
    page++;
  }
  
  return allOrders;
}

/**
 * Fetch a single order by ID
 */
export async function fetchOrder(
  credentials: MagentoCredentials,
  orderId: number
): Promise<MagentoOrder> {
  return magentoRequest<MagentoOrder>(
    credentials.storeUrl,
    `/orders/${orderId}`,
    credentials.accessToken
  );
}

/**
 * Map Magento order to our ImportedOrder format
 */
export function mapOrderToImport(order: MagentoOrder) {
  // Get shipping address from extension attributes if available
  let shippingAddress: MagentoAddress | undefined;
  if (order.extension_attributes?.shipping_assignments?.[0]?.shipping?.address) {
    shippingAddress = order.extension_attributes.shipping_assignments[0].shipping.address;
  }
  
  // Use shipping address if available, otherwise billing
  const address = shippingAddress || order.billing_address;
  
  return {
    platform: 'magento',
    platformOrderId: String(order.entity_id),
    orderNumber: order.increment_id,
    orderDate: new Date(order.created_at),
    subtotal: order.subtotal || 0,
    shippingAmount: order.shipping_amount || 0,
    taxAmount: order.tax_amount || 0,
    totalAmount: order.grand_total || 0,
    currency: order.order_currency_code || 'USD',
    status: mapOrderStatus(order.status),
    customerEmail: order.customer_email,
    shippingState: address?.region_code || address?.region,
    shippingCity: address?.city,
    shippingZip: address?.postcode,
    shippingCountry: address?.country_id || 'US',
    billingState: order.billing_address?.region_code || order.billing_address?.region,
    lineItems: order.items?.map(item => ({
      sku: item.sku,
      name: item.name,
      quantity: item.qty_ordered,
      price: item.price,
      taxAmount: item.tax_amount,
      taxPercent: item.tax_percent,
      total: item.row_total,
    })),
    taxBreakdown: {
      subtotalTax: order.tax_amount - (order.shipping_tax_amount || 0),
      shippingTax: order.shipping_tax_amount || 0,
      totalTax: order.tax_amount,
    },
    rawData: order,
  };
}

/**
 * Map Magento order status to our standard status
 */
function mapOrderStatus(status: string): string {
  // Magento statuses: pending, pending_payment, processing, holded, complete, 
  // closed, canceled, fraud
  const statusMap: Record<string, string> = {
    'pending': 'pending',
    'pending_payment': 'pending',
    'processing': 'processing',
    'holded': 'pending',
    'complete': 'fulfilled',
    'closed': 'fulfilled',
    'canceled': 'cancelled',
    'fraud': 'cancelled',
  };
  return statusMap[status.toLowerCase()] || 'pending';
}
