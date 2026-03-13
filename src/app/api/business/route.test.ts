/**
 * Tests for /api/business route
 *
 * Tests business profile CRUD: GET (fetch), POST (create),
 * PUT (update), DELETE (remove). Covers auth, validation,
 * ownership checks, and error handling.
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
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { GET, POST, PUT, DELETE } from './route';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// =============================================================================
// Helpers
// =============================================================================

function makeRequest(method: string, body?: unknown, url = 'http://localhost:3000/api/business'): NextRequest {
  return new NextRequest(url, {
    method,
    headers: { 'Content-Type': 'application/json', host: 'localhost:3000' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function deleteRequest(id: string): NextRequest {
  return new NextRequest(`http://localhost:3000/api/business?id=${id}`, {
    method: 'DELETE',
    headers: { host: 'localhost:3000' },
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
  name: 'Test Shop',
  address: '123 Main St',
  city: 'Springfield',
  state: 'IL',
  zip: '62701',
  businessType: 'ecommerce',
  ein: '12-3456789',
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
  vi.mocked(prisma.business.create).mockResolvedValue(mockBusiness);
  vi.mocked(prisma.business.update).mockResolvedValue(mockBusiness);
  vi.mocked(prisma.business.delete).mockResolvedValue(mockBusiness);
});

// =============================================================================
// GET Tests - Authentication
// =============================================================================

describe('GET /api/business - authentication', () => {
  it('should return 401 when not authenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('should return 200 for authenticated user', async () => {
    const response = await GET();
    expect(response.status).toBe(200);
  });
});

// =============================================================================
// GET Tests - Response
// =============================================================================

describe('GET /api/business - response format', () => {
  it('should return business object when one exists', async () => {
    const response = await GET();
    const body = await response.json();
    expect(body.business).toBeDefined();
    expect(body.business.id).toBe('biz-123');
    expect(body.business.name).toBe('Test Shop');
  });

  it('should return null business when user has none', async () => {
    vi.mocked(prisma.business.findFirst).mockResolvedValue(null);
    const response = await GET();
    const body = await response.json();
    expect(body.business).toBeNull();
  });

  it('should query by userId', async () => {
    await GET();
    expect(prisma.business.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-123' } })
    );
  });

  it('should return all business fields', async () => {
    const response = await GET();
    const body = await response.json();
    const biz = body.business;
    expect(biz.id).toBeDefined();
    expect(biz.name).toBeDefined();
    expect(biz.businessType).toBeDefined();
  });
});

// =============================================================================
// GET Tests - Error Handling
// =============================================================================

describe('GET /api/business - error handling', () => {
  it('should return 500 on database error', async () => {
    vi.mocked(prisma.business.findFirst).mockRejectedValue(new Error('DB error'));
    const response = await GET();
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toContain('Failed to fetch');
  });
});

// =============================================================================
// POST Tests - Authentication
// =============================================================================

describe('POST /api/business - authentication', () => {
  it('should return 401 when not authenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const response = await POST(makeRequest('POST', { name: 'My Shop' }));
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });
});

// =============================================================================
// POST Tests - Validation
// =============================================================================

describe('POST /api/business - validation', () => {
  it('should return 400 when name is missing', async () => {
    const response = await POST(makeRequest('POST', { address: '123 Main St' }));
    expect(response.status).toBe(400);
  });

  it('should return 400 when name is empty', async () => {
    const response = await POST(makeRequest('POST', { name: '' }));
    expect(response.status).toBe(400);
  });

  it('should return 400 when name exceeds 255 characters', async () => {
    const response = await POST(makeRequest('POST', { name: 'a'.repeat(256) }));
    expect(response.status).toBe(400);
  });

  it('should accept a valid name', async () => {
    const response = await POST(makeRequest('POST', { name: 'My Shop' }));
    expect(response.status).toBe(201);
  });

  it('should accept all optional fields', async () => {
    const response = await POST(makeRequest('POST', {
      name: 'My Shop',
      address: '123 Main St',
      city: 'Chicago',
      state: 'IL',
      zip: '60601',
      businessType: 'retail',
      ein: '12-3456789',
    }));
    expect(response.status).toBe(201);
  });

  it('should return 400 when address exceeds 500 characters', async () => {
    const response = await POST(makeRequest('POST', { name: 'My Shop', address: 'a'.repeat(501) }));
    expect(response.status).toBe(400);
  });
});

// =============================================================================
// POST Tests - Creation
// =============================================================================

describe('POST /api/business - creation', () => {
  it('should return 201 on success', async () => {
    const response = await POST(makeRequest('POST', { name: 'My Shop' }));
    expect(response.status).toBe(201);
  });

  it('should return business in response', async () => {
    const response = await POST(makeRequest('POST', { name: 'My Shop' }));
    const body = await response.json();
    expect(body.business).toBeDefined();
    expect(body.business.id).toBe('biz-123');
  });

  it('should create business with userId', async () => {
    await POST(makeRequest('POST', { name: 'My Shop' }));
    expect(prisma.business.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 'user-123', name: 'My Shop' }),
      })
    );
  });

  it('should default businessType to ecommerce', async () => {
    await POST(makeRequest('POST', { name: 'My Shop' }));
    expect(prisma.business.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ businessType: 'ecommerce' }),
      })
    );
  });
});

// =============================================================================
// POST Tests - Error Handling
// =============================================================================

describe('POST /api/business - error handling', () => {
  it('should return 500 on database error', async () => {
    vi.mocked(prisma.business.create).mockRejectedValue(new Error('DB error'));
    const response = await POST(makeRequest('POST', { name: 'My Shop' }));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toContain('Failed to create');
  });
});

// =============================================================================
// PUT Tests - Authentication
// =============================================================================

describe('PUT /api/business - authentication', () => {
  it('should return 401 when not authenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const response = await PUT(makeRequest('PUT', { id: 'biz-123', name: 'Updated' }));
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });
});

// =============================================================================
// PUT Tests - Validation
// =============================================================================

describe('PUT /api/business - validation', () => {
  it('should return 400 when id is missing', async () => {
    const response = await PUT(makeRequest('PUT', { name: 'Updated Name' }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('ID');
  });

  it('should return 404 when business not found or not owned', async () => {
    vi.mocked(prisma.business.findFirst).mockResolvedValue(null);
    const response = await PUT(makeRequest('PUT', { id: 'biz-999', name: 'Updated' }));
    expect(response.status).toBe(404);
  });

  it('should accept partial updates (only name)', async () => {
    const response = await PUT(makeRequest('PUT', { id: 'biz-123', name: 'New Name' }));
    expect(response.status).toBe(200);
  });

  it('should return 400 when name exceeds 255 characters', async () => {
    const response = await PUT(makeRequest('PUT', { id: 'biz-123', name: 'a'.repeat(256) }));
    expect(response.status).toBe(400);
  });
});

// =============================================================================
// PUT Tests - Update
// =============================================================================

describe('PUT /api/business - update', () => {
  it('should return 200 on success', async () => {
    const response = await PUT(makeRequest('PUT', { id: 'biz-123', name: 'Updated' }));
    expect(response.status).toBe(200);
  });

  it('should return updated business', async () => {
    vi.mocked(prisma.business.update).mockResolvedValue({ ...mockBusiness, name: 'Updated' });
    const response = await PUT(makeRequest('PUT', { id: 'biz-123', name: 'Updated' }));
    const body = await response.json();
    expect(body.business.name).toBe('Updated');
  });

  it('should verify ownership before update', async () => {
    await PUT(makeRequest('PUT', { id: 'biz-123', name: 'Updated' }));
    expect(prisma.business.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'biz-123', userId: 'user-123' } })
    );
  });

  it('should call prisma.business.update with correct id', async () => {
    await PUT(makeRequest('PUT', { id: 'biz-123', name: 'Updated' }));
    expect(prisma.business.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'biz-123' } })
    );
  });
});

// =============================================================================
// PUT Tests - Error Handling
// =============================================================================

describe('PUT /api/business - error handling', () => {
  it('should return 500 on database error', async () => {
    vi.mocked(prisma.business.update).mockRejectedValue(new Error('DB error'));
    const response = await PUT(makeRequest('PUT', { id: 'biz-123', name: 'Updated' }));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toContain('Failed to update');
  });
});

// =============================================================================
// DELETE Tests - Authentication
// =============================================================================

describe('DELETE /api/business - authentication', () => {
  it('should return 401 when not authenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const response = await DELETE(deleteRequest('biz-123'));
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });
});

// =============================================================================
// DELETE Tests - Validation
// =============================================================================

describe('DELETE /api/business - validation', () => {
  it('should return 400 when id query param is missing', async () => {
    const response = await DELETE(makeRequest('DELETE', undefined, 'http://localhost:3000/api/business'));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('ID');
  });

  it('should return 404 when business not found', async () => {
    vi.mocked(prisma.business.findFirst).mockResolvedValue(null);
    const response = await DELETE(deleteRequest('biz-999'));
    expect(response.status).toBe(404);
  });

  it('should return 404 when business belongs to another user', async () => {
    vi.mocked(prisma.business.findFirst).mockResolvedValue(null); // ownership check fails
    const response = await DELETE(deleteRequest('biz-other'));
    expect(response.status).toBe(404);
  });
});

// =============================================================================
// DELETE Tests - Deletion
// =============================================================================

describe('DELETE /api/business - deletion', () => {
  it('should return 200 on success', async () => {
    const response = await DELETE(deleteRequest('biz-123'));
    expect(response.status).toBe(200);
  });

  it('should return success: true', async () => {
    const response = await DELETE(deleteRequest('biz-123'));
    const body = await response.json();
    expect(body.success).toBe(true);
  });

  it('should verify ownership before deletion', async () => {
    await DELETE(deleteRequest('biz-123'));
    expect(prisma.business.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'biz-123', userId: 'user-123' } })
    );
  });

  it('should call prisma.business.delete with correct id', async () => {
    await DELETE(deleteRequest('biz-123'));
    expect(prisma.business.delete).toHaveBeenCalledWith({ where: { id: 'biz-123' } });
  });
});

// =============================================================================
// DELETE Tests - Error Handling
// =============================================================================

describe('DELETE /api/business - error handling', () => {
  it('should return 500 on database error', async () => {
    vi.mocked(prisma.business.delete).mockRejectedValue(new Error('DB error'));
    const response = await DELETE(deleteRequest('biz-123'));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toContain('Failed to delete');
  });
});
