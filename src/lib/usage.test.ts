/**
 * Unit tests for usage.ts
 * Tests usage tracking helper functions and billing period calculations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock prisma before importing usage.ts
vi.mock('./prisma', () => ({
  prisma: {
    importedOrder: {
      count: vi.fn().mockResolvedValue(0),
    },
  },
}));

import { getCurrentBillingPeriod } from './usage';

describe('usage.ts', () => {
  describe('getCurrentBillingPeriod', () => {
    beforeEach(() => {
      // Mock Date to have consistent tests
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns start of current month', () => {
      // Use midday to avoid timezone issues
      vi.setSystemTime(new Date('2026-03-15T12:30:00.000Z'));
      const { start } = getCurrentBillingPeriod();
      
      expect(start.getFullYear()).toBe(2026);
      expect(start.getMonth()).toBe(2); // March (0-indexed)
      expect(start.getDate()).toBe(1);
      expect(start.getHours()).toBe(0);
      expect(start.getMinutes()).toBe(0);
      expect(start.getSeconds()).toBe(0);
    });

    it('returns end of current month', () => {
      vi.setSystemTime(new Date('2026-03-15T12:30:00.000Z'));
      const { end } = getCurrentBillingPeriod();
      
      expect(end.getFullYear()).toBe(2026);
      expect(end.getMonth()).toBe(2); // March
      expect(end.getDate()).toBe(31); // March has 31 days
      expect(end.getHours()).toBe(23);
      expect(end.getMinutes()).toBe(59);
      expect(end.getSeconds()).toBe(59);
    });

    it('handles January correctly', () => {
      vi.setSystemTime(new Date('2026-01-20T12:00:00.000Z'));
      const { start, end } = getCurrentBillingPeriod();
      
      expect(start.getMonth()).toBe(0); // January
      expect(start.getDate()).toBe(1);
      expect(end.getMonth()).toBe(0);
      expect(end.getDate()).toBe(31);
    });

    it('handles February in non-leap year', () => {
      vi.setSystemTime(new Date('2025-02-15T12:00:00.000Z'));
      const { end } = getCurrentBillingPeriod();
      
      expect(end.getMonth()).toBe(1); // February
      expect(end.getDate()).toBe(28);
    });

    it('handles February in leap year', () => {
      vi.setSystemTime(new Date('2024-02-15T12:00:00.000Z'));
      const { end } = getCurrentBillingPeriod();
      
      expect(end.getMonth()).toBe(1); // February
      expect(end.getDate()).toBe(29);
    });

    it('handles December correctly (year boundary)', () => {
      vi.setSystemTime(new Date('2026-12-25T12:00:00.000Z'));
      const { start, end } = getCurrentBillingPeriod();
      
      expect(start.getFullYear()).toBe(2026);
      expect(start.getMonth()).toBe(11); // December
      expect(start.getDate()).toBe(1);
      
      expect(end.getFullYear()).toBe(2026);
      expect(end.getMonth()).toBe(11);
      expect(end.getDate()).toBe(31);
    });

    it('handles first day of month', () => {
      vi.setSystemTime(new Date('2026-04-01T12:00:00.000Z'));
      const { start, end } = getCurrentBillingPeriod();
      
      expect(start.getDate()).toBe(1);
      expect(end.getMonth()).toBe(3); // April
      expect(end.getDate()).toBe(30); // April has 30 days
    });

    it('handles last day of month', () => {
      vi.setSystemTime(new Date('2026-04-30T12:00:00.000Z'));
      const { start, end } = getCurrentBillingPeriod();
      
      expect(start.getDate()).toBe(1);
      expect(end.getDate()).toBe(30);
    });

    it('handles 30-day months', () => {
      // April, June, September, November
      vi.setSystemTime(new Date('2026-06-15T12:00:00.000Z'));
      const { end } = getCurrentBillingPeriod();
      expect(end.getDate()).toBe(30);

      vi.setSystemTime(new Date('2026-09-15T12:00:00.000Z'));
      const { end: end2 } = getCurrentBillingPeriod();
      expect(end2.getDate()).toBe(30);

      vi.setSystemTime(new Date('2026-11-15T12:00:00.000Z'));
      const { end: end3 } = getCurrentBillingPeriod();
      expect(end3.getDate()).toBe(30);
    });

    it('handles 31-day months', () => {
      // January, March, May, July, August, October, December
      vi.setSystemTime(new Date('2026-07-15T12:00:00.000Z'));
      const { end } = getCurrentBillingPeriod();
      expect(end.getDate()).toBe(31);

      vi.setSystemTime(new Date('2026-08-15T12:00:00.000Z'));
      const { end: end2 } = getCurrentBillingPeriod();
      expect(end2.getDate()).toBe(31);
    });

    it('returns Date objects', () => {
      vi.setSystemTime(new Date('2026-03-15T12:30:00.000Z'));
      const { start, end } = getCurrentBillingPeriod();
      
      expect(start).toBeInstanceOf(Date);
      expect(end).toBeInstanceOf(Date);
    });

    it('start is always before end', () => {
      vi.setSystemTime(new Date('2026-03-15T12:30:00.000Z'));
      const { start, end } = getCurrentBillingPeriod();
      
      expect(start.getTime()).toBeLessThan(end.getTime());
    });

    it('end time includes milliseconds for end of day', () => {
      vi.setSystemTime(new Date('2026-03-15T12:30:00.000Z'));
      const { end } = getCurrentBillingPeriod();
      
      expect(end.getMilliseconds()).toBe(999);
    });
  });
});
