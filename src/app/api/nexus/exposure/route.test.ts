/**
 * Tests for /api/nexus/exposure — auth, error handling and the response shape.
 * The nexus math itself is tested in src/lib/nexus-engine.test.ts and the
 * database loading in src/lib/nexus-data.test.ts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('@/lib/nexus-data', () => ({
  buildNexusReport: vi.fn(),
}));

import { GET } from './route';
import { getCurrentUser } from '@/lib/auth';
import { buildNexusReport } from '@/lib/nexus-data';

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  emailVerified: true,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  subscription: null,
};

const report = {
  generatedAt: '2026-07-01T12:00:00.000Z',
  coverage: { earliestOrder: '2025-01-03T00:00:00.000Z', latestOrder: '2026-06-30T00:00:00.000Z', hasMarketplaceData: false },
  evaluations: [{ stateCode: 'WA', status: 'exceeded' }],
  summary: { exceededCount: 1 },
  topActions: [{ kind: 'register', stateCode: 'WA', title: 'Register in Washington', detail: '…' }],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getCurrentUser).mockResolvedValue(mockUser as never);
  vi.mocked(buildNexusReport).mockResolvedValue(report as never);
});

describe('GET /api/nexus/exposure', () => {
  it('returns 401 when not signed in', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
    expect(buildNexusReport).not.toHaveBeenCalled();
  });

  it("builds the report for the signed-in seller only", async () => {
    await GET();
    expect(buildNexusReport).toHaveBeenCalledWith('user-123');
  });

  it('returns evaluations, summary, top actions and data coverage', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.evaluations[0].stateCode).toBe('WA');
    expect(body.summary.exceededCount).toBe(1);
    expect(body.topActions[0].kind).toBe('register');
    expect(body.coverage.earliestOrder).toBe('2025-01-03T00:00:00.000Z');
  });

  it('is never cached', async () => {
    const res = await GET();
    expect(res.headers.get('cache-control')).toBe('no-store');
  });

  it('returns 500 when loading fails', async () => {
    vi.mocked(buildNexusReport).mockRejectedValue(new Error('db down'));
    const res = await GET();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Failed to fetch nexus exposure data');
  });
});
