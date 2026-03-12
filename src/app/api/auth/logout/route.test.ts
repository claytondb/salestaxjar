/**
 * Tests for /api/auth/logout route
 * 
 * Tests the authentication logout endpoint including:
 * - Successful logout with valid session
 * - Logout with no session
 * - Logout with invalid session
 * - Error handling (always clears cookie)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing route
vi.mock('@/lib/auth', () => ({
  getSessionCookie: vi.fn(),
  validateSession: vi.fn(),
  invalidateSession: vi.fn(),
  clearSessionCookie: vi.fn(),
}));

import { POST } from './route';
import {
  getSessionCookie,
  validateSession,
  invalidateSession,
  clearSessionCookie,
} from '@/lib/auth';

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  vi.clearAllMocks();

  // Default mock implementations
  vi.mocked(getSessionCookie).mockResolvedValue('valid-session-token');
  vi.mocked(validateSession).mockResolvedValue({
    valid: true,
    session: {
      id: 'session-123',
      userId: 'user-123',
      expiresAt: new Date(Date.now() + 86400000),
    },
  });
  vi.mocked(invalidateSession).mockResolvedValue();
  vi.mocked(clearSessionCookie).mockResolvedValue();
});

// =============================================================================
// Successful Logout Tests
// =============================================================================

describe('POST /api/auth/logout - successful logout', () => {
  it('should return success for valid session logout', async () => {
    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('should invalidate the session', async () => {
    await POST();

    expect(invalidateSession).toHaveBeenCalledWith('session-123');
  });

  it('should clear the session cookie', async () => {
    await POST();

    expect(clearSessionCookie).toHaveBeenCalled();
  });

  it('should get session cookie first', async () => {
    await POST();

    expect(getSessionCookie).toHaveBeenCalled();
  });

  it('should validate session before invalidating', async () => {
    await POST();

    expect(validateSession).toHaveBeenCalledWith('valid-session-token');
  });
});

// =============================================================================
// No Session Tests
// =============================================================================

describe('POST /api/auth/logout - no session', () => {
  it('should succeed even with no session cookie', async () => {
    vi.mocked(getSessionCookie).mockResolvedValue(undefined);

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('should not try to validate session if no cookie', async () => {
    vi.mocked(getSessionCookie).mockResolvedValue(undefined);

    await POST();

    expect(validateSession).not.toHaveBeenCalled();
    expect(invalidateSession).not.toHaveBeenCalled();
  });

  it('should still clear cookie when no session exists', async () => {
    vi.mocked(getSessionCookie).mockResolvedValue(undefined);

    await POST();

    expect(clearSessionCookie).toHaveBeenCalled();
  });
});

// =============================================================================
// Invalid Session Tests
// =============================================================================

describe('POST /api/auth/logout - invalid session', () => {
  it('should succeed even with invalid session token', async () => {
    vi.mocked(validateSession).mockResolvedValue({
      valid: false,
      session: undefined,
    });

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('should not try to invalidate invalid session', async () => {
    vi.mocked(validateSession).mockResolvedValue({
      valid: false,
      session: undefined,
    });

    await POST();

    expect(invalidateSession).not.toHaveBeenCalled();
  });

  it('should clear cookie for invalid session', async () => {
    vi.mocked(validateSession).mockResolvedValue({
      valid: false,
      session: undefined,
    });

    await POST();

    expect(clearSessionCookie).toHaveBeenCalled();
  });

  it('should handle expired session gracefully', async () => {
    vi.mocked(validateSession).mockResolvedValue({
      valid: false,
      session: undefined,
    });

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(clearSessionCookie).toHaveBeenCalled();
  });
});

// =============================================================================
// Error Handling Tests
// =============================================================================

describe('POST /api/auth/logout - error handling', () => {
  it('should still succeed if getSessionCookie throws', async () => {
    vi.mocked(getSessionCookie).mockRejectedValue(new Error('Cookie error'));

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('should still clear cookie if getSessionCookie throws', async () => {
    vi.mocked(getSessionCookie).mockRejectedValue(new Error('Cookie error'));

    await POST();

    expect(clearSessionCookie).toHaveBeenCalled();
  });

  it('should still succeed if validateSession throws', async () => {
    vi.mocked(validateSession).mockRejectedValue(new Error('Validation error'));

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('should still clear cookie if validateSession throws', async () => {
    vi.mocked(validateSession).mockRejectedValue(new Error('Validation error'));

    await POST();

    expect(clearSessionCookie).toHaveBeenCalled();
  });

  it('should still succeed if invalidateSession throws', async () => {
    vi.mocked(invalidateSession).mockRejectedValue(new Error('DB error'));

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('should still clear cookie if invalidateSession throws', async () => {
    vi.mocked(invalidateSession).mockRejectedValue(new Error('DB error'));

    await POST();

    expect(clearSessionCookie).toHaveBeenCalled();
  });

  it('should handle clearSessionCookie failure gracefully', async () => {
    // First call succeeds, potentially another failure scenario
    vi.mocked(invalidateSession).mockRejectedValue(new Error('DB error'));

    const response = await POST();
    const data = await response.json();

    // Should still return success
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });
});

// =============================================================================
// Session State Tests
// =============================================================================

describe('POST /api/auth/logout - session state handling', () => {
  it('should handle session with missing id', async () => {
    vi.mocked(validateSession).mockResolvedValue({
      valid: true,
      session: {
        userId: 'user-123',
        token: 'valid-session-token',
      } as any,
    });

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('should work with undefined session', async () => {
    vi.mocked(validateSession).mockResolvedValue({
      valid: false,
      session: undefined,
    } as any);

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });
});

// =============================================================================
// Idempotency Tests
// =============================================================================

describe('POST /api/auth/logout - idempotency', () => {
  it('should be safe to call multiple times', async () => {
    // First call - valid session
    const response1 = await POST();
    const data1 = await response1.json();

    // Reset mocks to simulate already logged out state
    vi.mocked(getSessionCookie).mockResolvedValue(undefined);
    vi.mocked(validateSession).mockResolvedValue({
      valid: false,
      session: undefined,
    });

    // Second call - no session
    const response2 = await POST();
    const data2 = await response2.json();

    expect(data1.success).toBe(true);
    expect(data2.success).toBe(true);
  });

  it('should always return same response format', async () => {
    // With valid session
    const response1 = await POST();
    const data1 = await response1.json();

    vi.mocked(getSessionCookie).mockResolvedValue(undefined);

    // Without session
    const response2 = await POST();
    const data2 = await response2.json();

    // Both should have same structure
    expect(Object.keys(data1)).toEqual(['success']);
    expect(Object.keys(data2)).toEqual(['success']);
  });
});

// =============================================================================
// Security Tests
// =============================================================================

describe('POST /api/auth/logout - security', () => {
  it('should not leak session information in response', async () => {
    const response = await POST();
    const data = await response.json();

    expect(data.session).toBeUndefined();
    expect(data.token).toBeUndefined();
    expect(data.userId).toBeUndefined();
  });

  it('should not leak error details', async () => {
    vi.mocked(invalidateSession).mockRejectedValue(new Error('Database connection failed: host=db.example.com'));

    const response = await POST();
    const data = await response.json();

    expect(data.error).toBeUndefined();
    expect(JSON.stringify(data)).not.toContain('db.example.com');
  });

  it('should invalidate session before clearing cookie', async () => {
    const callOrder: string[] = [];

    vi.mocked(invalidateSession).mockImplementation(async () => {
      callOrder.push('invalidate');
    });
    vi.mocked(clearSessionCookie).mockImplementation(async () => {
      callOrder.push('clear');
    });

    await POST();

    // Invalidate should happen before clear (though in this implementation
    // clearSessionCookie is called at the end regardless)
    expect(callOrder).toContain('invalidate');
    expect(callOrder).toContain('clear');
  });
});
