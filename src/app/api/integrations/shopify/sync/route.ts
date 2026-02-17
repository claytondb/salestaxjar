import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { 
  getConnection, 
  updateSyncStatus,
  saveImportedOrders,
  updateSalesSummary,
  ImportedOrderData,
} from '@/lib/platforms';
import { fetchOrders, isShopifyConfigured, ShopifyOrder } from '@/lib/platforms/shopify';
import { userCanConnectPlatform, tierGateError } from '@/lib/plans';
import { canImportOrders, getImportableOrderCount, freeUserImportError, orderLimitExceededError, getUserUsageStatus } from '@/lib/usage';

/**
 * POST /api/integrations/shopify/sync
 * 
 * Sync orders from a connected Shopify store
 * Body: { 
 *   shop?: string,  // Shop domain (optional if only one store connected)
 *   dateRange?: { start: string, end: string }  // Optional date filter
 * }
 */
export async function POST(request: NextRequest) {
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

    // Check order limit - free users can't import
    const importCheck = await canImportOrders(user.id, user.subscription);
    if (!importCheck.allowed) {
      if (importCheck.limit === 0) {
        return NextResponse.json(freeUserImportError(), { status: 403 });
      }
      return NextResponse.json(
        orderLimitExceededError(
          access.userPlan,
          importCheck.currentCount,
          importCheck.limit!,
          0
        ),
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

    const body = await request.json().catch(() => ({}));
    const { shop, dateRange } = body;

    // Get connection
    const connection = await getConnection(user.id, 'shopify', shop || undefined);
    
    if (!connection) {
      return NextResponse.json(
        { error: 'No Shopify store connected' },
        { status: 404 }
      );
    }

    // Update status to syncing
    await updateSyncStatus(user.id, 'shopify', connection.platformId, 'syncing');

    try {
      // Build fetch params
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

      // Fetch orders from Shopify
      const { orders: allOrders, error } = await fetchOrders(
        connection.platformId,
        connection.accessToken,
        params
      );

      if (error || !allOrders) {
        throw new Error(error || 'Failed to fetch Shopify orders');
      }

      // Check and enforce order limits - truncate if necessary
      const importableInfo = await getImportableOrderCount(user.id, user.subscription, allOrders.length);
      const orders = importableInfo.truncated 
        ? allOrders.slice(0, importableInfo.canImport)
        : allOrders;
      
      const truncated = importableInfo.truncated;
      const skippedCount = allOrders.length - orders.length;

      // Transform orders for import
      const importedOrders: ImportedOrderData[] = orders.map((order: ShopifyOrder) => ({
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

      // Save orders to database
      const { imported, errors: saveErrors } = await saveImportedOrders(
        user.id,
        connection.id,
        importedOrders
      );

      // Update sales summaries for affected states
      const affectedStates = new Set(importedOrders.map(o => o.shippingState).filter(Boolean));
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      
      for (const state of affectedStates) {
        if (state) {
          await updateSalesSummary(user.id, state, currentMonth);
        }
      }

      // Update sync status to success
      await updateSyncStatus(user.id, 'shopify', connection.platformId, 'success');

      // Get updated usage stats
      const usageStatus = await getUserUsageStatus(user.id, user.subscription);

      return NextResponse.json({
        success: true,
        shop: connection.platformId,
        shopName: connection.platformName,
        imported,
        total: allOrders.length,
        processed: orders.length,
        errors: saveErrors.length > 0 ? saveErrors : undefined,
        affectedStates: Array.from(affectedStates),
        // Usage info
        usage: {
          current: usageStatus.currentCount,
          limit: usageStatus.limit,
          remaining: usageStatus.remaining,
          percentUsed: usageStatus.percentUsed,
        },
        // Truncation warning
        ...(truncated && {
          truncated: true,
          skipped: skippedCount,
          message: `Imported ${imported} of ${allOrders.length} orders. ${skippedCount} orders were skipped due to your plan's monthly limit of ${usageStatus.limit} orders.`,
        }),
        // Usage warnings
        ...(usageStatus.atLimit && {
          warning: 'limit_reached',
          warningMessage: `You've reached your monthly order limit. Upgrade to continue importing orders.`,
        }),
        ...(usageStatus.nearLimit && !usageStatus.atLimit && {
          warning: 'near_limit',
          warningMessage: `You've used ${usageStatus.percentUsed}% of your monthly order limit.`,
        }),
      });
    } catch (syncError) {
      // Update sync status with error
      await updateSyncStatus(
        user.id,
        'shopify',
        connection.platformId,
        'error',
        syncError instanceof Error ? syncError.message : 'Sync failed'
      );
      throw syncError;
    }
  } catch (error) {
    console.error('Shopify sync error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sync failed' },
      { status: 500 }
    );
  }
}

function mapShopifyStatus(financial: string, fulfillment: string | null): string {
  if (financial === 'refunded') return 'refunded';
  if (financial === 'voided') return 'cancelled';
  if (fulfillment === 'fulfilled') return 'fulfilled';
  if (financial === 'paid') return 'paid';
  return 'pending';
}
