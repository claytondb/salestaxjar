import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./prisma', () => ({
  prisma: {
    importedOrder: {
      groupBy: vi.fn(),
      aggregate: vi.fn(),
      count: vi.fn(),
    },
  },
}))

import { loadNexusInputs, buildNexusReport } from './nexus-data'
import { prisma } from './prisma'

const NOW = new Date('2026-07-01T12:00:00Z')

type Row = { shippingState: string | null; platform: string; _sum: { totalAmount: number | null; taxAmount: number | null }; _count: { _all: number } }

function row(state: string | null, platform: string, total: number, tax: number, orders: number): Row {
  return { shippingState: state, platform, _sum: { totalAmount: total, taxAmount: tax }, _count: { _all: orders } }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.importedOrder.aggregate).mockResolvedValue({
    _min: { orderDate: new Date('2025-01-02T00:00:00Z') },
    _max: { orderDate: new Date('2026-06-30T00:00:00Z') },
  } as never)
  vi.mocked(prisma.importedOrder.count).mockResolvedValue(3 as never)
})

describe('loadNexusInputs', () => {
  it('runs one grouped query per window, scoped to the user, US orders and real sales', async () => {
    vi.mocked(prisma.importedOrder.groupBy).mockResolvedValue([] as never)
    await loadNexusInputs('user-1', NOW)
    const calls = vi.mocked(prisma.importedOrder.groupBy).mock.calls
    expect(calls).toHaveLength(3)
    const where = (calls[0][0] as { where: Record<string, unknown> }).where
    expect(where).toMatchObject({ userId: 'user-1', shippingCountry: 'US' })
    expect((where.status as { notIn: string[] }).notIn).toEqual(expect.arrayContaining(['cancelled', 'refunded', 'failed']))
    expect(where.orderDate).toEqual({
      gte: new Date('2025-01-01T00:00:00Z'),
      lt: new Date('2026-01-01T00:00:00Z'),
    })
  })

  it('subtracts collected tax, splits marketplace from direct sales and normalizes states', async () => {
    vi.mocked(prisma.importedOrder.groupBy)
      .mockResolvedValueOnce([
        row('CA', 'shopify', 10_800, 800, 10),
        row('California', 'amazon', 5_400, 400, 4),
        row('Texas', 'woocommerce', 1_000, 0, 1),
        row('ZZ', 'shopify', 999, 0, 1), // not a state → ignored
        row(null, 'shopify', 999, 0, 1),
      ] as never)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([] as never)

    const { byState, coverage } = await loadNexusInputs('user-1', NOW)
    const ca = byState.get('CA')!
    expect(ca.previousYear.direct).toEqual({ sales: 10_000, orders: 10 })
    expect(ca.previousYear.marketplace).toEqual({ sales: 5_000, orders: 4 })
    expect(byState.get('TX')!.previousYear.direct.sales).toBe(1_000)
    expect(byState.has('ZZ')).toBe(false)
    expect(coverage.hasMarketplaceData).toBe(true)
    expect(coverage.earliestOrder?.toISOString()).toBe('2025-01-02T00:00:00.000Z')
  })
})

describe('buildNexusReport', () => {
  it('returns evaluations for every state plus summary and top actions', async () => {
    vi.mocked(prisma.importedOrder.groupBy)
      .mockResolvedValueOnce([row('WA', 'shopify', 150_000, 0, 700)] as never) // previous year
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([] as never)
    const report = await buildNexusReport('user-1', NOW)
    expect(report.evaluations).toHaveLength(51)
    expect(report.evaluations[0].stateCode).toBe('WA')
    expect(report.evaluations[0].status).toBe('exceeded')
    expect(report.summary.exceededCount).toBe(1)
    expect(report.topActions[0]).toMatchObject({ kind: 'register', stateCode: 'WA' })
    expect(report.coverage.hasMarketplaceData).toBe(true)
  })
})
