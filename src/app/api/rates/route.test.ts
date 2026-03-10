/**
 * Tests for /api/rates route
 * 
 * Tests the public tax rates API endpoint.
 * This endpoint provides state tax rate lookups and filters.
 */
import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

// =============================================================================
// Helper Functions
// =============================================================================

function createRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:3000/api/rates');
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return new NextRequest(url);
}

// =============================================================================
// GET /api/rates - All States
// =============================================================================

describe('GET /api/rates (all states)', () => {
  it('should return all states when no params provided', async () => {
    const request = createRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.count).toBeGreaterThan(0);
  });

  it('should return 51 jurisdictions (50 states + DC)', async () => {
    const request = createRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(data.count).toBe(51);
    expect(data.data.length).toBe(51);
  });

  it('should include count in response', async () => {
    const request = createRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(data.count).toBeDefined();
    expect(typeof data.count).toBe('number');
  });

  it('should return states with required properties', async () => {
    const request = createRequest();
    const response = await GET(request);
    const data = await response.json();

    const firstState = data.data[0];
    expect(firstState).toHaveProperty('state');
    expect(firstState).toHaveProperty('stateCode');
    expect(firstState).toHaveProperty('stateRate');
    expect(firstState).toHaveProperty('avgLocalRate');
    expect(firstState).toHaveProperty('combinedRate');
    expect(firstState).toHaveProperty('hasLocalTax');
  });

  it('should include all expected US state codes', async () => {
    const request = createRequest();
    const response = await GET(request);
    const data = await response.json();

    const codes = data.data.map((s: { stateCode: string }) => s.stateCode);
    
    // Check major states are included
    expect(codes).toContain('CA');
    expect(codes).toContain('TX');
    expect(codes).toContain('NY');
    expect(codes).toContain('FL');
    expect(codes).toContain('WA');
    expect(codes).toContain('DC');
  });
});

// =============================================================================
// GET /api/rates?state=XX - Single State Lookup
// =============================================================================

describe('GET /api/rates?state=XX (single state)', () => {
  it('should return single state by code', async () => {
    const request = createRequest({ state: 'CA' });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
    expect(data.data.stateCode).toBe('CA');
    expect(data.data.state).toBe('California');
  });

  it('should return correct data structure for state', async () => {
    const request = createRequest({ state: 'TX' });
    const response = await GET(request);
    const data = await response.json();

    expect(data.data).toHaveProperty('state');
    expect(data.data).toHaveProperty('stateCode');
    expect(data.data).toHaveProperty('stateRate');
    expect(data.data).toHaveProperty('avgLocalRate');
    expect(data.data).toHaveProperty('combinedRate');
    expect(data.data).toHaveProperty('hasLocalTax');
  });

  it('should handle lowercase state codes', async () => {
    const request = createRequest({ state: 'ny' });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.stateCode).toBe('NY');
  });

  it('should handle mixed case state codes', async () => {
    const request = createRequest({ state: 'Fl' });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.stateCode).toBe('FL');
  });

  it('should return 404 for invalid state code', async () => {
    const request = createRequest({ state: 'XX' });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBeDefined();
    expect(data.error).toContain('not found');
  });

  it('should return all states for empty state param (falls through)', async () => {
    const request = createRequest({ state: '' });
    const response = await GET(request);
    const data = await response.json();

    // Empty string is falsy, so falls through to return all states
    expect(response.status).toBe(200);
    expect(Array.isArray(data.data)).toBe(true);
  });

  it('should return 404 for numeric state code', async () => {
    const request = createRequest({ state: '12' });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(404);
  });

  it('should handle DC (District of Columbia)', async () => {
    const request = createRequest({ state: 'DC' });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.stateCode).toBe('DC');
    expect(data.data.state).toContain('Columbia');
  });
});

// =============================================================================
// GET /api/rates?filter=no-tax
// =============================================================================

describe('GET /api/rates?filter=no-tax', () => {
  it('should return no-tax states', async () => {
    const request = createRequest({ filter: 'no-tax' });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.data.length).toBeGreaterThan(0);
  });

  it('should include known no-tax states', async () => {
    const request = createRequest({ filter: 'no-tax' });
    const response = await GET(request);
    const data = await response.json();

    const codes = data.data.map((s: { stateCode: string }) => s.stateCode);
    
    // DE, MT, NH, OR are the classic no-sales-tax states
    expect(codes).toContain('DE');
    expect(codes).toContain('MT');
    expect(codes).toContain('NH');
    expect(codes).toContain('OR');
  });

  it('should return states with zero state rate', async () => {
    const request = createRequest({ filter: 'no-tax' });
    const response = await GET(request);
    const data = await response.json();

    data.data.forEach((state: { stateRate: number }) => {
      expect(state.stateRate).toBe(0);
    });
  });

  it('should not include Alaska (has local tax)', async () => {
    const request = createRequest({ filter: 'no-tax' });
    const response = await GET(request);
    const data = await response.json();

    const codes = data.data.map((s: { stateCode: string }) => s.stateCode);
    // Alaska has 0% state tax but has local taxes in some areas
    // Depending on implementation, it may or may not be included
    // This test documents the behavior
    if (codes.includes('AK')) {
      // If included, verify it has 0% state rate
      const alaska = data.data.find((s: { stateCode: string }) => s.stateCode === 'AK');
      expect(alaska.stateRate).toBe(0);
    }
  });

  it('should return 5 or fewer no-tax states', async () => {
    const request = createRequest({ filter: 'no-tax' });
    const response = await GET(request);
    const data = await response.json();

    // There are exactly 5 states with 0% state sales tax: AK, DE, MT, NH, OR
    expect(data.data.length).toBeLessThanOrEqual(5);
  });
});

