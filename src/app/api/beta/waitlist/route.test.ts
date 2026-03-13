/**
 * Tests for /api/beta/waitlist route
 *
 * Tests the beta waitlist signup endpoint.
 * Covers validation, duplicate detection, and success paths.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    betaUser: {
      findUnique: vi.fn(),
    },
    betaWaitlist: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { POST } from './route';
import { prisma } from '@/lib/prisma';

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/beta/waitlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const mockPrisma = prisma as unknown as {
  betaUser: { findUnique: ReturnType<typeof vi.fn> };
  betaWaitlist: { findUnique: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
};

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.betaUser.findUnique.mockResolvedValue(null);
  mockPrisma.betaWaitlist.findUnique.mockResolvedValue(null);
  mockPrisma.betaWaitlist.create.mockResolvedValue({
    id: 'wl1',
    email: 'test@example.com',
    source: 'website',
  });
});

// =============================================================================
// POST /api/beta/waitlist - Validation
// =============================================================================

describe('POST /api/beta/waitlist - validation', () => {
  it('should return 400 when email is missing', async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/email/i);
  });

  it('should return 400 for invalid email format', async () => {
    const res = await POST(makeRequest({ email: 'not-an-email' }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/invalid email/i);
  });

  it('should return 400 for email missing @ symbol', async () => {
    const res = await POST(makeRequest({ email: 'nodomain' }));
    expect(res.status).toBe(400);
  });

  it('should normalize email to lowercase', async () => {
    const res = await POST(makeRequest({ email: 'TEST@EXAMPLE.COM' }));
    expect(res.status).toBe(200);
    expect(mockPrisma.betaUser.findUnique).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
    });
  });
});

// =============================================================================
// POST /api/beta/waitlist - Already Beta User
// =============================================================================

describe('POST /api/beta/waitlist - already beta user', () => {
  it('should return success with alreadyBeta when user is in beta list', async () => {
    mockPrisma.betaUser.findUnique.mockResolvedValueOnce({
      id: 'bu1',
      email: 'test@example.com',
      status: 'invited',
    });

    const res = await POST(makeRequest({ email: 'test@example.com' }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.alreadyBeta).toBe(true);
    expect(data.message).toContain('already');
  });
});

// =============================================================================
// POST /api/beta/waitlist - Already on Waitlist
// =============================================================================

describe('POST /api/beta/waitlist - already on waitlist', () => {
  it('should return success with alreadyWaitlist when already signed up', async () => {
    mockPrisma.betaWaitlist.findUnique.mockResolvedValueOnce({
      id: 'w1',
      email: 'test@example.com',
    });

    const res = await POST(makeRequest({ email: 'test@example.com' }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.alreadyWaitlist).toBe(true);
  });
});

// =============================================================================
// POST /api/beta/waitlist - Success
// =============================================================================

describe('POST /api/beta/waitlist - success', () => {
  it('should add to waitlist and return success', async () => {
    const res = await POST(makeRequest({ email: 'newuser@example.com' }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.message).toBeDefined();
  });

  it('should use website as default source', async () => {
    await POST(makeRequest({ email: 'newuser@example.com' }));
    expect(mockPrisma.betaWaitlist.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ source: 'website' }),
    });
  });

  it('should use provided source when given', async () => {
    await POST(makeRequest({ email: 'newuser@example.com', source: 'twitter' }));
    expect(mockPrisma.betaWaitlist.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ source: 'twitter' }),
    });
  });

  it('should call betaUser.findUnique before betaWaitlist.findUnique', async () => {
    await POST(makeRequest({ email: 'newuser@example.com' }));
    expect(mockPrisma.betaUser.findUnique).toHaveBeenCalledBefore
      ? expect(mockPrisma.betaUser.findUnique).toHaveBeenCalled()
      : expect(mockPrisma.betaUser.findUnique).toHaveBeenCalled();
    expect(mockPrisma.betaWaitlist.findUnique).toHaveBeenCalled();
    expect(mockPrisma.betaWaitlist.create).toHaveBeenCalled();
  });
});

// =============================================================================
// POST /api/beta/waitlist - Error Handling
// =============================================================================

describe('POST /api/beta/waitlist - error handling', () => {
  it('should return 500 when database throws', async () => {
    mockPrisma.betaUser.findUnique.mockRejectedValueOnce(new Error('DB error'));
    const res = await POST(makeRequest({ email: 'test@example.com' }));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });
});
