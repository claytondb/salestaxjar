import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { 
  getConnection, 
  updateSyncStatus,
  saveImportedOrders,
  ImportedOrderData,
} from '@/lib/platforms';
import { userCanConnectPlatform, tierGateError, resolveUserPlan, checkOrderLimit, orderLimitError, getOrderLimitDisplay, getPlanDisplayName } from '@/lib/plans';
import { applyMonthlyOrderCap, getCurrentMonthOrderCount } from '@/lib/usage';
import { fetchOrdersSince as fetchShopifyOrdersSince, ShopifyOrder } from '@/lib/platforms/shopify';
import { prisma } from '@/lib/prisma';
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
import {
  getCredentials as getEcwidCredentials,
  fetchAllOrders as fetchEcwidOrders,
  mapOrderToImport as mapEcwidOrder,
} from '@/lib/platforms/ecwid';
import {
  getCredentials as getMagentoCredentials,
  fetchAllOrders as fetchMagentoOrders,
  mapOrderToImport as mapMagentoOrder,
} from '@/lib/platforms/magento';
import {
  getCredentials as getPrestaShopCredentials,
  fetchAllOrders as fetchPrestaShopOrders,
  mapOrderToImport as mapPrestaShopOrder,
} from '@/lib/platforms/prestashop';
import {
  getCredentials as getOpenCartCredentials,
  fetchOrders as fetchOpenCartOrders,
  mapOrderToImport as mapOpenCartOrder,
} from '@/lib/platforms/opencart';
import { checkAndCreateAlerts } from '@/lib/nexus-alerts';

// History imports can take a while; fetching stops after FETCH_BUDGET_MS and
// the next sync continues from the newest order already imported.
export const maxDuration = 120;
const FETCH_BUDGET_MS = 60_000;
const DAY_MS = 86_400_000;

/**
 * Where a sync starts: January 1 of last year the first time (nexus rules look
 * back that far), then a week before the newest order already imported from
 * this connection (to pick up late refunds and cancellations).
 */