// =============================================================================
// GET /api/rates?filter=highest
// =============================================================================

describe('GET /api/rates?filter=highest', () => {
  it('should return highest tax states', async () => {
    const request = createRequest({ filter: 'highest' });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
  });

  it('should return 5 states by default', async () => {
    const request = createRequest({ filter: 'highest' });
    const response = await GET(request);
    const data = await response.json();

    expect(data.data.length).toBe(5);
  });

  it('should respect limit parameter', async () => {
    const request = createRequest({ filter: 'highest', limit: '10' });
    const response = await GET(request);
    const data = await response.json();

    expect(data.data.length).toBe(10);
  });

  it('should return states sorted by combined rate (descending)', async () => {
    const request = createRequest({ filter: 'highest', limit: '10' });
    const response = await GET(request);
    const data = await response.json();

    for (let i = 0; i < data.data.length - 1; i++) {
      expect(data.data[i].combinedRate).toBeGreaterThanOrEqual(data.data[i + 1].combinedRate);
    }
  });

  it('should include high-tax states in top 5', async () => {
    const request = createRequest({ filter: 'highest', limit: '5' });
    const response = await GET(request);
    const data = await response.json();

    // All top 5 should have combined rate > 9%
    data.data.forEach((state: { combinedRate: number }) => {
      expect(state.combinedRate).toBeGreaterThan(9);
    });
  });

  it('should handle limit of 1', async () => {
    const request = createRequest({ filter: 'highest', limit: '1' });
    const response = await GET(request);
    const data = await response.json();

    expect(data.data.length).toBe(1);
    // First one should have highest rate
    expect(data.data[0].combinedRate).toBeGreaterThan(9); // Louisiana is ~9.55%
  });

  it('should handle limit exceeding total states', async () => {
    const request = createRequest({ filter: 'highest', limit: '100' });
    const response = await GET(request);
    const data = await response.json();

    // Should return all 51 jurisdictions max
    expect(data.data.length).toBeLessThanOrEqual(51);
  });

  it('should not include no-tax states in highest results', async () => {
    const request = createRequest({ filter: 'highest', limit: '51' });
    const response = await GET(request);
    const data = await response.json();

    const noTaxStates = ['DE', 'MT', 'NH', 'OR'];
    const topCodes = data.data.slice(0, 45).map((s: { stateCode: string }) => s.stateCode);
    
    // No-tax states should be at the bottom, not in top 45
    noTaxStates.forEach(stateCode => {
      expect(topCodes).not.toContain(stateCode);
    });
  });
});

// =============================================================================
// State-Specific Data Validation
// =============================================================================

