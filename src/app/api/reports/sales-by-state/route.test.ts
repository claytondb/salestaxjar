/**
 * Tests for /api/reports/sales-by-state route
 *
 * Tests sales-by-state report: GET returns aggregated sales data by state,
 * filtered by date range, with nexus status and platform breakdown.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies before importing route
vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    importedOrder: {
      groupBy: vi.fn(),
    },
    business: {
      findFirst: vi.fn(),
    },
  },
}));

import { GET } from './route';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// =============================================================================
// Helpers
// =============================================================================

function getRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:3000/api/reports/sales-by-state');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url.toString());
}

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

const mockSalesByState = [
  {
    shippingState: 'CA',
    _count: 50,
    _sum: { subtotal: 4000.00, taxAmount: 350.00, totalAmount: 4500.00, shippingAmount: 150.00 },
  },
  {
    shippingState: 'TX',
    _count: 30,
    _sum: { subtotal: 2500.00, taxAmount: 200.00, totalAmount: 2800.00, shippingAmount: 100.00 },
  },
  {
    shippingState: 'NY',
    _count: 20,
    _sum: { subtotal: 1500.00, taxAmount: 150.00, totalAmount: 1700.00, shippingAmount: 50.00 },
  },
];

const mockPlatformBreakdown = [
  {
    shippingState: 'CA',
    platform: 'shopify',
    _count: 40,
    _sum: { totalAmount: 3600.00 },
  },
  {
    shippingState: 'CA',
    platform: 'woocommerce',
    _count: 10,
    _sum: { totalAmount: 900.00 },
  },
  {
    shippingState: 'TX',
    platform: 'shopify',
    _count: 30,
    _sum: { totalAmount: 2800.00 },
  },
];

const mockBusiness = {
  id: 'biz-123',
  userId: 'user-123',
  nexusStates: [
    { stateCode: 'CA', hasNexus: true },
    { stateCode: 'TX', hasNexus: false },
  ],
};

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
  vi.mocked(prisma.importedOrder.groupBy)
    .mockResolvedValueOnce(mockSalesByState as never)
    .mockResolvedValueOnce(mockPlatformBreakdown as never);
  vi.mocked(prisma.business.findFirst).mockResolvedValue(mockBusiness as never);
});

// =============================================================================
// GET Tests - Authentication
// =============================================================================

describe('GET /api/reports/sales-by-state - authentication', () => {
  it('should return 401 when not authenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const response = await GET(getRequest());
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('should return 200 when authenticated', async () => {
    const response = await GET(getRequest());
    expect(response.status).toBe(200);
  });
});

// =============================================================================
// GET Tests - Response Structure
// =============================================================================

describe('GET /api/reports/sales-by-state - response structure', () => {
  it('should return range, states, totals, and counts', async () => {
    const response = await GET(getRequest());
    const body = await response.json();
    expect(body).toHaveProperty('range');
    expect(body).toHaveProperty('states');
    expect(body).toHaveProperty('totals');
    expect(body).toHaveProperty('statesWithNexus');
    expect(body).toHaveProperty('statesWithSales');
  });

  it('should return correct range info', async () => {
    const response = await GET(getRequest());
    const body = await response.json();
    expect(body.range.type).toBe('rolling12');
    expect(body.range.startDate).toBeDefined();
    expect(body.range.endDate).toBeDefined();
  });

  it('should return state records with correct fields', async () => {
    const response = await GET(getRequest());
    const body = await response.json();
    const ca = body.states.find((s: { stateCode: string }) => s.stateCode === 'CA');
    expect(ca).toBeDefined();
    expect(ca).toHaveProperty('stateCode', 'CA');
    expect(ca).toHaveProperty('stateName', 'California');
    expect(ca).toHaveProperty('hasNexus');
    expect(ca).toHaveProperty('orderCount', 50);
    expect(ca).toHaveProperty('subtotal', 4000);
    expect(ca).toHaveProperty('shipping', 150);
    expect(ca).toHaveProperty('taxCollected', 350);
    expect(ca).toHaveProperty('totalSales', 4500);
    expect(ca).toHaveProperty('platforms');
  });

  it('should include platform breakdown per state', async () => {
    const response = await GET(getRequest());
    const body = await response.json();
    const ca = body.states.find((s: { stateCode: string }) => s.stateCode === 'CA');
    expect(ca.platforms).toHaveLength(2);
    expect(ca.platforms[0]).toHaveProperty('platform');
    expect(ca.platforms[0]).toHaveProperty('orders');
    expect(ca.platforms[0]).toHaveProperty('sales');
  });

  it('should include empty platforms array for states with no platform data', async () => {
    const response = await GET(getRequest());
    const body = await response.json();
    // NY has no platform breakdown in mock
    const ny = body.states.find((s: { stateCode: string }) => s.stateCode === 'NY');
    expect(ny.platforms).toEqual([]);
  });
});

// =============================================================================
// GET Tests - Nexus Status
// =============================================================================

describe('GET /api/reports/sales-by-state - nexus status', () => {
  it('should mark states with nexus as hasNexus=true', async () => {
    const response = await GET(getRequest());
    const body = await response.json();
    const ca = body.states.find((s: { stateCode: string }) => s.stateCode === 'CA');
    expect(ca.hasNexus).toBe(true);
  });

  it('should mark states without nexus as hasNexus=false', async () => {
    const response = await GET(getRequest());
    const body = await response.json();
    const tx = body.states.find((s: { stateCode: string }) => s.stateCode === 'TX');
    expect(tx.hasNexus).toBe(false);
  });

  it('should count states with nexus correctly', async () => {
    const response = await GET(getRequest());
    const body = await response.json();
    expect(body.statesWithNexus).toBe(1); // only CA has hasNexus=true
  });

  it('should return statesWithSales count', async () => {
    const response = await GET(getRequest());
    const body = await response.json();
    expect(body.statesWithSales).toBe(3);
  });

  it('should handle no business (no nexus states)', async () => {
    vi.mocked(prisma.business.findFirst).mockResolvedValue(null);
    const response = await GET(getRequest());
    const body = await response.json();
    const ca = body.states.find((s: { stateCode: string }) => s.stateCode === 'CA');
    expect(ca.hasNexus).toBe(false);
    expect(body.statesWithNexus).toBe(0);
  });
});

// =============================================================================
// GET Tests - Totals
// =============================================================================

describe('GET /api/reports/sales-by-state - totals calculation', () => {
  it('should calculate correct total order count', async () => {
    const response = await GET(getRequest());
    const body = await response.json();
    expect(body.totals.orderCount).toBe(100); // 50 + 30 + 20
  });

  it('should calculate correct total sales', async () => {
    const response = await GET(getRequest());
    const body = await response.json();
    expect(body.totals.totalSales).toBeCloseTo(9000); // 4500 + 2800 + 1700
  });

  it('should calculate correct total tax collected', async () => {
    const response = await GET(getRequest());
    const body = await response.json();
    expect(body.totals.taxCollected).toBeCloseTo(700); // 350 + 200 + 150
  });

  it('should calculate correct total subtotal', async () => {
    const response = await GET(getRequest());
    const body = await response.json();
    expect(body.totals.subtotal).toBeCloseTo(8000); // 4000 + 2500 + 1500
  });

  it('should calculate correct total shipping', async () => {
    const response = await GET(getRequest());
    const body = await response.json();
    expect(body.totals.shipping).toBeCloseTo(300); // 150 + 100 + 50
  });
});

// =============================================================================
// GET Tests - Sorting
// =============================================================================

describe('GET /api/reports/sales-by-state - sorting', () => {
  it('should sort states by total sales descending', async () => {
    const response = await GET(getRequest());
    const body = await response.json();
    const sales = body.states.map((s: { totalSales: number }) => s.totalSales);
    for (let i = 0; i < sales.length - 1; i++) {
      expect(sales[i]).toBeGreaterThanOrEqual(sales[i + 1]);
    }
  });

  it('should list California first (highest sales)', async () => {
    const response = await GET(getRequest());
    const body = await response.json();
    expect(body.states[0].stateCode).toBe('CA');
  });
});

// =============================================================================
// GET Tests - Date Ranges
// =============================================================================

describe('GET /api/reports/sales-by-state - date ranges', () => {
  it('should use rolling12 range by default', async () => {
    const response = await GET(getRequest());
    const body = await response.json();
    expect(body.range.type).toBe('rolling12');
  });

  it('should use calendarYear range when requested', async () => {
    const response = await GET(getRequest({ range: 'calendarYear' }));
    const body = await response.json();
    expect(body.range.type).toBe('calendarYear');
    // Start date should be Jan 1 of current year
    const startDate = new Date(body.range.startDate);
    expect(startDate.getMonth()).toBe(0); // January
    expect(startDate.getDate()).toBe(1);
  });

  it('should use custom range when provided', async () => {
    const response = await GET(getRequest({
      range: 'custom',
      startDate: '2026-01-01',
      endDate: '2026-03-01',
    }));
    const body = await response.json();
    expect(body.range.type).toBe('custom');
    expect(body.range.startDate).toContain('2026-01-01');
    expect(body.range.endDate).toContain('2026-03-01');
  });

  it('should fall back to rolling12 for custom range without dates', async () => {
    const response = await GET(getRequest({ range: 'custom' }));
    const body = await response.json();
    // Falls back to rolling12
    expect(body.range.startDate).toBeDefined();
    expect(body.range.endDate).toBeDefined();
  });
});

// =============================================================================
// GET Tests - State Name Resolution
// =============================================================================

describe('GET /api/reports/sales-by-state - state name resolution', () => {
  it('should resolve known state codes to full names', async () => {
    const response = await GET(getRequest());
    const body = await response.json();
    const ca = body.states.find((s: { stateCode: string }) => s.stateCode === 'CA');
    expect(ca.stateName).toBe('California');
    const tx = body.states.find((s: { stateCode: string }) => s.stateCode === 'TX');
    expect(tx.stateName).toBe('Texas');
    const ny = body.states.find((s: { stateCode: string }) => s.stateCode === 'NY');
    expect(ny.stateName).toBe('New York');
  });

  it('should fall back to state code for unknown state codes', async () => {
    vi.mocked(prisma.importedOrder.groupBy).mockReset();
    vi.mocked(prisma.importedOrder.groupBy)
      .mockResolvedValueOnce([{
        shippingState: 'XX',
        _count: 5,
        _sum: { subtotal: 100, taxAmount: 10, totalAmount: 110, shippingAmount: 5 },
      }] as never)
      .mockResolvedValueOnce([] as never);
    const response = await GET(getRequest());
    const body = await response.json();
    const xx = body.states.find((s: { stateCode: string }) => s.stateCode === 'XX');
    expect(xx.stateName).toBe('XX');
  });
});

// =============================================================================
// GET Tests - Empty Data
// =============================================================================

describe('GET /api/reports/sales-by-state - empty data', () => {
  it('should return empty states array when no orders', async () => {
    vi.mocked(prisma.importedOrder.groupBy).mockReset();
    vi.mocked(prisma.importedOrder.groupBy)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([] as never);
    const response = await GET(getRequest());
    const body = await response.json();
    expect(body.states).toEqual([]);
    expect(body.statesWithSales).toBe(0);
  });

  it('should return zero totals when no orders', async () => {
    vi.mocked(prisma.importedOrder.groupBy).mockReset();
    vi.mocked(prisma.importedOrder.groupBy)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([] as never);
    const response = await GET(getRequest());
    const body = await response.json();
    expect(body.totals.orderCount).toBe(0);
    expect(body.totals.totalSales).toBe(0);
    expect(body.totals.taxCollected).toBe(0);
  });

  it('should filter out null shippingState rows', async () => {
    vi.mocked(prisma.importedOrder.groupBy).mockReset();
    vi.mocked(prisma.importedOrder.groupBy)
      .mockResolvedValueOnce([
        { shippingState: null, _count: 5, _sum: { subtotal: 100, taxAmount: 10, totalAmount: 110, shippingAmount: 5 } },
        { shippingState: 'CA', _count: 10, _sum: { subtotal: 500, taxAmount: 50, totalAmount: 550, shippingAmount: 25 } },
      ] as never)
      .mockResolvedValueOnce([] as never);
    const response = await GET(getRequest());
    const body = await response.json();
    // Null states should be filtered out
    expect(body.states.every((s: { stateCode: string }) => s.stateCode !== null)).toBe(true);
  });
});

// =============================================================================
// GET Tests - Error Handling
// =============================================================================

describe('GET /api/reports/sales-by-state - error handling', () => {
  it('should return 500 on database error', async () => {
    vi.mocked(prisma.importedOrder.groupBy).mockReset();
    vi.mocked(prisma.importedOrder.groupBy).mockRejectedValue(new Error('DB error'));
    const response = await GET(getRequest());
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Failed to generate report');
  });
});
