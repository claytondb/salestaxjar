/**
 * Tests for /api/tax/rates route
 *
 * Tests the unauthenticated tax rates lookup endpoint.
 * GET with optional state/zip/city params.
 * Rate-limited by IP.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/taxjar', () => ({
  getTaxRate: vi.fn(),
  getAllStateRates: vi.fn(),
  isTaxJarConfigured: vi.fn(),
}));

vi.mock('@/lib/ratelimit', () => ({
  checkApiRateLimit: vi.fn(),
  rateLimitHeaders: vi.fn(() => ({})),
}));

import { GET } from './route';
import { getTaxRate, getAllStateRates, isTaxJarConfigured } from '@/lib/taxjar';
import { checkApiRateLimit } from '@/lib/ratelimit';

const mockGetTaxRate = getTaxRate as ReturnType<typeof vi.fn>;
const mockGetAllStateRates = getAllStateRates as ReturnType<typeof vi.fn>;
const mockIsTaxJarConfigured = isTaxJarConfigured as ReturnType<typeof vi.fn>;
const mockCheckRateLimit = checkApiRateLimit as ReturnType<typeof vi.fn>;

function makeRequest(params: Record<string, string> = {}, ip?: string): NextRequest {
  const url = new URL('http://localhost:3000/api/tax/rates');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const headers: Record<string, string> = {};
  if (ip) headers['x-forwarded-for'] = ip;
  return new NextRequest(url, { headers });
}

const mockAllRates = [
  { stateCode: 'CA', stateName: 'California', rate: 0.0725, avgLocalRate: 0.015 },
  { stateCode: 'TX', stateName: 'Texas', rate: 0.0625, avgLocalRate: 0.02 },
];

const mockSingleRate = {
  stateCode: 'CA',
  stateName: 'California',
  rate: 0.0875,
  source: 'static',
};

beforeEach(() => {
  vi.clearAllMocks();
  mockCheckRateLimit.mockResolvedValue({ success: true, limit: 60, remaining: 59, reset: 0 });
  mockGetAllStateRates.mockReturnValue(mockAllRates);
  mockGetTaxRate.mockResolvedValue(mockSingleRate);
  mockIsTaxJarConfigured.mockReturnValue(false);
});

// =============================================================================
// GET /api/tax/rates - Rate Limiting
// =============================================================================

describe('GET /api/tax/rates - rate limiting', () => {
  it('should return 429 when rate limit exceeded', async () => {
    mockCheckRateLimit.mockResolvedValue({ success: false, limit: 60, remaining: 0, reset: 60 });
    const res = await GET(makeRequest());
    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data.error).toMatch(/too many requests/i);
  });

  it('should use IP for rate limiting', async () => {
    await GET(makeRequest({}, '5.6.7.8'));
    expect(mockCheckRateLimit).toHaveBeenCalledWith('5.6.7.8');
  });

  it('should fall back to anonymous when no IP', async () => {
    await GET(makeRequest());
    expect(mockCheckRateLimit).toHaveBeenCalledWith('anonymous');
  });
});

// =============================================================================
// GET /api/tax/rates - All States
// =============================================================================

describe('GET /api/tax/rates - all states', () => {
  it('should return all state rates when no state param', async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.rates)).toBe(true);
    expect(data.rates).toHaveLength(2);
    expect(data.count).toBe(2);
  });

  it('should include taxJarConfigured in all-states response', async () => {
    const res = await GET(makeRequest());
    const data = await res.json();
    expect(data.taxJarConfigured).toBe(false);
  });

  it('should report taxJarConfigured:true when configured', async () => {
    mockIsTaxJarConfigured.mockReturnValue(true);
    const res = await GET(makeRequest());
    const data = await res.json();
    expect(data.taxJarConfigured).toBe(true);
  });
});

// =============================================================================
// GET /api/tax/rates - Single State
// =============================================================================

describe('GET /api/tax/rates - single state', () => {
  it('should return single rate when state param provided', async () => {
    const res = await GET(makeRequest({ state: 'CA' }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.rate).toBeDefined();
    expect(data.taxJarConfigured).toBeDefined();
  });

  it('should call getTaxRate with uppercase state code', async () => {
    await GET(makeRequest({ state: 'ca' }));
    expect(mockGetTaxRate).toHaveBeenCalledWith(
      expect.objectContaining({ stateCode: 'CA' })
    );
  });

  it('should pass zip when provided', async () => {
    await GET(makeRequest({ state: 'CA', zip: '94103' }));
    expect(mockGetTaxRate).toHaveBeenCalledWith(
      expect.objectContaining({ stateCode: 'CA', zip: '94103' })
    );
  });

  it('should pass city when provided', async () => {
    await GET(makeRequest({ state: 'CA', city: 'San Francisco' }));
    expect(mockGetTaxRate).toHaveBeenCalledWith(
      expect.objectContaining({ stateCode: 'CA', city: 'San Francisco' })
    );
  });

  it('should pass both zip and city when both provided', async () => {
    await GET(makeRequest({ state: 'TX', zip: '75201', city: 'Dallas' }));
    expect(mockGetTaxRate).toHaveBeenCalledWith({
      stateCode: 'TX',
      zip: '75201',
      city: 'Dallas',
    });
  });

  it('should not call getAllStateRates when state param present', async () => {
    await GET(makeRequest({ state: 'CA' }));
    expect(mockGetAllStateRates).not.toHaveBeenCalled();
  });
});

// =============================================================================
// GET /api/tax/rates - Error Handling
// =============================================================================

describe('GET /api/tax/rates - error handling', () => {
  it('should return 500 when getTaxRate throws', async () => {
    mockGetTaxRate.mockRejectedValueOnce(new Error('tax error'));
    const res = await GET(makeRequest({ state: 'CA' }));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it('should return 500 when getAllStateRates throws', async () => {
    mockGetAllStateRates.mockImplementationOnce(() => { throw new Error('DB error'); });
    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
  });
});
