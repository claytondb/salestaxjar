/**
 * Tests for /api/notifications route
 *
 * Tests notification preference management: GET (fetch or auto-create prefs),
 * PUT (upsert preferences with validation).
 * Uses mocks for database and authentication.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies before importing route
vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    notificationPreference: {
      findUnique: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

import { GET, PUT } from './route';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// =============================================================================
// Helpers
// =============================================================================

function putRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/notifications', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', host: 'localhost:3000' },
    body: JSON.stringify(body),
  });
}

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

const mockPrefs = {
  id: 'pref-123',
  userId: 'user-123',
  emailDeadlineReminders: true,
  emailWeeklyDigest: false,
  emailNewRates: true,
  emailNexusAlerts: true,
  reminderDaysBefore: 7,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

const mockDefaultPrefs = {
  id: 'pref-456',
  userId: 'user-123',
  emailDeadlineReminders: true,
  emailWeeklyDigest: true,
  emailNewRates: true,
  emailNexusAlerts: true,
  reminderDaysBefore: 7,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
  vi.mocked(prisma.notificationPreference.findUnique).mockResolvedValue(mockPrefs);
  vi.mocked(prisma.notificationPreference.create).mockResolvedValue(mockDefaultPrefs);
  vi.mocked(prisma.notificationPreference.upsert).mockResolvedValue(mockPrefs);
});

// =============================================================================
// GET Tests
// =============================================================================

describe('GET /api/notifications - authentication', () => {
  it('should return 401 when not authenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('should return preferences when authenticated', async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.preferences).toBeDefined();
  });
});

describe('GET /api/notifications - existing preferences', () => {
  it('should return existing preferences without creating new ones', async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(prisma.notificationPreference.create).not.toHaveBeenCalled();
  });

  it('should return all preference fields', async () => {
    const response = await GET();
    const body = await response.json();
    const prefs = body.preferences;
    expect(prefs).toHaveProperty('emailDeadlineReminders', true);
    expect(prefs).toHaveProperty('emailWeeklyDigest', false);
    expect(prefs).toHaveProperty('emailNewRates', true);
    expect(prefs).toHaveProperty('emailNexusAlerts', true);
    expect(prefs).toHaveProperty('reminderDaysBefore', 7);
  });

  it('should query by current user id', async () => {
    await GET();
    expect(prisma.notificationPreference.findUnique).toHaveBeenCalledWith({
      where: { userId: 'user-123' },
    });
  });
});

describe('GET /api/notifications - auto-create defaults', () => {
  it('should create default preferences when none exist', async () => {
    vi.mocked(prisma.notificationPreference.findUnique).mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(200);
    expect(prisma.notificationPreference.create).toHaveBeenCalledWith({
      data: { userId: 'user-123' },
    });
  });

  it('should return created preferences when none existed', async () => {
    vi.mocked(prisma.notificationPreference.findUnique).mockResolvedValue(null);
    const response = await GET();
    const body = await response.json();
    expect(body.preferences).toBeDefined();
    expect(body.preferences.emailDeadlineReminders).toBeDefined();
  });
});

describe('GET /api/notifications - error handling', () => {
  it('should return 500 on database error', async () => {
    vi.mocked(prisma.notificationPreference.findUnique).mockRejectedValue(new Error('DB error'));
    const response = await GET();
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Failed to fetch notification preferences');
  });
});

// =============================================================================
// PUT Tests
// =============================================================================

describe('PUT /api/notifications - authentication', () => {
  it('should return 401 when not authenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const response = await PUT(putRequest({ emailDeadlineReminders: true }));
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });
});

describe('PUT /api/notifications - validation', () => {
  it('should return 400 when emailDeadlineReminders is not boolean', async () => {
    const response = await PUT(putRequest({ emailDeadlineReminders: 'yes' }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it('should return 400 when reminderDaysBefore is below minimum', async () => {
    const response = await PUT(putRequest({ reminderDaysBefore: 0 }));
    expect(response.status).toBe(400);
  });

  it('should return 400 when reminderDaysBefore exceeds maximum', async () => {
    const response = await PUT(putRequest({ reminderDaysBefore: 31 }));
    expect(response.status).toBe(400);
  });

  it('should accept valid reminderDaysBefore at boundaries', async () => {
    const response1 = await PUT(putRequest({ reminderDaysBefore: 1 }));
    expect(response1.status).toBe(200);
    const response2 = await PUT(putRequest({ reminderDaysBefore: 30 }));
    expect(response2.status).toBe(200);
  });

  it('should accept empty object (all fields optional)', async () => {
    const response = await PUT(putRequest({}));
    expect(response.status).toBe(200);
  });

  it('should accept all valid boolean fields', async () => {
    const response = await PUT(putRequest({
      emailDeadlineReminders: false,
      emailWeeklyDigest: true,
      emailNewRates: false,
      emailNexusAlerts: true,
    }));
    expect(response.status).toBe(200);
  });
});

describe('PUT /api/notifications - upsert behavior', () => {
  it('should upsert preferences for current user', async () => {
    await PUT(putRequest({ emailDeadlineReminders: true }));
    expect(prisma.notificationPreference.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-123' },
        update: expect.objectContaining({ emailDeadlineReminders: true }),
        create: expect.objectContaining({ userId: 'user-123' }),
      })
    );
  });

  it('should include userId in create block', async () => {
    await PUT(putRequest({ emailNexusAlerts: false }));
    expect(prisma.notificationPreference.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          userId: 'user-123',
          emailNexusAlerts: false,
        }),
      })
    );
  });

  it('should return updated preferences', async () => {
    vi.mocked(prisma.notificationPreference.upsert).mockResolvedValue({
      ...mockPrefs,
      emailWeeklyDigest: true,
    });
    const response = await PUT(putRequest({ emailWeeklyDigest: true }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.preferences.emailWeeklyDigest).toBe(true);
  });

  it('should return all preference fields in response', async () => {
    const response = await PUT(putRequest({ reminderDaysBefore: 14 }));
    const body = await response.json();
    const prefs = body.preferences;
    expect(prefs).toHaveProperty('emailDeadlineReminders');
    expect(prefs).toHaveProperty('emailWeeklyDigest');
    expect(prefs).toHaveProperty('emailNewRates');
    expect(prefs).toHaveProperty('emailNexusAlerts');
    expect(prefs).toHaveProperty('reminderDaysBefore');
  });
});

describe('PUT /api/notifications - error handling', () => {
  it('should return 500 on database error', async () => {
    vi.mocked(prisma.notificationPreference.upsert).mockRejectedValue(new Error('DB error'));
    const response = await PUT(putRequest({ emailDeadlineReminders: true }));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Failed to update notification preferences');
  });
});
