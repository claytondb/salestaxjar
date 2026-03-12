/**
 * Tests for /api/auth/me route
 * 
 * Tests the current user endpoint.
 * Uses mocks for database and authentication functions.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing route
vi.mock('@/lib/prisma', () => ({
  prisma: {
    betaUser: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}));

import { GET } from './route';
import { prisma } from '@/lib/prisma';
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
    currentPeriodEnd: new Date('2026-02-01T00:00:00Z'),
    cancelAtPeriodEnd: false,
  },
};

const mockBetaUser = {
  id: 'beta-123',
  email: 'test@example.com',
  name: null,
  source: null,
  status: 'redeemed',
  notes: null,
  redeemedAt: null,
  redeemedUserId: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  vi.clearAllMocks();
  
  // Default mock implementations
  vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
  vi.mocked(prisma.betaUser.findUnique).mockResolvedValue(null);
});

// =============================================================================
// Authentication Tests
// =============================================================================

describe('GET /api/auth/me - authentication', () => {
  it('should return 401 when not authenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    
    const response = await GET();
    const data = await response.json();
    
    expect(response.status).toBe(401);
    expect(data.error).toBe('Not authenticated');
  });

  it('should return 200 when authenticated', async () => {
    const response = await GET();
    
    expect(response.status).toBe(200);
  });
});

// =============================================================================
// User Data Tests
// =============================================================================

describe('GET /api/auth/me - user data', () => {
  it('should return user id', async () => {
    const response = await GET();
    const data = await response.json();
    
    expect(data.user.id).toBe('user-123');
  });

  it('should return user email', async () => {
    const response = await GET();
    const data = await response.json();
    
    expect(data.user.email).toBe('test@example.com');
  });

  it('should return user name', async () => {
    const response = await GET();
    const data = await response.json();
    
    expect(data.user.name).toBe('Test User');
  });

  it('should return emailVerified status', async () => {
    const response = await GET();
    const data = await response.json();
    
    expect(data.user.emailVerified).toBe(true);
  });

  it('should return createdAt as ISO string', async () => {
    const response = await GET();
    const data = await response.json();
    
    expect(data.user.createdAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('should return null subscription when user has none', async () => {
    const response = await GET();
    const data = await response.json();
    
    expect(data.user.subscription).toBeNull();
  });
});

// =============================================================================
// Subscription Tests
// =============================================================================

describe('GET /api/auth/me - subscription data', () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockResolvedValue(mockUserWithSubscription);
  });

  it('should return subscription plan', async () => {
    const response = await GET();
    const data = await response.json();
    
    expect(data.user.subscription.plan).toBe('starter');
  });

  it('should return subscription status', async () => {
    const response = await GET();
    const data = await response.json();
    
    expect(data.user.subscription.status).toBe('active');
  });

  it('should return currentPeriodEnd as ISO string', async () => {
    const response = await GET();
    const data = await response.json();
    
    expect(data.user.subscription.currentPeriodEnd).toBe('2026-02-01T00:00:00.000Z');
  });

  it('should return cancelAtPeriodEnd', async () => {
    const response = await GET();
    const data = await response.json();
    
    expect(data.user.subscription.cancelAtPeriodEnd).toBe(false);
  });

  it('should handle subscription with cancelAtPeriodEnd true', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      ...mockUser,
      subscription: {
        ...mockUserWithSubscription.subscription,
        cancelAtPeriodEnd: true,
      },
    });
    
    const response = await GET();
    const data = await response.json();
    
    expect(data.user.subscription.cancelAtPeriodEnd).toBe(true);
  });

  it('should handle null currentPeriodEnd', async () => {
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
    
    const response = await GET();
    const data = await response.json();
    
    // currentPeriodEnd?.toISOString() returns undefined when null
    expect(data.user.subscription.currentPeriodEnd).toBeUndefined();
  });
});

// =============================================================================
// Beta User Tests
// =============================================================================

describe('GET /api/auth/me - beta user status', () => {
  it('should return isBetaUser false when not a beta user', async () => {
    vi.mocked(prisma.betaUser.findUnique).mockResolvedValue(null);
    
    const response = await GET();
    const data = await response.json();
    
    expect(data.user.isBetaUser).toBe(false);
  });

  it('should return isBetaUser true when status is redeemed', async () => {
    vi.mocked(prisma.betaUser.findUnique).mockResolvedValue(mockBetaUser);
    
    const response = await GET();
    const data = await response.json();
    
    expect(data.user.isBetaUser).toBe(true);
  });

  it('should return isBetaUser false when status is pending', async () => {
    vi.mocked(prisma.betaUser.findUnique).mockResolvedValue({
      ...mockBetaUser,
      status: 'pending',
    });
    
    const response = await GET();
    const data = await response.json();
    
    expect(data.user.isBetaUser).toBe(false);
  });

  it('should return isBetaUser false when status is approved', async () => {
    vi.mocked(prisma.betaUser.findUnique).mockResolvedValue({
      ...mockBetaUser,
      status: 'approved',
    });
    
    const response = await GET();
    const data = await response.json();
    
    expect(data.user.isBetaUser).toBe(false);
  });

  it('should query beta user by lowercase email', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      ...mockUser,
      email: 'TEST@EXAMPLE.COM',
    });
    
    await GET();
    
    expect(prisma.betaUser.findUnique).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
    });
  });
});

// =============================================================================
// Error Handling Tests
// =============================================================================

describe('GET /api/auth/me - error handling', () => {
  it('should return 500 on getCurrentUser error', async () => {
    vi.mocked(getCurrentUser).mockRejectedValue(new Error('Auth error'));
    
    const response = await GET();
    const data = await response.json();
    
    expect(response.status).toBe(500);
    expect(data.error).toBe('An error occurred');
  });

  it('should return 500 on database error', async () => {
    vi.mocked(prisma.betaUser.findUnique).mockRejectedValue(new Error('DB error'));
    
    const response = await GET();
    const data = await response.json();
    
    expect(response.status).toBe(500);
    expect(data.error).toBe('An error occurred');
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('GET /api/auth/me - edge cases', () => {
  it('should handle user with no name', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      ...mockUser,
      name: null,
    } as any);
    
    const response = await GET();
    const data = await response.json();
    
    expect(data.user.name).toBeNull();
  });

  it('should handle user with emailVerified false', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      ...mockUser,
      emailVerified: false,
    });
    
    const response = await GET();
    const data = await response.json();
    
    expect(data.user.emailVerified).toBe(false);
  });

  it('should not expose sensitive fields', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      ...mockUser,
      passwordHash: '$2b$10$sensitive',
    } as any);
    
    const response = await GET();
    const data = await response.json();
    
    expect(data.user.passwordHash).toBeUndefined();
  });
});

// =============================================================================
// Response Structure Tests
// =============================================================================

describe('GET /api/auth/me - response structure', () => {
  it('should have user object at top level', async () => {
    const response = await GET();
    const data = await response.json();
    
    expect(data).toHaveProperty('user');
    expect(typeof data.user).toBe('object');
  });

  it('should include all expected user fields', async () => {
    const response = await GET();
    const data = await response.json();
    
    expect(data.user).toHaveProperty('id');
    expect(data.user).toHaveProperty('email');
    expect(data.user).toHaveProperty('name');
    expect(data.user).toHaveProperty('emailVerified');
    expect(data.user).toHaveProperty('createdAt');
    expect(data.user).toHaveProperty('isBetaUser');
    expect(data.user).toHaveProperty('subscription');
  });

  it('should return proper JSON content type', async () => {
    const response = await GET();
    
    expect(response.headers.get('content-type')).toContain('application/json');
  });
});
