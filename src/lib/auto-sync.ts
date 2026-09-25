/**
 * The daily automatic sync: brings in new orders from every connected store
 * so nexus totals stay current without the seller clicking Sync.
 *
 * New threshold alerts (and their emails) are created here only when
 * AUTO_SYNC_ALERTS_ENABLED=true. Otherwise they're created, as before, the
 * next time the seller clicks Sync, so the daily sync never sends anyone an
 * email they didn't trigger.
 */

import { prisma } from './prisma';
import { updateSyncStatus } from './platforms';
import { importConnectionOrders } from './platform-sync';
import { checkAndCreateAlerts } from './nexus-alerts';
import { resolveUserPlan, PLAN_ORDER_LIMITS } from './plans';
import { autoSyncAlertsEnabled } from './scheduled-email-flags';
// The platforms with incremental, oldest-first imports
import { AUTO_SYNC_PLATFORMS } from './capabilities';

/** Don't re-sync a store that synced this recently (e.g. the seller clicked Sync today). */
const RECENT_SYNC_MS = 20 * 60 * 60 * 1000;
/** A sync marked "syncing" longer ago than this is treated as abandoned. */
const STUCK_SYNC_MS = 15 * 60 * 1000;
/** Time given to each store before moving on to the next. */
const PER_CONNECTION_BUDGET_MS = 20_000;

export interface AutoSyncResult {
  due: number;
  synced: number;
  failed: number;
  skipped: number;
  /** Stores left for tomorrow because time ran out */
  deferred: number;
  imported: number;
  alerts: number;
}

export async function autoSyncConnections(opts: { deadline: number; now?: Date }): Promise<AutoSyncResult> {
  const now = opts.now ?? new Date();
  const result: AutoSyncResult = { due: 0, synced: 0, failed: 0, skipped: 0, deferred: 0, imported: 0, alerts: 0 };

  const connections = await prisma.platformConnection.findMany({
    where: {
      platform: { in: AUTO_SYNC_PLATFORMS },
      OR: [{ lastSyncAt: null }, { lastSyncAt: { lt: new Date(now.getTime() - RECENT_SYNC_MS) } }],
    },
    orderBy: { lastSyncAt: { sort: 'asc', nulls: 'first' } },
  });
  // Leave alone a sync that's running right now
  const due = connections.filter(
    (c) => !(c.syncStatus === 'syncing' && now.getTime() - c.updatedAt.getTime() < STUCK_SYNC_MS)
  );
  result.due = due.length;
  if (due.length === 0) return result;

  const users = await prisma.user.findMany({
    where: { id: { in: Array.from(new Set(due.map((c) => c.userId))) } },
    select: { id: true, subscription: { select: { plan: true, status: true } } },
  });
  const userById = new Map(users.map((u) => [u.id, u]));
  const syncedUsers = new Set<string>();

  for (const connection of due) {
    const remaining = opts.deadline - Date.now();
    if (remaining < 5_000) {
      result.deferred++;
      continue;
    }
    const user = userById.get(connection.userId);
    if (!user || PLAN_ORDER_LIMITS[resolveUserPlan(user.subscription)] === 0) {
      result.skipped++;
      continue;
    }

    try {
      await updateSyncStatus(user.id, connection.platform, connection.platformId, 'syncing');
      const imported = await importConnectionOrders({
        userId: user.id,
        subscription: user.subscription,
        platform: connection.platform,
        connection,
        budgetMs: Math.min(PER_CONNECTION_BUDGET_MS, remaining - 4_000),
      });
      await updateSyncStatus(user.id, connection.platform, connection.platformId, 'success');
      result.synced++;
      result.imported += imported.imported;
      syncedUsers.add(user.id);
    } catch (error) {
      result.failed++;
      console.error(`[auto-sync] ${connection.platform} connection ${connection.id} failed:`, error);
      await updateSyncStatus(
        user.id,
        connection.platform,
        connection.platformId,
        'error',
        error instanceof Error ? error.message : 'Sync failed'
      ).catch(() => {});
    }
  }

  if (autoSyncAlertsEnabled()) {
    for (const userId of syncedUsers) {
      if (opts.deadline - Date.now() < 3_000) break;
      try {
        result.alerts += (await checkAndCreateAlerts(userId, now)).length;
      } catch (error) {
        console.error(`[auto-sync] alert check failed for user ${userId}:`, error);
      }
    }
  }

  return result;
}
