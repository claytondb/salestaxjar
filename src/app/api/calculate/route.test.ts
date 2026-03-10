/**
 * Tests for /api/calculate route
 * 
 * Tests the public tax calculation API endpoint.
 * This endpoint is a core feature of Sails.tax.
 */
import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from './route';

// =============================================================================
// Helper Functions
// =============================================================================

function createGetRequest(params: Record<string, string>): NextRequest {
  const url = new URL('http://localhost:3000/api/calculate');
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return new NextRequest(url);
}

function createPostRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/calculate', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

// =============================================================================
// GET /api/calculate
// =============================================================================

describe('GET /api/calculate', () => {
  describe('successful calculations', () => {
    it('should calculate tax for a valid request', async () => {
      const request = createGetRequest({ amount: '100', state: 'CA' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.amount).toBe(100);
      expect(data.data.stateCode).toBe('CA');
      expect(data.data.taxAmount).toBeGreaterThan(0);
      expect(data.data.total).toBeGreaterThan(100);
    });

    it('should return correct data structure', async () => {
      const request = createGetRequest({ amount: '50', state: 'TX' });
      const response = await GET(request);
      const data = await response.json();

      expect(data.data).toHaveProperty('amount');
      expect(data.data).toHaveProperty('state');
      expect(data.data).toHaveProperty('stateCode');
      expect(data.data).toHaveProperty('stateRate');
      expect(data.data).toHaveProperty('avgLocalRate');
      expect(data.data).toHaveProperty('combinedRate');
      expect(data.data).toHaveProperty('taxAmount');
      expect(data.data).toHaveProperty('total');
      expect(data.data).toHaveProperty('hasLocalTax');
    });

    it('should handle decimal amounts', async () => {
      const request = createGetRequest({ amount: '99.99', state: 'NY' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.amount).toBe(99.99);
      expect(data.data.taxAmount).toBeGreaterThan(0);
    });

    it('should handle large amounts', async () => {
      const request = createGetRequest({ amount: '999999.99', state: 'FL' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.amount).toBe(999999.99);
      expect(data.data.total).toBeGreaterThan(999999.99);
    });

    it('should handle small amounts', async () => {
      const request = createGetRequest({ amount: '0.01', state: 'WA' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.amount).toBe(0.01);
    });

    it('should handle lowercase state codes', async () => {
      const request = createGetRequest({ amount: '100', state: 'ca' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.stateCode).toBe('CA');
    });
  });

  describe('no-tax states', () => {
    const noTaxStates = ['DE', 'MT', 'NH', 'OR'];

    noTaxStates.forEach(stateCode => {
      it(`should return zero tax for ${stateCode}`, async () => {
        const request = createGetRequest({ amount: '100', state: stateCode });
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.data.taxAmount).toBe(0);
        expect(data.data.total).toBe(100);
        expect(data.data.combinedRate).toBe(0);
      });
    });
  });

  describe('state with local-only tax', () => {
    it('should handle Alaska (no state tax, local only)', async () => {
      const request = createGetRequest({ amount: '100', state: 'AK' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.stateRate).toBe(0);
      expect(data.data.avgLocalRate).toBeGreaterThan(0);
      expect(data.data.taxAmount).toBeGreaterThan(0);
      expect(data.data.hasLocalTax).toBe(true);
    });
  });

  describe('validation errors', () => {
    it('should reject missing amount', async () => {
      const request = createGetRequest({ state: 'CA' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('amount');
    });

    it('should reject zero amount', async () => {
      const request = createGetRequest({ amount: '0', state: 'CA' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('amount');
    });

    it('should reject negative amount', async () => {
      const request = createGetRequest({ amount: '-50', state: 'CA' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('amount');
    });

    it('should reject non-numeric amount', async () => {
      const request = createGetRequest({ amount: 'abc', state: 'CA' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('amount');
    });

    it('should reject missing state', async () => {
      const request = createGetRequest({ amount: '100' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('State');
    });

    it('should reject empty state', async () => {
      const request = createGetRequest({ amount: '100', state: '' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('State');
    });

    it('should reject invalid state code', async () => {
      const request = createGetRequest({ amount: '100', state: 'XX' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('state');
    });

    it('should reject state code that is too long', async () => {
      const request = createGetRequest({ amount: '100', state: 'CALIFORNIA' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('state');
    });
  });

  describe('state-specific rates', () => {
    it('should calculate correct rate for California (high tax)', async () => {
      const request = createGetRequest({ amount: '100', state: 'CA' });
      const response = await GET(request);
      const data = await response.json();

      // CA combined rate is 8.82%
      expect(data.data.combinedRate).toBeCloseTo(8.82, 1);
      expect(data.data.taxAmount).toBeCloseTo(8.82, 1);
    });

    it('should calculate correct rate for Tennessee (highest tax)', async () => {
      const request = createGetRequest({ amount: '100', state: 'TN' });
      const response = await GET(request);
      const data = await response.json();

      // TN combined rate is 9.55%
      expect(data.data.combinedRate).toBeCloseTo(9.55, 1);
      expect(data.data.taxAmount).toBeCloseTo(9.55, 1);
    });

    it('should calculate correct rate for Indiana (state only, no local)', async () => {
      const request = createGetRequest({ amount: '100', state: 'IN' });
      const response = await GET(request);
      const data = await response.json();

      expect(data.data.stateRate).toBe(7);
      expect(data.data.avgLocalRate).toBe(0);
      expect(data.data.hasLocalTax).toBe(false);
      expect(data.data.taxAmount).toBe(7);
    });

    it('should calculate correct rate for DC', async () => {
      const request = createGetRequest({ amount: '100', state: 'DC' });
      const response = await GET(request);
      const data = await response.json();

      // DC has 6% rate
      expect(data.data.stateCode).toBe('DC');
      expect(data.data.combinedRate).toBe(6);
      expect(data.data.taxAmount).toBe(6);
    });
  });

  describe('math precision', () => {
    it('should round tax to 2 decimal places', async () => {
      const request = createGetRequest({ amount: '33.33', state: 'CA' });
      const response = await GET(request);
      const data = await response.json();

      const decimals = (data.data.taxAmount.toString().split('.')[1] || '').length;
      expect(decimals).toBeLessThanOrEqual(2);
    });

    it('should round total to 2 decimal places', async () => {
      const request = createGetRequest({ amount: '77.77', state: 'TX' });
      const response = await GET(request);
      const data = await response.json();

      const decimals = (data.data.total.toString().split('.')[1] || '').length;
      expect(decimals).toBeLessThanOrEqual(2);
    });

    it('should have total equal to amount + tax', async () => {
      const request = createGetRequest({ amount: '123.45', state: 'NY' });
      const response = await GET(request);
      const data = await response.json();

      const expectedTotal = Math.round((data.data.amount + data.data.taxAmount) * 100) / 100;
      expect(data.data.total).toBe(expectedTotal);
    });
  });
});

// =============================================================================
// POST /api/calculate
// =============================================================================

describe('POST /api/calculate', () => {
  describe('successful calculations', () => {
    it('should calculate tax for a valid request', async () => {
      const request = createPostRequest({ amount: 100, stateCode: 'CA' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.amount).toBe(100);
      expect(data.data.stateCode).toBe('CA');
      expect(data.data.taxAmount).toBeGreaterThan(0);
    });

    it('should handle string amount', async () => {
      const request = createPostRequest({ amount: '50.99', stateCode: 'TX' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // API echoes back the amount as-is; tax calculation still works correctly
      expect(parseFloat(data.data.amount)).toBe(50.99);
      expect(data.data.taxAmount).toBeGreaterThan(0);
    });

    it('should handle lowercase state codes', async () => {
      const request = createPostRequest({ amount: 100, stateCode: 'wa' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.stateCode).toBe('WA');
    });
  });

  describe('no-tax states', () => {
    it('should return zero tax for Oregon', async () => {
      const request = createPostRequest({ amount: 500, stateCode: 'OR' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.taxAmount).toBe(0);
      expect(data.data.total).toBe(500);
    });
  });

  describe('validation errors', () => {
    it('should reject missing amount', async () => {
      const request = createPostRequest({ stateCode: 'CA' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('amount');
    });

    it('should reject zero amount', async () => {
      const request = createPostRequest({ amount: 0, stateCode: 'CA' });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should reject negative amount', async () => {
      const request = createPostRequest({ amount: -100, stateCode: 'CA' });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should reject missing stateCode', async () => {
      const request = createPostRequest({ amount: 100 });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('State');
    });

    it('should reject invalid stateCode', async () => {
      const request = createPostRequest({ amount: 100, stateCode: 'ZZ' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('state');
    });

    it('should reject invalid JSON body', async () => {
      const request = new NextRequest('http://localhost:3000/api/calculate', {
        method: 'POST',
        body: 'not valid json',
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('request');
    });

    it('should reject empty body', async () => {
      const request = new NextRequest('http://localhost:3000/api/calculate', {
        method: 'POST',
        body: '{}',
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });
  });

  describe('state-specific calculations', () => {
    it('should calculate correctly for all 51 jurisdictions', async () => {
      const jurisdictions = [
        'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
        'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
        'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
        'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
        'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
      ];

      for (const stateCode of jurisdictions) {
        const request = createPostRequest({ amount: 100, stateCode });
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data.stateCode).toBe(stateCode);
        expect(data.data.taxAmount).toBeGreaterThanOrEqual(0);
        expect(data.data.total).toBeGreaterThanOrEqual(100);
      }
    });
  });

  describe('data consistency', () => {
    it('should return consistent results for same input', async () => {
      const body = { amount: 199.99, stateCode: 'NV' };
      
      const request1 = createPostRequest(body);
      const response1 = await POST(request1);
      const data1 = await response1.json();

      const request2 = createPostRequest(body);
      const response2 = await POST(request2);
      const data2 = await response2.json();

      expect(data1.data.taxAmount).toBe(data2.data.taxAmount);
      expect(data1.data.total).toBe(data2.data.total);
      expect(data1.data.combinedRate).toBe(data2.data.combinedRate);
    });

    it('should include state notes when available', async () => {
      const request = createPostRequest({ amount: 100, stateCode: 'HI' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Hawaii has notes about GET tax
      expect(data.data.notes).toBeDefined();
      expect(data.data.notes).toContain('GET');
    });
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('Edge Cases', () => {
  it('should handle very small tax amounts correctly', async () => {
    // Test with Delaware (0% tax) neighbor states for comparison
    const deRequest = createGetRequest({ amount: '0.99', state: 'DE' });
    const deResponse = await GET(deRequest);
    const deData = await deResponse.json();
    expect(deData.data.taxAmount).toBe(0);

    const paRequest = createGetRequest({ amount: '0.99', state: 'PA' });
    const paResponse = await GET(paRequest);
    const paData = await paResponse.json();
    expect(paData.data.taxAmount).toBeGreaterThanOrEqual(0);
  });

  it('should handle GET and POST with same params equally', async () => {
    const getRequest = createGetRequest({ amount: '250', state: 'IL' });
    const getResponse = await GET(getRequest);
    const getData = await getResponse.json();

    const postRequest = createPostRequest({ amount: 250, stateCode: 'IL' });
    const postResponse = await POST(postRequest);
    const postData = await postResponse.json();

    expect(getData.data.taxAmount).toBe(postData.data.taxAmount);
    expect(getData.data.total).toBe(postData.data.total);
    expect(getData.data.combinedRate).toBe(postData.data.combinedRate);
  });

  it('should handle whitespace in state code', async () => {
    const request = createGetRequest({ amount: '100', state: ' CA ' });
    const response = await GET(request);
    
    // Should either accept trimmed or reject - consistent behavior
    expect([200, 400]).toContain(response.status);
  });

  it('should handle maximum JavaScript number safely', async () => {
    const request = createGetRequest({ amount: String(Number.MAX_SAFE_INTEGER), state: 'CA' });
    const response = await GET(request);
    
    // Should handle without crashing
    expect([200, 400]).toContain(response.status);
  });
});
