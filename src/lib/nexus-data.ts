/**
 * Loads a seller's imported orders into the shape the nexus engine needs.
 *
 * Reads ImportedOrder directly (three grouped queries — one per measurement
 * window), so results are always current no matter which sync or import path
 * brought the orders in.
 */

import { prisma } from './prisma';
import {
  computeWindows,
  emptyWindows,
  channelForPlatform,
  evaluateAllStates,
  summarize,
  getTopActions,
  EXCLUDED_ORDER_STATUSES,
  MARKETPLACE_PLATFORMS,
  type DataCoverage,
  type StateWindows,
  type WindowKey,
  type StateEvaluation,
  type ExposureSummary,
  type TopAction,
} from './nexus-engine';
import { toStateCode } from './us-states';

const WINDOW_KEYS: WindowKey[] = ['previousYear', 'currentYear', 'rolling12'];

export async function loadNexusInputs(
  userId: string,
  now: Date = new Date()
): Promise<{ byState: Map<string, StateWindows>; coverage: DataCoverage }> {
  const ranges = computeWindows(now);
  const baseWhere = {
    userId,
    shippingCountry: 'US',
    shippingState: { not: null },
    status: { notIn: EXCLUDED_ORDER_STATUSES },
  };

  const [grouped, range, marketplaceCount] = await Promise.all([
    Promise.all(
      WINDOW_KEYS.map((key) =>
        prisma.importedOrder.groupBy({
          by: ['shippingState', 'platform'],
          where: { ...baseWhere, orderDate: { gte: ranges[key].start, lt: ranges[key].end } },
          _sum: { totalAmount: true, taxAmount: true },
          _count: { _all: true },
        })
      )
    ),
    prisma.importedOrder.aggregate({
      where: { userId, shippingCountry: 'US', status: { notIn: EXCLUDED_ORDER_STATUSES } },
      _min: { orderDate: true },
      _max: { orderDate: true },
    }),
    prisma.importedOrder.count({
      where: { userId, platform: { in: [...MARKETPLACE_PLATFORMS] } },
    }),
  ]);

  const byState = new Map<string, StateWindows>();
  WINDOW_KEYS.forEach((key, i) => {
    for (const row of grouped[i]) {
      const code = toStateCode(row.shippingState);
      if (!code) continue;
      let state = byState.get(code);
      if (!state) {
        state = emptyWindows();
        byState.set(code, state);
      }
      const bucket = state[key][channelForPlatform(row.platform)];
      // Sales = order totals minus the sales tax collected (shipping included).
      const sales = Number(row._sum.totalAmount ?? 0) - Number(row._sum.taxAmount ?? 0);
      bucket.sales += Math.max(0, sales);
      bucket.orders += row._count._all;
    }
  });

  return {
    byState,
    coverage: {
      earliestOrder: range._min.orderDate ?? null,
      latestOrder: range._max.orderDate ?? null,
      hasMarketplaceData: marketplaceCount > 0,
    },
  };
}

export interface NexusReport {
  generatedAt: string;
  coverage: { earliestOrder: string | null; latestOrder: string | null; hasMarketplaceData: boolean };
  evaluations: StateEvaluation[];
  summary: ExposureSummary;
  topActions: TopAction[];
}

/** Everything the nexus pages need for one seller. */
export async function buildNexusReport(userId: string, now: Date = new Date()): Promise<NexusReport> {
  const { byState, coverage } = await loadNexusInputs(userId, now);
  const evaluations = evaluateAllStates(byState, { now, coverage });
  return {
    generatedAt: now.toISOString(),
    coverage: {
      earliestOrder: coverage.earliestOrder?.toISOString() ?? null,
      latestOrder: coverage.latestOrder?.toISOString() ?? null,
      hasMarketplaceData: coverage.hasMarketplaceData,
    },
    evaluations,
    summary: summarize(evaluations),
    topActions: getTopActions(evaluations, coverage, now),
  };
}
