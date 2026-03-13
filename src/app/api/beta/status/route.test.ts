/**
 * Tests for /api/beta/status route
 *
 * Tests the beta slot status endpoint.
 * Returns total slots, filled count, remaining, and isFull flag.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    betaUser: {
      count: vi.fn(),
    },
  },
}));

import { GET } from './route';
import { prisma } from '@/lib/prisma';

const mockPrisma = prisma as unknown as {
  betaUser: { count: ReturnType<typeof vi.fn> };
};

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.betaUser.count.mockResolvedValue(10);
});

// =============================================================================
// GET /api/beta/status - Response Structure
// =============================================================================

describe('GET /api/beta/status - response structure', () => {
  it('should return 200 with status fields', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.totalSlots).toBeDefined();
    expect(data.slotsFilled).toBeDefined();
    expect(data.slotsRemaining).toBeDefined();
    expect(data.isFull).toBeDefined();
  });

  it('should report correct slot counts', async () => {
    mockPrisma.betaUser.count.mockResolvedValue(10);
    const res = await GET();
    const data = await res.json();
    expect(data.slotsFilled).toBe(10);
    expect(data.slotsRemaining).toBe(15); // 25 total - 10 filled
    expect(data.totalSlots).toBe(25);
  });

  it('should report isFull:false when slots remain', async () => {
    mockPrisma.betaUser.count.mockResolvedValue(20);
    const res = await GET();
    const data = await res.json();
    expect(data.isFull).toBe(false);
    expect(data.slotsRemaining).toBe(5);
  });

  it('should report isFull:true when all slots taken', async () => {
    mockPrisma.betaUser.count.mockResolvedValue(25);
    const res = await GET();
    const data = await res.json();
    expect(data.isFull).toBe(true);
    expect(data.slotsRemaining).toBe(0);
  });

  it('should not return negative slotsRemaining even if count exceeds total', async () => {
    mockPrisma.betaUser.count.mockResolvedValue(30); // More than 25
    const res = await GET();
    const data = await res.json();
    expect(data.slotsRemaining).toBe(0); // Math.max(0, ...)
    expect(data.isFull).toBe(true);
  });

  it('should query only invited and redeemed (not expired) users', async () => {
    await GET();
    expect(mockPrisma.betaUser.count).toHaveBeenCalledWith({
      where: {
        status: { in: ['invited', 'redeemed'] },
      },
    });
  });

  it('should return 0 filled when no beta users exist', async () => {
    mockPrisma.betaUser.count.mockResolvedValue(0);
    const res = await GET();
    const data = await res.json();
    expect(data.slotsFilled).toBe(0);
    expect(data.slotsRemaining).toBe(25);
    expect(data.isFull).toBe(false);
  });
});

// =============================================================================
// GET /api/beta/status - Error Handling
// =============================================================================

describe('GET /api/beta/status - error handling', () => {
  it('should return 500 when database throws', async () => {
    mockPrisma.betaUser.count.mockRejectedValueOnce(new Error('DB error'));
    const res = await GET();
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });
});
