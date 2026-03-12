/**
 * Tests for /api/email/reset-password route
 *
 * Tests the reset-password endpoint including token validation,
 * password validation, and error handling.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies before importing route
vi.mock('@/lib/auth', () => ({
  resetPassword: vi.fn(),
  validatePassword: vi.fn(),
}));

import { POST } from './route';
import { resetPassword, validatePassword } from '@/lib/auth';

// =============================================================================
// Helpers
// =============================================================================

function createRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/email/reset-password', {
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

  vi.mocked(validatePassword).mockReturnValue({ valid: true, errors: [] });
  vi.mocked(resetPassword).mockResolvedValue({ success: true });
});

// =============================================================================
// Successful Reset Tests
// =============================================================================

describe('POST /api/email/reset-password - success', () => {
  it('should return success for valid token and password', async () => {
    const request = createRequest({
      token: 'valid-reset-token',
      password: 'NewPassword123!',
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('should call resetPassword with correct arguments', async () => {
    const request = createRequest({
      token: 'valid-reset-token',
      password: 'NewPassword123!',
    });
    await POST(request);

    expect(resetPassword).toHaveBeenCalledWith('valid-reset-token', 'NewPassword123!');
  });

  it('should validate password before resetting', async () => {
    const request = createRequest({
      token: 'valid-reset-token',
      password: 'NewPassword123!',
    });
    await POST(request);

    expect(validatePassword).toHaveBeenCalledWith('NewPassword123!');
  });
});

// =============================================================================
// Token Validation Tests
// =============================================================================

describe('POST /api/email/reset-password - token validation', () => {
  it('should return 400 when token is missing', async () => {
    const request = createRequest({ password: 'NewPassword123!' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('token');
  });

  it('should return 400 when token is empty string', async () => {
    const request = createRequest({ token: '', password: 'NewPassword123!' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('token');
  });

  it('should return 400 when token is not a string', async () => {
    const request = createRequest({ token: 12345, password: 'NewPassword123!' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('token');
  });

  it('should return 400 for expired or invalid token', async () => {
    vi.mocked(resetPassword).mockResolvedValue({
      success: false,
      error: 'Invalid or expired reset token',
    });

    const request = createRequest({
      token: 'expired-token',
      password: 'NewPassword123!',
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('expired');
  });

  it('should not call resetPassword when token is missing', async () => {
    const request = createRequest({ password: 'NewPassword123!' });
    await POST(request);

    expect(resetPassword).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Password Validation Tests
// =============================================================================

describe('POST /api/email/reset-password - password validation', () => {
  it('should return 400 when password fails validation', async () => {
    vi.mocked(validatePassword).mockReturnValue({
      valid: false,
      errors: ['Password must be at least 8 characters'],
    });

    const request = createRequest({
      token: 'valid-token',
      password: 'short',
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Password must be at least 8 characters');
  });

  it('should return the first validation error', async () => {
    vi.mocked(validatePassword).mockReturnValue({
      valid: false,
      errors: ['First error', 'Second error'],
    });

    const request = createRequest({
      token: 'valid-token',
      password: 'badpass',
    });
    const response = await POST(request);
    const data = await response.json();

    expect(data.error).toBe('First error');
  });

  it('should not call resetPassword when password is invalid', async () => {
    vi.mocked(validatePassword).mockReturnValue({
      valid: false,
      errors: ['Too short'],
    });

    const request = createRequest({
      token: 'valid-token',
      password: 'bad',
    });
    await POST(request);

    expect(resetPassword).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Error Handling Tests
// =============================================================================

describe('POST /api/email/reset-password - error handling', () => {
  it('should return 500 on unexpected error', async () => {
    vi.mocked(resetPassword).mockRejectedValue(new Error('DB connection lost'));

    const request = createRequest({
      token: 'valid-token',
      password: 'NewPassword123!',
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('Failed to reset password');
  });

  it('should handle invalid JSON body', async () => {
    const request = new NextRequest('http://localhost:3000/api/email/reset-password', {
      method: 'POST',
      body: 'invalid-json',
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);

    expect(response.status).toBe(500);
  });

  it('should propagate resetPassword error message', async () => {
    vi.mocked(resetPassword).mockResolvedValue({
      success: false,
      error: 'Token has already been used',
    });

    const request = createRequest({
      token: 'used-token',
      password: 'NewPassword123!',
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Token has already been used');
  });
});
