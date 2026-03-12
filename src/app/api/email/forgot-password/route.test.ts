/**
 * Tests for /api/email/forgot-password route
 *
 * Tests the forgot-password endpoint including validation,
 * rate limiting, token generation, and email sending.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies before importing route
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  generatePasswordResetToken: vi.fn(),
  sanitizeInput: vi.fn((input: string) => input.trim()),
  validateEmail: vi.fn(),
}));

vi.mock('@/lib/email', () => ({
  sendPasswordResetEmail: vi.fn(),
}));

vi.mock('@/lib/ratelimit', () => ({
  checkEmailRateLimit: vi.fn(),
  rateLimitHeaders: vi.fn(() => ({})),
}));

import { POST } from './route';
import { prisma } from '@/lib/prisma';
import { generatePasswordResetToken, validateEmail } from '@/lib/auth';
import { sendPasswordResetEmail } from '@/lib/email';
import { checkEmailRateLimit } from '@/lib/ratelimit';

// =============================================================================
// Helpers
// =============================================================================

function createRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/email/forgot-password', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

const mockUser = {
  id: 'user-123',
  name: 'Test User',
  email: 'test@example.com',
};

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  vi.clearAllMocks();

  vi.mocked(checkEmailRateLimit).mockResolvedValue({
    success: true,
    limit: 5,
    remaining: 4,
    reset: Date.now() + 300000,
  });
  vi.mocked(validateEmail).mockReturnValue(true);
  vi.mocked(generatePasswordResetToken).mockResolvedValue('reset-token-abc123');
  vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never);
  vi.mocked(sendPasswordResetEmail).mockResolvedValue({ success: true });
});

// =============================================================================
// Successful Request Tests
// =============================================================================

describe('POST /api/email/forgot-password - success', () => {
  it('should return success for valid email with existing user', async () => {
    const request = createRequest({ email: 'test@example.com' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('should send password reset email when user exists', async () => {
    const request = createRequest({ email: 'test@example.com' });
    await POST(request);

    expect(sendPasswordResetEmail).toHaveBeenCalledWith({
      to: 'test@example.com',
      name: 'Test User',
      resetToken: 'reset-token-abc123',
      userId: 'user-123',
    });
  });

  it('should generate a reset token for existing user', async () => {
    const request = createRequest({ email: 'test@example.com' });
    await POST(request);

    expect(generatePasswordResetToken).toHaveBeenCalledWith('test@example.com');
  });

  it('should normalize email to lowercase', async () => {
    const request = createRequest({ email: 'TEST@EXAMPLE.COM' });
    await POST(request);

    expect(generatePasswordResetToken).toHaveBeenCalledWith('test@example.com');
  });
});

// =============================================================================
// Email Enumeration Prevention Tests
// =============================================================================

describe('POST /api/email/forgot-password - enumeration prevention', () => {
  it('should return success even for non-existent user', async () => {
    vi.mocked(generatePasswordResetToken).mockResolvedValue(null);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const request = createRequest({ email: 'nobody@example.com' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('should not send email for non-existent user', async () => {
    vi.mocked(generatePasswordResetToken).mockResolvedValue(null);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const request = createRequest({ email: 'nobody@example.com' });
    await POST(request);

    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('should return success for invalid email format (prevents enumeration)', async () => {
    vi.mocked(validateEmail).mockReturnValue(false);

    const request = createRequest({ email: 'not-an-email' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('should not query database for invalid email', async () => {
    vi.mocked(validateEmail).mockReturnValue(false);

    const request = createRequest({ email: 'not-an-email' });
    await POST(request);

    expect(generatePasswordResetToken).not.toHaveBeenCalled();
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Rate Limiting Tests
// =============================================================================

describe('POST /api/email/forgot-password - rate limiting', () => {
  it('should reject when rate limited', async () => {
    vi.mocked(checkEmailRateLimit).mockResolvedValue({
      success: false,
      limit: 5,
      remaining: 0,
      reset: Date.now() + 300000,
    });

    const request = createRequest({ email: 'test@example.com' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toContain('Too many reset attempts');
  });

  it('should not generate token when rate limited', async () => {
    vi.mocked(checkEmailRateLimit).mockResolvedValue({
      success: false,
      limit: 5,
      remaining: 0,
      reset: Date.now() + 300000,
    });

    const request = createRequest({ email: 'test@example.com' });
    await POST(request);

    expect(generatePasswordResetToken).not.toHaveBeenCalled();
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('should rate limit by email address', async () => {
    const request = createRequest({ email: 'test@example.com' });
    await POST(request);

    expect(checkEmailRateLimit).toHaveBeenCalledWith('test@example.com');
  });
});

// =============================================================================
// Input Handling Tests
// =============================================================================

describe('POST /api/email/forgot-password - input handling', () => {
  it('should handle email with whitespace', async () => {
    const request = createRequest({ email: '  test@example.com  ' });
    await POST(request);

    expect(generatePasswordResetToken).toHaveBeenCalledWith('test@example.com');
  });

  it('should handle missing email gracefully', async () => {
    vi.mocked(validateEmail).mockReturnValue(false);

    const request = createRequest({});
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('should handle null email gracefully', async () => {
    vi.mocked(validateEmail).mockReturnValue(false);

    const request = createRequest({ email: null });
    const response = await POST(request);

    expect(response.status).toBe(200);
  });
});

// =============================================================================
// Error Handling Tests
// =============================================================================

describe('POST /api/email/forgot-password - error handling', () => {
  it('should return 500 on database error', async () => {
    vi.mocked(generatePasswordResetToken).mockResolvedValue('token-xyz');
    vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error('DB error'));

    const request = createRequest({ email: 'test@example.com' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('Failed to process request');
  });

  it('should return 500 on token generation error', async () => {
    vi.mocked(generatePasswordResetToken).mockRejectedValue(new Error('Token error'));

    const request = createRequest({ email: 'test@example.com' });
    const response = await POST(request);

    expect(response.status).toBe(500);
  });

  it('should handle invalid JSON body', async () => {
    const request = new NextRequest('http://localhost:3000/api/email/forgot-password', {
      method: 'POST',
      body: 'not-json',
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);

    expect(response.status).toBe(500);
  });

  it('should not send email if user lookup fails after token generation', async () => {
    vi.mocked(generatePasswordResetToken).mockResolvedValue('token-xyz');
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const request = createRequest({ email: 'test@example.com' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
    expect(data.success).toBe(true);
  });
});
