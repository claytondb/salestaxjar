/**
 * Pulling orders from a connected store into Sails. Used by the Sync button
 * (POST /api/platforms/sync) and the daily automatic sync.
 */

import { saveImportedOrders, type ImportedOrderData } from '@/lib/platforms';
import { applyMonthlyOrderCap } from '@/lib/usage';
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

/** Fetching stops after this long; the next sync continues from the newest order imported. */
export const FETCH_BUDGET_MS = 60_000;
const DAY_MS = 86_400_000;

/**
 * Where a sync starts: January 1 of last year the first time (nexus rules look
 * back that far), then a week before the newest order already imported from
 * this connection (to pick up late refunds and cancellations).
 */
export async function syncStartFor(connectionId: string, now: Date = new Date()): Promise<Date> {
  const latest = await prisma.importedOrder.aggregate({
    where: { platformConnectionId: connectionId },
    _max: { orderDate: true },
  });
  const newest = latest?._max?.orderDate;
  if (!newest) return new Date(Date.UTC(now.getUTCFullYear() - 1, 0, 1));
  return new Date(new Date(newest).getTime() - 7 * DAY_MS);
}

// =============================================================================
// Platform-specific sync functions
// =============================================================================

export interface DateRange {
  start?: string;
  end?: string;
}

export interface SyncProgress {
  /** False when fetching stopped early (time or page limit) */
  complete: boolean;
  /** Stop starting new API pages after this time (ms timestamp) */
  deadline: number;
}

export interface PlatformConnection {
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

// =============================================================================
// Fetch + import
// =============================================================================

/** Fetch a connection's orders in the date range, mapped to Sails' format. */
export async function fetchConnectionOrders(
  userId: string,
  platform: string,
  connection: PlatformConnection,
  range: DateRange,
  progress: SyncProgress
): Promise<ImportedOrderData[]> {
  switch (platform) {
    case 'shopify':
      return syncShopifyOrders(connection, range, progress);
    case 'woocommerce':
      return syncWooCommerceOrders(userId, connection, range, progress);
    case 'squarespace':
      return syncSquarespaceOrders(userId, connection, range);
    case 'bigcommerce':
      return syncBigCommerceOrders(userId, connection, range);
    case 'ecwid':
      return syncEcwidOrders(userId, connection, range);
    case 'magento':
      return syncMagentoOrders(userId, connection, range);
    case 'prestashop':
      return syncPrestaShopOrders(userId, connection, range);
    case 'opencart':
      return syncOpenCartOrders(userId, connection, range);
    // Future: wix
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

export interface ImportResult {
  imported: number;
  errors: string[];
  /** Orders fetched from the store, before the plan's monthly cap */
  fetchedCount: number;
  /** Orders left out because their month was over the plan's limit */
  cap: { truncated: boolean; skipped: number; limit: number | null };
  affectedStates: string[];
  /** Where this sync started */
  historyFrom: string;
  /** False when fetching stopped early; syncing again continues */
  complete: boolean;
}

/**
 * Fetch a connection's new orders, apply the plan's monthly order cap and
 * save them. Doesn't touch the connection's sync status or alerts.
 */
export async function importConnectionOrders(params: {
  userId: string;
  subscription: { plan?: string | null; status?: string | null } | null | undefined;
  platform: string;
  connection: PlatformConnection;
  dateRange?: DateRange;
  budgetMs?: number;
}): Promise<ImportResult> {
  const { userId, subscription, platform, connection, dateRange } = params;
  const range: DateRange = {
    start: dateRange?.start ?? (await syncStartFor(connection.id)).toISOString(),
    end: dateRange?.end,
  };
  const progress: SyncProgress = { complete: true, deadline: Date.now() + (params.budgetMs ?? FETCH_BUDGET_MS) };

  const fetched = await fetchConnectionOrders(userId, platform, connection, range, progress);

  // History is always kept; new orders dated this month are capped by plan
  const capped = await applyMonthlyOrderCap({
    userId,
    subscription,
    platform,
    items: fetched,
    getOrderDate: (o) => o.orderDate,
    getPlatformOrderId: (o) => o.platformOrderId,
  });

  const { imported, errors } = await saveImportedOrders(userId, connection.id, capped.items);

  return {
    imported,
    errors,
    fetchedCount: fetched.length,
    cap: { truncated: capped.truncated, skipped: capped.skipped, limit: capped.limit },
    affectedStates: Array.from(new Set(capped.items.map((o) => o.shippingState).filter((st): st is string => !!st))),
    historyFrom: range.start!,
    complete: progress.complete,
  };
}
