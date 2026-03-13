/**
 * Tests for /api/filings route
 *
 * Tests filing management: GET (list with filters), POST (create),
 * PUT (update/mark as filed). Covers auth, validation, ownership,
 * query filtering (status, upcoming, year), and error handling.
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
    business: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    filing: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { GET, POST, PUT } from './route';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// =============================================================================
// Helpers
// =============================================================================

function getRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:3000/api/filings');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString(), {
    method: 'GET',
    headers: { host: 'localhost:3000' },
  });
}

function postRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/filings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', host: 'localhost:3000' },
    body: JSON.stringify(body),
  });
}

function putRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/filings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', host: 'localhost:3000' },
    body: JSON.stringify(body),
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

const mockBusiness = {
  id: 'biz-123',
  userId: 'user-123',
  name: 'Test Shop',
  address: null,
  city: null,
  state: 'IL',
  zip: null,
  businessType: 'ecommerce',
  ein: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

function dec(val: number | null) {
  if (val === null) return null;
  return { toNumber: () => val };
}

const mockFiling1 = {
  id: 'filing-1',
  businessId: 'biz-123',
  stateCode: 'IL',
  stateName: 'Illinois',
  period: 'quarterly',
  periodStart: new Date('2026-01-01T00:00:00Z'),
  periodEnd: new Date('2026-03-31T00:00:00Z'),
  dueDate: new Date('2026-04-20T00:00:00Z'),
  status: 'pending',
  estimatedTax: dec(500),
  actualTax: null,
  filedAt: null,
  confirmationNumber: null,
  notes: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

const mockFiling2 = {
  id: 'filing-2',
  businessId: 'biz-123',
  stateCode: 'CA',
  stateName: 'California',
  period: 'quarterly',
  periodStart: new Date('2026-01-01T00:00:00Z'),
  periodEnd: new Date('2026-03-31T00:00:00Z'),
  dueDate: new Date('2026-04-20T00:00:00Z'),
  status: 'filed',
  estimatedTax: dec(900),
  actualTax: dec(915),
  filedAt: new Date('2026-04-15T00:00:00Z'),
  confirmationNumber: 'CONF-ABC123',
  notes: 'Filed on time',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-04-15T00:00:00Z'),
};

const validFilingBody = {
  stateCode: 'IL',
  period: 'quarterly',
  periodStart: '2026-01-01T00:00:00Z',
  periodEnd: '2026-03-31T00:00:00Z',
  dueDate: '2026-04-20T00:00:00Z',
  status: 'pending',
  estimatedTax: 500,
};

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
  vi.mocked(prisma.business.findFirst).mockResolvedValue(mockBusiness);
  vi.mocked(prisma.business.create).mockResolvedValue(mockBusiness);
  vi.mocked(prisma.filing.findMany).mockResolvedValue([mockFiling1, mockFiling2]);
  vi.mocked(prisma.filing.findFirst).mockResolvedValue(mockFiling1);
  vi.mocked(prisma.filing.create).mockResolvedValue(mockFiling1);
  vi.mocked(prisma.filing.update).mockResolvedValue({ ...mockFiling2 });
});

// =============================================================================
// GET Tests - Authentication
// =============================================================================

describe('GET /api/filings - authentication', () => {
  it('should return 401 when not authenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const response = await GET(getRequest());
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('should return 200 for authenticated user', async () => {
    const response = await GET(getRequest());
    expect(response.status).toBe(200);
  });
});

// =============================================================================
// GET Tests - No Business
// =============================================================================

describe('GET /api/filings - no business', () => {
  it('should return empty filings when user has no business', async () => {
    vi.mocked(prisma.business.findFirst).mockResolvedValue(null);
    const response = await GET(getRequest());
    const body = await response.json();
    expect(body.filings).toEqual([]);
    expect(body.businessId).toBeNull();
  });
});

// =============================================================================
// GET Tests - Response Format
// =============================================================================

describe('GET /api/filings - response format', () => {
  it('should return filings array', async () => {
    const response = await GET(getRequest());
    const body = await response.json();
    expect(Array.isArray(body.filings)).toBe(true);
  });

  it('should return both filings', async () => {
    const response = await GET(getRequest());
    const body = await response.json();
    expect(body.filings).toHaveLength(2);
  });

  it('should include businessId in response', async () => {
    const response = await GET(getRequest());
    const body = await response.json();
    expect(body.businessId).toBe('biz-123');
  });

  it('should map filing fields correctly', async () => {
    vi.mocked(prisma.filing.findMany).mockResolvedValue([mockFiling1]);
    const response = await GET(getRequest());
    const { filings } = await response.json();
    const f = filings[0];
    expect(f.id).toBe('filing-1');
    expect(f.state).toBe('Illinois');
    expect(f.stateCode).toBe('IL');
    expect(f.period).toBe('quarterly');
    expect(f.status).toBe('pending');
    expect(f.estimatedTax).toBe(500);
    expect(f.actualTax).toBeNull();
    expect(f.filedAt).toBeNull();
    expect(f.confirmationNumber).toBeNull();
    expect(f.periodStart).toBeDefined();
    expect(f.periodEnd).toBeDefined();
    expect(f.dueDate).toBeDefined();
  });

  it('should include actualTax and confirmationNumber for filed filings', async () => {
    vi.mocked(prisma.filing.findMany).mockResolvedValue([mockFiling2]);
    const response = await GET(getRequest());
    const { filings } = await response.json();
    const f = filings[0];
    expect(f.actualTax).toBe(915);
    expect(f.confirmationNumber).toBe('CONF-ABC123');
    expect(f.filedAt).toBeDefined();
  });
});

// =============================================================================
// GET Tests - Filtering
// =============================================================================

describe('GET /api/filings - filtering', () => {
  it('should pass status filter to database query', async () => {
    await GET(getRequest({ status: 'pending' }));
    expect(prisma.filing.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'pending' }),
      })
    );
  });

  it('should pass upcoming filter as dueDate range', async () => {
    await GET(getRequest({ upcoming: '30' }));
    expect(prisma.filing.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          dueDate: expect.objectContaining({ gte: expect.any(Date), lte: expect.any(Date) }),
        }),
      })
    );
  });

  it('should pass year filter as periodStart range', async () => {
    await GET(getRequest({ year: '2026' }));
    expect(prisma.filing.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          periodStart: expect.objectContaining({ gte: expect.any(Date), lt: expect.any(Date) }),
        }),
      })
    );
  });

  it('should not include status filter when not provided', async () => {
    await GET(getRequest());
    const call = vi.mocked(prisma.filing.findMany).mock.calls[0][0];
    expect((call as { where?: { status?: unknown } }).where?.status).toBeUndefined();
  });
});

// =============================================================================
// GET Tests - Error Handling
// =============================================================================

describe('GET /api/filings - error handling', () => {
  it('should return 500 on database error', async () => {
    vi.mocked(prisma.filing.findMany).mockRejectedValue(new Error('DB error'));
    const response = await GET(getRequest());
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toContain('Failed to fetch');
  });
});

// =============================================================================
// POST Tests - Authentication
// =============================================================================

describe('POST /api/filings - authentication', () => {
  it('should return 401 when not authenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const response = await POST(postRequest(validFilingBody));
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });
});

// =============================================================================
// POST Tests - Validation
// =============================================================================

describe('POST /api/filings - validation', () => {
  it('should return 400 when stateCode is missing', async () => {
    const { stateCode: _, ...body } = validFilingBody;
    const response = await POST(postRequest(body));
    expect(response.status).toBe(400);
  });

  it('should return 400 when stateCode is not 2 characters', async () => {
    const response = await POST(postRequest({ ...validFilingBody, stateCode: 'ILL' }));
    expect(response.status).toBe(400);
  });

  it('should return 400 when period is invalid', async () => {
    const response = await POST(postRequest({ ...validFilingBody, period: 'weekly' }));
    expect(response.status).toBe(400);
  });

  it('should accept monthly period', async () => {
    const response = await POST(postRequest({ ...validFilingBody, period: 'monthly' }));
    expect(response.status).toBe(201);
  });

  it('should accept quarterly period', async () => {
    const response = await POST(postRequest({ ...validFilingBody, period: 'quarterly' }));
    expect(response.status).toBe(201);
  });

  it('should accept annual period', async () => {
    const response = await POST(postRequest({ ...validFilingBody, period: 'annual' }));
    expect(response.status).toBe(201);
  });

  it('should return 400 when periodStart is not a valid datetime', async () => {
    const response = await POST(postRequest({ ...validFilingBody, periodStart: 'not-a-date' }));
    expect(response.status).toBe(400);
  });

  it('should return 400 when dueDate is missing', async () => {
    const { dueDate: _, ...body } = validFilingBody;
    const response = await POST(postRequest(body));
    expect(response.status).toBe(400);
  });

  it('should return 400 when status is invalid', async () => {
    const response = await POST(postRequest({ ...validFilingBody, status: 'completed' }));
    expect(response.status).toBe(400);
  });

  it('should accept valid status values', async () => {
    for (const status of ['pending', 'filed', 'overdue', 'extension']) {
      vi.mocked(prisma.filing.create).mockResolvedValue({ ...mockFiling1, status });
      const response = await POST(postRequest({ ...validFilingBody, status }));
      expect(response.status).toBe(201);
    }
  });
});

// =============================================================================
// POST Tests - Creation
// =============================================================================

describe('POST /api/filings - creation', () => {
  it('should return 201 on success', async () => {
    const response = await POST(postRequest(validFilingBody));
    expect(response.status).toBe(201);
  });

  it('should return filing in response', async () => {
    const response = await POST(postRequest(validFilingBody));
    const body = await response.json();
    expect(body.filing).toBeDefined();
    expect(body.filing.id).toBe('filing-1');
  });

  it('should auto-create business when user has none', async () => {
    vi.mocked(prisma.business.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.business.create).mockResolvedValue(mockBusiness);
    vi.mocked(prisma.filing.create).mockResolvedValue(mockFiling1);
    const response = await POST(postRequest(validFilingBody));
    expect(response.status).toBe(201);
    expect(prisma.business.create).toHaveBeenCalled();
  });

  it('should resolve stateName from stateCode', async () => {
    await POST(postRequest({ ...validFilingBody, stateCode: 'CA' }));
    expect(prisma.filing.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ stateName: 'California' }),
      })
    );
  });

  it('should fall back to stateCode for unknown states', async () => {
    await POST(postRequest({ ...validFilingBody, stateCode: 'XX' }));
    expect(prisma.filing.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ stateName: 'XX' }),
      })
    );
  });

  it('should link filing to the user business', async () => {
    await POST(postRequest(validFilingBody));
    expect(prisma.filing.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ businessId: 'biz-123' }),
      })
    );
  });

  it('should map returned filing state and stateCode correctly', async () => {
    vi.mocked(prisma.filing.create).mockResolvedValue({
      ...mockFiling1,
      stateCode: 'IL',
      stateName: 'Illinois',
    });
    const response = await POST(postRequest(validFilingBody));
    const { filing } = await response.json();
    expect(filing.state).toBe('Illinois');
    expect(filing.stateCode).toBe('IL');
  });
});

// =============================================================================
// POST Tests - Error Handling
// =============================================================================

describe('POST /api/filings - error handling', () => {
  it('should return 500 on filing.create error', async () => {
    vi.mocked(prisma.filing.create).mockRejectedValue(new Error('DB error'));
    const response = await POST(postRequest(validFilingBody));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toContain('Failed to create');
  });
});

// =============================================================================
// PUT Tests - Authentication
// =============================================================================

describe('PUT /api/filings - authentication', () => {
  it('should return 401 when not authenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const response = await PUT(putRequest({ id: 'filing-1', status: 'filed' }));
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });
});

// =============================================================================
// PUT Tests - Validation
// =============================================================================

describe('PUT /api/filings - validation', () => {
  it('should return 400 when id is missing', async () => {
    const response = await PUT(putRequest({ status: 'filed' }));
    expect(response.status).toBe(400);
  });

  it('should return 400 when status is invalid', async () => {
    const response = await PUT(putRequest({ id: 'filing-1', status: 'cancelled' }));
    expect(response.status).toBe(400);
  });

  it('should return 404 when user has no business', async () => {
    vi.mocked(prisma.business.findFirst).mockResolvedValue(null);
    const response = await PUT(putRequest({ id: 'filing-1', status: 'filed' }));
    expect(response.status).toBe(404);
  });

  it('should return 404 when filing not found', async () => {
    vi.mocked(prisma.filing.findFirst).mockResolvedValue(null);
    const response = await PUT(putRequest({ id: 'filing-999', status: 'filed' }));
    expect(response.status).toBe(404);
  });

  it('should return 400 when confirmationNumber exceeds 100 characters', async () => {
    const response = await PUT(putRequest({ id: 'filing-1', confirmationNumber: 'a'.repeat(101) }));
    expect(response.status).toBe(400);
  });

  it('should return 400 when notes exceed 1000 characters', async () => {
    const response = await PUT(putRequest({ id: 'filing-1', notes: 'a'.repeat(1001) }));
    expect(response.status).toBe(400);
  });
});

// =============================================================================
// PUT Tests - Update
// =============================================================================

describe('PUT /api/filings - update', () => {
  it('should return 200 on success', async () => {
    const response = await PUT(putRequest({ id: 'filing-1', status: 'filed' }));
    expect(response.status).toBe(200);
  });

  it('should return updated filing in response', async () => {
    const response = await PUT(putRequest({ id: 'filing-1', status: 'filed' }));
    const body = await response.json();
    expect(body.filing).toBeDefined();
    expect(body.filing.id).toBeDefined();
  });

  it('should verify filing ownership before update', async () => {
    await PUT(putRequest({ id: 'filing-1', status: 'filed' }));
    expect(prisma.filing.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'filing-1', businessId: 'biz-123' } })
    );
  });

  it('should auto-set filedAt when marking as filed without explicit filedAt', async () => {
    await PUT(putRequest({ id: 'filing-1', status: 'filed' }));
    expect(prisma.filing.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ filedAt: expect.any(Date) }),
      })
    );
  });

  it('should accept all status values', async () => {
    for (const status of ['pending', 'filed', 'overdue', 'extension']) {
      vi.mocked(prisma.filing.update).mockResolvedValue({ ...mockFiling2, status });
      const response = await PUT(putRequest({ id: 'filing-1', status }));
      expect(response.status).toBe(200);
    }
  });

  it('should update actualTax', async () => {
    await PUT(putRequest({ id: 'filing-1', actualTax: 485.50 }));
    expect(prisma.filing.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ actualTax: 485.50 }),
      })
    );
  });

  it('should update confirmationNumber', async () => {
    await PUT(putRequest({ id: 'filing-1', confirmationNumber: 'CONF-XYZ' }));
    expect(prisma.filing.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ confirmationNumber: 'CONF-XYZ' }),
      })
    );
  });

  it('should update notes', async () => {
    await PUT(putRequest({ id: 'filing-1', notes: 'Paid via ACH' }));
    expect(prisma.filing.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ notes: 'Paid via ACH' }),
      })
    );
  });

  it('should map returned filing fields correctly', async () => {
    vi.mocked(prisma.filing.update).mockResolvedValue({
      ...mockFiling2,
      status: 'filed',
      actualTax: dec(915),
    });
    const response = await PUT(putRequest({ id: 'filing-2', status: 'filed' }));
    const { filing } = await response.json();
    expect(filing.state).toBe('California');
    expect(filing.actualTax).toBe(915);
    expect(filing.confirmationNumber).toBe('CONF-ABC123');
  });
});

// =============================================================================
// PUT Tests - Error Handling
// =============================================================================

describe('PUT /api/filings - error handling', () => {
  it('should return 500 on filing.update error', async () => {
    vi.mocked(prisma.filing.update).mockRejectedValue(new Error('DB error'));
    const response = await PUT(putRequest({ id: 'filing-1', status: 'filed' }));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toContain('Failed to update');
  });
});
