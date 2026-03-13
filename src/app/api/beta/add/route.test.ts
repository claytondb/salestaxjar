/**
 * Tests for /api/beta/add route
 *
 * Tests the admin beta user management endpoint.
 * POST: add a beta user (admin-protected)
 * GET: list all beta users (admin-protected)
 * Covers auth, validation, duplicate handling, and error cases.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const ADMIN_SECRET = 'sails-beta-2026';

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    betaUser: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { GET, POST } from './route';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const mockGetCurrentUser = getCurrentUser as ReturnType<typeof vi.fn>;
const mockPrisma = prisma as unknown as {
  betaUser: {
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
};

function makePostRequest(body: unknown, authHeader?: string): NextRequest {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authHeader) headers['Authorization'] = authHeader;
  return new NextRequest('http://localhost:3000/api/beta/add', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

function makeGetRequest(authHeader?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (authHeader) headers['Authorization'] = authHeader;
  return new NextRequest('http://localhost:3000/api/beta/add', { headers });
}

const mockBetaUser = {
  id: 'bu1',
  email: 'new@example.com',
  name: 'Test User',
  source: 'manual',
  notes: null,
  status: 'invited',
  createdAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetCurrentUser.mockResolvedValue(null);
  mockPrisma.betaUser.findUnique.mockResolvedValue(null);
  mockPrisma.betaUser.findMany.mockResolvedValue([]);
  mockPrisma.betaUser.create.mockResolvedValue(mockBetaUser);
});

// =============================================================================
// POST /api/beta/add - Auth
// =============================================================================

describe('POST /api/beta/add - authentication', () => {
  it('should return 401 without auth when no admin logged in', async () => {
    const res = await POST(makePostRequest({ email: 'test@example.com' }));
    expect(res.status).toBe(401);
  });

  it('should accept admin secret header', async () => {
    const res = await POST(
      makePostRequest({ email: 'test@example.com' }, `Bearer ${ADMIN_SECRET}`)
    );
    expect(res.status).toBe(201);
  });

  it('should accept admin email login as auth', async () => {
    mockGetCurrentUser.mockResolvedValue({
      id: 'u1',
      email: 'ghwst.vr@gmail.com',
    });
    const res = await POST(makePostRequest({ email: 'test@example.com' }));
    expect(res.status).toBe(201);
  });

  it('should reject non-admin logged-in user', async () => {
    mockGetCurrentUser.mockResolvedValue({
      id: 'u2',
      email: 'notadmin@example.com',
    });
    const res = await POST(makePostRequest({ email: 'test@example.com' }));
    expect(res.status).toBe(401);
  });

  it('should reject wrong admin secret', async () => {
    const res = await POST(
      makePostRequest({ email: 'test@example.com' }, 'Bearer wrong-secret')
    );
    expect(res.status).toBe(401);
  });
});

// =============================================================================
// POST /api/beta/add - Validation
// =============================================================================

describe('POST /api/beta/add - validation', () => {
  it('should return 400 when email is missing', async () => {
    const res = await POST(makePostRequest({}, `Bearer ${ADMIN_SECRET}`));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/email/i);
  });

  it('should normalize email to lowercase', async () => {
    await POST(makePostRequest({ email: 'UPPER@EXAMPLE.COM' }, `Bearer ${ADMIN_SECRET}`));
    expect(mockPrisma.betaUser.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ email: 'upper@example.com' }),
    });
  });
});

// =============================================================================
// POST /api/beta/add - Duplicate Handling
// =============================================================================

describe('POST /api/beta/add - duplicate handling', () => {
  it('should return 409 when email already exists in beta list', async () => {
    mockPrisma.betaUser.findUnique.mockResolvedValueOnce(mockBetaUser);
    const res = await POST(
      makePostRequest({ email: 'existing@example.com' }, `Bearer ${ADMIN_SECRET}`)
    );
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toMatch(/already/i);
  });
});

// =============================================================================
// POST /api/beta/add - Success
// =============================================================================

describe('POST /api/beta/add - success', () => {
  it('should create beta user and return 201', async () => {
    const res = await POST(
      makePostRequest(
        { email: 'new@example.com', name: 'New User', source: 'referral' },
        `Bearer ${ADMIN_SECRET}`
      )
    );
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.betaUser).toBeDefined();
    expect(data.message).toContain('new@example.com');
  });

  it('should use manual as default source', async () => {
    await POST(makePostRequest({ email: 'new@example.com' }, `Bearer ${ADMIN_SECRET}`));
    expect(mockPrisma.betaUser.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ source: 'manual', status: 'invited' }),
    });
  });

  it('should use provided source and name', async () => {
    await POST(
      makePostRequest(
        { email: 'new@example.com', name: 'Test', source: 'event', notes: 'VIP' },
        `Bearer ${ADMIN_SECRET}`
      )
    );
    expect(mockPrisma.betaUser.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Test',
        source: 'event',
        notes: 'VIP',
      }),
    });
  });
});

// =============================================================================
// GET /api/beta/add - List Beta Users
// =============================================================================

describe('GET /api/beta/add - list beta users', () => {
  it('should return 401 without auth', async () => {
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(401);
  });

  it('should return beta users list with admin secret', async () => {
    mockPrisma.betaUser.findMany.mockResolvedValue([mockBetaUser]);
    const res = await GET(makeGetRequest(`Bearer ${ADMIN_SECRET}`));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.betaUsers)).toBe(true);
    expect(data.stats).toBeDefined();
  });

  it('should include stats in response', async () => {
    mockPrisma.betaUser.findMany.mockResolvedValue([
      { ...mockBetaUser, status: 'invited' },
      { ...mockBetaUser, id: 'bu2', email: 'r@example.com', status: 'redeemed' },
    ]);
    const res = await GET(makeGetRequest(`Bearer ${ADMIN_SECRET}`));
    const data = await res.json();
    expect(data.stats.total).toBe(2);
    expect(data.stats.invited).toBe(1);
    expect(data.stats.redeemed).toBe(1);
  });

  it('should order by createdAt desc', async () => {
    await GET(makeGetRequest(`Bearer ${ADMIN_SECRET}`));
    expect(mockPrisma.betaUser.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: 'desc' },
    });
  });

  it('should return 500 on database error', async () => {
    mockPrisma.betaUser.findMany.mockRejectedValueOnce(new Error('DB error'));
    const res = await GET(makeGetRequest(`Bearer ${ADMIN_SECRET}`));
    expect(res.status).toBe(500);
  });
});

// =============================================================================
// POST /api/beta/add - Error Handling
// =============================================================================

describe('POST /api/beta/add - error handling', () => {
  it('should return 500 on database error', async () => {
    mockPrisma.betaUser.create.mockRejectedValueOnce(new Error('DB error'));
    const res = await POST(
      makePostRequest({ email: 'new@example.com' }, `Bearer ${ADMIN_SECRET}`)
    );
    expect(res.status).toBe(500);
  });
});
