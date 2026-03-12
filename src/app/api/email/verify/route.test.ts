/**
 * Tests for /api/email/verify route
 *
 * Tests the email verification endpoint including token validation,
 * successful verification, and error handling.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies before importing route
vi.mock('@/lib/auth', () => ({
  verifyEmail: vi.fn(),
}));

import { POST } from './route';
import { verifyEmail } from '@/lib/auth';

// =============================================================================
// Helpers
// =============================================================================

function createRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/email/verify', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  vi.clearAllMocks();

  vi.mocked(verifyEmail).mockResolvedValue({ success: true });
});

// =============================================================================
// Successful Verification Tests
// =============================================================================

describe('POST /api/email/verify - success', () => {
  it('should return success for valid token', async () => {
    const request = createRequest({ token: 'valid-verify-token' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('should call verifyEmail with the provided token', async () => {
    const request = createRequest({ token: 'verify-token-abc123' });
    await POST(request);

    expect(verifyEmail).toHaveBeenCalledWith('verify-token-abc123');
  });
});

// =============================================================================
// Token Validation Tests
// =============================================================================

describe('POST /api/email/verify - token validation', () => {
  it('should return 400 when token is missing', async () => {
    const request = createRequest({});
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('token');
  });

  it('should return 400 when token is empty string', async () => {
    const request = createRequest({ token: '' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('token');
  });

  it('should return 400 when token is not a string', async () => {
    const request = createRequest({ token: 99999 });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('token');
  });

  it('should not call verifyEmail when token is missing', async () => {
    const request = createRequest({});
    await POST(request);

    expect(verifyEmail).not.toHaveBeenCalled();
  });

  it('should return 400 for expired or invalid token', async () => {
    vi.mocked(verifyEmail).mockResolvedValue({
      success: false,
      error: 'Token expired or invalid',
    });

    const request = createRequest({ token: 'expired-token' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('expired');
  });

  it('should propagate verifyEmail error message', async () => {
    vi.mocked(verifyEmail).mockResolvedValue({
      success: false,
      error: 'Token has already been used',
    });

    const request = createRequest({ token: 'used-token' });
    const response = await POST(request);
    const data = await response.json();

    expect(data.error).toBe('Token has already been used');
  });
});

// =============================================================================
// Error Handling Tests
// =============================================================================

describe('POST /api/email/verify - error handling', () => {
  it('should return 500 on unexpected error', async () => {
    vi.mocked(verifyEmail).mockRejectedValue(new Error('Database unavailable'));

    const request = createRequest({ token: 'valid-token' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('Failed to verify email');
  });

  it('should handle invalid JSON body', async () => {
    const request = new NextRequest('http://localhost:3000/api/email/verify', {
      method: 'POST',
      body: 'invalid-json',
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);

    expect(response.status).toBe(500);
  });
});
