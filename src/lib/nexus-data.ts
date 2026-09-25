/**
 * Loads a seller's imported orders into the shape the nexus engine needs:
 * monthly sales per state (direct vs marketplace) for the last ~3 calendar
 * years, how much history each channel covers, months a plan limit kept
 * orders out, and the states the seller marked as registered.
 *
 * Reads ImportedOrder directly (grouped in the database), so results are
 * current no matter which sync or import path brought the orders in.
 */

import { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import {
  addMonths,
  channelForPlatform,
  emptyChannels,
  emptyCoverage,
  evaluateAllStates,
  finishCoverage,
  getTopActions,
  historyStartMonth,
  monthKey,
  summarize,
  EXCLUDED_ORDER_STATUSES,
  type DataCoverage,
  type ExposureSummary,
  type MonthKey,
  type Registration,
  type StateEvaluation,
  type StateMonths,
  type TopAction,
} from './nexus-engine';
import { toStateCode } from './us-states';
import { PLAN_ORDER_LIMITS, resolveUserPlan } from './plans';

/** Spellings of "United States" that stores put in the country field. */
export const US_COUNTRY_VALUES = ['US', 'USA', 'UNITED STATES', 'UNITED STATES OF AMERICA'];

interface MonthRow {
  state: string | null;
  platform: string;
  month: string;
  sales: number | string | null;
  orders: number | string;
}

interface PlatformRangeRow {
  platform: string;
  earliest: Date | null;
  latest: Date | null;
}

interface MonthCountRow {
  month: string;
  orders: number | string;
}

export interface NexusInputs {
  byState: Map<string, StateMonths>;
  coverage: DataCoverage;
  registrations: Map<string, Registration>;
}

export async function loadNexusInputs(userId: string, now: Date = new Date()): Promise<NexusInputs> {
  const from = new Date(`${historyStartMonth(now)}-01T00:00:00.000Z`);
  const excluded = Prisma.join(EXCLUDED_ORDER_STATUSES);
  const usValues = Prisma.join(US_COUNTRY_VALUES);

  const [monthRows, rangeRows, subscription, nexusStates] = await Promise.all([
    // Sales = order totals minus the sales tax collected (shipping included).
    prisma.$queryRaw<MonthRow[]>`
      SELECT "shippingState" AS state,
             platform,
             to_char(date_trunc('month', "orderDate"), 'YYYY-MM') AS month,
             SUM("totalAmount" - "taxAmount")::float8 AS sales,
             COUNT(*)::int AS orders
      FROM "ImportedOrder"
      WHERE "userId" = ${userId}
        AND upper(trim("shippingCountry")) IN (${usValues})
        AND "shippingState" IS NOT NULL
        AND "status" NOT IN (${excluded})
        AND "orderDate" >= ${from}
        AND "orderDate" <= ${now}
      GROUP BY 1, 2, 3`,
    prisma.$queryRaw<PlatformRangeRow[]>`
      SELECT platform, MIN("orderDate") AS earliest, MAX("orderDate") AS latest
      FROM "ImportedOrder"
      WHERE "userId" = ${userId}
        AND upper(trim("shippingCountry")) IN (${usValues})
        AND "shippingState" IS NOT NULL
        AND "status" NOT IN (${excluded})
      GROUP BY 1`,
    prisma.subscription.findUnique({ where: { userId }, select: { plan: true, status: true } }),
    prisma.nexusState.findMany({
      where: { hasNexus: true, business: { userId } },
      select: { stateCode: true, registrationNumber: true },
    }),
  ]);

  // ── Monthly sales per state ──
  const byState = new Map<string, StateMonths>();
  for (const row of monthRows) {
    const code = toStateCode(row.state);
    if (!code) continue;
    let months = byState.get(code);
    if (!months) {
      months = new Map();
      byState.set(code, months);
    }
    let bucket = months.get(row.month);
    if (!bucket) {
      bucket = emptyChannels();
      months.set(row.month, bucket);
    }
    const channel = channelForPlatform(row.platform);
    const sales = Number(row.sales ?? 0);
    bucket[channel].sales += Number.isFinite(sales) ? sales : 0;
    bucket[channel].orders += Number(row.orders) || 0;
  }

  // ── Coverage per channel ──
  const coverage = emptyCoverage();
  for (const row of rangeRows) {
    const channel = channelForPlatform(row.platform);
    const c = coverage[channel];
    const earliest = row.earliest ? new Date(row.earliest) : null;
    const latest = row.latest ? new Date(row.latest) : null;
    if (earliest && (!c.earliest || earliest < c.earliest)) c.earliest = earliest;
    if (latest && (!c.latest || latest > c.latest)) c.latest = latest;
    if (channel === 'marketplace' && earliest) coverage.hasMarketplaceData = true;
  }
  finishCoverage(coverage);

  // ── Months where the plan's monthly cap kept orders out ──
  const plan = resolveUserPlan(subscription);
  const limit = PLAN_ORDER_LIMITS[plan];
  coverage.planOrderLimit = limit;
  if (limit !== null && limit > 0) {
    const counts = await prisma.$queryRaw<MonthCountRow[]>`
      SELECT to_char(date_trunc('month', "orderDate"), 'YYYY-MM') AS month, COUNT(*)::int AS orders
      FROM "ImportedOrder"
      WHERE "userId" = ${userId} AND "orderDate" >= ${from}
      GROUP BY 1`;
    coverage.cappedMonths = counts
      .filter((r) => (Number(r.orders) || 0) >= limit)
      .map((r) => r.month)
      .sort();
  }

  // ── States the seller marked in Nexus → Manual tracking ──
  const registrations = new Map<string, Registration>();
  for (const s of nexusStates) {
    const code = toStateCode(s.stateCode);
    if (!code) continue;
    const value: Registration = s.registrationNumber ? 'registered' : 'tracked';
    if (registrations.get(code) !== 'registered') registrations.set(code, value);
  }

  return { byState, coverage, registrations };
}

export interface NexusReport {
  generatedAt: string;
  coverage: {
    earliestOrder: string | null;
    latestOrder: string | null;
    hasMarketplaceData: boolean;
    cappedMonths: MonthKey[];
    planOrderLimit: number | null;
  };
  evaluations: StateEvaluation[];
  summary: ExposureSummary;
  topActions: TopAction[];
}

/** Everything the nexus pages need for one seller. */
export async function buildNexusReport(userId: string, now: Date = new Date()): Promise<NexusReport> {
  const { byState, coverage, registrations } = await loadNexusInputs(userId, now);
  const evaluations = evaluateAllStates(byState, { now, coverage, registrations });
  return {
    generatedAt: now.toISOString(),
    coverage: {
      earliestOrder: coverage.earliestOrder?.toISOString() ?? null,
      latestOrder: coverage.latestOrder?.toISOString() ?? null,
      hasMarketplaceData: coverage.hasMarketplaceData,
      cappedMonths: coverage.cappedMonths.filter((m) => m >= addMonths(monthKey(now), -23)),
      planOrderLimit: coverage.planOrderLimit,
    },
    evaluations,
    summary: summarize(evaluations),
    topActions: getTopActions(evaluations, coverage, now),
  };
}
