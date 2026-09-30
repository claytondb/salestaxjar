import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth', () => ({ getCurrentUser: vi.fn() }))
vi.mock('@/lib/prisma', () => ({
  prisma: { importedOrder: { deleteMany: vi.fn(), groupBy: vi.fn() } },
}))
vi.mock('@/lib/usage', () => ({
  applyMonthlyOrderCap: vi.fn(),
  freeUserImportError: vi.fn(() => ({ error: 'Plan upgrade required' })),
}))
vi.mock('@/lib/platforms', () => ({ saveImportedOrders: vi.fn() }))
vi.mock('@/lib/nexus-alerts', () => ({ checkAndCreateAlerts: vi.fn() }))
vi.mock('@/lib/ratelimit', () => ({
  checkApiRateLimit: vi.fn(async () => ({ success: true })),
  rateLimitHeaders: vi.fn(() => ({})),
}))

import { POST, GET, DELETE } from './route'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { applyMonthlyOrderCap } from '@/lib/usage'
import { saveImportedOrders } from '@/lib/platforms'
import { checkAndCreateAlerts } from '@/lib/nexus-alerts'
import { checkApiRateLimit } from '@/lib/ratelimit'

const user = { id: 'u1', email: 'a@example.com', emailVerified: true, subscription: null }

function post(body: unknown) {
  return new NextRequest('https://sails.tax/api/orders/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const order = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  date: '2026-05-01T15:00:00.000Z',
  state: 'CA',
  sales: 20,
  tax: 1.5,
  ...extra,
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getCurrentUser).mockResolvedValue(user as never)
  vi.mocked(applyMonthlyOrderCap).mockImplementation((async ({ items }: { items: unknown[] }) => ({
    items,
    truncated: false,
    skipped: 0,
    limit: 50,
    remaining: 50,
  })) as never)
  vi.mocked(saveImportedOrders).mockImplementation((async (_u: string, _c: string, orders: unknown[]) => ({
    imported: orders.length,
    errors: [],
  })) as never)
  vi.mocked(checkAndCreateAlerts).mockResolvedValue([{}] as never)
  vi.mocked(prisma.importedOrder.deleteMany).mockResolvedValue({ count: 0 } as never)
})

