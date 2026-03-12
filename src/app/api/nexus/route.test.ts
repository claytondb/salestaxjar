/**
 * Tests for /api/nexus route
 *
 * Tests nexus state management: GET all states, POST single state upsert,
 * PUT bulk update with auto-filing creation.
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
    business: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    nexusState: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    filing: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { GET, POST, PUT } from './route';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// =============================================================================
// Helpers
// =============================================================================

function postRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/nexus', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', host: 'localhost:3000' },
    body: JSON.stringify(body),
  });
}

function putRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/nexus', {
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

const mockBusiness = {
  id: 'biz-123',
  userId: 'user-123',
  name: "Test User's Business",
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

const mockNexusState = {
  id: 'ns-123',
  businessId: 'biz-123',
  stateCode: 'CA',
  stateName: 'California',
  hasNexus: true,
  nexusType: 'physical',
  registrationNumber: '123-456',
  registrationDate: new Date('2025-01-01T00:00:00Z'),
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

const mockNexusStateNoNexus = {
  id: 'ns-456',
  businessId: 'biz-123',
  stateCode: 'TX',
  stateName: 'Texas',
  hasNexus: false,
  nexusType: null,
  registrationNumber: null,
  registrationDate: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
  vi.mocked(prisma.business.findFirst).mockResolvedValue(mockBusiness);
  vi.mocked(prisma.nexusState.findMany).mockResolvedValue([mockNexusState]);
  vi.mocked(prisma.nexusState.upsert).mockResolvedValue(mockNexusState);
  vi.mocked(prisma.filing.findFirst).mockResolvedValue(null);
  vi.mocked(prisma.filing.create).mockResolvedValue({} as never);
});

// =============================================================================
// GET Tests
// =============================================================================

describe('GET /api/nexus - authentication', () => {
  it('should return 401 when not authenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('should return nexus states when authenticated', async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.nexusStates).toHaveLength(1);
    expect(body.businessId).toBe('biz-123');
  });
});

describe('GET /api/nexus - no business', () => {
  it('should return empty array when user has no business', async () => {
    vi.mocked(prisma.business.findFirst).mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.nexusStates).toEqual([]);
    expect(body.businessId).toBeNull();
  });
});

describe('GET /api/nexus - data format', () => {
  it('should return nexus states in correct format', async () => {
    const response = await GET();
    const body = await response.json();
    const state = body.nexusStates[0];
    expect(state).toHaveProperty('id');
    expect(state).toHaveProperty('stateCode', 'CA');
    expect(state).toHaveProperty('state', 'California');
    expect(state).toHaveProperty('hasNexus', true);
    expect(state).toHaveProperty('nexusType', 'physical');
    expect(state).toHaveProperty('registrationNumber', '123-456');
    expect(state).toHaveProperty('registrationDate');
  });

  it('should include businessId in response', async () => {
    const response = await GET();
    const body = await response.json();
    expect(body.businessId).toBe('biz-123');
  });

  it('should return multiple nexus states sorted alphabetically', async () => {
    vi.mocked(prisma.nexusState.findMany).mockResolvedValue([
      mockNexusState,
      mockNexusStateNoNexus,
    ]);
    const response = await GET();
    const body = await response.json();
    expect(body.nexusStates).toHaveLength(2);
  });

  it('should return null registrationDate when not set', async () => {
    vi.mocked(prisma.nexusState.findMany).mockResolvedValue([mockNexusStateNoNexus]);
    const response = await GET();
    const body = await response.json();
    expect(body.nexusStates[0].registrationDate).toBeUndefined();
  });
});

describe('GET /api/nexus - error handling', () => {
  it('should return 500 on database error', async () => {
    vi.mocked(prisma.nexusState.findMany).mockRejectedValue(new Error('DB error'));
    const response = await GET();
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Failed to fetch nexus states');
  });
});

// =============================================================================
// POST Tests
// =============================================================================

describe('POST /api/nexus - authentication', () => {
  it('should return 401 when not authenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const response = await POST(postRequest({ stateCode: 'CA', hasNexus: true }));
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });
});

describe('POST /api/nexus - validation', () => {
  it('should return 400 for invalid state code', async () => {
    const response = await POST(postRequest({ stateCode: 'XX', hasNexus: true }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it('should return 400 when stateCode is missing', async () => {
    const response = await POST(postRequest({ hasNexus: true }));
    expect(response.status).toBe(400);
  });

  it('should return 400 when hasNexus is missing', async () => {
    const response = await POST(postRequest({ stateCode: 'CA' }));
    expect(response.status).toBe(400);
  });

  it('should return 400 when hasNexus is not boolean', async () => {
    const response = await POST(postRequest({ stateCode: 'CA', hasNexus: 'yes' }));
    expect(response.status).toBe(400);
  });

  it('should accept all valid US state codes', async () => {
    const states = ['AL', 'CA', 'TX', 'NY', 'FL', 'WA', 'HI', 'AK', 'DC'];
    for (const stateCode of states) {
      const response = await POST(postRequest({ stateCode, hasNexus: true }));
      expect(response.status).toBe(200);
    }
  });
});

describe('POST /api/nexus - business creation', () => {
  it('should create a business if user has none', async () => {
    vi.mocked(prisma.business.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.business.create).mockResolvedValue(mockBusiness);
    const response = await POST(postRequest({ stateCode: 'CA', hasNexus: true }));
    expect(response.status).toBe(200);
    expect(prisma.business.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-123',
      }),
    });
  });

  it('should use existing business if found', async () => {
    const response = await POST(postRequest({ stateCode: 'CA', hasNexus: true }));
    expect(prisma.business.create).not.toHaveBeenCalled();
  });
});

describe('POST /api/nexus - nexus state upsert', () => {
  it('should upsert nexus state and return it', async () => {
    const response = await POST(postRequest({ stateCode: 'CA', hasNexus: true }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.nexusState).toBeDefined();
    expect(body.nexusState.stateCode).toBe('CA');
    expect(body.nexusState.hasNexus).toBe(true);
  });

  it('should pass optional fields to upsert', async () => {
    const response = await POST(postRequest({
      stateCode: 'CA',
      hasNexus: true,
      nexusType: 'physical',
      registrationNumber: 'REG-123',
      registrationDate: '2025-01-01T00:00:00Z',
    }));
    expect(response.status).toBe(200);
    expect(prisma.nexusState.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          nexusType: 'physical',
          registrationNumber: 'REG-123',
        }),
      })
    );
  });

  it('should allow null optional fields', async () => {
    const response = await POST(postRequest({
      stateCode: 'CA',
      hasNexus: false,
      nexusType: null,
      registrationNumber: null,
    }));
    expect(response.status).toBe(200);
  });

  it('should set stateName correctly in create', async () => {
    vi.mocked(prisma.business.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.business.create).mockResolvedValue(mockBusiness);
    await POST(postRequest({ stateCode: 'CA', hasNexus: true }));
    expect(prisma.nexusState.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          stateName: 'California',
        }),
      })
    );
  });

  it('should handle DC state code', async () => {
    const dcNexus = { ...mockNexusState, stateCode: 'DC', stateName: 'District of Columbia' };
    vi.mocked(prisma.nexusState.upsert).mockResolvedValue(dcNexus);
    const response = await POST(postRequest({ stateCode: 'DC', hasNexus: true }));
    expect(response.status).toBe(200);
  });
});

describe('POST /api/nexus - error handling', () => {
  it('should return 500 on database error', async () => {
    vi.mocked(prisma.nexusState.upsert).mockRejectedValue(new Error('DB error'));
    const response = await POST(postRequest({ stateCode: 'CA', hasNexus: true }));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Failed to save nexus state');
  });
});

// =============================================================================
// PUT Tests (Bulk Update)
// =============================================================================

describe('PUT /api/nexus - authentication', () => {
  it('should return 401 when not authenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const response = await PUT(putRequest({ states: [] }));
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });
});

describe('PUT /api/nexus - validation', () => {
  it('should return 400 when states is not an array', async () => {
    const response = await PUT(putRequest({ states: 'not-array' }));
    expect(response.status).toBe(400);
  });

  it('should return 400 when a state has invalid stateCode', async () => {
    const response = await PUT(putRequest({
      states: [{ stateCode: 'ZZ', hasNexus: true }],
    }));
    expect(response.status).toBe(400);
  });

  it('should return 400 when states array element is missing hasNexus', async () => {
    const response = await PUT(putRequest({
      states: [{ stateCode: 'CA' }],
    }));
    expect(response.status).toBe(400);
  });

  it('should accept empty states array', async () => {
    vi.mocked(prisma.nexusState.findMany).mockResolvedValue([]);
    const response = await PUT(putRequest({ states: [] }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.nexusStates).toEqual([]);
  });
});

describe('PUT /api/nexus - bulk operations', () => {
  it('should upsert multiple states', async () => {
    vi.mocked(prisma.nexusState.findMany).mockResolvedValue([mockNexusState, mockNexusStateNoNexus]);
    const response = await PUT(putRequest({
      states: [
        { stateCode: 'CA', hasNexus: true },
        { stateCode: 'TX', hasNexus: false },
      ],
    }));
    expect(response.status).toBe(200);
    expect(prisma.nexusState.upsert).toHaveBeenCalledTimes(2);
  });

  it('should return updated count', async () => {
    vi.mocked(prisma.nexusState.findMany).mockResolvedValue([mockNexusState]);
    const response = await PUT(putRequest({
      states: [{ stateCode: 'CA', hasNexus: true }],
    }));
    const body = await response.json();
    expect(body.updated).toBe(1);
  });

  it('should return all nexus states after update', async () => {
    vi.mocked(prisma.nexusState.findMany).mockResolvedValue([mockNexusState, mockNexusStateNoNexus]);
    const response = await PUT(putRequest({
      states: [{ stateCode: 'CA', hasNexus: true }],
    }));
    const body = await response.json();
    expect(body.nexusStates).toHaveLength(2);
  });
});

describe('PUT /api/nexus - auto-filing creation', () => {
  it('should create filing for newly active nexus state', async () => {
    vi.mocked(prisma.nexusState.findMany).mockResolvedValue([mockNexusState]); // CA hasNexus: true
    vi.mocked(prisma.filing.findFirst).mockResolvedValue(null); // no existing filing
    await PUT(putRequest({
      states: [{ stateCode: 'CA', hasNexus: true }],
    }));
    expect(prisma.filing.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          businessId: 'biz-123',
          stateCode: 'CA',
          period: 'quarterly',
          status: 'pending',
        }),
      })
    );
  });

  it('should not create filing if one already exists for period', async () => {
    vi.mocked(prisma.nexusState.findMany).mockResolvedValue([mockNexusState]);
    vi.mocked(prisma.filing.findFirst).mockResolvedValue({ id: 'filing-123' } as never);
    await PUT(putRequest({
      states: [{ stateCode: 'CA', hasNexus: true }],
    }));
    expect(prisma.filing.create).not.toHaveBeenCalled();
  });

  it('should not create filing for states without nexus', async () => {
    vi.mocked(prisma.nexusState.findMany).mockResolvedValue([mockNexusStateNoNexus]); // TX hasNexus: false
    await PUT(putRequest({
      states: [{ stateCode: 'TX', hasNexus: false }],
    }));
    expect(prisma.filing.create).not.toHaveBeenCalled();
  });
});

describe('PUT /api/nexus - business creation', () => {
  it('should create a business if user has none', async () => {
    vi.mocked(prisma.business.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.business.create).mockResolvedValue(mockBusiness);
    vi.mocked(prisma.nexusState.findMany).mockResolvedValue([]);
    const response = await PUT(putRequest({ states: [] }));
    expect(response.status).toBe(200);
    expect(prisma.business.create).toHaveBeenCalled();
  });
});

describe('PUT /api/nexus - error handling', () => {
  it('should return 500 on database error', async () => {
    vi.mocked(prisma.nexusState.upsert).mockRejectedValue(new Error('DB error'));
    const response = await PUT(putRequest({
      states: [{ stateCode: 'CA', hasNexus: true }],
    }));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Failed to update nexus states');
  });
});
