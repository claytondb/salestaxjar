/**
 * Tests for /api/tax/calculate route
 *
 * Tests the user-facing tax calculation endpoint.
 * Supports optional authentication to save calculations.
 * Covers validation, rate limiting, state lookup, and response structure.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('@/lib/taxjar', () => ({
  calculateTax: vi.fn(),
  isTaxJarConfigured: vi.fn(),
}));

vi.mock('@/lib/ratelimit', () => ({
  checkTaxCalcRateLimit: vi.fn(),
  rateLimitHeaders: vi.fn(() => ({})),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    calculation: {
      create: vi.fn(),
    },
  },
}));

vi.mock('@/data/taxRates', () => ({
  getStateByCode: vi.fn(),
}));

import { POST } from './route';
import { getCurrentUser } from '@/lib/auth';
import { calculateTax, isTaxJarConfigured } from '@/lib/taxjar';
import { checkTaxCalcRateLimit } from '@/lib/ratelimit';
import { prisma } from '@/lib/prisma';
import { getStateByCode } from '@/data/taxRates';

const mockGetCurrentUser = getCurrentUser as ReturnType<typeof vi.fn>;
const mockCalculateTax = calculateTax as ReturnType<typeof vi.fn>;
const mockIsTaxJarConfigured = isTaxJarConfigured as ReturnType<typeof vi.fn>;
const mockCheckRateLimit = checkTaxCalcRateLimit as ReturnType<typeof vi.fn>;
const mockGetStateByCode = getStateByCode as ReturnType<typeof vi.fn>;
const mockPrisma = prisma as unknown as {
  calculation: { create: ReturnType<typeof vi.fn> };
};

function makeRequest(body: unknown, ipHeader?: string): NextRequest {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (ipHeader) headers['x-forwarded-for'] = ipHeader;
  return new NextRequest('http://localhost:3000/api/tax/calculate', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

const mockTaxResult = {
  rate: 0.0875,
  taxAmount: 8.75,
  total: 108.75,
  taxableAmount: 100,
  source: 'static',
  breakdown: {
    stateRate: 0.06,
    countyRate: 0.0025,
    cityRate: 0.01,
    specialRate: 0.015,
  },
};

const mockState = { state: 'California', stateCode: 'CA', rate: 0.0725, avgLocalRate: 0.015 };

beforeEach(() => {
  vi.clearAllMocks();
  mockGetCurrentUser.mockResolvedValue(null);
  mockCheckRateLimit.mockResolvedValue({ success: true, limit: 100, remaining: 99, reset: 0 });
  mockCalculateTax.mockResolvedValue(mockTaxResult);
  mockIsTaxJarConfigured.mockReturnValue(false);
  mockGetStateByCode.mockReturnValue(mockState);
  mockPrisma.calculation.create.mockResolvedValue({});
});

// =============================================================================
// POST /api/tax/calculate - Rate Limiting
// =============================================================================

describe('POST /api/tax/calculate - rate limiting', () => {
  it('should return 429 when rate limit exceeded', async () => {
    mockCheckRateLimit.mockResolvedValue({ success: false, limit: 100, remaining: 0, reset: 60 });
    const res = await POST(makeRequest({ amount: 100, stateCode: 'CA' }));
    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data.error).toMatch(/too many requests/i);
  });

  it('should use user id for rate limit when authenticated', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-123', email: 'u@e.com' });
    await POST(makeRequest({ amount: 100, stateCode: 'CA' }));
    expect(mockCheckRateLimit).toHaveBeenCalledWith('user-123');
  });

  it('should use IP for rate limit when unauthenticated', async () => {
    await POST(makeRequest({ amount: 100, stateCode: 'CA' }, '1.2.3.4'));
    expect(mockCheckRateLimit).toHaveBeenCalledWith('1.2.3.4');
  });

  it('should fall back to anonymous for rate limit when no IP', async () => {
    await POST(makeRequest({ amount: 100, stateCode: 'CA' }));
    expect(mockCheckRateLimit).toHaveBeenCalledWith('anonymous');
  });
});

// =============================================================================
// POST /api/tax/calculate - Validation
// =============================================================================

describe('POST /api/tax/calculate - validation', () => {
  it('should return 400 for missing amount', async () => {
    const res = await POST(makeRequest({ stateCode: 'CA' }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/invalid amount/i);
  });

  it('should return 400 for negative amount', async () => {
    const res = await POST(makeRequest({ amount: -10, stateCode: 'CA' }));
    expect(res.status).toBe(400);
  });

  it('should accept zero amount', async () => {
    const res = await POST(makeRequest({ amount: 0, stateCode: 'CA' }));
    expect(res.status).toBe(200);
  });

  it('should return 400 for missing stateCode', async () => {
    const res = await POST(makeRequest({ amount: 100 }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/state code/i);
  });

  it('should return 400 for invalid stateCode', async () => {
    mockGetStateByCode.mockReturnValueOnce(null);
    const res = await POST(makeRequest({ amount: 100, stateCode: 'ZZ' }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/invalid state/i);
  });

  it('should return 400 for non-string stateCode', async () => {
    const res = await POST(makeRequest({ amount: 100, stateCode: 42 }));
    expect(res.status).toBe(400);
  });
});

// =============================================================================
// POST /api/tax/calculate - Response Structure
// =============================================================================

describe('POST /api/tax/calculate - response structure', () => {
  it('should return 200 with correct response fields', async () => {
    const res = await POST(makeRequest({ amount: 100, stateCode: 'CA' }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('amount', 100);
    expect(data).toHaveProperty('stateCode', 'CA');
    expect(data).toHaveProperty('stateName', 'California');
    expect(data).toHaveProperty('taxRate', mockTaxResult.rate);
    expect(data).toHaveProperty('taxAmount', mockTaxResult.taxAmount);
    expect(data).toHaveProperty('total', mockTaxResult.total);
    expect(data).toHaveProperty('breakdown');
    expect(data).toHaveProperty('source', mockTaxResult.source);
    expect(data).toHaveProperty('taxJarConfigured');
  });

  it('should uppercase stateCode in response', async () => {
    const res = await POST(makeRequest({ amount: 100, stateCode: 'ca' }));
    const data = await res.json();
    expect(data.stateCode).toBe('CA');
  });

  it('should include taxJarConfigured from isTaxJarConfigured()', async () => {
    mockIsTaxJarConfigured.mockReturnValue(true);
    const res = await POST(makeRequest({ amount: 100, stateCode: 'CA' }));
    const data = await res.json();
    expect(data.taxJarConfigured).toBe(true);
  });

  it('should include default category general when not provided', async () => {
    const res = await POST(makeRequest({ amount: 100, stateCode: 'CA' }));
    const data = await res.json();
    expect(data.category).toBe('general');
  });

  it('should include provided category in response', async () => {
    const res = await POST(makeRequest({ amount: 100, stateCode: 'CA', category: 'clothing' }));
    const data = await res.json();
    expect(data.category).toBe('clothing');
  });
});

// =============================================================================
// POST /api/tax/calculate - Authenticated Calculation Saving
// =============================================================================

describe('POST /api/tax/calculate - calculation saving', () => {
  it('should not save calculation for unauthenticated user', async () => {
    await POST(makeRequest({ amount: 100, stateCode: 'CA' }));
    expect(mockPrisma.calculation.create).not.toHaveBeenCalled();
  });

  it('should save calculation for authenticated user', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-123', email: 'u@e.com' });
    await POST(makeRequest({ amount: 100, stateCode: 'CA' }));
    expect(mockPrisma.calculation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-123',
        amount: 100,
        stateCode: 'CA',
        taxRate: mockTaxResult.rate,
        taxAmount: mockTaxResult.taxAmount,
        total: mockTaxResult.total,
      }),
    });
  });

  it('should not fail request if saving calculation fails', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-123', email: 'u@e.com' });
    mockPrisma.calculation.create.mockRejectedValueOnce(new Error('save fail'));
    const res = await POST(makeRequest({ amount: 100, stateCode: 'CA' }));
    // Should still return 200 even if save fails
    expect(res.status).toBe(200);
  });

  it('should pass optional shipping to calculateTax', async () => {
    await POST(makeRequest({ amount: 100, stateCode: 'CA', shipping: 15 }));
    expect(mockCalculateTax).toHaveBeenCalledWith(
      expect.objectContaining({ shipping: 15 })
    );
  });

  it('should default shipping to 0 when not provided', async () => {
    await POST(makeRequest({ amount: 100, stateCode: 'CA' }));
    expect(mockCalculateTax).toHaveBeenCalledWith(
      expect.objectContaining({ shipping: 0 })
    );
  });
});

// =============================================================================
// POST /api/tax/calculate - Error Handling
// =============================================================================

describe('POST /api/tax/calculate - error handling', () => {
  it('should return 500 when calculateTax throws', async () => {
    mockCalculateTax.mockRejectedValueOnce(new Error('calc error'));
    const res = await POST(makeRequest({ amount: 100, stateCode: 'CA' }));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });
});
