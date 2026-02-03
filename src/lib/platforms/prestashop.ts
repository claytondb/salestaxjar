/**
 * PrestaShop API Integration
 * 
 * PrestaShop uses Webservice API with HTTP Basic Auth:
 * - API Key: Generated in Back Office → Advanced Parameters → Webservice
 * - Authentication: HTTP Basic Auth (API key as username, no password)
 * - Format: XML by default, use ?output_format=JSON for JSON
 * 
 * Required permissions: orders (GET), addresses (GET), customers (GET)
 */

import { prisma } from '../prisma';

// =============================================================================
// Types
// =============================================================================

export interface PrestaShopCredentials {
  storeUrl: string;
  apiKey: string;
}

export interface PrestaShopOrderRow {
  id: string;
  product_id: string;
  product_attribute_id: string;
  product_quantity: string;
  product_name: string;
  product_reference: string;
  product_ean13: string;
  product_price: string;
  unit_price_tax_incl: string;
  unit_price_tax_excl: string;
}

export interface PrestaShopOrder {
  id: string;
  id_address_delivery: string;
  id_address_invoice: string;
  id_cart: string;
  id_currency: string;
  id_lang: string;
  id_customer: string;
  id_carrier: string;
  current_state: string;
  module: string;
  invoice_number: string;
  invoice_date: string;
  delivery_number: string;
  delivery_date: string;
  valid: string;
  date_add: string;
  date_upd: string;
  shipping_number: string;
  reference: string;
  payment: string;
  total_discounts: string;
  total_discounts_tax_incl: string;
  total_discounts_tax_excl: string;
  total_paid: string;
  total_paid_tax_incl: string;
  total_paid_tax_excl: string;
  total_paid_real: string;
  total_products: string;
  total_products_wt: string;
  total_shipping: string;
  total_shipping_tax_incl: string;
  total_shipping_tax_excl: string;
  carrier_tax_rate: string;
  conversion_rate: string;
  associations?: {
    order_rows?: PrestaShopOrderRow[];
  };
}

export interface PrestaShopAddress {
  id: string;
  id_customer: string;
  id_country: string;
  id_state: string;
  alias: string;
  company: string;
  lastname: string;
  firstname: string;
  address1: string;
  address2: string;
  postcode: string;
  city: string;
  phone: string;
  phone_mobile: string;
}

export interface PrestaShopCustomer {
  id: string;
  email: string;
  firstname: string;
  lastname: string;
}

export interface PrestaShopState {
  id: string;
  id_country: string;
  iso_code: string;
  name: string;
}

export interface PrestaShopCountry {
  id: string;
  iso_code: string;
  name: string;
}

export interface PrestaShopOrdersResponse {
  orders?: PrestaShopOrder[] | { order: PrestaShopOrder[] };
}

export interface PrestaShopShopInfo {
  shop_name?: string;
  shop_domain?: string;
  version?: string;
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
 * Make authenticated request to PrestaShop Webservice API
 */
async function prestashopRequest<T>(
  storeUrl: string,
  endpoint: string,
  apiKey: string,
  params: Record<string, string> = {}
): Promise<T> {
  const baseUrl = normalizeStoreUrl(storeUrl);
  const url = new URL(`${baseUrl}/api${endpoint}`);
  
  // Always request JSON format
  url.searchParams.set('output_format', 'JSON');
  
  // Add additional params
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }
  
  // Create Basic Auth header (API key as username, empty password)
  const authHeader = 'Basic ' + Buffer.from(`${apiKey}:`).toString('base64');
  
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Authorization': authHeader,
      'Accept': 'application/json',
    },
  });
  
  if (!response.ok) {
    let errorMessage = `PrestaShop API error: ${response.status}`;
    
    if (response.status === 401) {
      errorMessage = 'Invalid API key. Please check your Webservice key.';
    } else if (response.status === 403) {
      errorMessage = 'Access denied. Make sure your API key has permission to access orders.';
    } else if (response.status === 404) {
      errorMessage = 'Webservice not found. Make sure the Webservice is enabled in PrestaShop.';
    }
    
    throw new Error(errorMessage);
  }
  
  const text = await response.text();
  
  // Handle empty response
  if (!text || text.trim() === '') {
    return {} as T;
  }
  
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Invalid JSON response from PrestaShop API');
  }
}

// =============================================================================
// Public Functions
// =============================================================================

/**
 * Validate PrestaShop credentials by making a test request
 */
