import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({ getCurrentUser: vi.fn() }))
vi.mock('@/lib/ratelimit', () => ({ checkApiRateLimit: vi.fn() }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    business: { findMany: vi.fn() },
    platformConnection: { findMany: vi.fn() },
    nexusAlert: { findMany: vi.fn() },
    notificationPreference: { findUnique: vi.fn() },
    apiKey: { findMany: vi.fn() },
    calculation: { findMany: vi.fn() },
    importedOrder: { findMany: vi.fn() },
  },
}))

import { GET } from './route'
import { EXPORT_PAGE_SIZE } from '@/lib/account-export'
import { getCurrentUser } from '@/lib/auth'
import { checkApiRateLimit } from '@/lib/ratelimit'
import { prisma } from '@/lib/prisma'

const user = { id: 'user-1', email: 'seller@example.com', name: 'Seller' }

function order(i: number) {
  return {
    id: `ord-${i}`,
    platform: 'shopify',
    platformOrderId: String(i),
    orderNumber: `#${i}`,
    orderDate: new Date('2026-08-01T00:00:00Z'),
    subtotal: '10.00',
    shippingAmount: '0',
    taxAmount: '0.80',
    totalAmount: '10.80',
    currency: 'USD',
    status: 'paid',
    shippingCity: 'Austin',
    shippingState: 'TX',
    shippingZip: '78701',
    shippingCountry: 'US',
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getCurrentUser).mockResolvedValue(user as never)
  vi.mocked(checkApiRateLimit).mockResolvedValue({ success: true } as never)
  vi.mocked(prisma.user.findUnique).mockResolvedValue({
    email: user.email,
    name: user.name,
    emailVerified: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    subscription: null,
  } as never)
  vi.mocked(prisma.business.findMany).mockResolvedValue([] as never)
  vi.mocked(prisma.platformConnection.findMany).mockResolvedValue([
    { platform: 'shopify', platformId: 'shop.myshopify.com', platformName: 'Shop', lastSyncAt: null, syncStatus: 'idle', createdAt: new Date() },
  ] as never)
  vi.mocked(prisma.nexusAlert.findMany).mockResolvedValue([] as never)
  vi.mocked(prisma.notificationPreference.findUnique).mockResolvedValue(null as never)
  vi.mocked(prisma.apiKey.findMany).mockResolvedValue([] as never)
  vi.mocked(prisma.calculation.findMany).mockResolvedValue([] as never)
  vi.mocked(prisma.importedOrder.findMany).mockResolvedValue([] as never)
})

describe('GET /api/account/export', () => {
  it('requires a signed-in user', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null as never)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('is rate limited', async () => {
    vi.mocked(checkApiRateLimit).mockResolvedValue({ success: false } as never)
    const res = await GET()
    expect(res.status).toBe(429)
  })

  it('returns a downloadable JSON file', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    expect(res.headers.get('content-disposition')).toMatch(/attachment; filename="sails-data-export-\d{4}-\d{2}-\d{2}\.json"/)
    const body = JSON.parse(await res.text())
    expect(body.format).toBe('sails-account-export/v1')
    expect(body.account.email).toBe(user.email)
    expect(body.importedOrders).toEqual([])
    expect(body.calculations).toEqual([])
    expect(body.storeConnections).toHaveLength(1)
  })

  it('streams every order across pages using a cursor', async () => {
    const firstPage = Array.from({ length: EXPORT_PAGE_SIZE }, (_, i) => order(i))
    const secondPage = [order(EXPORT_PAGE_SIZE), order(EXPORT_PAGE_SIZE + 1)]
    vi.mocked(prisma.importedOrder.findMany)
      .mockResolvedValueOnce(firstPage as never)
      .mockResolvedValueOnce(secondPage as never)

    const res = await GET()
    const body = JSON.parse(await res.text())

    expect(body.importedOrders).toHaveLength(EXPORT_PAGE_SIZE + 2)
    expect(body.importedOrders[0]).toMatchObject({ platformOrderId: '0', subtotal: 10, taxAmount: 0.8, shippingState: 'TX' })
    // Internal ids stay out of the file.
    expect(body.importedOrders[0].id).toBeUndefined()

    const calls = vi.mocked(prisma.importedOrder.findMany).mock.calls
    expect(calls).toHaveLength(2)
    expect(calls[0][0]).toMatchObject({ where: { userId: 'user-1' }, take: EXPORT_PAGE_SIZE })
    expect(calls[0][0]).not.toHaveProperty('cursor')
    expect(calls[1][0]).toMatchObject({ cursor: { id: `ord-${EXPORT_PAGE_SIZE - 1}` }, skip: 1 })
  })

  it('never includes secrets', async () => {
    const res = await GET()
    const text = await res.text()
    expect(text).not.toMatch(/passwordHash|accessToken|refreshToken|keyHash|token"/)
    // Store credentials are never even selected.
    const connArgs = vi.mocked(prisma.platformConnection.findMany).mock.calls[0][0] as { select: Record<string, boolean> }
    expect(connArgs.select).not.toHaveProperty('accessToken')
    expect(connArgs.select).not.toHaveProperty('refreshToken')
  })
})
