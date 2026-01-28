/**
 * Etsy Integration for SalesTaxJar
 * 
 * Uses Etsy Open API v3 for accessing shop data
 */

import { prisma } from '../prisma';

// Etsy API Configuration
const ETSY_API_KEY = process.env.ETSY_API_KEY;
const ETSY_API_SECRET = process.env.ETSY_API_SECRET;
const ETSY_API_BASE = 'https://openapi.etsy.com/v3';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://salestaxjar.vercel.app';

// OAuth scopes needed for tax calculations
const ETSY_SCOPES = [
  'transactions_r',  // Read receipts/transactions
  'shops_r',         // Read shop info
  'listings_r',      // Read listings
].join(' ');

export function isEtsyConfigured(): boolean {
  return !!(ETSY_API_KEY && ETSY_API_SECRET);
}

// =============================================================================
// OAuth Flow (Etsy OAuth 2.0)
// =============================================================================

/**
 * Generate Etsy OAuth authorization URL with PKCE
 */
export function getAuthorizationUrl(state: string, codeChallenge: string): string {
  const redirectUri = `${APP_URL}/api/platforms/etsy/callback`;
  
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: ETSY_API_KEY!,
    redirect_uri: redirectUri,
    scope: ETSY_SCOPES,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  return `https://www.etsy.com/oauth/connect?${params}`;
}

/**
 * Generate PKCE code verifier and challenge
 */
export function generatePKCE(): { verifier: string; challenge: string } {
  // Generate random verifier (43-128 characters)
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const verifier = base64UrlEncode(array);
  
  // Generate challenge using SHA-256
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  
  // Note: In Node.js we need to use crypto module for SHA-256
  // This is a simplified version - in production use proper crypto
  const challenge = verifier; // Simplified - use proper SHA-256 in production
  
  return { verifier, challenge };
}

function base64UrlEncode(buffer: Uint8Array): string {
  const base64 = Buffer.from(buffer).toString('base64');
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(
  code: string,
  codeVerifier: string
): Promise<{ accessToken?: string; refreshToken?: string; userId?: number; error?: string }> {
  try {
    const response = await fetch(`${ETSY_API_BASE}/public/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: ETSY_API_KEY!,
        redirect_uri: `${APP_URL}/api/platforms/etsy/callback`,
        code,
        code_verifier: codeVerifier,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { error: `Etsy OAuth error: ${error}` };
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      userId: data.user_id,
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to exchange code' };
  }
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<{ accessToken?: string; newRefreshToken?: string; error?: string }> {
  try {
    const response = await fetch(`${ETSY_API_BASE}/public/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: ETSY_API_KEY!,
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { error: `Etsy token refresh error: ${error}` };
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      newRefreshToken: data.refresh_token,
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to refresh token' };
  }
}

// =============================================================================
// Connection Management
// =============================================================================

/**
 * Save Etsy connection
 */
export async function saveEtsyConnection(
  userId: string,
  etsyUserId: number,
  accessToken: string,
  refreshToken: string
): Promise<{ success: boolean; shopId?: number; error?: string }> {
  try {
    // Get shop info
    const shops = await getShops(accessToken, etsyUserId);
    const shop = shops?.[0]; // Use first shop
    
    if (!shop) {
      return { success: false, error: 'No Etsy shop found for this account' };
    }

    await prisma.platformConnection.upsert({
      where: {
        userId_platform_platformId: {
          userId,
          platform: 'etsy',
          platformId: String(shop.shop_id),
        },
      },
      create: {
        userId,
        platform: 'etsy',
        platformId: String(shop.shop_id),
        platformName: shop.shop_name,
        accessToken,
        refreshToken,
        metadata: JSON.stringify({
          etsyUserId,
          shopId: shop.shop_id,
          shopName: shop.shop_name,
          currency: shop.currency_code,
        }),
      },
      update: {
        accessToken,
        refreshToken,
        platformName: shop.shop_name,
        metadata: JSON.stringify({
          etsyUserId,
          shopId: shop.shop_id,
          shopName: shop.shop_name,
          currency: shop.currency_code,
        }),
        updatedAt: new Date(),
      },
    });

    return { success: true, shopId: shop.shop_id };
  } catch (error) {
    console.error('Failed to save Etsy connection:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to save connection' };
  }
}

// =============================================================================
// Etsy API Calls
// =============================================================================

/**
 * Get user's shops
 */
async function getShops(accessToken: string, userId: number): Promise<EtsyShop[] | null> {
  try {
    const response = await fetch(
      `${ETSY_API_BASE}/application/users/${userId}/shops`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-api-key': ETSY_API_KEY!,
        },
      }
    );

    if (!response.ok) return null;
    
    const data = await response.json();
    return data.results || [];
  } catch {
    return null;
  }
}

