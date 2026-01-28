/**
 * Shopify Integration for SalesTaxJar
 * 
 * Handles OAuth flow and API interactions with Shopify stores
 */

import { prisma } from '../prisma';

// Shopify API Configuration
const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY;
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET;
const SHOPIFY_SCOPES = 'read_orders,read_products,read_customers,read_locations';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://salestaxjar.vercel.app';

export function isShopifyConfigured(): boolean {
  return !!(SHOPIFY_API_KEY && SHOPIFY_API_SECRET);
}

// =============================================================================
// OAuth Flow
// =============================================================================

/**
 * Generate the Shopify OAuth authorization URL
 */
export function getAuthorizationUrl(shop: string, state: string): string {
  const shopDomain = normalizeShopDomain(shop);
  const redirectUri = `${APP_URL}/api/platforms/shopify/callback`;
  
  const params = new URLSearchParams({
    client_id: SHOPIFY_API_KEY!,
    scope: SHOPIFY_SCOPES,
    redirect_uri: redirectUri,
    state,
  });

  return `https://${shopDomain}/admin/oauth/authorize?${params}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(
  shop: string,
  code: string
): Promise<{ accessToken?: string; error?: string }> {
  const shopDomain = normalizeShopDomain(shop);
  
  try {
    const response = await fetch(`https://${shopDomain}/admin/oauth/access_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: SHOPIFY_API_KEY,
        client_secret: SHOPIFY_API_SECRET,
        code,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { error: `Shopify OAuth error: ${error}` };
    }

    const data = await response.json();
    return { accessToken: data.access_token };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to exchange code' };
  }
}

/**
 * Normalize shop domain (handle various input formats)
 */
function normalizeShopDomain(shop: string): string {
  // Remove protocol if present
  let domain = shop.replace(/^https?:\/\//, '');
  
  // Remove trailing slash
  domain = domain.replace(/\/$/, '');
  
  // Add .myshopify.com if not present
  if (!domain.includes('.')) {
    domain = `${domain}.myshopify.com`;
  }
  
  return domain;
}

// =============================================================================
// Store Connection Management
// =============================================================================

/**
 * Save or update Shopify connection for a user
 */
export async function saveShopifyConnection(
  userId: string,
  shop: string,
  accessToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const shopDomain = normalizeShopDomain(shop);
    
    // Get shop info from Shopify
    const shopInfo = await getShopInfo(shopDomain, accessToken);
    
    await prisma.platformConnection.upsert({
      where: {
        userId_platform_platformId: {
          userId,
          platform: 'shopify',
          platformId: shopDomain,
        },
      },
      create: {
        userId,
        platform: 'shopify',
        platformId: shopDomain,
        platformName: shopInfo?.name || shop,
        accessToken,
        metadata: JSON.stringify(shopInfo || {}),
      },
      update: {
        accessToken,
        platformName: shopInfo?.name || shop,
        metadata: JSON.stringify(shopInfo || {}),
        updatedAt: new Date(),
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to save Shopify connection:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to save connection' };
  }
}

/**
 * Remove Shopify connection
 */
export async function removeShopifyConnection(
  userId: string,
  shop: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const shopDomain = normalizeShopDomain(shop);
    
    await prisma.platformConnection.delete({
      where: {
        userId_platform_platformId: {
          userId,
          platform: 'shopify',
          platformId: shopDomain,
        },
      },
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to remove connection' };
  }
}

/**
 * Get all Shopify connections for a user
 */
export async function getShopifyConnections(userId: string) {
  return prisma.platformConnection.findMany({
    where: {
      userId,
      platform: 'shopify',
    },
  });
}

// =============================================================================
// Shopify API Calls
// =============================================================================

/**
 * Get shop information
 */
async function getShopInfo(shop: string, accessToken: string) {
  try {
    const response = await fetch(`https://${shop}/admin/api/2024-01/shop.json`, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
      },
    });

    if (!response.ok) return null;
    
    const data = await response.json();
    return data.shop;
  } catch {
    return null;
  }
}

/**
 * Fetch orders from Shopify
 */
export async function fetchOrders(
  shop: string,
  accessToken: string,
  params: {
    createdAtMin?: string;
    createdAtMax?: string;
    status?: 'any' | 'open' | 'closed' | 'cancelled';
    limit?: number;
  } = {}
): Promise<{ orders?: ShopifyOrder[]; error?: string }> {
  try {
    const queryParams = new URLSearchParams();
    if (params.createdAtMin) queryParams.append('created_at_min', params.createdAtMin);
    if (params.createdAtMax) queryParams.append('created_at_max', params.createdAtMax);
    if (params.status) queryParams.append('status', params.status);
    queryParams.append('limit', String(params.limit || 50));

    const response = await fetch(
      `https://${shop}/admin/api/2024-01/orders.json?${queryParams}`,
      {
        headers: {
          'X-Shopify-Access-Token': accessToken,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return { error: `Shopify API error: ${error}` };
    }

    const data = await response.json();
    return { orders: data.orders };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to fetch orders' };
  }
}

/**
 * Fetch locations (for nexus determination)
 */
export async function fetchLocations(
  shop: string,
  accessToken: string
): Promise<{ locations?: ShopifyLocation[]; error?: string }> {
  try {
    const response = await fetch(
      `https://${shop}/admin/api/2024-01/locations.json`,
      {
        headers: {
          'X-Shopify-Access-Token': accessToken,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return { error: `Shopify API error: ${error}` };
    }

    const data = await response.json();
    return { locations: data.locations };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to fetch locations' };
  }
}

// =============================================================================
// Types
// =============================================================================

export interface ShopifyOrder {
  id: number;
  name: string;
  created_at: string;
  total_price: string;
  subtotal_price: string;
  total_tax: string;
  currency: string;
  financial_status: string;
  fulfillment_status: string | null;
  billing_address?: ShopifyAddress;
  shipping_address?: ShopifyAddress;
  line_items: ShopifyLineItem[];
  tax_lines: ShopifyTaxLine[];
}

export interface ShopifyAddress {
  address1: string;
  address2?: string;
  city: string;
  province: string;
  province_code: string;
  zip: string;
  country: string;
  country_code: string;
}

export interface ShopifyLineItem {
  id: number;
  title: string;
  quantity: number;
  price: string;
  sku?: string;
  taxable: boolean;
  tax_lines: ShopifyTaxLine[];
}

export interface ShopifyTaxLine {
  title: string;
  price: string;
  rate: number;
}

export interface ShopifyLocation {
  id: number;
  name: string;
  address1: string;
  address2?: string;
  city: string;
  province: string;
  province_code: string;
  zip: string;
  country: string;
  country_code: string;
  active: boolean;
}
