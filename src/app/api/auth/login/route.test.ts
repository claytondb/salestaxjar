/**
 * Tests for /api/auth/login route
 * 
 * Tests the authentication login endpoint.
 * Uses mocks for database and authentication functions.
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
  verifyPassword: vi.fn(),
  validateEmail: vi.fn(),
  sanitizeInput: vi.fn((input: string) => input.trim()),
  createSession: vi.fn(),
  setSessionCookie: vi.fn(),
}));

vi.mock('@/lib/ratelimit', () => ({
  checkAuthRateLimit: vi.fn(),
  rateLimitHeaders: vi.fn(() => ({})),
}));

import { POST } from './route';
import { prisma } from '@/lib/prisma';
import { verifyPassword, validateEmail, createSession, setSessionCookie } from '@/lib/auth';
import { checkAuthRateLimit } from '@/lib/ratelimit';

// =============================================================================
// Helper Functions
// =============================================================================

function createLoginRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 
      'Content-Type': 'application/json',
      'User-Agent': 'TestAgent/1.0',
    },
  });
}

// Mock user for tests
const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  passwordHash: '$2b$10$hashedpassword',
  emailVerified: true,
  isBetaUser: false,
  verifyToken: null,
  verifyExpires: null,
  resetToken: null,
  resetExpires: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  vi.clearAllMocks();
  
  // Default mock implementations
  vi.mocked(checkAuthRateLimit).mockResolvedValue({
    success: true,
    limit: 10,
    remaining: 9,
    reset: Date.now() + 60000,
  });
  vi.mocked(validateEmail).mockReturnValue(true);
  vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
  vi.mocked(verifyPassword).mockResolvedValue(true);
  vi.mocked(createSession).mockResolvedValue({ sessionId: 'session-id-123', token: 'session-token-123' });
  vi.mocked(setSessionCookie).mockResolvedValue();
});

// =============================================================================
// Successful Login Tests
// =============================================================================

describe('POST /api/auth/login - successful login', () => {
  it('should return success for valid credentials', async () => {
    const request = createLoginRequest({
      email: 'test@example.com',
      password: 'correctpassword',
    });
    
    const response = await POST(request);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.user).toBeDefined();
  });

  it('should return user data on successful login', async () => {
    const request = createLoginRequest({
      email: 'test@example.com',
      password: 'correctpassword',
    });
    
    const response = await POST(request);
    const data = await response.json();
    
    expect(data.user.id).toBe('user-123');
    expect(data.user.email).toBe('test@example.com');
    expect(data.user.name).toBe('Test User');
    expect(data.user.emailVerified).toBe(true);
  });

  it('should create a session on successful login', async () => {
    const request = createLoginRequest({
      email: 'test@example.com',
      password: 'correctpassword',
    });
    
    await POST(request);
    
    expect(createSession).toHaveBeenCalledWith(
      'user-123',
      'TestAgent/1.0',
      undefined
    );
  });

  it('should set session cookie on successful login', async () => {
    const request = createLoginRequest({
      email: 'test@example.com',
      password: 'correctpassword',
    });
    
    await POST(request);
    
    expect(setSessionCookie).toHaveBeenCalledWith('session-token-123');
  });

  it('should normalize email to lowercase', async () => {
    const request = createLoginRequest({
      email: 'TEST@EXAMPLE.COM',
      password: 'correctpassword',
    });
    
    await POST(request);
    
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
    });
  });
});

// =============================================================================
// Rate Limiting Tests
// =============================================================================

describe('POST /api/auth/login - rate limiting', () => {
  it('should reject when rate limited', async () => {
    vi.mocked(checkAuthRateLimit).mockResolvedValue({
      success: false,
      limit: 10,
      remaining: 0,
      reset: Date.now() + 300000,
    });
    
    const request = createLoginRequest({
      email: 'test@example.com',
      password: 'password',
    });
    
    const response = await POST(request);
    const data = await response.json();
    
    expect(response.status).toBe(429);
    expect(data.error).toContain('Too many login attempts');
    expect(data.waitTime).toBeDefined();
  });

  it('should include wait time in rate limit response', async () => {
    vi.mocked(checkAuthRateLimit).mockResolvedValue({
      success: false,
      limit: 10,
      remaining: 0,
      reset: Date.now() + 300000, // 5 minutes
    });
    
    const request = createLoginRequest({
      email: 'test@example.com',
      password: 'password',
    });
    
    const response = await POST(request);
    const data = await response.json();
    
    expect(data.waitTime).toBeGreaterThan(0);
    expect(data.waitTime).toBeLessThanOrEqual(5);
  });
});

// =============================================================================
// Email Validation Tests
// =============================================================================

describe('POST /api/auth/login - email validation', () => {
  it('should reject invalid email format', async () => {
    vi.mocked(validateEmail).mockReturnValue(false);
    
    const request = createLoginRequest({
      email: 'not-an-email',
      password: 'password',
    });
    
    const response = await POST(request);
    const data = await response.json();
    
    expect(response.status).toBe(400);
    expect(data.error).toContain('email');
  });

  it('should reject empty email', async () => {
    vi.mocked(validateEmail).mockReturnValue(false);
    
    const request = createLoginRequest({
      email: '',
      password: 'password',
    });
    
    const response = await POST(request);
    
    expect(response.status).toBe(400);
  });

  it('should reject missing email', async () => {
    vi.mocked(validateEmail).mockReturnValue(false);
    
    const request = createLoginRequest({
      password: 'password',
    });
    
    const response = await POST(request);
    
    expect(response.status).toBe(400);
  });
});

// =============================================================================
// User Not Found Tests
// =============================================================================

describe('POST /api/auth/login - user not found', () => {
  it('should return 401 for non-existent user', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    
    const request = createLoginRequest({
      email: 'nonexistent@example.com',
      password: 'password',
    });
    
    const response = await POST(request);
    const data = await response.json();
    
    expect(response.status).toBe(401);
    expect(data.error).toContain('No account found');
  });
});

// =============================================================================
// Password Verification Tests
// =============================================================================

describe('POST /api/auth/login - password verification', () => {
  it('should return 401 for incorrect password', async () => {
    vi.mocked(verifyPassword).mockResolvedValue(false);
    
    const request = createLoginRequest({
      email: 'test@example.com',
      password: 'wrongpassword',
    });
    
    const response = await POST(request);
    const data = await response.json();
    
    expect(response.status).toBe(401);
    expect(data.error).toContain('Incorrect password');
  });

  it('should include attempts remaining on wrong password', async () => {
    vi.mocked(checkAuthRateLimit).mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 7,
      reset: Date.now() + 60000,
    });
    vi.mocked(verifyPassword).mockResolvedValue(false);
    
    const request = createLoginRequest({
      email: 'test@example.com',
      password: 'wrongpassword',
    });
    
    const response = await POST(request);
    const data = await response.json();
    
    expect(data.attemptsRemaining).toBe(7);
  });

  it('should handle empty password', async () => {
    vi.mocked(verifyPassword).mockResolvedValue(false);
    
    const request = createLoginRequest({
      email: 'test@example.com',
      password: '',
    });
    
    const response = await POST(request);
    
    expect(response.status).toBe(401);
  });
});

// =============================================================================
// Error Handling Tests
// =============================================================================

describe('POST /api/auth/login - error handling', () => {
  it('should return 500 on database error', async () => {
    vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error('DB connection failed'));
    
    const request = createLoginRequest({
      email: 'test@example.com',
      password: 'password',
    });
    
    const response = await POST(request);
    const data = await response.json();
    
    expect(response.status).toBe(500);
    expect(data.error).toContain('error occurred');
  });

  it('should return 500 on session creation error', async () => {
    vi.mocked(createSession).mockRejectedValue(new Error('Session creation failed'));
    
    const request = createLoginRequest({
      email: 'test@example.com',
      password: 'password',
    });
    
    const response = await POST(request);
    
    expect(response.status).toBe(500);
  });

  it('should handle invalid JSON body', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: 'not valid json',
      headers: { 'Content-Type': 'application/json' },
    });
    
    const response = await POST(request);
    
    expect(response.status).toBe(500);
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('POST /api/auth/login - edge cases', () => {
  it('should handle email with extra whitespace', async () => {
    const request = createLoginRequest({
      email: '  test@example.com  ',
      password: 'password',
    });
    
    await POST(request);
    
    // sanitizeInput should trim whitespace
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
    });
  });

  it('should handle unicode characters in password', async () => {
    vi.mocked(verifyPassword).mockResolvedValue(true);
    
    const request = createLoginRequest({
      email: 'test@example.com',
      password: 'пароль123中文🔐',
    });
    
    const response = await POST(request);
    
    expect(response.status).toBe(200);
  });

  it('should handle very long password', async () => {
    vi.mocked(verifyPassword).mockResolvedValue(true);
    
    const request = createLoginRequest({
      email: 'test@example.com',
      password: 'a'.repeat(1000),
    });
    
    const response = await POST(request);
    
    expect(response.status).toBe(200);
  });

  it('should include createdAt as ISO string', async () => {
    const request = createLoginRequest({
      email: 'test@example.com',
      password: 'correctpassword',
    });
    
    const response = await POST(request);
    const data = await response.json();
    
    expect(data.user.createdAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('should not expose password hash in response', async () => {
    const request = createLoginRequest({
      email: 'test@example.com',
      password: 'correctpassword',
    });
    
    const response = await POST(request);
    const data = await response.json();
    
    expect(data.user.passwordHash).toBeUndefined();
    expect(JSON.stringify(data)).not.toContain('$2b$');
  });
});

// =============================================================================
// Security Tests
// =============================================================================

describe('POST /api/auth/login - security', () => {
  it('should check rate limit before processing', async () => {
    vi.mocked(checkAuthRateLimit).mockResolvedValue({
      success: false,
      limit: 10,
      remaining: 0,
      reset: Date.now() + 60000,
    });
    
    const request = createLoginRequest({
      email: 'test@example.com',
      password: 'password',
    });
    
    await POST(request);
    
    // Should not even try to find user if rate limited
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('should validate email format before database lookup', async () => {
    vi.mocked(validateEmail).mockReturnValue(false);
    
    const request = createLoginRequest({
      email: 'invalid-email',
      password: 'password',
    });
    
    await POST(request);
    
    // Should not query database with invalid email
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});
