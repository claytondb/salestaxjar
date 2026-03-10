/**
 * Tests for taxjar.ts - Tax calculation and rate lookup
 * 
 * Note: Tests focus on local calculation path (when TaxJar API is not configured)
 * and pure functions that don't require external dependencies.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock prisma before importing taxjar.ts
vi.mock('./prisma', () => ({
  prisma: {
    taxRateCache: {
      findFirst: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue({}),
    },
  },
}));

import {
  isTaxJarConfigured,
  calculateTax,
  getAllStateRates,
  type TaxCalculationRequest,
} from './taxjar';

// =============================================================================
// isTaxJarConfigured
// =============================================================================

describe('isTaxJarConfigured', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return false when TAXJAR_API_KEY is not set', () => {
    delete process.env.TAXJAR_API_KEY;
    expect(isTaxJarConfigured()).toBe(false);
  });

  it('should return false when TAXJAR_API_KEY is empty', () => {
    process.env.TAXJAR_API_KEY = '';
    expect(isTaxJarConfigured()).toBe(false);
  });

  // Note: Testing true case requires module reload, which is complex
  // The function is simple enough that false cases are sufficient
});

// =============================================================================
// getAllStateRates
// =============================================================================

describe('getAllStateRates', () => {
  it('should return an array of state rates', () => {
    const rates = getAllStateRates();
    expect(Array.isArray(rates)).toBe(true);
    expect(rates.length).toBe(51); // 50 states + DC
  });

  it('should include all required properties for each state', () => {
    const rates = getAllStateRates();
    
    rates.forEach(rate => {
      expect(rate).toHaveProperty('state');
      expect(rate).toHaveProperty('stateCode');
      expect(rate).toHaveProperty('combinedRate');
      expect(rate).toHaveProperty('stateRate');
      expect(rate).toHaveProperty('avgLocalRate');
      expect(rate).toHaveProperty('hasLocalTax');
    });
  });

  it('should have valid state codes', () => {
    const rates = getAllStateRates();
    const stateCodes = rates.map(r => r.stateCode);
    
    // Check for known state codes
    expect(stateCodes).toContain('CA');
    expect(stateCodes).toContain('TX');
    expect(stateCodes).toContain('NY');
    expect(stateCodes).toContain('FL');
    expect(stateCodes).toContain('DC');
  });

  it('should have non-negative rates', () => {
    const rates = getAllStateRates();
    
    rates.forEach(rate => {
      expect(rate.combinedRate).toBeGreaterThanOrEqual(0);
      expect(rate.stateRate).toBeGreaterThanOrEqual(0);
      expect(rate.avgLocalRate).toBeGreaterThanOrEqual(0);
    });
  });

  it('should correctly identify no-tax states', () => {
    const rates = getAllStateRates();
    const noTaxStates = ['DE', 'MT', 'NH', 'OR'];
    
    noTaxStates.forEach(stateCode => {
      const state = rates.find(r => r.stateCode === stateCode);
      expect(state).toBeDefined();
      expect(state!.combinedRate).toBe(0);
    });
  });

  it('should have Alaska with local-only tax', () => {
    const rates = getAllStateRates();
    const alaska = rates.find(r => r.stateCode === 'AK');
    
    expect(alaska).toBeDefined();
    expect(alaska!.stateRate).toBe(0);
    expect(alaska!.avgLocalRate).toBeGreaterThan(0);
    expect(alaska!.hasLocalTax).toBe(true);
  });

  it('should have combined rate equal to state + local rates', () => {
    const rates = getAllStateRates();
    
    rates.forEach(rate => {
      const expected = rate.stateRate + rate.avgLocalRate;
      // Allow small floating point differences
      expect(Math.abs(rate.combinedRate - expected)).toBeLessThan(0.01);
    });
  });
});

// =============================================================================
// calculateTax - Local Calculation (when TaxJar not configured)
// =============================================================================

describe('calculateTax - Local Calculation', () => {
  // TaxJar API is not configured in test environment, so it falls back to local
  
  describe('basic calculations', () => {
    it('should calculate tax for a taxable state', async () => {
      const request: TaxCalculationRequest = {
        amount: 100,
        toAddress: { state: 'CA' },
      };
      
      const result = await calculateTax(request);
      
      expect(result.taxableAmount).toBe(100);
      expect(result.taxAmount).toBeGreaterThan(0);
      expect(result.rate).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(100);
      expect(result.source).toBe('local');
    });

    it('should return zero tax for no-tax states', async () => {
      const noTaxStates = ['DE', 'MT', 'NH', 'OR'];
      
      for (const stateCode of noTaxStates) {
        const request: TaxCalculationRequest = {
          amount: 100,
          toAddress: { state: stateCode },
        };
        
        const result = await calculateTax(request);
        
        expect(result.taxAmount).toBe(0);
        expect(result.rate).toBe(0);
        expect(result.total).toBe(100);
      }
    });

    it('should handle uppercase state codes', async () => {
      const request: TaxCalculationRequest = {
        amount: 50,
        toAddress: { state: 'TX' },
      };
      
      const result = await calculateTax(request);
      expect(result.source).toBe('local');
      expect(result.taxAmount).toBeGreaterThan(0);
    });

    it('should handle lowercase state codes', async () => {
      const request: TaxCalculationRequest = {
        amount: 50,
        toAddress: { state: 'tx' },
      };
      
      const result = await calculateTax(request);
      expect(result.source).toBe('local');
      expect(result.taxAmount).toBeGreaterThan(0);
    });

    it('should handle mixed case state codes', async () => {
      const request: TaxCalculationRequest = {
        amount: 50,
        toAddress: { state: 'Ny' },
      };
      
      const result = await calculateTax(request);
      expect(result.source).toBe('local');
    });
  });

  describe('unknown states', () => {
    it('should return zero tax for unknown state codes', async () => {
      const request: TaxCalculationRequest = {
        amount: 100,
        toAddress: { state: 'XX' },
      };
      
      const result = await calculateTax(request);
      
      expect(result.taxAmount).toBe(0);
      expect(result.rate).toBe(0);
      expect(result.total).toBe(100);
      expect(result.source).toBe('local');
    });

    it('should handle empty state code', async () => {
      const request: TaxCalculationRequest = {
        amount: 100,
        toAddress: { state: '' },
      };
      
      const result = await calculateTax(request);
      expect(result.taxAmount).toBe(0);
    });
  });

  describe('amount precision', () => {
    it('should round tax to 2 decimal places', async () => {
      const request: TaxCalculationRequest = {
        amount: 33.33,
        toAddress: { state: 'CA' },
      };
      
      const result = await calculateTax(request);
      
      // Check that taxAmount has at most 2 decimal places
      const decimalPlaces = (result.taxAmount.toString().split('.')[1] || '').length;
      expect(decimalPlaces).toBeLessThanOrEqual(2);
    });

    it('should round total to 2 decimal places', async () => {
      const request: TaxCalculationRequest = {
        amount: 19.99,
        toAddress: { state: 'WA' },
      };
      
      const result = await calculateTax(request);
      
      const decimalPlaces = (result.total.toString().split('.')[1] || '').length;
      expect(decimalPlaces).toBeLessThanOrEqual(2);
    });

    it('should handle small amounts correctly', async () => {
      const request: TaxCalculationRequest = {
        amount: 0.99,
        toAddress: { state: 'FL' },
      };
      
      const result = await calculateTax(request);
      
      expect(result.taxableAmount).toBe(0.99);
      expect(result.total).toBeGreaterThanOrEqual(0.99);
    });

    it('should handle large amounts correctly', async () => {
      const request: TaxCalculationRequest = {
        amount: 999999.99,
        toAddress: { state: 'NY' },
      };
      
      const result = await calculateTax(request);
      
      expect(result.taxableAmount).toBe(999999.99);
      expect(result.taxAmount).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(999999.99);
    });

    it('should handle zero amount', async () => {
      const request: TaxCalculationRequest = {
        amount: 0,
        toAddress: { state: 'CA' },
      };
      
      const result = await calculateTax(request);
      
      expect(result.taxableAmount).toBe(0);
      expect(result.taxAmount).toBe(0);
      expect(result.total).toBe(0);
    });
  });

  describe('breakdown structure', () => {
    it('should include breakdown for local calculation', async () => {
      const request: TaxCalculationRequest = {
        amount: 100,
        toAddress: { state: 'CA' },
      };
      
      const result = await calculateTax(request);
      
      expect(result.breakdown).toBeDefined();
      expect(result.breakdown).toHaveProperty('stateRate');
      expect(result.breakdown).toHaveProperty('countyRate');
      expect(result.breakdown).toHaveProperty('cityRate');
      expect(result.breakdown).toHaveProperty('specialRate');
    });

    it('should have stateRate reflect actual state tax rate', async () => {
      const request: TaxCalculationRequest = {
        amount: 100,
        toAddress: { state: 'IN' }, // Indiana has 7% state rate, no local
      };
      
      const result = await calculateTax(request);
      
      expect(result.breakdown).toBeDefined();
      expect(result.breakdown!.stateRate).toBe(0.07);
      expect(result.breakdown!.countyRate).toBe(0);
      expect(result.breakdown!.cityRate).toBe(0);
    });
  });

  describe('category modifiers', () => {
    it('should apply clothing exemption in NY', async () => {
      const generalRequest: TaxCalculationRequest = {
        amount: 100,
        toAddress: { state: 'NY' },
        category: 'general',
      };
      
      const clothingRequest: TaxCalculationRequest = {
        amount: 100,
        toAddress: { state: 'NY' },
        category: 'clothing',
      };
      
      const generalResult = await calculateTax(generalRequest);
      const clothingResult = await calculateTax(clothingRequest);
      
      // Clothing should be exempt (0 tax) in NY
      expect(clothingResult.taxAmount).toBe(0);
      // General goods should have tax
      expect(generalResult.taxAmount).toBeGreaterThan(0);
    });

    it('should apply grocery exemption in TX', async () => {
      const generalRequest: TaxCalculationRequest = {
        amount: 100,
        toAddress: { state: 'TX' },
        category: 'general',
      };
      
      const groceryRequest: TaxCalculationRequest = {
        amount: 100,
        toAddress: { state: 'TX' },
        category: 'food_grocery',
      };
      
      const generalResult = await calculateTax(generalRequest);
      const groceryResult = await calculateTax(groceryRequest);
      
      // Groceries should be exempt in TX
      expect(groceryResult.taxAmount).toBe(0);
      // General goods should have tax
      expect(generalResult.taxAmount).toBeGreaterThan(0);
    });

    it('should apply reduced rate for groceries in IL', async () => {
      const generalRequest: TaxCalculationRequest = {
        amount: 100,
        toAddress: { state: 'IL' },
        category: 'general',
      };
      
      const groceryRequest: TaxCalculationRequest = {
        amount: 100,
        toAddress: { state: 'IL' },
        category: 'food_grocery',
      };
      
      const generalResult = await calculateTax(generalRequest);
      const groceryResult = await calculateTax(groceryRequest);
      
      // IL has reduced rate for groceries (50% of normal)
      // So grocery tax should be roughly half of general tax
      expect(groceryResult.taxAmount).toBeLessThan(generalResult.taxAmount);
      expect(groceryResult.taxAmount).toBeGreaterThan(0);
      
      // Check it's approximately half
      const ratio = groceryResult.taxAmount / generalResult.taxAmount;
      expect(ratio).toBeCloseTo(0.5, 1);
    });

    it('should not apply category modifiers for states without exemptions', async () => {
      const generalRequest: TaxCalculationRequest = {
        amount: 100,
        toAddress: { state: 'AL' }, // Alabama has no clothing exemption
        category: 'general',
      };
      
      const clothingRequest: TaxCalculationRequest = {
        amount: 100,
        toAddress: { state: 'AL' },
        category: 'clothing',
      };
      
      const generalResult = await calculateTax(generalRequest);
      const clothingResult = await calculateTax(clothingRequest);
      
      // Both should have same tax (no exemption in AL)
      expect(clothingResult.taxAmount).toBe(generalResult.taxAmount);
    });
  });

  describe('state-specific rates', () => {
    it('should calculate correctly for high-tax states', async () => {
      // Tennessee and Louisiana have ~9.5% combined rates
      const tnRequest: TaxCalculationRequest = {
        amount: 100,
        toAddress: { state: 'TN' },
      };
      
      const result = await calculateTax(tnRequest);
      
      // TN combined rate is 9.55%, so tax on $100 should be ~$9.55
      expect(result.taxAmount).toBeCloseTo(9.55, 1);
    });

    it('should calculate correctly for low-tax states', async () => {
      // Hawaii has 4.44% combined rate
      const hiRequest: TaxCalculationRequest = {
        amount: 100,
        toAddress: { state: 'HI' },
      };
      
      const result = await calculateTax(hiRequest);
      
      // HI combined rate is 4.44%, so tax on $100 should be ~$4.44
      expect(result.taxAmount).toBeCloseTo(4.44, 1);
    });

    it('should handle states with only local taxes (Alaska)', async () => {
      const request: TaxCalculationRequest = {
        amount: 100,
        toAddress: { state: 'AK' },
      };
      
      const result = await calculateTax(request);
      
      // Alaska has no state tax but ~1.82% local
      expect(result.breakdown!.stateRate).toBe(0);
      expect(result.taxAmount).toBeCloseTo(1.82, 1);
    });
  });

  describe('result consistency', () => {
    it('should have total equal to amount plus tax', async () => {
      const request: TaxCalculationRequest = {
        amount: 75.50,
        toAddress: { state: 'WA' },
      };
      
      const result = await calculateTax(request);
      
      const expectedTotal = Math.round((75.50 + result.taxAmount) * 100) / 100;
      expect(result.total).toBe(expectedTotal);
    });

    it('should be deterministic (same input = same output)', async () => {
      const request: TaxCalculationRequest = {
        amount: 123.45,
        toAddress: { state: 'NV' },
      };
      
      const result1 = await calculateTax(request);
      const result2 = await calculateTax(request);
      
      expect(result1).toEqual(result2);
    });
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('calculateTax - Edge Cases', () => {
  it('should handle DC (District of Columbia)', async () => {
    const request: TaxCalculationRequest = {
      amount: 100,
      toAddress: { state: 'DC' },
    };
    
    const result = await calculateTax(request);
    
    // DC has 6% sales tax
    expect(result.taxAmount).toBeCloseTo(6, 1);
    expect(result.source).toBe('local');
  });

  it('should handle optional shipping amount', async () => {
    // Note: For local calculation, shipping is not used separately
    const request: TaxCalculationRequest = {
      amount: 100,
      shipping: 10,
      toAddress: { state: 'CA' },
    };
    
    const result = await calculateTax(request);
    
    // Should complete without error
    expect(result.source).toBe('local');
  });

  it('should handle full address details', async () => {
    const request: TaxCalculationRequest = {
      amount: 100,
      toAddress: {
        street: '123 Main St',
        city: 'Los Angeles',
        state: 'CA',
        zip: '90001',
        country: 'US',
      },
    };
    
    const result = await calculateTax(request);
    
    // Local calculation uses state only
    expect(result.source).toBe('local');
    expect(result.taxAmount).toBeGreaterThan(0);
  });

  it('should handle fromAddress parameter', async () => {
    const request: TaxCalculationRequest = {
      amount: 100,
      toAddress: { state: 'NY' },
      fromAddress: { state: 'IL' },
    };
    
    const result = await calculateTax(request);
    
    // Tax is calculated based on destination (toAddress)
    expect(result.source).toBe('local');
  });
});
