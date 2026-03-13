/**
 * Tests for /api/beta/reminder route
 *
 * Tests the beta reminder preference endpoint.
 * POST with action='set' or action='cancel' for email/user.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    betaUser: {
      update: vi.fn(),
    },
  },
}));

import { POST } from './route';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const mockGetCurrentUser = getCurrentUser as ReturnType<typeof vi.fn>;
const mockPrisma = prisma as unknown as {
  betaUser: { update: ReturnType<typeof vi.fn> };
};

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/beta/reminder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetCurrentUser.mockResolvedValue(null);
  mockPrisma.betaUser.update.mockResolvedValue({
    id: 'bu1',
    email: 'test@example.com',
  });
});

// =============================================================================
// POST /api/beta/reminder - Validation
// =============================================================================

describe('POST /api/beta/reminder - validation', () => {
  it('should return 400 when email and user both missing', async () => {
    const res = await POST(makeRequest({ action: 'set' }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/email/i);
  });

  it('should return 400 for unknown action', async () => {
    const res = await POST(makeRequest({ email: 'test@example.com', action: 'unknown' }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/invalid action/i);
  });

  it('should return 400 when action is missing', async () => {
    const res = await POST(makeRequest({ email: 'test@example.com' }));
    expect(res.status).toBe(400);
  });
});

// =============================================================================
// POST /api/beta/reminder - Set Action
// =============================================================================

describe('POST /api/beta/reminder - set action', () => {
  it('should set reminder for provided email', async () => {
    const res = await POST(makeRequest({ email: 'test@example.com', action: 'set' }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.message).toContain('Reminder');
  });

  it('should update betaUser notes to survey_reminder_requested on set', async () => {
    await POST(makeRequest({ email: 'test@example.com', action: 'set' }));
    expect(mockPrisma.betaUser.update).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
      data: { notes: 'survey_reminder_requested' },
    });
  });

  it('should use logged-in user email when no email provided', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'u1', email: 'loggedin@example.com' });
    await POST(makeRequest({ action: 'set' }));
    expect(mockPrisma.betaUser.update).toHaveBeenCalledWith({
      where: { email: 'loggedin@example.com' },
      data: { notes: 'survey_reminder_requested' },
    });
  });

  it('should prefer provided email over logged-in user email', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'u1', email: 'loggedin@example.com' });
    await POST(makeRequest({ email: 'explicit@example.com', action: 'set' }));
    expect(mockPrisma.betaUser.update).toHaveBeenCalledWith({
      where: { email: 'explicit@example.com' },
      data: expect.anything(),
    });
  });
});

// =============================================================================
// POST /api/beta/reminder - Cancel Action
// =============================================================================

describe('POST /api/beta/reminder - cancel action', () => {
  it('should cancel reminder for provided email', async () => {
    const res = await POST(makeRequest({ email: 'test@example.com', action: 'cancel' }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.message).toContain('cancelled');
  });

  it('should set notes to null on cancel', async () => {
    await POST(makeRequest({ email: 'test@example.com', action: 'cancel' }));
    expect(mockPrisma.betaUser.update).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
      data: { notes: null },
    });
  });
});

// =============================================================================
// POST /api/beta/reminder - Error Handling
// =============================================================================

describe('POST /api/beta/reminder - error handling', () => {
  it('should return 500 on database error', async () => {
    mockPrisma.betaUser.update.mockRejectedValueOnce(new Error('DB error'));
    const res = await POST(makeRequest({ email: 'test@example.com', action: 'set' }));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });
});