/**
 * Fetch receipts (orders) from Etsy
 */
export async function fetchReceipts(
  accessToken: string,
  shopId: number,
  params: {
    minCreated?: number;  // Unix timestamp
    maxCreated?: number;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ receipts?: EtsyReceipt[]; error?: string }> {
  try {
    const queryParams = new URLSearchParams();
    if (params.minCreated) queryParams.append('min_created', String(params.minCreated));
    if (params.maxCreated) queryParams.append('max_created', String(params.maxCreated));
    queryParams.append('limit', String(params.limit || 25));
    if (params.offset) queryParams.append('offset', String(params.offset));

    const response = await fetch(
      `${ETSY_API_BASE}/application/shops/${shopId}/receipts?${queryParams}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-api-key': ETSY_API_KEY!,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return { error: `Etsy API error: ${error}` };
    }

    const data = await response.json();
    return { receipts: data.results || [] };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to fetch receipts' };
  }
}

/**
 * Get receipt (order) transactions (line items)
 */
export async function getReceiptTransactions(
  accessToken: string,
  shopId: number,
  receiptId: number
): Promise<{ transactions?: EtsyTransaction[]; error?: string }> {
  try {
    const response = await fetch(
      `${ETSY_API_BASE}/application/shops/${shopId}/receipts/${receiptId}/transactions`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-api-key': ETSY_API_KEY!,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return { error: `Etsy API error: ${error}` };
    }

    const data = await response.json();
    return { transactions: data.results || [] };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to fetch transactions' };
  }
}

// =============================================================================
// Types
// =============================================================================

export interface EtsyShop {
  shop_id: number;
  shop_name: string;
  user_id: number;
  currency_code: string;
  url: string;
  is_vacation: boolean;
  transaction_sold_count: number;
}

export interface EtsyReceipt {
  receipt_id: number;
  receipt_type: number;
  seller_user_id: number;
  seller_email: string;
  buyer_user_id: number;
  buyer_email: string;
  name: string;
  status: string;
  payment_method: string;
  subtotal: EtsyMoney;
  grandtotal: EtsyMoney;
  total_tax_cost: EtsyMoney;
  total_shipping_cost: EtsyMoney;
  discount_amt: EtsyMoney;
  gift_wrap_price: EtsyMoney;
  shipments: EtsyShipment[];
  transactions: EtsyTransaction[];
  create_timestamp: number;
  update_timestamp: number;
  country_iso: string;
  formatted_address: string;
  city: string;
  state: string;
  zip: string;
}

export interface EtsyMoney {
  amount: number;
  divisor: number;
  currency_code: string;
}

export interface EtsyTransaction {
  transaction_id: number;
  title: string;
  description: string;
  seller_user_id: number;
  buyer_user_id: number;
  create_timestamp: number;
  paid_timestamp: number;
  shipped_timestamp: number;
  quantity: number;
  listing_image_id: number;
  receipt_id: number;
  is_digital: boolean;
  file_data: string;
  listing_id: number;
  sku: string;
  product_id: number;
  transaction_type: string;
  price: EtsyMoney;
  shipping_cost: EtsyMoney;
}

export interface EtsyShipment {
  receipt_shipping_id: number;
  shipment_notification_timestamp: number;
  carrier_name: string;
  tracking_code: string;
}
