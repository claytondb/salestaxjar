import { describe, expect, it } from 'vitest';
import {
  stateTaxRates,
  taxRateMetadata,
  getStateByCode,
  getNoTaxStates,
  getHighestTaxStates,
  calculateTax,
  type TaxRate,
} from './taxRates';

describe('taxRates data', () => {
  describe('stateTaxRates', () => {
    it('should contain all 50 states plus DC', () => {
      expect(stateTaxRates.length).toBe(51);
    });

    it('should have unique state codes', () => {
      const codes = stateTaxRates.map(s => s.stateCode);
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(51);
    });

    it('should have valid tax rates (non-negative)', () => {
      stateTaxRates.forEach(state => {
        expect(state.stateRate).toBeGreaterThanOrEqual(0);
        expect(state.avgLocalRate).toBeGreaterThanOrEqual(0);
        expect(state.combinedRate).toBeGreaterThanOrEqual(0);
      });
    });

    it('should have combined rate equal to state + local rates', () => {
      stateTaxRates.forEach(state => {
        const expected = state.stateRate + state.avgLocalRate;
        // Allow small floating point tolerance
        expect(state.combinedRate).toBeCloseTo(expected, 2);
      });
    });

    it('should have hasLocalTax flag consistent with avgLocalRate', () => {
      stateTaxRates.forEach(state => {
        if (state.avgLocalRate > 0) {
          expect(state.hasLocalTax).toBe(true);
        }
      });
    });

    it('should include all required fields for each state', () => {
      stateTaxRates.forEach(state => {
        expect(state).toHaveProperty('state');
        expect(state).toHaveProperty('stateCode');
        expect(state).toHaveProperty('stateRate');
        expect(state).toHaveProperty('avgLocalRate');
        expect(state).toHaveProperty('combinedRate');
        expect(state).toHaveProperty('hasLocalTax');
      });
    });

    it('should have 2-letter state codes', () => {
      stateTaxRates.forEach(state => {
        expect(state.stateCode).toMatch(/^[A-Z]{2}$/);
      });
    });
  });

  describe('taxRateMetadata', () => {
    it('should have valid date formats', () => {
      expect(taxRateMetadata.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(taxRateMetadata.effectiveDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(taxRateMetadata.nextScheduledUpdate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should have sources array', () => {
      expect(Array.isArray(taxRateMetadata.sources)).toBe(true);
      expect(taxRateMetadata.sources.length).toBeGreaterThan(0);
    });

    it('should have required disclaimer text', () => {
      expect(taxRateMetadata.disclaimer).toBeDefined();
      expect(taxRateMetadata.disclaimer.length).toBeGreaterThan(0);
    });
  });

  describe('getStateByCode', () => {
    it('should return correct state for valid code', () => {
      const result = getStateByCode('CA');
      expect(result).toBeDefined();
      expect(result?.state).toBe('California');
      expect(result?.stateCode).toBe('CA');
    });

    it('should be case-insensitive', () => {
      const upper = getStateByCode('TX');
      const lower = getStateByCode('tx');
      const mixed = getStateByCode('Tx');
      expect(upper).toEqual(lower);
      expect(upper).toEqual(mixed);
      expect(upper?.state).toBe('Texas');
    });

    it('should return undefined for invalid code', () => {
      expect(getStateByCode('XX')).toBeUndefined();
      expect(getStateByCode('')).toBeUndefined();
      expect(getStateByCode('California')).toBeUndefined();
    });

    it('should return correct data for no-tax states', () => {
      const oregon = getStateByCode('OR');
      expect(oregon?.stateRate).toBe(0);
      expect(oregon?.combinedRate).toBe(0);
      expect(oregon?.notes).toContain('No sales tax');
    });

    it('should return correct data for high-tax states', () => {
      const louisiana = getStateByCode('LA');
      expect(louisiana?.combinedRate).toBeGreaterThan(9);
    });

    it('should return District of Columbia', () => {
      const dc = getStateByCode('DC');
      expect(dc).toBeDefined();
      expect(dc?.state).toBe('District of Columbia');
    });
  });

  describe('getNoTaxStates', () => {
    it('should return states with 0% state tax', () => {
      const noTaxStates = getNoTaxStates();
      noTaxStates.forEach(state => {
        expect(state.stateRate).toBe(0);
      });
    });

    it('should include known no-tax states', () => {
      const noTaxStates = getNoTaxStates();
      const codes = noTaxStates.map(s => s.stateCode);
      
      // These states have no state sales tax
      expect(codes).toContain('OR'); // Oregon
      expect(codes).toContain('MT'); // Montana
      expect(codes).toContain('DE'); // Delaware
      expect(codes).toContain('NH'); // New Hampshire
    });

    it('should include Alaska (no state tax but has local)', () => {
      const noTaxStates = getNoTaxStates();
      const alaska = noTaxStates.find(s => s.stateCode === 'AK');
      expect(alaska).toBeDefined();
      expect(alaska?.avgLocalRate).toBeGreaterThan(0);
    });

    it('should return 5 no-state-tax jurisdictions', () => {
      const noTaxStates = getNoTaxStates();
      // OR, MT, DE, NH, AK
      expect(noTaxStates.length).toBe(5);
    });
  });

  describe('getHighestTaxStates', () => {
    it('should return correct number of states', () => {
      expect(getHighestTaxStates(5).length).toBe(5);
      expect(getHighestTaxStates(10).length).toBe(10);
      expect(getHighestTaxStates(1).length).toBe(1);
    });

    it('should default to 5 states', () => {
      expect(getHighestTaxStates().length).toBe(5);
    });

    it('should return states sorted by combined rate descending', () => {
      const highest = getHighestTaxStates(10);
      for (let i = 1; i < highest.length; i++) {
        expect(highest[i - 1].combinedRate).toBeGreaterThanOrEqual(highest[i].combinedRate);
      }
    });

    it('should have Louisiana or Tennessee in top 5', () => {
      // These are known high-tax states
      const highest = getHighestTaxStates(5);
      const codes = highest.map(s => s.stateCode);
      expect(codes.includes('LA') || codes.includes('TN')).toBe(true);
    });

    it('should not include no-tax states', () => {
      const highest = getHighestTaxStates(10);
      highest.forEach(state => {
        expect(state.combinedRate).toBeGreaterThan(0);
      });
    });

    it('should not mutate original array', () => {
      const originalFirst = stateTaxRates[0];
      getHighestTaxStates(10);
      expect(stateTaxRates[0]).toEqual(originalFirst);
    });
  });

  describe('calculateTax', () => {
    it('should calculate tax correctly for California', () => {
      const result = calculateTax(100, 'CA');
      expect(result).not.toBeNull();
      expect(result?.rate).toBe(8.82); // CA combined rate
      expect(result?.tax).toBe(8.82);
      expect(result?.total).toBe(108.82);
    });

    it('should calculate tax correctly for no-tax states', () => {
      const oregon = calculateTax(100, 'OR');
      expect(oregon?.tax).toBe(0);
      expect(oregon?.total).toBe(100);
      expect(oregon?.rate).toBe(0);

      const montana = calculateTax(100, 'MT');
      expect(montana?.tax).toBe(0);
      expect(montana?.total).toBe(100);
    });

    it('should return null for invalid state codes', () => {
      expect(calculateTax(100, 'XX')).toBeNull();
      expect(calculateTax(100, '')).toBeNull();
      expect(calculateTax(100, 'California')).toBeNull();
    });

    it('should be case-insensitive', () => {
      const upper = calculateTax(100, 'NY');
      const lower = calculateTax(100, 'ny');
      expect(upper).toEqual(lower);
    });

    it('should round to 2 decimal places', () => {
      // Test with amount that would create many decimal places
      const result = calculateTax(99.99, 'CA'); // 8.82% tax
      expect(result?.tax.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(2);
      expect(result?.total.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(2);
    });

    it('should handle large amounts', () => {
      const result = calculateTax(1000000, 'TX');
      expect(result).not.toBeNull();
      expect(result?.tax).toBeGreaterThan(80000); // 8.19% of 1M
      expect(result?.total).toBeGreaterThan(1080000);
    });

    it('should handle small amounts', () => {
      const result = calculateTax(0.01, 'CA');
      expect(result?.tax).toBeGreaterThanOrEqual(0);
      expect(result?.total).toBeGreaterThanOrEqual(0.01);
    });

    it('should handle zero amount', () => {
      const result = calculateTax(0, 'CA');
      expect(result?.tax).toBe(0);
      expect(result?.total).toBe(0);
    });

    it('should calculate correctly for Alaska (local tax only)', () => {
      const result = calculateTax(100, 'AK');
      expect(result?.rate).toBe(1.82); // Only local tax
      expect(result?.tax).toBe(1.82);
      expect(result?.total).toBe(101.82);
    });
  });

  describe('specific state validations', () => {
    it('should have correct rate for California', () => {
      const ca = getStateByCode('CA');
      expect(ca?.stateRate).toBe(7.25);
      expect(ca?.combinedRate).toBe(8.82);
    });

    it('should have correct rate for Texas', () => {
      const tx = getStateByCode('TX');
      expect(tx?.stateRate).toBe(6.25);
      expect(tx?.combinedRate).toBe(8.19);
    });

    it('should have correct rate for New York', () => {
      const ny = getStateByCode('NY');
      expect(ny?.stateRate).toBe(4);
      expect(ny?.combinedRate).toBe(8.52);
    });

    it('should have Hawaii marked as GET tax', () => {
      const hi = getStateByCode('HI');
      expect(hi?.notes).toContain('GET');
    });

    it('should have New Mexico marked as gross receipts', () => {
      const nm = getStateByCode('NM');
      expect(nm?.notes).toContain('Gross receipts');
    });
  });
});
