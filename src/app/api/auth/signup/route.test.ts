/**
 * Tests for /api/auth/signup route
 * 
 * Tests the user registration endpoint including:
 * - Input validation (email, name, password)
 * - Rate limiting
 * - Duplicate user handling
 * - Session creation
 * - Beta user handling
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies before importing route
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    notificationPreference: {
      create: vi.fn(),
    },
    betaUser: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    subscription: {
      create: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  hashPassword: vi.fn(),
  validateEmail: vi.fn(),
  validatePassword: vi.fn(),
  validateName: vi.fn(),
  sanitizeInput: vi.fn((input: string) => input.trim()),
  createSession: vi.fn(),
  setSessionCookie: vi.fn(),
  generateVerificationToken: vi.fn(),
}));

vi.mock('@/lib/email', () => ({
  sendWelcomeEmail: vi.fn(),
  sendNewSignupNotification: vi.fn(),
}));

vi.mock('@/lib/ratelimit', () => ({
  checkAuthRateLimit: vi.fn(),
  rateLimitHeaders: vi.fn(() => ({})),
}));

import { POST } from './route';
import { prisma } from '@/lib/prisma';
import {
  hashPassword,
  validateEmail,
  validatePassword,
  validateName,
  createSession,
  setSessionCookie,
  generateVerificationToken,
} from '@/lib/auth';
import { sendWelcomeEmail, sendNewSignupNotification } from '@/lib/email';
import { checkAuthRateLimit, rateLimitHeaders } from '@/lib/ratelimit';

// =============================================================================
// Helper Functions
// =============================================================================

function createSignupRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'TestAgent/1.0',
    },
  });
}

// Mock created user
const mockCreatedUser = {
  id: 'user-new-123',
  email: 'newuser@example.com',
  name: 'New User',
  passwordHash: '$2b$10$hashedpassword',
  emailVerified: false,
  isBetaUser: false,
  verifyToken: null,
  verifyExpires: null,
  resetToken: null,
  resetExpires: null,
  createdAt: new Date('2026-03-11T00:00:00Z'),
  updatedAt: new Date('2026-03-11T00:00:00Z'),
};

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  vi.clearAllMocks();

  // Default mock implementations for successful signup
  vi.mocked(checkAuthRateLimit).mockResolvedValue({
    success: true,
    limit: 10,
    remaining: 9,
    reset: Date.now() + 60000,
  });
  vi.mocked(validateEmail).mockReturnValue(true);
  vi.mocked(validateName).mockReturnValue(true);
  vi.mocked(validatePassword).mockReturnValue({ valid: true, errors: [] });
  vi.mocked(prisma.user.findUnique).mockResolvedValue(null); // No existing user
  vi.mocked(hashPassword).mockResolvedValue('$2b$10$hashedpassword');
  vi.mocked(prisma.user.create).mockResolvedValue(mockCreatedUser);
  vi.mocked(createSession).mockResolvedValue({ sessionId: 'session-id-123', token: 'session-token-123' });
  vi.mocked(setSessionCookie).mockResolvedValue();
  vi.mocked(generateVerificationToken).mockResolvedValue('verify-token-123');
  vi.mocked(sendWelcomeEmail).mockResolvedValue({ success: true });
  vi.mocked(sendNewSignupNotification).mockResolvedValue({ success: true });
  vi.mocked(prisma.notificationPreference.create).mockResolvedValue({ id: 'pref-1' } as any);
  vi.mocked(prisma.betaUser.findUnique).mockResolvedValue(null);
});

// =============================================================================
// Successful Signup Tests
// =============================================================================

describe('POST /api/auth/signup - successful signup', () => {
  it('should return success for valid registration', async () => {
    const request = createSignupRequest({
      email: 'newuser@example.com',
      password: 'SecurePass123!',
      name: 'New User',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.user).toBeDefined();
    expect(data.user.email).toBe('newuser@example.com');
    expect(data.user.name).toBe('New User');
  });

  it('should hash password before storing', async () => {
    const request = createSignupRequest({
      email: 'newuser@example.com',
      password: 'SecurePass123!',
      name: 'New User',
    });

    await POST(request);

    expect(hashPassword).toHaveBeenCalledWith('SecurePass123!');
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        passwordHash: '$2b$10$hashedpassword',
      }),
    });
  });

  it('should create session after signup', async () => {
    const request = createSignupRequest({
      email: 'newuser@example.com',
      password: 'SecurePass123!',
      name: 'New User',
    });

    await POST(request);

    expect(createSession).toHaveBeenCalledWith(
      'user-new-123',
      'TestAgent/1.0',
      undefined
    );
    expect(setSessionCookie).toHaveBeenCalledWith('session-token-123');
  });

  it('should send welcome email with verification token', async () => {
    const request = createSignupRequest({
      email: 'newuser@example.com',
      password: 'SecurePass123!',
      name: 'New User',
    });

    await POST(request);

    expect(generateVerificationToken).toHaveBeenCalledWith('user-new-123');
    expect(sendWelcomeEmail).toHaveBeenCalledWith({
      to: 'newuser@example.com',
      name: 'New User',
      verifyToken: 'verify-token-123',
      userId: 'user-new-123',
    });
  });

  it('should notify admin of new signup', async () => {
    const request = createSignupRequest({
      email: 'newuser@example.com',
      password: 'SecurePass123!',
      name: 'New User',
    });

    await POST(request);

    expect(sendNewSignupNotification).toHaveBeenCalledWith({
      userName: 'New User',
      userEmail: 'newuser@example.com',
    });
  });

  it('should create default notification preferences', async () => {
    const request = createSignupRequest({
      email: 'newuser@example.com',
      password: 'SecurePass123!',
      name: 'New User',
    });

    await POST(request);

    expect(prisma.notificationPreference.create).toHaveBeenCalledWith({
      data: { userId: 'user-new-123' },
    });
  });

  it('should lowercase email before storing', async () => {
    const request = createSignupRequest({
      email: 'NewUser@EXAMPLE.com',
      password: 'SecurePass123!',
      name: 'New User',
    });

    await POST(request);

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: 'newuser@example.com',
      }),
    });
  });

  it('should not include password hash in response', async () => {
    const request = createSignupRequest({
      email: 'newuser@example.com',
      password: 'SecurePass123!',
      name: 'New User',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.user.passwordHash).toBeUndefined();
    expect(data.user.password).toBeUndefined();
  });
});

// =============================================================================
// Email Validation Tests
// =============================================================================

describe('POST /api/auth/signup - email validation', () => {
  it('should reject invalid email format', async () => {
    vi.mocked(validateEmail).mockReturnValue(false);

    const request = createSignupRequest({
      email: 'invalid-email',
      password: 'SecurePass123!',
      name: 'Test User',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Please enter a valid email address');
  });

  it('should reject empty email', async () => {
    vi.mocked(validateEmail).mockReturnValue(false);

    const request = createSignupRequest({
      email: '',
      password: 'SecurePass123!',
      name: 'Test User',
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('should reject missing email', async () => {
    vi.mocked(validateEmail).mockReturnValue(false);

    const request = createSignupRequest({
      password: 'SecurePass123!',
      name: 'Test User',
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});

// =============================================================================
// Name Validation Tests
// =============================================================================

describe('POST /api/auth/signup - name validation', () => {
  it('should reject invalid name', async () => {
    vi.mocked(validateName).mockReturnValue(false);

    const request = createSignupRequest({
      email: 'test@example.com',
      password: 'SecurePass123!',
      name: '',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Please enter a valid name');
  });

  it('should reject missing name', async () => {
    vi.mocked(validateName).mockReturnValue(false);

    const request = createSignupRequest({
      email: 'test@example.com',
      password: 'SecurePass123!',
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});

// =============================================================================
// Password Validation Tests
// =============================================================================

describe('POST /api/auth/signup - password validation', () => {
  it('should reject weak password', async () => {
    vi.mocked(validatePassword).mockReturnValue({
      valid: false,
      errors: ['Password must be at least 8 characters'],
    });

    const request = createSignupRequest({
      email: 'test@example.com',
      password: 'weak',
      name: 'Test User',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Password must be at least 8 characters');
  });

  it('should reject password without uppercase', async () => {
    vi.mocked(validatePassword).mockReturnValue({
      valid: false,
      errors: ['Password must contain at least one uppercase letter'],
    });

    const request = createSignupRequest({
      email: 'test@example.com',
      password: 'alllowercase123!',
      name: 'Test User',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('uppercase');
  });

  it('should reject empty password', async () => {
    vi.mocked(validatePassword).mockReturnValue({
      valid: false,
      errors: ['Password is required'],
    });

    const request = createSignupRequest({
      email: 'test@example.com',
      password: '',
      name: 'Test User',
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});

// =============================================================================
// Duplicate User Tests
// =============================================================================

describe('POST /api/auth/signup - duplicate user handling', () => {
  it('should reject if email already exists', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'existing-user',
      email: 'test@example.com',
      name: 'Existing User',
    } as any);

    const request = createSignupRequest({
      email: 'test@example.com',
      password: 'SecurePass123!',
      name: 'New User',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('An account with this email already exists');
  });

  it('should not reveal if unverified account exists', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'existing-user',
      email: 'test@example.com',
      emailVerified: false,
    } as any);

    const request = createSignupRequest({
      email: 'test@example.com',
      password: 'SecurePass123!',
      name: 'New User',
    });

    const response = await POST(request);
    const data = await response.json();

    // Should still reject - same message for security
    expect(response.status).toBe(400);
    expect(data.error).toBe('An account with this email already exists');
  });
});

// =============================================================================
// Rate Limiting Tests
// =============================================================================

describe('POST /api/auth/signup - rate limiting', () => {
  it('should reject when rate limit exceeded', async () => {
    vi.mocked(checkAuthRateLimit).mockResolvedValue({
      success: false,
      limit: 10,
      remaining: 0,
      reset: Date.now() + 60000,
    });

    const request = createSignupRequest({
      email: 'test@example.com',
      password: 'SecurePass123!',
      name: 'Test User',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toContain('Too many signup attempts');
  });

  it('should include rate limit headers on 429', async () => {
    const mockHeaders = { 'X-RateLimit-Remaining': '0' };
    vi.mocked(rateLimitHeaders).mockReturnValue(mockHeaders);
    vi.mocked(checkAuthRateLimit).mockResolvedValue({
      success: false,
      limit: 10,
      remaining: 0,
      reset: Date.now() + 60000,
    });

    const request = createSignupRequest({
      email: 'test@example.com',
      password: 'SecurePass123!',
      name: 'Test User',
    });

    await POST(request);

    expect(rateLimitHeaders).toHaveBeenCalled();
  });
});

// =============================================================================
// Beta User Tests
// =============================================================================

describe('POST /api/auth/signup - beta user handling', () => {
  it('should grant Pro subscription to invited beta user', async () => {
    vi.mocked(prisma.betaUser.findUnique).mockResolvedValue({
      email: 'beta@example.com',
      status: 'invited',
    } as any);
    vi.mocked(prisma.user.create).mockResolvedValue({
      ...mockCreatedUser,
      email: 'beta@example.com',
    });

    const request = createSignupRequest({
      email: 'beta@example.com',
      password: 'SecurePass123!',
      name: 'Beta User',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.isBetaUser).toBe(true);
    expect(prisma.betaUser.update).toHaveBeenCalledWith({
      where: { email: 'beta@example.com' },
      data: expect.objectContaining({
        status: 'redeemed',
      }),
    });
    expect(prisma.subscription.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        plan: 'pro',
        status: 'active',
      }),
    });
  });

  it('should mark user as beta user', async () => {
    vi.mocked(prisma.betaUser.findUnique).mockResolvedValue({
      email: 'beta@example.com',
      status: 'invited',
    } as any);
    vi.mocked(prisma.user.create).mockResolvedValue({
      ...mockCreatedUser,
      email: 'beta@example.com',
    });

    const request = createSignupRequest({
      email: 'beta@example.com',
      password: 'SecurePass123!',
      name: 'Beta User',
    });

    await POST(request);

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-new-123' },
      data: { isBetaUser: true },
    });
  });

  it('should not grant Pro to non-invited beta user', async () => {
    vi.mocked(prisma.betaUser.findUnique).mockResolvedValue({
      email: 'waitlist@example.com',
      status: 'waitlisted',
    } as any);

    const request = createSignupRequest({
      email: 'waitlist@example.com',
      password: 'SecurePass123!',
      name: 'Waitlist User',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.isBetaUser).toBe(false);
    expect(prisma.subscription.create).not.toHaveBeenCalled();
  });

  it('should not fail signup if beta check throws', async () => {
    vi.mocked(prisma.betaUser.findUnique).mockRejectedValue(new Error('DB error'));

    const request = createSignupRequest({
      email: 'test@example.com',
      password: 'SecurePass123!',
      name: 'Test User',
    });

    const response = await POST(request);
    const data = await response.json();

    // Should still succeed
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });
});

// =============================================================================
// Error Handling Tests
// =============================================================================

describe('POST /api/auth/signup - error handling', () => {
  it('should handle database error during user creation', async () => {
    vi.mocked(prisma.user.create).mockRejectedValue(new Error('Database error'));

    const request = createSignupRequest({
      email: 'test@example.com',
      password: 'SecurePass123!',
      name: 'Test User',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('An error occurred during signup');
  });

  it('should handle session creation failure', async () => {
    vi.mocked(createSession).mockRejectedValue(new Error('Session error'));

    const request = createSignupRequest({
      email: 'test@example.com',
      password: 'SecurePass123!',
      name: 'Test User',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('An error occurred during signup');
  });

  it('should handle invalid JSON body', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      body: 'invalid json',
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('An error occurred during signup');
  });
});

// =============================================================================
// Input Sanitization Tests
// =============================================================================

describe('POST /api/auth/signup - input sanitization', () => {
  it('should trim whitespace from email', async () => {
    const request = createSignupRequest({
      email: '  test@example.com  ',
      password: 'SecurePass123!',
      name: 'Test User',
    });

    await POST(request);

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: 'test@example.com',
      }),
    });
  });

  it('should trim whitespace from name', async () => {
    const request = createSignupRequest({
      email: 'test@example.com',
      password: 'SecurePass123!',
      name: '  Test User  ',
    });

    await POST(request);

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Test User',
      }),
    });
  });
});

// =============================================================================
// Response Format Tests
// =============================================================================

describe('POST /api/auth/signup - response format', () => {
  it('should return user object with correct fields', async () => {
    const request = createSignupRequest({
      email: 'newuser@example.com',
      password: 'SecurePass123!',
      name: 'New User',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.user).toHaveProperty('id');
    expect(data.user).toHaveProperty('email');
    expect(data.user).toHaveProperty('name');
    expect(data.user).toHaveProperty('emailVerified');
    expect(data.user).toHaveProperty('createdAt');
  });

  it('should return ISO formatted createdAt', async () => {
    const request = createSignupRequest({
      email: 'newuser@example.com',
      password: 'SecurePass123!',
      name: 'New User',
    });

    const response = await POST(request);
    const data = await response.json();

    // Should be ISO 8601 format
    expect(data.user.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});
