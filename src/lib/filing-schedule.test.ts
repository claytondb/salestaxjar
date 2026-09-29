import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./prisma', () => ({
  prisma: {
    filing: { findFirst: vi.fn(), create: vi.fn(), findMany: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
    business: { findMany: vi.fn() },
  },
}))

import { prisma } from './prisma'
import {
  ensureCurrentFilings,
  ensureCurrentFilingsForAll,
  correctPendingDueDates,
  getFilingFrequencies,
  setFilingFrequency,
} from './filing-schedule'

const created = () => vi.mocked(prisma.filing.create).mock.calls.map(([arg]) => arg.data)
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(prisma.filing.findFirst).mockResolvedValue(null)
  vi.mocked(prisma.filing.create).mockResolvedValue({} as never)
  // No earlier filings: each state starts on its usual frequency
  vi.mocked(prisma.filing.findMany).mockResolvedValue([] as never)
})

describe('ensureCurrentFilings', () => {
  it("creates the quarter in progress with the state's own due date", async () => {
    const count = await ensureCurrentFilings('biz-1', [{ stateCode: 'WA', stateName: 'Washington' }], new Date(2026, 8, 25))
    expect(count).toBe(1)
    const [filing] = created()
    expect(filing).toMatchObject({ businessId: 'biz-1', stateCode: 'WA', period: 'quarterly', status: 'pending' })
    expect([ymd(filing.periodStart as Date), ymd(filing.periodEnd as Date), ymd(filing.dueDate as Date)]).toEqual([
      '2026-07-01',
      '2026-09-30',
      '2026-10-31',
    ])
  })

  it('follows the frequency the seller chose for the state', async () => {
    vi.mocked(prisma.filing.findMany).mockResolvedValueOnce([{ stateCode: 'TX', period: 'monthly' }] as never)
    await ensureCurrentFilings('biz-1', [{ stateCode: 'TX', stateName: 'Texas' }], new Date(2026, 9, 5))
    expect(created().map((f) => [f.period, ymd(f.periodStart as Date), ymd(f.dueDate as Date)])).toEqual([
      ['monthly', '2026-09-01', '2026-10-20'],
      ['monthly', '2026-10-01', '2026-11-20'],
    ])
  })

  it('also creates a return that ended but is not due yet', async () => {
    await ensureCurrentFilings('biz-1', [{ stateCode: 'TX', stateName: 'Texas' }], new Date(2026, 9, 5))
    expect(created().map((f) => ymd(f.dueDate as Date))).toEqual(['2026-10-20', '2027-01-20'])
  })

  it('uses monthly returns where a state has no quarterly filing', async () => {
    await ensureCurrentFilings('biz-1', [{ stateCode: 'OH', stateName: 'Ohio' }], new Date(2026, 8, 25))
    expect(created()).toEqual([expect.objectContaining({ period: 'monthly' })])
    expect(ymd(created()[0].dueDate as Date)).toBe('2026-10-23')
  })

  it('skips periods that already exist and states without a sales tax', async () => {
    // Frequencies lookup, then the existing Texas return for the quarter
    vi.mocked(prisma.filing.findMany)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([{ periodStart: new Date(2026, 6, 1), periodEnd: new Date(2026, 8, 30) }] as never)
    const count = await ensureCurrentFilings(
      'biz-1',
      [
        { stateCode: 'TX', stateName: 'Texas' },
        { stateCode: 'OR', stateName: 'Oregon' },
      ],
      new Date(2026, 8, 25)
    )
    expect(count).toBe(0)
    expect(prisma.filing.create).not.toHaveBeenCalled()
  })

  it('tolerates a filing created at the same moment by another request', async () => {
    vi.mocked(prisma.filing.create).mockRejectedValue(new Error('Unique constraint failed on the fields'))
    await expect(ensureCurrentFilings('biz-1', [{ stateCode: 'TX', stateName: 'Texas' }], new Date(2026, 8, 25))).resolves.toBe(0)
  })
})

