/**
 * Amazon Seller Central Integration for SalesTaxJar
 * 
 * Uses Amazon SP-API (Selling Partner API) for accessing seller data
 * Requires Amazon Seller Central account and app registration
 */

import { prisma } from '../prisma';

// Amazon SP-API Configuration
const AMAZON_APP_ID = process.env.AMAZON_APP_ID; // App ID for authorization URL
const AMAZON_CLIENT_ID = process.env.AMAZON_CLIENT_ID; // LWA Client ID for token exchange
const AMAZON_CLIENT_SECRET = process.env.AMAZON_CLIENT_SECRET; // LWA Client Secret
const AMAZON_REFRESH_TOKEN_URL = 'https://api.amazon.com/auth/o2/token';
const AMAZON_SP_API_BASE = 'https://sellingpartnerapi-na.amazon.com';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export function isAmazonConfigured(): boolean {
  return !!(AMAZON_APP_ID && AMAZON_CLIENT_ID && AMAZON_CLIENT_SECRET);
}

// =============================================================================
// OAuth Flow (Login with Amazon / SP-API)
// =============================================================================

/**
 * Generate Amazon OAuth authorization URL
 * Uses SP-API OAuth flow through Seller Central
 */
export function getAuthorizationUrl(state: string): string {
  const redirectUri = `${APP_URL}/api/platforms/amazon/callback`;
  
  const params = new URLSearchParams({
    application_id: AMAZON_APP_ID!, // Use App ID (not LWA Client ID)
    state,
    redirect_uri: redirectUri,
    version: 'beta', // SP-API OAuth
  });

  return `https://sellercentral.amazon.com/apps/authorize/consent?${params}`;
}

/**
 * Exchange authorization code for tokens (SP-API style)
 */
export async function exchangeCodeForToken(
  authCode: string
): Promise<{ accessToken?: string; refreshToken?: string; error?: string }> {
  try {
    const response = await fetch(AMAZON_REFRESH_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: authCode,
        client_id: AMAZON_CLIENT_ID!,
        client_secret: AMAZON_CLIENT_SECRET!,
        redirect_uri: `${APP_URL}/api/platforms/amazon/callback`,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { error: `Amazon OAuth error: ${error}` };
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to exchange code' };
  }
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<{ accessToken?: string; error?: string }> {
  try {
    const response = await fetch(AMAZON_REFRESH_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: AMAZON_CLIENT_ID!,
        client_secret: AMAZON_CLIENT_SECRET!,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { error: `Amazon token refresh error: ${error}` };
    }

    const data = await response.json();
    return { accessToken: data.access_token };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to refresh token' };
  }
}

// =============================================================================
// Connection Management
// =============================================================================

/**
 * Save Amazon connection for a user
 */
export async function saveAmazonConnection(
  userId: string,
  sellerId: string,
  accessToken: string,
  refreshToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get seller info
    const sellerInfo = await getSellerInfo(accessToken);
    
    await prisma.platformConnection.upsert({
      where: {
        userId_platform_platformId: {
          userId,
          platform: 'amazon',
          platformId: sellerId,
        },
      },
      create: {
        userId,
        platform: 'amazon',
        platformId: sellerId,
        platformName: sellerInfo?.name || `Amazon Seller ${sellerId}`,
        accessToken,
        refreshToken,
        metadata: JSON.stringify(sellerInfo || {}),
      },
      update: {
        accessToken,
        refreshToken,
        platformName: sellerInfo?.name || `Amazon Seller ${sellerId}`,
        metadata: JSON.stringify(sellerInfo || {}),
        updatedAt: new Date(),
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to save Amazon connection:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to save connection' };
  }
}

/**
 * Remove Amazon connection
 */
export async function removeAmazonConnection(
  userId: string,
  sellerId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.platformConnection.delete({
      where: {
        userId_platform_platformId: {
          userId,
          platform: 'amazon',
          platformId: sellerId,
        },
      },
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to remove connection' };
  }
}

// =============================================================================
// SP-API Calls
// =============================================================================

/**
 * Get seller account info
 */
async function getSellerInfo(accessToken: string) {
  try {
    const response = await fetch(
      `${AMAZON_SP_API_BASE}/sellers/v1/marketplaceParticipations`,
      {
        headers: {
          'x-amz-access-token': accessToken,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) return null;
    
    const data = await response.json();
    const participation = data.payload?.[0];
    
    return {
      marketplaceId: participation?.marketplace?.id,
      name: participation?.marketplace?.name,
      countryCode: participation?.marketplace?.countryCode,
    };
  } catch {
    return null;
  }
}

/**
 * Fetch orders from Amazon
 */
export async function fetchOrders(
  accessToken: string,
  params: {
    marketplaceIds?: string[];
    createdAfter?: string;
    createdBefore?: string;
    orderStatuses?: string[];
  } = {}
): Promise<{ orders?: AmazonOrder[]; error?: string }> {
  try {
    const queryParams = new URLSearchParams();
    
    // Default to US marketplace
    const marketplaces = params.marketplaceIds || ['ATVPDKIKX0DER'];
    queryParams.append('MarketplaceIds', marketplaces.join(','));
    
    if (params.createdAfter) queryParams.append('CreatedAfter', params.createdAfter);
    if (params.createdBefore) queryParams.append('CreatedBefore', params.createdBefore);
    if (params.orderStatuses) {
      queryParams.append('OrderStatuses', params.orderStatuses.join(','));
    }

    const response = await fetch(
      `${AMAZON_SP_API_BASE}/orders/v0/orders?${queryParams}`,
      {
        headers: {
          'x-amz-access-token': accessToken,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return { error: `Amazon API error: ${error}` };
    }

    const data = await response.json();
    return { orders: data.payload?.Orders || [] };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to fetch orders' };
  }
}

/**
 * Get order items for a specific order
 */
export async function getOrderItems(
  accessToken: string,
  orderId: string
): Promise<{ items?: AmazonOrderItem[]; error?: string }> {
  try {
    const response = await fetch(
      `${AMAZON_SP_API_BASE}/orders/v0/orders/${orderId}/orderItems`,
      {
        headers: {
          'x-amz-access-token': accessToken,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return { error: `Amazon API error: ${error}` };
    }

    const data = await response.json();
    return { items: data.payload?.OrderItems || [] };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to fetch order items' };
  }
}

// =============================================================================
// Types
// =============================================================================

export interface AmazonOrder {
  AmazonOrderId: string;
  PurchaseDate: string;
  LastUpdateDate: string;
  OrderStatus: string;
  OrderTotal?: {
    CurrencyCode: string;
    Amount: string;
  };
  NumberOfItemsShipped: number;
  NumberOfItemsUnshipped: number;
  ShippingAddress?: AmazonAddress;
  MarketplaceId: string;
  FulfillmentChannel: string;
  SalesChannel: string;
}

export interface AmazonAddress {
  Name: string;
  AddressLine1?: string;
  AddressLine2?: string;
  City: string;
  StateOrRegion: string;
  PostalCode: string;
  CountryCode: string;
}

export interface AmazonOrderItem {
  ASIN: string;
  SellerSKU?: string;
  OrderItemId: string;
  Title: string;
  QuantityOrdered: number;
  QuantityShipped: number;
  ItemPrice?: {
    CurrencyCode: string;
    Amount: string;
  };
  ItemTax?: {
    CurrencyCode: string;
    Amount: string;
  };
}
