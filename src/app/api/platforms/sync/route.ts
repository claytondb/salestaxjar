import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { 
  getConnection, 
  updateSyncStatus,
  saveImportedOrders,
  updateSalesSummary,
  ImportedOrderData,
} from '@/lib/platforms';
import { userCanConnectPlatform, tierGateError, resolveUserPlan, checkOrderLimit, orderLimitError, getOrderLimitDisplay, getPlanDisplayName } from '@/lib/plans';
import { prisma } from '@/lib/prisma';
import { fetchOrders as fetchShopifyOrders, ShopifyOrder } from '@/lib/platforms/shopify';
import { 
  getCredentials as getWooCredentials,
  fetchAllOrders as fetchWooOrders, 
  mapOrderToImport as mapWooOrder,
} from '@/lib/platforms/woocommerce';
import { 
  getCredentials as getSquarespaceCredentials,
  fetchAllOrders as fetchSquarespaceOrders, 
  mapOrderToImport as mapSquarespaceOrder,
} from '@/lib/platforms/squarespace';
import { 
  getCredentials as getBigCommerceCredentials,
  fetchAllOrders as fetchBigCommerceOrders, 
  fetchOrderShippingAddresses as fetchBigCommerceShippingAddresses,
  mapOrderToImport as mapBigCommerceOrder,
} from '@/lib/platforms/bigcommerce';
import { aggregateForStates } from '@/lib/sales-aggregation';
import { checkAndCreateAlerts } from '@/lib/nexus-alerts';

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

    // Tier gate: check platform access
    const access = userCanConnectPlatform(user, platform);
    if (!access.allowed) {
      return NextResponse.json(
        tierGateError(access.userPlan, access.requiredPlan, `platform_${platform}`),
        { status: 403 }
      );
    }

    // Check order limit before syncing
    const userPlan = resolveUserPlan(user.subscription);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthOrderCount = await prisma.importedOrder.count({
      where: {
        userId: user.id,
        createdAt: { gte: monthStart },
      },
    });
    
    const limitCheck = checkOrderLimit(userPlan, currentMonthOrderCount);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        orderLimitError(userPlan, limitCheck.currentCount, limitCheck.limit!, limitCheck.upgradeNeeded),
        { status: 403 }
      );
    }

    // Calculate how many more orders we can import this month
    const remainingCapacity = limitCheck.limit !== null 
      ? limitCheck.limit - currentMonthOrderCount 
      : Infinity;

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
        case 'woocommerce':
          orders = await syncWooCommerceOrders(user.id, connection, dateRange);
          break;
        case 'squarespace':
          orders = await syncSquarespaceOrders(user.id, connection, dateRange);
          break;
        case 'bigcommerce':
          orders = await syncBigCommerceOrders(user.id, connection, dateRange);
          break;
        // Future: wix
        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }

      // Trim orders to remaining capacity if needed
      let trimmed = false;
      if (orders.length > remainingCapacity && remainingCapacity !== Infinity) {
        orders = orders.slice(0, remainingCapacity);
        trimmed = true;
      }

      // Save orders to database
      const { imported, errors } = await saveImportedOrders(
        user.id,
        connection.id,
        orders
      );

      // Update sales summaries for affected states
      const affectedStates = new Set(orders.map(o => o.shippingState).filter(Boolean));
      const affectedStateArray = Array.from(affectedStates).filter((s): s is string => !!s);
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      
      for (const state of affectedStates) {
        if (state) {
          await updateSalesSummary(user.id, state, currentMonth);
        }
      }

      // Run full aggregation for affected states (rolling 12-month + calendar year)
      if (affectedStateArray.length > 0) {
        try {
          await aggregateForStates(user.id, affectedStateArray);
        } catch (aggError) {
          console.error('Sales aggregation error (non-fatal):', aggError);
        }
      }

      // Check nexus thresholds and create alerts
      let newAlerts: unknown[] = [];
      try {
        newAlerts = await checkAndCreateAlerts(user.id);
      } catch (alertError) {
        console.error('Nexus alert check error (non-fatal):', alertError);
      }

      // Update sync status
      await updateSyncStatus(user.id, platform, platformId, 'success');

      // Check order usage after import for approaching-limit warnings
      const updatedOrderCount = currentMonthOrderCount + imported;
      const updatedLimitCheck = checkOrderLimit(userPlan, updatedOrderCount);
      
      let usageWarning: {
        type: 'approaching' | 'warning' | 'at_limit';
        message: string;
        currentCount: number;
        limit: number;
        percentUsed: number;
        upgradeTo: string | null;
      } | undefined;

      if (updatedLimitCheck.limit !== null && updatedLimitCheck.limit > 0) {
        const percentUsed = Math.round((updatedOrderCount / updatedLimitCheck.limit) * 100);
        
        if (percentUsed >= 100) {
          usageWarning = {
            type: 'at_limit',
            message: `You've reached your monthly limit of ${updatedLimitCheck.limit.toLocaleString()} orders. Upgrade to ${updatedLimitCheck.upgradeNeeded ? getPlanDisplayName(updatedLimitCheck.upgradeNeeded) : 'a higher plan'} for ${updatedLimitCheck.upgradeNeeded ? getOrderLimitDisplay(updatedLimitCheck.upgradeNeeded).toLowerCase() : 'more orders'}.`,
            currentCount: updatedOrderCount,
            limit: updatedLimitCheck.limit,
            percentUsed,
            upgradeTo: updatedLimitCheck.upgradeNeeded,
          };
        } else if (percentUsed >= 90) {
          usageWarning = {
            type: 'warning',
            message: `You've used ${percentUsed}% of your monthly order limit (${updatedOrderCount.toLocaleString()} / ${updatedLimitCheck.limit.toLocaleString()}). Consider upgrading soon.`,
            currentCount: updatedOrderCount,
            limit: updatedLimitCheck.limit,
            percentUsed,
            upgradeTo: updatedLimitCheck.upgradeNeeded,
          };
        } else if (percentUsed >= 75) {
          usageWarning = {
            type: 'approaching',
            message: `You've used ${percentUsed}% of your monthly order limit (${updatedOrderCount.toLocaleString()} / ${updatedLimitCheck.limit.toLocaleString()}).`,
            currentCount: updatedOrderCount,
            limit: updatedLimitCheck.limit,
            percentUsed,
            upgradeTo: updatedLimitCheck.upgradeNeeded,
          };
        }
      }

      return NextResponse.json({
        success: true,
        imported,
        trimmed: trimmed ? { 
          message: `Only ${imported} of your orders were imported due to your monthly limit. Upgrade for more.`,
          totalAvailable: orders.length + (trimmed ? 1 : 0), // approximate
        } : undefined,
        errors: errors.length > 0 ? errors : undefined,
        affectedStates: affectedStateArray,
        newAlerts: newAlerts.length > 0 ? newAlerts.length : undefined,
        usageWarning,
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

async function syncWooCommerceOrders(
  userId: string,
  connection: PlatformConnection,
  dateRange?: DateRange
): Promise<ImportedOrderData[]> {
  // Get credentials from database
  const credentials = await getWooCredentials(userId, connection.platformId);
  if (!credentials) {
    throw new Error('WooCommerce credentials not found');
  }

  // Build fetch options
  const options: {
    after?: string;
    before?: string;
    status?: string[];
  } = {
    status: ['processing', 'completed', 'on-hold'],
  };

  if (dateRange?.start) options.after = dateRange.start;
  if (dateRange?.end) options.before = dateRange.end;

  // Fetch orders
  const orders = await fetchWooOrders(credentials, options);

  // Map to our format
  return orders.map(order => mapWooOrder(order, connection.platformId));
}

async function syncSquarespaceOrders(
  userId: string,
  connection: PlatformConnection,
  dateRange?: DateRange
): Promise<ImportedOrderData[]> {
  // Get API key from database
  const apiKey = await getSquarespaceCredentials(userId, connection.platformId);
  if (!apiKey) {
    throw new Error('Squarespace credentials not found');
  }

  // Build fetch options
  const now = new Date();
  const defaultStart = new Date();
  defaultStart.setDate(defaultStart.getDate() - 30);

  const options = {
    modifiedAfter: dateRange?.start || defaultStart.toISOString(),
    modifiedBefore: dateRange?.end || now.toISOString(),
  };

  // Fetch orders
  const orders = await fetchSquarespaceOrders(apiKey, options);

  // Filter out test orders and cancelled
  const validOrders = orders.filter(
    order => !order.testmode && order.fulfillmentStatus !== 'CANCELED'
  );

  // Map to our format
  return validOrders.map(order => mapSquarespaceOrder(order));
}

async function syncBigCommerceOrders(
  userId: string,
  connection: PlatformConnection,
  dateRange?: DateRange
): Promise<ImportedOrderData[]> {
  // Get credentials from database
  const credentials = await getBigCommerceCredentials(userId, connection.platformId);
  if (!credentials) {
    throw new Error('BigCommerce credentials not found');
  }

  // Build fetch options
  const now = new Date();
  const defaultStart = new Date();
  defaultStart.setDate(defaultStart.getDate() - 30);

  const options = {
    minDateCreated: dateRange?.start || defaultStart.toISOString(),
    maxDateCreated: dateRange?.end || now.toISOString(),
  };

  // Fetch orders
  const orders = await fetchBigCommerceOrders(credentials, options);

  // Filter out cancelled and refunded orders
  const validOrders = orders.filter(
    order => ![4, 5, 6].includes(order.status_id)
  );

  // Map to our format (fetch shipping addresses for accuracy)
  const mappedOrders = await Promise.all(
    validOrders.map(async (order) => {
      try {
        const shippingAddresses = await fetchBigCommerceShippingAddresses(credentials, order.id);
        return mapBigCommerceOrder(order, shippingAddresses[0]);
      } catch {
        return mapBigCommerceOrder(order);
      }
    })
  );

  return mappedOrders;
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