describe('filing frequency', () => {
  it("uses the latest filing's frequency, or the state's usual one", async () => {
    vi.mocked(prisma.filing.findMany).mockResolvedValueOnce([
      { stateCode: 'TX', period: 'monthly' },
      { stateCode: 'OH', period: 'quarterly' }, // Ohio has no quarterly filing: ignored
    ] as never)
    const frequencies = await getFilingFrequencies('biz-1', ['TX', 'OH', 'CA'])
    expect(Object.fromEntries(frequencies)).toEqual({ TX: 'monthly', OH: 'monthly', CA: 'quarterly' })
  })

  it('replaces upcoming unfiled returns and skips periods a filed return covers', async () => {
    vi.mocked(prisma.filing.deleteMany).mockResolvedValue({ count: 1 } as never)
    // Q3 was filed before the switch; it covers September
    vi.mocked(prisma.filing.findMany).mockResolvedValueOnce([{ periodStart: new Date(2026, 6, 1), periodEnd: new Date(2026, 8, 30) }] as never)
    const result = await setFilingFrequency('biz-1', { stateCode: 'TX', stateName: 'Texas' }, 'monthly', new Date(2026, 9, 5))
    expect(result).toEqual({ removed: 1, created: 1 })
    expect(vi.mocked(prisma.filing.deleteMany).mock.calls[0][0]).toMatchObject({
      where: { businessId: 'biz-1', stateCode: 'TX', status: 'pending', NOT: { period: 'monthly' } },
    })
    expect(created().map((f) => [f.period, ymd(f.periodStart as Date)])).toEqual([['monthly', '2026-10-01']])
  })

  it("refuses a frequency the state doesn't offer", async () => {
    await expect(setFilingFrequency('biz-1', { stateCode: 'OH', stateName: 'Ohio' }, 'quarterly')).rejects.toThrow(/Ohio doesn't offer quarterly/)
    expect(prisma.filing.deleteMany).not.toHaveBeenCalled()
  })
})

describe('ensureCurrentFilingsForAll', () => {
  it('covers every business with nexus states', async () => {
    vi.mocked(prisma.business.findMany).mockResolvedValue([
      { id: 'b1', nexusStates: [{ stateCode: 'TX', stateName: 'Texas' }] },
      { id: 'b2', nexusStates: [{ stateCode: 'NY', stateName: 'New York' }] },
    ] as never)
    const result = await ensureCurrentFilingsForAll(new Date(2026, 8, 25))
    expect(result).toEqual({ businesses: 2, created: 2 })
    expect(created().map((f) => [f.businessId, ymd(f.periodStart as Date)])).toEqual([
      ['b1', '2026-07-01'],
      ['b2', '2026-09-01'],
    ])
  })
})

describe('correctPendingDueDates', () => {
  it('fixes due dates on pending filings that match a state period', async () => {
    vi.mocked(prisma.filing.findMany).mockResolvedValue([
      // Nevada Q3 2026 saved with the old 15th due date
      { id: 'nv', stateCode: 'NV', period: 'quarterly', periodStart: new Date(2026, 6, 1), periodEnd: new Date(2026, 8, 30), dueDate: new Date(2026, 9, 15) },
      // Washington Q4 saved with the 20th
      { id: 'wa', stateCode: 'WA', period: 'quarterly', periodStart: new Date(2026, 9, 1), periodEnd: new Date(2026, 11, 31), dueDate: new Date(2027, 0, 20) },
      // Already right
      { id: 'tx', stateCode: 'TX', period: 'quarterly', periodStart: new Date(2026, 6, 1), periodEnd: new Date(2026, 8, 30), dueDate: new Date(2026, 9, 20) },
      // New York saved with calendar quarters: no matching period, left alone
      { id: 'ny', stateCode: 'NY', period: 'quarterly', periodStart: new Date(2026, 6, 1), periodEnd: new Date(2026, 8, 30), dueDate: new Date(2026, 9, 20) },
    ] as never)
    const result = await correctPendingDueDates(new Date(2026, 8, 25))
    expect(result).toEqual({ checked: 4, corrected: 2 })
    const updates = vi.mocked(prisma.filing.update).mock.calls.map(([arg]) => [arg.where.id, ymd(arg.data.dueDate as Date)])
    expect(updates).toEqual([
      ['nv', '2026-10-20'],
      ['wa', '2027-01-31'],
    ])
  })

  it('only looks at pending filings', async () => {
    vi.mocked(prisma.filing.findMany).mockResolvedValue([] as never)
    await correctPendingDueDates(new Date(2026, 8, 25))
    expect(vi.mocked(prisma.filing.findMany).mock.calls[0][0]?.where).toMatchObject({ status: 'pending' })
  })
})
