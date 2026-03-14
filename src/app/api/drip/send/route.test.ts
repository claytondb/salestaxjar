/**
 * Tests for POST /api/drip/send
 *
 * Internal protected endpoint for sending onboarding drip emails.
 * Covers: auth, validation, user lookup, duplicate-safety, per-day conditions,
 * email send success/failure, and error handling.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const DRIP_SECRET = 'test-drip-secret-xyz';

// Set env var BEFORE module is loaded (DRIP_SECRET is captured at module init)
vi.hoisted(() => {
  process.env.DRIP_SECRET = 'test-drip-secret-xyz';
});

// Mock env before imports
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    emailLog: {
      findFirst: vi.fn(),
    },
    platformConnection: {
      count: vi.fn(),
    },
    importedOrder: {
      count: vi.fn(),
    },
    subscription: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/email', () => ({
  sendDripDay1Email: vi.fn(),
  sendDripDay3Email: vi.fn(),
  sendDripDay7Email: vi.fn(),
  sendDripDay14Email: vi.fn(),
}));

import { POST } from './route';
import { prisma } from '@/lib/prisma';
import {
  sendDripDay1Email,
  sendDripDay3Email,
  sendDripDay7Email,
  sendDripDay14Email,
} from '@/lib/email';

const mockPrisma = prisma as unknown as {
  user: { findUnique: ReturnType<typeof vi.fn> };
  emailLog: { findFirst: ReturnType<typeof vi.fn> };
  platformConnection: { count: ReturnType<typeof vi.fn> };
  importedOrder: { count: ReturnType<typeof vi.fn> };
  subscription: { findUnique: ReturnType<typeof vi.fn> };
};

const mockSendDay1 = sendDripDay1Email as ReturnType<typeof vi.fn>;
const mockSendDay3 = sendDripDay3Email as ReturnType<typeof vi.fn>;
const mockSendDay7 = sendDripDay7Email as ReturnType<typeof vi.fn>;
const mockSendDay14 = sendDripDay14Email as ReturnType<typeof vi.fn>;

function makeRequest(
  body: unknown,
  secret: string | null = DRIP_SECRET
): NextRequest {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (secret !== null) {
    headers['Authorization'] = `Bearer ${secret}`;
  }
  return new NextRequest('http://localhost:3000/api/drip/send', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

const mockUser = {
  id: 'user-abc',
  email: 'test@example.com',
  name: 'Test User',
  createdAt: new Date('2026-01-01T00:00:00Z'),
};

beforeEach(() => {
  vi.clearAllMocks();

  // Defaults: user found, not already sent, conditions clear, email succeeds
  mockPrisma.user.findUnique.mockResolvedValue(mockUser);
  mockPrisma.emailLog.findFirst.mockResolvedValue(null); // not already sent
  mockPrisma.platformConnection.count.mockResolvedValue(0);
  mockPrisma.importedOrder.count.mockResolvedValue(0);
  mockPrisma.subscription.findUnique.mockResolvedValue(null);
  mockSendDay1.mockResolvedValue({ success: true });
  mockSendDay3.mockResolvedValue({ success: true });
  mockSendDay7.mockResolvedValue({ success: true });
  mockSendDay14.mockResolvedValue({ success: true });
});

// ─── Authentication ───────────────────────────────────────────────────────────

describe('POST /api/drip/send — authentication', () => {
  it('returns 401 when no Authorization header provided', async () => {
    const req = makeRequest({ userId: 'user-abc', dripDay: 1 }, null);
    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 401 with wrong secret', async () => {
    const req = makeRequest({ userId: 'user-abc', dripDay: 1 }, 'wrong-secret');
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('accepts valid Bearer secret', async () => {
    const req = makeRequest({ userId: 'user-abc', dripDay: 1 });
    const res = await POST(req);
    expect(res.status).not.toBe(401);
  });

  it('returns 401 if secret is in wrong format (no Bearer prefix)', async () => {
    const headers = { 'Content-Type': 'application/json', Authorization: DRIP_SECRET };
    const req = new NextRequest('http://localhost:3000/api/drip/send', {
      method: 'POST',
      headers,
      body: JSON.stringify({ userId: 'user-abc', dripDay: 1 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });
});

// ─── Validation ───────────────────────────────────────────────────────────────

describe('POST /api/drip/send — validation', () => {
  it('returns 400 for invalid JSON body', async () => {
    const req = new NextRequest('http://localhost:3000/api/drip/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DRIP_SECRET}`,
      },
      body: 'not-json',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when userId is missing', async () => {
    const req = makeRequest({ dripDay: 1 });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('userId');
  });

  it('returns 400 when userId is not a string', async () => {
    const req = makeRequest({ userId: 123, dripDay: 1 });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when dripDay is missing', async () => {
    const req = makeRequest({ userId: 'user-abc' });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('dripDay');
  });

  it('returns 400 for invalid dripDay values', async () => {
    for (const day of [0, 2, 5, 100, 'one']) {
      const req = makeRequest({ userId: 'user-abc', dripDay: day });
      const res = await POST(req);
      expect(res.status).toBe(400);
    }
  });

  it('accepts valid dripDay values: 1, 3, 7, 14', async () => {
    for (const day of [1, 3, 7, 14]) {
      const req = makeRequest({ userId: 'user-abc', dripDay: day });
      const res = await POST(req);
      expect(res.status).not.toBe(400);
    }
  });
});

// ─── User Lookup ──────────────────────────────────────────────────────────────

describe('POST /api/drip/send — user lookup', () => {
  it('returns 404 when user not found', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    const req = makeRequest({ userId: 'nonexistent', dripDay: 1 });
    const res = await POST(req);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('User not found');
  });
});

// ─── Duplicate Safety ─────────────────────────────────────────────────────────

describe('POST /api/drip/send — duplicate safety', () => {
  it('skips day 1 if already sent', async () => {
    mockPrisma.emailLog.findFirst.mockResolvedValue({
      id: 'log-1',
      template: 'drip_day1',
      status: 'sent',
    });
    const req = makeRequest({ userId: 'user-abc', dripDay: 1 });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.skipped).toBe(true);
    expect(body.reason).toBe('Already sent');
    expect(mockSendDay1).not.toHaveBeenCalled();
  });

  it('skips day 3 if already sent', async () => {
    mockPrisma.emailLog.findFirst.mockResolvedValue({ id: 'log-3', template: 'drip_day3', status: 'sent' });
    const req = makeRequest({ userId: 'user-abc', dripDay: 3 });
    const res = await POST(req);
    const body = await res.json();
    expect(body.skipped).toBe(true);
    expect(mockSendDay3).not.toHaveBeenCalled();
  });

  it('skips day 7 if already sent', async () => {
    mockPrisma.emailLog.findFirst.mockResolvedValue({ id: 'log-7', template: 'drip_day7', status: 'sent' });
    const req = makeRequest({ userId: 'user-abc', dripDay: 7 });
    const res = await POST(req);
    const body = await res.json();
    expect(body.skipped).toBe(true);
    expect(mockSendDay7).not.toHaveBeenCalled();
  });

  it('skips day 14 if already sent', async () => {
    mockPrisma.emailLog.findFirst.mockResolvedValue({ id: 'log-14', template: 'drip_day14', status: 'sent' });
    const req = makeRequest({ userId: 'user-abc', dripDay: 14 });
    const res = await POST(req);
    const body = await res.json();
    expect(body.skipped).toBe(true);
    expect(mockSendDay14).not.toHaveBeenCalled();
  });
});

// ─── Day 1 Conditions ─────────────────────────────────────────────────────────

describe('POST /api/drip/send — Day 1 conditions', () => {
  it('skips day 1 if user already has a platform connected', async () => {
    mockPrisma.platformConnection.count.mockResolvedValue(1);
    const req = makeRequest({ userId: 'user-abc', dripDay: 1 });
    const res = await POST(req);
    const body = await res.json();
    expect(body.skipped).toBe(true);
    expect(body.reason).toContain('platform connected');
    expect(mockSendDay1).not.toHaveBeenCalled();
  });

  it('skips day 1 if user has multiple platforms', async () => {
    mockPrisma.platformConnection.count.mockResolvedValue(3);
    const req = makeRequest({ userId: 'user-abc', dripDay: 1 });
    const res = await POST(req);
    const body = await res.json();
    expect(body.skipped).toBe(true);
  });

  it('sends day 1 when no platform connected', async () => {
    mockPrisma.platformConnection.count.mockResolvedValue(0);
    const req = makeRequest({ userId: 'user-abc', dripDay: 1 });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(true);
    expect(body.template).toBe('drip_day1');
    expect(mockSendDay1).toHaveBeenCalledWith({
      to: mockUser.email,
      name: mockUser.name,
      userId: mockUser.id,
    });
  });
});

// ─── Day 3 Conditions ─────────────────────────────────────────────────────────

describe('POST /api/drip/send — Day 3 conditions', () => {
  it('skips day 3 if user already has imported orders', async () => {
    mockPrisma.importedOrder.count.mockResolvedValue(5);
    const req = makeRequest({ userId: 'user-abc', dripDay: 3 });
    const res = await POST(req);
    const body = await res.json();
    expect(body.skipped).toBe(true);
    expect(body.reason).toContain('imported orders');
    expect(mockSendDay3).not.toHaveBeenCalled();
  });

  it('sends day 3 when user has no imported orders', async () => {
    mockPrisma.importedOrder.count.mockResolvedValue(0);
    const req = makeRequest({ userId: 'user-abc', dripDay: 3 });
    const res = await POST(req);
    const body = await res.json();
    expect(body.sent).toBe(true);
    expect(body.template).toBe('drip_day3');
    expect(mockSendDay3).toHaveBeenCalledWith({
      to: mockUser.email,
      name: mockUser.name,
      userId: mockUser.id,
    });
  });

  it('does not check platform connections for day 3', async () => {
    mockPrisma.platformConnection.count.mockResolvedValue(5);
    const req = makeRequest({ userId: 'user-abc', dripDay: 3 });
    const res = await POST(req);
    const body = await res.json();
    // Platform count doesn't matter for day 3
    expect(body.sent).toBe(true);
  });
});

// ─── Day 7 Conditions ─────────────────────────────────────────────────────────

describe('POST /api/drip/send — Day 7 conditions', () => {
  it('skips day 7 if user has active paid plan', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({
      status: 'active',
      plan: 'starter',
    });
    const req = makeRequest({ userId: 'user-abc', dripDay: 7 });
    const res = await POST(req);
    const body = await res.json();
    expect(body.skipped).toBe(true);
    expect(body.reason).toContain('paid plan');
    expect(mockSendDay7).not.toHaveBeenCalled();
  });

  it('skips day 7 for growth plan', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({ status: 'active', plan: 'growth' });
    const req = makeRequest({ userId: 'user-abc', dripDay: 7 });
    const res = await POST(req);
    const body = await res.json();
    expect(body.skipped).toBe(true);
  });

  it('sends day 7 when user is on free plan', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({ status: 'active', plan: 'free' });
    const req = makeRequest({ userId: 'user-abc', dripDay: 7 });
    const res = await POST(req);
    const body = await res.json();
    expect(body.sent).toBe(true);
    expect(body.template).toBe('drip_day7');
    expect(mockSendDay7).toHaveBeenCalled();
  });

  it('sends day 7 when user has no subscription', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(null);
    const req = makeRequest({ userId: 'user-abc', dripDay: 7 });
    const res = await POST(req);
    const body = await res.json();
    expect(body.sent).toBe(true);
  });

  it('sends day 7 when subscription is canceled', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({ status: 'canceled', plan: 'starter' });
    const req = makeRequest({ userId: 'user-abc', dripDay: 7 });
    const res = await POST(req);
    const body = await res.json();
    expect(body.sent).toBe(true);
  });
});

// ─── Day 14 Conditions ────────────────────────────────────────────────────────

describe('POST /api/drip/send — Day 14 conditions', () => {
  it('skips day 14 if user has active paid plan', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({ status: 'active', plan: 'pro' });
    const req = makeRequest({ userId: 'user-abc', dripDay: 14 });
    const res = await POST(req);
    const body = await res.json();
    expect(body.skipped).toBe(true);
    expect(mockSendDay14).not.toHaveBeenCalled();
  });

  it('sends day 14 when user is still on free plan', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(null);
    const req = makeRequest({ userId: 'user-abc', dripDay: 14 });
    const res = await POST(req);
    const body = await res.json();
    expect(body.sent).toBe(true);
    expect(body.template).toBe('drip_day14');
    expect(mockSendDay14).toHaveBeenCalledWith({
      to: mockUser.email,
      name: mockUser.name,
      userId: mockUser.id,
    });
  });
});

// ─── Email Send Outcomes ──────────────────────────────────────────────────────

describe('POST /api/drip/send — email send outcomes', () => {
  it('returns 200 with sent=true on successful send', async () => {
    mockSendDay1.mockResolvedValue({ success: true });
    const req = makeRequest({ userId: 'user-abc', dripDay: 1 });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(true);
    expect(body.userId).toBe(mockUser.id);
    expect(body.template).toBe('drip_day1');
  });

  it('returns 500 when email send fails', async () => {
    mockSendDay1.mockResolvedValue({ success: false, error: 'SMTP error' });
    const req = makeRequest({ userId: 'user-abc', dripDay: 1 });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain('Failed to send email');
    expect(body.detail).toBe('SMTP error');
  });

  it('calls correct email function for each day', async () => {
    const cases = [
      { day: 1, mock: mockSendDay1, template: 'drip_day1' },
      { day: 3, mock: mockSendDay3, template: 'drip_day3' },
      { day: 7, mock: mockSendDay7, template: 'drip_day7' },
      { day: 14, mock: mockSendDay14, template: 'drip_day14' },
    ];

    for (const { day, mock, template } of cases) {
      vi.clearAllMocks();
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.emailLog.findFirst.mockResolvedValue(null);
      mockPrisma.platformConnection.count.mockResolvedValue(0);
      mockPrisma.importedOrder.count.mockResolvedValue(0);
      mockPrisma.subscription.findUnique.mockResolvedValue(null);
      mock.mockResolvedValue({ success: true });

      const req = makeRequest({ userId: 'user-abc', dripDay: day });
      const res = await POST(req);
      const body = await res.json();

      expect(mock).toHaveBeenCalledOnce();
      expect(body.template).toBe(template);
    }
  });
});

// ─── Error Handling ───────────────────────────────────────────────────────────

describe('POST /api/drip/send — error handling', () => {
  it('returns 500 when database throws', async () => {
    mockPrisma.user.findUnique.mockRejectedValue(new Error('DB connection failed'));
    const req = makeRequest({ userId: 'user-abc', dripDay: 1 });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Internal server error');
  });

  it('returns 500 when emailLog check throws', async () => {
    mockPrisma.emailLog.findFirst.mockRejectedValue(new Error('DB error'));
    const req = makeRequest({ userId: 'user-abc', dripDay: 1 });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it('returns 500 when platformConnection.count throws for day 1', async () => {
    mockPrisma.platformConnection.count.mockRejectedValue(new Error('DB error'));
    const req = makeRequest({ userId: 'user-abc', dripDay: 1 });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});
