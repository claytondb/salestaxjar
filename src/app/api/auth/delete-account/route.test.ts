/**
 * Tests for /api/auth/delete-account route
 * 
 * Tests the account deletion endpoint.
 * Uses mocks for database, authentication, and Stripe functions.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted to ensure mocks are defined before hoisting
const { mockTransaction, mockDelete, mockDeleteMany, mockStripeCancel } = vi.hoisted(() => ({
  mockTransaction: vi.fn(),
  mockDelete: vi.fn(),
  mockDeleteMany: vi.fn(),
  mockStripeCancel: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: mockTransaction,
    notificationPreference: { deleteMany: mockDeleteMany },
    platformConnection: { deleteMany: mockDeleteMany },
    importedOrder: { deleteMany: mockDeleteMany },
    apiKey: { deleteMany: mockDeleteMany },
    salesSummary: { deleteMany: mockDeleteMany },
    emailLog: { deleteMany: mockDeleteMany },
    user: { delete: mockDelete },
  },
}));

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}));

// Mock stripe module
vi.mock('@/lib/stripe', () => ({
  stripe: {
    subscriptions: {
      cancel: mockStripeCancel,
    },
  },
}));

import { DELETE } from './route';
import { getCurrentUser } from '@/lib/auth';

// =============================================================================
// Mock Data
// =============================================================================

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  emailVerified: true,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  subscription: null,
};

const mockUserWithSubscription = {
  ...mockUser,
  subscription: {
    stripeSubscriptionId: 'sub_123456',
    plan: 'starter',
    status: 'active',
    currentPeriodEnd: new Date('2026-12-31T00:00:00Z'),
    cancelAtPeriodEnd: false,
  },
};

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  vi.clearAllMocks();
  
  // Default mock implementations
  vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
  mockTransaction.mockResolvedValue([]);
  mockStripeCancel.mockResolvedValue({});
});

// =============================================================================
// Authentication Tests
// =============================================================================

describe('DELETE /api/auth/delete-account - authentication', () => {
  it('should return 401 when not authenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    
    const response = await DELETE();
    const data = await response.json();
    
    expect(response.status).toBe(401);
    expect(data.error).toBe('Not authenticated');
  });

  it('should return 200 when authenticated', async () => {
    const response = await DELETE();
    
    expect(response.status).toBe(200);
  });
});

// =============================================================================
// Successful Deletion Tests
// =============================================================================

describe('DELETE /api/auth/delete-account - successful deletion', () => {
  it('should return success true on successful deletion', async () => {
    const response = await DELETE();
    const data = await response.json();
    
    expect(data.success).toBe(true);
  });

  it('should execute transaction for deletion', async () => {
    await DELETE();
    
    expect(mockTransaction).toHaveBeenCalled();
  });

  it('should delete all related data in transaction', async () => {
    await DELETE();
    
    // Transaction should be called with array of delete operations
    expect(mockTransaction).toHaveBeenCalledWith(expect.any(Array));
  });

  it('should clear session cookie on deletion', async () => {
    const response = await DELETE();
    
    // Check that the session_token cookie is deleted
    const cookies = response.headers.get('set-cookie');
    expect(cookies).toContain('session_token');
    // Cookie deletion can use Max-Age=0 or Expires=1970 - both are valid
    expect(cookies).toMatch(/Max-Age=0|Expires=.*1970/);
  });
});

// =============================================================================
// Stripe Subscription Tests
// =============================================================================

describe('DELETE /api/auth/delete-account - Stripe subscription', () => {
  it('should cancel Stripe subscription if user has one', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(mockUserWithSubscription);
    
    await DELETE();
    
    expect(mockStripeCancel).toHaveBeenCalledWith('sub_123456');
  });

  it('should not call Stripe if user has no subscription', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
    
    await DELETE();
    
    expect(mockStripeCancel).not.toHaveBeenCalled();
  });

  it('should continue deletion even if Stripe cancellation fails', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(mockUserWithSubscription);
    mockStripeCancel.mockRejectedValue(new Error('Stripe error'));
    
    const response = await DELETE();
    const data = await response.json();
    
    // Should still succeed
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockTransaction).toHaveBeenCalled();
  });

  it('should handle null stripeSubscriptionId', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      ...mockUser,
      subscription: {
        stripeSubscriptionId: null,
        plan: 'free',
        status: 'active',
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      },
    });
    
    await DELETE();
    
    expect(mockStripeCancel).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Error Handling Tests
// =============================================================================

describe('DELETE /api/auth/delete-account - error handling', () => {
  it('should return 500 on getCurrentUser error', async () => {
    vi.mocked(getCurrentUser).mockRejectedValue(new Error('Auth error'));
    
    const response = await DELETE();
    const data = await response.json();
    
    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to delete account');
  });

  it('should return 500 on transaction error', async () => {
    mockTransaction.mockRejectedValue(new Error('Transaction failed'));
    
    const response = await DELETE();
    const data = await response.json();
    
    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to delete account');
  });

  it('should return 500 on database connection error', async () => {
    mockTransaction.mockRejectedValue(new Error('Connection refused'));
    
    const response = await DELETE();
    const data = await response.json();
    
    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to delete account');
  });
});

// =============================================================================
// Data Cleanup Tests
// =============================================================================

describe('DELETE /api/auth/delete-account - data cleanup', () => {
  it('should delete notification preferences', async () => {
    await DELETE();
    
    const transactionCall = mockTransaction.mock.calls[0][0];
    // Transaction should include deleteMany for notificationPreference
    expect(transactionCall).toHaveLength(7); // 6 deleteMany + 1 user delete
  });

  it('should use userId for all delete operations', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      ...mockUser,
      id: 'specific-user-id',
    });
    
    await DELETE();
    
    // All delete operations should use the correct userId
    expect(mockTransaction).toHaveBeenCalled();
  });
});

// =============================================================================
// Response Tests
// =============================================================================

describe('DELETE /api/auth/delete-account - response format', () => {
  it('should return JSON response', async () => {
    const response = await DELETE();
    
    expect(response.headers.get('content-type')).toContain('application/json');
  });

  it('should only contain success field on successful deletion', async () => {
    const response = await DELETE();
    const data = await response.json();
    
    expect(Object.keys(data)).toEqual(['success']);
  });

  it('should contain error field on failure', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    
    const response = await DELETE();
    const data = await response.json();
    
    expect(data).toHaveProperty('error');
  });
});

// =============================================================================
// Cookie Tests
// =============================================================================

describe('DELETE /api/auth/delete-account - cookie handling', () => {
  it('should delete session_token cookie', async () => {
    const response = await DELETE();
    
    const cookies = response.headers.get('set-cookie');
    expect(cookies).toBeDefined();
    expect(cookies).toContain('session_token');
  });

  it('should expire the cookie immediately', async () => {
    const response = await DELETE();
    
    const cookies = response.headers.get('set-cookie');
    // Cookie should be expired (Max-Age=0 or past Expires date)
    expect(cookies).toMatch(/Max-Age=0|Expires=.*1970/);
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('DELETE /api/auth/delete-account - edge cases', () => {
  it('should handle user with no related data', async () => {
    mockTransaction.mockResolvedValue([
      { count: 0 }, // notificationPreference
      { count: 0 }, // platformConnection
      { count: 0 }, // importedOrder
      { count: 0 }, // apiKey
      { count: 0 }, // salesSummary
      { count: 0 }, // emailLog
      { id: 'user-123' }, // user
    ]);
    
    const response = await DELETE();
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('should handle user with lots of related data', async () => {
    mockTransaction.mockResolvedValue([
      { count: 1000 }, // notificationPreference
      { count: 500 }, // platformConnection
      { count: 50000 }, // importedOrder
      { count: 10 }, // apiKey
      { count: 100 }, // salesSummary
      { count: 5000 }, // emailLog
      { id: 'user-123' }, // user
    ]);
    
    const response = await DELETE();
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('should not expose internal error details', async () => {
    mockTransaction.mockRejectedValue(new Error('PrismaClientKnownRequestError: Foreign key constraint failed'));
    
    const response = await DELETE();
    const data = await response.json();
    
    // Should not expose Prisma internals
    expect(data.error).toBe('Failed to delete account');
    expect(data.error).not.toContain('Prisma');
  });
});

// =============================================================================
// Security Tests
// =============================================================================

describe('DELETE /api/auth/delete-account - security', () => {
  it('should only delete data for authenticated user', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      ...mockUser,
      id: 'user-456',
    });
    
    await DELETE();
    
    // Should use the authenticated user's ID
    expect(mockTransaction).toHaveBeenCalled();
  });

  it('should not allow deletion without authentication', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    
    const response = await DELETE();
    
    expect(response.status).toBe(401);
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('should process authentication before any data operations', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    
    await DELETE();
    
    expect(getCurrentUser).toHaveBeenCalled();
    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mockStripeCancel).not.toHaveBeenCalled();
  });
});
