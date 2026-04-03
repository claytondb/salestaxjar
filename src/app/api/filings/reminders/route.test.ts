/**
 * Tests for GET /api/filings/reminders
 *
 * Covers: cron auth, user auth, batch processing, response shape, error handling.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('@/lib/filing-reminders', () => ({
  processBatchReminders: vi.fn(),
}));

import { GET } from './route';
import { getCurrentUser } from '@/lib/auth';
import { processBatchReminders } from '@/lib/filing-reminders';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost:3000/api/filings/reminders', {
    method: 'GET',
    headers: { host: 'localhost:3000', ...headers },
  });
}

function emptyResult() {
  return { processed: 0, sent: 0, alreadySent: 0, failed: 0, results: [] };
}

function nonEmptyResult() {
  return {
    processed: 2,
    sent: 2,
    alreadySent: 0,
    failed: 0,
    results: [
      { filingId: 'f1', stateCode: 'IL', daysUntilDue: 7, success: true, messageId: 'msg-1' },
      { filingId: 'f2', stateCode: 'TX', daysUntilDue: 7, success: true, messageId: 'msg-2' },
    ],
  };
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

describe('GET /api/filings/reminders — auth', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.CRON_SECRET = 'test-secret';
    vi.mocked(processBatchReminders).mockResolvedValue(emptyResult());
  });

  it('returns 401 when no cron secret and unauthenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const req = makeRequest({});
    const res = await GET(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 401 when wrong cron secret and unauthenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const req = makeRequest({ 'x-cron-secret': 'wrong' });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('accepts valid cron secret without user auth', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const req = makeRequest({ 'x-cron-secret': 'test-secret' });
    const res = await GET(req);
    expect(res.status).toBe(200);
  });

  it('accepts authenticated user without cron secret', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: 'user-1', email: 'a@b.com', name: 'A', emailVerified: true,
      createdAt: new Date(), updatedAt: new Date(),
      passwordHash: null, googleId: null, isBeta: false, subscriptionTier: 'free',
      subscriptionStatus: null, stripeCustomerId: null, stripeSubscriptionId: null,
      currentPeriodEnd: null,
    });
    const req = makeRequest({});
    const res = await GET(req);
    expect(res.status).toBe(200);
  });
});

// ─── Response shape ───────────────────────────────────────────────────────────

describe('GET /api/filings/reminders — response shape', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.CRON_SECRET = 'test-secret';
  });

  it('returns ok:true with summary', async () => {
    vi.mocked(processBatchReminders).mockResolvedValue(emptyResult());
    const req = makeRequest({ 'x-cron-secret': 'test-secret' });
    const res = await GET(req);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.summary).toBeDefined();
    expect(body.sevenDay).toBeDefined();
    expect(body.oneDay).toBeDefined();
  });

  it('runs both 7-day and 1-day batches', async () => {
    vi.mocked(processBatchReminders).mockResolvedValue(emptyResult());
    const req = makeRequest({ 'x-cron-secret': 'test-secret' });
    await GET(req);
    expect(processBatchReminders).toHaveBeenCalledTimes(2);
    expect(processBatchReminders).toHaveBeenCalledWith(7);
    expect(processBatchReminders).toHaveBeenCalledWith(1);
  });

  it('aggregates counts in summary', async () => {
    vi.mocked(processBatchReminders)
      .mockResolvedValueOnce({ processed: 3, sent: 2, alreadySent: 1, failed: 0, results: [] })
      .mockResolvedValueOnce({ processed: 1, sent: 1, alreadySent: 0, failed: 0, results: [] });
    const req = makeRequest({ 'x-cron-secret': 'test-secret' });
    const res = await GET(req);
    const body = await res.json();
    expect(body.summary.totalProcessed).toBe(4);
    expect(body.summary.totalSent).toBe(3);
    expect(body.summary.totalAlreadySent).toBe(1);
    expect(body.summary.totalFailed).toBe(0);
  });

  it('reflects individual batch results in sevenDay/oneDay', async () => {
    vi.mocked(processBatchReminders)
      .mockResolvedValueOnce({ processed: 2, sent: 2, alreadySent: 0, failed: 0, results: [] })
      .mockResolvedValueOnce({ processed: 1, sent: 0, alreadySent: 1, failed: 0, results: [] });
    const req = makeRequest({ 'x-cron-secret': 'test-secret' });
    const res = await GET(req);
    const body = await res.json();
    expect(body.sevenDay.sent).toBe(2);
    expect(body.oneDay.alreadySent).toBe(1);
  });

  it('returns totalSent:0 when no reminders needed', async () => {
    vi.mocked(processBatchReminders).mockResolvedValue(emptyResult());
    const req = makeRequest({ 'x-cron-secret': 'test-secret' });
    const res = await GET(req);
    const body = await res.json();
    expect(body.summary.totalSent).toBe(0);
  });
});

// ─── Error handling ───────────────────────────────────────────────────────────

describe('GET /api/filings/reminders — error handling', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.CRON_SECRET = 'test-secret';
  });

  it('returns 500 when processBatchReminders throws', async () => {
    vi.mocked(processBatchReminders).mockRejectedValue(new Error('DB error'));
    const req = makeRequest({ 'x-cron-secret': 'test-secret' });
    const res = await GET(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });
});

// ─── Missing CRON_SECRET env ──────────────────────────────────────────────────

describe('GET /api/filings/reminders — missing CRON_SECRET env', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    delete process.env.CRON_SECRET;
    vi.mocked(processBatchReminders).mockResolvedValue(emptyResult());
  });

  it('falls back to user auth when CRON_SECRET is not set', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: 'u1', email: 'a@b.com', name: 'A', emailVerified: true,
      createdAt: new Date(), updatedAt: new Date(),
      passwordHash: null, googleId: null, isBeta: false, subscriptionTier: 'free',
      subscriptionStatus: null, stripeCustomerId: null, stripeSubscriptionId: null,
      currentPeriodEnd: null,
    });
    const req = makeRequest({ 'x-cron-secret': 'any' });
    const res = await GET(req);
    expect(res.status).toBe(200);
  });

  it('returns 401 if no cron secret env and no user', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const req = makeRequest({});
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});
