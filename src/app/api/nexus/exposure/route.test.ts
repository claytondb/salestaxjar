/**
 * Tests for /api/nexus/exposure route
 *
 * Tests nexus exposure data: GET returns per-state exposure calculations,
 * sorted by risk level, with summary stats.
 * Uses mocks for auth, sales-aggregation, and nexus-thresholds.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing route
vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('@/lib/sales-aggregation', () => ({
  getExposureTotals: vi.fn(),
}));

vi.mock('@/lib/nexus-thresholds', () => ({
  STATE_NEXUS_THRESHOLDS: [
    {
      stateCode: 'CA',
      stateName: 'California',
      hasSalesTax: true,
      salesThreshold: 100000,
      transactionThreshold: 200,
      measurementPeriod: 'rolling_12_months',
      notes: '',
    },
    {
      stateCode: 'TX',
      stateName: 'Texas',
      hasSalesTax: true,
      salesThreshold: 100000,
      transactionThreshold: null,
      measurementPeriod: 'rolling_12_months',
      notes: '',
    },
    {
      stateCode: 'OR',
      stateName: 'Oregon',
      hasSalesTax: false,
      salesThreshold: null,
      transactionThreshold: null,
      measurementPeriod: 'rolling_12_months',
      notes: 'No sales tax',
    },
    {
      stateCode: 'WA',
      stateName: 'Washington',
      hasSalesTax: true,
      salesThreshold: 100000,
      transactionThreshold: 200,
      measurementPeriod: 'calendar_year',
      notes: '',
    },
  ],
  calculateExposureStatus: vi.fn(),
}));

import { GET } from './route';
import { getCurrentUser } from '@/lib/auth';
import { getExposureTotals } from '@/lib/sales-aggregation';
import { calculateExposureStatus } from '@/lib/nexus-thresholds';

// =============================================================================
// Mock Data
// =============================================================================

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  emailVerified: true,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  subscription: null,
};

// Map: stateCode -> { rolling12MonthSales, rolling12MonthTransactions, calendarYearSales, calendarYearTransactions }
const mockExposureTotals = new Map([
  ['CA', {
    rolling12MonthSales: 75000,
    rolling12MonthTransactions: 120,
    calendarYearSales: 50000,
    calendarYearTransactions: 80,
  }],
  ['TX', {
    rolling12MonthSales: 20000,
    rolling12MonthTransactions: 30,
    calendarYearSales: 15000,
    calendarYearTransactions: 20,
  }],
  ['WA', {
    rolling12MonthSales: 95000,
    rolling12MonthTransactions: 180,
    calendarYearSales: 95000,
    calendarYearTransactions: 180,
  }],
]);

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
  vi.mocked(getExposureTotals).mockResolvedValue(mockExposureTotals);
  vi.mocked(calculateExposureStatus).mockImplementation((sales, transactions, threshold) => {
    const salesPct = threshold.salesThreshold ? (sales / threshold.salesThreshold) * 100 : 0;
    const txnPct = threshold.transactionThreshold ? (transactions / threshold.transactionThreshold) * 100 : 0;
    const highest = Math.max(salesPct, txnPct);
    let status: 'safe' | 'approaching' | 'warning' | 'exceeded' = 'safe';
    if (highest >= 100) status = 'exceeded';
    else if (highest >= 80) status = 'warning';
    else if (highest >= 50) status = 'approaching';
    return { salesPercentage: salesPct, transactionPercentage: txnPct, highestPercentage: highest, status };
  });
});

// =============================================================================
// GET Tests
// =============================================================================

describe('GET /api/nexus/exposure - authentication', () => {
  it('should return 401 when not authenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('should return 200 when authenticated', async () => {
    const response = await GET();
    expect(response.status).toBe(200);
  });
});

describe('GET /api/nexus/exposure - response structure', () => {
  it('should return exposures array and summary', async () => {
    const response = await GET();
    const body = await response.json();
    expect(body.exposures).toBeDefined();
    expect(Array.isArray(body.exposures)).toBe(true);
    expect(body.summary).toBeDefined();
  });

  it('should return correct exposure fields', async () => {
    const response = await GET();
    const body = await response.json();
    const exposure = body.exposures.find((e: { stateCode: string }) => e.stateCode === 'CA');
    expect(exposure).toBeDefined();
    expect(exposure).toHaveProperty('stateCode', 'CA');
    expect(exposure).toHaveProperty('stateName', 'California');
    expect(exposure).toHaveProperty('hasSalesTax', true);
    expect(exposure).toHaveProperty('currentSales');
    expect(exposure).toHaveProperty('currentTransactions');
    expect(exposure).toHaveProperty('salesThreshold', 100000);
    expect(exposure).toHaveProperty('transactionThreshold', 200);
    expect(exposure).toHaveProperty('salesPercentage');
    expect(exposure).toHaveProperty('transactionPercentage');
    expect(exposure).toHaveProperty('highestPercentage');
    expect(exposure).toHaveProperty('status');
    expect(exposure).toHaveProperty('measurementPeriod');
    expect(exposure).toHaveProperty('rolling12MonthSales', 75000);
    expect(exposure).toHaveProperty('rolling12MonthTransactions', 120);
    expect(exposure).toHaveProperty('calendarYearSales', 50000);
    expect(exposure).toHaveProperty('calendarYearTransactions', 80);
  });

  it('should include states with no sales tax', async () => {
    const response = await GET();
    const body = await response.json();
    const oregon = body.exposures.find((e: { stateCode: string }) => e.stateCode === 'OR');
    expect(oregon).toBeDefined();
    expect(oregon.hasSalesTax).toBe(false);
  });

  it('should return correct summary stats', async () => {
    const response = await GET();
    const body = await response.json();
    const { summary } = body;
    expect(summary).toHaveProperty('totalStatesWithSales');
    expect(summary).toHaveProperty('exceededCount');
    expect(summary).toHaveProperty('warningCount');
    expect(summary).toHaveProperty('approachingCount');
    expect(summary).toHaveProperty('safeCount');
    expect(summary).toHaveProperty('noSalesTaxCount');
  });
});

describe('GET /api/nexus/exposure - data correctness', () => {
  it('should use rolling12Month data for rolling_12_months period', async () => {
    const response = await GET();
    const body = await response.json();
    const ca = body.exposures.find((e: { stateCode: string }) => e.stateCode === 'CA');
    // CA uses rolling_12_months
    expect(ca.currentSales).toBe(75000);
    expect(ca.currentTransactions).toBe(120);
  });

  it('should use max of rolling/calendar for calendar_year period', async () => {
    // WA has calendar_year period
    // rolling12: 95000 sales, 180 txn | calendar: 95000 sales, 180 txn
    const response = await GET();
    const body = await response.json();
    const wa = body.exposures.find((e: { stateCode: string }) => e.stateCode === 'WA');
    expect(wa.currentSales).toBe(95000);
  });

  it('should return zero values for states with no sales data', async () => {
    // OR has no sales tax so early-returned; TX has data in the map
    // Let's check a state not in the map at all by using a fresh mock with empty map
    vi.mocked(getExposureTotals).mockResolvedValue(new Map());
    const response = await GET();
    const body = await response.json();
    const ca = body.exposures.find((e: { stateCode: string }) => e.stateCode === 'CA');
    expect(ca.currentSales).toBe(0);
    expect(ca.currentTransactions).toBe(0);
    expect(ca.status).toBe('safe');
  });

  it('should count states with sales correctly', async () => {
    const response = await GET();
    const body = await response.json();
    // CA, TX, WA have sales data in mock
    expect(body.summary.totalStatesWithSales).toBe(3);
  });

  it('should count no-sales-tax states correctly', async () => {
    const response = await GET();
    const body = await response.json();
    // Only OR in mock has no sales tax
    expect(body.summary.noSalesTaxCount).toBe(1);
  });
});

describe('GET /api/nexus/exposure - sorting', () => {
  it('should place no-sales-tax states at the end', async () => {
    const response = await GET();
    const body = await response.json();
    const lastFew = body.exposures.slice(-1);
    // OR is no-sales-tax so should be last
    expect(lastFew[0].hasSalesTax).toBe(false);
  });

  it('should sort exceeded states before warning states', async () => {
    // Set up WA as exceeded, CA as warning
    vi.mocked(calculateExposureStatus).mockImplementation((_sales, _txn, threshold) => {
      if (threshold.stateCode === 'WA') {
        return { salesPercentage: 100, transactionPercentage: 100, highestPercentage: 100, status: 'exceeded' as const };
      }
      if (threshold.stateCode === 'CA') {
        return { salesPercentage: 80, transactionPercentage: 60, highestPercentage: 80, status: 'warning' as const };
      }
      return { salesPercentage: 20, transactionPercentage: 10, highestPercentage: 20, status: 'safe' as const };
    });
    const response = await GET();
    const body = await response.json();
    const taxStates = body.exposures.filter((e: { hasSalesTax: boolean }) => e.hasSalesTax);
    const waIdx = taxStates.findIndex((e: { stateCode: string }) => e.stateCode === 'WA');
    const caIdx = taxStates.findIndex((e: { stateCode: string }) => e.stateCode === 'CA');
    expect(waIdx).toBeLessThan(caIdx);
  });

  it('should sort higher percentage before lower within same status', async () => {
    vi.mocked(calculateExposureStatus).mockImplementation((_sales, _txn, threshold) => {
      if (threshold.stateCode === 'CA') {
        return { salesPercentage: 75, transactionPercentage: 60, highestPercentage: 75, status: 'approaching' as const };
      }
      if (threshold.stateCode === 'TX') {
        return { salesPercentage: 20, transactionPercentage: 15, highestPercentage: 20, status: 'approaching' as const };
      }
      return { salesPercentage: 50, transactionPercentage: 50, highestPercentage: 50, status: 'approaching' as const };
    });
    const response = await GET();
    const body = await response.json();
    const taxStates = body.exposures.filter((e: { hasSalesTax: boolean }) => e.hasSalesTax);
    const caIdx = taxStates.findIndex((e: { stateCode: string }) => e.stateCode === 'CA');
    const txIdx = taxStates.findIndex((e: { stateCode: string }) => e.stateCode === 'TX');
    expect(caIdx).toBeLessThan(txIdx);
  });
});

describe('GET /api/nexus/exposure - summary counts', () => {
  it('should count exceeded, warning, approaching, safe states', async () => {
    vi.mocked(calculateExposureStatus).mockImplementation((_sales, _txn, threshold) => {
      if (threshold.stateCode === 'WA') {
        return { salesPercentage: 100, transactionPercentage: 100, highestPercentage: 100, status: 'exceeded' as const };
      }
      if (threshold.stateCode === 'CA') {
        return { salesPercentage: 80, transactionPercentage: 60, highestPercentage: 80, status: 'warning' as const };
      }
      return { salesPercentage: 20, transactionPercentage: 15, highestPercentage: 20, status: 'safe' as const };
    });
    const response = await GET();
    const body = await response.json();
    expect(body.summary.exceededCount).toBe(1);
    expect(body.summary.warningCount).toBe(1);
    expect(body.summary.safeCount).toBeGreaterThanOrEqual(1);
  });
});

describe('GET /api/nexus/exposure - error handling', () => {
  it('should return 500 on getExposureTotals error', async () => {
    vi.mocked(getExposureTotals).mockRejectedValue(new Error('DB error'));
    const response = await GET();
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Failed to fetch nexus exposure data');
  });
});