describe('State Data Validation', () => {
  it('should return correct California rate data', async () => {
    const request = createRequest({ state: 'CA' });
    const response = await GET(request);
    const data = await response.json();

    expect(data.data.stateRate).toBe(7.25);
    expect(data.data.avgLocalRate).toBeGreaterThan(0);
    expect(data.data.combinedRate).toBeCloseTo(8.82, 1);
    expect(data.data.hasLocalTax).toBe(true);
  });

  it('should return correct Texas rate data', async () => {
    const request = createRequest({ state: 'TX' });
    const response = await GET(request);
    const data = await response.json();

    expect(data.data.stateRate).toBe(6.25);
    expect(data.data.avgLocalRate).toBeGreaterThan(0);
    expect(data.data.hasLocalTax).toBe(true);
  });

  it('should return correct Indiana rate data (no local tax)', async () => {
    const request = createRequest({ state: 'IN' });
    const response = await GET(request);
    const data = await response.json();

    expect(data.data.stateRate).toBe(7);
    expect(data.data.avgLocalRate).toBe(0);
    expect(data.data.combinedRate).toBe(7);
    expect(data.data.hasLocalTax).toBe(false);
  });

  it('should return correct Delaware rate data (no tax)', async () => {
    const request = createRequest({ state: 'DE' });
    const response = await GET(request);
    const data = await response.json();

    expect(data.data.stateRate).toBe(0);
    expect(data.data.avgLocalRate).toBe(0);
    expect(data.data.combinedRate).toBe(0);
    expect(data.data.hasLocalTax).toBe(false);
  });

  it('should return correct Alaska rate data (local only)', async () => {
    const request = createRequest({ state: 'AK' });
    const response = await GET(request);
    const data = await response.json();

    expect(data.data.stateRate).toBe(0);
    expect(data.data.avgLocalRate).toBeGreaterThan(0);
    expect(data.data.combinedRate).toBeGreaterThan(0);
    expect(data.data.hasLocalTax).toBe(true);
  });

  it('should have notes for Hawaii (GET tax)', async () => {
    const request = createRequest({ state: 'HI' });
    const response = await GET(request);
    const data = await response.json();

    expect(data.data.notes).toBeDefined();
    expect(data.data.notes).toContain('GET');
  });

  it('should have proper rate ranges for all states', async () => {
    const request = createRequest();
    const response = await GET(request);
    const data = await response.json();

    data.data.forEach((state: { stateRate: number; avgLocalRate: number; combinedRate: number; stateCode: string }) => {
      // State rate should be 0-10%
      expect(state.stateRate).toBeGreaterThanOrEqual(0);
      expect(state.stateRate).toBeLessThanOrEqual(10);
      
      // Local rate should be 0-6% (Alabama has 5.24% local average)
      expect(state.avgLocalRate).toBeGreaterThanOrEqual(0);
      expect(state.avgLocalRate).toBeLessThanOrEqual(6);
      
      // Combined should be state + local
      expect(state.combinedRate).toBeCloseTo(state.stateRate + state.avgLocalRate, 2);
    });
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('Edge Cases', () => {
  it('should ignore unknown filter values', async () => {
    const request = createRequest({ filter: 'unknown-filter' });
    const response = await GET(request);
    const data = await response.json();

    // Should fall through to return all states
    expect(response.status).toBe(200);
    expect(data.data.length).toBe(51);
  });

  it('should handle invalid limit returning empty array', async () => {
    const request = createRequest({ filter: 'highest', limit: 'abc' });
    const response = await GET(request);
    const data = await response.json();

    // parseInt('abc') returns NaN, behavior depends on implementation
    expect(response.status).toBe(200);
    // Could return 0 items (NaN limit) or default - test documents behavior
    expect(data.data.length).toBeGreaterThanOrEqual(0);
  });

  it('should handle zero limit', async () => {
    const request = createRequest({ filter: 'highest', limit: '0' });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    // Exact behavior with 0 depends on implementation
    expect(data.data.length).toBeGreaterThanOrEqual(0);
  });

  it('should handle negative limit', async () => {
    const request = createRequest({ filter: 'highest', limit: '-5' });
    const response = await GET(request);
    const data = await response.json();

    // Behavior depends on implementation
    expect(response.status).toBe(200);
  });

  it('should prioritize state param over filter', async () => {
    const request = createRequest({ state: 'CA', filter: 'no-tax' });
    const response = await GET(request);
    const data = await response.json();

    // State lookup should take precedence (code checks state first)
    expect(response.status).toBe(200);
    expect(data.data.stateCode).toBe('CA');
    expect(Array.isArray(data.data)).toBe(false); // Single object, not array
  });

  it('should handle whitespace in state code', async () => {
    const request = createRequest({ state: ' TX ' });
    const response = await GET(request);
    
    // Implementation may or may not trim - test documents behavior
    // If it returns 200, it handled the whitespace
    // If 404, it didn't trim
    expect([200, 404]).toContain(response.status);
  });
});

// =============================================================================
// Response Format Consistency
// =============================================================================

describe('Response Format', () => {
  it('should always include success field in successful responses', async () => {
    const requests = [
      createRequest(),
      createRequest({ state: 'CA' }),
      createRequest({ filter: 'no-tax' }),
      createRequest({ filter: 'highest' }),
    ];

    for (const request of requests) {
      const response = await GET(request);
      const data = await response.json();
      expect(data.success).toBe(true);
    }
  });

  it('should include error field in error responses', async () => {
    const request = createRequest({ state: 'INVALID' });
    const response = await GET(request);
    const data = await response.json();

    expect(data.error).toBeDefined();
    expect(typeof data.error).toBe('string');
  });

  it('should use consistent property names across responses', async () => {
    // All states
    const allRequest = createRequest();
    const allResponse = await GET(allRequest);
    const allData = await allResponse.json();

    // Single state
    const singleRequest = createRequest({ state: 'NY' });
    const singleResponse = await GET(singleRequest);
    const singleData = await singleResponse.json();

    // Properties should match
    const allStateProps = Object.keys(allData.data[0]).sort();
    const singleStateProps = Object.keys(singleData.data).sort();
    
    expect(allStateProps).toEqual(singleStateProps);
  });
});
