/**
 * Tests for /api/usage route
 *
 * Tests plan usage reporting: current order count vs limit,
 * billing period, and tier-based limit enforcement.
 * Uses mocks for database and authentication.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing route
vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    importedOrder: {
      count: vi.fn(),
    },
  },
}));

vi.mock('@/lib/plans', () => ({
  resolveUserPlan: vi.fn(),
  checkOrderLimit: vi.fn(),
  getOrderLimitDisplay: vi.fn(),
  getPlanDisplayName: vi.fn(),
}));

import { GET } from './route';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { resolveUserPlan, checkOrderLimit, getOrderLimitDisplay, getPlanDisplayName } from '@/lib/plans';

// =============================================================================
// Mock Data
// =============================================================================

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  emailVerified: true,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  subscription: null,
};

const mockUserStarter = {
  ...mockUser,
  subscription: {
    stripeSubscriptionId: 'sub_123',
    plan: 'starter',
    status: 'active',
    currentPeriodEnd: new Date('2026-04-01T00:00:00Z'),
    cancelAtPeriodEnd: false,
  },
};

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
  vi.mocked(prisma.importedOrder.count).mockResolvedValue(25);
  vi.mocked(resolveUserPlan).mockReturnValue('free');
  vi.mocked(checkOrderLimit).mockReturnValue({
    allowed: true,
    limit: 50,
    remaining: 25,
    upgradeNeeded: false,
  });
  vi.mocked(getOrderLimitDisplay).mockReturnValue('50/month');
  vi.mocked(getPlanDisplayName).mockReturnValue('Free');
});

// =============================================================================
// Authentication Tests
// =============================================================================

describe('GET /api/usage - authentication', () => {
  it('should return 401 when not authenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('should return usage data when authenticated', async () => {
    const response = await GET();
    expect(response.status).toBe(200);
  });
});

// =============================================================================
// Response Format Tests
// =============================================================================

describe('GET /api/usage - response format', () => {
  it('should return plan name', async () => {
    const response = await GET();
    const body = await response.json();
    expect(body.plan).toBe('free');
    expect(body.planName).toBe('Free');
  });

  it('should return orders object with usage data', async () => {
    const response = await GET();
    const body = await response.json();
    expect(body.orders).toBeDefined();
    expect(body.orders.current).toBe(25);
    expect(body.orders.limit).toBe(50);
    expect(body.orders.limitDisplay).toBe('50/month');
    expect(body.orders.remaining).toBe(25);
  });

  it('should return percent used', async () => {
    const response = await GET();
    const body = await response.json();
    expect(body.orders.percentUsed).toBe(50); // 25/50 * 100
  });

  it('should return atLimit flag', async () => {
    const response = await GET();
    const body = await response.json();
    expect(body.orders.atLimit).toBe(false);
  });

  it('should return upgradeNeeded flag', async () => {
    const response = await GET();
    const body = await response.json();
    expect(body.orders.upgradeNeeded).toBe(false);
  });

  it('should return billing period with start and end', async () => {
    const response = await GET();
    const body = await response.json();
    expect(body.billingPeriod).toBeDefined();
    expect(body.billingPeriod.start).toBeDefined();
    expect(body.billingPeriod.end).toBeDefined();
    // Should be ISO strings
    expect(() => new Date(body.billingPeriod.start)).not.toThrow();
    expect(() => new Date(body.billingPeriod.end)).not.toThrow();
  });
});

// =============================================================================
// Plan Tier Tests
// =============================================================================

describe('GET /api/usage - free tier', () => {
  it('should return free plan data correctly', async () => {
    vi.mocked(resolveUserPlan).mockReturnValue('free');
    vi.mocked(getPlanDisplayName).mockReturnValue('Free');
    vi.mocked(checkOrderLimit).mockReturnValue({
      allowed: true,
      limit: 50,
      remaining: 40,
      upgradeNeeded: false,
    });
    vi.mocked(prisma.importedOrder.count).mockResolvedValue(10);
    const response = await GET();
    const body = await response.json();
    expect(body.plan).toBe('free');
    expect(body.orders.current).toBe(10);
    expect(body.orders.limit).toBe(50);
    expect(body.orders.percentUsed).toBe(20);
  });

  it('should flag atLimit when free tier is full', async () => {
    vi.mocked(prisma.importedOrder.count).mockResolvedValue(50);
    vi.mocked(checkOrderLimit).mockReturnValue({
      allowed: false,
      limit: 50,
      remaining: 0,
      upgradeNeeded: true,
    });
    const response = await GET();
    const body = await response.json();
    expect(body.orders.atLimit).toBe(true);
    expect(body.orders.upgradeNeeded).toBe(true);
    expect(body.orders.remaining).toBe(0);
  });
});

describe('GET /api/usage - starter tier', () => {
  it('should return starter plan data correctly', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(mockUserStarter);
    vi.mocked(resolveUserPlan).mockReturnValue('starter');
    vi.mocked(getPlanDisplayName).mockReturnValue('Starter');
    vi.mocked(getOrderLimitDisplay).mockReturnValue('500/month');
    vi.mocked(checkOrderLimit).mockReturnValue({
      allowed: true,
      limit: 500,
      remaining: 350,
      upgradeNeeded: false,
    });
    vi.mocked(prisma.importedOrder.count).mockResolvedValue(150);
    const response = await GET();
    const body = await response.json();
    expect(body.plan).toBe('starter');
    expect(body.planName).toBe('Starter');
    expect(body.orders.limit).toBe(500);
    expect(body.orders.current).toBe(150);
  });
});

describe('GET /api/usage - unlimited plan', () => {
  it('should return 0 percentUsed when limit is null', async () => {
    vi.mocked(resolveUserPlan).mockReturnValue('growth');
    vi.mocked(checkOrderLimit).mockReturnValue({
      allowed: true,
      limit: null,
      remaining: null,
      upgradeNeeded: false,
    });
    vi.mocked(prisma.importedOrder.count).mockResolvedValue(9999);
    const response = await GET();
    const body = await response.json();
    expect(body.orders.percentUsed).toBe(0); // null limit → 0%
    expect(body.orders.atLimit).toBe(false);
  });

  it('should return 0 percentUsed when limit is 0', async () => {
    vi.mocked(checkOrderLimit).mockReturnValue({
      allowed: true,
      limit: 0,
      remaining: 0,
      upgradeNeeded: false,
    });
    vi.mocked(prisma.importedOrder.count).mockResolvedValue(0);
    const response = await GET();
    const body = await response.json();
    expect(body.orders.percentUsed).toBe(0);
  });
});

// =============================================================================
// Billing Period Tests
// =============================================================================

describe('GET /api/usage - billing period', () => {
  it('should return the start of current month as billing start', async () => {
    const response = await GET();
    const body = await response.json();
    const start = new Date(body.billingPeriod.start);
    expect(start.getDate()).toBe(1);
    expect(start.getHours()).toBe(0);
  });

  it('should return the end of current month as billing end', async () => {
    const response = await GET();
    const body = await response.json();
    const end = new Date(body.billingPeriod.end);
    // End of month — next day would be first of next month
    const nextDay = new Date(end);
    nextDay.setDate(nextDay.getDate() + 1);
    expect(nextDay.getDate()).toBe(1);
  });
});

// =============================================================================
// Order Count Tests
// =============================================================================

describe('GET /api/usage - order counting', () => {
  it('should count orders from start of current month', async () => {
    await GET();
    expect(prisma.importedOrder.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user-123',
          createdAt: expect.objectContaining({ gte: expect.any(Date) }),
        }),
      })
    );
  });

  it('should count only current user orders', async () => {
    await GET();
    const callArgs = vi.mocked(prisma.importedOrder.count).mock.calls[0][0];
    expect(callArgs?.where?.userId).toBe('user-123');
  });

  it('should return 0 percent used when no orders', async () => {
    vi.mocked(prisma.importedOrder.count).mockResolvedValue(0);
    vi.mocked(checkOrderLimit).mockReturnValue({
      allowed: true,
      limit: 50,
      remaining: 50,
      upgradeNeeded: false,
    });
    const response = await GET();
    const body = await response.json();
    expect(body.orders.current).toBe(0);
    expect(body.orders.percentUsed).toBe(0);
  });
});

// =============================================================================
// Error Handling
// =============================================================================

describe('GET /api/usage - error handling', () => {
  it('should return 500 on database error', async () => {
    vi.mocked(prisma.importedOrder.count).mockRejectedValue(new Error('DB error'));
    const response = await GET();
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Failed to fetch usage data');
  });

  it('should return 500 on plans error', async () => {
    vi.mocked(resolveUserPlan).mockImplementation(() => {
      throw new Error('Plans error');
    });
    const response = await GET();
    expect(response.status).toBe(500);
  });
});
