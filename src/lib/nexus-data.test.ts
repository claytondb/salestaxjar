import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./prisma', () => ({
  prisma: {
    $queryRaw: vi.fn(),
    subscription: { findUnique: vi.fn() },
    nexusState: { findMany: vi.fn() },
  },
}))

import { loadNexusInputs, buildNexusReport } from './nexus-data'
import { prisma } from './prisma'

const NOW = new Date('2026-07-01T12:00:00Z')

type MonthRow = { state: string | null; platform: string; month: string; sales: number | string | null; orders: number }
type RangeRow = { platform: string; earliest: Date | null; latest: Date | null }

/** $queryRaw is called for: monthly sales, per-platform ranges, then (if capped plan) monthly counts. */
function mockQueries(monthRows: MonthRow[], rangeRows: RangeRow[], countRows: { month: string; orders: number }[] = []) {
  vi.mocked(prisma.$queryRaw)
    .mockResolvedValueOnce(monthRows as never)
    .mockResolvedValueOnce(rangeRows as never)
    .mockResolvedValueOnce(countRows as never)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.$queryRaw).mockReset()
  vi.mocked(prisma.subscription.findUnique).mockResolvedValue(null as never)
  vi.mocked(prisma.nexusState.findMany).mockResolvedValue([] as never)
})

describe('loadNexusInputs', () => {
  it('maps monthly rows into state months, split by channel, with normalized states', async () => {
    mockQueries(
      [
        { state: 'CA', platform: 'shopify', month: '2026-03', sales: '10000', orders: 10 },
        { state: 'California', platform: 'amazon', month: '2026-03', sales: 5000, orders: 4 },
        { state: 'Texas', platform: 'woocommerce', month: '2025-11', sales: 1000, orders: 1 },
        { state: 'ZZ', platform: 'shopify', month: '2026-03', sales: 999, orders: 1 },
        { state: 'WA', platform: 'shopify', month: '2026-01', sales: null, orders: 2 },
      ],
      [
        { platform: 'shopify', earliest: new Date('2025-01-02T00:00:00Z'), latest: new Date('2026-06-30T00:00:00Z') },
        { platform: 'amazon', earliest: new Date('2026-03-01T00:00:00Z'), latest: new Date('2026-03-31T00:00:00Z') },
      ]
    )
    const { byState, coverage } = await loadNexusInputs('user-1', NOW)
    expect(byState.get('CA')!.get('2026-03')).toEqual({ direct: { sales: 10000, orders: 10 }, marketplace: { sales: 5000, orders: 4 } })
    expect(byState.get('TX')!.get('2025-11')!.direct.sales).toBe(1000)
    expect(byState.get('WA')!.get('2026-01')!.direct).toEqual({ sales: 0, orders: 2 })
    expect(byState.has('ZZ')).toBe(false)
    expect(coverage.direct.earliest?.toISOString()).toBe('2025-01-02T00:00:00.000Z')
    expect(coverage.marketplace.earliest?.toISOString()).toBe('2026-03-01T00:00:00.000Z')
    expect(coverage.earliestOrder?.toISOString()).toBe('2025-01-02T00:00:00.000Z')
    expect(coverage.hasMarketplaceData).toBe(true)
  })

  it('flags months where the plan cap was reached', async () => {
    mockQueries([], [{ platform: 'shopify', earliest: new Date('2025-01-02T00:00:00Z'), latest: NOW }], [
      { month: '2026-04', orders: 50 },
      { month: '2026-05', orders: 12 },
    ])
    const { coverage } = await loadNexusInputs('user-1', NOW)
    expect(coverage.planOrderLimit).toBe(50)
    expect(coverage.cappedMonths).toEqual(['2026-04'])
  })

  it('skips the cap query on unlimited plans', async () => {
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({ plan: 'enterprise', status: 'active' } as never)
    mockQueries([], [])
    const { coverage } = await loadNexusInputs('user-1', NOW)
    expect(coverage.planOrderLimit).toBeNull()
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(2)
  })

  it('reads registered and tracked states', async () => {
    vi.mocked(prisma.nexusState.findMany).mockResolvedValue([
      { stateCode: 'WA', registrationNumber: 'WA-1' },
      { stateCode: 'tx', registrationNumber: null },
    ] as never)
    mockQueries([], [])
    const { registrations } = await loadNexusInputs('user-1', NOW)
    expect(registrations.get('WA')).toBe('registered')
    expect(registrations.get('TX')).toBe('tracked')
  })
})

describe('buildNexusReport', () => {
  it('returns evaluations for every state plus summary and top actions', async () => {
    mockQueries(
      Array.from({ length: 6 }, (_, i) => ({ state: 'WA', platform: 'shopify', month: `2026-0${i + 1}`, sales: 25_000, orders: 100 })),
      [{ platform: 'shopify', earliest: new Date('2024-01-02T00:00:00Z'), latest: new Date('2026-06-30T00:00:00Z') }]
    )
    const report = await buildNexusReport('user-1', NOW)
    expect(report.evaluations).toHaveLength(51)
    expect(report.evaluations[0]).toMatchObject({ stateCode: 'WA', status: 'exceeded', overNow: true })
    expect(report.summary.registerNowCount).toBe(1)
    expect(report.topActions[0]).toMatchObject({ kind: 'register', stateCode: 'WA' })
  })
})
