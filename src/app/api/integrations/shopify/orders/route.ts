import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getConnection } from '@/lib/platforms';
import { fetchOrders, isShopifyConfigured } from '@/lib/platforms/shopify';
import { userCanConnectPlatform, tierGateError } from '@/lib/plans';

/**
 * GET /api/integrations/shopify/orders
 * 
 * Fetch orders from a connected Shopify store
 * Query params:
 *   - shop: The Shopify store domain (required if multiple stores connected)
 *   - status: Order status filter (any, open, closed, cancelled)
 *   - created_at_min: ISO date string for minimum created date
 *   - created_at_max: ISO date string for maximum created date
 *   - limit: Number of orders to fetch (max 250)
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Tier gate: Shopify requires Starter or higher
    const access = userCanConnectPlatform(user, 'shopify');
    if (!access.allowed) {
      return NextResponse.json(
        tierGateError(access.userPlan, access.requiredPlan, 'platform_shopify'),
        { status: 403 }
      );
    }

    // Check if Shopify is configured
    if (!isShopifyConfigured()) {
      return NextResponse.json(
        { error: 'Shopify integration is not configured' },
        { status: 503 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const shop = searchParams.get('shop');
    const status = searchParams.get('status') as 'any' | 'open' | 'closed' | 'cancelled' | null;
    const createdAtMin = searchParams.get('created_at_min');
    const createdAtMax = searchParams.get('created_at_max');
    const limit = searchParams.get('limit');

    // Get connection - either specific shop or first connected
    const connection = await getConnection(user.id, 'shopify', shop || undefined);
    
    if (!connection) {
      return NextResponse.json(
        { error: 'No Shopify store connected' },
        { status: 404 }
      );
    }

    // Fetch orders from Shopify
    const { orders, error } = await fetchOrders(
      connection.platformId,
      connection.accessToken,
      {
        status: status || 'any',
        createdAtMin: createdAtMin || undefined,
        createdAtMax: createdAtMax || undefined,
        limit: limit ? parseInt(limit, 10) : 50,
      }
    );

    if (error) {
      console.error('Shopify orders fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch orders from Shopify' },
        { status: 502 }
      );
    }

    // Transform orders for response (remove sensitive data)
    const sanitizedOrders = (orders || []).map(order => ({
      id: order.id,
      orderNumber: order.name,
      createdAt: order.created_at,
      subtotal: order.subtotal_price,
      tax: order.total_tax,
      total: order.total_price,
      currency: order.currency,
      financialStatus: order.financial_status,
      fulfillmentStatus: order.fulfillment_status,
      shippingAddress: order.shipping_address ? {
        city: order.shipping_address.city,
        provinceCode: order.shipping_address.province_code,
        zip: order.shipping_address.zip,
        countryCode: order.shipping_address.country_code,
      } : null,
      lineItemCount: order.line_items?.length || 0,
      taxLines: order.tax_lines,
    }));

    return NextResponse.json({
      shop: connection.platformId,
      shopName: connection.platformName,
      orders: sanitizedOrders,
      count: sanitizedOrders.length,
    });
  } catch (error) {
    console.error('Shopify orders error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
