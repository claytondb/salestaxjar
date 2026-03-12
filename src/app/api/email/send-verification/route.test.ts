/**
 * Tests for /api/email/send-verification route
 *
 * Tests the send-verification endpoint including authentication checks,
 * already-verified handling, rate limiting, and email sending.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies before importing route
vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
  generateVerificationToken: vi.fn(),
}));

vi.mock('@/lib/email', () => ({
  sendWelcomeEmail: vi.fn(),
}));

vi.mock('@/lib/ratelimit', () => ({
  checkEmailRateLimit: vi.fn(),
  rateLimitHeaders: vi.fn(() => ({})),
}));

import { POST } from './route';
import { getCurrentUser, generateVerificationToken } from '@/lib/auth';
import { sendWelcomeEmail } from '@/lib/email';
import { checkEmailRateLimit } from '@/lib/ratelimit';

// =============================================================================
// Helpers
// =============================================================================

function createRequest(): NextRequest {
  return new NextRequest('http://localhost:3000/api/email/send-verification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
}

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  emailVerified: false,
};

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  vi.clearAllMocks();

  vi.mocked(getCurrentUser).mockResolvedValue(mockUser as never);
  vi.mocked(checkEmailRateLimit).mockResolvedValue({
    success: true,
    limit: 3,
    remaining: 2,
    reset: Date.now() + 300000,
  });
  vi.mocked(generateVerificationToken).mockResolvedValue('verify-token-xyz');
  vi.mocked(sendWelcomeEmail).mockResolvedValue({ success: true });
});

// =============================================================================
// Successful Request Tests
// =============================================================================

describe('POST /api/email/send-verification - success', () => {
  it('should return success for authenticated unverified user', async () => {
    const request = createRequest();
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('should generate a verification token for the user', async () => {
    const request = createRequest();
    await POST(request);

    expect(generateVerificationToken).toHaveBeenCalledWith('user-123');
  });

  it('should send welcome/verification email with correct data', async () => {
    const request = createRequest();
    await POST(request);

    expect(sendWelcomeEmail).toHaveBeenCalledWith({
      to: 'test@example.com',
      name: 'Test User',
      verifyToken: 'verify-token-xyz',
      userId: 'user-123',
    });
  });

  it('should rate limit by user id', async () => {
    const request = createRequest();
    await POST(request);

    expect(checkEmailRateLimit).toHaveBeenCalledWith('user-123');
  });
});

// =============================================================================
// Authentication Tests
// =============================================================================

describe('POST /api/email/send-verification - authentication', () => {
  it('should return 401 when not authenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const request = createRequest();
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toContain('Not authenticated');
  });

  it('should not proceed when user is not authenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const request = createRequest();
    await POST(request);

    expect(generateVerificationToken).not.toHaveBeenCalled();
    expect(sendWelcomeEmail).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Already Verified Tests
// =============================================================================

describe('POST /api/email/send-verification - already verified', () => {
  it('should return 400 when email is already verified', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      ...mockUser,
      emailVerified: true,
    } as never);

    const request = createRequest();
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('already verified');
  });

  it('should not send email when already verified', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      ...mockUser,
      emailVerified: true,
    } as never);

    const request = createRequest();
    await POST(request);

    expect(sendWelcomeEmail).not.toHaveBeenCalled();
    expect(generateVerificationToken).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Rate Limiting Tests
// =============================================================================

describe('POST /api/email/send-verification - rate limiting', () => {
  it('should return 429 when rate limited', async () => {
    vi.mocked(checkEmailRateLimit).mockResolvedValue({
      success: false,
      limit: 3,
      remaining: 0,
      reset: Date.now() + 300000,
    });

    const request = createRequest();
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toContain('Too many verification emails');
  });

  it('should not send email when rate limited', async () => {
    vi.mocked(checkEmailRateLimit).mockResolvedValue({
      success: false,
      limit: 3,
      remaining: 0,
      reset: Date.now() + 300000,
    });

    const request = createRequest();
    await POST(request);

    expect(sendWelcomeEmail).not.toHaveBeenCalled();
    expect(generateVerificationToken).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Email Send Failure Tests
// =============================================================================

describe('POST /api/email/send-verification - email send failure', () => {
  it('should return 500 when email sending fails', async () => {
    vi.mocked(sendWelcomeEmail).mockResolvedValue({
      success: false,
      error: 'SMTP connection refused',
    });

    const request = createRequest();
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBeDefined();
  });

  it('should return the email service error message', async () => {
    vi.mocked(sendWelcomeEmail).mockResolvedValue({
      success: false,
      error: 'Daily sending limit exceeded',
    });

    const request = createRequest();
    const response = await POST(request);
    const data = await response.json();

    expect(data.error).toBe('Daily sending limit exceeded');
  });

  it('should return generic error when email service returns no error message', async () => {
    vi.mocked(sendWelcomeEmail).mockResolvedValue({
      success: false,
    });

    const request = createRequest();
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('Failed to send email');
  });
});

// =============================================================================
// Error Handling Tests
// =============================================================================

describe('POST /api/email/send-verification - error handling', () => {
  it('should return 500 on unexpected error', async () => {
    vi.mocked(generateVerificationToken).mockRejectedValue(new Error('Unexpected error'));

    const request = createRequest();
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('Failed to send verification email');
  });

  it('should return 500 on getCurrentUser error', async () => {
    vi.mocked(getCurrentUser).mockRejectedValue(new Error('Session store unavailable'));

    const request = createRequest();
    const response = await POST(request);

    expect(response.status).toBe(500);
  });
});
