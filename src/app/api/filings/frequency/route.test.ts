import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth', () => ({ getCurrentUser: vi.fn() }))
vi.mock('@/lib/prisma', () => ({ prisma: { business: { findFirst: vi.fn() } } }))
vi.mock('@/lib/filing-schedule', () => ({ setFilingFrequency: vi.fn() }))

import { POST } from './route'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { setFilingFrequency } from '@/lib/filing-schedule'

const post = (body: unknown) =>
  POST(new NextRequest('https://sails.tax/api/filings/frequency', { method: 'POST', body: JSON.stringify(body) }))

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getCurrentUser).mockResolvedValue({ id: 'u1' } as never)
  vi.mocked(prisma.business.findFirst).mockResolvedValue({ id: 'b1', nexusStates: [{ stateCode: 'TX', stateName: 'Texas' }] } as never)
  vi.mocked(setFilingFrequency).mockResolvedValue({ removed: 1, created: 2 })
})

describe('POST /api/filings/frequency', () => {
  it('switches a nexus state to the chosen frequency', async () => {
    const res = await post({ stateCode: 'tx', period: 'monthly' })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ removed: 1, created: 2, stateCode: 'TX', period: 'monthly' })
    expect(setFilingFrequency).toHaveBeenCalledWith('b1', { stateCode: 'TX', stateName: 'Texas' }, 'monthly')
  })

  it('refuses frequencies the state doesn’t offer and states without nexus', async () => {
    vi.mocked(prisma.business.findFirst).mockResolvedValueOnce({ id: 'b1', nexusStates: [{ stateCode: 'OH', stateName: 'Ohio' }] } as never)
    const noQuarterly = await post({ stateCode: 'OH', period: 'quarterly' })
    expect(noQuarterly.status).toBe(400)
    expect((await noQuarterly.json()).error).toMatch(/Ohio doesn't offer quarterly/)

    vi.mocked(prisma.business.findFirst).mockResolvedValueOnce({ id: 'b1', nexusStates: [] } as never)
    expect((await post({ stateCode: 'CA', period: 'monthly' })).status).toBe(400)
    expect(setFilingFrequency).not.toHaveBeenCalled()
  })

  it('requires sign-in and a valid request', async () => {
    expect((await post({ stateCode: 'TX', period: 'weekly' })).status).toBe(400)
    vi.mocked(getCurrentUser).mockResolvedValueOnce(null)
    expect((await post({ stateCode: 'TX', period: 'monthly' })).status).toBe(401)
  })
})
