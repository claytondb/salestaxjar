/**
 * Unit tests for Nexus Alert System
 * 
 * Tests alert message generation, level hierarchy, and helper functions.
 * Database-dependent functions (checkAndCreateAlerts, getUserAlerts, markAlertsRead)
 * require integration testing with a test database.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma before importing the module
vi.mock('./prisma', () => ({
  prisma: {
    nexusAlert: {
      findMany: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
    notificationPreference: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock email-alerts module
vi.mock('./email-alerts', () => ({
  sendNexusAlertEmail: vi.fn().mockResolvedValue({ success: true }),
}));

// Mock sales-aggregation
vi.mock('./sales-aggregation', () => ({
  getExposureTotals: vi.fn().mockResolvedValue(new Map()),
}));

import {
  ALERT_LEVEL_ORDER,
  generateAlertMessage,
  NexusAlertResult,
} from './nexus-alerts';

describe('nexus-alerts', () => {
  describe('ALERT_LEVEL_ORDER', () => {
    it('should define correct hierarchy', () => {
      expect(ALERT_LEVEL_ORDER['safe']).toBe(0);
      expect(ALERT_LEVEL_ORDER['approaching']).toBe(1);
      expect(ALERT_LEVEL_ORDER['warning']).toBe(2);
      expect(ALERT_LEVEL_ORDER['exceeded']).toBe(3);
    });

    it('should have safe as lowest priority', () => {
      expect(ALERT_LEVEL_ORDER['safe']).toBeLessThan(ALERT_LEVEL_ORDER['approaching']);
      expect(ALERT_LEVEL_ORDER['safe']).toBeLessThan(ALERT_LEVEL_ORDER['warning']);
      expect(ALERT_LEVEL_ORDER['safe']).toBeLessThan(ALERT_LEVEL_ORDER['exceeded']);
    });

    it('should have exceeded as highest priority', () => {
      expect(ALERT_LEVEL_ORDER['exceeded']).toBeGreaterThan(ALERT_LEVEL_ORDER['safe']);
      expect(ALERT_LEVEL_ORDER['exceeded']).toBeGreaterThan(ALERT_LEVEL_ORDER['approaching']);
      expect(ALERT_LEVEL_ORDER['exceeded']).toBeGreaterThan(ALERT_LEVEL_ORDER['warning']);
    });

    it('should have correct order: safe < approaching < warning < exceeded', () => {
      const levels = ['safe', 'approaching', 'warning', 'exceeded'];
      for (let i = 0; i < levels.length - 1; i++) {
        expect(ALERT_LEVEL_ORDER[levels[i]]).toBeLessThan(ALERT_LEVEL_ORDER[levels[i + 1]]);
      }
    });
  });

  describe('generateAlertMessage', () => {
    describe('exceeded level messages', () => {
      it('should generate exceeded message correctly', () => {
        const message = generateAlertMessage('California', 'exceeded', 600000, 500000, 120);
        
        expect(message).toContain('California');
        expect(message).toContain('$600,000');
        expect(message).toContain('exceeding');
        expect(message).toContain('$500,000');
        expect(message).toContain('register');
      });

      it('should work with small amounts', () => {
        const message = generateAlertMessage('Texas', 'exceeded', 150000, 100000, 150);
        
        expect(message).toContain('Texas');
        expect(message).toContain('$150,000');
        expect(message).toContain('$100,000');
      });

      it('should work with large amounts', () => {
        const message = generateAlertMessage('New York', 'exceeded', 2500000, 500000, 500);
        
        expect(message).toContain('New York');
        expect(message).toContain('$2,500,000');
      });
    });

    describe('warning level messages', () => {
      it('should generate warning message with percentage', () => {
        const message = generateAlertMessage('Florida', 'warning', 90000, 100000, 90);
        
        expect(message).toContain('Florida');
        expect(message).toContain('$90,000');
        expect(message).toContain('90%');
        expect(message).toContain('$100,000');
        expect(message).toContain('register soon');
      });

      it('should round percentage in message', () => {
        const message = generateAlertMessage('Georgia', 'warning', 92500, 100000, 92.5);
        
        expect(message).toContain('93%'); // Rounded
      });
    });

    describe('approaching level messages', () => {
      it('should generate approaching message with percentage', () => {
        const message = generateAlertMessage('Illinois', 'approaching', 75000, 100000, 75);
        
        expect(message).toContain('Illinois');
        expect(message).toContain('$75,000');
        expect(message).toContain('75%');
        expect(message).toContain('Keep an eye');
      });

      it('should work with threshold at 75%', () => {
        const message = generateAlertMessage('Ohio', 'approaching', 375000, 500000, 75);
        
        expect(message).toContain('Ohio');
        expect(message).toContain('$375,000');
        expect(message).toContain('$500,000');
      });
    });

    describe('safe level messages', () => {
      it('should generate basic message for safe level', () => {
        const message = generateAlertMessage('Arizona', 'safe', 50000, 100000, 50);
        
        expect(message).toContain('Arizona');
        expect(message).toContain('$50,000');
      });
    });

    describe('currency formatting', () => {
      it('should format amounts with commas', () => {
        const message = generateAlertMessage('Nevada', 'exceeded', 1234567, 500000, 247);
        
        expect(message).toContain('$1,234,567');
        expect(message).toContain('$500,000');
      });

      it('should not show cents', () => {
        const message = generateAlertMessage('Colorado', 'exceeded', 500000.99, 500000, 100);
        
        // Should not contain decimal point in currency
        expect(message).not.toMatch(/\$[\d,]+\.\d{2}/);
      });

      it('should handle zero sales', () => {
        const message = generateAlertMessage('Utah', 'safe', 0, 100000, 0);
        
        expect(message).toContain('$0');
        expect(message).toContain('Utah');
      });
    });

    describe('state name handling', () => {
      it('should handle two-word state names', () => {
        const message = generateAlertMessage('New York', 'exceeded', 600000, 500000, 120);
        expect(message).toContain('New York');
      });

      it('should handle three-word state names', () => {
        const message = generateAlertMessage('District of Columbia', 'exceeded', 150000, 100000, 150);
        expect(message).toContain('District of Columbia');
      });

      it('should handle single-word state names', () => {
        const message = generateAlertMessage('Texas', 'exceeded', 600000, 500000, 120);
        expect(message).toContain('Texas');
      });
    });
  });

  describe('NexusAlertResult interface', () => {
    it('should accept valid alert result object', () => {
      const result: NexusAlertResult = {
        stateCode: 'CA',
        stateName: 'California',
        alertLevel: 'exceeded',
        salesAmount: 600000,
        threshold: 500000,
        percentage: 120,
        message: 'Test message',
      };

      expect(result.stateCode).toBe('CA');
      expect(result.alertLevel).toBe('exceeded');
    });

    it('should accept warning level', () => {
      const result: NexusAlertResult = {
        stateCode: 'TX',
        stateName: 'Texas',
        alertLevel: 'warning',
        salesAmount: 450000,
        threshold: 500000,
        percentage: 90,
        message: 'Warning message',
      };

      expect(result.alertLevel).toBe('warning');
    });

    it('should accept approaching level', () => {
      const result: NexusAlertResult = {
        stateCode: 'FL',
        stateName: 'Florida',
        alertLevel: 'approaching',
        salesAmount: 75000,
        threshold: 100000,
        percentage: 75,
        message: 'Approaching message',
      };

      expect(result.alertLevel).toBe('approaching');
    });
  });
});
