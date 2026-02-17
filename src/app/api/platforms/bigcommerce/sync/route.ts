/**
 * BigCommerce Order Sync API
 * 
 * POST /api/platforms/bigcommerce/sync
 * 
 * Fetches orders from BigCommerce and imports them to the database.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { 
  getCredentials, 
  fetchAllOrders,
  fetchOrderShippingAddresses,
  mapOrderToImport 
} from '@/lib/platforms/bigcommerce';
import { saveImportedOrders, updateSyncStatus } from '@/lib/platforms';
import { userCanConnectPlatform, tierGateError } from '@/lib/plans';
import { canImportOrders, getImportableOrderCount, freeUserImportError, orderLimitExceededError, getUserUsageStatus } from '@/lib/usage';
import { z } from 'zod';

const syncSchema = z.object({
  platformId: z.string().min(1, 'Platform ID (Store Hash) is required'),
  daysBack: z.number().optional().default(30),
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

    // Tier gate: BigCommerce requires Starter or higher
    const access = userCanConnectPlatform(user, 'bigcommerce');
    if (!access.allowed) {
      return NextResponse.json(
        tierGateError(access.userPlan, access.requiredPlan, 'platform_bigcommerce'),
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
        { error: 'BigCommerce connection not found' },
        { status: 404 }
      );
    }

    // Get connection ID
    const connection = await prisma.platformConnection.findUnique({
      where: {
        userId_platform_platformId: {
          userId: user.id,
          platform: 'bigcommerce',
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
    await updateSyncStatus(user.id, 'bigcommerce', platformId, 'syncing');

    try {
      // Calculate date range
      const now = new Date();
      const afterDate = new Date();
      afterDate.setDate(afterDate.getDate() - daysBack);

      // Fetch orders from BigCommerce
      const bigCommerceOrders = await fetchAllOrders(credentials, {
        minDateCreated: afterDate.toISOString(),
        maxDateCreated: now.toISOString(),
      });

      // Filter out cancelled and refunded orders
      const allValidOrders = bigCommerceOrders.filter(
        order => ![4, 5, 6].includes(order.status_id) // Exclude refunded, cancelled, declined
      );

      // Check and enforce order limits - truncate if necessary
      const importableInfo = await getImportableOrderCount(user.id, user.subscription, allValidOrders.length);
      const validOrders = importableInfo.truncated 
        ? allValidOrders.slice(0, importableInfo.canImport)
        : allValidOrders;
      
      const truncated = importableInfo.truncated;
      const skippedCount = allValidOrders.length - validOrders.length;

      // Map orders to our format
      // For better accuracy, we fetch shipping addresses for each order
      const importedOrders = await Promise.all(
        validOrders.map(async (order) => {
          try {
            // Try to get shipping address
            const shippingAddresses = await fetchOrderShippingAddresses(
              credentials,
              order.id
            );
            const shippingAddress = shippingAddresses[0]; // Use first shipping address
            return mapOrderToImport(order, shippingAddress);
          } catch {
            // If shipping address fetch fails, use billing address
            return mapOrderToImport(order);
          }
        })
      );

      // Save to database
      const result = await saveImportedOrders(
        user.id,
        connection.id,
        importedOrders
      );

      // Update sync status to success
      await updateSyncStatus(user.id, 'bigcommerce', platformId, 'success');

      // Get unique states
      const stateSet = new Set(importedOrders.map(o => o.shippingState).filter(Boolean));

      // Get updated usage stats
      const usageStatus = await getUserUsageStatus(user.id, user.subscription);

      return NextResponse.json({
        success: true,
        imported: result.imported,
        errors: result.errors,
        totalOrders: bigCommerceOrders.length,
        validOrders: allValidOrders.length,
        processed: validOrders.length,
        dateRange: {
          from: afterDate.toISOString(),
          to: now.toISOString(),
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
          message: `Imported ${result.imported} of ${allValidOrders.length} orders. ${skippedCount} orders were skipped due to your plan's monthly limit.`,
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
      await updateSyncStatus(user.id, 'bigcommerce', platformId, 'error', errorMessage);
      
      throw syncError;
    }

  } catch (error) {
    console.error('BigCommerce sync error:', error);
    return NextResponse.json(
      { 
        error: 'Sync failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