describe('POST /api/orders/import', () => {
  it('requires sign-in', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null)
    expect((await POST(post({ platform: 'shopify', orders: [order('1')] }))).status).toBe(401)
  })

  it('saves only the fields Sails needs, under the file-import source', async () => {
    const res = await POST(post({ platform: 'shopify', orders: [order('5550001')] }))
    expect(res.status).toBe(200)
    const [userId, connectionId, saved] = vi.mocked(saveImportedOrders).mock.calls[0]
    expect(userId).toBe('u1')
    expect(connectionId).toBe('file-import')
    expect(saved).toEqual([
      expect.objectContaining({
        platform: 'shopify',
        platformOrderId: '5550001',
        orderDate: new Date('2026-05-01T15:00:00.000Z'),
        subtotal: 20,
        taxAmount: 1.5,
        totalAmount: 21.5,
        status: 'imported',
        shippingState: 'CA',
        shippingCountry: 'US',
      }),
    ])
    expect(await res.json()).toMatchObject({ imported: 1, rejected: 0 })
  })

  it('keeps the order number people know the order by', async () => {
    await POST(post({ platform: 'shopify', orders: [order('5550001', { number: '#1001' }), order('5550002')] }))
    const saved = vi.mocked(saveImportedOrders).mock.calls[0][2]
    expect(saved.map((o) => o.orderNumber)).toEqual(['#1001', '5550002'])
  })

  it('rejects orders outside the US or with impossible dates, and keeps the rest', async () => {
    const res = await POST(
      post({
        platform: 'upload',
        orders: [order('a'), order('b', { state: 'ON' }), order('c', { date: '2090-01-01T00:00:00.000Z' }), order('d', { date: '2001-01-01T00:00:00.000Z' })],
      })
    )
    expect(await res.json()).toMatchObject({ imported: 1, rejected: 3 })
  })

  it('applies the monthly order limit and reports what it left out', async () => {
    vi.mocked(applyMonthlyOrderCap).mockResolvedValue({ items: [], truncated: true, skipped: 2, limit: 50, remaining: 0 } as never)
    const res = await POST(post({ platform: 'etsy', orders: [order('1'), order('2')] }))
    expect(await res.json()).toMatchObject({ imported: 0, skippedOverLimit: 2, monthlyLimit: 50 })
  })

  it('moves a generic file between own store and marketplace instead of counting it twice', async () => {
    await POST(post({ platform: 'upload-marketplace', orders: [order('row-x')] }))
    expect(prisma.importedOrder.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'u1', platform: 'upload', platformConnectionId: 'file-import', platformOrderId: { in: ['row-x'] } },
    })
  })

  it('checks thresholds once, on the last batch', async () => {
    await POST(post({ platform: 'shopify', orders: [order('1')] }))
    expect(checkAndCreateAlerts).not.toHaveBeenCalled()
    const res = await POST(post({ platform: 'shopify', orders: [order('2')], final: true }))
    expect(checkAndCreateAlerts).toHaveBeenCalledWith('u1')
    expect(await res.json()).toMatchObject({ newAlerts: 1 })
  })

  it('validates the batch', async () => {
    expect((await POST(post({ platform: 'ebay', orders: [order('1')] }))).status).toBe(400)
    expect((await POST(post({ platform: 'shopify', orders: [] }))).status).toBe(400)
    expect((await POST(post({ platform: 'shopify', orders: [order('1', { sales: -5 })] }))).status).toBe(400)
    const tooMany = Array.from({ length: 1001 }, (_, i) => order(String(i)))
    expect((await POST(post({ platform: 'shopify', orders: tooMany }))).status).toBe(400)
  })

  it('is rate limited', async () => {
    vi.mocked(checkApiRateLimit).mockResolvedValueOnce({ success: false } as never)
    expect((await POST(post({ platform: 'shopify', orders: [order('1')] }))).status).toBe(429)
  })
})

describe('GET /api/orders/import', () => {
  it('summarizes file imports by source', async () => {
    vi.mocked(prisma.importedOrder.groupBy).mockResolvedValue([
      {
        platform: 'shopify',
        _count: { _all: 12 },
        _min: { orderDate: new Date('2025-01-02T00:00:00Z') },
        _max: { orderDate: new Date('2026-09-01T00:00:00Z'), updatedAt: new Date('2026-09-29T00:00:00Z') },
      },
    ] as never)
    const body = await (await GET()).json()
    expect(body).toMatchObject({ monthlyLimit: 50, planName: 'Free' })
    expect(body.imports).toEqual([
      { platform: 'shopify', orders: 12, from: '2025-01-02T00:00:00.000Z', to: '2026-09-01T00:00:00.000Z', lastImported: '2026-09-29T00:00:00.000Z' },
    ])
    expect(vi.mocked(prisma.importedOrder.groupBy).mock.calls[0][0]).toMatchObject({
      where: { userId: 'u1', platformConnectionId: 'file-import' },
    })
  })
})

describe('DELETE /api/orders/import', () => {
  it('removes only file-imported orders for that source', async () => {
    vi.mocked(prisma.importedOrder.deleteMany).mockResolvedValue({ count: 7 } as never)
    const res = await DELETE(new NextRequest('https://sails.tax/api/orders/import?platform=etsy', { method: 'DELETE' }))
    expect(await res.json()).toEqual({ removed: 7 })
    expect(prisma.importedOrder.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'u1', platform: 'etsy', platformConnectionId: 'file-import' },
    })
  })

  it('refuses unknown sources', async () => {
    const res = await DELETE(new NextRequest('https://sails.tax/api/orders/import?platform=woocommerce', { method: 'DELETE' }))
    expect(res.status).toBe(400)
  })
})
