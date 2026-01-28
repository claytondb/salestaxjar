import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { 
  getConnection, 
  updateSyncStatus,
  saveImportedOrders,
  updateSalesSummary,
  ImportedOrderData,
} from '@/lib/platforms';
import { fetchOrders as fetchShopifyOrders, ShopifyOrder } from '@/lib/platforms/shopify';
import { fetchOrders as fetchAmazonOrders, refreshAccessToken as refreshAmazonToken, AmazonOrder } from '@/lib/platforms/amazon';
import { fetchReceipts as fetchEtsyReceipts, refreshAccessToken as refreshEtsyToken, EtsyReceipt } from '@/lib/platforms/etsy';

/**
 * POST /api/platforms/sync
 * 
 * Trigger a sync for a specific platform connection
 * Body: { platform: string, platformId: string, dateRange?: { start: string, end: string } }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { platform, platformId, dateRange } = body;

    if (!platform || !platformId) {
      return NextResponse.json(
        { error: 'Missing platform or platformId' },
        { status: 400 }
      );
    }

    // Get the connection
    const connection = await getConnection(user.id, platform, platformId);
    if (!connection) {
      return NextResponse.json(
        { error: 'Platform connection not found' },
        { status: 404 }
      );
    }

    // Update status to syncing
    await updateSyncStatus(user.id, platform, platformId, 'syncing');

    try {
      let orders: ImportedOrderData[] = [];
      
      // Fetch orders based on platform
      switch (platform) {
        case 'shopify':
          orders = await syncShopifyOrders(connection, dateRange);
          break;
        case 'amazon':
          orders = await syncAmazonOrders(connection, dateRange);
          break;
        case 'etsy':
          orders = await syncEtsyOrders(connection, dateRange);
          break;
        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }

      // Save orders to database
      const { imported, errors } = await saveImportedOrders(
        user.id,
        connection.id,
        orders
      );

      // Update sales summaries for affected states
      const affectedStates = new Set(orders.map(o => o.shippingState).filter(Boolean));
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      
      for (const state of affectedStates) {
        if (state) {
          await updateSalesSummary(user.id, state, currentMonth);
        }
      }

      // Update sync status
      await updateSyncStatus(user.id, platform, platformId, 'success');

      return NextResponse.json({
        success: true,
        imported,
        errors: errors.length > 0 ? errors : undefined,
        affectedStates: Array.from(affectedStates),
      });
    } catch (syncError) {
      // Update sync status with error
      await updateSyncStatus(
        user.id,
        platform,
        platformId,
        'error',
        syncError instanceof Error ? syncError.message : 'Sync failed'
      );
      throw syncError;
    }
  } catch (error) {
    console.error('Platform sync error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sync failed' },
      { status: 500 }
    );
  }
}

// =============================================================================
// Platform-specific sync functions
// =============================================================================

interface DateRange {
  start?: string;
  end?: string;
}

interface PlatformConnection {
  id: string;
  platform: string;
  platformId: string;
  accessToken: string;
  refreshToken: string | null;
}

async function syncShopifyOrders(
  connection: PlatformConnection,
  dateRange?: DateRange
): Promise<ImportedOrderData[]> {
  const params: {
    createdAtMin?: string;
    createdAtMax?: string;
    status?: 'any' | 'open' | 'closed' | 'cancelled';
    limit?: number;
  } = {
    status: 'any',
    limit: 250,
  };

  if (dateRange?.start) params.createdAtMin = dateRange.start;
  if (dateRange?.end) params.createdAtMax = dateRange.end;

  const { orders, error } = await fetchShopifyOrders(
    connection.platformId,
    connection.accessToken,
    params
  );

  if (error || !orders) {
    throw new Error(error || 'Failed to fetch Shopify orders');
  }

  return orders.map((order: ShopifyOrder) => ({
    platform: 'shopify',
    platformOrderId: String(order.id),
    orderNumber: order.name,
    orderDate: new Date(order.created_at),
    subtotal: parseFloat(order.subtotal_price),
    shippingAmount: 0, // Would need to extract from line items
    taxAmount: parseFloat(order.total_tax),
    totalAmount: parseFloat(order.total_price),
    currency: order.currency,
    status: mapShopifyStatus(order.financial_status, order.fulfillment_status),
    customerEmail: undefined, // Privacy - don't store by default
    shippingState: order.shipping_address?.province_code,
    shippingCity: order.shipping_address?.city,
    shippingZip: order.shipping_address?.zip,
    shippingCountry: order.shipping_address?.country_code || 'US',
    billingState: order.billing_address?.province_code,
    lineItems: order.line_items,
    taxBreakdown: {
      taxLines: order.tax_lines,
    },
    rawData: order,
  }));
}

async function syncAmazonOrders(
  connection: PlatformConnection,
  dateRange?: DateRange
): Promise<ImportedOrderData[]> {
  // Refresh token if needed
  let accessToken = connection.accessToken;
  if (connection.refreshToken) {
    const { accessToken: newToken, error } = await refreshAmazonToken(connection.refreshToken);
    if (newToken) {
      accessToken = newToken;
      // TODO: Update token in database
    } else if (error) {
      console.warn('Failed to refresh Amazon token:', error);
    }
  }

  const params: {
    createdAfter?: string;
    createdBefore?: string;
  } = {};
  
  if (dateRange?.start) params.createdAfter = dateRange.start;
  if (dateRange?.end) params.createdBefore = dateRange.end;

  const { orders, error } = await fetchAmazonOrders(accessToken, params);

  if (error || !orders) {
    throw new Error(error || 'Failed to fetch Amazon orders');
  }

  return orders.map((order: AmazonOrder) => ({
    platform: 'amazon',
    platformOrderId: order.AmazonOrderId,
    orderNumber: order.AmazonOrderId,
    orderDate: new Date(order.PurchaseDate),
    subtotal: order.OrderTotal ? parseFloat(order.OrderTotal.Amount) : 0,
    shippingAmount: 0,
    taxAmount: 0, // Would need to fetch order items for tax details
    totalAmount: order.OrderTotal ? parseFloat(order.OrderTotal.Amount) : 0,
    currency: order.OrderTotal?.CurrencyCode || 'USD',
    status: mapAmazonStatus(order.OrderStatus),
    shippingState: order.ShippingAddress?.StateOrRegion,
    shippingCity: order.ShippingAddress?.City,
    shippingZip: order.ShippingAddress?.PostalCode,
    shippingCountry: order.ShippingAddress?.CountryCode || 'US',
    rawData: order,
  }));
}

async function syncEtsyOrders(
  connection: PlatformConnection,
  dateRange?: DateRange
): Promise<ImportedOrderData[]> {
  // Refresh token if needed
  let accessToken = connection.accessToken;
  if (connection.refreshToken) {
    const { accessToken: newToken, error } = await refreshEtsyToken(connection.refreshToken);
    if (newToken) {
      accessToken = newToken;
      // TODO: Update token in database
    } else if (error) {
      console.warn('Failed to refresh Etsy token:', error);
    }
  }

  // Parse metadata to get shop ID
  const metadata = connection.platformId; // Shop ID is stored as platformId
  const shopId = parseInt(metadata, 10);

  const params: {
    minCreated?: number;
    maxCreated?: number;
    limit?: number;
  } = {
    limit: 100,
  };
  
  if (dateRange?.start) params.minCreated = Math.floor(new Date(dateRange.start).getTime() / 1000);
  if (dateRange?.end) params.maxCreated = Math.floor(new Date(dateRange.end).getTime() / 1000);

  const { receipts, error } = await fetchEtsyReceipts(accessToken, shopId, params);

  if (error || !receipts) {
    throw new Error(error || 'Failed to fetch Etsy receipts');
  }

  return receipts.map((receipt: EtsyReceipt) => ({
    platform: 'etsy',
    platformOrderId: String(receipt.receipt_id),
    orderNumber: String(receipt.receipt_id),
    orderDate: new Date(receipt.create_timestamp * 1000),
    subtotal: receipt.subtotal.amount / receipt.subtotal.divisor,
    shippingAmount: receipt.total_shipping_cost.amount / receipt.total_shipping_cost.divisor,
    taxAmount: receipt.total_tax_cost.amount / receipt.total_tax_cost.divisor,
    totalAmount: receipt.grandtotal.amount / receipt.grandtotal.divisor,
    currency: receipt.grandtotal.currency_code,
    status: mapEtsyStatus(receipt.status),
    shippingState: receipt.state,
    shippingCity: receipt.city,
    shippingZip: receipt.zip,
    shippingCountry: receipt.country_iso || 'US',
    lineItems: receipt.transactions,
    rawData: receipt,
  }));
}

// =============================================================================
// Status Mapping Helpers
// =============================================================================

function mapShopifyStatus(financial: string, fulfillment: string | null): string {
  if (financial === 'refunded') return 'refunded';
  if (financial === 'voided') return 'cancelled';
  if (fulfillment === 'fulfilled') return 'fulfilled';
  if (financial === 'paid') return 'paid';
  return 'pending';
}

function mapAmazonStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'Pending': 'pending',
    'Unshipped': 'paid',
    'PartiallyShipped': 'paid',
    'Shipped': 'fulfilled',
    'Canceled': 'cancelled',
    'Unfulfillable': 'cancelled',
  };
  return statusMap[status] || 'pending';
}

function mapEtsyStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'open': 'pending',
    'paid': 'paid',
    'completed': 'fulfilled',
    'refunded': 'refunded',
  };
  return statusMap[status.toLowerCase()] || 'pending';
}
