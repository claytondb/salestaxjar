/**
 * Tests for /api/calculations/summary route
 *
 * Tests the calculation summary GET endpoint which returns
 * aggregated stats: thisMonth, lastMonth, yearToDate, byState
 * (top 10), monthOverMonthChange, and recentCalculations.
 * Uses mocks for database and authentication.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing route
vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    calculation: {
      aggregate: vi.fn(),
      groupBy: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { GET } from './route';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

// Helper to create a Decimal-like object (toNumber() method)
function dec(val: number) {
  return { toNumber: () => val };
}

const mockThisMonthStats = {
  _sum: { amount: dec(5000), taxAmount: dec(350) },
  _count: 15,
};

const mockLastMonthStats = {
  _sum: { amount: dec(3000), taxAmount: dec(200) },
  _count: 10,
};

const mockYearlyStats = {
  _sum: { amount: dec(20000), taxAmount: dec(1400) },
  _count: 65,
};

const mockByState = [
  {
    stateCode: 'CA',
    stateName: 'California',
    _sum: { amount: dec(8000), taxAmount: dec(720) },
    _count: 25,
  },
  {
    stateCode: 'TX',
    stateName: 'Texas',
    _sum: { amount: dec(6000), taxAmount: dec(480) },
    _count: 18,
  },
];

const mockRecentCalculations = [
  {
    id: 'calc-1',
    amount: dec(500),
    stateName: 'California',
    stateCode: 'CA',
    taxRate: dec(0.09),
    taxAmount: dec(45),
    createdAt: new Date('2026-03-12T10:00:00Z'),
  },
  {
    id: 'calc-2',
    amount: dec(200),
    stateName: 'Texas',
    stateCode: 'TX',
    taxRate: dec(0.08),
    taxAmount: dec(16),
    createdAt: new Date('2026-03-11T08:00:00Z'),
  },
];

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

  // Promise.all order: [monthlyStats, lastMonthStats, yearlyStats, byState, recentCalculations]
  vi.mocked(prisma.calculation.aggregate)
    .mockResolvedValueOnce(mockThisMonthStats)
    .mockResolvedValueOnce(mockLastMonthStats)
    .mockResolvedValueOnce(mockYearlyStats);
  vi.mocked(prisma.calculation.groupBy).mockResolvedValue(mockByState);
  vi.mocked(prisma.calculation.findMany).mockResolvedValue(mockRecentCalculations);
});

// =============================================================================
// GET Tests - Authentication
// =============================================================================

describe('GET /api/calculations/summary - authentication', () => {
  it('should return 401 when not authenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('should return 200 for authenticated user', async () => {
    const response = await GET();
    expect(response.status).toBe(200);
  });
});

// =============================================================================
// GET Tests - Response Structure
// =============================================================================

describe('GET /api/calculations/summary - response structure', () => {
  it('should return a summary object', async () => {
    const response = await GET();
    const body = await response.json();
    expect(body.summary).toBeDefined();
  });

  it('should include thisMonth in summary', async () => {
    const response = await GET();
    const { summary } = await response.json();
    expect(summary.thisMonth).toBeDefined();
  });

  it('should include lastMonth in summary', async () => {
    const response = await GET();
    const { summary } = await response.json();
    expect(summary.lastMonth).toBeDefined();
  });

  it('should include yearToDate in summary', async () => {
    const response = await GET();
    const { summary } = await response.json();
    expect(summary.yearToDate).toBeDefined();
  });

  it('should include byState array in summary', async () => {
    const response = await GET();
    const { summary } = await response.json();
    expect(Array.isArray(summary.byState)).toBe(true);
  });

  it('should include recentCalculations array in summary', async () => {
    const response = await GET();
    const { summary } = await response.json();
    expect(Array.isArray(summary.recentCalculations)).toBe(true);
  });

  it('should include monthOverMonthChange', async () => {
    const response = await GET();
    const { summary } = await response.json();
    expect(summary.monthOverMonthChange).toBeDefined();
  });
});

// =============================================================================
// GET Tests - Data Correctness
// =============================================================================

describe('GET /api/calculations/summary - data correctness', () => {
  it('should return correct thisMonth totals', async () => {
    const response = await GET();
    const { summary } = await response.json();
    expect(summary.thisMonth.totalSales).toBe(5000);
    expect(summary.thisMonth.totalTax).toBe(350);
    expect(summary.thisMonth.count).toBe(15);
  });

  it('should return correct lastMonth totals', async () => {
    const response = await GET();
    const { summary } = await response.json();
    expect(summary.lastMonth.totalSales).toBe(3000);
    expect(summary.lastMonth.totalTax).toBe(200);
    expect(summary.lastMonth.count).toBe(10);
  });

  it('should return correct yearToDate totals', async () => {
    const response = await GET();
    const { summary } = await response.json();
    expect(summary.yearToDate.totalSales).toBe(20000);
    expect(summary.yearToDate.totalTax).toBe(1400);
    expect(summary.yearToDate.count).toBe(65);
  });

  it('should calculate monthOverMonthChange correctly', async () => {
    // this month: 350, last month: 200 → (350-200)/200 * 100 = 75%
    const response = await GET();
    const { summary } = await response.json();
    expect(summary.monthOverMonthChange).toBe(75);
  });

  it('should return 0 monthOverMonthChange when last month is zero', async () => {
    vi.mocked(prisma.calculation.aggregate).mockReset();
    vi.mocked(prisma.calculation.aggregate)
      .mockResolvedValueOnce({ _sum: { amount: dec(1000), taxAmount: dec(100) }, _count: 5 })
      .mockResolvedValueOnce({ _sum: { amount: null, taxAmount: null }, _count: 0 })
      .mockResolvedValueOnce({ _sum: { amount: dec(1000), taxAmount: dec(100) }, _count: 5 });
    const response = await GET();
    const { summary } = await response.json();
    expect(summary.monthOverMonthChange).toBe(0);
  });

  it('should map byState fields correctly', async () => {
    const response = await GET();
    const { summary } = await response.json();
    const first = summary.byState[0];
    expect(first.stateCode).toBe('CA');
    expect(first.state).toBe('California');
    expect(first.totalSales).toBe(8000);
    expect(first.taxAmount).toBe(720);
    expect(first.count).toBe(25);
  });

  it('should return up to 10 states in byState', async () => {
    const response = await GET();
    const { summary } = await response.json();
    expect(summary.byState.length).toBeLessThanOrEqual(10);
  });

  it('should map recentCalculations fields correctly', async () => {
    const response = await GET();
    const { summary } = await response.json();
    const recent = summary.recentCalculations[0];
    expect(recent.id).toBe('calc-1');
    expect(recent.amount).toBe(500);
    expect(recent.state).toBe('California');
    expect(recent.stateCode).toBe('CA');
    expect(recent.rate).toBeCloseTo(9, 0); // taxRate * 100
    expect(recent.taxAmount).toBe(45);
    expect(recent.createdAt).toBeDefined();
  });

  it('should return up to 5 recent calculations', async () => {
    const response = await GET();
    const { summary } = await response.json();
    expect(summary.recentCalculations.length).toBeLessThanOrEqual(5);
  });
});

// =============================================================================
// GET Tests - Null Handling
// =============================================================================

describe('GET /api/calculations/summary - null handling', () => {
  it('should handle null sums gracefully (default to 0)', async () => {
    vi.mocked(prisma.calculation.aggregate).mockReset();
    vi.mocked(prisma.calculation.aggregate)
      .mockResolvedValueOnce({ _sum: { amount: null, taxAmount: null }, _count: 0 })
      .mockResolvedValueOnce({ _sum: { amount: null, taxAmount: null }, _count: 0 })
      .mockResolvedValueOnce({ _sum: { amount: null, taxAmount: null }, _count: 0 });
    const response = await GET();
    const { summary } = await response.json();
    expect(summary.thisMonth.totalSales).toBe(0);
    expect(summary.thisMonth.totalTax).toBe(0);
    expect(summary.lastMonth.totalSales).toBe(0);
    expect(summary.yearToDate.totalSales).toBe(0);
  });

  it('should handle empty byState results', async () => {
    vi.mocked(prisma.calculation.groupBy).mockResolvedValue([]);
    const response = await GET();
    const { summary } = await response.json();
    expect(summary.byState).toEqual([]);
  });

  it('should handle empty recentCalculations', async () => {
    vi.mocked(prisma.calculation.findMany).mockResolvedValue([]);
    const response = await GET();
    const { summary } = await response.json();
    expect(summary.recentCalculations).toEqual([]);
  });

  it('should handle null byState sum fields (default to 0)', async () => {
    vi.mocked(prisma.calculation.groupBy).mockResolvedValue([
      {
        stateCode: 'MT',
        stateName: 'Montana',
        _sum: { amount: null, taxAmount: null },
        _count: 1,
      },
    ]);
    const response = await GET();
    const { summary } = await response.json();
    expect(summary.byState[0].totalSales).toBe(0);
    expect(summary.byState[0].taxAmount).toBe(0);
  });
});

// =============================================================================
// GET Tests - Query Params
// =============================================================================

describe('GET /api/calculations/summary - database queries', () => {
  it('should query calculations with userId filter', async () => {
    await GET();
    expect(prisma.calculation.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: 'user-123' }) })
    );
  });

  it('should query groupBy for byState with userId filter', async () => {
    await GET();
    expect(prisma.calculation.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: 'user-123' }) })
    );
  });

  it('should query findMany for recentCalculations with userId filter', async () => {
    await GET();
    expect(prisma.calculation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-123' } })
    );
  });
});

// =============================================================================
// GET Tests - Error Handling
// =============================================================================

describe('GET /api/calculations/summary - error handling', () => {
  it('should return 500 on database error', async () => {
    vi.mocked(prisma.calculation.aggregate).mockReset();
    vi.mocked(prisma.calculation.aggregate).mockRejectedValue(new Error('DB error'));
    const response = await GET();
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toContain('Failed to fetch');
  });
});
