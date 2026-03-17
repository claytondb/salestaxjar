/**
 * Tests for POST /api/platforms/request
 *
 * Covers:
 *   - Auth guard (401)
 *   - Zod validation: missing/empty platform, exceeds max length
 *   - Successful request (200)
 *   - Email send path when RESEND_API_KEY is set (best-effort, non-fatal)
 *   - Email send failure is non-fatal (still returns 200)
 *   - No RESEND_API_KEY → logs to console, returns 200
 *   - Internal server error (unexpected throw)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Mocks ─────────────────────────────────────────────────────────────────

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}));

// We mock global fetch for the Resend email call
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { POST } from './route';
import { getCurrentUser } from '@/lib/auth';

// ─── Helpers ────────────────────────────────────────────────────────────────

function postRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/platforms/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', host: 'localhost:3000' },
    body: JSON.stringify(body),
  });
}

const validBody = { platform: 'Wix' };

// ─── Mock user fixtures ───────────────────────────────────────────────────────

const authenticatedUser = {
  id: 'user-1',
  email: 'user@example.com',
  name: 'Test User',
  emailVerified: true,
  createdAt: new Date(),
  subscription: { plan: 'starter', status: 'active' },
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/platforms/request', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(authenticatedUser as never);
    // Default: Resend not configured
    delete process.env.RESEND_API_KEY;
    // Suppress console output in tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  // ── Auth ──────────────────────────────────────────────────────────────────

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('does not process request when no user', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const consoleSpy = vi.spyOn(console, 'log');
    await POST(postRequest(validBody));
    expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('PLATFORM REQUEST'));
  });

  // ── Validation ────────────────────────────────────────────────────────────

  it('returns 400 when platform is missing', async () => {
    const res = await POST(postRequest({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid request');
  });

  it('returns 400 when platform is empty string', async () => {
    const res = await POST(postRequest({ platform: '' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.details).toBeDefined();
  });

  it('returns 400 when platform exceeds max length', async () => {
    const res = await POST(postRequest({ platform: 'A'.repeat(101) }));
    expect(res.status).toBe(400);
  });

  it('accepts platform at max length (100 chars)', async () => {
    const res = await POST(postRequest({ platform: 'A'.repeat(100) }));
    expect(res.status).toBe(200);
  });

  it('includes validation details in 400 response', async () => {
    const res = await POST(postRequest({ platform: '' }));
    const body = await res.json();
    expect(body.details).toBeDefined();
  });

  // ── No Resend key (console log path) ─────────────────────────────────────

  it('returns 200 when RESEND_API_KEY not set', async () => {
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toContain('submitted');
  });

  it('logs platform request to console when no RESEND_API_KEY', async () => {
    const consoleSpy = vi.spyOn(console, 'log');
    await POST(postRequest({ platform: 'Wix' }));
    const logCalls = consoleSpy.mock.calls.flat().join(' ');
    expect(logCalls).toContain('Wix');
  });

  it('logs user email to console when no RESEND_API_KEY', async () => {
    const consoleSpy = vi.spyOn(console, 'log');
    await POST(postRequest(validBody));
    const logCalls = consoleSpy.mock.calls.flat().join(' ');
    expect(logCalls).toContain('user@example.com');
  });

  it('does not call fetch when RESEND_API_KEY not set', async () => {
    await POST(postRequest(validBody));
    expect(mockFetch).not.toHaveBeenCalled();
  });

  // ── With Resend key (email send path) ─────────────────────────────────────

  it('calls Resend API when RESEND_API_KEY is set', async () => {
    process.env.RESEND_API_KEY = 'test_resend_key';
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ id: 'email-1' }) });
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('includes platform name in email body', async () => {
    process.env.RESEND_API_KEY = 'test_resend_key';
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });
    await POST(postRequest({ platform: 'BigCartel' }));
    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.text).toContain('BigCartel');
  });

  it('includes user email in Resend request body', async () => {
    process.env.RESEND_API_KEY = 'test_resend_key';
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });
    await POST(postRequest(validBody));
    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.text).toContain('user@example.com');
  });

  it('includes Authorization header with Bearer token for Resend', async () => {
    process.env.RESEND_API_KEY = 'test_resend_key';
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });
    await POST(postRequest(validBody));
    expect(mockFetch.mock.calls[0][1].headers.Authorization).toBe('Bearer test_resend_key');
  });

  it('still returns 200 when Resend API returns non-ok status (best-effort)', async () => {
    process.env.RESEND_API_KEY = 'test_resend_key';
    mockFetch.mockResolvedValue({ ok: false, text: async () => 'Rate limited' });
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('still returns 200 when Resend fetch throws (best-effort)', async () => {
    process.env.RESEND_API_KEY = 'test_resend_key';
    mockFetch.mockRejectedValue(new Error('DNS failure'));
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  // ── Unexpected errors ─────────────────────────────────────────────────────

  it('returns 500 when getCurrentUser throws', async () => {
    vi.mocked(getCurrentUser).mockRejectedValue(new Error('Session error'));
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Internal server error');
  });
});
