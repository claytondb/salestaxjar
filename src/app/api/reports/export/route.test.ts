/**
 * Tests for /api/reports/export route
 *
 * Tests CSV export: GET returns summary (sales-by-state) or detailed
 * (orders) export as downloadable CSV file with correct headers and data.
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
      findMany: vi.fn(),
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
  const url = new URL('http://localhost:3000/api/reports/export');
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
];

const mockOrders = [
  {
    id: 'order-1',
    orderDate: new Date('2026-01-15T00:00:00Z'),
    orderNumber: 'ORD-001',
    platformOrderId: 'plat-001',
    platform: 'shopify',
    status: 'completed',
    shippingState: 'CA',
    shippingCity: 'Los Angeles',
    shippingZip: '90001',
    shippingCountry: 'US',
    subtotal: 100.00,
    shippingAmount: 10.00,
    taxAmount: 8.25,
    totalAmount: 118.25,
    customerEmail: 'customer@example.com',
  },
  {
    id: 'order-2',
    orderDate: new Date('2026-01-20T00:00:00Z'),
    orderNumber: null,
    platformOrderId: 'plat-002',
    platform: 'woocommerce',
    status: 'processing',
    shippingState: 'TX',
    shippingCity: 'Dallas',
    shippingZip: '75001',
    shippingCountry: 'US',
    subtotal: 50.00,
    shippingAmount: 5.00,
    taxAmount: 4.00,
    totalAmount: 59.00,
    customerEmail: null,
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
  vi.mocked(prisma.importedOrder.groupBy).mockResolvedValue(mockSalesByState as never);
  vi.mocked(prisma.importedOrder.findMany).mockResolvedValue(mockOrders as never);
  vi.mocked(prisma.business.findFirst).mockResolvedValue(mockBusiness as never);
});

// =============================================================================
// Authentication Tests
// =============================================================================

describe('GET /api/reports/export - authentication', () => {
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
// Response Headers Tests
// =============================================================================

describe('GET /api/reports/export - response headers', () => {
  it('should return CSV content type', async () => {
    const response = await GET(getRequest());
    expect(response.headers.get('Content-Type')).toBe('text/csv');
  });

  it('should return Content-Disposition for file download', async () => {
    const response = await GET(getRequest());
    const disposition = response.headers.get('Content-Disposition');
    expect(disposition).toContain('attachment');
    expect(disposition).toContain('filename=');
  });

  it('should include "sails" in summary export filename', async () => {
    const response = await GET(getRequest({ type: 'summary' }));
    const disposition = response.headers.get('Content-Disposition');
    expect(disposition).toContain('sails');
    expect(disposition).toContain('.csv');
  });

  it('should include "sails-orders" in detailed export filename', async () => {
    const response = await GET(getRequest({ type: 'detailed' }));
    const disposition = response.headers.get('Content-Disposition');
    expect(disposition).toContain('sails-orders');
  });

  it('should include state code in filename when state filter is applied', async () => {
    const response = await GET(getRequest({ type: 'detailed', state: 'CA' }));
    const disposition = response.headers.get('Content-Disposition');
    expect(disposition).toContain('CA');
  });
});

// =============================================================================
// Summary Export Tests
// =============================================================================

describe('GET /api/reports/export - summary export', () => {
  it('should default to summary export type', async () => {
    const response = await GET(getRequest());
    const text = await response.text();
    // Summary CSV has these specific headers
    expect(text).toContain('State Code');
    expect(text).toContain('State Name');
    expect(text).toContain('Has Nexus');
  });

  it('should include correct CSV headers for summary', async () => {
    const response = await GET(getRequest({ type: 'summary' }));
    const text = await response.text();
    const headerLine = text.split('\n')[0];
    expect(headerLine).toContain('State Code');
    expect(headerLine).toContain('State Name');
    expect(headerLine).toContain('Has Nexus');
    expect(headerLine).toContain('Orders');
    expect(headerLine).toContain('Subtotal');
    expect(headerLine).toContain('Shipping');
    expect(headerLine).toContain('Tax Collected');
    expect(headerLine).toContain('Total Sales');
  });

  it('should include state rows in summary', async () => {
    const response = await GET(getRequest({ type: 'summary' }));
    const text = await response.text();
    expect(text).toContain('CA');
    expect(text).toContain('California');
    expect(text).toContain('TX');
    expect(text).toContain('Texas');
  });

  it('should mark nexus states correctly in CSV', async () => {
    const response = await GET(getRequest({ type: 'summary' }));
    const text = await response.text();
    expect(text).toContain('Yes'); // CA has nexus
    expect(text).toContain('No');  // TX doesn't
  });

  it('should include TOTALS row at end of summary', async () => {
    const response = await GET(getRequest({ type: 'summary' }));
    const text = await response.text();
    expect(text).toContain('TOTALS');
  });

  it('should format currency to 2 decimal places', async () => {
    const response = await GET(getRequest({ type: 'summary' }));
    const text = await response.text();
    // Check for formatted numbers like 4000.00
    expect(text).toMatch(/\d+\.\d{2}/);
  });

  it('should sort summary by total sales descending', async () => {
    const response = await GET(getRequest({ type: 'summary' }));
    const text = await response.text();
    const lines = text.split('\n').filter(l => l && !l.startsWith('State Code') && !l.startsWith('TOTALS') && l.trim());
    // CA (4500 total) should come before TX (2800 total)
    const caIdx = lines.findIndex(l => l.startsWith('CA,'));
    const txIdx = lines.findIndex(l => l.startsWith('TX,'));
    expect(caIdx).toBeLessThan(txIdx);
  });
});

// =============================================================================
// Detailed Export Tests
// =============================================================================

describe('GET /api/reports/export - detailed export', () => {
  it('should include correct CSV headers for detailed export', async () => {
    const response = await GET(getRequest({ type: 'detailed' }));
    const text = await response.text();
    const headerLine = text.split('\n')[0];
    expect(headerLine).toContain('Order Date');
    expect(headerLine).toContain('Order Number');
    expect(headerLine).toContain('Platform');
    expect(headerLine).toContain('Status');
    expect(headerLine).toContain('State');
    expect(headerLine).toContain('City');
    expect(headerLine).toContain('ZIP');
    expect(headerLine).toContain('Subtotal');
    expect(headerLine).toContain('Shipping');
    expect(headerLine).toContain('Tax');
    expect(headerLine).toContain('Total');
    expect(headerLine).toContain('Customer Email');
  });

  it('should include order rows in detailed export', async () => {
    const response = await GET(getRequest({ type: 'detailed' }));
    const text = await response.text();
    expect(text).toContain('shopify');
    expect(text).toContain('woocommerce');
    expect(text).toContain('ORD-001');
  });

  it('should format order dates as YYYY-MM-DD', async () => {
    const response = await GET(getRequest({ type: 'detailed' }));
    const text = await response.text();
    expect(text).toContain('2026-01-15');
    expect(text).toContain('2026-01-20');
  });

  it('should use platformOrderId as fallback when orderNumber is null', async () => {
    const response = await GET(getRequest({ type: 'detailed' }));
    const text = await response.text();
    // order-2 has null orderNumber, should use platformOrderId 'plat-002'
    expect(text).toContain('plat-002');
  });

  it('should handle null customer email gracefully', async () => {
    const response = await GET(getRequest({ type: 'detailed' }));
    const text = await response.text();
    // Should not throw; null email becomes empty string
    const lines = text.split('\n').filter(l => l.trim());
    expect(lines.length).toBeGreaterThan(1);
  });

  it('should apply state filter to detailed export query', async () => {
    await GET(getRequest({ type: 'detailed', state: 'CA' }));
    expect(prisma.importedOrder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          shippingState: 'CA',
        }),
      })
    );
  });

  it('should not include state filter when not specified', async () => {
    await GET(getRequest({ type: 'detailed' }));
    const call = vi.mocked(prisma.importedOrder.findMany).mock.calls[0][0];
    // Should not have shippingState in where clause
    expect(call?.where).not.toHaveProperty('shippingState');
  });

  it('should limit detailed export to 10000 orders', async () => {
    await GET(getRequest({ type: 'detailed' }));
    expect(prisma.importedOrder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10000 })
    );
  });

  it('should order detailed export by date descending', async () => {
    await GET(getRequest({ type: 'detailed' }));
    expect(prisma.importedOrder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { orderDate: 'desc' },
      })
    );
  });
});

// =============================================================================
// CSV Escaping Tests
// =============================================================================

describe('GET /api/reports/export - CSV escaping', () => {
  it('should escape values containing commas with quotes', async () => {
    vi.mocked(prisma.importedOrder.findMany).mockResolvedValue([
      {
        ...mockOrders[0],
        shippingCity: 'Springfield, IL',
      },
    ] as never);
    const response = await GET(getRequest({ type: 'detailed' }));
    const text = await response.text();
    expect(text).toContain('"Springfield, IL"');
  });

  it('should escape values containing double quotes', async () => {
    vi.mocked(prisma.importedOrder.findMany).mockResolvedValue([
      {
        ...mockOrders[0],
        shippingCity: 'O\'Brien "downtown"',
      },
    ] as never);
    const response = await GET(getRequest({ type: 'detailed' }));
    const text = await response.text();
    // Quotes should be doubled inside CSV quoted field
    expect(text).toContain('""downtown""');
  });
});

// =============================================================================
// Date Range Tests
// =============================================================================

describe('GET /api/reports/export - date ranges', () => {
  it('should use rolling12 by default', async () => {
    const response = await GET(getRequest());
    const disposition = response.headers.get('Content-Disposition');
    expect(disposition).toContain('.csv');
  });

  it('should handle calendarYear range', async () => {
    const response = await GET(getRequest({ range: 'calendarYear' }));
    expect(response.status).toBe(200);
  });

  it('should handle custom date range', async () => {
    const response = await GET(getRequest({
      type: 'summary',
      range: 'custom',
      startDate: '2026-01-01',
      endDate: '2026-03-01',
    }));
    expect(response.status).toBe(200);
    const disposition = response.headers.get('Content-Disposition');
    expect(disposition).toContain('2026-01-01');
    expect(disposition).toContain('2026-03-01');
  });

  it('should fall back to rolling12 for invalid custom range', async () => {
    const response = await GET(getRequest({ range: 'custom' }));
    expect(response.status).toBe(200);
  });
});

// =============================================================================
// Empty Data Tests
// =============================================================================

describe('GET /api/reports/export - empty data', () => {
  it('should return valid CSV with only headers when no summary data', async () => {
    vi.mocked(prisma.importedOrder.groupBy).mockResolvedValue([] as never);
    const response = await GET(getRequest({ type: 'summary' }));
    const text = await response.text();
    expect(text).toContain('State Code');
    expect(text).toContain('TOTALS');
  });

  it('should return valid CSV with only headers when no order data', async () => {
    vi.mocked(prisma.importedOrder.findMany).mockResolvedValue([] as never);
    const response = await GET(getRequest({ type: 'detailed' }));
    const text = await response.text();
    expect(text).toContain('Order Date');
    // Only the header line + empty body
    const dataLines = text.split('\n').filter(l => l.trim() && !l.includes('Order Date'));
    expect(dataLines.length).toBe(0);
  });
});

// =============================================================================
// Error Handling Tests
// =============================================================================

describe('GET /api/reports/export - error handling', () => {
  it('should return 500 on database error during summary export', async () => {
    vi.mocked(prisma.importedOrder.groupBy).mockRejectedValue(new Error('DB error'));
    const response = await GET(getRequest({ type: 'summary' }));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Failed to export data');
  });

  it('should return 500 on database error during detailed export', async () => {
    vi.mocked(prisma.importedOrder.findMany).mockRejectedValue(new Error('DB error'));
    const response = await GET(getRequest({ type: 'detailed' }));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Failed to export data');
  });
});
