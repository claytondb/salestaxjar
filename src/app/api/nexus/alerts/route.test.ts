/**
 * Tests for /api/nexus/alerts route
 *
 * Tests nexus alert management: GET fetch alerts with filtering,
 * PUT mark alerts as read. Uses mocks for auth and nexus-alerts lib.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies before importing route
vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('@/lib/nexus-alerts', () => ({
  getUserAlerts: vi.fn(),
  markAlertsRead: vi.fn(),
}));

import { GET, PUT } from './route';
import { getCurrentUser } from '@/lib/auth';
import { getUserAlerts, markAlertsRead } from '@/lib/nexus-alerts';

// =============================================================================
// Helpers
// =============================================================================

function getRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:3000/api/nexus/alerts');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url.toString());
}

function putRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/nexus/alerts', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
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

const mockAlerts = [
  {
    id: 'alert-1',
    stateCode: 'CA',
    stateName: 'California',
    alertLevel: 'warning',
    salesAmount: 75000,
    threshold: 100000,
    percentage: 75,
    message: 'You are at 75% of the California sales threshold',
    read: false,
    emailSent: true,
    createdAt: new Date('2026-03-01T00:00:00Z'),
  },
  {
    id: 'alert-2',
    stateCode: 'TX',
    stateName: 'Texas',
    alertLevel: 'approaching',
    salesAmount: 50000,
    threshold: 100000,
    percentage: 50,
    message: 'You are approaching the Texas sales threshold',
    read: true,
    emailSent: false,
    createdAt: new Date('2026-02-15T00:00:00Z'),
  },
];

const mockAlertsResult = {
  alerts: mockAlerts,
  unreadCount: 1,
};

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
  vi.mocked(getUserAlerts).mockResolvedValue(mockAlertsResult);
  vi.mocked(markAlertsRead).mockResolvedValue(2);
});

// =============================================================================
// GET Tests
// =============================================================================

describe('GET /api/nexus/alerts - authentication', () => {
  it('should return 401 when not authenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const response = await GET(getRequest());
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('should return 200 when authenticated', async () => {
    const response = await GET(getRequest());
    expect(response.status).toBe(200);
  });
});

describe('GET /api/nexus/alerts - response structure', () => {
  it('should return alerts array and unreadCount', async () => {
    const response = await GET(getRequest());
    const body = await response.json();
    expect(body.alerts).toBeDefined();
    expect(body.unreadCount).toBeDefined();
  });

  it('should return correct alert data structure', async () => {
    const response = await GET(getRequest());
    const body = await response.json();
    const alert = body.alerts[0];
    expect(alert).toHaveProperty('id', 'alert-1');
    expect(alert).toHaveProperty('stateCode', 'CA');
    expect(alert).toHaveProperty('stateName', 'California');
    expect(alert).toHaveProperty('alertLevel', 'warning');
    expect(alert).toHaveProperty('salesAmount', 75000);
    expect(alert).toHaveProperty('threshold', 100000);
    expect(alert).toHaveProperty('percentage', 75);
    expect(alert).toHaveProperty('message');
    expect(alert).toHaveProperty('read', false);
    expect(alert).toHaveProperty('emailSent', true);
    expect(alert).toHaveProperty('createdAt');
  });

  it('should return unread count correctly', async () => {
    const response = await GET(getRequest());
    const body = await response.json();
    expect(body.unreadCount).toBe(1);
  });

  it('should return all alerts when no filter applied', async () => {
    const response = await GET(getRequest());
    const body = await response.json();
    expect(body.alerts).toHaveLength(2);
  });
});

describe('GET /api/nexus/alerts - query parameters', () => {
  it('should pass unreadOnly=true to getUserAlerts', async () => {
    vi.mocked(getUserAlerts).mockResolvedValue({ alerts: [mockAlerts[0]], unreadCount: 1 });
    await GET(getRequest({ unreadOnly: 'true' }));
    expect(getUserAlerts).toHaveBeenCalledWith('user-123', {
      unreadOnly: true,
      limit: 50,
    });
  });

  it('should pass unreadOnly=false when not set', async () => {
    await GET(getRequest());
    expect(getUserAlerts).toHaveBeenCalledWith('user-123', {
      unreadOnly: false,
      limit: 50,
    });
  });

  it('should pass custom limit to getUserAlerts', async () => {
    await GET(getRequest({ limit: '10' }));
    expect(getUserAlerts).toHaveBeenCalledWith('user-123', {
      unreadOnly: false,
      limit: 10,
    });
  });

  it('should use default limit of 50 when not specified', async () => {
    await GET(getRequest());
    expect(getUserAlerts).toHaveBeenCalledWith('user-123', {
      unreadOnly: false,
      limit: 50,
    });
  });

  it('should handle combined unreadOnly and limit', async () => {
    vi.mocked(getUserAlerts).mockResolvedValue({ alerts: [], unreadCount: 0 });
    await GET(getRequest({ unreadOnly: 'true', limit: '5' }));
    expect(getUserAlerts).toHaveBeenCalledWith('user-123', {
      unreadOnly: true,
      limit: 5,
    });
  });
});

describe('GET /api/nexus/alerts - empty results', () => {
  it('should return empty alerts array when no alerts exist', async () => {
    vi.mocked(getUserAlerts).mockResolvedValue({ alerts: [], unreadCount: 0 });
    const response = await GET(getRequest());
    const body = await response.json();
    expect(body.alerts).toEqual([]);
    expect(body.unreadCount).toBe(0);
  });
});

describe('GET /api/nexus/alerts - error handling', () => {
  it('should return 500 on getUserAlerts error', async () => {
    vi.mocked(getUserAlerts).mockRejectedValue(new Error('DB error'));
    const response = await GET(getRequest());
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Failed to fetch nexus alerts');
  });
});

// =============================================================================
// PUT Tests
// =============================================================================

describe('PUT /api/nexus/alerts - authentication', () => {
  it('should return 401 when not authenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const response = await PUT(putRequest({}));
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('should return 200 when authenticated', async () => {
    const response = await PUT(putRequest({}));
    expect(response.status).toBe(200);
  });
});

describe('PUT /api/nexus/alerts - mark all as read', () => {
  it('should mark all alerts read when no alertIds provided', async () => {
    await PUT(putRequest({}));
    expect(markAlertsRead).toHaveBeenCalledWith('user-123', undefined);
  });

  it('should return success and marked count', async () => {
    vi.mocked(markAlertsRead).mockResolvedValue(5);
    const response = await PUT(putRequest({}));
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.marked).toBe(5);
  });
});

describe('PUT /api/nexus/alerts - mark specific alerts as read', () => {
  it('should pass alertIds to markAlertsRead', async () => {
    const alertIds = ['alert-1', 'alert-2'];
    await PUT(putRequest({ alertIds }));
    expect(markAlertsRead).toHaveBeenCalledWith('user-123', alertIds);
  });

  it('should return count of marked alerts', async () => {
    vi.mocked(markAlertsRead).mockResolvedValue(1);
    const response = await PUT(putRequest({ alertIds: ['alert-1'] }));
    const body = await response.json();
    expect(body.marked).toBe(1);
  });

  it('should handle empty alertIds array', async () => {
    vi.mocked(markAlertsRead).mockResolvedValue(0);
    const response = await PUT(putRequest({ alertIds: [] }));
    expect(response.status).toBe(200);
    expect(markAlertsRead).toHaveBeenCalledWith('user-123', []);
  });

  it('should handle single alert id', async () => {
    vi.mocked(markAlertsRead).mockResolvedValue(1);
    const response = await PUT(putRequest({ alertIds: ['alert-1'] }));
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.marked).toBe(1);
  });
});

describe('PUT /api/nexus/alerts - error handling', () => {
  it('should return 500 on markAlertsRead error', async () => {
    vi.mocked(markAlertsRead).mockRejectedValue(new Error('DB error'));
    const response = await PUT(putRequest({ alertIds: ['alert-1'] }));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Failed to mark alerts as read');
  });
});
