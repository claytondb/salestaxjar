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
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

import { getCurrentBillingPeriod, applyMonthlyOrderCap, getCurrentMonthOrderCount, canImportOrders } from './usage';
import { prisma } from './prisma';

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

  describe('monthly order cap (counted by order date, per calendar month)', () => {
    type O = { id: string; date: string };
    const starter = { plan: 'starter', status: 'active' };
    const free = null;
    // existing orders per month key 'YYYY-MM'
    let existing: Record<string, number> = {};

    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-09-15T12:00:00.000Z'));
      existing = {};
      vi.mocked(prisma.importedOrder.count).mockReset().mockImplementation((async (args: { where: { orderDate: { gte: Date } } }) => {
        const d = args.where.orderDate.gte;
        const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
        return existing[key] ?? 0;
      }) as never);
      vi.mocked(prisma.importedOrder.findMany).mockReset().mockResolvedValue([] as never);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    const run = (items: O[], subscription: { plan: string; status: string } | null = starter) =>
      applyMonthlyOrderCap({
        userId: 'u1',
        subscription,
        platform: 'shopify',
        items,
        getOrderDate: (o) => new Date(o.date),
        getPlatformOrderId: (o) => o.id,
      });

    const month = (m: string, n: number, prefix: string) =>
      Array.from({ length: n }, (_, i) => ({ id: `${prefix}${i}`, date: `${m}-10T12:00:00Z` }));

    it('counts this month by orderDate, not import time', async () => {
      await getCurrentMonthOrderCount('u1');
      const args = vi.mocked(prisma.importedOrder.count).mock.calls[0][0] as { where: Record<string, unknown> };
      expect(args.where).toHaveProperty('orderDate');
      expect(args.where).not.toHaveProperty('createdAt');
    });

    it('imports history when every month is within the plan (300 orders/month on Starter)', async () => {
      const items = [...month('2025-10', 300, 'a'), ...month('2025-11', 300, 'b'), ...month('2026-09', 300, 'c')];
      const res = await run(items);
      expect(res.items).toHaveLength(900);
      expect(res.truncated).toBe(false);
    });

    it('caps each month separately — overflow from a busy month is not imported later', async () => {
      const res = await run(month('2026-08', 800, 'aug'));
      expect(res.items).toHaveLength(500);
      expect(res.skipped).toBe(300);
      expect(res.truncated).toBe(true);
    });

    it('counts orders already stored in a month against that month', async () => {
      existing = { '2026-09': 498 };
      const res = await run([...month('2026-09', 3, 'n'), ...month('2026-08', 2, 'o')]);
      expect(res.items.map((o) => o.id)).toEqual(['n0', 'n1', 'o0', 'o1']);
      expect(res.skipped).toBe(1);
      expect(res.remaining).toBe(0);
    });

    it('re-syncing already-imported orders never uses up capacity', async () => {
      existing = { '2026-09': 500 };
      vi.mocked(prisma.importedOrder.findMany).mockResolvedValue([{ platformOrderId: 'a' }, { platformOrderId: 'b' }] as never);
      const res = await run([
        { id: 'a', date: '2026-09-01T00:00:00Z' },
        { id: 'b', date: '2026-09-02T00:00:00Z' },
        { id: 'c', date: '2026-09-03T00:00:00Z' },
      ]);
      expect(res.items.map((o) => o.id)).toEqual(['a', 'b']);
      expect(res.skipped).toBe(1);
    });

    it('gives the free plan 50 orders a month, for each month', async () => {
      const res = await run([...month('2026-09', 60, 'x'), ...month('2026-07', 60, 'y')], free);
      expect(res.items).toHaveLength(100);
      expect(res.limit).toBe(50);
    });

    it('does not limit unlimited plans', async () => {
      const res = await run(month('2026-09', 10, 'e'), { plan: 'enterprise', status: 'active' });
      expect(res.items).toHaveLength(10);
      expect(res.limit).toBeNull();
    });

    it('lets a user at this month\'s cap keep importing earlier months', async () => {
      existing = { '2026-09': 500 };
      const res = await canImportOrders('u1', starter);
      expect(res.allowed).toBe(true);
      expect(res.remaining).toBe(0);
    });
  });
});