async function syncStartFor(connectionId: string, now: Date = new Date()): Promise<Date> {
  const latest = await prisma.importedOrder.aggregate({
    where: { platformConnectionId: connectionId },
    _max: { orderDate: true },
  });
  const newest = latest?._max?.orderDate;
  if (!newest) return new Date(Date.UTC(now.getUTCFullYear() - 1, 0, 1));
  return new Date(new Date(newest).getTime() - 7 * DAY_MS);
}

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

    // Plan limits count orders DATED this month (see usage.ts). A plan with a
    // zero limit can't import at all; otherwise older history is always imported
    // and only new orders dated this month are capped (applyMonthlyOrderCap below).
    const userPlan = resolveUserPlan(user.subscription);
    const currentMonthOrderCount = await getCurrentMonthOrderCount(user.id);
    
    const limitCheck = checkOrderLimit(userPlan, currentMonthOrderCount);
    if (limitCheck.limit === 0) {
      return NextResponse.json(
        orderLimitError(userPlan, limitCheck.currentCount, limitCheck.limit, limitCheck.upgradeNeeded),
        { status: 403 }
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
      const range: DateRange = {
        start: dateRange?.start ?? (await syncStartFor(connection.id)).toISOString(),
        end: dateRange?.end,
      };
      const progress: SyncProgress = { complete: true, deadline: Date.now() + FETCH_BUDGET_MS };
      
      // Fetch orders based on platform
      switch (platform) {
        case 'shopify':
          orders = await syncShopifyOrders(connection, range, progress);
          break;
        case 'woocommerce':
          orders = await syncWooCommerceOrders(user.id, connection, range, progress);
          break;
        case 'squarespace':
          orders = await syncSquarespaceOrders(user.id, connection, range);
          break;
        case 'bigcommerce':
          orders = await syncBigCommerceOrders(user.id, connection, range);
          break;
        case 'ecwid':
          orders = await syncEcwidOrders(user.id, connection, range);
          break;
        case 'magento':
          orders = await syncMagentoOrders(user.id, connection, range);
          break;
        case 'prestashop':
          orders = await syncPrestaShopOrders(user.id, connection, range);
          break;
        case 'opencart':
          orders = await syncOpenCartOrders(user.id, connection, range);
          break;
        // Future: wix
        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }

      // Apply the monthly cap (history is always kept; new orders dated this month are capped)
      const fetchedCount = orders.length;
      const capped = await applyMonthlyOrderCap({
        userId: user.id,
        subscription: user.subscription,
        platform,
        items: orders,
        getOrderDate: (o) => o.orderDate,
        getPlatformOrderId: (o) => o.platformOrderId,
      });
      orders = capped.items;
      const trimmed = capped.truncated;

      // Save orders to database
      const { imported, errors } = await saveImportedOrders(
        user.id,
        connection.id,
        orders
      );

      const affectedStateArray = Array.from(new Set(orders.map(o => o.shippingState).filter((s): s is string => !!s)));

      // Check nexus thresholds and create alerts. The nexus engine reads the
      // imported orders directly, so no per-month summaries need rebuilding.
      let newAlerts: unknown[] = [];
      try {
        newAlerts = await checkAndCreateAlerts(user.id);
      } catch (alertError) {
        console.error('Nexus alert check error (non-fatal):', alertError);
      }

      // Update sync status
      await updateSyncStatus(user.id, platform, platformId, 'success');

      // Check order usage after import for approaching-limit warnings
      const updatedOrderCount = await getCurrentMonthOrderCount(user.id);
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
          message: `${capped.skipped} order${capped.skipped === 1 ? '' : 's'} weren't imported because ${capped.skipped === 1 ? 'its month is' : 'their months are'} over your plan's limit of ${(capped.limit ?? 0).toLocaleString()} orders a month, so your state totals don't include ${capped.skipped === 1 ? 'it' : 'them'}. Upgrade to import ${capped.skipped === 1 ? 'it' : 'them'}.`,
          totalAvailable: fetchedCount,
          skipped: capped.skipped,
        } : undefined,
        errors: errors.length > 0 ? errors : undefined,
        affectedStates: affectedStateArray,
        newAlerts: newAlerts.length > 0 ? newAlerts.length : undefined,
        usageWarning,
        historyFrom: range.start,
        moreToImport: progress.complete
          ? undefined
          : { message: 'There are more orders to bring in. Click Sync again to continue importing your history.' },
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

interface SyncProgress {
  /** False when fetching stopped early (time or page limit) */
  complete: boolean;
  /** Stop starting new API pages after this time (ms timestamp) */
  deadline: number;
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
  dateRange: DateRange,
  progress: SyncProgress
): Promise<ImportedOrderData[]> {
  const result = await fetchShopifyOrdersSince(connection.platformId, connection.accessToken, {
    createdAtMin: dateRange.start,
    deadline: progress.deadline,
  });

  if (result.error && (!result.orders || result.orders.length === 0)) {
    throw new Error(result.error);
  }
  if (!result.complete) progress.complete = false;

  const end = dateRange.end ? new Date(dateRange.end).getTime() : Infinity;
  const orders = (result.orders ?? []).filter((o) => new Date(o.created_at).getTime() <= end);

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
    // Orders with nothing to ship (digital products) have no shipping address;
    // their billing address says where the sale went, and it still counts for nexus.
    shippingState: (order.shipping_address ?? order.billing_address)?.province_code,
    shippingCity: (order.shipping_address ?? order.billing_address)?.city,
    shippingZip: (order.shipping_address ?? order.billing_address)?.zip,
    shippingCountry: (order.shipping_address ?? order.billing_address)?.country_code || 'US',
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
  dateRange: DateRange,
  progress: SyncProgress
): Promise<ImportedOrderData[]> {
  // Get credentials from database
  const credentials = await getWooCredentials(userId, connection.platformId);
  if (!credentials) {
    throw new Error('WooCommerce credentials not found');
  }

  // Build fetch options
  const WOO_MAX_PAGES = 50;
  const options: {
    after?: string;
    before?: string;
    status?: string[];
    order: 'asc';
    maxPages: number;
    deadline: number;
  } = {
    status: ['processing', 'completed', 'on-hold'],
    // Oldest first, so an import that stops early can continue next time
    order: 'asc',
    maxPages: WOO_MAX_PAGES,
    deadline: progress.deadline,
  };

  if (dateRange.start) options.after = dateRange.start;
  if (dateRange.end) options.before = dateRange.end;

  // Fetch orders
  const orders = await fetchWooOrders(credentials, options);
  if (orders.length >= WOO_MAX_PAGES * 100 || Date.now() > progress.deadline) progress.complete = false;

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

async function syncEcwidOrders(
  userId: string,
  connection: PlatformConnection,
  dateRange?: DateRange
): Promise<ImportedOrderData[]> {
  const credentials = await getEcwidCredentials(userId, connection.platformId);
  if (!credentials) {
    throw new Error('Ecwid credentials not found');
  }

  const now = new Date();
  const defaultStart = new Date();
  defaultStart.setDate(defaultStart.getDate() - 30);

  const options = {
    createdFrom: dateRange?.start || defaultStart.toISOString(),
    createdTo: dateRange?.end || now.toISOString(),
  };

  const orders = await fetchEcwidOrders(credentials, options);

  // Filter out cancelled/incomplete orders
  const validOrders = orders.filter(
    (order) => order.paymentStatus !== 'CANCELLED' && order.fulfillmentStatus !== 'RETURNED'
  );

  return validOrders.map((order) => mapEcwidOrder(order));
}

async function syncMagentoOrders(
  userId: string,
  connection: PlatformConnection,
  dateRange?: DateRange
): Promise<ImportedOrderData[]> {
  const credentials = await getMagentoCredentials(userId, connection.platformId);
  if (!credentials) {
    throw new Error('Magento credentials not found');
  }

  const now = new Date();
  const defaultStart = new Date();
  defaultStart.setDate(defaultStart.getDate() - 30);

  const options = {
    createdAtFrom: dateRange?.start || defaultStart.toISOString(),
    createdAtTo: dateRange?.end || now.toISOString(),
  };

  const orders = await fetchMagentoOrders(credentials, options);

  // Filter out cancelled orders (status = 'canceled' in Magento)
  const validOrders = orders.filter(
    (order) => order.status !== 'canceled' && order.status !== 'closed'
  );

  return validOrders.map((order) => mapMagentoOrder(order));
}

async function syncPrestaShopOrders(
  userId: string,
  connection: PlatformConnection,
  dateRange?: DateRange
): Promise<ImportedOrderData[]> {
  const credentials = await getPrestaShopCredentials(userId, connection.platformId);
  if (!credentials) {
    throw new Error('PrestaShop credentials not found');
  }

  const now = new Date();
  const defaultStart = new Date();
  defaultStart.setDate(defaultStart.getDate() - 30);

  const options = {
    dateFrom: dateRange?.start || defaultStart.toISOString(),
    dateTo: dateRange?.end || now.toISOString(),
  };

  const orders = await fetchPrestaShopOrders(credentials, options);

  // Map orders (PrestaShop's mapper fetches address details async)
  const mappedOrders = await Promise.all(
    orders.map((order) => mapPrestaShopOrder(order, credentials))
  );

  return mappedOrders;
}

async function syncOpenCartOrders(
  userId: string,
  connection: PlatformConnection,
  dateRange?: DateRange
): Promise<ImportedOrderData[]> {
  const credentials = await getOpenCartCredentials(userId, connection.platformId);
  if (!credentials) {
    throw new Error('OpenCart credentials not found');
  }

  const now = new Date();
  const defaultStart = new Date();
  defaultStart.setDate(defaultStart.getDate() - 30);

  const options = {
    dateFrom: dateRange?.start || defaultStart.toISOString(),
    dateTo: dateRange?.end || now.toISOString(),
    limit: 250,
  };

  const orders = await fetchOpenCartOrders(credentials, options);

  return orders.map((order) => mapOpenCartOrder(order));
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
