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

// Mock the order loader (the nexus engine itself runs for real)
vi.mock('./nexus-data', () => ({
  loadNexusInputs: vi.fn(),
}));

import {
  ALERT_LEVEL_ORDER,
  generateAlertMessage,
  checkAndCreateAlerts,
  NexusAlertResult,
} from './nexus-alerts';
import { loadNexusInputs } from './nexus-data';
import { emptyChannels, emptyCoverage, monthRange, type Registration, type StateMonths } from './nexus-engine';
import { prisma } from './prisma';
import { sendNexusAlertEmail } from './email-alerts';

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
        expect(message).toContain('over the');
        expect(message).toContain('register with');
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

describe('checkAndCreateAlerts (uses the nexus engine)', () => {
  const NOW = new Date('2026-07-01T12:00:00Z');
  const coverage = {
    ...emptyCoverage(),
    earliestOrder: new Date('2024-01-02T00:00:00Z'),
    latestOrder: new Date('2026-06-30T00:00:00Z'),
    direct: { earliest: new Date('2024-01-02T00:00:00Z'), latest: new Date('2026-06-30T00:00:00Z') },
  };

  /** state → list of [firstMonth, lastMonth, totalSales, totalOrders] spread evenly */
  function withSales(entries: Record<string, Array<[string, string, number, number]>>, registrations = new Map<string, Registration>()) {
    const byState = new Map<string, StateMonths>();
    for (const [code, ranges] of Object.entries(entries)) {
      const months: StateMonths = new Map();
      for (const [a, b, sales, orders] of ranges) {
        const keys = monthRange(a, b);
        for (const k of keys) {
          const bucket = months.get(k) ?? emptyChannels();
          bucket.direct.sales += sales / keys.length;
          bucket.direct.orders += Math.round(orders / keys.length);
          months.set(k, bucket);
        }
      }
      byState.set(code, months);
    }
    vi.mocked(loadNexusInputs).mockResolvedValue({ byState, coverage, registrations });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.nexusAlert.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.nexusAlert.create).mockResolvedValue({} as never);
    vi.mocked(prisma.nexusAlert.updateMany).mockResolvedValue({ count: 1 } as never);
    vi.mocked(prisma.notificationPreference.findUnique).mockResolvedValue(null as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ email: 'seller@example.com', name: 'Sam', emailVerified: true } as never);
    vi.mocked(sendNexusAlertEmail).mockResolvedValue({ success: true } as never);
  });

  it('creates alerts but emails only confirmed addresses', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ email: 'typo@example.com', name: 'Sam', emailVerified: false } as never);
    withSales({ WA: [['2026-01', '2026-06', 150_000, 700]] });
    const alerts = await checkAndCreateAlerts('user-1', NOW);
    expect(alerts).toHaveLength(1);
    expect(sendNexusAlertEmail).not.toHaveBeenCalled();
  });

  it('creates the exceeded alert plus the lower levels, and emails only the highest', async () => {
    withSales({ WA: [['2026-01', '2026-06', 150_000, 700]] });
    const alerts = await checkAndCreateAlerts('user-1', NOW);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({ stateCode: 'WA', alertLevel: 'exceeded', salesAmount: 150_000 });
    expect(prisma.nexusAlert.create).toHaveBeenCalledTimes(3);
    expect(sendNexusAlertEmail).toHaveBeenCalledTimes(1);
    expect(vi.mocked(sendNexusAlertEmail).mock.calls[0][0]).toMatchObject({
      stateCode: 'WA',
      summary: expect.stringContaining('$150,000'),
      detail: expect.stringContaining('Register for a sales tax permit in Washington'),
    });
  });

  it("uses each state's own window: sales outside Texas's last 12 months don't count as over now", async () => {
    withSales({ TX: [['2024-01', '2024-06', 100_000, 400], ['2025-07', '2026-06', 100_000, 400]] });
    const alerts = await checkAndCreateAlerts('user-1', NOW);
    expect(alerts).toEqual([]);
    expect(prisma.nexusAlert.create).not.toHaveBeenCalled();
  });

  it('gives next-year registration its own alert, even after a 90% warning', async () => {
    withSales({ FL: [['2025-01', '2025-12', 20_000, 100], ['2026-01', '2026-06', 120_000, 600]] });
    vi.mocked(prisma.nexusAlert.findMany).mockResolvedValue([
      { id: 'a1', stateCode: 'FL', alertLevel: 'warning' },
      { id: 'a2', stateCode: 'FL', alertLevel: 'approaching' },
    ] as never);
    const alerts = await checkAndCreateAlerts('user-1', NOW);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].alertLevel).toBe('next_year');
    expect(alerts[0].message).toContain('January 1, 2027');
  });

  it('skips states the seller marked as registered', async () => {
    withSales({ WA: [['2026-01', '2026-06', 150_000, 700]] }, new Map([['WA', 'registered' as Registration]]));
    const alerts = await checkAndCreateAlerts('user-1', NOW);
    expect(alerts).toEqual([]);
  });

  it('describes order-count crossings in orders, not dollars', async () => {
    withSales({ AR: [['2026-01', '2026-06', 20_000, 210]] });
    const alerts = await checkAndCreateAlerts('user-1', NOW);
    expect(alerts[0].message).toContain('210 orders');
    expect(alerts[0].message).not.toContain('over the $100,000');
  });

  it('does not repeat alerts that already exist', async () => {
    withSales({ WA: [['2026-01', '2026-06', 150_000, 700]] });
    vi.mocked(prisma.nexusAlert.findMany).mockResolvedValue([
      { id: 'a1', stateCode: 'WA', alertLevel: 'exceeded' },
      { id: 'a2', stateCode: 'WA', alertLevel: 'warning' },
      { id: 'a3', stateCode: 'WA', alertLevel: 'approaching' },
    ] as never);
    const alerts = await checkAndCreateAlerts('user-1', NOW);
    expect(alerts).toEqual([]);
    expect(sendNexusAlertEmail).not.toHaveBeenCalled();
  });

  it('respects the email preference', async () => {
    withSales({ WA: [['2026-01', '2026-06', 150_000, 700]] });
    vi.mocked(prisma.notificationPreference.findUnique).mockResolvedValue({ emailNexusAlerts: false } as never);
    const alerts = await checkAndCreateAlerts('user-1', NOW);
    expect(alerts).toHaveLength(1);
    expect(sendNexusAlertEmail).not.toHaveBeenCalled();
  });
});
