import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getConnection, updateSyncStatus } from '@/lib/platforms';
import { userCanConnectPlatform, tierGateError, resolveUserPlan, checkOrderLimit, orderLimitError, getOrderLimitDisplay, getPlanDisplayName } from '@/lib/plans';
import { getCurrentMonthOrderCount } from '@/lib/usage';
import { importConnectionOrders } from '@/lib/platform-sync';
import { checkAndCreateAlerts } from '@/lib/nexus-alerts';

// History imports can take a while; fetching stops after a minute and the
// next sync continues from the newest order already imported.
export const maxDuration = 120;

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
      const result = await importConnectionOrders({
        userId: user.id,
        subscription: user.subscription,
        platform,
        connection,
        dateRange,
      });
      const { imported, errors } = result;

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
        trimmed: result.cap.truncated ? {
          message: `${result.cap.skipped} order${result.cap.skipped === 1 ? '' : 's'} weren't imported because ${result.cap.skipped === 1 ? 'its month is' : 'their months are'} over your plan's limit of ${(result.cap.limit ?? 0).toLocaleString()} orders a month, so your state totals don't include ${result.cap.skipped === 1 ? 'it' : 'them'}. Upgrade to import ${result.cap.skipped === 1 ? 'it' : 'them'}.`,
          totalAvailable: result.fetchedCount,
          skipped: result.cap.skipped,
        } : undefined,
        errors: errors.length > 0 ? errors : undefined,
        affectedStates: result.affectedStates,
        newAlerts: newAlerts.length > 0 ? newAlerts.length : undefined,
        usageWarning,
        historyFrom: result.historyFrom,
        moreToImport: result.complete
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
