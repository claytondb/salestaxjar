/**
 * Tests for /api/v1/tax/calculate route
 *
 * Tests the public tax calculation API used by WooCommerce, BigCommerce, etc.
 * Authentication: API key in Authorization: Bearer header.
 * Covers CORS, auth, validation, nexus, response format, and error handling.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/apikeys', () => ({
  validateApiKey: vi.fn(),
}));

vi.mock('@/lib/taxjar', () => ({
  calculateTax: vi.fn(),
}));

vi.mock('@/data/taxRates', () => ({
  getStateByCode: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    business: {
      findFirst: vi.fn(),
    },
  },
}));

import { POST, OPTIONS } from './route';
import { validateApiKey } from '@/lib/apikeys';
import { calculateTax } from '@/lib/taxjar';
import { getStateByCode } from '@/data/taxRates';
import { prisma } from '@/lib/prisma';

const mockValidateApiKey = validateApiKey as ReturnType<typeof vi.fn>;
const mockCalculateTax = calculateTax as ReturnType<typeof vi.fn>;
const mockGetStateByCode = getStateByCode as ReturnType<typeof vi.fn>;
const mockPrisma = prisma as unknown as {
  business: { findFirst: ReturnType<typeof vi.fn> };
};

function makeRequest(body: unknown, authHeader?: string): NextRequest {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authHeader !== undefined) headers['Authorization'] = authHeader;
  return new NextRequest('http://localhost:3000/api/v1/tax/calculate', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

const validKey = {
  valid: true,
  userId: 'user-1',
  permissions: ['calculate'],
  keyId: 'key-1',
};

const mockState = { state: 'California', stateCode: 'CA', rate: 0.0725 };

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

beforeEach(() => {
  vi.clearAllMocks();
  mockValidateApiKey.mockResolvedValue(validKey);
  mockGetStateByCode.mockReturnValue(mockState);
  mockCalculateTax.mockResolvedValue(mockTaxResult);
  mockPrisma.business.findFirst.mockResolvedValue(null);
});

// =============================================================================
// OPTIONS /api/v1/tax/calculate - CORS Preflight
// =============================================================================

describe('OPTIONS /api/v1/tax/calculate - CORS', () => {
  it('should return CORS headers', async () => {
    const res = await OPTIONS();
    expect(res.status).toBe(200);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST');
  });
});

// =============================================================================
// POST /api/v1/tax/calculate - Authentication
// =============================================================================

describe('POST /api/v1/tax/calculate - authentication', () => {
  it('should return 401 when Authorization header is missing', async () => {
    const res = await POST(makeRequest({ to_state: 'CA', amount: 100 }));
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toMatch(/Authorization/i);
  });

  it('should return 401 when header does not start with Bearer', async () => {
    const res = await POST(makeRequest({ to_state: 'CA', amount: 100 }, 'Basic abc'));
    expect(res.status).toBe(401);
  });

  it('should return 401 when API key is invalid', async () => {
    mockValidateApiKey.mockResolvedValueOnce({ valid: false, error: 'Invalid key' });
    const res = await POST(makeRequest({ to_state: 'CA', amount: 100 }, 'Bearer bad-key'));
    expect(res.status).toBe(401);
    const data = await res.json();
    // Route returns validation.error if present, or 'Invalid API key' as fallback
    expect(data.error).toBeDefined();
  });

  it('should return 403 when key lacks calculate permission', async () => {
    mockValidateApiKey.mockResolvedValueOnce({
      valid: true,
      userId: 'u1',
      permissions: ['read'],
      keyId: 'k1',
    });
    const res = await POST(makeRequest({ to_state: 'CA', amount: 100 }, 'Bearer stax_key'));
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toMatch(/permission/i);
  });

  it('should include CORS headers in error responses', async () => {
    const res = await POST(makeRequest({ to_state: 'CA', amount: 100 }));
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });
});

// =============================================================================
// POST /api/v1/tax/calculate - Validation
// =============================================================================

describe('POST /api/v1/tax/calculate - validation', () => {
  it('should return 400 when to_state is missing', async () => {
    const res = await POST(makeRequest({ amount: 100 }, 'Bearer stax_key'));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/to_state/i);
  });

  it('should return 400 when amount is missing', async () => {
    const res = await POST(makeRequest({ to_state: 'CA' }, 'Bearer stax_key'));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/amount/i);
  });

  it('should return 400 when amount is negative', async () => {
    const res = await POST(makeRequest({ to_state: 'CA', amount: -5 }, 'Bearer stax_key'));
    expect(res.status).toBe(400);
  });

  it('should return 400 for invalid state code', async () => {
    mockGetStateByCode.mockReturnValueOnce(null);
    const res = await POST(makeRequest({ to_state: 'ZZ', amount: 100 }, 'Bearer stax_key'));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/invalid state/i);
  });

  it('should accept camelCase toState as alias for to_state', async () => {
    const res = await POST(makeRequest({ toState: 'CA', amount: 100 }, 'Bearer stax_key'));
    expect(res.status).toBe(200);
  });

  it('should accept camelCase toZip, toCity, toCountry', async () => {
    const res = await POST(
      makeRequest({ toState: 'CA', amount: 100, toZip: '90210', toCity: 'Beverly Hills' }, 'Bearer stax_key')
    );
    expect(res.status).toBe(200);
    expect(mockCalculateTax).toHaveBeenCalledWith(
      expect.objectContaining({
        toAddress: expect.objectContaining({ zip: '90210', city: 'Beverly Hills' }),
      })
    );
  });

  it('should prefer snake_case over camelCase when both provided', async () => {
    const res = await POST(
      makeRequest({ to_state: 'TX', toState: 'CA', amount: 100 }, 'Bearer stax_key')
    );
    expect(res.status).toBe(200);
    expect(mockGetStateByCode).toHaveBeenCalledWith('TX');
  });
});

// =============================================================================
// POST /api/v1/tax/calculate - Nexus Logic
// =============================================================================

describe('POST /api/v1/tax/calculate - nexus logic', () => {
  it('should fetch business nexus when userId is available', async () => {
    mockPrisma.business.findFirst.mockResolvedValueOnce({
      id: 'biz1',
      state: 'CA',
      zip: '94103',
      city: 'SF',
      nexusStates: [{ stateCode: 'CA' }, { stateCode: 'TX' }],
    });

    const res = await POST(makeRequest({ to_state: 'TX', amount: 100 }, 'Bearer stax_key'));
    expect(res.status).toBe(200);
    expect(mockPrisma.business.findFirst).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      include: {
        nexusStates: {
          where: { hasNexus: true },
          select: { stateCode: true },
        },
      },
    });
  });

  it('should assume nexus everywhere when no nexus states configured', async () => {
    mockPrisma.business.findFirst.mockResolvedValueOnce(null);
    await POST(makeRequest({ to_state: 'CA', amount: 100 }, 'Bearer stax_key'));
    // When assumeNexusEverywhere, destination state is added as nexus
    expect(mockCalculateTax).toHaveBeenCalledWith(
      expect.objectContaining({
        nexusAddresses: expect.arrayContaining([
          expect.objectContaining({ state: 'CA' }),
        ]),
      })
    );
  });
});

// =============================================================================
// POST /api/v1/tax/calculate - Response Format
// =============================================================================

describe('POST /api/v1/tax/calculate - response format', () => {
  it('should return success:true on valid request', async () => {
    const res = await POST(makeRequest({ to_state: 'CA', amount: 100 }, 'Bearer stax_key'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it('should include data field with tax results', async () => {
    const res = await POST(makeRequest({ to_state: 'CA', amount: 100 }, 'Bearer stax_key'));
    const data = await res.json();
    expect(data.data).toBeDefined();
    expect(data.data.taxAmount).toBe(mockTaxResult.taxAmount);
    expect(data.data.rate).toBe(mockTaxResult.rate);
  });

  it('should include tax field for TaxJar-style integrations', async () => {
    const res = await POST(makeRequest({ to_state: 'CA', amount: 100 }, 'Bearer stax_key'));
    const data = await res.json();
    expect(data.tax).toBeDefined();
    expect(data.tax.amount_to_collect).toBe(mockTaxResult.taxAmount);
    expect(data.tax.rate).toBe(mockTaxResult.rate);
  });

  it('should include breakdown field', async () => {
    const res = await POST(makeRequest({ to_state: 'CA', amount: 100 }, 'Bearer stax_key'));
    const data = await res.json();
    expect(data.tax.breakdown).toBeDefined();
    expect(data.tax.breakdown).toHaveProperty('state_tax_rate');
    expect(data.tax.breakdown).toHaveProperty('combined_tax_rate');
  });

  it('should include line_items breakdown when provided', async () => {
    const res = await POST(makeRequest({
      to_state: 'CA',
      amount: 100,
      line_items: [
        { id: 'item1', unit_price: 50, quantity: 2 },
      ],
    }, 'Bearer stax_key'));
    const data = await res.json();
    expect(Array.isArray(data.tax.breakdown.line_items)).toBe(true);
    expect(data.tax.breakdown.line_items[0]).toHaveProperty('id', 'item1');
  });

  it('should include CORS headers in success response', async () => {
    const res = await POST(makeRequest({ to_state: 'CA', amount: 100 }, 'Bearer stax_key'));
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('should set confidence to exact_zip when zip provided with taxjar source', async () => {
    mockCalculateTax.mockResolvedValueOnce({ ...mockTaxResult, source: 'taxjar' });
    const res = await POST(makeRequest({ to_state: 'CA', amount: 100, to_zip: '94103' }, 'Bearer stax_key'));
    const data = await res.json();
    expect(data.data.confidence).toBe('exact_zip');
  });

  it('should set confidence to zip_estimate when zip provided with static source', async () => {
    const res = await POST(makeRequest({ to_state: 'CA', amount: 100, to_zip: '94103' }, 'Bearer stax_key'));
    const data = await res.json();
    expect(data.data.confidence).toBe('zip_estimate');
  });

  it('should set confidence to state_only when no zip', async () => {
    const res = await POST(makeRequest({ to_state: 'CA', amount: 100 }, 'Bearer stax_key'));
    const data = await res.json();
    expect(data.data.confidence).toBe('state_only');
  });

  it('should use default country US when not provided', async () => {
    await POST(makeRequest({ to_state: 'CA', amount: 100 }, 'Bearer stax_key'));
    expect(mockCalculateTax).toHaveBeenCalledWith(
      expect.objectContaining({
        toAddress: expect.objectContaining({ country: 'US' }),
      })
    );
  });
});

// =============================================================================
// POST /api/v1/tax/calculate - Error Handling
// =============================================================================

describe('POST /api/v1/tax/calculate - error handling', () => {
  it('should return 500 when calculateTax throws', async () => {
    mockCalculateTax.mockRejectedValueOnce(new Error('calc error'));
    const res = await POST(makeRequest({ to_state: 'CA', amount: 100 }, 'Bearer stax_key'));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBeDefined();
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });
});
