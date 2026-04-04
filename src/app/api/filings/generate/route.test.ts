/**
 * Tests for GET and POST /api/filings/generate
 *
 * POST (create):
 *   - Auth guard (401)
 *   - Zod validation: invalid year, invalid periodOverride
 *   - No business profile → 400
 *   - No nexus states → 400
 *   - Happy path: creates filings for all nexus states
 *   - Idempotency: skips existing (businessId, stateCode, periodStart) combos
 *   - periodOverride respected
 *   - remainingOnly filters past deadlines
 *   - Internal server error (500)
 *
 * GET (preview/dry-run):
 *   - Auth guard (401)
 *   - Invalid year param → 400
 *   - No business profile → empty preview
 *   - Happy path: returns preview array without writing to DB
 *   - remainingOnly filters past deadlines in preview
 *   - existingCount incremented for already-stored filings
 *   - Internal server error (500)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    business: {
      findFirst: vi.fn(),
    },
    filing: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock('@/lib/filing-deadlines', () => ({
  getFilingDeadlines: vi.fn(),
  getStateFilingConfig: vi.fn(),
}));

import { GET, POST } from './route';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getFilingDeadlines, getStateFilingConfig } from '@/lib/filing-deadlines';

// ─── Helpers ────────────────────────────────────────────────────────────────

function postRequest(body: unknown = {}): NextRequest {
  return new NextRequest('http://localhost:3000/api/filings/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', host: 'localhost:3000' },
    body: JSON.stringify(body),
  });
}

function getRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:3000/api/filings/generate');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString(), {
    method: 'GET',
    headers: { host: 'localhost:3000' },
  });
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  emailVerified: true,
  createdAt: new Date('2026-01-01'),
  subscription: { plan: 'starter', status: 'active' },
};

const mockBusiness = {
  id: 'biz-123',
  userId: 'user-123',
  name: 'Test Store',
  state: 'IL',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  nexusStates: [
    {
      id: 'nexus-il',
      businessId: 'biz-123',
      stateCode: 'IL',
      stateName: 'Illinois',
      hasNexus: true,
      registeredDate: null,
    },
    {
      id: 'nexus-ca',
      businessId: 'biz-123',
      stateCode: 'CA',
      stateName: 'California',
      hasNexus: true,
      registeredDate: null,
    },
  ],
};

// Deadlines: one future, one past
const futureDate = new Date('2026-12-31');
const pastDate = new Date('2025-01-31');
const today = new Date();

const mockDeadlines = [
  {
    periodStart: new Date('2026-01-01'),
    periodEnd: new Date('2026-03-31'),
    dueDate: futureDate,
    periodLabel: 'Q1 2026',
  },
];

const mockPastDeadline = {
  periodStart: new Date('2025-01-01'),
  periodEnd: new Date('2025-03-31'),
  dueDate: pastDate,
  periodLabel: 'Q1 2025',
};

const mockFilingConfig = {
  defaultPeriod: 'quarterly' as const,
  graceDays: 20,
};

const mockCreatedFiling = {
  id: 'filing-new-1',
  businessId: 'biz-123',
  stateCode: 'IL',
  stateName: 'Illinois',
  period: 'quarterly',
  periodStart: new Date('2026-01-01'),
  periodEnd: new Date('2026-03-31'),
  dueDate: futureDate,
  status: 'pending',
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ─── POST Tests ──────────────────────────────────────────────────────────────

describe('POST /api/filings/generate', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(mockUser as never);
    vi.mocked(prisma.business.findFirst).mockResolvedValue(mockBusiness as never);
    vi.mocked(getFilingDeadlines).mockReturnValue(mockDeadlines as never);
    vi.mocked(getStateFilingConfig).mockReturnValue(mockFilingConfig as never);
    vi.mocked(prisma.filing.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.filing.create).mockResolvedValue(mockCreatedFiling as never);
  });

  it('returns 401 when user is not authenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const res = await POST(postRequest());
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 400 for invalid year (too old)', async () => {
    const res = await POST(postRequest({ year: 2015 }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBeDefined();
  });

  it('returns 400 for invalid year (too far future)', async () => {
    const res = await POST(postRequest({ year: 2040 }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBeDefined();
  });

  it('returns 400 for invalid periodOverride', async () => {
    const res = await POST(postRequest({ periodOverride: 'biweekly' }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBeDefined();
  });

  it('returns 400 when no business profile found', async () => {
    vi.mocked(prisma.business.findFirst).mockResolvedValue(null);

    const res = await POST(postRequest());
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain('business');
  });

  it('returns 400 when business has no nexus states', async () => {
    vi.mocked(prisma.business.findFirst).mockResolvedValue({
      ...mockBusiness,
      nexusStates: [],
    } as never);

    const res = await POST(postRequest());
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain('nexus');
  });

  it('creates filings for each nexus state on happy path', async () => {
    const res = await POST(postRequest({ year: 2026 }));
    const body = await res.json();

    expect(res.status).toBe(201);
    // 2 nexus states × 1 deadline each = 2 created
    expect(body.created).toBe(2);
    expect(body.skipped).toBe(0);
    expect(body.nexusStates).toBe(2);
    expect(body.year).toBe(2026);
    expect(body.filings).toHaveLength(2);
  });

  it('skips already-existing filings (idempotency)', async () => {
    // First nexus state has existing filing, second does not
    vi.mocked(prisma.filing.findFirst)
      .mockResolvedValueOnce({ id: 'existing-1' } as never)
      .mockResolvedValueOnce(null);

    const res = await POST(postRequest({ year: 2026 }));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.created).toBe(1);
    expect(body.skipped).toBe(1);
  });

  it('applies periodOverride to all states', async () => {
    await POST(postRequest({ year: 2026, periodOverride: 'monthly' }));

    expect(getFilingDeadlines).toHaveBeenCalledWith('IL', 2026, 'monthly');
    expect(getFilingDeadlines).toHaveBeenCalledWith('CA', 2026, 'monthly');
  });

  it('filters out past deadlines when remainingOnly=true', async () => {
    // Return a mix of past and future deadlines
    vi.mocked(getFilingDeadlines).mockReturnValue([
      mockPastDeadline,
      ...mockDeadlines,
    ] as never);

    const res = await POST(postRequest({ remainingOnly: true }));
    const body = await res.json();

    expect(res.status).toBe(201);
    // Past deadline filtered → only future ones created
    expect(body.created).toBe(2); // 2 states × 1 future deadline
  });

  it('marks overdue filings correctly (dueDate < today)', async () => {
    vi.mocked(getFilingDeadlines).mockReturnValue([mockPastDeadline] as never);
    const overdueFiling = { ...mockCreatedFiling, status: 'overdue', dueDate: pastDate };
    vi.mocked(prisma.filing.create).mockResolvedValue(overdueFiling as never);

    const res = await POST(postRequest({ year: 2025 }));
    const body = await res.json();

    expect(res.status).toBe(201);
    // Filing should have overdue status in response
    if (body.filings.length > 0) {
      // The create call sets overdue for past due dates
      expect(prisma.filing.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'overdue',
          }),
        })
      );
    }
  });

  it('uses default year (current year) when year is not provided', async () => {
    const currentYear = new Date().getFullYear();

    const res = await POST(postRequest({}));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.year).toBe(currentYear);
  });

  it('accepts empty body (all defaults)', async () => {
    const res = await POST(postRequest({}));
    expect(res.status).toBe(201);
  });

  it('returns 500 on unexpected error', async () => {
    vi.mocked(prisma.business.findFirst).mockRejectedValue(new Error('DB down'));

    const res = await POST(postRequest({ year: 2026 }));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe('Failed to generate filings');
  });
});

// ─── GET Tests (preview/dry-run) ─────────────────────────────────────────────

describe('GET /api/filings/generate', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(mockUser as never);
    vi.mocked(prisma.business.findFirst).mockResolvedValue(mockBusiness as never);
    vi.mocked(getFilingDeadlines).mockReturnValue(mockDeadlines as never);
    vi.mocked(getStateFilingConfig).mockReturnValue(mockFilingConfig as never);
    vi.mocked(prisma.filing.findFirst).mockResolvedValue(null);
  });

  it('returns 401 when user is not authenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const res = await GET(getRequest());
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 400 for invalid year param', async () => {
    const res = await GET(getRequest({ year: '2015' }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('Invalid year');
  });

  it('returns 400 for year too far in future', async () => {
    const res = await GET(getRequest({ year: '2040' }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('Invalid year');
  });

  it('returns 400 for non-numeric year', async () => {
    const res = await GET(getRequest({ year: 'banana' }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('Invalid year');
  });

  it('returns empty preview when no business found', async () => {
    vi.mocked(prisma.business.findFirst).mockResolvedValue(null);

    const res = await GET(getRequest({ year: '2026' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.preview).toEqual([]);
    expect(body.nexusStates).toBe(0);
    expect(body.year).toBe(2026);
  });

  it('returns preview without writing to DB on happy path', async () => {
    const res = await GET(getRequest({ year: '2026' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    // 2 nexus states × 1 deadline = 2 preview items
    expect(body.preview).toHaveLength(2);
    expect(body.wouldCreate).toBe(2);
    expect(body.wouldSkip).toBe(0);
    expect(body.nexusStates).toBe(2);
    // DB should NOT have been called with create
    expect(prisma.filing.create).not.toHaveBeenCalled();
  });

  it('counts existing filings as wouldSkip', async () => {
    vi.mocked(prisma.filing.findFirst)
      .mockResolvedValueOnce({ id: 'existing-1' } as never) // IL deadline already exists
      .mockResolvedValueOnce(null); // CA deadline does not

    const res = await GET(getRequest({ year: '2026' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.wouldCreate).toBe(1);
    expect(body.wouldSkip).toBe(1);
  });

  it('filters past deadlines in preview when remainingOnly=true', async () => {
    vi.mocked(getFilingDeadlines).mockReturnValue([
      mockPastDeadline,
      ...mockDeadlines,
    ] as never);

    const res = await GET(getRequest({ year: '2026', remainingOnly: 'true' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    // Past deadlines filtered, only future ones remain
    expect(body.preview).toHaveLength(2); // 2 states × 1 future deadline each
  });

  it('uses current year when year param is not provided', async () => {
    const currentYear = new Date().getFullYear();

    const res = await GET(getRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.year).toBe(currentYear);
  });

  it('preview items include required fields', async () => {
    const res = await GET(getRequest({ year: '2026' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    const item = body.preview[0];
    expect(item).toHaveProperty('state');
    expect(item).toHaveProperty('stateCode');
    expect(item).toHaveProperty('period');
    expect(item).toHaveProperty('periodLabel');
    expect(item).toHaveProperty('periodStart');
    expect(item).toHaveProperty('periodEnd');
    expect(item).toHaveProperty('dueDate');
    expect(item).toHaveProperty('status');
  });

  it('applies periodOverride param to getFilingDeadlines', async () => {
    await GET(getRequest({ year: '2026', periodOverride: 'monthly' }));

    expect(getFilingDeadlines).toHaveBeenCalledWith('IL', 2026, 'monthly');
    expect(getFilingDeadlines).toHaveBeenCalledWith('CA', 2026, 'monthly');
  });

  it('returns 500 on unexpected error', async () => {
    vi.mocked(prisma.business.findFirst).mockRejectedValue(new Error('DB down'));

    const res = await GET(getRequest({ year: '2026' }));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe('Failed to preview filings');
  });
});
