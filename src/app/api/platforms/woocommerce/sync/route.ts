/**
 * WooCommerce Order Sync API
 * 
 * POST /api/platforms/woocommerce/sync
 * 
 * Fetches orders from WooCommerce and imports them to the database.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { 
  getCredentials, 
  fetchAllOrders, 
  mapOrderToImport 
} from '@/lib/platforms/woocommerce';
import { saveImportedOrders, updateSyncStatus } from '@/lib/platforms';
import { userCanConnectPlatform, tierGateError } from '@/lib/plans';
import { canImportOrders, getImportableOrderCount, freeUserImportError, orderLimitExceededError, getUserUsageStatus } from '@/lib/usage';
import { z } from 'zod';

const syncSchema = z.object({
  platformId: z.string().min(1, 'Platform ID (store URL) is required'),
  daysBack: z.number().optional().default(30), // How far back to fetch orders
});

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

    // Tier gate: WooCommerce requires Starter or higher
    const access = userCanConnectPlatform(user, 'woocommerce');
    if (!access.allowed) {
      return NextResponse.json(
        tierGateError(access.userPlan, access.requiredPlan, 'platform_woocommerce'),
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

    // Parse request body
    const body = await request.json();
    const parsed = syncSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { platformId, daysBack } = parsed.data;

    // Get credentials from database
    const credentials = await getCredentials(user.id, platformId);
    if (!credentials) {
      return NextResponse.json(
        { error: 'WooCommerce connection not found' },
        { status: 404 }
      );
    }

    // Get connection ID
    const connection = await prisma.platformConnection.findUnique({
      where: {
        userId_platform_platformId: {
          userId: user.id,
          platform: 'woocommerce',
          platformId,
        },
      },
    });

    if (!connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    // Update sync status to syncing
    await updateSyncStatus(user.id, 'woocommerce', platformId, 'syncing');

    try {
      // Calculate date range
      const afterDate = new Date();
      afterDate.setDate(afterDate.getDate() - daysBack);

      // Fetch orders from WooCommerce
      const allWooOrders = await fetchAllOrders(credentials, {
        after: afterDate.toISOString(),
        status: ['processing', 'completed', 'on-hold'], // Skip cancelled/refunded
      });

      // Check and enforce order limits - truncate if necessary
      const importableInfo = await getImportableOrderCount(user.id, user.subscription, allWooOrders.length);
      const wooOrders = importableInfo.truncated 
        ? allWooOrders.slice(0, importableInfo.canImport)
        : allWooOrders;
      
      const truncated = importableInfo.truncated;
      const skippedCount = allWooOrders.length - wooOrders.length;

      // Map to our format
      const importedOrders = wooOrders.map(order => 
        mapOrderToImport(order, platformId)
      );

      // Save to database
      const result = await saveImportedOrders(
        user.id,
        connection.id,
        importedOrders
      );

      // Update sync status to success
      await updateSyncStatus(user.id, 'woocommerce', platformId, 'success');

      // Update sales summaries for each state
      const stateSet = new Set(importedOrders.map(o => o.shippingState).filter(Boolean));
      
      // Get updated usage stats
      const usageStatus = await getUserUsageStatus(user.id, user.subscription);

      return NextResponse.json({
        success: true,
        imported: result.imported,
        errors: result.errors,
        totalOrders: allWooOrders.length,
        processed: wooOrders.length,
        dateRange: {
          from: afterDate.toISOString(),
          to: new Date().toISOString(),
        },
        statesFound: Array.from(stateSet),
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
          message: `Imported ${result.imported} of ${allWooOrders.length} orders. ${skippedCount} orders were skipped due to your plan's monthly limit.`,
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
      // Update sync status to error
      const errorMessage = syncError instanceof Error ? syncError.message : 'Sync failed';
      await updateSyncStatus(user.id, 'woocommerce', platformId, 'error', errorMessage);
      
      throw syncError;
    }

  } catch (error) {
    console.error('WooCommerce sync error:', error);
    return NextResponse.json(
      { 
        error: 'Sync failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
