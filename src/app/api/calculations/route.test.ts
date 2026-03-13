/**
 * Tests for /api/calculations route
 *
 * Tests calculation history management: GET (list with filters), POST (single
 * and bulk save), DELETE (by ID or clearAll).
 * Uses mocks for database and authentication.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies before importing route
vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    calculation: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

import { GET, POST, DELETE } from './route';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// =============================================================================
// Helpers
// =============================================================================

function getRequest(params?: Record<string, string>): NextRequest {
  const url = new URL('http://localhost:3000/api/calculations');
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  return new NextRequest(url.toString(), {
    method: 'GET',
    headers: { host: 'localhost:3000' },
  });
}

function postRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/calculations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', host: 'localhost:3000' },
    body: JSON.stringify(body),
  });
}

function deleteRequest(params?: Record<string, string>): NextRequest {
  const url = new URL('http://localhost:3000/api/calculations');
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  return new NextRequest(url.toString(), {
    method: 'DELETE',
    headers: { host: 'localhost:3000' },
  });
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

const makeDecimal = (n: number) => ({ toNumber: () => n });

const mockCalculation = {
  id: 'calc-123',
  userId: 'user-123',
  amount: makeDecimal(100.0),
  stateCode: 'CA',
  stateName: 'California',
  category: 'general',
  taxRate: makeDecimal(0.0725),
  taxAmount: makeDecimal(7.25),
  total: makeDecimal(107.25),
  fromAddress: null,
  toAddress: null,
  source: 'manual',
  createdAt: new Date('2026-01-15T00:00:00Z'),
};

const mockCalculation2 = {
  id: 'calc-456',
  userId: 'user-123',
  amount: makeDecimal(250.0),
  stateCode: 'TX',
  stateName: 'Texas',
  category: 'clothing',
  taxRate: makeDecimal(0.0625),
  taxAmount: makeDecimal(15.63),
  total: makeDecimal(265.63),
  fromAddress: null,
  toAddress: null,
  source: 'api',
  createdAt: new Date('2026-01-20T00:00:00Z'),
};

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
  vi.mocked(prisma.calculation.findMany).mockResolvedValue([mockCalculation]);
  vi.mocked(prisma.calculation.count).mockResolvedValue(1);
  vi.mocked(prisma.calculation.create).mockResolvedValue(mockCalculation);
  vi.mocked(prisma.calculation.createMany).mockResolvedValue({ count: 1 });
  vi.mocked(prisma.calculation.findFirst).mockResolvedValue(mockCalculation);
  vi.mocked(prisma.calculation.delete).mockResolvedValue(mockCalculation);
  vi.mocked(prisma.calculation.deleteMany).mockResolvedValue({ count: 3 });
});

// =============================================================================
// GET Tests
// =============================================================================

describe('GET /api/calculations - authentication', () => {
  it('should return 401 when not authenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const response = await GET(getRequest());
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('should return calculations when authenticated', async () => {
    const response = await GET(getRequest());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.calculations).toBeDefined();
  });
});

describe('GET /api/calculations - response format', () => {
  it('should return calculations array with correct fields', async () => {
    const response = await GET(getRequest());
    const body = await response.json();
    const calc = body.calculations[0];
    expect(calc).toHaveProperty('id', 'calc-123');
    expect(calc).toHaveProperty('amount', 100.0);
    expect(calc).toHaveProperty('state', 'California');
    expect(calc).toHaveProperty('stateCode', 'CA');
    expect(calc).toHaveProperty('category', 'general');
    expect(calc).toHaveProperty('taxAmount', 7.25);
    expect(calc).toHaveProperty('total', 107.25);
    expect(calc).toHaveProperty('source', 'manual');
    expect(calc).toHaveProperty('createdAt');
  });

  it('should convert taxRate to percentage in response', async () => {
    const response = await GET(getRequest());
    const body = await response.json();
    // taxRate 0.0725 → rate 7.25
    expect(body.calculations[0].rate).toBeCloseTo(7.25, 2);
  });

  it('should return total count', async () => {
    vi.mocked(prisma.calculation.count).mockResolvedValue(42);
    const response = await GET(getRequest());
    const body = await response.json();
    expect(body.total).toBe(42);
  });

  it('should return limit and offset in response', async () => {
    const response = await GET(getRequest({ limit: '10', offset: '20' }));
    const body = await response.json();
    expect(body.limit).toBe(10);
    expect(body.offset).toBe(20);
  });

  it('should default limit to 50 and offset to 0', async () => {
    const response = await GET(getRequest());
    const body = await response.json();
    expect(body.limit).toBe(50);
    expect(body.offset).toBe(0);
  });
});

describe('GET /api/calculations - pagination', () => {
  it('should cap limit at 100', async () => {
    const response = await GET(getRequest({ limit: '500' }));
    const body = await response.json();
    expect(body.limit).toBe(100);
  });

  it('should pass take and skip to findMany', async () => {
    await GET(getRequest({ limit: '25', offset: '50' }));
    expect(prisma.calculation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 25, skip: 50 })
    );
  });
});

describe('GET /api/calculations - filters', () => {
  it('should filter by stateCode when provided', async () => {
    await GET(getRequest({ stateCode: 'CA' }));
    expect(prisma.calculation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ stateCode: 'CA', userId: 'user-123' }),
      })
    );
  });

  it('should filter by startDate when provided', async () => {
    await GET(getRequest({ startDate: '2026-01-01' }));
    expect(prisma.calculation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createdAt: expect.objectContaining({ gte: expect.any(Date) }),
        }),
      })
    );
  });

  it('should filter by endDate when provided', async () => {
    await GET(getRequest({ endDate: '2026-12-31' }));
    expect(prisma.calculation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createdAt: expect.objectContaining({ lte: expect.any(Date) }),
        }),
      })
    );
  });

  it('should apply both date filters together', async () => {
    await GET(getRequest({ startDate: '2026-01-01', endDate: '2026-12-31' }));
    expect(prisma.calculation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createdAt: expect.objectContaining({
            gte: expect.any(Date),
            lte: expect.any(Date),
          }),
        }),
      })
    );
  });

  it('should only return calculations for current user', async () => {
    await GET(getRequest());
    expect(prisma.calculation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'user-123' }),
      })
    );
  });

  it('should order by createdAt descending', async () => {
    await GET(getRequest());
    expect(prisma.calculation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: 'desc' },
      })
    );
  });
});

describe('GET /api/calculations - error handling', () => {
  it('should return 500 on database error', async () => {
    vi.mocked(prisma.calculation.findMany).mockRejectedValue(new Error('DB error'));
    const response = await GET(getRequest());
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Failed to fetch calculations');
  });
});

// =============================================================================
// POST Tests - Single Calculation
// =============================================================================

const validCalcPayload = {
  amount: 100.0,
  stateCode: 'CA',
  stateName: 'California',
  taxRate: 0.0725,
  taxAmount: 7.25,
  total: 107.25,
};

describe('POST /api/calculations - authentication', () => {
  it('should return 401 when not authenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const response = await POST(postRequest(validCalcPayload));
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });
});

describe('POST /api/calculations - single calculation validation', () => {
  it('should return 400 when amount is missing', async () => {
    const response = await POST(postRequest({ ...validCalcPayload, amount: undefined }));
    expect(response.status).toBe(400);
  });

  it('should return 400 when amount is zero', async () => {
    const response = await POST(postRequest({ ...validCalcPayload, amount: 0 }));
    expect(response.status).toBe(400);
  });

  it('should return 400 when amount is negative', async () => {
    const response = await POST(postRequest({ ...validCalcPayload, amount: -10 }));
    expect(response.status).toBe(400);
  });

  it('should return 400 when stateCode is not 2 characters', async () => {
    const response = await POST(postRequest({ ...validCalcPayload, stateCode: 'CAL' }));
    expect(response.status).toBe(400);
  });

  it('should return 400 when taxRate exceeds 1', async () => {
    const response = await POST(postRequest({ ...validCalcPayload, taxRate: 1.5 }));
    expect(response.status).toBe(400);
  });

  it('should return 400 when taxRate is negative', async () => {
    const response = await POST(postRequest({ ...validCalcPayload, taxRate: -0.1 }));
    expect(response.status).toBe(400);
  });

  it('should return 400 when taxAmount is negative', async () => {
    const response = await POST(postRequest({ ...validCalcPayload, taxAmount: -1 }));
    expect(response.status).toBe(400);
  });

  it('should accept valid calculation', async () => {
    const response = await POST(postRequest(validCalcPayload));
    expect(response.status).toBe(201);
  });

  it('should accept optional source field values', async () => {
    for (const source of ['manual', 'api', 'import']) {
      const response = await POST(postRequest({ ...validCalcPayload, source }));
      expect(response.status).toBe(201);
    }
  });

  it('should return 400 for invalid source', async () => {
    const response = await POST(postRequest({ ...validCalcPayload, source: 'webhook' }));
    expect(response.status).toBe(400);
  });
});

describe('POST /api/calculations - single calculation creation', () => {
  it('should save calculation with userId', async () => {
    await POST(postRequest(validCalcPayload));
    expect(prisma.calculation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 'user-123' }),
      })
    );
  });

  it('should return created calculation in response', async () => {
    const response = await POST(postRequest(validCalcPayload));
    const body = await response.json();
    expect(body.calculation).toBeDefined();
    expect(body.calculation.id).toBe('calc-123');
    expect(body.calculation.amount).toBe(100.0);
    expect(body.calculation.state).toBe('California');
  });

  it('should convert taxRate to percentage in response', async () => {
    const response = await POST(postRequest(validCalcPayload));
    const body = await response.json();
    expect(body.calculation.rate).toBeCloseTo(7.25, 2);
  });

  it('should default category to general', async () => {
    await POST(postRequest(validCalcPayload));
    expect(prisma.calculation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ category: 'general' }),
      })
    );
  });

  it('should default source to manual', async () => {
    await POST(postRequest(validCalcPayload));
    expect(prisma.calculation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ source: 'manual' }),
      })
    );
  });
});

// =============================================================================
// POST Tests - Bulk Calculations
// =============================================================================

describe('POST /api/calculations - bulk creation', () => {
  it('should detect bulk request via calculations array', async () => {
    const response = await POST(postRequest({
      calculations: [validCalcPayload, { ...validCalcPayload, stateCode: 'TX', stateName: 'Texas' }],
    }));
    expect(response.status).toBe(201);
    expect(prisma.calculation.createMany).toHaveBeenCalled();
    expect(prisma.calculation.create).not.toHaveBeenCalled();
  });

  it('should return count of created calculations', async () => {
    vi.mocked(prisma.calculation.createMany).mockResolvedValue({ count: 2 });
    const response = await POST(postRequest({
      calculations: [validCalcPayload, { ...validCalcPayload, stateCode: 'TX', stateName: 'Texas' }],
    }));
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.count).toBe(2);
  });

  it('should return 400 when bulk array contains invalid item', async () => {
    const response = await POST(postRequest({
      calculations: [{ ...validCalcPayload, amount: -5 }],
    }));
    expect(response.status).toBe(400);
  });

  it('should include userId for all bulk calculations', async () => {
    await POST(postRequest({ calculations: [validCalcPayload] }));
    expect(prisma.calculation.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ userId: 'user-123' }),
        ]),
      })
    );
  });

  it('should handle empty bulk array', async () => {
    vi.mocked(prisma.calculation.createMany).mockResolvedValue({ count: 0 });
    const response = await POST(postRequest({ calculations: [] }));
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.count).toBe(0);
  });
});

describe('POST /api/calculations - error handling', () => {
  it('should return 500 on database error for single', async () => {
    vi.mocked(prisma.calculation.create).mockRejectedValue(new Error('DB error'));
    const response = await POST(postRequest(validCalcPayload));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Failed to save calculation');
  });

  it('should return 500 on database error for bulk', async () => {
    vi.mocked(prisma.calculation.createMany).mockRejectedValue(new Error('DB error'));
    const response = await POST(postRequest({ calculations: [validCalcPayload] }));
    expect(response.status).toBe(500);
  });
});

// =============================================================================
// DELETE Tests
// =============================================================================

describe('DELETE /api/calculations - authentication', () => {
  it('should return 401 when not authenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const response = await DELETE(deleteRequest({ id: 'calc-123' }));
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });
});

describe('DELETE /api/calculations - by ID', () => {
  it('should delete calculation by ID', async () => {
    const response = await DELETE(deleteRequest({ id: 'calc-123' }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
  });

  it('should return 404 when calculation not found', async () => {
    vi.mocked(prisma.calculation.findFirst).mockResolvedValue(null);
    const response = await DELETE(deleteRequest({ id: 'calc-999' }));
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe('Calculation not found');
  });

  it('should verify ownership before deleting', async () => {
    await DELETE(deleteRequest({ id: 'calc-123' }));
    expect(prisma.calculation.findFirst).toHaveBeenCalledWith({
      where: { id: 'calc-123', userId: 'user-123' },
    });
  });

  it('should call delete with correct ID', async () => {
    await DELETE(deleteRequest({ id: 'calc-123' }));
    expect(prisma.calculation.delete).toHaveBeenCalledWith({
      where: { id: 'calc-123' },
    });
  });

  it('should return 400 when no ID provided and clearAll not set', async () => {
    const response = await DELETE(deleteRequest());
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Calculation ID required');
  });
});

describe('DELETE /api/calculations - clearAll', () => {
  it('should delete all calculations for user when clearAll=true', async () => {
    const response = await DELETE(deleteRequest({ clearAll: 'true' }));
    expect(response.status).toBe(200);
    expect(prisma.calculation.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-123' },
    });
  });

  it('should return deleted count when clearAll=true', async () => {
    vi.mocked(prisma.calculation.deleteMany).mockResolvedValue({ count: 5 });
    const response = await DELETE(deleteRequest({ clearAll: 'true' }));
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.deleted).toBe(5);
  });

  it('should not delete by ID when clearAll=true', async () => {
    await DELETE(deleteRequest({ clearAll: 'true', id: 'calc-123' }));
    expect(prisma.calculation.delete).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/calculations - error handling', () => {
  it('should return 500 on database error', async () => {
    vi.mocked(prisma.calculation.findFirst).mockResolvedValue(mockCalculation);
    vi.mocked(prisma.calculation.delete).mockRejectedValue(new Error('DB error'));
    const response = await DELETE(deleteRequest({ id: 'calc-123' }));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Failed to delete calculation');
  });

  it('should return 500 on deleteMany error', async () => {
    vi.mocked(prisma.calculation.deleteMany).mockRejectedValue(new Error('DB error'));
    const response = await DELETE(deleteRequest({ clearAll: 'true' }));
    expect(response.status).toBe(500);
  });
});
