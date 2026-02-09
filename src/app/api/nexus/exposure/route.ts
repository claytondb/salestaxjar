import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getExposureTotals } from '@/lib/sales-aggregation';
import {
  STATE_NEXUS_THRESHOLDS,
  calculateExposureStatus,
  ExposureStatus,
} from '@/lib/nexus-thresholds';

export interface StateExposure {
  stateCode: string;
  stateName: string;
  hasSalesTax: boolean;
  /** Current total sales (using appropriate measurement period) */
  currentSales: number;
  /** Current transaction count */
  currentTransactions: number;
  /** Dollar threshold */
  salesThreshold: number | null;
  /** Transaction threshold */
  transactionThreshold: number | null;
  /** Percentage toward highest threshold */
  salesPercentage: number;
  transactionPercentage: number;
  highestPercentage: number;
  /** Status: safe, approaching, warning, exceeded */
  status: ExposureStatus;
  /** Measurement period type */
  measurementPeriod: string;
  /** Notes about the state */
  notes: string;
  /** Rolling 12-month breakdown */
  rolling12MonthSales: number;
  rolling12MonthTransactions: number;
  /** Calendar year breakdown */
  calendarYearSales: number;
  calendarYearTransactions: number;
}

/**
 * GET /api/nexus/exposure
 * 
 * Returns nexus exposure data for all states, sorted by highest exposure first.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const exposureTotals = await getExposureTotals(user.id);

    const exposures: StateExposure[] = STATE_NEXUS_THRESHOLDS.map(threshold => {
      const totals = exposureTotals.get(threshold.stateCode);

      if (!totals || !threshold.hasSalesTax || !threshold.salesThreshold) {
        return {
          stateCode: threshold.stateCode,
          stateName: threshold.stateName,
          hasSalesTax: threshold.hasSalesTax,
          currentSales: 0,
          currentTransactions: 0,
          salesThreshold: threshold.salesThreshold,
          transactionThreshold: threshold.transactionThreshold,
          salesPercentage: 0,
          transactionPercentage: 0,
          highestPercentage: 0,
          status: 'safe' as ExposureStatus,
          measurementPeriod: threshold.measurementPeriod,
          notes: threshold.notes,
          rolling12MonthSales: totals?.rolling12MonthSales || 0,
          rolling12MonthTransactions: totals?.rolling12MonthTransactions || 0,
          calendarYearSales: totals?.calendarYearSales || 0,
          calendarYearTransactions: totals?.calendarYearTransactions || 0,
        };
      }

      // Pick measurement period
      let sales: number;
      let transactions: number;

      if (threshold.measurementPeriod === 'rolling_12_months') {
        sales = totals.rolling12MonthSales;
        transactions = totals.rolling12MonthTransactions;
      } else {
        sales = Math.max(totals.rolling12MonthSales, totals.calendarYearSales);
        transactions = Math.max(
          totals.rolling12MonthTransactions,
          totals.calendarYearTransactions
        );
      }

      const exposure = calculateExposureStatus(sales, transactions, threshold);

      return {
        stateCode: threshold.stateCode,
        stateName: threshold.stateName,
        hasSalesTax: threshold.hasSalesTax,
        currentSales: sales,
        currentTransactions: transactions,
        salesThreshold: threshold.salesThreshold,
        transactionThreshold: threshold.transactionThreshold,
        salesPercentage: exposure.salesPercentage,
        transactionPercentage: exposure.transactionPercentage,
        highestPercentage: exposure.highestPercentage,
        status: exposure.status,
        measurementPeriod: threshold.measurementPeriod,
        notes: threshold.notes,
        rolling12MonthSales: totals.rolling12MonthSales,
        rolling12MonthTransactions: totals.rolling12MonthTransactions,
        calendarYearSales: totals.calendarYearSales,
        calendarYearTransactions: totals.calendarYearTransactions,
      };
    });

    // Sort: exceeded first, then by highest percentage descending
    // States with no sales tax go to the bottom
    exposures.sort((a, b) => {
      if (!a.hasSalesTax && b.hasSalesTax) return 1;
      if (a.hasSalesTax && !b.hasSalesTax) return -1;
      
      const statusOrder: Record<ExposureStatus, number> = {
        exceeded: 0,
        warning: 1,
        approaching: 2,
        safe: 3,
      };

      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      if (statusDiff !== 0) return statusDiff;

      return b.highestPercentage - a.highestPercentage;
    });

    // Summary stats
    const summary = {
      totalStatesWithSales: exposures.filter(e => e.currentSales > 0).length,
      exceededCount: exposures.filter(e => e.status === 'exceeded').length,
      warningCount: exposures.filter(e => e.status === 'warning').length,
      approachingCount: exposures.filter(e => e.status === 'approaching').length,
      safeCount: exposures.filter(
        e => e.status === 'safe' && e.hasSalesTax
      ).length,
      noSalesTaxCount: exposures.filter(e => !e.hasSalesTax).length,
    };

    return NextResponse.json({ exposures, summary });
  } catch (error) {
    console.error('Error fetching nexus exposure:', error);
    return NextResponse.json(
      { error: 'Failed to fetch nexus exposure data' },
      { status: 500 }
    );
  }
}
