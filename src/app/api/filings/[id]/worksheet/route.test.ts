import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth', () => ({ getCurrentUser: vi.fn() }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    filing: { findFirst: vi.fn() },
    importedOrder: { findMany: vi.fn() },
    $queryRaw: vi.fn(),
  },
}))

import { GET } from './route'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const filing = {
  stateCode: 'TX',
  stateName: 'Texas',
  period: 'quarterly',
  periodStart: new Date('2026-04-01T00:00:00Z'),
  periodEnd: new Date('2026-06-30T00:00:00Z'),
}

const get = (query = '') =>
  GET(new NextRequest(`https://sails.tax/api/filings/f1/worksheet${query}`), { params: Promise.resolve({ id: 'f1' }) })

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getCurrentUser).mockResolvedValue({ id: 'u1' } as never)
  vi.mocked(prisma.filing.findFirst).mockResolvedValue(filing as never)
})

describe('GET /api/filings/:id/worksheet', () => {
  it('requires sign-in and only finds the seller’s own filings', async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(null)
    expect((await get()).status).toBe(401)

    vi.mocked(prisma.filing.findFirst).mockResolvedValueOnce(null)
    expect((await get()).status).toBe(404)
    expect(vi.mocked(prisma.filing.findFirst).mock.calls.at(-1)?.[0]).toMatchObject({
      where: { id: 'f1', business: { userId: 'u1' } },
    })
  })

  it('returns the totals for the filing’s state and period', async () => {
    vi.mocked(prisma.$queryRaw)
      .mockResolvedValueOnce([
        { state: 'TX', platform: 'shopify', orders: 2, sales: 200, shipping: 10, tax: 16.5 },
        { state: 'TX', platform: 'etsy', orders: 1, sales: 40, shipping: 0, tax: 3.3 },
      ] as never)
      .mockResolvedValueOnce([{ platform: 'shopify', latest: new Date('2026-07-02T00:00:00Z') }] as never)
    const res = await get()
    expect(res.status).toBe(200)
    const { worksheet } = await res.json()
    expect(worksheet).toMatchObject({
      periodLabel: 'Q2 2026',
      direct: { orders: 2, sales: 200, tax: 16.5 },
      marketplace: { orders: 1, sales: 40 },
    })
  })

  it('downloads the orders as a CSV file', async () => {
    vi.mocked(prisma.importedOrder.findMany).mockResolvedValue([
      {
        orderDate: new Date('2026-05-02T00:00:00Z'),
        orderNumber: '#1',
        platformOrderId: '1',
        platform: 'shopify',
        shippingState: 'TX',
        shippingCity: 'Austin',
        shippingZip: '78701',
        shippingCountry: 'US',
        totalAmount: 108.25,
        taxAmount: 8.25,
        shippingAmount: 0,
      },
    ] as never)
    const res = await get('?format=csv')
    expect(res.headers.get('content-disposition')).toBe('attachment; filename="sails-tx-2026-04-01-to-2026-06-30.csv"')
    expect(await res.text()).toContain('2026-05-02,#1,shopify,Own store,TX,Austin,78701,100.00,0.00,8.25,108.25')
  })
})