export async function validateCredentials(
  credentials: PrestaShopCredentials
): Promise<{ valid: boolean; storeInfo?: PrestaShopShopInfo; error?: string }> {
  try {
    // Try to fetch the API root to verify credentials
    // PrestaShop returns available resources at /api/
    const response = await prestashopRequest<Record<string, unknown>>(
      credentials.storeUrl,
      '/',
      credentials.apiKey
    );
    
    // If we get here, credentials are valid
    // Try to extract shop name from configuration if available
    let shopInfo: PrestaShopShopInfo = {};
    
    try {
      const configResponse = await prestashopRequest<{ configurations?: Array<{ name: string; value: string }> }>(
        credentials.storeUrl,
        '/configurations',
        credentials.apiKey,
        { 'filter[name]': 'PS_SHOP_NAME', 'display': 'full' }
      );
      
      if (configResponse.configurations && configResponse.configurations.length > 0) {
        shopInfo.shop_name = configResponse.configurations[0].value;
      }
    } catch {
      // Configuration fetch failed, use default name
      shopInfo.shop_name = 'PrestaShop Store';
    }
    
    return {
      valid: true,
      storeInfo: shopInfo,
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Failed to validate credentials',
    };
  }
}

/**
 * Save PrestaShop connection to database
 */
export async function saveConnection(
  userId: string,
  credentials: PrestaShopCredentials,
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
        platform: 'prestashop',
        platformId,
      },
    });
    
    if (existing) {
      // Update existing connection
      const updated = await prisma.platformConnection.update({
        where: { id: existing.id },
        data: {
          platformName: storeName || 'PrestaShop Store',
          accessToken: credentials.apiKey,
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
        platform: 'prestashop',
        platformId,
        platformName: storeName || 'PrestaShop Store',
        accessToken: credentials.apiKey,
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
 * Get PrestaShop credentials from database
 */
export async function getCredentials(
  userId: string,
  platformId: string
): Promise<PrestaShopCredentials | null> {
  const connection = await prisma.platformConnection.findUnique({
    where: {
      userId_platform_platformId: {
        userId,
        platform: 'prestashop',
        platformId,
      },
    },
  });
  
  if (!connection || !connection.accessToken || !connection.refreshToken) {
    return null;
  }
  
  return {
    storeUrl: connection.refreshToken, // URL stored in refreshToken
    apiKey: connection.accessToken,
  };
}

/**
 * Fetch a single address by ID
 */
export async function fetchAddress(
  credentials: PrestaShopCredentials,
  addressId: string
): Promise<PrestaShopAddress | null> {
  try {
    const response = await prestashopRequest<{ address?: PrestaShopAddress }>(
      credentials.storeUrl,
      `/addresses/${addressId}`,
      credentials.apiKey,
      { display: 'full' }
    );
    return response.address || null;
  } catch {
    return null;
  }
}

/**
 * Fetch state by ID
 */
export async function fetchState(
  credentials: PrestaShopCredentials,
  stateId: string
): Promise<PrestaShopState | null> {
  try {
    const response = await prestashopRequest<{ state?: PrestaShopState }>(
      credentials.storeUrl,
      `/states/${stateId}`,
      credentials.apiKey,
      { display: 'full' }
    );
    return response.state || null;
  } catch {
    return null;
  }
}

/**
 * Fetch country by ID
 */
export async function fetchCountry(
  credentials: PrestaShopCredentials,
  countryId: string
): Promise<PrestaShopCountry | null> {
  try {
    const response = await prestashopRequest<{ country?: PrestaShopCountry }>(
      credentials.storeUrl,
      `/countries/${countryId}`,
      credentials.apiKey,
      { display: 'full' }
    );
    return response.country || null;
  } catch {
    return null;
  }
}

/**
 * Fetch customer by ID
 */
export async function fetchCustomer(
  credentials: PrestaShopCredentials,
  customerId: string
): Promise<PrestaShopCustomer | null> {
  try {
    const response = await prestashopRequest<{ customer?: PrestaShopCustomer }>(
      credentials.storeUrl,
      `/customers/${customerId}`,
      credentials.apiKey,
      { display: 'full' }
    );
    return response.customer || null;
  } catch {
    return null;
  }
}

/**
 * Fetch orders from PrestaShop
 */
export async function fetchOrders(
  credentials: PrestaShopCredentials,
  options: {
    dateFrom?: string; // YYYY-MM-DD format
    dateTo?: string;
    limit?: number;
    page?: number;
  } = {}
): Promise<PrestaShopOrder[]> {
  const params: Record<string, string> = {
    display: 'full',
    sort: '[date_add_DESC]',
  };
  
  // Add pagination
  if (options.limit) {
    const offset = ((options.page || 1) - 1) * options.limit;
    params.limit = `${offset},${options.limit}`;
  }
  
  // Add date filter
  if (options.dateFrom) {
    params['filter[date_add]'] = `[${options.dateFrom},${options.dateTo || '9999-12-31'}]`;
  }
  
  const response = await prestashopRequest<PrestaShopOrdersResponse>(
    credentials.storeUrl,
    '/orders',
    credentials.apiKey,
    params
  );
  
  // Handle different response formats
  if (!response.orders) {
    return [];
  }
  
  // PrestaShop can return orders as array or as { order: [...] }
  if (Array.isArray(response.orders)) {
    return response.orders;
  }
  
  if (response.orders.order && Array.isArray(response.orders.order)) {
    return response.orders.order;
  }
  
  return [];
}

/**
 * Fetch all orders with pagination
 */
export async function fetchAllOrders(
  credentials: PrestaShopCredentials,
  options: {
    dateFrom?: string;
    dateTo?: string;
    maxPages?: number;
  } = {}
): Promise<PrestaShopOrder[]> {
  const allOrders: PrestaShopOrder[] = [];
  let page = 1;
  const maxPages = options.maxPages || 10;
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
      break;
    }
    
    page++;
  }
  
  return allOrders;
}

/**
 * Fetch a single order by ID with full details
 */
export async function fetchOrder(
  credentials: PrestaShopCredentials,
  orderId: string
): Promise<PrestaShopOrder | null> {
  try {
    const response = await prestashopRequest<{ order?: PrestaShopOrder }>(
      credentials.storeUrl,
      `/orders/${orderId}`,
      credentials.apiKey,
      { display: 'full' }
    );
    return response.order || null;
  } catch {
    return null;
  }
}

/**
 * Map PrestaShop order to our ImportedOrder format
 */
export async function mapOrderToImport(
  order: PrestaShopOrder,
  credentials: PrestaShopCredentials
) {
  // Fetch delivery address details
  let shippingState = '';
  let shippingCity = '';
  let shippingZip = '';
  let shippingCountry = 'US';
  let customerEmail = '';
  
  if (order.id_address_delivery) {
    const address = await fetchAddress(credentials, order.id_address_delivery);
    if (address) {
      shippingCity = address.city;
      shippingZip = address.postcode;
      
      // Fetch state details
      if (address.id_state) {
        const state = await fetchState(credentials, address.id_state);
        if (state) {
          shippingState = state.iso_code;
        }
      }
      
      // Fetch country details
      if (address.id_country) {
        const country = await fetchCountry(credentials, address.id_country);
        if (country) {
          shippingCountry = country.iso_code;
        }
      }
    }
  }
  
  // Fetch customer email
  if (order.id_customer) {
    const customer = await fetchCustomer(credentials, order.id_customer);
    if (customer) {
      customerEmail = customer.email;
    }
  }
  
  // Calculate tax amounts
  const totalTaxIncl = parseFloat(order.total_paid_tax_incl) || 0;
  const totalTaxExcl = parseFloat(order.total_paid_tax_excl) || 0;
  const taxAmount = totalTaxIncl - totalTaxExcl;
  
  const shippingTaxIncl = parseFloat(order.total_shipping_tax_incl) || 0;
  const shippingTaxExcl = parseFloat(order.total_shipping_tax_excl) || 0;
  const shippingTax = shippingTaxIncl - shippingTaxExcl;
  
  return {
    platform: 'prestashop',
    platformOrderId: order.id,
    orderNumber: order.reference || order.id,
    orderDate: new Date(order.date_add),
    subtotal: parseFloat(order.total_products) || 0,
    shippingAmount: parseFloat(order.total_shipping_tax_excl) || 0,
    taxAmount: taxAmount,
    totalAmount: totalTaxIncl,
    currency: 'USD', // Would need to fetch currency details
    status: mapOrderStatus(order.current_state),
    customerEmail,
    shippingState,
    shippingCity,
    shippingZip,
    shippingCountry,
    billingState: '', // Would need separate address fetch
    lineItems: order.associations?.order_rows?.map(item => ({
      productId: item.product_id,
      sku: item.product_reference,
      name: item.product_name,
      quantity: parseInt(item.product_quantity) || 1,
      price: parseFloat(item.unit_price_tax_excl) || 0,
      priceWithTax: parseFloat(item.unit_price_tax_incl) || 0,
      total: parseFloat(item.product_price) || 0,
    })),
    taxBreakdown: {
      productTax: taxAmount - shippingTax,
      shippingTax: shippingTax,
      totalTax: taxAmount,
    },
    rawData: order,
  };
}

/**
 * Map PrestaShop order state to our standard status
 * Default PrestaShop states:
 * 1: Awaiting check payment, 2: Payment accepted, 3: Processing in progress,
 * 4: Shipped, 5: Delivered, 6: Canceled, 7: Refunded, 8: Payment error,
 * 9: On backorder (paid), 10: Awaiting bank wire, 11: Remote payment accepted,
 * 12: On backorder (not paid)
 */
function mapOrderStatus(stateId: string): string {
  const statusMap: Record<string, string> = {
    '1': 'pending',
    '2': 'processing',
    '3': 'processing',
    '4': 'fulfilled',
    '5': 'fulfilled',
    '6': 'cancelled',
    '7': 'refunded',
    '8': 'cancelled',
    '9': 'processing',
    '10': 'pending',
    '11': 'processing',
    '12': 'pending',
  };
  return statusMap[stateId] || 'pending';
}
