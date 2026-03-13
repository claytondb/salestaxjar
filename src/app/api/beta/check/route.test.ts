/**
 * Tests for /api/beta/check route
 *
 * Tests the beta invitation check endpoint.
 * Covers validation, invited/redeemed status, and error handling.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    betaUser: {
      findUnique: vi.fn(),
    },
  },
}));

import { POST } from './route';
import { prisma } from '@/lib/prisma';

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/beta/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const mockPrisma = prisma as unknown as {
  betaUser: { findUnique: ReturnType<typeof vi.fn> };
};

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.betaUser.findUnique.mockResolvedValue(null);
});

// =============================================================================
// POST /api/beta/check - Validation
// =============================================================================

describe('POST /api/beta/check - validation', () => {
  it('should return 400 when email is missing', async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/email/i);
  });

  it('should normalize email to lowercase before lookup', async () => {
    await POST(makeRequest({ email: 'INVITED@EXAMPLE.COM' }));
    expect(mockPrisma.betaUser.findUnique).toHaveBeenCalledWith({
      where: { email: 'invited@example.com' },
    });
  });
});

// =============================================================================
// POST /api/beta/check - Not Invited
// =============================================================================

describe('POST /api/beta/check - not invited', () => {
  it('should return isInvited:false when email not in beta list', async () => {
    const res = await POST(makeRequest({ email: 'notinvited@example.com' }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.isInvited).toBe(false);
    expect(data.message).toBeDefined();
  });
});

// =============================================================================
// POST /api/beta/check - Invited
// =============================================================================

describe('POST /api/beta/check - invited', () => {
  it('should return isInvited:true for invited user', async () => {
    mockPrisma.betaUser.findUnique.mockResolvedValueOnce({
      id: 'bu1',
      email: 'invited@example.com',
      name: 'Alice',
      status: 'invited',
      redeemedUserId: null,
    });

    const res = await POST(makeRequest({ email: 'invited@example.com' }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.isInvited).toBe(true);
    expect(data.alreadyRedeemed).toBe(false);
    expect(data.name).toBe('Alice');
  });

  it('should include user name in response', async () => {
    mockPrisma.betaUser.findUnique.mockResolvedValueOnce({
      id: 'bu1',
      email: 'invited@example.com',
      name: 'Bob',
      status: 'invited',
      redeemedUserId: null,
    });

    const res = await POST(makeRequest({ email: 'invited@example.com' }));
    const data = await res.json();
    expect(data.name).toBe('Bob');
  });
});

// =============================================================================
// POST /api/beta/check - Already Redeemed
// =============================================================================

describe('POST /api/beta/check - already redeemed', () => {
  it('should return alreadyRedeemed truthy for redeemed user', async () => {
    mockPrisma.betaUser.findUnique.mockResolvedValueOnce({
      id: 'bu1',
      email: 'redeemed@example.com',
      name: 'Carol',
      status: 'redeemed',
      redeemedUserId: 'user-123',
    });

    const res = await POST(makeRequest({ email: 'redeemed@example.com' }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.isInvited).toBe(true);
    expect(data.alreadyRedeemed).toBeTruthy();
  });

  it('should indicate login needed for redeemed user', async () => {
    mockPrisma.betaUser.findUnique.mockResolvedValueOnce({
      id: 'bu1',
      email: 'redeemed@example.com',
      name: 'Carol',
      status: 'redeemed',
      redeemedUserId: 'user-123',
    });

    const res = await POST(makeRequest({ email: 'redeemed@example.com' }));
    const data = await res.json();
    expect(data.message).toMatch(/log in/i);
  });

  it('should not mark as redeemed when userId is null despite redeemed status', async () => {
    // Edge case: status is redeemed but no redeemedUserId
    mockPrisma.betaUser.findUnique.mockResolvedValueOnce({
      id: 'bu2',
      email: 'partial@example.com',
      name: 'Dave',
      status: 'redeemed',
      redeemedUserId: null,
    });

    const res = await POST(makeRequest({ email: 'partial@example.com' }));
    const data = await res.json();
    expect(data.isInvited).toBe(true);
    // alreadyRedeemed requires BOTH status='redeemed' AND redeemedUserId set
    // When redeemedUserId is null, the && short-circuits to null (falsy)
    expect(data.alreadyRedeemed).toBeFalsy();
  });
});

// =============================================================================
// POST /api/beta/check - Error Handling
// =============================================================================

describe('POST /api/beta/check - error handling', () => {
  it('should return 500 when database throws', async () => {
    mockPrisma.betaUser.findUnique.mockRejectedValueOnce(new Error('DB error'));
    const res = await POST(makeRequest({ email: 'test@example.com' }));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });
});
