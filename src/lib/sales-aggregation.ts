/**
 * Sales Aggregation Service
 * 
 * Aggregates imported orders into per-state sales summaries.
 * Handles both rolling 12-month and calendar year periods,
 * since different states use different measurement periods.
 */

import { prisma } from './prisma';

/**
 * Get all distinct months in YYYY-MM format from a start date to now.
 */
function getMonthRange(startDate: Date): string[] {
  const months: string[] = [];
  const now = new Date();
  const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

  while (current <= now) {
    months.push(
      `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`
    );
    current.setMonth(current.getMonth() + 1);
  }

  return months;
}

/**
 * Aggregate sales for a single user, single state, single month.
 * Updates the SalesSummary record.
 */
async function aggregateStateMonth(
  userId: string,
  stateCode: string,
  period: string // YYYY-MM
): Promise<void> {
  const [yearStr, monthStr] = period.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  const periodStart = new Date(year, month - 1, 1);
  const periodEnd = new Date(year, month, 1); // First day of next month

  const aggregates = await prisma.importedOrder.aggregate({
    where: {
      userId,
      shippingState: stateCode,
      orderDate: {
        gte: periodStart,
        lt: periodEnd,
      },
      status: {
        notIn: ['cancelled', 'refunded'],
      },
      shippingCountry: 'US',
    },
    _sum: {
      subtotal: true,
      taxAmount: true,
      totalAmount: true,
    },
    _count: true,
  });

  // Get unique platforms
  const platforms = await prisma.importedOrder.findMany({
    where: {
      userId,
      shippingState: stateCode,
      orderDate: {
        gte: periodStart,
        lt: periodEnd,
      },
      shippingCountry: 'US',
    },
    select: { platform: true },
    distinct: ['platform'],
  });

  const totalSales = Number(aggregates._sum.totalAmount || 0);
  const taxableSales = Number(aggregates._sum.subtotal || 0);
  const taxCollected = Number(aggregates._sum.taxAmount || 0);
  const orderCount = aggregates._count;

  // Only create/update if there are orders
  if (orderCount > 0) {
    await prisma.salesSummary.upsert({
      where: {
        userId_stateCode_period: { userId, stateCode, period },
      },
      create: {
        userId,
        stateCode,
        period,
        totalSales,
        taxableSales,
        taxCollected,
        orderCount,
        platforms: JSON.stringify(platforms.map(p => p.platform)),
      },
      update: {
        totalSales,
        taxableSales,
        taxCollected,
        orderCount,
        platforms: JSON.stringify(platforms.map(p => p.platform)),
        updatedAt: new Date(),
      },
    });
  }
}

/**
 * Full aggregation: recalculate all sales summaries for a user.
 * Called after a platform sync imports new orders.
 * 
 * Only re-aggregates months that have imported orders.
 */
export async function aggregateAllSales(userId: string): Promise<{
  statesProcessed: number;
  monthsProcessed: number;
}> {
  // Find the earliest order date for this user
  const earliest = await prisma.importedOrder.findFirst({
    where: { userId, shippingCountry: 'US' },
    orderBy: { orderDate: 'asc' },
    select: { orderDate: true },
  });

  if (!earliest) {
    return { statesProcessed: 0, monthsProcessed: 0 };
  }

  // Get all distinct states with orders
  const states = await prisma.importedOrder.findMany({
    where: {
      userId,
      shippingCountry: 'US',
      shippingState: { not: null },
      status: { notIn: ['cancelled', 'refunded'] },
    },
    select: { shippingState: true },
    distinct: ['shippingState'],
  });

  const stateCodes = states
    .map(s => s.shippingState)
    .filter((s): s is string => !!s);

  // Get all months from earliest order to now
  const months = getMonthRange(earliest.orderDate);

  let monthsProcessed = 0;

  // Aggregate each state × month combination
  for (const stateCode of stateCodes) {
    for (const month of months) {
      await aggregateStateMonth(userId, stateCode, month);
      monthsProcessed++;
    }
  }

  return {
    statesProcessed: stateCodes.length,
    monthsProcessed,
  };
}

/**
 * Incremental aggregation: only re-aggregate specific states and months
 * that were affected by a sync. More efficient than full aggregation.
 */
export async function aggregateForStates(
  userId: string,
  stateCodes: string[]
): Promise<void> {
  if (stateCodes.length === 0) return;

  // Find the earliest order date across affected states
  const earliest = await prisma.importedOrder.findFirst({
    where: {
      userId,
      shippingCountry: 'US',
      shippingState: { in: stateCodes },
    },
    orderBy: { orderDate: 'asc' },
    select: { orderDate: true },
  });

  if (!earliest) return;

  const months = getMonthRange(earliest.orderDate);

  for (const stateCode of stateCodes) {
    for (const month of months) {
      await aggregateStateMonth(userId, stateCode, month);
    }
  }
}

/**
 * Get aggregated totals for nexus exposure calculation.
 * Returns rolling 12-month AND current calendar year totals per state,
 * since different states use different measurement periods.
 */
export async function getExposureTotals(userId: string): Promise<
  Map<string, {
    rolling12MonthSales: number;
    rolling12MonthTransactions: number;
    calendarYearSales: number;
    calendarYearTransactions: number;
  }>
> {
  const now = new Date();
  const currentYear = now.getFullYear();

  // Rolling 12-month window
  const rolling12Start = new Date(now);
  rolling12Start.setMonth(rolling12Start.getMonth() - 12);

  // Calendar year start
  const calendarYearStart = new Date(currentYear, 0, 1);

  // Generate month keys for rolling 12 months
  const rolling12Months = getMonthRange(rolling12Start);

  // Generate month keys for calendar year
  const calendarYearMonths = getMonthRange(calendarYearStart);

  // Fetch all summaries at once for efficiency
  const allSummaries = await prisma.salesSummary.findMany({
    where: {
      userId,
      period: {
        in: [...new Set([...rolling12Months, ...calendarYearMonths])],
      },
    },
  });

  // Build a lookup: stateCode -> { period -> summary }
  const summaryMap = new Map<string, Map<string, { totalSales: number; orderCount: number }>>();

  for (const s of allSummaries) {
    if (!summaryMap.has(s.stateCode)) {
      summaryMap.set(s.stateCode, new Map());
    }
    summaryMap.get(s.stateCode)!.set(s.period, {
      totalSales: Number(s.totalSales),
      orderCount: s.orderCount,
    });
  }

  // Compute totals per state
  const result = new Map<string, {
    rolling12MonthSales: number;
    rolling12MonthTransactions: number;
    calendarYearSales: number;
    calendarYearTransactions: number;
  }>();

  for (const [stateCode, periodMap] of summaryMap) {
    let rolling12MonthSales = 0;
    let rolling12MonthTransactions = 0;
    let calendarYearSales = 0;
    let calendarYearTransactions = 0;

    for (const month of rolling12Months) {
      const data = periodMap.get(month);
      if (data) {
        rolling12MonthSales += data.totalSales;
        rolling12MonthTransactions += data.orderCount;
      }
    }

    for (const month of calendarYearMonths) {
      const data = periodMap.get(month);
      if (data) {
        calendarYearSales += data.totalSales;
        calendarYearTransactions += data.orderCount;
      }
    }

    result.set(stateCode, {
      rolling12MonthSales,
      rolling12MonthTransactions,
      calendarYearSales,
      calendarYearTransactions,
    });
  }

  return result;
}
